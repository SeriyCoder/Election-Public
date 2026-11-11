import { describe, expect, it } from 'vitest';
import {
  buildFutureVisuals,
  findFirstHalfSeat,
  scanCriticalSets,
  summarizeCriticalSet,
  type CriticalYearSample,
  type FutureVisualYear,
} from '../../src/engine/futureRange';
import { prepareLegacyConversion } from '../../src/engine/legacyConversion';
import { toFractionString } from '../../src/engine/rational';
import { runSeats } from '../../src/engine/run';
import {
  parseScenarioJson,
  serializeScenario,
  validateScenario,
  type Scenario,
} from '../../src/engine/schema';
import { LOCALES, translator } from '../../src/i18n';
import { largeInput } from '../e2e/scenarios';
import {
  finalYearCrossingInput,
  nonMonotoneFutureInput,
  visualFutureInput,
} from './helpers/futureFixtures';
import { createPrng, millionths, randomInt, randomParts } from './helpers/prng';
import {
  groupInput,
  partyInput,
  partyModeInput,
  partyModeKnownPopulationInput,
  rulesInput,
  scenarioInput,
  section8Input,
  type Json,
} from './helpers/scenarios';

function scenarioOf(input: unknown): Scenario {
  const validation = validateScenario(input);
  if (!validation.ok) {
    throw new Error(
      `Invalid fixture: ${validation.issues.map((issue) => `${issue.path}:${issue.code}`).join(', ')}`,
    );
  }
  return validation.scenario;
}

function amounts(year: FutureVisualYear): [string, string | null][] {
  return year.entries.map((entry) => [
    entry.id,
    entry.amount === null ? null : toFractionString(entry.amount),
  ]);
}

function exact(
  value: Parameters<typeof toFractionString>[0] | null,
): string | null {
  return value === null ? null : toFractionString(value);
}

function oneGroupInput(
  weights: Record<string, string>,
  options: { seats?: number; threshold?: string; majority?: number } = {},
): Json {
  const ids = Object.keys(weights);
  return scenarioInput({
    rules: rulesInput({
      populationTotal: '1000',
      seatCount: options.seats ?? 120,
      threshold: options.threshold ?? '0',
      ...(options.majority === undefined
        ? {}
        : { majorityMode: 'override', majorityOverride: options.majority }),
    }),
    parties: ids.map((id, index) => partyInput(id, null, index + 1)),
    groups: [groupInput('G', '1', weights)],
  });
}

function samples(seats: readonly (number | null)[]): CriticalYearSample[] {
  return Array.from({ length: 51 }, (_, year) => ({
    year,
    seats: seats[year] === undefined ? 0 : seats[year]!,
    reason: seats[year] === null ? 'no-party-qualifies' : null,
  }));
}

