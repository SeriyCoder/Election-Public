import { describe, expect, it } from 'vitest';
import {
  addEntity,
  entities,
  isDraft,
  moveEntity,
  type Draft,
} from '../../src/engine/edit';
import { LIMITS } from '../../src/engine/schema';
import {
  editorPages,
  FIRST_PAGE,
  groupPageKey,
  resolvePage,
} from '../../src/ui/editorPages';
import { presetInput, type PresetId } from '../../src/ui/presets';

const sources = import.meta.glob('../../src/ui/editorPages.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function draftOf(id: PresetId = 'baseline'): Draft {
  const input = presetInput(id);
  if (!isDraft(input)) {
    throw new Error('expected a draft');
  }
  return input;
}

function keys(draft: Draft): string[] {
  return editorPages(draft).map((page) => page.key);
}

const BASELINE_KEYS = [
  'scenario',
  'group:G1',
  'group:G2',
  'group:G3',
  'group:G4',
  'parties',
  'coalition-rules',
];

describe('editor page list', () => {
  it('lists scenario, groups, parties and coalition rules without a block page', () => {
    expect(keys(draftOf())).toEqual(BASELINE_KEYS);
  });

  it('marks each page with its kind and a group page with its group', () => {
    expect(
      editorPages(draftOf()).map((page) => [page.kind, page.groupId]),
    ).toEqual([
      ['scenario', null],
      ['group', 'G1'],
      ['group', 'G2'],
      ['group', 'G3'],
      ['group', 'G4'],
      ['parties', null],
      ['coalition-rules', null],
    ]);
  });

  it('gives every group of the Israeli example its own page', () => {
    const draft = draftOf('israelExample');
    const groups = entities(draft, 'group').map((group) => group.id);
    expect(groups.length).toBeGreaterThan(1);
    expect(keys(draft)).toEqual([
      'scenario',
      ...groups.map(groupPageKey),
      'parties',
      'coalition-rules',
    ]);
  });

  it('follows the stored group order after a move', () => {
    const moved = moveEntity(draftOf(), 'group', 'G3', -1);
    expect(keys(moved).slice(1, 5)).toEqual([
      'group:G1',
      'group:G3',
      'group:G2',
      'group:G4',
    ]);
  });

  it('shows one empty groups page when there are no groups', () => {
    const empty: Draft = { ...draftOf(), groups: [] };
    expect(keys(empty)).toEqual([
      'scenario',
      'groups',
      'parties',
      'coalition-rules',
    ]);
    expect(editorPages(empty)[1]).toEqual({
      key: 'groups',
      kind: 'groups',
      groupId: null,
    });
  });

  it('lists a page for each of the maximum number of groups', () => {
    let draft = draftOf();
    while (entities(draft, 'group').length < LIMITS.groups) {
      draft = addEntity(draft, 'group', '');
    }
    const list = keys(draft);
    expect(list).toHaveLength(LIMITS.groups + 3);
    expect(new Set(list).size).toBe(list.length);
  });

  it('builds a group page key from the group ID', () => {
    expect(groupPageKey('G7')).toBe('group:G7');
    expect(FIRST_PAGE).toEqual({ key: 'scenario', index: 0 });
  });

  it('holds no interface text', () => {
    const source = Object.values(sources)[0];
    expect(typeof source).toBe('string');
    expect(source).not.toMatch(/i18n|translator/);
    expect(source).not.toMatch(/[\u0400-\u04FF\u0590-\u05FF]/);
  });
});

describe('editor page resolution', () => {
  const pages = editorPages(draftOf());

  it('finds a listed page wherever it now stands', () => {
    expect(resolvePage(pages, { key: 'parties', index: 5 })).toBe(5);
    expect(resolvePage(pages, { key: 'group:G3', index: 1 })).toBe(3);
    expect(resolvePage(pages, { key: 'coalition-rules', index: 0 })).toBe(6);
  });

  it('shows the group now at the position of a deleted group', () => {
    const without = editorPages({
      ...draftOf(),
      groups: entities(draftOf(), 'group').filter((group) => group.id !== 'G2'),
    });
    const index = resolvePage(without, { key: 'group:G2', index: 2 });
    expect(without[index]?.key).toBe('group:G3');
  });

  it('shows the last group when the deleted group was the last one', () => {
    const without = editorPages({
      ...draftOf(),
      groups: entities(draftOf(), 'group').filter((group) => group.id !== 'G4'),
    });
    const index = resolvePage(without, { key: 'group:G4', index: 4 });
    expect(without[index]?.key).toBe('group:G3');
  });

  it('shows the empty groups page when no group is left', () => {
    const empty = editorPages({ ...draftOf(), groups: [] });
    expect(resolvePage(empty, { key: 'group:G1', index: 1 })).toBe(1);
    expect(empty[1]?.key).toBe('groups');
  });

  it('shows the first group when the empty groups page is gone', () => {
    const index = resolvePage(pages, { key: 'groups', index: 1 });
    expect(pages[index]?.key).toBe('group:G1');
  });

  it('keeps a stale group position inside the group pages', () => {
    const index = resolvePage(pages, { key: 'group:G9', index: 7 });
    expect(pages[index]?.key).toBe('group:G4');
    const before = resolvePage(pages, { key: 'group:G9', index: 0 });
    expect(pages[before]?.key).toBe('group:G1');
  });

  it('falls back to the first page for a key it does not know', () => {
    expect(resolvePage(pages, { key: 'nothing', index: 6 })).toBe(0);
  });
});
