import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { analyzeCoalitions } from '../../src/engine/coalitions';
import { isDraft, renameEntity } from '../../src/engine/edit';
import { runScenario, runSeats, serializeResult } from '../../src/engine/run';
import {
  parseScenarioJson,
  serializeScenario,
  validateScenario,
  type Scenario,
} from '../../src/engine/schema';
import { LOCALES, translator } from '../../src/i18n';
import { App } from '../../src/ui/App';
import {
  bookPages,
  buildBook,
  editPage,
  EMPTY_BOOK,
  EMPTY_DRAFT,
  isAnswered,
  isSuggested,
  pageError,
  shownTexts,
  takesAnswer,
  type BookDraft,
} from '../../src/ui/book';
import { presetInput } from '../../src/ui/presets';
import {
  START_EXAMPLES,
  startExample,
  type StartExampleId,
} from '../../src/ui/startExamples';
import { createStore } from '../../src/ui/store';
import new8Text from '../fixtures/new8.json?raw';

const EIGHT_PARTIES = ['P1', 'P2', 'P3', 'shas', 'P5', 'P6', 'utj', 'P8'];
const EIGHT_GROUPS = [
  'secular',
  'G2',
  'religious',
  'G4',
  'G5',
  'haredi',
  'other',
];
const BASIC = [
  'secular',
  'traditional',
  'religious',
  'knitted-kippot',
  'arab',
  'haredi',
  'other',
];

function fixture(): Scenario {
  const parsed = parseScenarioJson(new8Text);
  if (!parsed.ok) throw new Error('the new8 fixture must import');
  return parsed.scenario;
}

function scenarioOf(input: unknown): Scenario {
  const checked = validateScenario(input);
  if (!checked.ok) {
    throw new Error(JSON.stringify(checked.issues).slice(0, 400));
  }
  return checked.scenario;
}

function built(id: StartExampleId): Scenario {
  const { draft, answered } = startExample(id);
  return scenarioOf(buildBook(draft, answered).input);
}

/** Every answer page of the book, overview pages included. */
function answerPages(draft: BookDraft): readonly string[] {
  return bookPages(draft).filter(
    (page) => takesAnswer(page) || shownTexts(draft, page).length > 0,
  );
}

function seatsOf(scenario: Scenario): Record<string, number> {
  const result = runSeats(scenario);
  return Object.fromEntries(
    result.allocation.parties.map((party) => [party.partyId, party.seats]),
  );
}

