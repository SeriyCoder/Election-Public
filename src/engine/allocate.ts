import {
  compare,
  div,
  equals,
  floor,
  fromInteger,
  mul,
  sub,
  sum,
  type Rational,
} from './rational';
import type { Scenario } from './schema';
import type { NoAllocationReason, ThresholdResult } from './threshold';

export interface PartySeats {
  readonly partyId: string;
  readonly quota: Rational | null;
  readonly floorSeats: number;
  readonly remainder: Rational | null;
  readonly remainderSeat: boolean;
  readonly seats: number;
}

export interface BlockSeats {
  readonly blockId: string | null;
  readonly partyIds: readonly string[];
  readonly votes: Rational;
  readonly seats: number;
}

export interface AllocationResult {
  readonly seatCount: number;
  readonly noAllocation: NoAllocationReason | null;
  readonly parties: readonly PartySeats[];
  readonly blocks: readonly BlockSeats[];
  readonly cutoffTie: boolean;
}

const ZERO = fromInteger(0n);

interface Candidate {
  readonly index: number;
  readonly partyId: string;
  readonly tieBreakOrder: number;
  readonly remainder: Rational;
}

// Seat counts are bounded by the schema (at most 10000), so the conversion is exact.
function toSeatCount(value: bigint): number {
  return Number.parseInt(value.toString(), 10);
}

function ranksBefore(a: Candidate, b: Candidate): number {
  const byRemainder = compare(b.remainder, a.remainder);
  if (byRemainder !== 0) {
    return byRemainder;
  }
  if (a.tieBreakOrder !== b.tieBreakOrder) {
    return a.tieBreakOrder < b.tieBreakOrder ? -1 : 1;
  }
  if (a.partyId === b.partyId) {
    return 0;
  }
  return a.partyId < b.partyId ? -1 : 1;
}

function aggregateBlocks(
  scenario: Scenario,
  threshold: ThresholdResult,
  parties: readonly PartySeats[],
): BlockSeats[] {
  const votesById = new Map<string, Rational>();
  for (const party of threshold.parties) {
    votesById.set(party.partyId, party.votes);
  }
  const seatsById = new Map<string, number>();
  for (const party of parties) {
    seatsById.set(party.partyId, party.seats);
  }

  const bucket = (blockId: string | null): BlockSeats => {
    const members = scenario.parties.filter(
      (party) => party.blockId === blockId,
    );
    return {
      blockId,
      partyIds: members.map((party) => party.id),
      votes: sum(members.map((party) => votesById.get(party.id) ?? ZERO)),
      seats: members.reduce(
        (total, party) => total + (seatsById.get(party.id) ?? 0),
        0,
      ),
    };
  };

  const blocks = scenario.blocks.map((block) => bucket(block.id));
  if (scenario.parties.some((party) => party.blockId === null)) {
    blocks.push(bucket(null));
  }
  return blocks;
}

export function allocateSeats(
  scenario: Scenario,
  threshold: ThresholdResult,
): AllocationResult {
  const seatCount = scenario.rules.seatCount;
  const statusById = new Map(
    threshold.parties.map((party) => [party.partyId, party]),
  );

  if (threshold.noAllocation !== null) {
    const parties: PartySeats[] = scenario.parties.map((party) => ({
      partyId: party.id,
      quota: null,
      floorSeats: 0,
      remainder: null,
      remainderSeat: false,
      seats: 0,
    }));
    return {
      seatCount,
      noAllocation: threshold.noAllocation,
      parties,
      blocks: aggregateBlocks(scenario, threshold, parties),
      cutoffTie: false,
    };
  }

  const seatTotal = fromInteger(BigInt(seatCount));
  const candidates: Candidate[] = [];
  const draft = scenario.parties.map((party, index) => {
    const status = statusById.get(party.id);
    if (status === undefined || status.status !== 'qualified') {
      return {
        partyId: party.id,
        quota: null,
        floorSeats: 0n,
        remainder: null,
      };
    }
    const quota = div(mul(seatTotal, status.votes), threshold.qualifyingVotes);
    const floorSeats = floor(quota);
    const remainder = sub(quota, fromInteger(floorSeats));
    candidates.push({
      index,
      partyId: party.id,
      tieBreakOrder: party.tieBreakOrder,
      remainder,
    });
    return { partyId: party.id, quota, floorSeats, remainder };
  });

  const floorTotal = draft.reduce(
    (total, entry) => total + entry.floorSeats,
    0n,
  );
  const remaining = toSeatCount(BigInt(seatCount) - floorTotal);
  const ranked = [...candidates].sort(ranksBefore);
  const awarded = new Set(
    ranked.slice(0, remaining).map((candidate) => candidate.index),
  );

  const lastAwarded = remaining > 0 ? ranked[remaining - 1] : undefined;
  const firstUnawarded = ranked[remaining];
  const cutoffTie =
    lastAwarded !== undefined &&
    firstUnawarded !== undefined &&
    equals(lastAwarded.remainder, firstUnawarded.remainder);

  const parties: PartySeats[] = draft.map((entry, index) => {
    const floorSeats = toSeatCount(entry.floorSeats);
    const remainderSeat = awarded.has(index);
    return {
      partyId: entry.partyId,
      quota: entry.quota,
      floorSeats,
      remainder: entry.remainder,
      remainderSeat,
      seats: floorSeats + (remainderSeat ? 1 : 0),
    };
  });

  return {
    seatCount,
    noAllocation: null,
    parties,
    blocks: aggregateBlocks(scenario, threshold, parties),
    cutoffTie,
  };
}
