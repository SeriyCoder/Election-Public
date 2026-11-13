import { useEffect, useRef, useState } from 'preact/hooks';
import { coalitionTileReport } from '../engine/coalitionVariants';
import type { SeatResult } from '../engine/run';
import type { Scenario } from '../engine/schema';
import type { Translate } from '../i18n';
import { coalitionKey } from './coalitionChoice';
import { entityName } from './names';
import { PanelModal } from './PanelControls';
import type { Store } from './store';
import type { CoalitionRun } from './coalitionRunner';
import { replaceCustomTile, useTileSets } from './tileSets';

export function CoalitionTiles({
  store,
  scenario,
  result,
  t,
  run,
}: {
  readonly store: Store;
  readonly scenario: Scenario;
  readonly result: SeatResult;
  readonly t: Translate;
  readonly run?: CoalitionRun;
}) {
  const session = store.getState().panel;
  const { candidates, entries, nearest, tiles, shown, options, existing } =
    useTileSets(store, scenario, result, run);
  const [detail, setDetail] = useState<string | null>(null);
  const [custom, setCustom] = useState<readonly string[] | null>(null);
  const [customSlot, setCustomSlot] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const lastCount = useRef(candidates.total);
  const [countChange, setCountChange] = useState<readonly number[] | null>(
    null,
  );
  useEffect(() => {
    if (candidates.complete && lastCount.current !== candidates.total) {
      setCountChange([lastCount.current, candidates.total]);
      lastCount.current = candidates.total;
    }
  }, [candidates]);
  const name = (id: string) =>
    entityName(
      'party',
      scenario.parties.find((party) => party.id === id)!,
      t,
    );
  const detailEntry = entries.find((entry) => entry.key === detail);
  const match =
    custom?.length && editing === null ? existing(custom) : undefined;
  const matchShown = match !== undefined && tiles.includes(match.key);
  const report = detailEntry
    ? coalitionTileReport(scenario, result.allocation, detailEntry.partyIds)
    : null;
  return (
    <div data-coalition-tiles class="ws-tiles-box">
      <header class="ws-head">
        <h3>{t('panel.tiles')}</h3>
        <label class="ws-check">
          <input
            type="checkbox"
            checked={session.favouritesOnly}
            onChange={(event) =>
              store.setPanelSession({
                favouritesOnly: event.currentTarget.checked,
              })
            }
          />
          {t('panel.favourites')}
        </label>
        <button
          type="button"
          class="ws-button"
          data-action="tiles-nearest"
          onClick={() => store.setPanelSession({ tiles: nearest })}
        >
          {t('panel.nearest')}
        </button>
        {tiles.length < 4 && (
          <button
            type="button"
            class="ws-button"
            onClick={() => {
              setCustomSlot(null);
              setCustom([]);
            }}
          >
            {t('panel.custom')}
          </button>
        )}
        {tiles.length < 4 && (
          <button
            type="button"
            class="ws-button"
            data-action="tile-add"
            onClick={() => {
              const key = candidates.variants
                .map((v) => coalitionKey(v.partyIds))
                .find((candidate) => !tiles.includes(candidate));
              if (key) store.setPanelSession({ tiles: [...tiles, key] });
            }}
          >
            {t('panel.add')}
          </button>
        )}
      </header>
      <p class="ws-hint">
        {t('panel.variantCount', { count: candidates.total })}
        {countChange &&
          ` (${t('panel.variantChange', { before: countChange[0]!, after: countChange[1]! })})`}
        {(!candidates.complete ||
          candidates.total > candidates.variants.length) &&
          ` — ${t('panel.incomplete')}`}
      </p>
      <div class="ws-tiles-lead" data-tiles-lead>
        <p class="ws-tiles-hint">{t('panel.tilesHint')}</p>
        <button
          type="button"
          class="button button--cta"
          data-action="open-simulator"
          onClick={() => store.setView('future')}
        >
          {t('panel.openSimulator')}
        </button>
      </div>
      <ul class="ws-seat-legend">
        {scenario.parties
          .filter((party) =>
            result.allocation.parties.some(
              (row) => row.partyId === party.id && row.seats > 0,
            ),
          )
          .map((party) => (
            <li key={party.id} style={{ '--color': party.color }}>
              <i class="ws-dot" aria-hidden="true" />
              <bdi>{name(party.id)}</bdi>{' '}
              {
                result.allocation.parties.find(
                  (row) => row.partyId === party.id,
                )!.seats
              }
            </li>
          ))}
      </ul>
      <div class="ws-tiles" data-tile-count={shown.length}>
        {shown.map((entry) => {
          const value = coalitionTileReport(
            scenario,
            result.allocation,
            entry.partyIds,
          );
          const none = result.allocation.noAllocation !== null;
          return (
            <article
              key={entry.key}
              class="ws-tile"
              data-coalition-tile={entry.key}
              data-winning={value.reachesMajority}
              style={
                !value.reachesMajority
                  ? {
                      background: `color-mix(in srgb, #f4b4b4 ${value.shortfall}%, #fff1f1)`,
                    }
                  : {}
              }
            >
              <div class="ws-tile-head">
                <span class="ws-tile-badge">{entry.label}</span>
                <select
                  aria-label={t('panel.tiles')}
                  value={entry.key}
                  onChange={(event) => {
                    const key = event.currentTarget.value;
                    if (key === 'custom') {
                      setCustomSlot(entry.key);
                      setCustom([]);
                      return;
                    }
                    if (key === 'remove') {
                      store.setPanelSession({
                        tiles: tiles.filter((old) => old !== entry.key),
                      });
                      return;
                    }
                    store.setPanelSession({
                      tiles: tiles.map((old) =>
                        old === entry.key ? key : old,
                      ),
                    });
                  }}
                >
                  <option value="custom">{t('panel.custom')}</option>
                  <option value="remove">{t('panel.remove')}</option>
                  {options
                    .filter(
                      (option) =>
                        !session.favouritesOnly ||
                        option.key.startsWith('custom:') ||
                        session.favourites.includes(option.key) ||
                        option.key === entry.key,
                    )
                    .map((option) => (
                      <option
                        value={option.key}
                        key={option.key}
                        disabled={
                          option.key !== entry.key && tiles.includes(option.key)
                        }
                      >
                        {option.label}: {option.partyIds.map(name).join(' + ')}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  class="ws-icon"
                  aria-label={t('panel.favourites')}
                  aria-pressed={session.favourites.includes(entry.key)}
                  onClick={() =>
                    store.setPanelSession({
                      favourites: session.favourites.includes(entry.key)
                        ? session.favourites.filter((key) => key !== entry.key)
                        : [...session.favourites, entry.key],
                    })
                  }
                >
                  {session.favourites.includes(entry.key) ? '★' : '☆'}
                </button>
                {entry.key.startsWith('custom:') && (
                  <button
                    type="button"
                    class="ws-icon"
                    data-tile-edit={entry.key}
                    aria-label={t('panel.editTile')}
                    title={t('panel.editTile')}
                    onClick={() => {
                      setCustomSlot(null);
                      setEditing(entry.key);
                      setCustom(entry.partyIds);
                    }}
                  >
                    ✎
                  </button>
                )}
                <button
                  type="button"
                  class="ws-icon"
                  data-tile-remove={entry.key}
                  aria-label={t('panel.remove')}
                  onClick={() =>
                    store.setPanelSession({
                      tiles: tiles.filter((key) => key !== entry.key),
                    })
                  }
                >
                  ×
                </button>
              </div>
              <button
                type="button"
                class="ws-tile-main"
                onClick={() => setDetail(entry.key)}
              >
                <span class="ws-tile-seats">
                  <strong>{none ? '—' : value.seats}</strong>
                  <small>/ {value.required}</small>
                </span>
                <span class="ws-tile-text">
                  <bdi class="ws-tile-names">
                    {entry.partyIds.map(name).join(' + ')}
                  </bdi>
                  <small>
                    {none
                      ? t('panel.parliament')
                      : value.margin >= 0
                        ? t('panel.surplus', { count: value.margin })
                        : t('panel.shortBy', { count: value.missing })}
                  </small>
                </span>
              </button>
              <div
                class="ws-mini-bar"
                role="img"
                aria-label={`${t('panel.parliament')}: ${none ? '—' : value.parliament}%`}
              >
                {!none &&
                  value.members.map((member) => (
                    <span
                      key={member.id}
                      style={{
                        width: `${member.parliament}%`,
                        background: scenario.parties.find(
                          (party) => party.id === member.id,
                        )!.color,
                      }}
                    />
                  ))}
                <i
                  class="ws-majority-mark"
                  style={{ left: `${value.majorityMark}%` }}
                />
              </div>
              {shown.length <= 2 && (
                <p class="ws-hint">
                  {value.members
                    .map((member) => `${name(member.id)}: ${member.seats}`)
                    .join('; ')}
                </p>
              )}
              <label class="ws-check">
                <input
                  type="checkbox"
                  checked={store
                    .getState()
                    .futureCoalitions.some(
                      (ids) =>
                        coalitionKey(ids) === coalitionKey(entry.partyIds),
                    )}
                  onChange={() => store.toggleFutureCoalition(entry.partyIds)}
                />
                {t('view.future')}
              </label>
            </article>
          );
        })}
      </div>
      {custom !== null && (
        <PanelModal
          title={t(editing === null ? 'panel.custom' : 'panel.editTile')}
          onClose={() => {
            setCustom(null);
            setEditing(null);
          }}
        >
          <div class="ws-custom-list">
            {scenario.parties.map((party) => (
              <label class="ws-custom-pick" key={party.id}>
                <input
                  type="checkbox"
                  checked={custom.includes(party.id)}
                  onChange={() =>
                    setCustom(
                      custom.includes(party.id)
                        ? custom.filter((id) => id !== party.id)
                        : [...custom, party.id],
                    )
                  }
                />
                <span
                  class="ws-custom-dot"
                  aria-hidden="true"
                  style={{ background: party.color }}
                />
                <span>{name(party.id)}</span>
              </label>
            ))}
          </div>
          {match && (
            <p class="ws-hint" data-custom-existing={match.key}>
              {t(matchShown ? 'panel.existingShown' : 'panel.existing', {
                label: match.label,
              })}
            </p>
          )}
          <button
            type="button"
            class="ws-button"
            disabled={!custom.length || matchShown}
            onClick={() => {
              if (editing !== null) {
                const old = session.custom.find(
                  (entry) => entry.key === editing,
                );
                store.setPanelSession({
                  custom: replaceCustomTile(
                    session.custom,
                    editing,
                    custom,
                    old?.label ?? '',
                  ),
                });
                setCustom(null);
                setEditing(null);
                return;
              }
              if (match) {
                store.setPanelSession({
                  tiles:
                    customSlot === null
                      ? [...tiles.slice(0, 3), match.key]
                      : tiles.map((old) =>
                          old === customSlot ? match.key : old,
                        ),
                });
                setCustom(null);
                return;
              }
              const key = `custom:${session.nextCustom}`;
              const alphabet = t('panel.alphabet');
              const label = `${t('panel.own')} ${alphabet[(session.nextCustom - 1) % alphabet.length]}${session.nextCustom > alphabet.length ? session.nextCustom : ''}`;
              store.setPanelSession({
                nextCustom: session.nextCustom + 1,
                custom: [...session.custom, { key, partyIds: custom, label }],
                tiles:
                  customSlot === null
                    ? [...tiles.slice(0, 3), key]
                    : tiles.map((old) => (old === customSlot ? key : old)),
              });
              setCustom(null);
            }}
          >
            {t('panel.apply')}
          </button>
        </PanelModal>
      )}
      {detailEntry && report && (
        <PanelModal title={detailEntry.label} onClose={() => setDetail(null)}>
          {report.noAllocation ? (
            <p>{t(`status.noAllocation.${report.noAllocation}`)}</p>
          ) : (
            <>
              <p>
                {t('panel.parliament')}: {report.seats} /{' '}
                {scenario.rules.seatCount}
              </p>
              <div
                class="ws-pie"
                role="img"
                aria-label={`${t('panel.parliament')}: ${report.parliament}%`}
                style={{
                  background: `conic-gradient(${report.stops.map((stop, index) => `${scenario.parties.find((party) => party.id === report.members[index]!.id)!.color} ${stop.start}% ${stop.end}%`).join(',')},#ddd ${report.parliament}% 100%)`,
                }}
              />
            </>
          )}
          <ul>
            {report.members.map((member) => (
              <li key={member.id}>
                {name(member.id)}: {report.noAllocation ? '—' : member.seats} —{' '}
                {t('panel.inside')}:{' '}
                {report.noAllocation ? '—' : (member.inside ?? '—')}%{' '}
                {member.pivotal && t('panel.pivotal')}
              </li>
            ))}
          </ul>
          <p>
            {t('panel.joiners')}: {report.joiners.map(name).join(', ') || '—'}
          </p>
          {report.forbiddenPairs.map((pair) => (
            <p class="note" key={pair.partyIds.join(':')}>
              {pair.partyIds.map(name).join(' / ')}: {t('panel.refusedBy')}{' '}
              {pair.refusedBy.map(name).join(', ') ||
                t('futureCoalitions.breach')}
            </p>
          ))}
          {report.ineligiblePartyIds.length > 0 && (
            <p>
              {t('futureCoalitions.breach')}:{' '}
              {report.ineligiblePartyIds.map(name).join(', ')}
            </p>
          )}
        </PanelModal>
      )}
    </div>
  );
}
