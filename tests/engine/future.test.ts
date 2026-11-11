import futureSource from '../../src/engine/future.ts?raw';
import { describe, expect, it } from 'vitest';
import { evaluateCoalition } from '../../src/engine/coalitions';
import {
  buildCoalitionFuture,
  buildFutureReport,
  type CoalitionFuture,
  type FutureReport,
} from '../../src/engine/future';
import { compare, parseDecimal } from '../../src/engine/rational';
import { runSeats } from '../../src/engine/run';
import { LIMITS, validateScenario } from '../../src/engine/schema';
import { createPrng, millionths, randomInt, randomParts } from './helpers/prng';
import {
  buildScenario,
  groupInput,
  partyInput,
  partyModeKnownPopulationInput,
  rulesInput,
  scenarioInput,
  section8Input,
  type Json,
} from './helpers/scenarios';

/** Section 14.2 fixture: A = 600 at 50% turnout, B = 400 at 100%. */
function twoGroupInput(growthA = '0', turnoutChangeA = '0'): Json {
  return scenarioInput({
    rules: rulesInput({ populationTotal: '1000', seatCount: 10 }),
    parties: [partyInput('X', null, 1), partyInput('Y', null, 2)],
    groups: [
      groupInput(
        'A',
        '0.6',
        { X: '0.8', Y: '0.2' },
        { turnout: '0.5', growthRate: growthA, turnoutChange: turnoutChangeA },
      ),
      groupInput('B', '0.4', { X: '0.2', Y: '0.8' }, { turnout: '1' }),
    ],
  });
}

function future(json: Json, year: number): FutureReport {
  const scenario = buildScenario(json);
  return buildFutureReport(
    scenario,
    runSeats(scenario),
    runSeats(scenario, year),
    year,
  );
}

describe('Section 14.2 fixture in year 1', () => {
  const report = future(twoGroupInput('0.1'), 1);

  it('echoes the year and the allocation of both years', () => {
    expect(report.year).toBe(1);
    expect(report.noAllocation).toEqual({ baseline: null, current: null });
  });

  it('shows the totals of year 0 beside year 1', () => {
    expect(report.totals.population).toEqual({
      baseline: '1000',
      current: '1060',
      change: '60',
    });
    expect(report.totals.cast).toEqual({
      baseline: '700',
      current: '730',
      change: '30',
    });
    expect(report.totals.turnout).toEqual({
      baseline: '70.00',
      current: '68.87',
      change: '-1.13',
    });
  });

  it('shows each group population and turnout', () => {
    expect(report.groups).toEqual([
      {
        groupId: 'A',
        name: 'Group A',
        population: { baseline: '600', current: '660', change: '60' },
        turnout: { baseline: '50.00', current: '50.00', change: '0.00' },
      },
      {
        groupId: 'B',
        name: 'Group B',
        population: { baseline: '400', current: '400', change: '0' },
        turnout: { baseline: '100.00', current: '100.00', change: '0.00' },
      },
    ]);
  });

  it('shows each party votes, vote share and seats', () => {
    const [x, y] = report.parties;
    expect(x?.partyId).toBe('X');
    expect(x?.votes).toEqual({ baseline: '320', current: '344', change: '24' });
    expect(x?.voteShare).toEqual({
      baseline: '45.71',
      current: '47.12',
      change: '1.41',
    });
    expect(x?.seats).toEqual({ baseline: 5, current: 5, change: 0 });
    expect(y?.votes).toEqual({ baseline: '380', current: '386', change: '6' });
    expect(y?.seats).toEqual({ baseline: 5, current: 5, change: 0 });
    expect(report.parties.every((row) => row.presence === 'both')).toBe(true);
  });
});

