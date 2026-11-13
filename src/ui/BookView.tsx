import { useEffect, useRef, useState } from 'preact/hooks';
import type { VoterMix } from '../engine/electorate';
import { unusualGrowth } from '../engine/panel';
import {
  fractionToPercent,
  parseCount,
  percentStops,
  percentToFraction,
} from '../engine/numeric';
import type { Locale, Translate } from '../i18n';
import { formatDecimal, formatInteger } from '../i18n/format';
import {
  bookPages,
  CHAPTER_COUNT,
  childOf,
  chosenPick,
  electorateCheck,
  exampleGroupSet,
  fieldPicks,
  groupIds,
  groupMixExample,
  groupNames,
  isSuggested,
  KNESSET_FACTS,
  narration,
  pageError,
  pageParts,
  pageSpec,
  partCount,
  partError,
  partyColorOf,
  partyIds,
  partyNames,
  remainder,
  resolveDraft,
  reviewParts,
  screenOf,
  canLockAnother,
  defaultLocks,
  reviewItemName,
  shownTexts,
  takesAnswer,
  THRESHOLD_FACT,
  voterMixCheck,
  type BookDraft,
  type BookError,
  type ElectorateRow,
  type FieldPick,
  type Motif,
  type PageKey,
  type PageKind,
  type PageSpec,
  type Section,
} from './book';
import { catalogAboutKey, EXAMPLE_LISTS } from './catalog';
import { groupColorOf } from './groupColors';
import { LanguageControls } from './LanguageControls';
import { DirectedRelations } from './DirectedRelations';
import { LockButton } from './PanelControls';
import { MotifArt, Palms } from './motifs';
import { entityName } from './names';
import { Purpose } from './Purpose';
import { exampleAbout, START_EXAMPLES } from './startExamples';
import type { Store } from './store';

export interface BookViewProps {
  readonly store: Store;
  readonly t: Translate;
  readonly locale: Locale;
}

const QUESTION_ID = 'book-question';
const ERROR_ID = 'book-error';

/** An element id unique to one page of a screen. */
function pageId(base: string, page: PageKey): string {
  return `${base}-${page.replace(/\./g, '-')}`;
}
const CONFIRM_ID = 'book-confirm-text';

const STEP_KIND: Partial<Record<Section, string>> = {
  turnout: 'group',
  growth: 'group',
  turnoutChange: 'group',
  coalitions: 'party',
};

/** Pages whose narrator reply can lead to the facts page. */
const FACT_SECTIONS: readonly Section[] = ['parties.count', 'rules.threshold'];

/** Narrator parameters that hold decimals to show in the locale's notation. */
const DECIMAL_PARAMS: readonly string[] = ['turnout', 'rest', 'threshold'];

/** Pages whose drawing shows example numbers, with the caption that says so. */
const CAPTIONS: Partial<Record<Section, string>> = {
  turnout: 'turnout',
  'votes.check': 'voterMix',
  'growth.ask': 'growth',
  growth: 'growth',
  'turnoutChange.ask': 'turnoutChange',
  turnoutChange: 'turnoutChange',
  'rules.threshold': 'threshold',
};

/** The «Пример» note that fits each kind of page. */
const SUGGESTED_NOTES: Partial<Record<PageKind, string>> = {
  names: 'names',
  choice: 'choice',
  coalition: 'choice',
  count: 'value',
  percent: 'value',
  percents: 'value',
  review: 'review',
};

/** The points of the lesson on what a voter group is, in reading order. */
const LESSON_POINTS = [
  'turnout',
  'compose',
  'share',
  'future',
  'note',
] as const;

/** The pie part no value fills yet; no group or list has this colour. */
const PIE_REST = '#E5E7EB';

/** A percent text in the locale's notation; unreadable text stays as typed. */
function percentText(locale: Locale, text: string): string {
  const fraction = percentToFraction(text);
  const percent = fraction === null ? null : fractionToPercent(fraction);
  return percent === null ? text : formatDecimal(locale, percent);
}

function partyLabel(draft: BookDraft, index: number, t: Translate): string {
  const id = partyIds(draft)[index] ?? '';
  return entityName('party', { id, name: partyNames(draft)[index] ?? '' }, t);
}

function groupLabel(draft: BookDraft, index: number, t: Translate): string {
  const id = groupIds(draft)[index] ?? '';
  return entityName('group', { id, name: groupNames(draft)[index] ?? '' }, t);
}

function subjectName(
  spec: PageSpec,
  draft: BookDraft,
  t: Translate,
): string | null {
  if (spec.subject === null || spec.step === null) {
    return null;
  }
  const index = spec.step.n - 1;
  return spec.section === 'coalitions'
    ? partyLabel(draft, index, t)
    : groupLabel(draft, index, t);
}

/** The colours of the rows of a party voters page, as the build gives them. */
function rowColors(spec: PageSpec): readonly string[] {
  return spec.fields.map((id, index) =>
    spec.entityKind === 'party'
      ? partyColorOf(id, index)
      : groupColorOf(id, index),
  );
}

/**
 * The background of a pie of percent texts: one slice per row in its colour,
 * scaled down when the sum is over 100%, the rest to 100% grey.
 */
function pieStyle(texts: readonly string[], colors: readonly string[]): string {
  let start = '0';
  const slices = percentStops(texts).map((end, index) => {
    const slice = `${colors[index] ?? PIE_REST} ${start}% ${end}%`;
    start = end;
    return slice;
  });
  if (start !== '100') {
    slices.push(`${PIE_REST} ${start}% 100%`);
  }
  return `background:conic-gradient(${slices.join(', ')})`;
}

/** The pie of the page on screen, or null when its drawing is a motif. */
function pieOf(spec: PageSpec, mix: VoterMix | null): string | null {
  return spec.section === 'votes.check' && mix !== null
    ? pieStyle(mix.groups ?? [], rowColors(spec))
    : null;
}

/**
 * A stacked bar of percent texts: one segment per row in its colour, placed
 * by the engine's stops (scaled down when the sum is over 100%). It carries
 * no text; the fields beside it hold the numbers.
 */
function StackBar({
  texts,
  ids,
  colors,
  marker,
}: {
  readonly texts: readonly string[];
  readonly ids: readonly string[];
  readonly colors: readonly string[];
  readonly marker: 'data-shares-bar' | 'data-compose-bar' | 'data-review-bar';
}) {
  let start = '0';
  return (
    <div class="book__bar" {...{ [marker]: '' }} aria-hidden="true">
      {percentStops(texts).map((end, index) => {
        const from = start;
        start = end;
        return (
          <span
            key={ids[index] ?? index}
            class="book__segment"
            data-segment={ids[index] ?? index}
            style={`inset-inline-start:${from}%;inline-size:calc(${end}% - ${from}%);background:${colors[index] ?? PIE_REST}`}
          />
        );
      })}
    </div>
  );
}

function chapterLabel(chapter: number, t: Translate): string {
  return chapter === 0
    ? t('book.chapter.0')
    : t('book.chapter.label', {
        n: chapter,
        count: CHAPTER_COUNT,
        name: t(`book.chapter.${chapter}`),
      });
}

function stepText(spec: PageSpec, t: Translate): string | null {
  const kind = STEP_KIND[spec.section];
  if (kind === undefined || spec.step === null || spec.step.count < 2) {
    return null;
  }
  return t(`book.step.${kind}`, { n: spec.step.n, count: spec.step.count });
}

