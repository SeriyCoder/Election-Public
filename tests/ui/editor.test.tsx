import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import {
  ID_PREFIX,
  findReferences,
  renameEntity,
  repairModes,
  setGroupFraction,
  setVoteWeight,
  turnoutCohorts,
  type Draft,
  type EntityKind,
} from '../../src/engine/edit';
import { LIMITS, type IssueCode } from '../../src/engine/schema';
import { LOCALES, translator, type Locale } from '../../src/i18n';
import { ru } from '../../src/i18n/ru';
import { App } from '../../src/ui/App';
import { entityName } from '../../src/ui/names';
import { baselineInput, presetInput, PRESETS } from '../../src/ui/presets';
import {
  createStore as createStoreWithLanguage,
  shareLockKey,
  weightLockKey,
  type AppState,
  type StoreOptions,
} from '../../src/ui/store';
import { partyModeInput } from '../engine/helpers/scenarios';

type Json = Record<string, unknown>;

const t = translator('ru');

const PARTY_MODE_GROUP_NOTES = {
  ru: 'Если точную связанную модель групп можно построить, изменение явки группы пересчитывает общую явку, количество голосов и доли партий, а также места. Если данных о составе партий или населении не хватает, они противоречат друг другу или модель приостановлена, настройка явки групп недоступна; обычные результаты партий остаются доступны. Демографические проекции основаны на допущениях и не описывают и не предсказывают реальных избирателей.',
  en: 'When a consistent linked group model can be built, changing group turnout recalculates overall turnout, party votes and shares, and seats. If party-composition or population data are missing or inconsistent, or the model is suspended, group-turnout editing is unavailable; ordinary party results remain available. Demographic projections are assumptions, not descriptions or predictions of real voters.',
  he: 'כאשר ניתן לבנות מודל קבוצות מקושר ועקבי, שינוי שיעור ההצבעה בקבוצה מחשב מחדש את שיעור ההצבעה הכללי, את מספר קולות המפלגות ואת חלקן, ואת המושבים. אם חסרים נתונים על הרכב המפלגות או האוכלוסייה, אם הנתונים אינם עקביים, או אם המודל מושעה, עריכת שיעור ההצבעה בקבוצות אינה זמינה; תוצאות המפלגות הרגילות נשארות זמינות. תחזיות דמוגרפיות הן הנחות, ואינן מתארות או מנבאות מצביעים אמיתיים.',
} satisfies Record<Locale, string>;

function createStore(
  initial: Partial<AppState> = {},
  options: StoreOptions = {},
) {
  return createStoreWithLanguage({ language: 'ru', ...initial }, options);
}

const ISSUE_CODES = [
  'invalid-json',
  'too-large',
  'not-an-object',
  'unsupported-version',
  'invalid-version',
  'missing-field',
  'wrong-type',
  'not-an-integer',
  'invalid-id',
  'duplicate-id',
  'dangling-reference',
  'duplicate-reference',
  'invalid-color',
  'invalid-decimal',
  'out-of-range',
  'invalid-total',
  'too-many',
  'too-long',
  'invalid-enum',
  'inconsistent-majority',
  'empty-destinations',
  'disallowed-destination',
  'restricted-mixed-blocks',
  'invalid-pair',
  'duplicate-pair',
  'conflicting-pair',
] as const satisfies readonly IssueCode[];

// Fails the type check when the schema gains an issue code missing here.
const everyCodeListed: Exclude<
  IssueCode,
  (typeof ISSUE_CODES)[number]
> extends never
  ? true
  : false = true;

const KINDS: readonly EntityKind[] = ['group', 'party', 'block'];
const LIST_KEY = {
  group: 'groups',
  party: 'parties',
  block: 'blocks',
} as const;

function render(store = createStore()): string {
  return renderToString(<App store={store} />);
}

function partyCompositionFixture(groupCount = 3): Json {
  const input = partyModeInput([
    ['1', '2'],
    ['1', '2'],
  ]);
  input.groups = Array.from({ length: groupCount }, (_, index) => ({
    id: `G${index + 1}`,
    name:
      index === groupCount - 1 ? 'Other / unclassified' : `Group ${index + 1}`,
    notes: '',
    turnout: '0.7',
    growthRate: '0',
    turnoutChange: '0',
  }));
  return input;
}

describe('optional party composition editor', () => {
  it('offers an explicit equal assumption without treating unknown as Other', () => {
    const store = createStore({ input: partyCompositionFixture() });
    store.setEditorPage('parties');
    const html = render(store);
    const party = row(html, 'party', 'P1');
    expect(tag(party, 'data-party-composition="P1"')).not.toContain(' open');
    expect(tag(party, 'data-composition-state="unknown"')).toBeTruthy();
    expect(tag(party, 'data-action="composition-begin"')).toBeTruthy();
    expect(party).not.toContain('data-composition-group="G3"');
  });

  it('renders exact stored group values, labelled colours and a chart', () => {
    const input = partyCompositionFixture();
    (input.parties as Json[])[0]!.composition = {
      G1: { numerator: '1', denominator: '3' },
      G2: { numerator: '1', denominator: '3' },
      G3: { numerator: '1', denominator: '3' },
    };
    const store = createStore({ input });
    store.setEditorPage('parties');
    const before = JSON.stringify(store.getState().input);
    const party = row(render(store), 'party', 'P1');
    expect(tag(party, 'data-composition-state="known"')).toBeTruthy();
    expect(tag(party, 'data-composition-group="G1"')).toBeTruthy();
    expect(tag(party, 'data-composition-group="G3"')).toBeTruthy();
    expect(tag(party, 'data-composition-chart')).toBeTruthy();
    expect(party).toContain('Other / unclassified');
    expect(JSON.stringify(store.getState().input)).toBe(before);
  });

  it('explains why a composition cannot be started without groups', () => {
    const store = createStore({ input: partyCompositionFixture(0) });
    store.setEditorPage('parties');
    const party = row(render(store), 'party', 'P1');
    expect(tag(party, 'data-composition-no-groups')).toBeTruthy();
    expect(tag(party, 'data-action="composition-begin"')).toContain('disabled');
  });

  it('does not add the new control to legacy group-mode scenarios', () => {
    const store = createStore();
    store.setEditorPage('parties');
    expect(render(store)).not.toContain('data-party-composition=');
  });
});

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

function rows(html: string, kind: EntityKind): string[] {
  return [
    ...html.matchAll(
      new RegExp(`<li\\b[^>]*data-entity="${kind}"[^>]*>[\\s\\S]*?</li>`, 'g'),
    ),
  ].map((match) => match[0]);
}

function row(html: string, kind: EntityKind, id: string): string {
  const found = rows(html, kind).find((item) =>
    item.includes(`data-id="${id}"`),
  );
  if (found === undefined) {
    throw new Error(`missing row ${kind} ${id}`);
  }
  return found;
}

function tag(html: string, pattern: string): string {
  const match = new RegExp(`<[a-z]+\\b[^>]*${pattern}[^>]*>`).exec(html);
  if (match === null) {
    throw new Error(`missing tag ${pattern}`);
  }
  return match[0];
}

function section(html: string, name: string): string {
  const match = new RegExp(
    `<section\\b[^>]*data-editor="${name}"[^>]*>[\\s\\S]*?</section>`,
  ).exec(html);
  if (match === null) {
    throw new Error(`missing section ${name}`);
  }
  return match[0];
}

function summaryText(html: string): string {
  const match = /<summary\b[^>]*>([\s\S]*?)<\/summary>/.exec(html);
  if (match === null) {
    throw new Error('missing summary');
  }
  return (match[1] ?? '').replace(/<[^>]*>/g, '');
}

/** From the dialog's opening tag to the end of its last control, Cancel. */
function confirmation(html: string): string | null {
  const start = html.search(/<[a-z]+\b[^>]*role="alertdialog"/);
  if (start < 0) {
    return null;
  }
  const cancel = html.indexOf('data-action="cancel"', start);
  const end = html.indexOf('</button>', cancel);
  return cancel < 0 || end < 0 ? null : html.slice(start, end);
}

describe('editor strings', () => {
  it('lists every schema issue code', () => {
    expect(everyCodeListed).toBe(true);
  });

  it.each(ISSUE_CODES)('translates the issue code %s', (code) => {
    expect((ru as Record<string, string>)[`issue.${code}`]).toMatch(/\S/);
  });

  it('drops the editor placeholder from the tables', () => {
    expect(Object.keys(ru)).not.toContain('placeholder.inputs');
  });
});

