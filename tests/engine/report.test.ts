import reportSource from '../../src/engine/report.ts?raw';
import { describe, expect, it } from 'vitest';
import { buildReport, type ResultReport } from '../../src/engine/report';
import { runScenario } from '../../src/engine/run';
import type { Scenario } from '../../src/engine/schema';
import {
  buildScenario,
  groupInput,
  partyInput,
  rulesInput,
  scenarioInput,
  section8Input,
  section8Scenario,
  type Json,
} from './helpers/scenarios';

function report(scenario: Scenario): ResultReport {
  return buildReport(scenario, runScenario(scenario));
}

function party(result: ResultReport, partyId: string) {
  const row = result.parties.find((item) => item.partyId === partyId);
  if (row === undefined) {
    throw new Error(`missing party ${partyId}`);
  }
  return row;
}

function counts(sequence: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of sequence) {
    out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}

/** Two groups: one party per group, the given shares and threshold. */
function twoParty(share1: string, share2: string, threshold: string): Scenario {
  return buildScenario(
    scenarioInput({
      rules: rulesInput({ threshold }),
      parties: [partyInput('P1', null, 1), partyInput('P2', null, 2)],
      groups: [
        groupInput('G1', share1, { P1: '1' }),
        groupInput('G2', share2, { P2: '1' }),
      ],
    }),
  );
}

/** P1 and P4 in B2, P3 in B1, P2 unassigned; blocks listed B1, B2. */
function mixedBlocks(): Scenario {
  return buildScenario(
    scenarioInput({
      blocks: [
        { id: 'B1', name: 'Block one', color: '#111111' },
        { id: 'B2', name: 'Block two', color: '#222222' },
      ],
      parties: [
        { ...partyInput('P1', 'B2', 1), color: '#aa0000' },
        { ...partyInput('P2', null, 2), color: '#00aa00' },
        { ...partyInput('P3', 'B1', 3), color: '#0000aa' },
        { ...partyInput('P4', 'B2', 4), color: '#aaaa00' },
      ],
      groups: [
        groupInput('G1', '0.4', { P1: '1' }),
        groupInput('G2', '0.1', { P2: '1' }),
        groupInput('G3', '0.3', { P3: '1' }),
        groupInput('G4', '0.2', { P4: '1' }),
      ],
    }),
  );
}

describe('report totals', () => {
  it('rounds people to whole numbers and shares to two places', () => {
    const { totals } = report(section8Scenario());
    expect(totals).toEqual({
      population: '1000000',
      unavailable: '0',
      abstaining: '0',
      cast: '1000000',
      invalid: '0',
      valid: '1000000',
      turnout: '100.00',
      threshold: '0.00',
    });
  });

  it('reports turnout and the threshold as percents', () => {
    const { totals } = report(section8Scenario('0.5'));
    expect(totals.turnout).toBe('92.50');
    expect(report(twoParty('0.5', '0.5', '0.0325')).totals.threshold).toBe(
      '3.25',
    );
  });

  it('names the method, seat count and majority', () => {
    const result = report(section8Scenario());
    expect(result.method).toBe('hamilton');
    expect(result.seatCount).toBe(120);
    expect(result.majority).toBe(61);
    expect(result.noAllocation).toBeNull();
    expect(result.cutoffTie).toBe(false);
  });

  it('uses the majority override when set', () => {
    const input = section8Input();
    const scenario = buildScenario({
      ...input,
      rules: rulesInput({ majorityMode: 'override', majorityOverride: 70 }),
    });
    expect(report(scenario).majority).toBe(70);
    expect(report(scenario).majorityOverridden).toBe(true);
  });

  it('marks the default majority as not overridden', () => {
    expect(report(section8Scenario()).majorityOverridden).toBe(false);
  });
});

