import { describe, expect, it } from 'vitest';
import { LOCALES, translator } from '../../src/i18n';
import {
  CATALOG_GROUPS,
  CATALOG_LISTS,
  CATALOG_YEAR,
  EXAMPLE_LISTS,
  catalogAboutKey,
  catalogGroupColor,
  catalogNameKey,
} from '../../src/ui/catalog';

const sources = import.meta.glob('../../src/ui/catalog.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const GROUP_IDS = [
  'secular',
  'traditional',
  'religious',
  'knitted-kippot',
  'arab',
  'haredi',
  'other',
] as const;

/** The lists that won seats in 2022, in seat order. */
const LIST_IDS = [
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
] as const;

const RU_LISTS: Readonly<Record<(typeof LIST_IDS)[number], [string, string]>> =
  {
    likud: ['Ликуд', 'Крупная правая партия'],
    'yesh-atid': ['Еш Атид', 'Центристская партия с либеральной повесткой'],
    'religious-zionism': [
      'Религиозный сионизм — Оцма Йехудит',
      'Совместный список 2022 года национально-религиозного и правого направлений: Религиозный сионизм, Оцма Йехудит и Ноам',
    ],
    'national-unity': [
      'Государственный лагерь',
      'Центристский совместный список',
    ],
    shas: [
      'ШАС',
      'Религиозная партия сефардского ультраортодоксального направления',
    ],
    utj: ['Яадут ха-Тора', 'Ашкеназский ультраортодоксальный список'],
    'yisrael-beiteinu': ['Наш дом Израиль', 'Светская правая партия'],
    raam: ['РААМ', 'Арабская партия исламского направления'],
    'hadash-taal': ['Хадаш — Таль', 'Арабский и арабо-еврейский левый список'],
    avoda: ['Авода', 'Социал-демократическая партия'],
  };

const RU_GROUPS: Readonly<Record<(typeof GROUP_IDS)[number], string>> = {
  secular: 'Светские евреи',
  traditional: 'Традиционные евреи, масорти ле дати',
  religious: 'Религиозные евреи, не харедим',
  'knitted-kippot': 'Вязаные кипы, поселенцы',
  haredi: 'Ультраортодоксальные евреи, харедим',
  arab: 'Арабские граждане',
  other: 'Другие / не классифицированы',
};

describe('2022 catalog', () => {
  it('is tagged with the 2022 election', () => {
    expect(CATALOG_YEAR).toBe(2022);
  });

  it('lists the Basic (Israel) groups with their colours (M7-15 order)', () => {
    expect(CATALOG_GROUPS).toEqual([
      { id: 'secular', color: '#0891B2' },
      { id: 'traditional', color: '#D97706' },
      { id: 'religious', color: '#7C3AED' },
      { id: 'knitted-kippot', color: '#BE185D' },
      { id: 'arab', color: '#15803D' },
      { id: 'haredi', color: '#262626' },
      { id: 'other', color: '#6B7280' },
    ]);
  });

  it('lists the ten lists that won seats in 2022, in seat order', () => {
    expect(CATALOG_LISTS).toEqual([
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
    ]);
  });

  it('gives every list a distinct colour', () => {
    const colors = CATALOG_LISTS.map((list) => list.color.toLowerCase());
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('uses IDs the scenario schema accepts and no ID twice', () => {
    const ids = [
      ...CATALOG_GROUPS.map((group) => group.id),
      ...CATALOG_LISTS.map((list) => list.id),
    ];
    for (const id of ids) {
      expect(id).toMatch(/^[a-z][a-z-]*$/);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names the six-list educational set in table order', () => {
    expect(EXAMPLE_LISTS).toEqual([
      'likud',
      'yesh-atid',
      'avoda',
      'religious-zionism',
      'shas',
      'raam',
    ]);
    const known = CATALOG_LISTS.map((list) => list.id) as readonly string[];
    for (const id of EXAMPLE_LISTS) {
      expect(known).toContain(id);
    }
  });

  it('builds the catalog without the translation tables', () => {
    const source = sources['../../src/ui/catalog.ts'] as string;
    expect(source).toBeDefined();
    expect(source).not.toMatch(/from\s+'\.\.\/i18n/);
  });
});

describe('catalog lookups', () => {
  it.each(LIST_IDS)('finds the name and description keys of %s', (id) => {
    expect(catalogNameKey('party', id)).toBe(`catalog.party.${id}`);
    expect(catalogAboutKey('party', id)).toBe(`catalog.party.${id}.about`);
  });

  it.each(GROUP_IDS)('finds the name key and colour of group %s', (id) => {
    expect(catalogNameKey('group', id)).toBe(`catalog.group.${id}`);
    expect(catalogAboutKey('group', id)).toBeNull();
    expect(catalogGroupColor(id)).toBe(
      CATALOG_GROUPS.find((group) => group.id === id)?.color,
    );
  });

  it.each([
    ['party', 'secular'],
    ['group', 'likud'],
    ['block', 'likud'],
    ['block', 'secular'],
    ['party', 'P1'],
    ['party', 'Likud'],
    ['party', 'likud '],
    ['party', ''],
    ['party', 'constructor'],
    ['party', 'toString'],
    ['group', '__proto__'],
  ] as const)('finds nothing for a %s with the ID %j', (kind, id) => {
    expect(catalogNameKey(kind, id)).toBeNull();
    expect(catalogAboutKey(kind, id)).toBeNull();
  });

  it.each(['likud', 'G1', '', 'constructor', 'Secular'])(
    'gives no catalog colour to the group ID %j',
    (id) => {
      expect(catalogGroupColor(id)).toBeNull();
    },
  );
});

describe('catalog strings', () => {
  it.each(LOCALES)('has every catalog name and description in %s', (locale) => {
    const t = translator(locale);
    const keys = [
      ...LIST_IDS.flatMap((id) => [
        `catalog.party.${id}`,
        `catalog.party.${id}.about`,
      ]),
      ...GROUP_IDS.map((id) => `catalog.group.${id}`),
      'catalog.line',
      'preset.israelExample',
      'example.israel.note',
    ];
    for (const key of keys) {
      const value = t(key, { about: 'x' });
      expect(value, key).not.toBe(key);
      expect(value.trim(), key).not.toBe('');
    }
    const names = LIST_IDS.map((id) => t(`catalog.party.${id}`));
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(LIST_IDS)('names and describes %s neutrally in Russian', (id) => {
    const t = translator('ru');
    const [name, about] = RU_LISTS[id];
    expect(t(`catalog.party.${id}`)).toBe(name);
    expect(t(`catalog.party.${id}.about`)).toBe(about);
  });

  it.each(GROUP_IDS)('names the group %s in Russian', (id) => {
    expect(translator('ru')(`catalog.group.${id}`)).toBe(RU_GROUPS[id]);
  });

  it('labels the example as educational, not results or a poll', () => {
    const t = translator('ru');
    expect(t('preset.israelExample')).toBe('Израильский учебный пример (2022)');
    const note = t('example.israel.note');
    expect(note).toContain('Учебный пример');
    expect(note).toContain('2022');
    expect(note).toContain('не опрос');
    expect(note).toContain('допущения');
    expect(note).toContain('Центрального статистического бюро Израиля');
  });

  it.each(LOCALES)(
    'puts the description into the catalog line in %s',
    (locale) => {
      const t = translator(locale);
      const line = t('catalog.line', { about: 'ABOUT' });
      expect(line).toContain('ABOUT');
      expect(line).toContain('2022');
    },
  );
});
