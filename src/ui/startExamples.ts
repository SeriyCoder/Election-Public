import {
  bookPages,
  confirmPage,
  editPage,
  EMPTY_DRAFT,
  shownTexts,
  takesAnswer,
  type BookDraft,
  type PageKey,
} from './book';
import type { Locale } from '../i18n';
import { renameEntity, type Draft } from '../engine/edit';

/** The ready examples of the questionnaire's opening page (M7-16). */
export type StartExampleId = 'eight' | 'israel';

export const START_EXAMPLES: readonly StartExampleId[] = ['eight', 'israel'];

export interface StartBook {
  readonly draft: BookDraft;
  readonly answered: readonly PageKey[];
}

const EIGHT_PARTIES = ['P1', 'P2', 'P3', 'shas', 'P5', 'P6', 'utj', 'P8'];

/** Each party's refused partners, by the IDs the questionnaire gives them. */
const EIGHT_REFUSALS: Readonly<Record<string, string>> = {
  P1: 'P6 P8',
  P2: 'shas P8',
  shas: 'P6',
  P6: 'P1 P2 shas utj',
  utj: 'P2 P3 P5 P6 P8',
  P8: 'P1 P2 shas P5 P6 utj',
};

/** A names page from `pick|name` entries: a catalog pick or a typed name. */
function names(entries: readonly string[]): readonly string[] {
  return entries.flatMap((entry) => entry.split('|'));
}

const list = (text: string) => text.split(' ');

/**
 * The user's own party and group names of the "New 8 parties" file, by
 * interface language. Russian is the file verbatim, trailing spaces included,
 * so the Russian example still builds exactly the imported scenario; English
 * and Hebrew are translations of the same names. Each entry is `pick|name`.
 */
const EIGHT_NAMES: Readonly<
  Record<Locale, { parties: readonly string[]; groups: readonly string[] }>
> = {
  ru: {
    parties: [
      '|Ликуд без Биби',
      '|Религиозный сионизм ',
      '|Другой Государственный лагерь ',
      'shas|',
      '|Наш дом Израиль без Либера',
      '|Демократы и Левее',
      'utj|',
      '|Арабы ',
    ],
    groups: [
      'secular|',
      '|Традиционные евреи, масорти ле дати',
      'religious|',
      '|Вязанние кипы, поселенцы',
      '|Арабские граждане',
      'haredi|',
      'other|',
    ],
  },
  en: {
    parties: [
      '|Likud without Bibi',
      '|Religious Zionism',
      '|Another National Unity',
      'shas|',
      '|Yisrael Beiteinu without Lieberman',
      '|The Democrats and further left',
      'utj|',
      '|Arab parties',
    ],
    groups: [
      'secular|',
      '|Traditional Jews, masorti and masorti-dati',
      'religious|',
      '|Knitted kippot, settlers',
      '|Arab citizens',
      'haredi|',
      'other|',
    ],
  },
  he: {
    parties: [
      '|הליכוד בלי ביבי',
      '|הציונות הדתית',
      '|מחנה ממלכתי אחר',
      'shas|',
      '|ישראל ביתנו בלי ליברמן',
      '|הדמוקרטים ושמאלה',
      'utj|',
      '|המפלגות הערביות',
    ],
    groups: [
      'secular|',
      '|יהודים מסורתיים ומסורתיים-דתיים',
      'religious|',
      '|כיפות סרוגות, מתנחלים',
      '|אזרחים ערבים',
      'haredi|',
      'other|',
    ],
  },
};

/** The description key of each eight-party example slot (M7-19). */
const EIGHT_ABOUT: readonly (string | null)[] = [
  'catalog.party.likud.about',
  'book.example.about.religiousZionism',
  'book.example.about.nationalCamp',
  null,
  'book.example.about.beiteinu',
  'book.example.about.left',
  null,
  'book.example.about.arabs',
];

/**
 * The description key under a typed party name, while the field still holds
 * the eight-party example's own name for that slot; otherwise null.
 */
export function exampleAbout(
  locale: Locale,
  slot: number,
  name: string,
): string | null {
  const entry = EIGHT_NAMES[locale].parties[slot];
  const about = EIGHT_ABOUT[slot] ?? null;
  if (entry === undefined || about === null || name.trim() === '') {
    return null;
  }
  return entry.split('|')[1]?.trim() === name.trim() ? about : null;
}

/**
 * The user's "New 8 parties" file as the texts typed on each page, in page
 * order, with the names in the given interface language.
 */
function eight(locale: Locale): Readonly<Record<PageKey, readonly string[]>> {
  return {
    'parties.count': ['8'],
    'parties.naming': ['own'],
    'parties.names': names(EIGHT_NAMES[locale].parties),
    'people.set': ['own'],
    'people.count': ['7'],
    'people.names': names(EIGHT_NAMES[locale].groups),
    ...EIGHT_VALUES,
  };
}

