import { useState } from 'preact/hooks';
import {
  beginPartyComposition,
  clearPartyComposition,
  editCompositionShare,
  partyCompositionDisplay,
  type CompositionDisplayRow,
  type CompositionEditFailure,
  type CompositionEditResult,
} from '../engine/composition';
import type { Draft, DraftEntity } from '../engine/edit';
import type { ValidationResult } from '../engine/schema';
import type { Locale, Translate } from '../i18n';
import { formatDecimal } from '../i18n/format';
import { groupColorOf } from './groupColors';
import { entityName } from './names';
import type { Store } from './store';

interface Props {
  readonly draft: Draft;
  readonly party: DraftEntity;
  readonly validation: ValidationResult;
  readonly store: Store;
  readonly t: Translate;
}

interface TypedShare {
  readonly draft: Draft;
  readonly text: string;
  readonly error: CompositionEditFailure | null;
}

function CompositionShare({
  draft,
  partyId,
  group,
  row,
  color,
  locale,
  store,
  t,
}: {
  readonly draft: Draft;
  readonly partyId: string;
  readonly group: DraftEntity;
  readonly row: CompositionDisplayRow;
  readonly color: string;
  readonly locale: Locale;
  readonly store: Store;
  readonly t: Translate;
}) {
  const [typed, setTyped] = useState<TypedShare | null>(null);
  const active =
    typed !== null && (typed.error !== null || typed.draft === draft)
      ? typed
      : null;
  const groupName = entityName('group', group, t);
  const errorId = `composition-error-${partyId}-${group.id}`;
  return (
    <div class="party-composition__row">
      <label class="field">
        <span class="field__label">
          <span
            class="swatch swatch--group"
            style={{ background: color }}
            aria-hidden="true"
          />
          <bdi>{groupName}</bdi>
          {' — '}
          {formatDecimal(locale, row.roundedPercent)}%
        </span>
        <input
          class="field__input field__input--number"
          type="text"
          inputMode="decimal"
          dir="ltr"
          data-composition-group={group.id}
          aria-label={t('partyComposition.groupLabel', { name: groupName })}
          aria-invalid={active?.error !== null && active?.error !== undefined}
          aria-describedby={active?.error ? errorId : undefined}
          value={active?.text ?? row.inputPercent}
          onInput={(event) => {
            const text = event.currentTarget.value;
            const result = editCompositionShare(
              store.getState().input,
              partyId,
              group.id,
              text,
            );
            if (result.ok) {
              store.updateInput(() => result.draft);
              setTyped({ draft: result.draft, text, error: null });
            } else {
              setTyped({ draft, text, error: result.reason });
            }
          }}
          onBlur={() => {
            if (active?.error === null) {
              setTyped(null);
            }
          }}
        />
      </label>
      {active?.error && (
        <p id={errorId} class="party-composition__error" data-composition-error>
          {t(`partyComposition.error.${active.error}`)}
        </p>
      )}
    </div>
  );
}

/** Optional party-first assumptions; opening the disclosure never invents data. */
export function PartyCompositionEditor({
  draft,
  party,
  validation,
  store,
  t,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<CompositionEditFailure | null>(null);
  const locale = store.getState().language;
  const scenario =
    validation.ok && validation.scenario.inputMode === 'parties'
      ? validation.scenario
      : null;
  const display =
    scenario === null ? null : partyCompositionDisplay(scenario, party.id);
  const unknown = party.composition === null;

  function apply(result: CompositionEditResult): void {
    if (result.ok) {
      store.updateInput(() => result.draft);
      setError(null);
      setConfirming(false);
    } else {
      setError(result.reason);
    }
  }

  let start = '0';
  const slices =
    display?.map((row, index) => {
      const slice = `${groupColorOf(row.groupId, index)} ${start}% ${row.pieEnd}%`;
      start = row.pieEnd;
      return slice;
    }) ?? [];

  return (
    <details class="party-composition" data-party-composition={party.id}>
      <summary class="party-composition__summary">
        {t('partyComposition.title')}
      </summary>
      {unknown ? (
        <div data-composition-state="unknown">
          <p>{t('partyComposition.unknown')}</p>
          {draft.groups.length === 0 && (
            <p data-composition-no-groups>
              {t('partyComposition.error.no-groups')}
            </p>
          )}
          <button
            type="button"
            class="button"
            data-action="composition-begin"
            disabled={draft.groups.length === 0}
            onClick={() =>
              apply(beginPartyComposition(store.getState().input, party.id))
            }
          >
            {t('partyComposition.begin')}
          </button>
        </div>
      ) : (
        <div data-composition-state="known">
          {display === null ? (
            <p>{t('partyComposition.error.invalid-scenario')}</p>
          ) : (
            <>
              <p>{t('partyComposition.assumption')}</p>
              <p>{t('partyComposition.rule')}</p>
              <div class="party-composition__layout">
                <div
                  class="party-composition__chart"
                  data-composition-chart
                  role="img"
                  aria-label={t('partyComposition.chart')}
                  style={{ background: `conic-gradient(${slices.join(', ')})` }}
                />
                <div class="party-composition__fields">
                  {display.map((row, index) => {
                    const group = draft.groups.find(
                      (item) => item.id === row.groupId,
                    );
                    if (group === undefined) {
                      throw new Error(`Missing draft group ${row.groupId}`);
                    }
                    return (
                      <CompositionShare
                        key={row.groupId}
                        draft={draft}
                        partyId={party.id}
                        group={group}
                        row={row}
                        color={groupColorOf(row.groupId, index)}
                        locale={locale}
                        store={store}
                        t={t}
                      />
                    );
                  })}
                </div>
              </div>
              {display.some((row) => row.approximate) && (
                <p class="party-composition__note">
                  {t('partyComposition.approximate')}
                </p>
              )}
              <button
                type="button"
                class="button"
                data-action="composition-unknown-request"
                onClick={() => setConfirming(true)}
              >
                {t('partyComposition.markUnknown')}
              </button>
              {confirming && (
                <div
                  class="party-composition__confirm"
                  data-composition-confirm
                >
                  <p>{t('partyComposition.confirmUnknown')}</p>
                  <button
                    type="button"
                    class="button button--danger"
                    data-action="composition-unknown-confirm"
                    onClick={() =>
                      apply(
                        clearPartyComposition(store.getState().input, party.id),
                      )
                    }
                  >
                    {t('partyComposition.confirm')}
                  </button>
                  <button
                    type="button"
                    class="button"
                    data-action="composition-unknown-cancel"
                    onClick={() => setConfirming(false)}
                  >
                    {t('confirm.cancel')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {error !== null && (
        <p class="party-composition__error" data-composition-error>
          {t(`partyComposition.error.${error}`)}
        </p>
      )}
    </details>
  );
}
