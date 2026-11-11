import { renderToString } from 'preact-render-to-string';
import { describe, expect, it, vi } from 'vitest';
import {
  compareScenarios,
  type Change,
  type CountChange,
} from '../../src/engine/compare';
import { runScenario, runSeats } from '../../src/engine/run';
import { LOCALES, TABLES, translator, type Locale } from '../../src/i18n';
import {
  formatChange,
  formatDecimal,
  formatInteger,
} from '../../src/i18n/format';
import { App } from '../../src/ui/App';
import type { CoalitionRun } from '../../src/ui/coalitionRunner';
import { Compare, type ComparedSide } from '../../src/ui/Compare';
import { createStore } from '../../src/ui/store';
import {
  buildScenario,
  partyInput,
  rulesInput,
  section8Input,
  type Json,
} from '../engine/helpers/scenarios';

const KEYS = [
  'compare.empty',
  'compare.save',
  'compare.saveAgain',
  'compare.reset',
  'compare.clear',
  'compare.baselineLabel',
  'compare.totals',
  'compare.groups',
  'compare.parties',
  'compare.coalitions',
  'compare.column.baseline',
  'compare.column.current',
  'compare.column.change',
  'compare.column.name',
  'compare.column.votes',
  'compare.column.voteShare',
  'compare.column.seats',
  'compare.column.status',
  'compare.column.turnout',
  'compare.total.population',
  'compare.total.cast',
  'compare.total.valid',
  'compare.total.turnout',
  'compare.total.majority',
  'compare.presence.added',
  'compare.presence.removed',
  'compare.coalitions.pending',
  'compare.coalitions.inconclusive',
];

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

function openTag(html: string, marker: string): string {
  const match = new RegExp(`<[a-z]+\\b[^>]*${marker}[^>]*>`).exec(html);
  if (match === null) {
    throw new Error(`missing ${marker}`);
  }
  return match[0];
}

function block(html: string, marker: string, close: string): string {
  const match = new RegExp(
    `<[a-z]+\\b[^>]*${marker}[^>]*>[\\s\\S]*?</${close}>`,
  ).exec(html);
  if (match === null) {
    throw new Error(`missing ${marker}`);
  }
  return match[0];
}

function textOf(fragment: string): string {
  return fragment.replace(/<[^>]*>/g, '');
}

function side(input: Json): ComparedSide {
  const scenario = buildScenario(input);
  return { scenario, seats: runSeats(scenario) };
}

function done(input: Json): CoalitionRun {
  return {
    state: 'done',
    analysis: runScenario(buildScenario(input)).coalitions,
    inPage: false,
  };
}

function eligibleInput(): Json {
  const input = section8Input();
  return {
    ...input,
    parties: (input.parties as Json[]).map((party) => ({
      ...party,
      canJoinGovernment: true,
    })),
  };
}

interface RenderOptions {
  readonly baseline?: Json | null;
  readonly current?: Json;
  readonly baselineRun?: CoalitionRun;
  readonly currentRun?: CoalitionRun;
  readonly locale?: Locale;
}

function render(options: RenderOptions = {}): string {
  const locale = options.locale ?? 'en';
  const baseline =
    options.baseline === undefined ? section8Input() : options.baseline;
  const current = options.current ?? section8Input('0.5');
  return renderToString(
    <Compare
      baseline={baseline === null ? null : side(baseline)}
      current={side(current)}
      baselineRun={
        options.baselineRun ??
        (baseline === null ? { state: 'idle' } : done(baseline))
      }
      currentRun={options.currentRun ?? done(current)}
      locale={locale}
      t={translator(locale)}
      onSave={vi.fn()}
      onReset={vi.fn()}
      onClear={vi.fn()}
    />,
  );
}

function expected(baseline: Json, current: Json) {
  const before = side(baseline);
  const after = side(current);
  return compareScenarios(
    before.scenario,
    before.seats,
    after.scenario,
    after.seats,
  );
}

function decimalText(locale: Locale, value: string | null): string {
  return value === null
    ? translator(locale)('results.empty')
    : formatDecimal(locale, value);
}

