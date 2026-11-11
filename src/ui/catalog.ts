import type { EntityKind } from '../engine/edit';
import { HISTORICAL_2022 } from '../engine/historical2022';

/** A catalog entry: the entity ID it is stored under and its colour. */
export interface CatalogEntry {
  readonly id: string;
  readonly color: string;
}

/** The election the catalog describes: the 25th Knesset. */
export const CATALOG_YEAR = 2022;

/** The seven groups of the Basic (Israel) set, in the questionnaire's order. */
export const CATALOG_GROUPS: readonly CatalogEntry[] = [
  { id: 'secular', color: '#0891B2' },
  { id: 'traditional', color: '#D97706' },
  { id: 'religious', color: '#7C3AED' },
  { id: 'knitted-kippot', color: '#BE185D' },
  { id: 'arab', color: '#15803D' },
  { id: 'haredi', color: '#262626' },
  { id: 'other', color: '#6B7280' },
];

/** The ten lists that won seats in 2022, in seat order. */
export const CATALOG_LISTS: readonly CatalogEntry[] = [
  { id: 'likud', color: '#1D4ED8' },
  { id: 'yesh-atid', color: '#38BDF8' },
  { id: 'religious-zionism', color: '#CA8A04' },
  { id: 'national-unity', color: '#0D9488' },
  { id: 'shas', color: '#475569' },
  { id: 'utj', color: '#1E293B' },
  { id: 'yisrael-beiteinu', color: '#4338CA' },
  { id: 'raam', color: '#65A30D' },
  { id: 'hadash-taal', color: '#9D174D' },
  { id: 'avoda', color: '#DC2626' },
];

/** The six-list educational set of Section 14.4, in table order. */
export const EXAMPLE_LISTS: readonly string[] = [
  'likud',
  'yesh-atid',
  'avoda',
  'religious-zionism',
  'shas',
  'raam',
];

const GROUP_COLORS = new Map(CATALOG_GROUPS.map((g) => [g.id, g.color]));
const LIST_COLORS = new Map(CATALOG_LISTS.map((l) => [l.id, l.color]));
const EXTRA_COLORS = [
  '#7C3AED',
  '#BE185D',
  '#C2410C',
  '#047857',
  '#1D4ED8',
  '#A16207',
  '#0E7490',
  '#6D28D9',
  '#9F1239',
  '#4D7C0F',
] as const;
const HISTORICAL_COLORS = new Map(
  HISTORICAL_2022.lists
    .filter((entry) => !LIST_COLORS.has(entry.id))
    .map((entry, index) => [
      entry.id,
      EXTRA_COLORS[index % EXTRA_COLORS.length] ?? '#6B7280',
    ]),
);

/** The translation key of a catalog name, or null outside the catalog. */
export function catalogNameKey(kind: EntityKind, id: string): string | null {
  if (kind === 'party' && (LIST_COLORS.has(id) || HISTORICAL_COLORS.has(id))) {
    return `catalog.party.${id}`;
  }
  if (kind === 'group' && GROUP_COLORS.has(id)) {
    return `catalog.group.${id}`;
  }
  return null;
}

/** The translation key of a list's neutral description, or null. */
export function catalogAboutKey(kind: EntityKind, id: string): string | null {
  return kind === 'party' && LIST_COLORS.has(id)
    ? `catalog.party.${id}.about`
    : null;
}

/** The colour of a catalog group, or null for any other group ID. */
export function catalogGroupColor(id: string): string | null {
  return GROUP_COLORS.get(id) ?? null;
}

/** The colour of a catalog list, or null for any other party ID. */
export function catalogListColor(id: string): string | null {
  return LIST_COLORS.get(id) ?? HISTORICAL_COLORS.get(id) ?? null;
}
