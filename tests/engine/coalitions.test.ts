import coalitionsSource from '../../src/engine/coalitions.ts?raw';
import { describe, expect, it } from 'vitest';
import {
  allocateSeats,
  type AllocationResult,
} from '../../src/engine/allocate';
import {
  analyzeCoalitions,
  BLOCKED_NODE_BUDGET,
  blockedMajorities,
  effectiveForbiddenPairs,
  evaluateCoalition,
  largerCoalitions,
  majorityRequired,
  pivotalParties,
  PROGRESS_INTERVAL,
  type BlockedMajority,
  type BlockedMajorityResult,
  type Coalition,
  type CoalitionAnalysis,
  type PivotalParty,
} from '../../src/engine/coalitions';
import type { Scenario } from '../../src/engine/schema';
import { runScenario, runSeats, serializeResult } from '../../src/engine/run';
import { applyThreshold } from '../../src/engine/threshold';
import { computeVotes } from '../../src/engine/votes';
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

interface Fixture {
  readonly scenario: Scenario;
  readonly allocation: AllocationResult;
}

function pipeline(input: Json): Fixture {
  const scenario = buildScenario(input);
  const threshold = applyThreshold(scenario, computeVotes(scenario));
  return { scenario, allocation: allocateSeats(scenario, threshold) };
}

interface FixtureOptions {
  readonly ineligible?: readonly string[];
  readonly blocks?: Record<string, readonly string[]>;
  readonly partyPairs?: readonly (readonly [string, string])[];
  readonly blockPairs?: readonly (readonly [string, string])[];
  readonly overrides?: readonly (readonly [string, string])[];
  readonly refusals?: readonly (readonly [string, string])[];
  readonly majorityOverride?: number;
}

/** Parties P1..Pn holding the given seats; the vote data is irrelevant here. */
function seatsFixture(
  seatList: readonly number[],
  options: FixtureOptions = {},
): Fixture {
  const ids = seatList.map((_, index) => `P${index + 1}`);
  const blockOf = (id: string): string | null => {
    for (const [blockId, members] of Object.entries(options.blocks ?? {})) {
      if (members.includes(id)) {
        return blockId;
      }
    }
    return null;
  };
  const seatCount = Math.max(
    1,
    seatList.reduce((total, value) => total + value, 0),
  );
  const scenario = buildScenario(
    scenarioInput({
      blocks: Object.keys(options.blocks ?? {}).map((id) => ({
        id,
        name: `Block ${id}`,
        color: '#445566',
      })),
      parties: ids.map((id, index) =>
        partyInput(
          id,
          blockOf(id),
          index + 1,
          !(options.ineligible ?? []).includes(id),
        ),
      ),
      groups: [
        groupInput(
          'G',
          '1',
          Object.fromEntries(
            ids.map((id, index) => [id, index === 0 ? '1' : '0']),
          ),
        ),
      ],
      rules: rulesInput(
        options.majorityOverride === undefined
          ? { seatCount }
          : {
              seatCount,
              majorityMode: 'override',
              majorityOverride: options.majorityOverride,
            },
      ),
      coalitionRules: {
        incompatiblePartyPairs: options.partyPairs ?? [],
        incompatibleBlockPairs: options.blockPairs ?? [],
        compatiblePartyOverrides: options.overrides ?? [],
        partyRefusals: options.refusals ?? [],
      },
    }),
  );
  const allocation: AllocationResult = {
    seatCount,
    noAllocation: null,
    parties: ids.map((partyId, index) => ({
      partyId,
      quota: null,
      floorSeats: seatList[index] ?? 0,
      remainder: null,
      remainderSeat: false,
      seats: seatList[index] ?? 0,
    })),
    blocks: [],
    cutoffTie: false,
  };
  return { scenario, allocation };
}

function analyze(fixture: Fixture, nodeBudget?: number): CoalitionAnalysis {
  return analyzeCoalitions(
    fixture.scenario,
    fixture.allocation,
    nodeBudget === undefined ? {} : { nodeBudget },
  );
}

function summary(analysis: CoalitionAnalysis): string[] {
  return rows(analysis.minimalWinning);
}

function rows(list: readonly Coalition[]): string[] {
  return list.map(
    (coalition) =>
      `${coalition.partyIds.join('+')}=${coalition.seats}/${coalition.margin}/${coalition.opposition}`,
  );
}

/** "members=seats|forbidden pairs|ineligible members" for each blocked majority. */
function reasons(list: readonly BlockedMajority[]): string[] {
  return list.map(
    (entry) =>
      `${entry.partyIds.join('+')}=${entry.seats}|${entry.forbiddenPairs
        .map((pair) => pair.partyIds.join('-'))
        .join(',')}|${entry.ineligiblePartyIds.join(',')}`,
  );
}

/** "party=coalitions/indispensable" for each pivotal row; null prints as null. */
function pivotal(list: readonly PivotalParty[]): string[] {
  return list.map(
    (row) => `${row.partyId}=${row.coalitions}/${String(row.indispensable)}`,
  );
}

function larger(fixture: Fixture): Coalition[] {
  return largerCoalitions(
    fixture.scenario,
    fixture.allocation,
    analyze(fixture).minimalWinning,
  );
}

function blocked(fixture: Fixture, nodeBudget?: number): BlockedMajorityResult {
  return blockedMajorities(
    fixture.scenario,
    fixture.allocation,
    nodeBudget === undefined ? {} : { nodeBudget },
  );
}

/** Section 8 coalition rules over given seats: Party 3 out, Parties 1 and 2 apart. */
function section8Seats(seatList: readonly number[]): Fixture {
  return seatsFixture(seatList, {
    ineligible: ['P3'],
    partyPairs: [['P1', 'P2']],
  });
}

function noAllocationFixture(): Fixture {
  const input = section8Input();
  for (const group of input.groups as Json[]) {
    group.turnout = '0';
  }
  return pipeline(input);
}

