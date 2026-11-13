/**
 * Section 14.5 questionnaire book: a language-free draft of raw answers kept
 * apart from the scenario, the page list derived from it, suggestions,
 * validation, the narrator's choice and the build through the editor's edits.
 */

import {
  buildCompositionReport,
  electorateComposition,
  voteSources,
} from '../engine/composition';
import {
  addPair,
  PALETTE,
  setGroupFraction,
  setPartyEligibility,
  setRule,
  STANDARD_VALID_BALLOT_RATE,
  type Draft,
} from '../engine/edit';
import {
  castingGroups,
  deriveElectorate,
  deriveOverallTurnout,
  describeElectorate,
  describeVoterMix,
  type DescribedElectorate,
  type VoterMix,
} from '../engine/electorate';
import {
  evenPercents,
  fractionParts,
  fractionToPercent,
  parseCount,
  percentToExactFraction,
  percentRemainder,
  percentToFraction,
  percentWithin,
  roundPercents,
  scalePercents,
} from '../engine/numeric';
import { runSeats } from '../engine/run';
import { SCHEMA_VERSION, validateScenario } from '../engine/schema';
import {
  CATALOG_GROUPS,
  CATALOG_LISTS,
  catalogListColor,
  EXAMPLE_LISTS,
  type CatalogEntry,
} from './catalog';
import { EXAMPLE_GROUPS, presetInput } from './presets';
import type { StartExampleId } from './startExamples';
type Json = Record<string, unknown>;

/** `intro`, `review`, a section key, or a section key and a position. */
export type PageKey = string;

export type Section =
  | 'intro'
  | 'parties.count'
  | 'parties.naming'
  | 'parties.names'
  | 'people.about'
  | 'people.mix'
  | 'people.set'
  | 'people.count'
  | 'people.names'
  | 'turnout'
  | 'overall.turnout'
  | 'votes.shares'
  | 'compose'
  | 'votes.check'
  | 'growth.ask'
  | 'growth'
  | 'turnoutChange.ask'
  | 'turnoutChange'
  | 'rules.seats'
  | 'rules.threshold'
  | 'coalitions.mode'
  | 'coalitions'
  | 'review';

export type PageKind =
  | 'intro'
  | 'count'
  | 'choice'
  | 'names'
  | 'percents'
  | 'percent'
  | 'coalition'
  | 'lesson'
  | 'check'
  | 'review';

export type Motif =
  | 'menorah'
  | 'ballots'
  | 'people'
  | 'pie'
  | 'ballot-box'
  | 'calendar'
  | 'knesset'
  | 'threshold'
  | 'table'
  | 'coin';

/** The texts of one page as last edited, with the shape they were typed for. */
export interface StoredAnswer {
  readonly shape: string;
  readonly texts: readonly string[];
}

export interface BookDraft {
  readonly values: Readonly<Record<string, StoredAnswer>>;
}

export const EMPTY_DRAFT: BookDraft = { values: {} };

export interface PageSpec {
  readonly key: PageKey;
  readonly section: Section;
  readonly kind: PageKind;
  /** 0 for the opening page, then 1 to CHAPTER_COUNT. */
  readonly chapter: number;
  readonly motif: Motif;
  /** The group or party the page is about. */
  readonly subject: string | null;
  /** Position among the pages of the same section, 1-based. */
  readonly step: { readonly n: number; readonly count: number } | null;
  readonly entityKind: 'party' | 'group' | null;
  /** Entity IDs, one per input of a names, percents or coalition page. */
  readonly fields: readonly string[];
  readonly choices: readonly string[];
  readonly min: string | null;
  readonly max: string | null;
}

export type BookErrorCode = 'count' | 'percent' | 'sum' | 'length' | 'choice';

export interface BookError {
  readonly code: BookErrorCode;
  readonly index: number | null;
  readonly min: string | null;
  readonly max: string | null;
  readonly remainder: string | null;
}

/** A narrator variant and its parameters as ASCII decimal strings. */
export interface Narration {
  readonly variant: string;
  readonly params: Readonly<Record<string, string>>;
}

export interface FilledItem {
  readonly section: Section;
  readonly entity: string | null;
}

export interface BookBuild {
  readonly input: Json;
  readonly filled: readonly FilledItem[];
}

export type BookConfirm =
  'replace-build' | 'replace-skip' | 'restart' | 'example-count';

/** An opening-page start waiting for its confirmation (M7-16). */
export interface BookStart {
  /** The example's ID, or null for an empty book. */
  readonly example: StartExampleId | null;
  /** Whether the example opens on Coalitions instead of its first page. */
  readonly open: boolean;
}

export interface BookState {
  readonly draft: BookDraft;
  readonly page: PageKey;
  readonly answered: readonly PageKey[];
  readonly attempted: boolean;
  readonly facts: boolean;
  readonly confirm: BookConfirm | null;
  /** The part of the page on screen, from 0. */
  readonly part: number;
  readonly start?: BookStart | null;
  /**
   * Lock rows the person touched, by page key ('votes.shares') or
   * 'compose:<partyId>'. An absent key keeps the default locks (M7-20).
   */
  readonly locks?: Readonly<Record<string, readonly number[]>>;
}

export const EMPTY_BOOK: BookState = {
  draft: EMPTY_DRAFT,
  page: 'intro',
  answered: [],
  attempted: false,
  facts: false,
  confirm: null,
  part: 0,
};

export const CHAPTER_COUNT = 8;

export const BOOK_SCENARIO_ID = 'questionnaire';

export const BOOK_LIMITS = {
  minParties: 2,
  maxParties: 10,
  minGroups: 1,
  maxGroups: 8,
  maxSeats: 10000,
  /** Names fields of a names page shown at once. */
  namesPerPage: 8,
  nameLength: 60,
  /** A typed name longer than this is cut in a review list of percents. */
  longName: 32,
  /** Characters a typed name longer than `longName` keeps in a review list of percents. */
  reviewItemName: 24,
  /** Estimated lines that one review part holds. */
  reviewLines: 14,
  /** Lines of a review chapter besides its scenario text: title, button. */
  reviewChapterLines: 3,
  /** Characters of a review line. */
  reviewLineChars: 64,
  /** Characters counted for a name nobody typed. */
  reviewShortName: 10,
  /** Characters counted for a name of the example group set. */
  reviewGroupName: 32,
} as const;

export interface KnessetFact {
  readonly year: number;
  readonly knesset: number;
  readonly listsRan: number;
  readonly listsWon: number;
  readonly eligible: number;
  /** Percent of eligible voters, as an ASCII decimal. */
  readonly turnout: string;
}

/** Central Elections Committee results for the 24th and 25th Knesset. */
export const KNESSET_FACTS: readonly KnessetFact[] = [
  {
    year: 2021,
    knesset: 24,
    listsRan: 39,
    listsWon: 13,
    eligible: 6578084,
    turnout: '67.44',
  },
  {
    year: 2022,
    knesset: 25,
    listsRan: 40,
    listsWon: 10,
    eligible: 6788804,
    turnout: '70.63',
  },
];

/** The threshold in force since the 2014 amendment, as a percent. */
export const THRESHOLD_FACT = { since: 2014, percent: '3.25' } as const;

type Naming = 'own' | 'catalog' | 'example';
type GroupSet = 'example' | 'own';

const NAMING_CHOICES: readonly string[] = ['own', 'catalog', 'example'];
const SET_CHOICES: readonly string[] = ['example', 'own'];
const ASK_CHOICES: readonly string[] = ['no', 'yes'];
const MODE_CHOICES: readonly string[] = ['all', 'custom'];
const FLAG_CHOICES: readonly string[] = ['yes', 'no'];

const EXAMPLE_COUNT = EXAMPLE_LISTS.length;
const NAME_LENGTH = BOOK_LIMITS.nameLength;

const PLAIN_SECTIONS: readonly Section[] = [
  'intro',
  'parties.count',
  'parties.naming',
  'parties.names',
  'people.about',
  'people.mix',
  'people.set',
  'people.count',
  'people.names',
  'turnout',
  'growth',
  'coalitions',
  'overall.turnout',
  'votes.shares',
  'compose',
  'votes.check',
  'growth.ask',
  'turnoutChange.ask',
  'rules.seats',
  'rules.threshold',
  'coalitions.mode',
  'review',
];

