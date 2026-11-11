import { useMemo, useState } from 'preact/hooks';
import { HISTORICAL_2022 } from '../engine/historical2022';
import {
  compareHistorical2022,
  historical2022Report,
  historicalPercent,
  type HistoricalMatchChoice,
} from '../engine/historicalReference';
import type { SeatResult } from '../engine/run';
import type { Scenario } from '../engine/schema';
import type { Locale, Translate } from '../i18n';
import { formatChange, formatDecimal, formatInteger } from '../i18n/format';
import { entityName } from './names';
import type { HistoricalMatchError } from './store';

export interface HistoricalReferenceProps {
  readonly scenario: Scenario | null;
  readonly seats: SeatResult | null;
  readonly choices: readonly HistoricalMatchChoice[];
  readonly error: HistoricalMatchError | null;
  readonly locale: Locale;
  readonly t: Translate;
  readonly onMatch: (currentId: string, historicalId: string | null) => void;
  readonly onRestore: (currentId: string) => void;
}

export function HistoricalReference({
  scenario,
  seats,
  choices,
  error,
  locale,
  t,
  onMatch,
  onRestore,
}: HistoricalReferenceProps) {
  const [currentId, setCurrentId] = useState('');
  const [historicalId, setHistoricalId] = useState('');
  const report = useMemo(() => historical2022Report(), []);
  const comparison = useMemo(
    () =>
      scenario !== null && seats !== null
        ? compareHistorical2022(scenario, seats, choices)
        : null,
    [scenario, seats, choices],
  );
  const parties = scenario?.parties ?? [];
  const selectedCurrent = parties.some((party) => party.id === currentId)
    ? currentId
    : '';
  const selectedHistorical = HISTORICAL_2022.lists.some(
    (entry) => entry.id === historicalId,
  )
    ? historicalId
    : '';
  const issue =
    error ?? (comparison !== null && !comparison.ok ? comparison.reason : null);
  const nameOf = (id: string): string => {
    const party = parties.find((entry) => entry.id === id);
    return entityName('party', party ?? { id }, t);
  };
  const referenceName = (id: string): string => entityName('party', { id }, t);
  const percent = (value: ReturnType<typeof historicalPercent>): string =>
    value === null ? t('results.empty') : formatDecimal(locale, value);
  const change = (value: string | number | null): string =>
    value === null ? t('results.empty') : formatChange(locale, `${value}`);
  const count = (value: number | null): string =>
    value === null ? t('results.empty') : formatInteger(locale, value);

  return (
    <section
      class="historical"
      data-historical-reference
      aria-labelledby="historical-title"
    >
      <h4 id="historical-title" class="compare__title">
        {t('history.title')}
      </h4>
      <p class="compare__note" data-historical-source>
        {t('history.source')}
      </p>
      <dl class="summary">
        {(
          [
            ['eligible', HISTORICAL_2022.eligibleVoters],
            ['cast', HISTORICAL_2022.ballotsCast],
            ['valid', HISTORICAL_2022.validVotes],
            ['invalid', HISTORICAL_2022.invalidBallots],
          ] as const
        ).map(([key, value]) => (
          <div class="summary__item" key={key}>
            <dt>{t(`history.${key}`)}</dt>
            <dd data-historical-field={key}>{formatInteger(locale, value)}</dd>
          </div>
        ))}
        <div class="summary__item">
          <dt>{t('history.turnout')}</dt>
          <dd data-historical-field="turnout">
            {formatDecimal(locale, report.turnout)}
          </dd>
        </div>
      </dl>
      <p class="note" data-historical-model-validity>
        {t('history.validity')}
      </p>
      <div class="historical__methods">
        <p data-historical-method="official">{t('history.official')}</p>
        <p data-historical-method="hamilton">{t('history.hamilton')}</p>
      </div>

      <details class="historical__details">
        <summary data-action="historical-details">
          {t('history.details')}
        </summary>
        <div class="table-scroll" tabIndex={0}>
          <table class="results-table" data-table="historical-lists">
            <thead>
              <tr>
                <th scope="col">{t('history.list')}</th>
                <th scope="col">{t('history.votes')}</th>
                <th scope="col">{t('history.share')}</th>
                <th scope="col">{t('history.official')}</th>
                <th scope="col">{t('history.hamilton')}</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.id} data-historical-row={row.id}>
                  <th scope="row">
                    <bdi>{referenceName(row.id)}</bdi>
                  </th>
                  <td>{formatInteger(locale, row.votes)}</td>
                  <td>{formatDecimal(locale, row.voteShare)}</td>
                  <td data-historical-cell="official-seats">
                    {formatInteger(locale, row.officialSeats)}
                  </td>
                  <td data-historical-cell="hamilton-seats">
                    {formatInteger(locale, row.hamiltonSeats)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {scenario === null || seats === null ? (
        <p class="compare__note" data-historical-current-unavailable>
          {t('history.currentUnavailable')}
        </p>
      ) : (
        <>
          <p class="compare__note">{t('history.matchHelp')}</p>
          <div class="historical__matching">
            <label class="historical__field">
              <span>{t('history.currentList')}</span>
              <select
                class="entity__select"
                data-historical-current-select
                value={selectedCurrent}
                onChange={(event) => setCurrentId(event.currentTarget.value)}
              >
                <option value="">{t('history.choose')}</option>
                {parties.map((party) => (
                  <option value={party.id} key={party.id}>
                    {nameOf(party.id)}
                  </option>
                ))}
              </select>
            </label>
            <label class="historical__field">
              <span>{t('history.historicalList')}</span>
              <select
                class="entity__select"
                data-historical-target-select
                value={selectedHistorical}
                onChange={(event) => setHistoricalId(event.currentTarget.value)}
              >
                <option value="">{t('history.choose')}</option>
                {report.rows.map((row) => (
                  <option value={row.id} key={row.id}>
                    {referenceName(row.id)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              class="button"
              data-action="historical-match"
              disabled={selectedCurrent === '' || selectedHistorical === ''}
              onClick={() => onMatch(selectedCurrent, selectedHistorical)}
            >
              {t('history.match')}
            </button>
          </div>
          {issue !== null && (
            <p
              class="historical__error"
              role="alert"
              data-historical-match-error={issue}
            >
              {t(`history.error.${issue}`)}
            </p>
          )}
          {comparison !== null && comparison.ok ? (
            <div class="table-scroll" tabIndex={0}>
              <table class="results-table" data-table="historical-comparison">
                <thead>
                  <tr>
                    <th scope="col">{t('history.currentList')}</th>
                    <th scope="col">{t('history.list')}</th>
                    <th scope="col">{t('history.currentShare')}</th>
                    <th scope="col">{t('history.share')}</th>
                    <th scope="col">{t('history.shareChange')}</th>
                    <th scope="col">{t('history.currentSeats')}</th>
                    <th scope="col">{t('history.official')}</th>
                    <th scope="col">{t('history.officialChange')}</th>
                    <th scope="col">{t('history.hamilton')}</th>
                    <th scope="col">{t('history.hamiltonChange')}</th>
                    <th scope="col">{t('history.match')}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.rows.map((row) => (
                    <tr
                      key={row.currentId}
                      data-historical-current-row={row.currentId}
                      data-historical-id={row.historicalId ?? ''}
                      data-match={row.match}
                    >
                      <th scope="row">
                        <bdi>{nameOf(row.currentId)}</bdi>
                      </th>
                      <td>
                        {row.historicalId === null
                          ? t('history.unmatched')
                          : referenceName(row.historicalId)}
                      </td>
                      <td>
                        {percent(historicalPercent(row.currentVoteShare))}
                      </td>
                      <td>
                        {percent(historicalPercent(row.historicalVoteShare))}
                      </td>
                      <td>{change(historicalPercent(row.shareChange))}</td>
                      <td>{count(row.currentSeats)}</td>
                      <td>{count(row.officialSeats)}</td>
                      <td>{change(row.officialSeatChange)}</td>
                      <td>{count(row.hamiltonSeats)}</td>
                      <td>{change(row.hamiltonSeatChange)}</td>
                      <td>
                        <span>{t(`history.${row.match}`)}</span>
                        {row.historicalId !== null && (
                          <button
                            type="button"
                            class="button button--small"
                            data-action="historical-unmatch"
                            aria-label={`${t('history.resetMatch')}: ${nameOf(row.currentId)}`}
                            onClick={() => onMatch(row.currentId, null)}
                          >
                            {t('history.resetMatch')}
                          </button>
                        )}
                        {choices.some(
                          (choice) => choice.currentId === row.currentId,
                        ) && (
                          <button
                            type="button"
                            class="button button--small"
                            data-action="historical-restore-match"
                            aria-label={`${t('history.restoreMatch')}: ${nameOf(row.currentId)}`}
                            onClick={() => onRestore(row.currentId)}
                          >
                            {t('history.restoreMatch')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : comparison !== null ? (
            <ul class="historical__recovery">
              {parties.map((party) => (
                <li key={party.id}>
                  <bdi>{nameOf(party.id)}</bdi>{' '}
                  <button
                    type="button"
                    class="button button--small"
                    onClick={() => onMatch(party.id, null)}
                  >
                    {t('history.resetMatch')}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </section>
  );
}
