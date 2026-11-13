import bookSource from '../../src/ui/book.ts?raw';
import { describe, expect, it } from 'vitest';
import { PALETTE } from '../../src/engine/edit';
import {
  buildCompositionReport,
  electorateComposition,
} from '../../src/engine/composition';
import { isPositive } from '../../src/engine/rational';
import { percentRemainder } from '../../src/engine/numeric';
import { runScenario, runSeats } from '../../src/engine/run';
import {
  parseScenarioJson,
  serializeScenario,
  validateScenario,
} from '../../src/engine/schema';
import { computeVotes } from '../../src/engine/votes';
import {
  BOOK_LIMITS,
  BOOK_SCENARIO_ID,
  bookPages,
  buildBook,
  CHAPTER_COUNT,
  chosenPick,
  confirmPage,
  editPage,
  electorateCheck,
  EMPTY_BOOK,
  EMPTY_DRAFT,
  fieldPicks,
  exampleGroupSet,
  groupIds,
  groupMixExample,
  groupNames,
  isAnswered,
  isSuggested,
  KNESSET_FACTS,
  narration,
  nextPage,
  pageError,
  pageParts,
  pageSpec,
  partCount,
  partError,
  partyIds,
  partyNames,
  previousPage,
  remainder,
  resolveDraft,
  reviewParts,
  reviewSize,
  shownTexts,
  THRESHOLD_FACT,
  type BookDraft,
  type PageKey,
} from '../../src/ui/book';
import {
  CATALOG_GROUPS,
  CATALOG_LISTS,
  catalogListColor,
  EXAMPLE_LISTS,
} from '../../src/ui/catalog';
import { presetInput } from '../../src/ui/presets';

type Json = Record<string, unknown>;
/** Texts by index; null leaves that field as it is. */
type Answers = Readonly<Record<PageKey, readonly (string | null)[]>>;

/** Puts texts on a page by index, as typed, without confirming it. */
function typed(
  draft: BookDraft,
  page: PageKey,
  texts: readonly (string | null)[],
) {
  return texts.reduce(
    (current, text, index) =>
      text === null ? current : editPage(current, page, index, text),
    draft,
  );
}

/** A names page answer that types every name: own entities. */
const pairs = (names: readonly string[]) => names.flatMap((name) => ['', name]);

/** A names page answer that picks a catalog entry in every field. */
const picked = (ids: readonly string[]) => ids.flatMap((id) => [id, null]);

/** The two lesson pages at the start of chapter 2; they take no answer. */
const LESSONS: readonly PageKey[] = ['people.about', 'people.mix'];

function draftOf(answers: Answers): BookDraft {
  return Object.entries(answers).reduce(
    (draft, [page, texts]) => typed(draft, page, texts),
    EMPTY_DRAFT,
  );
}

/**
 * Turns every page with Next from the opening page to the review, typing the
 * given texts first, exactly as a learner would.
 */
function walk(answers: Answers): {
  draft: BookDraft;
  answered: PageKey[];
  visited: PageKey[];
} {
  let draft = EMPTY_DRAFT;
  const answered: PageKey[] = [];
  const visited: PageKey[] = [];
  let page: PageKey | null = 'intro';
  while (page !== null && page !== 'review') {
    const current: PageKey = page;
    visited.push(current);
    draft = typed(draft, current, answers[current] ?? []);
    if (['turnout', 'growth', 'coalitions', 'compose'].includes(current)) {
      for (const [key, values] of Object.entries(answers)) {
        if (key.startsWith(`${current}.`)) draft = typed(draft, key, values);
      }
    }
    if (current !== 'intro' && !LESSONS.includes(current)) {
      expect(pageError(draft, current), current).toBeNull();
      draft = confirmPage(draft, current);
      answered.push(current);
    }
    page = nextPage(draft, current);
    if (visited.length > 200) {
      throw new Error('the book does not end');
    }
  }
  return { draft, answered, visited };
}

/**
 * The draft the older fixtures exercise. M7-15: every composition is always
 * distributed, so no choice pages are typed any more.
 */
function legacyDraftOf(answers: Answers): BookDraft {
  return draftOf({ 'people.set': ['own'], ...answers });
}

/** Walks the older fixtures with their own group set. */
function legacyWalk(answers: Answers): ReturnType<typeof walk> {
  const set = answers['parties.naming']?.[0] === 'example' ? 'example' : 'own';
  return walk({
    'people.set': [set],
    ...answers,
  });
}

function seatsOf(input: unknown): Record<string, number> {
  const validation = validateScenario(input);
  if (!validation.ok) {
    throw new Error(
      `expected a valid scenario: ${JSON.stringify(validation.issues)}`,
    );
  }
  return Object.fromEntries(
    runSeats(validation.scenario).allocation.parties.map((party) => [
      party.partyId,
      party.seats,
    ]),
  );
}

const range = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, index) => `${prefix}${index}`);

const DEFAULT_PAGES = [
  'intro',
  'parties.count',
  'parties.naming',
  'parties.names',
  'people.set',
  ...LESSONS,
  'turnout',
  'votes.shares',
  'compose',
  'votes.check',
  'growth',
  'coalitions',
  'rules.threshold',
  'rules.seats',
  'review',
];

const SIX_EXAMPLE: Answers = {
  'parties.count': ['6'],
  'parties.naming': ['example'],
  'people.set': ['example'],
};

/** The learner's own party names; the suggestion is the catalog (M2-32). */
const OWN_NAMES: Answers = { 'parties.naming': ['own'] };

/** The first four catalog lists in seat order: the suggested parties. */
const FIRST_LISTS = [
  'likud',
  'yesh-atid',
  'religious-zionism',
  'national-unity',
];

/** The whole even split over the seven Basic groups (M7-15 start). */
const EVEN_SEVEN = ['15', '15', '14', '14', '14', '14', '14'];

describe('page list', () => {
  it('starts on the opening page with an empty draft', () => {
    expect(EMPTY_BOOK).toEqual({
      draft: EMPTY_DRAFT,
      page: 'intro',
      answered: [],
      attempted: false,
      facts: false,
      confirm: null,
      part: 0,
    });
    expect(EMPTY_DRAFT).toEqual({ values: {} });
  });

  it('asks every question once for the default Basic path', () => {
    expect(bookPages(EMPTY_DRAFT)).toEqual(DEFAULT_PAGES);
  });

  it('asks turnout once for all example groups, without own group pages', () => {
    const pages = bookPages(legacyDraftOf(SIX_EXAMPLE));
    expect(pages).not.toContain('people.count');
    expect(pages.some((page) => page.startsWith('people.names'))).toBe(false);
    expect(pages.filter((page) => page.startsWith('turnout'))).toEqual([
      'turnout',
    ]);
  });

  it('asks no group shares and no per-group preferences', () => {
    for (const draft of [EMPTY_DRAFT, legacyDraftOf(SIX_EXAMPLE)]) {
      const pages = bookPages(draft);
      expect(pages).not.toContain('people.shares');
      expect(pages.some((page) => page.startsWith('prefs'))).toBe(false);
    }
  });

  it('asks turnout before the parties’ voters, then shows the derived check', () => {
    const pages = bookPages(
      legacyDraftOf({ 'parties.count': ['3'], 'people.count': ['2'] }),
    );
    const at = (page: string) => pages.indexOf(page);
    expect(pages.slice(at('people.names') + 1, at('growth'))).toEqual([
      ...LESSONS,
      'turnout',
      'votes.shares',
      'compose',
      'votes.check',
    ]);
  });

  it('asks the composition of every party on one page', () => {
    for (let count = BOOK_LIMITS.minParties; count <= 10; count += 1) {
      const draft = legacyDraftOf({ 'parties.count': [`${count}`] });
      const pages = bookPages(draft);
      expect(
        pages.filter((page) => page.startsWith('compose')),
        `${count}`,
      ).toEqual(['compose']);
      expect(shownTexts(draft, 'compose'), `${count}`).toHaveLength(
        count * groupIds(draft).length,
      );
    }
    expect(
      shownTexts(legacyDraftOf(SIX_EXAMPLE), 'compose').length,
    ).toBeGreaterThan(0);
  });

  it('asks every name on one page, whatever the count', () => {
    for (let count = BOOK_LIMITS.minParties; count <= 10; count += 1) {
      const pages = bookPages(legacyDraftOf({ 'parties.count': [`${count}`] }));
      expect(
        pages.filter((page) => page.startsWith('parties.names')),
        `${count}`,
      ).toEqual(['parties.names']);
    }
    for (let count = BOOK_LIMITS.minGroups; count <= 8; count += 1) {
      const pages = bookPages(
        legacyDraftOf({ 'people.set': ['own'], 'people.count': [`${count}`] }),
      );
      expect(
        pages.filter((page) => page.startsWith('people.names')),
        `${count}`,
      ).toEqual(['people.names']);
    }
  });

  it('shows growth together and never asks future turnout change', () => {
    const pages = bookPages(
      legacyDraftOf({ 'growth.ask': ['yes'], 'turnoutChange.ask': ['yes'] }),
    );
    const at = (page: string) => pages.indexOf(page);
    expect(pages.slice(at('growth'), at('coalitions'))).toEqual(['growth']);
  });

  it('shows one directed relationships page without a preliminary choice', () => {
    const pages = bookPages(
      legacyDraftOf({ 'parties.count': ['3'], 'coalitions.mode': ['custom'] }),
    );
    expect(pages.slice(pages.indexOf('coalitions'))).toEqual([
      'coalitions',
      'rules.threshold',
      'rules.seats',
      'review',
    ]);
  });

  it('follows the suggestion while a count is invalid', () => {
    expect(bookPages(draftOf({ 'parties.count': ['abc'] }))).toEqual(
      DEFAULT_PAGES,
    );
    expect(bookPages(draftOf({ 'parties.count': ['11'] }))).toEqual(
      DEFAULT_PAGES,
    );
  });

  it('turns pages forward and back along the list', () => {
    const pages = bookPages(EMPTY_DRAFT);
    for (let index = 0; index < pages.length; index += 1) {
      expect(nextPage(EMPTY_DRAFT, pages[index]!)).toBe(
        pages[index + 1] ?? null,
      );
      expect(previousPage(EMPTY_DRAFT, pages[index]!)).toBe(
        pages[index - 1] ?? null,
      );
    }
  });
});