describe('M7-10 exact future visual inputs', () => {
  it('separates eligible populations from all valid votes in both years', () => {
    const scenario = scenarioOf(visualFutureInput());
    const visual = buildFutureVisuals(
      scenario,
      runSeats(scenario),
      runSeats(scenario, 1),
    );
    expect(visual.population.baseline.availability).toBe('available');
    expect(visual.validVotes.current.availability).toBe('available');
    expect(exact(visual.population.baseline.total)).toBe('1000');
    expect(exact(visual.population.current.total)).toBe('1060');
    expect(amounts(visual.population.baseline)).toEqual([
      ['A', '600'],
      ['B', '400'],
    ]);
    expect(amounts(visual.population.current)).toEqual([
      ['A', '660'],
      ['B', '400'],
    ]);
    expect(exact(visual.validVotes.baseline.total)).toBe('700');
    expect(exact(visual.validVotes.current.total)).toBe('730');
    expect(amounts(visual.validVotes.baseline)).toEqual([
      ['X', '320'],
      ['Y', '380'],
    ]);
    expect(amounts(visual.validVotes.current)).toEqual([
      ['X', '344'],
      ['Y', '386'],
    ]);
  });

  it('keeps below-threshold party votes in the graphics', () => {
    const input = visualFutureInput();
    input.rules = { ...(input.rules as Json), threshold: '0.5' };
    const scenario = scenarioOf(input);
    const base = runSeats(scenario);
    expect(
      base.threshold.parties.find((party) => party.partyId === 'X')?.status,
    ).toBe('below-threshold');
    const visual = buildFutureVisuals(scenario, base, runSeats(scenario, 1));
    expect(amounts(visual.validVotes.baseline)).toContainEqual(['X', '320']);
    expect(amounts(visual.validVotes.current)).toContainEqual(['X', '344']);
  });

  it('uses known party-mode populations, including a genuinely empty group', () => {
    const scenario = scenarioOf(partyModeKnownPopulationInput());
    const visual = buildFutureVisuals(
      scenario,
      runSeats(scenario),
      runSeats(scenario, 1),
    );
    expect(amounts(visual.population.baseline)).toEqual([
      ['G1', '1000'],
      ['G2', '0'],
    ]);
    expect(amounts(visual.population.current)).toEqual([
      ['G1', '1100'],
      ['G2', '0'],
    ]);
    expect(exact(visual.population.current.total)).toBe('1100');
    expect(exact(visual.validVotes.baseline.total)).toBe('999');
  });

  it('preserves known present votes when populations and the future are unknown', () => {
    const input = partyModeKnownPopulationInput();
    const parties = input.parties as Json[];
    input.parties = [{ ...parties[0], composition: null }];
    const scenario = scenarioOf(input);
    const current = runSeats(scenario, 1);
    expect(current).toEqual({
      kind: 'unavailable',
      reason: 'unknown-party-composition',
    });
    const visual = buildFutureVisuals(scenario, runSeats(scenario), current);
    expect(visual.population.baseline.availability).toBe('unavailable');
    expect(visual.population.baseline.total).toBeNull();
    expect(visual.validVotes.baseline.availability).toBe('available');
    expect(exact(visual.validVotes.baseline.total)).toBe('999');
    expect(visual.validVotes.current).toMatchObject({
      availability: 'unavailable',
      reason: 'unknown-party-composition',
      total: null,
    });
  });

  it('distinguishes known zero votes from an unavailable population', () => {
    const input = oneGroupInput({ X: '1' });
    (input.groups as Json[])[0]!.turnout = '0';
    const scenario = scenarioOf(input);
    const result = runSeats(scenario);
    expect(result.allocation.noAllocation).toBe('no-valid-votes');
    const visual = buildFutureVisuals(scenario, result, result);
    expect(exact(visual.population.baseline.total)).toBe('1000');
    expect(visual.validVotes.baseline.availability).toBe('available');
    expect(exact(visual.validVotes.baseline.total)).toBe('0');
    expect(amounts(visual.validVotes.baseline)).toEqual([['X', '0']]);
  });
});

