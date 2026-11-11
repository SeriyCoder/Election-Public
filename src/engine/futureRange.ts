import { majorityRequired } from './coalitions';
import { roundToPlaces } from './numeric';
import {
  compare,
  div,
  isZero,
  mul,
  rational,
  sub,
  sum,
  toFractionString,
  type Rational,
} from './rational';
import { runSeats, type SeatProjection, type SeatResult } from './run';
import { LIMITS, type Scenario } from './schema';
import type { NoAllocationReason } from './threshold';
import {
  partyModeGroupPopulations,
  type ProjectionUnavailableReason,
} from './votes';

export type CriticalColor = 'red' | 'orange';
export type CriticalSets = Readonly<Record<CriticalColor, readonly string[]>>;
export type MissingReason = NoAllocationReason | ProjectionUnavailableReason;

export interface FutureVisualEntry {
  readonly id: string;
  readonly amount: Rational | null;
}

export interface FutureVisualYear {
  readonly availability: 'available' | 'unavailable';
  readonly reason: ProjectionUnavailableReason | null;
  readonly total: Rational | null;
  readonly entries: readonly FutureVisualEntry[];
}

export interface FutureVisuals {
  readonly population: {
    readonly baseline: FutureVisualYear;
    readonly current: FutureVisualYear;
  };
  readonly validVotes: {
    readonly baseline: FutureVisualYear;
    readonly current: FutureVisualYear;
  };
}

export interface CriticalSetSummary {
  readonly partyIds: readonly string[];
  readonly votes: Rational;
  readonly voteShare: Rational | null;
  readonly seats: number | null;
  readonly isHalf: boolean | null;
  readonly isMajority: boolean | null;
  readonly majority: number;
  readonly noAllocation: NoAllocationReason | null;
}

export interface CriticalYearSample {
  readonly year: number;
  readonly seats: number | null;
  readonly reason: MissingReason | null;
}

export interface MissingYear {
  readonly year: number;
  readonly reason: MissingReason;
}

export type CriticalCrossing =
  | { readonly state: 'empty' }
  | { readonly state: 'proven'; readonly year: number; readonly seats: number }
  | {
      readonly state: 'first-known';
      readonly year: number;
      readonly seats: number;
      readonly missing: readonly MissingYear[];
    }
  | { readonly state: 'not-reached' }
  | { readonly state: 'incomplete'; readonly missing: readonly MissingYear[] };

export interface FutureRangeYear {
  readonly year: number;
  readonly red: CriticalSetSummary | null;
  readonly orange: CriticalSetSummary | null;
  readonly reason: ProjectionUnavailableReason | null;
}

export interface FutureRangeResult {
  readonly years: readonly FutureRangeYear[];
  readonly crossings: Readonly<Record<CriticalColor, CriticalCrossing>>;
}

export function buildFutureVisuals(
  scenario: Scenario,
  baseline: SeatResult,
  current: SeatProjection,
): FutureVisuals {
  const unavailable = (
    ids: readonly string[],
    reason: ProjectionUnavailableReason,
  ): FutureVisualYear => ({
    availability: 'unavailable',
    reason,
    total: null,
    entries: ids.map((id) => ({ id, amount: null })),
  });
  const population = (result: SeatProjection): FutureVisualYear => {
    const ids = scenario.groups.map((group) => group.id);
    if ('kind' in result) return unavailable(ids, result.reason);
    let amounts: readonly Rational[];
    if (scenario.inputMode === 'parties') {
      if (result.votes.groupPopulations !== undefined) {
        amounts = result.votes.groupPopulations;
      } else {
        const inferred = partyModeGroupPopulations(
          scenario,
          baseline.votes.parties,
          0,
        );
        if ('kind' in inferred) return unavailable(ids, inferred.reason);
        amounts = inferred.baseline;
      }
    } else {
      amounts = result.votes.groups.map((group) => group.population);
    }
    return {
      availability: 'available',
      reason: null,
      total: sum(amounts),
      entries: ids.map((id, index) => ({ id, amount: amounts[index]! })),
    };
  };
  const votes = (result: SeatProjection): FutureVisualYear =>
    'kind' in result
      ? unavailable(
          scenario.parties.map((party) => party.id),
          result.reason,
        )
      : {
          availability: 'available',
          reason: null,
          total: result.votes.allValidVotes,
          entries: result.votes.parties.map((party) => ({
            id: party.partyId,
            amount: party.votes,
          })),
        };
  return {
    population: {
      baseline: population(baseline),
      current: population(current),
    },
    validVotes: { baseline: votes(baseline), current: votes(current) },
  };
}

export function summarizeCriticalSet(
  scenario: Scenario,
  result: SeatResult,
  partyIds: readonly string[],
): CriticalSetSummary {
  const selected = new Set(partyIds);
  for (const id of selected) {
    if (!scenario.parties.some((party) => party.id === id)) {
      throw new RangeError(`Unknown party "${id}"`);
    }
  }
  const ordered = scenario.parties
    .filter((party) => selected.has(party.id))
    .map((party) => party.id);
  const votes = sum(
    result.votes.parties
      .filter((party) => selected.has(party.partyId))
      .map((party) => party.votes),
  );
  const noAllocation = result.allocation.noAllocation;
  const seats =
    noAllocation === null
      ? result.allocation.parties
          .filter((party) => selected.has(party.partyId))
          .reduce((total, party) => total + party.seats, 0)
      : null;
  const majority = majorityRequired(scenario);
  return {
    partyIds: ordered,
    votes,
    voteShare: isZero(result.votes.allValidVotes)
      ? null
      : div(votes, result.votes.allValidVotes),
    seats,
    isHalf: seats === null ? null : seats * 2 >= scenario.rules.seatCount,
    isMajority: seats === null ? null : seats >= majority,
    majority,
    noAllocation,
  };
}

