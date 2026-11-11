/** Year 0 beside year k of the same scenario, rounded for display (Section 14.3). */
import {
  evaluateCoalition,
  majorityRequired,
  type CoalitionEvaluation,
  type ForbiddenPair,
} from './coalitions';
import {
  compareScenarios,
  roundedChange,
  type Change,
  type CountChange,
  type PartyComparison,
  type TotalsComparison,
} from './compare';
import { roundToPlaces } from './numeric';
import {
  add,
  div,
  fromInteger,
  mul,
  rational,
  type Rational,
} from './rational';
import { COUNT_PLACES, PERCENT_PLACES } from './report';
import type { SeatResult } from './run';
import type { Scenario } from './schema';
import type { NoAllocationReason } from './threshold';
import { checkYear, groupTurnout, partyModeGroupPopulations } from './votes';

export interface FutureGroupRow {
  readonly groupId: string;
  readonly name: string;
  readonly population: Change;
  /** The group turnout input of each year as a percent, after the clamp. */
  readonly turnout: Change;
}

export interface FutureReport {
  readonly year: number;
  readonly noAllocation: {
    readonly baseline: NoAllocationReason | null;
    readonly current: NoAllocationReason | null;
  };
  readonly totals: TotalsComparison;
  readonly groups: readonly FutureGroupRow[];
  readonly parties: readonly PartyComparison[];
}

export interface CoalitionMemberFuture {
  readonly partyId: string;
  readonly name: string;
  readonly color: string;
  /** Null in a year that allocates no seats. */
  readonly seats: CountChange;
}

export interface CoalitionYear {
  /** Null when the year allocates no seats. */
  readonly seats: number | null;
  readonly reachesMajority: boolean;
  readonly noAllocation: NoAllocationReason | null;
  /** Cumulative end of each member's slice, in percent of the seats, two places. */
  readonly stops: readonly string[];
  /** Seats still missing to the majority; null when no seats are allocated. */
  readonly missing: number | null;
  /** The members' national vote share in percent, one place, or null. */
  readonly voteShare: string | null;
}

/** One party set in year 0 and in year k (M2-30). */
export interface CoalitionFuture {
  /** The members in scenario order. */
  readonly partyIds: readonly string[];
  readonly members: readonly CoalitionMemberFuture[];
  readonly seatCount: number;
  /** Seats needed for a majority. */
  readonly majority: number;
  /** The end of the majority seat, in percent of the seats, two places. */
  readonly majorityStop: string;
  readonly base: CoalitionYear;
  readonly projected: CoalitionYear;
  readonly seats: CountChange;
  readonly ineligiblePartyIds: readonly string[];
  readonly forbiddenPairs: readonly ForbiddenPair[];
}

const HUNDRED = rational(100n);

function percent(value: Rational): Rational {
  return mul(value, HUNDRED);
}

/**
 * `base` is the seat result of year 0 and `projected` the one of `year`, both
 * of `scenario`; the report never reruns the seat calculation.
 */
export function buildFutureReport(
  scenario: Scenario,
  base: SeatResult,
  projected: SeatResult,
  year: number,
): FutureReport {
  checkYear(year);
  const comparison = compareScenarios(scenario, base, scenario, projected);
  const inferred =
    scenario.inputMode === 'parties'
      ? partyModeGroupPopulations(scenario, base.votes.parties, year)
      : null;
  const populations =
    inferred !== null && !('kind' in inferred) ? inferred : null;
  const groups = scenario.groups.map((group, index): FutureGroupRow => {
    const before =
      scenario.inputMode === 'parties'
        ? (populations?.baseline[index] ?? null)
        : (base.votes.groups[index]?.population ?? null);
    const after =
      scenario.inputMode === 'parties'
        ? (populations?.current[index] ?? null)
        : (projected.votes.groups[index]?.population ?? null);
    return {
      groupId: group.id,
      name: group.name,
      population: roundedChange(before, after, COUNT_PLACES),
      turnout: roundedChange(
        percent(groupTurnout(group, 0)),
        percent(groupTurnout(group, year)),
        PERCENT_PLACES,
      ),
    };
  });
  return {
    year,
    noAllocation: comparison.noAllocation,
    totals: comparison.totals,
    groups,
    parties: comparison.parties,
  };
}