describe('report party rows', () => {
  it('lists parties in scenario order with names and colors', () => {
    const result = report(mixedBlocks());
    expect(result.parties.map((row) => row.partyId)).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
    ]);
    expect(party(result, 'P1')).toMatchObject({
      name: 'Party P1',
      color: '#aa0000',
      blockId: 'B2',
    });
    expect(party(result, 'P2').blockId).toBeNull();
  });

  it('shows the Section 8 votes, shares and seats', () => {
    const result = report(section8Scenario());
    expect(party(result, 'P1')).toEqual({
      partyId: 'P1',
      name: 'Party P1',
      color: '#336699',
      blockId: 'B1',
      votes: '380000',
      voteShare: '38.00',
      status: 'qualified',
      seats: 46,
      seatShare: '38.33',
      quota: '45.6000',
      floorSeats: 45,
      remainder: '0.6000',
      remainderSeat: true,
    });
    expect(party(result, 'P2')).toMatchObject({
      votes: '420000',
      voteShare: '42.00',
      seats: 50,
      seatShare: '41.67',
      quota: '50.4000',
      floorSeats: 50,
      remainder: '0.4000',
      remainderSeat: false,
    });
    expect(party(result, 'P4')).toMatchObject({
      votes: '50000',
      voteShare: '5.00',
      seats: 6,
      seatShare: '5.00',
    });
  });

  it('copies seat counts from the allocation unchanged', () => {
    const scenario = section8Scenario('0.37');
    const result = runScenario(scenario);
    const rows = buildReport(scenario, result).parties;
    expect(rows.map((row) => row.seats)).toEqual(
      result.allocation.parties.map((item) => item.seats),
    );
    expect(rows.reduce((total, row) => total + row.seats, 0)).toBe(120);
  });

  it('keeps the engine status when rounding meets the threshold', () => {
    const result = report(twoParty('0.96751', '0.03249', '0.0325'));
    expect(party(result, 'P2')).toMatchObject({
      voteShare: '3.25',
      status: 'below-threshold',
      seats: 0,
    });
    expect(result.totals.threshold).toBe('3.25');
  });
});

describe('report blocks', () => {
  it('follows the allocation block order with the unassigned row last', () => {
    const result = report(mixedBlocks());
    expect(result.blocks.map((row) => row.blockId)).toEqual(['B1', 'B2', null]);
    expect(result.blocks[0]).toMatchObject({
      name: 'Block one',
      color: '#111111',
      partyIds: ['P3'],
      votes: '300000',
      voteShare: '30.00',
      seats: 36,
      seatShare: '30.00',
    });
    expect(result.blocks[1]).toMatchObject({
      partyIds: ['P1', 'P4'],
      votes: '600000',
      voteShare: '60.00',
      seats: 72,
    });
    expect(result.blocks[2]).toMatchObject({
      blockId: null,
      name: null,
      color: null,
      partyIds: ['P2'],
      seats: 12,
    });
  });
});

describe('report bars and seat sequence', () => {
  it('orders segments by block, then party, unassigned last', () => {
    const result = report(mixedBlocks());
    expect(result.voteSegments.map((segment) => segment.partyId)).toEqual([
      'P3',
      'P1',
      'P4',
      'P2',
    ]);
    expect(result.seatSegments.map((segment) => segment.partyId)).toEqual([
      'P3',
      'P1',
      'P4',
      'P2',
    ]);
  });

  it('weights vote segments by percent and seat segments by seats', () => {
    const result = report(section8Scenario());
    expect(result.voteSegments).toEqual([
      { partyId: 'P1', color: '#336699', weight: '38.0000' },
      { partyId: 'P2', color: '#336699', weight: '42.0000' },
      { partyId: 'P3', color: '#336699', weight: '15.0000' },
      { partyId: 'P4', color: '#336699', weight: '5.0000' },
    ]);
    expect(result.seatSegments.map((segment) => segment.weight)).toEqual([
      '46',
      '50',
      '18',
      '6',
    ]);
  });

  it('omits parties without votes or seats from the bars', () => {
    const result = report(twoParty('0.97', '0.03', '0.05'));
    expect(result.voteSegments.map((segment) => segment.partyId)).toEqual([
      'P1',
      'P2',
    ]);
    expect(result.seatSegments.map((segment) => segment.partyId)).toEqual([
      'P1',
    ]);
  });

  it('lists one party per seat in segment order', () => {
    const result = report(mixedBlocks());
    expect(result.seatSequence).toHaveLength(120);
    expect(counts(result.seatSequence)).toEqual({
      P1: 48,
      P2: 12,
      P3: 36,
      P4: 24,
    });
    expect(result.seatSequence[0]).toBe('P3');
    expect(result.seatSequence[35]).toBe('P3');
    expect(result.seatSequence[36]).toBe('P1');
    expect(result.seatSequence[119]).toBe('P2');
  });
});

