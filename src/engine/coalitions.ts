import type { AllocationResult } from './allocate';
import type { Scenario } from './schema';
import type { NoAllocationReason } from './threshold';

export const DEFAULT_NODE_BUDGET = 1_000_000;
export const MAX_COMPLETE_ELIGIBLE = 20;
/** Visited nodes between progress reports. */
export const PROGRESS_INTERVAL = 20_000;
/** Node budget of the blocked-majority search, which runs after the main one. */
export const BLOCKED_NODE_BUDGET = 250_000;

export type CoalitionStatus =
  'feasible' | 'deadlock' | 'unknown' | 'no-allocation';

export interface ForbiddenPair {
  readonly partyIds: readonly [string, string];
  readonly source: 'party' | 'block';
  /** The parties that refused the other one, in persisted party order. */
  readonly refusedBy: readonly string[];
}

export interface Coalition {
  readonly partyIds: readonly string[];
  readonly seats: number;
  readonly margin: number;
  readonly opposition: number;
}

export interface CoalitionAnalysis {
  readonly seatCount: number;
  readonly majorityRequired: number;
  readonly majorityOverridden: boolean;
  readonly status: CoalitionStatus;
  readonly noAllocation: NoAllocationReason | null;
  readonly complete: boolean;
  readonly eligiblePartyIds: readonly string[];
  readonly forbiddenPairs: readonly ForbiddenPair[];
  readonly minimalWinning: readonly Coalition[];
  readonly balancingPartyIds: readonly string[];
  readonly nodesVisited: number;
}

export interface CoalitionEvaluation extends Coalition {
  readonly reachesMajority: boolean;
  readonly ineligiblePartyIds: readonly string[];
  readonly forbiddenPairs: readonly ForbiddenPair[];
  readonly feasible: boolean;
  readonly minimal: boolean;
}

export interface CoalitionOptions {
  readonly nodeBudget?: number;
  /** Observer only: called with the visited count every PROGRESS_INTERVAL nodes. */
  readonly onProgress?: (nodesVisited: number) => void;
}

/** A seat-minimal majority that the coalition rules rule out, with the reasons. */
export interface BlockedMajority extends Coalition {
  readonly ineligiblePartyIds: readonly string[];
  readonly forbiddenPairs: readonly ForbiddenPair[];
}

export interface BlockedMajorityResult {
  readonly blocked: readonly BlockedMajority[];
  /** False when the node budget ran out, so the list may miss majorities. */
  readonly complete: boolean;
  readonly nodesVisited: number;
}

/**
 * How many permitted minimal winning coalitions include the party. Every
 * member of such a coalition is pivotal in it.
 */
export interface PivotalParty {
  readonly partyId: string;
  /** A lower bound when the search was incomplete. */
  readonly coalitions: number;
  /** Whether every permitted coalition needs it; null when the search cannot tell. */
  readonly indispensable: boolean | null;
}

export function majorityRequired(scenario: Scenario): number {
  const { seatCount, majorityMode, majorityOverride } = scenario.rules;
  if (majorityMode === 'override' && majorityOverride !== null) {
    return majorityOverride;
  }
  return (seatCount - (seatCount % 2)) / 2 + 1;
}

function pairKey(first: number, second: number): string {
  return first < second ? `${first}|${second}` : `${second}|${first}`;
}

interface IndexedPair {
  readonly first: number;
  readonly second: number;
  readonly source: 'party' | 'block';
  /** Indices of the parties that refused the other one, ascending. */
  readonly refusers: number[];
}