describe('party-mode future group populations', () => {
  it.each([
    [0, '1000', '0'],
    [1, '1100', '100'],
  ] as const)(
    'reports known and zero populations in year %i',
    (year, current, change) => {
      const validation = validateScenario(partyModeKnownPopulationInput());
      if (!validation.ok || validation.scenario.inputMode !== 'parties') {
        throw new Error('expected a valid party-mode scenario');
      }
      const scenario = validation.scenario;
      const base = runSeats(scenario);
      const projected = runSeats(scenario, year);
      if ('kind' in projected) {
        throw new Error(
          `unexpected unavailable projection: ${projected.reason}`,
        );
      }
      const report = buildFutureReport(scenario, base, projected, year);

      expect(report.totals.population).toEqual({
        baseline: '1000',
        current,
        change,
      });
      expect(report.groups.map((group) => group.population)).toEqual([
        { baseline: '1000', current, change },
        { baseline: '0', current: '0', change: '0' },
      ]);
    },
  );

  it('does not invent a population when party composition is unknown', () => {
    const input = partyModeKnownPopulationInput();
    const parties = input.parties as Json[];
    const validation = validateScenario({
      ...input,
      parties: [{ ...parties[0], composition: null }],
    });
    if (!validation.ok || validation.scenario.inputMode !== 'parties') {
      throw new Error('expected a valid party-mode scenario');
    }

    const scenario = validation.scenario;
    const base = runSeats(scenario);
    const report = buildFutureReport(scenario, base, base, 0);
    expect(report.groups.map((group) => group.population)).toEqual([
      { baseline: null, current: null, change: null },
      { baseline: null, current: null, change: null },
    ]);
    expect(runSeats(scenario, 1)).toEqual({
      kind: 'unavailable',
      reason: 'unknown-party-composition',
    });
  });

  it('does not treat zero turnout and zero votes as a known empty group', () => {
    const input = partyModeKnownPopulationInput();
    const groups = input.groups as Json[];
    const validation = validateScenario({
      ...input,
      groups: groups.map((group) =>
        group.id === 'G2' ? { ...group, turnout: '0' } : group,
      ),
    });
    if (!validation.ok || validation.scenario.inputMode !== 'parties') {
      throw new Error('expected a valid party-mode scenario');
    }
    expect(runSeats(validation.scenario, 1)).toEqual({
      kind: 'unavailable',
      reason: 'unknown-population',
    });
  });
});

describe('turnout change', () => {
  it('shows the clamped turnout of the year', () => {
    const report = future(twoGroupInput('0', '0.1'), 6);
    expect(report.groups[0]?.turnout).toEqual({
      baseline: '50.00',
      current: '100.00',
      change: '50.00',
    });
    expect(report.groups[0]?.population.change).toBe('0');
  });

  it('can lower a group turnout to zero', () => {
    const report = future(twoGroupInput('0', '-0.1'), 5);
    expect(report.groups[0]?.turnout.current).toBe('0.00');
    expect(report.totals.cast.current).toBe('400');
  });
});

describe('year 0', () => {
  it('changes nothing', () => {
    const report = future(twoGroupInput('0.1', '0.02'), 0);
    for (const row of [
      report.totals.population,
      report.totals.cast,
      report.totals.turnout,
      ...report.groups.flatMap((group) => [group.population, group.turnout]),
      ...report.parties.flatMap((party) => [party.votes, party.voteShare]),
    ]) {
      expect(row.baseline).toBe(row.current);
      expect(row.change ?? '').toMatch(/^0(\.0+)?$/);
    }
    for (const party of report.parties) {
      expect(party.seats.change).toBe(0);
    }
  });

  it('matches the section 8 seats in both columns', () => {
    const report = future(section8Input(), 0);
    expect(report.parties.map((party) => party.seats.current)).toEqual([
      46, 50, 18, 6,
    ]);
  });
});

