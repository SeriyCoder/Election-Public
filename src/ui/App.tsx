import { useEffect, useMemo, useRef } from 'preact/hooks';
import type { ComponentProps } from 'preact';
import { isStandardValidity } from '../engine/edit';
import { buildReport } from '../engine/report';
import { direction, translator, type Translate } from '../i18n';
import { BookView } from './BookView';
import { BOOK_SCENARIO_ID, type FilledItem } from './book';
import { Editor } from './Editor';
import {
  browserDownloadTarget,
  exportScenario,
  importFile,
} from './fileTransfer';
import { entityName, scenarioTitle, withDisplayNames } from './names';
import { presetIdOf, type PresetId } from './presets';
import type { CoalitionRunner } from './coalitionRunner';
import { Coalitions } from './Coalitions';
import { CoalitionWorkspace } from './CoalitionWorkspace';
import { Compare, type ComparedSide } from './Compare';
import { Composition } from './Composition';
import { Future } from './Future';
import {
  CriticalPickers,
  CriticalResults,
  FutureGraphics,
} from './FutureVisuals';
import type { FutureScanRunner } from './futureScanRunner';
import { FutureChooser } from './FutureChooser';
import { FutureWorkspace } from './FutureWorkspace';
import { coalitionKey } from './coalitionChoice';
import { HistoricalReference } from './HistoricalReference';
import { LanguageControls } from './LanguageControls';
import { LegacyConversion } from './LegacyConversion';
import { Results } from './Results';
import { ImportIssues, Transfer } from './Transfer';
import type { Derived, Store, ViewId } from './store';
import { VIEWS } from './store';
import { useRunner } from './useRunner';
import { useStore } from './useStore';

export interface AppProps {
  readonly store: Store;
  /** Coalition search runner; without one the coalitions view stays idle. */
  readonly runner?: CoalitionRunner;
  /** Coalition search runner for the saved baseline. */
  readonly baselineRunner?: CoalitionRunner;
  /** Separate cancellable search for a conversion candidate. */
  readonly previewRunner?: CoalitionRunner;
  readonly futureScanRunner?: FutureScanRunner;
}

type ResultState = 'ready' | 'no-allocation' | 'invalid';

function PublicNotice({ t }: { readonly t: Translate }) {
  return (
    <p class="public-notice" data-public-notice>
      {t('notice.forecast')}
    </p>
  );
}

function ConnectedCriticalResults(
  props: Omit<ComponentProps<typeof CriticalResults>, 'run'>,
) {
  const run = useRunner(props.runner);
  return <CriticalResults {...props} run={run} />;
}

function resultStatus(
  derived: Derived,
  t: Translate,
): { state: ResultState; text: string } {
  const { validation, result } = derived;
  if (!validation.ok || result === null) {
    const count = validation.ok ? 0 : validation.issues.length;
    return { state: 'invalid', text: t('status.invalid', { count }) };
  }
  const { allocation } = result;
  if (allocation.noAllocation !== null) {
    return {
      state: 'no-allocation',
      text: t(`status.noAllocation.${allocation.noAllocation}`),
    };
  }
  return {
    state: 'ready',
    text: t('status.allocated', { seats: allocation.seatCount }),
  };
}

function baselineSide(store: Store, t: Translate): ComparedSide | null {
  const baseline = store.getBaseline();
  if (
    baseline === null ||
    !baseline.validation.ok ||
    baseline.result === null
  ) {
    return null;
  }
  return {
    scenario: withDisplayNames(baseline.validation.scenario, t),
    seats: baseline.result,
  };
}

/** On desktop the inputs view keeps the seat results beside the editor. */
function resultPanel(view: ViewId): Exclude<ViewId, 'inputs'> {
  return view === 'inputs' ? 'seats' : view;
}

/** The note stays while the scenario keeps the example's ID, edits included. */
function isIsraelExample(input: unknown): boolean {
  return (
    typeof input === 'object' &&
    input !== null &&
    presetIdOf((input as { readonly id?: unknown }).id) === 'israelExample'
  );
}

function isHistoricalExample(input: unknown): boolean {
  return (
    typeof input === 'object' &&
    input !== null &&
    presetIdOf((input as { readonly id?: unknown }).id) === 'historical2022'
  );
}

/** A scenario built by the questionnaire keeps its ID through later edits. */
function isBookScenario(input: unknown): boolean {
  return (
    typeof input === 'object' &&
    input !== null &&
    (input as { readonly id?: unknown }).id === BOOK_SCENARIO_ID
  );
}

