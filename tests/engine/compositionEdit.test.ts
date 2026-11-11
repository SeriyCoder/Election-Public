import { describe, expect, it } from 'vitest';
import {
  beginPartyComposition,
  clearPartyComposition,
  editCompositionShare,
  type CompositionEditResult,
} from '../../src/engine/compositionEdit';
import {
  compare,
  rational,
  sum,
  toFractionString,
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

function fixture(
  count = 3,
  shares: readonly (readonly [string, string])[] = [
    ['1', '2'],
    ['1', '2'],
  ],
): Json {
  const input = partyModeInput(shares, {
    populationTotal: '1000',
    turnout: '0.7',
    threshold: '0.0325',
    seatCount: 101,
  });
  input.groups = Array.from({ length: count }, (_, index) => ({
    id: `G${index + 1}`,
    name: index === count - 1 ? 'Other / unclassified' : `Group ${index + 1}`,
    notes: `note ${index + 1}`,
    turnout: '0.7',
    growthRate: '0',
    turnoutChange: '0',
  }));
  return input;
}

function setMix(
  input: Json,
  party: number,
  shares: readonly (readonly [string, string])[],
): void {
  (input.parties as Json[])[party]!.composition = Object.fromEntries(
    shares.map(([numerator, denominator], index) => [
      `G${index + 1}`,
      { numerator, denominator },
    ]),
  );
}

function scenario(input: unknown): PartyScenario {
  const result = validateScenario(input);
  if (!result.ok || result.scenario.inputMode !== 'parties') {
    throw new Error(
      `Invalid party fixture: ${result.ok ? 'wrong mode' : result.issues.map((issue) => `${issue.path}:${issue.code}`).join(', ')}`,
    );
  }
  return result.scenario;
}

function success(result: CompositionEditResult): Json {
  if (!result.ok) {
    throw new Error(`Unexpected refusal: ${result.reason}`);
  }
  return result.draft;
}

function composition(input: unknown, party = 0): readonly string[] | null {
  const mix = scenario(input).parties[party]!.composition;
  return mix === null
    ? null
    : scenario(input).groups.map((group) => {
        const value: ExactFraction = mix[group.id]!;
        return toFractionString(
          rational(BigInt(value.numerator), BigInt(value.denominator)),
        );
      });
}

function allocation(input: unknown): string {
  return serializeResult(runSeats(scenario(input)));
}

function coalitions(input: unknown): string {
  return JSON.stringify(runScenario(scenario(input)).coalitions);
}

describe('optional exact composition editing', () => {
  it('keeps composition unknown until equal assumptions are explicitly selected', () => {
    const input = fixture();
    const before = JSON.stringify(input);
    expect(composition(input)).toBeNull();
    const result = success(beginPartyComposition(input, 'P1'));
    expect(composition(result)).toEqual(['1/3', '1/3', '1/3']);
    expect(composition(result, 1)).toBeNull();
    expect(JSON.stringify(input)).toBe(before);
    expect(allocation(result)).toBe(allocation(input));
    expect(coalitions(result)).toBe(coalitions(input));
  });

  it('preserves the entered share and redistributes other groups exactly', () => {
    const input = fixture();
    setMix(input, 0, [
      ['1', '2'],
      ['1', '6'],
      ['1', '3'],
    ]);
    const before = JSON.stringify(input);
    const result = success(editCompositionShare(input, 'P1', 'G1', '33'));
    expect(composition(result)).toEqual(['33/100', '67/300', '67/150']);
    expect(JSON.stringify(input)).toBe(before);
    expect(allocation(result)).toBe(allocation(input));
    expect(coalitions(result)).toBe(coalitions(input));
  });

  it('splits zero recipients equally and keeps a zero beside positive recipients', () => {
    const allZero = fixture();
    setMix(allZero, 0, [
      ['1', '1'],
      ['0', '1'],
      ['0', '1'],
    ]);
    expect(
      composition(success(editCompositionShare(allZero, 'P1', 'G1', '40'))),
    ).toEqual(['2/5', '3/10', '3/10']);
    const mixed = fixture();
    setMix(mixed, 0, [
      ['3', '5'],
      ['2', '5'],
      ['0', '1'],
    ]);
    expect(
      composition(success(editCompositionShare(mixed, 'P1', 'G1', '20'))),
    ).toEqual(['1/5', '4/5', '0']);
  });

  it('keeps all entered decimal digits and accepts commas', () => {
    const input = fixture(2);
    setMix(input, 0, [
      ['1', '2'],
      ['1', '2'],
    ]);
    const result = success(
      editCompositionShare(input, 'P1', 'G1', '33,3333333333333333'),
    );
    expect(composition(result)).toEqual([
      '333333333333333333/1000000000000000000',
      '666666666666666667/1000000000000000000',
    ]);
  });

  it('marks a known composition unknown without changing seats or other data', () => {
    const input = fixture();
    setMix(input, 0, [
      ['1', '2'],
      ['1', '4'],
      ['1', '4'],
    ]);
    const before = JSON.stringify(input);
    const result = success(clearPartyComposition(input, 'P1'));
    expect(composition(result)).toBeNull();
    expect(allocation(result)).toBe(allocation(input));
    expect(coalitions(result)).toBe(coalitions(input));
    expect(JSON.stringify(input)).toBe(before);
  });

  it('preserves unrecognized draft fields when editing and clearing', () => {
    const input = fixture(2);
    input.editorOnly = { pinned: true };
    (input.rules as Json).draftField = 'keep-rule';
    (input.groups as Json[])[0]!.draftField = 'keep-group';
    (input.parties as Json[])[0]!.draftField = 'keep-party';
    (input.coalitionRules as Json).draftField = ['keep-coalition'];
    const started = success(beginPartyComposition(input, 'P1'));
    const edited = success(editCompositionShare(started, 'P1', 'G1', '60'));
    const cleared = success(clearPartyComposition(edited, 'P1'));
    for (const draft of [started, edited, cleared]) {
      expect(draft.editorOnly).toEqual({ pinned: true });
      expect((draft.rules as Json).draftField).toBe('keep-rule');
      expect((draft.groups as Json[])[0]!.draftField).toBe('keep-group');
      expect((draft.parties as Json[])[0]!.draftField).toBe('keep-party');
      expect((draft.coalitionRules as Json).draftField).toEqual([
        'keep-coalition',
      ]);
    }
  });

  it('handles no groups and a single group without inventing a recipient', () => {
    const empty = fixture(0);
    expect(beginPartyComposition(empty, 'P1')).toMatchObject({
      ok: false,
      reason: 'no-groups',
    });
    const one = success(beginPartyComposition(fixture(1), 'P1'));
    expect(composition(one)).toEqual(['1']);
    expect(editCompositionShare(one, 'P1', 'G1', '99')).toMatchObject({
      ok: false,
      reason: 'no-unlocked-recipient',
    });
    expect(
      composition(success(editCompositionShare(one, 'P1', 'G1', '100'))),
    ).toEqual(['1']);
  });

  it.each(['', '-1', '101', '1e2', 'abc', '1.00000000000000000'])(
    'refuses invalid percentage %j without changing the scenario',
    (text) => {
      const input = fixture(2);
      setMix(input, 0, [
        ['1', '2'],
        ['1', '2'],
      ]);
      const before = JSON.stringify(input);
      expect(editCompositionShare(input, 'P1', 'G1', text)).toMatchObject({
        ok: false,
        reason: 'invalid-percent',
      });
      expect(JSON.stringify(input)).toBe(before);
    },
  );

  it('refuses unknown IDs, unknown composition and accidental reinitialization', () => {
    const input = fixture(2);
    expect(beginPartyComposition(input, 'P99')).toMatchObject({
      ok: false,
      reason: 'unknown-party',
    });
    expect(editCompositionShare(input, 'P1', 'G1', '30')).toMatchObject({
      ok: false,
      reason: 'composition-unknown',
    });
    const known = success(beginPartyComposition(input, 'P1'));
    expect(beginPartyComposition(known, 'P1')).toMatchObject({
      ok: false,
      reason: 'already-known',
    });
    expect(editCompositionShare(known, 'P1', 'G99', '30')).toMatchObject({
      ok: false,
      reason: 'unknown-group',
    });
    expect(clearPartyComposition(known, 'P99')).toMatchObject({
      ok: false,
      reason: 'unknown-party',
    });
  });

  it('refuses invalid scenarios and never changes legacy group-mode inputs', () => {
    const invalid = fixture();
    (invalid.rules as Json).seatCount = -1;
    expect(beginPartyComposition(invalid, 'P1')).toMatchObject({
      ok: false,
      reason: 'invalid-scenario',
    });
    const legacy = section8Input();
    const before = JSON.stringify(legacy);
    expect(beginPartyComposition(legacy, 'P1')).toMatchObject({
      ok: false,
      reason: 'party-mode-required',
    });
    expect(JSON.stringify(legacy)).toBe(before);
  });

  it('refuses component precision overflow without modifying the input', () => {
    const denominator = 10n ** 255n + 3n;
    const input = fixture();
    setMix(input, 0, [
      ['1', String(denominator)],
      ['1', String(denominator)],
      [String(denominator - 2n), String(denominator)],
    ]);
    scenario(input);
    const before = JSON.stringify(input);
    const result = editCompositionShare(
      input,
      'P1',
      'G1',
      '33.3333333333333333',
    );
    expect(result).toMatchObject({ ok: false, reason: 'precision-limit' });
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === 'too-long')).toBe(
        true,
      );
    }
    expect(JSON.stringify(input)).toBe(before);
  });

  it('refuses aggregate denominator overflow without modifying the input', () => {
    const input = partyModeBudgetExpansionInput(50);
    input.groups = fixture().groups;
    setMix(input, 0, [
      ['1', '2'],
      ['1', '6'],
      ['1', '3'],
    ]);
    scenario(input);
    const before = JSON.stringify(input);
    const result = editCompositionShare(
      input,
      'P1',
      'G1',
      '33.3333333333333333',
    );
    expect(result).toMatchObject({ ok: false, reason: 'precision-limit' });
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === 'too-long')).toBe(
        true,
      );
    }
    expect(JSON.stringify(input)).toBe(before);
  });

  it.each([
    ['3', ['3', '100'], 'below-threshold'],
    ['3.25', ['13', '400'], 'qualified'],
    ['3.5', ['7', '200'], 'qualified'],
  ] as const)(
    'keeps seats and threshold behavior unchanged at %s percent',
    (_text, first, status) => {
      const denominator = BigInt(first[1]);
      const numerator = BigInt(first[0]);
      const input = fixture(2, [
        first,
        [String(denominator - numerator), String(denominator)],
      ]);
      const before = runSeats(scenario(input));
      const result = success(beginPartyComposition(input, 'P1'));
      const after = runSeats(scenario(result));
      expect(before.threshold.parties[0]?.status).toBe(status);
      expect(serializeResult(after)).toBe(serializeResult(before));
      expect(
        after.allocation.parties.reduce(
          (total, party) => total + party.seats,
          0,
        ),
      ).toBe(101);
    },
  );

  it('keeps persisted tie order and the ID fallback after a composition edit', () => {
    const input = fixture(2, [
      ['1', '2'],
      ['1', '4'],
      ['1', '4'],
    ]);
    (input.rules as Json).seatCount = 2;
    const parties = input.parties as Json[];
    parties[1]!.tieBreakOrder = 7;
    parties[2]!.tieBreakOrder = 1;
    const edited = success(beginPartyComposition(input, 'P1'));
    expect(
      runSeats(scenario(edited)).allocation.parties.map((p) => p.seats),
    ).toEqual([1, 0, 1]);
    parties[1]!.tieBreakOrder = 1;
    const fallback = success(beginPartyComposition(input, 'P1'));
    expect(
      runSeats(scenario(fallback)).allocation.parties.map((p) => p.seats),
    ).toEqual([1, 1, 0]);
  });

  it('preserves deterministic exact shares and odd seat totals across seeded edits', () => {
    const next = createPrng(0x7042026);
    for (let iteration = 0; iteration < 40; iteration += 1) {
      const parts = randomParts(next, 3, 10_000);
      const input = fixture(
        randomInt(next, 2, 5),
        parts.map((part) => [String(part), '10000'] as const),
      );
      const started = success(beginPartyComposition(input, 'P1'));
      const percent = String(randomInt(next, 0, 100));
      const edited = success(
        editCompositionShare(started, 'P1', 'G1', percent),
      );
      const candidate = scenario(edited);
      const fractions = Object.values(candidate.parties[0]!.composition!).map(
        (part) => rational(BigInt(part.numerator), BigInt(part.denominator)),
      );
      expect(compare(sum(fractions), rational(1n))).toBe(0);
      const seats = runSeats(candidate);
      expect(
        seats.allocation.parties.reduce((total, p) => total + p.seats, 0),
      ).toBe(101);
      expect(serializeResult(seats)).toBe(allocation(input));
      expect(coalitions(edited)).toBe(coalitions(input));
      const restored = parseScenarioJson(serializeScenario(candidate));
      expect(restored.ok).toBe(true);
      if (!restored.ok) throw new Error('Round trip failed');
      expect(serializeResult(runSeats(restored.scenario))).toBe(
        serializeResult(seats),
      );
    }
  });

  it('keeps zero-turnout seats unavailable rather than inventing votes', () => {
    const input = fixture(2);
    (input.rules as Json).overallTurnout = { numerator: '0', denominator: '1' };
    const before = allocation(input);
    const started = success(beginPartyComposition(input, 'P1'));
    expect(allocation(started)).toBe(before);
    expect(runSeats(scenario(started)).allocation.noAllocation).toBe(
      'no-valid-votes',
    );
  });

  it('edits 20 groups across 40 parties within the 200 ms median budget', () => {
    const input = fixture(
      20,
      Array.from({ length: 40 }, () => ['1', '40'] as const),
    );
    let current = success(beginPartyComposition(input, 'P1'));
    const timings: number[] = [];
    for (const percent of ['10', '5', '10', '5', '10', '5', '10', '5', '10']) {
      const start = performance.now();
      current = success(editCompositionShare(current, 'P1', 'G1', percent));
      timings.push(performance.now() - start);
      expect(allocation(current)).toBe(allocation(input));
    }
    const sorted = [...timings].sort((a, b) => a - b);
    expect(sorted[Math.floor(sorted.length / 2)]).toBeLessThanOrEqual(200);
  });
});