const INDEXED_SECTIONS: readonly Section[] = [
  'turnout',
  'compose',
  'growth',
  'turnoutChange',
  'coalitions',
];

/** Sections with one page per group. */
const GROUP_SECTIONS: readonly Section[] = [
  'turnout',
  'growth',
  'turnoutChange',
];

interface SectionMeta {
  readonly kind: PageKind;
  readonly chapter: number;
  readonly motif: Motif;
}

const SECTION_META: Readonly<Record<Section, SectionMeta>> = {
  intro: { kind: 'intro', chapter: 0, motif: 'menorah' },
  'parties.count': { kind: 'count', chapter: 1, motif: 'ballots' },
  'parties.naming': { kind: 'choice', chapter: 1, motif: 'ballots' },
  'parties.names': { kind: 'names', chapter: 1, motif: 'ballots' },
  'people.about': { kind: 'lesson', chapter: 2, motif: 'people' },
  'people.mix': { kind: 'lesson', chapter: 2, motif: 'people' },
  'people.set': { kind: 'choice', chapter: 2, motif: 'people' },
  'people.count': { kind: 'count', chapter: 2, motif: 'people' },
  'people.names': { kind: 'names', chapter: 2, motif: 'people' },
  turnout: { kind: 'percent', chapter: 3, motif: 'ballot-box' },
  'overall.turnout': { kind: 'percent', chapter: 3, motif: 'ballot-box' },
  'votes.shares': { kind: 'percents', chapter: 4, motif: 'pie' },
  compose: { kind: 'percents', chapter: 4, motif: 'pie' },
  'votes.check': { kind: 'check', chapter: 4, motif: 'pie' },
  'growth.ask': { kind: 'choice', chapter: 5, motif: 'calendar' },
  growth: { kind: 'percent', chapter: 5, motif: 'calendar' },
  'turnoutChange.ask': { kind: 'choice', chapter: 5, motif: 'calendar' },
  turnoutChange: { kind: 'percent', chapter: 5, motif: 'calendar' },
  'rules.seats': { kind: 'count', chapter: 6, motif: 'knesset' },
  'rules.threshold': { kind: 'percent', chapter: 6, motif: 'threshold' },
  'coalitions.mode': { kind: 'choice', chapter: 7, motif: 'table' },
  coalitions: { kind: 'coalition', chapter: 7, motif: 'table' },
  review: { kind: 'review', chapter: 8, motif: 'knesset' },
};

const CHOICES: Partial<Record<Section, readonly string[]>> = {
  'parties.naming': NAMING_CHOICES,
  'people.set': SET_CHOICES,
  'growth.ask': ASK_CHOICES,
  'turnoutChange.ask': ASK_CHOICES,
  'coalitions.mode': MODE_CHOICES,
};

const LIMITS_OF: Partial<Record<Section, readonly [string, string]>> = {
  'parties.count': [`${BOOK_LIMITS.minParties}`, `${BOOK_LIMITS.maxParties}`],
  'people.count': [`${BOOK_LIMITS.minGroups}`, `${BOOK_LIMITS.maxGroups}`],
  'rules.seats': ['1', `${BOOK_LIMITS.maxSeats}`],
  'votes.shares': ['0', '100'],
  compose: ['0', '100'],
  turnout: ['1', '100'],
  'overall.turnout': ['0', '100'],
  'rules.threshold': ['0', '100'],
  growth: ['-100', '100'],
  turnoutChange: ['-100', '100'],
};

const FIXED_SUGGESTION: Partial<Record<Section, string>> = {
  'parties.count': '4',
  'parties.naming': 'catalog',
  'people.count': '4',
  turnout: '70',
  'overall.turnout': '70',
  'growth.ask': 'no',
  growth: '0',
  'turnoutChange.ask': 'no',
  turnoutChange: '0',
  'rules.seats': '120',
  'rules.threshold': '3.25',
  'coalitions.mode': 'all',
};

interface ParsedPage {
  readonly section: Section;
  readonly index: number;
}

function parsePage(page: PageKey): ParsedPage | null {
  if ((PLAIN_SECTIONS as readonly string[]).includes(page)) {
    return { section: page as Section, index: 0 };
  }
  const dot = page.lastIndexOf('.');
  const section = page.slice(0, dot);
  const suffix = page.slice(dot + 1);
  const index = suffix === '0' ? 0 : parseCount(suffix);
  if (
    dot < 0 ||
    !(INDEXED_SECTIONS as readonly string[]).includes(section) ||
    index === null ||
    `${index}` !== suffix
  ) {
    return null;
  }
  return { section: section as Section, index };
}

/** A page that takes answers: not the opening page, a lesson, the check or the review. */
function answerPage(page: PageKey): ParsedPage | null {
  const parsed = parsePage(page);
  if (parsed === null) {
    return null;
  }
  const { kind } = SECTION_META[parsed.section];
  return kind === 'intro' ||
    kind === 'lesson' ||
    kind === 'check' ||
    kind === 'review'
    ? null
    : parsed;
}

/** One field of a names page: the catalog entry picked, or '' and a name. */
interface NamePair {
  readonly pick: string;
  readonly name: string;
}

function isNames(section: Section): boolean {
  return section === 'parties.names' || section === 'people.names';
}

function catalogOf(section: Section): readonly CatalogEntry[] {
  return section === 'parties.names' ? CATALOG_LISTS : CATALOG_GROUPS;
}

function isEntry(section: Section, id: string): boolean {
  return catalogOf(section).some((entry) => entry.id === id);
}

/** The pick a party field starts with under the naming; groups start own. */
function defaultPick(naming: Naming, section: Section, slot: number): string {
  if (section !== 'parties.names') {
    return '';
  }
  if (naming === 'catalog') {
    return CATALOG_LISTS[slot]?.id ?? '';
  }
  return naming === 'example' ? (EXAMPLE_LISTS[slot] ?? '') : '';
}

function namesShape(naming: Naming, section: Section): string {
  return section === 'parties.names' ? naming : '';
}

/**
 * The fields of a names page as shown: the stored pairs cut or padded with
 * the defaults to the count. A stale or repeated pick becomes its field's
 * default when that is free, else the first free list, else own; a picked
 * field has no name.
 */
function namePairs(
  draft: BookDraft,
  section: Section,
  naming: Naming,
  count: number,
): readonly NamePair[] {
  const stored = draft.values[section];
  const texts =
    stored !== undefined && stored.shape === namesShape(naming, section)
      ? stored.texts
      : [];
  const raw = Array.from({ length: count }, (_, slot) => ({
    pick: texts[2 * slot] ?? defaultPick(naming, section, slot),
    name: texts[2 * slot + 1] ?? '',
  }));
  const taken = new Set<string>();
  const kept = raw.map(({ pick }) => {
    if (pick === '' || !isEntry(section, pick) || taken.has(pick)) {
      return false;
    }
    taken.add(pick);
    return true;
  });
  return raw.map((pair, slot) => {
    if (pair.pick === '') {
      return pair;
    }
    if (kept[slot] === true) {
      return { pick: pair.pick, name: '' };
    }
    const fallback = defaultPick(naming, section, slot);
    const pick =
      fallback === ''
        ? ''
        : !taken.has(fallback)
          ? fallback
          : (CATALOG_LISTS.find((list) => !taken.has(list.id))?.id ?? '');
    if (pick !== '') {
      taken.add(pick);
    }
    return { pick, name: pick === '' ? pair.name : '' };
  });
}

function flatPairs(pairs: readonly NamePair[]): readonly string[] {
  return pairs.flatMap((pair) => [pair.pick, pair.name]);
}

/** The values every other page depends on, read from the shown answers. */
interface Context {
  readonly count: number;
  readonly naming: Naming;
  readonly set: GroupSet;
  readonly groups: number;
  readonly growth: boolean;
  readonly turnoutChange: boolean;
  readonly custom: boolean;
  readonly parties: readonly string[];
  readonly groupIds: readonly string[];
  readonly partyPairs: readonly NamePair[];
  readonly groupPairs: readonly NamePair[];
}