function errorText(error: BookError, locale: Locale, t: Translate): string {
  const limit = (text: string | null) =>
    text === null ? '' : formatDecimal(locale, text);
  switch (error.code) {
    case 'count':
    case 'percent':
      return t(`book.error.${error.code}`, {
        min: limit(error.min),
        max: limit(error.max),
      });
    case 'sum': {
      const rest = error.remainder ?? '0';
      return rest.startsWith('-')
        ? t('book.error.sumOver', {
            over: formatDecimal(locale, rest.slice(1)),
          })
        : t('book.error.sumUnder', { rest: formatDecimal(locale, rest) });
    }
    case 'length':
      return t('book.error.length', { max: limit(error.max) });
    default:
      return t('book.error.choice');
  }
}

function remainderLine(
  rest: string | null,
  locale: Locale,
  t: Translate,
): { state: string; text: string } {
  if (rest === null) {
    return { state: 'invalid', text: t('book.remainder.invalid') };
  }
  if (rest === '0') {
    return { state: 'done', text: t('book.remainder.done') };
  }
  return rest.startsWith('-')
    ? {
        state: 'over',
        text: t('book.remainder.over', {
          over: formatDecimal(locale, rest.slice(1)),
        }),
      }
    : {
        state: 'left',
        text: t('book.remainder.left', { rest: formatDecimal(locale, rest) }),
      };
}

/**
 * The illustration of a page: a fixed drawing, palms on the opening and review
 * pages, and a caption when the drawing shows example numbers. The party
 * voters pages show a pie of the page's values instead of the drawing.
 */
function Figure({
  motif,
  pie,
  palms,
  caption,
  t,
}: {
  readonly motif: Motif;
  /** The pie background, or null for the drawing. */
  readonly pie: string | null;
  readonly palms: boolean;
  readonly caption: string | null;
  readonly t: Translate;
}) {
  return (
    <figure class="book__figure" data-figure>
      {palms && <Palms />}
      {pie === null ? (
        <div class="book__motif" data-motif={motif} aria-hidden="true">
          <MotifArt name={motif} />
        </div>
      ) : (
        <div class="book__pie" data-pie aria-hidden="true" style={pie} />
      )}
      {caption !== null && (
        <figcaption class="book__caption" data-motif-caption>
          {t(`book.caption.${caption}`)}
        </figcaption>
      )}
    </figure>
  );
}

