import { describe, expect, it } from 'vitest';
import type { EntityKind } from '../../src/engine/edit';
import { runSeats, serializeResult } from '../../src/engine/run';
import {
  LIMITS,
  validateScenario,
  type Scenario,
} from '../../src/engine/schema';
import { LOCALES, TABLES, translator, type Locale } from '../../src/i18n';
import {
  copyName,
  entityName,
  scenarioTitle,
  withDisplayNames,
} from '../../src/ui/names';
import { BOOK_SCENARIO_ID } from '../../src/ui/book';
import { baselineInput, presetInput, PRESETS } from '../../src/ui/presets';

type Json = Record<string, unknown>;

const KINDS: readonly EntityKind[] = ['group', 'party', 'block'];

const LIST_KEY = {
  group: 'groups',
  party: 'parties',
  block: 'blocks',
} as const;

/** Scenario ID of each preset, as stored in its input. */
const PRESET_SCENARIO_ID = {
  baseline: 'baseline',
  turnoutZero: 'turnout-zero',
  share7: 'share-7',
  share8: 'share-8',
  split: 'split',
  multiBlock: 'multi-block',
  israelExample: 'israel-example',
  historical2022: 'historical-2022',
} as const;

function blankNames(input: Json): Json {
  const blank = (list: unknown): Json[] =>
    (list as Json[]).map((entity) => ({ ...entity, name: '' }));
  return {
    ...input,
    name: '',
    groups: blank(input.groups),
    parties: blank(input.parties),
    blocks: blank(input.blocks),
  };
}

function scenarioOf(input: unknown): Scenario {
  const validation = validateScenario(input);
  if (!validation.ok) {
    throw new Error('expected a valid scenario');
  }
  return validation.scenario;
}

/** The expected default label, with the ID digits inserted as text. */
function defaultLabel(locale: Locale, kind: EntityKind, id: string): string {
  return translator(locale)(`entity.${kind}`, { n: id.slice(1) });
}

function withoutNames(scenario: Scenario): Json {
  const strip = (list: readonly object[]): Json[] =>
    list.map((entity) => ({ ...entity, name: null }));
  return {
    ...scenario,
    name: null,
    groups: strip(scenario.groups),
    parties: strip(scenario.parties),
    blocks: strip(scenario.blocks),
  };
}

describe('entityName', () => {
  it.each(LOCALES)('keeps a custom name exactly as typed in %s', (locale) => {
    const t = translator(locale);
    for (const name of [
      'Likud',
      ' Likud ',
      'Партия 1',
      'מפלגה 9',
      'Group 2',
      '<script>x</script>',
    ]) {
      expect(entityName('party', { id: 'P1', name }, t)).toBe(name);
    }
  });

  it.each([
    ['party', 'P3', 'en', 'Party 3'],
    ['party', 'P3', 'ru', 'Партия 3'],
    ['party', 'P3', 'he', 'מפלגה 3'],
    ['group', 'G12', 'en', 'Group 12'],
    ['group', 'G1', 'he', 'קבוצה 1'],
    ['block', 'B2', 'ru', 'Блок 2'],
    ['block', 'B10', 'he', 'גוש 10'],
  ] as const)(
    'shows an empty %s name of %s as the %s label "%s"',
    (kind, id, locale, expected) => {
      expect(entityName(kind, { id, name: '' }, translator(locale))).toBe(
        expected,
      );
    },
  );

  it.each(LOCALES)('labels every kind by its ID digits in %s', (locale) => {
    const t = translator(locale);
    for (const kind of KINDS) {
      const id = `${kind === 'group' ? 'G' : kind === 'party' ? 'P' : 'B'}7`;
      expect(entityName(kind, { id, name: '' }, t)).toBe(
        defaultLabel(locale, kind, id),
      );
    }
  });

  it.each(['', ' ', '\t', '  \n  ', '\u00a0'])(
    'treats the name %j as empty',
    (name) => {
      expect(entityName('party', { id: 'P2', name }, translator('en'))).toBe(
        'Party 2',
      );
    },
  );

  it.each([undefined, null, 5, true, ['x'], { name: 'x' }])(
    'treats a name that is not a string (%j) as empty',
    (name) => {
      expect(entityName('block', { id: 'B4', name }, translator('en'))).toBe(
        'Block 4',
      );
    },
  );

  it('treats an entity without a name field as empty', () => {
    expect(entityName('group', { id: 'G3' }, translator('en'))).toBe('Group 3');
  });

  it.each([
    ['party', 'unknown-list', 'Party unknown-list'],
    ['party', 'G2', 'Party G2'],
    ['party', 'P01', 'Party P01'],
    ['party', 'P0', 'Party P0'],
    ['party', 'P1a', 'Party P1a'],
    ['party', 'P', 'Party P'],
    ['group', 'g3', 'Group g3'],
    ['block', 'B-2', 'Block B-2'],
  ] as const)(
    'uses the whole ID when %s ID %s is not its prefix and digits',
    (kind, id, expected) => {
      expect(entityName(kind, { id, name: '' }, translator('en'))).toBe(
        expected,
      );
    },
  );

  it.each([
    ['ru', 'Партия 12345'],
    ['en', 'Party 12345'],
    ['he', 'מפלגה 12345'],
  ] as const)(
    'inserts the number as text, without a separator, in %s',
    (locale, expected) => {
      expect(
        entityName('party', { id: 'P12345', name: '' }, translator(locale)),
      ).toBe(expected);
    },
  );
});

