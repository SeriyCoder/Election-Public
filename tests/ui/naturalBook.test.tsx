import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { describeElectorate } from '../../src/engine/electorate';
import {
  evenPercents,
  fractionToPercent,
  percentRemainder,
} from '../../src/engine/numeric';
import { runSeats } from '../../src/engine/run';
import { validateScenario } from '../../src/engine/schema';
import { formatYears, LOCALES, translator } from '../../src/i18n';
import { pluralCategory } from '../../src/i18n/format';
import { App } from '../../src/ui/App';
import {
  alignComposition,
  bookPages,
  buildBook,
  editPage,
  electorateCheck,
  EMPTY_BOOK,
  EMPTY_DRAFT,
  exampleGroupSet,
  groupIds,
  pageError,
  pageParts,
  shownTexts,
  type BookDraft,
} from '../../src/ui/book';
import { CATALOG_GROUPS, catalogNameKey } from '../../src/ui/catalog';
import { EXAMPLE_GROUPS } from '../../src/ui/presets';
import { createStore } from '../../src/ui/store';
import { workspaceParties } from '../engine/helpers/workspace';
import type { Json } from '../engine/helpers/scenarios';

const BASIC = [
  'secular',
  'traditional',
  'religious',
  'knitted-kippot',
  'arab',
  'haredi',
  'other',
];

function count(text: string, pattern: RegExp) {
  return [...text.matchAll(new RegExp(pattern.source, 'g'))].length;
}

/** The text from the opening tag carrying `marker` to its matching close. */
function element(text: string, marker: string) {
  const at = text.indexOf(marker);
  if (at < 0) return '';
  const start = text.lastIndexOf('<', at);
  const name = /^<([a-z0-9]+)/.exec(text.slice(start))![1]!;
  const pattern = new RegExp(`<${name}[\\s>]|</${name}>`, 'g');
  pattern.lastIndex = start + 1;
  let depth = 1;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return text.slice(start, match.index + match[0].length);
  }
  return text.slice(start);
}

function fullExample(): BookDraft {
  const draft = editPage(EMPTY_DRAFT, 'parties.count', 0, '6');
  return editPage(draft, 'parties.naming', 0, 'example');
}

/** Ten parties and eight own groups, all with long unbroken names. */
function heavy(): BookDraft {
  let draft = editPage(EMPTY_DRAFT, 'parties.count', 0, '10');
  draft = editPage(draft, 'parties.naming', 0, 'own');
  for (let slot = 0; slot < 10; slot += 1) {
    draft = editPage(
      draft,
      'parties.names',
      2 * slot + 1,
      `Партия ${slot + 1} ${'длинное название '.repeat(3)}`.slice(0, 60),
    );
  }
  draft = editPage(draft, 'people.set', 0, 'own');
  draft = editPage(draft, 'people.count', 0, '8');
  for (let slot = 0; slot < 8; slot += 1) {
    draft = editPage(
      draft,
      'people.names',
      2 * slot + 1,
      `Группа${slot + 1}${'Ш'.repeat(53)}`,
    );
  }
  return draft;
}

function bookStore(
  page: string,
  draft: BookDraft = EMPTY_DRAFT,
  language: (typeof LOCALES)[number] = 'ru',
  attempted = false,
) {
  return createStore({
    language,
    screen: 'book',
    book: { ...EMPTY_BOOK, page, draft, attempted },
  });
}

function html(page: string, draft?: BookDraft, language?: 'ru' | 'en' | 'he') {
  return renderToString(<App store={bookStore(page, draft, language)} />);
}

