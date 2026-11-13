import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { PALETTE } from '../../src/engine/edit';
import { LOCALES, translator, type Locale } from '../../src/i18n';
import { formatDecimal, formatInteger } from '../../src/i18n/format';
import { App } from '../../src/ui/App';
import {
  bookPages,
  bookScreens,
  editPage,
  EMPTY_BOOK,
  EMPTY_DRAFT,
  KNESSET_FACTS,
  pageSpec,
  partCount,
  screenOf,
  type PageKey,
  type Section,
} from '../../src/ui/book';
import {
  CATALOG_GROUPS,
  CATALOG_LISTS,
  catalogListColor,
  EXAMPLE_LISTS,
} from '../../src/ui/catalog';
import { groupColorOf } from '../../src/ui/groupColors';
import { createStore, type Store } from '../../src/ui/store';

function bookStore(language: Locale = 'ru'): Store {
  return createStore({ screen: 'book', language });
}

/** Opens the book with four own groups (M7-15: compositions always asked). */
function groupBookStore(language: Locale = 'ru'): Store {
  const draft = editPage(EMPTY_DRAFT, 'people.set', 0, 'own');
  return createStore({
    screen: 'book',
    language,
    book: { ...EMPTY_BOOK, draft },
  });
}

/** Pages drawn without a picture (M7-13 compact pages; M7-15 adds two). */
const COMPACT_PAGES: readonly string[] = [
  'turnout',
  'votes.shares',
  'compose',
  'growth',
  'coalitions',
];

function render(store: Store): string {
  return renderToString(<App store={store} />);
}

/** Whether the page is on the screen shown now (M7-19). */
function onScreen(store: Store, page: PageKey): boolean {
  const { draft, page: at } = store.getState().book;
  return screenOf(draft, at).includes(page);
}

/** Turns screens with Next until the given page is on screen (M7-19). */
function turnTo(store: Store, page: PageKey): void {
  let guard = 0;
  while (!onScreen(store, page)) {
    if (guard > 100 || !store.bookNext()) {
      throw new Error(`stuck at ${store.getState().book.page}`);
    }
    guard += 1;
  }
}

/** The block of one page on the rendered screen, nested sections included (M7-19). */
function pageBlock(html: string, page: string): string {
  const open = new RegExp(`<section\\b[^>]*data-book-page="${page}"[^>]*>`);
  const start = open.exec(html)?.index;
  if (start === undefined) {
    return '';
  }
  const tags = /<(\/?)section\b[^>]*>/g;
  tags.lastIndex = start;
  let depth = 0;
  for (let tag = tags.exec(html); tag !== null; tag = tags.exec(html)) {
    depth += tag[1] === '/' ? -1 : 1;
    if (depth === 0) {
      return html.slice(start, tag.index + tag[0].length);
    }
  }
  return html.slice(start);
}

/** The text of the first child of every element carrying the attribute. */
function texts(html: string, attribute: string): string[] {
  return [
    ...html.matchAll(
      new RegExp(
        `<[^>]*\\s${attribute}(?:="[^"]*")?(?=[\\s>/])[^>]*>([\\s\\S]*?)</`,
        'g',
      ),
    ),
  ].map((match) => (match[1] ?? '').replace(/<[^>]+>/g, '').trim());
}

function count(html: string, pattern: RegExp): number {
  return [...html.matchAll(new RegExp(pattern.source, 'g'))].length;
}

function action(html: string, name: string): string {
  return (
    new RegExp(
      `<button\\b[^>]*data-action="${name}"[^>]*>([\\s\\S]*?)</button>`,
    )
      .exec(html)?.[1]
      ?.replace(/<[^>]+>/g, '')
      .trim() ?? ''
  );
}

/** The page rendered on each part of the current page, walking with Next. */
function everyPart(store: Store): string[] {
  const { page } = store.getState().book;
  const htmls = [render(store)];
  while (store.bookNext() && store.getState().book.page === page) {
    htmls.push(render(store));
  }
  return htmls;
}

/** A store whose book opens every optional branch. */
function branched(language: Locale): Store {
  return groupBookStore(language);
}

/** Every page of the book with all branches open, each in its own store on the page's screen. */
function everyPage(language: Locale = 'ru'): { store: Store; page: PageKey }[] {
  const pages = bookPages(branched(language).getState().book.draft);
  return pages.map((page) => {
    const store = branched(language);
    store.bookGoTo(page);
    return { store, page };
  });
}

describe('questionnaire screen', () => {
  it('opens without the editor or results and offers the language switcher', () => {
    const html = render(groupBookStore());
    expect(html).toMatch(/^<div class="app"[^>]*data-screen="book"/);
    expect(html).toMatch(/^<div[^>]*lang="ru"[^>]*dir="ltr"/);
    expect(html).toContain('data-book');
    expect(html).toContain('data-page="intro"');
    for (const absent of [
      'data-region',
      'data-view=',
      'data-action="load-preset"',
      'data-action="export"',
    ]) {
      expect(html, absent).not.toContain(absent);
    }
    for (const locale of LOCALES) {
      expect(html).toContain(`data-locale="${locale}"`);
    }
  });

  it('lays out the Hebrew questionnaire right to left', () => {
    const html = render(groupBookStore('he'));
    expect(html).toMatch(/^<div[^>]*lang="he"[^>]*dir="rtl"/);
    expect(html).toContain('data-book');
  });

  it('shows one question and explanation per page, a picture only on a lone page and the navigation on every screen (M7-19)', () => {
    const { draft } = groupBookStore().getState().book;
    const screens = bookScreens(draft);
    expect(screens.flat()).toEqual(bookPages(draft));
    for (const screen of screens) {
      const first = screen[0]!;
      const store = groupBookStore();
      store.bookGoTo(first);
      expect(store.getState().book.page).toBe(first);
      const html = render(store);
      expect(html, first).toContain(`data-page="${first}"`);
      expect(html, first).toContain(`data-screen="${screen.length}"`);
      expect(count(html, /data-question/), first).toBe(screen.length);
      expect(count(html, /data-explain/), first).toBe(screen.length);
      for (const page of screen) {
        const block = pageBlock(html, page);
        expect(count(block, /data-question/), page).toBe(1);
        expect(count(block, /data-explain/), page).toBe(1);
      }
      const compact = screen.some((page) => COMPACT_PAGES.includes(page));
      expect(html.includes('data-compact'), first).toBe(compact);
      if (screen.length === 1 && !compact) {
        expect(html, first).toMatch(
          /data-motif="[a-z-]+"[^>]*aria-hidden="true"/,
        );
      } else {
        expect(html, first).not.toContain('data-figure');
        expect(html, first).not.toContain('data-motif=');
      }
      expect(action(html, 'book-back'), first).toBe('Назад');
      expect(action(html, 'book-skip'), first).toBe('Пропустить анкету');
      const { part } = store.getState().book;
      if (first === 'review' && part === partCount(draft, first) - 1) {
        expect(action(html, 'book-build')).toBe('Построить мою симуляцию');
        expect(html).not.toContain('data-action="book-next"');
      } else {
        expect(action(html, 'book-next'), first).toBe('Далее');
      }
    }
  });

  it('shows no result anywhere before the build', () => {
    const answered = groupBookStore();
    turnTo(answered, 'parties.count');
    answered.answerBook(0, '5');
    const stores = [...everyPage().map(({ store }) => store), answered];
    for (const store of stores) {
      const html = render(store);
      for (const absent of [
        'data-table',
        'data-result-state',
        'data-seats',
        'data-cell',
        'data-panel',
        'data-assumption-note',
        'data-example-note',
      ]) {
        expect(html, `${store.getState().book.page} ${absent}`).not.toContain(
          absent,
        );
      }
    }
  });

  it('disables Back on the opening page only', () => {
    const store = groupBookStore();
    expect(render(store)).toMatch(
      /<button[^>]*data-action="book-back"[^>]*disabled/,
    );
    store.bookNext();
    expect(render(store)).not.toMatch(
      /<button[^>]*data-action="book-back"[^>]*disabled/,
    );
  });

  it('numbers the chapter and the group or party', () => {
    const store = groupBookStore();
    expect(texts(render(store), 'data-chapter-label')).toEqual(['Вступление']);
    turnTo(store, 'turnout');
    const html = render(store);
    expect(html).toContain('data-chapter="3"');
    expect(texts(html, 'data-chapter-label')).toEqual(['Глава 3 из 8 · Явка']);
    expect(fields(pageBlock(html, 'turnout'))).toEqual([0, 1, 2, 3]);
    // M7-19: compose shares the turnout screen, which takes its chapter.
    expect(screenOf(store.getState().book.draft, 'compose')).toContain(
      'turnout',
    );
    const compose = pageBlock(html, 'compose');
    expect(texts(compose, 'data-step')).toEqual([]);
    expect(texts(compose, 'data-question')).toEqual([
      'Из кого состоят избиратели партий?',
    ]);
    turnTo(store, 'votes.check');
    const check = render(store);
    expect(check).toContain('data-chapter="4"');
    expect(texts(check, 'data-chapter-label')).toEqual([
      'Глава 4 из 8 · Избиратели партий',
    ]);
  });

  it('makes the question focusable so focus can move to it', () => {
    const store = groupBookStore();
    store.bookNext();
    expect(render(store)).toMatch(/<h1[^>]*data-question[^>]*tabindex="-1"/);
  });
});

