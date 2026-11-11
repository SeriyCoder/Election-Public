import { Fragment } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  effectiveForbiddenPairs,
  evaluateCoalition,
} from '../engine/coalitions';
import { compareScenarios } from '../engine/compare';
import { hasLegacyFeatures, legacyFeatures } from '../engine/legacyConversion';
import { buildReport } from '../engine/report';
import { runSeats, type SeatProjection } from '../engine/run';
import type { Scenario } from '../engine/schema';
import type { Locale, Translate } from '../i18n';
import { formatDecimal, formatInteger } from '../i18n/format';
import type { CoalitionRun, CoalitionRunner } from './coalitionRunner';
import { DecimalCells } from './Compare';
import { browserDownloadTarget, exportLegacyOriginal } from './fileTransfer';
import { withDisplayNames } from './names';
import type { LegacyPreview, Store } from './store';
import { IMPORT_ISSUE_CAP } from './Transfer';
import { useRunner } from './useRunner';

const PAIRS_PER_PAGE = 100;

function Pairs({
  scenario,
  locale,
  t,
}: {
  readonly scenario: Scenario;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  const [page, setPage] = useState(0);
  const pairs = useMemo(() => effectiveForbiddenPairs(scenario), [scenario]);
  const names = new Map(
    scenario.parties.map((party) => [party.id, party.name]),
  );
  const remainder = pairs.length % PAIRS_PER_PAGE;
  const count = (pairs.length - remainder) / PAIRS_PER_PAGE;
  const pages = count + (remainder > 0 ? 1 : 0) || 1;
  const shown = page < pages ? page : pages - 1;
  return (
    <details class="legacy__pairs">
      <summary>
        {t('legacy.pairs')} ({formatInteger(locale, pairs.length)})
      </summary>
      {pairs.length === 0 ? (
        <p>{t('coalition.noForbidden')}</p>
      ) : (
        <ul>
          {pairs
            .slice(shown * PAIRS_PER_PAGE, (shown + 1) * PAIRS_PER_PAGE)
            .map((pair) => (
              <li key={pair.partyIds.join('|')}>
                <bdi>{names.get(pair.partyIds[0]) ?? pair.partyIds[0]}</bdi>
                {' – '}
                <bdi>{names.get(pair.partyIds[1]) ?? pair.partyIds[1]}</bdi>
                {pair.refusedBy.length > 0 && (
                  <>
                    {' ('}
                    {t('coalition.source.refusal')}
                    {': '}
                    {pair.refusedBy.map((id, index) => (
                      <Fragment key={id}>
                        {index > 0 && ', '}
                        <bdi>{names.get(id) ?? id}</bdi>
                      </Fragment>
                    ))}
                    {')'}
                  </>
                )}
              </li>
            ))}
        </ul>
      )}
      {pages > 1 && (
        <div class="legacy__actions">
          <button
            type="button"
            class="button button--small"
            disabled={shown === 0}
            onClick={() => setPage(shown - 1)}
          >
            {t('legacy.previous')}
          </button>
          <span>{t('legacy.pairsPage', { page: shown + 1, pages })}</span>
          <button
            type="button"
            class="button button--small"
            disabled={shown === pages - 1}
            onClick={() => setPage(shown + 1)}
          >
            {t('legacy.next')}
          </button>
        </div>
      )}
    </details>
  );
}

function SearchStatus({
  run,
  onCancel,
  t,
}: {
  readonly run: CoalitionRun;
  readonly onCancel?: () => void;
  readonly t: Translate;
}) {
  let text: string;
  switch (run.state) {
    case 'done':
      text = `${t(`coalition.status.${run.analysis.status}`)}. ${
        run.analysis.complete
          ? t('coalition.complete')
          : t('legacy.searchPartial')
      }`;
      break;
    case 'running':
      text = t('compare.coalitions.pending');
      break;
    case 'cancelled':
      text = t('coalition.cancelled');
      break;
    case 'failed':
      text =
        run.reason === 'worker-unavailable'
          ? t('legacy.searchUnavailable')
          : `${t('coalition.failed')} ${run.message}`;
      break;
    case 'idle':
      text = t('legacy.searchIdle');
      break;
  }
  return (
    <div data-legacy-search={run.state}>
      <p role="status">{text}</p>
      {run.state === 'running' && onCancel !== undefined && (
        <button type="button" class="button button--small" onClick={onCancel}>
          {t('coalition.cancel')}
        </button>
      )}
    </div>
  );
}

function Snapshot({
  scenario,
  result,
  selection,
  locale,
  t,
  run,
  onCancelSearch,
  showPairs,
}: {
  readonly scenario: Scenario;
  readonly result: SeatProjection;
  readonly selection: readonly string[];
  readonly locale: Locale;
  readonly t: Translate;
  readonly run?: CoalitionRun;
  readonly onCancelSearch?: () => void;
  readonly showPairs: boolean;
}) {
  if ('kind' in result) {
    return (
      <p data-projection-unavailable={result.reason}>
        {t(`future.unavailable.${result.reason}`)}
      </p>
    );
  }
  const report = buildReport(scenario, result);
  const evaluation =
    selection.length > 0 && report.noAllocation === null
      ? evaluateCoalition(scenario, result.allocation, selection)
      : null;
  const yesNo = (value: boolean) => t(value ? 'coalition.yes' : 'coalition.no');
  return (
    <>
      {report.noAllocation !== null && (
        <p data-legacy-no-allocation={report.noAllocation}>
          {t(`status.noAllocation.${report.noAllocation}`)}
        </p>
      )}
      <dl class="summary">
        {(['turnout', 'cast', 'valid'] as const).map((field) => (
          <div class="summary__item" key={field}>
            <dt>{t(`summary.${field}`)}</dt>
            <dd>{formatDecimal(locale, report.totals[field])}</dd>
          </div>
        ))}
        <div class="summary__item">
          <dt>{t('summary.majority')}</dt>
          <dd>{formatInteger(locale, report.majority)}</dd>
        </div>
      </dl>
      <div class="table-scroll" tabIndex={0}>
        <table class="results-table" data-legacy-parties>
          <thead>
            <tr>
              <th scope="col">{t('column.party')}</th>
              <th scope="col">{t('column.votes')}</th>
              <th scope="col">{t('column.voteShare')}</th>
              <th scope="col">{t('column.status')}</th>
              <th scope="col">{t('column.seats')}</th>
            </tr>
          </thead>
          <tbody>
            {report.parties.map((party) => (
              <tr key={party.partyId} data-legacy-party={party.partyId}>
                <th scope="row">
                  <bdi>{party.name}</bdi>
                </th>
                <td>{formatDecimal(locale, party.votes)}</td>
                <td>
                  {party.voteShare === null
                    ? t('results.empty')
                    : formatDecimal(locale, party.voteShare)}
                </td>
                <td>{t(`qualification.${party.status}`)}</td>
                <td>
                  {report.noAllocation === null
                    ? formatInteger(locale, party.seats)
                    : t('results.empty')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h5>{t('coalition.choose')}</h5>
      {selection.length > 0 && (
        <p data-legacy-selection>
          {selection.map((id, index) => (
            <Fragment key={id}>
              {index > 0 && ', '}
              <bdi>
                {scenario.parties.find((party) => party.id === id)?.name ?? id}
              </bdi>
            </Fragment>
          ))}
        </p>
      )}
      {selection.length === 0 ? (
        <p>{t('legacy.noSelection')}</p>
      ) : evaluation === null ? (
        <p>{t('status.noAllocation.' + report.noAllocation)}</p>
      ) : (
        <dl class="summary" data-legacy-evaluation>
          {(
            [
              ['seats', formatInteger(locale, evaluation.seats)],
              ['margin', formatInteger(locale, evaluation.margin)],
              ['reachesMajority', yesNo(evaluation.reachesMajority)],
              ['feasible', yesNo(evaluation.feasible)],
            ] as const
          ).map(([field, value]) => (
            <div class="summary__item" key={field}>
              <dt>{t(`coalition.evaluation.${field}`)}</dt>
              <dd data-legacy-evaluation-field={field}>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {showPairs && <Pairs scenario={scenario} locale={locale} t={t} />}
      {run !== undefined && (
        <SearchStatus run={run} onCancel={onCancelSearch} t={t} />
      )}
    </>
  );
}

function Preview({
  preview,
  currentRun,
  previewRun,
  previewRunner,
  store,
  locale,
  t,
}: {
  readonly preview: LegacyPreview;
  readonly currentRun: CoalitionRun;
  readonly previewRun: CoalitionRun;
  readonly previewRunner?: CoalitionRunner;
  readonly store: Store;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  const before = useMemo(
    () => withDisplayNames(preview.before, t),
    [preview.before, t],
  );
  const after = useMemo(
    () => withDisplayNames(preview.after, t),
    [preview.after, t],
  );
  const currentBefore = useMemo(() => runSeats(before), [before]);
  const currentAfter = useMemo(() => runSeats(after), [after]);
  const futureBefore = useMemo(
    () => runSeats(before, preview.year),
    [before, preview.year],
  );
  const futureAfter = useMemo(
    () => runSeats(after, preview.year),
    [after, preview.year],
  );
  const comparison = compareScenarios(
    before,
    currentBefore,
    after,
    currentAfter,
  );
  return (
    <section
      class="legacy__preview"
      data-legacy-preview
      aria-labelledby="legacy-preview-title"
    >
      <h3 id="legacy-preview-title">{t('legacy.preview')}</h3>
      <p>{t('legacy.previewNote')}</p>
      <p>{t('workspace.majorityNote')}</p>
      <div class="legacy__actions">
        <button
          type="button"
          class="button"
          data-action="legacy-confirm"
          onClick={() => store.confirmLegacyConversion()}
        >
          {t('legacy.confirm')}
        </button>
        <button
          type="button"
          class="button"
          data-action="legacy-cancel"
          onClick={() => store.cancelLegacyConversion()}
        >
          {t('legacy.cancel')}
        </button>
      </div>
      <h4>{t('legacy.current')}</h4>
      <div class="legacy__sides">
        <section data-conversion-before>
          <h4>{t('legacy.before')}</h4>
          <Snapshot
            scenario={before}
            result={currentBefore}
            selection={preview.selection}
            locale={locale}
            t={t}
            run={currentRun}
            showPairs
          />
        </section>
        <section data-conversion-after>
          <h4>{t('legacy.after')}</h4>
          <Snapshot
            scenario={after}
            result={currentAfter}
            selection={preview.selection}
            locale={locale}
            t={t}
            run={previewRun}
            onCancelSearch={() => previewRunner?.cancel()}
            showPairs
          />
        </section>
      </div>
      {comparison.groups.length > 0 && (
        <div class="table-scroll" tabIndex={0}>
          <table class="results-table" data-legacy-group-turnout>
            <caption>{t('legacy.groupTurnout')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('composition.column.group')}</th>
                <th scope="col">{t('legacy.before')}</th>
                <th scope="col">{t('legacy.after')}</th>
                <th scope="col">{t('compare.column.change')}</th>
              </tr>
            </thead>
            <tbody>
              {comparison.groups.map((group) => (
                <tr key={group.groupId}>
                  <th scope="row">
                    <bdi>{group.name}</bdi>
                  </th>
                  <DecimalCells
                    prefix={null}
                    value={group.turnout}
                    format={{ locale, t }}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h4>{t('legacy.future', { year: preview.year })}</h4>
      <p>{t('legacy.futureSearch')}</p>
      <div class="legacy__sides">
        <section data-conversion-future-before>
          <h4>{t('legacy.before')}</h4>
          <Snapshot
            scenario={before}
            result={futureBefore}
            selection={preview.selection}
            locale={locale}
            t={t}
            showPairs={false}
          />
        </section>
        <section data-conversion-future-after>
          <h4>{t('legacy.after')}</h4>
          <Snapshot
            scenario={after}
            result={futureAfter}
            selection={preview.selection}
            locale={locale}
            t={t}
            showPairs={false}
          />
        </section>
      </div>
    </section>
  );
}

export function LegacyConversion({
  store,
  currentRun,
  previewRunner,
  locale,
  t,
}: {
  readonly store: Store;
  readonly currentRun: CoalitionRun;
  readonly previewRunner?: CoalitionRunner;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  const state = store.getState();
  const { validation } = store.getDerived();
  const previewRun = useRunner(previewRunner);
  const [exportFailed, setExportFailed] = useState(false);
  useEffect(() => setExportFailed(false), [state.legacyOriginal]);
  const scenario = validation.ok ? validation.scenario : null;
  const features = scenario === null ? null : legacyFeatures(scenario);
  const legacy = scenario !== null && hasLegacyFeatures(scenario);
  if (
    !legacy &&
    state.legacyOriginal === null &&
    state.legacyFailure === null
  ) {
    return null;
  }
  const failure = state.legacyFailure;
  return (
    <section class="legacy" aria-labelledby="legacy-title">
      <h2 id="legacy-title">{t('legacy.title')}</h2>
      {legacy && features !== null && (
        <div data-legacy-notice>
          <p>{t('legacy.notice')}</p>
          <ul>
            {features.groupMode && <li>{t('legacy.groupMode')}</li>}
            {features.participation && <li>{t('legacy.participation')}</li>}
            {features.restrictions && <li>{t('legacy.restrictions')}</li>}
            {features.validity && <li>{t('legacy.validity')}</li>}
            {features.majority && <li>{t('legacy.majority')}</li>}
            {features.turnoutChange && <li>{t('legacy.turnoutChange')}</li>}
          </ul>
          <button
            type="button"
            class="button"
            data-action="legacy-prepare"
            onClick={() => store.requestLegacyConversion()}
          >
            {t('legacy.prepare')}
          </button>
        </div>
      )}
      {failure !== null && (
        <div role="alert" data-conversion-error={failure.reason}>
          <p>{t(`legacy.error.${failure.reason}`)}</p>
          {failure.issues.length > 0 && (
            <>
              <p>{t('legacy.issueCount', { count: failure.issues.length })}</p>
              <ul>
                {failure.issues
                  .slice(0, IMPORT_ISSUE_CAP)
                  .map((issue, index) => (
                    <li key={`${issue.path}-${issue.code}-${index}`}>
                      {t(`issue.${issue.code}`)}{' '}
                      <code dir="ltr">{issue.path}</code>
                    </li>
                  ))}
              </ul>
              {failure.issues.length > IMPORT_ISSUE_CAP && (
                <p>
                  {t('transfer.more', {
                    count: failure.issues.length - IMPORT_ISSUE_CAP,
                  })}
                </p>
              )}
            </>
          )}
        </div>
      )}
      {state.legacyOriginal !== null && (
        <button
          type="button"
          class="button"
          data-action="legacy-export-original"
          onClick={() => {
            try {
              setExportFailed(
                !exportLegacyOriginal(store, browserDownloadTarget()),
              );
            } catch {
              setExportFailed(true);
            }
          }}
        >
          {t('legacy.exportOriginal')}
        </button>
      )}
      {exportFailed && (
        <p role="alert" data-legacy-export-error>
          {t('legacy.exportError')}
        </p>
      )}
      {state.legacyPreview !== null && (
        <Preview
          preview={state.legacyPreview}
          currentRun={currentRun}
          previewRun={previewRun}
          previewRunner={previewRunner}
          store={store}
          locale={locale}
          t={t}
        />
      )}
    </section>
  );
}
