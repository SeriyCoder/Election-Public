import { beforeEach, describe, expect, it } from 'vitest';
import {
  compareCoalitions,
  compareScenarios,
  type CoalitionComparison,
  type ScenarioComparison,
} from '../../src/engine/compare';
import type { CoalitionAnalysis } from '../../src/engine/coalitions';
import { runScenario, runSeats } from '../../src/engine/run';
import {
  buildScenario,
  groupInput,
  partyInput,
  rulesInput,
  scenarioInput,
  section8Input,
  type Json,
} from './helpers/scenarios';

function compareInputs(baseline: Json, current: Json): ScenarioComparison {
  const before = buildScenario(baseline);
  const after = buildScenario(current);
  return compareScenarios(before, runSeats(before), after, runSeats(after));
}

function party(comparison: ScenarioComparison, id: string) {
  const row = comparison.parties.find((entry) => entry.partyId === id);
  if (row === undefined) {
    throw new Error(`missing party row ${id}`);
  }
  return row;
}

function group(comparison: ScenarioComparison, id: string) {
  const row = comparison.groups.find((entry) => entry.groupId === id);
  if (row === undefined) {
    throw new Error(`missing group row ${id}`);
  }
  return row;
}

function withParties(input: Json, parties: Json[]): Json {
  return { ...input, parties };
}

function eligibleInput(): Json {
  const input = section8Input();
  return withParties(
    input,
    (input.parties as Json[]).map((entry) => ({
      ...entry,
      canJoinGovernment: true,
    })),
  );
}

function analysisOf(input: Json): CoalitionAnalysis {
  return runScenario(buildScenario(input)).coalitions;
}

/** One open group splitting its votes between P1 and P2. */
function splitInput(firstWeight: string, secondWeight: string): Json {
  return scenarioInput({
    parties: [partyInput('P1', null, 1), partyInput('P2', null, 2)],
    groups: [groupInput('G1', '1', { P1: firstWeight, P2: secondWeight })],
  });
}

describe('compareScenarios: a scenario against itself', () => {
  let comparison: ScenarioComparison;
  beforeEach(() => {
    comparison = compareInputs(section8Input(), section8Input());
  });

  it('reports every row as present on both sides', () => {
    expect(comparison.parties.map((row) => row.partyId)).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
    ]);
    expect(comparison.groups.map((row) => row.groupId)).toEqual([
      'G1',
      'G2',
      'G3',
      'G4',
    ]);
    for (const row of [...comparison.parties, ...comparison.groups]) {
      expect(row.presence).toBe('both');
    }
  });

  it('gives zero changes everywhere', () => {
    const { totals } = comparison;
    expect(totals.population.change).toBe('0');
    expect(totals.cast.change).toBe('0');
    expect(totals.valid.change).toBe('0');
    expect(totals.turnout.change).toBe('0.00');
    expect(totals.majority).toEqual({ baseline: 61, current: 61, change: 0 });
    for (const row of comparison.parties) {
      expect(row.votes.change).toBe('0');
      expect(row.voteShare.change).toBe('0.00');
      expect(row.seats.change).toBe(0);
      expect(row.status.baseline).toBe(row.status.current);
    }
    for (const row of comparison.groups) {
      expect(row.turnout.change).toBe('0.00');
    }
  });

  it('shows the known Section 8 seats on both sides', () => {
    expect(comparison.parties.map((row) => row.seats.baseline)).toEqual([
      46, 50, 18, 6,
    ]);
    expect(comparison.parties.map((row) => row.seats.current)).toEqual([
      46, 50, 18, 6,
    ]);
    expect(comparison.noAllocation).toEqual({ baseline: null, current: null });
  });
});

