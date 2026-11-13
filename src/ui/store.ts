import {
  addPair as addDraftPair,
  deleteEntity,
  EditError,
  entities,
  findReferences,
  isDraft,
  type PairList,
  rebalanceShares as rebalanceDraftShares,
  rebalanceWeights as rebalanceDraftWeights,
  removePair as removeDraftPair,
  setCohortTurnout as setDraftCohortTurnout,
  turnoutCohorts,
  type Draft,
  type EntityKind,
  type Repair,
} from '../engine/edit';
import { fractionParts } from '../engine/numeric';
import {
  freezeSupporters,
  runSupporters,
  type SupporterBasis,
} from '../engine/supporterTurnout';
import type { PanelEdit } from '../engine/panel';
import {
  alignPanelVotes,
  panelPercent,
  readPanel,
  rebuildPanelBasis,
} from '../engine/panel';
import type { CompositionTarget } from '../engine/composition';
import type { CriticalColor, CriticalSets } from '../engine/futureRange';
import {
  compareHistorical2022,
  type HistoricalComparisonResult,
  type HistoricalMatchChoice,
} from '../engine/historicalReference';
import {
  prepareLegacyConversion,
  type LegacyConversionResult,
} from '../engine/legacyConversion';
import { runSeats, type SeatProjection, type SeatResult } from '../engine/run';
import {
  LIMITS,
  parseScenarioJson,
  validateScenario,
  type IssueCode,
  type PartyScenario,
  type Scenario,
  type ValidationResult,
} from '../engine/schema';
import type { Locale } from '../i18n';
import { DEFAULT_LOCALE, isLocale, LOCALES } from '../i18n';
import {
  alignComposition,
  alignShares,
  bookPages,
  buildBook as buildFromBook,
  canLockAnother,
  confirmPage,
  defaultLocks,
  EMPTY_BOOK,
  EMPTY_DRAFT,
  editPage,
  isSuggested,
  nextPage,
  pageError,
  pageParts,
  partCount,
  partError,
  partyIds,
  previousPage,
  screenOf,
  takesAnswer,
  type BookConfirm,
  type BookState,
  type FilledItem,
  type PageKey,
} from './book';
import {
  startExample,
  translateExampleNames,
  translateExampleScenario,
  translateExampleTitles,
  type StartExampleId,
} from './startExamples';
import { EXAMPLE_LISTS } from './catalog';
import { coalitionKey, MAX_FUTURE_COALITIONS } from './coalitionChoice';
import {
  editorPages,
  FIRST_PAGE,
  resolvePage,
  type SavedPage,
} from './editorPages';
import { baselineInput, presetInput, type PresetId } from './presets';

export type ViewId =
  'inputs' | 'seats' | 'coalitions' | 'compare' | 'composition' | 'future';

export const VIEWS: readonly ViewId[] = ['coalitions', 'future', 'inputs'];

export interface PanelSession {
  readonly invalidFields: readonly string[];
  readonly invalidTexts: Readonly<Record<string, string>>;
  readonly resetNotice: boolean;
  readonly nextCustom: number;
  readonly experiment: SupporterBasis | null;
  readonly targets: Readonly<Record<string, string>>;
  readonly labels: Readonly<Record<string, number>>;
  /** Party-share locks once touched; null keeps the default locks (M7-20). */
  readonly voteLocks: readonly string[] | null;
  /** Composition-cell locks once touched; null keeps the defaults (M7-20). */
  readonly cellLocks: readonly string[] | null;
  readonly custom: readonly {
    readonly key: string;
    readonly partyIds: readonly string[];
    readonly label: string;
  }[];
  readonly tiles: readonly string[] | null;
  readonly favourites: readonly string[];
  readonly favouritesOnly: boolean;
}
const EMPTY_PANEL: PanelSession = {
  invalidFields: [],
  invalidTexts: {},
  resetNotice: false,
  nextCustom: 1,
  experiment: null,
  targets: {},
  labels: {},
  voteLocks: null,
  cellLocks: null,
  custom: [],
  tiles: null,
  favourites: [],
  favouritesOnly: false,
};

/** The year the future view opens on (Section 14.3). */
export const DEFAULT_FUTURE_YEAR = 4;

export interface PendingDelete {
  readonly kind: EntityKind;
  readonly id: string;
}

/** A file problem found before the text reaches the validator. */
export type ImportFailure = 'too-large' | 'unreadable';

export interface ImportIssue {
  readonly path: string;
  readonly code: IssueCode | 'unreadable';
  readonly message: string;
}

export type HistoricalMatchError =
  | Extract<HistoricalComparisonResult, { ok: false }>['reason']
  | 'invalid-current';

export interface LegacyPreview {
  readonly source: string;
  readonly year: number;
  readonly selection: readonly string[];
  readonly before: Scenario;
  readonly after: PartyScenario;
}

type LegacyFailure =
  | Extract<LegacyConversionResult, { ok: false }>
  | {
      readonly ok: false;
      readonly reason: 'stale-preview';
      readonly issues: [];
    };

export interface AppState {
  readonly panel: PanelSession;
  /** Raw scenario JSON; may be invalid so that edits are never lost. */
  readonly input: unknown;
  readonly view: ViewId;
  readonly language: Locale;
  /** A referenced entity waiting for delete confirmation and a repair. */
  readonly pendingDelete: PendingDelete | null;
  /** Rebalance locks for group shares, weights and party shares. UI only. */
  readonly locks: readonly string[];
  /** True while the last lock attempt was refused by the min-2 rule (M7-20). */
  readonly lockNotice: boolean;
  /** Party IDs ticked for chosen-coalition evaluation, in tick order. UI only. */
  readonly coalitionSelection: readonly string[];
  /** Party sets followed on the future view, in tick order, at most three. UI only. */
  readonly futureCoalitions: readonly (readonly string[])[];
  readonly criticalSets: CriticalSets;
  /** Explicit historical identity choices belong to this scenario only. */
  readonly historicalMatches: readonly HistoricalMatchChoice[];
  readonly historicalMatchError: HistoricalMatchError | null;
  /** Independent deep copy of a valid input saved for comparison. UI only. */
  readonly baseline: unknown;
  /** Why the last import was rejected; null when there is nothing to show. */
  readonly importIssues: readonly ImportIssue[] | null;
  /** Outcome of the last clear-data action, until the next change. UI only. */
  readonly storageNotice: StorageNotice | null;
  /** The year shown by the future view, 0 to LIMITS.projectionYears. UI only. */
  readonly futureYear: number;
  /** The list or block of the composition view; null is the first list. UI only. */
  readonly compositionTarget: CompositionTarget | null;
  /** The questionnaire book or the editor with its results. UI only. */
  readonly screen: Screen;
  /** Questionnaire answers and position, kept apart from the input. UI only. */
  readonly book: BookState;
  /** The input as last loaded; any other input counts as changed. UI only. */
  readonly loadedInput: unknown;
  /** A preset waiting for confirmation before it replaces a changed input. */
  readonly replacePending: PresetId | null;
  /** Answers the last questionnaire build took from suggestions. UI only. */
  readonly autoFilled: readonly FilledItem[];
  /** The editor page last turned to; resolved against the input when shown. UI only. */
  readonly editorPage: SavedPage;
  /** A conversion is shown without changing the current scenario. UI only. */
  readonly legacyPreview: LegacyPreview | null;
  readonly legacyFailure: LegacyFailure | null;
  /** Independent pre-conversion input, kept only for this visit. */
  readonly legacyOriginal: unknown;
}