describe('page spec', () => {
  it('has eight chapters after the opening page', () => {
    expect(CHAPTER_COUNT).toBe(8);
    const chapters = Object.fromEntries(
      bookPages(
        legacyDraftOf({
          'growth.ask': ['yes'],
          'turnoutChange.ask': ['yes'],
          'coalitions.mode': ['custom'],
        }),
      ).map((page) => [page, pageSpec(EMPTY_DRAFT, page).chapter]),
    );
    expect(chapters).toMatchObject({
      intro: 0,
      'parties.count': 1,
      'parties.naming': 1,
      'parties.names': 1,
      'people.about': 2,
      'people.mix': 2,
      'people.set': 2,
      'people.count': 2,
      'people.names': 2,
      turnout: 3,
      'votes.shares': 4,
      compose: 4,
      'votes.check': 4,
      growth: 5,
      'rules.seats': 6,
      'rules.threshold': 6,
      coalitions: 7,
      review: 8,
    });
  });

  it('names the section, kind and motif of every page', () => {
    const spec = (page: string, draft = EMPTY_DRAFT) => {
      const { section, kind, motif } = pageSpec(draft, page);
      return { section, kind, motif };
    };
    expect(spec('intro')).toEqual({
      section: 'intro',
      kind: 'intro',
      motif: 'menorah',
    });
    expect(spec('parties.count')).toEqual({
      section: 'parties.count',
      kind: 'count',
      motif: 'ballots',
    });
    expect(spec('parties.names')).toEqual({
      section: 'parties.names',
      kind: 'names',
      motif: 'ballots',
    });
    expect(spec('people.names')).toEqual({
      section: 'people.names',
      kind: 'names',
      motif: 'people',
    });
    for (const lesson of LESSONS) {
      expect(spec(lesson)).toEqual({
        section: lesson,
        kind: 'lesson',
        motif: 'people',
      });
    }
    expect(spec('votes.shares')).toEqual({
      section: 'votes.shares',
      kind: 'percents',
      motif: 'pie',
    });
    expect(spec('compose.1')).toEqual({
      section: 'compose',
      kind: 'percents',
      motif: 'pie',
    });
    expect(spec('votes.check')).toEqual({
      section: 'votes.check',
      kind: 'check',
      motif: 'pie',
    });
    expect(() => pageSpec(EMPTY_DRAFT, 'people.shares')).toThrow(RangeError);
    expect(() => pageSpec(EMPTY_DRAFT, 'prefs.0')).toThrow(RangeError);
    expect(spec('turnout.0')).toEqual({
      section: 'turnout',
      kind: 'percent',
      motif: 'ballot-box',
    });
    expect(spec('growth.ask')).toEqual({
      section: 'growth.ask',
      kind: 'choice',
      motif: 'calendar',
    });
    expect(spec('rules.seats')).toEqual({
      section: 'rules.seats',
      kind: 'count',
      motif: 'knesset',
    });
    expect(spec('rules.threshold')).toEqual({
      section: 'rules.threshold',
      kind: 'percent',
      motif: 'threshold',
    });
    expect(spec('coalitions.mode')).toEqual({
      section: 'coalitions.mode',
      kind: 'choice',
      motif: 'table',
    });
    const custom = legacyDraftOf({ 'coalitions.mode': ['custom'] });
    expect(spec('coalitions.2', custom)).toEqual({
      section: 'coalitions',
      kind: 'coalition',
      motif: 'table',
    });
    expect(spec('review')).toEqual({
      section: 'review',
      kind: 'review',
      motif: 'knesset',
    });
  });

  it('gives counts, choices and percent ranges', () => {
    const limits = (page: string) => {
      const { min, max, choices } = pageSpec(EMPTY_DRAFT, page);
      return { min, max, choices };
    };
    expect(limits('parties.count')).toEqual({
      min: '2',
      max: '10',
      choices: [],
    });
    expect(limits('people.count')).toEqual({ min: '1', max: '8', choices: [] });
    expect(limits('rules.seats')).toEqual({
      min: '1',
      max: '10000',
      choices: [],
    });
    expect(limits('turnout.0')).toEqual({ min: '1', max: '100', choices: [] });
    expect(limits('votes.shares')).toEqual({
      min: '0',
      max: '100',
      choices: [],
    });
    expect(limits('compose.0')).toEqual({ min: '0', max: '100', choices: [] });
    expect(limits('votes.check')).toEqual({
      min: null,
      max: null,
      choices: [],
    });
    expect(limits('rules.threshold')).toEqual({
      min: '0',
      max: '100',
      choices: [],
    });
    expect(limits('parties.naming').choices).toEqual([
      'own',
      'catalog',
      'example',
    ]);
    expect(limits('people.set').choices).toEqual(['example', 'own']);
    expect(limits('growth.ask').choices).toEqual(['no', 'yes']);
    expect(limits('turnoutChange.ask').choices).toEqual(['no', 'yes']);
    expect(limits('coalitions.mode').choices).toEqual(['all', 'custom']);
    const growth = legacyDraftOf({ 'growth.ask': ['yes'] });
    expect(pageSpec(growth, 'growth.1')).toMatchObject({
      min: '-100',
      max: '100',
    });
    expect(BOOK_LIMITS).toMatchObject({
      minParties: 2,
      maxParties: 10,
      minGroups: 1,
      maxGroups: 8,
      maxSeats: 10000,
      namesPerPage: 8,
      nameLength: 60,
      longName: 32,
    });
    // M7-15: compact pages are never cut into parts.
    expect(BOOK_LIMITS).not.toHaveProperty('partRows');
    expect(BOOK_LIMITS).not.toHaveProperty('percentRows');
    expect(Number.isSafeInteger(BOOK_LIMITS.reviewLines)).toBe(true);
    expect(BOOK_LIMITS.reviewLines).toBeGreaterThan(0);
  });

  it('says which group or party a page is about and where it stands', () => {
    const example = legacyDraftOf(SIX_EXAMPLE);
    expect(pageSpec(example, 'compose.4')).toMatchObject({
      subject: 'shas',
      step: { n: 5, count: 6 },
      entityKind: 'group',
      fields: CATALOG_GROUPS.map((group) => group.id),
    });
    expect(pageSpec(example, 'turnout.0')).toMatchObject({
      subject: 'secular',
      step: { n: 1, count: 7 },
      fields: [],
    });
    expect(pageSpec(example, 'votes.shares')).toMatchObject({
      subject: null,
      step: null,
      entityKind: 'party',
      fields: EXAMPLE_LISTS,
    });
    expect(pageSpec(example, 'votes.check')).toMatchObject({
      subject: null,
      step: null,
      entityKind: 'group',
      fields: CATALOG_GROUPS.map((group) => group.id),
    });
    const custom = legacyDraftOf({
      ...OWN_NAMES,
      'coalitions.mode': ['custom'],
    });
    expect(pageSpec(custom, 'coalitions.1')).toMatchObject({
      subject: 'P2',
      step: { n: 2, count: 4 },
      entityKind: 'party',
      fields: ['P1', 'P2', 'P3', 'P4'],
    });
    const seven = legacyDraftOf({ ...OWN_NAMES, 'parties.count': ['7'] });
    expect(pageSpec(seven, 'parties.names')).toMatchObject({
      subject: null,
      step: null,
      entityKind: 'party',
      fields: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    });
    expect(
      pageSpec(
        legacyDraftOf({ 'people.set': ['own'], 'people.count': ['3'] }),
        'people.names',
      ),
    ).toMatchObject({
      step: null,
      entityKind: 'group',
      fields: ['G1', 'G2', 'G3'],
    });
    expect(pageSpec(EMPTY_DRAFT, 'parties.count')).toMatchObject({
      subject: null,
      step: null,
      entityKind: null,
      fields: [],
    });
  });
});

describe('suggestions', () => {
  it('shows a suggestion on every page of an empty draft', () => {
    const shown = Object.fromEntries(
      bookPages(EMPTY_DRAFT)
        .filter(
          (page) =>
            page !== 'intro' && page !== 'review' && !LESSONS.includes(page),
        )
        .map((page) => [page, shownTexts(EMPTY_DRAFT, page)]),
    );
    expect(shown).toEqual({
      'parties.count': ['4'],
      'parties.naming': ['catalog'],
      'parties.names': FIRST_LISTS.flatMap((id) => [id, '']),
      'people.set': ['example'],
      // M7-19: the ultra-Orthodox group (sixth in the Basic order) suggests 85.
      turnout: ['70', '70', '70', '70', '70', '85', '70'],
      growth: Array(7).fill('0'),
      compose: FIRST_LISTS.flatMap(() => EVEN_SEVEN),
      'votes.check': [],
      'votes.shares': ['25', '25', '25', '25'],
      'rules.seats': ['120'],
      'rules.threshold': ['3.25'],
      coalitions: Array(20).fill('yes'),
    });
    for (const page of Object.keys(shown)) {
      if (page === 'votes.check') continue;
      expect(isSuggested(EMPTY_DRAFT, page), page).toBe(true);
    }
  });

  it('suggests no change on growth, turnout change and cooperation pages', () => {
    const draft = legacyDraftOf({
      'parties.count': ['3'],
      'growth.ask': ['yes'],
      'turnoutChange.ask': ['yes'],
      'coalitions.mode': ['custom'],
    });
    expect(shownTexts(draft, 'growth.0')).toEqual(['0']);
    expect(shownTexts(draft, 'turnoutChange.3')).toEqual(['0']);
    expect(shownTexts(draft, 'coalitions.1')).toEqual([
      'yes',
      'yes',
      'yes',
      'yes',
    ]);
  });

  it('splits whole percents evenly, larger parts first', () => {
    const draft = legacyDraftOf({
      'parties.count': ['7'],
      'people.count': ['3'],
    });
    expect(shownTexts(draft, 'votes.shares')).toEqual([
      '15',
      '15',
      '14',
      '14',
      '14',
      '14',
      '14',
    ]);
    expect(shownTexts(draft, 'compose.6')).toEqual(['34', '33', '33']);
  });

  it('suggests the Section 14.4 example, described by party, for the six lists and the example groups', () => {
    const draft = legacyDraftOf(SIX_EXAMPLE);
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
    // M7-15: mapped by group ID in the Basic order; knitted kippot gets 0.
    expect(shownTexts(draft, 'compose.0')).toEqual([
      '32.5',
      '42.6',
      '6.1',
      '0',
      '6.6',
      '5.2',
      '7',
    ]);
    expect(shownTexts(draft, 'compose.1')).toEqual([
      '60.8',
      '19.7',
      '1.6',
      '0',
      '6.8',
      '2.7',
      '8.4',
    ]);
    expect(shownTexts(draft, 'compose.2')).toEqual([
      '69.3',
      '12.6',
      '0',
      '0',
      '8.8',
      '0',
      '9.3',
    ]);
    expect(shownTexts(draft, 'compose.3')).toEqual([
      '13.6',
      '29.9',
      '35.3',
      '0',
      '0',
      '16.3',
      '4.9',
    ]);
    expect(shownTexts(draft, 'compose.4')).toEqual([
      '10.1',
      '22.2',
      '9.5',
      '0',
      '0',
      '56.4',
      '1.8',
    ]);
    expect(shownTexts(draft, 'compose.5')).toEqual([
      '0',
      '0',
      '0',
      '0',
      '97.7',
      '0',
      '2.3',
    ]);
    for (const page of ['votes.shares', 'compose']) {
      expect(pageError(draft, page), page).toBeNull();
    }
  });

  it('suggests the even split as every composition unless both the lists and the groups are the example', () => {
    const catalog = legacyDraftOf({
      'parties.count': ['6'],
      'parties.naming': ['catalog'],
      'people.set': ['example'],
    });
    expect(shownTexts(catalog, 'people.set')).toEqual(['example']);
    expect(shownTexts(catalog, 'votes.shares')).toEqual([
      '17',
      '17',
      '17',
      '17',
      '16',
      '16',
    ]);
    expect(shownTexts(catalog, 'compose.0')).toEqual(EVEN_SEVEN);
    expect(shownTexts(catalog, 'compose.5')).toEqual(EVEN_SEVEN);
    const ownParties = legacyDraftOf({ 'people.set': ['example'] });
    expect(shownTexts(ownParties, 'compose.3')).toEqual(EVEN_SEVEN);
    const ownGroups = legacyDraftOf({ ...SIX_EXAMPLE, 'people.set': ['own'] });
    expect(shownTexts(ownGroups, 'compose.0')).toEqual([
      '25',
      '25',
      '25',
      '25',
    ]);
    expect(shownTexts(ownGroups, 'votes.shares')).toEqual([
      '17',
      '17',
      '17',
      '17',
      '16',
      '16',
    ]);
  });

  it('suggests own groups for own and catalog names', () => {
    expect(
      shownTexts(
        legacyDraftOf({ 'parties.naming': ['catalog'] }),
        'people.set',
      ),
    ).toEqual(['own']);
  });

  it('suggests the catalog names and keeps own names once chosen', () => {
    expect(shownTexts(EMPTY_DRAFT, 'parties.naming')).toEqual(['catalog']);
    expect(isSuggested(EMPTY_DRAFT, 'parties.naming')).toBe(true);
    expect(partyIds(EMPTY_DRAFT)).toEqual(FIRST_LISTS);
    expect(partyNames(EMPTY_DRAFT)).toEqual(['', '', '', '']);
    expect(partyIds(legacyDraftOf({ 'parties.count': ['10'] }))).toEqual(
      CATALOG_LISTS.map((list) => list.id),
    );
    const own = legacyDraftOf(OWN_NAMES);
    expect(shownTexts(own, 'parties.naming')).toEqual(['own']);
    expect(isSuggested(own, 'parties.naming')).toBe(false);
    expect(partyIds(typed(own, 'parties.count', ['6']))).toEqual(
      range(6, 'P').map((_, index) => `P${index + 1}`),
    );
  });
});

describe('entities', () => {
  it('numbers own parties and groups', () => {
    expect(partyIds(legacyDraftOf(OWN_NAMES))).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
    ]);
    expect(groupIds(legacyDraftOf({}))).toEqual(['G1', 'G2', 'G3', 'G4']);
    expect(groupIds(legacyDraftOf({ 'people.count': ['1'] }))).toEqual(['G1']);
  });

  it('takes catalog lists in seat order and the six-list set in table order', () => {
    expect(partyIds(legacyDraftOf({ 'parties.naming': ['catalog'] }))).toEqual([
      'likud',
      'yesh-atid',
      'religious-zionism',
      'national-unity',
    ]);
    expect(
      partyIds(
        legacyDraftOf({
          'parties.count': ['10'],
          'parties.naming': ['catalog'],
        }),
      ),
    ).toEqual(CATALOG_LISTS.map((list) => list.id));
    expect(partyIds(legacyDraftOf(SIX_EXAMPLE))).toEqual(EXAMPLE_LISTS);
    expect(groupIds(legacyDraftOf(SIX_EXAMPLE))).toEqual(
      CATALOG_GROUPS.map((group) => group.id),
    );
  });

  it('drops the six-list set to the suggestion when the count is not six', () => {
    const draft = legacyDraftOf({ ...SIX_EXAMPLE, 'parties.count': ['4'] });
    expect(shownTexts(draft, 'parties.naming')).toEqual(['catalog']);
    expect(isSuggested(draft, 'parties.naming')).toBe(true);
    expect(partyIds(draft)).toEqual(FIRST_LISTS);
    const back = typed(draft, 'parties.count', ['6']);
    expect(shownTexts(back, 'parties.naming')).toEqual(['example']);
  });

  it('keeps typed names by position, empty where none was typed', () => {
    const draft = legacyDraftOf({
      'parties.count': ['7'],
      'parties.names': pairs(['Север', '', '  ', '', '', '', 'Юг']),
    });
    expect(partyNames(draft)).toEqual(['Север', '', '  ', '', '', '', 'Юг']);
    expect(
      groupNames(legacyDraftOf({ 'people.names': pairs(['', 'Студенты']) })),
    ).toEqual(['', 'Студенты', '', '']);
    expect(groupNames(legacyDraftOf(SIX_EXAMPLE))).toEqual([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
  });
});

