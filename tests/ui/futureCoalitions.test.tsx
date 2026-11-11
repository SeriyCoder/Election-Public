import { renderToString } from 'preact-render-to-string';
import { describe, expect, it, vi } from 'vitest';
import { runScenario } from '../../src/engine/run';
import { validateScenario, type Scenario } from '../../src/engine/schema';
import { LOCALES, TABLES, translator } from '../../src/i18n';
import { formatChange, formatInteger } from '../../src/i18n/format';
import { App } from '../../src/ui/App';
import { coalitionKey } from '../../src/ui/coalitionChoice';
import type {
  CoalitionRun,
  CoalitionRunner,
} from '../../src/ui/coalitionRunner';
import { createStore, VIEWS, type AppState } from '../../src/ui/store';
import {
  groupInput,
  partyInput,
  rulesInput,
  scenarioInput,
  type Json,
} from '../engine/helpers/scenarios';

const t = translator('ru');

const KEYS = [
  'chooser.title',
  'chooser.hint',
  'chooser.own',
  'chooser.seats',
  'chooser.running',
  'chooser.none',
  'chooser.limit',
  'futureCoalitions.title',
  'futureCoalitions.empty',
  'futureCoalitions.seats',
  'futureCoalitions.majority',
  'futureCoalitions.noMajority',
  'futureCoalitions.others',
  'futureCoalitions.total',
  'futureCoalitions.needed',
  'futureCoalitions.breach',
  'futureCoalitions.pie',
  'futureCoalitions.pieNone',
];

/**
 * The engine fixture of M2-30: X 5, Y 3, Z 2 of 10 in year 0 and X 6, Y 2,
 * Z 2 in year 3. Today's minimal winning coalitions are X+Y and X+Z.
 */
function input(
  options: { growth?: string; names?: Record<string, string> } = {},
  coalitionRules: Json = {},
): Json {
  const named = (id: string, order: number): Json => ({
    ...partyInput(id, null, order),
    name: options.names?.[id] ?? `Party ${id}`,
  });
  return scenarioInput({
    rules: rulesInput({ populationTotal: '1000', seatCount: 10 }),
    parties: [named('X', 1), named('Y', 2), named('Z', 3)],
    groups: [
      groupInput(
        'A',
        '0.5',
        { X: '1' },
        { growthRate: options.growth ?? '0.1' },
      ),
      groupInput(
        'B',
        '0.5',
        { Y: '0.6', Z: '0.4' },
        options.growth === undefined ? {} : { growthRate: options.growth },
      ),
    ],
    coalitionRules,
  });
}

function scenarioOf(json: unknown): Scenario {
  const validation = validateScenario(json);
  if (!validation.ok) {
    throw new Error('expected a valid scenario');
  }
  return validation.scenario;
}

function doneRun(json: unknown): CoalitionRun {
  return {
    state: 'done',
    analysis: runScenario(scenarioOf(json)).coalitions,
    inPage: false,
  };
}

/** Keys of today's minimal winning coalitions in the search's order. */
function minimalKeys(json: unknown): string[] {
  return runScenario(scenarioOf(json)).coalitions.minimalWinning.map(
    (coalition) => coalitionKey(coalition.partyIds),
  );
}

function fixedRunner(run: CoalitionRun): CoalitionRunner {
  return {
    getRun: () => run,
    subscribe: () => () => undefined,
    update: vi.fn(),
    cancel: vi.fn(),
    rerun: vi.fn(),
    dispose: vi.fn(),
  };
}