describe('majority', () => {
  it('defaults to half the seats rounded down plus one', () => {
    expect(majorityRequired(seatsFixture([60, 60]).scenario)).toBe(61);
    expect(majorityRequired(seatsFixture([60, 61]).scenario)).toBe(61);
    expect(majorityRequired(seatsFixture([1]).scenario)).toBe(1);
    expect(majorityRequired(seatsFixture([1, 1]).scenario)).toBe(2);
  });

  it('uses an explicit override and reports it', () => {
    const fixture = seatsFixture([60, 60], { majorityOverride: 70 });
    expect(majorityRequired(fixture.scenario)).toBe(70);
    const analysis = analyze(fixture);
    expect(analysis.majorityRequired).toBe(70);
    expect(analysis.majorityOverridden).toBe(true);
    expect(analyze(seatsFixture([60, 60])).majorityOverridden).toBe(false);
  });
});

describe('effective rules', () => {
  it('expands block pairs to member pairs and applies overrides', () => {
    const fixture = seatsFixture([10, 10, 10, 10], {
      blocks: { B1: ['P1', 'P3'], B2: ['P2'] },
      blockPairs: [['B2', 'B1']],
      partyPairs: [['P4', 'P1']],
      overrides: [['P3', 'P2']],
    });
    expect(effectiveForbiddenPairs(fixture.scenario)).toEqual([
      { partyIds: ['P1', 'P2'], source: 'block', refusedBy: [] },
      { partyIds: ['P1', 'P4'], source: 'party', refusedBy: [] },
    ]);
  });

  it('reports a pair forbidden by both rules once, as a party rule', () => {
    const fixture = seatsFixture([10, 10], {
      blocks: { B1: ['P1'], B2: ['P2'] },
      blockPairs: [['B1', 'B2']],
      partyPairs: [['P2', 'P1']],
    });
    expect(effectiveForbiddenPairs(fixture.scenario)).toEqual([
      { partyIds: ['P1', 'P2'], source: 'party', refusedBy: [] },
    ]);
  });

  it('lets a new block member inherit the block default', () => {
    const fixture = seatsFixture([40, 40, 41], {
      blocks: { B1: ['P1', 'P3'], B2: ['P2'] },
      blockPairs: [['B1', 'B2']],
    });
    const analysis = analyze(fixture);
    expect(analysis.forbiddenPairs.map((pair) => pair.partyIds)).toEqual([
      ['P1', 'P2'],
      ['P2', 'P3'],
    ]);
    expect(summary(analysis)).toEqual(['P1+P3=81/20/40']);
  });
});

/** JSON of a result with the refusers left out of every forbidden pair. */
function withoutRefusers(value: unknown): string {
  return JSON.stringify(value, (key, item: unknown) =>
    key === 'refusedBy' ? undefined : item,
  );
}

describe('party refusals', () => {
  const refusedP1P2 = {
    partyIds: ['P1', 'P2'],
    source: 'party',
    refusedBy: ['P2'],
  };

  it('forbids a refused pair as a party rule and names the refuser', () => {
    const fixture = seatsFixture([10, 10, 10], { refusals: [['P3', 'P1']] });
    expect(effectiveForbiddenPairs(fixture.scenario)).toEqual([
      { partyIds: ['P1', 'P3'], source: 'party', refusedBy: ['P3'] },
    ]);
  });

  it('names both refusers in party order whatever the list order', () => {
    const fixture = seatsFixture([10, 10, 10], {
      refusals: [
        ['P3', 'P1'],
        ['P1', 'P3'],
      ],
    });
    expect(effectiveForbiddenPairs(fixture.scenario)).toEqual([
      { partyIds: ['P1', 'P3'], source: 'party', refusedBy: ['P1', 'P3'] },
    ]);
  });

  it('reports a refused pair that blocks also forbid once, as a party rule', () => {
    const fixture = seatsFixture([10, 10], {
      blocks: { B1: ['P1'], B2: ['P2'] },
      blockPairs: [['B1', 'B2']],
      refusals: [['P2', 'P1']],
    });
    expect(effectiveForbiddenPairs(fixture.scenario)).toEqual([refusedP1P2]);
  });

  it('keeps an explicit pair and a refusal of it as one entry with the refuser', () => {
    const fixture = seatsFixture([10, 10], {
      partyPairs: [['P1', 'P2']],
      refusals: [['P2', 'P1']],
    });
    expect(effectiveForbiddenPairs(fixture.scenario)).toEqual([refusedP1P2]);
  });

  it('never lets an override lift a refusal', () => {
    const fixture = seatsFixture([10, 10], {
      blocks: { B1: ['P1'], B2: ['P2'] },
      blockPairs: [['B1', 'B2']],
      refusals: [['P2', 'P1']],
    });
    const scenario: Scenario = {
      ...fixture.scenario,
      coalitionRules: {
        ...fixture.scenario.coalitionRules,
        compatiblePartyOverrides: [['P1', 'P2']],
      },
    };
    expect(effectiveForbiddenPairs(scenario)).toEqual([refusedP1P2]);
  });

  it('rules out what the incompatible pair rules out, in either direction', () => {
    const seats = [40, 35, 25, 10];
    const explicit = seatsFixture(seats, { partyPairs: [['P1', 'P2']] });
    for (const refusal of [
      ['P1', 'P2'],
      ['P2', 'P1'],
    ] as const) {
      const refused = seatsFixture(seats, { refusals: [refusal] });
      expect(withoutRefusers(analyze(refused))).toBe(
        withoutRefusers(analyze(explicit)),
      );
      expect(withoutRefusers(blocked(refused))).toBe(
        withoutRefusers(blocked(explicit)),
      );
      expect(rows(larger(refused))).toEqual(rows(larger(explicit)));
      expect(analyze(refused).forbiddenPairs).toEqual([
        { partyIds: ['P1', 'P2'], source: 'party', refusedBy: [refusal[0]] },
      ]);
    }
  });

  it('names the refuser in the blocked reasons and the evaluation', () => {
    const fixture = seatsFixture([40, 35, 25, 10], {
      refusals: [['P2', 'P1']],
    });
    const result = blocked(fixture);
    expect(reasons(result.blocked)).toEqual(['P1+P2=75|P1-P2|']);
    expect(result.blocked[0]?.forbiddenPairs).toEqual([refusedP1P2]);
    const evaluation = evaluateCoalition(fixture.scenario, fixture.allocation, [
      'P2',
      'P1',
    ]);
    expect(evaluation.reachesMajority).toBe(true);
    expect(evaluation.feasible).toBe(false);
    expect(evaluation.forbiddenPairs).toEqual([refusedP1P2]);
  });

  it('never changes votes, threshold or seats, and acts like the same pairs made explicit', () => {
    const next = createPrng(33_2026_10_30);
    let refusedCases = 0;
    for (let iteration = 0; iteration < 200; iteration += 1) {
      const partyCount = randomInt(next, 2, 8);
      const ids = Array.from(
        { length: partyCount },
        (_, index) => `P${index + 1}`,
      );
      const firstShare = randomInt(next, 1, 999_999);
      const groups = [firstShare, 1_000_000 - firstShare].map(
        (share, index) => {
          const weights = randomParts(next, partyCount, 1_000_000);
          return groupInput(
            `G${index + 1}`,
            millionths(share),
            Object.fromEntries(
              ids.map((id, k) => [id, millionths(weights[k] ?? 0)]),
            ),
            { turnout: millionths(randomInt(next, 0, 1_000_000)) },
          );
        },
      );
      const rules = rulesInput({
        seatCount: randomInt(next, 1, 120),
        threshold: ['0', '0.0325', '0.1'][randomInt(next, 0, 2)],
      });
      const parties = ids.map((id, index) =>
        partyInput(id, null, index + 1, next() > 0.15),
      );
      const refusals: [string, string][] = [];
      const explicit = new Map<string, [string, string]>();
      ids.forEach((a, x) =>
        ids.forEach((b, y) => {
          if (x !== y && next() < 0.2) {
            refusals.push([a, b]);
            explicit.set(
              x < y ? `${a}|${b}` : `${b}|${a}`,
              x < y ? [a, b] : [b, a],
            );
          }
        }),
      );
      const build = (coalitionRules: Json): Scenario =>
        buildScenario(
          scenarioInput({ groups, parties, rules, coalitionRules }),
        );
      const plain = build({});
      const refused = build({ partyRefusals: refusals });
      const made = build({ incompatiblePartyPairs: [...explicit.values()] });

      const seats = serializeResult(runSeats(plain));
      expect(serializeResult(runSeats(refused))).toBe(seats);
      expect(serializeResult(runSeats(made))).toBe(seats);
      const result = runScenario(refused);
      if (result.allocation.noAllocation === null) {
        expect(
          result.allocation.parties.reduce(
            (total, party) => total + party.seats,
            0,
          ),
        ).toBe(result.allocation.seatCount);
      }
      expect(withoutRefusers(result.coalitions)).toBe(
        withoutRefusers(runScenario(made).coalitions),
      );
      refusedCases += result.coalitions.forbiddenPairs.length > 0 ? 1 : 0;
    }
    expect(refusedCases).toBeGreaterThan(100);
  });
});

