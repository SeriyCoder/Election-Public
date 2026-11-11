import {
  buildFutureVisuals,
  criticalSetDisplay,
  futureMeasureDisplay,
  summarizeCriticalSet,
  type CriticalColor,
  type CriticalCrossing,
  type CriticalSets,
  type FutureVisuals,
  type MissingReason,
} from '../engine/futureRange';
import { legacyFeatures } from '../engine/legacyConversion';
import type { SeatProjection, SeatResult } from '../engine/run';
import { LIMITS, type Scenario } from '../engine/schema';
import type { Locale, Translate } from '../i18n';
import { formatChange, formatDecimal, formatInteger } from '../i18n/format';
import type { FutureScanRun, FutureScanRunner } from './futureScanRunner';
import { groupColorOf } from './groupColors';

const COLORS: readonly CriticalColor[] = ['red', 'orange'];

interface VisualProps {
  readonly scenario: Scenario;
  readonly base: SeatResult;
  readonly projected: SeatProjection;
  readonly year: number;
  readonly locale: Locale;
  readonly t: Translate;
}

function missingText(reason: MissingReason, t: Translate): string {
  return reason === 'no-valid-votes' || reason === 'no-party-qualifies'
    ? t(`status.noAllocation.${reason}`)
    : t(`future.unavailable.${reason}`);
}

