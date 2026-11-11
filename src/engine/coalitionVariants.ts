import type { AllocationResult } from './allocate';
import type { Scenario } from './schema';
import {
  effectiveForbiddenPairs,
  evaluateCoalition,
  majorityRequired,
} from './coalitions';
import { panelPercent, panelSlices } from './panel';
import { rational } from './rational';

export interface CoalitionVariant {
  readonly partyIds: readonly string[];
  readonly seats: number;
  readonly majority: boolean;
}
export function coalitionTileReport(
  scenario: Scenario,
  allocation: AllocationResult,
  ids: readonly string[],
) {
  const evaluation = evaluateCoalition(scenario, allocation, ids);
  const members = evaluation.partyIds.map((id) => {
    const seats =
      allocation.parties.find((row) => row.partyId === id)?.seats ?? 0;
    return {
      id,
      seats,
      inside:
        evaluation.seats === 0
          ? null
          : panelPercent(rational(BigInt(seats), BigInt(evaluation.seats))),
      parliament: panelPercent(
        rational(BigInt(seats), BigInt(scenario.rules.seatCount)),
      ),
      pivotal:
        evaluation.reachesMajority &&
        evaluation.seats - seats < majorityRequired(scenario),
    };
  });
  return {
    ...evaluation,
    members,
    noAllocation: allocation.noAllocation,
    stops: panelSlices(
      members.map((member) =>
        rational(BigInt(member.seats), BigInt(scenario.rules.seatCount)),
      ),
    ),
    missing: evaluation.margin < 0 ? -evaluation.margin : 0,
    required: majorityRequired(scenario),
    majorityMark: panelPercent(
      rational(
        BigInt(majorityRequired(scenario)),
        BigInt(scenario.rules.seatCount),
      ),
    ),
    shortfall: panelPercent(
      rational(
        BigInt(evaluation.margin < 0 ? -evaluation.margin : 0),
        BigInt(majorityRequired(scenario)),
      ),
    ),
    parliament: panelPercent(
      rational(BigInt(evaluation.seats), BigInt(scenario.rules.seatCount)),
    ),
    joiners: scenario.parties
      .filter(
        (party) =>
          !ids.includes(party.id) &&
          (allocation.parties.find((row) => row.partyId === party.id)?.seats ??
            0) > 0 &&
          evaluateCoalition(scenario, allocation, [...ids, party.id])
            .forbiddenPairs.length === 0 &&
          party.canJoinGovernment,
      )
      .map((party) => party.id),
  };
}
export function nearestCoalitions(
  scenario: Scenario,
  allocation: AllocationResult,
  limit = 200,
): {
  readonly variants: readonly CoalitionVariant[];
  readonly complete: boolean;
  readonly total: number;
} {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
    throw new RangeError('Invalid variant limit');
  if (allocation.noAllocation !== null)
    return { variants: [], complete: true, total: 0 };
  const seats = new Map(
    allocation.parties.map((row) => [row.partyId, row.seats]),
  );
  const eligible = scenario.parties.filter(
    (party) => party.canJoinGovernment && (seats.get(party.id) ?? 0) > 0,
  );
  if (eligible.length > 20) return { variants: [], complete: false, total: 0 };
  const forbidden = effectiveForbiddenPairs(scenario);
  const majority = majorityRequired(scenario);
  const order = new Map(
    scenario.parties.map((party, index) => [party.id, index]),
  );
  const sort = (a: CoalitionVariant, b: CoalitionVariant): number => {
    const distance = (seats: number) =>
      seats >= majority ? seats - majority : majority - seats;
    const rank =
      distance(a.seats) - distance(b.seats) ||
      (b.majority ? 1 : 0) - (a.majority ? 1 : 0) ||
      a.partyIds.length - b.partyIds.length;
    if (rank) return rank;
    for (let i = 0; i < a.partyIds.length; i += 1) {
      const diff = order.get(a.partyIds[i]!)! - order.get(b.partyIds[i]!)!;
      if (diff) return diff;
    }
    return 0;
  };
  let visits = 0;
  let total = 0;
  let complete = true;
  let variants: CoalitionVariant[] = [];
  function visit(at: number, members: readonly string[], count: number): void {
    visits += 1;
    if (visits > 250000) {
      complete = false;
      return;
    }
    for (let index = at; index < eligible.length; index += 1) {
      if (!complete) break;
      const id = eligible[index]!.id;
      if (
        forbidden.some(
          (pair) =>
            pair.partyIds.includes(id) &&
            pair.partyIds.some((member) => members.includes(member)),
        )
      )
        continue;
      const next = [...members, id];
      const value = count + seats.get(id)!;
      total += 1;
      variants.push({
        partyIds: next,
        seats: value,
        majority: value >= majority,
      });
      if (variants.length >= limit * 2)
        variants = variants.sort(sort).slice(0, limit);
      visit(index + 1, next, value);
    }
  }
  visit(0, [], 0);
  return { variants: variants.sort(sort).slice(0, limit), complete, total };
}
