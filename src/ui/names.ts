import { ID_PREFIX, type EntityKind } from '../engine/edit';
import { LIMITS, type Scenario } from '../engine/schema';
import type { Translate } from '../i18n';
import { BOOK_SCENARIO_ID } from './book';
import { catalogNameKey } from './catalog';
import { presetIdOf } from './presets';

/** Anything with an ID and a possibly empty or unreadable stored name. */
export interface NamedEntity {
  readonly id: string;
  readonly name?: unknown;
}

const DIGITS = /^[1-9][0-9]*$/;
const COPY_NUMBER = / \(\d+\)$/;

/** A string that is not empty or whitespace only, or null. */
function customName(name: unknown): string | null {
  return typeof name === 'string' && /\S/.test(name) ? name : null;
}

/**
 * The stored name exactly as typed; else the catalog name of a catalog list or
 * group; else the localized kind label numbered by the ID digits (the whole
 * ID when it is not prefix plus digits). The number goes in as text, so no
 * thousands separator appears.
 */
export function entityName(
  kind: EntityKind,
  entity: NamedEntity,
  t: Translate,
): string {
  const custom = customName(entity.name);
  if (custom !== null) {
    return custom;
  }
  const catalog = catalogNameKey(kind, entity.id);
  if (catalog !== null) {
    return t(catalog);
  }
  const prefix = ID_PREFIX[kind];
  const digits = entity.id.slice(prefix.length);
  const n =
    entity.id.startsWith(prefix) && DIGITS.test(digits) ? digits : entity.id;
  return t(`entity.${kind}`, { n });
}

/** The stored scenario name, or the preset title, or the untitled label. */
export function scenarioTitle(input: unknown, t: Translate): string {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return t('app.untitled');
  }
  const { id, name } = input as {
    readonly id?: unknown;
    readonly name?: unknown;
  };
  const custom = customName(name);
  if (custom !== null) {
    return custom;
  }
  if (id === BOOK_SCENARIO_ID) {
    return t('book.scenarioTitle');
  }
  const preset = presetIdOf(id);
  return preset === null ? t('app.untitled') : t(`preset.${preset}`);
}

/** A copy of the scenario with every empty name resolved for display. */
export function withDisplayNames(scenario: Scenario, t: Translate): Scenario {
  if (scenario.inputMode === 'groups') {
    return {
      ...scenario,
      name: scenarioTitle(scenario, t),
      groups: scenario.groups.map((group) => ({
        ...group,
        name: entityName('group', group, t),
      })),
      parties: scenario.parties.map((party) => ({
        ...party,
        name: entityName('party', party, t),
      })),
      blocks: scenario.blocks.map((block) => ({
        ...block,
        name: entityName('block', block, t),
      })),
    };
  }
  return {
    ...scenario,
    name: scenarioTitle(scenario, t),
    groups: scenario.groups.map((group) => ({
      ...group,
      name: entityName('group', group, t),
    })),
    parties: scenario.parties.map((party) => ({
      ...party,
      name: entityName('party', party, t),
    })),
    blocks: scenario.blocks.map((block) => ({
      ...block,
      name: entityName('block', block, t),
    })),
  };
}

/**
 * The name of a duplicate: empty for an empty source; otherwise the base name
 * (a trailing " (k)" removed) with the smallest free " (n)" from 2. A copy
 * that would exceed the name limit is empty instead.
 */
export function copyName(name: unknown, names: readonly unknown[]): string {
  const custom = customName(name);
  if (custom === null) {
    return '';
  }
  const base = custom.replace(COPY_NUMBER, '');
  const taken = new Set(
    names.filter((item): item is string => typeof item === 'string'),
  );
  let n = 2;
  while (taken.has(`${base} (${n})`)) {
    n += 1;
  }
  const copy = `${base} (${n})`;
  return copy.length > LIMITS.nameLength ? '' : copy;
}
