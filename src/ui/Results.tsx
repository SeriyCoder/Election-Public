import { useEffect, useRef, useState } from 'preact/hooks';
import type {
  PartyRow,
  ReportTotals,
  ResultReport,
  Segment,
} from '../engine/report';
import type { Locale, Translate } from '../i18n';
import { formatDecimal, formatInteger } from '../i18n/format';
import { Hint } from './Hint';

export interface ResultsProps {
  readonly report: ResultReport;
  readonly locale: Locale;
  readonly t: Translate;
  /** Every group at the standard 99.9% valid-ballot rate. */
  readonly standardValidity?: boolean;
}

const TOTAL_KEYS = [
  'population',
  'unavailable',
  'abstaining',
  'cast',
  'invalid',
  'valid',
  'turnout',
  'threshold',
] as const satisfies readonly (keyof ReportTotals)[];

function Summary({ report, locale, t }: ResultsProps) {
  return (
    <dl class="summary" aria-label={t('results.summary')}>
      {TOTAL_KEYS.map((key) => (
        <div key={key} class="summary__item">
          <dt>
            {t(`summary.${key}`)}
            {key === 'population' && (
              <Hint
                kind="population"
                label={t('summary.population')}
                text={t('hint.population')}
                t={t}
              />
            )}
          </dt>
          <dd data-summary={key}>
            {formatDecimal(locale, report.totals[key])}
          </dd>
        </div>
      ))}
      <div class="summary__item">
        <dt>{t('summary.majority')}</dt>
        <dd data-summary="majority">
          {report.majorityOverridden ? (
            <span data-majority-overridden="true">
              {`${formatInteger(locale, report.majority)} ${t('coalition.overridden')}`}
            </span>
          ) : (
            formatInteger(locale, report.majority)
          )}
        </dd>
      </div>
    </dl>
  );
}

function decimalOrEmpty(locale: Locale, t: Translate, value: string | null) {
  return value === null ? t('results.empty') : formatDecimal(locale, value);
}

function Swatch({ color }: { readonly color: string | null }) {
  return color === null ? null : (
    <span class="swatch" aria-hidden="true" style={{ background: color }} />
  );
}