export type Screen = 'book' | 'app';

export type StorageNotice = 'cleared' | 'failed';

/** What the app keeps in the browser between visits: the language choice. */
export interface LanguageStorage {
  load(): string | null;
  save(locale: Locale): void;
  /** Removes everything the app stored; false when that was not possible. */
  clear(): boolean;
}

export interface StoreOptions {
  readonly storage?: LanguageStorage;
}

export interface Derived {
  readonly validation: ValidationResult;
  /** Present only when the current input is valid. */
  readonly result: SeatResult | null;
}

export interface Store {
  applyPanelEdit(result: PanelEdit, keepExperiment?: boolean): boolean;
  setSupporterTarget(
    partyId: string,
    text: string,
    normalized?: boolean,
  ): boolean;
  resetSupporterExperiment(): void;
  /** Restores every group's growth rate from the loaded file (M7-17). */
  resetGrowth(): boolean;
  setPanelSession(patch: Partial<PanelSession>): void;
  getState(): AppState;
  getDerived(): Derived;
  subscribe(listener: () => void): () => void;
  setInput(input: unknown): void;
  updateInput(update: (input: unknown) => unknown): void;
  requestLegacyConversion(): boolean;
  confirmLegacyConversion(): boolean;
  cancelLegacyConversion(): void;
  getLegacyOriginal(): unknown;
  setView(view: ViewId): void;
  /** Turns the editor to a listed page; an unlisted key is ignored. */
  setEditorPage(key: string): void;
  setLanguage(locale: Locale): void;
  requestDelete(kind: EntityKind, id: string): void;
  cancelDelete(): void;
  /** Returns false and keeps the confirmation open when the repair fails. */
  confirmDelete(repair: Repair): boolean;
  loadPreset(id: PresetId): void;
  toggleLock(key: string): void;
  /** Stores the touched lock rows of a questionnaire page (M7-20). */
  setBookLocks(key: string, rows: readonly number[]): void;
  /** Aligns party shares to 100% with the current locks; false when refused. */
  alignPartyShares(): boolean;
  /** Returns false and leaves the input unchanged when the engine refuses. */
  rebalanceShares(): boolean;
  rebalanceWeights(groupId: string): boolean;
  /**
   * Sets one turnout on the groups that vote only for this party or block,
   * read from the current input. False, input unchanged, when refused.
   */
  setCohortTurnout(
    kind: 'party' | 'block',
    id: string,
    percentText: string,
  ): boolean;
  /** Returns false and leaves the input unchanged when the engine refuses. */
  addPair(list: PairList, first: string, second: string): boolean;
  removePair(list: PairList, index: number): boolean;
  toggleCoalitionMember(partyId: string): void;
  toggleCriticalParty(color: CriticalColor, partyId: string): void;
  /**
   * Unticks a followed set, or ticks it while fewer than three are ticked;
   * otherwise does nothing. Sets are compared by key, whatever the order.
   */
  toggleFutureCoalition(partyIds: readonly string[]): void;
  /** Null suppresses an automatic match; refused choices leave matches intact. */
  setHistoricalMatch(currentId: string, historicalId: string | null): boolean;
  /** Removes the explicit choice and restores automatic matching when valid. */
  clearHistoricalMatch(currentId: string): boolean;
  /** The saved baseline, validated and run; null when none is saved. */
  getBaseline(): Derived | null;
  /** Returns false and keeps the old baseline when the input is invalid. */
  saveBaseline(): boolean;
  /** Returns false when no baseline is saved. */
  resetToBaseline(): boolean;
  clearBaseline(): void;
  /** Loads scenario JSON text like a preset; a rejected text keeps the input. */
  importScenario(text: string): boolean;
  rejectImport(code: ImportFailure): void;
  dismissImport(): void;
  /** Removes the app's saved data; this visit keeps its language and scenario. */
  clearSavedData(): void;
  /** Returns false and keeps the year when it is not an integer from 0 to 20. */
  setFutureYear(year: number): boolean;
  setCompositionTarget(target: CompositionTarget | null): void;
  /** Seats of the future year for the current input; null when invalid. */
  getProjection(): SeatProjection | null;
  getProjectionSource(): Scenario | null;
  /** Shows the questionnaire where it was left, answers kept. */
  openBook(): void;
  /** Types or chooses one value on a page of the current screen (default: its first page). */
  answerBook(index: number, text: string, page?: PageKey): void;
  /** Confirms a valid screen and turns to the next; false shows the error. */
  bookNext(): boolean;
  bookBack(): void;
  /** Turns to the screen holding a page of the current page list; other keys are ignored. */
  bookGoTo(page: PageKey): void;
  /**
   * Aligns one party's composition on the compose page exactly to 100%; the
   * `locked` group positions keep their values.
   */
  bookAlign(party: number, locked?: readonly number[]): void;
  /** Aligns the vote shares exactly to 100%; `locked` positions keep their values. */
  bookAlignShares(locked?: readonly number[]): void;
  openFact(): void;
  closeFact(): void;
  /** Opens the editor, building from the answers when there are any. */
  skipBook(): void;
  /** Builds the scenario from the answers and opens the seat results. */
  buildBook(): void;
  restartBook(): void;
  /**
   * The opening page's start: an empty book (null) or a ready example, leafed
   * through from its first page or opened on Coalitions (M7-16).
   */
  startBook(example: StartExampleId | null, open: boolean): void;
  /** Carries out the questionnaire confirmation waiting on screen. */
  confirmBook(): void;
  cancelBook(): void;
  /** Loads a preset, or asks first when the input was changed. */
  requestPreset(id: PresetId): void;
  confirmReplace(): void;
  cancelReplace(): void;
  dismissAutoFilled(): void;
}

