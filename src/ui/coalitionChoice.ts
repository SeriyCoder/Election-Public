/** The coalitions offered on the demographic future view (M2-30). No arithmetic. */

/** How many coalitions the future view follows at once. */
export const MAX_FUTURE_COALITIONS = 4;

/** Why an entry is listed: still ticked, the Coalitions tab set, or the search. */
export type ChoiceSource = 'ticked' | 'own' | 'minimal';

export interface ChooserEntry {
  /** The order-free key of the party set. */
  readonly key: string;
  /** The members in scenario order. */
  readonly partyIds: readonly string[];
  readonly source: ChoiceSource;
  readonly checked: boolean;
  /** True when the limit is reached and this entry is not ticked. */
  readonly disabled: boolean;
}

export interface ChooserSources {
  /** The ticked sets in tick order. */
  readonly ticked: readonly (readonly string[])[];
  /** The party set put together on the Coalitions tab. */
  readonly own: readonly string[];
  /** Today's minimal winning coalitions in the search's order. */
  readonly minimal: readonly { readonly partyIds: readonly string[] }[];
  /** The scenario's party IDs in order; sets with any other ID are left out. */
  readonly partyOrder: readonly string[];
}

/** The same key for the same set, whatever the order or repeats of the IDs. */
export function coalitionKey(partyIds: readonly string[]): string {
  return [...new Set(partyIds)].sort().join('+');
}

/**
 * Ticked sets missing below come first in tick order, then the Coalitions tab
 * set unless the search lists it, then the search's coalitions; each set once.
 */
export function chooserEntries(
  sources: ChooserSources,
): readonly ChooserEntry[] {
  const known = new Set(sources.partyOrder);
  const inOrder = (partyIds: readonly string[]): string[] | null => {
    if (!partyIds.every((id) => known.has(id))) {
      return null;
    }
    const members = new Set(partyIds);
    return sources.partyOrder.filter((id) => members.has(id));
  };

  const ticked = sources.ticked
    .map(inOrder)
    .filter((ids): ids is string[] => ids !== null);
  const tickedKeys = new Set(ticked.map(coalitionKey));
  const full = tickedKeys.size >= MAX_FUTURE_COALITIONS;

  const listed: { partyIds: string[]; source: ChoiceSource }[] = [];
  const own = inOrder(sources.own);
  if (own !== null && own.length > 0) {
    listed.push({ partyIds: own, source: 'own' });
  }
  for (const coalition of sources.minimal) {
    const ids = inOrder(coalition.partyIds);
    if (ids !== null) {
      listed.push({ partyIds: ids, source: 'minimal' });
    }
  }

  const minimalKeys = new Set(
    listed
      .filter((item) => item.source === 'minimal')
      .map((item) => coalitionKey(item.partyIds)),
  );
  const below = listed.filter(
    (item) =>
      item.source === 'minimal' ||
      !minimalKeys.has(coalitionKey(item.partyIds)),
  );
  const belowKeys = new Set(below.map((item) => coalitionKey(item.partyIds)));

  const ordered = [
    ...ticked
      .filter((ids) => !belowKeys.has(coalitionKey(ids)))
      .map((ids) => ({ partyIds: ids, source: 'ticked' as ChoiceSource })),
    ...below,
  ];

  const seen = new Set<string>();
  const result: ChooserEntry[] = [];
  for (const item of ordered) {
    const key = coalitionKey(item.partyIds);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const checked = tickedKeys.has(key);
    result.push({
      key,
      partyIds: item.partyIds,
      source: item.source,
      checked,
      disabled: !checked && full,
    });
  }
  return result;
}
