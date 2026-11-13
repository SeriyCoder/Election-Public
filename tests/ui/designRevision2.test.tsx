import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { LOCALES, translator, type Locale } from '../../src/i18n';
import { App } from '../../src/ui/App';
import {
  bookScreens,
  buildBook,
  canLockAnother,
  defaultLocks,
  EMPTY_BOOK,
  EMPTY_DRAFT,
  screenOf,
} from '../../src/ui/book';
import { exampleAbout, startExample } from '../../src/ui/startExamples';
import { createStore } from '../../src/ui/store';
import { validateScenario } from '../../src/engine/schema';
import { workspaceParties } from '../engine/helpers/workspace';

function openingHtml(language: Locale = 'ru'): string {
  return renderToString(
    <App store={createStore({ screen: 'book', language })} />,
  );
}

function appHtml(
  view: 'coalitions' | 'future',
  language: Locale = 'ru',
): string {
  const store = createStore({
    input: workspaceParties(),
    screen: 'app',
    view,
    language,
  });
  return renderToString(<App store={store} />);
}

/** The purpose card's markup, from its data attribute to its closing tag. */
function purposeSlice(html: string): string {
  const start = html.indexOf('data-purpose');
  expect(start, 'purpose block present').toBeGreaterThan(-1);
  const end = html.indexOf('</section>', start);
  return html.slice(start, end);
}

