import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { buildCompositionReport } from '../../src/engine/composition';
import { LIMITS } from '../../src/engine/schema';
import { LOCALES, translator, type Locale } from '../../src/i18n';
import { formatChange, formatDecimal } from '../../src/i18n/format';
import { ru } from '../../src/i18n/ru';
import { App } from '../../src/ui/App';
import { CATALOG_GROUPS } from '../../src/ui/catalog';
import {
  GROUP_PALETTE,
  groupColor,
  groupColorOf,
} from '../../src/ui/groupColors';
import { presetInput } from '../../src/ui/presets';
import { createStore, type AppState } from '../../src/ui/store';
import {
  groupInput,
  partyInput,
  partyModeInput,
  rulesInput,
  scenarioInput,
  type Json,
} from '../engine/helpers/scenarios';

const t = translator('ru');

/** Section 14.2 fixture: lists X and Y in block K, an empty list Z. */
function fixture(growthA = '0'): Json {
  return scenarioInput({
    rules: rulesInput({ populationTotal: '1000', seatCount: 10 }),
    blocks: [{ id: 'K', name: 'Block K', color: '#224466' }],
    parties: [
      partyInput('X', 'K', 1),
      partyInput('Y', 'K', 2),
      partyInput('Z', null, 3),
    ],
    groups: [
      groupInput(
        'A',
        '0.6',
        { X: '0.8', Y: '0.2', Z: '0' },
        { turnout: '0.5', growthRate: growthA },
      ),
      groupInput('B', '0.4', { X: '0.2', Y: '0.8', Z: '0' }),
    ],
  });
}

function partyCompositionFixture(): Json {
  const input = partyModeInput(
    [
      ['1', '2'],
      ['1', '2'],
    ],
    { turnout: '0.7', threshold: '0' },
  );
  input.groups = [
    {
      id: 'G1',
      name: 'Group 1',
      notes: '',
      turnout: '0.7',
      growthRate: '0',
      turnoutChange: '0',
    },
    {
      id: 'G2',
      name: 'Group 2',
      notes: '',
      turnout: '0.7',
      growthRate: '0',
      turnoutChange: '0',
    },
    {
      id: 'G3',
      name: 'Other / unclassified',
      notes: '',
      turnout: '0.7',
      growthRate: '0',
      turnoutChange: '0',
    },
  ];
  input.blocks = [{ id: 'K', name: 'Block K', color: '#224466' }];
  const parties = input.parties as Json[];
  parties[0]!.blockId = 'K';
  parties[1]!.blockId = 'K';
  parties[0]!.composition = {
    G1: { numerator: '3', denominator: '4' },
    G2: { numerator: '1', denominator: '4' },
    G3: { numerator: '0', denominator: '1' },
  };
  return input;
}