/** The current name of a filled group or party, else its default name. */
function filledLabel(item: FilledItem, input: unknown, t: Translate): string {
  if (item.entity === null) {
    return t(`book.filled.${item.section}`);
  }
  const kind =
    item.section === 'coalitions' || item.section === 'compose'
      ? 'party'
      : 'group';
  const list =
    typeof input === 'object' && input !== null
      ? (input as Record<string, unknown>)[
          kind === 'party' ? 'parties' : 'groups'
        ]
      : null;
  const found = Array.isArray(list)
    ? (list as unknown[]).find(
        (entity): entity is { id: string; name?: unknown } =>
          typeof entity === 'object' &&
          entity !== null &&
          (entity as { id?: unknown }).id === item.entity,
      )
    : undefined;
  return t(`book.filled.${item.section}`, {
    name: entityName(kind, found ?? { id: item.entity }, t),
  });
}

function AutoFilled({
  items,
  input,
  t,
  onDismiss,
}: {
  readonly items: readonly FilledItem[];
  readonly input: unknown;
  readonly t: Translate;
  readonly onDismiss: () => void;
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div class="auto-filled" data-auto-filled>
      <p class="auto-filled__title">{t('book.filled.title')}</p>
      <p class="auto-filled__note">{t('book.filled.note')}</p>
      <ul class="auto-filled__list">
        {items.map((item, index) => (
          <li key={index}>{filledLabel(item, input, t)}</li>
        ))}
      </ul>
      <button
        type="button"
        class="button button--small"
        data-action="dismiss-auto-filled"
        onClick={onDismiss}
      >
        {t('book.filled.dismiss')}
      </button>
    </div>
  );
}

function PresetConfirm({
  id,
  t,
  onConfirm,
  onCancel,
}: {
  readonly id: PresetId;
  readonly t: Translate;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.querySelector<HTMLElement>('button')?.focus();
  }, []);
  return (
    <div
      class="confirm preset-confirm"
      ref={root}
      role="alertdialog"
      data-preset-confirm
      aria-labelledby="preset-confirm-text"
    >
      <p id="preset-confirm-text" class="confirm__title">
        {t('preset.replace.text', { name: t(`preset.${id}`) })}
      </p>
      <div class="confirm__actions">
        <button
          type="button"
          class="button"
          data-action="preset-confirm"
          onClick={onConfirm}
        >
          {t('preset.replace.confirm')}
        </button>
        <button
          type="button"
          class="button"
          data-action="preset-cancel"
          onClick={onCancel}
        >
          {t('preset.replace.cancel')}
        </button>
      </div>
    </div>
  );
}

function focusPresetLoad(): void {
  document.querySelector<HTMLElement>('[data-action="load-preset"]')?.focus();
}