describe('M7-16 eight-party example', () => {
  it('builds exactly the scenario of the user file', () => {
    expect(serializeScenario(built('eight'))).toBe(
      serializeScenario(fixture()),
    );
  });

  it('gives the same seats, coalitions and futures as importing the file', () => {
    const mine = built('eight');
    const theirs = fixture();
    expect(serializeResult(runScenario(mine))).toBe(
      serializeResult(runScenario(theirs)),
    );
    for (const year of [1, 10, 50]) {
      expect(runSeats(mine, year), `year ${year}`).toEqual(
        runSeats(theirs, year),
      );
    }
    const seats = runSeats(mine);
    const coalitions = analyzeCoalitions(mine, seats.allocation);
    expect(coalitions.minimalWinning.length).toBeGreaterThan(0);
    expect(
      Object.values(seatsOf(mine)).reduce((sum, seat) => sum + seat, 0),
    ).toBe(120);
  });

  it('keeps the user names exactly, trailing spaces included', () => {
    const scenario = built('eight');
    expect(scenario.parties.map((party) => party.id)).toEqual(EIGHT_PARTIES);
    expect(scenario.groups.map((group) => group.id)).toEqual(EIGHT_GROUPS);
    expect(scenario.parties.map((party) => party.name)).toEqual(
      fixture().parties.map((party) => party.name),
    );
    expect(scenario.parties[1]?.name).toBe('Религиозный сионизм ');
  });

  it('prefills every questionnaire page with the example values', () => {
    const { draft, answered } = startExample('eight');
    expect(shownTexts(draft, 'parties.count')).toEqual(['8']);
    expect(shownTexts(draft, 'parties.naming')).toEqual(['own']);
    expect(shownTexts(draft, 'people.set')).toEqual(['own']);
    expect(shownTexts(draft, 'people.count')).toEqual(['7']);
    expect(shownTexts(draft, 'turnout')).toEqual([
      '77.25',
      '78.25',
      '68.79',
      '80.62',
      '80.01',
      '80.03',
      '69.12',
    ]);
    expect(shownTexts(draft, 'votes.shares')).toEqual([
      '21.85',
      '14.7',
      '22.77',
      '7.37',
      '6.2',
      '6.73',
      '6',
      '14.38',
    ]);
    expect(shownTexts(draft, 'compose').slice(0, 7)).toEqual([
      '31.2',
      '38.79',
      '14.66',
      '9.38',
      '0',
      '0',
      '5.97',
    ]);
    expect(shownTexts(draft, 'growth')).toEqual([
      '0.25',
      '0.5',
      '0.75',
      '1',
      '1.5',
      '2.5',
      '0.5',
    ]);
    expect(shownTexts(draft, 'rules.seats')).toEqual(['120']);
    expect(shownTexts(draft, 'rules.threshold')).toEqual(['3.25']);
    const flags = shownTexts(draft, 'coalitions');
    expect(flags).toHaveLength(8 * 9);
    expect(flags.filter((flag) => flag === 'no')).toHaveLength(20);
    for (const page of answerPages(draft)) {
      expect(pageError(draft, page), page).toBeNull();
      expect(isAnswered(draft, answered, page), page).toBe(true);
      expect(isSuggested(draft, page), page).toBe(false);
    }
  });

  it('rebuilds with an edited value and changes only that value', () => {
    const { draft, answered } = startExample('eight');
    let edited = editPage(draft, 'votes.shares', 0, '20');
    edited = editPage(edited, 'votes.shares', 1, '11');
    const scenario = scenarioOf(buildBook(edited, answered).input);
    const original = built('eight');
    if (scenario.inputMode !== 'parties' || original.inputMode !== 'parties') {
      throw new Error('the eight-party example must be in party mode');
    }
    expect(scenario.parties.map((party) => party.voteShare)).not.toEqual(
      original.parties.map((party) => party.voteShare),
    );
    expect(scenario.groups).toEqual(original.groups);
    expect(scenario.coalitionRules.partyRefusals).toHaveLength(20);
    expect(scenario.coalitionRules).toEqual(original.coalitionRules);
  });
});

describe('M7-16 2022 educational example', () => {
  it('builds the party-mode six-list example with the 2022 seats', () => {
    const scenario = built('israel');
    expect(scenario.inputMode).toBe('parties');
    expect(scenario.groups.map((group) => group.id)).toEqual(BASIC);
    // M7-19: the example's vote shares follow the ultra-Orthodox turnout of 85.
    expect(seatsOf(scenario)).toEqual({
      likud: 30,
      'yesh-atid': 29,
      avoda: 11,
      'religious-zionism': 15,
      shas: 20,
      raam: 15,
    });
    expect(seatsOf(scenario)).toEqual(
      seatsOf(scenarioOf(presetInput('israelExample'))),
    );
  });

  it('prefills its pages from the example suggestions, all answered', () => {
    const { draft, answered } = startExample('israel');
    expect(shownTexts(draft, 'parties.count')).toEqual(['6']);
    expect(shownTexts(draft, 'parties.naming')).toEqual(['example']);
    expect(shownTexts(draft, 'people.set')).toEqual(['example']);
    // M7-19: derived at the per-group turnout (ultra-Orthodox 85).
    expect(shownTexts(draft, 'votes.shares')).toEqual([
      '25.25',
      '24.31',
      '9.47',
      '12.02',
      '16.2',
      '12.75',
    ]);
    for (const page of answerPages(draft)) {
      expect(pageError(draft, page), page).toBeNull();
      expect(isAnswered(draft, answered, page), page).toBe(true);
    }
  });
});