describe('M7-15 Basic (Israel) groups', () => {
  it('adds knitted kippot and orders the catalog like the user set', () => {
    expect(CATALOG_GROUPS.map((group) => group.id)).toEqual(BASIC);
    expect(new Set(CATALOG_GROUPS.map((group) => group.color)).size).toBe(7);
    expect(catalogNameKey('group', 'knitted-kippot')).toBe(
      'catalog.group.knitted-kippot',
    );
    expect(groupIds(EMPTY_DRAFT)).toEqual(BASIC);
  });

  it('uses the user wording in Russian and names the new group in every language', () => {
    const ru = translator('ru');
    expect(ru('catalog.group.traditional')).toBe(
      'Традиционные евреи, масорти ле дати',
    );
    expect(ru('catalog.group.arab')).toBe('Арабские граждане');
    expect(ru('catalog.group.knitted-kippot')).toBe('Вязаные кипы, поселенцы');
    for (const language of LOCALES) {
      const name = translator(language)('catalog.group.knitted-kippot');
      expect(name).not.toBe('catalog.group.knitted-kippot');
      expect(name.length).toBeGreaterThan(3);
    }
  });

  it('keeps the Section 14.4 six-group example data unchanged', () => {
    expect(EXAMPLE_GROUPS.map(([id]) => id)).toEqual([
      'secular',
      'traditional',
      'religious',
      'haredi',
      'arab',
      'other',
    ]);
  });

  it('cites the source only where it gives a share and invents none for the new group', () => {
    const set = exampleGroupSet();
    expect(set.map((row) => row.groupId)).toEqual(BASIC);
    const share = Object.fromEntries(
      set.map((row) => [row.groupId, row.share]),
    );
    expect(share).toEqual({
      secular: '33.6',
      traditional: '24.5',
      religious: '7.9',
      'knitted-kippot': null,
      arab: '17',
      haredi: '11',
      other: '6',
    });
    const page = html('people.set');
    expect(count(page, /data-set-group="/)).toBe(6);
    expect(page).not.toContain('data-set-group="knitted-kippot"');
    expect(page).not.toContain('data-set-note');
    expect(page).not.toContain('data-set-share="true">—');
  });

  it('maps the 2022 statistic column by group ID', () => {
    const rows = electorateCheck(EMPTY_DRAFT, []);
    const stat = Object.fromEntries(
      rows.map((row) => [row.groupId, row.statistic]),
    );
    expect(stat).toEqual({
      secular: '33.6',
      traditional: '24.5',
      religious: '7.9',
      'knitted-kippot': null,
      arab: '17',
      haredi: '11',
      other: '6',
    });
  });
});

describe('M7-15 composition always distributed on one page', () => {
  it('has no composition choice pages and one compose page after the vote shares', () => {
    expect(bookPages(EMPTY_DRAFT)).toEqual([
      'intro',
      'parties.count',
      'parties.naming',
      'parties.names',
      'people.about',
      'people.mix',
      'people.set',
      'turnout',
      'votes.shares',
      'compose',
      'votes.check',
      'growth',
      'rules.seats',
      'rules.threshold',
      'coalitions',
      'review',
    ]);
    const pages = bookPages(heavy());
    expect(pages.filter((page) => page.startsWith('compose'))).toEqual([
      'compose',
    ]);
    const none = editPage(EMPTY_DRAFT, 'people.set', 0, 'none');
    expect(bookPages(none)).toContain('compose');
  });

  it('starts every party at the explicit even split', () => {
    const texts = shownTexts(EMPTY_DRAFT, 'compose');
    expect(texts).toHaveLength(4 * 7);
    for (let party = 0; party < 4; party += 1) {
      expect(texts.slice(party * 7, party * 7 + 7)).toEqual(evenPercents(7));
    }
    const page = html('compose');
    expect(page).toContain('data-compose-assumption');
    expect(element(page, 'data-compose-assumption')).toContain(
      translator('ru')('book.compose.assumption'),
    );
  });

  it('maps the six-list example compositions by group ID with none for the new group', () => {
    const described = describeElectorate(
      EXAMPLE_GROUPS.map(([, share]) => fractionToPercent(share) ?? '0'),
      EXAMPLE_GROUPS.map(() => '70'),
      EXAMPLE_GROUPS.map(([, , weights]) =>
        weights.map((weight) => fractionToPercent(weight) ?? '0'),
      ),
      2,
      1,
    );
    expect(described).not.toBeNull();
    const draft = fullExample();
    const texts = shownTexts(draft, 'compose');
    expect(texts).toHaveLength(6 * 7);
    for (let party = 0; party < 6; party += 1) {
      const slice = texts.slice(party * 7, party * 7 + 7);
      expect(percentRemainder(slice)).toBe('0');
      expect(slice[BASIC.indexOf('knitted-kippot')]).toBe('0');
      EXAMPLE_GROUPS.forEach(([id], g) => {
        expect(slice[BASIC.indexOf(id)]).toBe(
          described!.compositions[party]![g],
        );
      });
    }
  });

  it('builds every party with an exact composition and keeps the example seats', () => {
    for (const draft of [EMPTY_DRAFT, fullExample(), heavy()]) {
      const input = buildBook(draft, bookPages(draft)).input;
      const result = validateScenario(input);
      expect(result.ok).toBe(true);
      if (!result.ok || result.scenario.inputMode !== 'parties') continue;
      for (const party of result.scenario.parties) {
        expect(party.composition).not.toBeNull();
        expect(Object.keys(party.composition ?? {})).toEqual(groupIds(draft));
      }
    }
    const input = buildBook(fullExample(), bookPages(fullExample())).input;
    const result = validateScenario(input);
    if (!result.ok || result.scenario.inputMode !== 'parties')
      throw new Error('invalid');
    expect(
      runSeats(result.scenario).allocation.parties.map((party) => party.seats),
    ).toEqual([31, 30, 11, 14, 18, 16]);
    for (const language of LOCALES) {
      const store = createStore({
        language,
        input: JSON.parse(JSON.stringify(input)) as unknown,
      });
      expect(store.getDerived().result).toEqual(runSeats(result.scenario));
    }
  });

  it('refuses to leave while any party is not at exactly 100% and names that party', () => {
    let draft = editPage(EMPTY_DRAFT, 'compose', 2 * 7, '50');
    expect(pageError(draft, 'compose')).toMatchObject({
      code: 'sum',
      index: 2 * 7,
    });
    draft = editPage(EMPTY_DRAFT, 'compose', 3 * 7 + 1, 'x');
    expect(pageError(draft, 'compose')).toMatchObject({
      code: 'percent',
      index: 3 * 7 + 1,
    });
    const store = bookStore(
      'compose',
      editPage(EMPTY_DRAFT, 'compose', 14, '50'),
    );
    expect(store.bookNext()).toBe(false);
    expect(store.getState().book.page).toBe('compose');
    expect(store.getState().book.attempted).toBe(true);
    const page = renderToString(<App store={store} />);
    expect(page).toContain('data-compose-shown="2"');
    expect(page).toContain('data-book-error');
  });

  it('aligns one party exactly to 100% in proportion through the engine', () => {
    const draft = editPage(EMPTY_DRAFT, 'compose', 2 * 7, '50');
    const aligned = alignComposition(draft, 2);
    const slice = shownTexts(aligned, 'compose').slice(14, 21);
    expect(percentRemainder(slice)).toBe('0');
    expect(slice.every((text) => /^\d+(\.\d{1,2})?$/.test(text))).toBe(true);
    expect(Number(slice[0])).toBeGreaterThan(Number(slice[1]));
    expect(shownTexts(aligned, 'compose').slice(0, 14)).toEqual(
      shownTexts(draft, 'compose').slice(0, 14),
    );
    expect(pageError(aligned, 'compose')).toBeNull();
    const store = bookStore('compose', draft);
    store.bookAlign(2);
    expect(shownTexts(store.getState().book.draft, 'compose')).toEqual(
      shownTexts(aligned, 'compose'),
    );
    expect(store.bookNext()).toBe(true);
    expect(store.getState().book.page).toBe('votes.check');
  });

  it('keeps locked groups exactly when aligning and renders a lock per group', () => {
    let draft = EMPTY_DRAFT;
    const values = ['40', '20', '10', '10', '0', '0', '0'];
    values.forEach((value, group) => {
      draft = editPage(draft, 'compose', 2 * 7 + group, value);
    });
    const aligned = alignComposition(draft, 2, [0]);
    const slice = shownTexts(aligned, 'compose').slice(14, 21);
    expect(slice).toEqual(['40', '30', '15', '15', '0', '0', '0']);
    expect(alignComposition(draft, 2, [0, 1, 2, 3])).toBe(draft);
    const store = bookStore('compose', draft);
    store.bookAlign(2, [0]);
    expect(shownTexts(store.getState().book.draft, 'compose')).toEqual(
      shownTexts(aligned, 'compose'),
    );
    const page = renderToString(<App store={store} />);
    expect(page.match(/data-compose-lock=/g)?.length).toBe(7);
    expect(page).toContain('step="0.25"');
  });

  it.each(LOCALES)(
    'renders the party selector, bar, every group and the align action in %s',
    (language) => {
      const page = html('compose', EMPTY_DRAFT, language);
      const select = element(page, 'data-compose-party');
      expect(count(select, /<option/)).toBe(4);
      expect(page).toContain('data-action="compose-previous"');
      expect(page).toContain('data-action="compose-next"');
      expect(count(element(page, 'data-compose-bar'), /data-segment="/)).toBe(
        7,
      );
      expect(count(page, /data-book-cell="/)).toBe(7);
      expect(count(page, /type="range"/)).toBe(7);
      expect(page).toContain('data-action="compose-align"');
      expect(page).toContain('data-remainder');
      expect(page).not.toContain('data-part-step');
      expect(page).not.toContain('data-rows-more');
      expect(page).not.toContain('data-pie');
    },
  );
});

describe('M7-15 single compact screens', () => {
  it('keeps every compact page in one part even with ten long parties and eight long groups', () => {
    const draft = heavy();
    for (const page of [
      'turnout',
      'votes.shares',
      'compose',
      'votes.check',
      'growth',
      'coalitions',
    ]) {
      expect(pageParts(draft, page)).toHaveLength(1);
    }
  });

  it('shows all eight groups on the turnout and growth screens', () => {
    const draft = heavy();
    for (const key of ['turnout', 'growth']) {
      const page = html(key, draft);
      expect(count(page, /data-book-rate="/)).toBe(8);
      expect(page).not.toContain('data-rows-more');
      expect(page).not.toContain('data-rows-range');
      expect(page).not.toContain('data-part-step');
    }
    const growth = html('growth', draft);
    expect(count(growth, /min="-5" max="5" step="0.25"/)).toBe(8);
  });

  it('shows all ten vote shares as compact cells with a bar instead of the side pie', () => {
    const page = html('votes.shares', heavy());
    expect(count(page, /data-book-cell="/)).toBe(10);
    expect(count(element(page, 'data-shares-bar'), /data-segment="/)).toBe(10);
    expect(page).not.toContain('data-pie');
    expect(page).not.toContain('data-part-step');
  });

  it('shows the whole voter structure in one table with its pie', () => {
    const page = html('votes.check', heavy());
    expect(count(page, /data-check-row="/)).toBe(8);
    expect(page).toContain('data-pie');
    expect(page).not.toContain('data-part-step');
    expect(page).not.toContain('data-rows-more');
  });

  it('shows cooperation as unpaged directed strips', () => {
    const page = html('coalitions', heavy());
    expect(page).toContain('data-book-relations');
    expect(page).toContain('data-rules-party');
    expect(page).toContain('data-action="rules-next"');
    expect(page).not.toContain('directed-relations__pages');
    expect(count(page, /data-refusal="/)).toBe(2 * 9);
  });
});

function workspaceGrowing(): Json {
  const input = workspaceParties();
  input.groups = ['G1', 'G2'].map((id) => ({
    id,
    name: id,
    notes: '',
    turnout: '0.6',
    growthRate: id === 'G1' ? '0.0025' : '0',
    turnoutChange: '0',
  }));
  (input.parties as Json[]).forEach((party) => {
    party.composition = {
      G1: { numerator: '1', denominator: '2' },
      G2: { numerator: '1', denominator: '2' },
    };
  });
  return input;
}

describe('M7-15 direct fixes on Demographic Future', () => {
  it.each([
    ['ru', 1, 'one'],
    ['ru', 3, 'few'],
    ['ru', 5, 'many'],
    ['ru', 11, 'many'],
    ['ru', 21, 'one'],
    ['en', 1, 'one'],
    ['en', 4, 'other'],
    ['he', 1, 'one'],
    ['he', 2, 'two'],
  ] as const)('plural category of %s %i is %s', (locale, n, category) => {
    expect(pluralCategory(locale, n)).toBe(category);
  });

  it.each([
    ['ru', 1, '1 год'],
    ['ru', 4, '4 года'],
    ['ru', 5, '5 лет'],
    ['ru', 21, '21 год'],
    ['en', 1, '1 year'],
    ['en', 4, '4 years'],
    ['he', 1, 'שנה'],
    ['he', 2, 'שנתיים'],
    ['he', 5, '5 שנים'],
  ] as const)('years in %s for %i read %s', (locale, n, text) => {
    expect(formatYears(locale, n)).toBe(text);
  });

  it.each([
    ['ru', 4, 'Сегодня → через 4 года'],
    ['ru', 5, 'Сегодня → через 5 лет'],
    ['en', 1, 'Today → in 1 year'],
  ] as const)('timeline header in %s at year %i', (language, year, text) => {
    const store = createStore({
      input: workspaceGrowing(),
      language,
      screen: 'app',
      view: 'future',
    });
    store.setFutureYear(year);
    const page = renderToString(<App store={store} />);
    expect(element(page, 'class="ws-timeline-title"')).toContain(`>${text}<`);
    expect(page).not.toContain('через 4 лет');
  });

  it.each([
    ['ru', '0,25'],
    ['en', '0.25'],
  ] as const)('growth fields use the %s notation', (language, text) => {
    const store = createStore({
      input: workspaceGrowing(),
      language,
      screen: 'app',
      view: 'future',
    });
    const page = renderToString(<App store={store} />);
    const field = /<input[^>]*data-growth="G1"[^>]*>/.exec(page)?.[0] ?? '';
    expect(field).toContain(`value="${text}"`);
  });
});