describe('editor sections', () => {
  it('renders scenario, rules, groups and parties without a block editor', () => {
    const html = render();
    expect(attribute(html, 'data-editor')).toEqual([
      'scenario',
      'rules',
      'groups',
      'parties',
      'coalition-rules',
    ]);
    expect(html).toContain(escapeText(t('editor.groups')));
    expect(html).toContain(escapeText(t('editor.parties')));
    expect(html).not.toContain('data-editor="blocks"');
  });

  it('edits the scenario name and notes', () => {
    const input: Json = {
      ...baselineInput(),
      name: 'Мой сценарий',
      notes: 'Note <b>one</b>',
    };
    const html = section(render(createStore({ input })), 'scenario');
    expect(tag(html, 'data-field="name"')).toContain(
      `value="${escapeText('Мой сценарий')}"`,
    );
    expect(html).toContain('data-field="notes"');
    expect(html).toContain(escapeText('Note <b>one</b>'));
    expect(html).not.toContain('<b>');
  });

  it.each(KINDS)('renders one %s row per entity in order', (kind) => {
    const html = render();
    if (kind === 'block') {
      expect(rows(html, kind)).toEqual([]);
      expect(
        (baselineInput().blocks as Json[]).map((block) => block.id),
      ).toEqual(['B1', 'B2', 'B3', 'B4']);
      return;
    }
    expect(
      rows(html, kind).map((item) => /data-id="([^"]*)"/.exec(item)?.[1]),
    ).toEqual([1, 2, 3, 4].map((n) => `${ID_PREFIX[kind]}${n}`));
  });

  it('shows each custom name as an editable value', () => {
    const input = baselineInput();
    const named: Json = { ...input };
    for (const kind of KINDS) {
      named[LIST_KEY[kind]] = (input[LIST_KEY[kind]] as Json[]).map(
        (entity) => ({ ...entity, name: `Custom ${String(entity.id)}` }),
      );
    }
    const store = createStore({ input: named });
    const html = render(store);
    for (const kind of KINDS) {
      const id = `${ID_PREFIX[kind]}2`;
      if (kind === 'block') {
        expect(rows(html, kind)).toEqual([]);
        expect(
          ((store.getState().input as Json).blocks as Json[])[1]?.name,
        ).toBe(`Custom ${id}`);
        continue;
      }
      expect(tag(row(html, kind, id), 'data-field="name"')).toContain(
        `value="Custom ${id}"`,
      );
    }
  });

  it('limits names to the schema length', () => {
    expect(tag(row(render(), 'group', 'G1'), 'data-field="name"')).toContain(
      `maxlength="${LIMITS.nameLength}"`,
    );
  });

  it('shows party color and eligibility while preserving the hidden block', () => {
    const store = createStore();
    const html = render(store);
    const party3 = row(html, 'party', 'P3');
    expect(tag(party3, 'data-field="color"')).toContain('value="#2ca02c"');
    expect(party3).not.toContain('data-field="blockId"');
    expect(
      ((store.getState().input as Json).parties as Json[])[2]?.blockId,
    ).toBe('B3');
    expect(tag(party3, 'data-field="canJoinGovernment"')).not.toContain(
      'checked',
    );
    expect(
      tag(row(html, 'party', 'P1'), 'data-field="canJoinGovernment"'),
    ).toContain('checked');
  });

  it('shows the editable party colour in party mode', () => {
    const store = createStore({
      input: partyModeInput([['1', '1']]),
    });
    store.setEditorPage('parties');
    const party = row(render(store), 'party', 'P1');
    expect(tag(party, 'data-field="color"')).toContain('value="#336699"');
  });

  it('preserves an unassigned party without showing a block selector', () => {
    const input = baselineInput();
    const parties = (input.parties as Json[]).map((party) =>
      party.id === 'P2' ? { ...party, blockId: null } : party,
    );
    const store = createStore({ input: { ...input, parties } });
    const party2 = row(render(store), 'party', 'P2');
    expect(party2).not.toContain('data-field="blockId"');
    expect(
      ((store.getState().input as Json).parties as Json[])[1]?.blockId,
    ).toBeNull();
  });

  it('retains hidden block colors', () => {
    const store = createStore();
    expect(rows(render(store), 'block')).toEqual([]);
    expect(((store.getState().input as Json).blocks as Json[])[3]?.color).toBe(
      '#9467bd',
    );
  });

  it('labels row actions with the entity name', () => {
    const party2 = row(render(), 'party', 'P2');
    for (const action of ['move-up', 'move-down', 'duplicate', 'delete']) {
      expect(party2).toContain(`data-action="${action}"`);
    }
    expect(party2).toContain(
      `aria-label="${escapeText(t('action.delete.label', { name: 'Партия 2' }))}"`,
    );
  });

  it('disables moving the first row up and the last row down', () => {
    const html = render();
    expect(tag(row(html, 'group', 'G1'), 'data-action="move-up"')).toContain(
      'disabled',
    );
    expect(
      tag(row(html, 'group', 'G1'), 'data-action="move-down"'),
    ).not.toContain('disabled');
    expect(tag(row(html, 'group', 'G4'), 'data-action="move-down"')).toContain(
      'disabled',
    );
  });

  it.each(KINDS)('offers an add button for %s', (kind) => {
    if (kind === 'block') {
      expect(render()).not.toContain('data-kind="block"');
      return;
    }
    const button = tag(render(), `data-kind="${kind}"`);
    expect(button).toContain('data-action="add"');
    expect(button).not.toContain('disabled');
  });

  it('keeps blocks at the schema limit without exposing block controls', () => {
    const blocks = Array.from({ length: LIMITS.blocks }, (_, index) => ({
      id: `B${index + 1}`,
      name: `B${index + 1}`,
      color: '#123456',
    }));
    const store = createStore({ input: { ...baselineInput(), blocks } });
    const html = render(store);
    expect(html).not.toContain('data-kind="block"');
    expect(rows(html, 'block')).toEqual([]);
    expect((store.getState().input as Json).blocks as Json[]).toHaveLength(
      LIMITS.blocks,
    );
    expect(tag(html, 'data-kind="party"')).not.toContain('disabled');
  });

  it('keeps hostile names inert', () => {
    const input = baselineInput();
    const parties = (input.parties as Json[]).map((party) =>
      party.id === 'P1'
        ? { ...party, name: '"><img src=x onerror=alert(1)><script>x</script>' }
        : party,
    );
    const html = render(createStore({ input: { ...input, parties } }));
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
  });

  it.each(KINDS)('offers collapsed notes for every %s', (kind) => {
    const html = render();
    if (kind === 'block') {
      expect(rows(html, kind)).toEqual([]);
      return;
    }
    for (const entity of baselineInput()[LIST_KEY[kind]] as Json[]) {
      const item = row(html, kind, entity.id as string);
      const disclosure = tag(item, 'data-notes');
      expect(disclosure).toMatch(/^<details\b/);
      expect(disclosure).not.toMatch(/\bopen\b/);
      expect(summaryText(item)).toBe(t('editor.notes'));
      const area = tag(item, 'data-field="notes"');
      expect(area).toMatch(/^<textarea\b/);
      expect(area).toContain(`maxlength="${LIMITS.notesLength}"`);
      expect(area).toContain('dir="auto"');
      expect(area).toContain(
        `aria-label="${escapeText(t('entity.notes.label', { name: t(`entity.${kind}`, { n: (entity.id as string).slice(1) }) }))}"`,
      );
    }
  });

  it('says in the summary text which rows have notes, kept as inert text', () => {
    const input = baselineInput();
    const note = 'Why <b>this</b> list\n<script>x</script>';
    const parties = (input.parties as Json[]).map((party) =>
      party.id === 'P2' ? { ...party, notes: note } : party,
    );
    const html = render(createStore({ input: { ...input, parties } }));
    const party2 = row(html, 'party', 'P2');
    expect(summaryText(party2)).toBe(t('entity.notes.filled'));
    expect(party2).toContain(escapeText(note));
    expect(summaryText(row(html, 'party', 'P1'))).toBe(t('editor.notes'));
    expect(html).not.toContain('<b>');
    expect(html).not.toContain('<script');
  });

  it('shows a non-string note as empty instead of failing', () => {
    const input = baselineInput();
    const parties = (input.parties as Json[]).map((party) =>
      party.id === 'P1' ? { ...party, notes: 42 } : party,
    );
    const party1 = row(
      render(createStore({ input: { ...input, parties } })),
      'party',
      'P1',
    );
    expect(summaryText(party1)).toBe(t('editor.notes'));
    expect(party1).not.toContain('42</textarea>');
  });

  it('shows a message instead of controls for a non-draft input', () => {
    const html = render(createStore({ input: 'not a scenario' }));
    expect(attribute(html, 'data-editor-state')).toEqual(['not-editable']);
    expect(html).toContain(escapeText(t('editor.notEditable')));
    for (const kind of KINDS) {
      expect(rows(html, kind)).toEqual([]);
    }
  });
});

