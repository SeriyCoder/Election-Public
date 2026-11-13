import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { isDraft, setGroupFraction } from '../engine/edit';
import {
  freezeSupporters,
  populationTimeline,
  populationTrend,
  runSupporters,
} from '../engine/supporterTurnout';
import { fractionToPercent } from '../engine/numeric';
import { runSeats, type SeatProjection, type SeatResult } from '../engine/run';
import { buildReport } from '../engine/report';
import {
  buildCoalitionFuture,
  buildFutureReport,
  type CoalitionFuture,
  type CoalitionYear,
} from '../engine/future';
import { majorityRequired } from '../engine/coalitions';
import { panelDisplay, panelPercent, unusualGrowth } from '../engine/panel';
import { formatChange, formatDecimal, formatInteger } from '../i18n/format';
import { LIMITS, validateScenario, type Scenario } from '../engine/schema';
import { formatYears, type Locale, type Translate } from '../i18n';
import { entityName } from './names';
import { groupColorOf } from './groupColors';
import { FutureYear } from './Future';
import {
  PanelBox,
  PanelNumber,
  SupporterControls,
  SuspendedRepair,
} from './PanelControls';
import type { Store } from './store';
import type { CoalitionRun } from './coalitionRunner';
import { useTileSets, type TileEntry } from './tileSets';

const OTHERS = '#d8dee8';

