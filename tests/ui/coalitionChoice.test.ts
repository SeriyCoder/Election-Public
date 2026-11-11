import { describe, expect, it } from 'vitest';
import {
  chooserEntries,
  coalitionKey,
  MAX_FUTURE_COALITIONS,
  type ChooserSources,
} from '../../src/ui/coalitionChoice';

const sources = import.meta.glob('../../src/ui/coalitionChoice.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const ORDER = ['A', 'B', 'C', 'D'];

function entries(parts: Partial<ChooserSources>) {
  return chooserEntries({
    ticked: [],
    own: [],
    minimal: [],
    partyOrder: ORDER,
    ...parts,
  });
}

function minimal(...sets: string[][]) {
  return sets.map((partyIds) => ({ partyIds }));
}

describe('coalition key', () => {
  it('follows four coalitions at most', () => {
    expect(MAX_FUTURE_COALITIONS).toBe(4);
  });

  it('is the same for any order of the IDs', () => {
    expect(coalitionKey(['B', 'A'])).toBe(coalitionKey(['A', 'B']));
    expect(coalitionKey(['C', 'A', 'B'])).toBe('A+B+C');
  });

  it('sorts by code unit, not by locale', () => {
    expect(coalitionKey(['a', 'B', 'P10', 'P9'])).toBe('B+P10+P9+a');
  });

  it('ignores repeats and leaves its argument alone', () => {
    const ids = ['B', 'A', 'B'];
    expect(coalitionKey(ids)).toBe('A+B');
    expect(ids).toEqual(['B', 'A', 'B']);
  });

  it('tells different sets apart', () => {
    expect(coalitionKey(['A', 'B'])).not.toBe(coalitionKey(['A', 'B', 'C']));
    expect(coalitionKey([])).toBe('');
  });
});

describe('chooser entries', () => {
  it('lists the search coalitions in the search order', () => {
    expect(entries({ minimal: minimal(['B', 'C'], ['A', 'B']) })).toEqual([
      {
        key: 'B+C',
        partyIds: ['B', 'C'],
        source: 'minimal',
        checked: false,
        disabled: false,
      },
      {
        key: 'A+B',
        partyIds: ['A', 'B'],
        source: 'minimal',
        checked: false,
        disabled: false,
      },
    ]);
  });

  it('puts the Coalitions tab set first, in scenario order', () => {
    const list = entries({ own: ['D', 'A'], minimal: minimal(['A', 'B']) });
    expect(list.map((entry) => [entry.source, entry.partyIds])).toEqual([
      ['own', ['A', 'D']],
      ['minimal', ['A', 'B']],
    ]);
  });

  it('does not repeat the Coalitions tab set when the search lists it', () => {
    const list = entries({
      own: ['B', 'A'],
      minimal: minimal(['C', 'D'], ['A', 'B']),
    });
    expect(list.map((entry) => [entry.source, entry.key])).toEqual([
      ['minimal', 'C+D'],
      ['minimal', 'A+B'],
    ]);
  });

  it('leaves out an empty Coalitions tab set', () => {
    expect(entries({ own: [] })).toEqual([]);
  });

  it('ticks listed sets in place and keeps the others at the top', () => {
    const list = entries({
      ticked: [['C'], ['B', 'A'], ['D']],
      minimal: minimal(['A', 'B'], ['C', 'D']),
    });
    expect(
      list.map((entry) => [entry.source, entry.key, entry.checked]),
    ).toEqual([
      ['ticked', 'C', true],
      ['ticked', 'D', true],
      ['minimal', 'A+B', true],
      ['minimal', 'C+D', false],
    ]);
  });

  it('marks a ticked Coalitions tab set where it stands', () => {
    const list = entries({ ticked: [['A', 'C']], own: ['C', 'A'] });
    expect(list).toEqual([
      {
        key: 'A+C',
        partyIds: ['A', 'C'],
        source: 'own',
        checked: true,
        disabled: false,
      },
    ]);
  });

  it('disables the unticked entries once four are ticked', () => {
    const list = entries({
      ticked: [['A'], ['B'], ['C'], ['A', 'B']],
      minimal: minimal(['A'], ['B'], ['C'], ['A', 'B'], ['D']),
    });
    expect(list.map((entry) => [entry.key, entry.disabled])).toEqual([
      ['A', false],
      ['B', false],
      ['C', false],
      ['A+B', false],
      ['D', true],
    ]);
  });

  it('leaves the entries enabled below the limit', () => {
    const list = entries({
      ticked: [['A'], ['B']],
      minimal: minimal(['A'], ['B'], ['C']),
    });
    expect(list.every((entry) => !entry.disabled)).toBe(true);
  });

  it('leaves out sets with a party the scenario no longer has', () => {
    const list = entries({
      ticked: [['A', 'Q']],
      own: ['Q'],
      minimal: minimal(['Q', 'B'], ['C']),
    });
    expect(list.map((entry) => entry.key)).toEqual(['C']);
  });

  it('lists each search set once', () => {
    const list = entries({ minimal: minimal(['A', 'B'], ['B', 'A']) });
    expect(list.map((entry) => entry.key)).toEqual(['A+B']);
  });

  it('holds no interface text', () => {
    const source = Object.values(sources)[0];
    expect(typeof source).toBe('string');
    expect(source).not.toMatch(/i18n|translator/);
    expect(source).not.toMatch(/[\u0400-\u04FF\u0590-\u05FF]/);
  });
});