describe('Section 8 coalitions', () => {
  it('finds no permitted majority in the baseline', () => {
    const fixture = pipeline(section8Input());
    const analysis = analyze(fixture);
    expect(analysis.majorityRequired).toBe(61);
    expect(analysis.eligiblePartyIds).toEqual(['P1', 'P2', 'P4']);
    expect(analysis.minimalWinning).toEqual([]);
    expect(analysis.complete).toBe(true);
    expect(analysis.status).toBe('deadlock');
  });

  it('finds both rival alternatives with Party 4 at zero Group 3 turnout', () => {
    const analysis = analyze(pipeline(section8Input('0')));
    expect(summary(analysis)).toEqual(['P2+P4=66/5/54', 'P1+P4=61/0/59']);
    expect(analysis.status).toBe('feasible');
    expect(analysis.balancingPartyIds).toEqual(['P4']);
  });

  it('changes the baseline conclusion when Party 3 may govern', () => {
    const input = section8Input();
    (input.parties as Json[])[2]!.canJoinGovernment = true;
    const analysis = analyze(pipeline(input));
    expect(summary(analysis)).toEqual(['P2+P3=68/7/52', 'P1+P3=64/3/56']);
    expect(analysis.balancingPartyIds).toEqual(['P3']);
  });
});

describe('minimal winning coalitions', () => {
  it('excludes supersets of winning coalitions', () => {
    const analysis = analyze(seatsFixture([60, 30, 30]));
    expect(summary(analysis)).toEqual(['P1+P2=90/29/30', 'P1+P3=90/29/30']);
  });

  it('lets a single majority party govern alone', () => {
    const analysis = analyze(seatsFixture([70, 50]));
    expect(summary(analysis)).toEqual(['P1=70/9/50']);
    expect(analysis.balancingPartyIds).toEqual([]);
  });

  it('counts a coalition exactly at the majority as winning', () => {
    const analysis = analyze(seatsFixture([61, 59]));
    expect(summary(analysis)).toEqual(['P1=61/0/59']);
  });

  it('never includes ineligible or seatless parties', () => {
    const analysis = analyze(
      seatsFixture([50, 0, 40, 30], { ineligible: ['P3'] }),
    );
    expect(analysis.eligiblePartyIds).toEqual(['P1', 'P4']);
    expect(summary(analysis)).toEqual(['P1+P4=80/19/40']);
  });

  it('uses the override majority for the search', () => {
    const fixture = pipeline({
      ...section8Input(),
      rules: rulesInput({ majorityMode: 'override', majorityOverride: 50 }),
    });
    expect(summary(analyze(fixture))).toEqual(['P1+P4=52/2/68', 'P2=50/0/70']);
  });

  it('reports a complete deadlock when every pair is forbidden', () => {
    const analysis = analyze(
      seatsFixture([40, 40, 40], {
        partyPairs: [
          ['P1', 'P2'],
          ['P1', 'P3'],
          ['P2', 'P3'],
        ],
      }),
    );
    expect(analysis.status).toBe('deadlock');
    expect(analysis.complete).toBe(true);
  });
});

