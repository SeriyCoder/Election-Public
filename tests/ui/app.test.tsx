import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import {
  direction,
  LOCALE_NAMES,
  LOCALES,
  translator,
  type Locale,
} from '../../src/i18n';
import { ru } from '../../src/i18n/ru';
import { App } from '../../src/ui/App';
import { baselineInput, presetInput, PRESETS } from '../../src/ui/presets';
import {
  createStore as createStoreWithLanguage,
  VIEWS,
  type AppState,
  type StoreOptions,
  type ViewId,
} from '../../src/ui/store';

type Json = Record<string, unknown>;

const t = translator('ru');

function createStore(
  initial: Partial<AppState> = {},
  options: StoreOptions = {},
) {
  return createStoreWithLanguage({ language: 'ru', ...initial }, options);
}

function render(store = createStore()): string {
  return renderToString(<App store={store} />);
}

function rootTag(html: string): string {
  return /^<[^>]+>/.exec(html)?.[0] ?? '';
}

function attribute(html: string, name: string): string[] {
  return [...html.matchAll(new RegExp(`${name}="([^"]*)"`, 'g'))].map(
    (match) => match[1] ?? '',
  );
}

function currentNavItems(html: string): string[] {
  return [...html.matchAll(/<button\b[^>]*aria-current="page"[^>]*>/g)].map(
    (match) => match[0],
  );
}

/** The scenario title in the toolbar heading, as rendered. */
function toolbarTitle(html: string): string | null {
  return (
    /<h1 class="toolbar__name"><bdi>([\s\S]*?)<\/bdi><\/h1>/.exec(html)?.[1] ??
    null
  );
}

/** The saved baseline's name in the comparison, as rendered. */
function baselineTitle(html: string): string | null {
  return (
    /data-baseline-name[^>]*>[\s\S]*?<bdi>([\s\S]*?)<\/bdi>/.exec(html)?.[1] ??
    null
  );
}

/** Drops the language switcher, whose buttons keep their own endonyms. */
function withoutSwitcher(html: string): string {
  return html.replace(/<div class="languages"[\s\S]*?<\/div>/, '');
}

/** From the results region to the end, leaving the editor out. */
function resultsRegion(html: string): string {
  const start = html.indexOf('data-region="results"');
  if (start < 0) {
    throw new Error('missing results region');
  }
  return html.slice(start);
}

function coalitionResults(html: string): string {
  const start = html.indexOf('data-panel="coalitions"');
  if (start < 0) {
    throw new Error('missing coalition results');
  }
  return html.slice(start);
}

function blankNames(input: Json): Json {
  const blank = (list: unknown): Json[] =>
    (list as Json[]).map((entity) => ({ ...entity, name: '' }));
  return {
    ...input,
    name: '',
    groups: blank(input.groups),
    parties: blank(input.parties),
    blocks: blank(input.blocks),
  };
}

/** Mirrors preact-render-to-string, which escapes only &, < and ". */
function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

describe('Russian strings', () => {
  it('defines a non-empty string for every key the shell uses', () => {
    const keys = [
      'app.title',
      'app.untitled',
      'region.editor',
      'region.results',
      'nav.label',
      'language.label',
      'status.allocated',
      'status.invalid',
      'status.noAllocation.no-valid-votes',
      'status.noAllocation.no-party-qualifies',
      ...VIEWS.map((view) => `view.${view}`),
    ];
    const table = ru as Record<string, string>;
    for (const key of keys) {
      expect(table[key], key).toMatch(/\S/);
    }
  });

  it('looks up a key and substitutes named parameters', () => {
    const allocated = t('status.allocated', { seats: 120 });
    expect(allocated).toContain('120');
    expect(allocated).not.toContain('{seats}');
    expect(t('view.seats')).toBe((ru as Record<string, string>)['view.seats']);
  });

  it('returns the key itself for an unknown key', () => {
    expect(t('missing.key.example')).toBe('missing.key.example');
  });
});