describe('no allocation in the future', () => {
  it('reports it for the year without dropping year 0', () => {
    const json = scenarioInput({
      rules: rulesInput({ populationTotal: '1000', seatCount: 10 }),
      parties: [partyInput('X', null, 1)],
      groups: [groupInput('A', '1', { X: '1' }, { growthRate: '-1' })],
    });
    const report = future(json, 1);
    expect(report.noAllocation).toEqual({
      baseline: null,
      current: 'no-valid-votes',
    });
    expect(report.parties[0]?.seats).toEqual({
      baseline: 10,
      current: null,
      change: null,
    });
    expect(report.parties[0]?.voteShare.current).toBeNull();
    expect(report.totals.turnout.current).toBe('0.00');
  });
});

/**
 * M2-30 fixture: A = 500 all for X, growing 10% a year; B = 500 split Y 60%,
 * Z 40%. Year 0 gives X 5, Y 3, Z 2 of 10. In year 3 A = 665.5, the quotas
 * are X 5.710, Y 2.574, Z 1.716 and the two remainder seats go to Z then X:
 * X 6, Y 2, Z 2.
 */
function coalitionInput(
  options: {
    seatCount?: number;
    growthA?: string;
    growthB?: string;
    zJoins?: boolean;
    incompatible?: string[][];
  } = {},
): Json {
  return scenarioInput({
    rules: rulesInput({
      populationTotal: '1000',
      seatCount: options.seatCount ?? 10,
    }),
    parties: [
      partyInput('X', null, 1),
      partyInput('Y', null, 2),
      partyInput('Z', null, 3, options.zJoins ?? true),
    ],
    groups: [
      groupInput(
        'A',
        '0.5',
        { X: '1' },
        { growthRate: options.growthA ?? '0.1' },
      ),
      groupInput(
        'B',
        '0.5',
        { Y: '0.6', Z: '0.4' },
        options.growthB === undefined ? {} : { growthRate: options.growthB },
      ),
    ],
    coalitionRules: { incompatiblePartyPairs: options.incompatible ?? [] },
  });
}

function coalitionFuture(
  json: Json,
  year: number,
  partyIds: readonly string[],
): CoalitionFuture {
  const scenario = buildScenario(json);
  return buildCoalitionFuture(
    scenario,
    runSeats(scenario),
    runSeats(scenario, year),
    partyIds,
  );
}

function seatsOf(json: Json, year: number): Record<string, number> {
  const result = runSeats(buildScenario(json), year);
  return Object.fromEntries(
    result.allocation.parties.map((party) => [party.partyId, party.seats]),
  );
}

describe('coalition future fixture (M2-30)', () => {
  it('allocates the hand-checked seats in year 0 and year 3', () => {
    expect(seatsOf(coalitionInput(), 0)).toEqual({ X: 5, Y: 3, Z: 2 });
    expect(seatsOf(coalitionInput(), 3)).toEqual({ X: 6, Y: 2, Z: 2 });
    expect(seatsOf(coalitionInput({ seatCount: 11 }), 0)).toEqual({
      X: 6,
      Y: 3,
      Z: 2,
    });
  });
});