describe('no allocation and bounded search', () => {
  it('reports no allocation without coalitions', () => {
    const input = section8Input();
    for (const group of input.groups as Json[]) {
      group.turnout = '0';
    }
    const analysis = analyze(pipeline(input));
    expect(analysis.status).toBe('no-allocation');
    expect(analysis.noAllocation).toBe('no-valid-votes');
    expect(analysis.minimalWinning).toEqual([]);
    expect(analysis.majorityRequired).toBe(61);
  });

  it('marks more than 20 eligible parties as incomplete', () => {
    const analysis = analyze(
      seatsFixture([100, ...Array.from({ length: 20 }, () => 1)]),
    );
    expect(analysis.eligiblePartyIds).toHaveLength(21);
    expect(analysis.complete).toBe(false);
    expect(analysis.status).toBe('feasible');
    expect(summary(analysis)).toEqual(['P1=100/39/20']);
  });

  it('accepts exactly 20 eligible parties as complete', () => {
    const analysis = analyze(
      seatsFixture([100, ...Array.from({ length: 19 }, () => 1)]),
    );
    expect(analysis.complete).toBe(true);
  });

  it('reports unknown rather than deadlock when the budget runs out', () => {
    const analysis = analyze(pipeline(section8Input()), 1);
    expect(analysis.complete).toBe(false);
    expect(analysis.status).toBe('unknown');
    expect(analysis.nodesVisited).toBeLessThanOrEqual(1);
  });

  it('still reports feasible when a truncated search found a coalition', () => {
    const analysis = analyze(
      seatsFixture(Array.from({ length: 12 }, () => 10)),
      50,
    );
    expect(analysis.complete).toBe(false);
    expect(analysis.status).toBe('feasible');
    expect(analysis.minimalWinning.length).toBeGreaterThan(0);
  });
});

describe('search progress', () => {
  it('reports every 20,000 visited nodes', () => {
    expect(PROGRESS_INTERVAL).toBe(20_000);
  });

  it('reports multiples of the interval without changing the result', () => {
    const fixture = seatsFixture(Array.from({ length: 24 }, () => 5));
    const plain = analyze(fixture, 70_000);
    const calls: number[] = [];
    const observed = analyzeCoalitions(fixture.scenario, fixture.allocation, {
      nodeBudget: 70_000,
      onProgress: (nodes) => calls.push(nodes),
    });
    expect(observed).toEqual(plain);
    const expected = Array.from(
      { length: Math.floor(plain.nodesVisited / PROGRESS_INTERVAL) },
      (_, index) => (index + 1) * PROGRESS_INTERVAL,
    );
    expect(expected.length).toBeGreaterThanOrEqual(3);
    expect(calls).toEqual(expected);
  });

  it('stays silent for a search below the interval', () => {
    const calls: number[] = [];
    const fixture = pipeline(section8Input());
    const observed = analyzeCoalitions(fixture.scenario, fixture.allocation, {
      onProgress: (nodes) => calls.push(nodes),
    });
    expect(observed).toEqual(analyze(fixture));
    expect(calls).toEqual([]);
  });

  it('does not report when there is no allocation', () => {
    const input = section8Input();
    for (const group of input.groups as Json[]) {
      group.turnout = '0';
    }
    const calls: number[] = [];
    const fixture = pipeline(input);
    analyzeCoalitions(fixture.scenario, fixture.allocation, {
      onProgress: (nodes) => calls.push(nodes),
    });
    expect(calls).toEqual([]);
  });
});
describe('coalition evaluation on request', () => {
  it('evaluates a feasible minimal coalition', () => {
    const fixture = pipeline(section8Input('0'));
    const result = evaluateCoalition(fixture.scenario, fixture.allocation, [
      'P4',
      'P2',
    ]);
    expect(result).toEqual({
      partyIds: ['P2', 'P4'],
      seats: 66,
      margin: 5,
      opposition: 54,
      reachesMajority: true,
      ineligiblePartyIds: [],
      forbiddenPairs: [],
      feasible: true,
      minimal: true,
    });
  });

  it('explains why a combination is not feasible', () => {
    const fixture = pipeline(section8Input());
    const result = evaluateCoalition(fixture.scenario, fixture.allocation, [
      'P1',
      'P2',
      'P3',
    ]);
    expect(result.seats).toBe(114);
    expect(result.reachesMajority).toBe(true);
    expect(result.ineligiblePartyIds).toEqual(['P3']);
    expect(result.forbiddenPairs).toEqual([
      { partyIds: ['P1', 'P2'], source: 'party', refusedBy: [] },
    ]);
    expect(result.feasible).toBe(false);
    expect(result.minimal).toBe(false);
  });

  it('reports a negative margin below the majority', () => {
    const fixture = pipeline(section8Input());
    const result = evaluateCoalition(fixture.scenario, fixture.allocation, [
      'P2',
      'P4',
    ]);
    expect(result.seats).toBe(56);
    expect(result.margin).toBe(-5);
    expect(result.reachesMajority).toBe(false);
    expect(result.feasible).toBe(false);
  });

  it('ignores duplicates and rejects unknown party IDs', () => {
    const fixture = pipeline(section8Input('0'));
    expect(
      evaluateCoalition(fixture.scenario, fixture.allocation, [
        'P2',
        'P4',
        'P2',
      ]).seats,
    ).toBe(66);
    expect(() =>
      evaluateCoalition(fixture.scenario, fixture.allocation, ['P9']),
    ).toThrow('Unknown party "P9"');
  });
});

