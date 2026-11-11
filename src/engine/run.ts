import { allocateSeats, type AllocationResult } from './allocate';
import {
  analyzeCoalitions,
  type CoalitionAnalysis,
  type CoalitionOptions,
} from './coalitions';
import { toFractionString, type Rational } from './rational';
import type { GroupScenario, PartyScenario, Scenario } from './schema';
import { applyThreshold, type ThresholdResult } from './threshold';
import {
  computeVotes,
  type ProjectionUnavailable,
  type VoteResult,
} from './votes';

/** Votes, threshold and seats: everything except the coalition search. */
export interface SeatResult {
  readonly votes: VoteResult;
  readonly threshold: ThresholdResult;
  readonly allocation: AllocationResult;
}

export type SeatProjection = SeatResult | ProjectionUnavailable;

export interface ScenarioResult extends SeatResult {
  readonly coalitions: CoalitionAnalysis;
}

/** Seats for year `year` (Section 14.2); year 0 is the present-day scenario. */
export function runSeats(scenario: Scenario): SeatResult;
export function runSeats(scenario: Scenario, year: 0): SeatResult;
export function runSeats(scenario: GroupScenario, year: number): SeatResult;
export function runSeats(
  scenario: PartyScenario,
  year: number,
): SeatResult | ProjectionUnavailable;
export function runSeats(
  scenario: Scenario,
  year: number,
): SeatResult | ProjectionUnavailable;
export function runSeats(
  scenario: Scenario,
  year = 0,
): SeatResult | ProjectionUnavailable {
  const votes = computeVotes(scenario, year);
  if (!('groups' in votes)) {
    return votes;
  }
  const threshold = applyThreshold(scenario, votes);
  const allocation = allocateSeats(scenario, threshold);
  return { votes, threshold, allocation };
}

export function runScenario(
  scenario: Scenario,
  options: CoalitionOptions = {},
): ScenarioResult {
  const seats = runSeats(scenario);
  const coalitions = analyzeCoalitions(scenario, seats.allocation, options);
  return { ...seats, coalitions };
}

function isRational(value: unknown): value is Rational {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<Record<'num' | 'den', unknown>>;
  return typeof candidate.num === 'bigint' && typeof candidate.den === 'bigint';
}

/** Key order follows engine construction; exact rationals print as fractions. */
export function serializeResult(result: SeatResult): string {
  return JSON.stringify(result, (_key, value: unknown) =>
    isRational(value) ? toFractionString(value) : value,
  );
}