/** The prototype's seat ring: members coloured, others grey, majority tick. */
function Ring({
  year,
  future,
  scenario,
  label,
  locale,
  t,
}: {
  readonly year: CoalitionYear;
  readonly future: CoalitionFuture;
  readonly scenario: Scenario;
  readonly label: string;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  const colors = future.partyIds.map(
    (id) => scenario.parties.find((party) => party.id === id)?.color ?? OTHERS,
  );
  const slices = year.stops.map(
    (stop, index) =>
      `${colors[index]} ${index === 0 ? '0' : year.stops[index - 1]}% ${stop}%`,
  );
  const last = year.stops[year.stops.length - 1] ?? '0';
  const seats =
    year.seats === null
      ? t('panel.noSeats')
      : t('panel.seatsOf', {
          seats: formatInteger(locale, year.seats),
          total: formatInteger(locale, future.seatCount),
          majority: formatInteger(locale, future.majority),
        });
  return (
    <figure class="ws-ring-box">
      <figcaption class="ws-ring-label">{label}</figcaption>
      <div
        class="ws-ring"
        role="img"
        aria-label={`${label}: ${seats}`}
        style={{
          background: `conic-gradient(${[...slices, `${OTHERS} ${last}% 100%`].join(',')})`,
        }}
      >
        <span class="ws-ring-centre" aria-hidden="true">
          {`${year.seats ?? '—'}`}
          <small>{`/ ${future.seatCount}`}</small>
        </span>
        <span
          class="ws-ring-tick"
          aria-hidden="true"
          style={{ transform: `rotate(calc(${future.majorityStop} * 3.6deg))` }}
        />
      </div>
      <p class="ws-ring-note">
        {year.seats === null
          ? t('panel.noSeats')
          : year.reachesMajority
            ? t('panel.majorityYes')
            : t('panel.shortBy', {
                count: formatInteger(locale, year.missing ?? 0),
              })}
      </p>
    </figure>
  );
}

function partyName(scenario: Scenario, id: string, t: Translate) {
  const party = scenario.parties.find((item) => item.id === id);
  return party ? entityName('party', party, t) : id;
}

function entryText(scenario: Scenario, entry: TileEntry, t: Translate) {
  return `${entry.label} · ${
    entry.partyIds.map((id) => partyName(scenario, id, t)).join(' + ') || '—'
  }`;
}

function Breach({
  future,
  scenario,
  t,
}: {
  readonly future: CoalitionFuture;
  readonly scenario: Scenario;
  readonly t: Translate;
}) {
  if (future.forbiddenPairs.length === 0) return null;
  return (
    <p class="ws-conflict">
      {t('futureCoalitions.breach')}:{' '}
      {future.forbiddenPairs
        .flatMap((pair) => pair.refusedBy)
        .map((id) => partyName(scenario, id, t))
        .join(', ')}
    </p>
  );
}

export function FutureWorkspace({
  store,
  t,
  run,
}: {
  readonly store: Store;
  readonly t: Translate;
  readonly run?: CoalitionRun;
}) {
  const state = store.getState();
  const locale = state.language;
  const derived = store.getDerived();
  const invalid = !derived.validation.ok;
  const checked = useMemo(() => validateScenario(state.input), [state.input]);
  const [mode, setMode] = useState<'growth' | 'experiment'>('growth');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const source =
    state.panel.experiment?.source ?? (checked.ok ? checked.scenario : null);
  const series = useMemo(
    () => (source ? populationTimeline(source) : []),
    [source],
  );
  const trend = useMemo(() => populationTrend(series), [series]);
  useEffect(() => {
    setPlaying(false);
  }, [state.input]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const current = store.getState().futureYear;
      if (current >= LIMITS.projectionYears || document.hidden) {
        setPlaying(false);
        return;
      }
      store.setFutureYear(current + 1);
      if (current + 1 >= LIMITS.projectionYears) setPlaying(false);
    }, 1000 / speed);
    return () => clearInterval(timer);
  }, [store, playing, speed]);
  const share = (text: string | null | undefined) =>
    text == null ? '—' : formatDecimal(locale, panelDisplay(text));
  const year = state.futureYear;
  const timeline = () => (
    <section class="ws-timeline" aria-label={t('view.future')}>
      <strong class="ws-timeline-title">
        {t('panel.timeline', { years: formatYears(locale, year) })}
      </strong>
      <div class="ws-years">
        <small>{t('panel.years', { max: LIMITS.projectionYears })}</small>
        <FutureYear
          year={year}
          locale={locale}
          t={t}
          onYear={(value) => {
            setPlaying(false);
            store.setFutureYear(value);
          }}
        />
      </div>
      <div class="ws-timeline-actions">
        <button
          type="button"
          class="ws-button"
          data-action="future-start"
          onClick={() => {
            setPlaying(false);
            store.setFutureYear(0);
          }}
        >
          {t('panel.toStart')}
        </button>
        <button
          type="button"
          class="ws-play"
          data-action="future-play"
          aria-pressed={playing}
          disabled={invalid}
          onClick={() => setPlaying(!playing)}
        >
          {t('panel.play')}
        </button>
        <select
          data-future-speed
          aria-label={t('panel.speed')}
          value={speed}
          onChange={(event) =>
            setSpeed(JSON.parse(event.currentTarget.value) as number)
          }
        >
          {[1, 2, 5].map((value) => (
            <option value={value} key={value}>
              {t('panel.speedValue', { value })}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
  const modes = (
    <div class="ws-modes">
      {(['growth', 'experiment'] as const).map((value) => (
        <button
          key={value}
          type="button"
          class="ws-mode"
          data-future-mode={value}
          aria-pressed={mode === value}
          onClick={() => {
            setMode(value);
            setPlaying(false);
          }}
        >
          {t(value === 'growth' ? 'panel.growthMode' : 'panel.experimentMode')}
        </button>
      ))}
    </div>
  );
  if (!source)
    return (
      <div class="ws-future">
        <p class="ws-banner" data-future-banner>
          {t('panel.futureBanner')}
        </p>
        {modes}
        {timeline()}
        <p role="status">{t('panel.stale')}</p>
      </div>
    );
  const growth = (
    <div data-growth-card>
      <PanelBox
        id="growth"
        title={t('panel.growthTitle')}
        t={t}
        enlargedTop={timeline}
      >
        <p class="ws-hint">{t('panel.growthHint')}</p>
        {source.groups.map((group, g) => {
          const delta = series[year]?.delta[g];
          return (
            <div
              class="ws-rate-row"
              key={group.id}
              style={{ '--color': groupColorOf(group.id, g) }}
            >
              <span class="ws-rate-name">
                <i class="ws-dot" aria-hidden="true" />
                <bdi>{entityName('group', group, t)}</bdi>
              </span>
              <PanelNumber
                store={store}
                layout="horizontal"
                value={fractionToPercent(group.growthRate) ?? '0'}
                display={(text) => formatDecimal(locale, text)}
                label={`${t('group.growthRate')}: ${entityName('group', group, t)}`}
                marker={{ 'data-growth': group.id }}
                min={-5}
                max={5}
                onChange={(text) => {
                  setPlaying(false);
                  try {
                    const input = store.getState().input;
                    if (!isDraft(input)) return false;
                    const next = setGroupFraction(
                      input,
                      group.id,
                      'growthRate',
                      text,
                    );
                    if (!validateScenario(next).ok) return false;
                    store.updateInput(() => next);
                    return true;
                  } catch {
                    return false;
                  }
                }}
              />
              <span class="ws-rate-share">
                {share(series[0]?.shares[g])}% →{' '}
                {share(series[year]?.shares[g])}%
                <small>
                  {delta == null
                    ? '—'
                    : formatChange(locale, panelDisplay(delta))}{' '}
                  {t('panel.pp')}
                </small>
              </span>
              {unusualGrowth(group.growthRate) && (
                <span class="note">{t('panel.unusualGrowth')}</span>
              )}
            </div>
          );
        })}
        {invalid && <p role="status">{t('panel.stale')}</p>}
        <div class="ws-growth-summary">
          <span>
            {t('panel.fromStart')}: {share(series[0]?.scale)}% →{' '}
            {share(series[year]?.scale)}%
          </span>
          <button
            type="button"
            class="ws-button"
            data-action="growth-source"
            onClick={() => {
              setPlaying(false);
              store.resetGrowth();
            }}
          >
            {t('panel.growthSource')}
          </button>
        </div>
        <svg
          class="ws-trend"
          data-population-series
          viewBox="0 0 420 118"
          role="img"
          aria-label={t('panel.series')}
        >
          {trend.grid.map((line) => (
            <g key={line.value}>
              <line x1="27" x2="410" y1={line.y} y2={line.y} stroke="#dce4ef" />
              <text x="1" y={line.y} dy="3">
                {`${formatInteger(locale, line.value)}%`}
              </text>
            </g>
          ))}
          {!invalid &&
            trend.paths.map((path, g) => (
              <path
                key={source.groups[g]!.id}
                d={path}
                fill="none"
                stroke={groupColorOf(source.groups[g]!.id, g)}
                stroke-width="2"
              />
            ))}
          {trend.years.map((tick) => (
            <text key={tick.year} x={tick.x} y="115" text-anchor="middle">
              {formatInteger(locale, tick.year)}
            </text>
          ))}
          <line
            class="ws-series-year"
            data-year-marker
            x1={trend.x(year)}
            x2={trend.x(year)}
            y1="8"
            y2="100"
            stroke="#17243c"
            stroke-dasharray="3 3"
          />
        </svg>
        <p class="ws-trend-note">{t('panel.trendNote')}</p>
        {series.some((sample) => sample.reason) && <p>{t('panel.unknown')}</p>}
      </PanelBox>
    </div>
  );
  const raw = derived.validation.ok ? derived.validation.scenario : null;
  const base = derived.result;
  return (
    <div class="ws-future" data-future-current={mode}>
      <p class="ws-banner" data-future-banner>
        {t('panel.futureBanner')}
      </p>
      {modes}
      {timeline()}
      <div class="ws-fmain">
        <div class="ws-fleft">
          {mode === 'growth' ? (
            growth
          ) : (
            <section class="ws-card ws-card--panel" data-turnout-card>
              <h3 class="ws-subtitle">{t('panel.supporters')}</h3>
              <SupporterControls store={store} t={t} normalized />
            </section>
          )}
        </div>
        {raw !== null && base !== null ? (
          <FutureCards
            store={store}
            t={t}
            run={run}
            scenario={raw}
            base={base}
            mode={mode}
            onStop={() => setPlaying(false)}
            timeline={timeline}
          />
        ) : (
          <p role="status">{t('panel.stale')}</p>
        )}
      </div>
    </div>
  );
}

function FutureCards({
  store,
  t,
  run,
  scenario,
  base,
  mode,
  onStop,
  timeline,
}: {
  readonly store: Store;
  readonly t: Translate;
  readonly run?: CoalitionRun;
  readonly scenario: Scenario;
  readonly base: SeatResult;
  readonly mode: 'growth' | 'experiment';
  readonly onStop: () => void;
  readonly timeline: () => ComponentChildren;
}) {
  const state = store.getState();
  const locale = state.language;
  const year = state.futureYear;
  const { entries, tiles, shown, options } = useTileSets(
    store,
    scenario,
    base,
    run,
  );
  const [experimentKey, setExperimentKey] = useState<string | null>(null);
  const projection: SeatProjection | null = store.getProjection();
  const projected =
    projection !== null && !('kind' in projection) ? projection : null;
  const unavailable =
    projection !== null && 'kind' in projection ? projection.reason : null;
  const report = projected
    ? buildFutureReport(scenario, base, projected, year)
    : null;
  const summary = (
    <p class="ws-fsummary" data-future-summary>
      <span>
        {t('panel.overallTurnout')}:{' '}
        {report?.totals.turnout.baseline
          ? `${formatDecimal(locale, panelDisplay(report.totals.turnout.baseline))}%`
          : '—'}{' '}
        →{' '}
        {report?.totals.turnout.current
          ? `${formatDecimal(locale, panelDisplay(report.totals.turnout.current))}%`
          : '—'}
      </span>
      <span>
        {t('panel.majorityOf', {
          count: formatInteger(locale, majorityRequired(scenario)),
          seats: formatInteger(locale, scenario.rules.seatCount),
        })}
      </span>
      <span>
        {t('panel.thresholdLine', {
          value: formatDecimal(
            locale,
            fractionToPercent(scenario.rules.threshold) ?? '0',
          ),
        })}
      </span>
    </p>
  );
  const choose = (index: number, key: string) => {
    onStop();
    const next = [...tiles];
    if (key === 'none') next.splice(index, 1);
    else {
      const taken = next.indexOf(key);
      if (taken >= 0) next[taken] = next[index]!;
      next[index] = key;
    }
    store.setPanelSession({ tiles: next });
  };
  const optionList = (entries: readonly TileEntry[]) =>
    entries.map((entry) => (
      <option key={entry.key} value={entry.key}>
        {entryText(scenario, entry, t)}
      </option>
    ));
  if (mode === 'experiment') {
    const entry =
      entries.find((item) => item.key === experimentKey) ??
      shown[0] ??
      entries[0];
    return (
      <div class="ws-results-box" data-experiment-card>
        <PanelBox
          id="future"
          title={t('panel.sameCoalitions')}
          t={t}
          enlargedTop={timeline}
        >
          <label class="ws-hint ws-choice">
            {t('panel.experimentChoice')}
            <select
              class="ws-select"
              data-experiment-select
              value={entry?.key ?? ''}
              onChange={(event) => {
                onStop();
                setExperimentKey(event.currentTarget.value);
              }}
            >
              {optionList(options)}
            </select>
          </label>
          {summary}
          {entry && (
            <Experiment
              store={store}
              t={t}
              partyIds={entry.partyIds}
              onStop={onStop}
            />
          )}
          <p class="ws-hint">{t('panel.pieNote')}</p>
        </PanelBox>
      </div>
    );
  }
  return (
    <div data-future-cards class="ws-results-box">
      <PanelBox
        id="future"
        title={t('panel.sameCoalitions')}
        t={t}
        enlargedTop={timeline}
        actions={
          tiles.length < 4 && (
            <button
              type="button"
              class="ws-button"
              data-action="future-card-add"
              onClick={() => {
                const key = entries
                  .map((item) => item.key)
                  .find((candidate) => !tiles.includes(candidate));
                if (key) store.setPanelSession({ tiles: [...tiles, key] });
              }}
            >
              {t('panel.add')}
            </button>
          )
        }
      >
        {summary}
        {unavailable === 'suspended-model' ? (
          <SuspendedRepair store={store} t={t} />
        ) : (
          unavailable !== null && (
            <p class="note" data-cards-unavailable={unavailable}>
              {t(`future.unavailable.${unavailable}`)}
            </p>
          )
        )}
        <div class="ws-fgrid" data-count={shown.length}>
          {shown.map((entry, index) => {
            const future = buildCoalitionFuture(
              scenario,
              base,
              projected ?? base,
              entry.partyIds,
            );
            const after = projected ? future.projected : null;
            return (
              <article
                key={entry.key}
                class="ws-fcard"
                data-future-card={entry.key}
                data-majority={`${(after ?? future.base).reachesMajority}`}
              >
                <div class="ws-fcard-head">
                  <span class="ws-badge">{entry.label}</span>
                  <select
                    class="ws-select"
                    data-future-card-select
                    aria-label={t('panel.cardLabel', { number: index + 1 })}
                    value={entry.key}
                    onChange={(event) =>
                      choose(index, event.currentTarget.value)
                    }
                  >
                    <option value="none">{t('panel.removeCard')}</option>
                    {optionList(options)}
                  </select>
                </div>
                <div class="ws-rings">
                  <Ring
                    year={future.base}
                    future={future}
                    scenario={scenario}
                    label={t('panel.originalToday')}
                    locale={locale}
                    t={t}
                  />
                  {after ? (
                    <Ring
                      year={after}
                      future={future}
                      scenario={scenario}
                      label={t('panel.inYears', {
                        years: formatYears(locale, year),
                      })}
                      locale={locale}
                      t={t}
                    />
                  ) : (
                    <p class="note">—</p>
                  )}
                </div>
                <p class="ws-change" data-future-card-change>
                  {t('panel.seatChange', {
                    change:
                      future.seats.change === null || !after
                        ? '—'
                        : formatChange(locale, `${future.seats.change}`),
                  })}{' '}
                  · {t('panel.nationalVotes')}{' '}
                  {future.base.voteShare === null
                    ? '—'
                    : `${formatDecimal(locale, future.base.voteShare)}%`}{' '}
                  →{' '}
                  {after?.voteShare == null
                    ? '—'
                    : `${formatDecimal(locale, after.voteShare)}%`}
                </p>
                <div class="ws-members">
                  <p class="ws-members-row" data-members="in">
                    <span class="ws-members-label">
                      {t('panel.inCoalition')}:
                    </span>
                    {future.members.map((member) => (
                      <span
                        key={member.partyId}
                        class="ws-member ws-member--in"
                        data-future-card-party={member.partyId}
                        style={{
                          '--color':
                            scenario.parties.find(
                              (party) => party.id === member.partyId,
                            )?.color ?? OTHERS,
                        }}
                      >
                        <i class="ws-dot" aria-hidden="true" />
                        <bdi>
                          {partyName(scenario, member.partyId, t).trim()}
                        </bdi>{' '}
                        {`${member.seats.baseline ?? '—'}→${
                          after ? (member.seats.current ?? '—') : '—'
                        }`}
                      </span>
                    ))}
                  </p>
                  {scenario.parties.some(
                    (party) => !entry.partyIds.includes(party.id),
                  ) && (
                    <p class="ws-members-row" data-members="out">
                      <span class="ws-members-label">
                        {t('panel.outCoalition')}:
                      </span>
                      {scenario.parties
                        .filter((party) => !entry.partyIds.includes(party.id))
                        .map((party) => (
                          <span
                            key={party.id}
                            class="ws-member ws-member--out"
                            data-future-card-party={party.id}
                          >
                            <bdi>{partyName(scenario, party.id, t).trim()}</bdi>{' '}
                            {`${
                              base.allocation.parties.find(
                                (row) => row.partyId === party.id,
                              )?.seats ?? '—'
                            }→${
                              after
                                ? (projected?.allocation.parties.find(
                                    (row) => row.partyId === party.id,
                                  )?.seats ?? '—')
                                : '—'
                            }`}
                          </span>
                        ))}
                    </p>
                  )}
                </div>
                <Breach future={future} scenario={scenario} t={t} />
              </article>
            );
          })}
        </div>
        <p class="ws-hint">{t('panel.pieNote')}</p>
      </PanelBox>
    </div>
  );
}

function Experiment({
  store,
  t,
  partyIds,
  onStop,
}: {
  readonly store: Store;
  readonly t: Translate;
  readonly partyIds: readonly string[];
  readonly onStop: () => void;
}) {
  const state = store.getState();
  const locale = state.language;
  const year = state.futureYear;
  const checked = validateScenario(state.input);
  const source =
    state.panel.experiment?.source ?? (checked.ok ? checked.scenario : null);
  const snapshots = useMemo(() => {
    if (!source) return null;
    const basis = state.panel.experiment ?? freezeSupporters(source);
    if ('kind' in basis) return null;
    try {
      return {
        basis,
        original: { scenario: basis.source, result: runSeats(basis.source) },
        base: runSupporters(basis, {}),
        today: runSupporters(basis, state.panel.targets),
        future: runSupporters(basis, state.panel.targets, year),
      };
    } catch {
      return null;
    }
  }, [source, state.panel.experiment, state.panel.targets, year]);
  if (!snapshots) return <p role="status">{t('panel.stale')}</p>;
  const scenario = snapshots.basis.source;
  const rows = [
    { id: 'original' as const, ...snapshots.original },
    { id: 'today' as const, ...snapshots.today },
    { id: 'future' as const, ...snapshots.future },
  ];
  const turnoutPart = buildCoalitionFuture(
    scenario,
    snapshots.original.result,
    snapshots.today.result,
    partyIds,
  );
  const demographyPart = buildCoalitionFuture(
    scenario,
    snapshots.today.result,
    snapshots.future.result,
    partyIds,
  );
  const signed = (value: number | null) =>
    value === null ? '—' : formatChange(locale, `${value}`);
  const labels = {
    original: t('panel.originalToday'),
    today: t('panel.newToday'),
    future: t('panel.newFuture', { years: formatYears(locale, year) }),
  };
  const reports = rows.map((row) => buildReport(row.scenario, row.result));
  return (
    <div class="ws-experiment" onChange={onStop}>
      <div class="ws-rings ws-rings--three">
        {rows.map((row, index) => {
          const future = buildCoalitionFuture(
            scenario,
            row.result,
            row.result,
            partyIds,
          );
          return (
            <section
              key={row.id}
              class="ws-snapshot"
              data-experiment-snapshot={row.id}
              data-winning={future.base.reachesMajority}
            >
              <Ring
                year={future.base}
                future={future}
                scenario={scenario}
                label={labels[row.id]}
                locale={locale}
                t={t}
              />
              {row.id !== 'original' && (
                <p class="ws-snapshot-note" data-snapshot-note={row.id}>
                  {t(
                    row.id === 'today'
                      ? 'panel.snapshotToday'
                      : 'panel.snapshotFuture',
                  )}
                </p>
              )}
              {row.id === 'today' && (
                <p class="ws-snapshot-note" data-snapshot-turnout>
                  {t('panel.overallTurnout')}:{' '}
                  {formatDecimal(
                    locale,
                    panelDisplay(
                      panelPercent(snapshots.original.result.votes.turnout),
                    ),
                  )}
                  % →{' '}
                  {formatDecimal(
                    locale,
                    panelDisplay(
                      panelPercent(snapshots.today.result.votes.turnout),
                    ),
                  )}
                  %
                </p>
              )}
              <div class="ws-snapshot-parties">
                {(['in', 'out'] as const).map((side) => {
                  const listed = reports[index]!.parties.filter(
                    (party) =>
                      partyIds.includes(party.partyId) === (side === 'in'),
                  );
                  if (listed.length === 0) return null;
                  return (
                    <p
                      key={side}
                      class="ws-members-row"
                      data-snapshot-parties={side}
                    >
                      <span class="ws-members-label">
                        {t(
                          side === 'in'
                            ? 'panel.inCoalition'
                            : 'panel.outCoalition',
                        )}
                        :
                      </span>
                      {listed.map((party) => (
                        <span
                          key={party.partyId}
                          class={`ws-member ws-member--${side}`}
                          data-snapshot-party={party.partyId}
                          style={
                            side === 'in'
                              ? {
                                  '--color':
                                    scenario.parties.find(
                                      (item) => item.id === party.partyId,
                                    )?.color ?? OTHERS,
                                }
                              : undefined
                          }
                        >
                          {side === 'in' && (
                            <i class="ws-dot" aria-hidden="true" />
                          )}
                          <bdi>
                            {partyName(scenario, party.partyId, t).trim()}
                          </bdi>
                          : {party.seats}
                        </span>
                      ))}
                    </p>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <p class="ws-change" data-experiment-split>
        {t('panel.experimentSplit', {
          turnout: signed(turnoutPart.seats.change),
          demography: signed(demographyPart.seats.change),
        })}
      </p>
      <Breach future={demographyPart} scenario={scenario} t={t} />
      <table class="ws-table">
        <caption>{t('panel.experimentTable')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('panel.colParty')}</th>
            <th scope="col">{t('panel.colOriginal')}</th>
            <th scope="col">{t('panel.colNew')}</th>
            <th scope="col">
              {t('panel.inYears', { years: formatYears(locale, year) })}
            </th>
          </tr>
        </thead>
        <tbody>
          {turnoutPart.members.map((member, index) => (
            <tr key={member.partyId}>
              <th scope="row">
                <bdi>{partyName(scenario, member.partyId, t)}</bdi>
              </th>
              <td>{member.seats.baseline ?? '—'}</td>
              <td>{member.seats.current ?? '—'}</td>
              <td>{demographyPart.members[index]?.seats.current ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4 class="ws-subtitle">{t('panel.groupTurnouts')}</h4>
      <p class="ws-members">
        {scenario.groups.map((group, g) => {
          const before = snapshots.base.groupTurnouts[g];
          const after = snapshots.today.groupTurnouts[g];
          return (
            <span
              key={group.id}
              style={{ '--color': groupColorOf(group.id, g) }}
            >
              <i class="ws-dot" aria-hidden="true" />
              <bdi>{entityName('group', group, t)}</bdi>{' '}
              {before == null
                ? '—'
                : `${formatDecimal(locale, panelDisplay(panelPercent(before)))}%`}{' '}
              →{' '}
              {after == null
                ? '—'
                : `${formatDecimal(locale, panelDisplay(panelPercent(after)))}%`}
            </span>
          );
        })}
      </p>
      <p class="ws-hint">
        {t('panel.nationalAll', { years: formatYears(locale, year) })}
      </p>
      <p class="ws-members">
        {reports[0]!.parties.map((party, p) => (
          <span key={party.partyId} style={{ '--color': party.color }}>
            <i class="ws-dot" aria-hidden="true" />
            <bdi>{partyName(scenario, party.partyId, t)}</bdi>{' '}
            {party.voteShare === null
              ? '—'
              : `${formatDecimal(locale, party.voteShare)}%`}{' '}
            →{' '}
            {reports[2]!.parties[p]?.voteShare == null
              ? '—'
              : `${formatDecimal(locale, reports[2]!.parties[p]!.voteShare!)}%`}
          </span>
        ))}
      </p>
    </div>
  );
}