function Graphic({
  measure,
  kind,
  scenario,
  year,
  locale,
  t,
}: {
  readonly measure: FutureVisuals['population'];
  readonly kind: 'population' | 'votes';
  readonly scenario: Scenario;
  readonly year: number;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  const display = futureMeasureDisplay(measure);
  const title = t(`futureVisual.${kind}`);
  const entries =
    kind === 'population'
      ? scenario.groups.map((group, index) => ({
          ...group,
          color: groupColorOf(group.id, index),
        }))
      : scenario.parties;
  const labels = [t('future.column.base'), t('future.column.year', { year })];
  return (
    <section
      class="future-graphic"
      data-future-graphic={kind}
      data-scale-max={display.max}
      aria-label={title}
    >
      <h3>{title}</h3>
      {[display.baseline, display.current].map((side, index) => (
        <div
          key={index}
          data-graphic-year={index === 0 ? 0 : year}
          data-total={side.total ?? undefined}
          data-graphic-state={side.state}
        >
          <p>
            {labels[index]}:{' '}
            {side.label === null
              ? t('futureVisual.unavailable')
              : formatDecimal(locale, side.label)}
          </p>
          {side.state === 'available' ? (
            <div class="future-graphic__track" aria-hidden="true">
              <div
                class="future-graphic__fill"
                data-graphic-fill
                style={{ width: `${side.width}%` }}
              >
                {side.entries.map((entry, i) => (
                  <span
                    key={entry.id}
                    style={{
                      width: `${entry.width}%`,
                      background: entries[i]?.color,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p class="note">
              {side.reason === null
                ? t('futureVisual.zero')
                : missingText(side.reason, t)}
            </p>
          )}
        </div>
      ))}
      <div class="table-scroll" tabIndex={0}>
        <table class="results-table">
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">{t('compare.column.name')}</th>
              <th scope="col">{labels[0]}</th>
              <th scope="col">{labels[1]}</th>
              <th scope="col">{t('compare.column.change')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={entry.id} data-graphic-id={entry.id}>
                <th scope="row">
                  <span
                    class="swatch"
                    aria-hidden="true"
                    style={{ background: entry.color }}
                  />
                  <bdi>{entry.name}</bdi>
                </th>
                {[display.baseline, display.current].map((side, sideIndex) => {
                  const value = side.entries[index]!;
                  return (
                    <td
                      key={sideIndex}
                      data-amount={value.amount ?? undefined}
                      data-share={value.share ?? undefined}
                    >
                      {value.label === null
                        ? '—'
                        : formatDecimal(locale, value.label)}
                      {value.share !== null && (
                        <> ({formatDecimal(locale, value.share)}%)</>
                      )}
                    </td>
                  );
                })}
                <td data-change={display.changes[index]?.exact ?? undefined}>
                  {display.changes[index]?.label == null
                    ? '—'
                    : formatChange(locale, display.changes[index]!.label!)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function FutureGraphics(props: VisualProps) {
  const visual = buildFutureVisuals(
    props.scenario,
    props.base,
    props.projected,
  );
  return (
    <>
      {legacyFeatures(props.scenario).turnoutChange && (
        <p class="note" data-legacy-turnout-change>
          {props.t('legacy.turnoutChangeActive')}
        </p>
      )}
      <Graphic {...props} kind="population" measure={visual.population} />
      <Graphic {...props} kind="votes" measure={visual.validVotes} />
    </>
  );
}

export function CriticalPickers({
  scenario,
  sets,
  t,
  onToggle,
}: {
  readonly scenario: Scenario;
  readonly sets: CriticalSets;
  readonly t: Translate;
  readonly onToggle: (color: CriticalColor, partyId: string) => void;
}) {
  return (
    <div class="critical-pickers">
      {COLORS.map((color) => (
        <fieldset
          key={color}
          class="critical-set"
          data-critical-set={color}
          aria-label={t(`futureCritical.${color}`)}
        >
          <legend>{t(`futureCritical.${color}`)}</legend>
          {scenario.parties.map((party) => (
            <label key={party.id} class="entity__check">
              <input
                type="checkbox"
                data-critical-party={`${color}:${party.id}`}
                checked={sets[color].includes(party.id)}
                onChange={() => onToggle(color, party.id)}
              />
              <span
                class="swatch"
                aria-hidden="true"
                style={{ background: party.color }}
              />
              <bdi>{party.name}</bdi>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

function Crossing({
  crossing,
  locale,
  t,
}: {
  readonly crossing: CriticalCrossing;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  const year = 'year' in crossing ? crossing.year : undefined;
  const key =
    crossing.state === 'first-known'
      ? 'firstKnown'
      : crossing.state === 'not-reached'
        ? 'notReached'
        : crossing.state;
  return (
    <div data-crossing-state={crossing.state} data-crossing-year={year}>
      <p>
        {t(`futureCritical.${key}`, {
          year: year === undefined ? '' : formatInteger(locale, year),
          max: formatInteger(locale, LIMITS.projectionYears),
        })}
      </p>
      {'missing' in crossing && (
        <ul>
          {crossing.missing.map((missing) => (
            <li key={missing.year}>
              {t('future.column.year', {
                year: formatInteger(locale, missing.year),
              })}
              : {missingText(missing.reason, t)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CriticalResults({
  scenario,
  base,
  projected,
  year,
  sets,
  locale,
  t,
  run,
  runner,
}: VisualProps & {
  readonly sets: CriticalSets;
  readonly run: FutureScanRun;
  readonly runner?: FutureScanRunner;
}) {
  return (
    <div class="critical-results">
      <p class="note" data-critical-not-guaranteed>
        {t('futureCritical.notGuarantee')}
      </p>
      <div
        data-future-scan-state={run.state}
        data-future-scan-reason={
          run.state === 'failed' ? run.reason : undefined
        }
      >
        {run.state === 'running' ? (
          <>
            <p role="status">
              {t('futureCritical.progress', {
                year: formatInteger(locale, run.year),
                max: formatInteger(locale, LIMITS.projectionYears),
              })}
            </p>
            <progress
              data-future-scan-progress
              value={run.year + 1}
              max={LIMITS.projectionYears + 1}
              aria-label={t('futureCritical.progress', {
                year: run.year,
                max: LIMITS.projectionYears,
              })}
            />
            <button
              type="button"
              class="button"
              data-action="future-scan-cancel"
              onClick={() => runner?.cancel()}
            >
              {t('futureCritical.cancel')}
            </button>
          </>
        ) : run.state === 'failed' ? (
          <>
            <p role="alert">
              {run.reason === 'worker-unavailable'
                ? t('futureCritical.workerUnavailable')
                : t('futureCritical.failed', { message: run.message })}
            </p>
          </>
        ) : (
          <p role="status">{t(`futureCritical.${run.state}`)}</p>
        )}
        {(run.state === 'failed' || run.state === 'cancelled') && (
          <button
            type="button"
            class="button"
            data-action="future-scan-retry"
            onClick={() => runner?.rerun()}
          >
            {t('futureCritical.retry')}
          </button>
        )}
      </div>
      {COLORS.map((color) => (
        <article key={color} class="critical-set" data-critical-result={color}>
          <h4>{t(`futureCritical.${color}`)}</h4>
          {sets[color].length === 0 ? (
            <p>{t('futureCritical.empty')}</p>
          ) : (
            <>
              <p>
                {scenario.parties
                  .filter((party) => sets[color].includes(party.id))
                  .map((party) => party.name)
                  .join(' + ')}
              </p>
              {[base, projected].map((result, index) => {
                const sideYear = index === 0 ? 0 : year;
                const label =
                  index === 0
                    ? t('future.column.base')
                    : t('future.column.year', { year });
                if ('kind' in result)
                  return (
                    <div
                      key={index}
                      data-set-year={sideYear}
                      data-seat-state="unavailable"
                    >
                      <h5>{label}</h5>
                      <p>{missingText(result.reason, t)}</p>
                    </div>
                  );
                const summary = summarizeCriticalSet(
                  scenario,
                  result,
                  sets[color],
                );
                const display = criticalSetDisplay(summary);
                return (
                  <div
                    key={index}
                    data-set-year={sideYear}
                    data-seat-state={
                      summary.noAllocation === null
                        ? 'available'
                        : 'no-allocation'
                    }
                    data-seats={summary.seats ?? undefined}
                    data-half={
                      summary.isHalf === null ? undefined : `${summary.isHalf}`
                    }
                    data-majority={
                      summary.isMajority === null
                        ? undefined
                        : `${summary.isMajority}`
                    }
                  >
                    <h5>{label}</h5>
                    <p>
                      {t('compare.column.votes')}:{' '}
                      {formatDecimal(locale, display.votes)}
                      {display.share !== null && (
                        <> ({formatDecimal(locale, display.share)}%)</>
                      )}
                    </p>
                    {summary.noAllocation !== null ? (
                      <p data-no-allocation={summary.noAllocation}>
                        {missingText(summary.noAllocation, t)}
                      </p>
                    ) : (
                      <>
                        <p>
                          {t('compare.column.seats')}:{' '}
                          {formatInteger(locale, summary.seats!)}
                        </p>
                        <p>
                          {t('futureCritical.half', {
                            value: t(
                              summary.isHalf
                                ? 'futureCritical.yes'
                                : 'futureCritical.no',
                            ),
                          })}
                        </p>
                        <p>
                          {t('futureCritical.majority', {
                            needed: formatInteger(locale, summary.majority),
                            value: t(
                              summary.isMajority
                                ? 'futureCritical.yes'
                                : 'futureCritical.no',
                            ),
                          })}
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
              {run.state === 'done' && (
                <Crossing
                  crossing={run.result.crossings[color]}
                  locale={locale}
                  t={t}
                />
              )}
            </>
          )}
        </article>
      ))}
    </div>
  );
}