describe('editing', () => {
  it('stores the text as typed and keeps the other shown values', () => {
    const draft = typed(legacyDraftOf({}), 'compose.0', ['', '33,5']);
    expect(shownTexts(draft, 'compose.0')).toEqual(['', '33,5', '25', '25']);
    expect(isSuggested(draft, 'compose.0')).toBe(false);
    expect(isSuggested(draft, 'compose.1')).toBe(true);
  });

  it('changes nothing but the draft', () => {
    const before = JSON.stringify(EMPTY_DRAFT);
    typed(EMPTY_DRAFT, 'parties.count', ['6']);
    expect(JSON.stringify(EMPTY_DRAFT)).toBe(before);
  });

  it('shows the suggestion again after a change of shape and keeps the typed values', () => {
    const typedFour = typed(EMPTY_DRAFT, 'votes.shares', [
      '40',
      '30',
      '20',
      '10',
    ]);
    const five = typed(typedFour, 'parties.count', ['5']);
    expect(shownTexts(five, 'votes.shares')).toEqual([
      '20',
      '20',
      '20',
      '20',
      '20',
    ]);
    expect(isSuggested(five, 'votes.shares')).toBe(true);
    const four = typed(five, 'parties.count', ['4']);
    expect(shownTexts(four, 'votes.shares')).toEqual(['40', '30', '20', '10']);
  });

  it('shows the composition suggestion again after a change of the groups', () => {
    const typedFour = typed(legacyDraftOf({}), 'compose.1', [
      '40',
      '30',
      '20',
      '10',
    ]);
    const three = typed(typedFour, 'people.count', ['3']);
    expect(shownTexts(three, 'compose.1')).toEqual(['34', '33', '33']);
    expect(isSuggested(three, 'compose.1')).toBe(true);
    const four = typed(three, 'people.count', ['4']);
    expect(shownTexts(four, 'compose.1')).toEqual(['40', '30', '20', '10']);
  });

  it('re-opens per-group pages when the group set changes', () => {
    const own = typed(legacyDraftOf({}), 'turnout.0', ['55']);
    const example = typed(own, 'people.set', ['example']);
    expect(shownTexts(example, 'turnout.0')).toEqual(['70']);
    expect(
      shownTexts(typed(example, 'people.set', ['own']), 'turnout.0'),
    ).toEqual(['55']);
  });

  it('keeps typed names through a change of the party count', () => {
    const draft = typed(
      typed(legacyDraftOf(OWN_NAMES), 'parties.names', [null, 'Alpha']),
      'parties.count',
      ['6'],
    );
    expect(shownTexts(draft, 'parties.names')).toEqual([
      '',
      'Alpha',
      ...range(10, '').map(() => ''),
    ]);
    expect(partyNames(draft)).toEqual(['Alpha', '', '', '', '', '']);
  });

  it("keeps each party's answer its own", () => {
    const custom = legacyDraftOf({
      'parties.count': ['3'],
      'coalitions.mode': ['custom'],
    });
    const refused = editPage(custom, 'coalitions.0', 3, 'no');
    expect(shownTexts(refused, 'coalitions.0')).toEqual([
      'yes',
      'yes',
      'yes',
      'no',
    ]);
    expect(shownTexts(refused, 'coalitions.2')).toEqual([
      'yes',
      'yes',
      'yes',
      'yes',
    ]);
    const accepted = editPage(refused, 'coalitions.2', 1, 'yes');
    expect(shownTexts(accepted, 'coalitions.0')).toEqual([
      'yes',
      'yes',
      'yes',
      'no',
    ]);
    const mutual = editPage(refused, 'coalitions.2', 1, 'no');
    expect(shownTexts(mutual, 'coalitions.0')).toEqual([
      'yes',
      'yes',
      'yes',
      'no',
    ]);
    expect(shownTexts(mutual, 'coalitions.2')).toEqual([
      'yes',
      'no',
      'yes',
      'yes',
    ]);
    const withdrawn = editPage(mutual, 'coalitions.0', 3, 'yes');
    expect(shownTexts(withdrawn, 'coalitions.2')).toEqual([
      'yes',
      'no',
      'yes',
      'yes',
    ]);
  });
});

describe('validation', () => {
  const errorOf = (
    page: string,
    texts: readonly (string | null)[],
    base = legacyDraftOf({}),
  ) => pageError(typed(base, page, texts), page);

  it.each([
    ['parties.count', '1', '2', '10'],
    ['parties.count', '11', '2', '10'],
    ['parties.count', '4.5', '2', '10'],
    ['parties.count', '', '2', '10'],
    ['parties.count', 'four', '2', '10'],
    ['people.count', '0', '1', '8'],
    ['people.count', '9', '1', '8'],
    ['rules.seats', '0', '1', '10000'],
    ['rules.seats', '10001', '1', '10000'],
  ])('refuses %s %j outside %s..%s', (page, text, min, max) => {
    expect(errorOf(page, [text])).toEqual({
      code: 'count',
      index: 0,
      min,
      max,
      remainder: null,
    });
  });

  it.each([
    ['parties.count', '2'],
    ['parties.count', ' 10 '],
    ['people.count', '1'],
    ['people.count', '8'],
    ['rules.seats', '1'],
    ['rules.seats', '10000'],
  ])('accepts %s %j', (page, text) => {
    expect(errorOf(page, [text])).toBeNull();
  });

  it.each([
    ['turnout.0', '101', '1', '100'],
    ['turnout.0', '-1', '1', '100'],
    ['turnout.0', '0', '1', '100'],
    ['turnout.0', '0,5', '1', '100'],
    ['turnout.0', 'x', '1', '100'],
    ['rules.threshold', '100.5', '0', '100'],
  ])('refuses %s %j outside %s..%s percent', (page, text, min, max) => {
    expect(errorOf(page, [text])).toEqual({
      code: 'percent',
      index: 0,
      min,
      max,
      remainder: null,
    });
  });

  it('accepts signed changes from -100 to 100 percent', () => {
    const asked = legacyDraftOf({
      'growth.ask': ['yes'],
      'turnoutChange.ask': ['yes'],
    });
    expect(errorOf('growth.0', ['-100'], asked)).toBeNull();
    expect(errorOf('growth.0', ['2,5'], asked)).toBeNull();
    expect(errorOf('turnoutChange.3', ['100'], asked)).toBeNull();
    expect(errorOf('growth.1', ['-101'], asked)).toMatchObject({
      code: 'percent',
      min: '-100',
      max: '100',
    });
  });

  it.each([
    ['turnout.0', '1'],
    ['turnout.0', '100'],
    ['turnout.0', '72,5'],
    ['rules.threshold', '0'],
    ['rules.threshold', '3,25'],
  ])('accepts %s %j', (page, text) => {
    expect(errorOf(page, [text])).toBeNull();
  });

  it('requires vote shares and compositions to be percents summing to exactly 100', () => {
    expect(errorOf('votes.shares', ['50', '50', '0', '0'])).toBeNull();
    expect(errorOf('compose.1', ['33,5', '33,5', '33', '0'])).toBeNull();
    expect(errorOf('votes.shares', ['50', '40', '5', '4'])).toEqual({
      code: 'sum',
      index: null,
      min: null,
      max: null,
      remainder: '1',
    });
    expect(errorOf('compose.0', ['60', '50', '0', '0'])).toMatchObject({
      code: 'sum',
      remainder: '-10',
    });
    expect(errorOf('compose.0', ['50', '-5', '55', '0'])).toEqual({
      code: 'percent',
      index: 1,
      min: '0',
      max: '100',
      remainder: null,
    });
    expect(errorOf('votes.shares', ['25', '25', '25', ''])).toMatchObject({
      code: 'percent',
      index: 3,
    });
  });

  it('has nothing to check on the check page', () => {
    expect(pageError(EMPTY_DRAFT, 'votes.check')).toBeNull();
    expect(remainder(EMPTY_DRAFT, 'votes.check')).toBeNull();
    expect(partError(EMPTY_DRAFT, 'votes.check', 0)).toBeNull();
  });

  it('limits names to 60 characters and points at the name text', () => {
    expect(errorOf('parties.names', [null, 'a'.repeat(60)])).toBeNull();
    expect(errorOf('people.names', [null, 'Я'.repeat(60)])).toBeNull();
    expect(errorOf('parties.names', [null, '', null, 'a'.repeat(61)])).toEqual({
      code: 'length',
      index: 3,
      min: null,
      max: '60',
      remainder: null,
    });
    expect(errorOf('parties.names', pairs(['', '', '']))).toBeNull();
  });

  it('accepts only the offered choices', () => {
    expect(errorOf('growth.ask', ['maybe'])).toMatchObject({ code: 'choice' });
    expect(errorOf('coalitions.mode', ['custom'])).toBeNull();
    expect(errorOf('people.set', ['example'])).toBeNull();
  });

  it('accepts every suggestion', () => {
    const drafts = [
      EMPTY_DRAFT,
      legacyDraftOf(SIX_EXAMPLE),
      legacyDraftOf({
        'parties.count': ['10'],
        'people.count': ['8'],
        'growth.ask': ['yes'],
        'turnoutChange.ask': ['yes'],
        'coalitions.mode': ['custom'],
      }),
    ];
    for (const draft of drafts) {
      for (const page of bookPages(draft)) {
        expect(pageError(draft, page), page).toBeNull();
      }
    }
  });

  it('shows the remainder to 100 on vote shares and compositions', () => {
    expect(remainder(EMPTY_DRAFT, 'votes.shares')).toBe('0');
    expect(
      remainder(typed(legacyDraftOf({}), 'compose.0', ['15']), 'compose.0'),
    ).toBe('10');
    expect(
      remainder(typed(legacyDraftOf({}), 'compose.0', ['45,5']), 'compose.0'),
    ).toBe('-20.5');
    expect(
      remainder(typed(EMPTY_DRAFT, 'votes.shares', ['x']), 'votes.shares'),
    ).toBe(null);
    expect(remainder(EMPTY_DRAFT, 'turnout.0')).toBeNull();
  });
});

describe('answered pages', () => {
  it('confirms the shown values, suggestions included', () => {
    const draft = confirmPage(EMPTY_DRAFT, 'parties.count');
    expect(isSuggested(draft, 'parties.count')).toBe(false);
    expect(shownTexts(draft, 'parties.count')).toEqual(['4']);
    expect(isAnswered(draft, ['parties.count'], 'parties.count')).toBe(true);
    expect(isAnswered(draft, [], 'parties.count')).toBe(false);
    expect(isAnswered(EMPTY_DRAFT, ['parties.count'], 'parties.count')).toBe(
      false,
    );
  });

  it('is no longer answered after a change of shape or an invalid edit', () => {
    const draft = confirmPage(legacyDraftOf({}), 'compose.0');
    expect(isAnswered(draft, ['compose.0'], 'compose.0')).toBe(true);
    expect(
      isAnswered(
        typed(draft, 'parties.count', ['5']),
        ['compose.0'],
        'compose.0',
      ),
    ).toBe(false);
    expect(
      isAnswered(
        typed(draft, 'people.count', ['3']),
        ['compose.0'],
        'compose.0',
      ),
    ).toBe(false);
    expect(
      isAnswered(typed(draft, 'compose.0', ['90']), ['compose.0'], 'compose.0'),
    ).toBe(false);
  });

  it('never answers the check page', () => {
    const draft = confirmPage(EMPTY_DRAFT, 'votes.check');
    expect(isAnswered(draft, ['votes.check'], 'votes.check')).toBe(false);
    expect(isSuggested(draft, 'votes.check')).toBe(false);
  });
});