function count(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

/** The user's exact wording (2026-11-12); verbatim, do not edit. */
const FILL_BUTTON: Readonly<Record<Locale, string>> = {
  ru: 'Заполнить анкету (8 партий)',
  en: 'Fill Out Questionnaire (8 Parties)',
  he: 'מילוי שאלון (8 מפלגות)',
};

const FIFTH_PARTY_NAME: Readonly<Record<Locale, string>> = {
  ru: 'Наш дом Израиль без Либера',
  en: 'Yisrael Beiteinu without Lieberman',
  he: 'ישראל ביתנו בלי ליברמן',
};

/** The user's exact wording (2026-11-12); verbatim, do not edit. */
const FIFTH_PARTY_ABOUT: Readonly<Record<Locale, string>> = {
  ru: 'Светская правая партия; значительная часть её избирателей — русскоязычные светские репатрианты и их дети',
  en: 'Secular right-wing party; a major share of its voters are Russian-speaking secular immigrants and their children',
  he: 'מפלגת ימין חילונית; חלק ניכר ממצביעיה הם עולים חילונים דוברי רוסית וילדיהם',
};

/** The unchanged catalog note of Yisrael Beiteinu. */
const CATALOG_ABOUT: Readonly<Record<Locale, string>> = {
  ru: 'Светская правая партия',
  en: 'Secular right-wing party',
  he: 'מפלגת ימין חילונית',
};

/** The user's exact wording (2026-11-12); verbatim, do not edit. */
const TILES_TITLE: Readonly<Record<Locale, string>> = {
  ru: 'Возможные коалиции',
  en: 'Possible Coalitions',
  he: 'קואליציות אפשריות',
};

const TILES_HINT_RU =
  'Отметьте до 4 вариантов и проверьте, выживут ли они при росте секторов и смене явки';

const OPEN_SIMULATOR_RU = 'Открыть Симулятор коалиций →';

const BANNER_RU =
  'Демография и явка — два главных фактора, с которыми приходится жить. ' +
  'Двигайте ползунок лет или меняйте явку слева, чтобы увидеть, как выбранные ' +
  'коалиции справа теряют или набирают большинство (61 мандат) в будущем.';

describe('M7-20 second design revision', () => {
  it('keeps the purpose and hypothesis always open, with safe emphasis', () => {
    const slice = purposeSlice(openingHtml());
    const ru = translator('ru');
    expect(slice).not.toContain('<details');
    expect(slice).toContain(ru('purpose.hypothesis.title'));
    // Keyword emphasis is rendered, and no raw marker leaks into the text.
    expect(slice).toContain('<strong');
    expect(slice).not.toContain('*');
    const combined = `${ru('purpose.goal')} ${ru('purpose.hypothesis.text')}`
      .replaceAll('*', '')
      .toLowerCase();
    expect(combined).toContain('демограф');
    expect(combined).toContain('явк');
  });

  it('opens the questionnaire with one saturated primary action', () => {
    for (const locale of LOCALES) {
      expect(translator(locale)('book.start.eight.fill')).toBe(
        FILL_BUTTON[locale],
      );
    }
    const html = openingHtml();
    expect(html).toContain(FILL_BUTTON.ru);
    expect(count(html, 'button--cta')).toBe(1);
    const fill = html.match(
      /<button[^>]*data-start="eight"[^>]*data-start-mode="book"[^>]*>/,
    );
    expect(fill?.[0]).toContain('button--cta');
    // The opening page has no simulator button; the questionnaire leads.
    expect(html).not.toContain('data-action="open-simulator"');
  });

  it('replaces only the fifth example party description', () => {
    for (const locale of LOCALES) {
      expect(exampleAbout(locale, 4, FIFTH_PARTY_NAME[locale])).toBe(
        'book.example.about.beiteinu',
      );
      expect(translator(locale)('book.example.about.beiteinu')).toBe(
        FIFTH_PARTY_ABOUT[locale],
      );
      expect(translator(locale)('catalog.party.yisrael-beiteinu.about')).toBe(
        CATALOG_ABOUT[locale],
      );
    }
    // The other example slots keep their keys and layout.
    expect(exampleAbout('ru', 0, 'Ликуд без Биби')).toBe(
      'catalog.party.likud.about',
    );
    expect(exampleAbout('ru', 7, 'Арабы')).toBe('book.example.about.arabs');
  });

  it('starts chapter 2 with the group question and the explanation as its footnote', () => {
    expect(bookScreens(EMPTY_DRAFT)).toContainEqual([
      'people.set',
      'people.about',
      'people.mix',
    ]);
    expect(screenOf(EMPTY_DRAFT, 'people.about')[0]).toBe('people.set');
    const store = createStore({
      screen: 'book',
      language: 'ru',
      book: { ...EMPTY_BOOK, page: 'people.set' },
    });
    const html = renderToString(<App store={store} />);
    const question = html.indexOf('data-book-page="people.set"');
    const lesson = html.indexOf('data-book-page="people.about"');
    expect(question).toBeGreaterThan(-1);
    expect(lesson).toBeGreaterThan(question);
    // The question carries the asterisk; the lesson is its footnote.
    expect(html).toContain('data-footnote-ref');
    expect(html).toContain('data-footnote="people.about"');
  });

  it('renames the tiles block and adds the up-to-four hint', () => {
    for (const locale of LOCALES) {
      expect(translator(locale)('panel.tiles')).toBe(TILES_TITLE[locale]);
      const hint = translator(locale)('panel.tilesHint');
      expect(hint).not.toBe('panel.tilesHint');
      expect(hint).not.toBe('');
    }
    expect(translator('ru')('panel.tilesHint')).toBe(TILES_HINT_RU);
  });

  it('offers bright paths into the coalition simulations', () => {
    expect(translator('ru')('panel.openSimulator')).toBe(OPEN_SIMULATOR_RU);
    for (const locale of LOCALES) {
      expect(translator(locale)('panel.openSimulator')).not.toBe(
        'panel.openSimulator',
      );
    }
    const html = appHtml('coalitions');
    expect(html).toContain(OPEN_SIMULATOR_RU);
    // One button in the purpose card, one beside the tiles selection.
    expect(count(html, 'data-action="open-simulator"')).toBeGreaterThanOrEqual(
      2,
    );
    const tab = html.match(/<button[^>]*data-view="future"[^>]*>/);
    expect(tab?.[0]).toContain('views__item--cta');
  });

  it('replaces the small caption with the future banner', () => {
    expect(translator('ru')('panel.futureBanner')).toBe(BANNER_RU);
    for (const locale of LOCALES) {
      expect(translator(locale)('panel.futureBanner')).not.toBe(
        'panel.futureBanner',
      );
    }
    // The old small caption key is replaced, not duplicated.
    expect(translator('ru')('panel.sameNote')).toBe('panel.sameNote');
    const html = appHtml('future');
    expect(html).toContain('data-future-banner');
    expect(html).toContain(BANNER_RU);
  });
});

describe('M7-20 locks and supporter turnout', () => {
  it('locks small values by default, keeping two positions open', () => {
    // The plain rule: everything at or below 7 starts locked.
    expect(defaultLocks(['30', '7', '6.99', '7.01', '0', 'x'])).toEqual([
      1, 2, 4,
    ]);
    // When that would leave fewer than two open, only exact zeros lock
    // (the user's "Arabs" composition: 2.22 and 5.02 stay open).
    expect(defaultLocks(['2.22', '0', '0', '0', '92.76', '0', '5.02'])).toEqual(
      [1, 2, 3, 5],
    );
    // Zeros beyond the limit stay open too.
    expect(defaultLocks(['0', '0', '0'])).toEqual([0]);
    expect(canLockAnother(8, 5)).toBe(true);
    expect(canLockAnother(8, 6)).toBe(false);
  });

  it('refuses the lock that would leave fewer than two open positions', () => {
    const store = createStore({
      input: workspaceParties(),
      screen: 'app',
      view: 'coalitions',
    });
    const parties = (
      store.getState().input as { parties: readonly { id: string }[] }
    ).parties.map((party) => party.id);
    const allowed = parties.slice(0, parties.length - 2);
    for (const id of allowed) store.toggleLock(`party:${id}`);
    expect(store.getState().locks).toHaveLength(allowed.length);
    expect(store.getState().lockNotice).toBe(false);
    store.toggleLock(`party:${parties[parties.length - 2]!}`);
    expect(store.getState().locks).toHaveLength(allowed.length);
    expect(store.getState().lockNotice).toBe(true);
    // Unlocking always works and clears the notice.
    store.toggleLock(`party:${allowed[0]!}`);
    expect(store.getState().locks).toHaveLength(allowed.length - 1);
    expect(store.getState().lockNotice).toBe(false);
  });

  it('keeps a touched questionnaire lock set instead of the defaults', () => {
    const store = createStore({ screen: 'book' });
    expect(store.getState().book.locks?.['votes.shares']).toBeUndefined();
    store.setBookLocks('votes.shares', [2]);
    expect(store.getState().book.locks?.['votes.shares']).toEqual([2]);
  });

  it('realigns an unbalanced input so supporter turnout recovers', () => {
    const { draft, answered } = startExample('eight');
    const store = createStore({
      input: buildBook(draft, answered).input,
      screen: 'app',
      view: 'future',
    });
    // A target scales the raw national shares: the input stops summing to 100.
    expect(store.setSupporterTarget('P3', '23.28')).toBe(true);
    expect(validateScenario(store.getState().input).ok).toBe(false);
    // Any source edit resets the experiment; the panel used to go dead here.
    store.updateInput((input) => ({ ...(input as object) }));
    expect(store.getState().panel.experiment).toBeNull();
    expect(store.setSupporterTarget('P5', '50')).toBe(false);
    // The automatic alignment brings the shares back to an exact 100%.
    expect(store.alignPartyShares()).toBe(true);
    expect(validateScenario(store.getState().input).ok).toBe(true);
    expect(store.setSupporterTarget('P5', '50')).toBe(true);
  });

  it('shows the overall turnout, base and current, beside the cohorts', () => {
    const { draft, answered } = startExample('eight');
    const store = createStore({
      input: buildBook(draft, answered).input,
      screen: 'app',
      view: 'coalitions',
      language: 'ru',
    });
    const html = renderToString(<App store={store} />);
    expect(html).toContain('data-supporter-overall');
    expect(html).toContain(translator('ru')('panel.overallTurnout'));
  });

  it('translates untouched example names from any locale they were typed in', () => {
    // Russian example names loaded while the interface is English.
    const { draft, answered } = startExample('eight', 'ru');
    const store = createStore({
      input: buildBook(draft, answered).input,
      screen: 'app',
      view: 'coalitions',
      language: 'en',
    });
    store.setLanguage('he');
    const input = store.getState().input as {
      parties: readonly { name: string }[];
      groups: readonly { name: string }[];
    };
    expect(input.parties[0]!.name).toBe('הליכוד בלי ביבי');
    expect(input.parties[4]!.name).toBe('ישראל ביתנו בלי ליברמן');
    expect(input.groups[1]!.name).toBe('יהודים מסורתיים ומסורתיים-דתיים');
  });

  it('translates the frozen experiment basis on a language switch', () => {
    const { draft, answered } = startExample('eight', 'ru');
    const store = createStore({
      input: buildBook(draft, answered).input,
      screen: 'app',
      view: 'future',
      language: 'ru',
    });
    // Editing a turnout target freezes the basis with the Russian names.
    expect(store.setSupporterTarget('P1', '60')).toBe(true);
    store.setLanguage('he');
    const basis = store.getState().panel.experiment;
    expect(basis).not.toBeNull();
    expect(basis!.source.parties[0]!.name).toBe('הליכוד בלי ביבי');
    expect(basis!.source.groups[1]!.name).toBe(
      'יהודים מסורתיים ומסורתיים-דתיים',
    );
    const input = store.getState().input as {
      parties: readonly { name: string }[];
    };
    expect(input.parties[0]!.name).toBe('הליכוד בלי ביבי');
  });
});