describe('larger coalitions', () => {
  it('adds one more compatible eligible party to each minimal winning coalition', () => {
    expect(rows(larger(seatsFixture([40, 30, 20, 10])))).toEqual([
      'P1+P2+P3+P4=100/49/0',
      'P1+P2+P3=90/39/10',
      'P1+P2+P4=80/29/20',
      'P1+P3+P4=70/19/30',
    ]);
  });

  it('keeps a coalition reached from two minimal ones once', () => {
    expect(
      rows(larger(seatsFixture([40, 30, 20, 10], { ineligible: ['P4'] }))),
    ).toEqual(['P1+P2+P3=90/39/10']);
  });

  it('skips a party forbidden with any member', () => {
    expect(
      rows(
        larger(seatsFixture([40, 30, 20, 10], { partyPairs: [['P2', 'P4']] })),
      ),
    ).toEqual(['P1+P2+P3=90/39/10', 'P1+P3+P4=70/19/30']);
  });

  it('never adds a party without seats', () => {
    expect(rows(larger(seatsFixture([60, 41, 0])))).toEqual(['P1+P2=101/50/0']);
  });

  it('orders equal seats by party position', () => {
    expect(rows(larger(seatsFixture([30, 30, 30, 10])))).toEqual([
      'P1+P2+P3=90/39/10',
      'P1+P2+P4=70/19/30',
      'P1+P3+P4=70/19/30',
      'P2+P3+P4=70/19/30',
    ]);
  });

  it('does not depend on the order of the minimal winning list', () => {
    const fixture = seatsFixture([40, 30, 20, 10]);
    const minimal = analyze(fixture).minimalWinning;
    expect(
      largerCoalitions(
        fixture.scenario,
        fixture.allocation,
        [...minimal].reverse(),
      ),
    ).toEqual(largerCoalitions(fixture.scenario, fixture.allocation, minimal));
  });

  it('returns nothing without minimal winning coalitions or an allocation', () => {
    const fixture = seatsFixture([40, 30, 20, 10]);
    expect(largerCoalitions(fixture.scenario, fixture.allocation, [])).toEqual(
      [],
    );
    const empty = noAllocationFixture();
    expect(
      largerCoalitions(
        empty.scenario,
        empty.allocation,
        analyze(pipeline(section8Input('0'))).minimalWinning,
      ),
    ).toEqual([]);
  });

  it('finds none in the four Section 8 presets', () => {
    for (const fixture of [
      pipeline(section8Input()),
      pipeline(section8Input('0')),
      section8Seats([50, 55, 8, 7]),
      section8Seats([49, 55, 10, 6]),
    ]) {
      expect(larger(fixture)).toEqual([]);
    }
  });

  it('lists bigger governments when Party 3 may govern', () => {
    const input = section8Input();
    (input.parties as Json[])[2]!.canJoinGovernment = true;
    expect(rows(larger(pipeline(input)))).toEqual([
      'P2+P3+P4=74/13/46',
      'P1+P3+P4=70/9/50',
    ]);
  });
});

describe('blocked majorities', () => {
  it('lists the three blocked pairs of the Section 8 baseline', () => {
    const result = blocked(pipeline(section8Input()));
    expect(result.complete).toBe(true);
    expect(reasons(result.blocked)).toEqual([
      'P1+P2=96|P1-P2|',
      'P2+P3=68||P3',
      'P1+P3=64||P3',
    ]);
    expect(rows(result.blocked)).toEqual([
      'P1+P2=96/35/24',
      'P2+P3=68/7/52',
      'P1+P3=64/3/56',
    ]);
    expect(result.blocked[0]?.forbiddenPairs).toEqual([
      { partyIds: ['P1', 'P2'], source: 'party', refusedBy: [] },
    ]);
  });

  it('lists only the rival pair at zero Group 3 turnout', () => {
    expect(reasons(blocked(pipeline(section8Input('0'))).blocked)).toEqual([
      'P1+P2=113|P1-P2|',
    ]);
  });

  it('names the three-party majority Party 3 blocks at 7% and 8%', () => {
    expect(reasons(blocked(section8Seats([50, 55, 8, 7])).blocked)).toEqual([
      'P1+P2=105|P1-P2|',
      'P1+P3+P4=65||P3',
      'P2+P3=63||P3',
    ]);
    expect(reasons(blocked(section8Seats([49, 55, 10, 6])).blocked)).toEqual([
      'P1+P2=104|P1-P2|',
      'P1+P3+P4=65||P3',
      'P2+P3=65||P3',
    ]);
  });

  it('gives both reasons when a majority breaks both rules', () => {
    const fixture = seatsFixture([20, 20, 20, 40], {
      ineligible: ['P3'],
      partyPairs: [['P2', 'P1']],
    });
    expect(reasons(blocked(fixture).blocked)).toEqual([
      'P1+P2+P3=60|P1-P2|P3',
      'P3+P4=60||P3',
    ]);
  });

  it('blocks a single-party majority that cannot govern', () => {
    expect(
      reasons(blocked(seatsFixture([70, 50], { ineligible: ['P1'] })).blocked),
    ).toEqual(['P1=70||P1']);
  });

  it('never lists a party without seats', () => {
    const fixture = seatsFixture([70, 0], {
      ineligible: ['P2'],
      partyPairs: [['P1', 'P2']],
    });
    expect(blocked(fixture).blocked).toEqual([]);
  });

  it('returns an empty complete result when there is no allocation', () => {
    expect(blocked(noAllocationFixture())).toEqual({
      blocked: [],
      complete: true,
      nodesVisited: 0,
    });
  });

  it('marks a search cut by its budget as incomplete', () => {
    const fixture = seatsFixture(
      Array.from({ length: 12 }, () => 10),
      { ineligible: ['P1'] },
    );
    const full = blocked(fixture);
    expect(full.complete).toBe(true);
    const cut = blocked(fixture, 50);
    expect(cut.complete).toBe(false);
    expect(cut.nodesVisited).toBeLessThanOrEqual(50);
    const known = new Set(reasons(full.blocked));
    expect(reasons(cut.blocked).every((row) => known.has(row))).toBe(true);
    expect(cut.blocked.length).toBeLessThan(full.blocked.length);
  });

  it('has its own default budget', () => {
    expect(BLOCKED_NODE_BUDGET).toBe(250_000);
    const result = blocked(pipeline(section8Input()));
    expect(result.nodesVisited).toBeGreaterThan(0);
    expect(result.nodesVisited).toBeLessThanOrEqual(BLOCKED_NODE_BUDGET);
  });
});