describe('M7-16 examples are deterministic', () => {
  it.each(START_EXAMPLES)('%s builds the same input on every call', (id) => {
    expect(JSON.stringify(buildBook(startExample(id).draft, []).input)).toBe(
      JSON.stringify(buildBook(startExample(id).draft, []).input),
    );
    expect(serializeScenario(built(id))).toBe(serializeScenario(built(id)));
  });

  it('2022 opens the same scenario in every interface language', () => {
    const inputs = LOCALES.map((language) => {
      const store = createStore({ language, screen: 'book' });
      store.startBook('israel', true);
      return serializeScenario(scenarioOf(store.getState().input));
    });
    expect(new Set(inputs).size).toBe(1);
    expect(inputs[0]).toBe(serializeScenario(built('israel')));
  });

  it('the eight-party set takes names in the interface language and keeps every number', () => {
    const nameless = (scenario: Scenario) => {
      const json = JSON.parse(serializeScenario(scenario)) as {
        parties: { name: string }[];
        groups: { name: string }[];
      };
      for (const entity of [...json.parties, ...json.groups]) entity.name = '';
      return JSON.stringify(json);
    };
    const scenarios = LOCALES.map((language) => {
      const store = createStore({ language, screen: 'book' });
      store.startBook('eight', true);
      return scenarioOf(store.getState().input);
    });
    for (const scenario of scenarios) {
      expect(nameless(scenario)).toBe(nameless(fixture()));
      expect(seatsOf(scenario)).toEqual(seatsOf(fixture()));
    }
    const byLocale = Object.fromEntries(
      LOCALES.map((language, index) => [language, scenarios[index]!]),
    );
    expect(serializeScenario(byLocale.ru!)).toBe(serializeScenario(fixture()));
    expect(byLocale.en!.parties[0]?.name).toBe('Likud without Bibi');
    expect(byLocale.he!.parties[0]?.name).toBe('הליכוד בלי ביבי');
    expect(byLocale.en!.groups[3]?.name).toBe('Knitted kippot, settlers');
    expect(byLocale.he!.groups[3]?.name).toBe('כיפות סרוגות, מתנחלים');
    for (const scenario of [byLocale.en!, byLocale.he!]) {
      expect(
        [...scenario.parties, ...scenario.groups].some((entity) =>
          /[А-Яа-яЁё]/.test(entity.name),
        ),
      ).toBe(false);
    }
  });
});

describe('M7-16 store start choices', () => {
  function fresh() {
    return createStore({ language: 'ru', screen: 'book' });
  }

  it('opens an example on Coalitions without changes left over', () => {
    const store = fresh();
    store.startBook('eight', true);
    const state = store.getState();
    expect(state.screen).toBe('app');
    expect(state.view).toBe('coalitions');
    expect(serializeScenario(scenarioOf(state.input))).toBe(
      serializeScenario(fixture()),
    );
    expect(state.input).toBe(state.loadedInput);
    expect(shownTexts(state.book.draft, 'turnout')[0]).toBe('77.25');
  });

  it('leafs through an example from its first page, every value prefilled', () => {
    const store = fresh();
    store.startBook('eight', false);
    const { book, screen } = store.getState();
    expect(screen).toBe('book');
    expect(book.page).toBe('parties.count');
    expect(book.confirm).toBeNull();
    expect(book.draft).toEqual(startExample('eight').draft);
    expect([...book.answered].sort()).toEqual(
      [...startExample('eight').answered].sort(),
    );
    store.buildBook();
    expect(serializeScenario(scenarioOf(store.getState().input))).toBe(
      serializeScenario(fixture()),
    );
  });

  it('starts an empty book on its first question', () => {
    const store = fresh();
    store.startBook(null, false);
    expect(store.getState().book.page).toBe('parties.count');
    expect(store.getState().book.draft).toEqual(EMPTY_DRAFT);
  });

  it('replaces given answers with an example without asking', () => {
    const store = createStore({
      language: 'ru',
      screen: 'book',
      book: {
        ...EMPTY_BOOK,
        draft: editPage(EMPTY_DRAFT, 'parties.count', 0, '5'),
        answered: ['parties.count'],
      },
    });
    store.startBook('israel', false);
    expect(store.getState().book.confirm).toBeNull();
    expect(store.getState().book.page).toBe('parties.count');
    expect(shownTexts(store.getState().book.draft, 'parties.count')).toEqual([
      '6',
    ]);
  });

  it('opens an example over a changed scenario without asking', () => {
    const store = fresh();
    store.updateInput((input) => ({ ...(input as object), name: 'Мой' }));
    store.startBook('eight', true);
    expect(store.getState().book.confirm).toBeNull();
    expect(store.getState().screen).toBe('app');
    expect(serializeScenario(scenarioOf(store.getState().input))).toBe(
      serializeScenario(fixture()),
    );
  });

  it('asks before a fresh start drops given answers', () => {
    const store = fresh();
    store.startBook('eight', false);
    store.startBook(null, false);
    expect(store.getState().book.confirm).toBe('restart');
    store.confirmBook();
    expect(store.getState().book.draft).toEqual(EMPTY_DRAFT);
    expect(store.getState().book.page).toBe('parties.count');
  });
});

