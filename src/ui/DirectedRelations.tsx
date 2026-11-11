import { useState } from 'preact/hooks';
import type { Translate } from '../i18n';
import { entityName } from './names';

interface Party {
  readonly id: string;
  readonly name?: string;
  readonly color?: unknown;
}

/**
 * Directed cooperation decisions drawn as strips: each end is one party's
 * own decision about the other (✓ ready, ✗ refuses).
 */
export function DirectedRelations({
  parties,
  refusals,
  onToggle,
  t,
  seats,
  paged = true,
}: {
  readonly parties: readonly Party[];
  readonly refusals: readonly (readonly string[])[];
  readonly onToggle: (from: string, to: string) => void;
  readonly t: Translate;
  readonly seats?: Readonly<Record<string, number>>;
  /** False: ◀ select ▶ and every relation of the party at once (M7-17). */
  readonly paged?: boolean;
}) {
  const [selected, setSelected] = useState(parties[0]?.id ?? '');
  const [part, setPart] = useState(0);
  const party = parties.find((item) => item.id === selected) ?? parties[0];
  if (!party) return null;
  const others = parties.filter((item) => item.id !== party.id);
  const starts = paged
    ? others.flatMap((_, index) => (index % 4 === 0 ? [index] : []))
    : [0];
  const pages = starts.length;
  const at = part < pages ? part : pages > 0 ? pages - 1 : 0;
  const shown = paged ? others.slice(at * 4, (at + 1) * 4) : others;
  const position = parties.indexOf(party);
  const turn = (offset: number) => {
    const next = parties[(position + offset + parties.length) % parties.length];
    if (next) setSelected(next.id);
  };
  const refused = (from: Party, to: Party) =>
    refusals.some((pair) => pair[0] === from.id && pair[1] === to.id);
  const label = (item: Party) => (
    <span
      class="ws-rule-party"
      style={
        typeof item.color === 'string' ? { '--color': item.color } : undefined
      }
    >
      <i class="ws-dot" aria-hidden="true" />
      <bdi>{entityName('party', item, t)}</bdi>
      {seats?.[item.id] !== undefined && ` · ${seats[item.id]}`}
    </span>
  );
  const end = (from: Party, to: Party) => {
    const no = refused(from, to);
    return (
      <button
        type="button"
        class="ws-rule-end"
        data-refusal={`${from.id}:${to.id}`}
        aria-pressed={no}
        aria-label={t('book.pair.decision', {
          from: entityName('party', from, t),
          to: entityName('party', to, t),
        })}
        onClick={() => onToggle(from.id, to.id)}
      >
        {no ? '✗' : '✓'}
      </button>
    );
  };
  const picker = (
    <select
      aria-label={paged ? t('panel.relations') : t('panel.rulesParty')}
      {...(paged ? {} : { 'data-rules-party': '' })}
      value={party.id}
      onChange={(event) => {
        setSelected(event.currentTarget.value);
        setPart(0);
      }}
    >
      {parties.map((item) => (
        <option key={item.id} value={item.id}>
          {entityName('party', item, t)}
        </option>
      ))}
    </select>
  );
  return (
    <div
      class={paged ? 'directed-relations' : 'directed-relations ws-rules-all'}
    >
      {paged ? (
        picker
      ) : (
        <div class="ws-rule-pick">
          <button
            type="button"
            class="ws-nudge"
            data-action="rules-previous"
            aria-label={t('book.back')}
            disabled={parties.length < 2}
            onClick={() => turn(-1)}
          >
            ◀
          </button>
          {picker}
          <button
            type="button"
            class="ws-nudge"
            data-action="rules-next"
            aria-label={t('book.next')}
            disabled={parties.length < 2}
            onClick={() => turn(1)}
          >
            ▶
          </button>
        </div>
      )}
      <div class="ws-rule-list">
        {shown.map((other) => (
          <div key={other.id} class="ws-rule-row">
            {label(party)}
            {end(party, other)}
            <span
              class="ws-rule-line"
              data-refused={refused(party, other) || refused(other, party)}
              aria-hidden="true"
            />
            {end(other, party)}
            {label(other)}
          </div>
        ))}
      </div>
      {pages > 1 && (
        <div class="directed-relations__pages">
          <button
            type="button"
            disabled={at === 0}
            onClick={() => setPart(at - 1)}
          >
            {t('book.back')}
          </button>
          <span>
            {at + 1} / {pages}
          </span>
          <button
            type="button"
            disabled={at + 1 === pages}
            onClick={() => setPart(at + 1)}
          >
            {t('book.next')}
          </button>
        </div>
      )}
    </div>
  );
}
