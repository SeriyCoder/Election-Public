import { Fragment } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  addEntity,
  addPair,
  duplicateEntity,
  EditError,
  entities,
  findReferences,
  moveEntity,
  recolorEntity,
  renameEntity,
  setEntityNotes,
  repairModes,
  setPartyEligibility,
  setScenarioText,
  setGroupFraction,
  setAllowedParty,
  setVoteWeight,
  setRule,
  rebalanceShares,
  rebalanceWeights,
  setCohortTurnout,
  turnoutCohorts,
  GROUP_CHANGE_FIELDS,
  GROUP_FRACTION_FIELDS,
  isDraft,
  isStandardValidity,
  type Draft,
  type DraftEntity,
  type EntityKind,
  type PairList,
  type Repair,
  type RepairMode,
} from '../engine/edit';
import { effectiveForbiddenPairs } from '../engine/coalitions';
import { legacyFeatures } from '../engine/legacyConversion';
import {
  buildLinkedBasis,
  editLinkedGroupTurnout,
  linkedTurnoutAvailability,
  type LinkedEditFailure,
} from '../engine/linkedTurnout';
import { sumFractions, fractionToPercent } from '../engine/numeric';
import { LIMITS, type ValidationResult } from '../engine/schema';
import type { Translate } from '../i18n';
import { catalogAboutKey } from './catalog';
import { Hint } from './Hint';
import {
  editorPages,
  groupPageKey,
  resolvePage,
  type EditorPage,
} from './editorPages';
import { copyName, entityName, scenarioTitle } from './names';
import { PartyCompositionEditor } from './PartyCompositionEditor';
import { COUNT, DECIMAL, PERCENT, ValueField } from './PercentField';
import {
  shareLockKey,
  weightLockKey,
  type PendingDelete,
  type Store,
} from './store';

export interface EditorProps {
  readonly store: Store;
  readonly t: Translate;
}

type Edit = (draft: Draft) => Draft;

const KINDS: readonly EntityKind[] = ['group', 'party'];

const SECTION = { group: 'groups', party: 'parties', block: 'blocks' } as const;

const LIMIT: Readonly<Record<EntityKind, number>> = {
  group: LIMITS.groups,
  party: LIMITS.parties,
  block: LIMITS.blocks,
};

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** The shown name: the stored one, or the localized default for an empty one. */
function label(kind: EntityKind, entity: DraftEntity, t: Translate): string {
  return entityName(kind, entity, t);
}

function applyEdit(store: Store, edit: Edit): void {
  store.updateInput((current) => {
    if (!isDraft(current)) {
      return current;
    }
    try {
      return edit(current);
    } catch (error) {
      if (error instanceof EditError) {
        return current;
      }
      throw error;
    }
  });
}

function draftIds(input: unknown, kind: EntityKind): Set<string> {
  return new Set(
    isDraft(input) ? entities(input, kind).map((entity) => entity.id) : [],
  );
}

/** Applies an edit; a group it creates gets its own page opened. */
function editAndOpen(store: Store, kind: EntityKind, edit: Edit): void {
  const before = draftIds(store.getState().input, kind);
  applyEdit(store, edit);
  if (kind !== 'group') {
    return;
  }
  const after = store.getState().input;
  if (!isDraft(after)) {
    return;
  }
  const created = entities(after, kind).find(
    (entity) => !before.has(entity.id),
  );
  if (created !== undefined) {
    store.setEditorPage(groupPageKey(created.id));
  }
}

function pageTitle(page: EditorPage, draft: Draft, t: Translate): string {
  switch (page.kind) {
    case 'scenario':
      return t('editor.page.scenario');
    case 'group': {
      const group = draft.groups.find((item) => item.id === page.groupId);
      return t('editor.page.group', {
        name: group === undefined ? '' : entityName('group', group, t),
      });
    }
    case 'groups':
      return t('editor.page.groups');
    case 'parties':
      return t('editor.parties');
    case 'coalition-rules':
      return t('editor.coalitionRules');
  }
}

