import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { serializeResult } from '../../src/engine/run';
import { LOCALES, TABLES } from '../../src/i18n';
import { App } from '../../src/ui/App';
import { baselineInput } from '../../src/ui/presets';
import { createStore, type AppState, type Store } from '../../src/ui/store';
import {
  finalYearCrossingInput,
  visualFutureInput,
} from '../engine/helpers/futureFixtures';
import {
  partyModeKnownPopulationInput,
  section8Input,
  type Json,
} from '../engine/helpers/scenarios';

type Color = 'red' | 'orange';
type Sets = Readonly<Record<Color, readonly string[]>>;

interface CriticalState {
  readonly criticalSets: Sets;
}

interface CriticalActions {
  toggleCriticalParty(color: Color, partyId: string): void;
}

function hasCriticalState(state: AppState): state is AppState & CriticalState {
  return (
    'criticalSets' in state &&
    typeof state.criticalSets === 'object' &&
    state.criticalSets !== null &&
    'red' in state.criticalSets &&
    'orange' in state.criticalSets
  );
}

function supportsCritical(store: Store): store is Store & CriticalActions {
  return (
    hasCriticalState(store.getState()) &&
    'toggleCriticalParty' in store &&
    typeof store.toggleCriticalParty === 'function'
  );
}

function criticalState(store: Store): CriticalState {
  const state = store.getState();
  if (!hasCriticalState(state)) {
    throw new Error('M7-10 critical set state is not implemented');
  }
  return state;
}

function critical(store: Store): Store & CriticalActions {
  if (!supportsCritical(store)) {
    throw new Error('M7-10 critical set state and actions are not implemented');
  }
  return store;
}

function render(input: unknown, year = 1): string {
  return renderToString(
    <App
      store={createStore({
        input,
        view: 'future',
        language: 'en',
        futureYear: year,
      })}
    />,
  );
}

function graphic(html: string, measure: 'population' | 'votes'): string {
  const match = new RegExp(
    `<section\\b[^>]*data-future-graphic="${measure}"[^>]*>[\\s\\S]*?</section>`,
  ).exec(html);
  if (match === null) throw new Error(`Missing ${measure} graphic`);
  return match[0];
}

function tag(html: string, pattern: string): string {
  const match = new RegExp(`<[^>]+${pattern}[^>]*>`).exec(html);
  if (match === null) throw new Error(`Missing tag ${pattern}`);
  return match[0];
}

const REQUIRED_KEYS = [
  'futureVisual.population',
  'futureVisual.votes',
  'futureVisual.unavailable',
  'futureVisual.zero',
  'futureCritical.red',
  'futureCritical.orange',
  'futureCritical.empty',
  'futureCritical.half',
  'futureCritical.majority',
  'futureCritical.progress',
  'futureCritical.cancel',
  'futureCritical.retry',
  'futureCritical.proven',
  'futureCritical.firstKnown',
  'futureCritical.incomplete',
  'futureCritical.notReached',
  'futureCritical.workerUnavailable',
  'futureCritical.notGuarantee',
  'legacy.turnoutChangeActive',
];