describe('catalog names', () => {
  const LISTS = [
    'likud',
    'yesh-atid',
    'religious-zionism',
    'national-unity',
    'shas',
    'utj',
    'yisrael-beiteinu',
    'raam',
    'hadash-taal',
    'avoda',
  ];
  const GROUPS = [
    'secular',
    'traditional',
    'religious',
    'haredi',
    'arab',
    'other',
  ];

  it.each(LOCALES)(
    'shows an empty-named catalog list or group by its catalog name in %s',
    (locale) => {
      const t = translator(locale);
      for (const id of LISTS) {
        const name = t(`catalog.party.${id}`);
        expect(name).not.toBe(`catalog.party.${id}`);
        expect(entityName('party', { id, name: '' }, t)).toBe(name);
        expect(entityName('party', { id, name: ' ' }, t)).toBe(name);
        expect(entityName('party', { id }, t)).toBe(name);
      }
      for (const id of GROUPS) {
        const name = t(`catalog.group.${id}`);
        expect(name).not.toBe(`catalog.group.${id}`);
        expect(entityName('group', { id, name: '' }, t)).toBe(name);
      }
    },
  );

  it.each([
    ['en', 'Likud'],
    ['ru', 'Ликуд'],
    ['he', 'הליכוד'],
  ] as const)('names likud in %s as "%s"', (locale, expected) => {
    expect(
      entityName('party', { id: 'likud', name: '' }, translator(locale)),
    ).toBe(expected);
  });

  it.each(LOCALES)('lets a typed name win over the catalog in %s', (locale) => {
    const t = translator(locale);
    expect(entityName('party', { id: 'likud', name: 'Мой Ликуд' }, t)).toBe(
      'Мой Ликуд',
    );
    expect(entityName('group', { id: 'arab', name: ' Group A ' }, t)).toBe(
      ' Group A ',
    );
  });

  it.each([
    ['group', 'likud', 'Group likud'],
    ['party', 'secular', 'Party secular'],
    ['block', 'likud', 'Block likud'],
    ['block', 'secular', 'Block secular'],
    ['party', 'Likud', 'Party Likud'],
    ['party', 'constructor', 'Party constructor'],
    ['group', 'toString', 'Group toString'],
  ] as const)(
    'gives a %s with the ID %s no catalog name',
    (kind, id, expected) => {
      expect(entityName(kind, { id, name: '' }, translator('en'))).toBe(
        expected,
      );
    },
  );

  it.each(LOCALES)(
    'resolves the Israeli example to catalog names in %s',
    (locale) => {
      const t = translator(locale);
      const display = withDisplayNames(
        scenarioOf(presetInput('israelExample')),
        t,
      );
      expect(display.name).toBe(t('preset.israelExample'));
      for (const party of display.parties) {
        expect(party.name).toBe(t(`catalog.party.${party.id}`));
      }
      for (const group of display.groups) {
        expect(group.name).toBe(t(`catalog.group.${group.id}`));
      }
      const names = display.parties.map((party) => party.name);
      expect(new Set(names).size).toBe(6);
    },
  );
});

