import compositionSource from '../../src/engine/composition.ts?raw';
import { describe, expect, it } from 'vitest';
import {
  buildCompositionReport,
  electorateComposition,
  voteSources,
  type Composition,
  type CompositionReport,
} from '../../src/engine/composition';
import { toFractionString } from '../../src/engine/rational';
import { computeVotes } from '../../src/engine/votes';
import {
  buildScenario,
  groupInput,
  partyInput,
  rulesInput,
  scenarioInput,
  type Json,
} from './helpers/scenarios';

/** Section 14.2 fixture with both lists in block K and an empty list Z. */
function input(growthA = '0', restrictB = false): Json {
  return scenarioInput({
    rules: rulesInput({ populationTotal: '1000', seatCount: 10 }),
    blocks: [{ id: 'K', name: 'Block K', color: '#224466' }],
    parties: [
      partyInput('X', 'K', 1),
      partyInput('Y', 'K', 2),
      partyInput('Z', null, 3),
    ],
    groups: [
      groupInput(
        'A',
        '0.6',
        { X: '0.8', Y: '0.2', Z: '0' },
        { turnout: '0.5', growthRate: growthA },
      ),
      restrictB
        ? groupInput(
            'B',
            '0.4',
            { Y: '1' },
            { votingMode: 'restricted', allowedPartyIds: ['Y'] },
          )
        : groupInput('B', '0.4', { X: '0.2', Y: '0.8', Z: '0' }),
    ],
  });
}

function rows(composition: Composition): [string, string, string | null][] {
  return composition.rows.map((row) => [
    row.groupId,
    toFractionString(row.amount),
    row.share === null ? null : toFractionString(row.share),
  ]);
}

function compose(
  json: Json,
  kind: 'party' | 'block',
  id: string,
  basis: 'potential' | 'valid',
  year = 0,
): Composition {
  const scenario = buildScenario(json);
  return electorateComposition(
    scenario,
    computeVotes(scenario, year),
    { kind, id },
    basis,
  );
}

describe('party composition', () => {
  it('splits valid votes for X: 3/4 from A, 1/4 from B', () => {
    const result = compose(input(), 'party', 'X', 'valid');
    expect(rows(result)).toEqual([
      ['A', '240', '3/4'],
      ['B', '80', '1/4'],
    ]);
    expect(toFractionString(result.total)).toBe('320');
  });

  it('splits potential supporters for X: 6/7 from A, 1/7 from B', () => {
    const result = compose(input(), 'party', 'X', 'potential');
    expect(rows(result)).toEqual([
      ['A', '480', '6/7'],
      ['B', '80', '1/7'],
    ]);
    expect(toFractionString(result.total)).toBe('560');
  });

  it('echoes the target and the basis', () => {
    const result = compose(input(), 'party', 'Y', 'valid');
    expect(result.target).toEqual({ kind: 'party', id: 'Y' });
    expect(result.basis).toBe('valid');
  });

  it('lists every group in scenario order, even with nothing to give', () => {
    const result = compose(input('0', true), 'party', 'X', 'potential');
    expect(rows(result)).toEqual([
      ['A', '480', '1'],
      ['B', '0', '0'],
    ]);
  });

  it('leaves shares undefined for a list with no supporters', () => {
    for (const basis of ['potential', 'valid'] as const) {
      const result = compose(input(), 'party', 'Z', basis);
      expect(rows(result)).toEqual([
        ['A', '0', null],
        ['B', '0', null],
      ]);
      expect(toFractionString(result.total)).toBe('0');
    }
  });
});

describe('block composition', () => {
  it('sums the valid votes of its lists', () => {
    const result = compose(input(), 'block', 'K', 'valid');
    expect(rows(result)).toEqual([
      ['A', '300', '3/7'],
      ['B', '400', '4/7'],
    ]);
  });

  it('sums the potential supporters of its lists', () => {
    const result = compose(input(), 'block', 'K', 'potential');
    expect(rows(result)).toEqual([
      ['A', '600', '3/5'],
      ['B', '400', '2/5'],
    ]);
  });
});

describe('future composition', () => {
  it('uses the year-k population and turnout', () => {
    const result = compose(input('0.1'), 'party', 'X', 'valid', 1);
    expect(rows(result)).toEqual([
      ['A', '264', '33/43'],
      ['B', '80', '10/43'],
    ]);
  });
});

