import { Fragment } from 'preact';
import {
  evaluateCoalition,
  MAX_COMPLETE_ELIGIBLE,
  type BlockedMajority,
  type Coalition,
  type CoalitionAnalysis,
  type ForbiddenPair,
} from '../engine/coalitions';
import type { SeatResult } from '../engine/run';
import type { Scenario } from '../engine/schema';
import type { Locale, Translate } from '../i18n';
import { formatInteger } from '../i18n/format';
import {
  LISTED_COALITIONS,
  type CoalitionExtras,
  type CoalitionRun,
} from './coalitionRunner';

export function RowLimitNote({
  total,
  locale,
  t,
}: {
  readonly total: number;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  if (total <= LISTED_COALITIONS) {
    return null;
  }
  return (
    <p class="coalitions__note" data-note="row-limit">
      {t('coalition.rowLimit', {
        shown: formatInteger(locale, LISTED_COALITIONS),
        total: formatInteger(locale, total),
      })}
    </p>
  );
}

export interface CoalitionsProps {
  readonly scenario: Scenario;
  readonly seats: SeatResult;
  readonly run: CoalitionRun;
  readonly selection: readonly string[];
  readonly locale: Locale;
  readonly t: Translate;
  readonly onCancel: () => void;
  readonly onRerun: () => void;
  readonly onToggle: (partyId: string) => void;
}

type NameOf = (id: string) => string;

function namer(scenario: Scenario): NameOf {
  const names = new Map(
    scenario.parties.map((party) => [party.id, party.name]),
  );
  return (id) => names.get(id) ?? id;
}

function Names({
  ids,
  nameOf,
  t,
}: {
  readonly ids: readonly string[];
  readonly nameOf: NameOf;
  readonly t: Translate;
}) {
  if (ids.length === 0) {
    return <>{t('coalition.none')}</>;
  }
  return (
    <>
      {ids.map((id, index) => (
        <Fragment key={id}>
          {index > 0 && ', '}
          <bdi>{nameOf(id)}</bdi>
        </Fragment>
      ))}
    </>
  );
}

function PairNames({
  pair,
  nameOf,
}: {
  readonly pair: ForbiddenPair;
  readonly nameOf: NameOf;
}) {
  const [first, second] = pair.partyIds;
  return (
    <>
      <bdi>{nameOf(first)}</bdi>
      {' – '}
      <bdi>{nameOf(second)}</bdi>
    </>
  );
}

/** "(refusal: A, B)" naming the parties that refused, or nothing. */
function RefusalNote({
  pair,
  nameOf,
  t,
}: {
  readonly pair: ForbiddenPair;
  readonly nameOf: NameOf;
  readonly t: Translate;
}) {
  if (pair.refusedBy.length === 0) {
    return null;
  }
  return (
    <>
      {' ('}
      {t('coalition.source.refusal')}
      {': '}
      <Names ids={pair.refusedBy} nameOf={nameOf} t={t} />
      {')'}
    </>
  );
}

function searchText(analysis: CoalitionAnalysis, t: Translate): string {
  if (analysis.complete) {
    return t('coalition.complete');
  }
  return analysis.eligiblePartyIds.length > MAX_COMPLETE_ELIGIBLE
    ? t('coalition.incomplete.eligible')
    : t('coalition.incomplete.budget');
}

function Summary({
  analysis,
  nameOf,
  locale,
  t,
}: {
  readonly analysis: CoalitionAnalysis;
  readonly nameOf: NameOf;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  const majority = formatInteger(locale, analysis.majorityRequired);
  return (
    <dl class="summary" aria-label={t('coalition.summary.status')}>
      <div class="summary__item">
        <dt>{t('coalition.summary.status')}</dt>
        <dd data-coalition-summary="status">
          {t(`coalition.status.${analysis.status}`)}
        </dd>
      </div>
      <div class="summary__item">
        <dt>{t('coalition.summary.search')}</dt>
        <dd data-coalition-summary="search">{searchText(analysis, t)}</dd>
      </div>
      <div class="summary__item">
        <dt>{t('coalition.summary.majority')}</dt>
        <dd data-coalition-summary="majority">
          {analysis.majorityOverridden
            ? `${majority} ${t('coalition.overridden')}`
            : majority}
        </dd>
      </div>
      <div class="summary__item">
        <dt>{t('coalition.summary.eligible')}</dt>
        <dd data-coalition-summary="eligible">
          <Names ids={analysis.eligiblePartyIds} nameOf={nameOf} t={t} />
        </dd>
      </div>
      <div class="summary__item">
        <dt>{t('coalition.summary.nodes')}</dt>
        <dd data-coalition-summary="nodes">
          {formatInteger(locale, analysis.nodesVisited)}
        </dd>
      </div>
    </dl>
  );
}

function Winners({
  analysis,
  total,
  nameOf,
  locale,
  t,
}: {
  readonly analysis: CoalitionAnalysis;
  readonly total: number;
  readonly nameOf: NameOf;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  return (
    <>
      <h4 class="coalitions__title">{t('coalition.minimalWinning')}</h4>
      {analysis.minimalWinning.length === 0 ? (
        <p class="coalitions__empty" data-empty="minimal-winning">
          {t('coalition.noneFound')}
        </p>
      ) : (
        <div class="table-scroll" tabIndex={0}>
          <table class="results-table" data-table="minimal-winning">
            <thead>
              <tr>
                <th scope="col">{t('coalition.column.members')}</th>
                <th scope="col">{t('coalition.column.seats')}</th>
                <th scope="col">{t('coalition.column.margin')}</th>
                <th scope="col">{t('coalition.column.opposition')}</th>
              </tr>
            </thead>
            <tbody>
              {analysis.minimalWinning
                .slice(0, LISTED_COALITIONS)
                .map((coalition) => {
                  const key = coalition.partyIds.join('+');
                  return (
                    <tr key={key} data-coalition={key}>
                      <td data-cell="members">
                        <Names ids={coalition.partyIds} nameOf={nameOf} t={t} />
                      </td>
                      <td data-cell="seats">
                        {formatInteger(locale, coalition.seats)}
                      </td>
                      <td data-cell="margin">
                        {formatInteger(locale, coalition.margin)}
                      </td>
                      <td data-cell="opposition">
                        {formatInteger(locale, coalition.opposition)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
      <RowLimitNote total={total} locale={locale} t={t} />
      {analysis.balancingPartyIds.length > 0 && (
        <>
          <h4 class="coalitions__title">{t('coalition.balancing')}</h4>
          <ul class="coalitions__list" data-list="balancing">
            {analysis.balancingPartyIds.map((id) => (
              <li key={id} data-balancing-party={id}>
                <bdi>{nameOf(id)}</bdi>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function PivotalList({
  extras,
  total,
  nameOf,
  locale,
  t,
}: {
  readonly extras: CoalitionExtras;
  readonly total: number;
  readonly nameOf: NameOf;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  const needed = (value: boolean | null): string => {
    if (value === null) {
      return t('coalition.unknown');
    }
    return t(value ? 'coalition.yes' : 'coalition.no');
  };
  const count = (value: number): string => {
    const text = formatInteger(locale, value);
    return extras.pivotalComplete
      ? text
      : t('coalition.pivotal.atLeast', { count: text });
  };
  return (
    <details class="coalitions__extra" data-extra="pivotal">
      <summary class="coalitions__extra-title">
        {t('coalition.pivotal')}
      </summary>
      {total === 0 ? (
        <p class="coalitions__empty" data-empty="pivotal">
          {t('coalition.pivotal.none')}
        </p>
      ) : (
        <>
          <p class="coalitions__intro">
            {t('coalition.pivotal.intro', {
              total: formatInteger(locale, total),
            })}
          </p>
          <div class="table-scroll" tabIndex={0}>
            <table class="results-table" data-table="pivotal">
              <thead>
                <tr>
                  <th scope="col">{t('coalition.column.party')}</th>
                  <th scope="col">{t('coalition.column.coalitions')}</th>
                  <th scope="col">{t('coalition.column.indispensable')}</th>
                </tr>
              </thead>
              <tbody>
                {extras.pivotal.map((row) => (
                  <tr key={row.partyId} data-pivotal={row.partyId}>
                    <td data-cell="party">
                      <bdi>{nameOf(row.partyId)}</bdi>
                    </td>
                    <td data-cell="coalitions">{count(row.coalitions)}</td>
                    <td data-cell="indispensable">
                      {needed(row.indispensable)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!extras.pivotalComplete && (
        <p class="coalitions__note" data-note="pivotal-partial">
          {t('coalition.pivotal.partial')}
        </p>
      )}
    </details>
  );
}

function LargerList({
  extras,
  nameOf,
  locale,
  t,
}: {
  readonly extras: CoalitionExtras;
  readonly nameOf: NameOf;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  return (
    <details class="coalitions__extra" data-extra="larger">
      <summary class="coalitions__extra-title">
        {t('coalition.larger', {
          count: formatInteger(locale, extras.largerTotal),
        })}
      </summary>
      {extras.larger.length === 0 ? (
        <p class="coalitions__empty" data-empty="larger">
          {t('coalition.larger.none')}
        </p>
      ) : (
        <div class="table-scroll" tabIndex={0}>
          <table class="results-table" data-table="larger">
            <thead>
              <tr>
                <th scope="col">{t('coalition.column.members')}</th>
                <th scope="col">{t('coalition.column.seats')}</th>
                <th scope="col">{t('coalition.column.margin')}</th>
                <th scope="col">{t('coalition.column.opposition')}</th>
              </tr>
            </thead>
            <tbody>
              {extras.larger.map((coalition: Coalition) => {
                const key = coalition.partyIds.join('+');
                return (
                  <tr key={key} data-larger={key}>
                    <td data-cell="members">
                      <Names ids={coalition.partyIds} nameOf={nameOf} t={t} />
                    </td>
                    <td data-cell="seats">
                      {formatInteger(locale, coalition.seats)}
                    </td>
                    <td data-cell="margin">
                      {formatInteger(locale, coalition.margin)}
                    </td>
                    <td data-cell="opposition">
                      {formatInteger(locale, coalition.opposition)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!extras.largerComplete && (
        <p class="coalitions__note" data-note="larger-partial">
          {t('coalition.larger.partial')}
        </p>
      )}
      <RowLimitNote total={extras.largerTotal} locale={locale} t={t} />
    </details>
  );
}

function BlockedReasons({
  entry,
  nameOf,
  t,
}: {
  readonly entry: BlockedMajority;
  readonly nameOf: NameOf;
  readonly t: Translate;
}) {
  return (
    <ul class="coalitions__reasons">
      {entry.forbiddenPairs.map((pair) => (
        <li key={pair.partyIds.join('|')} data-reason="forbidden">
          {t('coalition.reason.forbidden')}
          {': '}
          <PairNames pair={pair} nameOf={nameOf} />
          <RefusalNote pair={pair} nameOf={nameOf} t={t} />
        </li>
      ))}
      {entry.ineligiblePartyIds.length > 0 && (
        <li data-reason="ineligible">
          {t('coalition.reason.ineligible')}
          {': '}
          <Names ids={entry.ineligiblePartyIds} nameOf={nameOf} t={t} />
        </li>
      )}
    </ul>
  );
}

function BlockedList({
  extras,
  nameOf,
  locale,
  t,
}: {
  readonly extras: CoalitionExtras;
  readonly nameOf: NameOf;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  return (
    <details class="coalitions__extra" data-extra="blocked">
      <summary class="coalitions__extra-title">
        {t('coalition.blocked', {
          count: formatInteger(locale, extras.blockedTotal),
        })}
      </summary>
      <p class="coalitions__intro">{t('coalition.blocked.intro')}</p>
      {extras.blocked.length === 0 ? (
        <p class="coalitions__empty" data-empty="blocked">
          {t('coalition.blocked.none')}
        </p>
      ) : (
        <div class="table-scroll" tabIndex={0}>
          <table class="results-table" data-table="blocked">
            <thead>
              <tr>
                <th scope="col">{t('coalition.column.members')}</th>
                <th scope="col">{t('coalition.column.seats')}</th>
                <th scope="col" class="coalitions__reason">
                  {t('coalition.column.reason')}
                </th>
              </tr>
            </thead>
            <tbody>
              {extras.blocked.map((entry) => {
                const key = entry.partyIds.join('+');
                return (
                  <tr key={key} data-blocked={key}>
                    <td data-cell="members">
                      <Names ids={entry.partyIds} nameOf={nameOf} t={t} />
                    </td>
                    <td data-cell="seats">
                      {formatInteger(locale, entry.seats)}
                    </td>
                    <td data-cell="reason" class="coalitions__reason">
                      <BlockedReasons entry={entry} nameOf={nameOf} t={t} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!extras.blockedComplete && (
        <p class="coalitions__note" data-note="blocked-partial">
          {t('coalition.blocked.partial')}
        </p>
      )}
      <RowLimitNote total={extras.blockedTotal} locale={locale} t={t} />
    </details>
  );
}

function Forbidden({
  pairs,
  nameOf,
  t,
}: {
  readonly pairs: readonly ForbiddenPair[];
  readonly nameOf: NameOf;
  readonly t: Translate;
}) {
  return (
    <>
      <h4 class="coalitions__title">{t('coalition.forbidden')}</h4>
      {pairs.length === 0 ? (
        <p class="coalitions__empty" data-empty="forbidden">
          {t('coalition.noForbidden')}
        </p>
      ) : (
        <ul class="coalitions__list" data-list="forbidden">
          {pairs.map((pair) => {
            const key = pair.partyIds.join('|');
            const refused = pair.refusedBy.length > 0;
            return (
              <li
                key={key}
                data-forbidden={key}
                data-source={pair.source}
                data-refused-by={refused ? pair.refusedBy.join(' ') : undefined}
              >
                <PairNames pair={pair} nameOf={nameOf} />
                {refused || pair.source === 'party' ? (
                  <span class="coalitions__source">
                    {refused ? (
                      <RefusalNote pair={pair} nameOf={nameOf} t={t} />
                    ) : (
                      <> ({t('coalition.source.party')})</>
                    )}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function SearchState(props: CoalitionsProps & { readonly nameOf: NameOf }) {
  const { run, locale, t, nameOf } = props;
  switch (run.state) {
    case 'idle':
      return (
        <p class="note" data-note="idle">
          {t('coalition.idle')}
        </p>
      );
    case 'running':
      return (
        <div class="coalitions__progress">
          <progress
            data-progress="coalitions"
            value={run.nodesVisited}
            max={run.budget}
            aria-label={t('coalition.progress')}
          />
          <p class="coalitions__note" role="status">
            {t('coalition.searching', {
              nodes: formatInteger(locale, run.nodesVisited),
            })}
          </p>
          <button
            type="button"
            class="button"
            data-action="cancel-coalitions"
            onClick={props.onCancel}
          >
            {t('coalition.cancel')}
          </button>
        </div>
      );
    case 'cancelled':
    case 'failed':
      return (
        <div class="coalitions__progress">
          <p class="note" data-note={run.state}>
            {t(`coalition.${run.state}`)}
          </p>
          <button
            type="button"
            class="button"
            data-action="rerun-coalitions"
            onClick={props.onRerun}
          >
            {t('coalition.rerun')}
          </button>
        </div>
      );
    case 'done': {
      const { analysis } = run;
      return (
        <>
          {run.inPage && (
            <p class="note" data-note="in-page">
              {t('coalition.inPage')}
            </p>
          )}
          <Summary analysis={analysis} nameOf={nameOf} locale={locale} t={t} />
          {analysis.status !== 'no-allocation' && (
            <Winners
              analysis={analysis}
              total={run.minimalWinningTotal ?? analysis.minimalWinning.length}
              nameOf={nameOf}
              locale={locale}
              t={t}
            />
          )}
          {analysis.status !== 'no-allocation' && run.extras !== undefined && (
            <>
              <PivotalList
                extras={run.extras}
                total={
                  run.minimalWinningTotal ?? analysis.minimalWinning.length
                }
                nameOf={nameOf}
                locale={locale}
                t={t}
              />
              <LargerList
                extras={run.extras}
                nameOf={nameOf}
                locale={locale}
                t={t}
              />
              <BlockedList
                extras={run.extras}
                nameOf={nameOf}
                locale={locale}
                t={t}
              />
            </>
          )}
          <Forbidden pairs={analysis.forbiddenPairs} nameOf={nameOf} t={t} />
        </>
      );
    }
  }
}

function Chooser(props: CoalitionsProps & { readonly nameOf: NameOf }) {
  const { scenario, seats, selection, locale, t, nameOf } = props;
  const known = new Set(scenario.parties.map((party) => party.id));
  const chosen = selection.filter((id) => known.has(id));
  const evaluation =
    chosen.length === 0
      ? null
      : evaluateCoalition(scenario, seats.allocation, chosen);
  const yesNo = (value: boolean): string =>
    t(value ? 'coalition.yes' : 'coalition.no');
  return (
    <>
      <fieldset class="chooser" data-chooser="coalition">
        <legend>{t('coalition.choose')}</legend>
        {scenario.parties.map((party) => (
          <label key={party.id} class="chooser__item">
            <input
              type="checkbox"
              data-choose={party.id}
              checked={chosen.includes(party.id)}
              onChange={() => props.onToggle(party.id)}
            />{' '}
            <bdi>{party.name}</bdi>
          </label>
        ))}
      </fieldset>
      {evaluation !== null && (
        <dl class="summary" data-evaluation="coalition">
          {(
            [
              ['seats', formatInteger(locale, evaluation.seats)],
              ['margin', formatInteger(locale, evaluation.margin)],
              ['opposition', formatInteger(locale, evaluation.opposition)],
              ['reachesMajority', yesNo(evaluation.reachesMajority)],
              ['feasible', yesNo(evaluation.feasible)],
              ['minimal', yesNo(evaluation.minimal)],
            ] as const
          ).map(([field, value]) => (
            <div key={field} class="summary__item">
              <dt>{t(`coalition.evaluation.${field}`)}</dt>
              <dd data-evaluation-field={field}>{value}</dd>
            </div>
          ))}
          <div class="summary__item">
            <dt>{t('coalition.evaluation.ineligible')}</dt>
            <dd data-evaluation-field="ineligible">
              <Names
                ids={evaluation.ineligiblePartyIds}
                nameOf={nameOf}
                t={t}
              />
            </dd>
          </div>
          <div class="summary__item">
            <dt>{t('coalition.evaluation.forbidden')}</dt>
            <dd data-evaluation-field="forbidden">
              {evaluation.forbiddenPairs.length === 0
                ? t('coalition.none')
                : evaluation.forbiddenPairs.map((pair, index) => (
                    <Fragment key={pair.partyIds.join('|')}>
                      {index > 0 && ', '}
                      <PairNames pair={pair} nameOf={nameOf} />
                      <RefusalNote pair={pair} nameOf={nameOf} t={t} />
                    </Fragment>
                  ))}
            </dd>
          </div>
        </dl>
      )}
    </>
  );
}

export function Coalitions(props: CoalitionsProps) {
  const nameOf = namer(props.scenario);
  return (
    <div class="coalitions" data-coalitions={props.run.state}>
      {props.seats.allocation.noAllocation === null && (
        <Chooser {...props} nameOf={nameOf} />
      )}
      <SearchState {...props} nameOf={nameOf} />
    </div>
  );
}
