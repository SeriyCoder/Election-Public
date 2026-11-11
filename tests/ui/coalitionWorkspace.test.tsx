import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { LOCALES, type Locale } from '../../src/i18n';
import { App } from '../../src/ui/App';
import { createStore, VIEWS } from '../../src/ui/store';
import { section8Input, type Json } from '../engine/helpers/scenarios';
import { workspaceLinked, workspaceParties } from '../engine/helpers/workspace';

function render(input: unknown, locale: Locale = 'en'): string {
  return renderToString(
    <App
      store={createStore({
        input,
        screen: 'app',
        view: 'coalitions',
        language: locale,
      })}
    />,
  );
}

describe('coalition workspace', () => {
  it('removes duplicate Seats and Compare navigation entries', () => {
    expect(VIEWS).not.toContain('seats');
    expect(VIEWS).not.toContain('compare');
    expect(VIEWS).toEqual(['coalitions', 'future', 'inputs']);
  });

  it.each(LOCALES)(
    'renders named party controls and coalition results in %s',
    (locale) => {
      const html = render(workspaceParties(), locale);
      for (const marker of [
        'data-coalition-workspace',
        'data-workspace-mode="parties"',
        'data-party-control="P1"',
        'data-party-share-input="P1"',
        'data-party-share-slider="P1"',
        'data-lock="party:P1"',
        'data-party-bar="P1"',
        'data-party-seats="P1"',
        'data-party-baseline-change="P1"',
        'data-party-historical-change="P1"',
        'data-overall-turnout-input',
        'data-overall-turnout-slider',
        'data-coalitions=',
        'data-chooser="coalition"',
      ]) {
        expect(html.includes(marker), marker).toBe(true);
      }
    },
  );

  it('retains the complete comparison and historical reference on the workspace', () => {
    const store = createStore({
      input: workspaceParties(),
      screen: 'app',
      view: 'coalitions',
    });
    expect(store.saveBaseline()).toBe(true);
    const html = renderToString(<App store={store} />);
    for (const marker of [
      'data-workspace-compare',
      'data-workspace-history',
      'data-baseline-name',
      'data-action="save-baseline"',
      'data-action="reset-baseline"',
      'data-action="clear-baseline"',
      'data-historical-reference',
      'data-historical-field="eligible"',
      'data-historical-current-select',
    ]) {
      expect(html.includes(marker), marker).toBe(true);
    }
  });

  it('keeps historical facts available when the current draft is invalid', () => {
    const invalid = { ...workspaceParties(), rules: null };
    const html = render(invalid);
    expect(html.includes('data-result-state="invalid"')).toBe(true);
    expect(html.includes('data-historical-reference')).toBe(true);
    expect(html.includes('data-historical-current-unavailable')).toBe(true);
  });

  it('keeps legacy group-mode shares read-only and exposes group turnout', () => {
    const html = render(section8Input());
    for (const marker of [
      'data-workspace-mode="groups"',
      'data-workspace-legacy',
      'data-party-control="P1"',
      'data-workspace-group="G1"',
      'data-fraction="turnout"',
    ]) {
      expect(html.includes(marker), marker).toBe(true);
    }
    expect(html.includes('data-party-share-input="P1"')).toBe(false);
    expect(html.includes('data-overall-turnout-input')).toBe(false);
  });

  it('shows the reason and disables group turnout when composition is unknown', () => {
    const html = render(workspaceLinked(false));
    expect(html.includes('data-coalition-workspace')).toBe(true);
    expect(
      html.includes('data-linked-turnout="unknown-party-composition"'),
    ).toBe(true);
    expect(html.includes('data-party-share-input="P1"')).toBe(true);
  });

  it('shows no allocation as unavailable rather than a false zero', () => {
    const input = workspaceParties();
    input.rules = {
      ...(input.rules as Json),
      overallTurnout: { numerator: '0', denominator: '1' },
    };
    const html = render(input);
    expect(html.includes('data-result-state="no-allocation"')).toBe(true);
    expect(html.includes('data-party-seat-state="unavailable"')).toBe(true);
  });

  it('preserves party locks across edits and removes them on deletion or replacement', () => {
    const store = createStore({ input: workspaceParties() });
    store.toggleLock('party:P1');
    store.toggleLock('party:P2');
    store.updateInput((input) => ({ ...(input as Json), notes: 'changed' }));
    expect(store.getState().locks).toEqual(['party:P1', 'party:P2']);
    store.updateInput((input) => {
      const draft = input as Json;
      return {
        ...draft,
        parties: (draft.parties as Json[]).filter((party) => party.id !== 'P2'),
      };
    });
    expect(store.getState().locks).toEqual(['party:P1']);
    store.setInput(workspaceParties());
    expect(store.getState().locks).toEqual([]);
  });
});