function single(draft: BookDraft, page: PageKey): string | null {
  const stored = draft.values[page];
  return stored !== undefined &&
    stored.shape === '' &&
    stored.texts.length === 1
    ? stored.texts[0]!
    : null;
}

function countWithin(text: string | null, min: number, max: number) {
  const count = text === null ? null : parseCount(text);
  return count !== null && count >= min && count <= max ? count : null;
}

/** The pick of each field, or the numbered own ID where none is picked. */
function idsOf(pairs: readonly NamePair[], prefix: string): readonly string[] {
  return pairs.map((pair, slot) =>
    pair.pick === '' ? `${prefix}${slot + 1}` : pair.pick,
  );
}

function context(draft: BookDraft): Context {
  const count =
    countWithin(
      single(draft, 'parties.count'),
      BOOK_LIMITS.minParties,
      BOOK_LIMITS.maxParties,
    ) ?? 4;
  const namingText = single(draft, 'parties.naming');
  const naming: Naming =
    namingText !== null &&
    NAMING_CHOICES.includes(namingText) &&
    !(namingText === 'example' && count !== EXAMPLE_COUNT)
      ? (namingText as Naming)
      : 'catalog';
  const setText = single(draft, 'people.set');
  const set: GroupSet =
    setText !== null && SET_CHOICES.includes(setText)
      ? (setText as GroupSet)
      : 'example';
  const groups =
    set === 'example'
      ? CATALOG_GROUPS.length
      : (countWithin(
          single(draft, 'people.count'),
          BOOK_LIMITS.minGroups,
          BOOK_LIMITS.maxGroups,
        ) ?? 4);
  const partyPairs = namePairs(draft, 'parties.names', naming, count);
  const groupPairs = namePairs(draft, 'people.names', naming, groups);
  return {
    count,
    naming,
    set,
    groups,
    growth: single(draft, 'growth.ask') === 'yes',
    turnoutChange: single(draft, 'turnoutChange.ask') === 'yes',
    custom: single(draft, 'coalitions.mode') === 'custom',
    parties: idsOf(partyPairs, 'P'),
    groupIds:
      set === 'example'
        ? CATALOG_GROUPS.map((group) => group.id)
        : idsOf(groupPairs, 'G'),
    partyPairs,
    groupPairs,
  };
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/** What the stored texts were typed for; a mismatch shows the suggestion. */
function shapeOf(ctx: Context, section: Section): string {
  switch (section) {
    case 'parties.names':
    case 'people.names':
      return namesShape(ctx.naming, section);
    case 'votes.shares':
      return ctx.parties.join(',');
    case 'compose':
      return `${ctx.parties.join(',')}:${ctx.set}:${ctx.groupIds.join(',')}`;
    case 'turnout':
    case 'growth':
    case 'turnoutChange':
      return ctx.set;
    case 'coalitions':
      return ctx.parties.join(',');
    default:
      return '';
  }
}

function pairsOf(ctx: Context, section: Section): readonly NamePair[] {
  return section === 'parties.names' ? ctx.partyPairs : ctx.groupPairs;
}

function textCount(ctx: Context, { section }: ParsedPage): number {
  if (isNames(section)) {
    return 2 * pairsOf(ctx, section).length;
  }
  if (section === 'compose' || section === 'votes.check') {
    return ctx.groups;
  }
  if (section === 'votes.shares') {
    return ctx.count;
  }
  return section === 'coalitions' ? ctx.count + 1 : 1;
}

function examplePercents(column: number | null): readonly string[] {
  return EXAMPLE_GROUPS.map(
    ([, share, weights]) =>
      fractionToPercent(column === null ? share : (weights[column] ?? '0')) ??
      '0',
  );
}

/** The 2022 population share of each example group by ID, in percent. */
function exampleShares(): ReadonlyMap<string, string> {
  const shares = examplePercents(null);
  return new Map(
    EXAMPLE_GROUPS.map(([groupId], at) => [groupId, shares[at] ?? '0']),
  );
}

function exampleRow(group: number): readonly string[] {
  const row = EXAMPLE_GROUPS[group];
  return row === undefined
    ? []
    : row[2].map((weight) => fractionToPercent(weight) ?? '0');
}

/** Decimals of the example vote shares; one decimal would move a seat. */
const EXAMPLE_SHARE_PLACES = 2;
/** Decimals of the example compositions. */
const EXAMPLE_COMPOSITION_PLACES = 1;

/** The suggested turnout of an example group (M7-19); others take the fixed one. */
const GROUP_TURNOUT: Readonly<Record<string, string>> = {
  haredi: '85',
  arab: '70',
};

function groupTurnout(groupId: string): string {
  return GROUP_TURNOUT[groupId] ?? FIXED_SUGGESTION.turnout ?? '70';
}

let describedCache: DescribedElectorate | null = null;

/**
 * The Section 14.4 example described by party: each list's vote share and
 * the groups its voters come from, at the suggested turnout.
 */
function describedExample(): DescribedElectorate | null {
  describedCache ??= describeElectorate(
    examplePercents(null),
    EXAMPLE_GROUPS.map(([groupId]) => groupTurnout(groupId)),
    EXAMPLE_GROUPS.map((_, group) => exampleRow(group)),
    EXAMPLE_SHARE_PLACES,
    EXAMPLE_COMPOSITION_PLACES,
  );
  return describedCache;
}

/** Whether both the six-list set and the example groups are chosen. */
function isFullExample(ctx: Context): boolean {
  return sameIds(ctx.parties, EXAMPLE_LISTS) && ctx.set === 'example';
}

function suggestion(ctx: Context, parsed: ParsedPage): readonly string[] {
  const { section, index } = parsed;
  if (section === 'turnout') {
    return [groupTurnout(ctx.groupIds[index] ?? '')];
  }
  const fixed = FIXED_SUGGESTION[section];
  if (fixed !== undefined) {
    return [fixed];
  }
  switch (section) {
    case 'people.set':
      return ['example'];
    case 'votes.shares': {
      const example = isFullExample(ctx) ? describedExample() : null;
      return example?.partyShares ?? evenPercents(ctx.count);
    }
    case 'compose': {
      if (ctx.groups === 0) {
        return [];
      }
      const example = isFullExample(ctx)
        ? describedExample()?.compositions[index]
        : undefined;
      return example === undefined
        ? evenPercents(ctx.groups)
        : ctx.groupIds.map((id) => {
            const at = EXAMPLE_GROUPS.findIndex(([groupId]) => groupId === id);
            return at < 0 ? '0' : (example[at] ?? '0');
          });
    }
    case 'coalitions':
      return Array.from({ length: ctx.count + 1 }, () => 'yes');
    case 'parties.names':
    case 'people.names':
      return flatPairs(pairsOf(ctx, section));
    default:
      return Array.from({ length: textCount(ctx, parsed) }, () => '');
  }
}

/** The stored texts when they still fit the page, otherwise null. */
function usable(
  draft: BookDraft,
  ctx: Context,
  page: PageKey,
  parsed: ParsedPage,
): readonly string[] | null {
  const stored = draft.values[page];
  if (stored === undefined || stored.shape !== shapeOf(ctx, parsed.section)) {
    return null;
  }
  if (isNames(parsed.section)) {
    return flatPairs(pairsOf(ctx, parsed.section));
  }
  if (stored.texts.length !== textCount(ctx, parsed)) {
    return null;
  }
  if (
    parsed.section === 'parties.naming' &&
    stored.texts[0] === 'example' &&
    ctx.count !== EXAMPLE_COUNT
  ) {
    return null;
  }
  return stored.texts;
}

function rawTexts(
  draft: BookDraft,
  ctx: Context,
  page: PageKey,
  parsed: ParsedPage,
): readonly string[] {
  return usable(draft, ctx, page, parsed) ?? suggestion(ctx, parsed);
}

function shown(
  draft: BookDraft,
  ctx: Context,
  page: PageKey,
  parsed: ParsedPage,
): readonly string[] {
  const texts = rawTexts(draft, ctx, page, parsed);
  if (parsed.section !== 'coalitions') {
    return texts;
  }
  // The party's own column is not a question: it always cooperates with itself.
  const own = 1 + parsed.index;
  return texts.map((text, field) => (field === own ? 'yes' : text));
}

function indexed(section: Section, count: number): readonly PageKey[] {
  return Array.from({ length: count }, (_, index) => `${section}.${index}`);
}

/** Overview pages confirm the same exact individual answers as the old draft API. */
function compactChildren(
  draft: BookDraft,
  page: PageKey,
): readonly PageKey[] | null {
  if (page === 'turnout' || page === 'growth')
    return indexed(page, context(draft).groups);
  if (page === 'coalitions' || page === 'compose')
    return indexed(page, context(draft).count);
  return null;
}

/** Texts per child of an overview page: a party's row or one group's value. */
function compactWidth(draft: BookDraft, page: PageKey): number {
  const ctx = context(draft);
  return page === 'coalitions'
    ? ctx.count + 1
    : page === 'compose'
      ? ctx.groups
      : 1;
}

/** The child position behind an overview page's index, or null. */
export function childOf(
  draft: BookDraft,
  page: PageKey,
  index: number,
): number | null {
  const children = compactChildren(draft, page);
  const width = compactWidth(draft, page);
  if (children === null || width <= 0 || index < 0) return null;
  const at = (index - (index % width)) / width;
  return at < children.length ? at : null;
}

/** The child page and its own text index behind an overview page's index. */
function compactChild(
  draft: BookDraft,
  page: PageKey,
  index: number,
): { readonly page: PageKey; readonly index: number } | null {
  const children = compactChildren(draft, page);
  const at = childOf(draft, page, index);
  const child = at === null ? undefined : children?.[at];
  return child === undefined
    ? null
    : { page: child, index: index % compactWidth(draft, page) };
}

export function bookPages(draft: BookDraft): readonly PageKey[] {
  const ctx = context(draft);
  return [
    'intro',
    'parties.count',
    'parties.naming',
    'parties.names',
    // M7-20: the group question with its names first; the lesson closes the
    // chapter as the question's footnote, the mix example under it.
    'people.set',
    ...(ctx.set === 'own' ? ['people.count', 'people.names'] : []),
    'people.about',
    'people.mix',
    ...(ctx.groups === 0 ? [] : ['turnout']),
    'votes.shares',
    ...(ctx.groups === 0 ? [] : ['compose', 'votes.check', 'growth']),
    // M7-20: cooperation first, then the threshold, then the seat count.
    'coalitions',
    'rules.threshold',
    'rules.seats',
    'review',
  ];
}

export function pageSpec(draft: BookDraft, page: PageKey): PageSpec {
  const parsed = parsePage(page);
  if (parsed === null) {
    throw new RangeError(`Unknown questionnaire page ${page}`);
  }
  const ctx = context(draft);
  const { section, index } = parsed;
  let subject: string | null = null;
  let step: PageSpec['step'] = null;
  let entityKind: PageSpec['entityKind'] = null;
  let fields: readonly string[] = [];
  if (isNames(section)) {
    entityKind = section === 'parties.names' ? 'party' : 'group';
    fields = section === 'parties.names' ? ctx.parties : ctx.groupIds;
  } else if (section === 'votes.shares') {
    entityKind = 'party';
    fields = ctx.parties;
  } else if (section === 'votes.check') {
    entityKind = 'group';
    fields = ctx.groupIds;
  } else if (section === 'compose') {
    subject = ctx.parties[index] ?? null;
    step = { n: index + 1, count: ctx.count };
    entityKind = 'group';
    fields = ctx.groupIds;
  } else if ((GROUP_SECTIONS as readonly string[]).includes(section)) {
    subject = ctx.groupIds[index] ?? null;
    step = { n: index + 1, count: ctx.groups };
  } else if (section === 'coalitions') {
    subject = ctx.parties[index] ?? null;
    step = { n: index + 1, count: ctx.count };
    entityKind = 'party';
    fields = ctx.parties;
  }
  const limits = LIMITS_OF[section];
  if (compactChildren(draft, page) !== null) {
    subject = null;
    step = null;
    entityKind = page === 'coalitions' ? 'party' : 'group';
    fields = page === 'coalitions' ? ctx.parties : ctx.groupIds;
  }
  return {
    key: page,
    section,
    ...SECTION_META[section],
    ...(section === 'overall.turnout' && ctx.groups > 0 ? { chapter: 4 } : {}),
    subject,
    step,
    entityKind,
    fields,
    choices: CHOICES[section] ?? [],
    min: limits?.[0] ?? null,
    max: limits?.[1] ?? null,
  };
}

function neighbour(draft: BookDraft, page: PageKey, offset: number) {
  const pages = bookPages(draft);
  const at = pages.indexOf(page);
  return at < 0 ? null : (pages[at + offset] ?? null);
}

export function nextPage(draft: BookDraft, page: PageKey): PageKey | null {
  return neighbour(draft, page, 1);
}

export function previousPage(draft: BookDraft, page: PageKey): PageKey | null {
  return neighbour(draft, page, -1);
}

export function shownTexts(draft: BookDraft, page: PageKey): readonly string[] {
  const children = compactChildren(draft, page);
  if (children !== null)
    return children.flatMap((child) => shownTexts(draft, child));
  const parsed = answerPage(page);
  return parsed === null ? [] : shown(draft, context(draft), page, parsed);
}

export function isSuggested(draft: BookDraft, page: PageKey): boolean {
  const children = compactChildren(draft, page);
  if (children !== null)
    return children.every((child) => isSuggested(draft, child));
  const parsed = answerPage(page);
  return (
    parsed !== null && usable(draft, context(draft), page, parsed) === null
  );
}

function store(
  values: Record<string, StoredAnswer>,
  ctx: Context,
  page: PageKey,
  parsed: ParsedPage,
  texts: readonly string[],
): void {
  values[page] = { shape: shapeOf(ctx, parsed.section), texts };
}

/** Whether the page takes answers: not the opening page, a lesson or the review. */
export function takesAnswer(page: PageKey): boolean {
  return answerPage(page) !== null;
}

/**
 * A names page after one edit: an even index picks a catalog entry or own
 * (''), an odd index types the name and makes the field own. A pick held by
 * another field swaps the two fields; anything else is not an edit.
 */
function editNames(
  pairs: readonly NamePair[],
  section: Section,
  index: number,
  text: string,
): readonly NamePair[] | null {
  const odd = index % 2 === 1;
  const slot = (index - (odd ? 1 : 0)) / 2;
  const current = pairs[slot];
  if (index < 0 || current === undefined) {
    return null;
  }
  const next = [...pairs];
  if (odd) {
    next[slot] = { pick: '', name: text };
    return next;
  }
  if (text === '') {
    next[slot] = { pick: '', name: current.name };
    return next;
  }
  if (!isEntry(section, text)) {
    return null;
  }
  const holder = pairs.findIndex(
    (pair, at) => at !== slot && pair.pick === text,
  );
  if (holder >= 0) {
    next[holder] = current;
  }
  next[slot] = { pick: text, name: '' };
  return next;
}

export function editPage(
  draft: BookDraft,
  page: PageKey,
  index: number,
  text: string,
): BookDraft {
  const children = compactChildren(draft, page);
  if (children !== null) {
    const child = compactChild(draft, page, index);
    return child === null
      ? draft
      : editPage(draft, child.page, child.index, text);
  }
  const parsed = answerPage(page);
  if (parsed === null) {
    return draft;
  }
  const ctx = context(draft);
  if (isNames(parsed.section)) {
    const pairs = editNames(
      pairsOf(ctx, parsed.section),
      parsed.section,
      index,
      text,
    );
    if (pairs === null) {
      return draft;
    }
    const values = { ...draft.values };
    store(values, ctx, page, parsed, flatPairs(pairs));
    return { values };
  }
  const texts = [...shown(draft, ctx, page, parsed)];
  if (index < 0 || index >= texts.length) {
    return draft;
  }
  texts[index] = text;
  const values = { ...draft.values };
  store(values, ctx, page, parsed, texts);
  return { values };
}

export function confirmPage(draft: BookDraft, page: PageKey): BookDraft {
  const children = compactChildren(draft, page);
  if (children !== null) return children.reduce(confirmPage, draft);
  const parsed = answerPage(page);
  if (parsed === null) {
    return draft;
  }
  const ctx = context(draft);
  const values = { ...draft.values };
  store(values, ctx, page, parsed, shown(draft, ctx, page, parsed));
  return { values };
}

function error(
  code: BookErrorCode,
  index: number | null,
  min: string | null = null,
  max: string | null = null,
  rest: string | null = null,
): BookError {
  return { code, index, min, max, remainder: rest };
}

export function pageError(draft: BookDraft, page: PageKey): BookError | null {
  const children = compactChildren(draft, page);
  if (children !== null) {
    const width = compactWidth(draft, page);
    for (let index = 0; index < children.length; index += 1) {
      const wrong = pageError(draft, children[index]!);
      if (wrong !== null)
        return { ...wrong, index: index * width + (wrong.index ?? 0) };
    }
    return null;
  }
  const parsed = answerPage(page);
  if (parsed === null) {
    return null;
  }
  const texts = shownTexts(draft, page);
  const { section } = parsed;
  const kind = SECTION_META[section].kind;
  const [min, max] = LIMITS_OF[section] ?? ['0', '100'];
  switch (kind) {
    case 'count': {
      const count = parseCount(texts[0] ?? '');
      const low = parseCount(min);
      const high = parseCount(max);
      return count !== null &&
        low !== null &&
        high !== null &&
        count >= low &&
        count <= high
        ? null
        : error('count', 0, min, max);
    }
    case 'choice':
      return (CHOICES[section] ?? []).includes(texts[0] ?? '')
        ? null
        : error('choice', 0);
    case 'names': {
      const long = texts.findIndex(
        (text, at) => at % 2 === 1 && text.length > NAME_LENGTH,
      );
      return long < 0 ? null : error('length', long, null, `${NAME_LENGTH}`);
    }
    case 'percent':
      return percentWithin(texts[0] ?? '', min, max) === null
        ? error('percent', 0, min, max)
        : null;
    case 'percents': {
      const wrong = texts.findIndex(
        (text) => percentWithin(text, min, max) === null,
      );
      if (wrong >= 0) {
        return error('percent', wrong, min, max);
      }
      const rest = percentRemainder(texts);
      return rest === '0' ? null : error('sum', null, null, null, rest);
    }
    case 'coalition': {
      const wrong = texts.findIndex((text) => !FLAG_CHOICES.includes(text));
      return wrong < 0 ? null : error('choice', wrong);
    }
    default:
      return null;
  }
}

export function isAnswered(
  draft: BookDraft,
  answered: readonly PageKey[],
  page: PageKey,
): boolean {
  const children = compactChildren(draft, page);
  if (children !== null)
    return children.every((child) => isAnswered(draft, answered, child));
  const parsed = answerPage(page);
  return (
    parsed !== null &&
    (answered.includes(page) ||
      answered.includes(page.slice(0, page.lastIndexOf('.')))) &&
    usable(draft, context(draft), page, parsed) !== null &&
    pageError(draft, page) === null
  );
}

export function remainder(draft: BookDraft, page: PageKey): string | null {
  const parsed = answerPage(page);
  return parsed !== null && SECTION_META[parsed.section].kind === 'percents'
    ? percentRemainder(shownTexts(draft, page))
    : null;
}

function factParams(): Record<string, string> {
  const params: Record<string, string> = {};
  for (const fact of KNESSET_FACTS) {
    params[`ran${fact.year}`] = `${fact.listsRan}`;
    params[`won${fact.year}`] = `${fact.listsWon}`;
  }
  return params;
}

const CHOICE_NARRATION: Partial<Record<Section, string>> = {
  'parties.naming': 'naming',
  'people.set': 'set',
  'growth.ask': 'growth',
  'turnoutChange.ask': 'turnoutChange',
  'coalitions.mode': 'coalitions',
};

export function narration(draft: BookDraft, page: PageKey): Narration | null {
  if (compactChildren(draft, page) !== null) return null;
  const parsed = answerPage(page);
  if (
    parsed === null ||
    isSuggested(draft, page) ||
    pageError(draft, page) !== null
  ) {
    return null;
  }
  const text = shownTexts(draft, page)[0] ?? '';
  const prefix = CHOICE_NARRATION[parsed.section];
  if (prefix !== undefined) {
    return { variant: `${prefix}.${text}`, params: {} };
  }
  switch (parsed.section) {
    case 'parties.count': {
      const count = parseCount(text) ?? 0;
      const variant =
        count <= 5
          ? 'count.small'
          : count <= 9
            ? 'count.medium'
            : 'count.large';
      return { variant, params: { count: `${count}`, ...factParams() } };
    }
    case 'turnout': {
      const turnout = fractionToPercent(percentToFraction(text)) ?? text;
      const rest = percentRemainder([text]) ?? '0';
      return { variant: 'turnout', params: { turnout, rest } };
    }
    case 'rules.threshold': {
      const fraction = percentToFraction(text);
      if (fraction === percentToFraction(THRESHOLD_FACT.percent)) {
        return { variant: 'threshold.israel', params: {} };
      }
      if (fraction === '0') {
        return { variant: 'threshold.none', params: {} };
      }
      return {
        variant: 'threshold.other',
        params: { threshold: fractionToPercent(fraction) ?? text },
      };
    }
    default:
      return null;
  }
}

export function partyIds(draft: BookDraft): readonly string[] {
  return context(draft).parties;
}

export function groupIds(draft: BookDraft): readonly string[] {
  return context(draft).groupIds;
}

/** The colour a party gets in the build: its list colour, else by position. */
export function partyColorOf(id: string, index: number): string {
  return catalogListColor(id) ?? PALETTE[index] ?? '#6B7280';
}

export function partyNames(draft: BookDraft): readonly string[] {
  return context(draft).partyPairs.map((pair) => pair.name);
}

export function groupNames(draft: BookDraft): readonly string[] {
  const ctx = context(draft);
  return ctx.set === 'example'
    ? ctx.groupIds.map(() => '')
    : ctx.groupPairs.map((pair) => pair.name);
}

export function resolveDraft(
  draft: BookDraft,
  answered: readonly PageKey[],
): { readonly draft: BookDraft; readonly filled: readonly PageKey[] } {
  let current = draft;
  const filled: PageKey[] = [];
  let page = nextPage(current, 'intro');
  while (page !== null && page !== 'review') {
    if (answerPage(page) !== null && !isAnswered(current, answered, page)) {
      const values = { ...current.values };
      const children = compactChildren(current, page) ?? [page];
      for (const child of children) {
        if (!isAnswered(current, answered, child)) delete values[child];
      }
      current = confirmPage({ values }, page);
      filled.push(page);
    }
    page = nextPage(current, page);
  }
  return { draft: current, filled };
}

function skeleton(
  ctx: Context,
  partyNamesList: readonly string[],
  groupNamesList: readonly string[],
): Draft {
  const allowed = [...ctx.parties];
  return {
    schemaVersion: SCHEMA_VERSION,
    inputMode: 'groups',
    id: BOOK_SCENARIO_ID,
    name: '',
    notes: '',
    rules: {
      populationTotal: '1000000',
      seatCount: 120,
      majorityMode: 'default',
      majorityOverride: null,
      threshold: '0',
      allocationMethod: 'hamilton',
    },
    groups: ctx.groupIds.map((id, index) => ({
      id,
      name: groupNamesList[index] ?? '',
      populationShare: '0',
      growthRate: '0',
      turnout: '0',
      turnoutChange: '0',
      validBallotRate: STANDARD_VALID_BALLOT_RATE,
      participationFactor: '1',
      votingMode: 'open',
      allowedPartyIds: allowed,
      voteWeights: Object.fromEntries(allowed.map((party) => [party, '0'])),
    })),
    parties: ctx.parties.map((id, index) => ({
      id,
      name: partyNamesList[index] ?? '',
      color: partyColorOf(id, index),
      blockId: null,
      tieBreakOrder: index + 1,
      canJoinGovernment: true,
    })),
    blocks: [],
    coalitionRules: {
      incompatiblePartyPairs: [],
      incompatibleBlockPairs: [],
      compatiblePartyOverrides: [],
      partyRefusals: [],
    },
  };
}

function filledItems(
  ctx: Context,
  pages: readonly PageKey[],
): readonly FilledItem[] {
  const items: FilledItem[] = [];
  for (const page of pages.flatMap((page) =>
    page === 'turnout' || page === 'growth'
      ? indexed(page, ctx.groups)
      : page === 'coalitions' || page === 'compose'
        ? indexed(page, ctx.count)
        : [page],
  )) {
    const parsed = parsePage(page);
    if (parsed === null) {
      continue;
    }
    const { section, index } = parsed;
    const entity = (GROUP_SECTIONS as readonly string[]).includes(section)
      ? (ctx.groupIds[index] ?? null)
      : section === 'coalitions' || section === 'compose'
        ? (ctx.parties[index] ?? null)
        : null;
    items.push({ section, entity });
  }
  return items;
}

/** One row of the electorate check: a group's derived share of the population. */
export interface ElectorateRow {
  readonly groupId: string;
  /** Percent of the population, one decimal, canonical. */
  readonly share: string;
  /** The 2022 statistic for the example group set, otherwise null. */
  readonly statistic: string | null;
  /** False when no party receives votes of this group. */
  readonly casts: boolean;
}

type TextsOf = (page: PageKey) => readonly string[];

function confirmedTexts(
  draft: BookDraft,
  answered: readonly PageKey[],
): TextsOf {
  return (page) => {
    if (isAnswered(draft, answered, page)) {
      return shownTexts(draft, page);
    }
    const values = { ...draft.values };
    delete values[page];
    return shownTexts({ values }, page);
  };
}

/** Every party's composition texts; none without groups. */
function compositionsOf(
  ctx: Context,
  texts: TextsOf,
): readonly (readonly string[] | null)[] {
  return ctx.parties.map((_, party) =>
    ctx.groups > 0 ? texts(`compose.${party}`) : null,
  );
}

function derivedTurnout(ctx: Context, texts: TextsOf) {
  return deriveOverallTurnout(
    texts('votes.shares'),
    compositionsOf(ctx, texts),
    ctx.groupIds.map((_, group) => texts(`turnout.${group}`)[0] ?? ''),
  );
}

function exactPercentShare(text: string):
  | {
      numerator: string;
      denominator: string;
    }
  | string {
  return percentToExactFraction(text) ?? text;
}

/** The group sizes and vote weights the given page texts imply. */
function derivedOf(ctx: Context, texts: TextsOf) {
  if (derivedTurnout(ctx, texts) === null) {
    return null;
  }
  return deriveElectorate(
    texts('votes.shares'),
    compositionsOf(ctx, texts),
    ctx.groupIds.map((_, g) => texts(`turnout.${g}`)[0] ?? ''),
  );
}

/** Decimals of a group share on the check page. */
const CHECK_PLACES = 1;

/**
 * The group shares the answers imply, for the parties and groups shown: the
 * turnout, vote share and composition pages count only when confirmed, as in
 * the build; otherwise their suggestion does.
 */
export function electorateCheck(
  draft: BookDraft,
  answered: readonly PageKey[],
): readonly ElectorateRow[] {
  const ctx = context(draft);
  const texts = confirmedTexts(draft, answered);
  const derived = derivedOf(ctx, texts);
  const shares =
    derived === null
      ? null
      : roundPercents(derived.populationShares, CHECK_PLACES);
  if (derived === null || shares === null) {
    return [];
  }
  const casts = castingGroups(
    texts('votes.shares'),
    compositionsOf(ctx, texts),
    ctx.groups,
  );
  const statistics = ctx.set === 'example' ? exampleShares() : null;
  return ctx.groupIds.map((groupId, g) => ({
    groupId,
    share: shares[g] ?? '0',
    statistic: statistics?.get(groupId) ?? null,
    casts: casts[g] ?? false,
  }));
}

/** Known voter contributions and the unknown part, without renormalizing. */
export function voterMixCheck(
  draft: BookDraft,
  answered: readonly PageKey[],
): VoterMix | null {
  const ctx = context(draft);
  const texts = confirmedTexts(draft, answered);
  return describeVoterMix(
    texts('votes.shares'),
    compositionsOf(ctx, texts),
    ctx.groups,
    CHECK_PLACES,
  );
}

/**
 * Fills every unanswered page from its suggestion and applies the answers
 * through the editor's own edits, so the scenario equals one typed there.
 */
export function buildBook(
  draft: BookDraft,
  answered: readonly PageKey[],
): BookBuild {
  const resolved = resolveDraft(draft, answered);
  const final = resolved.draft;
  const ctx = context(final);
  const text = (page: PageKey, index = 0) =>
    shownTexts(final, page)[index] ?? '';
  const texts: TextsOf = (page) => shownTexts(final, page);
  let input = skeleton(ctx, partyNames(final), groupNames(final));
  ctx.groupIds.forEach((group, g) => {
    input = setGroupFraction(input, group, 'turnout', text(`turnout.${g}`));
    input = setGroupFraction(input, group, 'growthRate', text(`growth.${g}`));
  });
  input = setRule(input, 'seatCount', text('rules.seats'));
  input = setRule(input, 'threshold', text('rules.threshold'));
  {
    ctx.parties.forEach((party, p) => {
      const flags = shownTexts(final, `coalitions.${p}`);
      if (flags[0] === 'no') {
        input = setPartyEligibility(input, party, false);
      }
      ctx.parties.forEach((other, q) => {
        // Each party's answer is its own: an unticked partner is its refusal.
        if (q !== p && flags[1 + q] === 'no') {
          input = addPair(input, 'partyRefusals', party, other);
        }
      });
    });
  }
  const shares = ctx.parties.map((_, party) => text('votes.shares', party));
  const compositions = compositionsOf(ctx, texts);
  const turnouts = ctx.groupIds.map((_, group) => text(`turnout.${group}`));
  const impliedTurnout = derivedTurnout(ctx, texts);
  const enteredTurnout = percentToExactFraction('70');
  if (impliedTurnout === null && enteredTurnout === null) {
    throw new RangeError('Questionnaire overall turnout is unavailable');
  }
  const partyInput: Json = {
    ...input,
    inputMode: 'parties',
    rules: {
      ...(input.rules as Json),
      overallTurnout:
        impliedTurnout === null
          ? enteredTurnout
          : fractionParts(impliedTurnout),
      validBallotRate: STANDARD_VALID_BALLOT_RATE,
    },
    groups: input.groups.map((group, index) => ({
      id: group.id,
      name: group.name,
      notes: '',
      growthRate: group.growthRate,
      turnout: exactPercentShare(turnouts[index] ?? ''),
      turnoutChange: group.turnoutChange,
    })),
    parties: input.parties.map((party, index) => ({
      ...party,
      voteShare: exactPercentShare(shares[index] ?? ''),
      composition:
        compositions[index] === null
          ? null
          : Object.fromEntries(
              ctx.groupIds.map((groupId, group) => [
                groupId,
                exactPercentShare(compositions[index]?.[group] ?? ''),
              ]),
            ),
    })),
  };
  return { input: partyInput, filled: filledItems(ctx, resolved.filled) };
}

/** The text indices `0 .. count - 1`. */
function indices(count: number): readonly number[] {
  return Array.from({ length: count }, (_, index) => index);
}

/** Rows cut into as few parts of at most `cap` as possible, sizes one apart, larger first. */
function balanced(
  rows: readonly number[],
  cap: number,
): readonly (readonly number[])[] {
  let count = 0;
  for (let covered = 0; covered < rows.length; covered += cap) {
    count += 1;
  }
  if (count < 2) {
    return [rows];
  }
  const larger = rows.length % count;
  const size = (rows.length - larger) / count;
  const parts: (readonly number[])[] = [];
  let start = 0;
  for (let part = 0; part < count; part += 1) {
    const end = start + (part < larger ? size + 1 : size);
    parts.push(rows.slice(start, end));
    start = end;
  }
  return parts;
}

/**
 * The text indices of each part of a page, in field order. A names page is
 * cut by fields, both texts of a field together, at most `namesPerPage` a
 * part. A single coalition row leaves out the party's own column. The check
 * page is one part of all group rows. Every other page, the compact ones
 * included, is one part.
 */
export function pageParts(
  draft: BookDraft,
  page: PageKey,
): readonly (readonly number[])[] {
  const parsed = parsePage(page);
  if (parsed === null) {
    return [[]];
  }
  const { section } = parsed;
  if (SECTION_META[section].kind === 'check') {
    return [indices(context(draft).groups)];
  }
  const all = indices(shownTexts(draft, page).length);
  if (isNames(section)) {
    return balanced(
      all.filter((at) => at % 2 === 0),
      BOOK_LIMITS.namesPerPage,
    ).map((part) => part.flatMap((at) => [at, at + 1]));
  }
  if (section === 'coalitions' && page !== 'coalitions') {
    return [all.filter((at) => at !== 1 + parsed.index)];
  }
  return [all];
}

/** How many parts the page is shown in; the review is one screen (M7-19). */
export function partCount(draft: BookDraft, page: PageKey): number {
  return pageParts(draft, page).length;
}

/** The range or choice error among the fields of one part, never a sum. */
export function partError(
  draft: BookDraft,
  page: PageKey,
  part: number,
): BookError | null {
  const fields = pageParts(draft, page)[part];
  const parsed = answerPage(page);
  if (fields === undefined || parsed === null) {
    return null;
  }
  const kind = SECTION_META[parsed.section].kind;
  if (page === 'turnout' || page === 'growth') {
    const texts = shownTexts(draft, page);
    const [min, max] = LIMITS_OF[parsed.section]!;
    const wrong = fields.find(
      (at) => percentWithin(texts[at] ?? '', min, max) === null,
    );
    return wrong === undefined ? null : error('percent', wrong, min, max);
  }
  if (kind === 'names') {
    const texts = shownTexts(draft, page);
    const long = fields.find(
      (at) => at % 2 === 1 && (texts[at] ?? '').length > NAME_LENGTH,
    );
    return long === undefined
      ? null
      : error('length', long, null, `${NAME_LENGTH}`);
  }
  if (kind !== 'percents' && kind !== 'coalition') {
    return pageError(draft, page);
  }
  const texts = shownTexts(draft, page);
  const [min, max] = LIMITS_OF[parsed.section] ?? ['0', '100'];
  const wrong = fields.find((at) =>
    kind === 'percents'
      ? percentWithin(texts[at] ?? '', min, max) === null
      : !FLAG_CHOICES.includes(texts[at] ?? ''),
  );
  if (wrong === undefined) {
    return null;
  }
  return kind === 'percents'
    ? error('percent', wrong, min, max)
    : error('choice', wrong);
}

const REVIEW_CHAPTERS: readonly number[] = [1, 2, 3, 4, 5, 6, 7];

/** Characters of a review line around the names: its label and separators. */
const REVIEW_TEXT = {
  head: 14,
  partySeparator: 2,
  groupItem: 10,
} as const;

function lineCount(chars: number): number {
  let lines = 1;
  for (
    let room = BOOK_LIMITS.reviewLineChars;
    room < chars;
    room += BOOK_LIMITS.reviewLineChars
  ) {
    lines += 1;
  }
  return lines;
}

/**
 * A name as a review list of percents shows it: a typed name longer than
 * `longName` is cut to `reviewItemName` characters and an ellipsis, since the
 * chapters before list it in full.
 */
export function reviewItemName(name: string): string {
  return name.length > BOOK_LIMITS.longName
    ? `${Array.from(name).slice(0, BOOK_LIMITS.reviewItemName).join('').trimEnd()}…`
    : name;
}

/** Characters of a list of names; an untyped name counts as `untyped`. */
function nameChars(
  names: readonly string[],
  untyped: number,
  separator: number,
  cut = false,
): number {
  return names.reduce<number>(
    (sum, name) =>
      sum +
      (name === '' ? untyped : (cut ? reviewItemName(name) : name).length) +
      separator,
    REVIEW_TEXT.head,
  );
}

/**
 * The estimated number of lines of one review chapter: its title and button,
 * plus its scenario text. Only the chapters that list names depend on them:
 * the parties, the groups, the turnout of each group, and the vote share of
 * each party with the derived share of each group. The lists of percents
 * count a long typed name as it is cut there.
 */
export function reviewSize(draft: BookDraft, chapter: number): number {
  const ctx = context(draft);
  const groupName =
    ctx.set === 'example'
      ? BOOK_LIMITS.reviewGroupName
      : BOOK_LIMITS.reviewShortName;
  const groupLines = (cut: boolean) =>
    lineCount(
      nameChars(groupNames(draft), groupName, REVIEW_TEXT.groupItem, cut),
    );
  let text: number;
  switch (chapter) {
    case 1:
      text = lineCount(
        nameChars(
          partyNames(draft),
          BOOK_LIMITS.reviewShortName,
          REVIEW_TEXT.partySeparator,
        ),
      );
      break;
    case 2:
      text = groupLines(false);
      break;
    case 3:
      text = groupLines(true) + 2;
      break;
    case 4:
      text =
        lineCount(
          nameChars(
            partyNames(draft),
            BOOK_LIMITS.reviewShortName,
            REVIEW_TEXT.groupItem,
            true,
          ),
        ) + groupLines(true);
      break;
    case 5:
      text = groupLines(true) + 1;
      break;
    case 6:
      text = 2;
      break;
    default:
      text = 2;
  }
  return BOOK_LIMITS.reviewChapterLines + text;
}

/** A ready value offered beside a field, with a note on what it stands for. */
export interface FieldPick {
  readonly value: string;
  readonly note: 'own' | 'knesset' | 'israel' | 'rest' | null;
}

// The ready values a field offers in its list, by section.
function plainPicks(values: readonly string[]): readonly FieldPick[] {
  return values.map((value) => ({ value, note: null }));
}

function countPicks(min: number, max: number): readonly FieldPick[] {
  return plainPicks(
    Array.from({ length: max - min + 1 }, (_, n) => `${min + n}`),
  );
}

const CHANGE_PICKS = plainPicks(['-2', '-1', '-0.5', '0', '0.5', '1', '2']);

const FIVES = plainPicks(Array.from({ length: 21 }, (_, n) => `${5 * n}`));

const READY_VALUES: Partial<Record<Section, readonly FieldPick[]>> = {
  'parties.count': countPicks(BOOK_LIMITS.minParties, BOOK_LIMITS.maxParties),
  'people.count': countPicks(BOOK_LIMITS.minGroups, BOOK_LIMITS.maxGroups),
  'rules.seats': [
    { value: '50', note: null },
    { value: '100', note: null },
    { value: '120', note: 'knesset' },
    { value: '150', note: null },
    { value: '200', note: null },
  ],
  'rules.threshold': [
    { value: '0', note: null },
    { value: '1', note: null },
    { value: '2', note: null },
    { value: THRESHOLD_FACT.percent, note: 'israel' },
    { value: '4', note: null },
    { value: '5', note: null },
  ],
  turnout: plainPicks(['50', '60', '65', '70', '75', '80', '90']),
  'overall.turnout': plainPicks([
    '0',
    '50',
    '60',
    '65',
    '70',
    '75',
    '80',
    '90',
    '100',
  ]),
  growth: CHANGE_PICKS,
  turnoutChange: CHANGE_PICKS,
};

/**
 * The ready values offered beside one field: counts, seats, thresholds and
 * percents from fixed lists, on vote shares and compositions the rest to 100
 * first, on a names page own and the catalog entries of its kind. Choices,
 * coalition flags, name texts, lessons and the check offer none.
 */
export function fieldPicks(
  draft: BookDraft,
  page: PageKey,
  index: number,
): readonly FieldPick[] {
  const child = compactChild(draft, page, index);
  if (child !== null && page === 'compose') {
    return fieldPicks(draft, child.page, child.index);
  }
  const parsed = answerPage(page);
  if (parsed === null) {
    return [];
  }
  const texts = shownTexts(draft, page);
  if (index < 0 || index >= texts.length) {
    return [];
  }
  const { section } = parsed;
  if (isNames(section)) {
    return index % 2 === 0
      ? [
          { value: '', note: 'own' },
          ...catalogOf(section).map((entry) => ({
            value: entry.id,
            note: null,
          })),
        ]
      : [];
  }
  if (SECTION_META[section].kind === 'percents') {
    const rest = percentRemainder(texts.filter((_, at) => at !== index));
    return rest !== null && percentWithin(rest, '0', '100') !== null
      ? [{ value: rest, note: 'rest' }, ...FIVES]
      : FIVES;
  }
  return READY_VALUES[section] ?? [];
}

/** The offered value the field now shows, compared exactly, or ''. */
export function chosenPick(
  draft: BookDraft,
  page: PageKey,
  index: number,
): string {
  const child = compactChild(draft, page, index);
  if (child !== null && page === 'compose') {
    return chosenPick(draft, child.page, child.index);
  }
  const parsed = answerPage(page);
  const text = shownTexts(draft, page)[index];
  if (parsed === null || text === undefined) {
    return '';
  }
  if (isNames(parsed.section)) {
    return index % 2 === 0 ? text : '';
  }
  const kind = SECTION_META[parsed.section].kind;
  const exact = (value: string) =>
    kind === 'count' ? parseCount(value) : percentToFraction(value);
  const shownValue = exact(text);
  if (shownValue === null) {
    return '';
  }
  return (
    fieldPicks(draft, page, index).find(
      (pick) => exact(pick.value) === shownValue,
    )?.value ?? ''
  );
}

/** One group's part of a list's valid votes, as the engine report shows it. */
export interface MixShare {
  readonly groupId: string;
  readonly share: string;
}

/** Where one list of the Israeli example gets its votes, by group. */
export interface MixExample {
  readonly partyId: string;
  /** Groups that give the list votes, in scenario order. */
  readonly shares: readonly MixShare[];
  readonly groups: number;
  readonly top: MixShare;
}

/** The lists the lesson shows: one with many groups, one with mostly one. */
const MIX_PARTIES: readonly string[] = ['likud', 'raam'];

let mixCache: readonly MixExample[] | null = null;

function computeMix(): readonly MixExample[] {
  const validation = validateScenario(presetInput('israelExample'));
  if (!validation.ok) {
    return [];
  }
  const { scenario } = validation;
  if (scenario.inputMode !== 'groups') {
    return [];
  }
  const { votes } = runSeats(scenario);
  return MIX_PARTIES.flatMap((partyId) => {
    const target = { kind: 'party', id: partyId } as const;
    const sources = voteSources(
      electorateComposition(scenario, votes, target, 'valid'),
    );
    const report = buildCompositionReport(scenario, votes, target);
    const shown = (groupId: string): MixShare => ({
      groupId,
      share:
        report.rows.find((row) => row.groupId === groupId)?.valid.share ?? '0',
    });
    return sources.top === null
      ? []
      : [
          {
            partyId,
            shares: sources.rows.map((row) => shown(row.groupId)),
            groups: sources.rows.length,
            top: shown(sources.top.groupId),
          },
        ];
  });
}

/** Where Likud and Ra'am get their valid votes in the Israeli example. */
export function groupMixExample(): readonly MixExample[] {
  mixCache ??= computeMix();
  return mixCache;
}

/** A group of the Basic set; the share is null where the source gives none. */
export interface SetShare {
  readonly groupId: string;
  readonly share: string | null;
}

/**
 * The Basic (Israel) set the people.set page offers, in catalog order, with
 * the CBS 2022 share of the groups the source counts separately.
 */
export function exampleGroupSet(): readonly SetShare[] {
  const shares = exampleShares();
  return CATALOG_GROUPS.map(({ id }) => ({
    groupId: id,
    share: shares.get(id) ?? null,
  }));
}

/**
 * The draft with one party's composition scaled exactly to 100% in
 * proportion, two decimals, through the engine; the `locked` groups keep
 * their values and the others share the rest. Unchanged when that party's
 * values cannot be scaled.
 */
export function alignComposition(
  draft: BookDraft,
  party: number,
  locked: readonly number[] = [],
): BookDraft {
  const page = `compose.${party}`;
  if (answerPage(page) === null || party >= context(draft).count) {
    return draft;
  }
  const aligned = scalePercents(shownTexts(draft, page), 2, locked);
  return aligned === null
    ? draft
    : aligned.reduce(
        (current, text, group) => editPage(current, page, group, text),
        draft,
      );
}

/** The vote shares scaled exactly to 100% with the `locked` rows kept (M7-19). */
export function alignShares(
  draft: BookDraft,
  locked: readonly number[] = [],
): BookDraft {
  const aligned = scalePercents(shownTexts(draft, 'votes.shares'), 2, locked);
  return aligned === null
    ? draft
    : aligned.reduce(
        (current, text, at) => editPage(current, 'votes.shares', at, text),
        draft,
      );
}

/** The share a lock starts on: at most this percent, compared exactly. */
export const SMALL_SHARE = '7';

/** Positions of the percent texts at or below `SMALL_SHARE`, compared exactly. */
export function smallShares(texts: readonly string[]): readonly number[] {
  return texts.flatMap((text, at) =>
    percentWithin(text, '0', SMALL_SHARE) === null ? [] : [at],
  );
}

/** At least this many positions stay unlocked in every lock family (M7-20). */
export const MIN_UNLOCKED = 2;

/** Whether one more lock still leaves `MIN_UNLOCKED` positions open. */
export function canLockAnother(total: number, locked: number): boolean {
  return total - locked - 1 >= MIN_UNLOCKED;
}

/**
 * The default locks of a percent row (M7-20): every value at or below
 * `SMALL_SHARE` starts locked; when that would leave fewer than
 * `MIN_UNLOCKED` positions open, only the exact zeros start locked, and
 * zeros beyond that limit stay open too.
 */
export function defaultLocks(texts: readonly string[]): readonly number[] {
  const small = smallShares(texts);
  if (texts.length - small.length >= MIN_UNLOCKED) return small;
  const zeros = texts.flatMap((text, at) =>
    percentWithin(text, '0', '0') === null ? [] : [at],
  );
  if (texts.length - zeros.length >= MIN_UNLOCKED) return zeros;
  const kept = texts.length - MIN_UNLOCKED;
  return zeros.slice(0, kept < 0 ? 0 : kept);
}

/**
 * The questionnaire's screens (M7-19): consecutive pages shown stacked and
 * confirmed together. The pages, their keys and answers are unchanged.
 */
export function bookScreens(draft: BookDraft): readonly (readonly PageKey[])[] {
  const pages = bookPages(draft);
  // Turnout and the vote shares share a screen; without groups the shares open it.
  const breaks: readonly PageKey[] = [
    'intro',
    'parties.count',
    'parties.names',
    'people.set',
    pages.includes('turnout') ? 'turnout' : 'votes.shares',
    'votes.check',
    'coalitions',
    'review',
  ];
  const screens: PageKey[][] = [];
  for (const page of pages) {
    const last = screens[screens.length - 1];
    if (last === undefined || breaks.includes(page)) {
      screens.push([page]);
    } else {
      last.push(page);
    }
  }
  return screens;
}

/** The screen that holds the page, or the page alone when it is not listed. */
export function screenOf(draft: BookDraft, page: PageKey): readonly PageKey[] {
  return bookScreens(draft).find((screen) => screen.includes(page)) ?? [page];
}

/** The review chapters of each review part, packed in order while they fit. */
export function reviewParts(draft: BookDraft): readonly (readonly number[])[] {
  const parts: (readonly number[])[] = [];
  let current: number[] = [];
  let lines = 0;
  for (const chapter of REVIEW_CHAPTERS) {
    const size = reviewSize(draft, chapter);
    if (current.length > 0 && lines + size > BOOK_LIMITS.reviewLines) {
      parts.push(current);
      current = [];
      lines = 0;
    }
    current.push(chapter);
    lines += size;
  }
  parts.push(current);
  return parts;
}