describe('App shell', () => {
  it('renders the toolbar, editor region and results region', () => {
    const html = render();
    expect(attribute(html, 'data-region')).toEqual(
      expect.arrayContaining(['toolbar', 'editor', 'results']),
    );
    expect(html).toContain(escapeText(t('preset.baseline')));
  });

  it('renders one navigation entry per view with its label', () => {
    const html = render();
    expect(attribute(html, 'data-view')).toEqual([...VIEWS]);
    for (const view of VIEWS) {
      expect(html).toContain(escapeText(t(`view.${view}`)));
    }
  });

  it.each(VIEWS)('marks %s as the active view', (view: ViewId) => {
    const store = createStore({ view });
    const html = render(store);
    expect(attribute(html, 'data-active-view')).toEqual([view]);
    const current = currentNavItems(html);
    expect(current).toHaveLength(1);
    expect(current[0]).toContain(`data-view="${view}"`);
  });

  it.each([
    ['inputs', 'seats'],
    ['seats', 'seats'],
    ['coalitions', 'coalitions'],
    ['compare', 'compare'],
    ['composition', 'composition'],
    ['future', 'future'],
  ] as const)('on %s the results region shows the %s panel', (view, panel) => {
    const html = render(createStore({ view }));
    expect(attribute(html, 'data-panel')).toEqual([panel]);
  });

  it('renders the compare view instead of a placeholder', () => {
    const html = render(createStore({ view: 'compare' }));
    expect(attribute(html, 'data-compare')).toEqual(['empty']);
    expect(html).not.toContain('class="placeholder"');
  });

  it('drops the coalitions placeholder from every locale', () => {
    for (const locale of LOCALES) {
      expect(translator(locale)('placeholder.coalitions')).toBe(
        'placeholder.coalitions',
      );
    }
  });

  it('reports allocated seats for a valid scenario', () => {
    const html = render();
    expect(attribute(html, 'data-result-state')).toEqual(['ready']);
    expect(html).toContain(escapeText(t('status.allocated', { seats: 120 })));
  });

  it('reports the no-allocation reason', () => {
    const input = baselineInput();
    const groups = (input.groups as Json[]).map((group) => ({
      ...group,
      turnout: '0',
    }));
    const html = render(createStore({ input: { ...input, groups } }));
    expect(attribute(html, 'data-result-state')).toEqual(['no-allocation']);
    expect(html).toContain(escapeText(t('status.noAllocation.no-valid-votes')));
  });

  it('reports the issue count and withholds results for invalid input', () => {
    const input = baselineInput();
    const store = createStore({
      input: { ...input, rules: { ...(input.rules as Json), seatCount: -1 } },
    });
    const validation = store.getDerived().validation;
    const count = validation.ok ? 0 : validation.issues.length;
    expect(count).toBeGreaterThan(0);
    const html = render(store);
    expect(attribute(html, 'data-result-state')).toEqual(['invalid']);
    expect(html).toContain(escapeText(t('status.invalid', { count })));
    expect(html).not.toContain(
      escapeText(t('status.allocated', { seats: 120 })),
    );
  });

  it('shows a fallback title when the input has no usable name', () => {
    const html = render(createStore({ input: 'not a scenario' }));
    expect(html).toContain(escapeText(t('app.untitled')));
  });

  it('escapes markup in the scenario name', () => {
    const input = { ...baselineInput(), name: '<script>alert(1)</script>' };
    const html = render(createStore({ input }));
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script>');
  });

  it('re-renders from the current store state', () => {
    const store = createStore();
    store.setView('compare');
    expect(attribute(render(store), 'data-active-view')).toEqual(['compare']);
  });
});