describe('unknown targets', () => {
  it.each([
    ['party', 'Q'],
    ['block', 'X'],
    ['party', 'K'],
  ] as const)('refuses %s %s', (kind, id) => {
    const scenario = buildScenario(input());
    expect(() =>
      electorateComposition(
        scenario,
        computeVotes(scenario),
        { kind, id },
        'valid',
      ),
    ).toThrow(RangeError);
  });
});

describe('composition report', () => {
  function report(
    json: Json,
    kind: 'party' | 'block',
    id: string,
    year = 0,
  ): CompositionReport {
    const scenario = buildScenario(json);
    return buildCompositionReport(scenario, computeVotes(scenario, year), {
      kind,
      id,
    });
  }

  it('rounds both bases of X for display', () => {
    const result = report(input(), 'party', 'X');
    expect(result.target).toEqual({ kind: 'party', id: 'X' });
    expect(result.name).toBe('Party X');
    expect(result.rows).toEqual([
      {
        groupId: 'A',
        name: 'Group A',
        potential: { amount: '480', share: '85.71' },
        valid: { amount: '240', share: '75.00' },
      },
      {
        groupId: 'B',
        name: 'Group B',
        potential: { amount: '80', share: '14.29' },
        valid: { amount: '80', share: '25.00' },
      },
    ]);
    expect(result.potentialTotal).toBe('560');
    expect(result.validTotal).toBe('320');
  });

  it('names a block target and sums its lists', () => {
    const result = report(input(), 'block', 'K');
    expect(result.name).toBe('Block K');
    expect(result.rows.map((row) => row.valid)).toEqual([
      { amount: '300', share: '42.86' },
      { amount: '400', share: '57.14' },
    ]);
    expect(result.validTotal).toBe('700');
  });

  it('shows empty shares for a list without supporters', () => {
    const result = report(input(), 'party', 'Z');
    for (const row of result.rows) {
      expect(row.potential).toEqual({ amount: '0', share: null });
      expect(row.valid).toEqual({ amount: '0', share: null });
    }
    expect(result.potentialTotal).toBe('0');
    expect(result.validTotal).toBe('0');
  });

  it('follows the year of the vote result it is given', () => {
    const result = report(input('0.1'), 'party', 'X', 1);
    expect(result.rows.map((row) => row.valid)).toEqual([
      { amount: '264', share: '76.74' },
      { amount: '80', share: '23.26' },
    ]);
    expect(result.validTotal).toBe('344');
  });

  it('refuses an unknown target', () => {
    expect(() => report(input(), 'party', 'Q')).toThrow(RangeError);
  });
});

describe('vote sources', () => {
  const sources = (composition: Composition) => {
    const { rows: giving, top } = voteSources(composition);
    return {
      groups: giving.map((row) => row.groupId),
      top: top === null ? null : top.groupId,
    };
  };

  it('keeps the groups with a positive share and names the largest', () => {
    expect(sources(compose(input(), 'party', 'X', 'valid'))).toEqual({
      groups: ['A', 'B'],
      top: 'A',
    });
    expect(sources(compose(input(), 'party', 'Y', 'valid'))).toEqual({
      groups: ['A', 'B'],
      top: 'B',
    });
  });

  it('leaves out a group that gives nothing', () => {
    expect(
      sources(compose(input('0', true), 'party', 'X', 'potential')),
    ).toEqual({ groups: ['A'], top: 'A' });
  });

  it('has no sources and no top for a list with no supporters', () => {
    expect(sources(compose(input(), 'party', 'Z', 'valid'))).toEqual({
      groups: [],
      top: null,
    });
  });

  it('takes the first group on an exact tie', () => {
    const tied = scenarioInput({
      rules: rulesInput({ populationTotal: '1000', seatCount: 10 }),
      parties: [partyInput('X', null, 1)],
      groups: [
        groupInput('A', '0.5', { X: '1' }),
        groupInput('B', '0.5', { X: '1' }),
      ],
    });
    expect(sources(compose(tied, 'party', 'X', 'valid'))).toEqual({
      groups: ['A', 'B'],
      top: 'A',
    });
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
      expect(compositionSource).not.toContain(token);
    }
  });
});