function PartyTable({ report, locale, t }: ResultsProps) {
  const allocated = report.noAllocation === null;
  return (
    <table class="results-table" data-table="parties">
      <caption>{t('results.parties')}</caption>
      <thead>
        <tr>
          <th scope="col">{t('column.party')}</th>
          <th scope="col">{t('column.votes')}</th>
          <th scope="col">{t('column.voteShare')}</th>
          <th scope="col">{t('column.status')}</th>
          {allocated && <th scope="col">{t('column.seats')}</th>}
          {allocated && <th scope="col">{t('column.seatShare')}</th>}
        </tr>
      </thead>
      <tbody>
        {report.parties.map((row: PartyRow) => (
          <tr key={row.partyId} data-party={row.partyId}>
            <th scope="row">
              <Swatch color={row.color} />
              <bdi>{row.name}</bdi>
            </th>
            <td data-cell="votes">{formatDecimal(locale, row.votes)}</td>
            <td data-cell="voteShare">
              {decimalOrEmpty(locale, t, row.voteShare)}
            </td>
            <td data-cell="status">
              <span class="qualification" data-status={row.status}>
                {t(`qualification.${row.status}`)}
              </span>
            </td>
            {allocated && (
              <td data-cell="seats">{formatInteger(locale, row.seats)}</td>
            )}
            {allocated && (
              <td data-cell="seatShare">
                {decimalOrEmpty(locale, t, row.seatShare)}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HamiltonTable({ report, locale, t }: ResultsProps) {
  return (
    <table class="results-table" data-table="hamilton">
      <caption>{t('results.hamilton')}</caption>
      <thead>
        <tr>
          <th scope="col">{t('column.party')}</th>
          <th scope="col">{t('column.quota')}</th>
          <th scope="col">{t('column.floorSeats')}</th>
          <th scope="col">{t('column.remainder')}</th>
          <th scope="col">{t('column.remainderSeat')}</th>
        </tr>
      </thead>
      <tbody>
        {report.parties.map((row) => (
          <tr key={row.partyId} data-party={row.partyId}>
            <th scope="row">
              <bdi>{row.name}</bdi>
            </th>
            <td data-cell="quota">{decimalOrEmpty(locale, t, row.quota)}</td>
            <td data-cell="floorSeats">
              {formatInteger(locale, row.floorSeats)}
            </td>
            <td data-cell="remainder">
              {decimalOrEmpty(locale, t, row.remainder)}
            </td>
            <td data-cell="remainderSeat">
              <span data-awarded={row.remainderSeat ? 'true' : 'false'}>
                {t(row.remainderSeat ? 'remainder.yes' : 'remainder.no')}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Bar({
  kind,
  label,
  segments,
  selected,
  onPick,
}: {
  readonly kind: 'votes' | 'seats';
  readonly label: string;
  readonly segments: readonly Segment[];
  readonly selected: string | null;
  readonly onPick: (event: MouseEvent) => void;
}) {
  return (
    <figure class="bar-figure">
      <figcaption>{label}</figcaption>
      <div class="bar" data-bar={kind} aria-hidden="true" onClick={onPick}>
        {segments.map((segment) => (
          <span
            key={segment.partyId}
            class="bar__segment"
            data-segment={segment.partyId}
            data-selected={segment.partyId === selected ? 'true' : undefined}
            style={`flex-grow:${segment.weight};background:${segment.color}`}
          />
        ))}
      </div>
    </figure>
  );
}

function Legend({
  report,
  t,
  selected,
  onToggle,
}: ResultsProps & {
  readonly selected: string | null;
  readonly onToggle: (partyId: string) => void;
}) {
  return (
    <ul class="legend" data-legend="parties" aria-label={t('results.legend')}>
      {report.parties.map((row) => (
        <li key={row.partyId} data-legend-party={row.partyId}>
          <button
            type="button"
            class="legend__item"
            data-select-party={row.partyId}
            aria-expanded={row.partyId === selected ? 'true' : 'false'}
            aria-controls={row.partyId === selected ? DETAILS_ID : undefined}
            aria-label={t('legend.select', { name: row.name })}
            onClick={() => onToggle(row.partyId)}
          >
            <Swatch color={row.color} />
            <bdi>{row.name}</bdi>
          </button>
        </li>
      ))}
    </ul>
  );
}

function SeatDiagram({
  report,
  t,
  selected,
  onPick,
}: ResultsProps & {
  readonly selected: string | null;
  readonly onPick: (event: MouseEvent) => void;
}) {
  const colors = new Map(report.parties.map((row) => [row.partyId, row.color]));
  const caption = t('diagram.caption', {
    seats: report.seatCount,
    majority: report.majority,
  });
  return (
    <figure class="diagram-figure">
      <figcaption>{t('diagram.title')}</figcaption>
      <div
        class="seats"
        data-diagram="seats"
        role="img"
        aria-label={caption}
        onClick={onPick}
      >
        {report.seatSequence.map((partyId, index) =>
          index === report.majority - 1 ? (
            <span
              key={index}
              class="seat seat--majority"
              data-seat={partyId}
              data-majority-seat="true"
              data-selected={partyId === selected ? 'true' : undefined}
              title={t('diagram.majority')}
              style={{ background: colors.get(partyId) }}
            />
          ) : (
            <span
              key={index}
              class="seat"
              data-seat={partyId}
              data-selected={partyId === selected ? 'true' : undefined}
              style={{ background: colors.get(partyId) }}
            />
          ),
        )}
      </div>
    </figure>
  );
}

const DETAILS_ID = 'chart-details';

/** Exact values of one party, as printed in the tables; nothing when absent. */
export function ChartDetails({
  report,
  partyId,
  locale,
  t,
  onClose,
}: ResultsProps & {
  readonly partyId: string;
  readonly onClose: () => void;
}) {
  const row = report.parties.find((party) => party.partyId === partyId);
  if (row === undefined) {
    return null;
  }
  const items: readonly [string, string, string][] = [
    ['votes', t('column.votes'), formatDecimal(locale, row.votes)],
    [
      'voteShare',
      t('column.voteShare'),
      decimalOrEmpty(locale, t, row.voteShare),
    ],
    ['status', t('column.status'), t(`qualification.${row.status}`)],
    ['seats', t('column.seats'), formatInteger(locale, row.seats)],
    [
      'seatShare',
      t('column.seatShare'),
      decimalOrEmpty(locale, t, row.seatShare),
    ],
    ['quota', t('column.quota'), decimalOrEmpty(locale, t, row.quota)],
  ];
  return (
    <section
      id={DETAILS_ID}
      class="details"
      data-details={row.partyId}
      aria-label={t('details.title', { name: row.name })}
    >
      <h4 class="details__title">
        <Swatch color={row.color} />
        <bdi>{row.name}</bdi>
      </h4>
      <dl class="details__list">
        {items.map(([key, term, value]) => (
          <div key={key} class="details__item">
            <dt>{term}</dt>
            <dd data-detail={key}>
              <bdi>{value}</bdi>
            </dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        class="button"
        data-action="close-details"
        onClick={onClose}
      >
        {t('details.close')}
      </button>
    </section>
  );
}

/** The party under a click on a bar segment or seat, if any. */
function pickedParty(event: MouseEvent): string | null {
  const target = event.target;
  if (!(target instanceof Element)) {
    return null;
  }
  const hit = target.closest<HTMLElement>('[data-segment], [data-seat]');
  return hit?.dataset.segment ?? hit?.dataset.seat ?? null;
}

export function Results(props: ResultsProps) {
  const { report, t } = props;
  const allocated = report.noAllocation === null;
  const [selected, setSelected] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const scrollOnOpen = useRef(false);
  const active =
    allocated &&
    selected !== null &&
    report.parties.some((row) => row.partyId === selected)
      ? selected
      : null;

  const close = (partyId: string) => {
    const focusInside = slot.current?.contains(document.activeElement) ?? false;
    setSelected(null);
    if (focusInside) {
      root.current
        ?.querySelector<HTMLButtonElement>(`[data-select-party="${partyId}"]`)
        ?.focus();
    }
  };

  const pick = (event: MouseEvent) => {
    const partyId = pickedParty(event);
    if (partyId !== null) {
      scrollOnOpen.current = true;
      setSelected(partyId);
    }
  };

  useEffect(() => {
    if (active === null) {
      return undefined;
    }
    if (scrollOnOpen.current) {
      scrollOnOpen.current = false;
      slot.current?.scrollIntoView({ block: 'nearest' });
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close(active);
      }
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      const kept =
        target instanceof Element &&
        (root.current?.contains(target) ?? false) &&
        target.closest(
          '[data-details], [data-select-party], [data-segment], [data-seat]',
        ) !== null;
      if (!kept) {
        close(active);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [active]);

  return (
    <div
      class="results"
      ref={root}
      data-results={allocated ? 'ready' : 'no-allocation'}
    >
      <Summary {...props} />
      {props.standardValidity === true && (
        <p class="note" data-validity-note>
          {t('validity.note')}
        </p>
      )}
      {report.cutoffTie && (
        <p class="note" data-note="cutoff-tie">
          {t('results.cutoffTie')}
        </p>
      )}
      {allocated && (
        <>
          <Bar
            kind="votes"
            label={t('results.votesBar')}
            segments={report.voteSegments}
            selected={active}
            onPick={pick}
          />
          <Bar
            kind="seats"
            label={t('results.seatsBar')}
            segments={report.seatSegments}
            selected={active}
            onPick={pick}
          />
          <Legend
            {...props}
            selected={active}
            onToggle={(partyId) => {
              scrollOnOpen.current = false;
              setSelected(active === partyId ? null : partyId);
            }}
          />
          <SeatDiagram {...props} selected={active} onPick={pick} />
          <div
            class="details-slot"
            ref={slot}
            data-details-slot
            aria-live="polite"
          >
            {active !== null && (
              <ChartDetails
                {...props}
                partyId={active}
                onClose={() => close(active)}
              />
            )}
          </div>
        </>
      )}
      <PartyTable {...props} />
      {allocated && <HamiltonTable {...props} />}
    </div>
  );
}
