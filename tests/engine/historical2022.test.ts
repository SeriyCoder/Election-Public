import { describe, expect, it } from 'vitest';
import {
  HISTORICAL_2022,
  historical2022Input,
} from '../../src/engine/historical2022';
import {
  compareHistorical2022,
  type HistoricalComparisonRow,
  type HistoricalMatchChoice,
} from '../../src/engine/historicalReference';
import { rational, toFractionString } from '../../src/engine/rational';
import { runScenario, runSeats, serializeResult } from '../../src/engine/run';
import {
  parseScenarioJson,
  SCHEMA_VERSION,
  serializeScenario,
  validateScenario,
  type PartyScenario,
} from '../../src/engine/schema';
import { LOCALES, translator } from '../../src/i18n';
import { withDisplayNames } from '../../src/ui/names';
import {
  HAMILTON_2022_FIXTURE,
  HISTORICAL_2022_FIXTURE,
} from './helpers/historical2022';
import { createPrng, randomInt } from './helpers/prng';
import { partyModeInput, type Json } from './helpers/scenarios';

function scenario(input: unknown): PartyScenario {
  const checked = validateScenario(input);
  if (!checked.ok) {
    throw new Error(
      `Invalid party scenario: ${checked.issues.map((issue) => `${issue.path}:${issue.code}`).join(', ')}`,
    );
  }
  if (checked.scenario.inputMode !== 'parties') {
    throw new Error('Expected party input mode');
  }
  return checked.scenario;
}

function currentFixture(): PartyScenario {
  const input = partyModeInput(
    [
      ['1', '2'],
      ['1', '2'],
    ],
    { threshold: '0' },
  );
  const parties = input.parties as Json[];
  parties[0]!.id = 'likud';
  parties[0]!.name = '';
  parties[1]!.id = 'P2';
  parties[1]!.name = 'Yesh Atid';
  return scenario(input);
}

function comparison(
  current: PartyScenario,
  choices: readonly HistoricalMatchChoice[] = [],
): readonly HistoricalComparisonRow[] {
  const result = compareHistorical2022(current, runSeats(current), choices);
  if (!result.ok) {
    throw new Error(`Unexpected comparison refusal: ${result.reason}`);
  }
  return result.rows;
}

function row(
  rows: readonly HistoricalComparisonRow[],
  currentId: string,
): HistoricalComparisonRow {
  const found = rows.find((entry) => entry.currentId === currentId);
  if (found === undefined) {
    throw new Error(`Missing comparison row ${currentId}`);
  }
  return found;
}

function equalSharesForTwo(): Json {
  const input = historical2022Input();
  const parties = input.parties as Json[];
  for (const [index, party] of parties.entries()) {
    party.voteShare =
      index < 2
        ? { numerator: '1', denominator: '2' }
        : { numerator: '0', denominator: '1' };
  }
  (input.rules as Json).seatCount = 101;
  (input.rules as Json).threshold = '0';
  return input;
}

