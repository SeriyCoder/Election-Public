import { describe, expect, it } from 'vitest';
import { effectiveForbiddenPairs } from '../../src/engine/coalitions';
import { prepareLegacyConversion } from '../../src/engine/legacyConversion';
import { rational, toFractionString } from '../../src/engine/rational';
import { runScenario, runSeats, serializeResult } from '../../src/engine/run';
import {
  parseScenarioJson,
  serializeScenario,
  validateScenario,
  type ExactFraction,
  type GroupScenario,
  type PartyScenario,
  type Scenario,
} from '../../src/engine/schema';
import { LOCALES, translator } from '../../src/i18n';
import { createPrng, randomInt } from './helpers/prng';
import {
  groupInput,
  partyInput,
  partyModeInput,
  rulesInput,
  scenarioInput,
  section8Input,
  type Json,
} from './helpers/scenarios';

function fixture(): Json {
  return scenarioInput({
    rules: rulesInput({
      populationTotal: '1000',
      seatCount: 101,
      majorityMode: 'override',
      majorityOverride: 70,
    }),
    blocks: [
      { id: 'B1', name: 'First legacy grouping', color: '#224466' },
      { id: 'B2', name: 'Second legacy grouping', color: '#668822' },
    ],
    parties: [
      partyInput('P1', 'B1', 1),
      partyInput('P2', 'B1', 2),
      partyInput('P3', 'B2', 3),
      partyInput('P4', 'B2', 4),
      partyInput('P5', null, 5),
    ],
    groups: [
      groupInput(
        'G1',
        '0.5',
        { P1: '0.5', P2: '0.5' },
        {
          turnout: '0.5',
          turnoutChange: '0.1',
          participationFactor: '0.8',
          validBallotRate: '0.95',
          votingMode: 'restricted',
          growthRate: '0.1',
        },
      ),
      groupInput(
        'G2',
        '0.3',
        { P3: '0.5', P4: '0.5' },
        {
          turnout: '1',
          participationFactor: '1',
          validBallotRate: '0.95',
          votingMode: 'restricted',
        },
      ),
      groupInput(
        'G3',
        '0.2',
        { P4: '1' },
        {
          turnout: '0',
          participationFactor: '1',
          validBallotRate: '0.95',
          votingMode: 'restricted',
        },
      ),
    ],
    coalitionRules: {
      incompatiblePartyPairs: [['P1', 'P4']],
      incompatibleBlockPairs: [['B1', 'B2']],
      compatiblePartyOverrides: [['P1', 'P3']],
      partyRefusals: [
        ['P2', 'P3'],
        ['P3', 'P2'],
      ],
    },
  });
}

function validated(input: unknown): Scenario {
  const result = validateScenario(input);
  if (!result.ok) {
    throw new Error(
      `Invalid fixture: ${result.issues.map((issue) => `${issue.path}:${issue.code}`).join(', ')}`,
    );
  }
  return result.scenario;
}

function oldScenario(input: unknown): GroupScenario {
  const result = validated(input);
  if (result.inputMode !== 'groups') throw new Error('Expected group mode');
  return result;
}

function converted(input: unknown): PartyScenario {
  const result = prepareLegacyConversion(input);
  if (!result.ok) throw new Error(`Unexpected refusal: ${result.reason}`);
  return result.scenario;
}

function exact(value: ExactFraction): string {
  return toFractionString(
    rational(BigInt(value.numerator), BigInt(value.denominator)),
  );
}

function pairs(scenario: Scenario) {
  return effectiveForbiddenPairs(scenario).map(({ partyIds, refusedBy }) => ({
    partyIds,
    refusedBy,
  }));
}

function seats(scenario: Scenario): number[] {
  return runSeats(scenario).allocation.parties.map((party) => party.seats);
}