describe('delete confirmation', () => {
  it('is absent until a delete is pending', () => {
    expect(confirmation(render())).toBeNull();
  });

  it('describes a pending party delete and offers its repairs', () => {
    const store = createStore();
    store.requestDelete('party', 'P1');
    const dialog = confirmation(render(store));
    expect(dialog).not.toBeNull();
    const html = dialog ?? '';
    expect(html).toContain('data-confirm="party"');
    expect(html).toContain('data-id="P1"');
    expect(html).toContain(
      escapeText(t('confirm.title', { name: 'Партия 1' })),
    );
    expect(html).toContain(
      escapeText(t('confirm.references.group', { count: 1 })),
    );
    expect(html).toContain(
      escapeText(t('confirm.references.pair', { count: 1 })),
    );
    expect(attribute(html, 'data-repair')).toEqual([...repairModes('party')]);
    expect(attribute(html, 'data-target')).toEqual(['P2', 'P3', 'P4']);
    expect(html).toContain('data-action="confirm"');
    expect(html).toContain('data-action="cancel"');
  });

  it('keeps block member references without offering block deletion', () => {
    const store = createStore();
    expect(rows(render(store), 'block')).toEqual([]);
    expect(
      findReferences(store.getState().input as Draft, 'block', 'B2'),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'party', id: 'P2' }),
      ]),
    );
  });

  it('refuses deletion of a positive-share party with an explanation', () => {
    const store = createStore({
      input: partyModeInput([['1', '1']]),
    });
    store.requestDelete('party', 'P1');
    const html = confirmation(render(store)) ?? '';
    expect(html).toContain(escapeText(t('confirm.references.share')));
    expect(tag(html, 'data-action="confirm"')).toContain('disabled');
    expect(html).not.toContain('data-repair=');
  });

  it('explains when a known composition prevents group deletion', () => {
    const source = partyModeInput([['1', '1']]) as Json;
    const store = createStore({
      input: {
        ...source,
        groups: [
          {
            id: 'G1',
            name: 'Group',
            notes: '',
            growthRate: '0',
            turnout: '1',
            turnoutChange: '0',
          },
        ],
        parties: [
          {
            ...(source.parties as Json[])[0],
            composition: { G1: { numerator: '1', denominator: '1' } },
          },
        ],
      },
    });
    store.requestDelete('group', 'G1');
    const html = confirmation(render(store)) ?? '';
    expect(html).toContain(
      escapeText(t('confirm.references.composition', { count: 1 })),
    );
    expect(tag(html, 'data-action="confirm"')).toContain('disabled');
  });

  it('uses the alertdialog role with an accessible name', () => {
    const store = createStore();
    store.requestDelete('party', 'P2');
    const html = render(store);
    const dialog = tag(html, 'role="alertdialog"');
    const labelledBy = /aria-labelledby="([^"]+)"/.exec(dialog)?.[1];
    expect(labelledBy).toBeDefined();
    expect(html).toContain(`id="${labelledBy}"`);
  });
});

describe('validation issues', () => {
  it('lists no issues for a valid scenario', () => {
    expect(render()).not.toContain('data-issues');
  });

  it('lists every issue with its code, path and translated message', () => {
    const input = baselineInput();
    const groups = (input.groups as Json[]).filter(
      (group) => group.id !== 'G4',
    );
    const store = createStore({
      input: {
        ...input,
        groups,
        rules: { ...(input.rules as Json), seatCount: 0 },
      },
    });
    const validation = store.getDerived().validation;
    if (validation.ok) {
      throw new Error('expected issues');
    }
    const html = render(store);
    expect(attribute(html, 'data-code')).toEqual(
      validation.issues.map((issue) => issue.code),
    );
    expect(attribute(html, 'data-path')).toEqual(
      validation.issues.map((issue) => issue.path),
    );
    for (const issue of validation.issues) {
      expect(html).toContain(escapeText(t(`issue.${issue.code}`)));
    }
  });
});

describe('preset picker', () => {
  it('hides preset selection while retaining translated preset API labels', () => {
    const html = render();
    expect(attribute(html, 'data-preset')).toEqual([]);
    for (const id of PRESETS) {
      expect(t(`preset.${id}`)).not.toBe(`preset.${id}`);
    }
    expect(html).not.toContain('data-action="load-preset"');
  });
});

describe('editor languages', () => {
  it.each(LOCALES)(
    '%s renders the editor in its own language',
    (locale: Locale) => {
      const own = translator(locale);
      const html = render(createStore({ language: locale }));
      expect(html).toContain(escapeText(own('editor.parties')));
      expect(html).toContain(escapeText(own('action.duplicate')));
    },
  );
});

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

describe('default names', () => {
  const NUMBERS = ['1', '2', '3', '4'];

  it.each(LOCALES)(
    '%s shows an empty name as a placeholder with its default label',
    (locale: Locale) => {
      const own = translator(locale);
      const html = render(
        createStore({ language: locale, input: blankNames(baselineInput()) }),
      );
      for (const kind of KINDS) {
        for (const n of NUMBERS) {
          const id = `${ID_PREFIX[kind]}${n}`;
          if (kind === 'block') {
            expect(rows(html, kind)).toEqual([]);
            continue;
          }
          const field = tag(row(html, kind, id), 'data-field="name"');
          expect(field, id).toContain(
            `placeholder="${escapeText(own(`entity.${kind}`, { n }))}"`,
          );
          expect(field, id).not.toMatch(/\bvalue="[^"]/);
        }
      }
    },
  );

  it('keeps a custom name as the value with the default label as placeholder', () => {
    const input = blankNames(baselineInput());
    const parties = (input.parties as Json[]).map((party) =>
      party.id === 'P2' ? { ...party, name: 'Likud' } : party,
    );
    const field = tag(
      row(render(createStore({ input: { ...input, parties } })), 'party', 'P2'),
      'data-field="name"',
    );
    expect(field).toContain('value="Likud"');
    expect(field).toContain(
      `placeholder="${escapeText(t('entity.party', { n: '2' }))}"`,
    );
  });

  it.each(LOCALES)(
    '%s shows the preset title as the scenario name placeholder',
    (locale: Locale) => {
      const own = translator(locale);
      const html = section(
        render(
          createStore({ language: locale, input: blankNames(baselineInput()) }),
        ),
        'scenario',
      );
      const field = tag(html, 'data-field="name"');
      expect(field).toContain(
        `placeholder="${escapeText(own('preset.baseline'))}"`,
      );
      expect(field).not.toMatch(/\bvalue="[^"]/);
    },
  );

  it('shows untitled as the placeholder of an unnamed scenario that is not a preset', () => {
    const input = { ...blankNames(baselineInput()), id: 'custom' };
    const field = tag(
      section(render(createStore({ input })), 'scenario'),
      'data-field="name"',
    );
    expect(field).toContain(`placeholder="${escapeText(t('app.untitled'))}"`);
  });

  it.each(LOCALES)(
    '%s names actions, destinations, choices and the delete dialog by default labels',
    (locale: Locale) => {
      const own = translator(locale);
      const label = (kind: EntityKind, n: string) =>
        escapeText(own(`entity.${kind}`, { n }));
      const store = createStore({
        language: locale,
        input: blankNames(baselineInput()),
      });
      const html = render(store);
      expect(row(html, 'party', 'P2')).toContain(
        `aria-label="${escapeText(own('action.delete.label', { name: own('entity.party', { n: '2' }) }))}"`,
      );
      expect(row(html, 'group', 'G1')).toContain(
        `<span>${label('party', '1')}</span>`,
      );
      expect(row(html, 'party', 'P1')).not.toContain('data-field="blockId"');
      expect(row(html, 'party', 'P1')).toContain(
        `<bdi>${label('group', '1')}</bdi>`,
      );
      const rules = section(html, 'coalition-rules');
      expect(rules).toContain(`>${label('party', '1')}<`);
      expect(rules).not.toContain(`>${label('block', '1')}<`);
      store.requestDelete('party', 'P1');
      const dialog = confirmation(render(store)) ?? '';
      expect(dialog).toContain(
        escapeText(
          own('confirm.title', { name: own('entity.party', { n: '1' }) }),
        ),
      );
      expect(dialog).toContain(`>${label('party', '2')}<`);
    },
  );
});