function render(initial: Partial<AppState>): string {
  return renderToString(
    <App store={createStore({ language: 'ru', ...initial })} />,
  );
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

/** The markup of the first element carrying `pattern`, up to its close tag. */
function element(html: string, name: string, pattern: string): string {
  const match = new RegExp(
    `<${name}\\b[^>]*${pattern}[^>]*>[\\s\\S]*?</${name}>`,
  ).exec(html);
  if (match === null) {
    throw new Error(`missing ${name} ${pattern}`);
  }
  return match[0];
}

/** Text of the cell `data-cell="<cell>"` inside a row. */
function cell(row: string, name: string): string {
  const match = new RegExp(
    `<td\\b[^>]*data-cell="${name}"[^>]*>([\\s\\S]*?)</td>`,
  ).exec(row);
  if (match === null) {
    throw new Error(`missing cell ${name}`);
  }
  return (match[1] ?? '').replace(/<[^>]*>/g, '');
}

function table(html: string, name: string): string {
  return element(html, 'table', `data-table="${name}"`);
}

function row(html: string, attr: string, id: string): string {
  return element(html, 'tr', `${attr}="${id}"`);
}

const NEW_KEYS = [
  'view.composition',
  'view.future',
  'group.growthRate',
  'group.turnoutChange',
  'composition.target',
  'composition.caption',
  'composition.column.group',
  'composition.column.potentialShare',
  'composition.column.potential',
  'composition.column.validShare',
  'composition.column.valid',
  'composition.total',
  'composition.basis',
  'composition.noVotes',
  'future.year',
  'future.heading',
  'future.column.base',
  'future.column.year',
  'future.column.population',
  'future.totals',
  'future.note',
];

describe('new strings', () => {
  it.each(NEW_KEYS)('defines %s in Russian', (key) => {
    expect((ru as Record<string, string>)[key], key).toMatch(/\S/);
  });

  it('labels turnout change in percentage points, not percent', () => {
    expect((ru as Record<string, string>)['group.turnoutChange']).toMatch(
      /п\.\s?п\./,
    );
  });
});

describe('party-mode composition report', () => {
  it('shows an unknown party separately from the real Other group', () => {
    const html = render({
      input: partyCompositionFixture(),
      view: 'composition',
      compositionTarget: { kind: 'party', id: 'P2' },
    });
    expect(row(table(html, 'composition'), 'data-group', 'G3')).toContain(
      'Other / unclassified',
    );
    expect(
      cell(row(table(html, 'composition'), 'data-group', 'G3'), 'validShare'),
    ).toBe(t('results.empty'));
    const unknown = row(
      table(html, 'composition'),
      'data-composition',
      'unknown',
    );
    expect(cell(unknown, 'validShare')).toBe(formatDecimal('ru', '100.00'));
    expect(
      tag(html, 'data-demographic-status="unknown-party-composition"'),
    ).toBeTruthy();
    expect(tag(html, 'data-composition-basis="voters"')).toBeTruthy();
  });

  it('retains the partial block calculation but falls back to a visible party', () => {
    const store = createStore({
      language: 'ru',
      input: partyCompositionFixture(),
    });
    const { validation, result } = store.getDerived();
    if (!validation.ok || result === null) {
      throw new Error('Expected a valid party scenario');
    }
    const report = buildCompositionReport(validation.scenario, result.votes, {
      kind: 'block',
      id: 'K',
    });
    expect(report.rows.find((row) => row.groupId === 'G1')?.valid.share).toBe(
      '37.50',
    );
    expect(report.unknownComposition?.share).toBe('50.00');
    expect(report.rows.find((row) => row.groupId === 'G3')?.valid.share).toBe(
      '0.00',
    );
    const html = render({
      input: partyCompositionFixture(),
      view: 'composition',
      compositionTarget: { kind: 'block', id: 'K' },
    });
    const rows = table(html, 'composition');
    expect(cell(row(rows, 'data-group', 'G1'), 'validShare')).toBe(
      formatDecimal('ru', '75.00'),
    );
    expect(html).not.toContain('value="block:K"');
    expect(tag(html, 'value="party:P1"')).toContain('selected');
  });

  it('reports an inconsistent demographic assumption separately without hiding seats', () => {
    const input = partyCompositionFixture();
    const parties = input.parties as Json[];
    parties[1]!.composition = parties[0]!.composition;
    (input.groups as Json[])[0]!.turnout = '0.5';
    const html = render({ input, view: 'composition' });
    expect(
      tag(html, 'data-demographic-status="inconsistent-demographics"'),
    ).toBeTruthy();
    expect(tag(html, 'data-result-state="ready"')).toBeTruthy();
    expect(table(html, 'composition')).toBeTruthy();
  });

  it('still states that a zero-vote party has an unknown composition', () => {
    const input = partyCompositionFixture();
    (input.parties as Json[])[0]!.voteShare = {
      numerator: '1',
      denominator: '1',
    };
    (input.parties as Json[])[1]!.voteShare = {
      numerator: '0',
      denominator: '1',
    };
    const html = render({
      input,
      view: 'composition',
      compositionTarget: { kind: 'party', id: 'P2' },
    });
    expect(tag(html, 'data-composition-state="unknown"')).toBeTruthy();
    expect(tag(html, 'data-composition="no-votes"')).toBeTruthy();
  });
});

describe('group colours', () => {
  it('has a palette of distinct colours', () => {
    expect(GROUP_PALETTE.length).toBeGreaterThanOrEqual(6);
    expect(new Set(GROUP_PALETTE).size).toBe(GROUP_PALETTE.length);
    for (const color of GROUP_PALETTE) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('picks by position and wraps around', () => {
    expect(groupColor(0)).toBe(GROUP_PALETTE[0]);
    expect(groupColor(1)).toBe(GROUP_PALETTE[1]);
    expect(groupColor(GROUP_PALETTE.length)).toBe(GROUP_PALETTE[0]);
    expect(groupColor(LIMITS.groups - 1)).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('gives a catalog group its catalog colour at any position', () => {
    expect(CATALOG_GROUPS).toHaveLength(7);
    for (const [index, group] of CATALOG_GROUPS.entries()) {
      expect(groupColorOf(group.id, index)).toBe(group.color);
      expect(groupColorOf(group.id, index + 3)).toBe(group.color);
    }
  });

  it('gives any other group the palette colour of its position', () => {
    expect(groupColorOf('A', 0)).toBe(groupColor(0));
    expect(groupColorOf('G7', 6)).toBe(groupColor(6));
    expect(groupColorOf('Secular', 2)).toBe(groupColor(2));
    expect(groupColorOf('constructor', 1)).toBe(groupColor(1));
  });
});

/** Two catalog groups out of their catalog order, then a plain group. */
function catalogFixture(): Json {
  return scenarioInput({
    rules: rulesInput({ populationTotal: '1000', seatCount: 10 }),
    parties: [partyInput('X', null, 1), partyInput('Y', null, 2)],
    groups: [
      groupInput('arab', '0.5', { X: '0.5', Y: '0.5' }),
      groupInput('secular', '0.3', { X: '0.5', Y: '0.5' }),
      groupInput('Q', '0.2', { X: '0.5', Y: '0.5' }),
    ],
  });
}

function catalogColor(id: string): string {
  const color = CATALOG_GROUPS.find((group) => group.id === id)?.color;
  if (color === undefined) {
    throw new Error(`no catalog group ${id}`);
  }
  return color;
}

describe('catalog group colours in the views', () => {
  it.each(['composition', 'future'] as const)(
    'marks catalog groups in %s by ID and the rest by position',
    (view) => {
      const html = render({ input: catalogFixture(), view });
      const name = view === 'composition' ? 'composition' : 'future-groups';
      const rows = table(html, name);
      const marker = (id: string) =>
        tag(row(rows, 'data-group', id), 'class="swatch swatch--group"');
      expect(marker('arab')).toContain(`background:${catalogColor('arab')}`);
      expect(marker('secular')).toContain(
        `background:${catalogColor('secular')}`,
      );
      expect(marker('Q')).toContain(`background:${groupColor(2)}`);
    },
  );

  it('colours the six groups of the Israeli example from the catalog', () => {
    const html = render({
      input: presetInput('israelExample'),
      view: 'composition',
    });
    const rows = table(html, 'composition');
    // The six-group example keeps its Section 14.4 groups (M7-15).
    for (const group of CATALOG_GROUPS.filter(
      (group) => group.id !== 'knitted-kippot',
    )) {
      expect(
        tag(row(rows, 'data-group', group.id), 'class="swatch swatch--group"'),
      ).toContain(`background:${group.color}`);
    }
  });
});

describe('composition view', () => {
  it('lists only parties and starts on the first party', () => {
    const html = render({ input: fixture(), view: 'composition' });
    const select = element(html, 'select', 'data-composition-target');
    expect(attribute(select, 'value')).toEqual([
      'party:X',
      'party:Y',
      'party:Z',
    ]);
    expect(tag(select, 'value="party:X"')).toContain('selected');
    expect(tag(html, 'data-composition-target')).toContain(
      `aria-label="${escapeText(t('composition.target'))}"`,
    );
  });

  it('shows both bases per group with exact rounded values', () => {
    const html = render({ input: fixture(), view: 'composition' });
    const rows = table(html, 'composition');
    const a = row(rows, 'data-group', 'A');
    expect(cell(a, 'potentialShare')).toBe(formatDecimal('ru', '85.71'));
    expect(cell(a, 'potential')).toBe(formatDecimal('ru', '480'));
    expect(cell(a, 'validShare')).toBe(formatDecimal('ru', '75.00'));
    expect(cell(a, 'valid')).toBe(formatDecimal('ru', '240'));
    const b = row(rows, 'data-group', 'B');
    expect(cell(b, 'validShare')).toBe(formatDecimal('ru', '25.00'));
    const total = row(rows, 'data-row', 'total');
    expect(cell(total, 'potential')).toBe(formatDecimal('ru', '560'));
    expect(cell(total, 'valid')).toBe(formatDecimal('ru', '320'));
  });

  it('marks each group with a round marker in its palette colour', () => {
    const html = render({ input: fixture(), view: 'composition' });
    const a = row(table(html, 'composition'), 'data-group', 'A');
    const marker = tag(a, 'class="swatch swatch--group"');
    expect(marker).toContain(`background:${groupColor(0)}`);
    const b = row(table(html, 'composition'), 'data-group', 'B');
    expect(tag(b, 'class="swatch swatch--group"')).toContain(
      `background:${groupColor(1)}`,
    );
  });

  it('defines the two bases', () => {
    const html = render({ input: fixture(), view: 'composition' });
    expect(html).toContain(escapeText(t('composition.basis')));
  });

  it('falls back to the first party when a legacy block was selected', () => {
    const html = render({
      input: fixture(),
      view: 'composition',
      compositionTarget: { kind: 'block', id: 'K' },
    });
    expect(
      tag(
        element(html, 'select', 'data-composition-target'),
        'value="party:X"',
      ),
    ).toContain('selected');
    const a = row(table(html, 'composition'), 'data-group', 'A');
    expect(cell(a, 'validShare')).toBe(formatDecimal('ru', '75.00'));
    expect(html).not.toContain('value="block:K"');
    expect(html).toContain(
      escapeText(t('composition.caption', { name: 'Party X' })),
    );
  });

  it('falls back to the first party when the target is gone', () => {
    const html = render({
      input: fixture(),
      view: 'composition',
      compositionTarget: { kind: 'party', id: 'Q' },
    });
    expect(
      tag(
        element(html, 'select', 'data-composition-target'),
        'value="party:X"',
      ),
    ).toContain('selected');
  });

  it('says so when the list has no votes and leaves shares empty', () => {
    const html = render({
      input: fixture(),
      view: 'composition',
      compositionTarget: { kind: 'party', id: 'Z' },
    });
    expect(tag(html, 'data-composition="no-votes"')).toBeTruthy();
    expect(html).toContain(escapeText(t('composition.noVotes')));
    const a = row(table(html, 'composition'), 'data-group', 'A');
    expect(cell(a, 'validShare')).toBe(t('results.empty'));
    expect(cell(a, 'potentialShare')).toBe(t('results.empty'));
  });

  it('shows nothing for invalid input', () => {
    const input = { ...fixture(), rules: { seatCount: -1 } };
    const html = render({ input, view: 'composition' });
    expect(html).not.toContain('data-table="composition"');
  });
});

describe('future view', () => {
  it('offers years 0 to 20 and starts at 4', () => {
    const html = render({ input: fixture(), view: 'future' });
    const select = element(html, 'select', 'data-future-year');
    const years = Array.from(
      { length: LIMITS.projectionYears + 1 },
      (_, year) => `${year}`,
    );
    expect(attribute(select, 'value')).toEqual(years);
    expect(tag(select, 'value="4"')).toContain('selected');
    expect(tag(html, 'data-future-year')).toContain(
      `aria-label="${escapeText(t('future.year'))}"`,
    );
    const slider = tag(html, 'data-future-slider');
    expect(slider).toContain('type="range"');
    expect(slider).toContain('min="0"');
    expect(slider).toContain(`max="${LIMITS.projectionYears}"`);
    expect(slider).toContain('step="1"');
    expect(slider).toContain('value="4"');
  });

  it('shows year 0 beside year 1 with the change', () => {
    const html = render({
      input: fixture('0.1'),
      view: 'future',
      futureYear: 1,
    });
    expect(html).toContain(escapeText(t('future.column.year', { year: 1 })));
    const totals = table(html, 'future-totals');
    const turnout = row(totals, 'data-total', 'turnout');
    expect(cell(turnout, 'baseline')).toBe(formatDecimal('ru', '70.00'));
    expect(cell(turnout, 'current')).toBe(formatDecimal('ru', '68.87'));
    expect(cell(turnout, 'change')).toBe(formatChange('ru', '-1.13'));
    const population = row(totals, 'data-total', 'population');
    expect(cell(population, 'current')).toBe(formatDecimal('ru', '1060'));

    const a = row(table(html, 'future-groups'), 'data-group', 'A');
    expect(cell(a, 'population-baseline')).toBe(formatDecimal('ru', '600'));
    expect(cell(a, 'population-current')).toBe(formatDecimal('ru', '660'));
    expect(cell(a, 'population-change')).toBe(formatChange('ru', '60'));
    expect(cell(a, 'turnout-current')).toBe(formatDecimal('ru', '50.00'));

    const x = row(table(html, 'future-parties'), 'data-party', 'X');
    expect(cell(x, 'votes-baseline')).toBe(formatDecimal('ru', '320'));
    expect(cell(x, 'votes-current')).toBe(formatDecimal('ru', '344'));
    expect(cell(x, 'votes-change')).toBe(formatChange('ru', '24'));
    expect(cell(x, 'seats-current')).toBe('5');
  });

  it('marks group rows with the group colour', () => {
    const html = render({ input: fixture(), view: 'future' });
    const b = row(table(html, 'future-groups'), 'data-group', 'B');
    expect(tag(b, 'class="swatch swatch--group"')).toContain(
      `background:${groupColor(1)}`,
    );
  });

  it('states the allocation of the chosen year', () => {
    const html = render({ input: fixture(), view: 'future', futureYear: 2 });
    const state = tag(html, 'data-future-state');
    expect(state).toContain('data-future-state="ready"');
    expect(html).toContain(escapeText(t('future.heading', { year: 2 })));
  });

  it('reports a year without an allocation', () => {
    const input = scenarioInput({
      rules: rulesInput({ populationTotal: '1000', seatCount: 10 }),
      parties: [partyInput('X', null, 1)],
      groups: [groupInput('A', '1', { X: '1' }, { growthRate: '-1' })],
    });
    const html = render({ input, view: 'future', futureYear: 1 });
    expect(tag(html, 'data-future-state')).toContain(
      'data-future-state="no-allocation"',
    );
    expect(html).toContain(escapeText(t('status.noAllocation.no-valid-votes')));
  });

  it('notes that coalitions are not computed for future years', () => {
    const html = render({ input: fixture(), view: 'future' });
    expect(tag(html, 'data-future-note')).toBeTruthy();
    expect(html).toContain(escapeText(t('future.note')));
  });

  it('shows nothing for invalid input', () => {
    const input = { ...fixture(), rules: { seatCount: -1 } };
    const html = render({ input, view: 'future' });
    expect(html).not.toContain('data-table="future-parties"');
  });

  it('explains why a party-first demographic projection is unavailable', () => {
    const input = partyModeInput([
      ['1', '2'],
      ['1', '2'],
    ]);
    const html = render({ input, view: 'future' });
    expect(
      tag(html, 'data-projection-unavailable="unknown-party-composition"'),
    ).toBeTruthy();
    expect(html).toContain(
      escapeText(t('future.unavailable.unknown-party-composition')),
    );
    expect(html).not.toContain('data-table="future-parties"');
  });
});

describe('both views in every language', () => {
  it.each(LOCALES)('%s renders its own labels', (locale: Locale) => {
    const tr = translator(locale);
    const composition = render({
      input: fixture(),
      view: 'composition',
      language: locale,
    });
    expect(composition).toContain(escapeText(tr('composition.column.valid')));
    expect(composition).toContain(escapeText(tr('view.composition')));
    const future = render({
      input: fixture(),
      view: 'future',
      language: locale,
    });
    expect(future).toContain(escapeText(tr('future.note')));
    expect(future).toContain(escapeText(tr('view.future')));
  });

  it.each(LOCALES)('%s formats the numbers for its locale', (locale) => {
    const html = render({
      input: fixture('0.1'),
      view: 'future',
      futureYear: 1,
      language: locale,
    });
    const turnout = row(table(html, 'future-totals'), 'data-total', 'turnout');
    expect(cell(turnout, 'current')).toBe(formatDecimal(locale, '68.87'));
  });
});