const EIGHT_VALUES: Readonly<Record<PageKey, readonly string[]>> = {
  turnout: list('77.25 78.25 68.79 80.62 80.01 80.03 69.12'),
  'votes.shares': list('21.85 14.7 22.77 7.37 6.2 6.73 6 14.38'),
  compose: list(
    '31.2 38.79 14.66 9.38 0 0 5.97 5 5 10 80 0 0 0 65 25 5 5 0 0 0 8.38 10.05 74.58 0 1 0.96 5.03 76.6 9.64 0 8.94 0 0 4.82 61.06 19.53 4.83 0 9.7 0 4.88 0 0 10 0 0 90 0 2.22 0 0 0 92.76 0 5.02',
  ),
  growth: list('0.25 0.5 0.75 1 1.5 2.5 0.5'),
  'rules.seats': ['120'],
  'rules.threshold': ['3.25'],
  coalitions: EIGHT_PARTIES.flatMap((party) => {
    const refused = list(EIGHT_REFUSALS[party] ?? '');
    return [
      'yes',
      ...EIGHT_PARTIES.map((other) => (refused.includes(other) ? 'no' : 'yes')),
    ];
  }),
};

/** The six 2022 lists; every other page takes the questionnaire's example. */
const ISRAEL: Readonly<Record<PageKey, readonly string[]>> = {
  'parties.count': ['6'],
  'parties.naming': ['example'],
};

/**
 * Types the answers page by page through the questionnaire's own edits, then
 * confirms every answer page (a page without answers keeps its suggestion), so
 * the draft is exactly what a person typing the same texts would leave.
 */
function typed(answers: Readonly<Record<PageKey, readonly string[]>>) {
  let draft = EMPTY_DRAFT;
  for (const [page, texts] of Object.entries(answers)) {
    texts.forEach((text, index) => {
      if (shownTexts(draft, page)[index] !== text) {
        draft = editPage(draft, page, index, text);
      }
    });
    draft = confirmPage(draft, page);
  }
  const answered: PageKey[] = [];
  for (const page of bookPages(draft)) {
    draft = confirmPage(draft, page);
    if (takesAnswer(page) || shownTexts(draft, page).length > 0) {
      answered.push(page);
    }
  }
  return { draft, answered };
}

export function startExample(
  id: StartExampleId,
  locale: Locale = 'ru',
): StartBook {
  return typed(id === 'eight' ? eight(locale) : ISRAEL);
}

/**
 * The draft with the "New 8 parties" names that are still exactly as the
 * example typed them in `from` replaced by the same names in `to`; a name the
 * person changed stays as typed, and nothing else changes.
 */
export function translateExampleNames(
  draft: BookDraft,
  from: Locale,
  to: Locale,
): BookDraft {
  if (from === to) return draft;
  let next = draft;
  for (const [page, kind] of [
    ['parties.names', 'parties'],
    ['people.names', 'groups'],
  ] as const) {
    const source = names(EIGHT_NAMES[from][kind]);
    const target = names(EIGHT_NAMES[to][kind]);
    const shown = shownTexts(next, page);
    if (shown.length !== source.length) continue;
    for (let index = 1; index < source.length; index += 2) {
      const name = source[index]!;
      if (name !== '' && shown[index - 1] === '' && shown[index] === name) {
        next = editPage(next, page, index, target[index]!);
      }
    }
  }
  return next;
}

/**
 * The scenario with every party and group still named exactly as the
 * "New 8 parties" example names it in `from` renamed to the same name in
 * `to`; other names, and everything else, stay unchanged.
 */
export function translateExampleScenario(
  input: Draft,
  from: Locale,
  to: Locale,
): Draft {
  if (from === to) return input;
  let next = input;
  for (const [kind, key] of [
    ['party', 'parties'],
    ['group', 'groups'],
  ] as const) {
    const source = names(EIGHT_NAMES[from][key]);
    const target = names(EIGHT_NAMES[to][key]);
    const renames = new Map<string, string>();
    for (let index = 1; index < source.length; index += 2) {
      const name = source[index]!.trim();
      if (name !== '') renames.set(name, target[index]!);
    }
    const entities = kind === 'party' ? next.parties : next.groups;
    for (const entity of entities) {
      const renamed =
        typeof entity.name === 'string'
          ? renames.get(entity.name.trim())
          : undefined;
      if (renamed !== undefined) {
        next = renameEntity(next, kind, entity.id, renamed);
      }
    }
  }
  return next;
}

/**
 * The same renames applied to a frozen scenario copy (M7-20): only `name`
 * strings that still exactly match the example's names in `from` change to
 * the names in `to`; everything else, numbers included, is untouched. Used
 * for the supporter experiment's frozen basis, which the edit functions must
 * not rebuild.
 */
export function translateExampleTitles<
  T extends {
    readonly parties: readonly { readonly name?: unknown }[];
    readonly groups: readonly { readonly name?: unknown }[];
  },
>(scenario: T, from: Locale, to: Locale): T {
  if (from === to) return scenario;
  let changed = false;
  const renamed = (kind: 'parties' | 'groups', list: T['parties']) => {
    const source = names(EIGHT_NAMES[from][kind]);
    const target = names(EIGHT_NAMES[to][kind]);
    const renames = new Map<string, string>();
    for (let index = 1; index < source.length; index += 2) {
      const name = source[index]!.trim();
      if (name !== '') renames.set(name, target[index]!);
    }
    return list.map((entity) => {
      const next =
        typeof entity.name === 'string'
          ? renames.get(entity.name.trim())
          : undefined;
      if (next === undefined) return entity;
      changed = true;
      return { ...entity, name: next };
    });
  };
  const parties = renamed('parties', scenario.parties);
  const groups = renamed('groups', scenario.groups);
  return changed ? { ...scenario, parties, groups } : scenario;
}