describe('catalog lists in the editor', () => {
  function exampleStore(
    locale: Locale = 'ru',
    input = presetInput('israelExample'),
  ) {
    return createStore({ language: locale, input });
  }

  function aboutText(html: string): string {
    const match =
      /<([a-z]+)\b[^>]*data-catalog-about[^>]*>([\s\S]*?)<\/\1>/.exec(html);
    if (match === null) {
      throw new Error('missing catalog line');
    }
    return (match[2] ?? '').replace(/<[^>]*>/g, '');
  }

  it.each(LOCALES)(
    '%s shows the catalog name as the placeholder of an empty-named list',
    (locale: Locale) => {
      const own = translator(locale);
      const html = render(exampleStore(locale));
      for (const id of ['likud', 'yesh-atid', 'avoda', 'raam']) {
        const field = tag(row(html, 'party', id), 'data-field="name"');
        expect(field, id).toContain(
          `placeholder="${escapeText(own(`catalog.party.${id}`))}"`,
        );
        expect(field, id).not.toMatch(/\bvalue="[^"]/);
      }
      const group = tag(row(html, 'group', 'haredi'), 'data-field="name"');
      expect(group).toContain(
        `placeholder="${escapeText(own('catalog.group.haredi'))}"`,
      );
    },
  );

  it.each(LOCALES)(
    '%s describes an empty-named catalog list in one line with the year',
    (locale: Locale) => {
      const own = translator(locale);
      const html = render(exampleStore(locale));
      for (const id of ['likud', 'religious-zionism', 'shas']) {
        const line = aboutText(row(html, 'party', id));
        expect(line, id).toBe(
          escapeText(
            own('catalog.line', { about: own(`catalog.party.${id}.about`) }),
          ),
        );
        expect(line, id).toContain('2022');
      }
    },
  );

  it('drops the catalog line once the list has a typed name', () => {
    const input = presetInput('israelExample');
    const parties = (input.parties as Json[]).map((party) =>
      party.id === 'likud' ? { ...party, name: 'Моя партия' } : party,
    );
    const html = render(exampleStore('ru', { ...input, parties }));
    const likud = row(html, 'party', 'likud');
    expect(likud).not.toContain('data-catalog-about');
    expect(tag(likud, 'data-field="name"')).toContain('value="Моя партия"');
    expect(row(html, 'party', 'shas')).toContain('data-catalog-about');
  });

  it('describes no group, no block and no list outside the catalog', () => {
    const example = render(exampleStore());
    for (const id of ['secular', 'arab']) {
      expect(row(example, 'group', id)).not.toContain('data-catalog-about');
    }
    expect(render()).not.toContain('data-catalog-about');
    const input = blankNames(baselineInput());
    const blocks = (input.blocks as Json[]).map((block) =>
      block.id === 'B1' ? { ...block, id: 'likud' } : block,
    );
    const parties = (input.parties as Json[]).map((party) =>
      party.blockId === 'B1' ? { ...party, blockId: 'likud' } : party,
    );
    const html = render(createStore({ input: { ...input, blocks, parties } }));
    expect(html).not.toContain('data-catalog-about');
  });
});

function editedStore(update: (draft: Draft) => Draft) {
  const store = createStore();
  store.updateInput((input) => update(input as Draft));
  return store;
}

function totalTag(html: string, kind: 'shares' | 'weights'): string {
  return tag(html, `data-total="${kind}"`);
}

function totalText(html: string, kind: 'shares' | 'weights'): string {
  const match = new RegExp(
    `<[a-z]+\\b[^>]*data-total="${kind}"[^>]*>([\\s\\S]*?)</`,
  ).exec(html);
  return match?.[1] ?? '';
}

/** A Russian string looked up by a key the reference table may not have yet. */
function ruText(key: string): string {
  const value = (ru as Readonly<Record<string, string>>)[key];
  expect(value, key).toMatch(/\S/);
  return escapeText(value ?? '');
}

describe('rules section', () => {
  it('shows the rules as editable values', () => {
    const html = section(render(), 'rules');
    expect(tag(html, 'data-rule="seatCount"')).toContain('value="120"');
    expect(tag(html, 'data-rule="populationTotal"')).toContain(
      'value="1000000"',
    );
    expect(tag(html, 'data-rule="threshold"')).toContain('value="0"');
  });

  it('labels the population as the voters with the right to vote', () => {
    const html = section(render(), 'rules');
    expect(ru['rules.populationTotal']).toBe('Избиратели с правом голоса');
    expect(html).toContain(escapeText(t('rules.populationTotal')));
  });

  it('hides the majority choice and states the fixed majority instead', () => {
    const html = section(render(), 'rules');
    expect(html).not.toContain('data-majority=');
    expect(html).not.toContain('data-segmented="majority"');
    expect(html).not.toContain('data-rule="majorityOverride"');
    expect(tag(html, 'data-rule-note="majority"')).toBeDefined();
    expect(html).toContain(ruText('rules.majority.fixed'));
  });

  it('shows no allocation method row', () => {
    const html = section(render(), 'rules');
    expect(html).not.toContain('data-rule="allocationMethod"');
    expect(html).not.toContain('Гамильтон');
  });

  it('states the 0.1% invalid-ballot assumption under the rules', () => {
    const html = section(render(), 'rules');
    expect(tag(html, 'data-rule-note="validity"')).toBeDefined();
    expect(html).toContain(ruText('validity.note'));
    expect(ruText('validity.note')).toContain('0,1%');
  });

  it('states an imported majority without exposing the old choice', () => {
    const input = baselineInput();
    const rules = {
      ...(input.rules as Json),
      majorityMode: 'override',
      majorityOverride: 70,
    };
    const store = createStore({ input: { ...input, rules } });
    const html = section(render(store), 'rules');
    expect(html).not.toContain('data-majority=');
    expect(html).toContain(escapeText(t('legacy.majorityRule', { value: 70 })));
    const validation = store.getDerived().validation;
    expect(validation.ok && validation.scenario.rules.majorityOverride).toBe(
      70,
    );
  });

  it('preserves the imported majority while hiding its editable field', () => {
    const input = baselineInput();
    const rules = {
      ...(input.rules as Json),
      majorityMode: 'override',
      majorityOverride: 70,
    };
    const html = section(
      render(createStore({ input: { ...input, rules } })),
      'rules',
    );
    expect(html).not.toContain('data-rule="majorityOverride"');
    expect(html).toContain(escapeText(t('legacy.majorityRule', { value: 70 })));
  });

  it('offers a threshold slider beside the number', () => {
    const input = baselineInput();
    const rules = { ...(input.rules as Json), threshold: '0.0325' };
    const html = section(
      render(createStore({ input: { ...input, rules } })),
      'rules',
    );
    const slider = tag(html, 'data-rule-slider="threshold"');
    expect(slider).toContain('type="range"');
    expect(slider).toContain('min="0"');
    expect(slider).toContain('max="100"');
    expect(slider).toContain('value="3.25"');
    expect(slider).toContain(
      `aria-label="${escapeText(t('rules.threshold'))}"`,
    );
  });

  it('warns about an imported override instead of showing the segmented control', () => {
    const input = baselineInput();
    const rules = {
      ...(input.rules as Json),
      majorityMode: 'override',
      majorityOverride: 70,
    };
    const html = render(createStore({ input: { ...input, rules } }));
    expect(html).not.toContain('data-segmented="majority"');
    expect(html).toContain('data-legacy-notice');
    expect(html).toContain(escapeText(t('legacy.majority')));
  });
});

