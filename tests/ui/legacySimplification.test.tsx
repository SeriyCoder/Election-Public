import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/App';
import type { CoalitionRunner } from '../../src/ui/coalitionRunner';
import { editorPages } from '../../src/ui/editorPages';
import { isDraft, setGroupFraction } from '../../src/engine/edit';
import { createStore, type Store } from '../../src/ui/store';
import {
  partyModeInput,
  section8Input,
  type Json,
} from '../engine/helpers/scenarios';

function legacyStore() {
  return createStore({ language: 'en', input: section8Input() });
}

interface ConversionActions {
  requestLegacyConversion(): boolean;
  confirmLegacyConversion(): boolean;
  cancelLegacyConversion(): void;
  getLegacyOriginal(): unknown;
}

function supportsConversion(store: Store): store is Store & ConversionActions {
  return (
    'requestLegacyConversion' in store &&
    typeof store.requestLegacyConversion === 'function' &&
    'confirmLegacyConversion' in store &&
    typeof store.confirmLegacyConversion === 'function' &&
    'cancelLegacyConversion' in store &&
    typeof store.cancelLegacyConversion === 'function' &&
    'getLegacyOriginal' in store &&
    typeof store.getLegacyOriginal === 'function'
  );
}

function conversionActions(store: Store): Store & ConversionActions {
  if (!supportsConversion(store)) {
    throw new Error('Legacy conversion store actions are not implemented');
  }
  return store;
}