describe('languages', () => {
  it.each(LOCALES)(
    '%s sets lang and dir on the shell root',
    (locale: Locale) => {
      const root = rootTag(render(createStore({ language: locale })));
      expect(root).toContain(`lang="${locale}"`);
      expect(root).toContain(`dir="${direction(locale)}"`);
    },
  );

  it.each(LOCALES)('%s renders its own strings', (locale: Locale) => {
    const tr = translator(locale);
    const html = render(createStore({ language: locale }));
    for (const view of VIEWS) {
      expect(html).toContain(escapeText(tr(`view.${view}`)));
    }
    expect(html).toContain(escapeText(tr('status.allocated', { seats: 120 })));
  });

  it.each(LOCALES)('%s keeps user-entered names untranslated', (locale) => {
    const input = baselineInput();
    const custom: Json = {
      ...input,
      name: 'Мой сценарий',
      parties: (input.parties as Json[]).map((party) =>
        party.id === 'P1' ? { ...party, name: 'Likud' } : party,
      ),
      groups: (input.groups as Json[]).map((group) =>
        group.id === 'G2' ? { ...group, name: 'קבוצה שתיים' } : group,
      ),
    };
    const store = createStore({ language: locale, input: custom });
    const html = render(store);
    expect(toolbarTitle(html)).toBe(escapeText('Мой сценарий'));
    expect(html).toContain('value="Likud"');
    expect(html).toContain(`value="${escapeText('קבוצה שתיים')}"`);
    store.setView('seats');
    expect(render(store)).toContain('>Likud<');
  });

  it.each(LOCALES)(
    'offers every language and marks %s as pressed',
    (locale: Locale) => {
      const html = render(createStore({ language: locale }));
      expect(attribute(html, 'data-locale')).toEqual([...LOCALES]);
      const pressed = [
        ...html.matchAll(/<button\b[^>]*aria-pressed="true"[^>]*>/g),
      ].map((match) => match[0]);
      expect(pressed).toHaveLength(1);
      expect(pressed[0]).toContain(`data-locale="${locale}"`);
      for (const option of LOCALES) {
        expect(html).toContain(LOCALE_NAMES[option]);
      }
    },
  );

  it('labels each language option in its own language', () => {
    const html = render();
    for (const option of LOCALES) {
      const button = new RegExp(
        `<button\\b[^>]*data-locale="${option}"[^>]*>`,
      ).exec(html)?.[0];
      expect(button).toContain(`lang="${option}"`);
    }
  });

  it('labels the switcher group in the current language', () => {
    const html = render(createStore({ language: 'en' }));
    expect(html).toContain(escapeText(translator('en')('language.label')));
  });
});

