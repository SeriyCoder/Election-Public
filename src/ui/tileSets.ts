import { useEffect, useMemo } from 'preact/hooks';
import { nearestCoalitions } from '../engine/coalitionVariants';
import type { SeatResult } from '../engine/run';
import type { Scenario } from '../engine/schema';
import { coalitionKey } from './coalitionChoice';
import type { CoalitionRun } from './coalitionRunner';
import type { Store } from './store';

export interface TileEntry {
  readonly key: string;
  readonly partyIds: readonly string[];
  readonly label: string;
}

/**
 * The coalition sets shown as tiles on the Coalitions view and as cards on
 * the future view: one store identity (`panel.tiles`, labels and custom sets).
 */
export function useTileSets(
  store: Store,
  scenario: Scenario,
  result: SeatResult,
  run?: CoalitionRun,
) {
  const session = store.getState().panel;
  const candidates = useMemo(
    () =>
      run?.state === 'done' && run.extras?.variants
        ? run.extras.variants
        : scenario.parties.length <= 10
          ? nearestCoalitions(scenario, result.allocation)
          : { variants: [], complete: false, total: 0 },
    [scenario, result, run],
  );
  const labels = useMemo(() => {
    const next = { ...session.labels };
    for (const variant of candidates.variants) {
      const key = coalitionKey(variant.partyIds);
      if (next[key] === undefined)
        next[key] =
          Object.values(next).reduce(
            (max, value) => (value > max ? value : max),
            0,
          ) + 1;
    }
    return next;
  }, [session.labels, candidates]);
  useEffect(() => {
    if (Object.keys(labels).length !== Object.keys(session.labels).length)
      store.setPanelSession({ labels });
  }, [store, labels, session.labels]);
  const automatic: readonly TileEntry[] = [
    ...candidates.variants.map((variant) => ({
      key: coalitionKey(variant.partyIds),
      partyIds: variant.partyIds,
      label: `№${labels[coalitionKey(variant.partyIds)]}`,
    })),
    ...Object.entries(labels)
      .filter(
        ([key]) =>
          !candidates.variants.some(
            (variant) => coalitionKey(variant.partyIds) === key,
          ) &&
          key
            .split('+')
            .every((id) => scenario.parties.some((party) => party.id === id)),
      )
      .map(([key, label]) => ({
        key,
        partyIds: key.split('+'),
        label: `№${label}`,
      })),
  ];
  // A custom set equal to a numbered set, or to an earlier custom set, is the
  // same coalition: it is listed once, under the first name it received.
  const canonical = new Map<string, string>();
  for (const entry of automatic)
    canonical.set(coalitionKey(entry.partyIds), entry.key);
  const customs: TileEntry[] = [];
  for (const entry of session.custom) {
    const set = coalitionKey(entry.partyIds);
    if (canonical.has(set)) continue;
    canonical.set(set, entry.key);
    customs.push(entry);
  }
  const entries: readonly TileEntry[] = [...customs, ...automatic];
  const resolve = (key: string) => {
    const entry = session.custom.find((item) => item.key === key);
    return entry ? canonical.get(coalitionKey(entry.partyIds))! : key;
  };
  /** The listed entry for a party set, if that coalition is already listed. */
  const existing = (partyIds: readonly string[]) => {
    const key = canonical.get(coalitionKey(partyIds));
    return key === undefined
      ? undefined
      : entries.find((entry) => entry.key === key);
  };
  const nearest = candidates.variants
    .slice(0, 4)
    .map((variant) => coalitionKey(variant.partyIds));
  const tiles = [...new Set((session.tiles ?? nearest).map(resolve))];
  const shown = tiles
    .map((key) => entries.find((entry) => entry.key === key))
    .filter((entry) => entry !== undefined);
  const options = [...entries].sort(
    (a, b) =>
      (b.key.startsWith('custom:') ? 1 : 0) -
        (a.key.startsWith('custom:') ? 1 : 0) ||
      (session.favourites.includes(b.key) ? 1 : 0) -
        (session.favourites.includes(a.key) ? 1 : 0),
  );
  return {
    candidates,
    labels,
    entries,
    nearest,
    tiles,
    shown,
    options,
    existing,
  };
}