export function shareLockKey(groupId: string): string {
  return `share:${groupId}`;
}

export function weightLockKey(groupId: string, partyId: string): string {
  return `weight:${groupId}:${partyId}`;
}

export function partyLockKey(partyId: string): string {
  return `party:${partyId}`;
}

function derive(input: unknown): Derived {
  const validation = validateScenario(input);
  const result = validation.ok ? runSeats(validation.scenario) : null;
  return { validation, result };
}

function storedLanguage(storage: LanguageStorage | undefined): Locale | null {
  try {
    const value = storage?.load() ?? null;
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

function stillPending(
  pending: PendingDelete | null,
  input: unknown,
): PendingDelete | null {
  if (pending === null || !isDraft(input)) {
    return null;
  }
  const exists = entities(input, pending.kind).some(
    (entity) => entity.id === pending.id,
  );
  return exists ? pending : null;
}

/** The saved page as it resolves for the input; a non-draft keeps it as is. */
function settlePage(saved: SavedPage, input: unknown): SavedPage {
  if (!isDraft(input)) {
    return saved;
  }
  const pages = editorPages(input);
  const index = resolvePage(pages, saved);
  const key = pages[index]?.key ?? FIRST_PAGE.key;
  return key === saved.key && index === saved.index ? saved : { key, index };
}

function lockedIds(locks: readonly string[], prefix: string): string[] {
  return locks
    .filter((lock) => lock.startsWith(prefix))
    .map((lock) => lock.slice(prefix.length));
}

/** Whether this lock still leaves two unlocked positions in its family (M7-20). */
function canAddStoreLock(state: AppState, key: string): boolean {
  if (!isDraft(state.input)) return true;
  const [kind, groupId = ''] = key.split(':');
  const family =
    kind === 'share'
      ? { total: entities(state.input, 'group').length, head: 'share:' }
      : kind === 'weight'
        ? {
            total: entities(state.input, 'party').length,
            head: `weight:${groupId}:`,
          }
        : { total: entities(state.input, 'party').length, head: 'party:' };
  const locked = state.locks.filter((lock) =>
    lock.startsWith(family.head),
  ).length;
  return canLockAnother(family.total, locked);
}

/** Keeps only locks whose referenced entities still exist. */
function pruneLocks(
  locks: readonly string[],
  input: unknown,
): readonly string[] {
  if (locks.length === 0) {
    return locks;
  }
  if (!isDraft(input)) {
    return [];
  }
  const groups = new Set(entities(input, 'group').map((group) => group.id));
  const parties = new Set(entities(input, 'party').map((party) => party.id));
  return locks.filter((lock) => {
    const [kind, groupId = '', partyId = ''] = lock.split(':');
    if (kind === 'party') {
      return parties.has(groupId);
    }
    if (!groups.has(groupId)) {
      return false;
    }
    return kind !== 'weight' || parties.has(partyId);
  });
}

/** Keeps only selected parties that still exist. */
function pruneSelection(
  selection: readonly string[],
  input: unknown,
): readonly string[] {
  if (selection.length === 0) {
    return selection;
  }
  if (!isDraft(input)) {
    return [];
  }
  const parties = new Set(entities(input, 'party').map((party) => party.id));
  const kept = selection.filter((id) => parties.has(id));
  return kept.length === selection.length ? selection : kept;
}

/** Keeps only followed coalitions whose parties all still exist. */
function pruneCoalitions(
  coalitions: readonly (readonly string[])[],
  input: unknown,
): readonly (readonly string[])[] {
  if (coalitions.length === 0) {
    return coalitions;
  }
  if (!isDraft(input)) {
    return [];
  }
  const parties = new Set(entities(input, 'party').map((party) => party.id));
  const kept = coalitions.filter((ids) => ids.every((id) => parties.has(id)));
  return kept.length === coalitions.length ? coalitions : kept;
}

function pruneHistoricalMatches(
  choices: readonly HistoricalMatchChoice[],
  input: unknown,
): readonly HistoricalMatchChoice[] {
  if (choices.length === 0 || !isDraft(input)) {
    return choices;
  }
  const parties = new Set(entities(input, 'party').map((party) => party.id));
  const kept = choices.filter((choice) => parties.has(choice.currentId));
  return kept.length === choices.length ? choices : kept;
}

/** Scenario input is plain JSON, so a JSON round trip is a full deep copy. */
function copyInput(input: unknown): unknown {
  return JSON.parse(JSON.stringify(input)) as unknown;
}

const IMPORT_FAILURES: Readonly<Record<ImportFailure, string>> = {
  'too-large': `Scenario file exceeds ${LIMITS.jsonBytes} bytes`,
  unreadable: 'Scenario file could not be read',
};

export function createStore(
  initial: Partial<AppState> = {},
  options: StoreOptions = {},
): Store {
  const { storage } = options;
  const input = initial.input !== undefined ? initial.input : baselineInput();
  let state: AppState = {
    input,
    view: initial.view ?? 'inputs',
    language: initial.language ?? storedLanguage(storage) ?? DEFAULT_LOCALE,
    pendingDelete: initial.pendingDelete ?? null,
    locks: initial.locks ?? [],
    lockNotice: false,
    coalitionSelection: initial.coalitionSelection ?? [],
    futureCoalitions: initial.futureCoalitions ?? [],
    panel: initial.panel ?? EMPTY_PANEL,
    criticalSets: initial.criticalSets ?? { red: [], orange: [] },
    historicalMatches: initial.historicalMatches ?? [],
    historicalMatchError: initial.historicalMatchError ?? null,
    baseline: initial.baseline ?? null,
    importIssues: initial.importIssues ?? null,
    storageNotice: initial.storageNotice ?? null,
    futureYear: initial.futureYear ?? DEFAULT_FUTURE_YEAR,
    compositionTarget: initial.compositionTarget ?? null,
    screen: initial.screen ?? 'app',
    book: initial.book ?? EMPTY_BOOK,
    loadedInput:
      initial.loadedInput !== undefined ? initial.loadedInput : input,
    replacePending: initial.replacePending ?? null,
    autoFilled: initial.autoFilled ?? [],
    editorPage: initial.editorPage ?? FIRST_PAGE,
    legacyPreview: null,
    legacyFailure: null,
    legacyOriginal: null,
  };
  let cache: { readonly input: unknown; readonly derived: Derived } | null =
    null;
  let projectionCache: {
    readonly input: unknown;
    readonly year: number;
    readonly result: SeatProjection | null;
  } | null = null;
  let baselineCache: {
    readonly input: unknown;
    readonly derived: Derived;
  } | null = null;
  const listeners = new Set<() => void>();

  function derived(): Derived {
    if (state.panel.invalidFields.length > 0)
      return {
        validation: {
          ok: false,
          issues: state.panel.invalidFields.map((path) => ({
            path,
            code: 'invalid-decimal',
            message: 'Invalid panel entry',
          })),
        },
        result: null,
      };
    if (cache === null || cache.input !== state.input) {
      cache = { input: state.input, derived: derive(state.input) };
    }
    return cache.derived;
  }

  let projectionSourceCache: { input: unknown; scenario: Scenario } | null =
    null;
  function projectionSource(): Scenario | null {
    const checked = derived().validation;
    if (!checked.ok) return null;
    if (state.panel.experiment === null) return checked.scenario;
    if (projectionSourceCache?.input !== state.input)
      projectionSourceCache = {
        input: state.input,
        scenario: runSupporters(state.panel.experiment, state.panel.targets)
          .scenario,
      };
    return projectionSourceCache!.scenario;
  }

  /**
   * Every change drops the clear-data notice unless it is the clear itself. A
   * new input settles the editor page on the page it now resolves to and drops
   * followed coalitions that lost a party.
   */
  function commit(
    next: AppState,
    notice: StorageNotice | null = null,
    keepExperiment = false,
  ): void {
    const changed = next.input !== state.input;
    const previewStale =
      changed ||
      next.futureYear !== state.futureYear ||
      next.coalitionSelection !== state.coalitionSelection;
    const editorPage = changed
      ? settlePage(next.editorPage, next.input)
      : next.editorPage;
    const futureCoalitions = changed
      ? pruneCoalitions(next.futureCoalitions, next.input)
      : next.futureCoalitions;
    const historicalMatches = changed
      ? pruneHistoricalMatches(next.historicalMatches, next.input)
      : next.historicalMatches;
    let panel = next.panel;
    if (changed && isDraft(next.input)) {
      const parties = new Set(next.input.parties.map((party) => party.id));
      const groups = new Set(next.input.groups.map((group) => group.id));
      const custom = panel.custom.filter((entry) =>
        entry.partyIds.every((id) => parties.has(id)),
      );
      const knownKey = (key: string) =>
        key.startsWith('custom:')
          ? custom.some((entry) => entry.key === key)
          : key.split('+').every((id) => parties.has(id));
      const invalidFields = panel.invalidFields.filter((key) => {
        const [kind, id = '', group = ''] = key.split(':');
        return kind === 'data-panel-cell'
          ? parties.has(id) && groups.has(group)
          : kind === 'data-growth'
            ? groups.has(id)
            : parties.has(id);
      });
      panel = {
        ...panel,
        custom,
        invalidFields,
        invalidTexts: Object.fromEntries(
          invalidFields.map((key) => [key, panel.invalidTexts[key]!]),
        ),
        tiles: panel.tiles?.filter(knownKey) ?? null,
        favourites: panel.favourites.filter(knownKey),
      };
    }
    state = {
      ...next,
      panel:
        next.loadedInput !== state.loadedInput
          ? EMPTY_PANEL
          : changed && !keepExperiment
            ? {
                ...panel,
                experiment: null,
                targets: {},
                resetNotice:
                  state.panel.experiment !== null || next.panel.resetNotice,
              }
            : panel,
      storageNotice: notice,
      editorPage,
      futureCoalitions,
      criticalSets:
        changed && isDraft(next.input)
          ? {
              red: pruneSelection(next.criticalSets.red, next.input),
              orange: pruneSelection(next.criticalSets.orange, next.input),
            }
          : next.criticalSets,
      historicalMatches,
      historicalMatchError: changed ? null : next.historicalMatchError,
      legacyPreview: previewStale ? null : next.legacyPreview,
      legacyFailure:
        previewStale && next.legacyPreview !== null
          ? { ok: false, reason: 'stale-preview', issues: [] }
          : changed
            ? null
            : next.legacyFailure,
    };
    for (const listener of [...listeners]) {
      listener();
    }
  }

  /** Applies a pair edit; a refused edit leaves the state untouched. */
  function editPairs(edit: (draft: Draft) => Draft): boolean {
    const input = state.input;
    if (!isDraft(input)) {
      return false;
    }
    try {
      commit({ ...state, input: edit(input) });
      return true;
    } catch (error) {
      if (error instanceof EditError) {
        return false;
      }
      throw error;
    }
  }

  function applyHistoricalMatches(
    choices: readonly HistoricalMatchChoice[],
    suppressing = false,
  ): boolean {
    const { validation, result } = derived();
    if (!validation.ok || result === null) {
      commit({ ...state, historicalMatchError: 'invalid-current' });
      return false;
    }
    const checked = compareHistorical2022(validation.scenario, result, choices);
    if (!checked.ok) {
      if (suppressing && checked.reason === 'duplicate-reference') {
        commit({
          ...state,
          historicalMatches: choices,
          historicalMatchError: checked.reason,
        });
        return true;
      }
      commit({ ...state, historicalMatchError: checked.reason });
      return false;
    }
    commit({
      ...state,
      historicalMatches: choices,
      historicalMatchError: null,
    });
    return true;
  }

  function isChanged(): boolean {
    return state.input !== state.loadedInput;
  }

  function setBook(book: BookState): void {
    commit({ ...state, book });
  }

  /** Turns to a page part; a turn drops the shown error and the facts page. */
  function turnTo(book: BookState, page: PageKey | null, part = 0): void {
    setBook({
      ...book,
      page: page ?? book.page,
      part: page === null ? book.part : part,
      attempted: false,
      facts: false,
    });
  }

  function loadPreset(id: PresetId): void {
    const input = presetInput(id);
    commit({
      ...state,
      input,
      loadedInput: input,
      replacePending: null,
      autoFilled: [],
      pendingDelete: null,
      locks: [],
      coalitionSelection: [],
      futureCoalitions: [],
      criticalSets: { red: [], orange: [] },
      historicalMatches: [],
      historicalMatchError: null,
      editorPage: FIRST_PAGE,
      legacyOriginal: null,
      legacyPreview: null,
      legacyFailure: null,
    });
  }

  /** Replaces the input with the questionnaire's scenario; answers stay. */
  function applyBook(book: BookState, view: ViewId): void {
    const { input, filled } = buildFromBook(book.draft, book.answered);
    commit({
      ...state,
      book: { ...book, confirm: null },
      input,
      loadedInput: input,
      autoFilled: filled,
      view,
      screen: 'app',
      pendingDelete: null,
      locks: [],
      coalitionSelection: [],
      futureCoalitions: [],
      criticalSets: { red: [], orange: [] },
      historicalMatches: [],
      historicalMatchError: null,
      editorPage: FIRST_PAGE,
      legacyOriginal: null,
      legacyPreview: null,
      legacyFailure: null,
    });
  }

  /** Puts a ready example in the book, on its first page or on Coalitions. */
  function beginExample(example: StartExampleId, open: boolean): void {
    const { draft, answered } = startExample(example, state.language);
    const book: BookState = {
      ...EMPTY_BOOK,
      draft,
      answered,
      page: nextPage(draft, 'intro') ?? EMPTY_BOOK.page,
    };
    if (open) {
      applyBook(book, 'coalitions');
      return;
    }
    setBook(book);
  }

  return {
    getState: () => state,
    getDerived: derived,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setInput(input) {
      commit({
        ...state,
        input,
        loadedInput: input,
        autoFilled: [],
        pendingDelete: null,
        locks: [],
        coalitionSelection: [],
        futureCoalitions: [],
        criticalSets: { red: [], orange: [] },
        historicalMatches: [],
        historicalMatchError: null,
        legacyOriginal: null,
        legacyPreview: null,
        legacyFailure: null,
      });
    },
    updateInput(update) {
      const input = update(state.input);
      commit({
        ...state,
        input,
        panel: { ...state.panel, invalidFields: [], invalidTexts: {} },
        pendingDelete: stillPending(state.pendingDelete, input),
        locks: pruneLocks(state.locks, input),
        coalitionSelection: pruneSelection(state.coalitionSelection, input),
      });
    },
    applyPanelEdit(result, keepExperiment = false) {
      if (!result.ok) return false;
      commit({ ...state, input: result.draft }, null, keepExperiment);
      return true;
    },
    setSupporterTarget(partyId, text, normalized = false) {
      let basis = state.panel.experiment;
      if (basis === null) {
        const checked = validateScenario(state.input);
        if (!checked.ok) return false;
        const prepared = freezeSupporters(checked.scenario);
        if ('kind' in prepared) return false;
        basis = prepared;
      }
      const targets = { ...state.panel.targets, [partyId]: text };
      try {
        const changed = runSupporters(basis, targets);
        if (!validateScenario(changed.scenario).ok) return false;
        const input = {
          ...changed.scenario,
          groups: changed.scenario.groups.map((group, g) => ({
            ...group,
            turnoutChange: basis.source.groups[g]!.turnoutChange,
          })),
          parties: changed.scenario.parties.map((party, p) => ({
            ...party,
            voteShare: normalized
              ? party.voteShare
              : fractionParts(changed.rawShares[p]!),
          })),
        };
        commit(
          {
            ...state,
            input,
            panel: {
              ...state.panel,
              experiment: basis,
              targets,
              resetNotice: false,
            },
          },
          null,
          true,
        );
        return true;
      } catch {
        return false;
      }
    },
    resetSupporterExperiment() {
      const source = state.panel.experiment?.source;
      if (source)
        commit({
          ...state,
          input: source,
          panel: {
            ...state.panel,
            experiment: null,
            targets: {},
            invalidFields: [],
            invalidTexts: {},
          },
        });
    },
    setPanelSession(patch) {
      commit({ ...state, panel: { ...state.panel, ...patch } });
    },
    resetGrowth() {
      const loaded = validateScenario(state.loadedInput);
      if (!loaded.ok || !isDraft(state.input)) return false;
      const draft = state.input;
      const input = {
        ...draft,
        groups: draft.groups.map((group) => {
          const source = loaded.scenario.groups.find(
            (item) => item.id === group.id,
          );
          return source ? { ...group, growthRate: source.growthRate } : group;
        }),
      };
      if (!validateScenario(input).ok) return false;
      commit({
        ...state,
        input,
        panel: { ...state.panel, invalidFields: [], invalidTexts: {} },
      });
      return true;
    },
    requestLegacyConversion() {
      const { validation } = derived();
      const result = prepareLegacyConversion(state.input);
      if (!result.ok || !validation.ok) {
        commit({
          ...state,
          legacyPreview: null,
          legacyFailure: result.ok
            ? {
                ok: false,
                reason: 'invalid-scenario',
                issues: validation.ok ? [] : validation.issues,
              }
            : result,
        });
        return false;
      }
      commit({
        ...state,
        legacyFailure: null,
        legacyPreview: {
          source: JSON.stringify(state.input),
          year: state.futureYear,
          selection: [...state.coalitionSelection],
          before: validation.scenario,
          after: result.scenario,
        },
      });
      return true;
    },
    confirmLegacyConversion() {
      const preview = state.legacyPreview;
      if (
        preview === null ||
        preview.source !== JSON.stringify(state.input) ||
        preview.year !== state.futureYear ||
        preview.selection.length !== state.coalitionSelection.length ||
        preview.selection.some(
          (id, index) => id !== state.coalitionSelection[index],
        )
      ) {
        if (preview !== null) {
          commit({
            ...state,
            legacyPreview: null,
            legacyFailure: { ok: false, reason: 'stale-preview', issues: [] },
          });
        }
        return false;
      }
      const input = copyInput(preview.after);
      commit({
        ...state,
        input,
        legacyOriginal: copyInput(state.input),
        criticalSets: { red: [], orange: [] },
        legacyPreview: null,
        legacyFailure: null,
        pendingDelete: null,
        locks: [],
        compositionTarget:
          state.compositionTarget?.kind === 'party'
            ? state.compositionTarget
            : null,
      });
      return true;
    },
    cancelLegacyConversion() {
      if (state.legacyPreview !== null || state.legacyFailure !== null) {
        commit({ ...state, legacyPreview: null, legacyFailure: null });
      }
    },
    getLegacyOriginal() {
      return state.legacyOriginal === null
        ? null
        : copyInput(state.legacyOriginal);
    },
    setView(view) {
      commit({ ...state, view });
    },
    setEditorPage(key) {
      const input = state.input;
      if (!isDraft(input)) {
        return;
      }
      const index = editorPages(input).findIndex((page) => page.key === key);
      if (
        index < 0 ||
        (state.editorPage.key === key && state.editorPage.index === index)
      ) {
        return;
      }
      commit({ ...state, editorPage: { key, index } });
    },
    setLanguage(locale) {
      // M7-20: untouched example names follow the interface language from any
      // locale they were typed in, so an imported example never mixes languages.
      const draft = LOCALES.reduce(
        (current, from) => translateExampleNames(current, from, locale),
        state.book.draft,
      );
      const translate = <T>(
        value: T,
        rename: (current: T, from: Locale) => T,
      ): T => LOCALES.reduce((current, from) => rename(current, from), value);
      const input = isDraft(state.input)
        ? translate(state.input as unknown, (current, from) =>
            isDraft(current)
              ? translateExampleScenario(current, from, locale)
              : current,
          )
        : state.input;
      const baseline = isDraft(state.baseline)
        ? translate(state.baseline as unknown, (current, from) =>
            isDraft(current)
              ? translateExampleScenario(current, from, locale)
              : current,
          )
        : state.baseline;
      // The frozen experiment basis draws every card and table of the future
      // view; its names follow too, numbers and cohorts untouched.
      const experiment =
        state.panel.experiment === null
          ? null
          : {
              ...state.panel.experiment,
              source: translate(
                state.panel.experiment.source,
                (current, from) =>
                  translateExampleTitles(current, from, locale),
              ),
            };
      commit(
        {
          ...state,
          input,
          baseline,
          language: locale,
          panel:
            experiment === state.panel.experiment
              ? state.panel
              : { ...state.panel, experiment },
          ...(draft === state.book.draft
            ? {}
            : { book: { ...state.book, draft } }),
        },
        null,
        true,
      );
      try {
        storage?.save(locale);
      } catch {
        // Storage may be disabled; the choice still applies to this visit.
      }
    },
    requestDelete(kind, id) {
      const input = state.input;
      if (!isDraft(input)) {
        return;
      }
      if (!entities(input, kind).some((entity) => entity.id === id)) {
        return;
      }
      if (findReferences(input, kind, id).length === 0) {
        const next = deleteEntity(input, kind, id);
        commit({
          ...state,
          input: next,
          pendingDelete: null,
          locks: pruneLocks(state.locks, next),
          coalitionSelection: pruneSelection(state.coalitionSelection, next),
        });
        return;
      }
      commit({ ...state, pendingDelete: { kind, id } });
    },
    cancelDelete() {
      if (state.pendingDelete !== null) {
        commit({ ...state, pendingDelete: null });
      }
    },
    confirmDelete(repair) {
      const pending = state.pendingDelete;
      const input = state.input;
      if (pending === null || !isDraft(input)) {
        return false;
      }
      try {
        const next = deleteEntity(input, pending.kind, pending.id, repair);
        commit({
          ...state,
          input: next,
          pendingDelete: null,
          locks: pruneLocks(state.locks, next),
          coalitionSelection: pruneSelection(state.coalitionSelection, next),
        });
        return true;
      } catch (error) {
        if (error instanceof EditError) {
          return false;
        }
        throw error;
      }
    },
    loadPreset(id) {
      loadPreset(id);
    },
    toggleLock(key) {
      const locking = !state.locks.includes(key);
      if (locking && !canAddStoreLock(state, key)) {
        commit({ ...state, lockNotice: true });
        return;
      }
      const locks = locking
        ? [...state.locks, key]
        : state.locks.filter((lock) => lock !== key);
      commit({ ...state, locks, lockNotice: false });
    },
    setBookLocks(key, rows) {
      setBook({
        ...state.book,
        locks: { ...state.book.locks, [key]: rows },
      });
    },
    alignPartyShares() {
      const data = readPanel(state.input);
      if (data === null) return false;
      const locks =
        state.panel.voteLocks ??
        defaultLocks(data.shares.map((share) => panelPercent(share))).map(
          (at) => data.partyIds[at]!,
        );
      const aligned = alignPanelVotes(state.input, locks);
      if (!aligned.ok) return false;
      // A suspended linked basis would keep supporter turnout unavailable,
      // so the alignment rebuilds it from the aligned numbers right away.
      const model = (
        aligned.draft as { linkedModel?: { state?: unknown } | null }
      ).linkedModel;
      const rebuilt =
        model?.state === 'suspended' ? rebuildPanelBasis(aligned.draft) : null;
      commit({
        ...state,
        input: rebuilt !== null && rebuilt.ok ? rebuilt.draft : aligned.draft,
      });
      return true;
    },
    rebalanceShares() {
      const input = state.input;
      if (!isDraft(input)) {
        return false;
      }
      try {
        const next = rebalanceDraftShares(
          input,
          lockedIds(state.locks, 'share:'),
        );
        if (next === null) {
          return false;
        }
        commit({ ...state, input: next });
        return true;
      } catch (error) {
        if (error instanceof EditError) {
          return false;
        }
        throw error;
      }
    },
    rebalanceWeights(groupId) {
      const input = state.input;
      if (!isDraft(input)) {
        return false;
      }
      try {
        const next = rebalanceDraftWeights(
          input,
          groupId,
          lockedIds(state.locks, `weight:${groupId}:`),
        );
        if (next === null) {
          return false;
        }
        commit({ ...state, input: next });
        return true;
      } catch (error) {
        if (error instanceof EditError) {
          return false;
        }
        throw error;
      }
    },
    setCohortTurnout(kind, id, percentText) {
      const input = state.input;
      if (!isDraft(input)) {
        return false;
      }
      try {
        const { dedicated } = turnoutCohorts(input, kind, id);
        if (dedicated.length === 0) {
          return false;
        }
        commit({
          ...state,
          input: setDraftCohortTurnout(input, dedicated, percentText),
        });
        return true;
      } catch (error) {
        if (error instanceof EditError) {
          return false;
        }
        throw error;
      }
    },
    addPair(list, first, second) {
      return editPairs((draft) => addDraftPair(draft, list, first, second));
    },
    removePair(list, index) {
      return editPairs((draft) => removeDraftPair(draft, list, index));
    },
    toggleCoalitionMember(partyId) {
      const selection = state.coalitionSelection;
      const coalitionSelection = selection.includes(partyId)
        ? selection.filter((id) => id !== partyId)
        : [...selection, partyId];
      commit({ ...state, coalitionSelection });
    },
    toggleFutureCoalition(ids) {
      const key = coalitionKey(ids);
      const followed = state.futureCoalitions;
      if (followed.some((ids) => coalitionKey(ids) === key)) {
        commit({
          ...state,
          futureCoalitions: followed.filter((ids) => coalitionKey(ids) !== key),
        });
        return;
      }
      if (followed.length >= MAX_FUTURE_COALITIONS) {
        return;
      }
      commit({ ...state, futureCoalitions: [...followed, [...ids]] });
    },
    toggleCriticalParty(color, partyId) {
      if (
        !isDraft(state.input) ||
        !entities(state.input, 'party').some((party) => party.id === partyId)
      ) {
        throw new RangeError(`Unknown party "${partyId}"`);
      }
      const selected = state.criticalSets[color];
      commit({
        ...state,
        criticalSets: {
          ...state.criticalSets,
          [color]: selected.includes(partyId)
            ? selected.filter((id) => id !== partyId)
            : [...selected, partyId],
        },
      });
    },
    setHistoricalMatch(currentId, historicalId) {
      const choices = [
        ...state.historicalMatches.filter(
          (choice) => choice.currentId !== currentId,
        ),
        { currentId, historicalId },
      ];
      return applyHistoricalMatches(choices, historicalId === null);
    },
    clearHistoricalMatch(currentId) {
      return applyHistoricalMatches(
        state.historicalMatches.filter(
          (choice) => choice.currentId !== currentId,
        ),
      );
    },
    getBaseline() {
      const baseline = state.baseline;
      if (baseline === null) {
        return null;
      }
      if (baselineCache === null || baselineCache.input !== baseline) {
        baselineCache = { input: baseline, derived: derive(baseline) };
      }
      return baselineCache.derived;
    },
    saveBaseline() {
      if (!validateScenario(state.input).ok) {
        return false;
      }
      commit({ ...state, baseline: copyInput(state.input) });
      return true;
    },
    resetToBaseline() {
      if (state.baseline === null) {
        return false;
      }
      const input = copyInput(state.baseline);
      commit({
        ...state,
        input,
        loadedInput: input,
        autoFilled: [],
        pendingDelete: null,
        locks: [],
        coalitionSelection: [],
        futureCoalitions: [],
        criticalSets: { red: [], orange: [] },
        historicalMatches: [],
        historicalMatchError: null,
        legacyOriginal: null,
        legacyPreview: null,
        legacyFailure: null,
      });
      return true;
    },
    clearBaseline() {
      if (state.baseline !== null) {
        commit({ ...state, baseline: null });
      }
    },
    importScenario(text) {
      const result = parseScenarioJson(text);
      if (!result.ok) {
        commit({ ...state, importIssues: result.issues });
        return false;
      }
      const input = copyInput(result.scenario);
      commit({
        ...state,
        input,
        loadedInput: input,
        autoFilled: [],
        pendingDelete: null,
        locks: [],
        coalitionSelection: [],
        futureCoalitions: [],
        criticalSets: { red: [], orange: [] },
        historicalMatches: [],
        historicalMatchError: null,
        importIssues: null,
        editorPage: FIRST_PAGE,
        legacyOriginal: null,
        legacyPreview: null,
        legacyFailure: null,
      });
      return true;
    },
    rejectImport(code) {
      commit({
        ...state,
        importIssues: [{ path: '', code, message: IMPORT_FAILURES[code] }],
      });
    },
    dismissImport() {
      if (state.importIssues !== null) {
        commit({ ...state, importIssues: null });
      }
    },
    clearSavedData() {
      let cleared: boolean;
      try {
        cleared = storage?.clear() ?? true;
      } catch {
        cleared = false;
      }
      commit(state, cleared ? 'cleared' : 'failed');
    },
    setFutureYear(year) {
      if (
        !Number.isSafeInteger(year) ||
        year < 0 ||
        year > LIMITS.projectionYears
      ) {
        return false;
      }
      commit({ ...state, futureYear: year });
      return true;
    },
    setCompositionTarget(target) {
      commit({ ...state, compositionTarget: target });
    },
    getProjection() {
      const source = projectionSource();
      if (source === null) return null;
      const { input, futureYear: year } = state;
      if (
        projectionCache === null ||
        projectionCache.input !== input ||
        projectionCache.year !== year
      ) {
        const { validation } = derived();
        projectionCache = {
          input,
          year,
          result: validation.ok
            ? year === 0
              ? runSeats(source)
              : runSeats(source, year)
            : null,
        };
      }
      return projectionCache?.result ?? null;
    },
    getProjectionSource: projectionSource,
    openBook() {
      commit({ ...state, screen: 'book' });
    },
    answerBook(index, text, page) {
      const { book } = state;
      const target = page ?? book.page;
      if (
        !takesAnswer(target) ||
        !screenOf(book.draft, book.page).includes(target)
      ) {
        return;
      }
      if (
        target === 'parties.naming' &&
        text === 'example' &&
        partyIds(book.draft).length !== EXAMPLE_LISTS.length
      ) {
        setBook({ ...book, confirm: 'example-count' });
        return;
      }
      setBook({ ...book, draft: editPage(book.draft, target, index, text) });
    },
    bookNext() {
      const { book } = state;
      const screen = screenOf(book.draft, book.page);
      if (screen.length > 1) {
        const asked = screen.filter(takesAnswer);
        if (asked.some((page) => pageError(book.draft, page) !== null)) {
          setBook({ ...book, attempted: true });
          return false;
        }
        let draft = book.draft;
        let answered = book.answered;
        for (const page of asked) {
          draft = confirmPage(draft, page);
          answered = withPage(answered, page);
        }
        const next = nextPage(draft, screen[screen.length - 1]!);
        if (next === null) {
          return false;
        }
        turnTo({ ...book, draft, answered }, next);
        return true;
      }
      const last = partCount(book.draft, book.page) - 1;
      if (book.page === 'review' || !takesAnswer(book.page)) {
        // The opening page, the lessons, the check and the review take no
        // answer and are not recorded; the check and the review turn their
        // parts first.
        if (book.part < last) {
          turnTo(book, book.page, book.part + 1);
          return true;
        }
        if (book.page === 'review') {
          return false;
        }
        turnTo(book, nextPage(book.draft, book.page));
        return true;
      }
      const next = nextPage(book.draft, book.page);
      if (next === null) {
        return false;
      }
      if (book.part < last) {
        if (partError(book.draft, book.page, book.part) !== null) {
          setBook({ ...book, attempted: true });
          return false;
        }
        turnTo(book, book.page, book.part + 1);
        return true;
      }
      const wrong = pageError(book.draft, book.page);
      if (wrong !== null) {
        const holder = pageParts(book.draft, book.page).findIndex(
          (part) => wrong.index !== null && part.includes(wrong.index),
        );
        setBook({
          ...book,
          part: holder < 0 ? book.part : holder,
          attempted: true,
        });
        return false;
      }
      const draft = confirmPage(book.draft, book.page);
      turnTo(
        { ...book, draft, answered: withPage(book.answered, book.page) },
        nextPage(draft, book.page),
      );
      return true;
    },
    bookBack() {
      const { book } = state;
      if (book.part > 0) {
        turnTo(book, book.page, book.part - 1);
        return;
      }
      const previous = previousPage(book.draft, book.page);
      if (previous !== null) {
        const screen = screenOf(book.draft, previous);
        turnTo(
          book,
          screen[0]!,
          screen.length > 1 ? 0 : partCount(book.draft, previous) - 1,
        );
      }
    },
    bookGoTo(page) {
      const { book } = state;
      if (bookPages(book.draft).includes(page)) {
        turnTo(book, screenOf(book.draft, page)[0]!);
      }
    },
    bookAlign(party, locked = []) {
      const { book } = state;
      setBook({ ...book, draft: alignComposition(book.draft, party, locked) });
    },
    bookAlignShares(locked = []) {
      const { book } = state;
      setBook({ ...book, draft: alignShares(book.draft, locked) });
    },
    openFact() {
      setBook({ ...state.book, facts: true });
    },
    closeFact() {
      setBook({ ...state.book, facts: false });
    },
    skipBook() {
      let { book } = state;
      const { draft } = book;
      for (const page of screenOf(draft, book.page)) {
        if (
          takesAnswer(page) &&
          !isSuggested(book.draft, page) &&
          pageError(book.draft, page) === null
        ) {
          book = {
            ...book,
            draft: confirmPage(book.draft, page),
            answered: withPage(book.answered, page),
          };
        }
      }
      if (book.answered.length === 0) {
        commit({
          ...state,
          book: { ...book, confirm: null },
          screen: 'app',
          view: 'coalitions',
        });
        return;
      }
      if (isChanged()) {
        setBook({ ...book, confirm: 'replace-skip' });
        return;
      }
      applyBook(book, 'coalitions');
    },
    buildBook() {
      const { book } = state;
      if (isChanged()) {
        setBook({ ...book, confirm: 'replace-build' });
        return;
      }
      applyBook(book, 'coalitions');
    },
    restartBook() {
      const { book } = state;
      if (book.answered.length === 0) {
        setBook(EMPTY_BOOK);
        return;
      }
      setBook({ ...book, confirm: 'restart', start: null });
    },
    startBook(example, open) {
      const { book } = state;
      const start = { example, open };
      if (example === null) {
        if (book.answered.length > 0) {
          setBook({ ...book, confirm: 'restart', start });
          return;
        }
        turnTo(EMPTY_BOOK, nextPage(EMPTY_DRAFT, 'intro'));
        return;
      }
      // A ready example is an explicit choice on the opening page: it replaces
      // answers and the scenario at once, without a confirmation (2026-11-04).
      beginExample(example, open);
    },
    confirmBook() {
      const { book } = state;
      const actions: Readonly<Record<BookConfirm, () => void>> = {
        'example-count': () => {
          let draft = editPage(book.draft, 'parties.count', 0, '6');
          draft = confirmPage(draft, 'parties.count');
          draft = editPage(draft, 'parties.naming', 0, 'example');
          setBook({
            ...book,
            draft,
            answered: withPage(book.answered, 'parties.count'),
            confirm: null,
          });
        },
        'replace-build': () => applyBook(book, 'coalitions'),
        'replace-skip': () => applyBook(book, 'coalitions'),
        restart: () =>
          book.start === undefined || book.start === null
            ? setBook(EMPTY_BOOK)
            : turnTo(EMPTY_BOOK, nextPage(EMPTY_DRAFT, 'intro')),
      };
      if (book.confirm !== null) {
        actions[book.confirm]();
      }
    },
    cancelBook() {
      if (state.book.confirm !== null) {
        setBook({ ...state.book, confirm: null, start: null });
      }
    },
    requestPreset(id) {
      if (isChanged()) {
        commit({ ...state, replacePending: id });
        return;
      }
      loadPreset(id);
    },
    confirmReplace() {
      if (state.replacePending !== null) {
        loadPreset(state.replacePending);
      }
    },
    cancelReplace() {
      if (state.replacePending !== null) {
        commit({ ...state, replacePending: null });
      }
    },
    dismissAutoFilled() {
      if (state.autoFilled.length > 0) {
        commit({ ...state, autoFilled: [] });
      }
    },
  };
}

function withPage(answered: readonly PageKey[], page: PageKey) {
  return answered.includes(page) ? answered : [...answered, page];
}
