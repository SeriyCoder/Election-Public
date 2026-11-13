import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { compareScenarios } from '../engine/compare';
import { isDraft, type Draft } from '../engine/edit';
import {
  compareHistorical2022,
  historicalPercent,
} from '../engine/historicalReference';
import {
  editOverallTurnoutWithAvailableBasis,
  editPartyShareWithAvailableBasis,
  linkedTurnoutAvailability,
  type LinkedEditFailure,
  type LinkedEditResult,
} from '../engine/linkedTurnout';
import { fractionToPercent } from '../engine/numeric';
import { buildReport } from '../engine/report';
import type { SeatResult } from '../engine/run';
import type { Scenario } from '../engine/schema';
import type { Locale, Translate } from '../i18n';
import { formatChange, formatDecimal, formatInteger } from '../i18n/format';
import type { ComparedSide } from './Compare';
import { GroupTurnoutControl, LockButton } from './Editor';
import { entityName } from './names';
import { partyLockKey, type Store } from './store';
import { IntegratedPanel } from './PanelControls';
import { Purpose } from './Purpose';
import type { CoalitionRun } from './coalitionRunner';

interface TypedRate {
  readonly draft: Draft;
  readonly text: string;
  readonly error: LinkedEditFailure | null;
}

function ExactRate({
  draft,
  value,
  label,
  inputAttributes,
  sliderAttributes,
  errorAttributes,
  errorId,
  store,
  t,
  edit,
}: {
  readonly draft: Draft;
  readonly value: unknown;
  readonly label: string;
  readonly inputAttributes: Readonly<Record<string, string>>;
  readonly sliderAttributes: Readonly<Record<string, string>>;
  readonly errorAttributes: Readonly<Record<string, string>>;
  readonly errorId: string;
  readonly store: Store;
  readonly t: Translate;
  readonly edit: (input: unknown, text: string) => LinkedEditResult;
}) {
  const [typed, setTyped] = useState<TypedRate | null>(null);
  const active = typed?.draft === draft ? typed : null;

  function apply(text: string): void {
    const result = edit(store.getState().input, text);
    if (result.ok) {
      store.updateInput(() => result.draft);
      setTyped({ draft: result.draft, text, error: null });
    } else {
      setTyped({ draft, text, error: result.reason });
    }
  }

  return (
    <>
      <input
        {...inputAttributes}
        class="field__input field__input--number"
        type="text"
        inputMode="decimal"
        dir="ltr"
        aria-label={label}
        aria-invalid={active?.error !== null && active?.error !== undefined}
        aria-describedby={active?.error ? errorId : undefined}
        value={active?.text ?? fractionToPercent(value) ?? ''}
        onInput={(event) => apply(event.currentTarget.value)}
        onBlur={() => {
          if (active?.error === null) setTyped(null);
        }}
      />
      <input
        {...sliderAttributes}
        class="rate-slider"
        type="range"
        min="0"
        max="100"
        step="0.1"
        aria-label={label}
        value={fractionToPercent(value) ?? '0'}
        onInput={(event) => apply(event.currentTarget.value)}
      />
      {active?.error && (
        <p
          {...errorAttributes}
          id={errorId}
          class="party-composition__error"
          role="alert"
        >
          {t(`linkedTurnout.${active.error}`)}
        </p>
      )}
    </>
  );
}

