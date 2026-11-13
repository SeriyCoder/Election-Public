import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Translate } from '../i18n';
import { formatChange, formatDecimal } from '../i18n/format';
import { isDraft } from '../engine/edit';
import {
  alignPanelVotes,
  applyPanelRows,
  correctPanelTurnout,
  editPanelCell,
  largestPopulationGap,
  panelDisplay,
  panelPercent,
  panelReference,
  panelAbstention,
  panelPopulation,
  panelSlices,
  panelTrackPosition,
  panelTotals,
  populationGaps,
  readPanel,
  rebuildPanelBasis,
  restorePanelCompositions,
  restorePanelRules,
  smoothPanel,
  stepPanelPercent,
  type PanelData,
  type PanelPopulation,
  type PanelEdit,
} from '../engine/panel';
import {
  COEFFICIENT_PREFIX,
  coefficientEntry,
  freezeSupporters,
  runSupporters,
  stepCoefficient,
  supporterRows,
} from '../engine/supporterTurnout';
import { fractionToPercent } from '../engine/numeric';
import { HoverPie, type PieSlice } from './HoverPie';
import { validateScenario } from '../engine/schema';
import type { Store } from './store';
import { entityName } from './names';
import { groupColorOf } from './groupColors';
import { CoalitionTiles } from './CoalitionTiles';
import type { CoalitionRun } from './coalitionRunner';
import { DirectedRelations } from './DirectedRelations';
import { canLockAnother, defaultLocks } from './book';