describe('one interface language at a time', () => {
  const FOREIGN: Readonly<Record<Locale, RegExp>> = {
    ru: /[\u0590-\u05ff]/,
    en: /[\u0400-\u04ff\u0590-\u05ff]/,
    he: /[\u0400-\u04ff]/,
  };
  const KINDS = ['group', 'party'] as const;
  const NUMBERS = ['1', '2', '3', '4'];

  function viewHtml(locale: Locale, view: ViewId, input?: Json): string {
    const store = createStore(
      input === undefined
        ? { language: locale, view }
        : { language: locale, view, input },
    );
    if (view === 'compare') {
      expect(store.saveBaseline()).toBe(true);
    }
    return withoutSwitcher(render(store));
  }

  /** The first foreign-script text with some context, or null. */
  function foreignText(locale: Locale, html: string): string | null {
    const found = FOREIGN[locale].exec(html);
    if (found === null) {
      return null;
    }
    return html.slice(Math.max(0, found.index - 60), found.index + 30);
  }

  it.each(LOCALES)(
    '%s shows no text of another language in any view',
    (locale) => {
      for (const view of VIEWS) {
        expect(foreignText(locale, viewHtml(locale, view)), view).toBeNull();
      }
    },
  );

  it.each(LOCALES)(
    '%s titles the startup scenario in its own language',
    (locale) => {
      const title = escapeText(translator(locale)('preset.baseline'));
      for (const view of VIEWS) {
        expect(toolbarTitle(viewHtml(locale, view)), view).toBe(title);
      }
      expect(baselineTitle(viewHtml(locale, 'compare'))).toBe(title);
    },
  );

  it.each(LOCALES)(
    '%s labels unnamed entities in its own language in every view',
    (locale) => {
      const tr = translator(locale);
      const input = blankNames(baselineInput());
      const label = (kind: string, n: string) =>
        escapeText(tr(`entity.${kind}`, { n }));
      const inputs = viewHtml(locale, 'inputs', input);
      for (const kind of KINDS) {
        for (const n of NUMBERS) {
          expect(inputs, `${kind} ${n}`).toContain(label(kind, n));
        }
      }
      for (const view of [
        'seats',
        'coalitions',
        'compare',
        'composition',
        'future',
      ] as const) {
        // M7-17: the coalition results live in the workspace "more" area.
        const html =
          view === 'coalitions'
            ? coalitionResults(viewHtml(locale, view, input))
            : resultsRegion(viewHtml(locale, view, input));
        for (const n of NUMBERS) {
          expect(html, `${view} party ${n}`).toContain(
            `>${label('party', n)}<`,
          );
        }
      }
      for (const view of ['composition', 'future'] as const) {
        const html = resultsRegion(viewHtml(locale, view, input));
        for (const n of NUMBERS) {
          expect(html, `${view} group ${n}`).toContain(
            `>${label('group', n)}<`,
          );
        }
      }
      const seatsHtml = resultsRegion(viewHtml(locale, 'seats', input));
      for (const n of NUMBERS) {
        expect(inputs, `hidden block ${n}`).not.toContain(label('block', n));
        expect(seatsHtml, `hidden block ${n}`).not.toContain(
          `>${label('block', n)}<`,
        );
      }
    },
  );

  it.each(LOCALES)(
    '%s never shows a raw ID in place of an empty name',
    (locale) => {
      const input = blankNames(baselineInput());
      for (const view of VIEWS) {
        const html = viewHtml(locale, view, input);
        expect(html.match(/>\s*[GPB][1-9][0-9]*\s*</g), view).toBeNull();
        expect(
          html.match(
            /(aria-label|placeholder|title)="[^"]*\b[GPB][1-9][0-9]*\b[^"]*"/g,
          ),
          view,
        ).toBeNull();
      }
    },
  );

  it.each(PRESETS)(
    'titles the %s preset in the current language after a switch',
    (id) => {
      const store = createStore();
      store.loadPreset(id);
      for (const locale of LOCALES) {
        store.setLanguage(locale);
        expect(toolbarTitle(render(store)), locale).toBe(
          escapeText(translator(locale)(`preset.${id}`)),
        );
      }
    },
  );

  it('switches every default label without touching the input', () => {
    const store = createStore();
    const input = store.getState().input;
    for (const locale of LOCALES) {
      store.setLanguage(locale);
      expect(store.getState().input).toBe(input);
      expect(render(store), locale).toContain(
        escapeText(translator(locale)('entity.party', { n: '1' })),
      );
    }
  });

  it.each(LOCALES)(
    '%s titles an unnamed scenario that is not a preset as untitled',
    (locale) => {
      const input = { ...blankNames(baselineInput()), id: 'custom' };
      expect(
        toolbarTitle(render(createStore({ language: locale, input }))),
      ).toBe(escapeText(translator(locale)('app.untitled')));
    },
  );
});