describe('M7-09 simplified legacy interface', () => {
  it('omits obsolete editor pages, fields and block rule controls', () => {
    const store = legacyStore();
    const draft = store.getState().input;
    if (!isDraft(draft)) throw new Error('Expected a draft');
    expect(editorPages(draft).map((page) => page.key)).not.toContain('blocks');
    const html = renderToString(<App store={store} />);
    expect(html).not.toContain('data-editor="blocks"');
    expect(html).not.toContain('data-fraction="participationFactor"');
    expect(html).not.toContain('data-segmented="mode"');
    expect(html).not.toContain('data-field="blockId"');
    expect(html).not.toContain('data-pair-list="incompatibleBlockPairs"');
    expect(html).not.toContain('data-pair-list="compatiblePartyOverrides"');
    expect(html).toContain('data-legacy-notice');
  });

  it('keeps party results and hides the block table and chart detail field', () => {
    const store = legacyStore();
    const html = renderToString(<App store={store} />);
    expect(html).toContain('data-table="parties"');
    expect(html).not.toContain('data-table="blocks"');
    expect(html).not.toContain('data-cell="block"');
  });

  it('offers only party targets in electorate composition', () => {
    const store = legacyStore();
    store.setView('composition');
    const html = renderToString(<App store={store} />);
    expect(html).toContain('value="party:P1"');
    expect(html).not.toContain('value="block:B1"');
  });

  it('offers an explicit conversion action for legacy inputs', () => {
    const store = legacyStore();
    const before = JSON.stringify(store.getState().input);
    const html = renderToString(<App store={store} />);
    expect(html).toContain('data-action="legacy-prepare"');
    expect(JSON.stringify(store.getState().input)).toBe(before);
  });

  it('prevents removing the last restricted destination', () => {
    const html = renderToString(<App store={legacyStore()} />);
    const group = html.split('data-id="G1"')[1]?.split('data-id="G2"')[0];
    expect(group).toBeDefined();
    expect(group).toMatch(/<input[^>]*data-allowed="P1"[^>]*disabled[^>]*>/);
  });

  it('lets an invalid empty restricted group choose a replacement destination', () => {
    const input = section8Input();
    const first = (input.groups as Json[])[0]!;
    first.allowedPartyIds = [];
    first.voteWeights = {};
    const html = renderToString(
      <App store={createStore({ language: 'en', input })} />,
    );
    const group = html.split('data-id="G1"')[1]?.split('data-id="G2"')[0];
    const checkbox = group?.match(/<input[^>]*data-allowed="P1"[^>]*>/)?.[0];
    expect(checkbox).toBeDefined();
    expect(checkbox).not.toContain('disabled');
  });

  it('explains unavailable party rules that conflict with a hidden override', () => {
    const input = section8Input();
    const rules = input.coalitionRules as Json;
    rules.incompatiblePartyPairs = [];
    rules.compatiblePartyOverrides = [['P1', 'P2']];
    const store = createStore({ language: 'en', input });
    store.setEditorPage('coalition-rules');
    const html = renderToString(<App store={store} />);
    const list = html
      .split('data-pair-list="incompatiblePartyPairs"')[1]
      ?.split('data-pair-list="partyRefusals"')[0];
    expect(list).toMatch(/<button[^>]*data-action="add-pair"[^>]*disabled/);
    expect(list).toContain('data-pair-unavailable');
  });

  it('explains when conversion can allocate seats after an original no-allocation result', () => {
    const input = partyModeInput(
      [
        ['1', '2'],
        ['1', '2'],
      ],
      { validBallotRate: '0', threshold: '0' },
    );
    const store = conversionActions(createStore({ language: 'en', input }));
    expect(store.requestLegacyConversion()).toBe(true);
    const html = renderToString(<App store={store} />);
    expect(html.includes('data-legacy-no-allocation="no-valid-votes"')).toBe(
      true,
    );
    expect(
      html.includes(
        'The original can have no allocated seats while the converted version does.',
      ),
    ).toBe(true);
  });

  it.each([
    [
      'ru',
      'Поиск коалиций для преобразованного сценария недоступен без фонового процесса.',
    ],
    [
      'en',
      'The coalition search for the converted scenario is unavailable without a worker.',
    ],
    ['he', 'חיפוש הקואליציות בתרחיש המומר אינו זמין ללא תהליך רקע.'],
  ] as const)(
    'explains the unavailable candidate search in %s',
    (locale, message) => {
      const store = conversionActions(
        createStore({ language: locale, input: section8Input() }),
      );
      expect(store.requestLegacyConversion()).toBe(true);
      const runner: CoalitionRunner = {
        getRun: () => ({
          state: 'failed',
          reason: 'worker-unavailable',
          message: 'A worker is required for the preview coalition search.',
        }),
        subscribe: () => () => undefined,
        update: () => undefined,
        cancel: () => undefined,
        rerun: () => undefined,
        dispose: () => undefined,
      };
      const html = renderToString(<App store={store} previewRunner={runner} />);
      expect(html.includes(message)).toBe(true);
    },
  );

  it.each([
    ['preset', (store: Store) => store.loadPreset('split')],
    [
      'import',
      (store: Store) =>
        store.importScenario(JSON.stringify(section8Input('0.2'))),
    ],
    ['baseline', (store: Store) => store.resetToBaseline()],
  ] as const)(
    'clears a pending preview when replacing the scenario with %s',
    (_name, replace) => {
      const store = conversionActions(legacyStore());
      expect(store.saveBaseline()).toBe(true);
      expect(store.requestLegacyConversion()).toBe(true);
      replace(store);
      expect(store.getState().legacyPreview).toBeNull();
      expect(store.getState().legacyFailure).toBeNull();
      expect(store.getLegacyOriginal()).toBeNull();
    },
  );

  it('does not apply a preview after the underlying input changes', () => {
    const store = conversionActions(legacyStore());
    expect(store.requestLegacyConversion()).toBe(true);
    store.updateInput((input) => {
      if (!isDraft(input)) throw new Error('Expected a draft');
      return setGroupFraction(input, 'G1', 'turnout', '80');
    });
    const changed = JSON.stringify(store.getState().input);
    expect(store.confirmLegacyConversion()).toBe(false);
    expect(JSON.stringify(store.getState().input)).toBe(changed);
    expect(store.getLegacyOriginal()).toBeNull();
  });

  it('does not apply a preview after the selected future year changes', () => {
    const store = conversionActions(legacyStore());
    const before = JSON.stringify(store.getState().input);
    expect(store.requestLegacyConversion()).toBe(true);
    expect(store.setFutureYear(7)).toBe(true);
    expect(store.confirmLegacyConversion()).toBe(false);
    expect(JSON.stringify(store.getState().input)).toBe(before);
  });

  it('retains an independent original without replacing the saved baseline', () => {
    const store = conversionActions(legacyStore());
    const before = JSON.stringify(store.getState().input);
    expect(store.saveBaseline()).toBe(true);
    const baseline = JSON.stringify(store.getState().baseline);
    expect(store.requestLegacyConversion()).toBe(true);
    expect(store.confirmLegacyConversion()).toBe(true);
    expect(JSON.stringify(store.getLegacyOriginal())).toBe(before);
    expect(JSON.stringify(store.getState().baseline)).toBe(baseline);
    expect(store.getState().input).not.toBe(store.getLegacyOriginal());
  });

  it('cancels the preview without storing an original or changing input', () => {
    const store = conversionActions(legacyStore());
    const before = JSON.stringify(store.getState().input);
    expect(store.requestLegacyConversion()).toBe(true);
    store.cancelLegacyConversion();
    expect(store.confirmLegacyConversion()).toBe(false);
    expect(store.getLegacyOriginal()).toBeNull();
    expect(JSON.stringify(store.getState().input)).toBe(before);
  });
});