describe('historical 2022 source and exact preset', () => {
  it('retains the independent 40-list table and official seats without merging', () => {
    expect(HISTORICAL_2022.lists).toEqual(
      HISTORICAL_2022_FIXTURE.map(([id, votes, officialSeats]) => ({
        id,
        votes,
        officialSeats,
      })),
    );
    const votes = HISTORICAL_2022.lists.map((entry) => entry.votes);
    expect(new Set(HISTORICAL_2022.lists.map((entry) => entry.id)).size).toBe(
      40,
    );
    expect(votes.slice(0, 13).reduce((a, b) => a + b, 0)).toBe(4693527);
    expect(votes.slice(13).reduce((a, b) => a + b, 0)).toBe(71215);
    expect(votes.reduce((a, b) => a + b, 0)).toBe(4764742);
    expect(
      HISTORICAL_2022.lists.reduce(
        (total, entry) => total + entry.officialSeats,
        0,
      ),
    ).toBe(120);
  });

  it('distinguishes official ballot totals from the uniform model assumption', () => {
    expect(HISTORICAL_2022).toMatchObject({
      year: 2022,
      eligibleVoters: 6788804,
      ballotsCast: 4794593,
      validVotes: 4764742,
      invalidBallots: 29851,
    });
    const input = scenario(historical2022Input());
    const seats = runSeats(input);
    expect(input.schemaVersion).toBe(SCHEMA_VERSION);
    expect(input.rules.populationTotal).toBe('6788804');
    expect(input.rules.validBallotRate).toBe('0.999');
    expect(input.rules.threshold).toBe('0.0325');
    expect(input.rules.seatCount).toBe(120);
    expect(input.rules.allocationMethod).toBe('hamilton');
    expect(
      toFractionString(
        rational(
          BigInt(input.rules.overallTurnout.numerator),
          BigInt(input.rules.overallTurnout.denominator),
        ),
      ),
    ).toBe(toFractionString(rational(4794593n, 6788804n)));
    expect(toFractionString(seats.votes.totals.cast)).toBe('4794593');
    expect(toFractionString(seats.votes.totals.valid)).toBe('4789798407/1000');
    expect(input.groups).toEqual([]);
    expect(input.parties.every((party) => party.composition === null)).toBe(
      true,
    );
    expect(input.blocks).toEqual([]);
    expect(input.coalitionRules.incompatiblePartyPairs).toEqual([]);
    expect(input.coalitionRules.incompatibleBlockPairs).toEqual([]);
    expect(input.coalitionRules.compatiblePartyOverrides).toEqual([]);
    expect(input.coalitionRules.partyRefusals).toEqual([]);
  });

  it('derives every party share from its integer count and all valid votes', () => {
    const input = scenario(historical2022Input());
    expect(input.parties.map((party) => party.id)).toEqual(
      HISTORICAL_2022_FIXTURE.map(([id]) => id),
    );
    for (const [index, [, votes]] of HISTORICAL_2022_FIXTURE.entries()) {
      const share = input.parties[index]!.voteShare;
      expect(
        toFractionString(
          rational(BigInt(share.numerator), BigInt(share.denominator)),
        ),
      ).toBe(toFractionString(rational(BigInt(votes), 4764742n)));
    }
  });

  it('allocates Hamilton seats independently from official Bader-Ofer seats', () => {
    const input = scenario(historical2022Input());
    const result = runSeats(input);
    const qualifies = result.threshold.parties.filter(
      (party) => party.status === 'qualified',
    );
    expect(qualifies.map((party) => party.partyId)).toEqual(
      HISTORICAL_2022_FIXTURE.slice(0, 10).map(([id]) => id),
    );
    expect(
      result.allocation.parties.slice(0, 10).map((party) => party.seats),
    ).toEqual([...HAMILTON_2022_FIXTURE]);
    expect(
      result.allocation.parties.slice(10).every((party) => party.seats === 0),
    ).toBe(true);
    expect(
      HISTORICAL_2022_FIXTURE.slice(0, 10).map((entry) => entry[2]),
    ).toEqual([32, 24, 14, 12, 11, 7, 6, 5, 5, 4]);
    expect(
      result.allocation.parties.reduce((sum, party) => sum + party.seats, 0),
    ).toBe(120);
  });

  it('produces fresh scenarios without changing the historical reference', () => {
    const before = JSON.stringify(HISTORICAL_2022);
    expect(Object.isFrozen(HISTORICAL_2022)).toBe(true);
    expect(Object.isFrozen(HISTORICAL_2022.lists)).toBe(true);
    expect(HISTORICAL_2022.lists.every(Object.isFrozen)).toBe(true);
    const first = historical2022Input();
    const second = historical2022Input();
    expect(first).not.toBe(second);
    const firstParties = first.parties as Json[];
    firstParties[0]!.name = 'Changed locally';
    expect((second.parties as Json[])[0]!.name).toBe('');
    expect(JSON.stringify(HISTORICAL_2022)).toBe(before);
  });

  it('keeps exact odd-seat sums across seeded seat sizes and the 40-list case', () => {
    const next = createPrng(20221031);
    for (let index = 0; index < 30; index += 1) {
      const input = historical2022Input();
      const seatCount = randomInt(next, 0, 150) * 2 + 1;
      (input.rules as Json).seatCount = seatCount;
      const seats = runSeats(scenario(input));
      expect(seats.allocation.noAllocation).toBeNull();
      expect(
        seats.allocation.parties.reduce((sum, party) => sum + party.seats, 0),
      ).toBe(seatCount);
      expect(
        seats.allocation.parties.every(
          (party) => Number.isInteger(party.seats) && party.seats >= 0,
        ),
      ).toBe(true);
    }
  });

  it('is deterministic across repeats, JSON round trips and all UI locales', () => {
    const input = scenario(historical2022Input());
    const encoded = serializeScenario(input);
    const decoded = parseScenarioJson(encoded);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error('Historical scenario did not round-trip');
    expect(serializeScenario(decoded.scenario)).toBe(encoded);
    const expected = serializeResult(runSeats(input));
    const coalitions = JSON.stringify(runScenario(input).coalitions);
    expect(serializeResult(runSeats(input))).toBe(expected);
    expect(serializeResult(runSeats(decoded.scenario))).toBe(expected);
    for (const locale of LOCALES) {
      const displayed = withDisplayNames(input, translator(locale));
      expect(serializeResult(runSeats(displayed))).toBe(expected);
      expect(JSON.stringify(runScenario(displayed).coalitions)).toBe(
        coalitions,
      );
    }
  });

  it.each([
    ['below', 3249n, 100000n, 'below-threshold'],
    ['at', 13n, 400n, 'qualified'],
    ['above', 3251n, 100000n, 'qualified'],
  ] as const)(
    'uses exact %s-threshold shares in the 40-list preset',
    (_label, numerator, denominator, status) => {
      const input = historical2022Input();
      const parties = input.parties as Json[];
      for (const party of parties) {
        party.voteShare = { numerator: '0', denominator: '1' };
      }
      parties[0]!.voteShare = {
        numerator: (denominator - numerator).toString(),
        denominator: denominator.toString(),
      };
      parties[10]!.voteShare = {
        numerator: numerator.toString(),
        denominator: denominator.toString(),
      };
      const result = runSeats(scenario(input));
      expect(result.threshold.parties[10]!.status).toBe(status);
    },
  );

  it('resolves exact equal remainders by tie order and then party ID', () => {
    const ordered = equalSharesForTwo();
    const parties = ordered.parties as Json[];
    parties[0]!.tieBreakOrder = 2;
    parties[1]!.tieBreakOrder = 1;
    expect(
      runSeats(scenario(ordered))
        .allocation.parties.slice(0, 2)
        .map((p) => p.seats),
    ).toEqual([50, 51]);
    parties[0]!.tieBreakOrder = 1;
    expect(
      runSeats(scenario(ordered))
        .allocation.parties.slice(0, 2)
        .map((p) => p.seats),
    ).toEqual([51, 50]);
  });

  it('keeps seats available without groups and refuses allocation at zero turnout', () => {
    const input = historical2022Input();
    expect(runSeats(scenario(input)).allocation.noAllocation).toBeNull();
    (input.rules as Json).overallTurnout = { numerator: '0', denominator: '1' };
    const zero = runSeats(scenario(input));
    expect(zero.allocation.noAllocation).toBe('no-valid-votes');
    expect(zero.allocation.parties.every((party) => party.seats === 0)).toBe(
      true,
    );
  });

  it('runs the 40-list preset with 20 groups and 10 blocks within the interaction budget', () => {
    const input = historical2022Input();
    input.groups = Array.from({ length: 20 }, (_, index) => ({
      id: `G${index + 1}`,
      name: '',
      notes: '',
      growthRate: '0',
      turnout: { numerator: '1', denominator: '2' },
      turnoutChange: '0',
    }));
    input.blocks = Array.from({ length: 10 }, (_, index) => ({
      id: `B${index + 1}`,
      name: '',
      notes: '',
      color: '#334455',
    }));
    const checked = scenario(input);
    const times: number[] = [];
    for (let index = 0; index < 7; index += 1) {
      const start = performance.now();
      const result = runSeats(checked);
      times.push(performance.now() - start);
      expect(
        result.allocation.parties.reduce((sum, party) => sum + party.seats, 0),
      ).toBe(120);
    }
    times.sort((a, b) => a - b);
    expect(times[3]).toBeLessThan(200);
  });
});

