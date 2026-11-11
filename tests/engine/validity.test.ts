import { describe, expect, it } from 'vitest';
import {
  isStandardValidity,
  STANDARD_VALID_BALLOT_RATE,
} from '../../src/engine/edit';
import {
  mul,
  rational,
  toFractionString,
  type Rational,
} from '../../src/engine/rational';
import {
  runScenario,
  serializeResult,
  type ScenarioResult,
} from '../../src/engine/run';
import type { Scenario } from '../../src/engine/schema';
import { createPrng, millionths, randomInt, randomParts } from './helpers/prng';
import {
  buildScenario,
  groupInput,
  partyInput,
  rulesInput,
  scenarioInput,
  section8Input,
  type Json,
} from './helpers/scenarios';

const STANDARD = rational(999n, 1000n);

function withValidity(input: Json, rate: string): Json {
  return {
    ...input,
    groups: (input.groups as Json[]).map((group) => ({
      ...group,
      validBallotRate: rate,
    })),
  };
}

function pair(input: Json): [ScenarioResult, ScenarioResult] {
  return [
    runScenario(buildScenario(withValidity(input, '1'))),
    runScenario(buildScenario(withValidity(input, STANDARD_VALID_BALLOT_RATE))),
  ];
}

function fraction(value: Rational | null): string | null {
  return value === null ? null : toFractionString(value);
}

function scaled(value: Rational): string {
  return toFractionString(mul(value, STANDARD));
}

function seatsOf(result: ScenarioResult): Record<string, number> {
  return Object.fromEntries(
    result.allocation.parties.map((party) => [party.partyId, party.seats]),
  );
}

/** Everything a uniform validity must leave alone: shares, statuses, seats, coalitions. */
function decisions(result: ScenarioResult): string {
  return JSON.stringify({
    shares: result.votes.parties.map((party) => [
      party.partyId,
      fraction(party.voteShare),
    ]),
    threshold: fraction(result.threshold.threshold),
    qualification: result.threshold.parties.map((party) => [
      party.partyId,
      party.status,
      fraction(party.allocationShare),
    ]),
    noAllocation: result.threshold.noAllocation,
    allocation: result.allocation.parties.map((party) => [
      party.partyId,
      fraction(party.quota),
      party.floorSeats,
      fraction(party.remainder),
      party.remainderSeat,
      party.seats,
    ]),
    blockSeats: result.allocation.blocks.map((block) => [
      block.blockId,
      block.seats,
    ]),
    cutoffTie: result.allocation.cutoffTie,
    coalitions: result.coalitions,
  });
}

function randomInput(seed: number): Json {
  const next = createPrng(seed);
  const partyCount = randomInt(next, 1, 7);
  const groupCount = randomInt(next, 1, 5);
  const blockCount = randomInt(next, 0, 2);
  const partyIds = Array.from({ length: partyCount }, (_, i) => `P${i + 1}`);
  const blocks = Array.from({ length: blockCount }, (_, i) => ({
    id: `B${i + 1}`,
    name: `Block ${i + 1}`,
    color: '#224466',
  }));
  const parties = partyIds.map((id) =>
    partyInput(
      id,
      blockCount === 0 || next() < 0.3
        ? null
        : `B${randomInt(next, 1, blockCount)}`,
      randomInt(next, 1, 3),
      next() < 0.8,
    ),
  );
  const shares = randomParts(next, groupCount, 1_000_000);
  const groups = shares.map((share, index) => {
    const weights = randomParts(next, partyCount, 1_000_000);
    return groupInput(
      `G${index + 1}`,
      millionths(share),
      Object.fromEntries(
        partyIds.map((id, party) => [id, millionths(weights[party] ?? 0)]),
      ),
      {
        turnout: millionths(randomInt(next, 0, 1_000_000)),
        participationFactor: millionths(randomInt(next, 500_000, 1_000_000)),
      },
    );
  });
  const thresholds = ['0', '0.0325', '0.05', '0.1', '0.25'];
  return scenarioInput({
    rules: rulesInput({
      populationTotal: String(randomInt(next, 1, 9_000_000)),
      seatCount: randomInt(next, 1, 151),
      threshold: thresholds[randomInt(next, 0, thresholds.length - 1)],
    }),
    blocks,
    parties,
    groups,
    coalitionRules:
      partyCount > 1 && next() < 0.5
        ? { incompatiblePartyPairs: [['P1', 'P2']] }
        : {},
  });
}

