import allocateSource from '../../src/engine/allocate.ts?raw';
import { describe, expect, it } from 'vitest';
import {
  allocateSeats,
  type AllocationResult,
} from '../../src/engine/allocate';
import {
  compare,
  div,
  floor,
  fromInteger,
  mul,
  sub,
  toFractionString,
  type Rational,
} from '../../src/engine/rational';
import {
  applyThreshold,
  type ThresholdResult,
} from '../../src/engine/threshold';
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

interface Run {
  readonly allocation: AllocationResult;
  readonly threshold: ThresholdResult;
}

function run(input: Json): Run {
  const scenario = buildScenario(input);
  const threshold = applyThreshold(scenario, computeVotes(scenario));
  return { allocation: allocateSeats(scenario, threshold), threshold };
}

function f(value: Rational | null | undefined): string | null {
  return value === null || value === undefined ? null : toFractionString(value);
}

function seats(result: AllocationResult): Record<string, number> {
  return Object.fromEntries(
    result.parties.map((party) => [party.partyId, party.seats]),
  );
}

function totalSeats(result: AllocationResult): number {
  return result.parties.reduce((total, party) => total + party.seats, 0);
}

function contest(
  seatCount: number,
  entries: { id: string; order: number; weight: string }[],
  threshold = '0',
): Json {
  return scenarioInput({
    rules: rulesInput({ seatCount, threshold }),
    parties: entries.map((entry) => partyInput(entry.id, null, entry.order)),
    groups: [
      groupInput(
        'G',
        '1',
        Object.fromEntries(entries.map((entry) => [entry.id, entry.weight])),
      ),
    ],
  });
}

describe('Section 8 seats', () => {
  it('allocates the baseline as 46 / 50 / 18 / 6', () => {
    const { allocation } = run(section8Input());
    expect(seats(allocation)).toEqual({ P1: 46, P2: 50, P3: 18, P4: 6 });
    expect(allocation.seatCount).toBe(120);
    expect(allocation.noAllocation).toBeNull();
  });

  it('allocates zero Group 3 turnout as 54 / 59 / 0 / 7', () => {
    const { allocation } = run(section8Input('0'));
    expect(seats(allocation)).toEqual({ P1: 54, P2: 59, P3: 0, P4: 7 });
  });

  it('exposes exact quotas, floors and remainders', () => {
    const party = run(section8Input()).allocation.parties[0];
    expect(f(party?.quota)).toBe('228/5');
    expect(party?.floorSeats).toBe(45);
    expect(f(party?.remainder)).toBe('3/5');
    expect(party?.remainderSeat).toBe(true);
  });

  it('reports no cutoff tie when remainders differ', () => {
    expect(run(section8Input()).allocation.cutoffTie).toBe(false);
  });

  it('aggregates seats and votes to blocks after allocation', () => {
    const { allocation } = run(section8Input());
    expect(
      allocation.blocks.map((block) => [block.blockId, block.seats]),
    ).toEqual([
      ['B1', 46],
      ['B2', 50],
      ['B3', 18],
      ['B4', 6],
    ]);
    expect(allocation.blocks[0]?.partyIds).toEqual(['P1']);
    expect(f(allocation.blocks[0]?.votes)).toBe('380000');
  });
});

describe('exact remainder ties', () => {
  it('breaks an exact tie by persisted tie-break order', () => {
    const { allocation } = run(
      contest(3, [
        { id: 'A', order: 2, weight: '0.5' },
        { id: 'B', order: 1, weight: '0.5' },
      ]),
    );
    expect(seats(allocation)).toEqual({ A: 1, B: 2 });
    expect(allocation.cutoffTie).toBe(true);
  });

  it('breaks equal tie-break order by party ID in code-unit order', () => {
    const numeric = run(
      contest(3, [
        { id: 'P2', order: 1, weight: '0.5' },
        { id: 'P10', order: 1, weight: '0.5' },
      ]),
    ).allocation;
    expect(seats(numeric)).toEqual({ P2: 1, P10: 2 });

    const cased = run(
      contest(3, [
        { id: 'a', order: 1, weight: '0.5' },
        { id: 'B', order: 1, weight: '0.5' },
      ]),
    ).allocation;
    expect(seats(cased)).toEqual({ a: 1, B: 2 });
  });

  it('does not depend on the array order of parties', () => {
    const forward = run(
      contest(3, [
        { id: 'A', order: 2, weight: '0.5' },
        { id: 'B', order: 1, weight: '0.5' },
      ]),
    ).allocation;
    const reverse = run(
      contest(3, [
        { id: 'B', order: 1, weight: '0.5' },
        { id: 'A', order: 2, weight: '0.5' },
      ]),
    ).allocation;
    expect(seats(forward)).toEqual(seats(reverse));
  });

  it('gives odd seat counts to the lowest tie-break orders among equals', () => {
    const { allocation } = run(
      contest(3, [
        { id: 'W', order: 4, weight: '0.25' },
        { id: 'X', order: 3, weight: '0.25' },
        { id: 'Y', order: 1, weight: '0.25' },
        { id: 'Z', order: 2, weight: '0.25' },
      ]),
    );
    expect(seats(allocation)).toEqual({ W: 0, X: 1, Y: 1, Z: 1 });
    expect(totalSeats(allocation)).toBe(3);
    expect(allocation.cutoffTie).toBe(true);
  });

  it('allocates a single seat to the largest remainder', () => {
    const { allocation } = run(
      contest(1, [
        { id: 'A', order: 1, weight: '0.4' },
        { id: 'B', order: 2, weight: '0.6' },
      ]),
    );
    expect(seats(allocation)).toEqual({ A: 0, B: 1 });
    expect(allocation.cutoffTie).toBe(false);
  });

  it('detects a tie that does not matter as no cutoff tie', () => {
    const { allocation } = run(
      contest(4, [
        { id: 'A', order: 1, weight: '0.5' },
        { id: 'B', order: 2, weight: '0.5' },
      ]),
    );
    expect(seats(allocation)).toEqual({ A: 2, B: 2 });
    expect(allocation.cutoffTie).toBe(false);
  });
});