function indexedForbiddenPairs(scenario: Scenario): IndexedPair[] {
  const indexById = new Map(
    scenario.parties.map((party, index) => [party.id, index]),
  );
  const rules = scenario.coalitionRules;
  const overrides = new Set<string>();
  for (const [a, b] of rules.compatiblePartyOverrides) {
    overrides.add(pairKey(indexById.get(a) ?? -1, indexById.get(b) ?? -1));
  }

  const found = new Map<string, IndexedPair>();
  const add = (
    x: number,
    y: number,
    source: 'party' | 'block',
  ): IndexedPair | undefined => {
    const key = pairKey(x, y);
    const existing = found.get(key);
    if (existing !== undefined) {
      return existing;
    }
    if (source === 'block' && overrides.has(key)) {
      return undefined;
    }
    const pair: IndexedPair = {
      first: x < y ? x : y,
      second: x < y ? y : x,
      source,
      refusers: [],
    };
    found.set(key, pair);
    return pair;
  };

  for (const [a, b] of rules.incompatiblePartyPairs) {
    const x = indexById.get(a);
    const y = indexById.get(b);
    if (x !== undefined && y !== undefined) {
      add(x, y, 'party');
    }
  }
  // A refusal is a party rule: no override lifts it.
  for (const [a, b] of rules.partyRefusals) {
    const x = indexById.get(a);
    const y = indexById.get(b);
    if (x === undefined || y === undefined || x === y) {
      continue;
    }
    const pair = add(x, y, 'party');
    if (pair !== undefined && !pair.refusers.includes(x)) {
      pair.refusers.push(x);
      pair.refusers.sort((p, q) => p - q);
    }
  }
  for (const [blockA, blockB] of rules.incompatibleBlockPairs) {
    scenario.parties.forEach((left, x) => {
      scenario.parties.forEach((right, y) => {
        if (left.blockId === blockA && right.blockId === blockB) {
          add(x, y, 'block');
        }
      });
    });
  }

  return [...found.values()].sort((p, q) =>
    p.first !== q.first ? p.first - q.first : p.second - q.second,
  );
}

function toForbiddenPair(scenario: Scenario, pair: IndexedPair): ForbiddenPair {
  return {
    partyIds: [
      scenario.parties[pair.first]?.id ?? '',
      scenario.parties[pair.second]?.id ?? '',
    ],
    source: pair.source,
    refusedBy: pair.refusers.map((index) => scenario.parties[index]?.id ?? ''),
  };
}

export function effectiveForbiddenPairs(scenario: Scenario): ForbiddenPair[] {
  return indexedForbiddenPairs(scenario).map((pair) =>
    toForbiddenPair(scenario, pair),
  );
}

function seatsByIndex(
  scenario: Scenario,
  allocation: AllocationResult,
): number[] {
  const seatsById = new Map(
    allocation.parties.map((party) => [party.partyId, party.seats]),
  );
  return scenario.parties.map((party) => seatsById.get(party.id) ?? 0);
}

function conflictSets(
  partyCount: number,
  pairs: readonly IndexedPair[],
): Set<number>[] {
  const conflicts = Array.from({ length: partyCount }, () => new Set<number>());
  for (const pair of pairs) {
    conflicts[pair.first]?.add(pair.second);
    conflicts[pair.second]?.add(pair.first);
  }
  return conflicts;
}

function toCoalition(
  scenario: Scenario,
  members: readonly number[],
  seats: number,
  majority: number,
): Coalition {
  return {
    partyIds: [...members]
      .sort((a, b) => a - b)
      .map((index) => scenario.parties[index]?.id ?? ''),
    seats,
    margin: seats - majority,
    opposition: scenario.rules.seatCount - seats,
  };
}

interface FoundSet {
  /** Party positions, ascending. */
  readonly members: readonly number[];
  readonly seats: number;
}

/** Seats descending, then party positions compared one by one. */
function bySeatsThenPosition(left: FoundSet, right: FoundSet): number {
  if (left.seats !== right.seats) {
    return right.seats - left.seats;
  }
  const shorter =
    left.members.length < right.members.length
      ? left.members.length
      : right.members.length;
  for (let k = 0; k < shorter; k += 1) {
    const step = (left.members[k] ?? 0) - (right.members[k] ?? 0);
    if (step !== 0) {
      return step;
    }
  }
  return left.members.length - right.members.length;
}

/** Positions of seated parties, most seats first, ties in persisted order. */
function seatOrder(seats: readonly number[], keep: (index: number) => boolean) {
  return seats
    .map((_, index) => index)
    .filter((index) => (seats[index] ?? 0) > 0 && keep(index))
    .sort((a, b) => {
      const bySeats = (seats[b] ?? 0) - (seats[a] ?? 0);
      return bySeats !== 0 ? bySeats : a - b;
    });
}