describe('compareScenarios: changes', () => {
  it('halving Group 3 turnout moves votes, turnout and seats', () => {
    const comparison = compareInputs(section8Input(), section8Input('0.5'));
    expect(comparison.totals.valid).toEqual({
      baseline: '1000000',
      current: '925000',
      change: '-75000',
    });
    expect(comparison.totals.cast.change).toBe('-75000');
    expect(comparison.totals.population.change).toBe('0');
    expect(comparison.totals.turnout).toEqual({
      baseline: '100.00',
      current: '92.50',
      change: '-7.50',
    });
    expect(group(comparison, 'G3').turnout).toEqual({
      baseline: '100.00',
      current: '50.00',
      change: '-50.00',
    });
    expect(group(comparison, 'G1').turnout.change).toBe('0.00');
    expect(party(comparison, 'P3').votes).toEqual({
      baseline: '150000',
      current: '75000',
      change: '-75000',
    });
    expect(party(comparison, 'P3').seats).toEqual({
      baseline: 18,
      current: 10,
      change: -8,
    });
  });

  it('agrees with the engine seats on both sides', () => {
    const before = buildScenario(section8Input());
    const after = buildScenario(section8Input('0.5'));
    const beforeSeats = runSeats(before);
    const afterSeats = runSeats(after);
    const comparison = compareScenarios(before, beforeSeats, after, afterSeats);
    let total = 0;
    for (const row of comparison.parties) {
      const was = beforeSeats.allocation.parties.find(
        (entry) => entry.partyId === row.partyId,
      )?.seats;
      const now = afterSeats.allocation.parties.find(
        (entry) => entry.partyId === row.partyId,
      )?.seats;
      expect(row.seats).toEqual({
        baseline: was,
        current: now,
        change: (now ?? 0) - (was ?? 0),
      });
      total += row.seats.change ?? 0;
    }
    expect(total).toBe(0);
  });

  it('rounds the exact change, not the difference of rounded values', () => {
    // 33.3349% rounds to 33.33 and 33.3451% to 33.35, yet the change is 0.0102.
    const comparison = compareInputs(
      splitInput('0.333349', '0.666651'),
      splitInput('0.333451', '0.666549'),
    );
    expect(party(comparison, 'P1').voteShare).toEqual({
      baseline: '33.33',
      current: '33.35',
      change: '0.01',
    });
    expect(party(comparison, 'P2').voteShare).toEqual({
      baseline: '66.67',
      current: '66.65',
      change: '-0.01',
    });
    expect(party(comparison, 'P1').votes.change).toBe('102');
    expect(party(comparison, 'P2').votes.change).toBe('-102');
  });

  it('reports a qualification change under a raised threshold', () => {
    const raised = {
      ...section8Input(),
      rules: rulesInput({ threshold: '0.06' }),
    };
    const comparison = compareInputs(section8Input(), raised);
    expect(party(comparison, 'P4').status).toEqual({
      baseline: 'qualified',
      current: 'below-threshold',
    });
    expect(party(comparison, 'P4').votes.change).toBe('0');
    expect(party(comparison, 'P4').voteShare.change).toBe('0.00');
    expect(comparison.parties.map((row) => row.seats.current)).toEqual([
      48, 53, 19, 0,
    ]);
    expect(comparison.parties.map((row) => row.seats.change)).toEqual([
      2, 3, 1, -6,
    ]);
  });

  it('compares the required majority', () => {
    const override = {
      ...section8Input(),
      rules: rulesInput({ majorityMode: 'override', majorityOverride: 80 }),
    };
    expect(compareInputs(section8Input(), override).totals.majority).toEqual({
      baseline: 61,
      current: 80,
      change: 19,
    });
  });
});