function changeText(locale: Locale, value: string | null): string {
  return value === null
    ? translator(locale)('results.empty')
    : formatChange(locale, value);
}

function countText(locale: Locale, value: number | null): string {
  return value === null
    ? translator(locale)('results.empty')
    : formatInteger(locale, value);
}

function countChangeText(locale: Locale, value: number | null): string {
  return value === null
    ? translator(locale)('results.empty')
    : formatChange(locale, `${value}`);
}

function direction(value: string | number | null): string {
  if (value === null) {
    return 'none';
  }
  const text = `${value}`;
  if (text.startsWith('-')) {
    return 'down';
  }
  return /[1-9]/.test(text) ? 'up' : 'none';
}

function cell(row: string, name: string): string {
  return textOf(block(row, `data-cell="${name}"`, 'td'));
}

function expectChangeCell(
  row: string,
  name: string,
  change: Change,
  locale: Locale,
): void {
  expect(cell(row, `${name}-baseline`)).toBe(
    decimalText(locale, change.baseline),
  );
  expect(cell(row, `${name}-current`)).toBe(
    decimalText(locale, change.current),
  );
  expect(cell(row, `${name}-change`)).toBe(changeText(locale, change.change));
  expect(openTag(row, `data-cell="${name}-change"`)).toContain(
    `data-direction="${direction(change.change)}"`,
  );
}

function expectCountCell(
  row: string,
  name: string,
  change: CountChange,
  locale: Locale,
): void {
  expect(cell(row, `${name}-baseline`)).toBe(
    countText(locale, change.baseline),
  );
  expect(cell(row, `${name}-current`)).toBe(countText(locale, change.current));
  expect(cell(row, `${name}-change`)).toBe(
    countChangeText(locale, change.change),
  );
  expect(openTag(row, `data-cell="${name}-change"`)).toContain(
    `data-direction="${direction(change.change)}"`,
  );
}

describe('compare strings', () => {
  it.each(LOCALES)('defines every compare key in %s', (locale) => {
    const table = TABLES[locale] as Record<string, string>;
    for (const key of KEYS) {
      expect(table[key], `${locale} ${key}`).toMatch(/\S/);
    }
  });

  it('drops the compare placeholder from every locale', () => {
    for (const locale of LOCALES) {
      expect(translator(locale)('placeholder.compare')).toBe(
        'placeholder.compare',
      );
    }
  });
});

describe('compare view without a baseline', () => {
  const t = translator('en');

  it('explains the flow and offers only Save as baseline', () => {
    const html = render({ baseline: null });
    expect(attribute(html, 'data-compare')).toEqual(['empty']);
    expect(attribute(html, 'data-empty')).toEqual(['baseline']);
    expect(html).toContain(escapeText(t('compare.empty')));
    expect(attribute(html, 'data-action')).toEqual(['save-baseline']);
    expect(textOf(block(html, 'data-action="save-baseline"', 'button'))).toBe(
      t('compare.save'),
    );
    expect(html).not.toContain('data-table=');
  });
});

