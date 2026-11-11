import {
  buildCompositionReport,
  type CompositionCell,
  type CompositionTarget,
} from '../engine/composition';
import type { SeatResult } from '../engine/run';
import type { Scenario } from '../engine/schema';
import type { Locale, Translate } from '../i18n';
import { formatDecimal } from '../i18n/format';
import { groupColorOf } from './groupColors';

export interface CompositionProps {
  readonly scenario: Scenario;
  /** Votes of year 0. */
  readonly votes: SeatResult['votes'];
  /** Null or a target that no longer exists shows the first list. */
  readonly target: CompositionTarget | null;
  readonly locale: Locale;
  readonly t: Translate;
  readonly onTarget: (target: CompositionTarget) => void;
}

interface Choice {
  readonly value: string;
  readonly target: CompositionTarget;
  readonly name: string;
}

function choiceValue(target: CompositionTarget): string {
  return `${target.kind}:${target.id}`;
}

function choices(scenario: Scenario): Choice[] {
  const make = (
    kind: CompositionTarget['kind'],
    entity: { readonly id: string; readonly name: string },
  ): Choice => {
    const target = { kind, id: entity.id };
    return { value: choiceValue(target), target, name: entity.name };
  };
  return scenario.parties.map((party) => make('party', party));
}

function ShareCells({
  basis,
  cell,
  locale,
  t,
}: {
  readonly basis: 'potential' | 'valid';
  readonly cell: CompositionCell;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  return (
    <>
      <td data-cell={`${basis}Share`}>
        {cell.share === null
          ? t('results.empty')
          : formatDecimal(locale, cell.share)}
      </td>
      <td data-cell={basis}>
        {cell.amount === null
          ? t('results.empty')
          : formatDecimal(locale, cell.amount)}
      </td>
    </>
  );
}

/** Who makes up the electorate of a list (Section 14.3). */
export function Composition({
  scenario,
  votes,
  target,
  locale,
  t,
  onTarget,
}: CompositionProps) {
  const parties = choices(scenario);
  const all = parties;
  const wanted = target === null ? null : choiceValue(target);
  const chosen = all.find((choice) => choice.value === wanted) ?? parties[0];
  if (chosen === undefined) {
    return null;
  }
  const report = buildCompositionReport(scenario, votes, chosen.target);
  const partyMode = scenario.inputMode === 'parties';
  const selectedUnknown =
    partyMode &&
    chosen.target.kind === 'party' &&
    scenario.parties.find((party) => party.id === chosen.target.id)
      ?.composition === null;
  const entirelyUnknown = report.entirelyUnknown === true || selectedUnknown;
  const partial =
    report.unknownComposition !== null &&
    report.unknownComposition !== undefined &&
    !entirelyUnknown;
  const option = (choice: Choice) => (
    <option
      key={choice.value}
      value={choice.value}
      selected={choice.value === chosen.value}
    >
      {choice.name}
    </option>
  );

  return (
    <div class="composition">
      <label class="composition__target">
        <span class="composition__label">{t('composition.target')}</span>
        <select
          class="composition__select"
          data-composition-target
          aria-label={t('composition.target')}
          onChange={(event) => {
            const value = event.currentTarget.value;
            const found = all.find((choice) => choice.value === value);
            if (found !== undefined) {
              onTarget(found.target);
            }
          }}
        >
          <optgroup label={t('results.parties')}>
            {parties.map(option)}
          </optgroup>
        </select>
      </label>
      <p
        class="composition__basis"
        data-composition-basis={partyMode ? 'voters' : 'supporters'}
      >
        {t(partyMode ? 'composition.partyBasis' : 'composition.basis')}
      </p>
      {entirelyUnknown && (
        <p data-composition-state="unknown">
          {t('composition.unknownExplanation')}
        </p>
      )}
      {partial && <p data-composition-partial>{t('composition.partial')}</p>}
      {report.demographicState !== undefined && (
        <p data-demographic-status={report.demographicState}>
          {t(`composition.demographics.${report.demographicState}`)}
        </p>
      )}
      {!report.hasValidVotes && (
        <p class="composition__note" data-composition="no-votes">
          {t(partyMode ? 'composition.noValidVotes' : 'composition.noVotes')}
        </p>
      )}
      <div class="table-scroll" tabIndex={0}>
        <table class="results-table" data-table="composition">
          <caption class="composition__caption">
            {t('composition.caption', { name: report.name })}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t('composition.column.group')}</th>
              {!partyMode && (
                <>
                  <th scope="col">{t('composition.column.potentialShare')}</th>
                  <th scope="col">{t('composition.column.potential')}</th>
                </>
              )}
              <th scope="col">
                {t(
                  partial
                    ? 'composition.column.knownValidShare'
                    : 'composition.column.validShare',
                )}
              </th>
              <th scope="col">{t('composition.column.valid')}</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row, index) => (
              <tr key={row.groupId} data-group={row.groupId}>
                <th scope="row">
                  <span
                    class="swatch swatch--group"
                    aria-hidden="true"
                    style={{ background: groupColorOf(row.groupId, index) }}
                  />
                  <bdi>{row.name}</bdi>
                </th>
                {!partyMode && (
                  <ShareCells
                    basis="potential"
                    cell={row.potential}
                    locale={locale}
                    t={t}
                  />
                )}
                <ShareCells
                  basis="valid"
                  cell={row.valid}
                  locale={locale}
                  t={t}
                />
              </tr>
            ))}
            {report.unknownComposition !== null &&
              report.unknownComposition !== undefined && (
                <tr data-composition="unknown">
                  <th scope="row">{t('composition.unknown')}</th>
                  {!partyMode && (
                    <>
                      <td />
                      <td />
                    </>
                  )}
                  <ShareCells
                    basis="valid"
                    cell={report.unknownComposition}
                    locale={locale}
                    t={t}
                  />
                </tr>
              )}
          </tbody>
          <tfoot>
            <tr data-row="total">
              <th scope="row">{t('composition.total')}</th>
              {!partyMode && (
                <>
                  <td data-cell="potentialShare" />
                  <td data-cell="potential">
                    {report.potentialTotal === null
                      ? t('results.empty')
                      : formatDecimal(locale, report.potentialTotal)}
                  </td>
                </>
              )}
              <td data-cell="validShare" />
              <td data-cell="valid">
                {formatDecimal(locale, report.validTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
