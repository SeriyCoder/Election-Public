import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { percentToFraction } from '../../src/engine/numeric';
import { unusualGrowth } from '../../src/engine/panel';
import { runSeats } from '../../src/engine/run';
import { validateScenario } from '../../src/engine/schema';
import { LOCALES, translator } from '../../src/i18n';
import { App } from '../../src/ui/App';
import {
  bookPages,
  buildBook,
  confirmPage,
  editPage,
  EMPTY_BOOK,
  EMPTY_DRAFT,
  groupIds,
  pageSpec,
  partError,
  shownTexts,
  type BookDraft,
} from '../../src/ui/book';
import { createStore, VIEWS } from '../../src/ui/store';
import { workspaceLinked } from '../engine/helpers/workspace';

function built(draft: BookDraft = EMPTY_DRAFT) {
  const result = validateScenario(
    buildBook(draft, Object.keys(draft.values)).input,
  );
  if (!result.ok || result.scenario.inputMode !== 'parties')
    throw new Error('Invalid book');
  return result.scenario;
}

describe('M7-13 compact questionnaire', () => {
  it('defaults to Basic then custom, with no groupless set and every composition distributed (M7-15)', () => {
    expect(pageSpec(EMPTY_DRAFT, 'people.set').choices).toEqual([
      'example',
      'own',
    ]);
    expect(shownTexts(EMPTY_DRAFT, 'people.set')).toEqual(['example']);
    expect(groupIds(EMPTY_DRAFT)).toHaveLength(7);
    expect(() => pageSpec(EMPTY_DRAFT, 'compose.mode')).toThrow(RangeError);
    expect(built().parties.every((party) => party.composition !== null)).toBe(
      true,
    );
  });
  it('has one turnout and growth overview, no obsolete questions, and a relationship page', () => {
    const pages = bookPages(EMPTY_DRAFT);
    expect(pages).toContain('turnout');
    expect(pages).toContain('growth');
    expect(pages).toContain('coalitions');
    for (const key of [
      'overall.turnout',
      'growth.ask',
      'turnoutChange.ask',
      'coalitions.mode',
    ]) {
      expect(pages).not.toContain(key);
    }
    expect(
      pages.filter((page) =>
        /^(turnout|growth|turnoutChange|coalitions)\./.test(page),
      ),
    ).toEqual([]);
    expect(shownTexts(EMPTY_DRAFT, 'growth')).toEqual(Array(7).fill('0'));
  });
  it('gives every party a composition once the single compose page is confirmed', () => {
    const draft = confirmPage(EMPTY_DRAFT, 'compose');
    expect(
      built(draft).parties.every((party) => party.composition !== null),
    ).toBe(true);
  });
  it('names the later invalid group on the single overview screen (M7-15)', () => {
    let draft = editPage(EMPTY_DRAFT, 'people.set', 0, 'own');
    draft = editPage(draft, 'people.count', 0, '8');
    draft = editPage(draft, 'turnout', 7, '101');
    expect(partError(draft, 'turnout', 0)).toMatchObject({
      code: 'percent',
      index: 7,
    });
    expect(partError(draft, 'turnout', 1)).toBeNull();
    draft = editPage(draft, 'growth', 7, 'unreadable');
    expect(partError(draft, 'growth', 0)).toMatchObject({
      code: 'percent',
      index: 7,
    });
    expect(partError(draft, 'growth', 1)).toBeNull();
  });
  it('derives 60% exactly from two equally represented groups at 50% and 75%', () => {
    let draft = editPage(EMPTY_DRAFT, 'people.set', 0, 'own');
    draft = editPage(draft, 'people.count', 0, '2');
    draft = editPage(draft, 'turnout', 0, '50');
    draft = editPage(draft, 'turnout', 1, '75');
    draft = confirmPage(draft, 'compose');
    const scenario = built(draft);
    expect(scenario.rules.overallTurnout).toEqual({
      numerator: '3',
      denominator: '5',
    });
    expect(scenario.groups.every((group) => group.turnoutChange === '0')).toBe(
      true,
    );
  });
  it('uses 70% only when unknown turnout prevents derivation', () => {
    for (const draft of [EMPTY_DRAFT]) {
      // M7-19: derived from 70% and the ultra-Orthodox 85%.
      expect(built(draft).rules.overallTurnout).toEqual({
        numerator: '595',
        denominator: '829',
      });
    }
  });
  it.each(['ru', 'en', 'he'] as const)(
    'renders seven simultaneous controls and one composition page in %s',
    (language) => {
      const store = createStore({
        language,
        screen: 'book',
        book: { ...EMPTY_BOOK, page: 'turnout' },
      });
      let html = renderToString(<App store={store} />);
      expect(html.match(/data-book-rate=/g) ?? []).toHaveLength(7);
      store.bookGoTo('compose');
      html = renderToString(<App store={store} />);
      expect(html).not.toContain('data-fictional-party');
      expect(html.match(/data-compose-party/g) ?? []).toHaveLength(1);
      store.bookGoTo('growth');
      html = renderToString(<App store={store} />);
      expect(html.match(/min="-5" max="5" step="0.25"/g) ?? []).toHaveLength(7);
    },
  );
  it.each([
    ['-0.50000001', true],
    ['-0.5', false],
    ['2.5', false],
    ['2.50000001', true],
  ] as const)(
    'uses existing exact soft warning at %s percent',
    (percent, expected) => {
      expect(unusualGrowth(percentToFraction(percent)!)).toBe(expected);
    },
  );
  it('preserves imported legacy growth, turnout change and both directed ends on all tabs', () => {
    const input = workspaceLinked();
    const groups = input.groups as Record<string, unknown>[];
    groups[0]!.growthRate = '0.12';
    groups[0]!.turnoutChange = '-0.03';
    (input.coalitionRules as Record<string, unknown>).partyRefusals = [
      ['P1', 'P2'],
      ['P2', 'P1'],
    ];
    const store = createStore({ input });
    const before = store.getState().input;
    for (const view of VIEWS) {
      store.setView(view);
      expect(store.getState().input).toBe(before);
    }
    store.openBook();
    store.skipBook();
    expect(store.getState().input).toBe(before);
  });
  it.each(LOCALES)(
    'keeps exact shared navigation and localized set-up transfer in %s',
    (language) => {
      const store = createStore({ language, input: workspaceLinked() });
      const html = renderToString(<App store={store} />);
      expect(
        [...html.matchAll(/data-view="([^"]+)"/g)].map((match) => match[1]),
      ).toEqual(['coalitions', 'future', 'inputs']);
      expect(html).not.toContain('presets__select');
      expect(html).not.toContain('data-action="load-preset"');
      expect(html).toMatch(
        /class="button button--primary" data-action="open-book"/,
      );
      expect(translator(language)('transfer.export')).not.toBe('Export JSON');
    },
  );
  it('preserves exact odd seat sums and locale/roundtrip determinism for generated questionnaire rules', () => {
    for (let seats = 1; seats < 40; seats += 2) {
      const draft = editPage(EMPTY_DRAFT, 'rules.seats', 0, String(seats));
      const input = buildBook(draft, Object.keys(draft.values)).input;
      const scenario = built(draft);
      const expected = runSeats(scenario);
      expect(
        expected.allocation.parties.reduce(
          (total, party) => total + party.seats,
          0,
        ),
      ).toBe(seats);
      expect(
        expected.allocation.parties.every(
          (party) => Number.isInteger(party.seats) && party.seats >= 0,
        ),
      ).toBe(true);
      for (const language of LOCALES) {
        const store = createStore({
          input: JSON.parse(JSON.stringify(input)) as unknown,
          language,
        });
        expect(store.getDerived().result).toEqual(expected);
      }
      expect(runSeats(scenario)).toEqual(expected);
    }
  });
});
