import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { LOCALES, translator, type Locale } from '../../src/i18n';
import { formatInteger } from '../../src/i18n/format';
import { App } from '../../src/ui/App';
import {
  CATALOG_LISTS,
  catalogNameKey,
  EXAMPLE_LISTS,
} from '../../src/ui/catalog';
import { presetInput, PRESETS, type PresetId } from '../../src/ui/presets';
import { createStore } from '../../src/ui/store';
import { HISTORICAL_2022_FIXTURE } from '../engine/helpers/historical2022';
import { partyModeInput } from '../engine/helpers/scenarios';

function render(locale: Locale = 'ru', baseline = false): string {
  const store = createStore({
    screen: 'app',
    view: 'compare',
    language: locale,
  });
  if (baseline) expect(store.saveBaseline()).toBe(true);
  return renderToString(<App store={store} />);
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

describe('historical 2022 preset and localized reference', () => {
  it('adds a separate preset without replacing existing teaching examples', () => {
    expect(PRESETS).toContain('historical2022');
    expect(PRESETS).toContain('baseline');
    expect(PRESETS).toContain('israelExample');
    const historical = presetInput('historical2022' as PresetId);
    expect(historical.inputMode).toBe('parties');
    expect(historical.parties as unknown[]).toHaveLength(40);
    expect(presetInput('israelExample').inputMode).toBe('groups');
    expect(EXAMPLE_LISTS).toHaveLength(6);
    expect(CATALOG_LISTS).toHaveLength(10);
  });

  describe('historical match state', () => {
    it('refuses duplicate assignments and keeps the accepted match', () => {
      const input = partyModeInput([
        ['1', '2'],
        ['1', '2'],
      ]);
      const store = createStore({ input });
      expect(store.setHistoricalMatch('P1', 'likud')).toBe(true);
      expect(store.setHistoricalMatch('P2', 'likud')).toBe(false);
      expect(store.getState().historicalMatches).toEqual([
        { currentId: 'P1', historicalId: 'likud' },
      ]);
      expect(store.getState().historicalMatchError).toBe('duplicate-reference');
    });

    it('suppresses and restores an automatic match without reassigning a reference', () => {
      const store = createStore({ input: presetInput('historical2022') });
      expect(store.setHistoricalMatch('likud', null)).toBe(true);
      expect(store.setHistoricalMatch('yesh-atid', 'likud')).toBe(true);
      expect(store.clearHistoricalMatch('likud')).toBe(false);
      expect(store.getState().historicalMatchError).toBe('duplicate-reference');
      expect(store.clearHistoricalMatch('yesh-atid')).toBe(true);
      expect(store.clearHistoricalMatch('likud')).toBe(true);
      expect(store.getState().historicalMatches).toEqual([]);
    });

    it('retains matches during an invalid draft and clears them on replacement', () => {
      const input = partyModeInput([
        ['1', '2'],
        ['1', '2'],
      ]);
      const store = createStore({ input });
      expect(store.setHistoricalMatch('P1', 'likud')).toBe(true);
      store.updateInput((current) => ({ ...(current as object), rules: null }));
      expect(store.getDerived().validation.ok).toBe(false);
      expect(store.getState().historicalMatches).toEqual([
        { currentId: 'P1', historicalId: 'likud' },
      ]);
      expect(store.clearHistoricalMatch('P1')).toBe(false);
      expect(store.getState().historicalMatchError).toBe('invalid-current');
      store.setInput(input);
      expect(store.getState().historicalMatches).toEqual([]);
      expect(store.getState().historicalMatchError).toBeNull();
    });
  });

  it.each(LOCALES)(
    'names all 40 lists and the historical preset in %s without filling scenario names',
    (locale) => {
      const t = translator(locale);
      expect(t('preset.historical2022')).not.toBe('preset.historical2022');
      const input = presetInput('historical2022' as PresetId);
      const parties = input.parties as { id: string; name: string }[];
      for (const [id] of HISTORICAL_2022_FIXTURE) {
        const key = catalogNameKey('party', id);
        expect(key, id).not.toBeNull();
        if (key === null) throw new Error(`Missing catalog identity ${id}`);
        expect(t(key), key).not.toBe(key);
        expect(t(key).trim(), key).not.toBe('');
        expect(parties.find((party) => party.id === id)?.name, id).toBe('');
      }
    },
  );

  it('identifies the Religious Zionism and Otzma Yehudit joint list in 2022', () => {
    expect(translator('ru')('catalog.party.religious-zionism')).toContain(
      'Оцма',
    );
    expect(translator('en')('catalog.party.religious-zionism')).toContain(
      'Otzma',
    );
    expect(translator('he')('catalog.party.religious-zionism')).toContain(
      'עוצמה',
    );
  });

  it.each(LOCALES)(
    'renders the historical reference without a saved baseline in %s',
    (locale) => {
      const html = render(locale);
      expect(html).toContain('data-historical-reference');
      expect(html).toContain('data-historical-source');
      expect(html).toContain('data-historical-field="eligible"');
      expect(html).toContain('data-historical-field="cast"');
      expect(html).toContain('data-historical-field="valid"');
      expect(html).toContain('data-historical-field="invalid"');
      expect(html).toContain('data-historical-field="turnout"');
      for (const value of [6788804, 4794593, 4764742, 29851]) {
        expect(html).toContain(escapeText(formatInteger(locale, value)));
      }
      expect(html).toContain('data-historical-method="official"');
      expect(html).toContain('data-historical-method="hamilton"');
      expect(html).toContain('data-historical-model-validity');
      expect(html).toContain('data-historical-current-select');
      expect(html).toContain('data-historical-target-select');
      for (const [id] of HISTORICAL_2022_FIXTURE) {
        expect(html, id).toContain(`data-historical-row="${id}"`);
      }
    },
  );

  it('keeps the user baseline controls and the historical reference separate', () => {
    const html = render('ru', true);
    expect(html).toContain('data-historical-reference');
    expect(html).toContain('data-baseline-name');
    expect(html).toContain('data-action="reset-baseline"');
    expect(html).toContain('data-action="clear-baseline"');
    expect(html).toContain('data-historical-current-select');
  });

  it('keeps historical facts visible while a current draft is invalid', () => {
    const store = createStore({ screen: 'app', view: 'compare' });
    store.updateInput((input) => {
      if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw new Error('Expected an editable input');
      }
      return { ...input, rules: { threshold: 'invalid' } };
    });
    expect(store.getDerived().validation.ok).toBe(false);
    const html = renderToString(<App store={store} />);
    expect(html).toContain('data-historical-reference');
    expect(html).toContain('data-historical-current-unavailable');
  });
});