describe('group panel', () => {
  function partyModeGroupStore() {
    const source = partyModeInput([['1', '1']]) as Json;
    const store = createStore({
      input: {
        ...source,
        groups: [
          {
            id: 'G1',
            name: 'Group',
            notes: '',
            growthRate: '0',
            turnout: '1',
            turnoutChange: '0',
          },
        ],
      },
    });
    store.setEditorPage('group:G1');
    return store;
  }

  it('shows only demographic metadata controls in party mode', () => {
    const html = render(partyModeGroupStore());
    const group = row(html, 'group', 'G1');
    expect(group).toContain('data-note="party-mode-group"');
    expect(group).toContain(escapeText(t('editor.partyModeGroupNote')));
    expect(group).toContain('data-fraction="turnout"');
    expect(group).toContain('data-fraction="growthRate"');
    expect(group).not.toContain('data-fraction="turnoutChange"');
    expect(group).not.toContain('data-fraction="populationShare"');
    expect(group).not.toContain('data-fraction="participationFactor"');
    expect(group).not.toContain('data-fraction="validBallotRate"');
    expect(group).not.toContain('data-mode=');
    expect(group).not.toContain('data-allowed=');
    expect(group).not.toContain('data-weight=');
    expect(group).not.toContain('data-action="rebalance-weights"');
  });

  it.each(LOCALES)(
    'explains linked group turnout accurately in %s',
    (locale) => {
      expect(translator(locale)('editor.partyModeGroupNote')).toBe(
        PARTY_MODE_GROUP_NOTES[locale],
      );
    },
  );

  it.each([
    ['populationShare', '15'],
    ['turnout', '100'],
    ['participationFactor', '100'],
  ])('shows or preserves %s as appropriate', (field, value) => {
    const store = createStore();
    const group = row(render(store), 'group', 'G3');
    if (field === 'participationFactor') {
      expect(group).not.toContain(`data-fraction="${field}"`);
      expect(
        ((store.getState().input as Json).groups as Json[])[2]?.[field],
      ).toBe('1');
      return;
    }
    expect(tag(group, `data-fraction="${field}"`)).toContain(
      `value="${value}"`,
    );
  });

  it.each([
    ['populationShare', '15'],
    ['turnout', '100'],
    ['participationFactor', '100'],
  ])('offers a %s slider only for visible fractions', (field, value) => {
    const group = row(render(), 'group', 'G3');
    if (field === 'participationFactor') {
      expect(group).not.toContain(`data-slider="${field}"`);
      return;
    }
    const slider = tag(group, `data-slider="${field}"`);
    expect(slider).toContain('type="range"');
    expect(slider).toContain('min="0"');
    expect(slider).toContain('max="100"');
    expect(slider).toContain(`value="${value}"`);
    expect(slider).toContain(`aria-label="${escapeText(t(`group.${field}`))}"`);
  });

  it('hides the valid-ballot field of every group at the standard 99.9%', () => {
    const html = render();
    for (const group of rows(html, 'group')) {
      expect(group).not.toContain('data-fraction="validBallotRate"');
      expect(group).not.toContain('data-slider="validBallotRate"');
    }
  });

  it.each([
    ['99', '99'],
    ['100', '100'],
  ])(
    'retains a hidden group valid-ballot rate stored at %s percent',
    (text) => {
      const store = editedStore((draft) =>
        setGroupFraction(draft, 'G3', 'validBallotRate', text),
      );
      const html = render(store);
      const group = row(html, 'group', 'G3');
      expect(group).not.toContain('data-fraction="validBallotRate"');
      expect(group).not.toContain('data-slider="validBallotRate"');
      expect(html).toContain(escapeText(t('legacy.validity')));
      expect(
        ((store.getState().input as Json).groups as Json[])[2]?.validBallotRate,
      ).toBe(text === '99' ? '0.99' : '1');
      expect(row(html, 'group', 'G2')).not.toContain(
        'data-fraction="validBallotRate"',
      );
    },
  );

  it('offers a slider for every destination weight', () => {
    const store = createStore();
    store.loadPreset('split');
    const group = row(render(store), 'group', 'G3');
    expect(attribute(group, 'data-weight-slider')).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
    ]);
    expect(tag(group, 'data-weight-slider="P3"')).toContain('value="60"');
    expect(tag(group, 'data-weight-slider="P1"')).toContain('value="30"');
    expect(tag(group, 'data-weight-slider="P2"')).toContain('value="10"');
    expect(tag(group, 'data-weight-slider="P3"')).not.toContain('disabled');
    expect(tag(group, 'data-weight-slider="P4"')).toContain('disabled');
    expect(tag(group, 'data-weight-slider="P3"')).toContain('type="range"');
  });

  it('explains a restricted group without exposing the voting-mode selector', () => {
    const group = row(render(), 'group', 'G1');
    expect(group).not.toContain('data-segmented="mode"');
    expect(group).not.toContain('data-mode=');
    expect(group).toContain('data-legacy-restricted-note');
  });

  it.each(['growthRate', 'turnoutChange'])(
    'shows or preserves a new %s value as appropriate',
    (field) => {
      const store = createStore();
      const group = row(render(store), 'group', 'G3');
      if (field === 'turnoutChange') {
        expect(group).not.toContain(`data-fraction="${field}"`);
        expect(
          ((store.getState().input as Json).groups as Json[])[2]?.[field],
        ).toBe('0');
        return;
      }
      const input = tag(group, `data-fraction="${field}"`);
      expect(input).toContain('value="0"');
      expect(input).toContain(
        `aria-label="${escapeText(t(`group.${field}`))}"`,
      );
    },
  );

  it.each([
    ['growthRate', '-2,5', '-2.5'],
    ['turnoutChange', '1', '1'],
  ] as const)(
    'shows or preserves a stored %s of %s percent',
    (field, text, shown) => {
      const store = editedStore((draft) =>
        setGroupFraction(draft, 'G3', field, text),
      );
      const group = row(render(store), 'group', 'G3');
      if (field === 'turnoutChange') {
        expect(group).not.toContain(`data-fraction="${field}"`);
        expect(group).not.toContain(`data-slider="${field}"`);
        expect(
          ((store.getState().input as Json).groups as Json[])[2]?.[field],
        ).toBe('0.01');
        return;
      }
      expect(tag(group, `data-fraction="${field}"`)).toContain(
        `value="${shown}"`,
      );
      expect(tag(group, `data-slider="${field}"`)).toContain(
        `value="${shown}"`,
      );
    },
  );

  it.each(['growthRate', 'turnoutChange'])(
    'offers a signed %s slider only for the visible change field',
    (field) => {
      const group = row(render(), 'group', 'G3');
      if (field === 'turnoutChange') {
        expect(group).not.toContain(`data-slider="${field}"`);
        return;
      }
      const slider = tag(group, `data-slider="${field}"`);
      expect(slider).toContain('type="range"');
      expect(slider).toContain('min="-10"');
      expect(slider).toContain('max="10"');
      expect(slider).toContain('value="0"');
      expect(slider).toContain(
        `aria-label="${escapeText(t(`group.${field}`))}"`,
      );
    },
  );

  it('places the change fields after the shown fractions', () => {
    const group = row(render(), 'group', 'G3');
    expect(attribute(group, 'data-fraction')).toEqual([
      'populationShare',
      'turnout',
      'growthRate',
    ]);
  });

  it('keeps non-standard validity hidden while retaining the other fields', () => {
    const store = editedStore((draft) =>
      setGroupFraction(draft, 'G3', 'validBallotRate', '98'),
    );
    const group = row(render(store), 'group', 'G3');
    expect(attribute(group, 'data-fraction')).toEqual([
      'populationShare',
      'turnout',
      'growthRate',
    ]);
  });

  it.each(LOCALES)(
    'labels the visible change field in %s',
    (locale: Locale) => {
      const tr = translator(locale);
      const group = row(
        render(createStore({ language: locale })),
        'group',
        'G3',
      );
      expect(group).toContain(escapeText(tr('group.growthRate')));
      expect(group).not.toContain(escapeText(tr('group.turnoutChange')));
    },
  );

  it('shows an unparseable value as typed', () => {
    const store = editedStore((draft) =>
      setGroupFraction(draft, 'G3', 'turnout', '12.'),
    );
    const group = row(render(store), 'group', 'G3');
    expect(tag(group, 'data-fraction="turnout"')).toContain('value="12."');
  });

  it('preserves the restricted voting mode and its destination', () => {
    const store = createStore();
    const group = row(render(store), 'group', 'G1');
    expect(group).not.toContain('data-mode=');
    expect(tag(group, 'data-allowed="P1"')).toContain('checked');
    expect(
      ((store.getState().input as Json).groups as Json[])[0]?.votingMode,
    ).toBe('restricted');
  });

  it('lists every party as a possible destination', () => {
    const group = row(render(), 'group', 'G1');
    expect(attribute(group, 'data-destination')).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
    ]);
    expect(tag(group, 'data-allowed="P1"')).toContain('checked');
    expect(tag(group, 'data-allowed="P2"')).not.toContain('checked');
    expect(tag(group, 'data-weight="P1"')).toContain('value="100"');
    expect(tag(group, 'data-weight="P2"')).toContain('disabled');
  });

  it('shows a valid weight total of 100%', () => {
    const group = row(render(), 'group', 'G1');
    expect(totalTag(group, 'weights')).toContain('data-valid="true"');
    expect(totalText(group, 'weights')).toContain('100');
  });

  it('marks weight locks and disables rebalance when all are locked', () => {
    const store = createStore();
    let group = row(render(store), 'group', 'G1');
    expect(tag(group, 'data-lock="weight:G1:P1"')).toContain(
      'aria-pressed="false"',
    );
    expect(tag(group, 'data-action="rebalance-weights"')).not.toContain(
      'disabled',
    );
    store.toggleLock(weightLockKey('G1', 'P1'));
    group = row(render(store), 'group', 'G1');
    expect(tag(group, 'data-lock="weight:G1:P1"')).toContain(
      'aria-pressed="true"',
    );
    expect(tag(group, 'data-action="rebalance-weights"')).toContain('disabled');
  });

  it('keeps destination rows out of the entity list markup', () => {
    const group = row(render(), 'group', 'G1');
    expect(group.slice(4)).not.toMatch(/<li\b/);
  });
});

const TURNOUT_KEYS = [
  'turnout.shortcut',
  'turnout.of',
  'turnout.changes',
  'turnout.sharedParty',
  'turnout.sharedBlock',
  'turnout.value',
  'turnout.apply',
  'turnout.noneParty',
  'turnout.noneBlock',
] as const;

function presetStore(id: 'split' | 'multiBlock') {
  const store = createStore();
  store.loadPreset(id);
  return store;
}

function groupName(store: ReturnType<typeof createStore>, id: string): string {
  const groups = (store.getState().input as Json).groups as Json[];
  const found = groups.find((group) => group.id === id);
  if (found === undefined) {
    throw new Error(`missing group ${id}`);
  }
  return entityName(
    'group',
    { id, name: found.name },
    translator(store.getState().language),
  );
}

function turnoutBox(html: string, kind: 'party' | 'block', id: string): string {
  const match = /<details\b[^>]*data-turnout[^>]*>[\s\S]*?<\/details>/.exec(
    row(html, kind, id),
  );
  if (match === null) {
    throw new Error(`missing turnout disclosure ${kind} ${id}`);
  }
  return match[0];
}