describe('Israeli educational example', () => {
  const FOREIGN: Readonly<Record<Locale, RegExp>> = {
    ru: /[\u0590-\u05ff]/,
    en: /[\u0400-\u04ff\u0590-\u05ff]/,
    he: /[\u0400-\u04ff]/,
  };

  function exampleStore(locale: Locale, view: ViewId = 'seats') {
    return createStore({
      language: locale,
      view,
      input: presetInput('israelExample'),
    });
  }

  function noteTag(html: string): string | null {
    return /<[a-z]+\b[^>]*data-example-note[^>]*>/.exec(html)?.[0] ?? null;
  }

  it.each(LOCALES)(
    '%s titles the example and notes it at the top of the results',
    (locale) => {
      const tr = translator(locale);
      for (const view of VIEWS) {
        const html = render(exampleStore(locale, view));
        expect(toolbarTitle(html), view).toBe(
          escapeText(tr('preset.israelExample')),
        );
        expect(noteTag(html), view).not.toBeNull();
        const results = html.indexOf('data-region="results"');
        expect(html.indexOf('data-example-note'), view).toBeGreaterThan(
          results,
        );
        expect(resultsRegion(html), view).toContain(
          escapeText(tr('example.israel.note')),
        );
      }
    },
  );

  it.each(LOCALES)('%s shows the lists by their catalog names', (locale) => {
    const tr = translator(locale);
    const html = resultsRegion(render(exampleStore(locale)));
    for (const id of ['likud', 'yesh-atid', 'avoda', 'religious-zionism']) {
      expect(html, id).toContain(`>${escapeText(tr(`catalog.party.${id}`))}<`);
    }
  });

  it.each(LOCALES)('%s shows no text of another language', (locale) => {
    for (const view of VIEWS) {
      const store = exampleStore(locale, view);
      if (view === 'compare') {
        expect(store.saveBaseline()).toBe(true);
      }
      const html = withoutSwitcher(render(store));
      expect(FOREIGN[locale].exec(html)?.[0] ?? null, view).toBeNull();
    }
  });

  it('keeps the note after an edit', () => {
    const store = exampleStore('ru');
    store.updateInput((input) => {
      const json = input as Json;
      const groups = (json.groups as Json[]).map((group, index) =>
        index === 0 ? { ...group, turnout: '0.5' } : group,
      );
      return { ...json, groups };
    });
    expect((store.getState().input as Json).groups).not.toEqual(
      presetInput('israelExample').groups,
    );
    expect(noteTag(render(store))).not.toBeNull();
  });

  it('shows no note for the other presets or for another scenario ID', () => {
    for (const id of PRESETS.filter((preset) => preset !== 'israelExample')) {
      const store = createStore();
      store.loadPreset(id);
      expect(noteTag(render(store)), id).toBeNull();
    }
    const input = { ...presetInput('israelExample'), id: 'custom' };
    expect(noteTag(render(createStore({ input })))).toBeNull();
  });
});

describe('clear saved data', () => {
  function clearButton(html: string): string {
    return (
      /<button\b[^>]*data-action="clear-data"[^>]*>[^<]*<\/button>/.exec(
        html,
      )?.[0] ?? ''
    );
  }

  function notice(html: string): string {
    return (
      /<p\b[^>]*data-storage-notice="[^"]*"[^>]*>[^<]*<\/p>/.exec(html)?.[0] ??
      ''
    );
  }

  it.each(LOCALES)(
    '%s offers the action as a labelled button after the language switcher',
    (locale: Locale) => {
      const html = render(createStore({ language: locale }));
      const button = clearButton(html);
      expect(button).toContain('type="button"');
      expect(button).toContain(
        `>${escapeText(translator(locale)('storage.clear'))}<`,
      );
      expect(html.indexOf('data-action="clear-data"')).toBeGreaterThan(
        html.indexOf('class="languages"'),
      );
    },
  );

  it('shows no notice before the action', () => {
    expect(render()).not.toContain('data-storage-notice');
  });

  it.each(LOCALES)(
    '%s announces each outcome in a status line',
    (locale: Locale) => {
      const tr = translator(locale);
      for (const [clears, outcome] of [
        [true, 'cleared'],
        [false, 'failed'],
      ] as const) {
        const store = createStore(
          { language: locale },
          {
            storage: { load: () => null, save: () => {}, clear: () => clears },
          },
        );
        store.clearSavedData();
        const line = notice(render(store));
        expect(line).toContain(`data-storage-notice="${outcome}"`);
        expect(line).toContain('role="status"');
        expect(line).toContain(`>${escapeText(tr(`storage.${outcome}`))}<`);
      }
    },
  );

  it('words the outcomes differently in every locale', () => {
    for (const locale of LOCALES) {
      const tr = translator(locale);
      const texts = ['storage.clear', 'storage.cleared', 'storage.failed'].map(
        (key) => tr(key),
      );
      for (const [index, text] of texts.entries()) {
        expect(text).not.toMatch(/^storage\./);
        expect(texts.indexOf(text)).toBe(index);
      }
    }
  });
});