describe('narrator', () => {
  it('stays silent on a suggestion and on an invalid answer', () => {
    expect(narration(EMPTY_DRAFT, 'parties.count')).toBeNull();
    expect(narration(EMPTY_DRAFT, 'intro')).toBeNull();
    expect(
      narration(typed(EMPTY_DRAFT, 'parties.count', ['x']), 'parties.count'),
    ).toBeNull();
  });

  it('pins the official Knesset facts', () => {
    expect(KNESSET_FACTS).toEqual([
      {
        year: 2021,
        knesset: 24,
        listsRan: 39,
        listsWon: 13,
        eligible: 6578084,
        turnout: '67.44',
      },
      {
        year: 2022,
        knesset: 25,
        listsRan: 40,
        listsWon: 10,
        eligible: 6788804,
        turnout: '70.63',
      },
    ]);
    expect(THRESHOLD_FACT).toEqual({ since: 2014, percent: '3.25' });
  });

  it.each([
    ['2', 'count.small'],
    ['4', 'count.small'],
    ['5', 'count.small'],
    ['6', 'count.medium'],
    ['9', 'count.medium'],
    ['10', 'count.large'],
  ])('answers %s parties with %s and the facts', (count, variant) => {
    expect(
      narration(typed(EMPTY_DRAFT, 'parties.count', [count]), 'parties.count'),
    ).toEqual({
      variant,
      params: {
        count,
        ran2021: '39',
        won2021: '13',
        ran2022: '40',
        won2022: '10',
      },
    });
  });

  it.each([
    ['parties.naming', 'own', 'naming.own'],
    ['parties.naming', 'catalog', 'naming.catalog'],
    ['people.set', 'example', 'set.example'],
    ['people.set', 'own', 'set.own'],
    ['growth.ask', 'yes', 'growth.yes'],
    ['growth.ask', 'no', 'growth.no'],
    ['turnoutChange.ask', 'yes', 'turnoutChange.yes'],
    ['turnoutChange.ask', 'no', 'turnoutChange.no'],
    ['coalitions.mode', 'all', 'coalitions.all'],
    ['coalitions.mode', 'custom', 'coalitions.custom'],
  ])('answers %s %s with %s', (page, choice, variant) => {
    expect(narration(typed(EMPTY_DRAFT, page, [choice]), page)).toEqual({
      variant,
      params: {},
    });
  });

  it('answers the six-list set', () => {
    expect(narration(legacyDraftOf(SIX_EXAMPLE), 'parties.naming')).toEqual({
      variant: 'naming.example',
      params: {},
    });
  });

  it.each([
    ['70', '70', '30'],
    ['72,5', '72.5', '27.5'],
    ['100', '100', '0'],
  ])(
    'answers turnout %s with who comes and who stays',
    (text, turnout, rest) => {
      expect(
        narration(typed(EMPTY_DRAFT, 'turnout.1', [text]), 'turnout.1'),
      ).toEqual({ variant: 'turnout', params: { turnout, rest } });
    },
  );

  it.each([
    ['3.25', 'threshold.israel', {}],
    ['3,25', 'threshold.israel', {}],
    ['3.250', 'threshold.israel', {}],
    ['0', 'threshold.none', {}],
    ['5', 'threshold.other', { threshold: '5' }],
    ['1,5', 'threshold.other', { threshold: '1.5' }],
  ])('answers threshold %s with %s', (text, variant, params) => {
    expect(
      narration(
        typed(EMPTY_DRAFT, 'rules.threshold', [text]),
        'rules.threshold',
      ),
    ).toEqual({ variant, params });
  });

  it('has nothing to say about names, vote shares, compositions, the check or seats', () => {
    const draft = legacyDraftOf({
      'parties.names': [null, 'A'],
      'votes.shares': ['40', '20', '20', '20'],
      'compose.0': ['40', '20', '20', '20'],
      'rules.seats': ['100'],
    });
    for (const page of [
      'parties.names',
      'votes.shares',
      'compose.0',
      'votes.check',
      'rules.seats',
    ]) {
      expect(narration(draft, page), page).toBeNull();
    }
  });
});

/** M7-19: the six-list example at the per-group turnout (ultra-Orthodox 85). */
const EXAMPLE_SEATS = {
  likud: 30,
  'yesh-atid': 29,
  avoda: 11,
  'religious-zionism': 15,
  shas: 20,
  raam: 15,
};

/** The suggested group turnout in the Basic order (M7-19). */
const EXAMPLE_TURNOUT = CATALOG_GROUPS.map((group) =>
  group.id === 'haredi'
    ? { numerator: '17', denominator: '20' }
    : { numerator: '7', denominator: '10' },
);