describe('pivotal parties', () => {
  it('counts each party in the zero Group 3 turnout alternatives', () => {
    const analysis = analyze(pipeline(section8Input('0')));
    expect(pivotal(pivotalParties(analysis))).toEqual([
      'P4=2/true',
      'P1=1/false',
      'P2=1/false',
    ]);
  });

  it('marks both members of the only 7% coalition as needed by every one', () => {
    const analysis = analyze(section8Seats([50, 55, 8, 7]));
    expect(summary(analysis)).toEqual(['P2+P4=62/1/58']);
    expect(pivotal(pivotalParties(analysis))).toEqual([
      'P2=1/true',
      'P4=1/true',
      'P1=0/false',
    ]);
  });

  it('needs no party in the complete baseline deadlock', () => {
    const analysis = analyze(pipeline(section8Input()));
    expect(analysis.status).toBe('deadlock');
    expect(pivotal(pivotalParties(analysis))).toEqual([
      'P1=0/false',
      'P2=0/false',
      'P4=0/false',
    ]);
  });

  it('lists every eligible party, Party 3 first, when Party 3 may govern', () => {
    const input = section8Input();
    (input.parties as Json[])[2]!.canJoinGovernment = true;
    const analysis = analyze(pipeline(input));
    expect(pivotal(pivotalParties(analysis))).toEqual([
      'P3=2/true',
      'P1=1/false',
      'P2=1/false',
      'P4=0/false',
    ]);
  });

  it('lists only government-eligible parties with seats', () => {
    const analysis = analyze(
      seatsFixture([50, 0, 40, 30], { ineligible: ['P3'] }),
    );
    expect(pivotal(pivotalParties(analysis))).toEqual([
      'P1=1/true',
      'P4=1/true',
    ]);
  });

  it('needs a single majority party in its own coalition', () => {
    const analysis = analyze(seatsFixture([70, 50]));
    expect(pivotal(pivotalParties(analysis))).toEqual([
      'P1=1/true',
      'P2=0/false',
    ]);
  });

  it('orders equal counts by the eligible list, not by party ID', () => {
    const analysis = analyze(seatsFixture([30, 30, 30, 30]));
    expect(pivotal(pivotalParties(analysis))).toEqual([
      'P1=3/false',
      'P2=3/false',
      'P3=3/false',
      'P4=3/false',
    ]);
    const reordered: CoalitionAnalysis = {
      ...analysis,
      eligiblePartyIds: ['P3', 'P1', 'P4', 'P2'],
    };
    expect(pivotal(pivotalParties(reordered))).toEqual([
      'P3=3/false',
      'P1=3/false',
      'P4=3/false',
      'P2=3/false',
    ]);
  });

  it('reports unknown, not yes, after a search with too many eligible parties', () => {
    const analysis = analyze(
      seatsFixture([100, ...Array.from({ length: 20 }, () => 1)]),
    );
    expect(analysis.complete).toBe(false);
    const rows = pivotalParties(analysis);
    expect(rows).toHaveLength(21);
    expect(pivotal(rows.slice(0, 2))).toEqual(['P1=1/null', 'P2=0/false']);
    expect(rows.slice(1).every((row) => row.indispensable === false)).toBe(
      true,
    );
  });

  it('gives lower-bound counts and unknown after a search cut by its budget', () => {
    const analysis = analyze(
      seatsFixture(Array.from({ length: 12 }, () => 10)),
      50,
    );
    expect(analysis.complete).toBe(false);
    const found = analysis.minimalWinning;
    expect(found.length).toBeGreaterThan(1);
    const rows = pivotalParties(analysis);
    for (const row of rows) {
      const count = found.filter((coalition) =>
        coalition.partyIds.includes(row.partyId),
      ).length;
      expect(row.coalitions, row.partyId).toBe(count);
      expect(row.indispensable, row.partyId).toBe(
        count === found.length ? null : false,
      );
    }
    expect(
      rows
        .filter((row) => row.indispensable === null)
        .map((row) => row.partyId),
    ).toEqual(['P1', 'P2', 'P3', 'P4', 'P5']);
  });

  it('reports unknown for every party when a cut search found nothing', () => {
    const analysis = analyze(pipeline(section8Input()), 1);
    expect(analysis.status).toBe('unknown');
    expect(analysis.minimalWinning).toEqual([]);
    expect(pivotal(pivotalParties(analysis))).toEqual([
      'P1=0/null',
      'P2=0/null',
      'P4=0/null',
    ]);
  });

  it('returns no rows when there is no allocation', () => {
    expect(pivotalParties(analyze(noAllocationFixture()))).toEqual([]);
  });

  it('does not change the analysis it reads', () => {
    const analysis = analyze(pipeline(section8Input('0')));
    const before = JSON.stringify(analysis);
    pivotalParties(analysis);
    expect(JSON.stringify(analysis)).toBe(before);
  });
});