describe('coalition future of one party set', () => {
  it('shows a party that gains the majority by year 3', () => {
    expect(coalitionFuture(coalitionInput(), 3, ['X'])).toEqual({
      partyIds: ['X'],
      members: [
        {
          partyId: 'X',
          name: 'Party X',
          color: '#336699',
          seats: { baseline: 5, current: 6, change: 1 },
        },
      ],
      seatCount: 10,
      majority: 6,
      majorityStop: '60.00',
      base: {
        seats: 5,
        reachesMajority: false,
        noAllocation: null,
        stops: ['50.00'],
        missing: 1,
        voteShare: '50.0',
      },
      projected: {
        seats: 6,
        reachesMajority: true,
        noAllocation: null,
        stops: ['60.00'],
        missing: 0,
        voteShare: '57.1',
      },
      seats: { baseline: 5, current: 6, change: 1 },
      ineligiblePartyIds: [],
      forbiddenPairs: [],
    });
  });

  it('gives cumulative stops in scenario order', () => {
    const result = coalitionFuture(coalitionInput(), 3, ['Y', 'X']);
    expect(result.partyIds).toEqual(['X', 'Y']);
    expect(result.members.map((member) => member.partyId)).toEqual(['X', 'Y']);
    expect(result.base.stops).toEqual(['50.00', '80.00']);
    expect(result.projected.stops).toEqual(['60.00', '80.00']);
    expect(result.members.map((member) => member.seats)).toEqual([
      { baseline: 5, current: 6, change: 1 },
      { baseline: 3, current: 2, change: -1 },
    ]);
    expect(result.seats).toEqual({ baseline: 8, current: 8, change: 0 });
  });

  it('shows a coalition that loses the majority', () => {
    const result = coalitionFuture(coalitionInput(), 3, ['Y', 'Z']);
    expect(result.seats).toEqual({ baseline: 5, current: 4, change: -1 });
    expect(result.base.reachesMajority).toBe(false);
    expect(result.projected.reachesMajority).toBe(false);
  });

  it('reaches an odd-seat majority exactly', () => {
    const result = coalitionFuture(coalitionInput({ seatCount: 11 }), 0, ['X']);
    expect(result.majority).toBe(6);
    expect(result.majorityStop).toBe('54.55');
    expect(result.base.seats).toBe(6);
    expect(result.base.reachesMajority).toBe(true);
    expect(result.base.stops).toEqual(['54.55']);
  });

  it('does not depend on the order or repeats of the IDs', () => {
    const json = coalitionInput();
    expect(coalitionFuture(json, 3, ['Z', 'X'])).toEqual(
      coalitionFuture(json, 3, ['X', 'Z']),
    );
    expect(coalitionFuture(json, 3, ['X', 'X']).partyIds).toEqual(['X']);
  });

  it('shows the same seats twice for year 0', () => {
    const scenario = buildScenario(coalitionInput());
    const base = runSeats(scenario);
    const result = buildCoalitionFuture(scenario, base, base, ['X', 'Z']);
    expect(result.projected).toEqual(result.base);
    expect(result.seats).toEqual({ baseline: 7, current: 7, change: 0 });
  });

  it('gives an empty set no seats and no majority', () => {
    const result = coalitionFuture(coalitionInput(), 3, []);
    expect(result.partyIds).toEqual([]);
    expect(result.members).toEqual([]);
    expect(result.seats).toEqual({ baseline: 0, current: 0, change: 0 });
    expect(result.base).toEqual({
      seats: 0,
      reachesMajority: false,
      noAllocation: null,
      stops: [],
      missing: 6,
      voteShare: '0.0',
    });
  });

  it('refuses an unknown party', () => {
    expect(() => coalitionFuture(coalitionInput(), 3, ['X', 'Q'])).toThrow('Q');
  });

  it('reports a year without an allocation', () => {
    const json = coalitionInput({ growthA: '-1', growthB: '-1' });
    const result = coalitionFuture(json, 1, ['X', 'Y']);
    expect(result.base.seats).toBe(8);
    expect(result.projected).toEqual({
      seats: null,
      reachesMajority: false,
      noAllocation: 'no-valid-votes',
      stops: ['0.00', '0.00'],
      missing: null,
      voteShare: null,
    });
    expect(result.seats).toEqual({ baseline: 8, current: null, change: null });
    expect(result.members[0]?.seats).toEqual({
      baseline: 5,
      current: null,
      change: null,
    });
  });

  it('reports the coalition rule breaches of the set', () => {
    const json = coalitionInput({
      zJoins: false,
      incompatible: [['X', 'Y']],
    });
    const scenario = buildScenario(json);
    const base = runSeats(scenario);
    const result = buildCoalitionFuture(scenario, base, runSeats(scenario, 3), [
      'Z',
      'Y',
      'X',
    ]);
    expect(result.ineligiblePartyIds).toEqual(['Z']);
    expect(result.forbiddenPairs).toEqual(
      evaluateCoalition(scenario, base.allocation, ['X', 'Y', 'Z'])
        .forbiddenPairs,
    );
    expect(result.forbiddenPairs).toHaveLength(1);
  });
});