describe('M7-10 future graphics and text alternatives', () => {
  it('renders two independently labelled measures with a shared absolute scale per measure', () => {
    const html = render(visualFutureInput());
    const population = graphic(html, 'population');
    const votes = graphic(html, 'votes');
    expect(tag(population, 'data-future-graphic="population"')).toContain(
      'data-scale-max="1060"',
    );
    expect(tag(votes, 'data-future-graphic="votes"')).toContain(
      'data-scale-max="730"',
    );
    expect(tag(population, 'data-graphic-year="0"')).toContain(
      'data-total="1000"',
    );
    expect(tag(population, 'data-graphic-year="1"')).toContain(
      'data-total="1060"',
    );
    expect(tag(votes, 'data-graphic-year="0"')).toContain('data-total="700"');
    expect(tag(votes, 'data-graphic-year="1"')).toContain('data-total="730"');
    expect(population).toContain('data-graphic-id="A"');
    expect(population).toContain('data-amount="600"');
    expect(population).toContain('data-amount="660"');
    expect(population).toContain('data-share="60.00"');
    expect(population).toContain('data-change="60"');
    expect(votes).toContain('data-graphic-id="X"');
    expect(votes).toContain('data-amount="320"');
    expect(votes).toContain('data-amount="344"');
    expect(votes).toContain('data-share="45.71"');
    expect(votes).toContain('data-change="24"');
    expect(population).toMatch(/aria-label="[^"]+"/);
    expect(votes).toMatch(/aria-label="[^"]+"/);
    expect(html).toContain('data-table="future-groups"');
    expect(html).toContain('data-table="future-parties"');
  });

  it('retains the year control and known year-zero votes when the projection is unavailable', () => {
    const input = partyModeKnownPopulationInput();
    input.parties = [{ ...(input.parties as Json[])[0], composition: null }];
    const html = render(input);
    expect(html).toContain('data-future-year');
    expect(graphic(html, 'population')).toContain(
      'data-graphic-state="unavailable"',
    );
    const votes = graphic(html, 'votes');
    expect(tag(votes, 'data-graphic-year="0"')).toContain('data-total="999"');
    expect(votes).toContain('data-graphic-state="unavailable"');
    expect(html).toContain(
      'data-projection-unavailable="unknown-party-composition"',
    );
  });

  it('shows known zero votes as an empty graphic, not as unknown or fabricated equal slices', () => {
    const input = visualFutureInput();
    for (const group of input.groups as Json[]) group.turnout = '0';
    const html = render(input);
    const votes = graphic(html, 'votes');
    expect(votes).toContain('data-graphic-state="zero"');
    expect(tag(votes, 'data-graphic-year="0"')).toContain('data-total="0"');
    expect(votes).not.toContain('data-graphic-state="unavailable"');
  });

  it.each(LOCALES)('provides every new visible message in %s', (locale) => {
    const table = TABLES[locale] as Record<string, string>;
    for (const key of REQUIRED_KEYS) {
      expect(typeof table[key], `${locale} ${key}`).toBe('string');
      expect(table[key], `${locale} ${key}`).toMatch(/\S/);
    }
  });
});