describe('compare view with a baseline', () => {
  const t = translator('en');

  it('names the baseline and offers save again, reset and clear', () => {
    const baseline = { ...section8Input(), name: 'Before the change' };
    const html = render({ baseline });
    expect(attribute(html, 'data-compare')).toEqual(['ready']);
    const name = block(html, 'data-baseline-name', 'p');
    expect(textOf(name)).toContain(t('compare.baselineLabel'));
    expect(name).toContain('<bdi>Before the change</bdi>');
    expect(attribute(html, 'data-action')).toEqual([
      'save-baseline',
      'reset-baseline',
      'clear-baseline',
    ]);
    expect(textOf(block(html, 'data-action="save-baseline"', 'button'))).toBe(
      t('compare.saveAgain'),
    );
    expect(textOf(block(html, 'data-action="reset-baseline"', 'button'))).toBe(
      t('compare.reset'),
    );
    expect(textOf(block(html, 'data-action="clear-baseline"', 'button'))).toBe(
      t('compare.clear'),
    );
  });

  it('shows the totals with exact changes', () => {
    const html = render();
    const comparison = expected(section8Input(), section8Input('0.5'));
    const table = block(html, 'data-table="compare-totals"', 'table');
    expect(attribute(table, 'data-total')).toEqual([
      'population',
      'cast',
      'valid',
      'turnout',
      'majority',
    ]);
    for (const key of ['population', 'cast', 'valid', 'turnout'] as const) {
      const row = block(table, `data-total="${key}"`, 'tr');
      expect(textOf(row)).toContain(t(`compare.total.${key}`));
      expect(cell(row, 'baseline')).toBe(
        decimalText('en', comparison.totals[key].baseline),
      );
      expect(cell(row, 'current')).toBe(
        decimalText('en', comparison.totals[key].current),
      );
      expect(cell(row, 'change')).toBe(
        changeText('en', comparison.totals[key].change),
      );
    }
    const valid = block(table, 'data-total="valid"', 'tr');
    expect(cell(valid, 'change')).toBe(formatChange('en', '-75000'));
    expect(openTag(valid, 'data-cell="change"')).toContain(
      'data-direction="down"',
    );
    const majority = block(table, 'data-total="majority"', 'tr');
    expect(cell(majority, 'baseline')).toBe('61');
    expect(cell(majority, 'current')).toBe('61');
    expect(cell(majority, 'change')).toBe(formatChange('en', '0'));
    expect(openTag(majority, 'data-cell="change"')).toContain(
      'data-direction="none"',
    );
  });

  it('shows each group turnout with its change', () => {
    const html = render();
    const comparison = expected(section8Input(), section8Input('0.5'));
    const table = block(html, 'data-table="compare-groups"', 'table');
    expect(attribute(table, 'data-group')).toEqual(['G1', 'G2', 'G3', 'G4']);
    for (const row of comparison.groups) {
      const tr = block(table, `data-group="${row.groupId}"`, 'tr');
      expect(tr).toContain(`<bdi>${row.name}</bdi>`);
      expectChangeCell(tr, 'turnout', row.turnout, 'en');
    }
    const g3 = block(table, 'data-group="G3"', 'tr');
    expect(cell(g3, 'turnout-change')).toBe(formatChange('en', '-50.00'));
  });

  it('shows votes, shares, seats and status per party', () => {
    const html = render();
    const comparison = expected(section8Input(), section8Input('0.5'));
    const table = block(html, 'data-table="compare-parties"', 'table');
    expect(attribute(table, 'data-party')).toEqual(['P1', 'P2', 'P3', 'P4']);
    for (const label of [
      'compare.column.votes',
      'compare.column.voteShare',
      'compare.column.seats',
      'compare.column.status',
    ]) {
      expect(table).toContain(escapeText(t(label)));
    }
    for (const row of comparison.parties) {
      const tr = block(table, `data-party="${row.partyId}"`, 'tr');
      expect(openTag(tr, `data-party="${row.partyId}"`)).toContain(
        'data-presence="both"',
      );
      expect(tr).toContain(`<bdi>${row.name}</bdi>`);
      expectChangeCell(tr, 'votes', row.votes, 'en');
      expectChangeCell(tr, 'share', row.voteShare, 'en');
      expectCountCell(tr, 'seats', row.seats, 'en');
    }
    const p3 = block(table, 'data-party="P3"', 'tr');
    expect(cell(p3, 'seats-change')).toBe(formatChange('en', '-8'));
    expect(openTag(p3, 'data-cell="seats-change"')).toContain(
      'data-direction="down"',
    );
  });

  it('shows a qualification change under a raised threshold', () => {
    const current = {
      ...section8Input(),
      rules: rulesInput({ threshold: '0.06' }),
    };
    const html = render({ current });
    const p4 = block(html, 'data-party="P4"', 'tr');
    expect(cell(p4, 'status-baseline')).toBe(t('qualification.qualified'));
    expect(cell(p4, 'status-current')).toBe(t('qualification.below-threshold'));
  });

  it('marks added and removed parties with empty cells on the missing side', () => {
    const baseline = section8Input();
    const current = section8Input();
    const before = {
      ...baseline,
      parties: [...(baseline.parties as Json[]), partyInput('P5', null, 5)],
    };
    const after = {
      ...current,
      parties: [...(current.parties as Json[]), partyInput('P6', null, 6)],
    };
    const html = render({ baseline: before, current: after });
    const table = block(html, 'data-table="compare-parties"', 'table');
    expect(attribute(table, 'data-party')).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
      'P6',
      'P5',
    ]);
    const added = block(table, 'data-party="P6"', 'tr');
    expect(openTag(added, 'data-party="P6"')).toContain(
      'data-presence="added"',
    );
    expect(textOf(added)).toContain(t('compare.presence.added'));
    expect(cell(added, 'votes-baseline')).toBe(t('results.empty'));
    expect(cell(added, 'seats-change')).toBe(t('results.empty'));
    expect(cell(added, 'status-baseline')).toBe(t('results.empty'));
    const removed = block(table, 'data-party="P5"', 'tr');
    expect(openTag(removed, 'data-party="P5"')).toContain(
      'data-presence="removed"',
    );
    expect(textOf(removed)).toContain(t('compare.presence.removed'));
    expect(cell(removed, 'votes-current')).toBe(t('results.empty'));
    expect(cell(removed, 'status-current')).toBe(t('results.empty'));
    const kept = block(table, 'data-party="P1"', 'tr');
    expect(textOf(kept)).not.toContain(t('compare.presence.added'));
    expect(textOf(kept)).not.toContain(t('compare.presence.removed'));
  });

  it('shows empty seat cells for a side without an allocation', () => {
    const input = section8Input();
    const current = {
      ...input,
      groups: (input.groups as Json[]).map((group) => ({
        ...group,
        turnout: '0',
      })),
    };
    const html = render({ current });
    const table = block(html, 'data-table="compare-parties"', 'table');
    for (const id of ['P1', 'P2', 'P3', 'P4']) {
      const tr = block(table, `data-party="${id}"`, 'tr');
      expect(cell(tr, 'seats-current')).toBe(t('results.empty'));
      expect(cell(tr, 'seats-change')).toBe(t('results.empty'));
    }
  });

  it('escapes markup in names', () => {
    const baseline = { ...section8Input(), name: '<script>alert(1)</script>' };
    const html = render({ baseline });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script>');
  });

  it.each(LOCALES)('keeps the same rows in %s', (locale) => {
    const html = render({ locale });
    expect(attribute(html, 'data-party')).toEqual(['P1', 'P2', 'P3', 'P4']);
    expect(attribute(html, 'data-group')).toEqual(['G1', 'G2', 'G3', 'G4']);
    const tr = translator(locale);
    expect(html).toContain(escapeText(tr('compare.totals')));
    const valid = block(html, 'data-total="valid"', 'tr');
    expect(cell(valid, 'change')).toBe(formatChange(locale, '-75000'));
  });
});