describe('compareScenarios: matching by ID', () => {
  it('keeps a renamed party on one row with the current name', () => {
    const current = section8Input();
    const parties = (current.parties as Json[]).map((entry) =>
      entry.id === 'P1'
        ? { ...entry, name: 'Renamed', color: '#aa0000' }
        : entry,
    );
    const comparison = compareInputs(
      section8Input(),
      withParties(current, parties),
    );
    expect(comparison.parties).toHaveLength(4);
    expect(party(comparison, 'P1')).toMatchObject({
      name: 'Renamed',
      color: '#aa0000',
      presence: 'both',
    });
  });

  it('marks added and removed parties and orders removed rows last', () => {
    const baseline = section8Input();
    const current = section8Input();
    const before = withParties(baseline, [
      ...(baseline.parties as Json[]),
      partyInput('P5', null, 5),
    ]);
    const after = withParties(current, [
      partyInput('P6', null, 6),
      ...(current.parties as Json[]),
    ]);
    const comparison = compareInputs(before, after);
    expect(comparison.parties.map((row) => row.partyId)).toEqual([
      'P6',
      'P1',
      'P2',
      'P3',
      'P4',
      'P5',
    ]);
    expect(party(comparison, 'P6')).toMatchObject({
      presence: 'added',
      name: 'Party P6',
      votes: { baseline: null, current: '0', change: null },
      voteShare: { baseline: null, current: '0.00', change: null },
      status: { baseline: null, current: 'no-votes' },
      seats: { baseline: null, current: 0, change: null },
    });
    expect(party(comparison, 'P5')).toMatchObject({
      presence: 'removed',
      name: 'Party P5',
      votes: { baseline: '0', current: null, change: null },
      status: { baseline: 'no-votes', current: null },
      seats: { baseline: 0, current: null, change: null },
    });
  });

  it('marks added and removed groups', () => {
    const current = section8Input();
    const groups = (current.groups as Json[]).map((entry) =>
      entry.id === 'G4' ? { ...entry, id: 'G5', name: 'Group G5' } : entry,
    );
    const comparison = compareInputs(section8Input(), { ...current, groups });
    expect(comparison.groups.map((row) => row.groupId)).toEqual([
      'G1',
      'G2',
      'G3',
      'G5',
      'G4',
    ]);
    expect(group(comparison, 'G5')).toEqual({
      groupId: 'G5',
      name: 'Group G5',
      presence: 'added',
      turnout: { baseline: null, current: '100.00', change: null },
    });
    expect(group(comparison, 'G4')).toEqual({
      groupId: 'G4',
      name: 'Group G4',
      presence: 'removed',
      turnout: { baseline: '100.00', current: null, change: null },
    });
  });

  it('follows the current persisted order for rows on both sides', () => {
    const current = section8Input();
    const reversed = withParties(
      current,
      [...(current.parties as Json[])].reverse(),
    );
    const comparison = compareInputs(section8Input(), reversed);
    expect(comparison.parties.map((row) => row.partyId)).toEqual([
      'P4',
      'P3',
      'P2',
      'P1',
    ]);
    expect(comparison.parties.every((row) => row.seats.change === 0)).toBe(
      true,
    );
  });
});

describe('compareScenarios: no allocation', () => {
  function zeroTurnout(): Json {
    const input = section8Input();
    return {
      ...input,
      groups: (input.groups as Json[]).map((entry) => ({
        ...entry,
        turnout: '0',
      })),
    };
  }

  it('reports absent seats and no seat change on a side without seats', () => {
    const comparison = compareInputs(section8Input(), zeroTurnout());
    expect(comparison.noAllocation).toEqual({
      baseline: null,
      current: 'no-valid-votes',
    });
    for (const row of comparison.parties) {
      expect(row.seats.current).toBeNull();
      expect(row.seats.change).toBeNull();
      expect(row.voteShare.current).toBeNull();
      expect(row.voteShare.change).toBeNull();
      expect(row.votes.current).toBe('0');
    }
    expect(party(comparison, 'P1').seats.baseline).toBe(46);
    expect(comparison.totals.turnout.current).toBe('0.00');
  });

  it('works in the other direction', () => {
    const comparison = compareInputs(zeroTurnout(), section8Input());
    expect(comparison.noAllocation).toEqual({
      baseline: 'no-valid-votes',
      current: null,
    });
    expect(party(comparison, 'P1').seats).toEqual({
      baseline: null,
      current: 46,
      change: null,
    });
  });
});

describe('compareScenarios: purity and determinism', () => {
  it('does not change its inputs and repeats exactly', () => {
    const before = buildScenario(section8Input());
    const after = buildScenario(section8Input('0.5'));
    const beforeSeats = runSeats(before);
    const afterSeats = runSeats(after);
    const snapshot = JSON.stringify([before, after]);
    const first = compareScenarios(before, beforeSeats, after, afterSeats);
    const second = compareScenarios(before, beforeSeats, after, afterSeats);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify([before, after])).toBe(snapshot);
  });

  it('reproduces after a JSON round trip of both inputs', () => {
    const roundTrip = (input: Json): Json =>
      JSON.parse(JSON.stringify(input)) as Json;
    const direct = compareInputs(section8Input(), section8Input('0.5'));
    const tripped = compareInputs(
      roundTrip(section8Input()),
      roundTrip(section8Input('0.5')),
    );
    expect(tripped).toEqual(direct);
  });
});