describe('M7-09 exact legacy conversion', () => {
  it('starts from a validated exact legacy fixture with known votes and restrictions', () => {
    const old = oldScenario(fixture());
    expect(toFractionString(runSeats(old).votes.totals.cast)).toBe('500');
    expect(toFractionString(runSeats(old).votes.totals.valid)).toBe('475');
    expect(seats(old)).toEqual([20, 20, 31, 30, 0]);
    expect(pairs(old)).toHaveLength(3);
  });

  it('preserves exact current shares and group assumptions without mutating the original', () => {
    const input = fixture();
    const before = JSON.stringify(input);
    const old = oldScenario(input);
    const result = converted(input);
    const oldVotes = runSeats(old).votes;
    const newVotes = runSeats(result).votes;

    expect(JSON.stringify(input)).toBe(before);
    expect(result.inputMode).toBe('parties');
    expect(result.rules.validBallotRate).toBe('0.999');
    expect(exact(result.rules.overallTurnout)).toBe('1/2');
    expect(result.rules.majorityMode).toBe('default');
    expect(result.rules.majorityOverride).toBeNull();
    expect(result.parties.map((party) => exact(party.voteShare))).toEqual([
      '1/5',
      '1/5',
      '3/10',
      '3/10',
      '0',
    ]);
    expect(result.groups.map((group) => exact(group.turnout))).toEqual([
      '2/5',
      '1',
      '0',
    ]);
    expect(result.groups.map((group) => group.turnoutChange)).toEqual([
      '0',
      '0',
      '0',
    ]);
    expect(result.groups[0]?.growthRate).toBe('0.1');
    expect(result.parties[4]?.composition).toBeNull();
    expect(result.linkedModel?.state).toBe('current');
    expect(exact(result.linkedModel!.groups.G3!.populationShare)).toBe('1/5');
    expect(exact(result.linkedModel!.groups.G3!.preferences.P4!)).toBe('1');
    expect(result.linkedModel!.groups.G3!.allowedPartyIds).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
      'P5',
    ]);
    expect(toFractionString(oldVotes.totals.cast)).toBe('500');
    expect(toFractionString(newVotes.totals.cast)).toBe('500');
    expect(toFractionString(oldVotes.totals.valid)).toBe('475');
    expect(toFractionString(newVotes.totals.valid)).toBe('999/2');
    expect(seats(result)).toEqual([20, 20, 31, 30, 0]);
    expect(seats(result)).toEqual(seats(old));
  });

  it('expands effective restrictions after exceptions and preserves both directed refusals', () => {
    const old = oldScenario(fixture());
    const result = converted(old);
    expect(result.blocks).toEqual([]);
    expect(result.parties.every((party) => party.blockId === null)).toBe(true);
    expect(result.coalitionRules.incompatibleBlockPairs).toEqual([]);
    expect(result.coalitionRules.compatiblePartyOverrides).toEqual([]);
    expect(result.coalitionRules.partyRefusals).toEqual([
      ['P2', 'P3'],
      ['P3', 'P2'],
    ]);
    expect(pairs(result)).toEqual(pairs(old));
    expect(pairs(result)).not.toContainEqual({
      partyIds: ['P1', 'P3'],
      refusedBy: [],
    });
    expect(pairs(result)).toContainEqual({
      partyIds: ['P2', 'P4'],
      refusedBy: [],
    });
    expect(pairs(result)).toContainEqual({
      partyIds: ['P2', 'P3'],
      refusedBy: ['P2', 'P3'],
    });
  });

  it('refuses a group-validity mismatch rather than changing the voter matrix', () => {
    const input = fixture();
    (input.groups as Json[])[1]!.validBallotRate = '0.9';
    const before = JSON.stringify(input);
    expect(prepareLegacyConversion(input)).toMatchObject({
      ok: false,
      reason: 'unrepresentable-vote-matrix',
    });
    expect(JSON.stringify(input)).toBe(before);
  });

  it('refuses zero valid votes instead of inventing party shares', () => {
    const input = fixture();
    for (const group of input.groups as Json[]) group.turnout = '0';
    expect(prepareLegacyConversion(input)).toMatchObject({
      ok: false,
      reason: 'no-valid-votes',
    });
  });

  it('shows that normalizing party-mode validity can create a new allocation', () => {
    const input = partyModeInput(
      [
        ['1', '2'],
        ['1', '2'],
      ],
      { validBallotRate: '0', turnout: '0.7', threshold: '0', seatCount: 101 },
    );
    const before = validated(input);
    const after = converted(input);
    expect(runSeats(before).allocation.noAllocation).toBe('no-valid-votes');
    expect(runSeats(after).allocation.noAllocation).toBeNull();
    expect(seats(after)).toEqual([51, 50]);
    expect(after.parties.map((party) => exact(party.voteShare))).toEqual([
      '1/2',
      '1/2',
    ]);
  });

  it('refuses invalid input explicitly without mutating it', () => {
    const input = fixture();
    (input.rules as Json).seatCount = 0;
    const before = JSON.stringify(input);
    const result = prepareLegacyConversion(input);
    expect(result).toMatchObject({ ok: false, reason: 'invalid-scenario' });
    if (result.ok) throw new Error('Expected invalid input refusal');
    expect(result.issues.length).toBeGreaterThan(0);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('supports a single party without inventing a second destination', () => {
    const input = scenarioInput({
      rules: rulesInput({ seatCount: 43 }),
      parties: [partyInput('P1', null, 1)],
      groups: [groupInput('G1', '1', { P1: '1' })],
    });
    const result = converted(input);
    expect(result.parties.map((party) => exact(party.voteShare))).toEqual([
      '1',
    ]);
    expect(seats(result)).toEqual([43]);
  });

  it.each([1, 2, 3, 4])(
    'preserves version %i legacy results until explicitly converted',
    (version) => {
      const input = section8Input('0.37');
      input.schemaVersion = version;
      if (version < 4) delete input.inputMode;
      const old = oldScenario(input);
      const original = serializeResult(runScenario(old));
      const result = converted(input);
      expect(serializeResult(runScenario(old))).toBe(original);
      expect(seats(result)).toEqual(seats(old));
      expect(pairs(result)).toEqual(pairs(old));
    },
  );

  it('retains unknown composition when normalizing an existing party scenario', () => {
    const input = partyModeInput(
      [
        ['1', '3'],
        ['2', '3'],
      ],
      { validBallotRate: '0.95', threshold: '0', seatCount: 101 },
    );
    input.blocks = [{ id: 'B', name: 'Legacy', color: '#224466' }];
    (input.parties as Json[])[0]!.blockId = 'B';
    const result = converted(input);
    expect(result.parties.map((party) => exact(party.voteShare))).toEqual([
      '1/3',
      '2/3',
    ]);
    expect(result.parties.map((party) => party.composition)).toEqual([
      null,
      null,
    ]);
    expect(result.blocks).toEqual([]);
    expect(seats(result)).toEqual(seats(validated(input)));
  });

  it.each([
    ['0.0324', '0.9676', [0, 120]],
    ['0.0325', '0.9675', [4, 116]],
    ['0.0326', '0.9674', [4, 116]],
  ])(
    'preserves the exact threshold decision at %s',
    (first, second, expected) => {
      const input = scenarioInput({
        rules: rulesInput({ seatCount: 120, threshold: '0.0325' }),
        parties: [partyInput('P1', null, 2), partyInput('P2', null, 1)],
        groups: [groupInput('G1', '1', { P1: first, P2: second })],
      });
      const old = oldScenario(input);
      const result = converted(input);
      expect(seats(old)).toEqual(expected);
      expect(seats(result)).toEqual(expected);
    },
  );

  it('preserves Hamilton tie order for an odd number of seats', () => {
    const input = scenarioInput({
      rules: rulesInput({ seatCount: 101 }),
      parties: [partyInput('P1', null, 2), partyInput('P2', null, 1)],
      groups: [groupInput('G1', '1', { P1: '0.5', P2: '0.5' })],
    });
    const tied = converted(input);
    expect(seats(tied)).toEqual([50, 51]);
  });

  it('keeps a no-allocation state when every party is below the threshold', () => {
    const input = scenarioInput({
      rules: rulesInput({ seatCount: 101, threshold: '0.6' }),
      parties: [partyInput('P1', null, 1), partyInput('P2', null, 2)],
      groups: [groupInput('G1', '1', { P1: '0.5', P2: '0.5' })],
    });
    const old = oldScenario(input);
    const next = converted(input);
    expect(runSeats(old).allocation.noAllocation).not.toBeNull();
    expect(runSeats(next).allocation.noAllocation).toEqual(
      runSeats(old).allocation.noAllocation,
    );
  });

  it('keeps every effective party pair in a large valid legacy scenario', () => {
    const parties = Array.from({ length: 100 }, (_, index) =>
      partyInput(`P${index + 1}`, index < 50 ? 'B1' : 'B2', index + 1),
    );
    const weights = Object.fromEntries(
      parties.map((party) => [String(party.id), '0.01']),
    );
    const input = scenarioInput({
      parties,
      groups: [groupInput('G1', '1', weights)],
      blocks: [
        { id: 'B1', name: 'First', color: '#224466' },
        { id: 'B2', name: 'Second', color: '#668822' },
      ],
      coalitionRules: { incompatibleBlockPairs: [['B1', 'B2']] },
    });
    const old = oldScenario(input);
    const result = converted(input);
    expect(pairs(old)).toHaveLength(2500);
    expect(pairs(result)).toEqual(pairs(old));
  });

  it('refuses an exact legacy matrix that exceeds the version-5 precision budget', () => {
    const scale = 10n ** 18n;
    const decimal = (n: bigint) => `0.${n.toString().padStart(18, '0')}`;
    const parties = Array.from({ length: 30 }, (_, index) =>
      partyInput(`P${index + 1}`, null, index + 1),
    );
    const groups = Array.from({ length: 20 }, (_, group) => {
      const weights = Array.from(
        { length: 29 },
        (_, party) =>
          scale / 30n + 101n * BigInt(group + 1) * BigInt(party + 1),
      );
      weights.push(scale - weights.reduce((sum, value) => sum + value, 0n));
      return groupInput(
        `G${group + 1}`,
        '0.05',
        Object.fromEntries(
          parties.map((party, index) => [
            String(party.id),
            decimal(weights[index]!),
          ]),
        ),
        {
          turnout: decimal(scale / 2n + 11n * BigInt(group) + 1n),
          participationFactor: decimal(
            (7n * scale) / 10n + 13n * BigInt(group) + 1n,
          ),
          validBallotRate: '0.95',
        },
      );
    });
    const input = scenarioInput({ parties, groups });
    expect(validated(input).inputMode).toBe('groups');
    const before = JSON.stringify(input);
    expect(prepareLegacyConversion(input)).toMatchObject({
      ok: false,
      reason: 'precision-limit',
    });
    expect(JSON.stringify(input)).toBe(before);
  });

  it('round-trips and produces identical exact results in every locale', () => {
    const input = fixture();
    const first = converted(input);
    const encoded = serializeScenario(first);
    const decoded = parseScenarioJson(encoded);
    if (!decoded.ok) throw new Error('Converted JSON did not validate');
    const expected = serializeResult(runScenario(first));
    expect(serializeResult(runScenario(decoded.scenario))).toBe(expected);
    for (const locale of LOCALES) {
      translator(locale)('view.coalitions');
      expect(serializeScenario(converted(input))).toBe(encoded);
      expect(serializeResult(runScenario(converted(input)))).toBe(expected);
    }
  });

  it('preserves the seat sum and allocation over seeded exact legacy fixtures', () => {
    const random = createPrng(709);
    for (let iteration = 0; iteration < 40; iteration += 1) {
      const p1 = randomInt(random, 1, 99);
      const p2 = 100 - p1;
      const seatCount = randomInt(random, 1, 200) * 2 + 1;
      const decimal = (n: number) => `0.${String(n).padStart(2, '0')}`;
      const input = scenarioInput({
        rules: rulesInput({ seatCount }),
        parties: [partyInput('P1', null, 1), partyInput('P2', null, 2)],
        groups: [groupInput('G1', '1', { P1: decimal(p1), P2: decimal(p2) })],
      });
      const old = oldScenario(input);
      const next = converted(input);
      const allocation = seats(next);
      expect(allocation).toEqual(seats(old));
      expect(
        allocation.every((value) => Number.isInteger(value) && value >= 0),
      ).toBe(true);
      expect(allocation.reduce((total, value) => total + value, 0)).toBe(
        seatCount,
      );
    }
  });

  it('shows a real selected-year future difference without changing the source', () => {
    const input = fixture();
    const old = oldScenario(input);
    const futureBefore = runSeats(old, 4);
    const result = converted(input);
    const futureAfter = runSeats(result, 4);
    expect('kind' in futureAfter).toBe(false);
    if ('kind' in futureAfter) throw new Error('Expected a future projection');
    expect(serializeResult(futureAfter)).not.toBe(
      serializeResult(futureBefore),
    );
    expect(serializeResult(runSeats(old, 4))).toBe(
      serializeResult(futureBefore),
    );
  });
});
