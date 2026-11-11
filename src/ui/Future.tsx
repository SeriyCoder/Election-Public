import { Fragment } from 'preact';
import {
  buildCoalitionFuture,
  buildFutureReport,
  type CoalitionFuture,
  type CoalitionYear,
} from '../engine/future';
import type { SeatResult } from '../engine/run';
import { LIMITS, type Scenario } from '../engine/schema';
import type { Locale, Translate } from '../i18n';
import { formatInteger } from '../i18n/format';
import { coalitionKey } from './coalitionChoice';
import {
  CountCells,
  DecimalCells,
  Section,
  TotalHeader,
  type Format,
} from './Compare';
import { groupColorOf } from './groupColors';

export interface FutureProps {
  readonly scenario: Scenario;
  /** Seats of year 0. */
  readonly base: SeatResult;
  /** Seats of `year`. */
  readonly projected: SeatResult;
  readonly year: number;
  /** The coalitions followed into the future, in tick order (M2-30). */
  readonly followed: readonly (readonly string[])[];
  readonly labels?: Readonly<Record<string, string>>;
  readonly locale: Locale;
  readonly t: Translate;
  readonly onYear: (year: number) => void;
  /** False when the future view's timeline already holds the year control. */
  readonly showYear?: boolean;
}

type PieSide = 'base' | 'year';

/** Member slices from the engine's cumulative stops; the rest is grey. */
function pieBackground(
  colors: readonly string[],
  stops: readonly string[],
): string {
  let previous = '0';
  const slices = stops.map((stop, index) => {
    const slice = `${colors[index] ?? 'currentColor'} ${previous}% ${stop}%`;
    previous = stop;
    return slice;
  });
  slices.push(`var(--pie-rest) ${previous}% 100%`);
  return `conic-gradient(${slices.join(', ')})`;
}

function pieState(side: CoalitionYear): string {
  if (side.noAllocation !== null) {
    return 'no-allocation';
  }
  return side.reachesMajority ? 'majority' : 'minority';
}

function CoalitionPie({
  side,
  label,
  future,
  data,
  format,
}: {
  readonly side: PieSide;
  readonly label: string;
  readonly future: CoalitionFuture;
  readonly data: CoalitionYear;
  readonly format: Format;
}) {
  const { locale, t } = format;
  const total = formatInteger(locale, future.seatCount);
  const majority = t(
    data.reachesMajority
      ? 'futureCoalitions.majority'
      : 'futureCoalitions.noMajority',
  );
  const seats =
    data.seats === null
      ? null
      : t('futureCoalitions.seats', {
          seats: formatInteger(locale, data.seats),
          total,
        });
  const reason =
    data.noAllocation === null
      ? null
      : t(`status.noAllocation.${data.noAllocation}`);
  const ariaLabel =
    reason === null
      ? t('futureCoalitions.pie', {
          year: label,
          seats: formatInteger(locale, data.seats ?? 0),
          total,
          needed: formatInteger(locale, future.majority),
          majority,
        })
      : t('futureCoalitions.pieNone', { year: label, reason });

  return (
    <figure class="coalition-pie">
      <figcaption class="coalition-pie__year">{label}</figcaption>
      <div class="ws-donut">
        <div
          class="pie"
          role="img"
          aria-label={ariaLabel}
          data-pie={side}
          data-pie-state={pieState(data)}
          style={{
            background: pieBackground(
              future.members.map((member) => member.color),
              data.stops,
            ),
          }}
        >
          <span
            class="pie__mark"
            aria-hidden="true"
            data-majority-mark={side}
            style={{ '--majority': future.majorityStop }}
          />
        </div>
        <span class="ws-donut-hole" aria-hidden="true">
          <strong>
            {data.seats === null ? '—' : formatInteger(locale, data.seats)}
          </strong>
          <small>/ {total}</small>
        </span>
      </div>
      <p class="coalition-pie__caption" data-pie-caption={side}>
        {reason ?? (
          <>
            {seats}
            {', '}
            {majority}
          </>
        )}
      </p>
    </figure>
  );
}