function Pager({
  pages,
  index,
  draft,
  store,
  t,
}: {
  readonly pages: readonly EditorPage[];
  readonly index: number;
  readonly draft: Draft;
  readonly store: Store;
  readonly t: Translate;
}) {
  const current = pages[index];
  const titleRef = useRef<HTMLParagraphElement>(null);
  const shownKey = useRef<string | null>(null);
  const key = current?.key ?? '';
  useEffect(() => {
    const previous = shownKey.current;
    shownKey.current = key;
    if (previous === null || previous === key) {
      return;
    }
    const title = titleRef.current;
    const region = title?.closest('[data-region="editor"]');
    if (region instanceof HTMLElement) {
      region.scrollTop = 0;
    }
    title?.focus({ preventScroll: true });
  }, [key]);
  if (current === undefined) {
    return null;
  }
  const open = (target: EditorPage | undefined) => {
    if (target !== undefined) {
      store.setEditorPage(target.key);
    }
  };
  return (
    <div class="editor-pager" data-editor-pager data-page={current.key}>
      <p
        class="editor-pager__title"
        data-editor-page-title
        tabIndex={-1}
        ref={titleRef}
      >
        {`${t('editor.page.of', { n: index + 1, count: pages.length })} · ${pageTitle(current, draft, t)}`}
      </p>
      <div class="editor-pager__controls">
        <div class="editor-pager__buttons">
          <button
            type="button"
            class="button"
            data-action="page-prev"
            disabled={index === 0}
            onClick={() => open(pages[index - 1])}
          >
            {t('editor.page.prev')}
          </button>
          <button
            type="button"
            class="button"
            data-action="page-next"
            disabled={index === pages.length - 1}
            onClick={() => open(pages[index + 1])}
          >
            {t('editor.page.next')}
          </button>
        </div>
        <select
          class="field__input editor-pager__select"
          data-page-select
          aria-label={t('editor.page.jump')}
          onChange={(event) => store.setEditorPage(event.currentTarget.value)}
        >
          {pages.map((page, position) => (
            <option
              key={page.key}
              value={page.key}
              selected={position === index}
            >
              {`${position + 1}. ${pageTitle(page, draft, t)}`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function IssueList({
  validation,
  t,
}: {
  readonly validation: ValidationResult;
  readonly t: Translate;
}) {
  if (validation.ok) {
    return null;
  }
  return (
    <div class="issues" data-issues="list">
      <h3 class="issues__title">{t('issues.title')}</h3>
      <ul class="issues__list">
        {validation.issues.map((issue, index) => (
          <li
            key={`${issue.path}-${issue.code}-${index}`}
            class="issues__item"
            data-code={issue.code}
            data-path={issue.path}
          >
            <span>{t(`issue.${issue.code}`)}</span>{' '}
            <code class="issues__path" dir="ltr">
              {issue.path}
            </code>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScenarioFields({
  draft,
  hidden,
  store,
  t,
}: {
  readonly draft: Draft;
  readonly hidden: boolean;
  readonly store: Store;
  readonly t: Translate;
}) {
  return (
    <section class="editor-section" data-editor="scenario" hidden={hidden}>
      <h3 class="editor-section__title">{t('editor.scenario')}</h3>
      <label class="field">
        <span class="field__label">{t('editor.scenarioName')}</span>
        <input
          class="field__input"
          type="text"
          dir="auto"
          data-field="name"
          maxLength={LIMITS.nameLength}
          placeholder={scenarioTitle({ id: draft.id, name: '' }, t)}
          value={text(draft.name)}
          onInput={(event) => {
            const value = event.currentTarget.value;
            applyEdit(store, (current) =>
              setScenarioText(current, 'name', value),
            );
          }}
        />
      </label>
      <label class="field">
        <span class="field__label">{t('editor.notes')}</span>
        <textarea
          class="field__input field__input--notes"
          dir="auto"
          rows={2}
          data-field="notes"
          value={text(draft.notes)}
          onInput={(event) => {
            const value = event.currentTarget.value;
            applyEdit(store, (current) =>
              setScenarioText(current, 'notes', value),
            );
          }}
        />
      </label>
    </section>
  );
}

/** True when the engine would refuse the rebalance, so the button is off. */
function refuses(attempt: () => Draft | null): boolean {
  try {
    return attempt() === null;
  } catch (error) {
    if (error instanceof EditError) {
      return true;
    }
    throw error;
  }
}

function hasTotalIssue(validation: ValidationResult, path: string): boolean {
  return (
    !validation.ok &&
    validation.issues.some(
      (issue) => issue.code === 'invalid-total' && issue.path === path,
    )
  );
}

function lockedIds(locks: readonly string[], prefix: string): string[] {
  return locks
    .filter((lock) => lock.startsWith(prefix))
    .map((lock) => lock.slice(prefix.length));
}

function Total({
  kind,
  values,
  invalid,
  t,
}: {
  readonly kind: 'shares' | 'weights';
  readonly values: readonly unknown[];
  readonly invalid: boolean;
  readonly t: Translate;
}) {
  const total = sumFractions(values);
  const percent = total === null ? null : fractionToPercent(total);
  const valid = percent !== null && !invalid;
  return (
    <p class="total">
      <span class="total__label">{t(`total.${kind}`)}</span>{' '}
      <span
        class={valid ? 'total__value' : 'total__value total__value--invalid'}
        dir="ltr"
        data-total={kind}
        data-valid={valid ? 'true' : 'false'}
      >
        {percent === null ? '?' : `${percent}%`}
      </span>
    </p>
  );
}

export function LockButton({
  lockKey,
  locked,
  name,
  disabled = false,
  store,
  t,
}: {
  readonly lockKey: string;
  readonly locked: boolean;
  readonly name: string;
  readonly disabled?: boolean;
  readonly store: Store;
  readonly t: Translate;
}) {
  return (
    <button
      type="button"
      class={locked ? 'lock lock--on' : 'lock'}
      data-lock={lockKey}
      aria-pressed={locked ? 'true' : 'false'}
      aria-label={t(locked ? 'lock.label.on' : 'lock.label.off', { name })}
      disabled={disabled}
      onClick={() => store.toggleLock(lockKey)}
    >
      {locked ? t('lock.on') : t('lock.off')}
    </button>
  );
}

/** A percent slider beside a number input; it writes through the same edit. */
function RateSlider({
  value,
  label: name,
  disabled = false,
  min = '0',
  max = '100',
  attributes,
  store,
  edit,
}: {
  readonly value: unknown;
  readonly label: string;
  readonly disabled?: boolean;
  /** Percent bounds of the slider only; the number field accepts the schema range. */
  readonly min?: string;
  readonly max?: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly store: Store;
  readonly edit: (current: Draft, percentText: string) => Draft;
}) {
  return (
    <input
      class="rate-slider"
      type="range"
      min={min}
      max={max}
      step="0.1"
      {...attributes}
      aria-label={name}
      disabled={disabled}
      value={fractionToPercent(value) ?? '0'}
      onInput={(event) => {
        const percentText = event.currentTarget.value;
        applyEdit(store, (current) => edit(current, percentText));
      }}
    />
  );
}

interface TypedTurnout {
  readonly draft: Draft;
  readonly text: string;
  readonly error: LinkedEditFailure | null;
}

function LinkedTurnoutField({
  draft,
  group,
  availability,
  store,
  t,
  name,
}: {
  readonly draft: Draft;
  readonly group: DraftEntity;
  readonly availability: ReturnType<typeof linkedTurnoutAvailability>;
  readonly store: Store;
  readonly t: Translate;
  readonly name?: string;
}) {
  const [typed, setTyped] = useState<TypedTurnout | null>(null);
  const active = typed?.draft === draft ? typed : null;
  const disabled = availability !== 'ready';
  const errorId = `linked-turnout-error-${group.id}`;
  const label =
    name === undefined
      ? t('group.turnout')
      : t('workspace.groupTurnout', { name });

  function apply(text: string): void {
    const result = editLinkedGroupTurnout(
      store.getState().input,
      group.id,
      text,
    );
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
        class="field__input field__input--number"
        type="text"
        inputMode="decimal"
        dir="ltr"
        data-fraction="turnout"
        aria-label={label}
        aria-invalid={active?.error !== null && active?.error !== undefined}
        aria-describedby={active?.error ? errorId : undefined}
        disabled={disabled}
        value={active?.text ?? fractionToPercent(group.turnout) ?? ''}
        onInput={(event) => apply(event.currentTarget.value)}
        onBlur={() => {
          if (active?.error === null) setTyped(null);
        }}
      />
      <input
        class="rate-slider"
        type="range"
        min="0"
        max="100"
        step="0.1"
        data-slider="turnout"
        aria-label={label}
        disabled={disabled}
        value={fractionToPercent(group.turnout) ?? '0'}
        onInput={(event) => apply(event.currentTarget.value)}
      />
      <p class="editor-section__note" data-linked-turnout={availability}>
        {t(`linkedTurnout.${availability}`)}
      </p>
      {availability === 'suspended-model' && (
        <button
          type="button"
          class="button"
          data-action="linked-rebuild"
          onClick={() => {
            const result = buildLinkedBasis(store.getState().input);
            if (result.ok) {
              store.updateInput(() => result.draft);
              setTyped(null);
            } else {
              setTyped({
                draft,
                text: fractionToPercent(group.turnout) ?? '',
                error: result.reason,
              });
            }
          }}
        >
          {t('linkedTurnout.rebuild')}
        </button>
      )}
      {active?.error && (
        <p
          id={errorId}
          class="party-composition__error"
          role="alert"
          data-linked-turnout-error
        >
          {t(`linkedTurnout.${active.error}`)}
        </p>
      )}
    </>
  );
}

export function GroupTurnoutControl({
  draft,
  group,
  availability,
  store,
  t,
  name,
}: {
  readonly draft: Draft;
  readonly group: DraftEntity;
  readonly availability: ReturnType<typeof linkedTurnoutAvailability> | null;
  readonly store: Store;
  readonly t: Translate;
  readonly name?: string;
}) {
  const label =
    name === undefined
      ? t('group.turnout')
      : t('workspace.groupTurnout', { name });
  if (draft.inputMode === 'parties' && availability !== null) {
    return (
      <LinkedTurnoutField
        draft={draft}
        group={group}
        availability={availability}
        store={store}
        t={t}
        name={name}
      />
    );
  }
  return (
    <>
      <ValueField
        value={group.turnout}
        label={label}
        attributes={{ 'data-fraction': 'turnout' }}
        onCommit={(value) =>
          applyEdit(store, (current) =>
            setGroupFraction(current, group.id, 'turnout', value),
          )
        }
      />
      <RateSlider
        value={group.turnout}
        label={label}
        attributes={{ 'data-slider': 'turnout' }}
        store={store}
        edit={(current, value) =>
          setGroupFraction(current, group.id, 'turnout', value)
        }
      />
    </>
  );
}

function RulesSection({
  draft,
  hidden,
  store,
  t,
}: {
  readonly draft: Draft;
  readonly hidden: boolean;
  readonly store: Store;
  readonly t: Translate;
}) {
  const rules: Readonly<Record<string, unknown>> =
    typeof draft.rules === 'object' &&
    draft.rules !== null &&
    !Array.isArray(draft.rules)
      ? (draft.rules as Readonly<Record<string, unknown>>)
      : {};
  const override = rules.majorityMode === 'override';
  const standardValidity =
    draft.inputMode === 'parties'
      ? isStandardValidity(rules.validBallotRate)
      : draft.groups.every((group) =>
          isStandardValidity(group.validBallotRate),
        );
  return (
    <section class="editor-section" data-editor="rules" hidden={hidden}>
      <h3 class="editor-section__title">{t('editor.rules')}</h3>
      <div class="rules">
        <label class="field">
          <span class="field__label">{t('rules.seatCount')}</span>
          <ValueField
            value={rules.seatCount}
            codec={COUNT}
            label={t('rules.seatCount')}
            attributes={{ 'data-rule': 'seatCount' }}
            onCommit={(value) =>
              applyEdit(store, (current) =>
                setRule(current, 'seatCount', value),
              )
            }
          />
        </label>
        {/* A div, not a label: a button inside a label becomes its control. */}
        <div class="field">
          <span class="field__label">
            {t('rules.populationTotal')}
            <Hint
              kind="population"
              label={t('rules.populationTotal')}
              text={t('hint.population')}
              t={t}
            />
          </span>
          <ValueField
            value={rules.populationTotal}
            codec={DECIMAL}
            label={t('rules.populationTotal')}
            attributes={{ 'data-rule': 'populationTotal' }}
            onCommit={(value) =>
              applyEdit(store, (current) =>
                setRule(current, 'populationTotal', value),
              )
            }
          />
        </div>
        <label class="field">
          <span class="field__label">{t('rules.threshold')}</span>
          <ValueField
            value={rules.threshold}
            codec={PERCENT}
            label={t('rules.threshold')}
            attributes={{ 'data-rule': 'threshold' }}
            onCommit={(value) =>
              applyEdit(store, (current) =>
                setRule(current, 'threshold', value),
              )
            }
          />
          <RateSlider
            value={rules.threshold}
            label={t('rules.threshold')}
            attributes={{ 'data-rule-slider': 'threshold' }}
            store={store}
            edit={(current, value) => setRule(current, 'threshold', value)}
          />
        </label>
        <p class="rules__note" data-rule-note="majority">
          {override
            ? t('legacy.majorityRule', {
                value:
                  typeof rules.majorityOverride === 'number'
                    ? rules.majorityOverride
                    : '?',
              })
            : t('rules.majority.fixed')}
        </p>
        {standardValidity && (
          <p class="rules__note" data-rule-note="validity">
            {t('validity.note')}
          </p>
        )}
      </div>
    </section>
  );
}

function GroupPanel({
  draft,
  group,
  index,
  locks,
  validation,
  linkedAvailability,
  store,
  t,
}: {
  readonly draft: Draft;
  readonly group: DraftEntity;
  readonly index: number;
  readonly locks: readonly string[];
  readonly validation: ValidationResult;
  readonly linkedAvailability: ReturnType<
    typeof linkedTurnoutAvailability
  > | null;
  readonly store: Store;
  readonly t: Translate;
}) {
  const allowed = Array.isArray(group.allowedPartyIds)
    ? group.allowedPartyIds.filter((id): id is string => typeof id === 'string')
    : [];
  const weights: Readonly<Record<string, unknown>> =
    typeof group.voteWeights === 'object' &&
    group.voteWeights !== null &&
    !Array.isArray(group.voteWeights)
      ? (group.voteWeights as Readonly<Record<string, unknown>>)
      : {};
  const restricted = group.votingMode === 'restricted';
  const permittedBlock =
    draft.parties.find((party) => party.id === allowed[0])?.blockId ?? null;
  const lockedParties = lockedIds(locks, `weight:${group.id}:`);
  const partyMode = draft.inputMode === 'parties';
  const refused = refuses(() =>
    rebalanceWeights(draft, group.id, lockedParties),
  );
  const shareLock = shareLockKey(group.id);
  const legacyTurnout =
    validation.ok && legacyFeatures(validation.scenario).turnoutChange;
  const name = label('group', group, t);
  const fractionFields = partyMode
    ? GROUP_FRACTION_FIELDS.filter((field) => field === 'turnout')
    : GROUP_FRACTION_FIELDS.filter(
        (field) =>
          field !== 'validBallotRate' && field !== 'participationFactor',
      );
  return (
    <div class="group-panel">
      <div class="group-panel__fractions">
        {fractionFields.map((field) => (
          <div key={field} class="field group-panel__fraction">
            <span class="field__label">
              {t(`group.${field}`)}
              {field === 'populationShare' && (
                <Hint
                  kind="populationShare"
                  label={t('group.populationShare')}
                  text={t('hint.populationShare')}
                  t={t}
                />
              )}
            </span>
            {field === 'turnout' ? (
              <GroupTurnoutControl
                draft={draft}
                group={group}
                availability={linkedAvailability}
                store={store}
                t={t}
              />
            ) : (
              <>
                <ValueField
                  value={group[field]}
                  label={t(`group.${field}`)}
                  attributes={{ 'data-fraction': field }}
                  onCommit={(value) =>
                    applyEdit(store, (current) =>
                      setGroupFraction(current, group.id, field, value),
                    )
                  }
                />
                <RateSlider
                  value={group[field]}
                  label={t(`group.${field}`)}
                  attributes={{ 'data-slider': field }}
                  store={store}
                  edit={(current, value) =>
                    setGroupFraction(current, group.id, field, value)
                  }
                />
              </>
            )}
            {field === 'populationShare' && (
              <LockButton
                lockKey={shareLock}
                locked={locks.includes(shareLock)}
                name={name}
                store={store}
                t={t}
              />
            )}
          </div>
        ))}
        {GROUP_CHANGE_FIELDS.filter((field) => field === 'growthRate').map(
          (field) => (
            <div key={field} class="field group-panel__fraction">
              <span class="field__label">{t(`group.${field}`)}</span>
              <ValueField
                value={group[field]}
                label={t(`group.${field}`)}
                attributes={{ 'data-fraction': field }}
                onCommit={(value) =>
                  applyEdit(store, (current) =>
                    setGroupFraction(current, group.id, field, value),
                  )
                }
              />
              <RateSlider
                value={group[field]}
                label={t(`group.${field}`)}
                min="-10"
                max="10"
                attributes={{ 'data-slider': field }}
                store={store}
                edit={(current, value) =>
                  setGroupFraction(current, group.id, field, value)
                }
              />
            </div>
          ),
        )}
      </div>
      {legacyTurnout && (
        <p class="editor-section__note" data-legacy-turnout-change>
          {t('legacy.turnoutChangeActive')}
        </p>
      )}
      <p
        class="editor-section__note"
        data-note={partyMode ? 'party-mode-group' : 'group-picture'}
      >
        {t(partyMode ? 'editor.partyModeGroupNote' : 'editor.groupPicture')}
      </p>
      {!partyMode && (
        <>
          {restricted && (
            <p class="editor-section__note" data-legacy-restricted-note>
              {t('legacy.restricted')}
            </p>
          )}
          <div
            class="destinations"
            role="group"
            aria-label={t('group.destinations')}
          >
            {draft.parties.map((party) => {
              const isAllowed = allowed.includes(party.id);
              const lockKey = weightLockKey(group.id, party.id);
              const partyName = label('party', party, t);
              return (
                <div
                  key={party.id}
                  class="destination"
                  data-destination={party.id}
                >
                  <label class="entity__check destination__party">
                    <input
                      type="checkbox"
                      data-allowed={party.id}
                      checked={isAllowed}
                      disabled={
                        restricted &&
                        ((isAllowed && allowed.length === 1) ||
                          (!isAllowed &&
                            allowed.length > 0 &&
                            (party.blockId ?? null) !== permittedBlock))
                      }
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        applyEdit(store, (current) =>
                          setAllowedParty(current, group.id, party.id, checked),
                        );
                      }}
                    />
                    <span>{partyName}</span>
                  </label>
                  <ValueField
                    value={isAllowed ? weights[party.id] : null}
                    label={t('group.weight', { name: partyName })}
                    disabled={!isAllowed}
                    attributes={{ 'data-weight': party.id }}
                    onCommit={(value) =>
                      applyEdit(store, (current) =>
                        setVoteWeight(current, group.id, party.id, value),
                      )
                    }
                  />
                  <RateSlider
                    value={isAllowed ? weights[party.id] : null}
                    label={t('group.weight', { name: partyName })}
                    disabled={!isAllowed}
                    attributes={{ 'data-weight-slider': party.id }}
                    store={store}
                    edit={(current, value) =>
                      setVoteWeight(current, group.id, party.id, value)
                    }
                  />
                  <LockButton
                    lockKey={lockKey}
                    locked={locks.includes(lockKey)}
                    name={partyName}
                    disabled={!isAllowed}
                    store={store}
                    t={t}
                  />
                </div>
              );
            })}
          </div>
          <Total
            kind="weights"
            values={allowed.map((id) => (id in weights ? weights[id] : '0'))}
            invalid={hasTotalIssue(validation, `groups[${index}].voteWeights`)}
            t={t}
          />
          <button
            type="button"
            class="button"
            data-action="rebalance-weights"
            disabled={refused}
            onClick={() => store.rebalanceWeights(group.id)}
          >
            {t('rebalance.weights')}
          </button>
          {refused && (
            <p class="editor-section__note">{t('rebalance.refused')}</p>
          )}
        </>
      )}
    </div>
  );
}

function PartyFields({
  party,
  store,
  t,
}: {
  readonly party: DraftEntity;
  readonly store: Store;
  readonly t: Translate;
}) {
  return (
    <>
      <label class="entity__check">
        <input
          type="checkbox"
          data-field="canJoinGovernment"
          checked={party.canJoinGovernment === true}
          onChange={(event) => {
            const checked = event.currentTarget.checked;
            applyEdit(store, (current) =>
              setPartyEligibility(current, party.id, checked),
            );
          }}
        />
        <span>{t('editor.canJoinGovernment')}</span>
      </label>
    </>
  );
}

/** Optional entity notes, collapsed; the summary says in words whether any exist. */
function EntityNotes({
  kind,
  entity,
  store,
  t,
}: {
  readonly kind: EntityKind;
  readonly entity: DraftEntity;
  readonly store: Store;
  readonly t: Translate;
}) {
  const notes = text(entity.notes);
  return (
    <details class="entity__notes" data-notes>
      <summary class="entity__notes-summary">
        {notes === '' ? t('editor.notes') : t('entity.notes.filled')}
      </summary>
      <textarea
        class="field__input field__input--notes"
        dir="auto"
        rows={3}
        data-field="notes"
        maxLength={LIMITS.notesLength}
        aria-label={t('entity.notes.label', { name: label(kind, entity, t) })}
        value={notes}
        onInput={(event) => {
          const value = event.currentTarget.value;
          applyEdit(store, (current) =>
            setEntityNotes(current, kind, entity.id, value),
          );
        }}
      />
    </details>
  );
}

function CohortList({
  list,
  ids,
  groups,
  t,
}: {
  readonly list: 'dedicated' | 'shared';
  readonly ids: readonly string[];
  readonly groups: readonly DraftEntity[];
  readonly t: Translate;
}) {
  return (
    <div class="turnout__cohorts" role="list" data-cohorts={list}>
      {ids.map((id) => {
        const group = groups.find((item) => item.id === id);
        const percent = fractionToPercent(group?.turnout);
        return (
          <div
            key={id}
            class="turnout__cohort"
            role="listitem"
            data-cohort={id}
          >
            <bdi>{label('group', group ?? { id }, t)}</bdi>{' '}
            <span class="turnout__value" dir="ltr">
              {percent === null ? '?' : `${percent}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Section 5 shortcut: one dedicated group's own turnout, or one explicit
 * turnout for every group that votes only here; shared groups are listed only.
 */
function TurnoutShortcut({
  draft,
  kind,
  entity,
  store,
  t,
}: {
  readonly draft: Draft;
  readonly kind: 'party' | 'block';
  readonly entity: DraftEntity;
  readonly store: Store;
  readonly t: Translate;
}) {
  const [bulk, setBulk] = useState('');
  const { dedicated, shared } = turnoutCohorts(draft, kind, entity.id);
  const groups = entities(draft, 'group');
  const single =
    dedicated.length === 1 && shared.length === 0
      ? groups.find((group) => group.id === dedicated[0])
      : undefined;
  return (
    <details class="entity__turnout" data-turnout={kind}>
      <summary class="entity__turnout-summary">{t('turnout.shortcut')}</summary>
      {single !== undefined && (
        <div class="field turnout__field">
          <span class="field__label">
            <bdi>{label('group', single, t)}</bdi>, %
          </span>
          <ValueField
            value={single.turnout}
            label={t('turnout.of', { name: label('group', single, t) })}
            attributes={{ 'data-turnout-field': single.id }}
            onCommit={(value) =>
              applyEdit(store, (current) =>
                setGroupFraction(current, single.id, 'turnout', value),
              )
            }
          />
          <RateSlider
            value={single.turnout}
            label={t('turnout.of', { name: label('group', single, t) })}
            attributes={{ 'data-turnout-slider': single.id }}
            store={store}
            edit={(current, value) =>
              setGroupFraction(current, single.id, 'turnout', value)
            }
          />
        </div>
      )}
      {single === undefined && dedicated.length > 0 && (
        <>
          <p class="turnout__caption">{t('turnout.changes')}</p>
          <CohortList list="dedicated" ids={dedicated} groups={groups} t={t} />
          <div class="turnout__bulk">
            <label class="field turnout__field">
              <span class="field__label">{t('turnout.value')}</span>
              <input
                class="field__input field__input--number"
                type="text"
                inputMode="decimal"
                dir="ltr"
                data-turnout-bulk={entity.id}
                aria-label={t('turnout.value')}
                value={bulk}
                onInput={(event) => setBulk(event.currentTarget.value)}
              />
            </label>
            <button
              type="button"
              class="button"
              data-action="set-cohort-turnout"
              disabled={refuses(() => setCohortTurnout(draft, dedicated, bulk))}
              onClick={() => store.setCohortTurnout(kind, entity.id, bulk)}
            >
              {t('turnout.apply')}
            </button>
          </div>
        </>
      )}
      {shared.length > 0 && (
        <>
          <p class="turnout__caption">
            {t(
              kind === 'party' ? 'turnout.sharedParty' : 'turnout.sharedBlock',
            )}
          </p>
          <CohortList list="shared" ids={shared} groups={groups} t={t} />
        </>
      )}
      {dedicated.length === 0 && shared.length === 0 && (
        <p class="turnout__caption" data-empty="turnout">
          {t(kind === 'party' ? 'turnout.noneParty' : 'turnout.noneBlock')}
        </p>
      )}
    </details>
  );
}

function EntityRow({
  draft,
  kind,
  entity,
  index,
  count,
  hidden,
  locks,
  validation,
  linkedAvailability,
  store,
  t,
}: {
  readonly draft: Draft;
  readonly kind: EntityKind;
  readonly entity: DraftEntity;
  readonly index: number;
  readonly count: number;
  readonly hidden: boolean;
  readonly locks: readonly string[];
  readonly validation: ValidationResult;
  readonly linkedAvailability: ReturnType<
    typeof linkedTurnoutAvailability
  > | null;
  readonly store: Store;
  readonly t: Translate;
}) {
  const name = label(kind, entity, t);
  const full = count >= LIMIT[kind];
  const about = /\S/.test(text(entity.name))
    ? null
    : catalogAboutKey(kind, entity.id);
  return (
    <li class="entity" data-entity={kind} data-id={entity.id} hidden={hidden}>
      {kind !== 'group' && (
        <input
          class="entity__color"
          type="color"
          data-field="color"
          aria-label={t('editor.color')}
          value={text(entity.color)}
          onInput={(event) => {
            const value = event.currentTarget.value;
            applyEdit(store, (current) =>
              recolorEntity(current, kind, entity.id, value),
            );
          }}
        />
      )}
      <input
        class="entity__name"
        type="text"
        dir="auto"
        data-field="name"
        aria-label={t('editor.name')}
        maxLength={LIMITS.nameLength}
        placeholder={label(kind, { id: entity.id }, t)}
        value={text(entity.name)}
        onInput={(event) => {
          const value = event.currentTarget.value;
          applyEdit(store, (current) =>
            renameEntity(current, kind, entity.id, value),
          );
        }}
      />
      {about !== null && (
        <p class="entity__catalog" data-catalog-about={entity.id}>
          {t('catalog.line', { about: t(about) })}
        </p>
      )}
      {kind === 'party' && <PartyFields party={entity} store={store} t={t} />}
      <div class="entity__actions">
        <button
          type="button"
          class="button"
          data-action="move-up"
          aria-label={t('action.moveUp.label', { name })}
          disabled={index === 0}
          onClick={() =>
            applyEdit(store, (current) =>
              moveEntity(current, kind, entity.id, -1),
            )
          }
        >
          {t('action.moveUp')}
        </button>
        <button
          type="button"
          class="button"
          data-action="move-down"
          aria-label={t('action.moveDown.label', { name })}
          disabled={index === count - 1}
          onClick={() =>
            applyEdit(store, (current) =>
              moveEntity(current, kind, entity.id, 1),
            )
          }
        >
          {t('action.moveDown')}
        </button>
        <button
          type="button"
          class="button"
          data-action="duplicate"
          aria-label={t('action.duplicate.label', { name })}
          disabled={full}
          onClick={() =>
            editAndOpen(store, kind, (current) =>
              duplicateEntity(
                current,
                kind,
                entity.id,
                copyName(
                  entity.name,
                  entities(current, kind).map((item) => item.name),
                ),
              ),
            )
          }
        >
          {t('action.duplicate')}
        </button>
        <button
          type="button"
          class="button button--danger"
          data-action="delete"
          aria-label={t('action.delete.label', { name })}
          onClick={() => store.requestDelete(kind, entity.id)}
        >
          {t('action.delete')}
        </button>
      </div>
      <EntityNotes kind={kind} entity={entity} store={store} t={t} />
      {kind === 'party' && draft.inputMode === 'parties' && (
        <PartyCompositionEditor
          draft={draft}
          party={entity}
          validation={validation}
          store={store}
          t={t}
        />
      )}
      {kind !== 'group' && draft.inputMode !== 'parties' && (
        <TurnoutShortcut
          draft={draft}
          kind={kind}
          entity={entity}
          store={store}
          t={t}
        />
      )}
      {kind === 'group' && (
        <GroupPanel
          draft={draft}
          group={entity}
          index={index}
          locks={locks}
          validation={validation}
          linkedAvailability={linkedAvailability}
          store={store}
          t={t}
        />
      )}
    </li>
  );
}

function referenceCounts(
  draft: Draft,
  pending: PendingDelete,
): Readonly<
  Record<
    | 'group'
    | 'party'
    | 'pair'
    | 'composition'
    | 'share'
    | 'model-population'
    | 'model-group-preference'
    | 'model-preference',
    number
  >
> {
  const counts = {
    group: 0,
    party: 0,
    pair: 0,
    composition: 0,
    share: 0,
    'model-population': 0,
    'model-group-preference': 0,
    'model-preference': 0,
  };
  for (const reference of findReferences(draft, pending.kind, pending.id)) {
    counts[reference.kind] += 1;
  }
  return counts;
}

function DeleteConfirmation({
  draft,
  pending,
  store,
  t,
}: {
  readonly draft: Draft;
  readonly pending: PendingDelete;
  readonly store: Store;
  readonly t: Translate;
}) {
  const subject = entities(draft, pending.kind).find(
    (entity) => entity.id === pending.id,
  );
  const targets = entities(draft, pending.kind).filter(
    (entity) => entity.id !== pending.id,
  );
  const counts = referenceCounts(draft, pending);
  const protectedReference =
    counts.composition > 0 ||
    counts.share > 0 ||
    counts['model-population'] > 0 ||
    counts['model-group-preference'] > 0 ||
    counts['model-preference'] > 0;
  const partyModeParty =
    draft.inputMode === 'parties' && pending.kind === 'party';
  const modes = protectedReference
    ? []
    : repairModes(pending.kind).filter(
        (mode) =>
          (mode !== 'reassign' || targets.length > 0) &&
          (!partyModeParty || mode === 'remove'),
      );
  const [mode, setMode] = useState<RepairMode | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialog.current
      ?.querySelector<HTMLElement>('input:checked, button')
      ?.focus();
  }, []);
  if (subject === undefined) {
    return null;
  }
  const chosenMode = mode !== null && modes.includes(mode) ? mode : modes[0];
  const chosenTarget = targetId ?? targets[0]?.id ?? '';
  const titleId = `confirm-${pending.kind}-${pending.id}`;

  function confirm(): void {
    if (chosenMode === undefined) {
      return;
    }
    const repair: Repair =
      chosenMode === 'reassign'
        ? { mode: 'reassign', targetId: chosenTarget }
        : { mode: chosenMode };
    const section = dialog.current?.closest('.editor-section');
    const done = store.confirmDelete(repair);
    setFailed(!done);
    if (done) {
      // The row is gone; after the re-render the section's add button is the nearest stable control.
      requestAnimationFrame(() =>
        section
          ?.querySelector<HTMLElement>('[data-action="add"]:not(:disabled)')
          ?.focus(),
      );
    }
  }

  function cancel(): void {
    store.cancelDelete();
    document
      .querySelector<HTMLElement>(
        `[data-entity="${pending.kind}"][data-id="${pending.id}"] [data-action="delete"]`,
      )
      ?.focus();
  }

  return (
    <div
      class="confirm"
      ref={dialog}
      role="alertdialog"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          cancel();
        }
      }}
      data-confirm={pending.kind}
      data-id={pending.id}
    >
      <p class="confirm__title" id={titleId}>
        {t('confirm.title', { name: label(pending.kind, subject, t) })}
      </p>
      <ul class="confirm__references">
        {counts.group > 0 && (
          <li>{t('confirm.references.group', { count: counts.group })}</li>
        )}
        {counts.party > 0 && (
          <li>{t('confirm.references.party', { count: counts.party })}</li>
        )}
        {counts.pair > 0 && (
          <li>{t('confirm.references.pair', { count: counts.pair })}</li>
        )}
        {counts.composition > 0 && (
          <li>
            {t('confirm.references.composition', {
              count: counts.composition,
            })}
          </li>
        )}
        {counts.share > 0 && <li>{t('confirm.references.share')}</li>}
        {counts['model-population'] > 0 && (
          <li>{t('confirm.references.model-population')}</li>
        )}
        {counts['model-group-preference'] > 0 && (
          <li>{t('confirm.references.model-group-preference')}</li>
        )}
        {counts['model-preference'] > 0 && (
          <li>{t('confirm.references.model-preference')}</li>
        )}
      </ul>
      {modes.length > 0 && (
        <fieldset class="confirm__repairs">
          {modes.map((repairMode) => (
            <label key={repairMode} class="confirm__repair">
              <input
                type="radio"
                name={`repair-${pending.kind}`}
                value={repairMode}
                data-repair={repairMode}
                checked={repairMode === chosenMode}
                onChange={() => setMode(repairMode)}
              />
              <span>{t(`confirm.repair.${repairMode}`)}</span>
            </label>
          ))}
        </fieldset>
      )}
      {modes.includes('reassign') && (
        <label class="field">
          <span class="field__label">{t('confirm.target')}</span>
          <select
            class="field__input"
            data-field="target"
            disabled={chosenMode !== 'reassign'}
            onChange={(event) => setTargetId(event.currentTarget.value)}
          >
            {targets.map((target) => (
              <option
                key={target.id}
                value={target.id}
                data-target={target.id}
                selected={target.id === chosenTarget}
              >
                {label(pending.kind, target, t)}
              </option>
            ))}
          </select>
        </label>
      )}
      {failed && (
        <p class="confirm__error" role="alert">
          {t('confirm.failed')}
        </p>
      )}
      <div class="confirm__actions">
        <button
          type="button"
          class="button button--danger"
          data-action="confirm"
          disabled={chosenMode === undefined}
          onClick={confirm}
        >
          {t('confirm.confirm')}
        </button>
        <button
          type="button"
          class="button"
          data-action="cancel"
          onClick={cancel}
        >
          {t('confirm.cancel')}
        </button>
      </div>
    </div>
  );
}

function ShareTotal({
  draft,
  locks,
  validation,
  store,
  t,
}: {
  readonly draft: Draft;
  readonly locks: readonly string[];
  readonly validation: ValidationResult;
  readonly store: Store;
  readonly t: Translate;
}) {
  const refused = refuses(() =>
    rebalanceShares(draft, lockedIds(locks, 'share:')),
  );
  return (
    <div class="share-total">
      <Total
        kind="shares"
        values={draft.groups.map((group) => group.populationShare)}
        invalid={hasTotalIssue(validation, 'groups')}
        t={t}
      />
      <button
        type="button"
        class="button"
        data-action="rebalance-shares"
        disabled={refused}
        onClick={() => store.rebalanceShares()}
      >
        {t('rebalance.shares')}
      </button>
      {refused && <p class="editor-section__note">{t('rebalance.refused')}</p>}
    </div>
  );
}

function EntitySection({
  draft,
  kind,
  hidden,
  shownGroup,
  pending,
  locks,
  validation,
  linkedAvailability,
  store,
  t,
}: {
  readonly draft: Draft;
  readonly kind: EntityKind;
  readonly hidden: boolean;
  /** On a group page, the only group row shown. */
  readonly shownGroup: string | null;
  readonly pending: PendingDelete | null;
  readonly locks: readonly string[];
  readonly validation: ValidationResult;
  readonly linkedAvailability: ReturnType<
    typeof linkedTurnoutAvailability
  > | null;
  readonly store: Store;
  readonly t: Translate;
}) {
  const list = entities(draft, kind);
  const full = list.length >= LIMIT[kind];
  return (
    <section class="editor-section" data-editor={SECTION[kind]} hidden={hidden}>
      <h3 class="editor-section__title">{t(`editor.${SECTION[kind]}`)}</h3>
      <ul class="entities">
        {list.map((entity, index) => (
          <EntityRow
            key={entity.id}
            draft={draft}
            kind={kind}
            entity={entity}
            index={index}
            count={list.length}
            hidden={kind === 'group' && entity.id !== shownGroup}
            locks={locks}
            validation={validation}
            linkedAvailability={linkedAvailability}
            store={store}
            t={t}
          />
        ))}
      </ul>
      {kind === 'group' && (
        <ShareTotal
          draft={draft}
          locks={locks}
          validation={validation}
          store={store}
          t={t}
        />
      )}
      {pending !== null && pending.kind === kind && (
        <DeleteConfirmation
          key={`${pending.kind}-${pending.id}`}
          draft={draft}
          pending={pending}
          store={store}
          t={t}
        />
      )}
      <button
        type="button"
        class="button button--add"
        data-action="add"
        data-kind={kind}
        disabled={full}
        onClick={() =>
          editAndOpen(store, kind, (current) => addEntity(current, kind, ''))
        }
      >
        {t(`editor.add.${kind}`)}
      </button>
      {full && (
        <p class="editor-section__note">
          {t('editor.limit', { count: LIMIT[kind] })}
        </p>
      )}
    </section>
  );
}

const PAIR_KIND: Readonly<Record<PairList, EntityKind>> = {
  incompatiblePartyPairs: 'party',
  incompatibleBlockPairs: 'block',
  compatiblePartyOverrides: 'party',
  partyRefusals: 'party',
};

interface IndexedPair {
  readonly first: string;
  readonly second: string;
  /** Position in the persisted list, which removal refers to. */
  readonly index: number;
}

function pairsIn(draft: Draft, list: PairList): IndexedPair[] {
  const value = draft.coalitionRules[list];
  if (!Array.isArray(value)) {
    return [];
  }
  const found: IndexedPair[] = [];
  value.forEach((pair: unknown, index) => {
    if (
      Array.isArray(pair) &&
      pair.length === 2 &&
      typeof pair[0] === 'string' &&
      typeof pair[1] === 'string'
    ) {
      found.push({ first: pair[0], second: pair[1], index });
    }
  });
  return found;
}

function nameIn(
  draft: Draft,
  kind: EntityKind,
  id: string,
  t: Translate,
): string {
  const entity = entities(draft, kind).find((item) => item.id === id);
  return label(kind, entity ?? { id }, t);
}

function PairSelect({
  which,
  kind,
  options,
  value,
  onChange,
  directed,
  t,
}: {
  readonly which: 'first' | 'second';
  readonly kind: EntityKind;
  readonly options: readonly DraftEntity[];
  readonly value: string;
  readonly onChange: (id: string) => void;
  /** A refusal list names the refuser first and the refused party second. */
  readonly directed: boolean;
  readonly t: Translate;
}) {
  const role = directed
    ? { first: 'refuser', second: 'refused' }[which]
    : which;
  return (
    <select
      class="pair-add__select"
      data-pair-select={which}
      aria-label={t(`pairs.${role}`)}
      onChange={(event) => onChange(event.currentTarget.value)}
    >
      {options.map((entity) => (
        <option
          key={entity.id}
          value={entity.id}
          selected={entity.id === value}
        >
          {label(kind, entity, t)}
        </option>
      ))}
    </select>
  );
}

function PairListEditor({
  draft,
  list,
  addable,
  store,
  t,
}: {
  readonly draft: Draft;
  readonly list: PairList;
  readonly addable: boolean;
  readonly store: Store;
  readonly t: Translate;
}) {
  const kind = PAIR_KIND[list];
  const directed = list === 'partyRefusals';
  const options = entities(draft, kind);
  const [first, setFirst] = useState<string | null>(null);
  const [second, setSecond] = useState<string | null>(null);
  const exists = (id: string | null): id is string =>
    id !== null && options.some((entity) => entity.id === id);
  const chosenFirst = exists(first) ? first : (options[0]?.id ?? '');
  const chosenSecond = exists(second) ? second : (options[1]?.id ?? '');
  const items = pairsIn(draft, list);
  const unavailable =
    options.length < 2 ||
    refuses(() => addPair(draft, list, chosenFirst, chosenSecond));
  return (
    <div class="pair-list" data-pair-list={list}>
      <h4 class="pair-list__title">{t(`pairs.${list}`)}</h4>
      {items.length === 0 ? (
        <p class="pair-list__empty" data-empty={list}>
          {t('pairs.empty')}
        </p>
      ) : (
        <ul class="pairs">
          {items.map((item) => (
            <li
              key={item.index}
              class="pairs__item"
              data-pair={`${item.first}|${item.second}`}
            >
              <span class="pairs__names">
                <bdi>{nameIn(draft, kind, item.first, t)}</bdi>
                {' – '}
                <bdi>{nameIn(draft, kind, item.second, t)}</bdi>
              </span>
              <button
                type="button"
                class="button button--small"
                data-action="remove-pair"
                onClick={() => store.removePair(list, item.index)}
              >
                {t(directed ? 'pairs.removeRefusal' : 'pairs.remove', {
                  first: nameIn(draft, kind, item.first, t),
                  second: nameIn(draft, kind, item.second, t),
                })}
              </button>
            </li>
          ))}
        </ul>
      )}
      {addable && (
        <p class="pair-add">
          <PairSelect
            which="first"
            kind={kind}
            options={options}
            value={chosenFirst}
            onChange={setFirst}
            directed={directed}
            t={t}
          />
          <PairSelect
            which="second"
            kind={kind}
            options={options}
            value={chosenSecond}
            onChange={setSecond}
            directed={directed}
            t={t}
          />
          <button
            type="button"
            class="button"
            data-action="add-pair"
            disabled={unavailable}
            onClick={() => store.addPair(list, chosenFirst, chosenSecond)}
          >
            {t(directed ? 'pairs.addRefusal' : 'pairs.add')}
          </button>
        </p>
      )}
      {addable && unavailable && (
        <p class="editor-section__note" data-pair-unavailable>
          {t('pairs.unavailable')}
        </p>
      )}
    </div>
  );
}

function EffectivePairs({
  draft,
  validation,
  t,
}: {
  readonly draft: Draft;
  readonly validation: ValidationResult;
  readonly t: Translate;
}) {
  if (!validation.ok) {
    return null;
  }
  const pairs = effectiveForbiddenPairs(validation.scenario);
  return (
    <div class="pair-list">
      <h4 class="pair-list__title">{t('pairs.effective')}</h4>
      {pairs.length === 0 ? (
        <p class="pair-list__empty">{t('pairs.empty')}</p>
      ) : (
        <ul class="pairs" data-list="effective-pairs">
          {pairs.map(({ partyIds: [first, second], source, refusedBy }) => {
            const names = {
              first: nameIn(draft, 'party', first, t),
              second: nameIn(draft, 'party', second, t),
            };
            const refused = refusedBy.length > 0;
            return (
              <li
                key={`${first}|${second}`}
                class="pairs__item"
                data-effective={`${first}|${second}`}
                data-source={source}
                data-refused-by={refused ? refusedBy.join(' ') : undefined}
              >
                <span class="pairs__names">
                  <bdi>{names.first}</bdi>
                  {' – '}
                  <bdi>{names.second}</bdi>
                  {refused && (
                    <>
                      {' ('}
                      {t('coalition.source.refusal')}:{' '}
                      {refusedBy.map((id, at) => (
                        <Fragment key={id}>
                          {at > 0 && ', '}
                          <bdi>{nameIn(draft, 'party', id, t)}</bdi>
                        </Fragment>
                      ))}
                      {')'}
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CoalitionRulesSection({
  draft,
  hidden,
  validation,
  store,
  t,
}: {
  readonly draft: Draft;
  readonly hidden: boolean;
  readonly validation: ValidationResult;
  readonly store: Store;
  readonly t: Translate;
}) {
  return (
    <section
      class="editor-section"
      data-editor="coalition-rules"
      hidden={hidden}
    >
      <h3 class="editor-section__title">{t('editor.coalitionRules')}</h3>
      <PairListEditor
        draft={draft}
        list="incompatiblePartyPairs"
        addable
        store={store}
        t={t}
      />
      <PairListEditor
        draft={draft}
        list="partyRefusals"
        addable
        store={store}
        t={t}
      />
      <EffectivePairs draft={draft} validation={validation} t={t} />
    </section>
  );
}

export function Editor({ store, t }: EditorProps) {
  const state = store.getState();
  const { validation } = store.getDerived();
  const input = state.input;
  const linkedAvailability = useMemo(
    () =>
      isDraft(input) && input.inputMode === 'parties'
        ? linkedTurnoutAvailability(input)
        : null,
    [input],
  );
  if (!isDraft(input)) {
    return (
      <div class="editor">
        <p class="editor__message" data-editor-state="not-editable">
          {t('editor.notEditable')}
        </p>
        <IssueList validation={validation} t={t} />
      </div>
    );
  }
  const pages = editorPages(input);
  const index = resolvePage(pages, state.editorPage);
  const current = pages[index];
  const kind = current?.kind ?? 'scenario';
  const shownKind: Readonly<Record<EntityKind, boolean>> = {
    group: kind === 'group' || kind === 'groups',
    party: kind === 'parties',
    block: false,
  };
  return (
    <div class="editor">
      <IssueList validation={validation} t={t} />
      <Pager pages={pages} index={index} draft={input} store={store} t={t} />
      <ScenarioFields
        draft={input}
        hidden={kind !== 'scenario'}
        store={store}
        t={t}
      />
      <RulesSection
        draft={input}
        hidden={kind !== 'scenario'}
        store={store}
        t={t}
      />
      {KINDS.map((entityKind) => (
        <EntitySection
          key={entityKind}
          draft={input}
          kind={entityKind}
          hidden={!shownKind[entityKind]}
          shownGroup={current?.groupId ?? null}
          pending={state.pendingDelete}
          locks={state.locks}
          validation={validation}
          linkedAvailability={linkedAvailability}
          store={store}
          t={t}
        />
      ))}
      <CoalitionRulesSection
        draft={input}
        hidden={kind !== 'coalition-rules'}
        validation={validation}
        store={store}
        t={t}
      />
    </div>
  );
}