/** Group IDs of one cohort list, or null when the list is absent. */
function cohortIds(box: string, list: 'dedicated' | 'shared'): string[] | null {
  const start = box.indexOf(`data-cohorts="${list}"`);
  if (start < 0) {
    return null;
  }
  const next = box.indexOf('data-cohorts=', start + 1);
  return attribute(
    box.slice(start, next < 0 ? undefined : next),
    'data-cohort',
  );
}

function cohortRow(box: string, id: string): string {
  const match = new RegExp(
    `<[a-z]+\\b[^>]*data-cohort="${id}"[^>]*>[\\s\\S]*?</div>`,
  ).exec(box);
  if (match === null) {
    throw new Error(`missing cohort ${id}`);
  }
  return match[0];
}

describe('turnout shortcut', () => {
  it('does not offer group-based shortcuts in party mode', () => {
    const store = createStore({
      input: partyModeInput([['1', '1']]),
    });
    store.setEditorPage('parties');
    const html = render(store);
    expect(row(html, 'party', 'P1')).not.toContain('data-turnout="party"');
  });
  it('has every turnout string', () => {
    expect(Object.keys(ru)).toEqual(expect.arrayContaining([...TURNOUT_KEYS]));
  });

  it('offers closed party disclosures but no block or group shortcut', () => {
    const html = render();
    for (const n of [1, 2, 3, 4]) {
      expect(turnoutBox(html, 'party', `P${n}`)).not.toMatch(
        /<details\b[^>]*\sopen/,
      );
      expect(row(html, 'group', `G${n}`)).not.toContain('data-turnout');
    }
    expect(html).not.toContain('data-turnout="block"');
    expect(summaryText(turnoutBox(html, 'party', 'P3'))).toBe(
      t('turnout.shortcut'),
    );
  });

  it("offers the group's own turnout for a party with one dedicated group", () => {
    const store = createStore();
    const label = escapeText(t('turnout.of', { name: groupName(store, 'G3') }));
    const box = turnoutBox(render(store), 'party', 'P3');
    const field = tag(box, 'data-turnout-field');
    expect(field).toContain('data-turnout-field="G3"');
    expect(field).toContain('value="100"');
    expect(field).toContain(`aria-label="${label}"`);
    const slider = tag(box, 'data-turnout-slider');
    expect(slider).toContain('type="range"');
    expect(slider).toContain('min="0"');
    expect(slider).toContain('max="100"');
    expect(slider).toContain('value="100"');
    expect(slider).toContain(`aria-label="${label}"`);
    expect(box).not.toContain('data-cohorts=');
    expect(box).not.toContain('data-action="set-cohort-turnout"');
  });

  it('shows the value of the group field after a group edit', () => {
    const store = editedStore((draft) =>
      setGroupFraction(draft, 'G3', 'turnout', '42.5'),
    );
    const html = render(store);
    expect(
      tag(turnoutBox(html, 'party', 'P3'), 'data-turnout-field'),
    ).toContain('value="42.5"');
    expect(html).not.toContain('data-turnout="block"');
    expect(
      turnoutCohorts(store.getState().input as Draft, 'block', 'B3'),
    ).toEqual({
      dedicated: ['G3'],
      shared: [],
    });
  });

  it('lists the groups and offers a bulk edit when a party shares a group', () => {
    const box = turnoutBox(render(presetStore('split')), 'party', 'P1');
    expect(cohortIds(box, 'dedicated')).toEqual(['G1']);
    expect(cohortIds(box, 'shared')).toEqual(['G3']);
    expect(box).toContain(escapeText(t('turnout.changes')));
    expect(box).toContain(escapeText(t('turnout.sharedParty')));
    expect(box).not.toContain(escapeText(t('turnout.sharedBlock')));
    expect(box).not.toContain('data-turnout-field');
    const bulk = tag(box, 'data-turnout-bulk');
    expect(bulk).not.toMatch(/value="[^"]/);
    expect(bulk).toContain(`aria-label="${escapeText(t('turnout.value'))}"`);
    expect(tag(box, 'data-action="set-cohort-turnout"')).toContain('disabled');
    expect(box).toContain(escapeText(t('turnout.apply')));
  });

  it('shows only the shared group, with no edit, when that is all a party has', () => {
    const box = turnoutBox(render(presetStore('split')), 'party', 'P3');
    expect(cohortIds(box, 'dedicated')).toBeNull();
    expect(cohortIds(box, 'shared')).toEqual(['G3']);
    expect(box).toContain(escapeText(t('turnout.sharedParty')));
    expect(box).not.toContain('data-turnout-field');
    expect(box).not.toContain('data-turnout-bulk');
    expect(box).not.toContain('data-action="set-cohort-turnout"');
  });

  it('preserves block turnout cohorts without exposing a block shortcut', () => {
    const store = presetStore('split');
    expect(render(store)).not.toContain('data-turnout="block"');
    expect(
      turnoutCohorts(store.getState().input as Draft, 'block', 'B1'),
    ).toEqual({
      dedicated: ['G1'],
      shared: ['G3'],
    });
  });

  it('shows each listed group with its name and turnout', () => {
    const store = presetStore('split');
    store.updateInput((input) =>
      setGroupFraction(
        setGroupFraction(input as Draft, 'G1', 'turnout', '42.5'),
        'G3',
        'turnout',
        '80',
      ),
    );
    const box = turnoutBox(render(store), 'party', 'P1');
    expect(cohortRow(box, 'G1')).toContain(escapeText(groupName(store, 'G1')));
    expect(cohortRow(box, 'G1')).toContain('42.5%');
    expect(cohortRow(box, 'G3')).toContain(escapeText(groupName(store, 'G3')));
    expect(cohortRow(box, 'G3')).toContain('80%');
  });

  it('retains the block cohort when a group feeds two of its parties', () => {
    const store = presetStore('multiBlock');
    const html = render(store);
    expect(html).not.toContain('data-turnout="block"');
    expect(
      turnoutCohorts(store.getState().input as Draft, 'block', 'B1'),
    ).toEqual({
      dedicated: ['G1'],
      shared: [],
    });
    for (const party of ['P1', 'P5']) {
      const box = turnoutBox(html, 'party', party);
      expect(cohortIds(box, 'shared')).toEqual(['G1']);
      expect(box).not.toContain('data-turnout-field');
    }
  });

  it('says so when no group votes for a party or a block', () => {
    const store = editedStore((draft) => setVoteWeight(draft, 'G3', 'P3', '0'));
    const html = render(store);
    const party = turnoutBox(html, 'party', 'P3');
    expect(tag(party, 'data-empty="turnout"')).toBeTruthy();
    expect(party).toContain(escapeText(t('turnout.noneParty')));
    expect(party).not.toContain('data-turnout-field');
    expect(party).not.toContain('data-cohorts=');
    expect(html).not.toContain('data-turnout="block"');
    expect(
      turnoutCohorts(store.getState().input as Draft, 'block', 'B3'),
    ).toEqual({
      dedicated: [],
      shared: [],
    });
  });

  it('follows a weight edit with no stored state', () => {
    const store = presetStore('split');
    store.updateInput((input) =>
      setVoteWeight(
        setVoteWeight(input as Draft, 'G3', 'P1', '0'),
        'G3',
        'P2',
        '0',
      ),
    );
    const html = render(store);
    expect(
      tag(turnoutBox(html, 'party', 'P3'), 'data-turnout-field'),
    ).toContain('data-turnout-field="G3"');
    expect(
      tag(turnoutBox(html, 'party', 'P1'), 'data-turnout-field'),
    ).toContain('data-turnout-field="G1"');
  });

  it('keeps hostile group names inert', () => {
    const hostile = '<img src=x onerror="alert(1)">';
    const store = presetStore('split');
    store.updateInput((input) =>
      renameEntity(
        renameEntity(input as Draft, 'group', 'G3', hostile),
        'group',
        'G4',
        hostile,
      ),
    );
    const html = render(store);
    const shared = turnoutBox(html, 'party', 'P1');
    const shortcut = turnoutBox(html, 'party', 'P4');
    for (const box of [shared, shortcut]) {
      expect(box).not.toContain('<img');
      expect(box).toContain(escapeText(hostile));
    }
    expect(cohortRow(shared, 'G3')).toContain('<bdi');
  });

  it('keeps cohort rows out of the entity list markup', () => {
    const html = render(presetStore('split'));
    expect(turnoutBox(html, 'party', 'P1')).toContain('data-cohort="G3"');
    expect(html).not.toContain('data-turnout="block"');
    expect(row(html, 'party', 'P1').slice(4)).not.toMatch(/<li\b/);
  });

  it.each(LOCALES)('labels the turnout disclosure in %s', (locale: Locale) => {
    const own = translator(locale);
    const store = createStore({ language: locale });
    store.loadPreset('split');
    const html = render(store);
    expect(summaryText(turnoutBox(html, 'party', 'P1'))).toBe(
      own('turnout.shortcut'),
    );
    expect(turnoutBox(html, 'party', 'P1')).toContain(
      escapeText(own('turnout.apply')),
    );
    expect(html).not.toContain('data-turnout="block"');
  });
});