describe('brute-force oracle', () => {
  function pairKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  interface RandomCase {
    readonly fixture: Fixture;
    readonly ids: readonly string[];
    readonly ineligible: readonly string[];
    readonly forbidden: ReadonlySet<string>;
    /** Pairs an explicit pair or a refusal forbids. */
    readonly partySourced: ReadonlySet<string>;
    /** Refusers of each refused pair, in party order. */
    readonly refusers: ReadonlyMap<string, readonly string[]>;
    readonly majority: number;
    readonly seatCount: number;
    readonly seatsOf: (id: string) => number;
  }

  function randomCase(next: () => number, withRefusals = false): RandomCase {
    const partyCount = randomInt(next, 1, 10);
    const total = randomInt(next, 1, 60);
    const seatList = randomParts(next, partyCount, total);
    const ids = seatList.map((_, index) => `P${index + 1}`);
    const ineligible = ids.filter(() => next() < 0.2);
    const blocks: Record<string, string[]> = { B1: [], B2: [], B3: [] };
    for (const id of ids) {
      const pick = randomInt(next, 0, 3);
      if (pick > 0) {
        blocks[`B${pick}`]!.push(id);
      }
    }
    const partyPairs: [string, string][] = [];
    const overrides: [string, string][] = [];
    const blockPairs: [string, string][] = [];
    const refusals: [string, string][] = [];
    for (let a = 0; a < ids.length; a += 1) {
      for (let b = a + 1; b < ids.length; b += 1) {
        const roll = next();
        const overridden = roll >= 0.15 && roll < 0.25;
        if (roll < 0.15) {
          partyPairs.push([ids[a]!, ids[b]!]);
        } else if (overridden) {
          overrides.push([ids[b]!, ids[a]!]);
        }
        if (withRefusals && !overridden) {
          const refusal = next();
          if (refusal >= 0.12 && refusal < 0.32) {
            refusals.push([ids[b]!, ids[a]!]);
          }
          if (refusal < 0.12 || (refusal >= 0.24 && refusal < 0.32)) {
            refusals.push([ids[a]!, ids[b]!]);
          }
        }
      }
    }
    if (next() < 0.5) {
      blockPairs.push(['B1', 'B2']);
    }
    if (next() < 0.3) {
      blockPairs.push(['B3', 'B1']);
    }
    const seatCount = Math.max(1, total);
    const majorityOverride =
      next() < 0.2 ? randomInt(next, 1, seatCount) : undefined;
    const fixture = seatsFixture(seatList, {
      ineligible,
      blocks,
      partyPairs,
      blockPairs,
      overrides,
      ...(withRefusals ? { refusals } : {}),
      ...(majorityOverride === undefined ? {} : { majorityOverride }),
    });

    const blockOf = new Map<string, string>();
    for (const [blockId, members] of Object.entries(blocks)) {
      members.forEach((id) => blockOf.set(id, blockId));
    }
    const partySourced = new Set(
      [...partyPairs, ...refusals].map(([a, b]) => pairKey(a, b)),
    );
    const refusers = new Map<string, string[]>();
    for (const [refuser, refused] of refusals) {
      const key = pairKey(refuser, refused);
      refusers.set(
        key,
        [...(refusers.get(key) ?? []), refuser].sort(
          (left, right) => ids.indexOf(left) - ids.indexOf(right),
        ),
      );
    }
    const forbidden = new Set(partySourced);
    const overrideKeys = new Set(overrides.map(([a, b]) => pairKey(a, b)));
    for (const [x, y] of blockPairs) {
      for (const a of ids) {
        for (const b of ids) {
          const key = pairKey(a, b);
          if (
            blockOf.get(a) === x &&
            blockOf.get(b) === y &&
            !overrideKeys.has(key)
          ) {
            forbidden.add(key);
          }
        }
      }
    }
    return {
      fixture,
      ids,
      ineligible,
      forbidden,
      partySourced,
      refusers,
      majority: majorityOverride ?? Math.floor(seatCount / 2) + 1,
      seatCount,
      seatsOf: (id) => seatList[ids.indexOf(id)] ?? 0,
    };
  }

  /** Every non-empty subset, members in party order. */
  function subsets(ids: readonly string[]): string[][] {
    const all: string[][] = [];
    for (let mask = 1; mask < 1 << ids.length; mask += 1) {
      all.push(ids.filter((_, index) => (mask >> index) & 1));
    }
    return all;
  }

  function seatsIn(c: RandomCase, members: readonly string[]): number {
    return members.reduce((sum, id) => sum + c.seatsOf(id), 0);
  }

  function pairsIn(c: RandomCase, members: readonly string[]): string[] {
    const found: string[] = [];
    members.forEach((a, x) =>
      members.forEach((b, y) => {
        if (x < y && c.forbidden.has(pairKey(a, b))) {
          found.push(`${a}-${b}`);
        }
      }),
    );
    return found;
  }

  function isMinimalMajority(c: RandomCase, members: readonly string[]) {
    const seats = seatsIn(c, members);
    return (
      seats >= c.majority &&
      members.every((id) => seats - c.seatsOf(id) < c.majority)
    );
  }

  function isFeasibleMajority(c: RandomCase, members: readonly string[]) {
    return (
      members.every((id) => !c.ineligible.includes(id) && c.seatsOf(id) > 0) &&
      pairsIn(c, members).length === 0 &&
      seatsIn(c, members) >= c.majority
    );
  }

  /** Seats descending, then party positions compared one by one. */
  function byRule(c: RandomCase) {
    const position = (id: string): number => c.ids.indexOf(id);
    return (left: readonly string[], right: readonly string[]): number => {
      const bySeats = seatsIn(c, right) - seatsIn(c, left);
      if (bySeats !== 0) {
        return bySeats;
      }
      for (let k = 0; k < Math.min(left.length, right.length); k += 1) {
        const step = position(left[k]!) - position(right[k]!);
        if (step !== 0) {
          return step;
        }
      }
      return left.length - right.length;
    };
  }

  function expectedRow(c: RandomCase, members: readonly string[]): string {
    const seats = seatsIn(c, members);
    return `${members.join('+')}=${seats}/${seats - c.majority}/${c.seatCount - seats}`;
  }

  function minimalWinning(c: RandomCase): string[][] {
    return subsets(c.ids).filter(
      (members) =>
        isFeasibleMajority(c, members) && isMinimalMajority(c, members),
    );
  }

  it('matches exhaustive enumeration on seeded small fixtures', () => {
    const next = createPrng(7_2026_10_28);
    for (let iteration = 0; iteration < 300; iteration += 1) {
      const c = randomCase(next);
      const { fixture, ids, forbidden, majority, seatCount } = c;
      const expected = minimalWinning(c);

      const analysis = analyze(fixture);
      expect(analysis.complete).toBe(true);
      const actual = analysis.minimalWinning.map((coalition) =>
        coalition.partyIds.join('+'),
      );
      expect([...actual].sort()).toEqual(
        expected.map((members) => members.join('+')).sort(),
      );
      expect(analysis.status).toBe(
        expected.length > 0 ? 'feasible' : 'deadlock',
      );
      expect(
        analysis.forbiddenPairs.map((pair) => pairKey(...pair.partyIds)).sort(),
      ).toEqual([...forbidden].sort());

      for (let index = 1; index < analysis.minimalWinning.length; index += 1) {
        expect(
          analysis.minimalWinning[index - 1]!.seats,
        ).toBeGreaterThanOrEqual(analysis.minimalWinning[index]!.seats);
      }
      for (const coalition of analysis.minimalWinning) {
        expect(coalition.margin).toBe(coalition.seats - majority);
        expect(coalition.opposition).toBe(seatCount - coalition.seats);
      }

      const balancing = ids.filter((id) =>
        expected.some((first) =>
          expected.some(
            (second) =>
              first.includes(id) &&
              second.includes(id) &&
              first.some((a) =>
                second.some((b) => a !== b && forbidden.has(pairKey(a, b))),
              ),
          ),
        ),
      );
      expect(analysis.balancingPartyIds).toEqual(balancing);
    }
  });

  it('lists larger coalitions as exhaustive enumeration does', () => {
    const next = createPrng(7_2026_10_28);
    let nonEmpty = 0;
    for (let iteration = 0; iteration < 300; iteration += 1) {
      const c = randomCase(next);
      const minimalKeys = new Set(
        minimalWinning(c).map((members) => members.join('+')),
      );
      const expected = subsets(c.ids)
        .filter(
          (members) =>
            isFeasibleMajority(c, members) &&
            members.some((left) =>
              minimalKeys.has(members.filter((id) => id !== left).join('+')),
            ),
        )
        .sort(byRule(c))
        .map((members) => expectedRow(c, members));
      expect(rows(larger(c.fixture))).toEqual(expected);
      nonEmpty += expected.length > 0 ? 1 : 0;
    }
    expect(nonEmpty).toBeGreaterThan(30);
  });

  it('lists blocked majorities as exhaustive enumeration does', () => {
    const next = createPrng(7_2026_10_28);
    let nonEmpty = 0;
    for (let iteration = 0; iteration < 300; iteration += 1) {
      const c = randomCase(next);
      const expected = subsets(c.ids)
        .filter(
          (members) =>
            isMinimalMajority(c, members) &&
            (pairsIn(c, members).length > 0 ||
              members.some((id) => c.ineligible.includes(id))),
        )
        .sort(byRule(c));
      const result = blocked(c.fixture);
      expect(result.complete).toBe(true);
      expect(reasons(result.blocked)).toEqual(
        expected.map(
          (members) =>
            `${members.join('+')}=${seatsIn(c, members)}|${pairsIn(
              c,
              members,
            ).join(',')}|${members
              .filter((id) => c.ineligible.includes(id))
              .join(',')}`,
        ),
      );
      expect(rows(result.blocked)).toEqual(
        expected.map((members) => expectedRow(c, members)),
      );
      nonEmpty += expected.length > 0 ? 1 : 0;
    }
    expect(nonEmpty).toBeGreaterThan(30);
  });

  it('counts pivotal parties as exhaustive enumeration does', () => {
    const next = createPrng(7_2026_10_28);
    let needed = 0;
    for (let iteration = 0; iteration < 300; iteration += 1) {
      const c = randomCase(next);
      const expected = minimalWinning(c);
      const eligible = c.ids.filter(
        (id) => !c.ineligible.includes(id) && c.seatsOf(id) > 0,
      );
      const counted = eligible.map((id) => ({
        id,
        count: expected.filter((members) => members.includes(id)).length,
      }));
      const ordered = [...counted].sort(
        (left, right) =>
          right.count - left.count ||
          eligible.indexOf(left.id) - eligible.indexOf(right.id),
      );
      const analysis = analyze(c.fixture);
      expect(analysis.complete).toBe(true);
      expect(pivotal(pivotalParties(analysis))).toEqual(
        ordered.map(
          ({ id, count }) =>
            `${id}=${count}/${String(
              expected.length > 0 && count === expected.length,
            )}`,
        ),
      );
      needed += ordered.some(
        ({ count }) => expected.length > 0 && count === expected.length,
      )
        ? 1
        : 0;
    }
    expect(needed).toBeGreaterThan(30);
  });

  it('matches exhaustive enumeration with directed refusals', () => {
    const next = createPrng(33_2026_10_30);
    let refused = 0;
    for (let iteration = 0; iteration < 300; iteration += 1) {
      const c = randomCase(next, true);
      const expected = minimalWinning(c);
      const analysis = analyze(c.fixture);
      expect(analysis.complete).toBe(true);
      expect(
        analysis.minimalWinning
          .map((coalition) => coalition.partyIds.join('+'))
          .sort(),
      ).toEqual(expected.map((members) => members.join('+')).sort());
      const described = (key: string): string =>
        `${key}:${c.partySourced.has(key) ? 'party' : 'block'}:${(
          c.refusers.get(key) ?? []
        ).join(',')}`;
      expect(
        analysis.forbiddenPairs
          .map(
            (pair) =>
              `${pairKey(...pair.partyIds)}:${pair.source}:${pair.refusedBy.join(',')}`,
          )
          .sort(),
      ).toEqual([...c.forbidden].map(described).sort());

      const blockedRows = subsets(c.ids)
        .filter(
          (members) =>
            isMinimalMajority(c, members) &&
            (pairsIn(c, members).length > 0 ||
              members.some((id) => c.ineligible.includes(id))),
        )
        .sort(byRule(c))
        .map(
          (members) =>
            `${members.join('+')}=${seatsIn(c, members)}|${pairsIn(
              c,
              members,
            ).join(',')}|${members
              .filter((id) => c.ineligible.includes(id))
              .join(',')}`,
        );
      expect(reasons(blocked(c.fixture).blocked)).toEqual(blockedRows);

      const chosen = c.ids.filter(() => next() < 0.5);
      if (chosen.length > 0) {
        expect(
          evaluateCoalition(
            c.fixture.scenario,
            c.fixture.allocation,
            chosen,
          ).forbiddenPairs.map((pair) => pair.partyIds.join('-')),
        ).toEqual(pairsIn(c, chosen));
      }
      refused += c.refusers.size > 0 ? 1 : 0;
    }
    expect(refused).toBeGreaterThan(150);
  });
});