describe('build', () => {
  const thresholdBoundaryAnswers: Answers = {
    'parties.count': ['2'],
    'parties.naming': ['own'],
    'parties.names': pairs(['At threshold', 'Other']),
    'people.set': ['own'],
    'people.count': ['2'],
    'people.names': pairs(['Group one', 'Group two']),
    'turnout.0': ['70'],
    'turnout.1': ['70'],
    'votes.shares': ['3.25', '96.75'],
    'compose.0': ['1', '99'],
    'compose.1': ['5', '95'],
    'rules.threshold': ['3.25'],
  };

  it('builds the questionnaire in party-first mode', () => {
    const { draft, answered } = legacyWalk(thresholdBoundaryAnswers);
    const { input } = buildBook(draft, answered);

    expect(input).toHaveProperty('inputMode', 'parties');
    expect(input.parties).toMatchObject([
      { voteShare: { numerator: '13', denominator: '400' } },
      { voteShare: { numerator: '387', denominator: '400' } },
    ]);
  });

  it('keeps an entered threshold-boundary share through questionnaire build', () => {
    const { draft, answered } = legacyWalk(thresholdBoundaryAnswers);
    const { input } = buildBook(draft, answered);

    expect(seatsOf(input)).toEqual({ P1: 4, P2: 116 });
  });

  it('gives the Israeli example, derived from the parties’ voters, every page confirmed', () => {
    const { draft, answered } = legacyWalk(SIX_EXAMPLE);
    const build = buildBook(draft, answered);
    expect(build.filled).toEqual([]);
    expect(build.input).toMatchObject({
      schemaVersion: 5,
      inputMode: 'parties',
      // M7-19: derived exactly from the per-group turnout.
      rules: {
        overallTurnout: { numerator: '119000000', denominator: '166080371' },
      },
      groups: CATALOG_GROUPS.map((group, index) => ({
        id: group.id,
        turnout: EXAMPLE_TURNOUT[index],
      })),
    });
    expect(
      (build.input.parties as Json[]).every(
        (party) => party.composition !== null,
      ),
    ).toBe(true);
    expect(seatsOf(build.input)).toEqual(EXAMPLE_SEATS);
  });

  it('lets turnout shape the group sizes and keeps the year-0 seats', () => {
    const { draft, answered } = legacyWalk({
      ...SIX_EXAMPLE,
      'turnout.4': ['50'],
    });
    const { input } = buildBook(draft, answered);
    const groups = input.groups as Json[];
    expect(groups.map((group) => group.turnout)).toEqual(
      EXAMPLE_TURNOUT.map((turnout, index) =>
        index === 4 ? { numerator: '1', denominator: '2' } : turnout,
      ),
    );
    const baselineWalk = legacyWalk(SIX_EXAMPLE);
    const baseline = buildBook(baselineWalk.draft, baselineWalk.answered).input;
    expect(input.parties).toEqual(baseline.parties);
    expect(input.rules).toMatchObject({
      overallTurnout: {
        numerator: expect.any(String),
        denominator: expect.any(String),
      },
    });
    expect(seatsOf(input)).toEqual(EXAMPLE_SEATS);
  });

  it('fills every unanswered page on the chosen example branch and lists it', () => {
    const draft = legacyDraftOf(SIX_EXAMPLE);
    const answered = ['parties.count', 'parties.naming', 'people.set'];
    const confirmed = answered.reduce(
      (current, page) => confirmPage(current, page),
      draft,
    );
    const build = buildBook(confirmed, answered);
    expect(build.input).toHaveProperty('inputMode', 'parties');
    expect(seatsOf(build.input)).toEqual(EXAMPLE_SEATS);
    const groups = CATALOG_GROUPS.map((group) => group.id);
    expect(build.filled).toEqual([
      { section: 'parties.names', entity: null },
      ...groups.map((entity) => ({ section: 'turnout', entity })),
      { section: 'votes.shares', entity: null },
      ...EXAMPLE_LISTS.map((entity) => ({ section: 'compose', entity })),
      ...groups.map((entity) => ({ section: 'growth', entity })),
      ...EXAMPLE_LISTS.map((entity) => ({ section: 'coalitions', entity })),
      { section: 'rules.threshold', entity: null },
      { section: 'rules.seats', entity: null },
    ]);
  });

  it('builds four equal catalog parties with Basic groups and evenly split compositions', () => {
    const { input, filled } = buildBook(EMPTY_DRAFT, []);
    const ids = FIRST_LISTS;
    expect(input).toMatchObject({
      schemaVersion: 5,
      inputMode: 'parties',
      id: BOOK_SCENARIO_ID,
      name: '',
      notes: '',
      rules: {
        populationTotal: '1000000',
        seatCount: 120,
        majorityMode: 'default',
        majorityOverride: null,
        threshold: '0.0325',
        allocationMethod: 'hamilton',
        // M7-19: derived from 70% and the ultra-Orthodox 85%.
        overallTurnout: { numerator: '595', denominator: '829' },
        validBallotRate: '0.999',
      },
      groups: CATALOG_GROUPS.map(({ id }) => ({
        id,
        growthRate: '0',
        turnoutChange: '0',
      })),
      parties: ids.map((id, index) => ({
        id,
        name: '',
        color: catalogListColor(id),
        blockId: null,
        tieBreakOrder: index + 1,
        canJoinGovernment: true,
        voteShare: { numerator: '1', denominator: '4' },
      })),
    });
    // M7-15: every composition is distributed; the start is the even split.
    const even = Object.fromEntries(
      CATALOG_GROUPS.map(({ id }, index) => [
        id,
        index < 2
          ? { numerator: '3', denominator: '20' }
          : { numerator: '7', denominator: '50' },
      ]),
    );
    expect((input.parties as Json[]).map((party) => party.composition)).toEqual(
      ids.map(() => even),
    );
    expect(filled[0]).toEqual({ section: 'parties.count', entity: null });
    expect(filled).toContainEqual({ section: 'parties.naming', entity: null });
    expect(filled).toContainEqual({ section: 'turnout', entity: 'secular' });
    expect(filled).not.toContainEqual({
      section: 'people.names',
      entity: null,
    });
    expect(filled).not.toContainEqual({
      section: 'votes.check',
      entity: null,
    });
    expect(Object.values(seatsOf(input))).toEqual([30, 30, 30, 30]);
    expect(validateScenario(input).ok).toBe(true);
  });

  it('builds four own parties when own names are chosen', () => {
    const naming = confirmPage(legacyDraftOf(OWN_NAMES), 'parties.naming');
    const { input, filled } = buildBook(naming, ['parties.naming']);
    const parties = input.parties as Json[];
    expect(parties.map((party) => party.id)).toEqual(['P1', 'P2', 'P3', 'P4']);
    expect(parties.map((party) => party.name)).toEqual(['', '', '', '']);
    expect(parties.map((party) => party.color)).toEqual(PALETTE.slice(0, 4));
    expect(filled).not.toContainEqual({
      section: 'parties.naming',
      entity: null,
    });
    expect(validateScenario(input).ok).toBe(true);
  });

  it('gives the suggested catalog lists the seats own parties get in the same places', () => {
    const answers: Answers = {
      'parties.count': ['5'],
      'votes.shares': ['31,5', '24,5', '20', '18', '6'],
      'rules.threshold': ['5'],
    };
    const suggested = legacyWalk(answers);
    const own = legacyWalk({ ...OWN_NAMES, ...answers });
    const catalogInput = buildBook(suggested.draft, suggested.answered).input;
    const ownInput = buildBook(own.draft, own.answered).input;
    const catalogIds = CATALOG_LISTS.slice(0, 5).map((list) => list.id);
    const catalogSeats = seatsOf(catalogInput);
    const ownSeats = seatsOf(ownInput);
    expect(Object.keys(catalogSeats)).toEqual(catalogIds);
    expect(catalogIds.map((id) => catalogSeats[id])).toEqual(
      ['P1', 'P2', 'P3', 'P4', 'P5'].map((id) => ownSeats[id]),
    );
    expect(
      Object.values(catalogSeats).reduce((sum, seats) => sum + seats, 0),
    ).toBe(120);
    expect(catalogIds.map((id) => catalogSeats[id])).toEqual([
      38, 29, 24, 22, 7,
    ]);
    expect(buildBook(suggested.draft, suggested.answered).input).toEqual(
      catalogInput,
    );
    const validation = validateScenario(catalogInput);
    if (!validation.ok) {
      throw new Error('expected a valid scenario');
    }
    const parsed = parseScenarioJson(serializeScenario(validation.scenario));
    if (!parsed.ok) {
      throw new Error('expected the export to import');
    }
    expect(seatsOf(parsed.scenario)).toEqual(catalogSeats);
  });

  it('stores every typed value exactly as the editor stores it', () => {
    const { draft, answered } = legacyWalk({
      'parties.count': ['3'],
      'parties.names': pairs(['Север', '', 'Юг']),
      'people.count': ['2'],
      'people.names': pairs(['Студенты', '']),
      'turnout.0': ['80'],
      'turnout.1': ['55,5'],
      'votes.shares': ['50', '30,5', '19,5'],
      'compose.0': ['50', '50'],
      'compose.1': ['0', '100'],
      'compose.2': ['10,5', '89,5'],
      'growth.ask': ['yes'],
      'growth.0': ['1,5'],
      'growth.1': ['-2'],
      'turnoutChange.ask': ['yes'],
      'turnoutChange.0': ['0'],
      'turnoutChange.1': ['-1'],
      'rules.seats': ['99'],
      'rules.threshold': ['2'],
      'coalitions.mode': ['custom'],
      'coalitions.0': ['no'],
      'coalitions.1': ['yes', 'yes', 'yes', 'no'],
    });
    const { input, filled } = buildBook(draft, answered);
    expect(filled).toEqual([]);
    expect(input.rules).toMatchObject({ seatCount: 99, threshold: '0.02' });
    const groups = input.groups as Json[];
    expect(groups.map((group) => group.name)).toEqual(['Студенты', '']);
    expect(groups.every((group) => !('populationShare' in group))).toBe(true);
    const partyRows = input.parties as Json[];
    expect(partyRows.map((party) => party.composition)).toEqual([
      {
        G1: { numerator: '1', denominator: '2' },
        G2: { numerator: '1', denominator: '2' },
      },
      {
        G1: { numerator: '0', denominator: '1' },
        G2: { numerator: '1', denominator: '1' },
      },
      {
        G1: { numerator: '21', denominator: '200' },
        G2: { numerator: '179', denominator: '200' },
      },
    ]);
    expect(groups.map((group) => group.turnout)).toEqual([
      { numerator: '4', denominator: '5' },
      { numerator: '111', denominator: '200' },
    ]);
    expect(groups.map((group) => group.growthRate)).toEqual(['0.015', '-0.02']);
    expect(groups.map((group) => group.turnoutChange)).toEqual(['0', '0']);
    expect(partyRows.map((party) => party.name)).toEqual(['Север', '', 'Юг']);
    expect(partyRows.map((party) => party.canJoinGovernment)).toEqual([
      false,
      true,
      true,
    ]);
    expect(input.coalitionRules).toEqual({
      incompatiblePartyPairs: [],
      incompatibleBlockPairs: [],
      compatiblePartyOverrides: [],
      partyRefusals: [['P2', 'P3']],
    });
    expect(validateScenario(input).ok).toBe(true);
  });

  it('round-trips through export and import with the same seats', () => {
    const { input } = buildBook(legacyDraftOf(SIX_EXAMPLE), []);
    const validation = validateScenario(input);
    if (!validation.ok) {
      throw new Error('expected a valid scenario');
    }
    const parsed = parseScenarioJson(serializeScenario(validation.scenario));
    if (!parsed.ok) {
      throw new Error('expected the export to import');
    }
    expect(seatsOf(parsed.scenario)).toEqual(seatsOf(input));
  });

  it('colours catalog lists by the catalog and own parties by the palette', () => {
    const built = (answers: Answers) => {
      const { draft, answered } = legacyWalk(answers);
      return buildBook(draft, answered).input.parties as Json[];
    };
    const catalog = built({ 'parties.naming': ['catalog'] });
    expect(catalog.map((party) => party.color)).toEqual(
      ['likud', 'yesh-atid', 'religious-zionism', 'national-unity'].map((id) =>
        catalogListColor(id),
      ),
    );
    const ten = built({ ...OWN_NAMES, 'parties.count': ['10'] });
    expect(ten.map((party) => party.color)).toEqual(PALETTE.slice(0, 10));
  });

  it('uses only confirmed answers; typed but unconfirmed values take the suggestion', () => {
    const draft = typed(
      confirmPage(typed(EMPTY_DRAFT, 'parties.count', ['3']), 'parties.count'),
      'votes.shares',
      ['80', '10', '10'],
    );
    const { input, filled } = buildBook(draft, ['parties.count']);
    expect((input.parties as Json[]).map((party) => party.voteShare)).toEqual([
      { numerator: '17', denominator: '50' },
      { numerator: '33', denominator: '100' },
      { numerator: '33', denominator: '100' },
    ]);
    expect(filled).toContainEqual({ section: 'votes.shares', entity: null });
    expect(filled).toContainEqual({ section: 'turnout', entity: 'secular' });
    expect(filled).not.toContainEqual({
      section: 'parties.count',
      entity: null,
    });
  });

  it('builds the same scenario on every call, through a schema round trip', () => {
    const answers = { ...SIX_EXAMPLE, 'turnout.2': ['63,5'] };
    const first = legacyWalk(answers);
    const second = legacyWalk(answers);
    const built = buildBook(first.draft, first.answered).input;
    expect(buildBook(second.draft, second.answered).input).toEqual(built);
    const validation = validateScenario(built);
    if (!validation.ok) {
      throw new Error('expected a valid scenario');
    }
    const parsed = parseScenarioJson(serializeScenario(validation.scenario));
    if (!parsed.ok) {
      throw new Error('expected the export to import');
    }
    expect(seatsOf(parsed.scenario)).toEqual(EXAMPLE_SEATS);
  });

  it('gives a group no party draws from a zero share and even weights', () => {
    const { draft, answered } = legacyWalk({
      ...OWN_NAMES,
      'parties.count': ['2'],
      'people.count': ['3'],
      'votes.shares': ['50', '50'],
      'compose.0': ['100', '0', '0'],
      'compose.1': ['0', '100', '0'],
    });
    const parties = buildBook(draft, answered).input.parties as Json[];
    expect(parties.map((party) => party.composition)).toEqual([
      {
        G1: { numerator: '1', denominator: '1' },
        G2: { numerator: '0', denominator: '1' },
        G3: { numerator: '0', denominator: '1' },
      },
      {
        G1: { numerator: '0', denominator: '1' },
        G2: { numerator: '1', denominator: '1' },
        G3: { numerator: '0', denominator: '1' },
      },
    ]);
  });

  it('ignores obsolete yes/no switches without discarding confirmed growth or directed decisions', () => {
    const asked = legacyWalk({
      'growth.ask': ['yes'],
      'growth.0': ['5'],
      'coalitions.mode': ['custom'],
      'coalitions.0': ['no', 'yes', 'no'],
    });
    const declined = ['growth.ask', 'coalitions.mode'].reduce(
      (draft, page) =>
        typed(draft, page, [page === 'growth.ask' ? 'no' : 'all']),
      asked.draft,
    );
    const { input } = buildBook(declined, asked.answered);
    expect((input.groups as Json[])[0]!.growthRate).toBe('0.05');
    expect((input.parties as Json[])[0]!.canJoinGovernment).toBe(false);
    expect(input.coalitionRules).toMatchObject({
      incompatiblePartyPairs: [],
      partyRefusals: [['likud', 'yesh-atid']],
    });
  });

  it('writes each unticked partner as a refusal by that party only', () => {
    const built = (answers: Answers) => {
      const { draft, answered } = legacyWalk({
        ...OWN_NAMES,
        'parties.count': ['3'],
        'coalitions.mode': ['custom'],
        ...answers,
      });
      return buildBook(draft, answered).input;
    };
    const one = built({ 'coalitions.2': ['yes', 'no', 'yes', 'yes'] });
    expect(one.coalitionRules).toEqual({
      incompatiblePartyPairs: [],
      incompatibleBlockPairs: [],
      compatiblePartyOverrides: [],
      partyRefusals: [['P3', 'P1']],
    });
    const validation = validateScenario(one);
    if (!validation.ok) {
      throw new Error('expected a valid scenario');
    }
    expect(runScenario(validation.scenario).coalitions.forbiddenPairs).toEqual([
      { partyIds: ['P1', 'P3'], source: 'party', refusedBy: ['P3'] },
    ]);

    const many = built({
      'coalitions.2': ['yes', 'no', 'no', 'yes'],
      'coalitions.0': ['yes', 'yes', 'no', 'no'],
    });
    expect(many.coalitionRules).toMatchObject({
      incompatiblePartyPairs: [],
      partyRefusals: [
        ['P1', 'P2'],
        ['P1', 'P3'],
        ['P3', 'P1'],
        ['P3', 'P2'],
      ],
    });
  });

  it('resolves the draft page by page and is pure', () => {
    const draft = legacyDraftOf({ 'parties.count': ['3'] });
    const before = JSON.stringify(draft);
    const resolved = resolveDraft(draft, []);
    expect(JSON.stringify(draft)).toBe(before);
    expect(resolved.filled[0]).toBe('parties.count');
    expect(shownTexts(resolved.draft, 'parties.count')).toEqual(['4']);
    expect(buildBook(draft, [])).toEqual(buildBook(draft, []));
  });
});

describe('electorate check', () => {
  // M7-15: in the Basic order; the source has no figure for knitted kippot.
  const statistics = ['33.6', '24.5', '7.9', null, '17', '11', '6'];
  const rows = (draft: BookDraft, answered: readonly PageKey[]) =>
    electorateCheck(draft, answered).map((row) => [
      row.groupId,
      row.share,
      row.statistic,
    ]);
  const groups = CATALOG_GROUPS.map((group) => group.id);

  it('gives the 2022 statistics back for the unchanged example', () => {
    const { draft, answered } = legacyWalk(SIX_EXAMPLE);
    expect(rows(draft, answered)).toEqual(
      groups.map((id, g) => [id, statistics[g] ?? '0', statistics[g]]),
    );
  });

  it('shows how a lower turnout makes a group larger', () => {
    const { draft, answered } = legacyWalk({
      ...SIX_EXAMPLE,
      'turnout.4': ['50'],
    });
    // M7-19: at the ultra-Orthodox suggestion of 85.
    const shares = ['31.5', '22.9', '7.4', '0', '22.3', '10.3', '5.6'];
    expect(rows(draft, answered)).toEqual(
      groups.map((id, g) => [id, shares[g], statistics[g]]),
    );
  });

  it('compares with no statistics for own groups', () => {
    const { draft, answered } = legacyWalk({});
    expect(rows(draft, answered)).toEqual(
      ['G1', 'G2', 'G3', 'G4'].map((id) => [id, '25', null]),
    );
  });

  it('gives the example groups their statistics beside the even split with other parties', () => {
    // M7-19: one turnout for all, so the even split stays the group sizes.
    const { draft, answered } = legacyWalk({
      'people.set': ['example'],
      turnout: Array(7).fill('70'),
    });
    expect(rows(draft, answered)).toEqual(
      groups.map((id, g) => [id, EVEN_SEVEN[g], statistics[g]]),
    );
  });

  it('shows a group no party draws from as zero, the rest summing to 100', () => {
    const { draft, answered } = legacyWalk({
      'parties.count': ['2'],
      'people.count': ['3'],
      'votes.shares': ['50', '50'],
      'compose.0': ['100', '0', '0'],
      'compose.1': ['0', '100', '0'],
    });
    expect(rows(draft, answered)).toEqual([
      ['G1', '50', null],
      ['G2', '50', null],
      ['G3', '0', null],
    ]);
  });

  it('uses only confirmed answers, like the build', () => {
    const draft = typed(EMPTY_DRAFT, 'compose.0', ['100', '0', '0', '0']);
    expect(rows(draft, [])).toEqual(rows(EMPTY_DRAFT, []));
  });

  it('rounds to one decimal with rows summing to exactly 100', () => {
    const { draft, answered } = legacyWalk({
      'parties.count': ['3'],
      'people.count': ['2'],
      'turnout.0': ['80'],
      'turnout.1': ['55,5'],
      'votes.shares': ['50', '30,5', '19,5'],
      'compose.0': ['50', '50'],
      'compose.1': ['0', '100'],
      'compose.2': ['10,5', '89,5'],
    });
    expect(rows(draft, answered)).toEqual([
      ['G1', '20.5', null],
      ['G2', '79.5', null],
    ]);
  });
});

const LONG = (prefix: string) =>
  `${prefix} ${'длинное название '.repeat(4)}`.slice(0, 60);

/** Ten parties and eight own groups, every name typed at the 60-character limit. */
const HEAVY: Answers = {
  'parties.count': ['10'],
  'parties.names': pairs(
    [...range(4, 'A'), ...range(4, 'B'), ...range(2, 'C')].map(LONG),
  ),
  'people.set': ['own'],
  'people.count': ['8'],
  'people.names': pairs([...range(4, 'D'), ...range(4, 'E')].map(LONG)),
};

const sequence = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

