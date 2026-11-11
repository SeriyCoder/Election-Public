/** Display rows for the results panel, rounded exactly from engine results. */
import { majorityRequired } from './coalitions';
import { roundToPlaces } from './numeric';
import {
  div,
  fromInteger,
  isPositive,
  isZero,
  mul,
  parseDecimal,
  type Rational,
} from './rational';
import type { NoAllocationReason, QualificationStatus } from './threshold';
import type { SeatResult } from './run';
import type { Scenario } from './schema';

/** Places used for display: people and votes, percentages, quota and remainder. */
export const COUNT_PLACES = 0;
export const PERCENT_PLACES = 2;
export const QUOTA_PLACES = 4;

export interface ReportTotals {
  readonly population: string;
  readonly unavailable: string;
  readonly abstaining: string;
  readonly cast: string;
  readonly invalid: string;
  readonly valid: string;
  /** Cast ballots as a percent of the population. */
  readonly turnout: string;
  /** The threshold as a percent. */
  readonly threshold: string;
}

export interface PartyRow {
  readonly partyId: string;
  readonly name: string;
  readonly color: string;
  readonly blockId: string | null;
  readonly votes: string;
  readonly voteShare: string | null;
  readonly status: QualificationStatus;
  readonly seats: number;
  readonly seatShare: string | null;
  readonly quota: string | null;
  readonly floorSeats: number;
  readonly remainder: string | null;
  readonly remainderSeat: boolean;
}

export interface BlockRow {
  readonly blockId: string | null;
  readonly name: string | null;
  readonly color: string | null;
  readonly partyIds: readonly string[];
  readonly votes: string;
  readonly voteShare: string | null;
  readonly seats: number;
  readonly seatShare: string | null;
}

export interface Segment {
  readonly partyId: string;
  readonly color: string;
  /** A positive decimal string, usable as a flex-grow factor. */
  readonly weight: string;
}

export interface ResultReport {
  readonly method: Scenario['rules']['allocationMethod'];
  readonly seatCount: number;
  readonly majority: number;
  readonly majorityOverridden: boolean;
  readonly noAllocation: NoAllocationReason | null;
  readonly cutoffTie: boolean;
  readonly totals: ReportTotals;
  readonly parties: readonly PartyRow[];
  readonly blocks: readonly BlockRow[];
  readonly voteSegments: readonly Segment[];
  readonly seatSegments: readonly Segment[];
  /** One party ID per seat, grouped by block then party order. */
  readonly seatSequence: readonly string[];
}

const HUNDRED = fromInteger(100n);

function count(value: Rational): string {
  return roundToPlaces(value, COUNT_PLACES);
}

function percent(fraction: Rational): string {
  return roundToPlaces(mul(fraction, HUNDRED), PERCENT_PLACES);
}

function quotaText(value: Rational | null): string | null {
  return value === null ? null : roundToPlaces(value, QUOTA_PLACES);
}

function lookup<T extends { readonly partyId: string }>(
  items: readonly T[],
  partyId: string,
): T {
  const item = items.find((entry) => entry.partyId === partyId);
  if (item === undefined) {
    throw new Error(`missing result for party ${partyId}`);
  }
  return item;
}

export function buildReport(
  scenario: Scenario,
  result: SeatResult,
): ResultReport {
  const { votes, threshold, allocation } = result;
  const noAllocation = allocation.noAllocation;
  const seatCount = fromInteger(allocation.seatCount);
  const valid = votes.allValidVotes;

  const seatShare = (seats: number): string | null =>
    noAllocation === null ? percent(div(fromInteger(seats), seatCount)) : null;
  const voteShare = (amount: Rational): string | null =>
    isZero(valid) ? null : percent(div(amount, valid));

  const parties = scenario.parties.map((party): PartyRow => {
    const partyVotes = lookup(votes.parties, party.id);
    const qualification = lookup(threshold.parties, party.id);
    const seats = lookup(allocation.parties, party.id);
    const allocated = noAllocation === null;
    return {
      partyId: party.id,
      name: party.name,
      color: party.color,
      blockId: party.blockId,
      votes: count(partyVotes.votes),
      voteShare:
        partyVotes.voteShare === null ? null : percent(partyVotes.voteShare),
      status: qualification.status,
      seats: allocated ? seats.seats : 0,
      seatShare: seatShare(allocated ? seats.seats : 0),
      quota: allocated ? quotaText(seats.quota) : null,
      floorSeats: allocated ? seats.floorSeats : 0,
      remainder: allocated ? quotaText(seats.remainder) : null,
      remainderSeat: allocated && seats.remainderSeat,
    };
  });
  const partyById = new Map(parties.map((row) => [row.partyId, row]));

  const blocks = allocation.blocks.map((block): BlockRow => {
    const info =
      block.blockId === null
        ? undefined
        : scenario.blocks.find((entry) => entry.id === block.blockId);
    const seats = noAllocation === null ? block.seats : 0;
    return {
      blockId: block.blockId,
      name: info?.name ?? null,
      color: info?.color ?? null,
      partyIds: block.partyIds,
      votes: count(block.votes),
      voteShare: voteShare(block.votes),
      seats,
      seatShare: seatShare(seats),
    };
  });

  const ordered = allocation.blocks.flatMap((block) =>
    block.partyIds.map((partyId) => {
      const row = partyById.get(partyId);
      if (row === undefined) {
        throw new Error(`missing party row ${partyId}`);
      }
      return row;
    }),
  );

  const voteSegments: Segment[] = [];
  const seatSegments: Segment[] = [];
  const seatSequence: string[] = [];
  for (const row of ordered) {
    const share = lookup(votes.parties, row.partyId).voteShare;
    if (share !== null && isPositive(share)) {
      voteSegments.push({
        partyId: row.partyId,
        color: row.color,
        weight: roundToPlaces(mul(share, HUNDRED), QUOTA_PLACES),
      });
    }
    if (row.seats > 0) {
      seatSegments.push({
        partyId: row.partyId,
        color: row.color,
        weight: `${row.seats}`,
      });
      for (let seat = 0; seat < row.seats; seat += 1) {
        seatSequence.push(row.partyId);
      }
    }
  }

  const totals = votes.totals;
  return {
    method: scenario.rules.allocationMethod,
    seatCount: allocation.seatCount,
    majority: majorityRequired(scenario),
    majorityOverridden: scenario.rules.majorityMode === 'override',
    noAllocation,
    cutoffTie: allocation.cutoffTie,
    totals: {
      population: count(totals.population),
      unavailable: count(totals.unavailable),
      abstaining: count(totals.abstaining),
      cast: count(totals.cast),
      invalid: count(totals.invalid),
      valid: count(totals.valid),
      turnout: percent(votes.turnout),
      threshold: percent(parseDecimal(scenario.rules.threshold)),
    },
    parties,
    blocks,
    voteSegments,
    seatSegments,
    seatSequence,
  };
}