describe('compareCoalitions', () => {
  const deadlock = analysisOf(section8Input());
  const feasible = analysisOf(eligibleInput());

  function keys(comparison: CoalitionComparison): string[] {
    return comparison.coalitions.map(
      (row) => `${row.partyIds.join('+')}:${row.presence}`,
    );
  }

  it('matches an analysis with itself', () => {
    const comparison = compareCoalitions(feasible, feasible);
    expect(comparison.conclusive).toBe(true);
    expect(comparison.baseline).toEqual({
      status: 'feasible',
      complete: true,
      majorityRequired: 61,
    });
    expect(comparison.current).toEqual(comparison.baseline);
    expect(keys(comparison)).toEqual(['P2+P3:both', 'P1+P3:both']);
    expect(comparison.coalitions[0]).toEqual({
      partyIds: ['P2', 'P3'],
      presence: 'both',
      baselineSeats: 68,
      currentSeats: 68,
    });
  });

  it('marks coalitions that appear after a change', () => {
    const comparison = compareCoalitions(deadlock, feasible);
    expect(comparison.baseline?.status).toBe('deadlock');
    expect(comparison.current?.status).toBe('feasible');
    expect(keys(comparison)).toEqual(['P2+P3:added', 'P1+P3:added']);
    expect(comparison.coalitions[1]).toEqual({
      partyIds: ['P1', 'P3'],
      presence: 'added',
      baselineSeats: null,
      currentSeats: 64,
    });
  });

  it('marks coalitions that disappear after a change', () => {
    const comparison = compareCoalitions(feasible, deadlock);
    expect(keys(comparison)).toEqual(['P2+P3:removed', 'P1+P3:removed']);
    expect(comparison.coalitions[0]?.currentSeats).toBeNull();
    expect(comparison.coalitions[0]?.baselineSeats).toBe(68);
  });

  it('orders current coalitions first, then baseline-only ones', () => {
    const [first, second] = feasible.minimalWinning;
    if (first === undefined || second === undefined) {
      throw new Error('expected two minimal winning coalitions');
    }
    const baseline = { ...feasible, minimalWinning: [second] };
    const current = { ...feasible, minimalWinning: [first] };
    expect(keys(compareCoalitions(baseline, current))).toEqual([
      'P2+P3:added',
      'P1+P3:removed',
    ]);
  });

  it('matches member sets regardless of member order', () => {
    const [first] = feasible.minimalWinning;
    if (first === undefined) {
      throw new Error('expected a minimal winning coalition');
    }
    const baseline = {
      ...feasible,
      minimalWinning: [{ ...first, partyIds: ['P3', 'P2'] }],
    };
    const current = { ...feasible, minimalWinning: [first] };
    const comparison = compareCoalitions(baseline, current);
    expect(comparison.coalitions).toEqual([
      {
        partyIds: ['P2', 'P3'],
        presence: 'both',
        baselineSeats: 68,
        currentSeats: 68,
      },
    ]);
  });

  it('is not conclusive when either search is incomplete', () => {
    const truncated = {
      ...feasible,
      complete: false,
      status: 'unknown' as const,
    };
    const comparison = compareCoalitions(truncated, feasible);
    expect(comparison.conclusive).toBe(false);
    expect(comparison.baseline).toEqual({
      status: 'unknown',
      complete: false,
      majorityRequired: 61,
    });
    expect(keys(comparison)).toEqual(['P2+P3:both', 'P1+P3:both']);
    expect(compareCoalitions(feasible, truncated).conclusive).toBe(false);
  });

  it.each([
    ['baseline', null, feasible],
    ['current', feasible, null],
    ['both', null, null],
  ] as const)('lists no rows while the %s side is missing', (_, a, b) => {
    const comparison = compareCoalitions(a, b);
    expect(comparison.coalitions).toEqual([]);
    expect(comparison.conclusive).toBe(false);
    expect(comparison.baseline).toEqual(
      a === null
        ? null
        : { status: 'feasible', complete: true, majorityRequired: 61 },
    );
    expect(comparison.current).toEqual(
      b === null
        ? null
        : { status: 'feasible', complete: true, majorityRequired: 61 },
    );
  });

  it('carries the no-allocation status', () => {
    const input = section8Input();
    const empty = analysisOf({
      ...input,
      groups: (input.groups as Json[]).map((entry) => ({
        ...entry,
        turnout: '0',
      })),
    });
    const comparison = compareCoalitions(feasible, empty);
    expect(comparison.current?.status).toBe('no-allocation');
    expect(keys(comparison)).toEqual(['P2+P3:removed', 'P1+P3:removed']);
  });
});