describe('page parts', () => {
  it('shows a short page as one part with all its fields', () => {
    const grouped = legacyDraftOf({});
    expect(pageParts(EMPTY_DRAFT, 'intro')).toEqual([[]]);
    expect(pageParts(EMPTY_DRAFT, 'parties.count')).toEqual([[0]]);
    expect(pageParts(EMPTY_DRAFT, 'parties.naming')).toEqual([[0]]);
    expect(pageParts(EMPTY_DRAFT, 'parties.names')).toEqual([sequence(0, 7)]);
    expect(pageParts(EMPTY_DRAFT, 'votes.shares')).toEqual([[0, 1, 2, 3]]);
    expect(pageParts(grouped, 'compose.0')).toEqual([[0, 1, 2, 3]]);
    expect(pageParts(grouped, 'votes.check')).toEqual([[0, 1, 2, 3]]);
    expect(pageParts(EMPTY_DRAFT, 'turnout.3')).toEqual([[0]]);
    expect(pageParts(EMPTY_DRAFT, 'rules.threshold')).toEqual([[0]]);
    for (const lesson of LESSONS) {
      expect(pageParts(EMPTY_DRAFT, lesson), lesson).toEqual([[]]);
    }
    for (const page of bookPages(EMPTY_DRAFT)) {
      // M7-19: the review is one part too.
      expect(partCount(EMPTY_DRAFT, page), page).toBe(1);
    }
  });

  it('shows vote shares, compositions and the check on one part, whatever the count (M7-15)', () => {
    for (let count = 2; count <= 10; count += 1) {
      const draft = legacyDraftOf({ 'parties.count': [`${count}`] });
      expect(pageParts(draft, 'votes.shares'), `${count}`).toEqual([
        sequence(0, count - 1),
      ]);
      expect(pageParts(draft, 'compose'), `${count}`).toEqual([
        sequence(0, count * groupIds(draft).length - 1),
      ]);
      for (const page of range(count, 'coalitions.')) {
        expect(pageParts(draft, page), `${count} ${page}`).toEqual([
          [
            0,
            ...sequence(1, count).filter(
              (at) => at !== 1 + Number(page.slice(11)),
            ),
          ],
        ]);
      }
    }
    const six = legacyDraftOf(SIX_EXAMPLE);
    for (const page of ['votes.shares', 'compose.0', 'votes.check']) {
      expect(partCount(six, page), page).toBe(1);
    }
    expect(pageParts(six, 'votes.check')).toEqual([sequence(0, 6)]);
    const heavy = legacyDraftOf(HEAVY);
    expect(pageParts(heavy, 'votes.shares')).toEqual([sequence(0, 9)]);
    expect(pageParts(heavy, 'compose.9')).toEqual([sequence(0, 7)]);
    expect(pageParts(heavy, 'votes.check')).toEqual([sequence(0, 7)]);
    const one = legacyDraftOf({ 'people.set': ['own'], 'people.count': ['1'] });
    expect(pageParts(one, 'compose.1')).toEqual([[0]]);
    expect(pageParts(one, 'votes.check')).toEqual([[0]]);
  });

  it('puts "may join a government" first and every other party on one coalition screen', () => {
    const four = legacyDraftOf({ 'coalitions.mode': ['custom'] });
    expect(pageParts(four, 'coalitions.2')).toEqual([[0, 1, 2, 4]]);
    const seven = legacyDraftOf({
      'parties.count': ['7'],
      'coalitions.mode': ['custom'],
    });
    expect(pageParts(seven, 'coalitions.0')).toEqual([[0, 2, 3, 4, 5, 6, 7]]);
    expect(partCount(seven, 'coalitions.0')).toBe(1);
    const ten = legacyDraftOf({
      'parties.count': ['10'],
      'coalitions.mode': ['custom'],
    });
    expect(pageParts(ten, 'coalitions.9')).toEqual([sequence(0, 9)]);
  });

  it('checks only the fields of a part, never the sum', () => {
    const ten = legacyDraftOf({ 'parties.count': ['10'] });
    const page = 'votes.shares';
    const wrong = typed(ten, page, [
      '50',
      'abc',
      '10',
      '10',
      '10',
      '5',
      '5',
      '5',
      '5',
      '0',
    ]);
    expect(partError(wrong, page, 0)).toEqual({
      code: 'percent',
      index: 1,
      min: '0',
      max: '100',
      remainder: null,
    });
    // M7-15: the vote shares page is one part.
    expect(partError(wrong, page, 1)).toBeNull();
    const late = typed(ten, page, [...range(9, '').map(() => '10'), '101']);
    expect(partError(late, page, 0)).toMatchObject({
      code: 'percent',
      index: 9,
    });
    const over = typed(ten, page, ['50', ...range(9, '').map(() => '10')]);
    expect(partError(over, page, 0)).toBeNull();
    expect(pageError(over, page)).toMatchObject({ code: 'sum' });
    expect(partError(wrong, page, 2)).toBeNull();
    expect(partError(wrong, page, -1)).toBeNull();
  });

  it('checks the flags of a coalition part and the single field of a short page', () => {
    const six = legacyDraftOf({
      'parties.count': ['6'],
      'coalitions.mode': ['custom'],
    });
    const flag = editPage(six, 'coalitions.0', 6, 'maybe');
    expect(partError(flag, 'coalitions.0', 0)).toMatchObject({
      code: 'choice',
      index: 6,
    });
    expect(partError(flag, 'coalitions.0', 1)).toBeNull();
    const count = typed(EMPTY_DRAFT, 'parties.count', ['11']);
    expect(partError(count, 'parties.count', 0)).toEqual(
      pageError(count, 'parties.count'),
    );
    const name = typed(EMPTY_DRAFT, 'parties.names', [
      null,
      '',
      null,
      'a'.repeat(61),
    ]);
    expect(partError(name, 'parties.names', 0)).toEqual(
      pageError(name, 'parties.names'),
    );
  });
});

describe('review parts', () => {
  const light = EMPTY_DRAFT;
  const heavy = legacyDraftOf(HEAVY);
  const catalogTen = legacyDraftOf({
    'parties.count': ['10'],
    'parties.naming': ['catalog'],
  });
  const ownTen = legacyDraftOf({ 'parties.count': ['10'] });
  const drafts = {
    light,
    heavy,
    catalogTen,
    ownTen,
    six: legacyDraftOf(SIX_EXAMPLE),
  };

  it('shows every review chapter once, in order', () => {
    for (const [name, draft] of Object.entries(drafts)) {
      const parts = reviewParts(draft);
      expect(parts.flat(), name).toEqual(sequence(1, 7));
      for (const part of parts) {
        expect(part.length, name).toBeGreaterThan(0);
      }
      // M7-19: the screen shows every chapter at once.
      expect(partCount(draft, 'review'), name).toBe(1);
    }
  });

  it('packs chapters in order while their estimated lines fit', () => {
    const size = (draft: BookDraft, part: readonly number[]) =>
      part.reduce((sum, chapter) => sum + reviewSize(draft, chapter), 0);
    for (const [name, draft] of Object.entries(drafts)) {
      const parts = reviewParts(draft);
      parts.forEach((part, index) => {
        if (part.length > 1) {
          expect(size(draft, part), name).toBeLessThanOrEqual(
            BOOK_LIMITS.reviewLines,
          );
        }
        const following = parts[index + 1];
        if (following !== undefined) {
          expect(
            size(draft, part) + reviewSize(draft, following[0]!),
            name,
          ).toBeGreaterThan(BOOK_LIMITS.reviewLines);
        }
      });
    }
  });

  it('estimates longer chapters for longer typed names only', () => {
    for (const chapter of sequence(1, 7)) {
      expect(Number.isSafeInteger(reviewSize(light, chapter))).toBe(true);
      expect(reviewSize(light, chapter)).toBeGreaterThan(0);
    }
    const ownEight = legacyDraftOf({
      'people.set': ['own'],
      'people.count': ['8'],
    });
    expect(reviewSize(heavy, 1)).toBeGreaterThan(reviewSize(ownTen, 1));
    expect(reviewSize(heavy, 2)).toBeGreaterThan(reviewSize(ownEight, 2));
    expect(reviewSize(heavy, 3)).toBeGreaterThan(reviewSize(ownEight, 3));
    expect(reviewSize(heavy, 4)).toBeGreaterThan(reviewSize(ownEight, 4));
    expect(reviewSize(catalogTen, 1)).toBe(reviewSize(ownTen, 1));
    expect(reviewSize(ownTen, 4)).toBeGreaterThan(
      reviewSize(legacyDraftOf({}), 4),
    );
    expect(reviewSize(heavy, 5)).toBeGreaterThan(reviewSize(ownEight, 5));
    for (const chapter of [6, 7]) {
      expect(reviewSize(heavy, chapter), `${chapter}`).toBe(
        reviewSize(light, chapter),
      );
    }
    expect(reviewParts(heavy).length).toBeGreaterThan(
      reviewParts(light).length,
    );
  });
});
describe('lessons', () => {
  it('open chapter 2 after the group question (M7-20)', () => {
    for (const draft of [
      EMPTY_DRAFT,
      legacyDraftOf(SIX_EXAMPLE),
      legacyDraftOf({ 'people.set': ['own'], 'people.count': ['8'] }),
    ]) {
      const pages = bookPages(draft);
      // The question opens the chapter; the lessons close it, as a footnote.
      expect(pages[pages.indexOf('people.set') - 1]).toBe('parties.names');
      const mix = pages.indexOf('people.mix');
      expect(pages[mix - 1]).toBe('people.about');
      expect(pages[mix + 1]).toBe('turnout');
    }
  });

  it('have no fields, choices or subject', () => {
    for (const lesson of LESSONS) {
      expect(pageSpec(EMPTY_DRAFT, lesson), lesson).toMatchObject({
        key: lesson,
        section: lesson,
        kind: 'lesson',
        chapter: 2,
        motif: 'people',
        subject: null,
        step: null,
        entityKind: null,
        fields: [],
        choices: [],
      });
    }
  });

  it('take no answer and are never answered, checked or filled', () => {
    for (const lesson of LESSONS) {
      expect(editPage(EMPTY_DRAFT, lesson, 0, '5'), lesson).toBe(EMPTY_DRAFT);
      expect(confirmPage(EMPTY_DRAFT, lesson), lesson).toBe(EMPTY_DRAFT);
      expect(shownTexts(EMPTY_DRAFT, lesson)).toEqual([]);
      expect(isSuggested(EMPTY_DRAFT, lesson)).toBe(false);
      expect(isAnswered(EMPTY_DRAFT, [lesson], lesson)).toBe(false);
      expect(pageError(EMPTY_DRAFT, lesson)).toBeNull();
      expect(partError(EMPTY_DRAFT, lesson, 0)).toBeNull();
      expect(narration(EMPTY_DRAFT, lesson)).toBeNull();
      expect(remainder(EMPTY_DRAFT, lesson)).toBeNull();
      expect(fieldPicks(EMPTY_DRAFT, lesson, 0)).toEqual([]);
      expect(chosenPick(EMPTY_DRAFT, lesson, 0)).toBe('');
    }
    const resolved = resolveDraft(EMPTY_DRAFT, []);
    const built = buildBook(EMPTY_DRAFT, []);
    for (const lesson of LESSONS) {
      expect(resolved.filled).not.toContain(lesson);
      expect(built.filled.map((item) => item.section)).not.toContain(lesson);
    }
  });
});

describe('group mix example', () => {
  it('takes where Likud and Ra’am get their valid votes from the engine', () => {
    const validation = validateScenario(presetInput('israelExample'));
    if (!validation.ok) {
      throw new Error('expected the Israeli example to be valid');
    }
    const scenario = validation.scenario;
    const votes = computeVotes(scenario);
    const mix = groupMixExample();
    expect(mix.map((example) => example.partyId)).toEqual(['likud', 'raam']);
    for (const example of mix) {
      const target = { kind: 'party', id: example.partyId } as const;
      const exact = electorateComposition(scenario, votes, target, 'valid');
      const report = buildCompositionReport(scenario, votes, target);
      const giving = exact.rows.filter(
        (row) => row.share !== null && isPositive(row.share),
      );
      expect(example.shares, example.partyId).toEqual(
        giving.map((row) => ({
          groupId: row.groupId,
          share: report.rows.find((cell) => cell.groupId === row.groupId)!.valid
            .share,
        })),
      );
      expect(example.groups).toBe(giving.length);
    }
    expect(mix[0]).toMatchObject({
      groups: 6,
      // M7-19: haredi turnout 85% in the example (was 43.06).
      top: { groupId: 'traditional', share: '42.67' },
    });
    expect(mix[1]).toMatchObject({
      groups: 2,
      top: { groupId: 'arab', share: '97.70' },
    });
    expect(groupMixExample()).toEqual(mix);
  });
});