describe('M7-16 opening page', () => {
  it.each(LOCALES)('offers the four starts in %s', (language) => {
    const store = createStore({ language, screen: 'book' });
    const html = renderToString(<App store={store} />);
    const t = translator(language);
    for (const start of ['blank', 'eight', 'israel']) {
      expect(html).toContain(`data-start-card="${start}"`);
    }
    expect(html).toContain('data-action="start-skip"');
    expect(html.match(/data-action="book-skip"/g)).toHaveLength(1);
    for (const id of ['eight', 'israel']) {
      for (const mode of ['book', 'open']) {
        expect(html).toContain(`data-start="${id}" data-start-mode="${mode}"`);
      }
    }
    expect(html).toContain('data-start="blank"');
    expect(html).not.toContain('book.start.');
    expect(t('book.start.eight.title')).not.toBe('book.start.eight.title');
    expect(html).not.toContain('Ликуд без Биби');
  });
});

describe('example names follow the interface language', () => {
  it('translates untouched example names and keeps a changed one', () => {
    const store = createStore({ language: 'ru', screen: 'book' });
    store.startBook('eight', false);
    store.bookGoTo('parties.names');
    store.answerBook(3, 'Моя партия');
    const before = store.getState().book.draft;
    store.setLanguage('en');
    const parties = shownTexts(store.getState().book.draft, 'parties.names');
    expect(parties[1]).toBe('Likud without Bibi');
    expect(parties[3]).toBe('Моя партия');
    const groups = shownTexts(store.getState().book.draft, 'people.names');
    expect(groups.filter((_, index) => index % 2 === 1)).toEqual([
      '',
      'Traditional Jews, masorti and masorti-dati',
      '',
      'Knitted kippot, settlers',
      'Arab citizens',
      '',
      '',
    ]);
    store.setLanguage('he');
    expect(shownTexts(store.getState().book.draft, 'people.names')[9]).toBe(
      'אזרחים ערבים',
    );
    store.setLanguage('ru');
    const back = store.getState().book.draft;
    for (const page of ['parties.names', 'people.names', 'coalitions']) {
      expect(shownTexts(back, page)).toEqual(shownTexts(before, page));
    }
  });

  it('translates the opened example on Coalitions and keeps a renamed entity', () => {
    const store = createStore({ language: 'ru', screen: 'book' });
    store.startBook('eight', true);
    const original = serializeScenario(scenarioOf(store.getState().input));
    store.updateInput((input) =>
      isDraft(input) ? renameEntity(input, 'party', 'P5', 'Моя партия') : input,
    );
    store.setLanguage('en');
    const en = scenarioOf(store.getState().input);
    expect(en.parties[0]?.name).toBe('Likud without Bibi');
    expect(en.parties[4]?.name).toBe('Моя партия');
    expect(en.groups[4]?.name).toBe('Arab citizens');
    expect(seatsOf(en)).toEqual(seatsOf(fixture()));
    store.setLanguage('he');
    expect(scenarioOf(store.getState().input).groups[3]?.name).toBe(
      'כיפות סרוגות, מתנחלים',
    );
    store.updateInput((input) =>
      isDraft(input)
        ? renameEntity(input, 'party', 'P5', 'Наш дом Израиль без Либера')
        : input,
    );
    store.setLanguage('ru');
    expect(serializeScenario(scenarioOf(store.getState().input))).toBe(
      original,
    );
  });
});