describe('M7-10 exact party set summaries', () => {
  it('distinguishes 60 of 120 seats from both the ordinary and override majorities', () => {
    const ordinary = scenarioOf(oneGroupInput({ X: '0.5', Y: '0.5' }));
    const half = summarizeCriticalSet(ordinary, runSeats(ordinary), ['X']);
    expect(exact(half.votes)).toBe('500');
    expect(exact(half.voteShare)).toBe('1/2');
    expect(half).toMatchObject({
      seats: 60,
      isHalf: true,
      isMajority: false,
      majority: 61,
      noAllocation: null,
    });
    const override = scenarioOf(
      oneGroupInput({ X: '0.5', Y: '0.5' }, { majority: 70 }),
    );
    expect(
      summarizeCriticalSet(override, runSeats(override), ['X']),
    ).toMatchObject({
      seats: 60,
      isHalf: true,
      isMajority: false,
      majority: 70,
    });
    const lowOverride = scenarioOf(
      oneGroupInput({ X: '0.4', Y: '0.6' }, { majority: 40 }),
    );
    expect(
      summarizeCriticalSet(lowOverride, runSeats(lowOverride), ['X']),
    ).toMatchObject({
      seats: 48,
      isHalf: false,
      isMajority: true,
      majority: 40,
    });
  });

  it('uses the exact tie order for an odd parliament and the half-seat boundary', () => {
    const input = oneGroupInput({ X: '0.5', Y: '0.5' }, { seats: 11 });
    input.parties = [partyInput('X', null, 2), partyInput('Y', null, 1)];
    const scenario = scenarioOf(input);
    const result = runSeats(scenario);
    expect(summarizeCriticalSet(scenario, result, ['X'])).toMatchObject({
      seats: 5,
      isHalf: false,
      isMajority: false,
    });
    expect(summarizeCriticalSet(scenario, result, ['Y'])).toMatchObject({
      seats: 6,
      isHalf: true,
      isMajority: true,
    });
  });

  it('uses party ID as the final exact tie breaker when persisted order is equal', () => {
    const input = oneGroupInput({ X: '0.5', Y: '0.5' }, { seats: 11 });
    input.parties = [partyInput('Y', null, 1), partyInput('X', null, 1)];
    const scenario = scenarioOf(input);
    const result = runSeats(scenario);
    expect(summarizeCriticalSet(scenario, result, ['X']).seats).toBe(6);
    expect(summarizeCriticalSet(scenario, result, ['Y']).seats).toBe(5);
  });

  it.each([
    ['0.032499', '0.967501', 0],
    ['0.0325', '0.9675', 4],
    ['0.032501', '0.967499', 4],
  ])('respects the exact threshold at %s', (first, second, expectedSeats) => {
    const scenario = scenarioOf(
      oneGroupInput({ X: first, Y: second }, { threshold: '0.0325' }),
    );
    const result = summarizeCriticalSet(scenario, runSeats(scenario), ['X']);
    expect(result.seats).toBe(expectedSeats);
    expect(exact(result.voteShare)).toBe(
      exact(runSeats(scenario).votes.parties[0]!.voteShare),
    );
  });

  it('counts below-threshold votes even when a party receives no seats', () => {
    const scenario = scenarioOf(
      oneGroupInput({ X: '0.03', Y: '0.97' }, { threshold: '0.04' }),
    );
    const result = summarizeCriticalSet(scenario, runSeats(scenario), ['X']);
    expect(exact(result.votes)).toBe('30');
    expect(exact(result.voteShare)).toBe('3/100');
    expect(result).toMatchObject({
      seats: 0,
      isHalf: false,
      isMajority: false,
    });
  });

  it('deduplicates membership, preserves party order and refuses unknown IDs', () => {
    const scenario = scenarioOf(oneGroupInput({ X: '0.5', Y: '0.5' }));
    const result = runSeats(scenario);
    expect(
      summarizeCriticalSet(scenario, result, ['Y', 'X', 'X']),
    ).toMatchObject({
      partyIds: ['X', 'Y'],
      seats: 120,
      isHalf: true,
    });

    expect(() => summarizeCriticalSet(scenario, result, ['missing'])).toThrow(
      RangeError,
    );
  });

  it('counts an arbitrary set even if its parties cannot form a government', () => {
    const input = oneGroupInput({ X: '0.5', Y: '0.5' });
    input.parties = [partyInput('X', null, 1), partyInput('Y', null, 2, false)];
    input.coalitionRules = {
      ...(input.coalitionRules as Json),
      incompatiblePartyPairs: [['X', 'Y']],
    };
    const scenario = scenarioOf(input);
    expect(
      summarizeCriticalSet(scenario, runSeats(scenario), ['X', 'Y']),
    ).toMatchObject({
      seats: 120,
      isHalf: true,
      isMajority: true,
    });
  });

  it('does not turn a no-allocation result into zero seats or a zero vote share', () => {
    const input = oneGroupInput({ X: '1' });
    (input.groups as Json[])[0]!.turnout = '0';
    const scenario = scenarioOf(input);
    const result = summarizeCriticalSet(scenario, runSeats(scenario), ['X']);
    expect(exact(result.votes)).toBe('0');
    expect(result).toMatchObject({
      voteShare: null,
      seats: null,
      isHalf: null,
      isMajority: null,
      noAllocation: 'no-valid-votes',
    });
  });

  it('keeps exact votes when every party is below the threshold', () => {
    const scenario = scenarioOf(
      oneGroupInput({ X: '0.5', Y: '0.5' }, { threshold: '0.51' }),
    );
    const result = summarizeCriticalSet(scenario, runSeats(scenario), ['X']);
    expect(exact(result.votes)).toBe('500');
    expect(exact(result.voteShare)).toBe('1/2');
    expect(result).toMatchObject({
      seats: null,
      noAllocation: 'no-party-qualifies',
    });
  });
});