describe('coalition comparison', () => {
  const t = translator('en');

  it('lists coalitions that appear and both outcomes', () => {
    const html = render({
      baseline: section8Input(),
      current: eligibleInput(),
    });
    const section = block(html, 'data-section="compare-coalitions"', 'section');
    expect(textOf(block(section, 'data-coalition-side="baseline"', 'dd'))).toBe(
      t('coalition.status.deadlock'),
    );
    expect(textOf(block(section, 'data-coalition-side="current"', 'dd'))).toBe(
      t('coalition.status.feasible'),
    );
    const table = block(section, 'data-table="compare-coalitions"', 'table');
    expect(attribute(table, 'data-coalition')).toEqual(['P2+P3', 'P1+P3']);
    expect(attribute(table, 'data-presence')).toEqual(['added', 'added']);
    const row = block(table, 'data-coalition="P2\\+P3"', 'tr');
    expect(textOf(row)).toContain('Party P2');
    expect(textOf(row)).toContain('Party P3');
    expect(cell(row, 'seats-baseline')).toBe(t('results.empty'));
    expect(cell(row, 'seats-current')).toBe('68');
    expect(attribute(html, 'data-note')).not.toContain('coalitions-pending');
    expect(attribute(html, 'data-note')).not.toContain('inconclusive');
  });

  it('shows an empty note when neither side has a coalition', () => {
    const html = render({
      baseline: section8Input(),
      current: section8Input(),
    });
    expect(attribute(html, 'data-empty')).toContain('compare-coalitions');
    expect(html).not.toContain('data-table="compare-coalitions"');
  });

  it('waits for a search that is still running', () => {
    const html = render({
      baselineRun: { state: 'running', nodesVisited: 0, budget: 1_000_000 },
    });
    const baseline = block(html, 'data-coalition-side="baseline"', 'dd');
    expect(openTag(baseline, 'data-coalition-side="baseline"')).toContain(
      'data-run="running"',
    );
    expect(textOf(baseline)).toBe(t('compare.coalitions.pending'));
    expect(attribute(html, 'data-note')).toContain('coalitions-pending');
    expect(html).not.toContain('data-table="compare-coalitions"');
  });

  it.each([
    ['cancelled', { state: 'cancelled' }, 'coalition.cancelled'],
    ['failed', { state: 'failed', message: 'boom' }, 'coalition.failed'],
    ['idle', { state: 'idle' }, 'compare.coalitions.pending'],
  ] as const)('reports a %s current search', (state, run, key) => {
    const html = render({ currentRun: run as CoalitionRun });
    const current = block(html, 'data-coalition-side="current"', 'dd');
    expect(openTag(current, 'data-coalition-side="current"')).toContain(
      `data-run="${state}"`,
    );
    expect(textOf(current)).toBe(t(key));
    expect(html).not.toContain('data-table="compare-coalitions"');
  });

  it('warns when a truncated search cannot prove a change', () => {
    const run = done(eligibleInput());
    if (run.state !== 'done') {
      throw new Error('expected a finished run');
    }
    const truncated: CoalitionRun = {
      ...run,
      analysis: { ...run.analysis, complete: false, status: 'unknown' },
    };
    const html = render({
      baseline: eligibleInput(),
      current: eligibleInput(),
      currentRun: truncated,
    });
    expect(attribute(html, 'data-note')).toContain('inconclusive');
    expect(html).toContain(escapeText(t('compare.coalitions.inconclusive')));
  });

  it('warns when a side lists only the first of its coalitions', () => {
    const run = done(eligibleInput());
    if (run.state !== 'done') {
      throw new Error('expected a finished run');
    }
    const cut: CoalitionRun = {
      ...run,
      minimalWinningTotal: run.analysis.minimalWinning.length + 1,
    };
    const html = render({
      baseline: eligibleInput(),
      current: eligibleInput(),
      baselineRun: cut,
    });
    expect(attribute(html, 'data-note')).toContain('inconclusive');
    const whole = render({
      baseline: eligibleInput(),
      current: eligibleInput(),
      baselineRun: {
        ...run,
        minimalWinningTotal: run.analysis.minimalWinning.length,
      },
    });
    expect(attribute(whole, 'data-note')).not.toContain('inconclusive');
  });
});

describe('compare panel in the app', () => {
  it('shows the empty compare view before a baseline is saved', () => {
    const html = renderToString(
      <App store={createStore({ view: 'compare', language: 'en' })} />,
    );
    expect(attribute(html, 'data-compare')).toEqual(['empty']);
    expect(html).not.toContain('class="placeholder"');
  });

  it('shows the comparison once a baseline is saved', () => {
    const store = createStore({ view: 'compare', language: 'en' });
    store.saveBaseline();
    const html = renderToString(<App store={store} />);
    expect(attribute(html, 'data-compare')).toEqual(['ready']);
    expect(html).toContain('data-table="compare-parties"');
  });

  it('shows no comparison for an invalid scenario', () => {
    const store = createStore({ view: 'compare', language: 'en' });
    store.saveBaseline();
    store.setInput('not a scenario');
    const html = renderToString(<App store={store} />);
    expect(html).not.toContain('data-compare=');
  });
});