export function PanelModal({
  title,
  children,
  onClose,
}: {
  readonly title: string;
  readonly children: ComponentChildren;
  readonly onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      class="ws-modal"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header class="ws-head">
        <h2>{title}</h2>
        <button
          type="button"
          class="ws-enlarge"
          aria-label={title}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}

export function PanelBox({
  id,
  title,
  children,
  t,
  actions,
  hint,
  tone = 'card',
  enlargedTop,
}: {
  readonly id: string;
  readonly title: string;
  readonly children: ComponentChildren;
  readonly t: Translate;
  readonly actions?: ComponentChildren;
  readonly hint?: string;
  readonly tone?: 'card' | 'panel';
  /** Shown only inside the enlarged window, above the content. */
  readonly enlargedTop?: () => ComponentChildren;
}) {
  const [large, setLarge] = useState(false);
  return (
    <section
      class={tone === 'panel' ? 'ws-card ws-card--panel' : 'ws-card'}
      data-panel-box={id}
    >
      <header class="ws-head">
        <h3>{title}</h3>
        {!large && actions}
        <button
          type="button"
          class="ws-enlarge"
          data-enlarge={id}
          onClick={() => setLarge(true)}
        >
          {t('panel.enlarge')} ⤢
        </button>
      </header>
      {hint && <p class="ws-hint">{hint}</p>}
      {large ? (
        <PanelModal title={title} onClose={() => setLarge(false)}>
          {enlargedTop?.()}
          {actions}
          {children}
        </PanelModal>
      ) : (
        children
      )}
    </section>
  );
}

function LockIcon({ locked }: { readonly locked: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect x="3" y="7" width="10" height="8" rx="1.5" />
      <path
        d={
          locked
            ? 'M5.2 7V5a2.8 2.8 0 0 1 5.6 0v2'
            : 'M5.2 7V5a2.8 2.8 0 0 1 5.6 0'
        }
      />
    </svg>
  );
}

export function LockButton({
  locked,
  label,
  marker,
  onToggle,
}: {
  readonly locked: boolean;
  readonly label: string;
  readonly marker: Readonly<Record<string, string>>;
  readonly onToggle: () => void;
}) {
  return (
    <button
      type="button"
      class="ws-lock"
      {...marker}
      aria-pressed={locked}
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      <LockIcon locked={locked} />
    </button>
  );
}

/**
 * An exact text field with its slider. `vertical` draws the prototype's
 * column plot with the base and current bars; `horizontal` a plain track.
 */
/** Display-only: an exact percent text shown with at most two decimals. */
function shortPercent(value: string): string {
  if (!/^-?\d+\.\d{3,}$/.test(value)) return value;
  const shown = panelDisplay(value, 2);
  return shown.includes('.') ? shown.replace(/\.?0+$/, '') : shown;
}

export function PanelNumber({
  value,
  label,
  marker,
  onChange,
  disabled = false,
  min = 0,
  max = 100,
  store,
  layout = 'inline',
  base,
  nudge,
  t,
  step = '0.25',
  stepper = stepPanelPercent,
  plot = 'bars',
  limits,
  rangeMarker,
  fill,
  display,
}: {
  readonly value: string;
  readonly label: string;
  readonly marker: Readonly<Record<string, string>>;
  readonly onChange: (text: string) => boolean;
  readonly disabled?: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly store?: Store;
  readonly layout?: 'inline' | 'vertical' | 'horizontal';
  /** Height of the base bar in percent (vertical layout). */
  readonly base?: string | null;
  /** Attribute that names the stepper buttons, e.g. `data-nudge`. */
  readonly nudge?: {
    readonly attribute: string;
    readonly id: string;
    /** False: the attribute holds the bare ID and `data-direction` the sign. */
    readonly signed?: boolean;
  };
  readonly t?: Translate;
  readonly step?: string;
  /** Exact stepper for the − and + buttons. */
  readonly stepper?: (text: string, direction: 1 | -1) => string | null;
  /** `coefficient`: a −1..+1 track over the base and resulting turnout. */
  readonly plot?: 'bars' | 'coefficient';
  /** Whether each nudge can still move. */
  readonly limits?: { readonly down: boolean; readonly up: boolean };
  /** Marker attribute of the slider. */
  readonly rangeMarker?: Readonly<Record<string, string>>;
  /** Coefficient plot: base and resulting turnout bars behind the slider. */
  readonly fill?: { readonly base: string; readonly now: string };
  /** Shown form of the value in the text field, e.g. the locale notation. */
  readonly display?: (text: string) => string;
}) {
  const [invalid, setInvalid] = useState<string | null>(null);
  const [typing, setTyping] = useState<string | null>(null);
  const key = `${Object.keys(marker)[0]}:${Object.values(marker)[0]}`;
  const shownInvalid = store
    ? (store.getState().panel.invalidTexts[key] ?? null)
    : invalid;
  const apply = (text: string) => {
    const success = onChange(text);
    setInvalid(success ? null : text);
    if (store) {
      const invalidTexts = { ...store.getState().panel.invalidTexts };
      if (success) delete invalidTexts[key];
      else invalidTexts[key] = text;
      const errors = store
        .getState()
        .panel.invalidFields.filter((field) => field !== key);
      store.setPanelSession({
        invalidFields: success ? errors : [...errors, key],
        invalidTexts,
      });
    }
  };
  const text = (
    <input
      {...marker}
      class="ws-number"
      type="text"
      inputMode="decimal"
      dir="ltr"
      aria-label={label}
      aria-invalid={shownInvalid !== null}
      disabled={disabled}
      value={
        shownInvalid ??
        typing ??
        (display ? display(value) : shortPercent(value))
      }
      onFocus={() => setTyping(null)}
      onBlur={() => setTyping(null)}
      onInput={(event) => {
        setTyping(event.currentTarget.value);
        apply(event.currentTarget.value);
      }}
    />
  );
  const range = (className: string) => (
    <input
      {...rangeMarker}
      class={className}
      type="range"
      min={min}
      max={max}
      step={step}
      aria-label={label}
      disabled={disabled}
      value={value || '0'}
      style={{ '--pos': `${panelTrackPosition(value || '0', min, max)}%` }}
      onInput={(event) => apply(event.currentTarget.value)}
    />
  );
  const move = (direction: 1 | -1) => {
    const next = stepper(shownInvalid ?? value, direction);
    if (next !== null) apply(next);
  };
  const nudges = nudge && (
    <div class="ws-nudges">
      {([-1, 1] as const).map((direction) => (
        <button
          key={direction}
          type="button"
          class="ws-nudge"
          {...(nudge.signed === false
            ? {
                [nudge.attribute]: nudge.id,
                'data-direction': direction < 0 ? '-' : '+',
              }
            : {
                [nudge.attribute]: `${nudge.id}:${direction < 0 ? '-' : '+'}`,
              })}
          aria-label={`${label}: ${t ? t(direction < 0 ? 'panel.decrease' : 'panel.increase') : direction < 0 ? '−' : '+'}`}
          disabled={
            disabled ||
            (limits !== undefined && !(direction < 0 ? limits.down : limits.up))
          }
          onClick={() => move(direction)}
        >
          {direction < 0 ? '−' : '+'}
        </button>
      ))}
    </div>
  );
  if (layout === 'vertical' && plot === 'coefficient')
    return (
      <div class="ws-control">
        <div class="ws-plot" data-plot="coef">
          <i data-fill="base" style={{ height: `${fill?.base ?? '0'}%` }} />
          <i data-fill="now" style={{ height: `${fill?.now ?? '0'}%` }} />
          {range('ws-range')}
        </div>
        {text}
        {nudges}
      </div>
    );
  if (layout === 'vertical')
    return (
      <div class="ws-control">
        <div class="ws-plot">
          <i
            data-fill="base"
            style={{ height: `${base ?? (value || '0')}%` }}
          />
          <i data-fill="now" style={{ height: `${value || '0'}%` }} />
          {range('ws-range')}
        </div>
        {text}
        {nudges}
      </div>
    );
  return (
    <div class={layout === 'horizontal' ? 'ws-hcontrol' : 'ws-inline'}>
      {range('ws-hrange')}
      {text}
      {nudges}
    </div>
  );
}

export function RepairLink({
  action,
  t,
}: {
  readonly action: 'align' | 'smooth';
  readonly t: Translate;
}) {
  return (
    <p class="note">
      {t('panel.stale')}{' '}
      <button
        type="button"
        class="link-button"
        data-repair={action}
        onClick={() => {
          const button = document.querySelector<HTMLElement>(
            `[data-action="panel-${action}"]`,
          );
          button?.focus();
          button?.scrollIntoView({ block: 'center' });
        }}
      >
        {t(`panel.${action}`)}
      </button>
    </p>
  );
}

/** The suspended linked model, why it happened and its explicit rebuild. */
export function SuspendedRepair({
  store,
  t,
}: {
  readonly store: Store;
  readonly t: Translate;
}) {
  const [failure, setFailure] = useState('');
  return (
    <div class="note ws-suspended" data-suspended-model>
      <p>{t('panel.suspended')}</p>
      <button
        type="button"
        class="ws-align"
        data-attention="true"
        data-action="panel-rebuild"
        onClick={() => {
          const result = rebuildPanelBasis(store.getState().input);
          if (result.ok) {
            setFailure('');
            store.applyPanelEdit(result);
          } else setFailure(t(`linkedTurnout.${result.reason}`));
        }}
      >
        {t('panel.rebuild')}
      </button>
      {failure && <p role="status">{failure}</p>}
    </div>
  );
}

export function SupporterControls({
  store,
  t,
  normalized = false,
  entry = 'target',
}: {
  readonly store: Store;
  readonly t: Translate;
  readonly normalized?: boolean;
  /** `coefficient`: the prototype's −1..+1 entry (M7-17); `target`: exact percent. */
  readonly entry?: 'coefficient' | 'target';
}) {
  const state = store.getState();
  const checked = validateScenario(state.input);
  const basis =
    state.panel.experiment ??
    (checked.ok ? freezeSupporters(checked.scenario) : null);
  if (basis === null)
    return (
      <div class="note ws-suspended" data-supporter-align>
        <p>{t('panel.unbalancedNote')}</p>
        <button
          type="button"
          class="ws-align"
          data-attention="true"
          data-action="supporter-align"
          onClick={() => store.alignPartyShares()}
        >
          {t('panel.autoAlign')}
        </button>
      </div>
    );
  if ('kind' in basis)
    return basis.reason === 'suspended-model' ? (
      <SuspendedRepair store={store} t={t} />
    ) : (
      <p class="note">{t(`future.unavailable.${basis.reason}`)}</p>
    );
  const result = runSupporters(basis, state.panel.targets);
  const future = runSupporters(basis, state.panel.targets, state.futureYear);
  const display = (text: string | null) =>
    text === null ? '—' : formatDecimal(state.language, panelDisplay(text));
  // The computed overall turnout, frozen base → under the current targets.
  const overall = (
    <p class="ws-hint" data-supporter-overall>
      {t('panel.overallTurnout')}:{' '}
      {display(fractionToPercent(basis.source.rules.overallTurnout))}% →{' '}
      {display(panelPercent(result.result.votes.turnout))}%
    </p>
  );
  const otherInvalid = state.panel.invalidFields.some(
    (field) =>
      !field.startsWith('data-supporter-target:') &&
      !field.startsWith('data-supporter-coef:'),
  );
  if (entry === 'coefficient') {
    const rows = supporterRows(basis, state.panel.targets);
    return (
      <div data-panel-supporters>
        {state.panel.resetNotice && (
          <p role="status">{t('panel.sourceChanged')}</p>
        )}
        <div class="ws-head ws-head--sub">
          <p class="ws-hint">{t('panel.coefLegend')}</p>
          <button
            type="button"
            class="ws-button"
            data-action="panel-reset-turnout"
            disabled={!state.panel.experiment}
            onClick={() => store.resetSupporterExperiment()}
          >
            {t('panel.resetTurnout')}
          </button>
        </div>
        {overall}
        <div
          class="ws-cards"
          style={{ '--party-count': basis.source.parties.length }}
        >
          {basis.source.parties.map((party, p) => {
            const row = rows[p]!;
            const name = entityName('party', party, t);
            return (
              <div
                key={party.id}
                class="ws-party"
                data-supporter-card={party.id}
                style={{ '--color': party.color as string }}
              >
                <span class="ws-party-name">
                  <bdi>{name}</bdi>
                </span>
                <PanelNumber
                  store={store}
                  t={t}
                  layout="vertical"
                  plot="coefficient"
                  min={-1}
                  max={1}
                  step="0.05"
                  stepper={stepCoefficient}
                  limits={{ down: row.canDecrease, up: row.canIncrease }}
                  nudge={{
                    attribute: 'data-supporter-nudge',
                    id: party.id,
                    signed: false,
                  }}
                  rangeMarker={{ 'data-supporter-range': party.id }}
                  fill={{
                    base: row.base ?? '0',
                    now: row.turnout ?? row.base ?? '0',
                  }}
                  value={row.field}
                  label={`${t('panel.coefficient')}: ${name}`}
                  marker={{ 'data-supporter-coef': party.id }}
                  disabled={row.turnout === null || otherInvalid}
                  onChange={(text) => {
                    const stored = coefficientEntry(text);
                    return (
                      stored !== null &&
                      store.setSupporterTarget(party.id, stored, normalized)
                    );
                  }}
                />
                <button
                  type="button"
                  class="ws-zero"
                  data-supporter-zero={party.id}
                  aria-label={`0 — ${t('panel.zeroTurnout')}: ${name}`}
                  disabled={row.coefficient === '0.00' || row.turnout === null}
                  onClick={() =>
                    store.setSupporterTarget(
                      party.id,
                      `${COEFFICIENT_PREFIX}0`,
                      normalized,
                    )
                  }
                >
                  0
                </button>
                <small class="ws-foot" data-supporter-result={party.id}>
                  <strong>
                    {row.turnout === null
                      ? '—'
                      : formatDecimal(state.language, row.turnout)}
                  </strong>
                  <span>
                    {row.base === null
                      ? '—'
                      : `${formatDecimal(state.language, row.base)}%`}
                  </span>
                </small>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div data-panel-supporters>
      {state.panel.resetNotice && (
        <p role="status">{t('panel.sourceChanged')}</p>
      )}
      <div class="ws-head ws-head--sub">
        <p class="ws-hint">{t('panel.experimentNote')}</p>
        {state.panel.experiment && (
          <button
            type="button"
            class="ws-button"
            data-action="panel-reset-experiment"
            onClick={() => store.resetSupporterExperiment()}
          >
            {t('panel.resetExperiment')}
          </button>
        )}
      </div>
      {overall}
      {basis.source.parties.map((party, p) => {
        const now = result.partyTurnouts[p];
        const nowText = now == null ? null : panelPercent(now);
        const later = future.partyTurnouts[p];
        const name = entityName('party', party, t);
        return (
          <div
            key={party.id}
            class="ws-rate-row"
            data-supporter-card={party.id}
            style={{ '--color': party.color as string }}
          >
            <span class="ws-rate-name">
              <i class="ws-dot" aria-hidden="true" />
              <bdi>{name}</bdi>
            </span>
            <PanelNumber
              store={store}
              t={t}
              layout="horizontal"
              step="0.01"
              value={
                state.panel.targets[party.id] ??
                (nowText === null ? '' : panelDisplay(nowText, 2))
              }
              label={name}
              marker={{ 'data-supporter-target': party.id }}
              disabled={now === null || otherInvalid}
              onChange={(text) =>
                store.setSupporterTarget(party.id, text, normalized)
              }
            />
            <span class="ws-rate-share" data-supporter-later={party.id}>
              {later == null ? '—' : `${display(panelPercent(later))}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type Rational = PanelPopulation['shares'][number];

interface NamedSlice extends PieSlice {
  readonly name: string;
  readonly value: string;
}

/** One group's vote split: hovering or tapping a slice names its party. */
function GroupPie({
  color,
  name,
  turnout,
  selected,
  slices,
  unknown,
}: {
  readonly color: string;
  readonly name: string;
  readonly turnout: string;
  readonly selected: string;
  readonly slices: readonly NamedSlice[] | null;
  readonly unknown: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const shown =
    slices?.find((slice) => slice.key === active) ??
    slices?.find((slice) => slice.key === selected);
  return (
    <figure class="ws-group-pie" style={{ '--color': color }}>
      {slices ? (
        <HoverPie
          slices={slices}
          label={`${name}: ${slices.map((slice) => slice.title).join('; ')}`}
          active={active}
          onActive={setActive}
        />
      ) : (
        <div class="ws-pie" role="img" aria-label={unknown} />
      )}
      <figcaption>
        <strong>
          <i class="ws-dot" aria-hidden="true" />
          <bdi>{name}</bdi>
        </strong>
        <small>{turnout}</small>
        <small
          data-pie-focus={shown?.key}
          data-hovered={active !== null}
          style={shown ? { '--color': shown.color } : {}}
        >
          {shown && <i class="ws-dot" aria-hidden="true" />}
          <bdi>{shown?.name ?? '—'}</bdi> {shown ? `${shown.value}%` : ''}
        </small>
      </figcaption>
      <ul class="ws-split-details">
        {slices?.map((slice) => (
          <li key={slice.key}>{slice.title}</li>
        ))}
      </ul>
    </figure>
  );
}

/** Two pies of the scenario's picture of the world: everyone, and who came. */
function PopulationPies({
  t,
  groups,
  all,
  voters,
  short,
}: {
  readonly t: Translate;
  readonly groups: readonly {
    readonly key: string;
    readonly color: string;
    readonly name: string;
  }[];
  readonly all: readonly Rational[];
  readonly voters: readonly Rational[];
  readonly short: (value: Rational) => string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const pie = (values: readonly Rational[], title: string, id: string) => {
    const stops = panelSlices(values);
    const slices = groups.map((group, g) => ({
      key: group.key,
      color: group.color,
      start: stops[g]!.start,
      size: stops[g]!.size,
      title: `${group.name}: ${short(values[g]!)}%`,
    }));
    const focus = groups.findIndex((group) => group.key === active);
    return (
      <figure class="ws-pop-pie" data-population-pie={id}>
        <figcaption>{title}</figcaption>
        <HoverPie
          slices={slices}
          label={`${title}: ${slices.map((slice) => slice.title).join('; ')}`}
          active={active}
          onActive={setActive}
        />
        <small data-pie-focus={active ?? undefined}>
          {focus >= 0
            ? `${groups[focus]!.name}: ${short(values[focus]!)}%`
            : '\u00a0'}
        </small>
      </figure>
    );
  };
  return (
    <>
      <div class="ws-pop-pies">
        {pie(all, t('panel.populationAll'), 'all')}
        {pie(voters, t('panel.populationVoters'), 'voters')}
      </div>
      <ul class="ws-pop-legend">
        {groups.map((group, g) => (
          <li
            key={group.key}
            style={{ '--color': group.color }}
            data-on={group.key === active}
            onMouseEnter={() => setActive(group.key)}
            onMouseLeave={() => setActive(null)}
          >
            <i class="ws-dot" aria-hidden="true" />
            <bdi>{group.name}</bdi> <strong>{short(all[g]!)}%</strong> /{' '}
            {short(voters[g]!)}%
          </li>
        ))}
      </ul>
      <p class="ws-hint">{t('panel.populationPiesNote')}</p>
    </>
  );
}

function Legend({ t }: { readonly t: Translate }) {
  return (
    <p class="ws-legend">
      <span>
        <i data-fill="base" aria-hidden="true" />
        {t('panel.beforeTurnout')}
      </span>
      <span>
        <i data-fill="now" aria-hidden="true" />
        {t('panel.now')}
      </span>
    </p>
  );
}

function TurnoutCorrection({
  store,
  t,
  onClose,
}: {
  readonly store: Store;
  readonly t: Translate;
  readonly onClose: () => void;
}) {
  const state = store.getState();
  const source = state.panel.experiment?.source ?? state.input;
  const data = readPanel(source);
  const initial = data
    ? Object.fromEntries(
        data.groupIds.map((id, g) => [id, panelPercent(data.turnouts[g]!)]),
      )
    : {};
  const [values, setValues] = useState(initial);
  const [confirm, setConfirm] = useState(false);
  const preview = correctPanelTurnout(source, values);
  const next = preview.ok ? readPanel(preview.draft) : null;
  const population = next && panelPopulation(next);
  const before = data && panelPopulation(data);
  const referenceData = readPanel(state.loadedInput);
  const reference = data && panelReference(state.loadedInput, data.groupIds);
  const referenceGaps = population && populationGaps(population, reference);
  const largest = population && largestPopulationGap(population, reference);
  const number = (text: string) => formatDecimal(state.language, text);
  const groupName = (id: string) =>
    isDraft(source)
      ? entityName(
          'group',
          source.groups.find((group) => group.id === id)!,
          t,
        )
      : id;
  return (
    <PanelModal title={t('panel.correctTurnout')} onClose={onClose}>
      <div data-turnout-dialog class="ws-dialog">
        <p>{t('panel.correctionNote')}</p>
        <p class="ws-hint">{t('panel.guide')}</p>
        {data?.groupIds.map((id, g) => (
          <label class="ws-correction" key={id}>
            <bdi>
              {isDraft(source) ? entityName('group', source.groups[g]!, t) : id}
            </bdi>
            <PanelNumber
              value={values[id] ?? ''}
              label={id}
              layout="horizontal"
              marker={{ 'data-correction': id }}
              disabled={state.panel.experiment !== null}
              onChange={(text) => {
                setConfirm(false);
                setValues({ ...values, [id]: text });
                return correctPanelTurnout(source, { ...values, [id]: text })
                  .ok;
              }}
            />
            <small>
              {t('panel.source')}:{' '}
              {referenceData && referenceData.groupIds.includes(id)
                ? number(
                    panelPercent(
                      referenceData.turnouts[
                        referenceData.groupIds.indexOf(id)
                      ]!,
                    ),
                  )
                : '—'}
              %
            </small>
          </label>
        ))}
        <div data-correction-preview class="ws-metric-box">
          {population && before ? (
            <>
              <p>
                {t('workspace.overallTurnout')}:{' '}
                {number(panelPercent(before.turnout))} →{' '}
                {number(panelPercent(population.turnout))}%
              </p>
              <p>
                {t('summary.abstaining')}:{' '}
                {number(panelAbstention(before.turnout))} →{' '}
                {number(panelAbstention(population.turnout))}%
              </p>
              {data?.groupIds.map((id, g) => (
                <p key={id}>
                  {groupName(id)}: {number(panelPercent(before.shares[g]!))} →{' '}
                  {number(referenceGaps![g]!.share)}% ({t('panel.source')}:{' '}
                  {referenceGaps?.[g]?.reference === null
                    ? '—'
                    : number(referenceGaps![g]!.reference!)}
                  %; Δ{' '}
                  {referenceGaps?.[g]?.gap === null
                    ? '—'
                    : formatChange(state.language, referenceGaps![g]!.gap!)}
                  )
                </p>
              ))}
              {largest !== null && largest !== undefined && data && (
                <p>
                  {t('panel.largestGap')}: {groupName(data.groupIds[largest]!)}
                </p>
              )}
            </>
          ) : (
            <p>{t('panel.unknown')}</p>
          )}
        </div>
        <div class="ws-actions">
          {state.panel.experiment ? (
            <button
              type="button"
              class="ws-button"
              data-action="panel-reset-experiment"
              onClick={() => {
                store.resetSupporterExperiment();
                setValues(initial);
              }}
            >
              {t('panel.resetExperiment')}
            </button>
          ) : (
            <>
              <button
                type="button"
                class="ws-button"
                onClick={() => {
                  if (referenceData)
                    setValues(
                      Object.fromEntries(
                        referenceData.groupIds.map((id, g) => [
                          id,
                          panelPercent(referenceData.turnouts[g]!),
                        ]),
                      ),
                    );
                  setConfirm(false);
                }}
              >
                {t('panel.source')}
              </button>
              <button
                type="button"
                class="ws-align"
                data-action="correction-apply"
                disabled={!preview.ok}
                onClick={() => setConfirm(true)}
              >
                {t('panel.apply')}
              </button>
            </>
          )}
          <button type="button" class="ws-button" onClick={onClose}>
            {t('confirm.cancel')}
          </button>
        </div>
        {!state.panel.experiment && confirm && (
          <p data-correction-confirm>
            {t('panel.confirmCorrection')}{' '}
            <button
              type="button"
              class="ws-align"
              data-action="correction-confirm"
              onClick={() => {
                if (store.applyPanelEdit(preview)) onClose();
              }}
            >
              {t('panel.confirm')}
            </button>
          </p>
        )}
      </div>
    </PanelModal>
  );
}

export function IntegratedPanel({
  store,
  t,
  run,
}: {
  readonly store: Store;
  readonly t: Translate;
  readonly run?: CoalitionRun;
}) {
  const state = store.getState();
  const data = readPanel(state.input);
  const [selected, setSelected] = useState('');
  const defaultVoteLocks = (panel: PanelData | null): readonly string[] =>
    panel === null
      ? []
      : defaultLocks(panel.shares.map((share) => panelPercent(share))).map(
          (at) => panel.partyIds[at]!,
        );
  const defaultCellLocks = (panel: PanelData | null): readonly string[] =>
    panel === null
      ? []
      : panel.partyIds.flatMap((id, p) => {
          const row = panel.compositions[p];
          return row == null
            ? []
            : defaultLocks(row.map((cell) => panelPercent(cell))).map(
                (g) => `${id}:${panel.groupIds[g]!}`,
              );
        });
  const voteLocks = state.panel.voteLocks ?? defaultVoteLocks(data);
  const cellLocks = state.panel.cellLocks ?? defaultCellLocks(data);
  const [lockHint, setLockHint] = useState(false);
  const toggleVoteLock = (id: string) => {
    const locking = !voteLocks.includes(id);
    if (
      locking &&
      data !== null &&
      !canLockAnother(data.partyIds.length, voteLocks.length)
    ) {
      setLockHint(true);
      return;
    }
    setLockHint(false);
    store.setPanelSession({
      voteLocks: locking
        ? [...voteLocks, id]
        : voteLocks.filter((lock) => lock !== id),
    });
  };
  const toggleCellLock = (partyId: string, groupId: string) => {
    const key = `${partyId}:${groupId}`;
    const locking = !cellLocks.includes(key);
    const rowLocked = cellLocks.filter((lock) =>
      lock.startsWith(`${partyId}:`),
    ).length;
    if (
      locking &&
      data !== null &&
      !canLockAnother(data.groupIds.length, rowLocked)
    ) {
      setLockHint(true);
      return;
    }
    setLockHint(false);
    store.setPanelSession({
      cellLocks: locking
        ? [...cellLocks, key]
        : cellLocks.filter((lock) => lock !== key),
    });
  };
  const [undo, setUndo] = useState<PanelData | null>(null);
  const [previous, setPrevious] = useState<PanelData | null>(null);
  const [message, setMessage] = useState('');
  const [correction, setCorrection] = useState(false);
  useEffect(() => {
    setLockHint(false);
    setUndo(null);
    setPrevious(null);
    setMessage('');
  }, [state.loadedInput]);
  if (!data || !isDraft(state.input)) return null;
  const input = state.input;
  const current = store.getDerived();
  const foundIndex = data.partyIds.indexOf(selected);
  const index = foundIndex < 0 ? 0 : foundIndex;
  const party = input.parties[index]!;
  const population = state.panel.invalidFields.length
    ? null
    : panelPopulation(data);
  const sourceData = state.panel.experiment
    ? readPanel(state.panel.experiment.source)
    : data;
  const basePopulation = state.panel.experiment
    ? sourceData && panelPopulation(sourceData)
    : population;
  const reference = panelReference(state.loadedInput, data.groupIds);
  const gaps =
    population && populationGaps(population, reference, data.turnouts);
  const totals = panelTotals(data, cellLocks, previous);
  const row = data.compositions[index];
  const rowTotal = totals.rows[index];
  const named = (id: string) => {
    const party = input.parties.find((entry) => entry.id === id);
    const group = input.groups.find((entry) => entry.id === id);
    return party
      ? entityName('party', party, t)
      : group
        ? entityName('group', group, t)
        : id;
  };
  const error = (reason: string, ids: readonly string[]) =>
    `${t(reason === 'unbalanced-votes' ? 'panel.stale' : reason === 'unknown-entity' ? 'linkedTurnout.unknown-party' : `linkedTurnout.${reason}`)} ${ids.map(named).join(', ')}`;
  const number = (text: string | null | undefined) =>
    text == null ? '—' : formatDecimal(state.language, text);
  const short = (text: string | null | undefined, places = 1) =>
    text == null
      ? '—'
      : formatDecimal(state.language, panelDisplay(text, places));
  const change = (text: string | null | undefined) =>
    text == null ? '—' : formatChange(state.language, text);
  const shortChange = (text: string | null | undefined) =>
    text == null ? '—' : formatChange(state.language, panelDisplay(text));
  const apply = (result: PanelEdit) => {
    if (!result.ok) {
      setMessage(error(result.reason, result.ids));
      return false;
    }
    setPrevious(data);
    setMessage('');
    return store.applyPanelEdit(result);
  };
  const smooth = () => {
    if (!reference) {
      setMessage(t('panel.unknown'));
      return;
    }
    const result = smoothPanel(data, reference, cellLocks);
    if (!result.ok) {
      setMessage(error(result.reason, result.ids));
      return;
    }
    const next = applyPanelRows(input, result.rows);
    if (apply(next)) {
      setUndo(data);
      setMessage(
        result.matched
          ? t('panel.matched')
          : `${t('panel.fallback')}: ${result.groups.map(named).join(', ')}`,
      );
    }
  };
  const turnoutSummary = `${short(basePopulation ? panelPercent(basePopulation.turnout) : null)}% → ${short(population ? panelPercent(population.turnout) : null)}%`;
  const groupColor = (g: number) => groupColorOf(data.groupIds[g]!, g);
  const partyColor = (p: number) => input.parties[p]!.color as string;
  return (
    <div class="ws" data-panel-root>
      <div class="ws-col">
        <section class="ws-card ws-card--main">
          <div class="ws-summary">
            <div class="ws-metric">
              <small>
                {t('panel.shareSum')}{' '}
                <span class="ws-badge" data-good={totals.balanced}>
                  {t(totals.balanced ? 'panel.agreed' : 'panel.notHundred')}
                </span>
              </small>
              <strong data-panel-balance data-valid={totals.balanced}>
                {short(totals.total, 2)}%
              </strong>
              <small>Σ {number(totals.total)}%</small>
            </div>
            <div class="ws-metric">
              <small>{t('panel.turnoutNow')}</small>
              <strong data-panel-turnout-summary>{turnoutSummary}</strong>
              <small>{t('panel.turnoutShare')}</small>
            </div>
          </div>
          <div class="ws-panels">
            <PanelBox
              id="votes"
              tone="panel"
              title={t('panel.votes')}
              hint={t('panel.votesHint')}
              t={t}
            >
              <div data-panel-votes>
                <div class="ws-toolbar">
                  <button
                    type="button"
                    class="ws-align"
                    data-action="panel-align"
                    data-attention={!totals.balanced}
                    disabled={state.panel.invalidFields.length > 0}
                    onClick={() => apply(alignPanelVotes(input, voteLocks))}
                  >
                    {t('panel.align')}
                  </button>
                  <small>{t('panel.locksKept')}</small>
                </div>
                <div
                  class="ws-cards"
                  style={{ '--party-count': input.parties.length }}
                >
                  {input.parties.map((item, p) => (
                    <div
                      key={item.id}
                      class="ws-party"
                      data-party-card={item.id}
                      data-locked={voteLocks.includes(item.id)}
                      style={{ '--color': item.color as string }}
                    >
                      <span class="ws-party-name">
                        <bdi>{entityName('party', item, t)}</bdi>
                      </span>
                      <PanelNumber
                        store={store}
                        t={t}
                        layout="vertical"
                        base={
                          sourceData?.partyIds[p] === item.id
                            ? panelPercent(sourceData.shares[p]!)
                            : null
                        }
                        nudge={{ attribute: 'data-nudge', id: item.id }}
                        value={panelPercent(data.shares[p]!)}
                        label={entityName('party', item, t)}
                        marker={{ 'data-panel-share': item.id }}
                        onChange={(text) =>
                          apply(editPanelCell(input, item.id, null, text))
                        }
                      />
                      <LockButton
                        locked={voteLocks.includes(item.id)}
                        label={`${t('panel.lock')}: ${entityName('party', item, t)}`}
                        marker={{ 'data-lock-vote': item.id }}
                        onToggle={() => toggleVoteLock(item.id)}
                      />
                    </div>
                  ))}
                </div>
                {lockHint && (
                  <p class="ws-lock-hint" role="status" data-lock-hint>
                    {t('panel.minUnlocked')}
                  </p>
                )}
                <Legend t={t} />
              </div>
            </PanelBox>
            <PanelBox
              id="supporters"
              tone="panel"
              title={t('panel.supporters')}
              t={t}
            >
              <SupporterControls store={store} t={t} entry="coefficient" />
            </PanelBox>
          </div>
        </section>
        <PanelBox
          id="composition"
          title={t('view.composition')}
          t={t}
          actions={
            undo !== null && (
              <button
                type="button"
                class="ws-button"
                onClick={() => {
                  if (
                    apply(
                      restorePanelCompositions(store.getState().input, undo),
                    )
                  )
                    setUndo(null);
                }}
              >
                {t('panel.undo')}
              </button>
            )
          }
        >
          <div data-panel-composition>
            <div class="ws-toolbar">
              <button
                type="button"
                data-action="panel-smooth"
                class="ws-align"
                data-attention={totals.rows.some(
                  (item) => item !== null && !item.balanced,
                )}
                disabled={state.panel.invalidFields.length > 0}
                data-invalid={totals.rows.some(
                  (item) => item !== null && !item.balanced,
                )}
                onClick={smooth}
              >
                {t('panel.smooth')}
              </button>
              <div class="ws-party-choice">
                <button
                  type="button"
                  class="ws-button"
                  aria-label={t('panel.previous')}
                  onClick={() =>
                    setSelected(
                      data.partyIds[
                        (index + data.partyIds.length - 1) %
                          data.partyIds.length
                      ]!,
                    )
                  }
                >
                  ‹
                </button>
                <select
                  aria-label={t('view.composition')}
                  value={party.id}
                  onChange={(event) => setSelected(event.currentTarget.value)}
                >
                  {input.parties.map((item) => (
                    <option key={item.id} value={item.id}>
                      {entityName('party', item, t)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  class="ws-button"
                  aria-label={t('panel.next')}
                  onClick={() =>
                    setSelected(
                      data.partyIds[(index + 1) % data.partyIds.length]!,
                    )
                  }
                >
                  ›
                </button>
              </div>
              <strong class="ws-subtitle">{t('panel.compositionTitle')}</strong>
            </div>
            <p class="ws-hint">{t('panel.compositionHint')}</p>
            <div class="ws-mix">
              <div
                class="ws-mix-bar"
                data-valid={rowTotal?.balanced ?? false}
                data-over={rowTotal?.over}
              >
                {row?.map((cell, g) => (
                  <span
                    key={data.groupIds[g]}
                    style={{
                      width: `${panelPercent(cell)}%`,
                      background: groupColor(g),
                    }}
                  >
                    {short(panelPercent(cell), 0)}%
                  </span>
                ))}
              </div>
              <p
                class="ws-mix-total"
                data-panel-row-total
                data-valid={rowTotal?.balanced ?? false}
              >
                Σ {short(rowTotal?.total, 2)}% · {t('panel.locked')}{' '}
                {short(rowTotal?.locked, 2)}% · {t('panel.movable')}{' '}
                {short(rowTotal?.movable, 2)}% · Δ {change(rowTotal?.gap)}
              </p>
            </div>
            <div
              class="ws-groups"
              style={{ '--group-count': input.groups.length }}
            >
              {input.groups.map((group, g) => {
                const key = `${party.id}:${group.id}`;
                const gap = gaps?.[g];
                return (
                  <article
                    class="ws-group-card"
                    key={key}
                    style={{ '--color': groupColor(g) }}
                  >
                    <h4>
                      <i class="ws-dot" aria-hidden="true" />
                      <bdi>{entityName('group', group, t)}</bdi>
                    </h4>
                    <div class="ws-cell">
                      <PanelNumber
                        store={store}
                        layout="horizontal"
                        value={row ? panelPercent(row[g]!) : ''}
                        label={entityName('group', group, t)}
                        marker={{ 'data-panel-cell': key }}
                        onChange={(text) => {
                          const changed = apply(
                            editPanelCell(input, party.id, group.id, text),
                          );
                          if (changed) setUndo(null);
                          return changed;
                        }}
                      />
                      <LockButton
                        locked={cellLocks.includes(key)}
                        label={`${t('panel.lock')}: ${entityName('group', group, t)}`}
                        marker={{ 'data-lock-cell': key }}
                        onToggle={() => toggleCellLock(party.id, group.id)}
                      />
                    </div>
                    <small class="ws-shift">
                      Δ {change(rowTotal?.shifts[g])}
                    </small>
                    <button
                      type="button"
                      class="ws-turnout-link"
                      data-open-turnout={group.id}
                      onClick={() => setCorrection(true)}
                    >
                      {t('panel.turnoutValue', {
                        value: `${
                          state.panel.experiment
                            ? `${fractionToPercent(state.panel.experiment.source.groups[g]?.turnout) ?? '—'} → `
                            : ''
                        }${short(panelPercent(data.turnouts[g]!))}`,
                      })}{' '}
                      <span aria-hidden="true">✎</span>
                    </button>
                    <div
                      class="ws-gauge"
                      role="img"
                      aria-label={`${entityName('group', group, t)}: ${t('panel.populationShort')} ${short(gap?.share)}%; ${t('panel.source')} ${short(gap?.reference)}%`}
                    >
                      <span
                        data-part="came"
                        style={{ width: `${gap?.cast ?? '0'}%` }}
                      />
                      <span
                        data-part="home"
                        style={{ width: `${gap?.abstaining ?? '0'}%` }}
                      />
                      {gap?.gapStart != null && (
                        <span
                          data-part="gap"
                          data-shortfall={gap.shortfall}
                          style={{
                            left: `${gap.gapStart}%`,
                            width: `${gap.gapWidth}%`,
                          }}
                        />
                      )}
                      {gap?.reference != null && (
                        <i style={{ left: `${gap.reference}%` }} />
                      )}
                    </div>
                    <small>
                      {t('panel.populationShort')} {short(gap?.share)}%{' '}
                      {gap?.gap == null
                        ? ''
                        : `(${shortChange(gap.gap)} ${t('unit.percentagePoints')})`}
                    </small>
                  </article>
                );
              })}
            </div>
            {row === null && <p class="note">{t('panel.unknown')}</p>}
            {lockHint && (
              <p class="ws-lock-hint" role="status" data-lock-hint>
                {t('panel.minUnlocked')}
              </p>
            )}
            <p class="ws-hint">{t('panel.populationLegend')}</p>
          </div>
        </PanelBox>
      </div>
      <div class="ws-col">
        <PanelBox
          id="pies"
          title={t('panel.byGroup')}
          hint={t('panel.byGroupNote')}
          t={t}
        >
          {population ? (
            <>
              <div class="ws-pies" data-many-groups={input.groups.length > 8}>
                {input.groups.map((group, g) => {
                  const split = population.splits[g];
                  const stops = split ? panelSlices(split) : [];
                  return (
                    <GroupPie
                      key={group.id}
                      color={groupColor(g)}
                      name={entityName('group', group, t)}
                      turnout={t('panel.turnoutValue', {
                        value: short(panelPercent(data.turnouts[g]!)),
                      })}
                      selected={party.id}
                      unknown={t('panel.unknown')}
                      slices={
                        split
                          ? stops.map((stop, p) => ({
                              key: data.partyIds[p]!,
                              color: partyColor(p),
                              start: stop.start,
                              size: stop.size,
                              title: `${entityName('party', input.parties[p]!, t)}: ${number(panelPercent(split[p]!))}%`,
                              name: entityName('party', input.parties[p]!, t),
                              value: short(panelPercent(split[p]!)),
                            }))
                          : null
                      }
                    />
                  );
                })}
              </div>
              <div class="ws-chips">
                {input.parties.map((item, p) => (
                  <button
                    key={item.id}
                    type="button"
                    class="ws-chip"
                    aria-pressed={p === index}
                    style={{ '--color': item.color as string }}
                    onClick={() => setSelected(item.id)}
                  >
                    <i class="ws-dot" aria-hidden="true" />
                    <bdi>{entityName('party', item, t)}</bdi>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <RepairLink action={totals.balanced ? 'smooth' : 'align'} t={t} />
          )}
        </PanelBox>
        <PanelBox
          id="population"
          title={t('panel.population')}
          hint={t('panel.populationNote')}
          t={t}
        >
          <div data-panel-population>
            {population ? (
              <>
                <PopulationPies
                  t={t}
                  groups={input.groups.map((group, g) => ({
                    key: group.id,
                    color: groupColor(g),
                    name: entityName('group', group, t),
                  }))}
                  all={population.shares}
                  voters={population.voterShares}
                  short={(value) => short(panelPercent(value))}
                />
              </>
            ) : (
              <RepairLink action={totals.balanced ? 'smooth' : 'align'} t={t} />
            )}
          </div>
        </PanelBox>
        <section class="ws-card" data-panel-coalitions>
          {message && <p role="status">{message}</p>}
          {current.validation.ok && current.result ? (
            <CoalitionTiles
              store={store}
              scenario={current.validation.scenario}
              result={current.result}
              t={t}
              run={run}
            />
          ) : (
            <RepairLink action={totals.balanced ? 'smooth' : 'align'} t={t} />
          )}
          <div class="ws-rules" data-panel-relations>
            <div class="ws-head">
              <h3>{t('panel.rulesTitle')}</h3>
              <button
                type="button"
                class="ws-button"
                data-action="rules-source"
                onClick={() => {
                  apply(restorePanelRules(state.input, state.loadedInput));
                }}
              >
                {t('panel.source')}
              </button>
            </div>
            <p class="ws-hint">{t('panel.rulesHint')}</p>
            <DirectedRelations
              parties={input.parties}
              seats={
                current.result && !current.result.allocation.noAllocation
                  ? Object.fromEntries(
                      current.result.allocation.parties.map((entry) => [
                        entry.partyId,
                        entry.seats,
                      ]),
                    )
                  : undefined
              }
              refusals={
                (input.coalitionRules.partyRefusals ??
                  []) as readonly (readonly string[])[]
              }
              t={t}
              paged={false}
              onToggle={(from, to) => {
                const refusals = (input.coalitionRules.partyRefusals ??
                  []) as readonly (readonly string[])[];
                const index = refusals.findIndex(
                  (pair) => pair[0] === from && pair[1] === to,
                );
                if (index >= 0) store.removePair('partyRefusals', index);
                else store.addPair('partyRefusals', from, to);
              }}
            />
          </div>
        </section>
      </div>
      {correction && (
        <TurnoutCorrection
          store={store}
          t={t}
          onClose={() => setCorrection(false)}
        />
      )}
    </div>
  );
}
