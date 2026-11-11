import { Fragment, type ComponentChildren } from 'preact';
import {
  compareCoalitions,
  compareScenarios,
  type Change,
  type CountChange,
  type Presence,
} from '../engine/compare';
import type { SeatResult } from '../engine/run';
import type { Scenario } from '../engine/schema';
import type { Locale, Translate } from '../i18n';
import { formatChange, formatDecimal, formatInteger } from '../i18n/format';
import { LISTED_COALITIONS, type CoalitionRun } from './coalitionRunner';
import { RowLimitNote } from './Coalitions';
import { Hint } from './Hint';

export interface ComparedSide {
  readonly scenario: Scenario;
  readonly seats: SeatResult;
}

export interface CompareProps {
  /** Null until a baseline is saved. */
  readonly baseline: ComparedSide | null;
  readonly current: ComparedSide;
  readonly baselineRun: CoalitionRun;
  readonly currentRun: CoalitionRun;
  readonly locale: Locale;
  readonly t: Translate;
  readonly onSave: () => void;
  readonly onReset: () => void;
  readonly onClear: () => void;
}

export interface Format {
  readonly locale: Locale;
  readonly t: Translate;
}

/** Null and zero have no direction; colour is never the only signal. */
function directionOf(value: string | number | null): 'up' | 'down' | 'none' {
  if (value === null) {
    return 'none';
  }
  const text = `${value}`;
  if (text.startsWith('-')) {
    return 'down';
  }
  return /[1-9]/.test(text) ? 'up' : 'none';
}

function decimal({ locale, t }: Format, value: string | null): string {
  return value === null ? t('results.empty') : formatDecimal(locale, value);
}

function count({ locale, t }: Format, value: number | null): string {
  return value === null ? t('results.empty') : formatInteger(locale, value);
}

function signed({ locale, t }: Format, value: string | number | null): string {
  return value === null ? t('results.empty') : formatChange(locale, `${value}`);
}

function cellName(prefix: string | null, part: string): string {
  return prefix === null ? part : `${prefix}-${part}`;
}

function ChangeCell({
  prefix,
  value,
  format,
}: {
  readonly prefix: string | null;
  readonly value: string | number | null;
  readonly format: Format;
}) {
  return (
    <td
      class="compare__change"
      data-cell={cellName(prefix, 'change')}
      data-direction={directionOf(value)}
    >
      {signed(format, value)}
    </td>
  );
}

export function DecimalCells({
  prefix,
  value,
  format,
}: {
  readonly prefix: string | null;
  readonly value: Change;
  readonly format: Format;
}) {
  return (
    <>
      <td data-cell={cellName(prefix, 'baseline')}>
        {decimal(format, value.baseline)}
      </td>
      <td data-cell={cellName(prefix, 'current')}>
        {decimal(format, value.current)}
      </td>
      <ChangeCell prefix={prefix} value={value.change} format={format} />
    </>
  );
}

export function CountCells({
  prefix,
  value,
  format,
}: {
  readonly prefix: string | null;
  readonly value: CountChange;
  readonly format: Format;
}) {
  return (
    <>
      <td data-cell={cellName(prefix, 'baseline')}>
        {count(format, value.baseline)}
      </td>
      <td data-cell={cellName(prefix, 'current')}>
        {count(format, value.current)}
      </td>
      <ChangeCell prefix={prefix} value={value.change} format={format} />
    </>
  );
}

function PresenceLabel({
  presence,
  t,
}: {
  readonly presence: Presence;
  readonly t: Translate;
}) {
  if (presence === 'both') {
    return null;
  }
  return (
    <>
      {' '}
      <span class="compare__presence">{t(`compare.presence.${presence}`)}</span>
    </>
  );
}

/** The row header of a totals row; the eligible-voter row carries a hint. */
export function TotalHeader({
  name,
  t,
}: {
  readonly name: 'population' | 'cast' | 'valid' | 'turnout';
  readonly t: Translate;
}) {
  return (
    <th scope="row">
      {t(`compare.total.${name}`)}
      {name === 'population' && (
        <Hint
          kind="population"
          label={t('compare.total.population')}
          text={t('hint.population')}
          t={t}
        />
      )}
    </th>
  );
}

export function SideHeaders({
  label,
  t,
}: {
  readonly label: string;
  readonly t: Translate;
}) {
  return (
    <>
      {(['baseline', 'current', 'change'] as const).map((part) => (
        <th key={part} scope="col">
          {label}: {t(`compare.column.${part}`)}
        </th>
      ))}
    </>
  );
}