function CoalitionCard({
  future,
  year,
  format,
  label,
}: {
  readonly future: CoalitionFuture;
  readonly year: number;
  readonly format: Format;
  readonly label?: string;
}) {
  const { locale, t } = format;
  const breach =
    future.ineligiblePartyIds.length > 0 || future.forbiddenPairs.length > 0;

  return (
    <article
      class="coalition-card ws-future-tile"
      data-future-coalition={coalitionKey(future.partyIds)}
      data-state={pieState(future.projected)}
    >
      <h5 class="coalition-card__title">
        {label && <span class="ws-tile-badge">{label}</span>}
        {future.members.map((member, index) => (
          <Fragment key={member.partyId}>
            {index > 0 && ' + '}
            <bdi>{member.name}</bdi>
          </Fragment>
        ))}
      </h5>
      {breach && (
        <p class="note coalition-card__breach" data-coalition-breach>
          {t('futureCoalitions.breach')}
        </p>
      )}
      <div class="ws-pie-pair">
        <CoalitionPie
          side="base"
          label={t('future.column.base')}
          future={future}
          data={future.base}
          format={format}
        />
        <CoalitionPie
          side="year"
          label={t('future.column.year', { year })}
          future={future}
          data={future.projected}
          format={format}
        />
      </div>
      <ul class="pie-legend">
        {future.members.map((member) => (
          <li key={member.partyId} class="pie-legend__item">
            <span
              class="swatch"
              aria-hidden="true"
              style={{ background: member.color }}
            />
            <bdi>{member.name}</bdi>
          </li>
        ))}
        <li class="pie-legend__item">
          <span class="swatch swatch--rest" aria-hidden="true" />
          {t('futureCoalitions.others')}
        </li>
      </ul>
      <div class="table-scroll" tabIndex={0}>
        <table class="results-table" data-table="future-coalition">
          <thead>
            <tr>
              <th scope="col">{t('compare.column.name')}</th>
              <th scope="col">{t('future.column.base')}</th>
              <th scope="col">{t('future.column.year', { year })}</th>
              <th scope="col">{t('compare.column.change')}</th>
            </tr>
          </thead>
          <tbody>
            {future.members.map((member) => (
              <tr key={member.partyId} data-member={member.partyId}>
                <th scope="row">
                  <span
                    class="swatch"
                    aria-hidden="true"
                    style={{ background: member.color }}
                  />
                  <bdi>{member.name}</bdi>
                </th>
                <CountCells
                  prefix={null}
                  value={member.seats}
                  format={format}
                />
              </tr>
            ))}
            <tr data-coalition-row="total">
              <th scope="row">{t('futureCoalitions.total')}</th>
              <CountCells prefix={null} value={future.seats} format={format} />
            </tr>
            <tr data-coalition-row="needed">
              <th scope="row">{t('futureCoalitions.needed')}</th>
              <td data-cell="needed" colSpan={3}>
                {formatInteger(locale, future.majority)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}

/** The followed coalitions, year 0 beside the chosen year (M2-30). */
function FutureCoalitions({
  scenario,
  base,
  projected,
  year,
  followed,
  format,
  labels,
}: {
  readonly scenario: Scenario;
  readonly base: SeatResult;
  readonly projected: SeatResult;
  readonly year: number;
  readonly followed: readonly (readonly string[])[];
  readonly format: Format;
  readonly labels?: Readonly<Record<string, string>>;
}) {
  const { t } = format;
  const known = new Set(scenario.parties.map((party) => party.id));
  const futures = followed
    .filter((ids) => ids.length > 0 && ids.every((id) => known.has(id)))
    .map((ids) => buildCoalitionFuture(scenario, base, projected, ids));

  return (
    <section class="future-coalitions ws-card" data-future-coalitions>
      <h4 class="compare__title">{t('panel.sameCoalitions')}</h4>
      <p class="ws-hint">
        {t('futureCoalitions.title')} · {t('panel.sameNote')}
      </p>
      {futures.length === 0 ? (
        <p class="note">{t('futureCoalitions.empty')}</p>
      ) : (
        <div class="future-coalitions__cards ws-future-grid">
          {futures.map((future) => (
            <CoalitionCard
              key={coalitionKey(future.partyIds)}
              future={future}
              year={year}
              format={format}
              label={labels?.[coalitionKey(future.partyIds)]}
            />
          ))}
        </div>
      )}
    </section>
  );
}

const YEARS: readonly number[] = Array.from(
  { length: LIMITS.projectionYears + 1 },
  (_, year) => year,
);

/** Control text back to a year without parsing numbers. */
function yearOf(text: string): number | undefined {
  return YEARS.find((year) => `${year}` === text);
}

export function FutureYear({
  year,
  locale,
  t,
  onYear,
}: Pick<FutureProps, 'year' | 'locale' | 't' | 'onYear'>) {
  const choose = (text: string) => {
    const found = yearOf(text);
    if (found !== undefined) onYear(found);
  };
  return (
    <div class="future__controls">
      <label class="future__year">
        <span class="future__label">{t('future.year')}</span>
        <select
          class="future__select"
          data-future-year
          aria-label={t('future.year')}
          onChange={(event) => choose(event.currentTarget.value)}
        >
          {YEARS.map((option) => (
            <option key={option} value={`${option}`} selected={option === year}>
              {formatInteger(locale, option)}
            </option>
          ))}
        </select>
      </label>
      <input
        type="range"
        class="slider future__slider"
        data-future-slider
        min="0"
        max={`${LIMITS.projectionYears}`}
        step="1"
        value={`${year}`}
        aria-label={t('future.year')}
        onInput={(event) => choose(event.currentTarget.value)}
      />
    </div>
  );
}

function YearHeaders({
  label,
  year,
  t,
}: {
  readonly label: string;
  readonly year: number;
  readonly t: Translate;
}) {
  return (
    <>
      <th scope="col">
        {label}: {t('future.column.base')}
      </th>
      <th scope="col">
        {label}: {t('future.column.year', { year })}
      </th>
      <th scope="col">
        {label}: {t('compare.column.change')}
      </th>
    </>
  );
}

/** Year 0 beside a chosen future year (Section 14.3). */
export function Future({
  scenario,
  base,
  projected,
  year,
  followed,
  locale,
  t,
  onYear,
  labels,
  showYear = true,
}: FutureProps) {
  const format: Format = { locale, t };
  const report = buildFutureReport(scenario, base, projected, year);
  const reason = report.noAllocation.current;
  return (
    <div class="future">
      {showYear && (
        <FutureYear year={year} locale={locale} t={t} onYear={onYear} />
      )}
      <h4 class="future__heading">{t('future.heading', { year })}</h4>
      <p
        class="future__state"
        data-future-state={reason === null ? 'ready' : 'no-allocation'}
      >
        {reason === null
          ? t('status.allocated', { seats: projected.allocation.seatCount })
          : t(`status.noAllocation.${reason}`)}
      </p>
      <p class="future__note" data-future-note>
        {t('future.note')}
      </p>

      <FutureCoalitions
        scenario={scenario}
        base={base}
        projected={projected}
        year={year}
        followed={followed}
        labels={labels}
        format={format}
      />

      <Section title={t('future.totals')} table="future-totals">
        <thead>
          <tr>
            <th scope="col">{t('compare.column.name')}</th>
            <th scope="col">{t('future.column.base')}</th>
            <th scope="col">{t('future.column.year', { year })}</th>
            <th scope="col">{t('compare.column.change')}</th>
          </tr>
        </thead>
        <tbody>
          {(['population', 'cast', 'valid', 'turnout'] as const).map((key) => (
            <tr key={key} data-total={key}>
              <TotalHeader name={key} t={t} />
              <DecimalCells
                prefix={null}
                value={report.totals[key]}
                format={format}
              />
            </tr>
          ))}
        </tbody>
      </Section>

      <Section title={t('compare.groups')} table="future-groups">
        <thead>
          <tr>
            <th scope="col">{t('compare.column.name')}</th>
            <YearHeaders
              label={t('future.column.population')}
              year={year}
              t={t}
            />
            <YearHeaders
              label={t('compare.column.turnout')}
              year={year}
              t={t}
            />
          </tr>
        </thead>
        <tbody>
          {report.groups.map((row, index) => (
            <tr key={row.groupId} data-group={row.groupId}>
              <th scope="row">
                <span
                  class="swatch swatch--group"
                  aria-hidden="true"
                  style={{ background: groupColorOf(row.groupId, index) }}
                />
                <bdi>{row.name}</bdi>
              </th>
              <DecimalCells
                prefix="population"
                value={row.population}
                format={format}
              />
              <DecimalCells
                prefix="turnout"
                value={row.turnout}
                format={format}
              />
            </tr>
          ))}
        </tbody>
      </Section>

      <Section title={t('compare.parties')} table="future-parties">
        <thead>
          <tr>
            <th scope="col">{t('compare.column.name')}</th>
            <YearHeaders label={t('compare.column.votes')} year={year} t={t} />
            <YearHeaders
              label={t('compare.column.voteShare')}
              year={year}
              t={t}
            />
            <YearHeaders label={t('compare.column.seats')} year={year} t={t} />
          </tr>
        </thead>
        <tbody>
          {report.parties.map((row) => (
            <tr key={row.partyId} data-party={row.partyId}>
              <th scope="row">
                <span
                  class="swatch"
                  aria-hidden="true"
                  style={{ background: row.color }}
                />
                <bdi>{row.name}</bdi>
              </th>
              <DecimalCells prefix="votes" value={row.votes} format={format} />
              <DecimalCells
                prefix="share"
                value={row.voteShare}
                format={format}
              />
              <CountCells prefix="seats" value={row.seats} format={format} />
            </tr>
          ))}
        </tbody>
      </Section>
    </div>
  );
}