export function App({
  store,
  runner,
  baselineRunner,
  previewRunner,
  futureScanRunner,
}: AppProps) {
  const state = useStore(store);
  const run = useRunner(runner);
  const baselineRun = useRunner(baselineRunner);
  const derived = store.getDerived();
  const t = useMemo(() => translator(state.language), [state.language]);
  const panelLabels = Object.fromEntries([
    ...Object.entries(state.panel.labels).map(([key, label]) => [
      key,
      `№${label}`,
    ]),
    ...state.panel.custom.map((entry) => [
      coalitionKey(entry.partyIds),
      entry.label,
    ]),
  ]);
  const dir = direction(state.language);
  const status = resultStatus(derived, t);
  const panel = resultPanel(state.view);
  // Only the future view pays for the projection run.
  const projection =
    state.screen === 'app' && panel === 'future' ? store.getProjection() : null;
  // Result views read names from a display copy; the store keeps empty names.
  const shown = derived.validation.ok
    ? withDisplayNames(derived.validation.scenario, t)
    : null;
  // The editor reads only the store state; coalition progress must not re-render it.
  const editor = useMemo(
    () => <Editor store={store} t={translator(state.language)} />,
    [store, state],
  );
  const baseline = baselineSide(store, t);
  const comparison =
    shown !== null && derived.result !== null ? (
      <Compare
        baseline={baseline}
        current={{ scenario: shown, seats: derived.result }}
        baselineRun={baselineRun}
        currentRun={run}
        locale={state.language}
        t={t}
        onSave={() => store.saveBaseline()}
        onReset={() => store.resetToBaseline()}
        onClear={() => store.clearBaseline()}
      />
    ) : (
      <div class="compare" data-compare-unavailable>
        <p class="compare__note">{t('linkedTurnout.invalid-scenario')}</p>
        {baseline !== null && (
          <div class="compare__actions">
            <button
              type="button"
              class="button"
              data-action="reset-baseline"
              onClick={() => store.resetToBaseline()}
            >
              {t('compare.reset')}
            </button>
            <button
              type="button"
              class="button"
              data-action="clear-baseline"
              onClick={() => store.clearBaseline()}
            >
              {t('compare.clear')}
            </button>
          </div>
        )}
      </div>
    );
  const history = (
    <HistoricalReference
      scenario={derived.validation.ok ? derived.validation.scenario : null}
      seats={derived.result}
      choices={state.historicalMatches}
      error={state.historicalMatchError}
      locale={state.language}
      t={t}
      onMatch={(currentId, historicalId) =>
        store.setHistoricalMatch(currentId, historicalId)
      }
      onRestore={(currentId) => store.clearHistoricalMatch(currentId)}
    />
  );

  useEffect(() => {
    const root = document.documentElement;
    root.lang = state.language;
    root.dir = direction(state.language);
    document.title = translator(state.language)('app.title');
  }, [state.language]);

  const coalitionResults = shown !== null && derived.result !== null && (
    <div class="panel" data-panel="coalitions">
      <h3 class="panel__title">{t('view.coalitions')}</h3>
      <p class="editor-section__note">{t('workspace.majorityNote')}</p>
      <Coalitions
        scenario={shown}
        seats={derived.result}
        run={run}
        selection={state.coalitionSelection}
        locale={state.language}
        t={t}
        onCancel={() => runner?.cancel()}
        onRerun={() => runner?.rerun()}
        onToggle={(partyId) => store.toggleCoalitionMember(partyId)}
      />
    </div>
  );
  const resultsRegion = (
    <section
      class="region region--results"
      data-region="results"
      aria-label={t('region.results')}
    >
      <h2 class="region__title">{t('region.results')}</h2>
      {isIsraelExample(state.input) && (
        <p class="example-note" data-example-note>
          {t('example.israel.note')}
        </p>
      )}
      {isHistoricalExample(state.input) && (
        <p class="example-note" data-historical-preset-note>
          {t('history.presetNote')}
        </p>
      )}
      {isBookScenario(state.input) && (
        <p class="example-note" data-assumption-note>
          {t('book.note')}
        </p>
      )}
      <p class="status" role="status" data-result-state={status.state}>
        {status.text}
      </p>
      {panel !== 'coalitions' && (
        <div class="panel" data-panel={panel}>
          <h3 class="panel__title">{t(`view.${panel}`)}</h3>
          {panel === 'seats' ? (
            shown !== null &&
            derived.result !== null && (
              <Results
                report={buildReport(shown, derived.result)}
                locale={state.language}
                t={t}
                standardValidity={
                  shown.inputMode === 'groups'
                    ? shown.groups.every((group) =>
                        isStandardValidity(group.validBallotRate),
                      )
                    : isStandardValidity(shown.rules.validBallotRate)
                }
              />
            )
          ) : panel === 'compare' ? (
            <>
              {comparison}
              {history}
            </>
          ) : panel === 'composition' ? (
            shown !== null &&
            derived.result !== null && (
              <Composition
                scenario={shown}
                votes={derived.result.votes}
                target={state.compositionTarget}
                locale={state.language}
                t={t}
                onTarget={(target) => store.setCompositionTarget(target)}
              />
            )
          ) : (
            shown !== null &&
            derived.result !== null &&
            projection !== null && (
              <>
                {'kind' in projection ? (
                  <p
                    class="note"
                    data-projection-unavailable={projection.reason}
                  >
                    {t(`future.unavailable.${projection.reason}`)}
                  </p>
                ) : (
                  <Future
                    scenario={shown}
                    base={derived.result}
                    projected={projection}
                    year={state.futureYear}
                    followed={state.futureCoalitions}
                    labels={panelLabels}
                    locale={state.language}
                    t={t}
                    onYear={(year) => store.setFutureYear(year)}
                    showYear={false}
                  />
                )}
                <ConnectedCriticalResults
                  scenario={shown}
                  base={derived.result}
                  projected={projection}
                  year={state.futureYear}
                  sets={state.criticalSets}
                  locale={state.language}
                  t={t}
                  runner={futureScanRunner}
                />
              </>
            )
          )}
        </div>
      )}
    </section>
  );

  if (state.screen === 'book') {
    return (
      <div class="app" lang={state.language} dir={dir} data-screen="book">
        <PublicNotice t={t} />
        <BookView store={store} t={t} locale={state.language} />
      </div>
    );
  }

  return (
    <div
      class="app"
      lang={state.language}
      dir={dir}
      data-active-view={state.view}
      data-screen="app"
    >
      <header class="toolbar" data-region="toolbar">
        <PublicNotice t={t} />
        <span class="toolbar__brand">{t('app.title')}</span>
        <h1 class="toolbar__name">
          <bdi>{scenarioTitle(state.input, t)}</bdi>
        </h1>
        <span
          class="toolbar__validity"
          data-valid={derived.validation.ok ? 'true' : 'false'}
        >
          {t(derived.validation.ok ? 'validity.valid' : 'validity.invalid')}
        </span>
        <button
          type="button"
          class="button button--primary"
          data-action="open-book"
          onClick={() => store.openBook()}
        >
          {t('book.open')}
        </button>
        {state.replacePending !== null && (
          <PresetConfirm
            id={state.replacePending}
            t={t}
            onConfirm={() => {
              store.confirmReplace();
              focusPresetLoad();
            }}
            onCancel={() => {
              store.cancelReplace();
              focusPresetLoad();
            }}
          />
        )}
        <Transfer
          canExport={derived.validation.ok}
          t={t}
          onExport={() => exportScenario(store, browserDownloadTarget())}
          onImport={(file) => {
            void importFile(store, file);
          }}
        />
        <LanguageControls store={store} locale={state.language} t={t} />
        <button
          type="button"
          class="button"
          data-action="clear-data"
          onClick={() => store.clearSavedData()}
        >
          {t('storage.clear')}
        </button>
        {state.storageNotice !== null && (
          <p
            class="storage-notice"
            role="status"
            data-storage-notice={state.storageNotice}
          >
            {t(`storage.${state.storageNotice}`)}
          </p>
        )}
        <ImportIssues
          issues={state.importIssues}
          t={t}
          onDismiss={() => store.dismissImport()}
        />
      </header>

      <LegacyConversion
        store={store}
        currentRun={run}
        previewRunner={previewRunner}
        locale={state.language}
        t={t}
      />

      <nav class="views" aria-label={t('nav.label')}>
        <ul class="views__list">
          {VIEWS.map((view) => (
            <li key={view}>
              <button
                type="button"
                class="views__item"
                data-view={view}
                aria-current={view === state.view ? 'page' : undefined}
                onClick={() => store.setView(view)}
              >
                {t(`view.${view}`)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main
        class="workspace"
        data-layout={
          state.view === 'coalitions' || state.view === 'future'
            ? state.view
            : undefined
        }
      >
        {state.view === 'future' ? (
          <section
            class="region region--future"
            data-region="future"
            aria-label={t('view.future')}
          >
            <h2 class="region__title">{t('view.future')}</h2>
            <FutureWorkspace store={store} t={t} run={run} />
            <details class="workspace-disclosure" data-future-details>
              <summary>{t('panel.futureDetails')}</summary>
              <div class="future-details">
                <section
                  class="region region--chooser"
                  data-region="chooser"
                  aria-label={t('chooser.title')}
                >
                  <h3 class="region__title">{t('chooser.title')}</h3>
                  {shown !== null &&
                    derived.result !== null &&
                    projection !== null && (
                      <>
                        <FutureGraphics
                          scenario={shown}
                          base={derived.result}
                          projected={projection}
                          year={state.futureYear}
                          locale={state.language}
                          t={t}
                        />
                        <CriticalPickers
                          scenario={shown}
                          sets={state.criticalSets}
                          t={t}
                          onToggle={(color, partyId) =>
                            store.toggleCriticalParty(color, partyId)
                          }
                        />
                      </>
                    )}
                  <FutureChooser
                    scenario={shown}
                    seats={derived.result}
                    run={run}
                    followed={state.futureCoalitions}
                    labels={panelLabels}
                    selection={state.coalitionSelection}
                    locale={state.language}
                    t={t}
                    onToggle={(partyIds) =>
                      store.toggleFutureCoalition(partyIds)
                    }
                  />
                </section>
                {resultsRegion}
              </div>
            </details>
          </section>
        ) : state.view === 'coalitions' ? (
          <section
            class="region region--editor region--workspace"
            data-region="editor"
            aria-label={t('workspace.title')}
          >
            <h2 class="region__title">{t('workspace.title')}</h2>
            <AutoFilled
              items={state.autoFilled}
              input={state.input}
              t={t}
              onDismiss={() => store.dismissAutoFilled()}
            />
            <CoalitionWorkspace
              store={store}
              scenario={shown}
              seats={derived.result}
              baseline={baseline}
              locale={state.language}
              t={t}
              comparison={comparison}
              history={history}
              run={run}
              results={coalitionResults}
            />
          </section>
        ) : (
          <section
            class="region region--editor"
            data-region="editor"
            aria-label={t('region.editor')}
          >
            <h2 class="region__title">{t('region.editor')}</h2>
            <AutoFilled
              items={state.autoFilled}
              input={state.input}
              t={t}
              onDismiss={() => store.dismissAutoFilled()}
            />
            {editor}
          </section>
        )}

        {state.view !== 'future' && resultsRegion}
      </main>
    </div>
  );
}