function Head({
  store,
  spec,
  part,
  parts,
  inert,
  locale,
  t,
}: {
  readonly store: Store;
  readonly spec: PageSpec;
  readonly part: number;
  readonly parts: number;
  readonly inert: boolean;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  const step = stepText(spec, t);
  return (
    <header class="book__head" inert={inert}>
      <p class="book__chapter" data-chapter={spec.chapter} data-chapter-label>
        {chapterLabel(spec.chapter, t)}
      </p>
      {step !== null && (
        <p class="book__step" data-step>
          {step}
        </p>
      )}
      {parts > 1 && (
        <p class="book__step" data-part-step>
          {t('book.part', { n: part + 1, count: parts })}
        </p>
      )}
      <ol class="book__progress" aria-hidden="true">
        {Array.from({ length: CHAPTER_COUNT }, (_, index) => (
          <li key={index} data-done={index < spec.chapter ? 'true' : 'false'} />
        ))}
      </ol>
      <LanguageControls store={store} locale={locale} t={t} />
    </header>
  );
}

interface AnswerProps {
  readonly store: Store;
  readonly spec: PageSpec;
  readonly draft: BookDraft;
  readonly texts: readonly string[];
  /** The text indices of the part on screen. */
  readonly rows: readonly number[];
  /** Whether the part on screen is the last of its page. */
  readonly last: boolean;
  readonly suggested: boolean;
  readonly invalid: (index: number) => boolean;
  readonly locale: Locale;
  readonly t: Translate;
  /** The party on screen on the composition page. */
  readonly shown?: number;
  readonly onShow?: (party: number) => void;
}

function invalidProps(invalid: boolean, page: PageKey) {
  return invalid
    ? {
        'aria-invalid': 'true' as const,
        'aria-describedby': pageId(ERROR_ID, page),
      }
    : {};
}

/** «Пример» as a disclosure: a click opens what the example means. */
function Suggested({
  show,
  kind,
  t,
}: {
  readonly show: boolean;
  readonly kind: PageKind;
  readonly t: Translate;
}) {
  return show ? (
    <details class="book__suggested" data-suggested>
      <summary class="book__suggested-title">{t('book.suggested')}</summary>
      <p class="book__suggested-more" data-suggested-more>
        {t(`book.suggested.more.${SUGGESTED_NOTES[kind] ?? 'value'}`)}
      </p>
    </details>
  ) : null;
}

/** The label of one ready value, formatted for the interface language. */
function pickLabel(
  spec: PageSpec,
  texts: readonly string[],
  index: number,
  pick: FieldPick,
  locale: Locale,
  t: Translate,
): string {
  if (spec.kind === 'names') {
    if (pick.note === 'own') {
      return t('book.pick.own');
    }
    const kind = spec.entityKind ?? 'party';
    const name = entityName(kind, { id: pick.value }, t);
    const holder = texts.findIndex(
      (text, at) => at % 2 === 0 && at !== index && text === pick.value,
    );
    if (holder >= 0) {
      return t('book.pick.taken', { name, n: holder / 2 + 1 });
    }
    const about = catalogAboutKey(kind, pick.value);
    return about === null ? name : `${name} — ${t(about)}`;
  }
  const value = formatDecimal(locale, pick.value);
  switch (pick.note) {
    case 'knesset':
      return t('book.pick.knesset', { value });
    case 'israel':
      return t('book.pick.israel', { value });
    case 'rest':
      return t('book.pick.rest', { rest: value });
    default:
      break;
  }
  if (spec.kind === 'count') {
    return value;
  }
  return spec.section === 'growth' || spec.section === 'turnoutChange'
    ? t(`book.pick.${spec.section}`, { value })
    : `${value}%`;
}

/**
 * The ▾ list of ready values joined to a field. Choosing one answers the field
 * exactly as typing would; a number goes in the locale's notation.
 */
function PickList({
  store,
  spec,
  draft,
  texts,
  index,
  name,
  locale,
  t,
}: {
  readonly store: Store;
  readonly spec: PageSpec;
  readonly draft: BookDraft;
  readonly texts: readonly string[];
  readonly index: number;
  /** The field the list belongs to, when the page has several. */
  readonly name: string | null;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  const picks = fieldPicks(draft, spec.key, index);
  if (picks.length === 0) {
    return null;
  }
  const names = spec.kind === 'names';
  return (
    <select
      class="book__pick"
      data-book-pick={index}
      aria-label={name === null ? t('book.pick') : t('book.pick.for', { name })}
      value={chosenPick(draft, spec.key, index)}
      onChange={(event) => {
        const { value } = event.currentTarget;
        store.answerBook(
          index,
          names || value === '' ? value : formatDecimal(locale, value),
          spec.key,
        );
      }}
    >
      {!names && (
        <option value="" hidden>
          {t('book.pick')}
        </option>
      )}
      {picks.map((pick) => (
        <option key={`${pick.note ?? ''}:${pick.value}`} value={pick.value}>
          {pickLabel(spec, texts, index, pick, locale, t)}
        </option>
      ))}
    </select>
  );
}

function SingleAnswer({
  store,
  spec,
  draft,
  texts,
  suggested,
  invalid,
  locale,
  t,
}: AnswerProps) {
  const text = texts[0] ?? '';
  const decimal = spec.kind === 'percent';
  const unit =
    spec.section === 'growth' || spec.section === 'turnoutChange'
      ? t(`book.unit.${spec.section}`)
      : decimal
        ? '%'
        : null;
  return (
    <div class="book__answer">
      <span class="book__combo">
        <input
          class="field__input book__input"
          type="text"
          inputMode={decimal ? 'decimal' : 'numeric'}
          data-book-field={0}
          value={suggested && decimal ? percentText(locale, text) : text}
          aria-labelledby={pageId(QUESTION_ID, spec.key)}
          {...invalidProps(invalid(0), spec.key)}
          onInput={(event) =>
            store.answerBook(0, event.currentTarget.value, spec.key)
          }
        />
        <PickList
          store={store}
          spec={spec}
          draft={draft}
          texts={texts}
          index={0}
          name={null}
          locale={locale}
          t={t}
        />
      </span>
      {unit !== null && <span class="book__unit">{unit}</span>}
      <Suggested show={suggested} kind={spec.kind} t={t} />
    </div>
  );
}

function ChoiceAnswer({ store, spec, texts, suggested, t }: AnswerProps) {
  const chosen = texts[0] ?? '';
  return (
    <div class="book__answer book__answer--choices">
      <div
        class="book__choices"
        role="radiogroup"
        aria-labelledby={pageId(QUESTION_ID, spec.key)}
      >
        {spec.choices.map((choice) => (
          <label class="book__choice" key={choice}>
            <input
              type="radio"
              name={pageId('book-choice', spec.key)}
              value={choice}
              data-book-choice={choice}
              checked={chosen === choice}
              onChange={() => store.answerBook(0, choice, spec.key)}
            />
            <span>{t(`book.choice.${spec.section}.${choice}`)}</span>
          </label>
        ))}
      </div>
      <Suggested show={suggested} kind={spec.kind} t={t} />
    </div>
  );
}

function GroupRates({
  store,
  spec,
  draft,
  texts,
  rows,
  invalid,
  t,
}: AnswerProps) {
  const growth = spec.section === 'growth';
  return (
    <div class="book__answer book__answer--fields">
      <div class="book__rates">
        {rows.map((index) => {
          const name = groupLabel(draft, index, t);
          const text = texts[index] ?? '';
          const fraction = percentToFraction(text);
          const warning =
            growth && fraction !== null && unusualGrowth(fraction);
          const slider = fractionToPercent(fraction);
          return (
            <div
              class="book__rate"
              data-book-rate={index}
              key={spec.fields[index]}
            >
              <label for={`book-rate-${index}`}>
                <i
                  style={`background:${groupColorOf(spec.fields[index] ?? '', index)}`}
                  aria-hidden="true"
                />
                {name}
              </label>
              <input
                type="range"
                min={growth ? '-5' : '1'}
                max={growth ? '5' : '100'}
                step={growth ? '0.25' : '1'}
                aria-label={name}
                value={slider ?? (growth ? '0' : '70')}
                onInput={(event) =>
                  store.answerBook(index, event.currentTarget.value, spec.key)
                }
              />
              <span class="book__rate-value">
                <input
                  type="text"
                  inputMode="decimal"
                  id={`book-rate-${index}`}
                  class="field__input"
                  data-book-field={index}
                  value={text}
                  {...invalidProps(invalid(index), spec.key)}
                  onInput={(event) =>
                    store.answerBook(index, event.currentTarget.value, spec.key)
                  }
                />
                <span>%</span>
              </span>
              {warning && (
                <span class="book__rate-warning" data-growth-warning>
                  {t('book.growth.warning')}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {growth && <p class="book__hint">{t('book.growth.visual')}</p>}
      {!growth && <p class="book__hint">{t('book.turnout.derived')}</p>}
    </div>
  );
}

function Relationships({ store, spec, draft, texts, t }: AnswerProps) {
  const ids = partyIds(draft);
  const names = partyNames(draft);
  const width = ids.length + 1;
  const refusals = ids.flatMap((from, p) =>
    ids.flatMap((to, q) =>
      p !== q && texts[p * width + q + 1] === 'no' ? [[from, to]] : [],
    ),
  );
  return (
    <div class="book__relations" data-book-relations>
      <DirectedRelations
        parties={ids.map((id, index) => ({
          id,
          name: names[index] ?? '',
          color: partyColorOf(id, index),
        }))}
        refusals={refusals}
        t={t}
        paged={false}
        onToggle={(from, to) => {
          const field = ids.indexOf(from) * width + ids.indexOf(to) + 1;
          store.answerBook(
            field,
            texts[field] === 'no' ? 'yes' : 'no',
            spec.key,
          );
        }}
      />
    </div>
  );
}

/**
 * Names in pick / name pairs: the odd text index is the typed name, the even
 * one before it the list or group picked for the field. A picked field shows
 * the catalog name and description; an own one its typed name over the grey
 * default name.
 */
function NamesAnswer({
  store,
  spec,
  draft,
  texts,
  rows,
  last,
  suggested,
  invalid,
  locale,
  t,
}: AnswerProps) {
  const kind = spec.entityKind ?? 'party';
  const shown = rows.filter((at) => at % 2 === 1);
  const total = spec.fields.length;
  const from = ((shown[0] ?? 1) - 1) / 2 + 1;
  const to = ((shown[shown.length - 1] ?? 1) - 1) / 2 + 1;
  const split = shown.length < total;
  return (
    <div class="book__answer book__answer--fields">
      {split && (
        <p class="book__range" data-names-range>
          {t('book.names.range', { from, to, count: total })}
        </p>
      )}
      <div class="book__fields book__fields--names">
        {shown.map((at) => {
          const slot = (at - 1) / 2;
          const id = spec.fields[slot] ?? `${slot}`;
          const pick = texts[at - 1] ?? '';
          const label = t('book.field.name', { n: slot + 1 });
          const about =
            pick !== ''
              ? catalogAboutKey(kind, pick)
              : kind === 'party'
                ? exampleAbout(locale, slot, texts[at] ?? '')
                : null;
          return (
            <div class="book__name" key={slot}>
              <span class="book__number" aria-hidden="true">
                {formatInteger(locale, slot + 1)}
              </span>
              <span class="book__combo">
                <input
                  class="field__input"
                  type="text"
                  data-book-field={at}
                  value={
                    pick === ''
                      ? (texts[at] ?? '')
                      : entityName(kind, { id: pick }, t)
                  }
                  placeholder={entityName(kind, { id }, t)}
                  aria-label={label}
                  {...invalidProps(invalid(at), spec.key)}
                  onInput={(event) =>
                    store.answerBook(at, event.currentTarget.value, spec.key)
                  }
                />
                <PickList
                  store={store}
                  spec={spec}
                  draft={draft}
                  texts={texts}
                  index={at - 1}
                  name={label}
                  locale={locale}
                  t={t}
                />
              </span>
              {about !== null && <span class="book__hint">{t(about)}</span>}
            </div>
          );
        })}
      </div>
      {split && !last && (
        <p class="book__range" data-names-more>
          {t('book.names.more', { n: total - to })}
        </p>
      )}
      <Suggested show={suggested} kind={spec.kind} t={t} />
    </div>
  );
}

/**
 * One compact percent cell: the row's colour and name, its exact text field
 * with the ready values, and a slider over 0–100%. Both edit the same text.
 */
function PercentCell({
  store,
  spec,
  draft,
  texts,
  cell,
  field,
  id,
  name,
  color,
  suggested,
  invalid,
  locale,
  t,
  lock,
}: {
  readonly store: Store;
  readonly spec: PageSpec;
  readonly draft: BookDraft;
  readonly texts: readonly string[];
  /** The row's position on screen. */
  readonly cell: number;
  /** The text index the cell answers. */
  readonly field: number;
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly suggested: boolean;
  readonly invalid: boolean;
  readonly locale: Locale;
  readonly t: Translate;
  /** A lock that keeps the value when the row is aligned to 100%. */
  readonly lock?: {
    readonly locked: boolean;
    readonly onToggle: () => void;
    /** The data attribute naming the lock; the composition lock by default. */
    readonly marker?: string;
  };
}) {
  const text = texts[field] ?? '';
  const slider = fractionToPercent(percentToFraction(text));
  return (
    <div
      class={`book__cell${lock === undefined ? '' : ' book__cell--lockable'}`}
      data-book-cell={cell}
      data-locked={lock?.locked}
    >
      <label
        class="book__label"
        for={`${pageId('book-cell', spec.key)}-${field}`}
      >
        <span
          class="book__key"
          data-key={id}
          aria-hidden="true"
          style={{ background: color }}
        />
        <span>{name}</span>
      </label>
      <span class="book__percent">
        <span class="book__combo">
          <input
            class="field__input book__input"
            type="text"
            inputMode="decimal"
            id={`${pageId('book-cell', spec.key)}-${field}`}
            data-book-field={field}
            value={suggested ? percentText(locale, text) : text}
            {...invalidProps(invalid, spec.key)}
            onInput={(event) =>
              store.answerBook(field, event.currentTarget.value, spec.key)
            }
          />
          <PickList
            store={store}
            spec={spec}
            draft={draft}
            texts={texts}
            index={field}
            name={name}
            locale={locale}
            t={t}
          />
        </span>
        <span class="book__unit">%</span>
        {lock !== undefined && (
          <LockButton
            locked={lock.locked}
            label={`${t('panel.lock')}: ${name}`}
            marker={{ [lock.marker ?? 'data-compose-lock']: id }}
            onToggle={lock.onToggle}
          />
        )}
      </span>
      <input
        class="book__slider"
        type="range"
        min="0"
        max="100"
        step="0.25"
        aria-label={name}
        value={slider ?? '0'}
        onInput={(event) =>
          store.answerBook(field, event.currentTarget.value, spec.key)
        }
      />
    </div>
  );
}

/** Every party's vote share on one screen: a stacked bar and compact cells. */
function PercentsAnswer({
  store,
  spec,
  draft,
  texts,
  rows,
  suggested,
  invalid,
  locale,
  t,
}: AnswerProps) {
  const line = remainderLine(remainder(draft, spec.key), locale, t);
  const colors = rowColors(spec);
  const shares = spec.key === 'votes.shares';
  // M7-20: defaults until touched; a touched set is kept in the book state.
  const stored = store.getState().book.locks?.['votes.shares'];
  const locks = shares ? (stored ?? defaultLocks(texts)) : [];
  const [lockHint, setLockHint] = useState(false);
  const toggleLock = (row: number) => {
    const locking = !locks.includes(row);
    if (locking && !canLockAnother(texts.length, locks.length)) {
      setLockHint(true);
      return;
    }
    setLockHint(false);
    store.setBookLocks(
      'votes.shares',
      locking ? [...locks, row] : locks.filter((other) => other !== row),
    );
  };
  return (
    <div class="book__answer book__answer--fields book__answer--cells">
      <StackBar
        texts={texts}
        ids={spec.fields}
        colors={colors}
        marker="data-shares-bar"
      />
      <div class="book__cells">
        {rows.map((index) => (
          <PercentCell
            key={spec.fields[index] ?? index}
            store={store}
            spec={spec}
            draft={draft}
            texts={texts}
            cell={index}
            field={index}
            id={spec.fields[index] ?? `${index}`}
            name={
              spec.entityKind === 'group'
                ? groupLabel(draft, index, t)
                : partyLabel(draft, index, t)
            }
            color={colors[index] ?? PIE_REST}
            suggested={suggested}
            invalid={invalid(index)}
            locale={locale}
            t={t}
            lock={
              shares
                ? {
                    locked: locks.includes(index),
                    onToggle: () => toggleLock(index),
                    marker: 'data-shares-lock',
                  }
                : undefined
            }
          />
        ))}
      </div>
      <div class="book__tally">
        <p class="book__remainder" data-remainder data-state={line.state}>
          {line.text}
        </p>
        {lockHint && (
          <p class="book__lock-hint" role="status" data-lock-hint>
            {t('panel.minUnlocked')}
          </p>
        )}
        {shares && (
          <button
            type="button"
            class="button button--small"
            data-action="shares-align"
            onClick={() => store.bookAlignShares(locks)}
          >
            {t('book.compose.align')}
          </button>
        )}
      </div>
      <Suggested show={suggested} kind={spec.kind} t={t} />
    </div>
  );
}

/**
 * Who votes for each party, one party at a time on one screen: ◀ party ▶,
 * the party's stacked bar, a cell per group, what is left to distribute and
 * an exact proportional alignment to 100% through the engine.
 */
function ComposeAnswer({
  store,
  spec,
  draft,
  texts,
  suggested,
  invalid,
  locale,
  t,
  shown = 0,
  onShow = () => undefined,
}: AnswerProps) {
  const groups = spec.fields.length;
  const parties = partyIds(draft);
  const count = parties.length;
  const at = shown * groups;
  const colors = rowColors(spec);
  const rest = (party: number) => remainder(draft, `compose.${party}`);
  const line = remainderLine(rest(shown), locale, t);
  const turn = (offset: number) => onShow((shown + offset + count) % count);
  const shownId = parties[shown] ?? '';
  // M7-20: defaults until touched; a touched row is kept in the book state.
  const rowTexts = texts.slice(at, at + groups);
  const stored = store.getState().book.locks?.[`compose:${shownId}`];
  const partyLocks = (stored ?? defaultLocks(rowTexts)).filter(
    (group) => group < groups,
  );
  const [lockHint, setLockHint] = useState(false);
  const toggleLock = (group: number) => {
    const locking = !partyLocks.includes(group);
    if (locking && !canLockAnother(groups, partyLocks.length)) {
      setLockHint(true);
      return;
    }
    setLockHint(false);
    store.setBookLocks(
      `compose:${shownId}`,
      locking
        ? [...partyLocks, group]
        : partyLocks.filter((other) => other !== group),
    );
  };
  return (
    <div
      class="book__answer book__answer--fields book__answer--cells"
      data-compose-shown={shown}
    >
      <div class="ws-rule-pick book__compose-pick">
        <button
          type="button"
          class="ws-nudge"
          data-action="compose-previous"
          aria-label={t('book.back')}
          disabled={count < 2}
          onClick={() => turn(-1)}
        >
          ◀
        </button>
        <select
          data-compose-party
          aria-label={t('book.compose.party')}
          value={parties[shown] ?? ''}
          onChange={(event) =>
            onShow(parties.indexOf(event.currentTarget.value))
          }
        >
          {parties.map((id, party) => (
            <option key={id} value={id}>
              {`${partyLabel(draft, party, t)}${rest(party) === '0' ? ' ✓' : ''}`}
            </option>
          ))}
        </select>
        <button
          type="button"
          class="ws-nudge"
          data-action="compose-next"
          aria-label={t('book.next')}
          disabled={count < 2}
          onClick={() => turn(1)}
        >
          ▶
        </button>
      </div>
      <StackBar
        texts={texts.slice(at, at + groups)}
        ids={spec.fields}
        colors={colors}
        marker="data-compose-bar"
      />
      <div class="book__cells">
        {spec.fields.map((id, group) => (
          <PercentCell
            key={id}
            store={store}
            spec={spec}
            draft={draft}
            texts={texts}
            cell={group}
            field={at + group}
            id={id}
            name={groupLabel(draft, group, t)}
            color={colors[group] ?? PIE_REST}
            suggested={suggested}
            invalid={invalid(at + group)}
            locale={locale}
            t={t}
            lock={{
              locked: partyLocks.includes(group),
              onToggle: () => toggleLock(group),
            }}
          />
        ))}
      </div>
      <div class="book__tally">
        <p class="book__remainder" data-remainder data-state={line.state}>
          {line.text}
        </p>
        {lockHint && (
          <p class="book__lock-hint" role="status" data-lock-hint>
            {t('panel.minUnlocked')}
          </p>
        )}
        <button
          type="button"
          class="button button--small"
          data-action="compose-align"
          onClick={() => store.bookAlign(shown, partyLocks)}
        >
          {t('book.compose.align')}
        </button>
      </div>
      <p class="book__hint" data-compose-assumption>
        {t('book.compose.assumption')}
      </p>
    </div>
  );
}

/**
 * The check page: each group's share of all voters as the answers imply it,
 * beside the 2022 statistics when the example groups are chosen. It takes no
 * answer.
 */
function CheckList({
  spec,
  draft,
  check,
  mix,
  locale,
  t,
}: {
  readonly spec: PageSpec;
  readonly draft: BookDraft;
  readonly check: readonly ElectorateRow[];
  readonly mix: VoterMix | null;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  if (mix === null) {
    return (
      <p class="book__remainder" data-state="invalid" data-check-invalid>
        {t('book.check.invalid')}
      </p>
    );
  }
  const colors = rowColors(spec);
  const population = check.length > 0;
  const statistics = check.some((row) => row.statistic !== null);
  const percent = (text: string) => `${formatDecimal(locale, text)}%`;
  return (
    <div class="book__answer book__answer--fields">
      <table class="book__check-table">
        <thead>
          <tr>
            <th scope="col">{t('book.check.group')}</th>
            <th scope="col">{t('book.check.voters')}</th>
            {population && <th scope="col">{t('book.check.share')}</th>}
            {statistics && <th scope="col">{t('book.check.stat')}</th>}
          </tr>
        </thead>
        <tbody>
          {spec.fields.map((groupId, index) => {
            const row = check[index];
            const voters = mix.groups?.[index] ?? null;
            return (
              <tr key={groupId} data-check-row={groupId}>
                <th scope="row">
                  <span class="book__check-name">
                    <span
                      class="book__key"
                      data-key={groupId}
                      aria-hidden="true"
                      style={{ background: colors[index] ?? PIE_REST }}
                    />
                    <span data-check-name>{groupLabel(draft, index, t)}</span>
                  </span>
                  {row !== undefined && !row.casts && (
                    <span class="book__hint" data-check-none>
                      {t('book.check.none')}
                    </span>
                  )}
                </th>
                <td data-check-voter-mix={groupId}>
                  {voters === null
                    ? t('book.check.unknownValue')
                    : percent(voters)}
                </td>
                {population && (
                  <td data-check-share>
                    {row === undefined
                      ? t('book.check.unknownValue')
                      : percent(row.share)}
                  </td>
                )}
                {statistics && (
                  <td data-check-stat>
                    {row?.statistic == null ? '—' : percent(row.statistic)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {!mix.complete && (
        <p class="book__hint" data-check-unknown>
          {t('book.check.unknown', {
            share:
              mix.unknown === '0'
                ? `<${formatDecimal(locale, '0.1')}%`
                : percent(mix.unknown),
          })}
        </p>
      )}
      {!population && (
        <p class="book__hint" data-check-population-unavailable>
          {t('book.check.populationUnavailable')}
        </p>
      )}
    </div>
  );
}

function CoalitionAnswer({
  store,
  spec,
  draft,
  texts,
  rows,
  suggested,
  t,
}: AnswerProps) {
  const partners = rows.filter((at) => at > 0);
  const toggle = (index: number) => (event: Event) =>
    store.answerBook(
      index,
      (event.currentTarget as HTMLInputElement).checked ? 'yes' : 'no',
      spec.key,
    );
  return (
    <div class="book__answer book__answer--fields">
      {rows.includes(0) && (
        <label class="book__check">
          <input
            type="checkbox"
            data-book-field={0}
            checked={texts[0] === 'yes'}
            onChange={toggle(0)}
          />
          <span>{t('book.coalition.canJoin')}</span>
        </label>
      )}
      {partners.length > 0 && (
        <fieldset class="book__partners">
          <legend class="book__label">{t('book.coalition.partners')}</legend>
          {partners.map((at) => (
            <label class="book__check" key={spec.fields[at - 1] ?? at}>
              <input
                type="checkbox"
                data-book-field={at}
                checked={texts[at] === 'yes'}
                onChange={toggle(at)}
              />
              <span>{partyLabel(draft, at - 1, t)}</span>
            </label>
          ))}
        </fieldset>
      )}
      <Suggested show={suggested} kind={spec.kind} t={t} />
    </div>
  );
}

const ANSWERS = {
  count: SingleAnswer,
  percent: SingleAnswer,
  choice: ChoiceAnswer,
  names: NamesAnswer,
  percents: PercentsAnswer,
  coalition: CoalitionAnswer,
} as const;

/**
 * A lesson page: what a voter group is, or where two lists of the Israeli
 * example get their votes, as the engine computes them. It reads no answers.
 */
function Lesson({
  section,
  locale,
  t,
}: {
  readonly section: Section;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  if (section === 'people.about') {
    return (
      <ul class="book__lesson">
        {LESSON_POINTS.map((point) => (
          <li key={point} data-lesson-point>
            {t(`book.lesson.about.${point}`)}
          </li>
        ))}
      </ul>
    );
  }
  const examples = groupMixExample();
  const legend = [
    ...new Set(
      examples.flatMap((example) => example.shares.map((s) => s.groupId)),
    ),
  ];
  const groupName = (id: string) => entityName('group', { id }, t);
  const partyName = (id: string) => entityName('party', { id }, t);
  const color = (id: string) => groupColorOf(id, legend.indexOf(id));
  return (
    <figure class="book__mix" data-mix-example>
      <figcaption class="book__mix-head">
        <span class="book__mix-title" data-mix-title>
          {t('book.lesson.mix.title', {
            first: partyName(examples[0]?.partyId ?? ''),
            second: partyName(examples[1]?.partyId ?? ''),
          })}
        </span>
        <span class="book__mix-caption">{t('book.lesson.mix.caption')}</span>
      </figcaption>
      {examples.map((example) => (
        <div
          class="book__mix-party"
          key={example.partyId}
          data-mix-party={example.partyId}
        >
          <p class="book__mix-line" data-mix-line>
            {t('book.lesson.mix.line', {
              party: partyName(example.partyId),
              groups: formatInteger(locale, example.groups),
              top: groupName(example.top.groupId),
              share: formatDecimal(locale, example.top.share),
            })}
          </p>
          <div class="book__mix-bars" aria-hidden="true">
            {example.shares.map((share) => (
              <span
                key={share.groupId}
                class="book__mix-bar"
                data-mix-bar={share.groupId}
                title={`${groupName(share.groupId)}: ${formatDecimal(locale, share.share)}%`}
                style={`flex-grow:${share.share};background:${color(share.groupId)}`}
              />
            ))}
          </div>
        </div>
      ))}
      <ul class="book__legend">
        {legend.map((id) => (
          <li key={id} data-legend={id}>
            <span
              class="book__key"
              aria-hidden="true"
              style={{ background: color(id) }}
            />
            {groupName(id)}
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** The example group set people.set offers, with its shares and source. */
function ExampleSet({
  locale,
  t,
}: {
  readonly locale: Locale;
  readonly t: Translate;
}) {
  return (
    <figure class="book__mix book__set" data-example-set>
      <figcaption class="book__mix-head">
        <span class="book__mix-title" data-set-title>
          {t('book.set.title')}
        </span>
      </figcaption>
      <ul class="book__set-list">
        {exampleGroupSet().map(
          (group, index) =>
            group.share !== null && (
              <li key={group.groupId} data-set-group={group.groupId}>
                <span
                  class="book__key"
                  aria-hidden="true"
                  style={{ background: groupColorOf(group.groupId, index) }}
                />
                <span data-set-name>
                  {entityName('group', { id: group.groupId }, t)}
                </span>
                <span class="book__set-share" data-set-share>
                  {`${formatDecimal(locale, group.share)}%`}
                </span>
              </li>
            ),
        )}
      </ul>
      <p class="book__mix-caption" data-set-source>
        {t('book.set.source')}
      </p>
    </figure>
  );
}

/** The opening page's starts: empty, the two ready examples, or no book (M7-16). */
function StartChoices({
  store,
  t,
}: {
  readonly store: Store;
  readonly t: Translate;
}) {
  return (
    <>
      <Purpose t={t} />
      <ul class="book__starts" aria-label={t('book.start.label')}>
        <li class="book__start" data-start-card="blank">
          <b>{t('book.start.blank.title')}</b>
          <span>{t('book.start.blank.text')}</span>
          <button
            type="button"
            class="button button--small"
            data-start="blank"
            onClick={() => store.startBook(null, false)}
          >
            {t('book.start.begin')}
          </button>
        </li>
        {START_EXAMPLES.map((id) => (
          <li
            key={id}
            class={`book__start${id === 'eight' ? ' book__start--accent' : ''}`}
            data-start-card={id}
          >
            <b>{t(`book.start.${id}.title`)}</b>
            <span>{t(`book.start.${id}.text`)}</span>
            <div class="book__start-actions">
              {([false, true] as const).map((open) => (
                <button
                  key={`${open}`}
                  type="button"
                  class={`button button--small${!open && id === 'eight' ? ' button--cta' : ''}`}
                  data-start={id}
                  data-start-mode={open ? 'open' : 'book'}
                  onClick={() => store.startBook(id, open)}
                >
                  {t(
                    open
                      ? 'book.start.open'
                      : id === 'eight'
                        ? 'book.start.eight.fill'
                        : 'book.start.book',
                  )}
                </button>
              ))}
            </div>
          </li>
        ))}
        <li class="book__start" data-start-card="skip">
          <b>{t('book.start.skip.title')}</b>
          <span>{t('book.start.skip.text')}</span>
          <button
            type="button"
            class="button button--small"
            data-action="start-skip"
            onClick={() => store.skipBook()}
          >
            {t('book.skip')}
          </button>
        </li>
      </ul>
    </>
  );
}

/** The scenario lines of one review chapter, read from the resolved answers. */
function reviewLines(
  chapter: number,
  draft: BookDraft,
  locale: Locale,
  t: Translate,
): readonly string[] {
  const parties = partyIds(draft).map((_, index) =>
    partyLabel(draft, index, t),
  );
  const groups = groupIds(draft).map((_, index) => groupLabel(draft, index, t));
  const cut = (labels: readonly string[], typed: readonly string[]) =>
    labels.map((label, index) => {
      const name = typed[index] ?? '';
      return reviewItemName(name) === name ? label : reviewItemName(name);
    });
  const cutParties = cut(parties, partyNames(draft));
  const cutGroups = cut(groups, groupNames(draft));
  const itemList = (
    names: readonly string[],
    percentOf: (index: number) => string,
  ) =>
    names
      .map((name, index) =>
        t('book.review.item', {
          name,
          percent: percentText(locale, percentOf(index)),
        }),
      )
      .join(', ');
  const first = (page: PageKey) => shownTexts(draft, page)[0] ?? '';
  switch (chapter) {
    case 1:
      return [
        t('book.review.parties', {
          count: parties.length,
          names: parties.join(', '),
        }),
      ];
    case 2:
      if (groups.length === 0) {
        return [t('book.review.noGroups')];
      }
      return [
        t('book.review.groups', {
          count: groups.length,
          names: groups.join(', '),
        }),
      ];
    case 3:
      return [
        ...(groups.length === 0
          ? []
          : [
              t('book.review.turnout', {
                items: itemList(cutGroups, (index) =>
                  first(`turnout.${index}`),
                ),
              }),
            ]),
        t('book.turnout.derived'),
      ];
    case 4: {
      const votes = shownTexts(draft, 'votes.shares');
      const derived = electorateCheck(draft, bookPages(draft));
      return [
        t('book.review.votes', {
          items: itemList(cutParties, (index) => votes[index] ?? ''),
        }),
        ...(groups.length === 0
          ? []
          : derived.length === 0
            ? [t('book.review.populationUnavailable')]
            : [
                t('book.review.derived', {
                  items: itemList(cutGroups, (index) => derived[index]!.share),
                }),
              ]),
      ];
    }
    case 5:
      if (groups.length === 0) {
        return [t('book.review.noDemographics')];
      }
      return [
        t('book.review.growthRates', {
          items: itemList(cutGroups, (index) => first(`growth.${index}`)),
        }),
        t('book.review.turnoutChange.no'),
      ];
    case 6: {
      const seats = parseCount(first('rules.seats'));
      return [
        t('book.review.seats', {
          seats:
            seats === null
              ? first('rules.seats')
              : formatInteger(locale, seats),
        }),
        t('book.review.threshold', {
          threshold: percentText(locale, first('rules.threshold')),
        }),
      ];
    }
    default:
      return [t('book.pair.summary')];
  }
}

function Review({
  store,
  locale,
  t,
}: {
  readonly store: Store;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  const { draft, answered } = store.getState().book;
  const resolved = resolveDraft(draft, answered);
  const final = resolved.draft;
  const filled = new Set(
    resolved.filled.map((page) => pageSpec(final, page).chapter),
  );
  const pages = bookPages(draft);
  const parties = partyIds(final);
  const groups = groupIds(final);
  const partyColors = parties.map((id, index) => partyColorOf(id, index));
  const groupColors = groups.map((id, index) => groupColorOf(id, index));
  const derived = electorateCheck(final, pages);
  const graphic = (chapter: number) => {
    switch (chapter) {
      case 1:
        return (
          <Keys
            names={parties.map((_, index) => partyLabel(final, index, t))}
            colors={partyColors}
          />
        );
      case 2:
        return groups.length === 0 ? null : (
          <Keys
            names={groups.map((_, index) => groupLabel(final, index, t))}
            colors={groupColors}
          />
        );
      case 4:
        return (
          <>
            <StackBar
              texts={shownTexts(final, 'votes.shares')}
              ids={parties}
              colors={partyColors}
              marker="data-review-bar"
            />
            {derived.length > 0 && (
              <StackBar
                texts={derived.map((row) => row.share)}
                ids={groups}
                colors={groupColors}
                marker="data-review-bar"
              />
            )}
          </>
        );
      default:
        return null;
    }
  };
  return (
    <div class="book__review">
      {reviewParts(draft)
        .flat()
        .map((chapter) => {
          const first =
            pages.find(
              (page) =>
                takesAnswer(page) && pageSpec(draft, page).chapter === chapter,
            ) ?? (chapter === 5 ? 'people.set' : 'intro');
          return (
            <section
              class="book__review-item"
              key={chapter}
              data-review={chapter}
              aria-labelledby={`book-review-${chapter}`}
            >
              <h2 class="book__review-title" id={`book-review-${chapter}`}>
                {t(`book.chapter.${chapter}`)}
              </h2>
              <Suggested show={filled.has(chapter)} kind="review" t={t} />
              {graphic(chapter)}
              {reviewLines(chapter, final, locale, t).map((line, index) => (
                <p class="book__review-line" key={index}>
                  {line}
                </p>
              ))}
              <button
                type="button"
                class="button button--small"
                data-action="book-edit"
                data-page={first}
                onClick={() => store.bookGoTo(first)}
              >
                {t('book.review.edit')}
              </button>
            </section>
          );
        })}
    </div>
  );
}

/** Colour keys with names, one per party or group of a review graphic. */
function Keys({
  names,
  colors,
}: {
  readonly names: readonly string[];
  readonly colors: readonly string[];
}) {
  return (
    <ul class="book__keys" data-review-keys>
      {names.map((name, index) => (
        <li key={index}>
          <span
            class="book__key"
            aria-hidden="true"
            style={{ background: colors[index] ?? PIE_REST }}
          />
          {name}
        </li>
      ))}
    </ul>
  );
}

function Facts({
  locale,
  t,
}: {
  readonly locale: Locale;
  readonly t: Translate;
}) {
  return (
    <div class="book__facts" data-facts>
      {KNESSET_FACTS.map((fact) => (
        <section class="book__fact" key={fact.year}>
          <h2 class="book__fact-title">
            {t('book.facts.election', {
              year: `${fact.year}`,
              knesset: `${fact.knesset}`,
            })}
          </h2>
          <dl class="book__fact-list">
            <div>
              <dt>{t('book.facts.ran')}</dt>
              <dd>{formatInteger(locale, fact.listsRan)}</dd>
            </div>
            <div>
              <dt>{t('book.facts.won')}</dt>
              <dd>{formatInteger(locale, fact.listsWon)}</dd>
            </div>
            <div>
              <dt>{t('book.facts.eligible')}</dt>
              <dd>{formatInteger(locale, fact.eligible)}</dd>
            </div>
            <div>
              <dt>{t('book.facts.turnout')}</dt>
              <dd>{`${formatDecimal(locale, fact.turnout)}%`}</dd>
            </div>
          </dl>
        </section>
      ))}
      <p class="book__fact-note">
        {t('book.facts.threshold', {
          since: `${THRESHOLD_FACT.since}`,
          percent: formatDecimal(locale, THRESHOLD_FACT.percent),
        })}
      </p>
      <p class="book__source">{t('book.facts.source')}</p>
    </div>
  );
}

function Confirm({
  store,
  locale,
  t,
}: {
  readonly store: Store;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  const { confirm } = store.getState().book;
  if (confirm === null) {
    return null;
  }
  return (
    <div class="book__overlay">
      <div
        class="confirm book__confirm"
        role="alertdialog"
        aria-modal="true"
        data-book-confirm={confirm}
        aria-labelledby={CONFIRM_ID}
      >
        <p id={CONFIRM_ID} class="confirm__title" data-confirm-text>
          {t(`book.confirm.${confirm}`, { count: EXAMPLE_LISTS.length })}
        </p>
        <LanguageControls store={store} locale={locale} t={t} />
        <div class="confirm__actions">
          <button
            type="button"
            class="button button--primary"
            data-action="book-confirm"
            onClick={() => store.confirmBook()}
          >
            {t('book.confirm.yes')}
          </button>
          <button
            type="button"
            class="button"
            data-action="book-cancel"
            onClick={() => store.cancelBook()}
          >
            {t('book.confirm.no')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Pages shown with their short compact question and explanation. */
const COMPACT_PAGES: readonly PageKey[] = [
  'turnout',
  'growth',
  'coalitions',
  'compose',
];

/**
 * One page of a screen (M7-19): its question, explanation, answer, error,
 * narrator and lesson, check or review content. A screen stacks one block per
 * page; only a lone page is cut into parts.
 */
function PageBlock({
  store,
  page,
  index,
  lone,
  part,
  chosenParty,
  onChoose,
  locale,
  t,
}: {
  readonly store: Store;
  readonly page: PageKey;
  /** The position of the page on its screen; the first holds the h1. */
  readonly index: number;
  /** Whether the page is alone on its screen. */
  readonly lone: boolean;
  readonly part: number;
  readonly chosenParty: number | null;
  readonly onChoose: (party: number) => void;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  const { draft, attempted, answered } = store.getState().book;
  const spec = pageSpec(draft, page);
  const suggested = takesAnswer(page) && isSuggested(draft, page);
  const parts = pageParts(draft, page);
  const last = !lone || part >= partCount(draft, page) - 1;
  const error = attempted
    ? last
      ? pageError(draft, page)
      : partError(draft, page, part)
    : null;
  const compact = COMPACT_PAGES.includes(page);
  const check = spec.kind === 'check' ? electorateCheck(draft, answered) : [];
  const mix = spec.kind === 'check' ? voterMixCheck(draft, answered) : null;
  const pie = spec.kind === 'check' ? pieOf(spec, mix) : null;
  const told = narration(draft, page);
  const question = compact
    ? t(`book.compact.${page}.question`)
    : t(`book.page.${spec.section}.question`, {
        name: subjectName(spec, draft, t) ?? '',
      });
  const explain = compact
    ? t(`book.compact.${page}.explain`)
    : t(`book.page.${spec.section}.explain`, {
        min: spec.min === null ? '' : formatDecimal(locale, spec.min),
        max: spec.max === null ? '' : formatDecimal(locale, spec.max),
      });
  const shownParty =
    chosenParty !== null && chosenParty < partyIds(draft).length
      ? chosenParty
      : page === 'compose' && error !== null && error.index !== null
        ? (childOf(draft, page, error.index) ?? 0)
        : 0;
  const Answer =
    page === 'turnout' || page === 'growth'
      ? GroupRates
      : page === 'coalitions'
        ? Relationships
        : page === 'compose'
          ? ComposeAnswer
          : spec.kind in ANSWERS
            ? ANSWERS[spec.kind as keyof typeof ANSWERS]
            : null;
  const invalid = (at: number) =>
    error !== null && (error.index === null || error.index === at);
  const params = told === null ? {} : { ...told.params };
  for (const key of DECIMAL_PARAMS) {
    const value = params[key];
    if (value !== undefined) {
      params[key] = formatDecimal(locale, value);
    }
  }
  const Heading = index === 0 ? 'h1' : 'h2';
  // M7-20: the what-is-a-group lesson is the footnote of the group question.
  const footnote = page === 'people.about';
  return (
    <section
      class={`book__text${lone ? '' : ' book__block'}${footnote ? ' book__footnote' : ''}`}
      data-book-page={page}
      data-footnote={footnote ? page : undefined}
    >
      <Heading
        class="book__question"
        id={pageId(QUESTION_ID, page)}
        data-question
        tabIndex={-1}
      >
        {question}
        {page === 'people.set' && (
          <sup class="book__footnote-ref" data-footnote-ref aria-hidden="true">
            *
          </sup>
        )}
      </Heading>
      <p class="book__explain" data-explain>
        {explain}
      </p>
      {Answer !== null && (
        <Answer
          store={store}
          spec={spec}
          draft={draft}
          texts={shownTexts(draft, page)}
          rows={lone ? (parts[part] ?? []) : parts.flat()}
          last={last}
          suggested={suggested}
          invalid={invalid}
          locale={locale}
          t={t}
          shown={shownParty}
          onShow={onChoose}
        />
      )}
      {spec.kind === 'intro' && <StartChoices store={store} t={t} />}
      {spec.kind === 'lesson' && (
        <Lesson section={spec.section} locale={locale} t={t} />
      )}
      {spec.kind === 'check' && (
        <div class="book__check-graphic">
          {pie !== null && (
            <div class="book__pie" data-pie aria-hidden="true" style={pie} />
          )}
          <CheckList
            spec={spec}
            draft={draft}
            check={check}
            mix={mix}
            locale={locale}
            t={t}
          />
        </div>
      )}
      {spec.kind === 'check' && !lone && (
        <button
          type="button"
          class="button button--small"
          data-action="book-edit"
          data-page="turnout"
          onClick={() => store.bookGoTo('turnout')}
        >
          {t('book.review.edit')}
        </button>
      )}
      {spec.section === 'people.set' && <ExampleSet locale={locale} t={t} />}
      {spec.kind === 'review' && <Review store={store} locale={locale} t={t} />}
      {error !== null && (
        <p
          class="book__error"
          data-book-error
          role="alert"
          id={pageId(ERROR_ID, page)}
        >
          {errorText(error, locale, t)}
        </p>
      )}
      {told !== null && (
        <div class="book__narrator">
          <p data-narrator role="status">
            {t(`book.narrator.${told.variant}`, params)}
          </p>
          {FACT_SECTIONS.includes(spec.section) && (
            <button
              type="button"
              class="button button--small"
              data-action="open-fact"
              onClick={() => store.openFact()}
            >
              {t('book.facts.open')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Section 14.5 questionnaire screen: the pages of one screen stacked (M7-19),
 * or the facts page, no results.
 */
export function BookView({ store, t, locale }: BookViewProps) {
  const { book } = store.getState();
  const { draft, page, part, facts, confirm, answered } = book;
  const sheet = useRef<HTMLFormElement>(null);
  const [chosenParty, setChosenParty] = useState<number | null>(null);

  useEffect(() => {
    setChosenParty(null);
  }, [page]);

  useEffect(() => {
    const root = sheet.current;
    if (root === null) {
      return;
    }
    const target =
      confirm === null
        ? root.querySelector<HTMLElement>('[data-question]')
        : root.querySelector<HTMLElement>('[data-action="book-confirm"]');
    target?.focus();
  }, [page, facts, confirm, part]);

  const spec = pageSpec(draft, page);
  const screen = screenOf(draft, page);
  const lone = screen.length === 1;
  const count = lone ? partCount(draft, page) : 1;
  const last = part >= count - 1;
  const blocked = confirm !== null;
  const compact = screen.some(
    (shown) => COMPACT_PAGES.includes(shown) || shown === 'votes.shares',
  );
  const figure = facts || (lone && !compact);
  const caption = facts ? null : (CAPTIONS[spec.section] ?? null);

  return (
    <main
      class="book"
      data-book
      data-page={facts ? 'facts' : page}
      data-part={facts ? 0 : part}
      data-screen={facts ? 1 : screen.length}
      data-compact={compact ? '' : undefined}
    >
      <form
        class="book__sheet"
        ref={sheet}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setChosenParty(null);
          store.bookNext();
        }}
      >
        <Head
          store={store}
          spec={spec}
          part={part}
          parts={facts ? 1 : count}
          inert={blocked}
          locale={locale}
          t={t}
        />
        <div
          class={`book__body${
            // M7-20: the opening scrolls inside too, its purpose card open.
            facts || (lone && page !== 'review' && page !== 'intro')
              ? ''
              : ' book__body--screen'
          }`}
          inert={blocked}
        >
          {facts ? (
            <div class="book__text">
              <h1
                class="book__question"
                id={pageId(QUESTION_ID, 'intro')}
                data-question
                tabIndex={-1}
              >
                {t('book.facts.title')}
              </h1>
              <p class="book__explain" data-explain>
                {t('book.facts.explain')}
              </p>
              <Facts locale={locale} t={t} />
            </div>
          ) : (
            <div class={lone ? 'book__stack book__stack--lone' : 'book__stack'}>
              {screen.map((shown, index) => (
                <PageBlock
                  key={shown}
                  store={store}
                  page={shown}
                  index={index}
                  lone={lone}
                  part={part}
                  chosenParty={chosenParty}
                  onChoose={setChosenParty}
                  locale={locale}
                  t={t}
                />
              ))}
            </div>
          )}
          {figure && (
            <Figure
              key={facts ? 'facts' : `${page}#${part}`}
              motif={facts ? 'coin' : spec.motif}
              pie={null}
              palms={!facts && (page === 'intro' || page === 'review')}
              caption={caption}
              t={t}
            />
          )}
        </div>
        <nav class="book__nav" aria-label={t('book.nav')} inert={blocked}>
          <button
            type="button"
            class="button"
            data-action="book-skip"
            onClick={() => store.skipBook()}
          >
            {t('book.skip')}
          </button>
          {!facts &&
            (spec.kind === 'review' ||
              (spec.kind === 'intro' && answered.length > 0)) && (
              <button
                type="button"
                class="button"
                data-action="book-restart"
                onClick={() => store.restartBook()}
              >
                {t('book.restart')}
              </button>
            )}
          <div class="book__steps">
            {facts ? (
              <button
                type="button"
                class="button"
                data-action="close-fact"
                onClick={() => store.closeFact()}
              >
                {t('book.facts.close')}
              </button>
            ) : (
              <button
                type="button"
                class="button"
                data-action="book-back"
                disabled={page === 'intro'}
                onClick={() => store.bookBack()}
              >
                {t('book.back')}
              </button>
            )}
            {facts ? null : page === 'review' && last ? (
              <button
                type="button"
                class="button button--primary"
                data-action="book-build"
                onClick={() => store.buildBook()}
              >
                {t('book.build')}
              </button>
            ) : (
              <button
                type="submit"
                class="button button--primary"
                data-action="book-next"
              >
                {t('book.next')}
              </button>
            )}
          </div>
        </nav>
        <Confirm store={store} locale={locale} t={t} />
      </form>
    </main>
  );
}