describe('determinism', () => {
  it('returns identical pivotal rows on repeated runs', () => {
    const analysis = analyze(pipeline(section8Input('0')));
    expect(JSON.stringify(pivotalParties(analysis))).toBe(
      JSON.stringify(pivotalParties(analysis)),
    );
  });

  it('returns identical larger and blocked lists on repeated runs', () => {
    const fixture = seatsFixture([30, 30, 30, 10], {
      ineligible: ['P4'],
      partyPairs: [['P1', 'P3']],
    });
    expect(JSON.stringify(larger(fixture))).toBe(
      JSON.stringify(larger(fixture)),
    );
    expect(JSON.stringify(blocked(fixture))).toBe(
      JSON.stringify(blocked(fixture)),
    );
  });
  it('returns identical output on repeated runs', () => {
    const fixture = pipeline(section8Input('0'));
    expect(JSON.stringify(analyze(fixture))).toBe(
      JSON.stringify(analyze(fixture)),
    );
  });

  it('returns identical refusal reasons on repeated runs', () => {
    const fixture = seatsFixture([30, 30, 30, 10], {
      refusals: [
        ['P3', 'P1'],
        ['P2', 'P4'],
        ['P1', 'P3'],
      ],
    });
    const first = JSON.stringify([analyze(fixture), blocked(fixture)]);
    expect(first).toContain('"refusedBy":["P1","P3"]');
    expect(JSON.stringify([analyze(fixture), blocked(fixture)])).toBe(first);
  });

  it('does not use floating point or locale APIs', () => {
    for (const token of [
      'parseFloat',
      'Number(',
      'Math.',
      'toFixed',
      'toLocaleString',
      'localeCompare',
    ]) {
      expect(coalitionsSource).not.toContain(token);
    }
  });
});
