import { describe, expect, it, vi } from 'vitest';
import { compare, neg, rational, sub } from '../../src/engine/rational';
import { sumFractions } from '../../src/engine/numeric';
import { editPartyShare } from '../../src/engine/partyShares';
import {
  beginPartyComposition,
  editCompositionShare,
} from '../../src/engine/compositionEdit';
import {
  runScenario,
  runSeats,
  serializeResult,
  type SeatResult,
} from '../../src/engine/run';
import type { ProjectionUnavailable } from '../../src/engine/votes';
import {
  LIMITS,
  SCHEMA_VERSION,
  serializeScenario,
  validateScenario,
} from '../../src/engine/schema';
import {
  entities,
  isDraft,
  moveEntity,
  setGroupFraction,
  setVoteWeight,
  type Draft,
} from '../../src/engine/edit';
import { LOCALES } from '../../src/i18n';
import { editorPages, FIRST_PAGE, resolvePage } from '../../src/ui/editorPages';
import { coalitionKey } from '../../src/ui/coalitionChoice';
import {
  baselineInput,
  presetIdOf,
  presetInput,
  PRESETS,
  type PresetId,
} from '../../src/ui/presets';
import {
  buildBook as buildFromAnswers,
  EMPTY_BOOK,
  isSuggested,
  partCount,
  screenOf,
  shownTexts,
  type PageKey,
} from '../../src/ui/book';
import { partyModeInput } from '../engine/helpers/scenarios';
import {
  createStore,
  DEFAULT_FUTURE_YEAR,
  shareLockKey,
  VIEWS,
  weightLockKey,
  type LanguageStorage,
  type ViewId,
} from '../../src/ui/store';

type Json = Record<string, unknown>;

const uiSources = import.meta.glob(
  ['../../src/ui/**/*.{ts,tsx}', '../../src/i18n/**/*.{ts,tsx}'],
  { query: '?raw', import: 'default', eager: true },
);

function directRun(input: unknown): string {
  const validation = validateScenario(input);
  if (!validation.ok) {
    throw new Error('expected a valid scenario');
  }
  return serializeResult(runSeats(validation.scenario));
}

function withRules(input: Json, rules: Json): Json {
  return { ...input, rules: { ...(input.rules as Json), ...rules } };
}

function withAllTurnouts(input: Json, turnout: string): Json {
  const groups = input.groups as Json[];
  return { ...input, groups: groups.map((group) => ({ ...group, turnout })) };
}

function seats(store: ReturnType<typeof createStore>): number[] {
  const result = store.getDerived().result;
  if (result === null) {
    throw new Error('expected a result');
  }
  return result.allocation.parties.map((party) => party.seats);
}

function requireSeatResult(
  result: SeatResult | ProjectionUnavailable | null,
): SeatResult {
  if (result === null || 'kind' in result) {
    throw new Error('expected an available projection');
  }
  return result;
}

describe('baseline preset', () => {
  it('is the Section 8 baseline: 46 / 50 / 18 / 6 and a deadlock', () => {
    const store = createStore();
    expect(seats(store)).toEqual([46, 50, 18, 6]);
    const { validation } = store.getDerived();
    if (!validation.ok) {
      throw new Error('expected a valid scenario');
    }
    expect(runScenario(validation.scenario).coalitions.status).toBe('deadlock');
  });

  it('derives seats without running the coalition search', () => {
    const result = createStore().getDerived().result;
    expect(result).not.toBeNull();
    expect(Object.keys(result!)).toEqual(['votes', 'threshold', 'allocation']);
  });

  it('returns a fresh copy on every call', () => {
    const first = baselineInput();
    const second = baselineInput();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    (first.rules as Json).seatCount = 7;
    expect((second.rules as Json).seatCount).toBe(120);
  });
});

describe('store state', () => {
  it('starts on the inputs view with the baseline input', () => {
    const store = createStore();
    expect(store.getState().view).toBe('inputs');
    expect(store.getState().input).toEqual(baselineInput());
  });

  it('lists the current views without duplicate seats or comparison tabs', () => {
    expect(VIEWS).toEqual(['coalitions', 'future', 'inputs']);
  });

  it('accepts an initial input and view', () => {
    const input = withRules(baselineInput(), { seatCount: 11 });
    const store = createStore({ input, view: 'coalitions' });
    expect(store.getState().input).toBe(input);
    expect(store.getState().view).toBe('coalitions');
  });

  it.each(VIEWS)('switches to the %s view', (view: ViewId) => {
    const store = createStore();
    store.setView(view);
    expect(store.getState().view).toBe(view);
  });

  it('updateInput passes the current input and stores the returned one', () => {
    const store = createStore();
    const before = store.getState().input;
    const update = vi.fn((input: unknown) =>
      withRules(input as Json, { seatCount: 121 }),
    );
    store.updateInput(update);
    expect(update).toHaveBeenCalledWith(before);
    expect((store.getState().input as { rules: Json }).rules.seatCount).toBe(
      121,
    );
  });
});

describe('future year', () => {
  it('starts at year 4', () => {
    expect(DEFAULT_FUTURE_YEAR).toBe(4);
    expect(createStore().getState().futureYear).toBe(4);
  });

  it('accepts an initial year', () => {
    expect(createStore({ futureYear: 9 }).getState().futureYear).toBe(9);
  });

  it.each([0, 1, 10, LIMITS.projectionYears])('sets year %s', (year) => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.setFutureYear(year)).toBe(true);
    expect(store.getState().futureYear).toBe(year);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it.each([-1, LIMITS.projectionYears + 1, 2.5, Number.NaN])(
    'refuses year %s and keeps the state',
    (year) => {
      const store = createStore();
      const before = store.getState();
      const listener = vi.fn();
      store.subscribe(listener);
      expect(store.setFutureYear(year)).toBe(false);
      expect(store.getState()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    },
  );

  it('keeps the year when the input changes', () => {
    const store = createStore({ futureYear: 7 });
    store.setInput(withRules(baselineInput(), { seatCount: 11 }));
    store.loadPreset('baseline');
    expect(store.getState().futureYear).toBe(7);
  });
});

describe('projection', () => {
  function growing(): Json {
    const input = baselineInput();
    const groups = (input.groups as Json[]).map((group, index) =>
      index === 0 ? { ...group, growthRate: '0.1' } : group,
    );
    return { ...input, groups };
  }

  function expected(input: unknown, year: number): string {
    const validation = validateScenario(input);
    if (!validation.ok) {
      throw new Error('expected a valid scenario');
    }
    if (validation.scenario.inputMode !== 'groups') {
      throw new Error('expected a group-mode scenario');
    }
    return serializeResult(runSeats(validation.scenario, year));
  }

  it('runs the seats of the chosen year', () => {
    const store = createStore({ input: growing(), futureYear: 3 });
    const projection = store.getProjection();
    expect(projection).not.toBeNull();
    expect(serializeResult(requireSeatResult(projection))).toBe(
      expected(growing(), 3),
    );
    expect(serializeResult(requireSeatResult(projection))).not.toBe(
      expected(growing(), 0),
    );
  });

  it('is the year-0 result at year 0', () => {
    const store = createStore({ futureYear: 0 });
    expect(serializeResult(requireSeatResult(store.getProjection()))).toBe(
      serializeResult(store.getDerived().result!),
    );
  });

  it('caches by input and year', () => {
    const store = createStore({ input: growing() });
    const first = store.getProjection();
    expect(store.getProjection()).toBe(first);
    store.setFutureYear(5);
    const second = store.getProjection();
    expect(second).not.toBe(first);
    expect(serializeResult(requireSeatResult(second))).toBe(
      expected(growing(), 5),
    );
    store.setInput(growing());
    expect(store.getProjection()).not.toBe(second);
  });

  it('is null for invalid input', () => {
    const store = createStore({
      input: withRules(baselineInput(), { seatCount: -1 }),
    });
    expect(store.getProjection()).toBeNull();
  });

  it('does not run the coalition search', () => {
    const projection = createStore().getProjection();
    expect(Object.keys(projection!)).toEqual([
      'votes',
      'threshold',
      'allocation',
    ]);
  });
});

describe('composition target', () => {
  it('starts with no target', () => {
    expect(createStore().getState().compositionTarget).toBeNull();
  });

  it('sets a party or a block target and clears it', () => {
    const store = createStore();
    store.setCompositionTarget({ kind: 'party', id: 'P2' });
    expect(store.getState().compositionTarget).toEqual({
      kind: 'party',
      id: 'P2',
    });
    store.setCompositionTarget({ kind: 'block', id: 'B1' });
    expect(store.getState().compositionTarget).toEqual({
      kind: 'block',
      id: 'B1',
    });
    store.setCompositionTarget(null);
    expect(store.getState().compositionTarget).toBeNull();
  });

  it('accepts an initial target', () => {
    const store = createStore({
      compositionTarget: { kind: 'block', id: 'B2' },
    });
    expect(store.getState().compositionTarget).toEqual({
      kind: 'block',
      id: 'B2',
    });
  });
});

describe('derived validation and result', () => {
  it('keeps an invalid edit exactly and withholds the result', () => {
    const store = createStore();
    const invalid = withRules(baselineInput(), { seatCount: -1 });
    store.setInput(invalid);
    expect(store.getState().input).toBe(invalid);
    const derived = store.getDerived();
    expect(derived.validation.ok).toBe(false);
    expect(derived.result).toBeNull();
  });

  it('withholds the result for input that is not an object', () => {
    const store = createStore({ input: 'not a scenario' });
    expect(store.getDerived().validation.ok).toBe(false);
    expect(store.getDerived().result).toBeNull();
  });

  it('restores the result once the input is valid again', () => {
    const store = createStore();
    store.setInput(withRules(baselineInput(), { seatCount: -1 }));
    store.setInput(baselineInput());
    expect(seats(store)).toEqual([46, 50, 18, 6]);
  });

  it('reports a no-allocation result instead of withholding it', () => {
    const store = createStore({ input: withAllTurnouts(baselineInput(), '0') });
    const result = store.getDerived().result;
    expect(result?.allocation.noAllocation).toBe('no-valid-votes');
  });

  it('recomputes only when the input identity changes', () => {
    const store = createStore();
    const first = store.getDerived();
    expect(store.getDerived()).toBe(first);
    store.setView('seats');
    expect(store.getDerived()).toBe(first);
    store.setInput(baselineInput());
    expect(store.getDerived()).not.toBe(first);
  });
});

describe('determinism', () => {
  it('serializes byte-identically to a direct engine run', () => {
    const store = createStore();
    const result = store.getDerived().result;
    expect(result).not.toBeNull();
    expect(serializeResult(result!)).toBe(directRun(baselineInput()));
  });

  it('is identical after a JSON round trip of the input', () => {
    const store = createStore();
    const before = serializeResult(store.getDerived().result!);
    store.setInput(JSON.parse(JSON.stringify(store.getState().input)));
    expect(serializeResult(store.getDerived().result!)).toBe(before);
  });

  it('is identical across repeated stores', () => {
    const outputs = Array.from({ length: 3 }, () =>
      serializeResult(createStore().getDerived().result!),
    );
    expect(new Set(outputs).size).toBe(1);
  });
});

describe('subscriptions', () => {
  it('notifies on every action until unsubscribed', () => {
    const store = createStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setView('seats');
    store.setInput(baselineInput());
    store.updateInput((input) => input);
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    store.setView('compare');
    expect(listener).toHaveBeenCalledTimes(3);
  });
});

function memoryStorage(
  stored: string | null,
  clears = true,
): LanguageStorage & {
  saved: string[];
  cleared: number;
} {
  const storage = {
    saved: [] as string[],
    cleared: 0,
    load: () => stored,
    save: (locale: string) => {
      storage.saved.push(locale);
    },
    clear: () => {
      storage.cleared += 1;
      return clears;
    },
  };
  return storage;
}

describe('language', () => {
  it('starts in Hebrew without storage', () => {
    expect(createStore().getState().language).toBe('he');
  });

  it('starts in a valid stored language', () => {
    const store = createStore({}, { storage: memoryStorage('he') });
    expect(store.getState().language).toBe('he');
  });

  it.each(['de', '', 'HE'])('ignores the unknown stored value %j', (value) => {
    const store = createStore({}, { storage: memoryStorage(value) });
    expect(store.getState().language).toBe('he');
  });

  it('prefers an explicit initial language over storage', () => {
    const store = createStore(
      { language: 'en' },
      { storage: memoryStorage('he') },
    );
    expect(store.getState().language).toBe('en');
  });

  it('does not write storage until the language is chosen', () => {
    const storage = memoryStorage(null);
    const store = createStore({}, { storage });
    store.setView('seats');
    store.setInput(baselineInput());
    expect(storage.saved).toEqual([]);
    store.setLanguage('en');
    expect(storage.saved).toEqual(['en']);
    expect(store.getState().language).toBe('en');
  });

  it('survives storage that throws', () => {
    const storage: LanguageStorage = {
      load: () => {
        throw new Error('blocked');
      },
      save: () => {
        throw new Error('blocked');
      },
      clear: () => {
        throw new Error('blocked');
      },
    };
    const store = createStore({}, { storage });
    expect(store.getState().language).toBe('he');
    store.setLanguage('ru');
    expect(store.getState().language).toBe('ru');
    store.clearSavedData();
    expect(store.getState().storageNotice).toBe('failed');
  });

  it('notifies subscribers and keeps the scenario and view', () => {
    const store = createStore({ view: 'coalitions' });
    const input = store.getState().input;
    const listener = vi.fn();
    store.subscribe(listener);
    store.setLanguage('he');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().input).toBe(input);
    expect(store.getState().view).toBe('coalitions');
  });

  it('leaves the derived result untouched in every language', () => {
    const store = createStore();
    const derived = store.getDerived();
    const before = serializeResult(derived.result!);
    for (const locale of LOCALES) {
      store.setLanguage(locale);
      expect(store.getDerived()).toBe(derived);
      expect(serializeResult(store.getDerived().result!)).toBe(before);
    }
  });

  it('keeps party-first seat results unchanged in every language', () => {
    const store = createStore({
      input: partyModeInput([
        ['13', '400'],
        ['387', '400'],
      ]),
    });
    const derived = store.getDerived();
    expect(derived.validation.ok).toBe(true);
    if (!derived.validation.ok) {
      return;
    }
    const before = serializeResult(derived.result!);
    for (const locale of LOCALES) {
      store.setLanguage(locale);
      expect(store.getDerived()).toBe(derived);
      expect(serializeResult(store.getDerived().result!)).toBe(before);
    }
  });

  it('keeps an edited exact party share and seats unchanged in every language', () => {
    const edited = editPartyShare(
      partyModeInput([
        ['1', '2'],
        ['1', '2'],
      ]),
      'P1',
      '3.25',
      [],
    );
    expect(edited.ok).toBe(true);
    if (!edited.ok) {
      throw new Error(`Unexpected refusal: ${edited.reason}`);
    }
    const outputs = LOCALES.map((language) => {
      const store = createStore({ input: edited.scenario, language });
      const result = store.getDerived().result;
      if (result === null) {
        throw new Error('Expected a seat result');
      }
      return serializeResult(result);
    });
    expect(new Set(outputs).size).toBe(1);
    expect(
      runSeats(edited.scenario).allocation.parties.map((party) => party.seats),
    ).toEqual([4, 116]);
  });
});