describe('excluded parties', () => {
  it('never gives a zero-vote party a remainder seat', () => {
    const { allocation } = run(
      contest(3, [
        { id: 'Z', order: 0, weight: '0' },
        { id: 'A', order: 1, weight: '0.5' },
        { id: 'B', order: 2, weight: '0.5' },
      ]),
    );
    expect(seats(allocation)).toEqual({ Z: 0, A: 2, B: 1 });
    expect(allocation.parties[0]?.quota).toBeNull();
    expect(allocation.parties[0]?.remainder).toBeNull();
  });

  it('allocates only over qualifying votes', () => {
    const { allocation } = run(
      contest(
        10,
        [
          { id: 'P1', order: 1, weight: '0.55' },
          { id: 'P2', order: 2, weight: '0.4' },
          { id: 'P3', order: 3, weight: '0.05' },
        ],
        '0.1',
      ),
    );
    expect(seats(allocation)).toEqual({ P1: 6, P2: 4, P3: 0 });
    expect(f(allocation.parties[0]?.quota)).toBe('110/19');
    expect(allocation.parties[2]?.quota).toBeNull();
  });

  it('returns zero seats and the reason when nothing can be allocated', () => {
    const { allocation } = run(noVotes());
    expect(allocation.noAllocation).toBe('no-valid-votes');
    expect(totalSeats(allocation)).toBe(0);
    expect(allocation.parties.every((party) => party.quota === null)).toBe(
      true,
    );
    expect(allocation.blocks.every((block) => block.seats === 0)).toBe(true);
    expect(allocation.cutoffTie).toBe(false);
  });

  it('propagates no party qualifying', () => {
    const { allocation } = run(
      contest(
        5,
        [
          { id: 'A', order: 1, weight: '0.5' },
          { id: 'B', order: 2, weight: '0.5' },
        ],
        '0.6',
      ),
    );
    expect(allocation.noAllocation).toBe('no-party-qualifies');
    expect(totalSeats(allocation)).toBe(0);
  });
});

function noVotes(): Json {
  const input = section8Input();
  for (const group of input.groups as Json[]) {
    group.turnout = '0';
  }
  return input;
}

describe('block aggregation', () => {
  it('adds an unassigned bucket after all blocks', () => {
    const input = scenarioInput({
      blocks: [
        { id: 'B1', name: 'Block 1', color: '#111111' },
        { id: 'B2', name: 'Block 2', color: '#222222' },
      ],
      parties: [
        partyInput('P1', 'B1', 1),
        partyInput('P2', null, 2),
        partyInput('P3', 'B1', 3),
      ],
      groups: [groupInput('G', '1', { P1: '0.5', P2: '0.25', P3: '0.25' })],
      rules: rulesInput({ seatCount: 8 }),
    });
    const { allocation } = run(input);
    expect(
      allocation.blocks.map((block) => [
        block.blockId,
        block.partyIds,
        block.seats,
      ]),
    ).toEqual([
      ['B1', ['P1', 'P3'], 6],
      ['B2', [], 0],
      [null, ['P2'], 2],
    ]);
  });

  it('omits the unassigned bucket when every party has a block', () => {
    const { allocation } = run(section8Input());
    expect(allocation.blocks.some((block) => block.blockId === null)).toBe(
      false,
    );
  });
});