describe('questionnaire in the app', () => {
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

  /** Walks the six-list book to the given page with Next. */
  function sixLists(
    store: ReturnType<typeof createStore>,
    until: string,
  ): ReturnType<typeof createStore> {
    let guard = 0;
    while (store.getState().book.page !== until) {
      const page = store.getState().book.page;
      if (page === 'parties.count') {
        store.answerBook(0, '6');
      }
      if (page === 'parties.naming') {
        store.answerBook(0, 'example');
      }
      if (guard > 200 || !store.bookNext()) {
        throw new Error(`stuck at ${page}`);
      }
      guard += 1;
    }
    return store;
  }

  function built(locale: Locale = 'ru', view: ViewId = 'seats') {
    const store = sixLists(
      createStore({ screen: 'book', language: locale }),
      'review',
    );
    store.buildBook();
    store.setView(view);
    return store;
  }

  it('shows only the book while it is open', () => {
    const html = render(createStore({ screen: 'book' }));
    expect(attribute(html, 'data-region')).toEqual([]);
    expect(html).toContain('data-book');
    expect(toolbarTitle(html)).toBeNull();
  });

  it('offers the questionnaire from the toolbar', () => {
    const html = render();
    expect(html).not.toContain('data-book');
    expect(action(html, 'open-book')).toBe('Анкета');
    const results = html.indexOf('data-region="results"');
    expect(html.indexOf('data-action="open-book"')).toBeLessThan(results);
  });

  it.each(LOCALES)(
    '%s titles a built scenario and notes its assumptions in every view',
    (locale) => {
      const tr = translator(locale);
      expect(tr('book.scenarioTitle')).not.toBe('book.scenarioTitle');
      expect(tr('book.note')).not.toBe('book.note');
      for (const view of VIEWS) {
        const html = render(built(locale, view));
        expect(toolbarTitle(html), view).toBe(
          escapeText(tr('book.scenarioTitle')),
        );
        expect(resultsRegion(html), view).toMatch(
          /<[a-z]+\b[^>]*data-assumption-note/,
        );
        expect(resultsRegion(html), view).toContain(
          escapeText(tr('book.note')),
        );
        expect(html, view).not.toContain('data-example-note');
      }
    },
  );

  it('names the built scenario "Моя симуляция" in Russian', () => {
    expect(toolbarTitle(render(built()))).toBe('Моя симуляция');
  });

  it('shows no assumption note for other scenarios', () => {
    for (const id of PRESETS) {
      const store = createStore();
      store.loadPreset(id);
      expect(render(store), id).not.toContain('data-assumption-note');
    }
  });

  it('lists the answers taken from suggestions in the editor until dismissed', () => {
    const store = sixLists(createStore({ screen: 'book' }), 'parties.names');
    store.bookGoTo('people.set');
    store.answerBook(0, 'example');
    expect(store.bookNext()).toBe(true);
    // M7-15: no compose.mode / compose.known choice pages any more.
    store.skipBook();
    let html = render(store);
    const list = html.indexOf('data-auto-filled');
    expect(list).toBeGreaterThan(html.indexOf('data-region="editor"'));
    expect(list).toBeLessThan(html.indexOf('data-region="results"'));
    expect(html).toContain('Заполнено автоматически');
    expect(html).toContain('<li>Названия партий</li>');
    expect(html).toContain('<li>Голоса партий</li>');
    expect(html).toContain('<li>Избиратели партии: Ликуд</li>');
    expect(html).not.toContain('<li>Предпочтения');
    expect(html).toContain('<li>Явка: Арабские граждане</li>');
    expect(action(html, 'dismiss-auto-filled')).toBe('Скрыть');
    store.dismissAutoFilled();
    html = render(store);
    expect(html).not.toContain('data-auto-filled');
  });

  it('asks before a preset replaces a changed scenario', () => {
    const store = createStore();
    store.updateInput((input) => ({
      ...(input as Json),
      name: 'Мой сценарий',
    }));
    expect(render(store)).not.toContain('data-preset-confirm');
    store.requestPreset('split');
    const html = render(store);
    expect(html).toMatch(/<div[^>]*role="alertdialog"[^>]*data-preset-confirm/);
    expect(html).toContain(
      `Загрузить «${escapeText(t('preset.split'))}»? Изменения текущего сценария будут потеряны.`,
    );
    expect(action(html, 'preset-confirm')).toBe('Заменить');
    expect(action(html, 'preset-cancel')).toBe('Отмена');
  });
});