describe('clear saved data', () => {
  it('starts with no notice', () => {
    expect(createStore().getState().storageNotice).toBeNull();
    const store = createStore({}, { storage: memoryStorage('he') });
    expect(store.getState().storageNotice).toBeNull();
  });

  it('clears through the storage once and reports cleared', () => {
    const storage = memoryStorage('he');
    const store = createStore({}, { storage });
    store.clearSavedData();
    expect(storage.cleared).toBe(1);
    expect(storage.saved).toEqual([]);
    expect(store.getState().storageNotice).toBe('cleared');
  });

  it('reports cleared when no storage is configured', () => {
    const store = createStore();
    store.clearSavedData();
    expect(store.getState().storageNotice).toBe('cleared');
  });

  it('reports failed when the storage cannot clear', () => {
    const store = createStore({}, { storage: memoryStorage('he', false) });
    store.clearSavedData();
    expect(store.getState().storageNotice).toBe('failed');
  });

  it('keeps the language, scenario, view, baseline and seats of this visit', () => {
    const store = createStore({}, { storage: memoryStorage(null) });
    store.setLanguage('he');
    store.setView('seats');
    expect(store.saveBaseline()).toBe(true);
    store.toggleCoalitionMember('P1');
    const before = store.getState();
    const derived = store.getDerived();
    const seatsBefore = serializeResult(derived.result!);
    store.clearSavedData();
    const after = store.getState();
    expect(after.language).toBe('he');
    expect(after.view).toBe('seats');
    expect(after.input).toBe(before.input);
    expect(after.baseline).toBe(before.baseline);
    expect(after.coalitionSelection).toEqual(['P1']);
    expect(store.getDerived()).toBe(derived);
    expect(serializeResult(store.getDerived().result!)).toBe(seatsBefore);
  });

  it('notifies subscribers once', () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.clearSavedData();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('drops the notice on the next state change of any kind', () => {
    const store = createStore({}, { storage: memoryStorage(null) });
    const changes: [string, () => void][] = [
      ['view', () => store.setView('coalitions')],
      ['input', () => store.updateInput((input) => input)],
      ['preset', () => store.loadPreset('baseline')],
      ['lock', () => store.toggleLock(shareLockKey('G1'))],
    ];
    for (const [name, change] of changes) {
      store.clearSavedData();
      expect(store.getState().storageNotice, name).toBe('cleared');
      change();
      expect(store.getState().storageNotice, name).toBeNull();
    }
  });

  it('writes a later language choice again and drops the notice', () => {
    const storage = memoryStorage('he');
    const store = createStore({}, { storage });
    store.clearSavedData();
    store.setLanguage('en');
    expect(storage.saved).toEqual(['en']);
    expect(store.getState().storageNotice).toBeNull();
  });

  it('shows a second clear as a fresh outcome', () => {
    const store = createStore({}, { storage: memoryStorage(null) });
    store.clearSavedData();
    store.clearSavedData();
    expect(store.getState().storageNotice).toBe('cleared');
  });
});

describe('UI sources stay free of electoral arithmetic', () => {
  const entries = Object.entries(uiSources) as [string, string][];
  const formatterPath = '../../src/i18n/format.ts';

  it('scans the UI and i18n sources', () => {
    const paths = entries.map(([path]) => path);
    expect(paths.some((path) => path.includes('/src/ui/'))).toBe(true);
    expect(paths.some((path) => path.includes('/src/i18n/'))).toBe(true);
    expect(paths).toContain(formatterPath);
  });

  it.each(entries)('%s imports only approved engine APIs', (_path, source) => {
    const engineImports = [
      ...source.matchAll(/from\s+'[./]*\/engine\/([^']+)'/g),
    ].map((match) => match[1]);
    for (const target of engineImports) {
      expect([
        'run',
        'schema',
        'edit',
        'numeric',
        'report',
        'coalitions',
        'compare',
        'composition',
        'future',
        'futureRange',
        'electorate',
        'linkedTurnout',
        'legacyConversion',
        'historical2022',
        'historicalReference',
        'panel',
        'supporterTurnout',
        'coalitionVariants',
      ]).toContain(target);
    }
  });

  it.each(entries)('%s uses no float parsing or rounding', (_path, source) => {
    expect(source).not.toMatch(
      /\b(parseFloat|parseInt|toFixed|toPrecision|Math)\b|\bNumber\(/,
    );
  });

  it.each(entries.filter(([path]) => path !== formatterPath))(
    '%s uses no locale APIs outside the integer formatter',
    (_path, source) => {
      expect(source).not.toMatch(/\b(Intl|toLocaleString)\b/);
    },
  );
});

function draftOf(store: ReturnType<typeof createStore>): Draft {
  const input = store.getState().input;
  if (!isDraft(input)) {
    throw new Error('expected a draft');
  }
  return input;
}

function idsOf(
  store: ReturnType<typeof createStore>,
  kind: 'group' | 'party' | 'block',
): string[] {
  return entities(draftOf(store), kind).map((entity) => entity.id);
}

describe('presets', () => {
  it('lists the four Section 8 presets first, then the extra examples', () => {
    expect(PRESETS).toEqual([
      'baseline',
      'turnoutZero',
      'share7',
      'share8',
      'split',
      'multiBlock',
      'israelExample',
      'historical2022',
    ]);
  });

  it('builds the startup baseline', () => {
    expect(presetInput('baseline')).toEqual(baselineInput());
  });

  it.each(PRESETS)(
    '%s stores an empty name for the scenario and every entity',
    (id) => {
      const input = presetInput(id);
      expect(input.name).toBe('');
      for (const key of ['groups', 'parties', 'blocks']) {
        for (const entity of input[key] as Json[]) {
          expect(entity.name, `${key} ${String(entity.id)}`).toBe('');
        }
      }
    },
  );

  it.each(PRESETS)('%s stores no interface-language text', (id) => {
    expect(JSON.stringify(presetInput(id))).toMatch(/^[\x20-\x7e]*$/);
  });

  it.each(PRESETS)(
    '%s is a current-version file with no growth, no turnout change and no refusals',
    (id) => {
      const input = presetInput(id);
      expect(input.schemaVersion).toBe(SCHEMA_VERSION);
      expect((input.coalitionRules as Json).partyRefusals).toEqual([]);
      for (const group of input.groups as Json[]) {
        expect(group.growthRate, String(group.id)).toBe('0');
        expect(group.turnoutChange, String(group.id)).toBe('0');
      }
    },
  );

  it.each(PRESETS)(
    '%s puts every group at the standard 99.9% valid-ballot rate',
    (id) => {
      for (const group of presetInput(id).groups as Json[]) {
        expect(group.validBallotRate, String(group.id)).toBe('0.999');
      }
    },
  );

  it('builds presets without the translation tables', () => {
    const source = uiSources['../../src/ui/presets.ts'] as string;
    expect(source).toBeDefined();
    expect(source).not.toMatch(/from\s+'\.\.\/i18n/);
  });

  it.each(PRESETS)('%s is valid and allocates every seat', (id) => {
    const store = createStore({ input: presetInput(id) });
    expect(store.getDerived().validation.ok).toBe(true);
    expect(seats(store).reduce((a, b) => a + b, 0)).toBe(120);
  });

  it.each(PRESETS)('loads %s to the same input in every language', (id) => {
    const inputs = LOCALES.map((language) => {
      const store = createStore({ language });
      store.loadPreset(id);
      return JSON.stringify(store.getState().input);
    });
    expect(new Set(inputs).size).toBe(1);
    expect(inputs[0]).toBe(JSON.stringify(presetInput(id)));
  });

  it.each(LOCALES)(
    'starts with the language-free baseline when %s is stored',
    (locale) => {
      const store = createStore({}, { storage: memoryStorage(locale) });
      expect(store.getState().language).toBe(locale);
      expect(store.getState().input).toEqual(baselineInput());
      expect((store.getState().input as Json).name).toBe('');
    },
  );

  it.each(PRESETS)('finds %s by its scenario ID', (id) => {
    expect(presetIdOf(presetInput(id).id)).toBe(id);
  });

  it.each([
    '',
    'Baseline',
    'baseline ',
    'turnoutZero',
    'multiBlock',
    'custom',
    null,
    undefined,
    7,
  ])('finds no preset for the scenario ID %j', (scenarioId) => {
    expect(presetIdOf(scenarioId)).toBeNull();
  });

  it('split has an open group across opposing blocks: 60 / 30 / 10%', () => {
    const input = presetInput('split');
    const group = (input.groups as Json[])[2]!;
    expect(group.votingMode).toBe('open');
    expect(group.voteWeights).toEqual({ P3: '0.6', P1: '0.3', P2: '0.1' });
  });

  it('multiBlock has a block with two parties and a restricted split', () => {
    const input = presetInput('multiBlock');
    const members = (input.parties as Json[]).filter(
      (party) => party.blockId === 'B1',
    );
    expect(members.map((party) => party.id)).toEqual(['P1', 'P5']);
    const group = (input.groups as Json[])[0]!;
    expect(group.votingMode).toBe('restricted');
    expect(group.voteWeights).toEqual({ P1: '0.7', P5: '0.3' });
  });

  it('loads a language-free preset and clears a pending delete', () => {
    const store = createStore({ language: 'he' });
    store.requestDelete('party', 'P1');
    store.loadPreset('split');
    expect(store.getState().input).toEqual(presetInput('split'));
    expect(store.getState().pendingDelete).toBeNull();
  });

  it('returns a fresh preset object on every load', () => {
    const store = createStore();
    store.loadPreset('baseline');
    const first = store.getState().input;
    store.loadPreset('baseline');
    expect(store.getState().input).not.toBe(first);
  });
});

const EXAMPLE_GROUPS = [
  'secular',
  'traditional',
  'religious',
  'haredi',
  'arab',
  'other',
] as const;

const EXAMPLE_PARTIES = [
  'likud',
  'yesh-atid',
  'avoda',
  'religious-zionism',
  'shas',
  'raam',
] as const;

// Section 14.4 table: share of the electorate, then the six preferences.
const EXAMPLE_TABLE: Readonly<
  Record<(typeof EXAMPLE_GROUPS)[number], readonly [string, readonly string[]]>
> = {
  secular: ['0.336', ['0.25', '0.45', '0.2', '0.05', '0.05', '0']],
  traditional: ['0.245', ['0.45', '0.2', '0.05', '0.15', '0.15', '0']],
  religious: ['0.079', ['0.2', '0.05', '0', '0.55', '0.2', '0']],
  haredi: ['0.11', ['0.1', '0.05', '0', '0.15', '0.7', '0']],
  arab: ['0.17', ['0.1', '0.1', '0.05', '0', '0', '0.75']],
  other: ['0.06', ['0.3', '0.35', '0.15', '0.1', '0.05', '0.05']],
};

describe('Israeli educational example', () => {
  it('has the Section 14.4 rules: 120 seats, 3.25% and Hamilton', () => {
    const input = presetInput('israelExample');
    expect(input.id).toBe('israel-example');
    expect(input.notes).toBe('');
    expect(input.rules).toEqual({
      populationTotal: '1000000',
      seatCount: 120,
      majorityMode: 'default',
      majorityOverride: null,
      threshold: '0.0325',
      allocationMethod: 'hamilton',
    });
  });

  it('has the six example groups with their shares, haredi turnout 85% and 70% for the others', () => {
    const groups = presetInput('israelExample').groups as Json[];
    expect(groups.map((group) => group.id)).toEqual([...EXAMPLE_GROUPS]);
    for (const group of groups) {
      const id = group.id as (typeof EXAMPLE_GROUPS)[number];
      expect(group, id).toEqual({
        id,
        name: '',
        populationShare: EXAMPLE_TABLE[id][0],
        growthRate: '0',
        // M7-19 memo point 5: haredi turnout 85%, the others 70%.
        turnout: id === 'haredi' ? '0.85' : '0.7',
        turnoutChange: '0',
        validBallotRate: '0.999',
        participationFactor: '1',
        votingMode: 'open',
        allowedPartyIds: [...EXAMPLE_PARTIES],
        voteWeights: Object.fromEntries(
          EXAMPLE_PARTIES.map((party, index) => [
            party,
            EXAMPLE_TABLE[id][1][index],
          ]),
        ),
      });
    }
  });

  it('takes the group shares from the CBS 2022 electorate, Other the exact rest', () => {
    const groups = presetInput('israelExample').groups as Json[];
    const share = Object.fromEntries(
      groups.map((group) => [group.id, group.populationShare]),
    );
    expect(groups.at(-1)?.id).toBe('other');
    expect(sumFractions(groups.map((group) => group.populationShare))).toBe(
      '1',
    );
    // CBS media release 342/2022: of the eligible voters 77% Jews, Haredim
    // 11%, Arabs 17% and others 6%.
    expect([share.haredi, share.arab, share.other]).toEqual([
      '0.11',
      '0.17',
      '0.06',
    ]);
    expect(
      sumFractions([
        share.secular,
        share.traditional,
        share.religious,
        share.haredi,
      ]),
    ).toBe('0.77');
    for (const group of groups) {
      expect(
        sumFractions(Object.values(group.voteWeights as Json)),
        String(group.id),
      ).toBe('1');
    }
  });

  it('has the six lists in table order with their catalog colours', () => {
    const input = presetInput('israelExample');
    expect(input.parties).toEqual(
      [
        ['likud', '#1D4ED8'],
        ['yesh-atid', '#38BDF8'],
        ['avoda', '#DC2626'],
        ['religious-zionism', '#CA8A04'],
        ['shas', '#475569'],
        ['raam', '#65A30D'],
      ].map(([id, color], index) => ({
        id,
        name: '',
        color,
        blockId: null,
        tieBreakOrder: index + 1,
        canJoinGovernment: true,
      })),
    );
    expect(input.blocks).toEqual([]);
    expect(input.coalitionRules).toEqual({
      incompatiblePartyPairs: [],
      incompatibleBlockPairs: [],
      compatiblePartyOverrides: [],
      partyRefusals: [],
    });
  });

  it('gives 716 500 ballots, 715 783.5 valid, split as the table and the turnout imply', () => {
    const validation = validateScenario(presetInput('israelExample'));
    if (!validation.ok) {
      throw new Error('expected a valid scenario');
    }
    const { votes, threshold } = runSeats(validation.scenario);
    // 700 000 at 70% everywhere plus 110 000 haredi voters at 15 more points.
    expect(compare(votes.totals.cast, rational(716500n))).toBe(0);
    expect(compare(votes.allValidVotes, rational(1431567n, 2n))).toBe(0);
    // The table's votes at 100% validity, then 0.1% of every ballot invalid.
    const expected = [180885n, 174180n, 67865n, 86125n, 116095n, 91350n];
    expect(votes.parties.map((party) => party.partyId)).toEqual([
      ...EXAMPLE_PARTIES,
    ]);
    votes.parties.forEach((party, index) => {
      expect(
        compare(party.votes, rational(expected[index]! * 999n, 1000n)),
        party.partyId,
      ).toBe(0);
    });
    expect(threshold.parties.map((party) => party.status)).toEqual(
      EXAMPLE_PARTIES.map(() => 'qualified'),
    );
  });

  it('allocates 30 / 29 / 11 / 15 / 20 / 15 with no cut-off tie', () => {
    const store = createStore({ input: presetInput('israelExample') });
    expect(seats(store)).toEqual([30, 29, 11, 15, 20, 15]);
    expect(store.getDerived().result?.allocation.cutoffTie).toBe(false);
  });

  it('loads from the preset list like any other preset', () => {
    const store = createStore();
    store.loadPreset('israelExample');
    expect(store.getState().input).toEqual(presetInput('israelExample'));
    expect(seats(store)).toEqual([30, 29, 11, 15, 20, 15]);
  });

  it('keeps the catalog IDs and the seats through export and import', () => {
    const validation = validateScenario(presetInput('israelExample'));
    if (!validation.ok) {
      throw new Error('expected a valid scenario');
    }
    const text = serializeScenario(validation.scenario);
    const store = createStore();
    expect(store.importScenario(text)).toBe(true);
    const input = store.getState().input as Json;
    expect((input.groups as Json[]).map((group) => group.id)).toEqual([
      ...EXAMPLE_GROUPS,
    ]);
    expect((input.parties as Json[]).map((party) => party.id)).toEqual([
      ...EXAMPLE_PARTIES,
    ]);
    expect(seats(store)).toEqual([30, 29, 11, 15, 20, 15]);
  });
});

/** Truncates num / den to the 18 fraction digits a scenario decimal allows. */
function decimal18(num: bigint, den: bigint): string {
  const digits = (num * 10n ** 18n) / den;
  return `0.${digits.toString().padStart(18, '0')}`;
}

interface Section8Row {
  readonly id: PresetId;
  readonly turnout: string;
  readonly seats: readonly number[];
  readonly pairs: readonly string[];
  readonly status: string;
}

// Section 8 table; turnouts from the Section 8.1 inverse, recomputed here.
const SECTION_8: readonly Section8Row[] = [
  {
    id: 'turnoutZero',
    turnout: '0',
    seats: [54, 59, 0, 7],
    pairs: ['P2+P4=66', 'P1+P4=61'],
    status: 'feasible',
  },
  {
    id: 'share7',
    turnout: decimal18(119n, 279n),
    seats: [50, 55, 8, 7],
    pairs: ['P2+P4=62'],
    status: 'feasible',
  },
  {
    id: 'share8',
    turnout: decimal18(34n, 69n),
    seats: [49, 55, 10, 6],
    pairs: ['P2+P4=61'],
    status: 'feasible',
  },
];

function withoutLabels(input: Json): Json {
  const groups = (input.groups as Json[]).map((group) => ({
    ...group,
    turnout: null,
  }));
  return { ...input, id: null, name: null, groups };
}

describe('Section 8 presets', () => {
  it.each(SECTION_8)(
    '$id changes only Group 3 turnout from the baseline',
    (row) => {
      const input = presetInput(row.id);
      const base = presetInput('baseline');
      expect(withoutLabels(input)).toEqual(withoutLabels(base));
      const turnouts = (input.groups as Json[]).map((group) => group.turnout);
      expect(turnouts).toEqual(['1', '1', row.turnout, '1']);
      expect(input.name).toBe('');
      expect(input.id).not.toBe(base.id);
    },
  );

  it.each(SECTION_8)(
    '$id reproduces the Section 8 seats and permitted pairs',
    (row) => {
      const validation = validateScenario(presetInput(row.id));
      if (!validation.ok) {
        throw new Error('expected a valid scenario');
      }
      const result = runScenario(validation.scenario);
      expect(result.allocation.parties.map((party) => party.seats)).toEqual(
        row.seats,
      );
      expect(
        result.coalitions.minimalWinning.map(
          (coalition) => `${coalition.partyIds.join('+')}=${coalition.seats}`,
        ),
      ).toEqual(row.pairs);
      expect(result.coalitions.status).toBe(row.status);
      expect(result.coalitions.complete).toBe(true);
    },
  );

  it.each([
    ['share7', 7n],
    ['share8', 8n],
  ] as const)('%s gives Group 3 a final vote share within 1e-15', (id, pct) => {
    const validation = validateScenario(presetInput(id));
    if (!validation.ok) {
      throw new Error('expected a valid scenario');
    }
    const share = runScenario(validation.scenario).votes.parties[2]!.voteShare;
    if (share === null) {
      throw new Error('expected a vote share');
    }
    const error = sub(share, rational(pct, 100n));
    const bound = rational(1n, 10n ** 15n);
    expect(compare(error, bound)).toBe(-1);
    expect(compare(error, neg(bound))).toBe(1);
  });
});

describe('delete confirmation', () => {
  it('starts with no pending delete', () => {
    expect(createStore().getState().pendingDelete).toBeNull();
  });

  it('deletes a group at once because nothing references it', () => {
    const store = createStore();
    store.requestDelete('group', 'G4');
    expect(idsOf(store, 'group')).toEqual(['G1', 'G2', 'G3']);
    expect(store.getState().pendingDelete).toBeNull();
  });

  it('asks for confirmation before deleting a referenced party', () => {
    const store = createStore();
    const input = store.getState().input;
    store.requestDelete('party', 'P1');
    expect(store.getState().pendingDelete).toEqual({ kind: 'party', id: 'P1' });
    expect(store.getState().input).toBe(input);
  });

  it('cancels without changing the scenario', () => {
    const store = createStore();
    const input = store.getState().input;
    store.requestDelete('block', 'B1');
    store.cancelDelete();
    expect(store.getState().pendingDelete).toBeNull();
    expect(store.getState().input).toBe(input);
  });

  it('confirms with a repair and recomputes the result', () => {
    const store = createStore();
    store.requestDelete('party', 'P4');
    expect(store.confirmDelete({ mode: 'reassign', targetId: 'P2' })).toBe(
      true,
    );
    expect(store.getState().pendingDelete).toBeNull();
    expect(idsOf(store, 'party')).toEqual(['P1', 'P2', 'P3']);
    expect(seats(store)).toEqual([46, 56, 18]);
  });

  it('keeps the confirmation open when the repair is invalid', () => {
    const store = createStore();
    const input = store.getState().input;
    store.requestDelete('party', 'P4');
    expect(store.confirmDelete({ mode: 'reassign', targetId: 'P4' })).toBe(
      false,
    );
    expect(store.getState().pendingDelete).toEqual({ kind: 'party', id: 'P4' });
    expect(store.getState().input).toBe(input);
  });

  it('ignores a confirmation when nothing is pending', () => {
    const store = createStore();
    const input = store.getState().input;
    expect(store.confirmDelete({ mode: 'remove' })).toBe(false);
    expect(store.getState().input).toBe(input);
  });

  it('ignores a request for an unknown entity or a non-draft input', () => {
    const store = createStore();
    store.requestDelete('party', 'P9');
    expect(store.getState().pendingDelete).toBeNull();
    const broken = createStore({ input: 'not a scenario' });
    broken.requestDelete('party', 'P1');
    expect(broken.getState().pendingDelete).toBeNull();
    expect(broken.getState().input).toBe('not a scenario');
  });

  it('keeps party-mode references protected in the store delete flow', () => {
    const store = createStore({
      input: partyModeInput([['1', '1']]),
    });
    const before = store.getState().input;
    store.requestDelete('party', 'P1');
    expect(store.getState().pendingDelete).toEqual({ kind: 'party', id: 'P1' });
    expect(store.confirmDelete({ mode: 'remove' })).toBe(false);
    expect(store.getState().input).toBe(before);
    expect(store.getState().pendingDelete).toEqual({ kind: 'party', id: 'P1' });
  });

  it('drops the pending delete when an edit removes the entity', () => {
    const store = createStore();
    store.requestDelete('party', 'P1');
    store.updateInput((input) => ({ ...(input as Json), parties: [] }));
    expect(store.getState().pendingDelete).toBeNull();
  });

  it('keeps the pending delete across an unrelated edit', () => {
    const store = createStore();
    store.requestDelete('party', 'P1');
    store.updateInput((input) => ({ ...(input as Json), name: 'x' }));
    expect(store.getState().pendingDelete).toEqual({ kind: 'party', id: 'P1' });
  });

  it('drops the pending delete when the input is replaced', () => {
    const store = createStore();
    store.requestDelete('party', 'P1');
    store.setInput(baselineInput());
    expect(store.getState().pendingDelete).toBeNull();
  });
});

function edited(
  update: (draft: Draft) => Draft,
): ReturnType<typeof createStore> {
  const store = createStore();
  store.updateInput((input) => update(input as Draft));
  return store;
}

function shares(store: ReturnType<typeof createStore>): string[] {
  return entities(draftOf(store), 'group').map(
    (group) => group.populationShare as string,
  );
}

describe('locks and rebalance', () => {
  it('names lock keys by group and by group and party', () => {
    expect(shareLockKey('G1')).toBe('share:G1');
    expect(weightLockKey('G3', 'P1')).toBe('weight:G3:P1');
  });

  it('starts without locks and toggles a lock on and off', () => {
    const store = createStore();
    expect(store.getState().locks).toEqual([]);
    store.toggleLock('share:G1');
    expect(store.getState().locks).toEqual(['share:G1']);
    store.toggleLock('share:G1');
    expect(store.getState().locks).toEqual([]);
  });

  it('rebalances shares around a locked group to a valid scenario', () => {
    const store = edited((draft) =>
      setGroupFraction(draft, 'G1', 'populationShare', '48'),
    );
    expect(store.getDerived().validation.ok).toBe(false);
    store.toggleLock(shareLockKey('G1'));
    expect(store.rebalanceShares()).toBe(true);
    expect(shares(store)[0]).toBe('0.48');
    expect(store.getDerived().validation.ok).toBe(true);
  });

  it('leaves the input untouched when the engine refuses', () => {
    let store = edited((draft) =>
      setGroupFraction(
        setGroupFraction(draft, 'G1', 'populationShare', '48'),
        'G2',
        'populationShare',
        '60',
      ),
    );
    store.toggleLock(shareLockKey('G1'));
    store.toggleLock(shareLockKey('G2'));
    const before = store.getState().input;
    expect(store.rebalanceShares()).toBe(false);
    expect(store.getState().input).toBe(before);
    store = createStore({ input: { not: 'a draft' } });
    expect(store.rebalanceShares()).toBe(false);
    expect(store.rebalanceWeights('G1')).toBe(false);
  });

  it('refuses group-first rebalance controls in party mode', () => {
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
    const before = store.getState().input;
    expect(store.rebalanceShares()).toBe(false);
    expect(store.rebalanceWeights('G1')).toBe(false);
    expect(store.setCohortTurnout('party', 'P1', '50')).toBe(false);
    expect(store.getState().input).toBe(before);
  });

  it("rebalances one group with that group's weight locks only", () => {
    const store = createStore({
      input: presetInput('split'),
    });
    const split = draftOf(store);
    const open = entities(split, 'group').find(
      (group) => group.votingMode === 'open',
    )!;
    const [first, second] = open.allowedPartyIds as string[];
    store.updateInput((input) =>
      setVoteWeight(input as Draft, open.id, first!, '70'),
    );
    store.toggleLock(weightLockKey(open.id, first!));
    store.toggleLock(weightLockKey('G1', second!));
    expect(store.rebalanceWeights(open.id)).toBe(true);
    const weights = entities(draftOf(store), 'group').find(
      (group) => group.id === open.id,
    )!.voteWeights as Json;
    expect(weights[first!]).toBe('0.7');
    expect(store.getDerived().validation.ok).toBe(true);
  });

  it('clears locks on a new input or preset', () => {
    const store = createStore();
    store.toggleLock('share:G1');
    store.loadPreset('split');
    expect(store.getState().locks).toEqual([]);
    store.toggleLock('share:G1');
    store.setInput(baselineInput());
    expect(store.getState().locks).toEqual([]);
  });

  it('drops locks that name a deleted entity', () => {
    const store = createStore();
    store.toggleLock(shareLockKey('G4'));
    store.toggleLock(shareLockKey('G1'));
    store.toggleLock(weightLockKey('G1', 'P1'));
    store.requestDelete('group', 'G4');
    expect(store.getState().locks).toEqual(['share:G1', 'weight:G1:P1']);
    store.requestDelete('party', 'P1');
    expect(store.confirmDelete({ mode: 'reassign', targetId: 'P2' })).toBe(
      true,
    );
    expect(store.getState().locks).toEqual(['share:G1']);
  });
});

function turnoutOf(
  store: ReturnType<typeof createStore>,
  groupId: string,
): unknown {
  return entities(draftOf(store), 'group').find((group) => group.id === groupId)
    ?.turnout;
}

describe('cohort turnout', () => {
  it('sets the dedicated groups of a block and leaves the shared ones', () => {
    const store = createStore();
    store.loadPreset('split');
    const before = seats(store);
    expect(store.setCohortTurnout('block', 'B1', '50')).toBe(true);
    expect(turnoutOf(store, 'G1')).toBe('0.5');
    expect(turnoutOf(store, 'G3')).toBe('1');
    expect(seats(store)).not.toEqual(before);
  });

  it('gives the zero-turnout seats through the Party 3 shortcut', () => {
    const store = createStore();
    expect(store.setCohortTurnout('party', 'P3', '0')).toBe(true);
    expect(turnoutOf(store, 'G3')).toBe('0');
    expect(seats(store)).toEqual([54, 59, 0, 7]);
  });

  it('gives the same input when applied twice', () => {
    const store = createStore();
    store.loadPreset('multiBlock');
    expect(store.setCohortTurnout('block', 'B1', '50')).toBe(true);
    const once = store.getState().input;
    expect(store.setCohortTurnout('block', 'B1', '50')).toBe(true);
    expect(store.getState().input).toEqual(once);
    expect(turnoutOf(store, 'G1')).toBe('0.5');
  });

  it.each([
    ['text that is not a percent', 'party', 'P1', 'abc'],
    ['a turnout above 100%', 'party', 'P1', '101'],
    ['a party with only a shared group', 'party', 'P3', '50'],
    ['an unknown party', 'party', 'P9', '50'],
    ['an unknown block', 'block', 'B9', '50'],
  ] as const)('refuses %s and keeps the input', (_, kind, id, text) => {
    const store = createStore();
    store.loadPreset('split');
    const before = store.getState().input;
    expect(store.setCohortTurnout(kind, id, text)).toBe(false);
    expect(store.getState().input).toBe(before);
  });

  it('refuses when the input is not a draft', () => {
    const store = createStore({ input: { not: 'a draft' } });
    expect(store.setCohortTurnout('party', 'P1', '50')).toBe(false);
  });
});

describe('coalition pairs and selection', () => {
  function rulesOf(store: ReturnType<typeof createStore>): Json {
    return (store.getState().input as Json).coalitionRules as Json;
  }

  it('adds and removes pairs through the engine edits', () => {
    const store = createStore();
    expect(store.addPair('incompatiblePartyPairs', 'P4', 'P3')).toBe(true);
    expect(rulesOf(store).incompatiblePartyPairs).toEqual([
      ['P1', 'P2'],
      ['P3', 'P4'],
    ]);
    expect(store.removePair('incompatiblePartyPairs', 0)).toBe(true);
    expect(rulesOf(store).incompatiblePartyPairs).toEqual([['P3', 'P4']]);
  });

  it('returns false and keeps the input when a pair is refused', () => {
    const store = createStore();
    const input = store.getState().input;
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.addPair('incompatiblePartyPairs', 'P2', 'P1')).toBe(false);
    expect(store.addPair('incompatiblePartyPairs', 'P1', 'P1')).toBe(false);
    expect(store.removePair('incompatiblePartyPairs', 5)).toBe(false);
    expect(store.getState().input).toBe(input);
    expect(listener).not.toHaveBeenCalled();
  });

  it('returns false for pair edits on a non-draft input', () => {
    const store = createStore({ input: 'not a scenario' });
    expect(store.addPair('incompatiblePartyPairs', 'P1', 'P3')).toBe(false);
    expect(store.removePair('incompatiblePartyPairs', 0)).toBe(false);
  });

  it('adds refusals in their own direction and removes them by position', () => {
    const store = createStore();
    expect(store.addPair('partyRefusals', 'P4', 'P3')).toBe(true);
    expect(store.addPair('partyRefusals', 'P3', 'P4')).toBe(true);
    expect(store.addPair('partyRefusals', 'P4', 'P3')).toBe(false);
    expect(rulesOf(store).partyRefusals).toEqual([
      ['P4', 'P3'],
      ['P3', 'P4'],
    ]);
    expect(store.getDerived().validation.ok).toBe(true);
    expect(store.removePair('partyRefusals', 0)).toBe(true);
    expect(rulesOf(store).partyRefusals).toEqual([['P3', 'P4']]);
  });

  it('toggles coalition members in tick order', () => {
    const store = createStore();
    store.toggleCoalitionMember('P3');
    store.toggleCoalitionMember('P1');
    expect(store.getState().coalitionSelection).toEqual(['P3', 'P1']);
    store.toggleCoalitionMember('P3');
    expect(store.getState().coalitionSelection).toEqual(['P1']);
  });

  it('drops a deleted party from the selection', () => {
    const store = createStore();
    store.toggleCoalitionMember('P4');
    store.toggleCoalitionMember('P2');
    store.updateInput((input) => {
      const draft = input as Json;
      return {
        ...draft,
        parties: (draft.parties as Json[]).filter((party) => party.id !== 'P4'),
      };
    });
    expect(store.getState().coalitionSelection).toEqual(['P2']);
  });

  it('clears the selection on a new input or preset', () => {
    const store = createStore();
    store.toggleCoalitionMember('P1');
    store.setInput(baselineInput());
    expect(store.getState().coalitionSelection).toEqual([]);
    store.toggleCoalitionMember('P1');
    store.loadPreset('split');
    expect(store.getState().coalitionSelection).toEqual([]);
  });
});

describe('baseline', () => {
  function nameOf(input: unknown): unknown {
    return (input as Json).name;
  }

  it('starts without a baseline', () => {
    const store = createStore();
    expect(store.getState().baseline).toBeNull();
    expect(store.getBaseline()).toBeNull();
  });

  it('saves an independent deep copy of a valid input', () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.saveBaseline()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    const { input, baseline } = store.getState();
    expect(baseline).toEqual(input);
    expect(baseline).not.toBe(input);
    expect((baseline as Json).groups).not.toBe((input as Json).groups);
    (input as Json).name = 'changed in place';
    ((input as Json).groups as Json[])[0]!.turnout = '0';
    expect(nameOf(store.getState().baseline)).toBe(baselineInput().name);
    expect(
      ((store.getState().baseline as Json).groups as Json[])[0]!.turnout,
    ).toBe('1');
  });

  it('refuses to save an invalid input and keeps the old baseline', () => {
    const store = createStore();
    store.saveBaseline();
    const saved = store.getState().baseline;
    store.setInput('not a scenario');
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.saveBaseline()).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    expect(store.getState().baseline).toBe(saved);
  });

  it('replaces the baseline when saved again', () => {
    const store = createStore();
    store.saveBaseline();
    store.loadPreset('split');
    store.saveBaseline();
    expect(store.getState().baseline).toEqual(store.getState().input);
    expect((store.getState().baseline as Json).id).toBe(
      presetInput('split').id,
    );
  });

  it('is not reached by edits, preset loads, language or view changes', () => {
    const store = createStore();
    store.saveBaseline();
    const saved = store.getState().baseline;
    const copy = JSON.stringify(saved);
    store.updateInput((input) =>
      setGroupFraction(input as Draft, 'G3', 'turnout', '50'),
    );
    store.loadPreset('multiBlock');
    store.setLanguage('he');
    store.setView('compare');
    expect(store.getState().baseline).toBe(saved);
    expect(JSON.stringify(store.getState().baseline)).toBe(copy);
  });

  it('derives the baseline result and caches it', () => {
    const store = createStore();
    store.saveBaseline();
    const first = store.getBaseline();
    if (first === null || !first.validation.ok || first.result === null) {
      throw new Error('expected a valid baseline');
    }
    expect(first.result.allocation.parties.map((party) => party.seats)).toEqual(
      [46, 50, 18, 6],
    );
    store.updateInput((input) =>
      setGroupFraction(input as Draft, 'G3', 'turnout', '50'),
    );
    const second = store.getBaseline();
    expect(second).toBe(first);
    expect(seats(store)).not.toEqual([46, 50, 18, 6]);
  });

  it('resets the current input to a fresh copy of the baseline', () => {
    const store = createStore();
    store.saveBaseline();
    const saved = store.getState().baseline;
    store.updateInput((input) =>
      setGroupFraction(input as Draft, 'G3', 'turnout', '50'),
    );
    store.toggleLock('share:G1');
    store.toggleCoalitionMember('P1');
    store.requestDelete('party', 'P1');
    expect(store.getState().pendingDelete).not.toBeNull();
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.resetToBaseline()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    const state = store.getState();
    expect(state.input).toEqual(saved);
    expect(state.input).not.toBe(saved);
    expect(state.baseline).toBe(saved);
    expect(state.locks).toEqual([]);
    expect(state.coalitionSelection).toEqual([]);
    expect(state.pendingDelete).toBeNull();
    expect(seats(store)).toEqual([46, 50, 18, 6]);
    (state.input as Json).name = 'edited after reset';
    expect(nameOf(store.getState().baseline)).toBe(baselineInput().name);
  });

  it('refuses to reset without a baseline', () => {
    const store = createStore();
    const before = store.getState();
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.resetToBaseline()).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    expect(store.getState()).toBe(before);
  });

  it('clears the baseline and notifies only on a change', () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.clearBaseline();
    expect(listener).not.toHaveBeenCalled();
    store.saveBaseline();
    store.clearBaseline();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getState().baseline).toBeNull();
    expect(store.getBaseline()).toBeNull();
  });

  it('accepts an initial baseline', () => {
    const store = createStore({ baseline: baselineInput() });
    const derived = store.getBaseline();
    expect(derived?.validation.ok).toBe(true);
  });
});