describe('example group set', () => {
  it('lists the seven Basic groups, the source shares summing to 100% and none invented (M7-15)', () => {
    const set = exampleGroupSet();
    expect(set).toEqual([
      { groupId: 'secular', share: '33.6' },
      { groupId: 'traditional', share: '24.5' },
      { groupId: 'religious', share: '7.9' },
      { groupId: 'knitted-kippot', share: null },
      { groupId: 'arab', share: '17' },
      { groupId: 'haredi', share: '11' },
      { groupId: 'other', share: '6' },
    ]);
    expect(
      percentRemainder(
        set.flatMap((group) => (group.share === null ? [] : [group.share])),
      ),
    ).toBe('0');
    for (const share of groupMixExample()[0]!.shares) {
      expect(set.map((group) => group.groupId)).toContain(share.groupId);
    }
    expect(
      shownTexts(legacyDraftOf({ 'people.set': ['example'] }), 'compose.0'),
    ).toEqual(EVEN_SEVEN);
  });
});

describe('names with picks', () => {
  const catalog = legacyDraftOf({ 'parties.naming': ['catalog'] });
  const own = legacyDraftOf(OWN_NAMES);
  const names = (draft: BookDraft) => shownTexts(draft, 'parties.names');

  it('keeps a pick and a typed name for every field', () => {
    expect(names(own)).toEqual(['', '', '', '', '', '', '', '']);
    expect(names(EMPTY_DRAFT)).toEqual(names(catalog));
    expect(names(catalog)).toEqual([
      'likud',
      '',
      'yesh-atid',
      '',
      'religious-zionism',
      '',
      'national-unity',
      '',
    ]);
    expect(names(legacyDraftOf(SIX_EXAMPLE))).toEqual(
      EXAMPLE_LISTS.flatMap((id) => [id, '']),
    );
    expect(shownTexts(legacyDraftOf({}), 'people.names')).toEqual(names(own));
  });

  it('takes a picked list as the party, by its catalog ID and with no name', () => {
    const draft = typed(own, 'parties.names', [null, 'Север']);
    const shas = editPage(draft, 'parties.names', 0, 'shas');
    expect(names(shas).slice(0, 2)).toEqual(['shas', '']);
    expect(partyIds(shas)).toEqual(['shas', 'P2', 'P3', 'P4']);
    expect(partyNames(shas)).toEqual(['', '', '', '']);
    expect(isSuggested(shas, 'parties.names')).toBe(false);
  });

  it('swaps two fields when a list taken elsewhere is picked', () => {
    const swapped = editPage(catalog, 'parties.names', 4, 'likud');
    expect(partyIds(swapped)).toEqual([
      'religious-zionism',
      'yesh-atid',
      'likud',
      'national-unity',
    ]);
    const ownPicked = legacyDraftOf({
      ...OWN_NAMES,
      'parties.names': ['shas', null, '', 'Север'],
    });
    const moved = editPage(ownPicked, 'parties.names', 2, 'shas');
    expect(names(moved).slice(0, 4)).toEqual(['', 'Север', 'shas', '']);
    expect(partyIds(moved)).toEqual(['P1', 'shas', 'P3', 'P4']);
  });

  it('makes a field own on «Своё название» or a typed name, keeping the typed name', () => {
    const typedName = typed(EMPTY_DRAFT, 'parties.names', [null, 'Север']);
    expect(editPage(typedName, 'parties.names', 0, '')).toEqual(typedName);
    const renamed = editPage(catalog, 'parties.names', 3, 'Мой список');
    expect(names(renamed).slice(2, 4)).toEqual(['', 'Мой список']);
    expect(partyIds(renamed)).toEqual([
      'likud',
      'P2',
      'religious-zionism',
      'national-unity',
    ]);
    expect(partyNames(renamed)).toEqual(['', 'Мой список', '', '']);
    const cleared = editPage(renamed, 'parties.names', 3, '');
    expect(partyIds(cleared)[1]).toBe('P2');
    const unpicked = editPage(catalog, 'parties.names', 0, '');
    expect(partyIds(unpicked)[0]).toBe('P1');
    expect(partyNames(unpicked)[0]).toBe('');
  });

  it('ignores a pick that is not a list or a group of the page', () => {
    for (const [page, value] of [
      ['parties.names', 'bogus'],
      ['parties.names', 'arab'],
      ['parties.names', '__proto__'],
      ['parties.names', 'constructor'],
      ['people.names', 'likud'],
      ['people.names', 'P1'],
      ['people.names', 'toString'],
    ] as const) {
      expect(editPage(catalog, page, 0, value), `${page} ${value}`).toBe(
        catalog,
      );
    }
    const arab = editPage(legacyDraftOf({}), 'people.names', 0, 'arab');
    expect(groupIds(arab)).toEqual(['arab', 'G2', 'G3', 'G4']);
  });

  it('reads a stale or repeated pick as the default of its field, else the first free list', () => {
    const stored = {
      values: {
        ...catalog.values,
        'parties.names': {
          shape: 'catalog',
          texts: ['bogus', 'x', 'likud', '', 'likud', '', 'national-unity', ''],
        },
      },
    };
    expect(names(stored)).toEqual([
      'yesh-atid',
      '',
      'likud',
      '',
      'religious-zionism',
      '',
      'national-unity',
      '',
    ]);
    const shas = editPage(catalog, 'parties.names', 6, 'shas');
    expect(partyIds(typed(shas, 'parties.count', ['6']))).toEqual([
      'likud',
      'yesh-atid',
      'religious-zionism',
      'shas',
      'national-unity',
      'utj',
    ]);
  });

  it('never gives two parties or two groups the same ID', () => {
    for (let count = 2; count <= 10; count += 1) {
      for (const naming of ['own', 'catalog']) {
        let draft = legacyDraftOf({
          'parties.count': [`${count}`],
          'parties.naming': [naming],
        });
        for (let slot = 0; slot < count; slot += 1) {
          draft = editPage(
            draft,
            'parties.names',
            2 * slot,
            CATALOG_LISTS[(slot * 3) % 10]!.id,
          );
          const ids = partyIds(draft);
          expect(ids, `${count} ${naming} ${slot}`).toHaveLength(count);
          expect(new Set(ids).size, `${count} ${naming} ${slot}`).toBe(count);
        }
        for (const next of ['2', '10']) {
          const ids = partyIds(typed(draft, 'parties.count', [next]));
          expect(new Set(ids).size, `${count} ${naming} ${next}`).toBe(
            Number(next),
          );
        }
      }
    }
    for (let count = 1; count <= 8; count += 1) {
      let draft = legacyDraftOf({
        'people.set': ['own'],
        'people.count': [`${count}`],
      });
      for (let slot = 0; slot < count; slot += 1) {
        draft = editPage(
          draft,
          'people.names',
          2 * slot,
          CATALOG_GROUPS[(slot * 5) % 6]!.id,
        );
        const ids = groupIds(draft);
        expect(ids, `${count} ${slot}`).toHaveLength(count);
        expect(new Set(ids).size, `${count} ${slot}`).toBe(count);
      }
    }
  });

  it('suggests vote shares and compositions again when a list changes and keeps them for the same lists', () => {
    const shares = typed(catalog, 'votes.shares', ['40', '30', '20', '10']);
    const composed = typed(shares, 'compose.3', ['40', '30', '20', '10']);
    const changed = editPage(composed, 'parties.names', 6, 'shas');
    expect(shownTexts(changed, 'votes.shares')).toEqual([
      '25',
      '25',
      '25',
      '25',
    ]);
    expect(isSuggested(changed, 'votes.shares')).toBe(true);
    expect(isSuggested(changed, 'compose.3')).toBe(true);
    const back = editPage(changed, 'parties.names', 6, 'national-unity');
    expect(shownTexts(back, 'votes.shares')).toEqual(['40', '30', '20', '10']);
    expect(shownTexts(back, 'compose.3')).toEqual(['40', '30', '20', '10']);
    const custom = typed(
      legacyDraftOf({ ...OWN_NAMES, 'coalitions.mode': ['custom'] }),
      'coalitions.0',
      ['no'],
    );
    const renamed = editPage(custom, 'parties.names', 1, 'Север');
    expect(isSuggested(renamed, 'coalitions.0')).toBe(false);
    const repicked = editPage(custom, 'parties.names', 0, 'likud');
    expect(isSuggested(repicked, 'coalitions.0')).toBe(true);
  });

  it('suggests the Section 14.4 example only for the six example lists in table order', () => {
    const picks = (ids: readonly string[]) =>
      legacyDraftOf({
        'parties.count': ['6'],
        'parties.names': picked(ids),
        'people.set': ['example'],
      });
    const example = legacyDraftOf(SIX_EXAMPLE);
    const reversed = picks([...EXAMPLE_LISTS].reverse());
    for (const page of ['votes.shares', ...range(6, 'compose.')]) {
      expect(shownTexts(picks(EXAMPLE_LISTS), page), page).toEqual(
        shownTexts(example, page),
      );
    }
    expect(shownTexts(reversed, 'votes.shares')).toEqual([
      '17',
      '17',
      '17',
      '17',
      '16',
      '16',
    ]);
    for (const page of range(6, 'compose.')) {
      expect(shownTexts(reversed, page), page).toEqual(EVEN_SEVEN);
    }
  });
});

describe('build with picks', () => {
  it('gives the Israeli example from the six lists picked one by one', () => {
    const { draft, answered } = legacyWalk({
      'parties.count': ['6'],
      'parties.names': picked(EXAMPLE_LISTS),
      'people.set': ['example'],
    });
    const build = buildBook(draft, answered);
    expect(build.filled).toEqual([]);
    expect(build.input).toHaveProperty('inputMode', 'parties');
    expect(seatsOf(build.input)).toEqual(EXAMPLE_SEATS);
    expect(buildBook(draft, answered)).toEqual(build);
  });

  it('colours a picked list by the catalog and an own party by the palette', () => {
    const { draft, answered } = legacyWalk({
      ...OWN_NAMES,
      'parties.names': ['shas', null, '', 'Север'],
    });
    const parties = buildBook(draft, answered).input.parties as Json[];
    expect(parties.map((party) => party.id)).toEqual([
      'shas',
      'P2',
      'P3',
      'P4',
    ]);
    expect(parties.map((party) => party.name)).toEqual(['', 'Север', '', '']);
    expect(parties.map((party) => party.color)).toEqual([
      catalogListColor('shas'),
      PALETTE[1],
      PALETTE[2],
      PALETTE[3],
    ]);
  });

  it('builds picked and own groups with their IDs and names', () => {
    const { draft, answered } = legacyWalk({
      'people.count': ['3'],
      'people.names': ['arab', null, '', 'Студенты'],
    });
    const { input } = buildBook(draft, answered);
    const groups = input.groups as Json[];
    expect(groups.map((group) => group.id)).toEqual(['arab', 'G2', 'G3']);
    expect(groups.map((group) => group.name)).toEqual(['', 'Студенты', '']);
    expect(validateScenario(input).ok).toBe(true);
  });
});