describe('standard valid-ballot rate', () => {
  it('is 99.9 percent, written as an exact decimal string', () => {
    expect(STANDARD_VALID_BALLOT_RATE).toBe('0.999');
  });

  it.each(['0.999', '0.9990', '0.999000'])(
    'counts %s as the standard rate by exact value',
    (value) => {
      expect(isStandardValidity(value)).toBe(true);
    },
  );

  it.each([
    ['1', '1'],
    ['0.99', '0.99'],
    ['0.9991', '0.9991'],
    ['0.9989', '0.9989'],
    ['99.9', 'a percent instead of a fraction'],
    ['', 'an empty string'],
    ['abc', 'unreadable text'],
    ['0,999', 'a decimal comma'],
  ])('does not count %s (%s) as the standard rate', (value) => {
    expect(isStandardValidity(value)).toBe(false);
  });

  it.each([
    { value: 0.999, kind: 'a number' },
    { value: null, kind: 'null' },
    { value: undefined, kind: 'a missing value' },
    { value: ['0.999'], kind: 'an array' },
  ] as const)('does not count $kind as the standard rate', ({ value }) => {
    expect(isStandardValidity(value)).toBe(false);
  });
});

describe('uniform validity leaves every decision unchanged', () => {
  it('keeps the Section 8 baseline at 46 / 50 / 18 / 6 with 999 000 valid votes', () => {
    const [full, standard] = pair(section8Input());
    expect(seatsOf(full)).toEqual({ P1: 46, P2: 50, P3: 18, P4: 6 });
    expect(seatsOf(standard)).toEqual({ P1: 46, P2: 50, P3: 18, P4: 6 });
    expect(toFractionString(full.votes.allValidVotes)).toBe('1000000');
    expect(toFractionString(standard.votes.allValidVotes)).toBe('999000');
    expect(
      standard.votes.parties.map((party) => toFractionString(party.votes)),
    ).toEqual(['379620', '419580', '149850', '49950']);
    expect(decisions(standard)).toBe(decisions(full));
  });

  it('qualifies a list exactly at the threshold at both rates', () => {
    const input = scenarioInput({
      rules: rulesInput({ threshold: '0.0325' }),
      parties: [partyInput('P1', null, 1), partyInput('P2', null, 2)],
      groups: [groupInput('G1', '1', { P1: '0.0325', P2: '0.9675' })],
    });
    const [full, standard] = pair(input);
    for (const result of [full, standard]) {
      expect(result.threshold.parties.map((party) => party.status)).toEqual([
        'qualified',
        'qualified',
      ]);
    }
    expect(decisions(standard)).toBe(decisions(full));
  });

  it('leaves a list just below the threshold below it at both rates', () => {
    const input = scenarioInput({
      rules: rulesInput({ threshold: '0.0325' }),
      parties: [partyInput('P1', null, 1), partyInput('P2', null, 2)],
      groups: [groupInput('G1', '1', { P1: '0.032499', P2: '0.967501' })],
    });
    const [full, standard] = pair(input);
    for (const result of [full, standard]) {
      expect(result.threshold.parties[0]?.status).toBe('below-threshold');
      expect(seatsOf(result)).toEqual({ P1: 0, P2: 120 });
    }
  });

  it('resolves an exact remainder tie by tie-break order at both rates', () => {
    const ids = ['P1', 'P2', 'P3', 'P4'];
    const input = scenarioInput({
      rules: rulesInput({ seatCount: 2 }),
      parties: ids.map((id, index) => partyInput(id, null, 4 - index)),
      groups: ids.map((id, index) =>
        groupInput(`G${index + 1}`, '0.25', { [id]: '1' }),
      ),
    });
    const [full, standard] = pair(input);
    for (const result of [full, standard]) {
      expect(seatsOf(result)).toEqual({ P1: 0, P2: 0, P3: 1, P4: 1 });
    }
    expect(decisions(standard)).toBe(decisions(full));
  });

  it('gives equal shares, statuses, seats and coalitions over 200 seeded scenarios', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const input = randomInput(seed);
      const [full, standard] = pair(input);
      const scenario: Scenario = buildScenario(input);
      const label = `seed ${seed}`;
      expect(decisions(standard), label).toBe(decisions(full));
      if (standard.allocation.noAllocation === null) {
        expect(
          standard.allocation.parties.reduce(
            (total, party) => total + party.seats,
            0,
          ),
          label,
        ).toBe(scenario.rules.seatCount);
      }
      expect(toFractionString(standard.votes.allValidVotes), label).toBe(
        scaled(full.votes.allValidVotes),
      );
      expect(
        standard.votes.parties.map((party) => toFractionString(party.votes)),
        label,
      ).toEqual(full.votes.parties.map((party) => scaled(party.votes)));
    }
  });

  it('gives byte-identical results on a repeat run and after a JSON round trip', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const input = withValidity(randomInput(seed), STANDARD_VALID_BALLOT_RATE);
      const first = serializeResult(runScenario(buildScenario(input)));
      const again = serializeResult(runScenario(buildScenario(input)));
      const tripped = serializeResult(
        runScenario(buildScenario(JSON.parse(JSON.stringify(input)) as Json)),
      );
      expect(again, `seed ${seed}`).toBe(first);
      expect(tripped, `seed ${seed}`).toBe(first);
    }
  });
});