export function Section({
  title,
  table,
  children,
}: {
  readonly title: string;
  readonly table: string;
  readonly children: ComponentChildren;
}) {
  return (
    <section class="compare__section">
      <h4 class="compare__title">{title}</h4>
      <div class="table-scroll" tabIndex={0}>
        <table class="results-table" data-table={table}>
          {children}
        </table>
      </div>
    </section>
  );
}

function sideText(run: CoalitionRun, t: Translate): string {
  switch (run.state) {
    case 'done':
      return t(`coalition.status.${run.analysis.status}`);
    case 'cancelled':
      return t('coalition.cancelled');
    case 'failed':
      return t('coalition.failed');
    default:
      return t('compare.coalitions.pending');
  }
}

function CoalitionComparison({
  baselineRun,
  currentRun,
  nameOf,
  format,
}: {
  readonly baselineRun: CoalitionRun;
  readonly currentRun: CoalitionRun;
  readonly nameOf: (id: string) => string;
  readonly format: Format;
}) {
  const { t } = format;
  const pending = [baselineRun, currentRun].some(
    (run) => run.state === 'idle' || run.state === 'running',
  );
  const comparison =
    baselineRun.state === 'done' && currentRun.state === 'done'
      ? compareCoalitions(baselineRun.analysis, currentRun.analysis)
      : null;
  // A cut list cannot show which coalitions appeared or disappeared.
  const cut = [baselineRun, currentRun].some(
    (run) =>
      run.state === 'done' &&
      (run.minimalWinningTotal ?? 0) > run.analysis.minimalWinning.length,
  );
  const sides = [
    ['baseline', baselineRun],
    ['current', currentRun],
  ] as const;
  return (
    <section class="compare__section" data-section="compare-coalitions">
      <h4 class="compare__title">{t('compare.coalitions')}</h4>
      <dl class="summary">
        {sides.map(([name, run]) => (
          <div key={name} class="summary__item">
            <dt>{t(`compare.column.${name}`)}</dt>
            <dd data-coalition-side={name} data-run={run.state}>
              {sideText(run, t)}
            </dd>
          </div>
        ))}
      </dl>
      {pending && (
        <p class="compare__note" data-note="coalitions-pending">
          {t('compare.coalitions.pending')}
        </p>
      )}
      {comparison !== null && (!comparison.conclusive || cut) && (
        <p class="compare__note" data-note="inconclusive">
          {t('compare.coalitions.inconclusive')}
        </p>
      )}
      {comparison !== null &&
        (comparison.coalitions.length === 0 ? (
          <p class="compare__empty" data-empty="compare-coalitions">
            {t('coalition.noneFound')}
          </p>
        ) : (
          <div class="table-scroll" tabIndex={0}>
            <table class="results-table" data-table="compare-coalitions">
              <thead>
                <tr>
                  <th scope="col">{t('coalition.column.members')}</th>
                  {(['baseline', 'current'] as const).map((part) => (
                    <th key={part} scope="col">
                      {t('compare.column.seats')}: {t(`compare.column.${part}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.coalitions
                  .slice(0, LISTED_COALITIONS)
                  .map((row) => {
                    const key = row.partyIds.join('+');
                    return (
                      <tr
                        key={key}
                        data-coalition={key}
                        data-presence={row.presence}
                      >
                        <th scope="row">
                          {row.partyIds.map((id, index) => (
                            <Fragment key={id}>
                              {index > 0 && ', '}
                              <bdi>{nameOf(id)}</bdi>
                            </Fragment>
                          ))}
                          <PresenceLabel presence={row.presence} t={t} />
                        </th>
                        <td data-cell="seats-baseline">
                          {count(format, row.baselineSeats)}
                        </td>
                        <td data-cell="seats-current">
                          {count(format, row.currentSeats)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ))}
      {comparison !== null && (
        <RowLimitNote
          total={comparison.coalitions.length}
          locale={format.locale}
          t={t}
        />
      )}
    </section>
  );
}

function SaveButton({
  label,
  onClick,
}: {
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      class="button"
      data-action="save-baseline"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function Compare({
  baseline,
  current,
  baselineRun,
  currentRun,
  locale,
  t,
  onSave,
  onReset,
  onClear,
}: CompareProps) {
  if (baseline === null) {
    return (
      <div class="compare" data-compare="empty">
        <p class="compare__empty" data-empty="baseline">
          {t('compare.empty')}
        </p>
        <div class="compare__actions">
          <SaveButton label={t('compare.save')} onClick={onSave} />
        </div>
      </div>
    );
  }

  const format: Format = { locale, t };
  const comparison = compareScenarios(
    baseline.scenario,
    baseline.seats,
    current.scenario,
    current.seats,
  );
  const partyNames = new Map(
    [...baseline.scenario.parties, ...current.scenario.parties].map((party) => [
      party.id,
      party.name,
    ]),
  );
  const nameOf = (id: string): string => partyNames.get(id) ?? id;
  const status = (value: string | null): string =>
    value === null ? t('results.empty') : t(`qualification.${value}`);

  return (
    <div class="compare" data-compare="ready">
      <p class="compare__baseline" data-baseline-name>
        {t('compare.baselineLabel')} <bdi>{baseline.scenario.name}</bdi>
      </p>
      <div class="compare__actions">
        <SaveButton label={t('compare.saveAgain')} onClick={onSave} />
        <button
          type="button"
          class="button"
          data-action="reset-baseline"
          onClick={onReset}
        >
          {t('compare.reset')}
        </button>
        <button
          type="button"
          class="button"
          data-action="clear-baseline"
          onClick={onClear}
        >
          {t('compare.clear')}
        </button>
      </div>

      <Section title={t('compare.totals')} table="compare-totals">
        <thead>
          <tr>
            <th scope="col">{t('compare.column.name')}</th>
            <th scope="col">{t('compare.column.baseline')}</th>
            <th scope="col">{t('compare.column.current')}</th>
            <th scope="col">{t('compare.column.change')}</th>
          </tr>
        </thead>
        <tbody>
          {(['population', 'cast', 'valid', 'turnout'] as const).map((key) => (
            <tr key={key} data-total={key}>
              <TotalHeader name={key} t={t} />
              <DecimalCells
                prefix={null}
                value={comparison.totals[key]}
                format={format}
              />
            </tr>
          ))}
          <tr data-total="majority">
            <th scope="row">{t('compare.total.majority')}</th>
            <CountCells
              prefix={null}
              value={comparison.totals.majority}
              format={format}
            />
          </tr>
        </tbody>
      </Section>

      <Section title={t('compare.groups')} table="compare-groups">
        <thead>
          <tr>
            <th scope="col">{t('compare.column.name')}</th>
            <SideHeaders label={t('compare.column.turnout')} t={t} />
          </tr>
        </thead>
        <tbody>
          {comparison.groups.map((row) => (
            <tr
              key={row.groupId}
              data-group={row.groupId}
              data-presence={row.presence}
            >
              <th scope="row">
                <bdi>{row.name}</bdi>
                <PresenceLabel presence={row.presence} t={t} />
              </th>
              <DecimalCells
                prefix="turnout"
                value={row.turnout}
                format={format}
              />
            </tr>
          ))}
        </tbody>
      </Section>

      <Section title={t('compare.parties')} table="compare-parties">
        <thead>
          <tr>
            <th scope="col">{t('compare.column.name')}</th>
            <SideHeaders label={t('compare.column.votes')} t={t} />
            <SideHeaders label={t('compare.column.voteShare')} t={t} />
            <SideHeaders label={t('compare.column.seats')} t={t} />
            {(['baseline', 'current'] as const).map((part) => (
              <th key={part} scope="col">
                {t('compare.column.status')}: {t(`compare.column.${part}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparison.parties.map((row) => (
            <tr
              key={row.partyId}
              data-party={row.partyId}
              data-presence={row.presence}
            >
              <th scope="row">
                <span
                  class="swatch"
                  aria-hidden="true"
                  style={{ background: row.color }}
                />
                <bdi>{row.name}</bdi>
                <PresenceLabel presence={row.presence} t={t} />
              </th>
              <DecimalCells prefix="votes" value={row.votes} format={format} />
              <DecimalCells
                prefix="share"
                value={row.voteShare}
                format={format}
              />
              <CountCells prefix="seats" value={row.seats} format={format} />
              <td data-cell="status-baseline">{status(row.status.baseline)}</td>
              <td data-cell="status-current">{status(row.status.current)}</td>
            </tr>
          ))}
        </tbody>
      </Section>

      <CoalitionComparison
        baselineRun={baselineRun}
        currentRun={currentRun}
        nameOf={nameOf}
        format={format}
      />
    </div>
  );
}