describe('share total and rebalance', () => {
  it('shows a valid share total of 100%', () => {
    const html = section(render(), 'groups');
    expect(totalTag(html, 'shares')).toContain('data-valid="true"');
    expect(totalText(html, 'shares')).toContain('100');
    expect(tag(html, 'data-action="rebalance-shares"')).not.toContain(
      'disabled',
    );
  });

  it('shows an invalid total after an edit', () => {
    const store = editedStore((draft) =>
      setGroupFraction(draft, 'G1', 'populationShare', '48'),
    );
    const html = section(render(store), 'groups');
    expect(totalTag(html, 'shares')).toContain('data-valid="false"');
    expect(totalText(html, 'shares')).toContain('110');
  });

  it('marks share locks and disables rebalance when it would be refused', () => {
    const store = editedStore((draft) =>
      setGroupFraction(
        setGroupFraction(draft, 'G1', 'populationShare', '48'),
        'G2',
        'populationShare',
        '60',
      ),
    );
    store.toggleLock(shareLockKey('G1'));
    store.toggleLock(shareLockKey('G2'));
    const html = section(render(store), 'groups');
    expect(tag(html, 'data-lock="share:G1"')).toContain('aria-pressed="true"');
    expect(tag(html, 'data-lock="share:G3"')).toContain('aria-pressed="false"');
    expect(tag(html, 'data-action="rebalance-shares"')).toContain('disabled');
    expect(html).toContain(escapeText(t('rebalance.refused')));
  });

  it.each(LOCALES)('keeps ASCII digits in fields for %s', (locale) => {
    const store = createStore({ language: locale as Locale });
    const group = row(render(store), 'group', 'G3');
    expect(tag(group, 'data-fraction="populationShare"')).toContain(
      'value="15"',
    );
  });
});

describe('coalition rules section', () => {
  function rules(store = createStore()): string {
    return section(render(store), 'coalition-rules');
  }

  function pairList(html: string, list: string): string {
    const match = new RegExp(
      `<div\\b[^>]*data-pair-list="${list}"[^>]*>[\\s\\S]*?</div>`,
    ).exec(html);
    if (match === null) {
      throw new Error(`missing pair list ${list}`);
    }
    return match[0];
  }

  it('titles the section', () => {
    expect(rules()).toContain(escapeText(t('editor.coalitionRules')));
  });

  it('lists the explicit party pairs with remove buttons', () => {
    const html = pairList(rules(), 'incompatiblePartyPairs');
    expect(attribute(html, 'data-pair')).toEqual(['P1|P2']);
    expect(attribute(html, 'data-action')).toEqual(['remove-pair', 'add-pair']);
    expect(attribute(html, 'data-pair-select')).toEqual(['first', 'second']);
    expect(html).toContain(escapeText(t('pairs.incompatiblePartyPairs')));
  });

  it('hides block and override lists without removing saved rules', () => {
    const html = rules();
    expect(html).not.toContain('data-pair-list="incompatibleBlockPairs"');
    expect(html).not.toContain('data-pair-list="compatiblePartyOverrides"');
    expect(
      (baselineInput().coalitionRules as Json).incompatibleBlockPairs,
    ).toEqual([]);
    expect(
      (baselineInput().coalitionRules as Json).compatiblePartyOverrides,
    ).toEqual([]);
  });

  it('shows the effective pairs with their source', () => {
    const store = createStore();
    expect(store.addPair('incompatibleBlockPairs', 'B3', 'B4')).toBe(true);
    const html = rules(store);
    expect(attribute(html, 'data-effective')).toEqual(['P1|P2', 'P3|P4']);
    expect(attribute(html, 'data-source')).toEqual(['party', 'block']);
    const blockRow =
      /<li\b[^>]*data-effective="P3\|P4"[^>]*>[\s\S]*?<\/li>/.exec(html);
    expect(blockRow?.[0]).not.toContain('data-action="allow-pair"');
    expect(blockRow?.[0]).not.toContain(
      escapeText(t('coalition.source.block')),
    );
    const partyRow =
      /<li\b[^>]*data-effective="P1\|P2"[^>]*>[\s\S]*?<\/li>/.exec(html);
    expect(partyRow?.[0]).not.toContain('data-action="allow-pair"');
  });

  it('applies a saved override without exposing its old list', () => {
    const store = createStore();
    store.addPair('incompatibleBlockPairs', 'B3', 'B4');
    store.addPair('compatiblePartyOverrides', 'P3', 'P4');
    const html = rules(store);
    expect(html).not.toContain('data-pair-list="compatiblePartyOverrides"');
    expect(
      ((store.getState().input as Json).coalitionRules as Json)
        .compatiblePartyOverrides,
    ).toEqual([['P3', 'P4']]);
    expect(attribute(html, 'data-effective')).toEqual(['P1|P2']);
  });

  it('names both parties on the remove button', () => {
    const html = pairList(rules(), 'incompatiblePartyPairs');
    const input = baselineInput();
    const names = (input.parties as Json[]).map((party) =>
      entityName('party', { id: String(party.id), name: party.name }, t),
    );
    expect(html).toContain(
      escapeText(
        t('pairs.remove', { first: names[0] ?? '', second: names[1] ?? '' }),
      ),
    );
  });

  it('hides the effective list for an invalid scenario', () => {
    const input = { ...baselineInput(), groups: [] };
    const html = rules(createStore({ input }));
    expect(html).not.toContain('data-list="effective-pairs"');
    expect(attribute(html, 'data-pair')).toEqual(['P1|P2']);
  });

  function partyName(id: string): string {
    const party = (baselineInput().parties as Json[]).find(
      (entry) => entry.id === id,
    );
    return entityName('party', { id, name: party?.name }, t);
  }

  it('shows an empty refusal list with a refuser and a refused choice', () => {
    const html = pairList(rules(), 'partyRefusals');
    expect(html).toContain(escapeText(t('pairs.partyRefusals')));
    expect(attribute(html, 'data-empty')).toEqual(['partyRefusals']);
    expect(attribute(html, 'data-pair-select')).toEqual(['first', 'second']);
    expect(attribute(html, 'aria-label')).toEqual([
      escapeText(t('pairs.refuser')),
      escapeText(t('pairs.refused')),
    ]);
    expect(attribute(html, 'value')).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
      'P1',
      'P2',
      'P3',
      'P4',
    ]);
    expect(attribute(html, 'data-action')).toEqual(['add-pair']);
    expect(html).toContain(escapeText(t('pairs.addRefusal')));
  });

  it('lists refusals in their own direction with remove buttons', () => {
    const store = createStore();
    expect(store.addPair('partyRefusals', 'P3', 'P1')).toBe(true);
    expect(store.addPair('partyRefusals', 'P1', 'P3')).toBe(true);
    const html = pairList(rules(store), 'partyRefusals');
    expect(attribute(html, 'data-pair')).toEqual(['P3|P1', 'P1|P3']);
    expect(attribute(html, 'data-action')).toEqual([
      'remove-pair',
      'remove-pair',
      'add-pair',
    ]);
    expect(html).toContain(
      escapeText(
        t('pairs.removeRefusal', {
          first: partyName('P3'),
          second: partyName('P1'),
        }),
      ),
    );
  });

  it('names who refused in the effective rules and offers no override', () => {
    const store = createStore();
    store.addPair('partyRefusals', 'P4', 'P3');
    store.addPair('partyRefusals', 'P3', 'P4');
    const html = rules(store);
    expect(attribute(html, 'data-effective')).toEqual(['P1|P2', 'P3|P4']);
    expect(attribute(html, 'data-source')).toEqual(['party', 'party']);
    expect(attribute(html, 'data-refused-by')).toEqual(['P3 P4']);
    const refused =
      /<li\b[^>]*data-effective="P3\|P4"[^>]*>[\s\S]*?<\/li>/.exec(html)?.[0] ??
      '';
    expect(refused).toContain(escapeText(t('coalition.source.refusal')));
    expect(refused).toContain(`<bdi>${escapeText(partyName('P3'))}</bdi>`);
    expect(refused).toContain(`<bdi>${escapeText(partyName('P4'))}</bdi>`);
    expect(refused).not.toContain(escapeText(t('coalition.source.party')));
    expect(refused).not.toContain('data-action="allow-pair"');
  });

  it('places the refusal list after the explicit party pairs', () => {
    const html = rules();
    const pairs = html.indexOf('data-pair-list="incompatiblePartyPairs"');
    const refusals = html.indexOf('data-pair-list="partyRefusals"');
    const blocks = html.indexOf('data-pair-list="incompatibleBlockPairs"');
    expect(pairs).toBeGreaterThanOrEqual(0);
    expect(refusals).toBeGreaterThan(pairs);
    expect(blocks).toBe(-1);
  });
});