/**
 * Pivotal-party counts over the full minimal winning list, most coalitions
 * first, ties in the order of the eligible list.
 */
export function pivotalParties(analysis: CoalitionAnalysis): PivotalParty[] {
  if (analysis.status === 'no-allocation') {
    return [];
  }
  const found = analysis.minimalWinning;
  const rows = analysis.eligiblePartyIds.map((partyId, position) => {
    const coalitions = found.filter((coalition) =>
      coalition.partyIds.includes(partyId),
    ).length;
    let indispensable: boolean | null;
    if (found.length > 0 && coalitions < found.length) {
      indispensable = false;
    } else if (!analysis.complete) {
      indispensable = null;
    } else {
      indispensable = found.length > 0;
    }
    return { row: { partyId, coalitions, indispensable }, position };
  });
  return rows
    .sort((a, b) =>
      a.row.coalitions !== b.row.coalitions
        ? b.row.coalitions - a.row.coalitions
        : a.position - b.position,
    )
    .map(({ row }) => row);
}

/**
 * Selected larger coalitions: each given minimal winning coalition plus one
 * more government-eligible seated party compatible with all its members.
 */
export function largerCoalitions(
  scenario: Scenario,
  allocation: AllocationResult,
  minimalWinning: readonly Coalition[],
): Coalition[] {
  if (allocation.noAllocation !== null) {
    return [];
  }
  const majority = majorityRequired(scenario);
  const seats = seatsByIndex(scenario, allocation);
  const conflicts = conflictSets(
    scenario.parties.length,
    indexedForbiddenPairs(scenario),
  );
  const indexById = new Map(
    scenario.parties.map((party, index) => [party.id, index]),
  );
  const candidates = seatOrder(
    seats,
    (index) => scenario.parties[index]?.canJoinGovernment ?? false,
  );

  const found = new Map<string, FoundSet>();
  for (const coalition of minimalWinning) {
    const members = coalition.partyIds.map((id) => indexById.get(id) ?? -1);
    if (members.some((index) => index < 0)) {
      continue;
    }
    const base = members.reduce((sum, index) => sum + (seats[index] ?? 0), 0);
    for (const candidate of candidates) {
      if (
        members.includes(candidate) ||
        members.some((member) => conflicts[member]?.has(candidate) ?? false)
      ) {
        continue;
      }
      const next = [...members, candidate].sort((a, b) => a - b);
      const key = next.join('|');
      if (!found.has(key)) {
        found.set(key, {
          members: next,
          seats: base + (seats[candidate] ?? 0),
        });
      }
    }
  }

  return [...found.values()]
    .sort(bySeatsThenPosition)
    .map((entry) =>
      toCoalition(scenario, entry.members, entry.seats, majority),
    );
}

/**
 * Every seat-minimal majority of seated parties that holds a party unable to
 * join a government or a forbidden pair, with those reasons.
 */