describe('generated scenarios', () => {
  function randomScenario(next: () => number): Json {
    const blockCount = randomInt(next, 0, 10);
    const partyCount = randomInt(next, 1, 30);
    const groupCount = randomInt(next, 1, 20);
    const blocks = Array.from({ length: blockCount }, (_, index) => ({
      id: `B${index}`,
      name: `Block ${index}`,
      color: '#123456',
    }));
    const parties = Array.from({ length: partyCount }, (_, index) =>
      partyInput(
        `P${index}`,
        blockCount === 0 || next() < 0.2
          ? null
          : `B${randomInt(next, 0, blockCount - 1)}`,
        randomInt(next, 0, 3),
      ),
    );
    const equalSplit = next() < 0.25;
    const shares = randomParts(next, groupCount, 1_000_000);
    const groups = shares.map((share, index) => {
      const ids = parties
        .map((party) => party.id as string)
        .filter(() => next() < 0.5);
      const allowed = ids.length > 0 ? ids : ['P0'];
      const parts =
        equalSplit && 1_000_000 % allowed.length === 0
          ? allowed.map(() => 1_000_000 / allowed.length)
          : randomParts(next, allowed.length, 1_000_000);
      return groupInput(
        `G${index}`,
        millionths(share),
        Object.fromEntries(
          allowed.map((id, position) => [id, millionths(parts[position] ?? 0)]),
        ),
        { turnout: millionths(randomInt(next, 0, 1_000_000)) },
      );
    });
    const thresholds = ['0', '0', '0.01', '0.0325', '0.1'];
    return scenarioInput({
      blocks,
      parties,
      groups,
      rules: rulesInput({
        seatCount: randomInt(next, 1, 501),
        threshold: thresholds[randomInt(next, 0, thresholds.length - 1)],
      }),
    });
  }

  function ranksBefore(
    a: { remainder: Rational; order: number; id: string },
    b: { remainder: Rational; order: number; id: string },
  ): boolean {
    const byRemainder = compare(a.remainder, b.remainder);
    if (byRemainder !== 0) {
      return byRemainder > 0;
    }
    if (a.order !== b.order) {
      return a.order < b.order;
    }
    return a.id < b.id;
  }

  it('always allocates exactly seatCount seats by the Hamilton rule', () => {
    const next = createPrng(20261028);
    let allocated = 0;
    for (let iteration = 0; iteration < 400; iteration += 1) {
      const input = randomScenario(next);
      const scenario = buildScenario(input);
      const votes = computeVotes(scenario);
      const threshold = applyThreshold(scenario, votes);
      const allocation = allocateSeats(scenario, threshold);
      const seatCount = scenario.rules.seatCount;

      if (allocation.noAllocation !== null) {
        expect(totalSeats(allocation)).toBe(0);
        continue;
      }
      allocated += 1;
      expect(totalSeats(allocation)).toBe(seatCount);
      expect(
        allocation.blocks.reduce((total, block) => total + block.seats, 0),
      ).toBe(seatCount);

      const ranked: {
        remainder: Rational;
        order: number;
        id: string;
        extra: boolean;
      }[] = [];
      allocation.parties.forEach((party, index) => {
        const qualification = threshold.parties[index];
        const source = scenario.parties[index];
        expect(Number.isInteger(party.seats)).toBe(true);
        expect(party.seats).toBeGreaterThanOrEqual(0);
        if (qualification?.status !== 'qualified' || source === undefined) {
          expect(party.seats).toBe(0);
          return;
        }
        const quota = div(
          mul(fromInteger(seatCount), qualification.votes),
          threshold.qualifyingVotes,
        );
        const base = floor(quota);
        expect(f(party.quota)).toBe(f(quota));
        expect(BigInt(party.floorSeats)).toBe(base);
        const extra = party.seats - party.floorSeats;
        expect([0, 1]).toContain(extra);
        ranked.push({
          remainder: sub(quota, fromInteger(base)),
          order: source.tieBreakOrder,
          id: source.id,
          extra: extra === 1,
        });
      });
      for (const winner of ranked.filter((entry) => entry.extra)) {
        for (const loser of ranked.filter((entry) => !entry.extra)) {
          expect(ranksBefore(winner, loser)).toBe(true);
        }
      }
    }
    expect(allocated).toBeGreaterThan(300);
  });

  it('handles the largest seat count', () => {
    const input = section8Input('0.5');
    input.rules = rulesInput({ seatCount: 10000 });
    const { allocation } = run(input);
    expect(totalSeats(allocation)).toBe(10000);
  });
});

describe('determinism', () => {
  it('returns identical output on repeated runs', () => {
    const render = (): string =>
      JSON.stringify(run(section8Input('0.5')).allocation, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : (value as unknown),
      );
    expect(render()).toBe(render());
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
      expect(allocateSource).not.toContain(token);
    }
  });
});
