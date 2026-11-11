import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { LOCALES, TABLES, translator, type Locale } from '../../src/i18n';
import { App } from '../../src/ui/App';
import { createStore, type AppState, type Store } from '../../src/ui/store';
import type { Json } from '../engine/helpers/scenarios';

const KEYS = ['hint.open', 'hint.population', 'hint.populationShare'];

function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function render(store: Store): string {
  return renderToString(<App store={store} />);
}

function app(locale: Locale, initial: Partial<AppState> = {}): string {
  return render(createStore({ language: locale, ...initial }));
}

function attributeOf(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return match === null ? null : (match[1] ?? '');
}

/** Opening tags of every hint button, in document order. */
function hints(html: string, kind?: string): string[] {
  return [...html.matchAll(/<button\b[^>]*\bdata-hint="[^"]*"[^>]*>/g)]
    .map((match) => match[0])
    .filter(
      (tag) => kind === undefined || attributeOf(tag, 'data-hint') === kind,
    );
}

function element(html: string, name: string, pattern: string): string {
  const match = new RegExp(
    `<${name}\\b[^>]*${pattern}[^>]*>[\\s\\S]*?</${name}>`,
  ).exec(html);
  if (match === null) {
    throw new Error(`missing ${name} ${pattern}`);
  }
  return match[0];
}

/** The rules section, up to the next editor section. */
function rulesSection(html: string): string {
  const start = html.indexOf('data-editor="rules"');
  if (start < 0) {
    throw new Error('missing rules section');
  }
  const end = html.indexOf('data-editor=', start + 1);
  return html.slice(start, end < 0 ? undefined : end);
}

function groupIds(store: Store): string[] {
  const input = store.getState().input as { groups: readonly Json[] };
  return input.groups.map((group) => String(group.id));
}

function expectHint(tag: string, locale: Locale, label: string, text: string) {
  const t = translator(locale);
  expect(attributeOf(tag, 'type')).toBe('button');
  expect(attributeOf(tag, 'class')?.split(' ')).toContain('hint');
  expect(attributeOf(tag, 'title')).toBe(escapeText(text));
  expect(attributeOf(tag, 'aria-label')).toBe(
    escapeText(t('hint.open', { label })),
  );
  expect(attributeOf(tag, 'aria-expanded')).toBe('false');
  expect(attributeOf(tag, 'aria-controls')).toMatch(/\S/);
}

describe('hint strings', () => {
  it.each(LOCALES)('defines every hint key in %s', (locale) => {
    const table = TABLES[locale] as Record<string, string>;
    for (const key of KEYS) {
      expect(table[key], `${locale} ${key}`).toMatch(/\S/);
    }
  });

  it.each(['en', 'he'] as const)(
    'translates every hint key in %s',
    (locale) => {
      const table = TABLES[locale] as Record<string, string>;
      const ru = TABLES.ru as Record<string, string>;
      for (const key of KEYS) {
        expect(table[key], `${locale} ${key}`).not.toBe(ru[key]);
      }
    },
  );

  it.each(LOCALES)('names the explained label in %s', (locale) => {
    const table = TABLES[locale] as Record<string, string>;
    expect(table['hint.open']).toContain('{label}');
  });

  it('uses the approved Russian wording', () => {
    const ru = TABLES.ru as Record<string, string>;
    expect(ru['hint.open']).toBe('Пояснение: {label}');
    expect(ru['hint.population']).toBe(
      'Все, у кого есть право голоса: и те, кто придёт голосовать, и те, кто не придёт. Сколько из них проголосует, задаёт явка групп.',
    );
    expect(ru['hint.populationShare']).toBe(
      'Часть группы среди всех, у кого есть право голоса, включая тех, кто не придёт голосовать.',
    );
  });
});

describe('hint in the editor', () => {
  it.each(LOCALES)('explains the eligible-voter rule in %s', (locale) => {
    const t = translator(locale);
    const rules = rulesSection(app(locale));
    const found = hints(rules, 'population');
    expect(found).toHaveLength(1);
    expectHint(
      found[0] ?? '',
      locale,
      t('rules.populationTotal'),
      t('hint.population'),
    );
    expect(hints(rules)).toHaveLength(1);
  });

  it('keeps the hint out of a label wrapper', () => {
    const rules = rulesSection(app('ru'));
    expect(rules).toContain('data-hint="population"');
    expect(rules).not.toMatch(
      /<label\b[^>]*>(?:(?!<\/label>)[\s\S])*data-hint="population"/,
    );
  });

  it('keeps the population input name', () => {
    const t = translator('ru');
    const rules = rulesSection(app('ru'));
    const input = /<input\b[^>]*data-rule="populationTotal"[^>]*>/.exec(rules);
    expect(input).not.toBeNull();
    expect(attributeOf(input?.[0] ?? '', 'aria-label')).toBe(
      escapeText(t('rules.populationTotal')),
    );
  });

  it.each(LOCALES)(
    "explains every group's population share in %s",
    (locale) => {
      const t = translator(locale);
      const store = createStore({ language: locale });
      const html = render(store);
      const ids = groupIds(store);
      expect(ids.length).toBeGreaterThan(1);
      for (const id of ids) {
        const row = element(html, 'li', `data-entity="group" data-id="${id}"`);
        expect(row).toContain('data-fraction="populationShare"');
        const found = hints(row);
        expect(found, id).toHaveLength(1);
        expect(attributeOf(found[0] ?? '', 'data-hint')).toBe(
          'populationShare',
        );
        expectHint(
          found[0] ?? '',
          locale,
          t('group.populationShare'),
          t('hint.populationShare'),
        );
      }
    },
  );

  it('gives every hint its own closed text', () => {
    const html = app('ru');
    const found = hints(html);
    expect(found.length).toBeGreaterThan(2);
    const ids = found.map((tag) => attributeOf(tag, 'aria-controls') ?? '');
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      const text = new RegExp(`<[a-z]+\\b[^>]*\\bid="${id}"[^>]*>`).exec(html);
      expect(text, id).not.toBeNull();
      expect(text?.[0] ?? '', id).toMatch(/\shidden(?:[\s=>])/);
    }
  });
});