function render(initial: Partial<AppState>, run?: CoalitionRun): string {
  const json = initial.input ?? input();
  const store = createStore({
    view: 'future',
    futureYear: 3,
    language: 'ru',
    ...initial,
    input: json,
  });
  const runner =
    run === undefined && validateScenario(json).ok
      ? fixedRunner(doneRun(json))
      : run === undefined
        ? undefined
        : fixedRunner(run);
  return renderToString(<App store={store} runner={runner} />);
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function attribute(html: string, name: string): string[] {
  return [...html.matchAll(new RegExp(`${name}="([^"]*)"`, 'g'))].map(
    (match) => match[1] ?? '',
  );
}

function tag(html: string, pattern: string): string {
  const match = new RegExp(`<[a-z]+\\b[^>]*${pattern}[^>]*>`).exec(html);
  if (match === null) {
    throw new Error(`missing tag ${pattern}`);
  }
  return match[0];
}

function element(html: string, name: string, pattern: string): string {
  const match = new RegExp(`<${name}\\b[^>]*${pattern}[^>]*>`).exec(html);
  if (match === null) {
    throw new Error(`missing ${name} ${pattern}`);
  }
  const rest = html.slice(match.index);
  let depth = 0;
  for (const tag of rest.matchAll(new RegExp(`</?${name}\\b[^>]*>`, 'g'))) {
    depth += tag[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return rest.slice(0, tag.index + tag[0].length);
  }
  throw new Error(`unclosed ${name} ${pattern}`);
}

function cell(row: string, name: string): string {
  const match = new RegExp(
    `<td\\b[^>]*data-cell="${name}"[^>]*>([\\s\\S]*?)</td>`,
  ).exec(row);
  if (match === null) {
    throw new Error(`missing cell ${name}`);
  }
  return (match[1] ?? '').replace(/<[^>]*>/g, '');
}

function chooser(html: string): string {
  return element(html, 'section', 'data-region="chooser"');
}

/** Keys hold "+", which a pattern would read as a quantifier. */
function literal(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function entry(html: string, key: string): string {
  return element(html, 'li', `data-future-choice="${literal(key)}"`);
}

function card(html: string, key: string): string {
  return element(html, 'article', `data-future-coalition="${literal(key)}"`);
}

function seatsText(seats: number, total = 10): string {
  return t('futureCoalitions.seats', {
    seats: formatInteger('ru', seats),
    total: formatInteger('ru', total),
  });
}

describe('demographic future strings', () => {
  it('renames the future view', () => {
    expect(translator('ru')('view.future')).toBe('Симуляции коалиций');
    expect(translator('en')('view.future')).toBe('Coalition simulations');
    expect(translator('he')('view.future')).toBe('סימולציות קואליציה');
  });

  it.each(LOCALES)('defines every new key in %s', (locale) => {
    const table = TABLES[locale] as Record<string, string>;
    for (const key of KEYS) {
      expect(table[key], `${locale} ${key}`).toMatch(/\S/);
    }
  });
});

describe('coalition chooser region', () => {
  it('takes the place of the editor on the future view', () => {
    const html = render({});
    const regions = attribute(html, 'data-region');
    expect(regions).toContain('chooser');
    expect(regions).not.toContain('editor');
    const section = tag(html, 'data-region="chooser"');
    expect(section).toContain(`aria-label="${escapeText(t('chooser.title'))}"`);
    const list = chooser(html);
    expect(list).toContain(escapeText(t('chooser.title')));
    expect(list).toContain(escapeText(t('chooser.hint')));
  });

  it.each(VIEWS.filter((view) => view !== 'future'))(
    'keeps the editor on %s',
    (view) => {
      const regions = attribute(render({ view }), 'data-region');
      expect(regions).toContain('editor');
      expect(regions).not.toContain('chooser');
    },
  );

  it('lists today’s minimal winning coalitions with checkboxes', () => {
    const json = input();
    const html = render({ input: json });
    const expected = minimalKeys(json);
    expect(expected).toHaveLength(2);
    expect(expected).toEqual(expect.arrayContaining(['X+Y', 'X+Z']));
    expect(attribute(chooser(html), 'data-future-choice')).toEqual(expected);
    const xy = entry(html, 'X+Y');
    expect(tag(xy, 'type="checkbox"')).not.toMatch(/\b(checked|disabled)\b/);
    expect(xy).toContain('data-choice-source="minimal"');
    expect(xy).toMatch(/<bdi>Party X<\/bdi> \+ <bdi>Party Y<\/bdi>/);
    expect(xy).toContain(
      escapeText(t('chooser.seats', { seats: formatInteger('ru', 8) })),
    );
    expect(chooser(html)).toContain('data-chooser-state="ready"');
    expect(chooser(html)).not.toContain(escapeText(t('chooser.limit')));
  });

  it('says so while the search runs', () => {
    for (const run of [
      undefined,
      { state: 'running', nodesVisited: 10, budget: 100 } as const,
    ]) {
      const html =
        run === undefined
          ? renderToString(
              <App
                store={createStore({
                  input: input(),
                  view: 'future',
                  language: 'ru',
                })}
              />,
            )
          : render({}, run);
      expect(chooser(html)).toContain('data-chooser-state="running"');
      expect(chooser(html)).toContain(escapeText(t('chooser.running')));
      expect(attribute(chooser(html), 'data-future-choice')).toEqual([]);
    }
  });

  it('says so when today has no minimal winning coalition', () => {
    const run = doneRun(input());
    if (run.state !== 'done') {
      throw new Error('expected a finished run');
    }
    const html = render(
      {},
      { ...run, analysis: { ...run.analysis, minimalWinning: [] } },
    );
    expect(chooser(html)).toContain('data-chooser-state="none"');
    expect(chooser(html)).toContain(escapeText(t('chooser.none')));
  });

  it.each([
    { run: { state: 'cancelled' } as const, key: 'coalition.cancelled' },
    {
      run: { state: 'failed', message: 'boom' } as const,
      key: 'coalition.failed',
    },
  ])('shows the $key notice', ({ run, key }) => {
    const html = render({}, run);
    expect(chooser(html)).toContain(escapeText(t(key)));
  });

  it('offers the coalition put together on the Coalitions tab first', () => {
    const html = render({ coalitionSelection: ['Z', 'Y'] });
    const keys = attribute(chooser(html), 'data-future-choice');
    expect(keys[0]).toBe('Y+Z');
    const own = entry(html, 'Y+Z');
    expect(own).toContain('data-choice-source="own"');
    expect(own).toContain(escapeText(t('chooser.own')));
    expect(own).toMatch(/<bdi>Party Y<\/bdi> \+ <bdi>Party Z<\/bdi>/);
  });

  it('ticks the followed coalitions', () => {
    const html = render({ futureCoalitions: [['Y', 'X']] });
    expect(tag(entry(html, 'X+Y'), 'type="checkbox"')).toMatch(/\bchecked\b/);
    expect(tag(entry(html, 'X+Z'), 'type="checkbox"')).not.toMatch(
      /\bchecked\b/,
    );
  });

  it('disables the others once four are ticked', () => {
    const html = render({
      futureCoalitions: [['X', 'Y'], ['X', 'Z'], ['Y', 'Z'], ['Z']],
      coalitionSelection: ['X'],
    });
    expect(attribute(chooser(html), 'data-future-choice')).toEqual([
      'Y+Z',
      'Z',
      'X',
      ...minimalKeys(input()),
    ]);
    expect(entry(html, 'Y+Z')).toContain('data-choice-source="ticked"');
    expect(tag(entry(html, 'X'), 'type="checkbox"')).toMatch(/\bdisabled\b/);
    expect(tag(entry(html, 'X+Y'), 'type="checkbox"')).not.toMatch(
      /\bdisabled\b/,
    );
    expect(chooser(html)).toContain('data-chooser-limit');
    expect(chooser(html)).toContain(escapeText(t('chooser.limit')));
  });

  it('shows names as inert text', () => {
    const name = '<img src=x onerror=alert(1)>';
    const html = render({ input: input({ names: { X: name } }) });
    expect(html).not.toContain('<img src=x');
    expect(entry(html, 'X+Y')).toContain(name.replace(/</g, '&lt;'));
  });

  it('lists nothing for invalid input', () => {
    const json = { ...input(), rules: { seatCount: -1 } };
    const html = render({ input: json });
    expect(attribute(html, 'data-future-choice')).toEqual([]);
    expect(html).not.toContain('data-future-coalitions');
  });
});

describe('future coalition cards', () => {
  it('asks for a choice when nothing is ticked', () => {
    const html = render({});
    const section = element(html, 'section', 'data-future-coalitions');
    expect(section).toContain(escapeText(t('futureCoalitions.title')));
    expect(section).toContain(escapeText(t('futureCoalitions.empty')));
    expect(attribute(html, 'data-future-coalition')).toEqual([]);
  });

  it('shows one card per ticked coalition in tick order', () => {
    const html = render({ futureCoalitions: [['X'], ['Y', 'X']] });
    expect(attribute(html, 'data-future-coalition')).toEqual(['X', 'X+Y']);
  });

  it('draws year 0 and the chosen year from the engine stops', () => {
    const x = card(render({ futureCoalitions: [['X']] }), 'X');
    const base = tag(x, 'data-pie="base"');
    const year = tag(x, 'data-pie="year"');
    for (const pie of [base, year]) {
      expect(pie).toContain('role="img"');
      expect(pie).toContain('conic-gradient(');
    }
    expect(base).toContain('50.00%');
    expect(year).toContain('60.00%');
    expect(base).toContain('data-pie-state="minority"');
    expect(year).toContain('data-pie-state="majority"');
    expect(attribute(x, 'data-majority-mark')).toHaveLength(2);
    expect(x).toContain('--majority:60.00');
  });

  it('states the seats and the majority under each pie', () => {
    const x = card(render({ futureCoalitions: [['X']] }), 'X');
    const base = element(x, 'p', 'data-pie-caption="base"');
    expect(base).toContain(escapeText(seatsText(5)));
    expect(base).toContain(escapeText(t('futureCoalitions.noMajority')));
    const year = element(x, 'p', 'data-pie-caption="year"');
    expect(year).toContain(escapeText(seatsText(6)));
    expect(year).toContain(escapeText(t('futureCoalitions.majority')));
    expect(tag(x, 'data-pie="base"')).toContain(
      `aria-label="${escapeText(
        t('futureCoalitions.pie', {
          year: t('future.column.base'),
          seats: formatInteger('ru', 5),
          total: formatInteger('ru', 10),
          needed: formatInteger('ru', 6),
          majority: t('futureCoalitions.noMajority'),
        }),
      )}"`,
    );
  });

  it('gives the exact seats in a table', () => {
    const xy = card(render({ futureCoalitions: [['Y', 'X']] }), 'X+Y');
    const rows = element(xy, 'table', 'data-table="future-coalition"');
    const x = element(rows, 'tr', 'data-member="X"');
    expect([
      cell(x, 'baseline'),
      cell(x, 'current'),
      cell(x, 'change'),
    ]).toEqual(['5', '6', formatChange('ru', '1')]);
    const y = element(rows, 'tr', 'data-member="Y"');
    expect([
      cell(y, 'baseline'),
      cell(y, 'current'),
      cell(y, 'change'),
    ]).toEqual(['3', '2', formatChange('ru', '-1')]);
    const total = element(rows, 'tr', 'data-coalition-row="total"');
    expect([
      cell(total, 'baseline'),
      cell(total, 'current'),
      cell(total, 'change'),
    ]).toEqual(['8', '8', formatChange('ru', '0')]);
    const needed = element(rows, 'tr', 'data-coalition-row="needed"');
    expect(cell(needed, 'needed')).toBe('6');
    expect(xy).toContain(escapeText(t('futureCoalitions.others')));
  });

  it('notes a coalition that breaks the coalition rules', () => {
    const html = render({
      input: input({}, { incompatiblePartyPairs: [['X', 'Y']] }),
      futureCoalitions: [['X', 'Y'], ['X']],
    });
    const breach = escapeText(t('futureCoalitions.breach'));
    expect(card(html, 'X+Y')).toContain('data-coalition-breach');
    expect(card(html, 'X+Y')).toContain(breach);
    expect(card(html, 'X')).not.toContain(breach);
  });

  it('gives the reason in a year without an allocation', () => {
    const html = render({
      input: input({ growth: '-1' }),
      futureYear: 1,
      futureCoalitions: [['X']],
    });
    const x = card(html, 'X');
    expect(tag(x, 'data-pie="year"')).toContain(
      'data-pie-state="no-allocation"',
    );
    const year = element(x, 'p', 'data-pie-caption="year"');
    expect(year).toContain(escapeText(t('status.noAllocation.no-valid-votes')));
    expect(year).not.toContain(escapeText(t('futureCoalitions.majority')));
  });

  it.each(LOCALES)('renders its own labels in %s', (locale) => {
    const tr = translator(locale);
    const html = render({ language: locale, futureCoalitions: [['X']] });
    expect(html).toContain(escapeText(tr('chooser.title')));
    expect(html).toContain(escapeText(tr('futureCoalitions.title')));
    expect(html).toContain(escapeText(tr('view.future')));
  });
});