describe('report special states', () => {
  it('has no seat values when no party qualifies', () => {
    const result = report(twoParty('0.4', '0.6', '0.7'));
    expect(result.noAllocation).toBe('no-party-qualifies');
    for (const row of result.parties) {
      expect(row).toMatchObject({
        seats: 0,
        seatShare: null,
        quota: null,
        remainder: null,
        remainderSeat: false,
      });
    }
    expect(result.blocks.every((row) => row.seatShare === null)).toBe(true);
    expect(result.seatSegments).toEqual([]);
    expect(result.seatSequence).toEqual([]);
  });

  it('has no vote shares when there are no valid votes', () => {
    const input = section8Input();
    const groups = (input.groups as Json[]).map((group) => ({
      ...group,
      turnout: '0',
    }));
    const result = report(buildScenario({ ...input, groups }));
    expect(result.noAllocation).toBe('no-valid-votes');
    expect(result.parties.every((row) => row.voteShare === null)).toBe(true);
    expect(result.totals.turnout).toBe('0.00');
    expect(result.voteSegments).toEqual([]);
  });

  it('passes a cut-off tie through', () => {
    const scenario = buildScenario(
      scenarioInput({
        rules: rulesInput({ seatCount: 2 }),
        parties: ['P1', 'P2', 'P3', 'P4'].map((id, index) =>
          partyInput(id, null, index + 1),
        ),
        groups: ['P1', 'P2', 'P3', 'P4'].map((id, index) =>
          groupInput(`G${index + 1}`, '0.25', { [id]: '1' }),
        ),
      }),
    );
    const result = report(scenario);
    expect(result.cutoffTie).toBe(true);
    expect(result.seatSequence).toHaveLength(2);
  });
});

describe('report at maximum size', () => {
  it('handles 20 groups, 30 parties and 10 blocks', () => {
    const parties = Array.from({ length: 30 }, (_, index) =>
      partyInput(`P${index + 1}`, `B${(index % 10) + 1}`, index + 1),
    );
    const blocks = Array.from({ length: 10 }, (_, index) => ({
      id: `B${index + 1}`,
      name: `Block ${index + 1}`,
      color: '#445566',
    }));
    const groups = Array.from({ length: 20 }, (_, index) =>
      groupInput(`G${index + 1}`, '0.05', { [`P${index + 1}`]: '1' }),
    );
    const scenario = buildScenario(scenarioInput({ parties, blocks, groups }));
    const result = report(scenario);
    expect(result.parties).toHaveLength(30);
    expect(result.blocks).toHaveLength(10);
    expect(result.seatSequence).toHaveLength(120);
    expect(result.seatSegments).toHaveLength(20);
    const seats = result.parties.reduce((total, row) => total + row.seats, 0);
    expect(seats).toBe(120);
  });
});

describe('report determinism', () => {
  it('is identical across runs and after a JSON round trip', () => {
    const input = section8Input('0.37');
    const first = report(buildScenario(input));
    const second = report(buildScenario(input));
    const roundTrip = report(
      buildScenario(JSON.parse(JSON.stringify(input)) as Json),
    );
    expect(second).toEqual(first);
    expect(roundTrip).toEqual(first);
  });

  it('uses exact arithmetic only', () => {
    expect(reportSource).not.toMatch(
      /\b(parseFloat|parseInt|toFixed|toPrecision|Math|toLocaleString|Intl)\b|\bNumber\(/,
    );
  });
});