describe('questionnaire answers', () => {
  it('labels a suggested value as an example and drops the label once typed', () => {
    const store = groupBookStore();
    turnTo(store, 'parties.count');
    let html = pageBlock(render(store), 'parties.count');
    expect(texts(html, 'data-suggested')).toEqual(['Пример']);
    expect(html).toMatch(/<input[^>]*data-book-field[^>]*value="4"/);
    store.answerBook(0, '5');
    html = pageBlock(render(store), 'parties.count');
    expect(html).not.toContain('data-suggested');
    expect(html).toMatch(/<input[^>]*data-book-field[^>]*value="5"/);
  });

  it('answers the party count with the official Knesset numbers', () => {
    const store = groupBookStore();
    turnTo(store, 'parties.count');
    expect(render(store)).not.toContain('data-narrator');
    store.answerBook(0, '4');
    const html = render(store);
    expect(html).toMatch(/<p[^>]*data-narrator[^>]*role="status"/);
    const [narrator] = texts(html, 'data-narrator');
    expect(narrator).toContain('Партий в вашей симуляции: 4.');
    expect(narrator).toContain(
      'в 2021 году в Кнессет 24-го созыва прошли 13 из 39 участвовавших списков',
    );
    expect(narrator).toContain('в 2022 году в 25-й созыв — 10 из 40');
    expect(action(html, 'open-fact')).toBe('Исторические факты');
  });

  it('shows the error only after Next, as an alert', () => {
    const store = groupBookStore();
    turnTo(store, 'parties.count');
    store.answerBook(0, '11');
    expect(render(store)).not.toContain('data-book-error');
    expect(store.bookNext()).toBe(false);
    const html = render(store);
    expect(html).toMatch(/<p[^>]*data-book-error[^>]*role="alert"/);
    expect(texts(html, 'data-book-error')).toEqual([
      'Введите целое число от 2 до 10.',
    ]);
    expect(html).toMatch(/<input[^>]*aria-invalid="true"/);
  });

  it('keeps the remainder to 100% in view on party votes and compositions', () => {
    const store = groupBookStore();
    turnTo(store, 'votes.shares');
    const remainder = (page: PageKey) =>
      texts(pageBlock(render(store), page), 'data-remainder');
    expect(remainder('votes.shares')).toEqual(['Сумма: 100%']);
    store.answerBook(0, '15,5', 'votes.shares');
    expect(remainder('votes.shares')).toEqual(['Осталось распределить: 9,5%']);
    store.answerBook(0, '45', 'votes.shares');
    expect(remainder('votes.shares')).toEqual(['Больше 100% на 20%']);
    store.answerBook(0, '25', 'votes.shares');
    // M7-19: the compositions share the screen of the party votes.
    expect(onScreen(store, 'compose')).toBe(true);
    expect(remainder('compose')).toEqual(['Сумма: 100%']);
  });

  it('names the six lists and the example groups from the catalog', () => {
    const store = groupBookStore();
    turnTo(store, 'parties.count');
    store.answerBook(0, '6');
    store.answerBook(0, 'example', 'parties.naming');
    turnTo(store, 'people.set');
    store.answerBook(0, 'example', 'people.set');
    turnTo(store, 'compose');
    const html = pageBlock(render(store), 'compose');
    expect(texts(html, 'data-question')).toEqual([
      'Из кого состоят избиратели партий?',
    ]);
    expect(html).toMatch(/<option[^>]*value="likud"[^>]*>Ликуд/);
    expect(html).toMatch(/<option[^>]*value="yesh-atid"[^>]*>Еш Атид/);
    expect(html).toContain('Светские евреи');
    // M7-19: haredi turnout 85 moves the suggested composition (was 32,8).
    expect(html).toMatch(/<input[^>]*data-book-field="0"[^>]*value="32,5"/);
    expect(store.bookNext()).toBe(true);
    expect(store.getState().book.page).toBe('votes.check');
  });

  it('shows the default name as the placeholder of an own field and the list name in a picked one', () => {
    const own = groupBookStore();
    turnTo(own, 'parties.naming');
    own.answerBook(0, 'own', 'parties.naming');
    turnTo(own, 'parties.names');
    let html = render(own);
    expect(inputTag(html, 1)).toContain('placeholder="Партия 1"');
    expect(chosen(pickList(html, 0))).toBe('');
    const store = groupBookStore();
    turnTo(store, 'parties.names');
    html = render(store);
    expect(inputTag(html, 1)).toContain('value="Ликуд"');
    expect(chosen(pickList(html, 0))).toBe('likud');
    expect(html).toContain('Крупная правая партия');
    store.answerBook(1, 'Мой список');
    html = render(store);
    expect(inputTag(html, 1)).toContain('value="Мой список"');
    expect(chosen(pickList(html, 0))).toBe('');
  });

  it('asks about cooperation with two independent visual ends per other party', () => {
    const store = groupBookStore();
    turnTo(store, 'coalitions');
    const html = pageBlock(render(store), 'coalitions');
    expect(texts(html, 'data-question')).toEqual(['Кто готов сотрудничать?']);
    expect(count(html, /data-refusal=/)).toBe(6);
    expect(html).toContain('aria-pressed="false"');
  });

  it('asks before the six-list set changes the party count', () => {
    const store = groupBookStore();
    turnTo(store, 'parties.naming');
    store.answerBook(0, 'example', 'parties.naming');
    const html = render(store);
    expect(html).toMatch(
      /<div[^>]*role="alertdialog"[^>]*data-book-confirm="example-count"/,
    );
    expect(texts(html, 'data-confirm-text')).toEqual([
      'Учебный пример состоит из 6 списков. Изменить число партий на 6?',
    ]);
    expect(action(html, 'book-confirm')).toBe('Продолжить');
    expect(action(html, 'book-cancel')).toBe('Отмена');
  });
});

describe('historical facts page', () => {
  it('shows the official results with a way back', () => {
    const store = groupBookStore();
    turnTo(store, 'parties.count');
    store.answerBook(0, '4');
    store.openFact();
    const html = render(store);
    expect(html).toContain('data-page="facts"');
    expect(html).toContain('data-motif="coin"');
    expect(texts(html, 'data-question')).toEqual(['Исторические факты']);
    expect(KNESSET_FACTS).toHaveLength(2);
    for (const fact of KNESSET_FACTS) {
      for (const value of [
        formatInteger('ru', fact.listsRan),
        formatInteger('ru', fact.listsWon),
        formatInteger('ru', fact.eligible),
        `${formatDecimal('ru', fact.turnout)}%`,
        `${fact.year}, Кнессет ${fact.knesset}-го созыва`,
      ]) {
        expect(html).toContain(value);
      }
    }
    expect(html).toContain(
      'С 2014 года барьер составляет 3,25% действительных голосов.',
    );
    expect(html).toContain('Центральная избирательная комиссия');
    expect(action(html, 'close-fact')).toBe('Вернуться к вопросу');
    store.closeFact();
    expect(render(store)).toContain('data-page="parties.count"');
  });
});