/**
 * `base` and `projected` are the seat results of year 0 and year k of
 * `scenario`; the party set is evaluated in both without running the engine.
 */
export function buildCoalitionFuture(
  scenario: Scenario,
  base: SeatResult,
  projected: SeatResult,
  partyIds: readonly string[],
): CoalitionFuture {
  const before = evaluateCoalition(scenario, base.allocation, partyIds);
  const after = evaluateCoalition(scenario, projected.allocation, partyIds);
  const seatCount = scenario.rules.seatCount;
  const majority = majorityRequired(scenario);
  const parties = new Map(scenario.parties.map((party) => [party.id, party]));
  const members = before.partyIds.map((partyId): CoalitionMemberFuture => {
    const party = parties.get(partyId);
    return {
      partyId,
      name: party?.name ?? '',
      color: party?.color ?? '',
      seats: countChange(
        memberSeats(base, partyId),
        memberSeats(projected, partyId),
      ),
    };
  });
  const baseYear = coalitionYear(base, before, seatCount, majority);
  const projectedYear = coalitionYear(projected, after, seatCount, majority);
  return {
    partyIds: before.partyIds,
    members,
    seatCount,
    majority,
    majorityStop: percentOfSeats(fromInteger(majority), seatCount),
    base: baseYear,
    projected: projectedYear,
    seats: countChange(baseYear.seats, projectedYear.seats),
    ineligiblePartyIds: before.ineligiblePartyIds,
    forbiddenPairs: before.forbiddenPairs,
  };
}

function countChange(
  baseline: number | null,
  current: number | null,
): CountChange {
  return {
    baseline,
    current,
    change: baseline === null || current === null ? null : current - baseline,
  };
}

function memberSeats(result: SeatResult, partyId: string): number | null {
  if (result.allocation.noAllocation !== null) {
    return null;
  }
  return (
    result.allocation.parties.find((party) => party.partyId === partyId)
      ?.seats ?? 0
  );
}

function percentOfSeats(seats: Rational, seatCount: number): string {
  return roundToPlaces(
    div(mul(seats, HUNDRED), fromInteger(seatCount)),
    PERCENT_PLACES,
  );
}

function coalitionYear(
  result: SeatResult,
  evaluation: CoalitionEvaluation,
  seatCount: number,
  majority: number,
): CoalitionYear {
  const noAllocation = result.allocation.noAllocation;
  let cumulative = fromInteger(0);
  const stops = evaluation.partyIds.map((partyId) => {
    cumulative = add(
      cumulative,
      fromInteger(memberSeats(result, partyId) ?? 0),
    );
    return percentOfSeats(cumulative, seatCount);
  });
  return {
    seats: noAllocation === null ? evaluation.seats : null,
    reachesMajority: noAllocation === null && evaluation.reachesMajority,
    noAllocation,
    stops,
    missing:
      noAllocation === null
        ? evaluation.seats >= majority
          ? 0
          : majority - evaluation.seats
        : null,
    voteShare:
      noAllocation === null ? memberVoteShare(result, evaluation) : null,
  };
}

/** Display-only: the members' national vote share in percent, one place. */
function memberVoteShare(
  result: SeatResult,
  evaluation: CoalitionEvaluation,
): string | null {
  let total = fromInteger(0);
  for (const partyId of evaluation.partyIds) {
    const share = result.votes.parties.find(
      (party) => party.partyId === partyId,
    )?.voteShare;
    if (share === null || share === undefined) return null;
    total = add(total, share);
  }
  return roundToPlaces(percent(total), 1);
}