describe('scenario import', () => {
  function exported(input: unknown): string {
    const validation = validateScenario(input);
    if (!validation.ok) {
      throw new Error('expected a valid scenario');
    }
    return serializeScenario(validation.scenario);
  }

  function busyStore(): ReturnType<typeof createStore> {
    const store = createStore();
    store.toggleLock(shareLockKey('G1'));
    store.toggleCoalitionMember('P1');
    store.requestDelete('party', 'P1');
    expect(store.getState().pendingDelete).not.toBeNull();
    return store;
  }

  it('starts without import issues', () => {
    expect(createStore().getState().importIssues).toBeNull();
  });

  it('loads valid text like a preset and keeps the baseline', () => {
    const store = busyStore();
    store.saveBaseline();
    const baseline = store.getState().baseline;
    const listener = vi.fn();
    store.subscribe(listener);
    const text = exported(presetInput('split'));
    expect(store.importScenario(text)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    const state = store.getState();
    expect(state.input).toEqual(JSON.parse(text));
    expect(state.pendingDelete).toBeNull();
    expect(state.locks).toEqual([]);
    expect(state.coalitionSelection).toEqual([]);
    expect(state.importIssues).toBeNull();
    expect(state.baseline).toBe(baseline);
    expect(directRun(state.input)).toBe(directRun(presetInput('split')));
  });

  it('stores the validated scenario, not the raw text fields', () => {
    const store = createStore();
    const raw = { ...baselineInput(), extra: 'dropped' };
    expect(store.importScenario(JSON.stringify(raw))).toBe(true);
    expect(store.getState().input).not.toHaveProperty('extra');
    expect(exported(store.getState().input)).toBe(exported(baselineInput()));
  });

  it('gives the imported input to the editor as an independent copy', () => {
    const store = createStore();
    const text = exported(baselineInput());
    store.importScenario(text);
    const first = store.getState().input;
    store.importScenario(text);
    expect(store.getState().input).toEqual(first);
    expect(store.getState().input).not.toBe(first);
  });

  it.each([
    ['malformed JSON', '{"schemaVersion":', [':invalid-json']],
    [
      'a future schema version',
      JSON.stringify({ ...baselineInput(), schemaVersion: SCHEMA_VERSION + 1 }),
      ['schemaVersion:unsupported-version'],
    ],
    [
      'oversize text',
      JSON.stringify({ notes: 'x'.repeat(LIMITS.jsonBytes) }),
      [':too-large'],
    ],
  ])('rejects %s and keeps everything else', (_name, text, expected) => {
    const store = busyStore();
    const before = store.getState();
    expect(store.importScenario(text)).toBe(false);
    const after = store.getState();
    expect(after.input).toBe(before.input);
    expect(after.locks).toBe(before.locks);
    expect(after.coalitionSelection).toBe(before.coalitionSelection);
    expect(after.pendingDelete).toBe(before.pendingDelete);
    expect(
      after.importIssues?.map((issue) => `${issue.path}:${issue.code}`),
    ).toEqual(expected);
  });

  it('lists every validation issue of a rejected scenario', () => {
    const store = createStore();
    const input = withRules(baselineInput(), { seatCount: 0, threshold: '2' });
    const expected = validateScenario(input);
    if (expected.ok) {
      throw new Error('expected an invalid scenario');
    }
    store.importScenario(JSON.stringify(input));
    expect(store.getState().importIssues).toEqual(expected.issues);
  });

  it('clears old issues after a successful import', () => {
    const store = createStore();
    store.importScenario('nope');
    expect(store.getState().importIssues).not.toBeNull();
    store.importScenario(exported(baselineInput()));
    expect(store.getState().importIssues).toBeNull();
  });

  it.each(['too-large', 'unreadable'] as const)(
    'records a %s file without touching the input',
    (code) => {
      const store = busyStore();
      const before = store.getState();
      store.rejectImport(code);
      const after = store.getState();
      expect(after.input).toBe(before.input);
      expect(after.locks).toBe(before.locks);
      expect(after.importIssues?.map((issue) => issue.code)).toEqual([code]);
      expect(after.importIssues?.[0]?.path).toBe('');
    },
  );

  it('dismisses the issues and notifies once', () => {
    const store = createStore();
    store.importScenario('nope');
    const listener = vi.fn();
    store.subscribe(listener);
    store.dismissImport();
    expect(store.getState().importIssues).toBeNull();
    store.dismissImport();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('imports the same text to the same input under every language', () => {
    const text = exported(presetInput('multiBlock'));
    const inputs = LOCALES.map((language) => {
      const store = createStore({ language });
      store.importScenario(text);
      return store.getState().input;
    });
    expect(inputs[1]).toEqual(inputs[0]);
    expect(inputs[2]).toEqual(inputs[0]);
  });
});

/** Texts by index; null leaves that field as it is. */
type BookAnswers = Readonly<Record<PageKey, readonly (string | null)[]>>;

const SIX_LISTS: BookAnswers = {
  'parties.count': ['6'],
  'parties.naming': ['example'],
  'people.set': ['example'],
};

const THRESHOLD_BOUNDARY_BOOK: BookAnswers = {
  'parties.count': ['2'],
  'parties.naming': ['own'],
  'parties.names': [null, 'At threshold', null, 'Other'],
  'people.set': ['own'],
  'people.count': ['2'],
  'people.names': [null, 'Group one', null, 'Group two'],
  turnout: ['70', '70'],
  'votes.shares': ['3.25', '96.75'],
  compose: ['1', '99', '5', '95'],
  'rules.threshold': ['3.25'],
};

/** Ten parties and eight own groups with long names. */
const LONG_GROUPS: BookAnswers = {
  'parties.count': ['10'],
  'people.set': ['own'],
  'people.count': ['8'],
  'people.names': [1, 2, 3, 4, 5, 6, 7, 8].flatMap((n) => [
    null,
    `Группа номер ${n} ${'с длинным названием '.repeat(2)}`.slice(0, 60),
  ]),
};

/** Ten own party names: the names page in two parts. */
const LONG_NAMES: BookAnswers = {
  'parties.count': ['10'],
  'parties.naming': ['own'],
};

/** The pages of the screen on show (M7-19). */
function shownScreen(
  store: ReturnType<typeof createStore>,
): readonly PageKey[] {
  const { draft, page } = store.getState().book;
  return screenOf(draft, page);
}

/**
 * Types the answers of the screen's pages, up to `until` when given; a typed
 * answer can add pages to the screen, so the screen is read again each time.
 */
function typeScreen(
  store: ReturnType<typeof createStore>,
  answers: BookAnswers,
  until?: PageKey,
): void {
  for (let at = 0; at < shownScreen(store).length; at += 1) {
    const page = shownScreen(store)[at]!;
    if (page === until) return;
    (answers[page] ?? []).forEach((text, index) => {
      if (text !== null) {
        store.answerBook(index, text, page);
      }
    });
  }
}

/**
 * Types the given answers and turns screens with Next until the screen holding
 * the page shows; on that screen only the pages before it are typed.
 */
function turnBook(
  store: ReturnType<typeof createStore>,
  answers: BookAnswers,
  until: PageKey = 'review',
): void {
  let guard = 0;
  while (!shownScreen(store).includes(until)) {
    const page = store.getState().book.page;
    typeScreen(store, answers);
    if (guard > 200 || !store.bookNext()) {
      throw new Error(`stuck at ${page}`);
    }
    guard += 1;
  }
  typeScreen(store, answers, until);
}

function bookStore(): ReturnType<typeof createStore> {
  return createStore({ screen: 'book' });
}

function changed(): ReturnType<typeof createStore> {
  const store = createStore();
  store.updateInput((input) => withRules(input as Json, { seatCount: 121 }));
  return store;
}

describe('questionnaire state', () => {
  it.each(['build', 'skip'] as const)(
    'keeps the threshold-boundary party share through questionnaire %s',
    (action) => {
      const store = bookStore();
      turnBook(store, THRESHOLD_BOUNDARY_BOOK);
      if (action === 'build') {
        store.buildBook();
      } else {
        store.skipBook();
      }

      expect(store.getState().screen).toBe('app');
      expect(seats(store)).toEqual([4, 116]);
    },
  );

  it('opens the editor unless the book is asked for', () => {
    const store = createStore();
    expect(store.getState().screen).toBe('app');
    expect(store.getState().book).toBe(EMPTY_BOOK);
    expect(store.getState().autoFilled).toEqual([]);
    expect(store.getState().replacePending).toBeNull();
    expect(bookStore().getState().screen).toBe('book');
  });

  it('counts the input as changed after an edit, not before', () => {
    const store = createStore();
    expect(store.getState().loadedInput).toBe(store.getState().input);
    store.updateInput((input) => withRules(input as Json, { seatCount: 121 }));
    expect(store.getState().loadedInput).not.toBe(store.getState().input);
  });

  it('counts a loaded preset, an import, a reset and a set input as unchanged', () => {
    const store = changed();
    store.loadPreset('split');
    expect(store.getState().loadedInput).toBe(store.getState().input);
    store.saveBaseline();
    store.updateInput((input) => withRules(input as Json, { seatCount: 121 }));
    store.resetToBaseline();
    expect(store.getState().loadedInput).toBe(store.getState().input);
    store.updateInput((input) => withRules(input as Json, { seatCount: 121 }));
    const validation = validateScenario(presetInput('multiBlock'));
    if (!validation.ok) {
      throw new Error('expected a valid scenario');
    }
    store.importScenario(serializeScenario(validation.scenario));
    expect(store.getState().loadedInput).toBe(store.getState().input);
    store.setInput(baselineInput());
    expect(store.getState().loadedInput).toBe(store.getState().input);
  });
});

describe('questionnaire navigation', () => {
  it('confirms a valid page and turns to the next', () => {
    const store = bookStore();
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.bookNext()).toBe(true);
    expect(store.getState().book.page).toBe('parties.count');
    expect(store.getState().book.answered).toEqual([]);
    store.answerBook(0, '5');
    expect(shownTexts(store.getState().book.draft, 'parties.count')).toEqual([
      '5',
    ]);
    // M7-19: the count and the naming share a screen and are confirmed together.
    expect(store.bookNext()).toBe(true);
    expect(store.getState().book.page).toBe('parties.names');
    expect(store.getState().book.answered).toEqual([
      'parties.count',
      'parties.naming',
    ]);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('confirms a suggestion left as it is', () => {
    const store = bookStore();
    turnBook(store, {}, 'parties.names');
    expect(store.getState().book.answered).toEqual([
      'parties.count',
      'parties.naming',
    ]);
    expect(isSuggested(store.getState().book.draft, 'parties.count')).toBe(
      false,
    );
  });

  it('stays on an invalid page and shows the error until it is fixed', () => {
    const store = bookStore();
    store.bookNext();
    store.answerBook(0, '1');
    expect(store.getState().book.attempted).toBe(false);
    expect(store.bookNext()).toBe(false);
    expect(store.getState().book.page).toBe('parties.count');
    expect(store.getState().book.attempted).toBe(true);
    expect(store.getState().book.answered).toEqual([]);
    store.answerBook(0, '2');
    expect(store.bookNext()).toBe(true);
    expect(store.getState().book.attempted).toBe(false);
  });

  it('goes back without confirming and drops the error', () => {
    const store = bookStore();
    store.bookNext();
    store.answerBook(0, '1');
    store.bookNext();
    store.bookBack();
    expect(store.getState().book.page).toBe('intro');
    expect(store.getState().book.attempted).toBe(false);
    expect(store.getState().book.answered).toEqual([]);
    store.bookBack();
    expect(store.getState().book.page).toBe('intro');
  });

  it('turns only to pages of the current list', () => {
    const store = bookStore();
    store.bookGoTo('compose.7');
    store.bookGoTo('growth.0');
    store.bookGoTo('nonsense');
    store.bookGoTo('prefs.0');
    expect(store.getState().book.page).toBe('intro');
    store.bookGoTo('review');
    expect(store.getState().book.page).toBe('review');
    // M7-19: a page opens the first page of the screen that holds it.
    store.bookGoTo('people.about');
    expect(store.getState().book.page).toBe('people.set');
    store.answerBook(0, 'own', 'people.set');
    expect(store.bookNext()).toBe(true);
    // M7-15: one compose page; the per-party and choice pages are gone.
    for (const gone of ['compose.mode', 'compose.known.3', 'compose.3']) {
      store.bookGoTo(gone);
      expect(store.getState().book.page).not.toBe(gone);
    }
    store.bookGoTo('compose');
    expect(store.getState().book.page).toBe('turnout');
    expect(shownScreen(store)).toContain('compose');
  });

  it('opens the facts page over the current page and returns to it', () => {
    const store = bookStore();
    store.bookNext();
    store.openFact();
    expect(store.getState().book.facts).toBe(true);
    expect(store.getState().book.page).toBe('parties.count');
    store.closeFact();
    expect(store.getState().book.facts).toBe(false);
    store.openFact();
    store.bookNext();
    expect(store.getState().book.facts).toBe(false);
  });

  it('asks before the six-list set changes the party count', () => {
    const store = bookStore();
    turnBook(store, {}, 'parties.naming');
    store.answerBook(0, 'example', 'parties.naming');
    expect(store.getState().book.confirm).toBe('example-count');
    expect(shownTexts(store.getState().book.draft, 'parties.naming')).toEqual([
      'catalog',
    ]);
    store.cancelBook();
    expect(store.getState().book.confirm).toBeNull();
    expect(isSuggested(store.getState().book.draft, 'parties.naming')).toBe(
      true,
    );
    store.answerBook(0, 'example', 'parties.naming');
    store.confirmBook();
    const { book } = store.getState();
    expect(book.confirm).toBeNull();
    // M7-19: the screen opens on the count, with the naming beside it.
    expect(book.page).toBe('parties.count');
    expect(shownTexts(book.draft, 'parties.count')).toEqual(['6']);
    expect(shownTexts(book.draft, 'parties.naming')).toEqual(['example']);
    expect(book.answered).toContain('parties.count');
  });

  it('takes the six-list set without asking when six parties are chosen', () => {
    const store = bookStore();
    turnBook(store, { 'parties.count': ['6'] }, 'parties.naming');
    store.answerBook(0, 'example', 'parties.naming');
    expect(store.getState().book.confirm).toBeNull();
    expect(shownTexts(store.getState().book.draft, 'parties.naming')).toEqual([
      'example',
    ]);
  });

  it('leaves the input, baseline and view alone until the build', () => {
    const store = bookStore();
    const before = store.getState();
    turnBook(store, SIX_LISTS);
    const after = store.getState();
    expect(after.input).toBe(before.input);
    expect(after.loadedInput).toBe(before.loadedInput);
    expect(after.baseline).toBe(before.baseline);
    expect(after.view).toBe(before.view);
    expect(after.screen).toBe('book');
  });
});

describe('questionnaire parts', () => {
  /** The page and part on screen. */
  const at = (store: ReturnType<typeof createStore>) => {
    const { page, part } = store.getState().book;
    return `${page}#${part}`;
  };

  it('shows the six-list pages of party voters whole', () => {
    const store = bookStore();
    turnBook(store, SIX_LISTS, 'votes.shares');
    const { draft } = store.getState().book;
    expect(partCount(draft, 'votes.shares')).toBe(1);
    expect(partCount(draft, 'compose')).toBe(1);
    expect(partCount(draft, 'votes.check')).toBe(1);
    // M7-19: turnout, vote shares and compositions share one screen.
    expect(shownScreen(store)).toEqual(['turnout', 'votes.shares', 'compose']);
    expect(store.bookNext()).toBe(true);
    expect(at(store)).toBe('votes.check#0');
    for (const page of ['turnout', 'votes.shares', 'compose']) {
      expect(store.getState().book.answered).toContain(page);
    }
  });

  it('walks the parts of a dense page before turning it', () => {
    const store = bookStore();
    turnBook(store, LONG_NAMES, 'parties.names');
    expect(at(store)).toBe('parties.names#0');
    expect(partCount(store.getState().book.draft, 'parties.names')).toBe(2);
    expect(store.bookNext()).toBe(true);
    expect(at(store)).toBe('parties.names#1');
    expect(store.getState().book.answered).not.toContain('parties.names');
    expect(store.bookNext()).toBe(true);
    expect(at(store)).toBe('people.set#0');
    expect(store.getState().book.answered).toContain('parties.names');
  });

  it('shows the whole check page in one part', () => {
    const store = bookStore();
    turnBook(store, LONG_GROUPS, 'votes.check');
    expect(at(store)).toBe('votes.check#0');
    expect(partCount(store.getState().book.draft, 'votes.check')).toBe(1);
    expect(store.bookNext()).toBe(true);
    expect(store.getState().book.page).not.toBe('votes.check');
    expect(store.getState().book.part).toBe(0);
    expect(store.getState().book.answered).not.toContain('votes.check');
    store.bookBack();
    expect(at(store)).toBe('votes.check#0');
  });

  it('stops on a part with a wrong value and on the single compose page', () => {
    const store = bookStore();
    turnBook(store, LONG_NAMES, 'parties.names');
    store.answerBook(1, 'Ш'.repeat(61));
    expect(store.bookNext()).toBe(false);
    expect(at(store)).toBe('parties.names#0');
    expect(store.getState().book.attempted).toBe(true);
    store.answerBook(1, 'Партия');
    expect(store.bookNext()).toBe(true);
    expect(at(store)).toBe('parties.names#1');
    expect(store.getState().book.attempted).toBe(false);
    turnBook(store, LONG_GROUPS, 'compose');
    // M7-19: the compose page sits on the turnout screen.
    store.answerBook(1, '120', 'compose');
    expect(store.bookNext()).toBe(false);
    expect(at(store)).toBe('turnout#0');
    store.answerBook(1, '30', 'compose');
    expect(store.bookNext()).toBe(false);
    expect(at(store)).toBe('turnout#0');
    expect(store.getState().book.attempted).toBe(true);
    expect(store.getState().book.answered).not.toContain('compose');
  });

  it('returns to the earlier part that holds the wrong value', () => {
    const store = bookStore();
    turnBook(store, LONG_NAMES, 'parties.names');
    store.bookNext();
    expect(at(store)).toBe('parties.names#1');
    store.answerBook(1, 'Ш'.repeat(61));
    expect(store.bookNext()).toBe(false);
    expect(at(store)).toBe('parties.names#0');
    expect(store.getState().book.attempted).toBe(true);
  });

  it('goes back through the parts and to the last part of the previous page', () => {
    const store = bookStore();
    turnBook(store, LONG_NAMES, 'people.about');
    store.bookBack();
    expect(at(store)).toBe('parties.names#1');
    store.bookBack();
    expect(at(store)).toBe('parties.names#0');
    store.bookBack();
    // M7-19: the naming shares its screen with the count.
    expect(at(store)).toBe('parties.count#0');
  });

  it('lands on the first part when going to a page or starting again', () => {
    const store = bookStore();
    turnBook(store, LONG_NAMES, 'parties.names');
    store.bookNext();
    expect(at(store)).toBe('parties.names#1');
    store.bookGoTo('parties.names');
    expect(at(store)).toBe('parties.names#0');
    store.bookNext();
    store.restartBook();
    store.confirmBook();
    expect(store.getState().book).toEqual(EMPTY_BOOK);
  });

  it('keeps the part under the facts page', () => {
    const store = bookStore();
    turnBook(store, LONG_NAMES, 'parties.names');
    store.bookNext();
    store.openFact();
    expect(at(store)).toBe('parties.names#1');
    store.closeFact();
    expect(at(store)).toBe('parties.names#1');
    expect(store.getState().book.facts).toBe(false);
  });

  it('shows the review on one screen, then stops for the build (M7-19)', () => {
    const store = bookStore();
    const long = (n: number) =>
      `Партия номер ${n} ${'с длинным названием '.repeat(3)}`.slice(0, 60);
    turnBook(store, {
      'parties.count': ['10'],
      'parties.names': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap((n) => [
        null,
        long(n),
      ]),
    });
    expect(partCount(store.getState().book.draft, 'review')).toBe(1);
    expect(at(store)).toBe('review#0');
    expect(store.bookNext()).toBe(false);
    expect(at(store)).toBe('review#0');
    store.bookBack();
    expect(at(store)).toBe('coalitions#0');
    store.bookGoTo('review');
    store.buildBook();
    expect(store.getState().screen).toBe('app');
    expect(store.getState().view).toBe('coalitions');
  });

  it('skips from the compose page with the whole page', () => {
    const store = bookStore();
    turnBook(store, LONG_GROUPS, 'compose');
    store.answerBook(0, '100', 'compose');
    [1, 2, 3, 4, 5, 6, 7].forEach((index) =>
      store.answerBook(index, '0', 'compose'),
    );
    store.skipBook();
    const parties = (store.getState().input as { parties: Json[] }).parties;
    // Likud draws all of group 1; M7-15: other parties keep the even split.
    expect(parties[0]!.composition).toMatchObject({
      G1: { numerator: '1', denominator: '1' },
      G2: { numerator: '0', denominator: '1' },
    });
    expect(Object.keys(parties[1]!.composition as Json)).toHaveLength(8);
    expect(store.getState().screen).toBe('app');
  });
});
describe('questionnaire lessons and names', () => {
  const at = (store: ReturnType<typeof createStore>) => {
    const { page, part } = store.getState().book;
    return `${page}#${part}`;
  };

  it('turns past both lessons with Next and Back without answering them (M7-19)', () => {
    const store = bookStore();
    turnBook(store, {}, 'people.about');
    expect(store.getState().book.answered).toEqual([
      'parties.count',
      'parties.naming',
      'parties.names',
    ]);
    // M7-20: the group question opens the screen; the lessons follow it.
    expect(at(store)).toBe('people.set#0');
    expect(shownScreen(store)).toEqual([
      'people.set',
      'people.about',
      'people.mix',
    ]);
    expect(store.bookNext()).toBe(true);
    expect(at(store)).toBe('turnout#0');
    expect(store.getState().book.answered).toContain('people.set');
    expect(store.getState().book.answered).not.toContain('people.about');
    expect(store.getState().book.answered).not.toContain('people.mix');
    store.bookBack();
    expect(at(store)).toBe('people.set#0');
    store.bookBack();
    expect(at(store)).toBe('parties.names#0');
  });

  it('ignores typing on a lesson', () => {
    const store = bookStore();
    turnBook(store, {}, 'people.about');
    const book = store.getState().book;
    store.answerBook(0, '5', 'people.about');
    store.answerBook(0, '5', 'people.mix');
    expect(store.getState().book.draft).toBe(book.draft);
    expect(store.getState().book.confirm).toBeNull();
  });

  it('skips from a lesson without counting it as answered', () => {
    const untouched = bookStore();
    const input = untouched.getState().input;
    untouched.bookGoTo('people.about');
    untouched.skipBook();
    expect(untouched.getState().screen).toBe('app');
    expect(untouched.getState().input).toBe(input);
    expect(untouched.getState().autoFilled).toEqual([]);
    expect(untouched.getState().book.answered).toEqual([]);

    const store = bookStore();
    // M7-20: stop at the question so the lessons' screen stays untyped.
    turnBook(store, SIX_LISTS, 'people.set');
    const expected = buildFromAnswers(store.getState().book.draft, [
      'parties.count',
      'parties.naming',
      'parties.names',
    ]);
    store.skipBook();
    expect(store.getState().screen).toBe('app');
    expect(store.getState().input).toEqual(expected.input);
    expect(store.getState().autoFilled).toEqual(expected.filled);
    expect(store.getState().autoFilled).toContainEqual({
      section: 'people.set',
      entity: null,
    });
  });

  it('walks ten names in two parts and answers the page after the last', () => {
    const store = bookStore();
    turnBook(store, { 'parties.count': ['10'] }, 'parties.names');
    expect(partCount(store.getState().book.draft, 'parties.names')).toBe(2);
    expect(at(store)).toBe('parties.names#0');
    expect(store.bookNext()).toBe(true);
    expect(at(store)).toBe('parties.names#1');
    expect(store.getState().book.answered).not.toContain('parties.names');
    expect(store.bookNext()).toBe(true);
    expect(at(store)).toBe('people.set#0');
    expect(store.getState().book.answered).toContain('parties.names');
  });

  it('stops on the part with a name that is too long', () => {
    const store = bookStore();
    turnBook(store, { 'parties.count': ['10'] }, 'parties.names');
    store.answerBook(3, 'a'.repeat(61));
    expect(store.bookNext()).toBe(false);
    expect(at(store)).toBe('parties.names#0');
    expect(store.getState().book.attempted).toBe(true);
    store.answerBook(3, 'Север');
    expect(store.bookNext()).toBe(true);
    expect(at(store)).toBe('parties.names#1');
  });

  it('takes a list picked from the ready values as that party', () => {
    const store = bookStore();
    turnBook(store, { 'parties.naming': ['own'] }, 'parties.names');
    store.answerBook(0, 'shas');
    turnBook(store, {});
    store.buildBook();
    const parties = (store.getState().input as { parties: Json[] }).parties;
    expect(parties.map((party) => party.id)).toEqual([
      'shas',
      'P2',
      'P3',
      'P4',
    ]);
    expect(parties[0]!.name).toBe('');
  });

  it('builds the six picked example lists the same under every language', () => {
    const answers: BookAnswers = {
      'parties.count': ['6'],
      'parties.names': [
        'likud',
        null,
        'yesh-atid',
        null,
        'avoda',
        null,
        'religious-zionism',
        null,
        'shas',
        null,
        'raam',
        null,
      ],
      'people.set': ['example'],
    };
    const inputs = LOCALES.map((language) => {
      const store = createStore({ screen: 'book', language });
      turnBook(store, answers);
      store.buildBook();
      expect(store.getState().autoFilled, language).toEqual([]);
      // M7-19: the example follows the ultra-Orthodox turnout of 85.
      expect(seats(store), language).toEqual([30, 29, 11, 15, 20, 15]);
      return store.getState().input;
    });
    const preset = presetInput('israelExample');
    const built = inputs[0] as { groups: Json[] };
    expect((inputs[0] as Json).inputMode).toBe('parties');
    // M7-15: the Basic set adds knitted kippot to the Section 14.4 groups.
    expect(built.groups.map((group) => group.id)).toEqual([
      'secular',
      'traditional',
      'religious',
      'knitted-kippot',
      'arab',
      'haredi',
      'other',
    ]);
    for (const group of preset.groups as Json[]) {
      expect(built.groups.map((each) => each.id)).toContain(group.id);
    }
    expect((inputs[0] as Json).rules).toMatchObject({
      // M7-19: derived exactly from the per-group turnout.
      overallTurnout: { numerator: '119000000', denominator: '166080371' },
    });
    expect(inputs[1]).toEqual(inputs[0]);
    expect(inputs[2]).toEqual(inputs[0]);
  });
});

describe('questionnaire skip', () => {
  it('opens the editor unchanged when nothing was answered', () => {
    const store = bookStore();
    store.bookNext();
    store.answerBook(0, '11');
    const input = store.getState().input;
    store.skipBook();
    const state = store.getState();
    expect(state.screen).toBe('app');
    expect(state.input).toBe(input);
    expect(state.autoFilled).toEqual([]);
  });

  it('builds from the answers given, fills the rest and lists it', () => {
    const store = bookStore();
    turnBook(store, SIX_LISTS, 'parties.names');
    const expected = buildFromAnswers(store.getState().book.draft, [
      'parties.count',
      'parties.naming',
    ]);
    store.toggleCoalitionMember('P1');
    store.skipBook();
    const state = store.getState();
    expect(state.screen).toBe('app');
    expect(state.view).toBe('coalitions');
    expect(state.input).toEqual(expected.input);
    expect(state.loadedInput).toBe(state.input);
    expect(state.autoFilled).toEqual(expected.filled);
    expect(state.autoFilled).toContainEqual({
      section: 'parties.names',
      entity: null,
    });
    expect(state.coalitionSelection).toEqual([]);
    // M7-19: the example follows the ultra-Orthodox turnout of 85.
    expect(seats(store)).toEqual([30, 29, 11, 15, 20, 15]);
  });

  it('keeps a valid value typed on the current page', () => {
    const store = bookStore();
    store.bookNext();
    store.answerBook(0, '3');
    store.skipBook();
    const state = store.getState();
    expect((state.input as { parties: unknown[] }).parties).toHaveLength(3);
    expect(state.autoFilled).not.toContainEqual({
      section: 'parties.count',
      entity: null,
    });
  });

  it('drops an invalid value typed on the current page', () => {
    const store = bookStore();
    turnBook(store, { 'parties.count': ['5'] }, 'parties.naming');
    store.answerBook(0, 'nonsense', 'parties.naming');
    store.skipBook();
    const state = store.getState();
    expect((state.input as { parties: unknown[] }).parties).toHaveLength(5);
    expect(state.autoFilled).toContainEqual({
      section: 'parties.naming',
      entity: null,
    });
  });

  it('asks before replacing a changed scenario', () => {
    const store = changed();
    store.openBook();
    expect(store.getState().screen).toBe('book');
    turnBook(store, { 'parties.count': ['3'] }, 'parties.naming');
    const input = store.getState().input;
    store.skipBook();
    expect(store.getState().book.confirm).toBe('replace-skip');
    expect(store.getState().screen).toBe('book');
    expect(store.getState().input).toBe(input);
    store.cancelBook();
    expect(store.getState().book.confirm).toBeNull();
    expect(store.getState().input).toBe(input);
    store.skipBook();
    store.confirmBook();
    const state = store.getState();
    expect(state.screen).toBe('app');
    expect((state.input as { parties: unknown[] }).parties).toHaveLength(3);
    expect(state.book.confirm).toBeNull();
  });

  it('opens a changed scenario unchanged when nothing was answered', () => {
    const store = changed();
    const input = store.getState().input;
    store.openBook();
    store.skipBook();
    expect(store.getState().book.confirm).toBeNull();
    expect(store.getState().screen).toBe('app');
    expect(store.getState().input).toBe(input);
  });
});

describe('questionnaire build', () => {
  it('builds every answer and opens the coalition results', () => {
    const store = bookStore();
    turnBook(store, SIX_LISTS);
    store.toggleLock(shareLockKey('G1'));
    store.buildBook();
    const state = store.getState();
    expect(state.screen).toBe('app');
    expect(state.view).toBe('coalitions');
    expect((state.input as Json).id).toBe('questionnaire');
    expect(state.loadedInput).toBe(state.input);
    expect(state.autoFilled).toEqual([]);
    expect(state.locks).toEqual([]);
    expect(state.baseline).toBeNull();
    // M7-19: the example follows the ultra-Orthodox turnout of 85.
    expect(seats(store)).toEqual([30, 29, 11, 15, 20, 15]);
    expect(store.getDerived().validation.ok).toBe(true);
  });

  it('lists the pages it filled when the walk skipped them', () => {
    const store = bookStore();
    store.bookGoTo('review');
    store.buildBook();
    const expected = buildFromAnswers(EMPTY_BOOK.draft, []);
    expect(store.getState().input).toEqual(expected.input);
    expect(store.getState().autoFilled).toEqual(expected.filled);
    expect(store.getState().autoFilled).toContainEqual({
      section: 'turnout',
      entity: 'secular',
    });
    expect(store.getState().autoFilled).not.toContainEqual({
      section: 'people.names',
      entity: null,
    });
  });

  it('keeps the answers for a return to the book', () => {
    const store = bookStore();
    turnBook(store, SIX_LISTS);
    const book = store.getState().book;
    store.buildBook();
    store.openBook();
    expect(store.getState().screen).toBe('book');
    expect(store.getState().book.page).toBe('review');
    expect(store.getState().book.answered).toEqual(book.answered);
    expect(store.getState().book.draft).toBe(book.draft);
  });

  it('asks before replacing a changed scenario', () => {
    const store = changed();
    store.openBook();
    turnBook(store, SIX_LISTS);
    const input = store.getState().input;
    store.buildBook();
    expect(store.getState().book.confirm).toBe('replace-build');
    expect(store.getState().input).toBe(input);
    store.confirmBook();
    expect(store.getState().view).toBe('coalitions');
    // M7-19: the example follows the ultra-Orthodox turnout of 85.
    expect(seats(store)).toEqual([30, 29, 11, 15, 20, 15]);
  });

  it('builds the same scenario under every language', () => {
    const inputs = LOCALES.map((language) => {
      const store = createStore({ screen: 'book', language });
      turnBook(store, SIX_LISTS);
      store.buildBook();
      return store.getState().input;
    });
    expect(inputs[1]).toEqual(inputs[0]);
    expect(inputs[2]).toEqual(inputs[0]);
  });
});

describe('questionnaire restart', () => {
  it('starts again at once when nothing was answered', () => {
    const store = bookStore();
    store.bookNext();
    store.answerBook(0, '5');
    store.restartBook();
    expect(store.getState().book).toEqual(EMPTY_BOOK);
  });

  it('asks before dropping answers and keeps the input', () => {
    const store = bookStore();
    turnBook(store, SIX_LISTS, 'people.set');
    const input = store.getState().input;
    store.restartBook();
    expect(store.getState().book.confirm).toBe('restart');
    store.cancelBook();
    expect(store.getState().book.answered).toEqual([
      'parties.count',
      'parties.naming',
      'parties.names',
    ]);
    store.restartBook();
    store.confirmBook();
    expect(store.getState().book).toEqual(EMPTY_BOOK);
    expect(store.getState().input).toBe(input);
  });
});

describe('preset replacement', () => {
  it('loads at once while the scenario is unchanged', () => {
    const store = createStore();
    store.requestPreset('split');
    expect(store.getState().replacePending).toBeNull();
    expect(store.getState().input).toEqual(presetInput('split'));
  });

  it('asks before replacing a changed scenario', () => {
    const store = changed();
    const input = store.getState().input;
    store.requestPreset('split');
    expect(store.getState().replacePending).toBe('split');
    expect(store.getState().input).toBe(input);
    store.cancelReplace();
    expect(store.getState().replacePending).toBeNull();
    expect(store.getState().input).toBe(input);
    store.requestPreset('multiBlock');
    store.confirmReplace();
    expect(store.getState().replacePending).toBeNull();
    expect(store.getState().input).toEqual(presetInput('multiBlock'));
  });
});

describe('auto-filled list', () => {
  function filledStore(): ReturnType<typeof createStore> {
    const store = bookStore();
    turnBook(store, SIX_LISTS, 'parties.names');
    store.skipBook();
    expect(store.getState().autoFilled.length).toBeGreaterThan(0);
    return store;
  }

  it('stays through edits and is dismissed on request', () => {
    const store = filledStore();
    store.updateInput((input) => withRules(input as Json, { seatCount: 121 }));
    expect(store.getState().autoFilled.length).toBeGreaterThan(0);
    store.dismissAutoFilled();
    expect(store.getState().autoFilled).toEqual([]);
  });

  it.each([
    [
      'a preset',
      (store: ReturnType<typeof createStore>) => store.loadPreset('split'),
    ],
    [
      'an import',
      (store: ReturnType<typeof createStore>) => {
        const validation = validateScenario(presetInput('split'));
        if (!validation.ok) {
          throw new Error('expected a valid scenario');
        }
        store.importScenario(serializeScenario(validation.scenario));
      },
    ],
    [
      'a reset',
      (store: ReturnType<typeof createStore>) => {
        store.saveBaseline();
        store.resetToBaseline();
      },
    ],
    [
      'a set input',
      (store: ReturnType<typeof createStore>) =>
        store.setInput(baselineInput()),
    ],
  ])('is cleared by %s', (_name, act) => {
    const store = filledStore();
    act(store);
    expect(store.getState().autoFilled).toEqual([]);
  });
});

describe('editor pages', () => {
  /** The key of the page the editor shows for the current input. */
  function shownPage(store: ReturnType<typeof createStore>): string {
    const pages = editorPages(draftOf(store));
    return pages[resolvePage(pages, store.getState().editorPage)]?.key ?? '';
  }

  it('opens on the first page', () => {
    expect(createStore().getState().editorPage).toEqual(FIRST_PAGE);
  });

  it('turns to a listed page and records its position', () => {
    const store = createStore();
    store.setEditorPage('parties');
    expect(store.getState().editorPage).toEqual({ key: 'parties', index: 5 });
    store.setEditorPage('group:G3');
    expect(store.getState().editorPage).toEqual({ key: 'group:G3', index: 3 });
  });

  it('ignores a page that is not listed', () => {
    const store = createStore();
    store.setEditorPage('parties');
    const before = store.getState();
    expect(before.editorPage.key).toBe('parties');
    store.setEditorPage('blocks');
    store.setEditorPage('group:G9');
    store.setEditorPage('groups');
    store.setEditorPage('');
    expect(store.getState().editorPage).toBe(before.editorPage);
  });

  it('leaves the input and the seats untouched while turning pages', () => {
    const store = createStore();
    const input = store.getState().input;
    const result = store.getDerived().result;
    const before = directRun(input);
    store.setEditorPage('group:G2');
    store.setEditorPage('coalition-rules');
    expect(store.getState().editorPage.key).toBe('coalition-rules');
    expect(store.getState().input).toBe(input);
    expect(store.getDerived().result).toBe(result);
    expect(directRun(store.getState().input)).toBe(before);
  });

  it('keeps the page across a language change and an edit', () => {
    const store = createStore();
    store.setEditorPage('group:G2');
    store.setLanguage('he');
    store.updateInput((input) =>
      setGroupFraction(input as Draft, 'G2', 'turnout', '0.5'),
    );
    expect(shownPage(store)).toBe('group:G2');
  });

  it('keeps the page of a group that moves', () => {
    const store = createStore();
    store.setEditorPage('group:G3');
    store.updateInput((input) => moveEntity(input as Draft, 'group', 'G3', -1));
    expect(shownPage(store)).toBe('group:G3');
    expect(
      resolvePage(editorPages(draftOf(store)), store.getState().editorPage),
    ).toBe(2);
  });

  it('shows the group now at the position of the deleted group on screen', () => {
    const store = createStore();
    store.setEditorPage('group:G2');
    store.requestDelete('group', 'G2');
    expect(idsOf(store, 'group')).not.toContain('G2');
    expect(shownPage(store)).toBe('group:G3');
  });

  it('shows the group before it when the last group on screen is deleted', () => {
    const store = createStore();
    store.setEditorPage('group:G4');
    store.requestDelete('group', 'G4');
    expect(shownPage(store)).toBe('group:G3');
  });

  it('shows the empty groups page when every group is deleted', () => {
    const store = createStore();
    store.setEditorPage('group:G1');
    ['G1', 'G2', 'G3', 'G4'].forEach((id) => store.requestDelete('group', id));
    expect(idsOf(store, 'group')).toEqual([]);
    expect(shownPage(store)).toBe('groups');
  });

  it('opens page 1 after a preset is loaded', () => {
    const store = createStore();
    store.setEditorPage('parties');
    expect(store.getState().editorPage.key).toBe('parties');
    store.loadPreset('split');
    expect(store.getState().editorPage).toEqual(FIRST_PAGE);
  });

  it('opens page 1 after a confirmed preset replaces an edited scenario', () => {
    const store = changed();
    store.setEditorPage('parties');
    store.requestPreset('multiBlock');
    expect(store.getState().editorPage.key).toBe('parties');
    store.confirmReplace();
    expect(store.getState().editorPage).toEqual(FIRST_PAGE);
  });

  it('opens page 1 after an import', () => {
    const store = createStore();
    store.setEditorPage('group:G4');
    expect(store.getState().editorPage.key).toBe('group:G4');
    const validation = validateScenario(presetInput('multiBlock'));
    if (!validation.ok) {
      throw new Error('expected a valid scenario');
    }
    expect(store.importScenario(serializeScenario(validation.scenario))).toBe(
      true,
    );
    expect(store.getState().editorPage).toEqual(FIRST_PAGE);
  });

  it('keeps the page when an import is refused', () => {
    const store = createStore();
    store.setEditorPage('group:G4');
    expect(store.importScenario('nope')).toBe(false);
    expect(store.getState().editorPage.key).toBe('group:G4');
  });

  it('opens page 1 after the questionnaire builds its scenario', () => {
    const store = bookStore();
    store.setEditorPage('parties');
    expect(store.getState().editorPage.key).toBe('parties');
    turnBook(store, SIX_LISTS);
    store.buildBook();
    expect(store.getState().screen).toBe('app');
    expect(store.getState().editorPage).toEqual(FIRST_PAGE);
  });

  it('opens page 1 after a confirmed questionnaire build replaces an edited scenario', () => {
    const store = changed();
    store.setEditorPage('parties');
    expect(store.getState().editorPage.key).toBe('parties');
    store.openBook();
    turnBook(store, SIX_LISTS);
    store.buildBook();
    expect(store.getState().book.confirm).toBe('replace-build');
    store.confirmBook();
    expect(store.getState().screen).toBe('app');
    expect(store.getState().editorPage).toEqual(FIRST_PAGE);
  });

  it('writes no page into the scenario', () => {
    const store = createStore();
    store.setEditorPage('parties');
    expect(Object.keys(store.getState().input as Json)).not.toContain(
      'editorPage',
    );
  });
});

describe('future coalitions', () => {
  function keysOf(store: ReturnType<typeof createStore>): string[] {
    return store.getState().futureCoalitions.map((ids) => coalitionKey(ids));
  }

  function withoutParty(input: unknown, partyId: string): unknown {
    const draft = input as Json;
    return {
      ...draft,
      parties: (draft.parties as Json[]).filter(
        (party) => party.id !== partyId,
      ),
    };
  }

  function followed(): ReturnType<typeof createStore> {
    const store = createStore();
    store.toggleFutureCoalition(['P1', 'P3']);
    store.toggleFutureCoalition(['P2']);
    expect(keysOf(store)).toEqual(['P1+P3', 'P2']);
    return store;
  }

  it('starts with none followed', () => {
    expect(createStore().getState().futureCoalitions).toEqual([]);
    expect(
      createStore({ futureCoalitions: [['P1']] }).getState().futureCoalitions,
    ).toEqual([['P1']]);
  });

  it('ticks sets in tick order and unticks them in any order', () => {
    const store = createStore();
    store.toggleFutureCoalition(['P3', 'P1']);
    store.toggleFutureCoalition(['P2']);
    store.toggleFutureCoalition(['P4', 'P2']);
    expect(keysOf(store)).toEqual(['P1+P3', 'P2', 'P2+P4']);
    store.toggleFutureCoalition(['P1', 'P3']);
    expect(keysOf(store)).toEqual(['P2', 'P2+P4']);
  });

  it('follows four sets at most', () => {
    const store = followed();
    store.toggleFutureCoalition(['P4']);
    store.toggleFutureCoalition(['P3']);
    const state = store.getState();
    const listener = vi.fn();
    store.subscribe(listener);
    store.toggleFutureCoalition(['P1']);
    expect(store.getState()).toBe(state);
    expect(listener).not.toHaveBeenCalled();
    expect(keysOf(store)).toEqual(['P1+P3', 'P2', 'P4', 'P3']);
    store.toggleFutureCoalition(['P2']);
    store.toggleFutureCoalition(['P1']);
    expect(keysOf(store)).toEqual(['P1+P3', 'P4', 'P3', 'P1']);
  });

  it('changes neither the input nor the seats', () => {
    const store = createStore();
    const input = store.getState().input;
    const result = serializeResult(store.getDerived().result!);
    store.toggleFutureCoalition(['P1', 'P3']);
    store.toggleFutureCoalition(['P1', 'P3']);
    store.toggleFutureCoalition(['P2']);
    expect(store.getState().input).toBe(input);
    expect(store.getState().loadedInput).toBe(input);
    expect(serializeResult(store.getDerived().result!)).toBe(result);
  });

  it('drops a set when one of its parties is deleted', () => {
    const store = followed();
    store.updateInput((input) => withoutParty(input, 'P3'));
    expect(keysOf(store)).toEqual(['P2']);
  });

  it('drops the sets on an input that is not a scenario', () => {
    const store = followed();
    store.updateInput(() => 'not a scenario');
    expect(store.getState().futureCoalitions).toEqual([]);
  });

  it('keeps the sets through other edits and view changes', () => {
    const store = followed();
    store.updateInput((input) => withAllTurnouts(input as Json, '0.5'));
    store.setView('future');
    store.setFutureYear(5);
    store.toggleCoalitionMember('P4');
    expect(keysOf(store)).toEqual(['P1+P3', 'P2']);
  });

  it('clears the sets on a new input, preset or import', () => {
    const store = followed();
    store.setInput(baselineInput());
    expect(store.getState().futureCoalitions).toEqual([]);
    store.toggleFutureCoalition(['P1']);
    expect(keysOf(store)).toEqual(['P1']);
    store.loadPreset('split');
    expect(store.getState().futureCoalitions).toEqual([]);
    store.toggleFutureCoalition(['P1']);
    expect(keysOf(store)).toEqual(['P1']);
    expect(store.importScenario(JSON.stringify(presetInput('share7')))).toBe(
      true,
    );
    expect(store.getState().futureCoalitions).toEqual([]);
  });

  it('clears the sets on a reset to the baseline', () => {
    const store = createStore();
    expect(store.saveBaseline()).toBe(true);
    store.toggleFutureCoalition(['P1']);
    expect(keysOf(store)).toEqual(['P1']);
    expect(store.resetToBaseline()).toBe(true);
    expect(store.getState().futureCoalitions).toEqual([]);
  });

  it('clears the sets when the questionnaire builds a scenario', () => {
    const store = followed();
    store.openBook();
    turnBook(store, SIX_LISTS);
    store.buildBook();
    expect(store.getState().screen).toBe('app');
    expect(store.getState().futureCoalitions).toEqual([]);
  });

  it('writes no followed set into the scenario', () => {
    const store = followed();
    expect(Object.keys(store.getState().input as Json)).not.toContain(
      'futureCoalitions',
    );
  });
});

describe('optional composition under each store language', () => {
  it.each(LOCALES)('keeps votes and seats unchanged in %s', (locale) => {
    const input = partyModeInput(
      [
        ['13', '400'],
        ['387', '400'],
      ],
      { seatCount: 101 },
    );
    input.groups = ['G1', 'G2', 'G3'].map((id) => ({
      id,
      name: id,
      notes: '',
      turnout: '0.7',
      growthRate: '0',
      turnoutChange: '0',
    }));
    input.editorOnly = { preserved: true };
    const store = createStore({ input });
    store.setLanguage(locale);
    const baseline = serializeResult(store.getDerived().result!);
    store.updateInput((current) => {
      const result = beginPartyComposition(current, 'P1');
      if (!result.ok) throw new Error(result.reason);
      return result.draft;
    });
    store.updateInput((current) => {
      const result = editCompositionShare(current, 'P1', 'G1', '40');
      if (!result.ok) throw new Error(result.reason);
      return result.draft;
    });
    expect(store.getState().language).toBe(locale);
    expect(serializeResult(store.getDerived().result!)).toBe(baseline);
    expect((store.getState().input as Json).editorOnly).toEqual({
      preserved: true,
    });
  });
});

describe('M7-07 questionnaire language and exits', () => {
  it('uses Hebrew only when there is no valid saved or explicit language', () => {
    expect(createStore().getState().language).toBe('he');
    expect(
      createStore({}, { storage: memoryStorage('invalid') }).getState()
        .language,
    ).toBe('he');
    for (const locale of LOCALES) {
      expect(
        createStore({}, { storage: memoryStorage(locale) }).getState().language,
      ).toBe(locale);
    }
    expect(
      createStore(
        { language: 'ru' },
        { storage: memoryStorage('he') },
      ).getState().language,
    ).toBe('ru');
  });

  it('keeps a selected language for the visit when storage is unavailable', () => {
    const storage: LanguageStorage = {
      load: () => {
        throw new Error('blocked');
      },
      save: () => {
        throw new Error('blocked');
      },
      clear: () => false,
    };
    const store = createStore({ screen: 'book' }, { storage });
    expect(store.getState().language).toBe('he');
    store.setLanguage('ru');
    expect(store.getState().language).toBe('ru');
    expect(store.getState().screen).toBe('book');
  });

  it('orders the visible views coalition, composition, data and future', () => {
    expect(VIEWS).toEqual(['coalitions', 'future', 'inputs']);
  });

  it('opens coalitions on an untouched skip without changing an old scenario', () => {
    const store = createStore({
      screen: 'book',
      input: presetInput('multiBlock'),
    });
    const input = store.getState().input;
    store.skipBook();
    expect(store.getState().screen).toBe('app');
    expect(store.getState().view).toBe('coalitions');
    expect(store.getState().input).toBe(input);
  });

  it.each(['skip', 'build'] as const)(
    'opens coalitions after an answered questionnaire %s',
    (action) => {
      const store = bookStore();
      store.bookGoTo('parties.count');
      store.answerBook(0, '5');
      expect(store.bookNext()).toBe(true);
      if (action === 'skip') store.skipBook();
      else store.buildBook();
      expect(store.getState().screen).toBe('app');
      expect(store.getState().view).toBe('coalitions');
      expect(store.getDerived().validation.ok).toBe(true);
    },
  );

  it.each(['skip', 'build'] as const)(
    'opens coalitions after confirmed %s and keeps the original on cancel',
    (action) => {
      const store = changed();
      store.openBook();
      store.bookGoTo('parties.count');
      store.answerBook(0, '5');
      expect(store.bookNext()).toBe(true);
      const original = store.getState().input;
      if (action === 'skip') store.skipBook();
      else store.buildBook();
      expect(store.getState().book.confirm).toBe(`replace-${action}`);
      store.cancelBook();
      expect(store.getState().input).toBe(original);
      if (action === 'skip') store.skipBook();
      else store.buildBook();
      store.confirmBook();
      expect(store.getState().view).toBe('coalitions');
      expect(store.getState().screen).toBe('app');
      expect(store.getState().input).not.toBe(original);
    },
  );
});