export function findFirstHalfSeat(
  samples: readonly CriticalYearSample[],
  seatCount: number,
): CriticalCrossing {
  if (
    !Number.isSafeInteger(seatCount) ||
    seatCount <= 0 ||
    samples.length !== LIMITS.projectionYears + 1 ||
    samples.some(
      (sample, index) =>
        sample.year !== index ||
        (sample.seats === null
          ? sample.reason === null
          : sample.reason !== null ||
            !Number.isSafeInteger(sample.seats) ||
            sample.seats < 0 ||
            sample.seats > seatCount),
    )
  ) {
    throw new RangeError('Expected one valid sample for every projection year');
  }
  const missing: MissingYear[] = [];
  for (const sample of samples) {
    if (sample.seats === null) {
      missing.push({ year: sample.year, reason: sample.reason! });
    } else if (sample.seats * 2 >= seatCount) {
      return missing.length === 0
        ? { state: 'proven', year: sample.year, seats: sample.seats }
        : {
            state: 'first-known',
            year: sample.year,
            seats: sample.seats,
            missing,
          };
    }
  }
  return missing.length === 0
    ? { state: 'not-reached' }
    : { state: 'incomplete', missing };
}

export function scanCriticalSets(
  scenario: Scenario,
  sets: CriticalSets,
  onYear?: (year: number) => void,
): FutureRangeResult {
  const years: FutureRangeYear[] = [];
  for (let year = 0; year <= LIMITS.projectionYears; year += 1) {
    const result = runSeats(scenario, year);
    years.push(
      'kind' in result
        ? { year, red: null, orange: null, reason: result.reason }
        : {
            year,
            reason: null,
            red:
              sets.red.length === 0
                ? null
                : summarizeCriticalSet(scenario, result, sets.red),
            orange:
              sets.orange.length === 0
                ? null
                : summarizeCriticalSet(scenario, result, sets.orange),
          },
    );
    onYear?.(year);
  }
  const crossing = (color: CriticalColor): CriticalCrossing =>
    sets[color].length === 0
      ? { state: 'empty' }
      : findFirstHalfSeat(
          years.map((entry) => ({
            year: entry.year,
            seats: entry[color]?.seats ?? null,
            reason: entry.reason ?? entry[color]?.noAllocation ?? null,
          })),
          scenario.rules.seatCount,
        );
  return {
    years,
    crossings: { red: crossing('red'), orange: crossing('orange') },
  };
}

const HUNDRED = rational(100n);

export function criticalSetDisplay(summary: CriticalSetSummary): {
  votes: string;
  share: string | null;
} {
  return {
    votes: roundToPlaces(summary.votes, 0),
    share:
      summary.voteShare === null
        ? null
        : roundToPlaces(mul(summary.voteShare, HUNDRED), 2),
  };
}

/** Absolute bar scales and rounded labels never feed an electoral decision. */
export function futureMeasureDisplay(measure: FutureVisuals['population']) {
  const before = measure.baseline.total ?? rational(0n);
  const after = measure.current.total ?? rational(0n);
  const max = compare(before, after) >= 0 ? before : after;
  const percent = (value: Rational, total: Rational) =>
    isZero(total) ? '0' : roundToPlaces(mul(div(value, total), HUNDRED), 8);
  const side = (data: FutureVisualYear) => ({
    state:
      data.total === null
        ? 'unavailable'
        : isZero(data.total)
          ? 'zero'
          : 'available',
    reason: data.reason,
    total: data.total === null ? null : toFractionString(data.total),
    label: data.total === null ? null : roundToPlaces(data.total, 0),
    width: data.total === null ? '0' : percent(data.total, max),
    entries: data.entries.map((entry) => ({
      id: entry.id,
      amount: entry.amount === null ? null : toFractionString(entry.amount),
      label: entry.amount === null ? null : roundToPlaces(entry.amount, 0),
      width:
        entry.amount === null || data.total === null
          ? '0'
          : percent(entry.amount, data.total),
      share:
        entry.amount === null || data.total === null || isZero(data.total)
          ? null
          : roundToPlaces(mul(div(entry.amount, data.total), HUNDRED), 2),
    })),
  });
  return {
    max: toFractionString(max),
    baseline: side(measure.baseline),
    current: side(measure.current),
    changes: measure.baseline.entries.map((entry, index) => {
      const current = measure.current.entries[index]?.amount ?? null;
      const change =
        entry.amount === null || current === null
          ? null
          : sub(current, entry.amount);
      return {
        id: entry.id,
        exact: change === null ? null : toFractionString(change),
        label: change === null ? null : roundToPlaces(change, 0),
      };
    }),
  };
}