describe('scenarioTitle', () => {
  it.each(LOCALES)('keeps a custom scenario name in %s', (locale) => {
    const t = translator(locale);
    for (const name of ['Мой сценарий', 'My plan', 'התרחיש שלי', ' x ']) {
      expect(scenarioTitle({ id: 'baseline', name }, t)).toBe(name);
      expect(scenarioTitle({ id: 'custom', name }, t)).toBe(name);
    }
  });

  it.each(PRESETS)(
    'shows the empty-named preset scenario %s as its title in every language',
    (preset) => {
      for (const locale of LOCALES) {
        const t = translator(locale);
        const title = t(`preset.${preset}`);
        expect(title).not.toBe(`preset.${preset}`);
        expect(
          scenarioTitle({ id: PRESET_SCENARIO_ID[preset], name: '' }, t),
        ).toBe(title);
      }
    },
  );

  it.each(['custom', 'Baseline', 'baseline ', 'baseline-2', 'turnoutZero', ''])(
    'shows the empty-named scenario %j as untitled',
    (id) => {
      for (const locale of LOCALES) {
        const t = translator(locale);
        expect(scenarioTitle({ id, name: '' }, t)).toBe(t('app.untitled'));
      }
    },
  );

  it.each(LOCALES)(
    'titles an empty-named questionnaire scenario in %s',
    (locale) => {
      const t = translator(locale);
      const title = t('book.scenarioTitle');
      expect(title).not.toBe('book.scenarioTitle');
      expect(scenarioTitle({ id: BOOK_SCENARIO_ID, name: '' }, t)).toBe(title);
      expect(scenarioTitle({ id: BOOK_SCENARIO_ID, name: 'План' }, t)).toBe(
        'План',
      );
    },
  );

  it('calls the questionnaire scenario "Моя симуляция" in Russian', () => {
    expect(
      scenarioTitle({ id: BOOK_SCENARIO_ID, name: '' }, translator('ru')),
    ).toBe('Моя симуляция');
  });

  it('treats a whitespace-only or non-string name as empty', () => {
    const t = translator('he');
    expect(scenarioTitle({ id: 'split', name: '  ' }, t)).toBe(
      t('preset.split'),
    );
    expect(scenarioTitle({ id: 'split', name: 7 }, t)).toBe(t('preset.split'));
    expect(scenarioTitle({ id: 'custom', name: null }, t)).toBe(
      t('app.untitled'),
    );
    expect(scenarioTitle({ name: '' }, t)).toBe(t('app.untitled'));
  });

  it.each([null, undefined, 'text', 42, [], ['baseline'], {}])(
    'shows untitled for the input %j',
    (input) => {
      const t = translator('ru');
      expect(scenarioTitle(input, t)).toBe(t('app.untitled'));
    },
  );
});

describe('withDisplayNames', () => {
  const blank = (): Scenario =>
    scenarioOf(blankNames(presetInput('multiBlock')));

  it.each(LOCALES)('resolves every empty name for %s', (locale) => {
    const t = translator(locale);
    const display = withDisplayNames(blank(), t);
    expect(display.name).toBe(t('preset.multiBlock'));
    for (const kind of KINDS) {
      for (const entity of display[LIST_KEY[kind]]) {
        expect(entity.name).toBe(defaultLabel(locale, kind, entity.id));
      }
    }
    expect(display.parties.map((party) => party.name)).toHaveLength(5);
  });

  it.each(LOCALES)('keeps custom names exactly as stored in %s', (locale) => {
    const input = blankNames(presetInput('multiBlock'));
    const custom: Json = {
      ...input,
      name: 'Мой сценарий',
      parties: (input.parties as Json[]).map((party) =>
        party.id === 'P1' ? { ...party, name: 'Likud' } : party,
      ),
      groups: (input.groups as Json[]).map((group) =>
        group.id === 'G2' ? { ...group, name: ' Group two ' } : group,
      ),
      blocks: (input.blocks as Json[]).map((block) =>
        block.id === 'B3' ? { ...block, name: 'גוש ימין' } : block,
      ),
    };
    const t = translator(locale);
    const display = withDisplayNames(scenarioOf(custom), t);
    expect(display.name).toBe('Мой сценарий');
    expect(display.parties[0]!.name).toBe('Likud');
    expect(display.parties[1]!.name).toBe(defaultLabel(locale, 'party', 'P2'));
    expect(display.groups[1]!.name).toBe(' Group two ');
    expect(display.blocks[2]!.name).toBe('גוש ימין');
    expect(display.blocks[0]!.name).toBe(defaultLabel(locale, 'block', 'B1'));
  });

  it('shows a scenario with an unknown ID and no name as untitled', () => {
    const t = translator('en');
    const input = { ...blankNames(baselineInput()), id: 'custom' };
    expect(withDisplayNames(scenarioOf(input), t).name).toBe(t('app.untitled'));
  });

  it('does not mutate the stored scenario', () => {
    const scenario = blank();
    const before = JSON.stringify(scenario);
    const display = withDisplayNames(scenario, translator('he'));
    expect(display).not.toBe(scenario);
    expect(JSON.stringify(scenario)).toBe(before);
    expect(scenario.parties[0]!.name).toBe('');
  });

  it.each(LOCALES)('changes nothing but the names in %s', (locale) => {
    const scenario = blank();
    const display = withDisplayNames(scenario, translator(locale));
    expect(withoutNames(display)).toEqual(withoutNames(scenario));
  });

  it.each(PRESETS)('%s gives the same seats with display names', (id) => {
    const scenario = scenarioOf(blankNames(presetInput(id)));
    for (const locale of LOCALES) {
      const display = withDisplayNames(scenario, translator(locale));
      expect(serializeResult(runSeats(display))).toBe(
        serializeResult(runSeats(scenario)),
      );
    }
  });
});