describe('hint in the results', () => {
  it.each(LOCALES)('explains the summary total in %s', (locale) => {
    const t = translator(locale);
    const summary = element(
      app(locale, { view: 'seats' }),
      'dl',
      'class="summary"',
    );
    const found = hints(summary);
    expect(found).toHaveLength(1);
    expect(attributeOf(found[0] ?? '', 'data-hint')).toBe('population');
    expectHint(
      found[0] ?? '',
      locale,
      t('summary.population'),
      t('hint.population'),
    );
    const item = element(summary, 'dt', '');
    expect(item).toContain('data-hint="population"');
  });

  it.each(LOCALES)('explains the comparison total in %s', (locale) => {
    const t = translator(locale);
    const store = createStore({ language: locale, view: 'compare' });
    expect(store.saveBaseline()).toBe(true);
    const html = render(store);
    const start = html.indexOf('data-table="compare-totals"');
    expect(start).toBeGreaterThan(-1);
    const totals = element(html.slice(start), 'tbody', '');
    const row = element(totals, 'tr', 'data-total="population"');
    const found = hints(row);
    expect(found).toHaveLength(1);
    expectHint(
      found[0] ?? '',
      locale,
      t('compare.total.population'),
      t('hint.population'),
    );
    expect(hints(totals)).toHaveLength(1);
  });

  it.each(LOCALES)('explains the demographic-future total in %s', (locale) => {
    const t = translator(locale);
    const html = app(locale, { view: 'future' });
    const start = html.indexOf('data-table="future-totals"');
    expect(start).toBeGreaterThan(-1);
    const totals = element(html.slice(start), 'tbody', '');
    const row = element(totals, 'tr', 'data-total="population"');
    const found = hints(row);
    expect(found).toHaveLength(1);
    expectHint(
      found[0] ?? '',
      locale,
      t('compare.total.population'),
      t('hint.population'),
    );
    expect(hints(totals)).toHaveLength(1);
  });
});