export function blockedMajorities(
  scenario: Scenario,
  allocation: AllocationResult,
  options: { readonly nodeBudget?: number } = {},
): BlockedMajorityResult {
  if (allocation.noAllocation !== null) {
    return { blocked: [], complete: true, nodesVisited: 0 };
  }
  const majority = majorityRequired(scenario);
  const pairs = indexedForbiddenPairs(scenario);
  const pairByKey = new Map(
    pairs.map((pair) => [pairKey(pair.first, pair.second), pair]),
  );
  const conflicts = conflictSets(scenario.parties.length, pairs);
  const seats = seatsByIndex(scenario, allocation);
  const isIneligible = (index: number): boolean =>
    !(scenario.parties[index]?.canJoinGovernment ?? false);
  // Descending seats so the last member added is always the smallest one.
  const order = seatOrder(seats, () => true);
  const orderSeats = order.map((index) => seats[index] ?? 0);
  const suffix: number[] = new Array<number>(order.length + 1).fill(0);
  for (let k = order.length - 1; k >= 0; k -= 1) {
    suffix[k] = (suffix[k + 1] ?? 0) + (orderSeats[k] ?? 0);
  }

  const budget = options.nodeBudget ?? BLOCKED_NODE_BUDGET;
  const chosen: number[] = [];
  // Reasons collected along the current path, so a record costs no pair scan.
  const pathPairs: IndexedPair[] = [];
  const pathIneligible: number[] = [];
  const found: (FoundSet & {
    readonly pairs: readonly IndexedPair[];
    readonly ineligible: readonly number[];
  })[] = [];
  let nodes = 0;
  let truncated = false;

  const visit = (k: number, total: number): void => {
    if (truncated) {
      return;
    }
    if (nodes >= budget) {
      truncated = true;
      return;
    }
    nodes += 1;
    if (total >= majority) {
      if (pathPairs.length > 0 || pathIneligible.length > 0) {
        found.push({
          members: [...chosen].sort((a, b) => a - b),
          seats: total,
          pairs: [...pathPairs].sort((p, q) =>
            p.first !== q.first ? p.first - q.first : p.second - q.second,
          ),
          ineligible: [...pathIneligible].sort((a, b) => a - b),
        });
      }
      return;
    }
    if (k >= order.length || total + (suffix[k] ?? 0) < majority) {
      return;
    }
    const candidate = order[k] ?? -1;
    let added = 0;
    for (const member of chosen) {
      const pair = conflicts[member]?.has(candidate)
        ? pairByKey.get(pairKey(member, candidate))
        : undefined;
      if (pair !== undefined) {
        pathPairs.push(pair);
        added += 1;
      }
    }
    const out = isIneligible(candidate);
    if (out) {
      pathIneligible.push(candidate);
    }
    chosen.push(candidate);
    visit(k + 1, total + (orderSeats[k] ?? 0));
    chosen.pop();
    if (out) {
      pathIneligible.pop();
    }
    for (let removed = 0; removed < added; removed += 1) {
      pathPairs.pop();
    }
    visit(k + 1, total);
  };
  visit(0, 0);

  return {
    blocked: found.sort(bySeatsThenPosition).map((entry) => ({
      ...toCoalition(scenario, entry.members, entry.seats, majority),
      ineligiblePartyIds: entry.ineligible.map(
        (index) => scenario.parties[index]?.id ?? '',
      ),
      forbiddenPairs: entry.pairs.map((pair) =>
        toForbiddenPair(scenario, pair),
      ),
    })),
    complete: !truncated,
    nodesVisited: nodes,
  };
}