describe('review page', () => {
  it('lists the answers by chapter with a way to change each', () => {
    const store = groupBookStore();
    turnTo(store, 'review');
    const parts = everyPart(store);
    const html = parts.join('');
    for (const part of parts) {
      expect(texts(part, 'data-question')).toEqual(['Проверим ваши ответы?']);
    }
    for (const chapter of [1, 2, 3, 4, 5, 6, 7]) {
      expect(
        count(html, new RegExp(`data-review="${chapter}"`)),
        `chapter ${chapter}`,
      ).toBe(1);
    }
    expect(count(html, /data-action="book-edit"/)).toBe(7);
    expect(html).toContain(
      'Партии (4): Ликуд, Еш Атид, Религиозный сионизм — Оцма Йехудит, Государственный лагерь',
    );
    expect(html).toContain(
      'Группы (4): Группа 1, Группа 2, Группа 3, Группа 4',
    );
    expect(html).toContain(
      'Явка: Группа 1 — 70%, Группа 2 — 70%, Группа 3 — 70%, Группа 4 — 70%',
    );
    expect(html).toContain(
      'Голоса партий: Ликуд — 25%, Еш Атид — 25%, Религиозный сионизм — Оцма Йехудит — 25%, Государственный лагерь — 25%',
    );
    expect(html).toContain(
      'Среди имеющих право голоса: Группа 1 — 25%, Группа 2 — 25%, Группа 3 — 25%, Группа 4 — 25%',
    );
    expect(html).toContain('Мест в парламенте: 120');
    expect(html).toContain('Барьер: 3,25%');
    expect(html).toContain(translator('ru')('book.pair.summary'));
    expect(html).not.toContain('data-suggested');
  });

  it('marks chapters that will take the example values after a change', () => {
    const store = groupBookStore();
    turnTo(store, 'review');
    store.bookGoTo('parties.count');
    store.answerBook(0, '5');
    store.bookGoTo('review');
    const html = everyPart(store).join('');
    expect(html).toContain(
      'Партии (5): Ликуд, Еш Атид, Религиозный сионизм — Оцма Йехудит, Государственный лагерь, ШАС',
    );
    expect(texts(html, 'data-suggested')).toContain('Пример');
  });
});

describe('questionnaire languages', () => {
  it.each(LOCALES)('%s has every questionnaire string', (locale: Locale) => {
    for (const { store, page } of everyPage(locale)) {
      expect(render(store), page).not.toMatch(/\bbook\.[a-zA-Z]/);
    }
    const store = groupBookStore(locale);
    turnTo(store, 'parties.count');
    store.answerBook(0, '4');
    store.openFact();
    expect(render(store)).not.toMatch(/\bbook\.[a-zA-Z]/);
    store.closeFact();
    turnTo(store, 'parties.naming');
    store.answerBook(0, 'example', 'parties.naming');
    expect(render(store)).not.toMatch(/\bbook\.[a-zA-Z]/);
  });
});

/** A store on the screen of the given page after choosing the six-list example. */
function sixStore(page: PageKey): Store {
  const store = groupBookStore();
  turnTo(store, 'parties.count');
  store.answerBook(0, '6');
  store.answerBook(0, 'example', 'parties.naming');
  turnTo(store, 'people.set');
  store.answerBook(0, 'example', 'people.set');
  turnTo(store, page.replace(/^(turnout|growth|coalitions)\.\d+$/, '$1'));
  return store;
}

function fields(html: string): number[] {
  return [...html.matchAll(/<input[^>]*data-book-field="(\d+)"/g)].map(
    (match) => Number(match[1]),
  );
}

/** Fields typed as text, by index. */
function textFields(html: string): number[] {
  return [
    ...html.matchAll(
      /<input\b(?=[^>]*type="text")[^>]*data-book-field="(\d+)"/g,
    ),
  ].map((match) => Number(match[1]));
}

/** Fields with a ready-values list, by index. */
function picks(html: string): number[] {
  return [...html.matchAll(/<select\b[^>]*data-book-pick="(\d+)"/g)].map(
    (match) => Number(match[1]),
  );
}

/** The opening tag of the input of the given field. */
function inputTag(html: string, index: number): string {
  return (
    new RegExp(`<input\\b(?=[^>]*data-book-field="${index}")[^>]*>`).exec(
      html,
    )?.[0] ?? ''
  );
}

/** The ready-values list of the given field, options included. */
function pickList(html: string, index: number): string {
  return (
    new RegExp(
      `<select\\b(?=[^>]*data-book-pick="${index}")[^>]*>[\\s\\S]*?</select>`,
    ).exec(html)?.[0] ?? ''
  );
}

interface Option {
  readonly value: string;
  readonly label: string;
  readonly selected: boolean;
  readonly hidden: boolean;
}

function options(select: string): Option[] {
  return [...select.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(
    (match) => {
      const attributes = match[1] ?? '';
      return {
        value: /\bvalue="([^"]*)"/.exec(attributes)?.[1] ?? '',
        label: (match[2] ?? '').replace(/<[^>]+>/g, '').trim(),
        selected: /\bselected\b/.test(attributes),
        hidden: /\bhidden\b/.test(attributes),
      };
    },
  );
}

/** The value of the selected option, or null when none is marked. */
function chosen(select: string): string | null {
  return options(select).find((option) => option.selected)?.value ?? null;
}

/** The labels of the visible options. */
function labels(select: string): string[] {
  return options(select)
    .filter((option) => !option.hidden)
    .map((option) => option.label);
}

/** The actions of the navigation bar, in document order. */
function navActions(html: string): string[] {
  const nav = /<nav\b[^>]*class="book__nav"[^>]*>([\s\S]*?)<\/nav>/.exec(html);
  return [...(nav?.[1] ?? '').matchAll(/data-action="([a-z-]+)"/g)].map(
    (match) => match[1] ?? '',
  );
}

function figure(html: string): string {
  return /<figure\b[^>]*data-figure[\s\S]*?<\/figure>/.exec(html)?.[0] ?? '';
}

const CAPTIONS: Partial<Record<Section, readonly RegExp[]>> = {
  turnout: [/\b10\b/, /\b7\b/, /70%/],
  'growth.ask': [/1\s000/, /1\s020/, /2%/],
  growth: [/1\s000/, /1\s020/, /2%/],
  'turnoutChange.ask': [/70%/, /71%/],
  turnoutChange: [/70%/, /71%/],
  'rules.threshold': [/барьер/i],
};

/** Pages whose illustration is a pie of the page's values. */
const PIE_SECTIONS: readonly string[] = ['votes.check'];

