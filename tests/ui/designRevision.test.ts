import { describe, expect, it } from 'vitest';
import {
  bookScreens,
  EMPTY_BOOK,
  EMPTY_DRAFT,
  groupIds,
  screenOf,
  shownTexts,
  smallShares,
} from '../../src/ui/book';
import { exampleAbout } from '../../src/ui/startExamples';
import { createStore } from '../../src/ui/store';
import { replaceCustomTile } from '../../src/ui/tileSets';

describe('M7-19 design revision', () => {
  it('groups the questionnaire pages into the agreed screens', () => {
    expect(bookScreens(EMPTY_DRAFT)).toEqual([
      ['intro'],
      ['parties.count', 'parties.naming'],
      ['parties.names'],
      ['people.set', 'people.about', 'people.mix'],
      ['turnout', 'votes.shares', 'compose'],
      ['votes.check', 'growth'],
      ['coalitions', 'rules.threshold', 'rules.seats'],
      ['review'],
    ]);
    expect(screenOf(EMPTY_DRAFT, 'votes.shares')).toEqual([
      'turnout',
      'votes.shares',
      'compose',
    ]);
  });

  it('turns the store by screen, forward and back', () => {
    const store = createStore({
      screen: 'book',
      book: { ...EMPTY_BOOK, page: 'parties.count' },
    });
    expect(store.bookNext()).toBe(true);
    expect(store.getState().book.page).toBe('parties.names');
    expect(store.getState().book.answered).toEqual(
      expect.arrayContaining(['parties.count', 'parties.naming']),
    );
    store.bookBack();
    expect(store.getState().book.page).toBe('parties.count');
    store.bookGoTo('compose');
    expect(store.getState().book.page).toBe('turnout');
  });

  it('suggests 85% turnout for ultra-Orthodox and 70% for Arab voters', () => {
    const ids = groupIds(EMPTY_DRAFT);
    const turnout = shownTexts(EMPTY_DRAFT, 'turnout');
    expect(turnout[ids.indexOf('haredi')]).toBe('85');
    expect(turnout[ids.indexOf('arab')]).toBe('70');
    expect(turnout[ids.indexOf('secular')]).toBe('70');
  });

  it('marks shares at or below 7% exactly', () => {
    expect(smallShares(['30', '7', '6.99', '7.01', '7,00', 'x'])).toEqual([
      1, 2, 4,
    ]);
  });

  it('describes the eight-party example names only while unchanged', () => {
    expect(exampleAbout('en', 0, 'Likud without Bibi')).toBe(
      'catalog.party.likud.about',
    );
    expect(exampleAbout('en', 4, 'Yisrael Beiteinu without Lieberman')).toBe(
      'book.example.about.beiteinu',
    );
    expect(exampleAbout('en', 7, 'Arab parties')).toBe(
      'book.example.about.arabs',
    );
    expect(exampleAbout('en', 0, 'Likud')).toBeNull();
    expect(exampleAbout('en', 1, 'Likud without Bibi')).toBeNull();
  });

  it('edits a custom tile in place, keeping its key', () => {
    const custom = [
      { key: 'custom:1', partyIds: ['a', 'b'], label: 'A' },
      { key: 'custom:2', partyIds: ['c'], label: 'C' },
    ];
    expect(replaceCustomTile(custom, 'custom:1', ['a', 'c'], 'AC')).toEqual([
      { key: 'custom:1', partyIds: ['a', 'c'], label: 'AC' },
      { key: 'custom:2', partyIds: ['c'], label: 'C' },
    ]);
    expect(replaceCustomTile(custom, 'custom:9', ['a'], 'X')).toBe(custom);
  });
});