describe('M7-10 first half-seat crossing', () => {
  it('proves a crossing in year zero even if a later year is missing', () => {
    expect(findFirstHalfSeat(samples([60, null]), 120)).toEqual({
      state: 'proven',
      year: 0,
      seats: 60,
    });
  });

  it('reports the first known crossing, not a proven first, after no allocation', () => {
    expect(findFirstHalfSeat(samples([59, null, 60]), 120)).toEqual({
      state: 'first-known',
      year: 2,
      seats: 60,
      missing: [{ year: 1, reason: 'no-party-qualifies' }],
    });
  });

  it('retains a projection-unavailable reason before a later known crossing', () => {
    const years = samples([59, null, 61]);
    years[1] = { year: 1, seats: null, reason: 'unknown-party-composition' };
    expect(findFirstHalfSeat(years, 120)).toEqual({
      state: 'first-known',
      year: 2,
      seats: 61,
      missing: [{ year: 1, reason: 'unknown-party-composition' }],
    });
  });

  it('reports incomplete rather than no crossing when any year is unavailable', () => {
    const years = samples([]);
    years[7] = { year: 7, seats: null, reason: 'unknown-population' };
    expect(findFirstHalfSeat(years, 120)).toEqual({
      state: 'incomplete',
      missing: [{ year: 7, reason: 'unknown-population' }],
    });
  });

  it('reports no crossing only after a fully available range', () => {
    expect(findFirstHalfSeat(samples(Array(51).fill(59)), 120)).toEqual({
      state: 'not-reached',
    });
  });

  it('does not round down half of an odd seat count', () => {
    expect(findFirstHalfSeat(samples([5, 6]), 11)).toEqual({
      state: 'proven',
      year: 1,
      seats: 6,
    });
  });
});