describe('historical identity and exact comparison', () => {
  it('automatically matches only an unchanged catalog identity, not a similar name', () => {
    const rows = comparison(currentFixture());
    expect(row(rows, 'likud')).toMatchObject({
      historicalId: 'likud',
      match: 'automatic',
      historicalVotes: 1115336,
      officialSeats: 32,
      hamiltonSeats: 31,
    });
    expect(row(rows, 'P2')).toMatchObject({
      historicalId: null,
      match: 'unmatched',
      historicalVotes: null,
      historicalVoteShare: null,
      shareChange: null,
      officialSeats: null,
      hamiltonSeats: null,
      officialSeatChange: null,
      hamiltonSeatChange: null,
    });
  });

  it('does not auto-match a customized name or a split list with a similar name', () => {
    const input = partyModeInput(
      [
        ['1', '3'],
        ['1', '3'],
        ['1', '3'],
      ],
      { threshold: '0' },
    );
    const parties = input.parties as Json[];
    parties[0]!.id = 'likud';
    parties[0]!.name = 'Renamed Likud';
    parties[1]!.id = 'otzma-separate';
    parties[1]!.name = 'Religious Zionism — Otzma Yehudit';
    parties[2]!.id = 'yesh-atid';
    parties[2]!.name = '';
    const rows = comparison(scenario(input));
    expect(row(rows, 'likud').historicalId).toBeNull();
    expect(row(rows, 'otzma-separate').historicalId).toBeNull();
    expect(row(rows, 'yesh-atid').historicalId).toBe('yesh-atid');
  });

  it('allows explicit mapping and explicit suppression of an automatic match', () => {
    const rows = comparison(currentFixture(), [
      { currentId: 'likud', historicalId: null },
      { currentId: 'P2', historicalId: 'likud' },
    ]);
    expect(row(rows, 'likud')).toMatchObject({
      historicalId: null,
      match: 'unmatched',
      historicalVotes: null,
    });
    expect(row(rows, 'P2')).toMatchObject({
      historicalId: 'likud',
      match: 'explicit',
      historicalVotes: 1115336,
    });
  });

  it('refuses duplicate and unknown mappings instead of silently reassigning', () => {
    const current = currentFixture();
    const seats = runSeats(current);
    expect(
      compareHistorical2022(current, seats, [
        { currentId: 'P2', historicalId: 'likud' },
      ]),
    ).toEqual({ ok: false, reason: 'duplicate-reference' });
    expect(
      compareHistorical2022(current, seats, [
        { currentId: 'P2', historicalId: 'yesh-atid' },
        { currentId: 'P2', historicalId: 'shas' },
      ]),
    ).toEqual({ ok: false, reason: 'duplicate-current' });
    expect(
      compareHistorical2022(current, seats, [
        { currentId: 'missing', historicalId: 'shas' },
      ]),
    ).toEqual({ ok: false, reason: 'unknown-current' });
    expect(
      compareHistorical2022(current, seats, [
        { currentId: 'P2', historicalId: 'not-a-2022-list' },
      ]),
    ).toEqual({ ok: false, reason: 'unknown-reference' });
  });

  it('compares exact shares and keeps both seat methods separate', () => {
    const input = scenario(historical2022Input());
    const likud = row(comparison(input), 'likud');
    expect(likud.historicalVoteShare).not.toBeNull();
    expect(likud.currentVoteShare).not.toBeNull();
    expect(toFractionString(likud.historicalVoteShare!)).toBe(
      toFractionString(rational(1115336n, 4764742n)),
    );
    expect(toFractionString(likud.currentVoteShare!)).toBe(
      toFractionString(rational(1115336n, 4764742n)),
    );
    expect(toFractionString(likud.shareChange!)).toBe('0');
    expect(likud).toMatchObject({
      officialSeats: 32,
      hamiltonSeats: 31,
      currentSeats: 31,
      officialSeatChange: -1,
      hamiltonSeatChange: 0,
    });
  });

  it('shows unavailable current votes and seats instead of zero at no allocation', () => {
    const input = historical2022Input();
    (input.rules as Json).overallTurnout = { numerator: '0', denominator: '1' };
    const likud = row(comparison(scenario(input)), 'likud');
    expect(likud).toMatchObject({
      historicalVotes: 1115336,
      officialSeats: 32,
      hamiltonSeats: 31,
      currentVoteShare: null,
      shareChange: null,
      currentSeats: null,
      officialSeatChange: null,
      hamiltonSeatChange: null,
    });
  });
});
