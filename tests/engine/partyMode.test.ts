import { describe, expect, it } from 'vitest';
import { runScenario, runSeats, serializeResult } from '../../src/engine/run';
import { toFractionString, type Rational } from '../../src/engine/rational';
import type { Scenario } from '../../src/engine/schema';
import { partyModeInput } from './helpers/scenarios';
import { createPrng, randomParts } from './helpers/prng';

function asScenario(input: ReturnType<typeof partyModeInput>): Scenario {
  return input as unknown as Scenario;
}

function fraction(value: Rational | null): string | null {
  return value === null ? null : toFractionString(value);
}

describe('party-first vote calculation', () => {
  it('allocates all seats to one party without electorate groups', () => {
    const result = runSeats(asScenario(partyModeInput([['1', '1']])));

    expect(fraction(result.votes.allValidVotes)).toBe('999');
    expect(result.allocation.parties.map((party) => party.seats)).toEqual([
      120,
    ]);
  });

  it('uses exact shares of all valid votes without requiring electorate groups', () => {
    const result = runSeats(
      asScenario(
        partyModeInput([
          ['13', '400'],
          ['387', '400'],
        ]),
      ),
    );

    expect(result.votes.groups).toEqual([]);
    expect(fraction(result.votes.allValidVotes)).toBe('999');
    expect(result.votes.parties.map((party) => fraction(party.votes))).toEqual([
      '12987/400',
      '386613/400',
    ]);
    expect(
      result.votes.parties.map((party) => fraction(party.voteShare)),
    ).toEqual(['13/400', '387/400']);
    expect(result.allocation.parties.map((party) => party.seats)).toEqual([
      4, 116,
    ]);
  });

  it('finds coalition results without any demographic inputs', () => {
    const result = runScenario(
      asScenario(
        partyModeInput([
          ['13', '400'],
          ['387', '400'],
        ]),
      ),
    );

    expect(result.coalitions.status).toBe('feasible');
    expect(
      result.coalitions.minimalWinning.map((coalition) => coalition.partyIds),
    ).toEqual([['P2']]);
  });

  it('reports a deadlock when the only majority is forbidden', () => {
    const input = partyModeInput(
      [
        ['1', '2'],
        ['1', '2'],
      ],
      { threshold: '0' },
    );
    (
      input.coalitionRules as { incompatiblePartyPairs: string[][] }
    ).incompatiblePartyPairs = [['P1', 'P2']];

    const result = runScenario(asScenario(input));

    expect(result.coalitions.status).toBe('deadlock');
  });

  it('refuses a partial demographic projection when a positive party is unknown', () => {
    const result = runSeats(
      asScenario(
        partyModeInput([
          ['13', '400'],
          ['387', '400'],
        ]),
      ),
      1,
    );

    expect(result).toMatchObject({
      kind: 'unavailable',
      reason: 'unknown-party-composition',
    });
  });

  it.each([
    ['12', 'below-threshold', 0],
    ['13', 'qualified', 4],
    ['14', 'qualified', 4],
  ] as const)(
    'classifies a %s/400 share exactly at the threshold boundary',
    (numerator, status, seats) => {
      const result = runSeats(
        asScenario(
          partyModeInput(
            [
              [numerator, '400'],
              [String(400 - Number(numerator)), '400'],
            ],
            { threshold: '0.0325' },
          ),
        ),
      );

      expect(result.threshold.parties[0]?.status).toBe(status);
      expect(result.allocation.parties.map((party) => party.seats)).toEqual([
        seats,
        120 - seats,
      ]);
    },
  );

  it('keeps shares and seats when positive overall turnout changes', () => {
    const half = runSeats(
      asScenario(
        partyModeInput(
          [
            ['13', '400'],
            ['387', '400'],
          ],
          {
            turnout: '0.5',
          },
        ),
      ),
    );
    const high = runSeats(
      asScenario(
        partyModeInput(
          [
            ['13', '400'],
            ['387', '400'],
          ],
          {
            turnout: '0.8',
          },
        ),
      ),
    );

    expect(fraction(half.votes.allValidVotes)).toBe('999/2');
    expect(fraction(high.votes.allValidVotes)).toBe('3996/5');
    expect(
      half.votes.parties.map((party) => fraction(party.voteShare)),
    ).toEqual(high.votes.parties.map((party) => fraction(party.voteShare)));
    expect(half.allocation.parties.map((party) => party.seats)).toEqual([
      4, 116,
    ]);
    expect(high.allocation.parties.map((party) => party.seats)).toEqual([
      4, 116,
    ]);
  });

  it('reports no allocation when turnout or validity is zero', () => {
    for (const options of [{ turnout: '0' }, { validBallotRate: '0' }]) {
      const result = runSeats(
        asScenario(
          partyModeInput(
            [
              ['13', '400'],
              ['387', '400'],
            ],
            options,
          ),
        ),
      );
      expect(fraction(result.votes.allValidVotes)).toBe('0');
      expect(result.threshold.noAllocation).toBe('no-valid-votes');
      expect(result.allocation.parties.map((party) => party.seats)).toEqual([
        0, 0,
      ]);
    }
  });

  it('reports no allocation when every party is below the threshold', () => {
    const result = runSeats(
      asScenario(
        partyModeInput(
          [
            ['1', '2'],
            ['1', '2'],
          ],
          { threshold: '0.75' },
        ),
      ),
    );

    expect(result.threshold.noAllocation).toBe('no-party-qualifies');
    expect(result.allocation.parties.map((party) => party.seats)).toEqual([
      0, 0,
    ]);
  });

  it('preserves exact seat sums for seeded party-share distributions', () => {
    const next = createPrng(0x4d372d31);
    for (let sample = 0; sample < 30; sample += 1) {
      const weights = randomParts(next, 20, 100_000);
      const shares = weights.map(
        (weight) => [String(weight), '100000'] as const,
      );
      const result = runSeats(
        asScenario(
          partyModeInput(shares, {
            threshold: '0',
            seatCount: 101,
          }),
        ),
      );

      expect(
        result.allocation.parties.reduce(
          (total, party) => total + party.seats,
          0,
        ),
      ).toBe(101);
      expect(result.allocation.parties.every((party) => party.seats >= 0)).toBe(
        true,
      );
    }
  });

  it('resolves exact remainder ties by persisted tie-break order', () => {
    const input = partyModeInput(
      [
        ['1', '4'],
        ['1', '4'],
        ['1', '4'],
        ['1', '4'],
      ],
      { seatCount: 3, threshold: '0' },
    );
    const parties = input.parties as Record<string, unknown>[];
    parties.forEach((party, index) => {
      party.tieBreakOrder = [4, 3, 1, 2][index];
    });

    const result = runSeats(asScenario(input));

    expect(
      Object.fromEntries(
        result.allocation.parties.map((party) => [party.partyId, party.seats]),
      ),
    ).toEqual({ P1: 0, P2: 1, P3: 1, P4: 1 });
    expect(result.allocation.cutoffTie).toBe(true);
  });

  it('uses party ID as the final exact-tie fallback', () => {
    const input = partyModeInput(
      [
        ['1', '4'],
        ['1', '4'],
        ['1', '4'],
        ['1', '4'],
      ],
      { seatCount: 3, threshold: '0' },
    );
    const parties = input.parties as Record<string, unknown>[];
    ['P2', 'P10', 'A', 'B'].forEach((id, index) => {
      const party = parties[index];
      if (party !== undefined) {
        party.id = id;
        party.tieBreakOrder = 1;
      }
    });

    const result = runSeats(asScenario(input));

    expect(
      Object.fromEntries(
        result.allocation.parties.map((party) => [party.partyId, party.seats]),
      ),
    ).toEqual({ P2: 0, P10: 1, A: 1, B: 1 });
  });

  it('allocates every seat across forty separate electoral lists', () => {
    const shares = Array.from({ length: 40 }, () => ['1', '40'] as const);
    const result = runSeats(
      asScenario(partyModeInput(shares, { threshold: '0' })),
    );

    expect(result.votes.parties).toHaveLength(40);
    expect(
      result.allocation.parties.reduce(
        (total, party) => total + party.seats,
        0,
      ),
    ).toBe(120);
  });

  it('serializes repeated exact results identically', () => {
    const scenario = asScenario(
      partyModeInput([
        ['13', '400'],
        ['387', '400'],
      ]),
    );

    const outputs = Array.from({ length: 3 }, () =>
      serializeResult(runSeats(scenario)),
    );
    expect(outputs[0]).toBe(outputs[1]);
    expect(outputs[1]).toBe(outputs[2]);
  });
});
