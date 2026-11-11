import { HISTORICAL_2022, historical2022Input } from './historical2022';
import { roundToPlaces } from './numeric';
import { mul, rational, sub, type Rational } from './rational';
import { buildReport, PERCENT_PLACES } from './report';
import { runSeats, type SeatResult } from './run';
import { validateScenario, type Scenario } from './schema';

export interface HistoricalMatchChoice {
  readonly currentId: string;
  /** Null explicitly suppresses an otherwise automatic match. */
  readonly historicalId: string | null;
}

export interface HistoricalComparisonRow {
  readonly currentId: string;
  readonly historicalId: string | null;
  readonly match: 'automatic' | 'explicit' | 'unmatched';
  readonly historicalVotes: number | null;
  readonly historicalVoteShare: Rational | null;
  readonly currentVoteShare: Rational | null;
  readonly shareChange: Rational | null;
  readonly officialSeats: number | null;
  readonly hamiltonSeats: number | null;
  readonly currentSeats: number | null;
  readonly officialSeatChange: number | null;
  readonly hamiltonSeatChange: number | null;
}

export type HistoricalComparisonResult =
  | { readonly ok: true; readonly rows: readonly HistoricalComparisonRow[] }
  | {
      readonly ok: false;
      readonly reason:
        | 'duplicate-current'
        | 'duplicate-reference'
        | 'unknown-current'
        | 'unknown-reference';
    };

export interface HistoricalReferenceRow {
  readonly id: string;
  readonly votes: number;
  readonly voteShare: string;
  readonly officialSeats: number;
  readonly hamiltonSeats: number;
}

export interface HistoricalReferenceReport {
  readonly turnout: string;
  readonly rows: readonly HistoricalReferenceRow[];
}

function reference(): { scenario: Scenario; seats: SeatResult } {
  const checked = validateScenario(historical2022Input());
  if (!checked.ok) {
    throw new Error('The built-in 2022 reference scenario is invalid');
  }
  const seats = runSeats(checked.scenario);
  if (seats.allocation.noAllocation !== null) {
    throw new Error('The built-in 2022 reference has no allocation');
  }
  return { scenario: checked.scenario, seats };
}

/** Rounded only for presentation; electoral decisions use exact values. */
export function historicalPercent(value: Rational | null): string | null {
  return value === null
    ? null
    : roundToPlaces(mul(value, rational(100n)), PERCENT_PLACES);
}

/** Historical totals and independently modeled Hamilton seats for display. */
export function historical2022Report(): HistoricalReferenceReport {
  const { scenario, seats } = reference();
  const report = buildReport(scenario, seats);
  const rows = new Map(report.parties.map((entry) => [entry.partyId, entry]));
  return {
    turnout: report.totals.turnout,
    rows: HISTORICAL_2022.lists.map((entry) => {
      const modeled = rows.get(entry.id);
      if (modeled === undefined || modeled.voteShare === null) {
        throw new Error(`Missing modeled result for ${entry.id}`);
      }
      return {
        id: entry.id,
        votes: entry.votes,
        voteShare: modeled.voteShare,
        officialSeats: entry.officialSeats,
        hamiltonSeats: modeled.seats,
      };
    }),
  };
}

export function compareHistorical2022(
  scenario: Scenario,
  seats: SeatResult,
  choices: readonly HistoricalMatchChoice[],
): HistoricalComparisonResult {
  const currentIds = new Set(scenario.parties.map((party) => party.id));
  const historical = new Map(
    HISTORICAL_2022.lists.map((entry) => [entry.id, entry]),
  );
  const explicit = new Map<string, string | null>();
  for (const choice of choices) {
    if (!currentIds.has(choice.currentId)) {
      return { ok: false, reason: 'unknown-current' };
    }
    if (explicit.has(choice.currentId)) {
      return { ok: false, reason: 'duplicate-current' };
    }
    if (choice.historicalId !== null && !historical.has(choice.historicalId)) {
      return { ok: false, reason: 'unknown-reference' };
    }
    explicit.set(choice.currentId, choice.historicalId);
  }

  const matches = scenario.parties.map((party) => {
    const selected = explicit.has(party.id);
    const historicalId = selected
      ? (explicit.get(party.id) ?? null)
      : party.name.trim() === '' && historical.has(party.id)
        ? party.id
        : null;
    return {
      currentId: party.id,
      historicalId,
      match:
        historicalId === null
          ? ('unmatched' as const)
          : selected
            ? ('explicit' as const)
            : ('automatic' as const),
    };
  });
  const assigned = new Set<string>();
  for (const match of matches) {
    if (match.historicalId !== null) {
      if (assigned.has(match.historicalId)) {
        return { ok: false, reason: 'duplicate-reference' };
      }
      assigned.add(match.historicalId);
    }
  }

  const model = reference();
  const modelSeats = new Map(
    model.seats.allocation.parties.map((party) => [party.partyId, party.seats]),
  );
  const currentVotes = new Map(
    seats.votes.parties.map((party) => [party.partyId, party]),
  );
  const currentSeats = new Map(
    seats.allocation.parties.map((party) => [party.partyId, party.seats]),
  );
  const rows = matches.map((match): HistoricalComparisonRow => {
    const votes = currentVotes.get(match.currentId);
    const seatCount = currentSeats.get(match.currentId);
    if (votes === undefined || seatCount === undefined) {
      throw new Error(`Missing current result for ${match.currentId}`);
    }
    const actualSeats =
      seats.allocation.noAllocation === null ? seatCount : null;
    const entry =
      match.historicalId === null
        ? undefined
        : historical.get(match.historicalId);
    const modeledSeats =
      match.historicalId === null
        ? undefined
        : modelSeats.get(match.historicalId);
    if (
      match.historicalId !== null &&
      (entry === undefined || modeledSeats === undefined)
    ) {
      throw new Error(`Missing historical result for ${match.historicalId}`);
    }
    const historicalShare =
      entry === undefined
        ? null
        : rational(BigInt(entry.votes), BigInt(HISTORICAL_2022.validVotes));
    return {
      ...match,
      historicalVotes: entry?.votes ?? null,
      historicalVoteShare: historicalShare,
      currentVoteShare: votes.voteShare,
      shareChange:
        historicalShare === null || votes.voteShare === null
          ? null
          : sub(votes.voteShare, historicalShare),
      officialSeats: entry?.officialSeats ?? null,
      hamiltonSeats: modeledSeats ?? null,
      currentSeats: actualSeats,
      officialSeatChange:
        actualSeats === null || entry === undefined
          ? null
          : actualSeats - entry.officialSeats,
      hamiltonSeatChange:
        actualSeats === null || modeledSeats === undefined
          ? null
          : actualSeats - modeledSeats,
    };
  });
  return { ok: true, rows };
}