describe('coalition future seat correctness', () => {
  function randomInput(next: () => number): Json {
    const partyCount = randomInt(next, 2, 5);
    const groupCount = randomInt(next, 1, 3);
    const ids = Array.from({ length: partyCount }, (_, index) => `P${index}`);
    const shares = randomParts(next, groupCount, 1_000_000);
    return scenarioInput({
      rules: rulesInput({
        populationTotal: '1000000',
        seatCount: randomInt(next, 5, 40),
      }),
      parties: ids.map((id, index) => partyInput(id, null, index + 1)),
      groups: shares.map((share, index) => {
        const weights = randomParts(next, partyCount, 1_000_000);
        return groupInput(
          `G${index}`,
          millionths(share),
          Object.fromEntries(
            ids.map((id, at) => [id, millionths(weights[at] ?? 0)]),
          ),
          { growthRate: millionths(randomInt(next, 0, 100_000)) },
        );
      }),
    });
  }

  it('agrees with the allocation and the coalition evaluation', () => {
    const next = createPrng(2030);
    for (let run = 0; run < 60; run += 1) {
      const scenario = buildScenario(randomInput(next));
      const year = randomInt(next, 0, LIMITS.projectionYears);
      const base = runSeats(scenario);
      const projected = runSeats(scenario, year);
      const ids = scenario.parties
        .map((party) => party.id)
        .filter(() => next() < 0.5);
      const result = buildCoalitionFuture(scenario, base, projected, ids);

      for (const [seatResult, view] of [
        [base, result.base],
        [projected, result.projected],
      ] as const) {
        if (seatResult.allocation.noAllocation !== null) {
          continue;
        }
        const others = seatResult.allocation.parties
          .filter((party) => !ids.includes(party.partyId))
          .reduce((sum, party) => sum + party.seats, 0);
        expect((view.seats ?? 0) + others).toBe(scenario.rules.seatCount);
        const evaluation = evaluateCoalition(
          scenario,
          seatResult.allocation,
          ids,
        );
        expect(view.seats).toBe(evaluation.seats);
        expect(view.reachesMajority).toBe(evaluation.reachesMajority);
        expect(view.stops).toHaveLength(ids.length);
        let previous = parseDecimal('0');
        for (const stop of view.stops) {
          const value = parseDecimal(stop);
          expect(compare(value, previous)).toBeGreaterThanOrEqual(0);
          previous = value;
        }
        expect(compare(previous, parseDecimal('100'))).toBeLessThanOrEqual(0);
      }
    }
  });

  it('is deterministic and survives a JSON round trip', () => {
    const json = coalitionInput();
    const first = coalitionFuture(json, 3, ['X', 'Z']);
    const second = coalitionFuture(
      JSON.parse(JSON.stringify(json)) as Json,
      3,
      ['X', 'Z'],
    );
    expect(second).toEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });
});

describe('year bounds', () => {
  it.each([-1, LIMITS.projectionYears + 1, 2.5])('refuses %s', (year) => {
    const scenario = buildScenario(twoGroupInput());
    const seats = runSeats(scenario);
    expect(() => buildFutureReport(scenario, seats, seats, year)).toThrow(
      RangeError,
    );
  });

  it('accepts the last year', () => {
    expect(future(twoGroupInput('0.01'), LIMITS.projectionYears).year).toBe(50);
  });
});

describe('source constraints', () => {
  it('does not use floating point or locale APIs', () => {
    for (const token of [
      'parseFloat',
      'Number(',
      'Math.',
      'toFixed',
      'toLocaleString',
      'localeCompare',
    ]) {
      expect(futureSource).not.toContain(token);
    }
  });
});