export function CoalitionWorkspace({
  store,
  scenario,
  seats,
  baseline,
  locale,
  t,
  comparison,
  history,
  run,
  results,
}: {
  readonly store: Store;
  readonly scenario: Scenario | null;
  readonly seats: SeatResult | null;
  readonly baseline: ComparedSide | null;
  readonly locale: Locale;
  readonly t: Translate;
  readonly comparison: ComponentChildren;
  readonly history: ComponentChildren;
  readonly run?: CoalitionRun;
  /** The coalition search results, shown in the closed "more" area. */
  readonly results?: ComponentChildren;
}) {
  const state = store.getState();
  const validation = store.getDerived().validation;
  const draft = isDraft(state.input) ? state.input : null;
  const raw = validation.ok ? validation.scenario : null;
  const report = useMemo(
    () =>
      scenario !== null && seats !== null ? buildReport(scenario, seats) : null,
    [scenario, seats],
  );
  const changes = useMemo(
    () =>
      baseline !== null && scenario !== null && seats !== null
        ? compareScenarios(baseline.scenario, baseline.seats, scenario, seats)
        : null,
    [baseline, scenario, seats],
  );
  const historical = useMemo(
    () =>
      raw !== null && seats !== null
        ? compareHistorical2022(raw, seats, state.historicalMatches)
        : null,
    [raw, seats, state.historicalMatches],
  );
  const availability = useMemo(
    () =>
      draft !== null && raw?.inputMode === 'parties'
        ? linkedTurnoutAvailability(draft)
        : null,
    [draft, raw],
  );
  const signed = (value: string | number | null): string =>
    value === null ? t('results.empty') : formatChange(locale, `${value}`);
  const percent = (value: string | null): string =>
    value === null ? t('results.empty') : `${formatDecimal(locale, value)}%`;

  return (
    <div
      class="coalition-workspace"
      data-coalition-workspace
      data-workspace-mode={raw?.inputMode ?? 'invalid'}
    >
      <Purpose t={t} onOpenSimulator={() => store.setView('future')} />
      <IntegratedPanel store={store} t={t} run={run} />
      <section class="workspace-more" data-workspace-more>
        <h3 class="workspace-more__title">{t('panel.more')}</h3>
        <details class="workspace-disclosure" data-coalition-results>
          <summary>{t('panel.allResults')}</summary>
          {results}
        </details>
        <details
          class="workspace-disclosure"
          data-panel-advanced
          open={raw?.inputMode === 'groups'}
        >
          <summary>{t('panel.advanced')}</summary>
          {draft !== null && raw !== null && report !== null ? (
            <>
              {raw.inputMode === 'groups' ? (
                <p class="editor-section__note" data-workspace-legacy>
                  {t('workspace.legacy')}
                </p>
              ) : (
                <p class="editor-section__note">{t('workspace.assumption')}</p>
              )}
              {state.lockNotice && (
                <p class="ws-lock-hint" role="status" data-lock-hint>
                  {t('panel.minUnlocked')}
                </p>
              )}
              <div class="workspace-parties">
                {report.parties.map((row) => {
                  const party = draft.parties.find(
                    (item) => item.id === row.partyId,
                  );
                  if (party === undefined) {
                    throw new Error(`Missing editable party ${row.partyId}`);
                  }
                  const delta = changes?.parties.find(
                    (item) => item.partyId === row.partyId,
                  );
                  const historic =
                    historical?.ok === true
                      ? historical.rows.find(
                          (item) => item.currentId === row.partyId,
                        )
                      : undefined;
                  const lock = partyLockKey(row.partyId);
                  return (
                    <article
                      class="workspace-party"
                      key={row.partyId}
                      data-party-control={row.partyId}
                      data-historical-match={historic?.match ?? 'unmatched'}
                    >
                      <h3 class="workspace-party__name">
                        <span
                          class="swatch"
                          style={{ backgroundColor: row.color }}
                          aria-hidden="true"
                        />
                        <bdi>{row.name}</bdi>
                      </h3>
                      {raw.inputMode === 'parties' && (
                        <div class="workspace-party__edit">
                          <ExactRate
                            draft={draft}
                            value={party.voteShare}
                            label={t('workspace.partyShare', {
                              name: row.name,
                            })}
                            inputAttributes={{
                              'data-party-share-input': row.partyId,
                            }}
                            sliderAttributes={{
                              'data-party-share-slider': row.partyId,
                            }}
                            errorAttributes={{
                              'data-party-edit-error': row.partyId,
                            }}
                            errorId={`party-share-error-${row.partyId}`}
                            store={store}
                            t={t}
                            edit={(input, text) =>
                              editPartyShareWithAvailableBasis(
                                input,
                                row.partyId,
                                text,
                                state.locks
                                  .filter((item) => item.startsWith('party:'))
                                  .map((item) => item.slice('party:'.length)),
                              )
                            }
                          />
                          <LockButton
                            lockKey={lock}
                            locked={state.locks.includes(lock)}
                            name={row.name}
                            store={store}
                            t={t}
                          />
                        </div>
                      )}
                      <div
                        class="workspace-party__bar"
                        data-party-bar={row.partyId}
                        aria-hidden="true"
                      >
                        <span
                          style={{
                            inlineSize: `${row.voteShare ?? '0'}%`,
                            backgroundColor: row.color,
                          }}
                        />
                      </div>
                      <dl class="workspace-party__numbers">
                        <div>
                          <dt>{t('compare.column.voteShare')}</dt>
                          <dd data-party-vote-share={row.partyId}>
                            {percent(row.voteShare)}
                          </dd>
                        </div>
                        <div>
                          <dt>{t('compare.column.seats')}</dt>
                          <dd
                            data-party-seats={row.partyId}
                            data-party-seat-state={
                              report.noAllocation === null
                                ? 'ready'
                                : 'unavailable'
                            }
                          >
                            {report.noAllocation === null
                              ? formatInteger(locale, row.seats)
                              : t('results.empty')}
                          </dd>
                        </div>
                        <div>
                          <dt>{t('workspace.baselineShare')}</dt>
                          <dd data-party-baseline-change={row.partyId}>
                            {signed(delta?.voteShare.change ?? null)}
                          </dd>
                        </div>
                        <div>
                          <dt>{t('workspace.baselineSeats')}</dt>
                          <dd>{signed(delta?.seats.change ?? null)}</dd>
                        </div>
                        <div>
                          <dt>{t('history.shareChange')}</dt>
                          <dd data-party-historical-change={row.partyId}>
                            {signed(
                              historicalPercent(historic?.shareChange ?? null),
                            )}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  );
                })}
              </div>
              {raw.inputMode === 'parties' && (
                <div class="field">
                  <span class="field__label">
                    {t('workspace.overallTurnout')}
                  </span>
                  <ExactRate
                    draft={draft}
                    value={raw.rules.overallTurnout}
                    label={t('workspace.overallTurnout')}
                    inputAttributes={{ 'data-overall-turnout-input': '' }}
                    sliderAttributes={{ 'data-overall-turnout-slider': '' }}
                    errorAttributes={{ 'data-overall-turnout-error': '' }}
                    errorId="overall-turnout-error"
                    store={store}
                    t={t}
                    edit={editOverallTurnoutWithAvailableBasis}
                  />
                </div>
              )}
              <section>
                <h3 class="editor-section__title">{t('workspace.groups')}</h3>
                {draft.groups.length === 0 ? (
                  <p class="editor-section__note">{t('workspace.noGroups')}</p>
                ) : (
                  draft.groups.map((group) => {
                    const name = entityName('group', group, t);
                    return (
                      <div
                        class="field"
                        key={group.id}
                        data-workspace-group={group.id}
                      >
                        <span class="field__label">
                          <bdi>{name}</bdi>
                        </span>
                        <GroupTurnoutControl
                          draft={draft}
                          group={group}
                          availability={availability}
                          store={store}
                          t={t}
                          name={name}
                        />
                      </div>
                    );
                  })
                )}
              </section>
            </>
          ) : (
            <p class="editor-section__note">
              {t('linkedTurnout.invalid-scenario')}
            </p>
          )}
        </details>
        <button
          type="button"
          class="button"
          data-action="composition-details"
          onClick={() => store.setView('composition')}
        >
          {t('view.composition')}
        </button>
        <details class="workspace-disclosure" data-workspace-compare>
          <summary>{t('view.compare')}</summary>
          {comparison}
        </details>
        <details class="workspace-disclosure" data-workspace-history>
          <summary>{t('history.title')}</summary>
          {history}
        </details>
      </section>
    </div>
  );
}