describe('ready values', () => {
  const values = (draft: BookDraft, page: PageKey, index = 0) =>
    fieldPicks(draft, page, index).map((pick) => pick.value);
  const steps = (from: number, to: number, by: number) =>
    Array.from({ length: (to - from) / by + 1 }, (_, n) => `${from + n * by}`);
  const asked = legacyDraftOf({
    'growth.ask': ['yes'],
    'turnoutChange.ask': ['yes'],
    'coalitions.mode': ['custom'],
  });

  it('offers counts within the limits', () => {
    expect(values(EMPTY_DRAFT, 'parties.count')).toEqual(steps(2, 10, 1));
    expect(values(EMPTY_DRAFT, 'people.count')).toEqual(steps(1, 8, 1));
    expect(fieldPicks(EMPTY_DRAFT, 'parties.count', 0)[0]!.note).toBeNull();
  });

  it('offers seats and thresholds with the Knesset values marked', () => {
    expect(fieldPicks(EMPTY_DRAFT, 'rules.seats', 0)).toEqual([
      { value: '50', note: null },
      { value: '100', note: null },
      { value: '120', note: 'knesset' },
      { value: '150', note: null },
      { value: '200', note: null },
    ]);
    expect(fieldPicks(EMPTY_DRAFT, 'rules.threshold', 0)).toEqual([
      { value: '0', note: null },
      { value: '1', note: null },
      { value: '2', note: null },
      { value: '3.25', note: 'israel' },
      { value: '4', note: null },
      { value: '5', note: null },
    ]);
  });

  it('offers turnout, growth and turnout change values', () => {
    const changes = ['-2', '-1', '-0.5', '0', '0.5', '1', '2'];
    expect(values(asked, 'turnout.0')).toEqual([
      '50',
      '60',
      '65',
      '70',
      '75',
      '80',
      '90',
    ]);
    expect(values(asked, 'growth.2')).toEqual(changes);
    expect(values(asked, 'turnoutChange.3')).toEqual(changes);
  });

  it('offers the rest to 100 first, then whole fives, on vote shares and compositions', () => {
    const composed = typed(legacyDraftOf({}), 'compose.0', ['40', '20', '15']);
    expect(fieldPicks(composed, 'compose.0', 3)).toEqual([
      { value: '25', note: 'rest' },
      ...steps(0, 100, 5).map((value) => ({ value, note: null })),
    ]);
    expect(fieldPicks(composed, 'compose.0', 0)[0]).toEqual({
      value: '40',
      note: 'rest',
    });
    const shares = typed(EMPTY_DRAFT, 'votes.shares', ['10,5']);
    expect(fieldPicks(shares, 'votes.shares', 3)[0]).toEqual({
      value: '39.5',
      note: 'rest',
    });
    const over = typed(legacyDraftOf({}), 'compose.1', ['60', '50']);
    expect(values(over, 'compose.1', 2)).toEqual(steps(0, 100, 5));
    const bad = typed(legacyDraftOf({}), 'compose.2', ['abc']);
    expect(values(bad, 'compose.2', 1)).toEqual(steps(0, 100, 5));
  });

  it('offers own names and the catalog entries of the page kind on names pages', () => {
    expect(fieldPicks(EMPTY_DRAFT, 'parties.names', 0)).toEqual([
      { value: '', note: 'own' },
      ...CATALOG_LISTS.map((list) => ({ value: list.id, note: null })),
    ]);
    expect(fieldPicks(legacyDraftOf({}), 'people.names', 6)).toEqual([
      { value: '', note: 'own' },
      ...CATALOG_GROUPS.map((group) => ({ value: group.id, note: null })),
    ]);
  });

  it('offers nothing on choices, coalitions, lessons, name texts or past the fields', () => {
    for (const page of [
      'intro',
      'parties.naming',
      'people.set',
      'growth.ask',
      'turnoutChange.ask',
      'coalitions.mode',
      'coalitions.0',
      'votes.check',
      ...LESSONS,
      'review',
    ]) {
      for (const index of [0, 1, 2]) {
        expect(fieldPicks(asked, page, index), `${page} ${index}`).toEqual([]);
      }
    }
    for (const index of [1, 3, 5, 7, 8, -1]) {
      expect(fieldPicks(asked, 'parties.names', index), `${index}`).toEqual([]);
    }
    expect(fieldPicks(asked, 'compose.0', 4)).toEqual([]);
    expect(fieldPicks(asked, 'rules.seats', 1)).toEqual([]);
  });

  it('offers only values the page accepts', () => {
    const draft = legacyDraftOf({
      'parties.count': ['5'],
      'people.set': ['own'],
      'growth.ask': ['yes'],
      'turnoutChange.ask': ['yes'],
      'compose.0': ['10', '10', '10'],
    });
    for (const page of bookPages(draft)) {
      pageParts(draft, page).forEach((part, at) => {
        for (const index of part) {
          for (const pick of fieldPicks(draft, page, index)) {
            const edited = editPage(draft, page, index, pick.value);
            expect(
              partError(edited, page, at),
              `${page} ${index} ${pick.value}`,
            ).toBeNull();
          }
        }
      });
    }
  });

  it('completes the page to exactly 100 with the rest option', () => {
    const draft = typed(legacyDraftOf({}), 'compose.0', ['12,5', '30', '7']);
    const rest = fieldPicks(draft, 'compose.0', 3)[0]!;
    expect(rest).toEqual({ value: '50.5', note: 'rest' });
    const done = editPage(draft, 'compose.0', 3, rest.value);
    expect(remainder(done, 'compose.0')).toBe('0');
    expect(pageError(done, 'compose.0')).toBeNull();
  });

  it('opens the list on the value shown in the field', () => {
    const at = (draft: BookDraft, page: PageKey, index = 0) =>
      chosenPick(draft, page, index);
    expect(at(EMPTY_DRAFT, 'parties.count')).toBe('4');
    expect(at(EMPTY_DRAFT, 'rules.seats')).toBe('120');
    expect(at(EMPTY_DRAFT, 'rules.threshold')).toBe('3.25');
    expect(
      at(typed(EMPTY_DRAFT, 'rules.threshold', ['3,250']), 'rules.threshold'),
    ).toBe('3.25');
    expect(
      at(typed(EMPTY_DRAFT, 'rules.threshold', ['3,3']), 'rules.threshold'),
    ).toBe('');
    expect(
      at(typed(EMPTY_DRAFT, 'rules.threshold', ['abc']), 'rules.threshold'),
    ).toBe('');
    expect(at(typed(EMPTY_DRAFT, 'rules.seats', ['121']), 'rules.seats')).toBe(
      '',
    );
    expect(at(EMPTY_DRAFT, 'turnout.0')).toBe('70');
    expect(at(asked, 'growth.0')).toBe('0');
    expect(at(typed(asked, 'growth.0', ['-0,50']), 'growth.0')).toBe('-0.5');
    expect(at(legacyDraftOf({}), 'compose.0', 2)).toBe('25');
    expect(at(typed(legacyDraftOf({}), 'compose.0', ['33']), 'compose.0')).toBe(
      '',
    );
    expect(at(EMPTY_DRAFT, 'votes.check', 0)).toBe('');
    expect(
      at(legacyDraftOf({ 'parties.naming': ['catalog'] }), 'parties.names', 2),
    ).toBe('yesh-atid');
    expect(at(EMPTY_DRAFT, 'parties.names', 0)).toBe('likud');
    expect(at(EMPTY_DRAFT, 'parties.names', 1)).toBe('');
    expect(at(legacyDraftOf(OWN_NAMES), 'parties.names', 0)).toBe('');
    expect(at(EMPTY_DRAFT, 'parties.naming')).toBe('');
  });
});

describe('book source', () => {
  it('stays free of language, rendering and floating point', () => {
    expect(bookSource).not.toMatch(/from '\.\.\/i18n|from 'preact/);
    expect(bookSource).not.toMatch(
      /\b(parseFloat|parseInt|toFixed|toPrecision|Math)\b|\bNumber\(/,
    );
  });
});

describe('M7-07 optional questionnaire demographics', () => {
  const grouped: Answers = {
    'parties.count': ['2'],
    'parties.naming': ['own'],
    'people.set': ['own'],
    'people.count': ['2'],
    'turnout.0': ['50'],
    'turnout.1': ['100'],
    'votes.shares': ['60', '40'],
    'compose.0': ['50', '50'],
    'rules.threshold': ['0'],
  };

  it('starts with Basic groups and derives overall turnout instead of asking', () => {
    const pages = bookPages(EMPTY_DRAFT);
    expect(shownTexts(EMPTY_DRAFT, 'people.set')).toEqual(['example']);
    expect(pages).not.toContain('overall.turnout');
    expect(pages.indexOf('turnout')).toBeLessThan(
      pages.indexOf('votes.shares'),
    );
    expect(pages).not.toContain('turnout.0');
    expect(pages).not.toContain('compose.0');
    expect(pages).toContain('votes.check');
    expect(pages).not.toContain('growth.ask');
    expect(pages).not.toContain('turnoutChange.ask');
  });

  it('asks group turnouts before shares and always asks the compositions (M7-15)', () => {
    const draft = draftOf({
      'people.set': ['own'],
      'people.count': ['2'],
    });
    const pages = bookPages(draft);
    expect(pages.indexOf('turnout')).toBeLessThan(
      pages.indexOf('votes.shares'),
    );
    expect(pages).toContain('compose');
    expect(pages).not.toContain('compose.mode');
    expect(shownTexts(draft, 'compose.0')).toEqual(['50', '50']);
    expect(pages).not.toContain('compose.0');
    expect(pages).not.toContain('overall.turnout');
  });

  it('offers no groupless set; an old "none" answer falls back to Basic (Israel)', () => {
    const old = editPage(EMPTY_DRAFT, 'people.set', 0, 'none');
    expect(groupIds(old)).toEqual(CATALOG_GROUPS.map((group) => group.id));
    expect(bookPages(old)).toContain('compose');
  });

  it('builds exact shares and turnout without inventing compositions (no groups is no longer offered)', () => {
    const { draft, answered } = walk({
      'parties.count': ['2'],
      'parties.naming': ['own'],
      'people.set': ['own'],
      'people.count': ['2'],
      'turnout.0': ['70'],
      'turnout.1': ['70'],
      'votes.shares': ['60', '40'],
      'rules.seats': ['101'],
      'rules.threshold': ['0'],
    });
    const input = buildBook(draft, answered).input;
    expect(input.groups).toHaveLength(2);
    expect(input.rules).toMatchObject({
      overallTurnout: { numerator: '7', denominator: '10' },
    });
    expect(input.parties).toMatchObject([
      { voteShare: { numerator: '3', denominator: '5' } },
      { voteShare: { numerator: '2', denominator: '5' } },
    ]);
    expect(seatsOf(input)).toEqual({ P1: 61, P2: 40 });
    const validated = validateScenario(input);
    expect(validated.ok).toBe(true);
    if (!validated.ok) throw new Error('expected a valid questionnaire');
    const restored = parseScenarioJson(serializeScenario(validated.scenario));
    expect(restored.ok).toBe(true);
    if (!restored.ok) throw new Error('expected a valid round trip');
    expect(runSeats(restored.scenario)).toEqual(runSeats(validated.scenario));
  });

  it('gives an untouched party the even split and derives turnout, ignoring a stale overall answer', () => {
    const { draft, answered } = walk({
      ...grouped,
      'overall.turnout': ['65'],
    });
    const input = buildBook(draft, answered).input;
    expect(input.rules).toMatchObject({
      overallTurnout: { numerator: '2', denominator: '3' },
    });
    const half = {
      G1: { numerator: '1', denominator: '2' },
      G2: { numerator: '1', denominator: '2' },
    };
    expect(input.parties).toMatchObject([
      { composition: half },
      { composition: half },
    ]);
    expect(seatsOf(input)).toEqual({ P1: 72, P2: 48 });
    expect(bookPages(draft)).not.toContain('overall.turnout');
  });

  it('derives 10/13 turnout from complete compositions without rounded input', () => {
    const { draft, answered } = walk({
      ...grouped,
      'compose.1': ['0', '100'],
    });
    const input = buildBook(draft, answered).input;
    expect(bookPages(draft)).not.toContain('overall.turnout');
    expect(input.rules).toMatchObject({
      overallTurnout: { numerator: '10', denominator: '13' },
    });
    expect(electorateCheck(draft, answered)).toMatchObject([
      { groupId: 'G1', share: '46.2' },
      { groupId: 'G2', share: '53.8' },
    ]);
    expect(seatsOf(input)).toEqual({ P1: 72, P2: 48 });
  });

  it('derives from positive votes only when a zero-vote party keeps its even split', () => {
    const { draft, answered } = walk({
      ...grouped,
      'votes.shares': ['100', '0'],
    });
    const input = buildBook(draft, answered).input;
    expect((input.parties as Json[])[1]!.composition).toEqual({
      G1: { numerator: '1', denominator: '2' },
      G2: { numerator: '1', denominator: '2' },
    });
    expect(input.rules).toMatchObject({
      overallTurnout: { numerator: '2', denominator: '3' },
    });
    expect(bookPages(draft)).not.toContain('overall.turnout');
    expect(seatsOf(input)).toEqual({ P1: 120, P2: 0 });
  });

  it('has no composition choice pages any more (M7-15)', () => {
    const draft = draftOf(grouped);
    expect(
      bookPages(draft).filter((page) => page.startsWith('compose')),
    ).toEqual(['compose']);
    expect(() => pageSpec(draft, 'compose.mode')).toThrow(RangeError);
    expect(() => pageSpec(draft, 'compose.known.0')).toThrow(RangeError);
  });

  it('ignores a stale hidden overall-turnout draft answer rather than forcing zero turnout', () => {
    const { draft, answered } = walk({ 'overall.turnout': ['0'] });
    const input = buildBook(draft, answered).input;
    const validation = validateScenario(input);
    expect(validation.ok).toBe(true);
    if (!validation.ok) throw new Error('expected a valid questionnaire');
    const allocation = runSeats(validation.scenario).allocation;
    expect(allocation.noAllocation).toBeNull();
    expect(
      allocation.parties.reduce((total, party) => total + party.seats, 0),
    ).toBe(120);
  });

  it.each([
    ['3.249', '96.751', 0],
    ['3.25', '96.75', 4],
    ['3.251', '96.749', 4],
  ])('keeps the exact threshold boundary at %s%%', (first, second, seats) => {
    const { draft, answered } = walk({
      'parties.count': ['2'],
      'parties.naming': ['own'],
      'votes.shares': [first, second],
      'rules.threshold': ['3.25'],
    });
    const result = seatsOf(buildBook(draft, answered).input);
    expect(result.P1).toBe(seats);
    expect(result.P1! + result.P2!).toBe(120);
  });
});