describe('M7-12 full 0–50 range scan', () => {
  it('handles a single party selected in both sets without inventing another party', () => {
    const scenario = scenarioOf(oneGroupInput({ X: '1' }));
    const result = scanCriticalSets(scenario, { red: ['X'], orange: ['X'] });
    expect(result.crossings).toEqual({
      red: { state: 'proven', year: 0, seats: 120 },
      orange: { state: 'proven', year: 0, seats: 120 },
    });
    expect(exact(result.years[0]!.red!.voteShare)).toBe('1');
  });

  it('establishes exact nonmonotone and final-year fixture boundaries independently', () => {
    const nonmonotone = scenarioOf(nonMonotoneFutureInput());
    const finalYear = scenarioOf(finalYearCrossingInput());
    const seats = (scenario: Scenario, year: number): number => {
      const result = runSeats(scenario, year);
      if ('kind' in result) throw new Error('Expected available projection');
      return result.allocation.parties.find((party) => party.partyId === 'X')!
        .seats;
    };
    expect(
      [0, 1, 2, 3, 10, 20].map((year) => seats(nonmonotone, year)),
    ).toEqual([54, 57, 59, 61, 58, 28]);
    expect([19, 20].map((year) => seats(finalYear, year))).toEqual([59, 62]);
  });

  it('finds a nonmonotone first crossing even though year 20 falls below half', () => {
    const scenario = scenarioOf(nonMonotoneFutureInput());
    const visited: number[] = [];
    const result = scanCriticalSets(
      scenario,
      { red: ['X'], orange: ['X', 'Y'] },
      (year) => visited.push(year),
    );
    expect(visited).toEqual(Array.from({ length: 51 }, (_, index) => index));
    expect(result.years.slice(0, 21).map((year) => year.red?.seats)).toEqual([
      54, 57, 59, 61, 63, 63, 63, 63, 62, 60, 58, 56, 53, 50, 47, 44, 40, 37,
      34, 31, 28,
    ]);
    expect(result.crossings.red).toEqual({
      state: 'proven',
      year: 3,
      seats: 61,
    });
    expect(result.crossings.orange).toEqual({
      state: 'proven',
      year: 0,
      seats: 120,
    });
  });

  it('includes the final year and finds its first crossing', () => {
    const scenario = scenarioOf(finalYearCrossingInput());
    const result = scanCriticalSets(scenario, { red: ['X'], orange: [] });
    expect(result.years[19]?.red?.seats).toBe(59);
    expect(result.years[20]?.red?.seats).toBe(62);
    expect(result.crossings.red).toEqual({
      state: 'proven',
      year: 20,
      seats: 62,
    });
    expect(result.crossings.orange).toEqual({ state: 'empty' });
  });

  it('marks unavailable future years without losing the known year-zero seats', () => {
    const scenario = scenarioOf(
      partyModeInput(
        [
          ['1', '4'],
          ['3', '4'],
        ],
        { threshold: '0' },
      ),
    );
    const result = scanCriticalSets(scenario, { red: ['P1'], orange: ['P2'] });
    expect(result.years[0]?.red?.seats).toBe(30);
    expect(result.years[1]).toMatchObject({
      reason: 'unknown-party-composition',
      red: null,
      orange: null,
    });
    expect(result.crossings.red).toMatchObject({ state: 'incomplete' });
    expect(result.crossings.orange).toEqual({
      state: 'proven',
      year: 0,
      seats: 90,
    });
  });

  it('is deterministic after a JSON round trip, membership reordering and locale changes', () => {
    const scenario = scenarioOf(nonMonotoneFutureInput());
    const parsed = parseScenarioJson(serializeScenario(scenario));
    if (!parsed.ok) throw new Error('Round trip must validate');
    const expected = scanCriticalSets(scenario, {
      red: ['X', 'Y'],
      orange: ['X'],
    });

    expect(
      scanCriticalSets(scenario, { red: ['Y', 'X'], orange: ['X'] }),
    ).toEqual(expected);
    for (const locale of LOCALES) {
      expect(translator(locale)('view.future')).toBeTruthy();
      expect(
        scanCriticalSets(parsed.scenario, { red: ['X', 'Y'], orange: ['X'] }),
      ).toEqual(expected);
    }
  });

  it('does not claim no crossing when later years have no allocation', () => {
    const input = oneGroupInput({ X: '0.4', Y: '0.6' });
    (input.groups as Json[])[0]!.growthRate = '-1';
    const scenario = scenarioOf(input);
    const result = scanCriticalSets(scenario, { red: ['X'], orange: [] });
    expect(result.years[0]?.red?.seats).toBe(48);
    expect(result.years[1]?.red).toMatchObject({
      seats: null,
      noAllocation: 'no-valid-votes',
    });

    expect(result.crossings.red).toMatchObject({
      state: 'incomplete',
      missing: expect.arrayContaining([{ year: 1, reason: 'no-valid-votes' }]),
    });
  });

  it('reports a first known crossing after a real threshold-created allocation gap', () => {
    const input = nonMonotoneFutureInput();
    input.rules = { ...(input.rules as Json), threshold: '0.51' };
    const scenario = scenarioOf(input);
    for (const year of [2, 3]) {
      const projection = runSeats(scenario, year);
      if ('kind' in projection)
        throw new Error('Expected available projection');
      expect(projection.allocation.noAllocation).toBe('no-party-qualifies');
    }
    const crossingYear = runSeats(scenario, 4);
    if ('kind' in crossingYear)
      throw new Error('Expected available projection');
    expect(
      crossingYear.allocation.parties.find((party) => party.partyId === 'X')
        ?.seats,
    ).toBe(120);
    const result = scanCriticalSets(scenario, { red: ['X'], orange: [] });
    expect(result.years[2]?.red?.noAllocation).toBe('no-party-qualifies');
    expect(result.years[3]?.red?.noAllocation).toBe('no-party-qualifies');
    expect(result.crossings.red).toEqual({
      state: 'first-known',
      year: 4,
      seats: 120,
      missing: [
        { year: 2, reason: 'no-party-qualifies' },
        { year: 3, reason: 'no-party-qualifies' },
      ],
    });
  });

  it('matches exact allocations and the full seat sum for seeded scenarios', () => {
    const next = createPrng(20261031);
    for (let iteration = 0; iteration < 20; iteration += 1) {
      const weights = randomParts(next, 3, 1_000_000);
      const scenario = scenarioOf(
        oneGroupInput(
          Object.fromEntries(
            weights.map((part, index) => [`P${index + 1}`, millionths(part)]),
          ),
          { seats: randomInt(next, 1, 200) },
        ),
      );
      const result = scanCriticalSets(scenario, {
        red: ['P1', 'P2', 'P3'],
        orange: ['P1'],
      });
      for (const year of result.years) {
        const allocation = runSeats(scenario, year.year);
        if ('kind' in allocation)
          throw new Error('Group projection must be available');
        expect(
          allocation.allocation.parties.reduce(
            (sum, party) => sum + party.seats,
            0,
          ),
        ).toBe(scenario.rules.seatCount);
        expect(year.red?.seats).toBe(scenario.rules.seatCount);
        expect(year.orange?.seats).toBe(
          allocation.allocation.parties[0]?.seats,
        );
      }
    }
  });

  it('handles the 20-group, 30-party, 10-block reference size without changing seats', () => {
    const scenario = scenarioOf(largeInput({ eligible: 30 }));
    expect(scenario.groups).toHaveLength(20);
    expect(scenario.parties).toHaveLength(30);
    expect(scenario.blocks).toHaveLength(10);
    const ids = scenario.parties.map((party) => party.id);
    const result = scanCriticalSets(scenario, { red: ids, orange: [ids[0]!] });
    expect(result.years).toHaveLength(51);
    expect(
      result.years.every(
        (year) => year.red?.seats === scenario.rules.seatCount,
      ),
    ).toBe(true);
  });

  it('keeps the original and explicitly converted turnout projections distinct', () => {
    const input = section8Input('0.5');
    (input.groups as Json[])[2]!.turnoutChange = '0.1';
    const original = scenarioOf(input);
    const conversion = prepareLegacyConversion(input);
    if (!conversion.ok)
      throw new Error(`Conversion failed: ${conversion.reason}`);
    const converted = conversion.scenario;
    expect(converted.groups.every((group) => group.turnoutChange === '0')).toBe(
      true,
    );
    const originalYear = runSeats(original, 1);
    const convertedYear = runSeats(converted, 1);
    if ('kind' in originalYear || 'kind' in convertedYear) {
      throw new Error('Both projections must be available');
    }
    const originalVotes = originalYear.votes.parties.find(
      (party) => party.partyId === 'P3',
    )!.votes;
    const convertedVotes = convertedYear.votes.parties.find(
      (party) => party.partyId === 'P3',
    )!.votes;
    expect(exact(originalVotes)).not.toBe(exact(convertedVotes));
    const before = scanCriticalSets(original, { red: ['P3'], orange: [] });
    const after = scanCriticalSets(converted, { red: ['P3'], orange: [] });
    expect(exact(before.years[1]!.red!.votes)).not.toBe(
      exact(after.years[1]!.red!.votes),
    );
    expect(exact(before.years[1]!.red!.votes)).toBe(exact(originalVotes));
    expect(exact(after.years[1]!.red!.votes)).toBe(exact(convertedVotes));
  });
});
