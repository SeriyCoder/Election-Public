import { catalogGroupColor } from './catalog';

/**
 * Colours that mark population groups, by position in the scenario. Groups
 * are round markers and lists are square swatches, so the two never mix.
 */
export const GROUP_PALETTE: readonly string[] = [
  '#0891B2',
  '#D97706',
  '#7C3AED',
  '#262626',
  '#15803D',
  '#6B7280',
  '#BE185D',
  '#0F766E',
  '#A16207',
  '#1D4ED8',
  '#9333EA',
  '#B91C1C',
];

export function groupColor(index: number): string {
  return GROUP_PALETTE[index % GROUP_PALETTE.length] ?? '#6B7280';
}

// M2-22: a catalog group keeps its catalog colour wherever it stands.
export function groupColorOf(id: string, index: number): string {
  return catalogGroupColor(id) ?? groupColor(index);
}
