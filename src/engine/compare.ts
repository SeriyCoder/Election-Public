/** Baseline against current: exact changes, rounded for display (Section 9). */
import {
  majorityRequired,
  type CoalitionAnalysis,
  type CoalitionStatus,
} from './coalitions';
import { roundToPlaces } from './numeric';
import { mul, rational, sub, type Rational } from './rational';
import { COUNT_PLACES, PERCENT_PLACES } from './report';
import type { SeatResult } from './run';
import type { Scenario } from './schema';
import type { NoAllocationReason, QualificationStatus } from './threshold';
import { groupTurnout } from './votes';

/** `added`: only in the current scenario; `removed`: only in the baseline. */
export type Presence = 'both' | 'added' | 'removed';

/** Rounded display values; `change` is rounded from the exact difference. */
export interface Change {
  readonly baseline: string | null;
  readonly current: string | null;
  readonly change: string | null;
}

export interface CountChange {
  readonly baseline: number | null;
  readonly current: number | null;
  readonly change: number | null;
}

export interface TotalsComparison {
  readonly population: Change;
  readonly cast: Change;
  readonly valid: Change;
  /** Cast ballots as a percent of the population. */
  readonly turnout: Change;
  readonly majority: CountChange;
}

export interface GroupComparison {
  readonly groupId: string;
  /** The current name, or the baseline name for a removed group. */
  readonly name: string;
  readonly presence: Presence;
  /** The group turnout input as a percent. */
  readonly turnout: Change;
}

export interface PartyComparison {
  readonly partyId: string;
  /** The current name and color, or the baseline ones for a removed party. */
  readonly name: string;
  readonly color: string;
  readonly presence: Presence;
  readonly votes: Change;
  readonly voteShare: Change;
  readonly status: {
    readonly baseline: QualificationStatus | null;
    readonly current: QualificationStatus | null;
  };
  /** Absent on a side without an allocation or without the party. */
  readonly seats: CountChange;
}

export interface ScenarioComparison {
  readonly noAllocation: {
    readonly baseline: NoAllocationReason | null;
    readonly current: NoAllocationReason | null;
  };
  readonly totals: TotalsComparison;
  readonly groups: readonly GroupComparison[];
  readonly parties: readonly PartyComparison[];
}

export interface CoalitionSide {
  readonly status: CoalitionStatus;
  readonly complete: boolean;
  readonly majorityRequired: number;
}

export interface CoalitionRow {
  readonly partyIds: readonly string[];
  readonly presence: Presence;
  readonly baselineSeats: number | null;
  readonly currentSeats: number | null;
}

export interface CoalitionComparison {
  readonly baseline: CoalitionSide | null;
  readonly current: CoalitionSide | null;
  /** Both searches finished and complete, so a missing coalition is proven. */
  readonly conclusive: boolean;
  /** Empty unless both analyses are present. */
  readonly coalitions: readonly CoalitionRow[];
}

const HUNDRED = rational(100n);

/** Rounds both sides and the exact difference for display. */
export function roundedChange(
  baseline: Rational | null,
  current: Rational | null,
  places: number,
): Change {
  return {
    baseline: baseline === null ? null : roundToPlaces(baseline, places),
    current: current === null ? null : roundToPlaces(current, places),
    change:
      baseline === null || current === null
        ? null
        : roundToPlaces(sub(current, baseline), places),
  };
}