export function analyzeCoalitions(
  scenario: Scenario,
  allocation: AllocationResult,
  options: CoalitionOptions = {},
): CoalitionAnalysis {
  const majority = majorityRequired(scenario);
  const pairs = indexedForbiddenPairs(scenario);
  const base = {
    seatCount: scenario.rules.seatCount,
    majorityRequired: majority,
    majorityOverridden: scenario.rules.majorityMode === 'override',
    forbiddenPairs: pairs.map((pair) => toForbiddenPair(scenario, pair)),
  };

  if (allocation.noAllocation !== null) {
    return {
      ...base,
      status: 'no-allocation',
      noAllocation: allocation.noAllocation,
      complete: true,
      eligiblePartyIds: [],
      minimalWinning: [],
      balancingPartyIds: [],
      nodesVisited: 0,
    };
  }

  const seats = seatsByIndex(scenario, allocation);
  const conflicts = conflictSets(scenario.parties.length, pairs);
  const eligible = scenario.parties
    .map((party, index) => ({ party, index }))
    .filter(
      ({ party, index }) => party.canJoinGovernment && (seats[index] ?? 0) > 0,
    )
    .map(({ index }) => index);
  // Descending seats so the last member added is always the smallest one.
  const order = [...eligible].sort((a, b) => {
    const bySeats = (seats[b] ?? 0) - (seats[a] ?? 0);
    return bySeats !== 0 ? bySeats : a - b;
  });
  const orderSeats = order.map((index) => seats[index] ?? 0);
  const suffix: number[] = new Array<number>(order.length + 1).fill(0);
  for (let k = order.length - 1; k >= 0; k -= 1) {
    suffix[k] = (suffix[k + 1] ?? 0) + (orderSeats[k] ?? 0);
  }

  const budget = options.nodeBudget ?? DEFAULT_NODE_BUDGET;
  const chosen: number[] = [];
  const found: { members: number[]; seats: number }[] = [];
  let nodes = 0;
  let truncated = false;

  const compatible = (candidate: number): boolean =>
    chosen.every((member) => !(conflicts[member]?.has(candidate) ?? false));

  const visit = (k: number, total: number): void => {
    if (truncated) {
      return;
    }
    if (nodes >= budget) {
      truncated = true;
      return;
    }
    nodes += 1;
    if (nodes % PROGRESS_INTERVAL === 0) {
      options.onProgress?.(nodes);
    }
    if (total >= majority) {
      // Members were added largest first, so dropping the last one loses the
      // majority and so would dropping any other: the coalition is minimal.
      found.push({ members: [...chosen], seats: total });
      return;
    }
    if (k >= order.length || total + (suffix[k] ?? 0) < majority) {
      return;
    }
    let reachable = total;
    for (let j = k; j < order.length; j += 1) {
      if (compatible(order[j] ?? -1)) {
        reachable += orderSeats[j] ?? 0;
      }
    }
    if (reachable < majority) {
      return;
    }
    const candidate = order[k] ?? -1;
    if (compatible(candidate)) {
      chosen.push(candidate);
      visit(k + 1, total + (orderSeats[k] ?? 0));
      chosen.pop();
    }
    visit(k + 1, total);
  };
  visit(0, 0);

  const complete = !truncated && eligible.length <= MAX_COMPLETE_ELIGIBLE;
  const minimalWinning = [...found]
    .sort((a, b) => b.seats - a.seats)
    .map((entry) =>
      toCoalition(scenario, entry.members, entry.seats, majority),
    );

  const partners = Array.from(
    { length: scenario.parties.length },
    () => new Set<number>(),
  );
  for (const entry of found) {
    for (const member of entry.members) {
      for (const other of entry.members) {
        partners[member]?.add(other);
      }
    }
  }
  const balancingPartyIds = scenario.parties
    .filter((_, index) =>
      pairs.some(
        (pair) =>
          (partners[index]?.has(pair.first) ?? false) &&
          (partners[index]?.has(pair.second) ?? false),
      ),
    )
    .map((party) => party.id);

  let status: CoalitionStatus = 'unknown';
  if (found.length > 0) {
    status = 'feasible';
  } else if (complete) {
    status = 'deadlock';
  }

  return {
    ...base,
    status,
    noAllocation: null,
    complete,
    eligiblePartyIds: eligible.map(
      (index) => scenario.parties[index]?.id ?? '',
    ),
    minimalWinning,
    balancingPartyIds,
    nodesVisited: nodes,
  };
}

export function evaluateCoalition(
  scenario: Scenario,
  allocation: AllocationResult,
  partyIds: readonly string[],
): CoalitionEvaluation {
  const indexById = new Map(
    scenario.parties.map((party, index) => [party.id, index]),
  );
  const members = new Set<number>();
  for (const id of partyIds) {
    const index = indexById.get(id);
    if (index === undefined) {
      throw new Error(`Unknown party "${id}"`);
    }
    members.add(index);
  }

  const majority = majorityRequired(scenario);
  const seats = seatsByIndex(scenario, allocation);
  const sorted = [...members].sort((a, b) => a - b);
  const total = sorted.reduce((sum, index) => sum + (seats[index] ?? 0), 0);
  const coalition = toCoalition(scenario, sorted, total, majority);
  const ineligiblePartyIds = sorted
    .filter((index) => !(scenario.parties[index]?.canJoinGovernment ?? false))
    .map((index) => scenario.parties[index]?.id ?? '');
  const forbiddenPairs = indexedForbiddenPairs(scenario)
    .filter((pair) => members.has(pair.first) && members.has(pair.second))
    .map((pair) => toForbiddenPair(scenario, pair));
  const reachesMajority = total >= majority;
  const feasible =
    sorted.length > 0 &&
    reachesMajority &&
    ineligiblePartyIds.length === 0 &&
    forbiddenPairs.length === 0;

  return {
    ...coalition,
    reachesMajority,
    ineligiblePartyIds,
    forbiddenPairs,
    feasible,
    minimal:
      feasible &&
      sorted.every((index) => total - (seats[index] ?? 0) < majority),
  };
}
