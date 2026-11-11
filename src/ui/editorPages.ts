import type { Draft } from '../engine/edit';

/** What an editor page shows. */
export type EditorPageKind =
  'scenario' | 'group' | 'groups' | 'parties' | 'coalition-rules';

/** One page of the editor column; a group page carries its group ID. */
export interface EditorPage {
  readonly key: string;
  readonly kind: EditorPageKind;
  readonly groupId: string | null;
}

/** The page the user last turned to: its key and its position then. */
export interface SavedPage {
  readonly key: string;
  readonly index: number;
}

export const FIRST_PAGE: SavedPage = { key: 'scenario', index: 0 };

const GROUP_PREFIX = 'group:';

export function groupPageKey(id: string): string {
  return GROUP_PREFIX + id;
}

function page(kind: Exclude<EditorPageKind, 'group'>): EditorPage {
  return { key: kind, kind, groupId: null };
}

function isGroupPage(item: EditorPage | undefined): boolean {
  return item?.kind === 'group' || item?.kind === 'groups';
}

/** Scenario and rules, a page per group in stored order, then parties and coalition rules. */
export function editorPages(draft: Draft): readonly EditorPage[] {
  const groups: readonly EditorPage[] =
    draft.groups.length === 0
      ? [page('groups')]
      : draft.groups.map((group) => ({
          key: groupPageKey(group.id),
          kind: 'group' as const,
          groupId: group.id,
        }));
  return [
    page('scenario'),
    ...groups,
    page('parties'),
    page('coalition-rules'),
  ];
}

/**
 * The index of the saved page in the current list. A group page that is gone
 * gives the group page now at its saved position, clamped to the group pages;
 * any other unknown key gives the first page.
 */
export function resolvePage(
  pages: readonly EditorPage[],
  saved: SavedPage,
): number {
  const found = pages.findIndex((item) => item.key === saved.key);
  if (found >= 0) {
    return found;
  }
  if (saved.key !== 'groups' && !saved.key.startsWith(GROUP_PREFIX)) {
    return 0;
  }
  const first = pages.findIndex(isGroupPage);
  if (first < 0) {
    return 0;
  }
  let last = first;
  while (isGroupPage(pages[last + 1])) {
    last += 1;
  }
  if (saved.index < first) {
    return first;
  }
  return saved.index > last ? last : saved.index;
}