function percent(value: Rational | null): Rational | null {
  return value === null ? null : mul(value, HUNDRED);
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

function presenceOf(inBaseline: boolean, inCurrent: boolean): Presence {
  if (inBaseline && inCurrent) {
    return 'both';
  }
  return inCurrent ? 'added' : 'removed';
}

/** Current order first, then rows only in the baseline, in baseline order. */
function mergeIds(
  baseline: readonly string[],
  current: readonly string[],
): string[] {
  const seen = new Set(current);
  return [...current, ...baseline.filter((id) => !seen.has(id))];
}

interface PartySide {
  readonly name: string;
  readonly color: string;
  readonly votes: Rational;
  readonly voteShare: Rational | null;
  readonly status: QualificationStatus;
  readonly seats: number | null;
}

function partySides(
  scenario: Scenario,
  result: SeatResult,
): Map<string, PartySide> {
  const sides = new Map<string, PartySide>();
  const allocated = result.allocation.noAllocation === null;
  for (const party of scenario.parties) {
    const votes = result.votes.parties.find(
      (entry) => entry.partyId === party.id,
    );
    const qualification = result.threshold.parties.find(
      (entry) => entry.partyId === party.id,
    );
    const seats = result.allocation.parties.find(
      (entry) => entry.partyId === party.id,
    );
    if (votes === undefined || qualification === undefined) {
      continue;
    }
    sides.set(party.id, {
      name: party.name,
      color: party.color,
      votes: votes.votes,
      voteShare: votes.voteShare,
      status: qualification.status,
      seats: allocated ? (seats?.seats ?? 0) : null,
    });
  }
  return sides;
}

export function compareScenarios(
  baseline: Scenario,
  baselineResult: SeatResult,
  current: Scenario,
  currentResult: SeatResult,
): ScenarioComparison {
  const before = baselineResult.votes;
  const after = currentResult.votes;
  const totals: TotalsComparison = {
    population: roundedChange(
      before.totals.population,
      after.totals.population,
      COUNT_PLACES,
    ),
    cast: roundedChange(before.totals.cast, after.totals.cast, COUNT_PLACES),
    valid: roundedChange(before.totals.valid, after.totals.valid, COUNT_PLACES),
    turnout: roundedChange(
      percent(before.turnout),
      percent(after.turnout),
      PERCENT_PLACES,
    ),
    majority: countChange(
      majorityRequired(baseline),
      majorityRequired(current),
    ),
  };

  const baselineGroups = new Map(baseline.groups.map((g) => [g.id, g]));
  const currentGroups = new Map(current.groups.map((g) => [g.id, g]));
  const groups = mergeIds(
    baseline.groups.map((g) => g.id),
    current.groups.map((g) => g.id),
  ).map((groupId): GroupComparison => {
    const was = baselineGroups.get(groupId);
    const now = currentGroups.get(groupId);
    const turnout = (
      group: Scenario['groups'][number] | undefined,
    ): Rational | null =>
      group === undefined ? null : percent(groupTurnout(group));
    return {
      groupId,
      name: (now ?? was)?.name ?? groupId,
      presence: presenceOf(was !== undefined, now !== undefined),
      turnout: roundedChange(turnout(was), turnout(now), PERCENT_PLACES),
    };
  });

  const baselineParties = partySides(baseline, baselineResult);
  const currentParties = partySides(current, currentResult);
  const parties = mergeIds(
    baseline.parties.map((p) => p.id),
    current.parties.map((p) => p.id),
  ).map((partyId): PartyComparison => {
    const was = baselineParties.get(partyId);
    const now = currentParties.get(partyId);
    const named = now ?? was;
    return {
      partyId,
      name: named?.name ?? partyId,
      color: named?.color ?? '',
      presence: presenceOf(was !== undefined, now !== undefined),
      votes: roundedChange(
        was?.votes ?? null,
        now?.votes ?? null,
        COUNT_PLACES,
      ),
      voteShare: roundedChange(
        percent(was?.voteShare ?? null),
        percent(now?.voteShare ?? null),
        PERCENT_PLACES,
      ),
      status: { baseline: was?.status ?? null, current: now?.status ?? null },
      seats: countChange(was?.seats ?? null, now?.seats ?? null),
    };
  });

  return {
    noAllocation: {
      baseline: baselineResult.allocation.noAllocation,
      current: currentResult.allocation.noAllocation,
    },
    totals,
    groups,
    parties,
  };
}

function side(analysis: CoalitionAnalysis | null): CoalitionSide | null {
  return analysis === null
    ? null
    : {
        status: analysis.status,
        complete: analysis.complete,
        majorityRequired: analysis.majorityRequired,
      };
}

function memberKey(partyIds: readonly string[]): string {
  return [...partyIds].sort().join('|');
}

export function compareCoalitions(
  baseline: CoalitionAnalysis | null,
  current: CoalitionAnalysis | null,
): CoalitionComparison {
  const comparison = {
    baseline: side(baseline),
    current: side(current),
    conclusive:
      baseline !== null &&
      current !== null &&
      baseline.complete &&
      current.complete,
  };
  if (baseline === null || current === null) {
    return { ...comparison, coalitions: [] };
  }
  const before = new Map(
    baseline.minimalWinning.map((c) => [memberKey(c.partyIds), c]),
  );
  const matched = new Set<string>();
  const rows: CoalitionRow[] = current.minimalWinning.map((coalition) => {
    const key = memberKey(coalition.partyIds);
    const was = before.get(key);
    if (was !== undefined) {
      matched.add(key);
    }
    return {
      partyIds: [...coalition.partyIds],
      presence: was === undefined ? 'added' : 'both',
      baselineSeats: was?.seats ?? null,
      currentSeats: coalition.seats,
    };
  });
  for (const coalition of baseline.minimalWinning) {
    if (!matched.has(memberKey(coalition.partyIds))) {
      rows.push({
        partyIds: [...coalition.partyIds],
        presence: 'removed',
        baselineSeats: coalition.seats,
        currentSeats: null,
      });
    }
  }
  return { ...comparison, coalitions: rows };
}