describe('editor pages', () => {
  const HIDDEN = /\shidden(?=[\s>=])/;

  function openTag(html: string, pattern: string): string {
    return tag(html, pattern);
  }

  function hidden(html: string, pattern: string): boolean {
    return HIDDEN.test(openTag(html, pattern));
  }

  function rowTag(html: string, kind: EntityKind, id: string): string {
    return openTag(html, `data-entity="${kind}" data-id="${id}"`);
  }

  function pageTitle(html: string): string {
    const match = /<p\b[^>]*data-editor-page-title[^>]*>([\s\S]*?)<\/p>/.exec(
      html,
    );
    if (match === null) {
      throw new Error('missing page title');
    }
    return (match[1] ?? '').replace(/<[^>]*>/g, '');
  }

  function pageSelect(html: string): string {
    const select =
      /<select\b[^>]*data-page-select[^>]*>([\s\S]*?)<\/select>/.exec(html);
    if (select === null) {
      throw new Error('missing page select');
    }
    return select[1] ?? '';
  }

  function options(html: string): { value: string; text: string }[] {
    return [
      ...pageSelect(html).matchAll(
        /<option\b[^>]*value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g,
      ),
    ].map((match) => ({
      value: match[1] ?? '',
      text: (match[2] ?? '').replace(/<[^>]*>/g, ''),
    }));
  }

  function at(key: string, input?: unknown): string {
    const store = createStore(input === undefined ? {} : { input });
    store.setEditorPage(key);
    return render(store);
  }

  const groupName = (id: string) => entityName('group', { id }, t);

  it.each([
    'editor.page.of',
    'editor.page.prev',
    'editor.page.next',
    'editor.page.jump',
    'editor.page.scenario',
    'editor.page.group',
    'editor.page.groups',
    'editor.groupPicture',
  ])('has the Russian string %s', (key) => {
    expect(ruText(key)).toMatch(/\S/);
  });

  it('opens on page 1 of 7 with scenario and rules', () => {
    const html = render();
    expect(tag(html, 'data-editor-pager')).toContain('data-page="scenario"');
    expect(pageTitle(html)).toBe(
      `${t('editor.page.of', { n: 1, count: 7 })} · ${t('editor.page.scenario')}`,
    );
  });

  it('shows only the scenario and rules sections on page 1', () => {
    const html = render();
    expect(hidden(html, 'data-editor="scenario"')).toBe(false);
    expect(hidden(html, 'data-editor="rules"')).toBe(false);
    ['groups', 'parties', 'coalition-rules'].forEach((name) => {
      expect(hidden(html, `data-editor="${name}"`), name).toBe(true);
    });
    expect(html).not.toContain('data-editor="blocks"');
  });

  it('disables Back on the first page and Next on the last', () => {
    const first = render();
    expect(tag(first, 'data-action="page-prev"')).toMatch(/\sdisabled/);
    expect(tag(first, 'data-action="page-next"')).not.toMatch(/\sdisabled/);
    const last = at('coalition-rules');
    expect(tag(last, 'data-action="page-prev"')).not.toMatch(/\sdisabled/);
    expect(tag(last, 'data-action="page-next"')).toMatch(/\sdisabled/);
    expect(hidden(last, 'data-editor="coalition-rules"')).toBe(false);
    expect(pageTitle(last)).toBe(
      `${t('editor.page.of', { n: 7, count: 7 })} · ${t('editor.coalitionRules')}`,
    );
  });

  it('puts Back and Next side by side, labelled in the language', () => {
    const html = render();
    const prev = html.indexOf('data-action="page-prev"');
    const next = html.indexOf('data-action="page-next"');
    expect(prev).toBeGreaterThan(-1);
    expect(next).toBeGreaterThan(prev);
    const between = html.slice(prev, next);
    expect(between).not.toContain('<select');
    expect(between).toContain(escapeText(t('editor.page.prev')));
    expect(html.slice(next)).toContain(escapeText(t('editor.page.next')));
  });

  it('lists every page by number and title in the page select', () => {
    const html = render();
    expect(tag(html, 'data-page-select')).toContain(
      `aria-label="${escapeText(t('editor.page.jump'))}"`,
    );
    expect(options(html)).toEqual([
      { value: 'scenario', text: `1. ${t('editor.page.scenario')}` },
      ...['G1', 'G2', 'G3', 'G4'].map((id, index) => ({
        value: `group:${id}`,
        text: `${index + 2}. ${t('editor.page.group', { name: groupName(id) })}`,
      })),
      { value: 'parties', text: `6. ${t('editor.parties')}` },
      { value: 'coalition-rules', text: `7. ${t('editor.coalitionRules')}` },
    ]);
  });

  it('marks the current page in the page select', () => {
    const html = at('coalition-rules');
    const selected = [
      ...pageSelect(html).matchAll(
        /<option\b[^>]*value="([^"]*)"[^>]*\sselected/g,
      ),
    ].map((match) => match[1]);
    expect(selected).toEqual(['coalition-rules']);
  });

  it('shows one group on its page with the share total and the add button', () => {
    const html = at('group:G2');
    expect(pageTitle(html)).toBe(
      `${t('editor.page.of', { n: 3, count: 7 })} · ${t('editor.page.group', { name: groupName('G2') })}`,
    );
    expect(hidden(html, 'data-editor="groups"')).toBe(false);
    expect(hidden(html, 'data-editor="scenario"')).toBe(true);
    expect(hidden(html, 'data-editor="parties"')).toBe(true);
    expect(HIDDEN.test(rowTag(html, 'group', 'G2'))).toBe(false);
    ['G1', 'G3', 'G4'].forEach((id) => {
      expect(HIDDEN.test(rowTag(html, 'group', id)), id).toBe(true);
    });
    const groups = section(html, 'groups');
    expect(groups).toContain('data-action="rebalance-shares"');
    expect(groups).toContain('data-action="add" data-kind="group"');
  });

  it('shows every party on its page without a block page', () => {
    const parties = at('parties');
    expect(hidden(parties, 'data-editor="parties"')).toBe(false);
    ['P1', 'P2', 'P3', 'P4'].forEach((id) => {
      expect(HIDDEN.test(rowTag(parties, 'party', id)), id).toBe(false);
    });
    expect(parties).not.toContain('data-editor="blocks"');
    expect(options(parties).map((option) => option.value)).not.toContain(
      'blocks',
    );
  });

  it('explains on a group page that its vote split is the user picture of the world', () => {
    const html = row(at('group:G1'), 'group', 'G1');
    const note = html.indexOf('data-note="group-picture"');
    expect(note).toBeGreaterThan(-1);
    expect(html).toContain(escapeText(t('editor.groupPicture')));
    expect(note).toBeLessThan(html.indexOf('data-destination='));
    expect(html).not.toContain('data-segmented="mode"');
    expect(ruText('editor.groupPicture')).toContain('картина мира');
  });

  it('shows the empty groups page when there are no groups', () => {
    const input = { ...baselineInput(), groups: [] };
    const first = render(createStore({ input }));
    expect(pageTitle(first)).toBe(
      `${t('editor.page.of', { n: 1, count: 4 })} · ${t('editor.page.scenario')}`,
    );
    const html = at('groups', input);
    expect(pageTitle(html)).toBe(
      `${t('editor.page.of', { n: 2, count: 4 })} · ${t('editor.page.groups')}`,
    );
    expect(hidden(html, 'data-editor="groups"')).toBe(false);
    expect(section(html, 'groups')).toContain(
      'data-action="add" data-kind="group"',
    );
  });

  it('keeps the issue list above the pager', () => {
    const input = { ...baselineInput(), groups: [] };
    const html = render(createStore({ input }));
    const issues = html.indexOf('data-issues="list"');
    expect(issues).toBeGreaterThan(-1);
    expect(issues).toBeLessThan(html.indexOf('data-editor-pager'));
  });

  it('shows a group name in the page title and list as inert text', () => {
    const hostile = '<img src=x onerror=alert(1)>';
    const store = createStore();
    store.updateInput((input) =>
      renameEntity(input as Draft, 'group', 'G2', hostile),
    );
    store.setEditorPage('group:G2');
    const html = render(store);
    expect(html).not.toContain(hostile);
    expect(pageTitle(html)).toContain(hostile.replace(/</g, '&lt;'));
    expect(options(html)[2]?.text).toContain(hostile.replace(/</g, '&lt;'));
  });

  it('shows no pager for input the editor cannot edit', () => {
    const html = render(createStore({ input: 'nope' }));
    expect(html).toContain('data-editor-state="not-editable"');
    expect(html).not.toContain('data-editor-pager');
  });

  it.each(LOCALES)('numbers and names the pages in %s', (locale: Locale) => {
    const local = translator(locale);
    const store = createStore({ language: locale });
    store.setEditorPage('parties');
    const html = render(store);
    expect(pageTitle(html)).toBe(
      `${local('editor.page.of', { n: 6, count: 7 })} · ${local('editor.parties')}`,
    );
    expect(html).toContain(escapeText(local('editor.page.prev')));
    expect(html).toContain(escapeText(local('editor.page.next')));
  });
});
