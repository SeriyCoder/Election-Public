import { Fragment } from 'preact';
import { evaluateCoalition } from '../engine/coalitions';
import type { SeatResult } from '../engine/run';
import type { Scenario } from '../engine/schema';
import type { Locale, Translate } from '../i18n';
import { formatInteger } from '../i18n/format';
import { chooserEntries, MAX_FUTURE_COALITIONS } from './coalitionChoice';
import type { CoalitionRun } from './coalitionRunner';

export interface FutureChooserProps {
  /** Display copy of the scenario; null while the input is invalid. */
  readonly scenario: Scenario | null;
  readonly seats: SeatResult | null;
  readonly run: CoalitionRun;
  /** The followed party sets in tick order. */
  readonly followed: readonly (readonly string[])[];
  readonly labels?: Readonly<Record<string, string>>;
  /** The party set put together on the Coalitions tab. */
  readonly selection: readonly string[];
  readonly locale: Locale;
  readonly t: Translate;
  readonly onToggle: (partyIds: readonly string[]) => void;
}

type ChooserState =
  'running' | 'ready' | 'none' | 'cancelled' | 'failed' | 'invalid';

function chooserState(run: CoalitionRun, valid: boolean): ChooserState {
  if (!valid) {
    return 'invalid';
  }
  switch (run.state) {
    case 'idle':
    case 'running':
      return 'running';
    case 'done':
      return run.analysis.minimalWinning.length === 0 ? 'none' : 'ready';
    default:
      return run.state;
  }
}

/** The left column of the demographic future view (M2-30). */
export function FutureChooser({
  scenario,
  seats,
  run,
  followed,
  labels,
  selection,
  locale,
  t,
  onToggle,
}: FutureChooserProps) {
  const valid = scenario !== null && seats !== null;
  const state = chooserState(run, valid);
  const entries =
    scenario === null || seats === null
      ? []
      : chooserEntries({
          ticked: followed,
          own: selection,
          minimal: run.state === 'done' ? run.analysis.minimalWinning : [],
          partyOrder: scenario.parties.map((party) => party.id),
        });
  const names = new Map(
    (scenario?.parties ?? []).map((party) => [party.id, party.name]),
  );
  const full = followed.length >= MAX_FUTURE_COALITIONS;

  return (
    <div class="future-chooser" data-chooser-state={state}>
      <p class="future-chooser__hint">{t('chooser.hint')}</p>
      {state === 'running' && (
        <p class="note" data-chooser-note="running">
          {t('chooser.running')}
        </p>
      )}
      {state === 'none' && (
        <p class="note" data-chooser-note="none">
          {t('chooser.none')}
        </p>
      )}
      {(state === 'cancelled' || state === 'failed') && (
        <p class="note" data-chooser-note={state}>
          {t(`coalition.${state}`)}
        </p>
      )}
      {full && (
        <p class="note" data-chooser-limit>
          {t('chooser.limit')}
        </p>
      )}
      {entries.length > 0 && scenario !== null && seats !== null && (
        <ul class="future-chooser__list">
          {entries.map((entry) => (
            <li
              key={entry.key}
              class="future-chooser__item"
              data-future-choice={entry.key}
              data-choice-source={entry.source}
            >
              <label class="future-chooser__label">
                <input
                  type="checkbox"
                  checked={entry.checked}
                  disabled={entry.disabled}
                  onChange={() => onToggle(entry.partyIds)}
                />
                <span class="future-chooser__text">
                  <span class="future-chooser__names">
                    {labels?.[entry.key] && <span>{labels[entry.key]}: </span>}
                    {entry.partyIds.map((id, index) => (
                      <Fragment key={id}>
                        {index > 0 && ' + '}
                        <bdi>{names.get(id) ?? id}</bdi>
                      </Fragment>
                    ))}
                  </span>
                  {entry.source === 'own' && (
                    <span class="future-chooser__own">{t('chooser.own')}</span>
                  )}
                  <span class="future-chooser__seats">
                    {t('chooser.seats', {
                      seats: formatInteger(
                        locale,
                        evaluateCoalition(
                          scenario,
                          seats.allocation,
                          entry.partyIds,
                        ).seats,
                      ),
                    })}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