describe('M7-10 red and orange sets are independent transient state', () => {
  it('starts empty and permits the same party in both sets', () => {
    const store = critical(createStore({ input: finalYearCrossingInput() }));
    expect(criticalState(store).criticalSets).toEqual({ red: [], orange: [] });
    store.toggleCriticalParty('red', 'X');
    store.toggleCriticalParty('orange', 'X');
    store.toggleCriticalParty('orange', 'Y');
    expect(criticalState(store).criticalSets).toEqual({
      red: ['X'],
      orange: ['X', 'Y'],
    });
    store.toggleCriticalParty('red', 'X');
    expect(criticalState(store).criticalSets).toEqual({
      red: [],
      orange: ['X', 'Y'],
    });
  });

  it('does not change scenario input, results, existing coalition selections or exports', () => {
    const store = critical(createStore({ input: finalYearCrossingInput() }));
    store.toggleFutureCoalition(['X']);
    const input = store.getState().input;
    const before = serializeResult(store.getDerived().result!);
    store.toggleCriticalParty('red', 'X');
    store.toggleCriticalParty('orange', 'Y');
    expect(store.getState().input).toBe(input);
    expect(serializeResult(store.getDerived().result!)).toBe(before);
    expect(store.getState().futureCoalitions).toEqual([['X']]);
    expect(JSON.stringify(store.getState().input)).not.toContain(
      'criticalSets',
    );
  });

  it('keeps the sets through ordinary edits, language and selected-year changes', () => {
    const store = critical(createStore({ input: finalYearCrossingInput() }));
    store.toggleCriticalParty('red', 'X');
    store.toggleCriticalParty('orange', 'Y');
    store.updateInput((input) => ({
      ...(input as Json),
      name: 'Edited scenario',
    }));
    store.setLanguage('he');
    store.setFutureYear(20);
    expect(criticalState(store).criticalSets).toEqual({
      red: ['X'],
      orange: ['Y'],
    });
  });

  it('prunes a deleted party from both sets without touching the other party', () => {
    const store = critical(createStore({ input: section8Input() }));
    store.toggleCriticalParty('red', 'P1');
    store.toggleCriticalParty('red', 'P2');
    store.toggleCriticalParty('orange', 'P1');
    store.requestDelete('party', 'P1');
    expect(store.confirmDelete({ mode: 'reassign', targetId: 'P2' })).toBe(
      true,
    );
    expect(criticalState(store).criticalSets).toEqual({
      red: ['P2'],
      orange: [],
    });
  });

  it.each([
    ['new input', (store: Store) => store.setInput(baselineInput())],
    ['preset', (store: Store) => store.loadPreset('split')],
    [
      'import',
      (store: Store) =>
        store.importScenario(JSON.stringify(finalYearCrossingInput())),
    ],
    ['saved baseline', (store: Store) => store.resetToBaseline()],
    [
      'questionnaire build',
      (store: Store) => {
        store.openBook();
        store.buildBook();
      },
    ],
  ] as const)('clears both sets on %s replacement', (_name, replace) => {
    const store = critical(createStore({ input: section8Input() }));
    expect(store.saveBaseline()).toBe(true);
    store.toggleCriticalParty('red', 'P1');
    store.toggleCriticalParty('orange', 'P2');
    replace(store);
    expect(criticalState(store).criticalSets).toEqual({ red: [], orange: [] });
  });

  it('renders labelled controls for both sets and the existing chooser', () => {
    const html = render(finalYearCrossingInput(), 20);
    expect(html).toContain('data-region="chooser"');
    expect(html).toContain('data-critical-set="red"');
    expect(html).toContain('data-critical-set="orange"');
    expect(html).toMatch(/data-critical-set="red"[^>]*aria-label="[^"]+"/);
    expect(html).toMatch(/data-critical-set="orange"[^>]*aria-label="[^"]+"/);
    expect(html).toContain('data-critical-party="red:X"');
    expect(html).toContain('data-critical-party="orange:X"');
  });

  it('shows half and majority separately and states that cooperation is not guaranteed', () => {
    const store = critical(
      createStore({
        input: visualFutureInput(),
        view: 'future',
        futureYear: 0,
      }),
    );
    store.toggleCriticalParty('red', 'X');
    const html = renderToString(<App store={store} />);
    const red = html.match(
      /<[^>]+data-critical-result="red"[^>]*>[\s\S]*?<\/article>/,
    )?.[0];
    if (red === undefined) throw new Error('Missing red set result');
    const present = tag(red, 'data-set-year="0"');
    expect(present).toContain('data-seats="5"');
    expect(present).toContain('data-half="true"');
    expect(present).toContain('data-majority="false"');
    expect(html).toContain('data-critical-not-guaranteed');
  });

  it('does not present a year without an allocation as zero seats', () => {
    const input = visualFutureInput();
    for (const group of input.groups as Json[]) group.growthRate = '-1';
    const store = critical(
      createStore({ input, view: 'future', futureYear: 1, language: 'en' }),
    );
    store.toggleCriticalParty('red', 'X');
    const html = renderToString(<App store={store} />);
    const red = html.match(
      /<[^>]+data-critical-result="red"[^>]*>[\s\S]*?<\/article>/,
    )?.[0];
    if (red === undefined) throw new Error('Missing red set result');
    const future = tag(red, 'data-set-year="1"');
    expect(future).toContain('data-seat-state="no-allocation"');
    expect(future).not.toContain('data-seats="0"');
    expect(red).toContain('data-no-allocation="no-valid-votes"');
  });
});

describe('M7-10 legacy annual turnout changes', () => {
  it('hides the editor field but retains and explains a stored nonzero value', () => {
    const input = section8Input();
    (input.groups as Json[])[0]!.turnoutChange = '0.1';
    const store = createStore({ input, language: 'en', view: 'inputs' });
    store.setEditorPage('group:G1');
    const before = JSON.stringify(store.getState().input);
    const html = renderToString(<App store={store} />);
    expect(html).toContain('data-fraction="growthRate"');
    expect(html).not.toContain('data-fraction="turnoutChange"');
    expect(html).toContain('data-legacy-turnout-change');
    expect(JSON.stringify(store.getState().input)).toBe(before);
  });
});