describe('copyName', () => {
  it.each(['', ' ', '\t', undefined, null, 5])(
    'gives an empty name for a copy of the empty name %j',
    (name) => {
      expect(copyName(name, ['', 'Likud'])).toBe('');
    },
  );

  it('appends (2) to a fresh custom name', () => {
    expect(copyName('Likud', ['Likud', ''])).toBe('Likud (2)');
  });

  it('takes the next free number', () => {
    expect(copyName('Likud', ['Likud', 'Likud (2)'])).toBe('Likud (3)');
  });

  it('numbers a copy of a copy from its base name', () => {
    expect(copyName('Likud (2)', ['Likud', 'Likud (2)'])).toBe('Likud (3)');
    expect(copyName('A (1)', ['A (1)'])).toBe('A (2)');
  });

  it('fills the smallest free number', () => {
    expect(copyName('Likud', ['Likud', 'Likud (3)'])).toBe('Likud (2)');
    expect(copyName('Likud (5)', ['Likud (5)', 'Likud (2)'])).toBe('Likud (3)');
  });

  it('strips only a trailing number in brackets', () => {
    expect(copyName('X (abc)', ['X (abc)'])).toBe('X (abc) (2)');
    expect(copyName('Union (1999) list', ['Union (1999) list'])).toBe(
      'Union (1999) list (2)',
    );
    expect(copyName('Union(2)', ['Union(2)'])).toBe('Union(2) (2)');
  });

  it('keeps Hebrew and Cyrillic names', () => {
    expect(copyName('הליכוד', ['הליכוד'])).toBe('הליכוד (2)');
    expect(copyName('Партия мира', ['Партия мира'])).toBe('Партия мира (2)');
  });

  it('compares names exactly and ignores entries that are not strings', () => {
    expect(copyName('Likud', ['Likud', 'likud (2)'])).toBe('Likud (2)');
    expect(copyName('A', ['A', 5, null, undefined])).toBe('A (2)');
  });

  it('keeps a copy at the name limit and empties a longer one', () => {
    const fits = 'x'.repeat(LIMITS.nameLength - 4);
    expect(copyName(fits, [fits])).toBe(`${fits} (2)`);
    expect(copyName(`${fits}x`, [`${fits}x`])).toBe('');
    const tens = 'y'.repeat(LIMITS.nameLength - 5);
    const taken = [
      tens,
      ...[2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${tens} (${n})`),
    ];
    expect(copyName(tens, taken)).toBe(`${tens} (10)`);
    expect(copyName(`${tens}y`, [`${tens}y`, `${tens}y (2)`])).toBe(
      `${tens}y (3)`,
    );
  });

  it('strips the old number before checking the limit', () => {
    const base = 'z'.repeat(LIMITS.nameLength - 4);
    expect(copyName(`${base} (2)`, [base, `${base} (2)`])).toBe(`${base} (3)`);
  });
});

describe('translation tables', () => {
  it.each(LOCALES)('%s has no copy suffix key', (locale) => {
    expect(Object.keys(TABLES[locale])).not.toContain('entity.copy');
  });
});