/** The pie slices of the page: colour, start and end in percent. */
function slices(html: string): string[][] {
  const tag = /<div\b(?=[^>]*\bdata-pie\b)[^>]*>/.exec(html)?.[0] ?? '';
  const style = /\bstyle="([^"]*)"/.exec(tag)?.[1] ?? '';
  return [...style.matchAll(/(#[0-9A-Fa-f]{6}) ([\d.]+)% ([\d.]+)%/g)].map(
    (match) => [match[1] ?? '', match[2] ?? '', match[3] ?? ''],
  );
}

/** The segments of a stacked bar: colour, start and end in percent. */
function bars(html: string, marker: string): string[][] {
  const bar =
    new RegExp(`<div\\b[^>]*${marker}[^>]*>([\\s\\S]*?)</div>`).exec(
      html,
    )?.[1] ?? '';
  return [
    ...bar.matchAll(
      /inset-inline-start:([\d.]+)%;inline-size:calc\(([\d.]+)% - [\d.]+%\);background:(#[0-9A-Fa-f]{6})/g,
    ),
  ].map((match) => [match[3] ?? '', match[1] ?? '', match[2] ?? '']);
}

/** The colour keys beside the rows, in order. */
function keys(html: string): string[] {
  return [...html.matchAll(/data-key="([^"]+)"/g)].map(
    (match) => match[1] ?? '',
  );
}

const GROUP_COLORS = CATALOG_GROUPS.map((group) => group.color);
/** The 2022 column in the Basic order; the source has no knitted-kippot row. */
const CBS_STATS = ['33,6%', '24,5%', '7,9%', '—', '17%', '11%', '6%'];
const OWN_GROUP_COLORS = [0, 1, 2, 3].map((index) =>
  groupColorOf(`G${index + 1}`, index),
);

describe('party voters pages', () => {
  it('asks the party votes with a stacked bar in the list colours', () => {
    const screen = render(sixStore('votes.shares'));
    const html = pageBlock(screen, 'votes.shares');
    expect(texts(html, 'data-question')).toEqual([
      'Сколько голосов получает каждая партия?',
    ]);
    // M7-19: the shares share the turnout screen, whose head names chapter 3.
    expect(screen).toContain('Глава 3 из 8 · Явка');
    const colors = EXAMPLE_LISTS.map((id) => catalogListColor(id) ?? '');
    expect(html).not.toContain('data-pie');
    // M7-19: the example shares follow haredi turnout 85 (were 25.61 ? 86.95).
    expect(bars(html, 'data-shares-bar')).toEqual([
      [colors[0], '0', '25.25'],
      [colors[1], '25.25', '49.56'],
      [colors[2], '49.56', '59.03'],
      [colors[3], '59.03', '71.05'],
      [colors[4], '71.05', '87.25'],
      [colors[5], '87.25', '100'],
    ]);
    expect(keys(html)).toEqual([...EXAMPLE_LISTS]);
  });

  it('colours own parties as the build does', () => {
    const store = groupBookStore();
    turnTo(store, 'parties.count');
    store.answerBook(0, '10');
    store.answerBook(0, 'own', 'parties.naming');
    turnTo(store, 'votes.shares');
    const html = pageBlock(render(store), 'votes.shares');
    expect(bars(html, 'data-shares-bar').map((segment) => segment[0])).toEqual(
      PALETTE.slice(0, 10),
    );
    expect(keys(html)).toEqual(
      Array.from({ length: 10 }, (_, n) => `P${n + 1}`),
    );
  });

  it('colours the suggested lists by the catalog', () => {
    const html = pageBlock(render(tenStore('votes.shares')), 'votes.shares');
    expect(bars(html, 'data-shares-bar').map((segment) => segment[0])).toEqual(
      CATALOG_LISTS.map((list) => catalogListColor(list.id) ?? ''),
    );
    expect(keys(html)).toEqual(CATALOG_LISTS.map((list) => list.id));
  });

  it('draws a party composition in the group colours', () => {
    const html = pageBlock(render(sixStore('compose')), 'compose');
    // M7-19: the example composition follows haredi turnout 85.
    expect(bars(html, 'data-compose-bar')).toEqual([
      [GROUP_COLORS[0], '0', '32.5'],
      [GROUP_COLORS[1], '32.5', '75.1'],
      [GROUP_COLORS[2], '75.1', '81.2'],
      [GROUP_COLORS[3], '81.2', '81.2'],
      [GROUP_COLORS[4], '81.2', '87.8'],
      [GROUP_COLORS[5], '87.8', '93'],
      [GROUP_COLORS[6], '93', '100'],
    ]);
    expect(keys(html)).toEqual(CATALOG_GROUPS.map((group) => group.id));
  });

  it('follows the typed values, leaving the rest of the bar empty and scaling a sum over 100%', () => {
    const store = groupBookStore();
    turnTo(store, 'compose');
    const compose = () => pageBlock(render(store), 'compose');
    expect(keys(compose())).toEqual(['G1', 'G2', 'G3', 'G4']);
    store.answerBook(0, '10', 'compose');
    let pie = bars(compose(), 'data-compose-bar');
    expect(pie).toEqual([
      [OWN_GROUP_COLORS[0], '0', '10'],
      [OWN_GROUP_COLORS[1], '10', '35'],
      [OWN_GROUP_COLORS[2], '35', '60'],
      [OWN_GROUP_COLORS[3], '60', '85'],
    ]);
    store.answerBook(0, '75', 'compose');
    pie = bars(compose(), 'data-compose-bar');
    expect(pie).toEqual([
      [OWN_GROUP_COLORS[0], '0', '50'],
      [OWN_GROUP_COLORS[1], '50', '66.67'],
      [OWN_GROUP_COLORS[2], '66.67', '83.33'],
      [OWN_GROUP_COLORS[3], '83.33', '100'],
    ]);
  });

  it('shows the derived group shares beside the 2022 statistics', () => {
    const store = sixStore('votes.check');
    const screen = render(store);
    const html = pageBlock(screen, 'votes.check');
    expect(texts(html, 'data-question')).toEqual([
      'Какой получилась структура избирателей?',
    ]);
    expect(texts(html, 'data-explain')[0]).toMatch(/явк/i);
    expect(
      [...html.matchAll(/data-check-row="([^"]+)"/g)].map((match) => match[1]),
    ).toEqual(CATALOG_GROUPS.map((group) => group.id));
    expect(texts(html, 'data-check-name')[4]).toBe('Арабские граждане');
    expect(texts(html, 'data-check-share')).toEqual([
      '33,6%',
      '24,5%',
      '7,9%',
      '0%',
      '17%',
      '11%',
      '6%',
    ]);
    expect(texts(html, 'data-check-stat')).toEqual(CBS_STATS);
    expect(html).toContain('Оценка населения 2022');
    expect(keys(html)).toEqual(CATALOG_GROUPS.map((group) => group.id));
    // M7-19: the pie shows valid votes; haredi turnout 85 leaves the shares
    // of the population above but moves the votes away from them.
    expect(slices(html)).toEqual([
      [GROUP_COLORS[0], '0', '32.8'],
      [GROUP_COLORS[1], '32.8', '56.7'],
      [GROUP_COLORS[2], '56.7', '64.4'],
      [GROUP_COLORS[3], '64.4', '64.4'],
      [GROUP_COLORS[4], '64.4', '81'],
      [GROUP_COLORS[5], '81', '94.1'],
      [GROUP_COLORS[6], '94.1', '100'],
    ]);
    expect(html).not.toMatch(
      /data-book-field|data-book-pick|data-suggested|data-remainder/,
    );
    expect(action(screen, 'book-next')).toBe('Далее');
  });

  it('moves the derived shares with the turnout', () => {
    const store = sixStore('turnout.4');
    store.answerBook(4, '50');
    turnTo(store, 'votes.check');
    const html = render(store);
    // M7-19: haredi turnout 85 by default (were 31,4% and 23%).
    expect(texts(html, 'data-check-share')).toEqual([
      '31,5%',
      '22,9%',
      '7,4%',
      '0%',
      '22,3%',
      '10,3%',
      '5,6%',
    ]);
    expect(texts(html, 'data-check-stat')).toEqual(CBS_STATS);
  });

  it('shows own groups without statistics and marks a group nobody draws from', () => {
    const store = groupBookStore();
    turnTo(store, 'votes.check');
    let html = render(store);
    expect(texts(html, 'data-check-share')).toEqual([
      '25%',
      '25%',
      '25%',
      '25%',
    ]);
    expect(html).not.toContain('data-check-stat');
    expect(html).not.toContain('Оценка населения 2022');
    expect(html).not.toContain('data-check-none');
    store.bookGoTo('compose');
    for (let party = 0; party < 4; party += 1) {
      ['50', '25', '25', '0'].forEach((text, index) =>
        store.answerBook(party * 4 + index, text, 'compose'),
      );
    }
    expect(store.bookNext()).toBe(true);
    expect(store.getState().book.page).toBe('votes.check');
    html = render(store);
    expect(texts(html, 'data-check-share')).toEqual([
      '50%',
      '25%',
      '25%',
      '0%',
    ]);
    expect(count(html, /data-check-none/)).toBe(1);
    expect(html).toMatch(
      /data-check-row="G4"[\s\S]*Ни одна партия не получает голосов этой группы/,
    );
  });
});

/** A store with ten parties, turned to the given page. */
function tenStore(page: PageKey): Store {
  const store = groupBookStore();
  turnTo(store, 'parties.count');
  store.answerBook(0, '10');
  turnTo(store, page);
  return store;
}

describe('questionnaire parts', () => {
  it('shows all ten vote shares on one screen without a part line or range (M7-15)', () => {
    const store = tenStore('votes.shares');
    const screen = render(store);
    const html = pageBlock(screen, 'votes.shares');
    expect(screen).toMatch(/data-book[^>]*data-part="0"/);
    expect(textFields(html)).toEqual(Array.from({ length: 10 }, (_, n) => n));
    expect(html).not.toContain('data-part-step');
    expect(html).not.toContain('data-rows-range');
    expect(html).not.toContain('data-rows-more');
    // M7-19: the compositions share the screen; Next turns to the check.
    expect(onScreen(store, 'compose')).toBe(true);
    expect(store.bookNext()).toBe(true);
    expect(store.getState().book.page).toBe('votes.check');
  });

  it('shows the six-list pages of party voters whole', () => {
    for (const page of ['votes.shares', 'compose', 'votes.check']) {
      const html = render(sixStore(page));
      expect(html, page).toMatch(/data-book[^>]*data-part="0"/);
      expect(html, page).not.toContain('data-part-step');
      expect(html, page).not.toContain('data-rows-range');
    }
    expect(
      textFields(pageBlock(render(sixStore('compose')), 'compose')),
    ).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('shows no part line on a page with one part', () => {
    const store = groupBookStore();
    turnTo(store, 'compose');
    const html = render(store);
    expect(html).toMatch(/data-book[^>]*data-part="0"/);
    expect(textFields(pageBlock(html, 'compose'))).toEqual([0, 1, 2, 3]);
    expect(html).not.toContain('data-part-step');
    expect(html).not.toContain('data-rows-range');
  });

  it('keeps the remainder of the whole page and stops on the sum (M7-15)', () => {
    const store = tenStore('votes.shares');
    store.answerBook(4, '5', 'votes.shares');
    expect(
      texts(pageBlock(render(store), 'votes.shares'), 'data-remainder'),
    ).toEqual(['Осталось распределить: 5%']);
    expect(store.bookNext()).toBe(false);
    const html = render(store);
    expect(html).toMatch(/data-book[^>]*data-part="0"/);
    expect(pageBlock(html, 'votes.shares')).toMatch(
      /<p[^>]*data-book-error[^>]*role="alert"/,
    );
  });

  it('shows the error on the part that holds the wrong value', () => {
    const store = tenStore('votes.shares');
    store.answerBook(0, 'abc', 'votes.shares');
    expect(store.bookNext()).toBe(false);
    const screen = render(store);
    const html = pageBlock(screen, 'votes.shares');
    expect(screen).toMatch(/data-book[^>]*data-part="0"/);
    expect(html).toMatch(/<p[^>]*data-book-error[^>]*role="alert"/);
    expect(html).toMatch(
      /<input[^>]*data-book-field="0"[^>]*aria-invalid="true"/,
    );
  });

  it('shows every partner pair on one screen without a pager (M7-15)', () => {
    const store = sixStore('coalitions');
    const html = render(store);
    expect(count(html, /data-refusal=/)).toBe(10);
    expect(html).not.toContain('directed-relations__pages');
    expect(html).not.toContain('1 / 2');
    expect(html).not.toContain('data-part-step');
    expect(html).not.toContain('data-rows-range');
  });

  it('makes all ten parties selectable with every pair-end control on one screen', () => {
    const store = groupBookStore();
    turnTo(store, 'parties.count');
    store.answerBook(0, '10');
    turnTo(store, 'coalitions');
    const html = pageBlock(render(store), 'coalitions');
    expect(count(html, /<option /)).toBe(10);
    expect(count(html, /data-refusal=/)).toBe(18);
    expect(html).not.toContain('1 / 3');
    expect(html).not.toContain('data-part-step');
    expect(store.bookNext()).toBe(true);
    expect(store.getState().book.page).toBe('review');
  });

  it("leaves the other party's page alone when one party refuses it", () => {
    const store = sixStore('coalitions');
    store.answerBook(3, 'no', 'coalitions');
    expect(render(store)).toMatch(
      /data-refusal="likud:avoda" aria-pressed="true"/,
    );
    expect(render(store)).toMatch(
      /data-refusal="avoda:likud" aria-pressed="false"/,
    );
  });

  it('explains that an unticked box is the refusal of this party only', () => {
    const explain = translator('ru')('book.compact.coalitions.explain');
    expect(explain).toMatch(/отказ/);
    const store = sixStore('coalitions');
    expect(render(store)).toContain(explain);
  });

  it('shows the whole review on one screen with a graphic and an edit button per chapter, and offers the build (M7-19)', () => {
    const store = groupBookStore();
    turnTo(store, 'parties.count');
    store.answerBook(0, '10');
    turnTo(store, 'parties.names');
    for (let slot = 0; slot < 10; slot += 1) {
      store.answerBook(
        2 * slot + 1,
        `Партия с очень длинным названием номер ${slot + 1} из списка`,
      );
    }
    turnTo(store, 'review');
    expect(partCount(store.getState().book.draft, 'review')).toBe(1);
    const parts = everyPart(store);
    expect(parts).toHaveLength(1);
    const html = parts[0]!;
    expect(html).toContain('data-screen="1"');
    expect(html).not.toContain('data-part-step');
    expect(action(html, 'book-build')).toBe('Построить мою симуляцию');
    expect(html).not.toContain('data-action="book-next"');
    for (const chapter of [1, 2, 3, 4, 5, 6, 7]) {
      const section = new RegExp(
        `<section\\b[^>]*data-review="${chapter}"[^>]*>([\\s\\S]*?)</section>`,
      ).exec(html)?.[1];
      expect(section, `chapter ${chapter}`).toBeDefined();
      expect(
        count(html, new RegExp(`data-review="${chapter}"`)),
        `chapter ${chapter}`,
      ).toBe(1);
      expect(count(section!, /data-action="book-edit"/), `${chapter}`).toBe(1);
      // The edit button closes the chapter, after its lines and graphic.
      expect(section!.trimEnd(), `${chapter}`).toMatch(
        /data-action="book-edit"[^>]*>[^<]*<\/button>$/,
      );
      expect(section!.indexOf('book__review-line'), `${chapter}`).toBeLessThan(
        section!.indexOf('data-action="book-edit"'),
      );
      expect(section!.indexOf('book__review-line'), `${chapter}`).not.toBe(-1);
      if (chapter <= 2) {
        expect(section, `${chapter}`).toContain('data-review-keys');
      }
      if (chapter === 4) {
        expect(section, `${chapter}`).toContain('data-review-bar');
      }
    }
  });
});

describe('questionnaire drawings', () => {
  it('draws a decorative picture on a lone page only, the check pie inside its block (M7-19)', () => {
    const { draft } = groupBookStore().getState().book;
    for (const screen of bookScreens(draft)) {
      const first = screen[0]!;
      const store = groupBookStore();
      store.bookGoTo(first);
      const html = render(store);
      for (const page of screen) {
        const { section } = pageSpec(draft, page);
        if (PIE_SECTIONS.includes(section)) {
          expect(pageBlock(html, page), page).toMatch(
            /<div[^>]*data-pie[^>]*aria-hidden="true"/,
          );
        }
      }
      const compact = screen.some((page) => COMPACT_PAGES.includes(page));
      if (screen.length > 1 || compact) {
        expect(html, first).not.toContain('data-figure');
        expect(html, first).not.toContain('data-motif=');
        continue;
      }
      expect(html, first).not.toContain('data-pie');
      const motif =
        /<div[^>]*data-motif="([a-z-]+)"[^>]*>([\s\S]*?)<\/div>/.exec(html);
      expect(motif, first).not.toBeNull();
      expect(motif![1]).toBe(pageSpec(draft, first).motif);
      expect(motif![2], first).toMatch(/^<svg\b/);
      expect(motif![2], first).toMatch(/<svg[^>]*aria-hidden="true"/);
      expect(motif![2], first).toMatch(/<svg[^>]*focusable="false"/);
    }
  });

  it('frames the opening and review pages with palms', () => {
    for (const { store, page } of everyPage()) {
      const html = render(store);
      expect(html.includes('data-palms'), page).toBe(
        page === 'intro' || page === 'review',
      );
    }
  });

  it('shows both sides of the shekel on the facts page', () => {
    const store = groupBookStore();
    turnTo(store, 'parties.count');
    store.answerBook(0, '4');
    store.openFact();
    const html = render(store);
    expect(html).toContain('data-motif="coin"');
    expect(html).toContain('data-side="lily"');
    expect(html).toContain('data-side="one"');
  });

  it('captions only a drawn picture with fixed numbers marked as an example (M7-19)', () => {
    const { draft } = groupBookStore().getState().book;
    for (const screen of bookScreens(draft)) {
      const first = screen[0]!;
      const store = groupBookStore();
      store.bookGoTo(first);
      const html = render(store);
      const captions = texts(html, 'data-motif-caption');
      if (!html.includes('data-figure')) {
        expect(captions, first).toEqual([]);
        continue;
      }
      const expected = CAPTIONS[pageSpec(draft, first).section];
      if (expected === undefined) {
        expect(captions, first).toEqual([]);
        continue;
      }
      expect(captions, first).toHaveLength(1);
      expect(captions[0], first).toMatch(/^Пример: /);
      for (const pattern of expected) {
        expect(captions[0], first).toMatch(pattern);
      }
    }
  });

  it('draws the same picture and caption whatever the answers', () => {
    const cases: [PageKey, number, string][] = [
      ['parties.names', 1, 'Мой список'],
      ['parties.count', 0, '10'],
      ['rules.seats', 0, '99'],
      ['rules.threshold', 0, '10'],
    ];
    for (const [page, field, text] of cases) {
      const store = groupBookStore();
      turnTo(store, page);
      const before = figure(render(store));
      // M7-19: only a lone page draws a picture.
      expect(before === '', page).toBe(
        screenOf(store.getState().book.draft, page).length > 1,
      );
      store.answerBook(field, text, page);
      expect(figure(render(store)), page).toBe(before);
    }
  });
});

describe('questionnaire dialog', () => {
  it('opens a confirmation over an inert page', () => {
    const store = groupBookStore();
    turnTo(store, 'parties.naming');
    expect(render(store)).not.toMatch(/\binert\b/);
    store.answerBook(0, 'example', 'parties.naming');
    const html = render(store);
    expect(html).toMatch(/<div[^>]*role="alertdialog"[^>]*aria-modal="true"/);
    expect(html).toMatch(/<header\b[^>]*class="book__head"[^>]*\binert\b/);
    expect(html).toMatch(/<div\b[^>]*class="book__body[^"]*"[^>]*\binert\b/);
    expect(html).toMatch(/<nav\b[^>]*class="book__nav"[^>]*\binert\b/);
    expect(html).not.toMatch(/<div[^>]*role="alertdialog"[^>]*\binert\b/);
    store.cancelBook();
    expect(render(store)).not.toMatch(/\binert\b/);
  });
});

describe('questionnaire part and caption languages', () => {
  it.each(LOCALES)(
    '%s has the composition page and every caption',
    (locale: Locale) => {
      const store = groupBookStore(locale);
      turnTo(store, 'parties.count');
      store.answerBook(0, '10');
      turnTo(store, 'turnout');
      let html = render(store);
      expect(html).toContain(translator(locale)('book.turnout.derived'));
      expect(html, 'turnout').not.toMatch(/\bbook\.[a-zA-Z]/);
      turnTo(store, 'compose');
      html = render(store);
      expect(html).not.toContain('data-part-step');
      expect(html).toContain(translator(locale)('book.compose.assumption'));
      expect(html).toContain(translator(locale)('book.compose.align'));
      expect(html).not.toMatch(/\bbook\.[a-zA-Z]/);
      for (const page of ['growth', 'rules.threshold']) {
        turnTo(store, page);
        html = render(store);
        if (page === 'growth')
          expect(html).toContain(translator(locale)('book.growth.visual'));
        // M7-19: the threshold shares a screen, which draws no picture.
        else expect(texts(html, 'data-motif-caption'), page).toEqual([]);
        expect(html, page).not.toMatch(/\bbook\.[a-zA-Z]/);
      }
      for (const caption of [
        'book.caption.turnout',
        'book.caption.voterMix',
        'book.caption.growth',
        'book.caption.turnoutChange',
        'book.caption.threshold',
      ] as const) {
        expect(translator(locale)(caption), caption).not.toMatch(
          /\bbook\.[a-zA-Z]/,
        );
      }
    },
  );
});

describe('questionnaire navigation bar', () => {
  it('keeps Skip and Restart at the start and Back beside Next at the end', () => {
    const answered = groupBookStore();
    turnTo(answered, 'parties.naming');
    answered.bookGoTo('intro');
    const stores = [...everyPage().map(({ store }) => store), answered];
    for (const store of stores) {
      const html = render(store);
      const { page, part, draft, answered: done } = store.getState().book;
      const actions = navActions(html);
      const last = page === 'review' && part === partCount(draft, page) - 1;
      const restart =
        page === 'review' || (page === 'intro' && done.length > 0);
      expect(actions, page).toEqual([
        'book-skip',
        ...(restart ? ['book-restart'] : []),
        'book-back',
        last ? 'book-build' : 'book-next',
      ]);
    }
  });

  it('keeps Skip first on the facts page, before the way back', () => {
    const store = groupBookStore();
    turnTo(store, 'parties.count');
    store.answerBook(0, '4');
    store.openFact();
    expect(navActions(render(store))).toEqual(['book-skip', 'close-fact']);
  });
});

describe('example disclosure', () => {
  const MORE: Readonly<Record<string, string>> = {
    names:
      'Пустое поле получит серое название. Чтобы взять готовый список, нажмите ▾ рядом с полем.',
    choice:
      'Предложенный вариант уже отмечен. Оставьте его и нажмите «Далее» или выберите другой.',
    value:
      'Это значение для примера. Оставьте его и нажмите «Далее», введите своё или выберите из списка ▾.',
    review:
      'В этой главе остались значения для примера; они войдут в симуляцию. Нажмите «Изменить», чтобы ответить самому.',
  };
  const GROUP: Readonly<Record<string, string>> = {
    names: 'names',
    choice: 'choice',
    coalition: 'choice',
    count: 'value',
    percent: 'value',
    percents: 'value',
    review: 'review',
  };

  /** A fresh book walked to the screen of the page with every branch open; the screen itself is unconfirmed. */
  function reached(page: PageKey): Store {
    const store = groupBookStore();
    let guard = 0;
    while (!onScreen(store, page)) {
      const at = store.getState().book.page;
      if (at === 'growth.ask' || at === 'turnoutChange.ask') {
        store.answerBook(0, 'yes');
      } else if (at === 'coalitions.mode') {
        store.answerBook(0, 'custom');
      }
      if (guard > 100 || !store.bookNext()) {
        throw new Error(`stuck at ${at}`);
      }
      guard += 1;
    }
    return store;
  }

  it('opens a sentence on what the example means and how to change it', () => {
    const seen = new Set<string>();
    const stores = everyPage().map(({ page }) => ({
      store: reached(page),
      page,
    }));
    const review = groupBookStore();
    turnTo(review, 'parties.count');
    review.answerBook(0, '5');
    review.bookGoTo('review');
    stores.push({ store: review, page: 'review' });
    for (const { store, page } of stores) {
      const { draft } = store.getState().book;
      const html = pageBlock(render(store), page);
      if (!html.includes('data-suggested')) {
        continue;
      }
      const group = GROUP[pageSpec(draft, page).kind];
      expect(group, page).toBeDefined();
      seen.add(group!);
      expect(html, page).toMatch(
        /<details\b[^>]*data-suggested[^>]*>\s*<summary\b[^>]*>Пример<\/summary>/,
      );
      const more = texts(html, 'data-suggested-more');
      expect(more.length, page).toBeGreaterThan(0);
      for (const text of more) {
        expect(text, page).toBe(MORE[group!]);
      }
    }
    expect([...seen].sort()).toEqual(['choice', 'names', 'review', 'value']);
  });

  it('has the sentence in every language', () => {
    for (const locale of LOCALES) {
      const store = groupBookStore(locale);
      turnTo(store, 'parties.count');
      const html = render(store);
      expect(html, locale).toMatch(/<details\b[^>]*data-suggested/);
      expect(texts(html, 'data-suggested-more')[0], locale).not.toBe('');
      expect(html, locale).not.toMatch(/\bbook\.[a-zA-Z]/);
    }
  });
});

describe('names page', () => {
  function namesStore(count: string, naming = 'own'): Store {
    const store = groupBookStore();
    turnTo(store, 'parties.count');
    store.answerBook(0, count);
    store.bookNext();
    store.answerBook(0, naming);
    turnTo(store, 'parties.names');
    return store;
  }

  it('shows up to eight names at once, each with its list', () => {
    const html = render(namesStore('8'));
    expect(textFields(html)).toEqual([1, 3, 5, 7, 9, 11, 13, 15]);
    expect(picks(html)).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
    expect(html).not.toContain('data-part-step');
    expect(html).not.toContain('data-names-range');
    expect(html).not.toContain('data-names-more');
    expect(inputTag(html, 15)).toContain('aria-label="Название 8"');
    expect(pickList(html, 14)).toContain(
      'aria-label="Выбрать из списка: Название 8"',
    );
  });

  it('shows ten names in two parts with the range and a cue for the rest', () => {
    const store = namesStore('10');
    let html = render(store);
    expect(textFields(html)).toEqual([1, 3, 5, 7, 9]);
    expect(texts(html, 'data-names-range')).toEqual(['Названия 1–5 из 10']);
    expect(texts(html, 'data-names-more')).toEqual(['Ещё 5 — после «Далее»']);
    expect(store.bookNext()).toBe(true);
    html = render(store);
    expect(textFields(html)).toEqual([11, 13, 15, 17, 19]);
    expect(texts(html, 'data-names-range')).toEqual(['Названия 6–10 из 10']);
    expect(html).not.toContain('data-names-more');
    expect(texts(html, 'data-part-step')).toEqual(['Часть 2 из 2']);
  });

  it('offers an own name and the ten lists, marking a list taken by another field', () => {
    const html = render(namesStore('4', 'catalog'));
    const list = options(pickList(html, 2));
    expect(list.map((option) => option.value)).toEqual([
      '',
      ...CATALOG_LISTS.map((entry) => entry.id),
    ]);
    expect(list.every((option) => !option.hidden)).toBe(true);
    expect(list[0]!.label).toBe('Своё название');
    expect(list.find((option) => option.value === 'yesh-atid')!.label).toBe(
      `Еш Атид — ${translator('ru')('catalog.party.yesh-atid.about')}`,
    );
    expect(list.find((option) => option.value === 'likud')!.label).toBe(
      'Ликуд (поле 1)',
    );
    expect(chosen(pickList(html, 2))).toBe('yesh-atid');
  });

  it('offers the seven Basic groups for own group names', () => {
    const store = groupBookStore();
    turnTo(store, 'people.names');
    const list = options(pickList(pageBlock(render(store), 'people.names'), 0));
    expect(list.map((option) => option.value)).toEqual([
      '',
      ...CATALOG_GROUPS.map((entry) => entry.id),
    ]);
    expect(list.find((option) => option.value === 'arab')!.label).toContain(
      'Арабские граждане',
    );
    expect(
      list.find((option) => option.value === 'knitted-kippot')!.label,
    ).toContain('Вязаные кипы, поселенцы');
  });
});

describe('ready values', () => {
  it('puts a list beside every typed field and none on choices, coalitions, lessons, the opening or the review', () => {
    for (const { store, page } of everyPage()) {
      const html = pageBlock(render(store), page);
      const { kind } = pageSpec(store.getState().book.draft, page);
      const typedFields = textFields(html);
      const lists = picks(html);
      if (page === 'turnout' || page === 'growth') {
        expect(count(html, /type="range"/)).toBe(typedFields.length);
        expect(lists).toEqual([]);
      } else if (
        kind === 'count' ||
        kind === 'percent' ||
        kind === 'percents'
      ) {
        expect(typedFields.length, page).toBeGreaterThan(0);
        expect(lists, page).toEqual(typedFields);
      } else if (kind === 'names') {
        expect(lists, page).toEqual(typedFields.map((index) => index - 1));
      } else {
        expect(lists, page).toEqual([]);
      }
      for (const index of lists) {
        expect(pickList(html, index), `${page} ${index}`).toMatch(
          /aria-label="Выбрать из списка/,
        );
      }
    }
  });

  it('labels seats and the threshold, marking the Israeli values', () => {
    const store = groupBookStore();
    turnTo(store, 'rules.seats');
    // M7-19: the seats and the threshold share one screen.
    let html = pageBlock(render(store), 'rules.seats');
    expect(labels(pickList(html, 0))).toEqual([
      '50',
      '100',
      '120 — как в Кнессете',
      '150',
      '200',
    ]);
    expect(chosen(pickList(html, 0))).toBe('120');
    expect(pickList(html, 0)).toContain('aria-label="Выбрать из списка"');
    html = pageBlock(render(store), 'rules.threshold');
    expect(labels(pickList(html, 0))).toEqual([
      '0%',
      '1%',
      '2%',
      '3,25% — израильский барьер',
      '4%',
      '5%',
    ]);
    expect(chosen(pickList(html, 0))).toBe('3.25');
    store.answerBook(0, '3,3', 'rules.threshold');
    expect(
      chosen(pickList(pageBlock(render(store), 'rules.threshold'), 0)),
    ).toBe('');
  });

  it('labels counts, turnout and yearly changes with their units', () => {
    const store = groupBookStore();
    turnTo(store, 'parties.count');
    expect(labels(pickList(render(store), 0))).toEqual([
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
    ]);
    turnTo(store, 'turnout');
    expect(
      count(render(store), /type="range" min="1" max="100" step="1"/),
    ).toBe(4);
    turnTo(store, 'growth');
    expect(
      count(render(store), /type="range" min="-5" max="5" step="0.25"/),
    ).toBe(4);
    expect(render(store)).toContain(translator('ru')('book.growth.visual'));
  });

  it('offers the rest to 100% first on a percents row, named after the row', () => {
    const store = groupBookStore();
    turnTo(store, 'compose');
    store.answerBook(0, '40', 'compose');
    store.answerBook(1, '20', 'compose');
    store.answerBook(2, '15', 'compose');
    const html = pageBlock(render(store), 'compose');
    const list = labels(pickList(html, 3));
    expect(list[0]).toBe('Остаток до 100%: 25%');
    expect(list.slice(1)).toEqual(
      Array.from({ length: 21 }, (_, n) => `${n * 5}%`),
    );
    expect(pickList(html, 3)).toContain(
      'aria-label="Выбрать из списка: Группа 4"',
    );
  });

  it('has every list label in every language', () => {
    for (const locale of LOCALES) {
      for (const { store, page } of everyPage(locale)) {
        const html = render(store);
        for (const index of picks(html)) {
          for (const label of labels(pickList(html, index))) {
            expect(label, `${locale} ${page}`).not.toBe('');
          }
        }
        expect(html, `${locale} ${page}`).not.toMatch(/\bbook\.[a-zA-Z]/);
      }
    }
  });
});

describe('lessons', () => {
  it('explain what a voter group is, in Russian', () => {
    const store = groupBookStore();
    turnTo(store, 'people.about');
    const screen = render(store);
    const html = pageBlock(screen, 'people.about');
    expect(texts(html, 'data-question')).toEqual([
      'Что такое группа избирателей?',
    ]);
    expect(screen).toContain('data-chapter="2"');
    expect(screen).toContain('Глава 2 из 8 · Состав избирателей');
    expect(html).toContain(
      'Социальные группы — необязательный способ описать ваше представление',
    );
    const points = texts(html, 'data-lesson-point');
    expect(points).toHaveLength(5);
    [
      /^Явка: .*глава 3/,
      /^Состав партии: .*при желании/,
      /^Размер: .*имеющих право голоса/,
      /^Будущее: .*глава 5/,
      /допущения модели/,
    ].forEach((pattern, index) => {
      expect(points[index], `${index}`).toMatch(pattern);
    });
    expect(html).not.toMatch(/data-book-field|data-book-pick|data-suggested/);
    expect(action(screen, 'book-next')).toBe('Далее');
  });

  it('show where Likud and Ra’am get their votes, from the engine', () => {
    const store = groupBookStore();
    turnTo(store, 'people.mix');
    const html = pageBlock(render(store), 'people.mix');
    expect(texts(html, 'data-question')).toEqual([
      'Откуда партия получает голоса?',
    ]);
    expect(count(html, /data-mix-party="/)).toBe(2);
    expect(texts(html, 'data-mix-title')).toEqual([
      'Пример: как можно представить избирателей двух партий — Ликуд и РААМ',
    ]);
    expect(count(html, /data-mix-bar="/)).toBe(8);
    expect(count(html, /data-legend="/)).toBe(6);
    expect(texts(html, 'data-mix-line')).toEqual([
      'Ликуд: голоса из 6 групп; больше всего — «Традиционные евреи, масорти ле дати», 42,67%.',
      'РААМ: голоса из 2 групп; больше всего — «Арабские граждане», 97,70%.',
    ]);
    expect(html).not.toMatch(/data-book-field|data-book-pick|data-suggested/);
    expect(html).not.toContain('data-motif-caption');
  });

  it.each(LOCALES)(
    '%s has both lessons with the engine numbers',
    (locale: Locale) => {
      const store = groupBookStore(locale);
      turnTo(store, 'people.about');
      const screen = render(store);
      expect(screen).not.toMatch(/\bbook\.[a-zA-Z]/);
      expect(
        count(pageBlock(screen, 'people.about'), /data-lesson-point/),
      ).toBe(5);
      // M7-19/M7-20: both lessons share the screen the group question opens.
      expect(screen).toContain('data-page="people.set"');
      const html = pageBlock(screen, 'people.mix');
      expect(html).toContain('data-book-page="people.mix"');
      expect(html).toContain(formatDecimal(locale, '42.67'));
      expect(html).toContain(formatDecimal(locale, '97.70'));
      expect(html).not.toMatch(/\bbook\.[a-zA-Z]/);
    },
  );

  it('shows the example set with its shares and source on the set page', () => {
    const store = groupBookStore();
    turnTo(store, 'people.mix');
    expect(pageBlock(render(store), 'people.mix')).not.toContain(
      'data-example-set',
    );
    turnTo(store, 'people.set');
    let html = pageBlock(render(store), 'people.set');
    expect(html).toContain('data-example-set');
    expect(texts(html, 'data-set-title')).toEqual([
      'Пример — доли групп по данным ЦСБ за 2022 год',
    ]);
    const shown = CATALOG_GROUPS.filter(
      (group) => group.id !== 'knitted-kippot',
    );
    expect(
      [...html.matchAll(/data-set-group="([^"]+)"/g)].map((match) => match[1]),
    ).toEqual(shown.map((group) => group.id));
    expect(texts(html, 'data-set-name')).toEqual([
      'Светские евреи',
      'Традиционные евреи, масорти ле дати',
      'Религиозные евреи, не харедим',
      'Арабские граждане',
      'Ультраортодоксальные евреи, харедим',
      'Другие / не классифицированы',
    ]);
    expect(texts(html, 'data-set-share')).toEqual(
      CBS_STATS.filter((share) => share !== '—'),
    );
    expect(html).not.toContain('data-set-note');
    const [source = ''] = texts(html, 'data-set-source');
    expect(source).toContain('Центральное статистическое бюро Израиля');
    expect(source).toContain('2022');
    expect(source).toContain('100%');
    store.answerBook(0, 'example', 'people.set');
    html = pageBlock(render(store), 'people.set');
    const [told = ''] = texts(html, 'data-narrator');
    expect(told).toContain('2022');
    expect(told).toContain('допущения');
    store.answerBook(0, 'own', 'people.set');
    expect(pageBlock(render(store), 'people.set')).toContain(
      'data-example-set',
    );
  });

  it.each(LOCALES)(
    '%s shows the example set in its own notation',
    (locale: Locale) => {
      const store = groupBookStore(locale);
      turnTo(store, 'people.set');
      const html = render(store);
      expect(count(html, /data-set-group="/)).toBe(6);
      expect(texts(html, 'data-set-share')).toEqual(
        ['33.6', '24.5', '7.9', '17', '11', '6'].map(
          (share) => `${formatDecimal(locale, share)}%`,
        ),
      );
      expect(texts(html, 'data-set-source')[0]).toContain('2022');
      expect(html).not.toMatch(/\bbook\.[a-zA-Z]/);
    },
  );

  it('sends the review edit of chapter 2 to the group set, past the lessons', () => {
    const store = groupBookStore();
    turnTo(store, 'review');
    const html = everyPart(store).join('');
    expect(html).toMatch(
      /<section\b[^>]*data-review="2"[\s\S]*?data-action="book-edit"[^>]*data-page="people\.set"/,
    );
  });
});

describe('M7-07 questionnaire language and demographic check', () => {
  function checkStore(secondTyped: boolean): Store {
    const values: Readonly<Record<string, readonly string[]>> = {
      'parties.count': ['2'],
      'parties.naming': ['own'],
      'people.set': ['own'],
      'people.count': ['2'],
      'turnout.0': ['50'],
      'turnout.1': ['100'],
      'votes.shares': ['60', '40'],
      'compose.0': ['50', '50'],
      ...(secondTyped ? { 'compose.1': ['0', '100'] } : {}),
    };
    let draft = EMPTY_DRAFT;
    for (const [page, texts] of Object.entries(values)) {
      texts.forEach((text, index) => {
        draft = editPage(draft, page, index, text);
      });
    }
    return createStore({
      screen: 'book',
      language: 'ru',
      book: {
        ...EMPTY_BOOK,
        draft,
        answered: Object.keys(values),
        page: 'votes.check',
      },
    });
  }

  it('offers all three language buttons on the opening page', () => {
    const html = render(bookStore('ru'));
    for (const locale of LOCALES) {
      expect(html).toContain(`data-locale="${locale}"`);
    }
    expect(html).toContain('aria-pressed="true"');
  });

  it('changes direction and text without losing the current answer or page', () => {
    const store = bookStore('ru');
    store.bookGoTo('parties.names');
    store.answerBook(1, 'Название');
    const { book, input } = store.getState();
    store.setLanguage('he');
    const html = render(store);
    expect(store.getState().book).toBe(book);
    expect(store.getState().input).toBe(input);
    expect(html).toMatch(/^<div[^>]*lang="he"[^>]*dir="rtl"/);
    expect(html).toContain('Название');
    expect(html).toContain('data-locale="he"');
  });

  it('gives an untouched party its even split, so no unknown part remains (M7-15)', () => {
    const html = render(checkStore(false));
    expect(html).toContain('data-check-voter-mix="G1"');
    expect(html).toContain('data-check-voter-mix="G2"');
    expect(html).not.toContain('data-check-unknown');
    expect(html).not.toContain('data-check-population-unavailable');
    expect(html).toContain('50%');
    expect(html).toContain('66,7%');
    expect(html).toContain('33,3%');
    expect(html).not.toContain('data-check-none');
  });

  it('distinguishes the complete voter mix from the derived population', () => {
    const html = render(checkStore(true));
    expect(html).toContain('data-check-voter-mix="G1"');
    expect(html).toContain('data-check-voter-mix="G2"');
    expect(html).toContain('30%');
    expect(html).toContain('70%');
    expect(html).toContain('46,2%');
    expect(html).toContain('53,8%');
    expect(html).not.toContain('data-check-population-unavailable');
  });
});
