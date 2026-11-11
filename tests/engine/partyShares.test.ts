import { describe, expect, it } from 'vitest';
import { editPartyShare } from '../../src/engine/partyShares';
import {
  compare,
  rational,
  sum,
  toFractionString,
  type Rational,
} from '../../src/engine/rational';
import { runScenario, runSeats, serializeResult } from '../../src/engine/run';
import {
  parseScenarioJson,
  serializeScenario,
  validateScenario,
  type ExactFraction,
  type PartyScenario,
} from '../../src/engine/schema';
import { createPrng, randomInt, randomParts } from './helpers/prng';
import {
  partyModeBudgetExpansionInput,
  partyModeInput,
  section8Input,
  type Json,
} from './helpers/scenarios';

function validParty(input: unknown): PartyScenario {
  const result = validateScenario(input);
  if (!result.ok) {
    throw new Error(
      `Invalid fixture: ${result.issues.map((issue) => issue.path).join(', ')}`,
    );
  }
  if (result.scenario.inputMode !== 'parties') {
    throw new Error('Expected party mode');
  }
  return result.scenario;
}

function edited(
  input: unknown,
  partyId: string,
  percent: string,
  locks: readonly string[] = [],
): PartyScenario {
  const result = editPartyShare(input, partyId, percent, locks);
  if (!result.ok) {
    throw new Error(`Unexpected refusal: ${result.reason}`);
  }
  return result.scenario;
}

function asRational(value: ExactFraction): Rational {
  return rational(BigInt(value.numerator), BigInt(value.denominator));
}

function shares(scenario: PartyScenario): string[] {
  return scenario.parties.map((party) =>
    toFractionString(asRational(party.voteShare)),
  );
}

function expectExactTotal(scenario: PartyScenario): void {
  const values = scenario.parties.map((party) => asRational(party.voteShare));
  expect(compare(sum(values), rational(1n))).toBe(0);
  for (const value of values) {
    expect(compare(value, rational(0n))).toBeGreaterThanOrEqual(0);
    expect(compare(value, rational(1n))).toBeLessThanOrEqual(0);
  }
}

