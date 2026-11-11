import { renderToString } from 'preact-render-to-string';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_NODE_BUDGET,
  evaluateCoalition,
  type CoalitionAnalysis,
} from '../../src/engine/coalitions';
import { runScenario, runSeats } from '../../src/engine/run';
import type { Scenario } from '../../src/engine/schema';
import { LOCALES, TABLES, translator, type Locale } from '../../src/i18n';
import { formatInteger } from '../../src/i18n/format';
import { App } from '../../src/ui/App';
import {
  LISTED_COALITIONS,
  runCoalitionRequest,
  type CoalitionRun,
} from '../../src/ui/coalitionRunner';
import { Coalitions } from '../../src/ui/Coalitions';
import { createStore } from '../../src/ui/store';
import {
  buildScenario,
  rulesInput,
  section8Input,
  type Json,
} from '../engine/helpers/scenarios';

const KEYS = [
  'coalition.status.feasible',
  'coalition.status.deadlock',
  'coalition.status.unknown',
  'coalition.status.no-allocation',
  'coalition.source.party',
  'coalition.source.block',
  'coalition.source.refusal',
  'coalition.idle',
  'coalition.searching',
  'coalition.progress',
  'coalition.cancel',
  'coalition.rerun',
  'coalition.cancelled',
  'coalition.failed',
  'coalition.inPage',
  'coalition.summary.status',
  'coalition.summary.search',
  'coalition.summary.majority',
  'coalition.summary.eligible',
  'coalition.summary.nodes',
  'coalition.complete',
  'coalition.incomplete.budget',
  'coalition.incomplete.eligible',
  'coalition.overridden',
  'coalition.minimalWinning',
  'coalition.noneFound',
  'coalition.rowLimit',
  'coalition.column.members',
  'coalition.column.seats',
  'coalition.column.margin',
  'coalition.column.opposition',
  'coalition.balancing',
  'coalition.forbidden',
  'coalition.noForbidden',
  'coalition.choose',
  'coalition.evaluation.seats',
  'coalition.evaluation.margin',
  'coalition.evaluation.opposition',
  'coalition.evaluation.reachesMajority',
  'coalition.evaluation.feasible',
  'coalition.evaluation.minimal',
  'coalition.evaluation.ineligible',
  'coalition.evaluation.forbidden',
  'coalition.yes',
  'coalition.no',
  'coalition.none',
  'coalition.larger',
  'coalition.larger.none',
  'coalition.larger.partial',
  'coalition.blocked',
  'coalition.blocked.intro',
  'coalition.blocked.none',
  'coalition.blocked.partial',
  'coalition.column.reason',
  'coalition.reason.forbidden',
  'coalition.reason.ineligible',
  'coalition.pivotal',
  'coalition.pivotal.intro',
  'coalition.pivotal.none',
  'coalition.pivotal.partial',
  'coalition.pivotal.atLeast',
  'coalition.column.party',
  'coalition.column.coalitions',
  'coalition.column.indispensable',
  'coalition.unknown',
  'editor.coalitionRules',
  'pairs.incompatiblePartyPairs',
  'pairs.incompatibleBlockPairs',
  'pairs.compatiblePartyOverrides',
  'pairs.partyRefusals',
  'pairs.effective',
  'pairs.first',
  'pairs.second',
  'pairs.refuser',
  'pairs.refused',
  'pairs.add',
  'pairs.addRefusal',
  'pairs.remove',
  'pairs.removeRefusal',
  'pairs.allow',
  'pairs.empty',
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

function eligibleInput(): Json {
  const input = section8Input();
  const parties = (input.parties as Json[]).map((party) => ({
    ...party,
    canJoinGovernment: true,
  }));
  return { ...input, parties };
}

interface Case {
  readonly scenario: Scenario;
  readonly analysis: CoalitionAnalysis;
}

function caseOf(input: Json): Case {
  const scenario = buildScenario(input);
  return { scenario, analysis: runScenario(scenario).coalitions };
}

function nameOf(scenario: Scenario, id: string): string {
  const party = scenario.parties.find((entry) => entry.id === id);
  if (party === undefined) {
    throw new Error(`unknown party ${id}`);
  }
  return party.name;
}

interface RenderOptions {
  readonly run?: CoalitionRun;
  readonly selection?: readonly string[];
  readonly locale?: Locale;
}

function render(scenario: Scenario, options: RenderOptions = {}): string {
  const locale = options.locale ?? 'en';
  const run: CoalitionRun = options.run ?? {
    state: 'done',
    analysis: runScenario(scenario).coalitions,
    inPage: false,
  };
  return renderToString(
    <Coalitions
      scenario={scenario}
      seats={runSeats(scenario)}
      run={run}
      selection={options.selection ?? []}
      locale={locale}
      t={translator(locale)}
      onCancel={vi.fn()}
      onRerun={vi.fn()}
      onToggle={vi.fn()}
    />,
  );
}

type DoneRun = Extract<CoalitionRun, { state: 'done' }>;

/** The finished run the real worker body produces, lists on request included. */
function workerRun(scenario: Scenario): DoneRun {
  const runs: DoneRun[] = [];
  runCoalitionRequest({ id: 1, scenario }, (message) => {
    if (message.type === 'done') {
      runs.push({
        state: 'done',
        analysis: message.analysis,
        inPage: false,
        minimalWinningTotal: message.minimalWinningTotal,
        extras: message.extras,
      });
    }
  });
  if (runs[0] === undefined) {
    throw new Error('expected a finished run');
  }
  return runs[0];
}

function withExtras(
  run: DoneRun,
  change: Partial<NonNullable<DoneRun['extras']>>,
): DoneRun {
  if (run.extras === undefined) {
    throw new Error('expected the lists on request');
  }
  return { ...run, extras: { ...run.extras, ...change } };
}

describe('coalition strings', () => {
  it.each(LOCALES)('defines every coalition key in %s', (locale) => {
    const table = TABLES[locale] as Record<string, string>;
    for (const key of KEYS) {
      expect(table[key], `${locale} ${key}`).toMatch(/\S/);
    }
  });
});

describe('coalition search states', () => {
  const t = translator('en');
  const { scenario } = caseOf(section8Input());

  it('shows the idle note before a search', () => {
    const html = render(scenario, { run: { state: 'idle' } });
    expect(attribute(html, 'data-coalitions')).toEqual(['idle']);
    expect(attribute(html, 'data-note')).toEqual(['idle']);
  });

  it('shows progress and a cancel button while searching', () => {
    const html = render(scenario, {
      run: {
        state: 'running',
        nodesVisited: 40_000,
        budget: DEFAULT_NODE_BUDGET,
      },
    });
    expect(attribute(html, 'data-coalitions')).toEqual(['running']);
    const progress = openTag(html, 'data-progress="coalitions"');
    expect(progress).toContain('value="40000"');
    expect(progress).toContain(`max="${DEFAULT_NODE_BUDGET}"`);
    expect(html).toContain(
      escapeText(
        t('coalition.searching', { nodes: formatInteger('en', 40_000) }),
      ),
    );
    expect(attribute(html, 'data-action')).toEqual(['cancel-coalitions']);
  });

  it.each(['cancelled', 'failed'] as const)(
    'offers to run again when %s',
    (state) => {
      const run: CoalitionRun =
        state === 'failed' ? { state, message: 'boom' } : { state };
      const html = render(scenario, { run });
      expect(attribute(html, 'data-coalitions')).toEqual([state]);
      expect(attribute(html, 'data-note')).toEqual([state]);
      expect(attribute(html, 'data-action')).toEqual(['rerun-coalitions']);
      expect(html).not.toContain('data-table="minimal-winning"');
    },
  );

  it('says how many coalitions were found when only the first are listed', () => {
    const { analysis } = caseOf(eligibleInput());
    const html = render(scenario, {
      run: {
        state: 'done',
        analysis,
        inPage: false,
        minimalWinningTotal: 348_096,
      },
    });
    expect(attribute(html, 'data-note')).toEqual(['row-limit']);
    expect(html).toContain(
      escapeText(
        t('coalition.rowLimit', {
          shown: formatInteger('en', LISTED_COALITIONS),
          total: formatInteger('en', 348_096),
        }),
      ),
    );
  });

  it('notes a search that ran in the page', () => {
    const { analysis } = caseOf(section8Input());
    const html = render(scenario, {
      run: { state: 'done', analysis, inPage: true },
    });
    expect(attribute(html, 'data-note')).toEqual(['in-page']);
    expect(render(scenario)).not.toContain('data-note=');
  });
});

describe('coalition analysis view', () => {
  const t = translator('en');

  it('shows a deadlock with its forbidden pair and no winners', () => {
    const { scenario, analysis } = caseOf(section8Input());
    expect(analysis.status).toBe('deadlock');
    const html = render(scenario);
    expect(attribute(html, 'data-coalitions')).toEqual(['done']);
    expect(textOf(block(html, 'data-coalition-summary="status"', 'dd'))).toBe(
      t('coalition.status.deadlock'),
    );
    expect(textOf(block(html, 'data-coalition-summary="search"', 'dd'))).toBe(
      t('coalition.complete'),
    );
    expect(textOf(block(html, 'data-coalition-summary="majority"', 'dd'))).toBe(
      formatInteger('en', analysis.majorityRequired),
    );
    expect(textOf(block(html, 'data-coalition-summary="nodes"', 'dd'))).toBe(
      formatInteger('en', analysis.nodesVisited),
    );
    expect(attribute(html, 'data-empty')).toContain('minimal-winning');
    expect(attribute(html, 'data-forbidden')).toEqual(['P1|P2']);
    expect(attribute(html, 'data-source')).toEqual(['party']);
    const eligible = textOf(
      block(html, 'data-coalition-summary="eligible"', 'dd'),
    );
    for (const id of analysis.eligiblePartyIds) {
      expect(eligible).toContain(nameOf(scenario, id));
    }
    expect(eligible).not.toContain(nameOf(scenario, 'P3'));
  });

  it('lists minimal winning coalitions and the balancing party', () => {
    const { scenario, analysis } = caseOf(eligibleInput());
    expect(analysis.status).toBe('feasible');
    const html = render(scenario);
    expect(attribute(html, 'data-coalition')).toEqual(
      analysis.minimalWinning.map((coalition) => coalition.partyIds.join('+')),
    );
    for (const coalition of analysis.minimalWinning) {
      const row = block(
        html,
        `data-coalition="${coalition.partyIds.join('\\+')}"`,
        'tr',
      );
      expect(textOf(block(row, 'data-cell="seats"', 'td'))).toBe(
        formatInteger('en', coalition.seats),
      );
      expect(textOf(block(row, 'data-cell="margin"', 'td'))).toBe(
        formatInteger('en', coalition.margin),
      );
      expect(textOf(block(row, 'data-cell="opposition"', 'td'))).toBe(
        formatInteger('en', coalition.opposition),
      );
      const members = block(row, 'data-cell="members"', 'td');
      for (const id of coalition.partyIds) {
        expect(members).toContain(
          `<bdi>${escapeText(nameOf(scenario, id))}</bdi>`,
        );
      }
    }
    expect(attribute(html, 'data-balancing-party')).toEqual([
      ...analysis.balancingPartyIds,
    ]);
    expect(textOf(block(html, 'data-coalition-summary="status"', 'dd'))).toBe(
      t('coalition.status.feasible'),
    );
  });

  it('marks an overridden majority', () => {
    const input = eligibleInput();
    const { scenario, analysis } = caseOf({
      ...input,
      rules: rulesInput({ majorityMode: 'override', majorityOverride: 70 }),
    });
    expect(analysis.majorityOverridden).toBe(true);
    const majority = textOf(
      block(render(scenario), 'data-coalition-summary="majority"', 'dd'),
    );
    expect(majority).toContain(formatInteger('en', 70));
    expect(majority).toContain(t('coalition.overridden'));
  });

  it('explains an incomplete search stopped by the budget', () => {
    const { scenario, analysis } = caseOf(eligibleInput());
    const html = render(scenario, {
      run: {
        state: 'done',
        analysis: { ...analysis, complete: false, status: 'unknown' },
        inPage: false,
      },
    });
    expect(textOf(block(html, 'data-coalition-summary="search"', 'dd'))).toBe(
      t('coalition.incomplete.budget'),
    );
    expect(textOf(block(html, 'data-coalition-summary="status"', 'dd'))).toBe(
      t('coalition.status.unknown'),
    );
  });

  it('explains an incomplete search with too many eligible parties', () => {
    const { scenario, analysis } = caseOf(eligibleInput());
    const many = Array.from({ length: 21 }, (_, index) => `X${index}`);
    const html = render(scenario, {
      run: {
        state: 'done',
        analysis: { ...analysis, complete: false, eligiblePartyIds: many },
        inPage: false,
      },
    });
    expect(textOf(block(html, 'data-coalition-summary="search"', 'dd'))).toBe(
      t('coalition.incomplete.eligible'),
    );
  });

  it('hides winners and the chooser when there is no allocation', () => {
    const input = section8Input();
    const groups = (input.groups as Json[]).map((group) => ({
      ...group,
      turnout: '0',
    }));
    const { scenario, analysis } = caseOf({ ...input, groups });
    expect(analysis.status).toBe('no-allocation');
    const html = render(scenario);
    expect(textOf(block(html, 'data-coalition-summary="status"', 'dd'))).toBe(
      t('coalition.status.no-allocation'),
    );
    expect(html).not.toContain('data-table="minimal-winning"');
    expect(html).not.toContain('data-list="balancing"');
    expect(html).not.toContain('data-chooser');
    expect(attribute(html, 'data-forbidden')).toEqual(['P1|P2']);
  });

  it('shows the empty forbidden note without pairs', () => {
    const input = eligibleInput();
    const { scenario } = caseOf({
      ...input,
      coalitionRules: {
        incompatiblePartyPairs: [],
        incompatibleBlockPairs: [],
        compatiblePartyOverrides: [],
      },
    });
    const html = render(scenario);
    expect(attribute(html, 'data-empty')).toContain('forbidden');
    expect(html).not.toContain('data-forbidden=');
  });
});

describe('coalitions on request', () => {
  const t = translator('en');

  it('shows both lists as closed disclosures with their counts', () => {
    const { scenario } = caseOf(section8Input());
    const html = render(scenario, { run: workerRun(scenario) });
    for (const name of ['larger', 'blocked']) {
      const tag = openTag(html, `data-extra="${name}"`);
      expect(tag).toMatch(/^<details/);
      expect(tag).not.toMatch(/\sopen/);
    }
    expect(textOf(block(html, 'data-extra="larger"', 'summary'))).toBe(
      t('coalition.larger', { count: formatInteger('en', 0) }),
    );
    expect(textOf(block(html, 'data-extra="blocked"', 'summary'))).toBe(
      t('coalition.blocked', { count: formatInteger('en', 3) }),
    );
    const winners = html.indexOf('data-empty="minimal-winning"');
    const larger = html.indexOf('data-extra="larger"');
    const blocked = html.indexOf('data-extra="blocked"');
    const forbidden = html.indexOf('data-list="forbidden"');
    expect(winners).toBeLessThan(larger);
    expect(larger).toBeLessThan(blocked);
    expect(blocked).toBeLessThan(forbidden);
  });

  it('lists the blocked baseline majorities with their reasons', () => {
    const { scenario } = caseOf(section8Input());
    const run = workerRun(scenario);
    const html = render(scenario, { run });
    const details = block(html, 'data-extra="blocked"', 'details');
    expect(details).toContain(escapeText(t('coalition.blocked.intro')));
    expect(attribute(details, 'data-blocked')).toEqual([
      'P1+P2',
      'P2+P3',
      'P1+P3',
    ]);
    for (const entry of run.extras?.blocked ?? []) {
      const row = block(
        details,
        `data-blocked="${entry.partyIds.join('\\+')}"`,
        'tr',
      );
      expect(textOf(block(row, 'data-cell="seats"', 'td'))).toBe(
        formatInteger('en', entry.seats),
      );
      const members = block(row, 'data-cell="members"', 'td');
      for (const id of entry.partyIds) {
        expect(members).toContain(
          `<bdi>${escapeText(nameOf(scenario, id))}</bdi>`,
        );
      }
    }
    const pairRow = block(details, 'data-blocked="P1\\+P2"', 'tr');
    expect(textOf(block(pairRow, 'data-reason="forbidden"', 'li'))).toBe(
      `${t('coalition.reason.forbidden')}: ${nameOf(scenario, 'P1')} – ${nameOf(scenario, 'P2')}`,
    );
    expect(pairRow).not.toContain('data-reason="ineligible"');
    const partyRow = block(details, 'data-blocked="P2\\+P3"', 'tr');
    expect(textOf(block(partyRow, 'data-reason="ineligible"', 'li'))).toBe(
      `${t('coalition.reason.ineligible')}: ${nameOf(scenario, 'P3')}`,
    );
    expect(partyRow).not.toContain('data-reason="forbidden"');
    const larger = block(html, 'data-extra="larger"', 'details');
    expect(attribute(larger, 'data-empty')).toEqual(['larger']);
    expect(larger).toContain(escapeText(t('coalition.larger.none')));
  });

  it('lists larger coalitions with seats, margin and opposition', () => {
    const { scenario } = caseOf(eligibleInput());
    const run = workerRun(scenario);
    const html = render(scenario, { run });
    const details = block(html, 'data-extra="larger"', 'details');
    expect(attribute(details, 'data-larger')).toEqual(['P2+P3+P4', 'P1+P3+P4']);
    for (const coalition of run.extras?.larger ?? []) {
      const row = block(
        details,
        `data-larger="${coalition.partyIds.join('\\+')}"`,
        'tr',
      );
      expect(textOf(block(row, 'data-cell="seats"', 'td'))).toBe(
        formatInteger('en', coalition.seats),
      );
      expect(textOf(block(row, 'data-cell="margin"', 'td'))).toBe(
        formatInteger('en', coalition.margin),
      );
      expect(textOf(block(row, 'data-cell="opposition"', 'td'))).toBe(
        formatInteger('en', coalition.opposition),
      );
    }
    expect(textOf(block(html, 'data-extra="larger"', 'summary'))).toBe(
      t('coalition.larger', { count: formatInteger('en', 2) }),
    );
  });

  it('says when a list is partial or cut at the row limit', () => {
    const { scenario } = caseOf(section8Input());
    const run = withExtras(workerRun(scenario), {
      largerComplete: false,
      blockedComplete: false,
      blockedTotal: 5_000,
    });
    const html = render(scenario, { run });
    const larger = block(html, 'data-extra="larger"', 'details');
    expect(attribute(larger, 'data-note')).toEqual(['larger-partial']);
    expect(larger).toContain(escapeText(t('coalition.larger.partial')));
    const blocked = block(html, 'data-extra="blocked"', 'details');
    expect(attribute(blocked, 'data-note')).toEqual([
      'blocked-partial',
      'row-limit',
    ]);
    expect(blocked).toContain(escapeText(t('coalition.blocked.partial')));
    expect(blocked).toContain(
      escapeText(
        t('coalition.rowLimit', {
          shown: formatInteger('en', LISTED_COALITIONS),
          total: formatInteger('en', 5_000),
        }),
      ),
    );
    expect(textOf(block(html, 'data-extra="blocked"', 'summary'))).toBe(
      t('coalition.blocked', { count: formatInteger('en', 5_000) }),
    );
  });

  it('says when no majority is blocked', () => {
    const { scenario } = caseOf({
      ...eligibleInput(),
      coalitionRules: {
        incompatiblePartyPairs: [],
        incompatibleBlockPairs: [],
        compatiblePartyOverrides: [],
      },
    });
    const html = render(scenario, { run: workerRun(scenario) });
    const blocked = block(html, 'data-extra="blocked"', 'details');
    expect(attribute(blocked, 'data-empty')).toEqual(['blocked']);
    expect(blocked).toContain(escapeText(t('coalition.blocked.none')));
    expect(blocked).not.toContain('data-blocked=');
  });

  it('hides the lists when there is no allocation or the result has none', () => {
    const input = section8Input();
    const groups = (input.groups as Json[]).map((group) => ({
      ...group,
      turnout: '0',
    }));
    const { scenario: empty } = caseOf({ ...input, groups });
    expect(render(empty, { run: workerRun(empty) })).not.toContain(
      'data-extra=',
    );
    const { scenario } = caseOf(section8Input());
    expect(render(scenario)).not.toContain('data-extra=');
  });

  it('keeps hostile party names inert', () => {
    const input = section8Input();
    (input.parties as Json[])[0]!.name = '<script>alert(1)</script>';
    const { scenario } = caseOf(input);
    const html = render(scenario, { run: workerRun(scenario) });
    const blocked = block(html, 'data-extra="blocked"', 'details');
    expect(blocked).toContain('<bdi>&lt;script>alert(1)&lt;/script></bdi>');
    expect(html).not.toContain('<script>');
  });

  it.each(LOCALES)('labels both lists in %s', (locale) => {
    const tr = translator(locale);
    const { scenario } = caseOf(section8Input());
    const html = render(scenario, { run: workerRun(scenario), locale });
    expect(textOf(block(html, 'data-extra="blocked"', 'summary'))).toBe(
      tr('coalition.blocked', { count: formatInteger(locale, 3) }),
    );
    expect(textOf(block(html, 'data-extra="larger"', 'summary'))).toBe(
      tr('coalition.larger', { count: formatInteger(locale, 0) }),
    );
    const blocked = block(html, 'data-extra="blocked"', 'details');
    expect(blocked).toContain(escapeText(tr('coalition.column.reason')));
    expect(blocked).toContain(escapeText(tr('coalition.reason.ineligible')));
  });
});

describe('pivotal parties view', () => {
  const t = translator('en');

  function zeroTurnout(): Case {
    return caseOf(section8Input('0'));
  }

  it('shows a closed disclosure after the balancing parties and before the larger list', () => {
    const { scenario } = zeroTurnout();
    const html = render(scenario, { run: workerRun(scenario) });
    const tag = openTag(html, 'data-extra="pivotal"');
    expect(tag).toMatch(/^<details/);
    expect(tag).not.toMatch(/\sopen/);
    expect(textOf(block(html, 'data-extra="pivotal"', 'summary'))).toBe(
      t('coalition.pivotal'),
    );
    const winners = html.indexOf('data-table="minimal-winning"');
    const balancing = html.indexOf('data-list="balancing"');
    const pivotal = html.indexOf('data-extra="pivotal"');
    const larger = html.indexOf('data-extra="larger"');
    expect(winners).toBeGreaterThan(-1);
    expect(winners).toBeLessThan(balancing);
    expect(balancing).toBeLessThan(pivotal);
    expect(pivotal).toBeLessThan(larger);
  });

  it('states the metric and counts each party with yes or no', () => {
    const { scenario } = zeroTurnout();
    const html = render(scenario, { run: workerRun(scenario) });
    const details = block(html, 'data-extra="pivotal"', 'details');
    expect(details).toContain(
      escapeText(
        t('coalition.pivotal.intro', { total: formatInteger('en', 2) }),
      ),
    );
    for (const key of [
      'coalition.column.party',
      'coalition.column.coalitions',
      'coalition.column.indispensable',
    ] as const) {
      expect(details).toContain(escapeText(t(key)));
    }
    expect(details.match(/scope="col"/g)).toHaveLength(3);
    expect(attribute(details, 'data-table')).toEqual(['pivotal']);
    expect(attribute(details, 'data-pivotal')).toEqual(['P4', 'P1', 'P2']);
    const expected: Record<string, readonly [number, string]> = {
      P4: [2, t('coalition.yes')],
      P1: [1, t('coalition.no')],
      P2: [1, t('coalition.no')],
    };
    for (const [id, [count, needed]] of Object.entries(expected)) {
      const row = block(details, `data-pivotal="${id}"`, 'tr');
      expect(row).toContain(`<bdi>${escapeText(nameOf(scenario, id))}</bdi>`);
      expect(textOf(block(row, 'data-cell="coalitions"', 'td'))).toBe(
        formatInteger('en', count),
      );
      expect(textOf(block(row, 'data-cell="indispensable"', 'td'))).toBe(
        needed,
      );
    }
    expect(details).not.toContain('data-note="pivotal-partial"');
    expect(details).not.toContain('data-empty="pivotal"');
  });

  it('takes the definition total from the full search, not the listed rows', () => {
    const { scenario } = zeroTurnout();
    const run: DoneRun = { ...workerRun(scenario), minimalWinningTotal: 9_610 };
    const details = block(
      render(scenario, { run }),
      'data-extra="pivotal"',
      'details',
    );
    expect(details).toContain(
      escapeText(
        t('coalition.pivotal.intro', { total: formatInteger('en', 9_610) }),
      ),
    );
  });

  it('shows lower-bound counts, unknown and a partial note for an incomplete search', () => {
    const { scenario } = zeroTurnout();
    const run = withExtras(workerRun(scenario), {
      pivotal: [
        { partyId: 'P4', coalitions: 2, indispensable: null },
        { partyId: 'P1', coalitions: 1, indispensable: false },
        { partyId: 'P2', coalitions: 0, indispensable: false },
      ],
      pivotalComplete: false,
    });
    const details = block(
      render(scenario, { run }),
      'data-extra="pivotal"',
      'details',
    );
    const top = block(details, 'data-pivotal="P4"', 'tr');
    expect(textOf(block(top, 'data-cell="coalitions"', 'td'))).toBe(
      t('coalition.pivotal.atLeast', { count: formatInteger('en', 2) }),
    );
    expect(textOf(block(top, 'data-cell="indispensable"', 'td'))).toBe(
      t('coalition.unknown'),
    );
    const other = block(details, 'data-pivotal="P2"', 'tr');
    expect(textOf(block(other, 'data-cell="coalitions"', 'td'))).toBe(
      t('coalition.pivotal.atLeast', { count: formatInteger('en', 0) }),
    );
    expect(textOf(block(other, 'data-cell="indispensable"', 'td'))).toBe(
      t('coalition.no'),
    );
    expect(attribute(details, 'data-note')).toContain('pivotal-partial');
    expect(details).toContain(escapeText(t('coalition.pivotal.partial')));
  });

  it('replaces the table with a sentence when no coalition was found', () => {
    const { scenario } = caseOf(section8Input());
    const run = workerRun(scenario);
    const details = block(
      render(scenario, { run }),
      'data-extra="pivotal"',
      'details',
    );
    expect(attribute(details, 'data-empty')).toEqual(['pivotal']);
    expect(details).toContain(escapeText(t('coalition.pivotal.none')));
    expect(details).not.toContain('data-pivotal=');
    expect(details).not.toContain('data-note="pivotal-partial"');
    const partial = block(
      render(scenario, {
        run: withExtras(run, { pivotalComplete: false }),
      }),
      'data-extra="pivotal"',
      'details',
    );
    expect(attribute(partial, 'data-empty')).toEqual(['pivotal']);
    expect(attribute(partial, 'data-note')).toContain('pivotal-partial');
  });

  it('hides the view when there is no allocation or the result has no lists', () => {
    const input = section8Input();
    const groups = (input.groups as Json[]).map((group) => ({
      ...group,
      turnout: '0',
    }));
    const { scenario: empty } = caseOf({ ...input, groups });
    expect(render(empty, { run: workerRun(empty) })).not.toContain(
      'data-extra="pivotal"',
    );
    const { scenario } = zeroTurnout();
    expect(render(scenario)).not.toContain('data-extra="pivotal"');
  });

  it('keeps hostile party names inert', () => {
    const input = section8Input('0');
    (input.parties as Json[])[3]!.name = '<script>alert(1)</script>';
    const { scenario } = caseOf(input);
    const details = block(
      render(scenario, { run: workerRun(scenario) }),
      'data-extra="pivotal"',
      'details',
    );
    expect(details).toContain('<bdi>&lt;script>alert(1)&lt;/script></bdi>');
    expect(details).not.toContain('<script>');
  });

  it.each(LOCALES)('labels the pivotal view in %s', (locale) => {
    const tr = translator(locale);
    const { scenario } = zeroTurnout();
    const html = render(scenario, { run: workerRun(scenario), locale });
    expect(textOf(block(html, 'data-extra="pivotal"', 'summary'))).toBe(
      tr('coalition.pivotal'),
    );
    const details = block(html, 'data-extra="pivotal"', 'details');
    expect(details).toContain(
      escapeText(
        tr('coalition.pivotal.intro', { total: formatInteger(locale, 2) }),
      ),
    );
    expect(details).toContain(escapeText(tr('coalition.column.indispensable')));
    const top = block(details, 'data-pivotal="P4"', 'tr');
    expect(textOf(block(top, 'data-cell="coalitions"', 'td'))).toBe(
      formatInteger(locale, 2),
    );
    expect(textOf(block(top, 'data-cell="indispensable"', 'td'))).toBe(
      tr('coalition.yes'),
    );
  });
});

describe('balancing heading', () => {
  const OLD: Readonly<Record<Locale, string>> = {
    en: 'Parties every winning coalition needs',
    ru: 'Партии, без которых не обойтись',
    he: 'מפלגות שכל קואליציה מנצחת זקוקה להן',
  };

  it('states what the engine computes in English', () => {
    expect(translator('en')('coalition.balancing')).toBe(
      'Balancing parties: can govern with either side of a forbidden pair',
    );
  });

  it.each(LOCALES)(
    'no longer claims every coalition needs the party in %s',
    (locale) => {
      const tr = translator(locale);
      expect(tr('coalition.balancing')).not.toBe(OLD[locale]);
      expect(tr('coalition.balancing')).not.toBe(
        tr('coalition.column.indispensable'),
      );
      const { scenario } = caseOf(section8Input('0'));
      const html = render(scenario, { run: workerRun(scenario), locale });
      expect(html).toContain(
        `<h4 class="coalitions__title">${escapeText(tr('coalition.balancing'))}</h4>`,
      );
    },
  );
});

describe('chosen coalition', () => {
  const t = translator('en');

  it('offers one checkbox per party and no evaluation when empty', () => {
    const { scenario } = caseOf(section8Input());
    const html = render(scenario);
    expect(attribute(html, 'data-choose')).toEqual(
      scenario.parties.map((party) => party.id),
    );
    expect(openTag(html, 'data-chooser="coalition"')).toMatch(/^<fieldset/);
    expect(html).not.toContain('data-evaluation');
  });

  it('evaluates the ticked parties', () => {
    const { scenario } = caseOf(section8Input());
    const selection = ['P1', 'P3'];
    const html = render(scenario, { selection });
    expect(openTag(html, 'data-choose="P1"')).toContain('checked');
    expect(openTag(html, 'data-choose="P2"')).not.toContain('checked');
    const evaluation = evaluateCoalition(
      scenario,
      runSeats(scenario).allocation,
      selection,
    );
    const field = (name: string): string =>
      textOf(block(html, `data-evaluation-field="${name}"`, 'dd'));
    expect(field('seats')).toBe(formatInteger('en', evaluation.seats));
    expect(field('margin')).toBe(formatInteger('en', evaluation.margin));
    expect(field('opposition')).toBe(
      formatInteger('en', evaluation.opposition),
    );
    const yesNo = (value: boolean): string =>
      t(value ? 'coalition.yes' : 'coalition.no');
    expect(field('reachesMajority')).toBe(yesNo(evaluation.reachesMajority));
    expect(field('feasible')).toBe(yesNo(evaluation.feasible));
    expect(field('minimal')).toBe(yesNo(evaluation.minimal));
    expect(field('ineligible')).toBe(nameOf(scenario, 'P3'));
    expect(field('forbidden')).toBe(t('coalition.none'));
  });

  it('names a forbidden pair inside the chosen coalition', () => {
    const { scenario } = caseOf(section8Input());
    const html = render(scenario, { selection: ['P1', 'P2'] });
    const forbidden = textOf(
      block(html, 'data-evaluation-field="forbidden"', 'dd'),
    );
    expect(forbidden).toContain(nameOf(scenario, 'P1'));
    expect(forbidden).toContain(nameOf(scenario, 'P2'));
    expect(textOf(block(html, 'data-evaluation-field="feasible"', 'dd'))).toBe(
      t('coalition.no'),
    );
  });
});

describe('who refused', () => {
  const t = translator('en');

  /** Section 8 with the P1–P2 rule replaced by the given refusals. */
  function refusalCase(refusals: readonly (readonly [string, string])[]): Case {
    const input = section8Input();
    const rules = input.coalitionRules as Json;
    return caseOf({
      ...input,
      coalitionRules: {
        ...rules,
        incompatiblePartyPairs: [],
        partyRefusals: refusals,
      },
    });
  }

  function refusalText(scenario: Scenario, ids: readonly string[]): string {
    return `(${t('coalition.source.refusal')}: ${ids
      .map((id) => nameOf(scenario, id))
      .join(', ')})`;
  }

  it('names the refusing party in place of the source label', () => {
    const { scenario } = refusalCase([['P2', 'P1']]);
    const html = render(scenario);
    expect(attribute(html, 'data-forbidden')).toEqual(['P1|P2']);
    expect(attribute(html, 'data-source')).toEqual(['party']);
    expect(attribute(html, 'data-refused-by')).toEqual(['P2']);
    const row = block(html, 'data-forbidden="P1\\|P2"', 'li');
    expect(textOf(row)).toBe(
      `${nameOf(scenario, 'P1')} – ${nameOf(scenario, 'P2')} ${refusalText(scenario, ['P2'])}`,
    );
    expect(row).toContain(`<bdi>${escapeText(nameOf(scenario, 'P2'))}</bdi>`);
    expect(row).not.toContain(escapeText(t('coalition.source.party')));
  });

  it('names both parties of a mutual refusal in party order', () => {
    const { scenario } = refusalCase([
      ['P2', 'P1'],
      ['P1', 'P2'],
    ]);
    const html = render(scenario);
    expect(attribute(html, 'data-refused-by')).toEqual(['P1 P2']);
    expect(textOf(block(html, 'data-forbidden="P1\\|P2"', 'li'))).toContain(
      refusalText(scenario, ['P1', 'P2']),
    );
  });

  it('keeps the source label for a pair nobody refused', () => {
    const { scenario } = caseOf(section8Input());
    const html = render(scenario);
    expect(html).not.toContain('data-refused-by');
    expect(textOf(block(html, 'data-forbidden="P1\\|P2"', 'li'))).toContain(
      `(${t('coalition.source.party')})`,
    );
  });

  it('names the refusing party in the blocked reasons', () => {
    const { scenario } = refusalCase([['P2', 'P1']]);
    const html = render(scenario, { run: workerRun(scenario) });
    const details = block(html, 'data-extra="blocked"', 'details');
    const pairRow = block(details, 'data-blocked="P1\\+P2"', 'tr');
    expect(textOf(block(pairRow, 'data-reason="forbidden"', 'li'))).toBe(
      `${t('coalition.reason.forbidden')}: ${nameOf(scenario, 'P1')} – ${nameOf(scenario, 'P2')} ${refusalText(scenario, ['P2'])}`,
    );
  });

  it('names the refusing party in the chosen coalition', () => {
    const { scenario } = refusalCase([['P2', 'P1']]);
    const html = render(scenario, { selection: ['P1', 'P2'] });
    expect(textOf(block(html, 'data-evaluation-field="forbidden"', 'dd'))).toBe(
      `${nameOf(scenario, 'P1')} – ${nameOf(scenario, 'P2')} ${refusalText(scenario, ['P2'])}`,
    );
  });

  it.each(LOCALES)('shows the same refusals in %s', (locale) => {
    const { scenario } = refusalCase([['P2', 'P1']]);
    const html = render(scenario, { locale });
    expect(attribute(html, 'data-refused-by')).toEqual(['P2']);
    expect(html).toContain(
      escapeText(translator(locale)('coalition.source.refusal')),
    );
  });
});

describe('coalitions panel in the app', () => {
  it('shows the idle view without a runner', () => {
    const store = createStore({ view: 'coalitions', language: 'en' });
    const html = renderToString(<App store={store} />);
    expect(attribute(html, 'data-panel')).toEqual(['coalitions']);
    expect(attribute(html, 'data-coalitions')).toEqual(['idle']);
  });

  it('shows no coalition view for an invalid scenario', () => {
    const store = createStore({
      view: 'coalitions',
      language: 'en',
      input: 'not a scenario',
    });
    const html = renderToString(<App store={store} />);
    expect(html).not.toContain('data-coalitions=');
  });

  it('passes the selection from the store', () => {
    const store = createStore({ view: 'coalitions', language: 'en' });
    store.toggleCoalitionMember('P1');
    const html = renderToString(<App store={store} />);
    expect(openTag(html, 'data-choose="P1"')).toContain('checked');
    expect(html).toContain('data-evaluation');
  });
});