describe('exact party-share edits', () => {
  it('preserves the entered value and scales the other shares exactly', () => {
    const input = validParty(
      partyModeInput([
        ['1', '5'],
        ['3', '10'],
        ['1', '2'],
      ]),
    );
    const before = JSON.stringify(input);
    const result = edited(input, 'P1', '40');

    expect(shares(result)).toEqual(['2/5', '9/40', '3/8']);
    expectExactTotal(result);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('keeps non-terminating proportional shares without rounding', () => {
    const result = edited(
      partyModeInput([
        ['1', '2'],
        ['1', '6'],
        ['1', '3'],
      ]),
      'P1',
      '33',
    );

    expect(shares(result)).toEqual(['33/100', '67/300', '67/150']);
    expectExactTotal(result);
  });

  it('keeps other locks while allowing a direct edit of the selected lock', () => {
    const result = edited(
      partyModeInput([
        ['1', '5'],
        ['3', '10'],
        ['1', '2'],
      ]),
      'P1',
      '40',
      ['P1', 'P2'],
    );

    expect(shares(result)).toEqual(['2/5', '3/10', '3/10']);
    expectExactTotal(result);
  });

  it('splits the remainder equally when all available shares were zero', () => {
    const result = edited(
      partyModeInput([
        ['1', '1'],
        ['0', '1'],
        ['0', '1'],
      ]),
      'P1',
      '40',
    );

    expect(shares(result)).toEqual(['2/5', '3/10', '3/10']);
    expectExactTotal(result);
  });

  it('does not give votes to an unlocked zero when another recipient has votes', () => {
    const result = edited(
      partyModeInput([
        ['3', '5'],
        ['2', '5'],
        ['0', '1'],
      ]),
      'P1',
      '20',
    );

    expect(shares(result)).toEqual(['1/5', '4/5', '0']);
  });

  it('does not give votes to a locked zero recipient', () => {
    const result = edited(
      partyModeInput([
        ['1', '1'],
        ['0', '1'],
        ['0', '1'],
      ]),
      'P1',
      '20',
      ['P3'],
    );

    expect(shares(result)).toEqual(['1/5', '4/5', '0']);
  });

  it('accepts a single party only at 100 percent', () => {
    const input = validParty(partyModeInput([['1', '1']]));
    const before = JSON.stringify(input);
    expect(edited(input, 'P1', '100')).toEqual(input);
    expect(editPartyShare(input, 'P1', '99', [])).toMatchObject({
      ok: false,
      reason: 'no-unlocked-recipient',
    });
    expect(JSON.stringify(input)).toBe(before);
  });

  it('allows an unchanged value when all other parties are locked', () => {
    const input = validParty(
      partyModeInput([
        ['1', '4'],
        ['3', '4'],
      ]),
    );
    const before = JSON.stringify(input);
    expect(edited(input, 'P1', '25', ['P2'])).toEqual(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('refuses a change when all other parties are locked', () => {
    const input = validParty(
      partyModeInput([
        ['1', '4'],
        ['3', '4'],
      ]),
    );
    const before = JSON.stringify(input);
    expect(editPartyShare(input, 'P1', '20', ['P2'])).toMatchObject({
      ok: false,
      reason: 'no-unlocked-recipient',
    });
    expect(JSON.stringify(input)).toBe(before);
  });

  it('refuses a request that leaves less than the other locked shares', () => {
    const input = validParty(
      partyModeInput([
        ['1', '5'],
        ['3', '5'],
        ['1', '5'],
      ]),
    );
    const before = JSON.stringify(input);
    expect(editPartyShare(input, 'P1', '50', ['P2'])).toMatchObject({
      ok: false,
      reason: 'locked-total-exceeded',
    });
    expect(JSON.stringify(input)).toBe(before);
  });

  it.each(['', '-1', '101', '1e2', 'abc', '1.00000000000000000'])(
    'refuses invalid percentage text %j',
    (percent) => {
      const input = validParty(
        partyModeInput([
          ['1', '2'],
          ['1', '2'],
        ]),
      );
      const before = JSON.stringify(input);
      expect(editPartyShare(input, 'P1', percent, [])).toMatchObject({
        ok: false,
        reason: 'invalid-percent',
      });
      expect(JSON.stringify(input)).toBe(before);
    },
  );

  it('preserves every entered decimal digit and accepts a comma', () => {
    const input = partyModeInput([
      ['1', '2'],
      ['1', '2'],
    ]);
    const decimal = edited(input, 'P1', '33.3333333333333333');
    const comma = edited(input, 'P1', '33,3333333333333333');

    expect(decimal.parties[0]!.voteShare).toEqual({
      numerator: '333333333333333333',
      denominator: '1000000000000000000',
    });
    expect(comma.parties[0]!.voteShare).toEqual(decimal.parties[0]!.voteShare);
    expectExactTotal(decimal);
  });

  it('refuses unknown selected and locked IDs without changing the input', () => {
    const input = validParty(
      partyModeInput([
        ['1', '2'],
        ['1', '2'],
      ]),
    );
    const before = JSON.stringify(input);
    expect(editPartyShare(input, 'P9', '30', [])).toMatchObject({
      ok: false,
      reason: 'unknown-party',
    });
    expect(editPartyShare(input, 'P1', '30', ['P9'])).toMatchObject({
      ok: false,
      reason: 'unknown-lock',
    });
    expect(JSON.stringify(input)).toBe(before);
  });

  it('refuses an invalid scenario or a legacy group-mode scenario', () => {
    const invalid = partyModeInput([
      ['1', '2'],
      ['1', '2'],
    ]);
    (invalid.parties as Json[])[0]!.voteShare = {
      numerator: '3',
      denominator: '2',
    };
    const before = JSON.stringify(invalid);
    const result = editPartyShare(invalid, 'P1', '30', []);
    expect(result).toMatchObject({ ok: false, reason: 'invalid-scenario' });
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThan(0);
    }
    expect(JSON.stringify(invalid)).toBe(before);
    expect(editPartyShare(section8Input(), 'P1', '30', [])).toMatchObject({
      ok: false,
      reason: 'party-mode-required',
    });
  });

  it('keeps composition, group assumptions, party metadata and rules intact', () => {
    const input = partyModeInput([
      ['1', '2'],
      ['1', '2'],
    ]);
    input.groups = [
      {
        id: 'G1',
        name: 'Group',
        notes: 'Group note',
        growthRate: '0',
        turnout: '1',
        turnoutChange: '0',
      },
    ];
    for (const party of input.parties as Json[]) {
      party.composition = { G1: { numerator: '1', denominator: '1' } };
    }
    const original = validParty(input);
    const before = JSON.stringify(original);
    const result = edited(original, 'P1', '40');

    expect(result.groups).toEqual(original.groups);
    expect(result.rules).toEqual(original.rules);
    expect(result.coalitionRules).toEqual(original.coalitionRules);
    expect(result.parties.map((party) => party.composition)).toEqual(
      original.parties.map((party) => party.composition),
    );
    expect(
      result.parties.map((party, index) => ({
        ...party,
        voteShare: original.parties[index]!.voteShare,
      })),
    ).toEqual(original.parties);
    expect(JSON.stringify(original)).toBe(before);
  });

  it('redistributes to below-threshold and government-ineligible parties', () => {
    const input = partyModeInput(
      [
        ['1', '10'],
        ['1', '5'],
        ['7', '10'],
      ],
      { threshold: '0.25' },
    );
    (input.parties as Json[])[1]!.canJoinGovernment = false;
    const result = edited(input, 'P1', '20');
    const seats = runSeats(result);

    expect(shares(result)).toEqual(['1/5', '8/45', '28/45']);
    expect(seats.threshold.parties[1]?.status).toBe('below-threshold');
    expect(result.parties[1]?.canJoinGovernment).toBe(false);
    expect(seats.allocation.parties.map((party) => party.seats)).toEqual([
      0, 0, 120,
    ]);
    expectExactTotal(result);
  });

  it.each([
    ['3', 'below-threshold', 0],
    ['3.25', 'qualified', 4],
    ['3.5', 'qualified', 4],
  ] as const)(
    'keeps the %s percent edit exact across the threshold boundary',
    (percent, status, firstSeats) => {
      const result = edited(
        partyModeInput([
          ['1', '2'],
          ['1', '2'],
        ]),
        'P1',
        percent,
      );
      const seats = runSeats(result);
      expect(seats.threshold.parties[0]?.status).toBe(status);
      expect(seats.allocation.parties.map((party) => party.seats)).toEqual([
        firstSeats,
        120 - firstSeats,
      ]);
    },
  );

  it('retains persisted tie order and the party-ID fallback after an edit', () => {
    const input = partyModeInput(
      [
        ['2', '5'],
        ['3', '10'],
        ['3', '10'],
      ],
      { threshold: '0', seatCount: 2 },
    );
    const parties = input.parties as Json[];
    parties[1]!.tieBreakOrder = 8;
    parties[2]!.tieBreakOrder = 3;
    const ordered = edited(input, 'P1', '50');
    expect(
      runSeats(ordered).allocation.parties.map((party) => party.seats),
    ).toEqual([1, 0, 1]);

    parties[1]!.tieBreakOrder = 3;
    const tied = edited(input, 'P1', '50');
    expect(
      runSeats(tied).allocation.parties.map((party) => party.seats),
    ).toEqual([1, 1, 0]);
  });

  it('retains exact shares but allocates no seats at zero turnout', () => {
    const input = partyModeInput(
      [
        ['1', '2'],
        ['1', '2'],
      ],
      { turnout: '0' },
    );
    const result = edited(input, 'P1', '20');
    const seats = runSeats(result);

    expect(shares(result)).toEqual(['1/5', '4/5']);
    expect(seats.threshold.noAllocation).toBe('no-valid-votes');
    expect(seats.allocation.parties.map((party) => party.seats)).toEqual([
      0, 0,
    ]);
  });

  it('round-trips an edit and gives identical votes, seats and coalitions', () => {
    const input = partyModeInput(
      [
        ['1', '2'],
        ['1', '6'],
        ['1', '3'],
      ],
      { threshold: '0' },
    );
    const first = edited(input, 'P1', '33');
    const repeated = edited(input, 'P1', '33');
    expect(first).toEqual(repeated);
    const restored = parseScenarioJson(serializeScenario(first));
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      throw new Error('Round trip failed');
    }
    expect(serializeResult(runSeats(restored.scenario))).toBe(
      serializeResult(runSeats(first)),
    );
    expect(runScenario(restored.scenario).coalitions).toEqual(
      runScenario(first).coalitions,
    );
  });

  it('keeps exact totals and odd seat sums for seeded share edits', () => {
    const next = createPrng(0x70102);
    for (let iteration = 0; iteration < 40; iteration += 1) {
      const count = randomInt(next, 2, 20);
      const parts = randomParts(next, count, 10_000);
      const input = partyModeInput(
        parts.map((part) => [String(part), '10000'] as const),
        { threshold: '0', seatCount: 101 },
      );
      const selected = randomInt(next, 1, count);
      const units = randomInt(next, 0, 10_000);
      const percent = `${Math.floor(units / 100)}.${String(units % 100).padStart(2, '0')}`;
      const result = edited(input, `P${selected}`, percent);

      expectExactTotal(result);
      expect(
        compare(
          asRational(result.parties[selected - 1]!.voteShare),
          rational(BigInt(units), 10_000n),
        ),
      ).toBe(0);
      const seats = runSeats(result).allocation.parties.map(
        (party) => party.seats,
      );
      expect(seats.every((seat) => Number.isInteger(seat) && seat >= 0)).toBe(
        true,
      );
      expect(seats.reduce((total, seat) => total + seat, 0)).toBe(101);
    }
  });

  it('accepts an unchanged edit at exactly 2048 canonical denominator digits', () => {
    const input = partyModeBudgetExpansionInput(50);
    const zero = (partyModeInput([['0', '1']]).parties as Json[])[0]!;
    (input.parties as Json[]).push({ ...zero, id: 'P41', tieBreakOrder: 41 });
    (input.rules as Json).overallTurnout = {
      numerator: '1',
      denominator: String(10n ** 18n + 3n),
    };
    const result = edited(validParty(input), 'P41', '0');
    const denominators = new Set([
      result.rules.overallTurnout.denominator,
      ...result.parties.map((party) => party.voteShare.denominator),
    ]);

    expect(
      [...denominators].reduce((total, value) => total + value.length, 0),
    ).toBe(2048);
    expect(validateScenario(result).ok).toBe(true);
  });

  it('refuses a result over the aggregate denominator limit without mutation', () => {
    const input = validParty(partyModeBudgetExpansionInput(50));
    const before = JSON.stringify(input);
    const result = editPartyShare(input, 'P1', '1', []);

    expect(result).toMatchObject({ ok: false, reason: 'precision-limit' });
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === 'too-long')).toBe(
        true,
      );
    }
    expect(JSON.stringify(input)).toBe(before);
    expect(validateScenario(input).ok).toBe(true);
  });

  it('refuses a result exceeding the per-component digit limit without mutation', () => {
    const denominator = 10n ** 255n + 3n;
    const input = validParty(
      partyModeInput([
        ['1', String(denominator)],
        ['1', String(denominator)],
        [String(denominator - 2n), String(denominator)],
      ]),
    );
    const before = JSON.stringify(input);
    const result = editPartyShare(input, 'P1', '33.3333333333333333', []);

    expect(result).toMatchObject({ ok: false, reason: 'precision-limit' });
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === 'too-long')).toBe(
        true,
      );
    }
    expect(JSON.stringify(input)).toBe(before);
  });

  it('edits a realistic 40-list scenario within the 200 ms median budget', () => {
    let input = validParty(
      partyModeInput(
        Array.from({ length: 40 }, () => ['1', '40'] as const),
        { threshold: '0' },
      ),
    );
    const timings: number[] = [];
    for (const percent of [
      '3',
      '2.5',
      '3',
      '2.5',
      '3',
      '2.5',
      '3',
      '2.5',
      '3',
    ]) {
      const start = performance.now();
      input = edited(input, 'P1', percent);
      timings.push(performance.now() - start);
      expectExactTotal(input);
    }
    const sorted = [...timings].sort((a, b) => a - b);
    expect(sorted[Math.floor(sorted.length / 2)]).toBeLessThanOrEqual(200);
    expect(
      runSeats(input).allocation.parties.reduce(
        (total, party) => total + party.seats,
        0,
      ),
    ).toBe(120);
  });
});
