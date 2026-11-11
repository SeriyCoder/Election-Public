# Memo — M2-25 Questionnaire first-review corrections

| Field | Value |
| --- | --- |
| item | M2-25 |
| epic | M2 |
| phase | Phase 2 — M2 reopened for first-review corrections |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-30 |
| closed | 2026-10-30 |

## Problem

The user's first review of the questionnaire found five faults. With six
parties the names page shows four, and the other two wait on a second page with
nothing saying so; there is no ready list to pick from, so a visitor has to
type. The «Пример» badge looks like a control and does nothing. «Пропустить
анкету» sits between «Назад» and «Далее». And the book never says what a voter
group is, although groups are its main parameter: their size, turnout and
preferences describe both the population and where a party's votes come from.
The user then asked to finish all of it and to offer a dropdown of ready values
beside every field that needs filling, while still allowing typed names.

## Scope

**In scope**

- Navigation order: «Пропустить анкету» and «Начать анкету заново» at the
  start of the bar, «Назад» (or the facts page's return) and «Далее» /
  «Построить мою симуляцию» together at the end.
- «Пример» becomes a native disclosure: a click opens one sentence saying what
  the suggested value means and how to keep or change it.
- One names page per names section instead of pages of four. It shows at most
  eight names at once; nine or ten parties are shown in balanced parts (5 + 4,
  5 + 5) with a range line «Названия 1–5 из 10» and, on a part that is not the
  last, a cue that the rest follow after «Далее». Names sit in two columns on
  wide screens with an inline number.
- A ready-values list (a native select drawn as a ▾ button joined to the field)
  beside every questionnaire input that takes typing:
  - party names: «Своё название» and the ten 2022 lists, each with its
    neutral description; own groups: «Своё название» and the six example
    groups;
  - party count 2–10, group count 1–8;
  - seats 50, 100, 120 («как в Кнессете»), 150, 200;
  - threshold 0, 1, 2, 3.25 («израильский барьер»), 4, 5;
  - turnout 50, 60, 65, 70, 75, 80, 90;
  - growth and turnout change −2, −1, −0.5, 0, 0.5, 1, 2 per year;
  - each row of a shares or preferences page 0 to 100 in steps of 5, plus
    «Остаток до 100%: n%» when that remainder is between 0 and 100.
  Typing stays possible everywhere. Choice and coalition pages are already
  selections and get no list.
- Two lesson pages at the start of chapter 2, before the group set choice:
  - «Что такое группа избирателей?» — a group is a part of the electorate
    described by the same numbers; every voter belongs to exactly one group;
    a group has a share (how many voters belong to it), preferences (how its
    votes split between parties), turnout (how many of them vote) and, if
    asked, growth and turnout change; these are the model's assumptions, not
    data about real people, and nothing is inferred from a group's name;
  - «Откуда партия получает голоса?» — one party draws votes from several
    groups in their own proportions, or almost all from one; so groups describe
    both the population and the parties. A worked example from the Israeli
    educational scenario shows Likud and Ra'am as bars of their votes by group,
    computed by the engine: Likud from all six groups, most from traditional
    Jews (43.27%); Ra'am from two, 97.83% from Arab citizens.
- Shorter explanation on the group set page, since the lesson now carries the
  definition.

**Out of scope** (at least two)

- Ready-value lists in the editor's fields — M6-06, filed by this memo.
- Renaming a catalog list from the questionnaire: a typed name makes an own
  party; the editor keeps renaming catalog lists as before (Section 14.4).
- New presets, catalog entries, motifs or drawing captions.
- Keeping the questionnaire draft across reloads (it is still not stored).

## Approach

Sections 14.5 and 14.6 stay the frame; this item changes four surfaces.

**Navigation.** The bar keeps its buttons and test hooks; only the order and
the spacing change, so Skip is apart from the Back / Next pair in both
directions (the bar follows the page direction in Hebrew).

**«Пример».** The badge becomes a `details` element whose summary reads
«Пример»; the hook `data-suggested` stays on it. The text depends on the page:
names (an empty field takes the grey name; ▾ picks a list), choices (the
suggested option is already marked), values (keep the value and press «Далее»,
type another, or pick one from ▾). No store state: the disclosure is native
and closes when the page changes.

**Names.** `parties.names` and `people.names` become plain sections, one page
each. `BOOK_LIMITS.namesPerPage` becomes 8 and caps the balanced parts the way
`partRows` caps percents pages. A names page stores pairs of texts per entity —
a pick (a catalog ID or empty) and a typed name:

| Event | Result |
| --- | --- |
| Naming «свои» chosen | every pick empty |
| Naming «список 2022» chosen | picks are the first lists in seat order |
| Naming «учебные шесть» chosen | picks are the six example lists |
| A list picked in a field | that field's name is cleared; if another field held the list, the two fields swap pick and name |
| «Своё название» picked | the pick is cleared, the typed name stays |
| A name typed | the field's pick is cleared: a typed name makes an own entity |
| Stored pick no longer valid, or a duplicate | read as the field's default pick if free, else (lists) the first free list in seat order, else empty |

The entity ID is the pick, or `P{n}` / `G{n}` for an own entity, so a picked
list keeps its catalog colour, name in the interface language and description,
exactly as the catalog naming did. The names page's shape is the naming for
parties and empty for groups. Preferences take the party IDs and the group set
as their shape and coalition pages the party IDs, so changing a list resets
the answers typed for the old one; the Section 14.4 preference rows are
suggested only when the six example groups meet exactly the six example lists.
A length error points at the name text, as now.

**Ready values.** `book.ts` exports language-free option values per page and
field, and which option equals the current text (compared as exact percents or
counts), so the ▾ list opens on the current value. The remainder option uses
the engine's `percentRemainder` over the other fields. The view formats the
labels with `formatDecimal` and the interface strings; choosing an option
calls the same `answerBook` as typing, so validation, narration, parts and
build do not change.

**Lessons.** A new page kind `lesson`, chapter 2, motif `people`, with no
input. It is not an answer page: it never counts as answered, is never listed
as filled automatically, needs no confirmation on skip, and the review's
«Изменить» for chapter 2 opens the group set page. The worked example is built
once, lazily, from `presetInput('israelExample')`: the engine validates it,
computes the votes and returns the composition report of each list on valid
votes; the page draws the shares as bars in the group colours with a legend
and one sentence per list. Nothing in it reads the user's answers.

**Rejected alternative:** an `input` with a `datalist` — it filters its options
by the typed text, so a field showing «70» or «Ликуд» offers only itself, and a
picked list would write interface-language text into the scenario.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Questionnaire draft, names pages | page keys `parties.names` and `people.names` replace `….0`, `….1`, `….2`; texts are pick / name pairs | none — the draft is not stored |
| Questionnaire draft, preferences and coalition shapes | the party IDs replace the naming and count | none |
| Built scenario | a picked list or group has its catalog ID and an empty name; a typed name gives `P{n}` / `G{n}` | none — same fields and values the editor writes |

## Interface Delta

- `src/ui/book.ts`: page kind `lesson` and sections `people.about`,
  `people.mix`; names sections plain; `BOOK_LIMITS.namesPerPage` 8; new exports
  for the option values of a field and the worked group example; `pageParts`
  cuts names pages; `partError` reads only the part's names.
- `src/ui/store.ts`: Next on a lesson turns the page without recording an
  answer; Skip ignores lessons.
- `src/ui/BookView.tsx`: navigation order, «Пример» disclosure, compact names
  with the range line and cue, the ▾ list beside every typed field, lesson
  pages.
- `src/ui/styles.css`: bar spacing, disclosure, joined field and list button,
  two-column names, lesson bars.
- `src/i18n/ru.ts`, `en.ts`, `he.ts`: new strings for the list, its notes, the
  range and cue, the disclosure texts and the two lessons; `book.step.page`
  removed if unused.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None. The build still goes through the editor's edit functions; only which IDs and names it receives changes. The lesson reads votes and composition from the engine for a fixed preset. |
| Where exact rationals are required | The remainder option (engine `percentRemainder`), matching an option to the current text (exact percent or count comparison), and the lesson's group counts and largest group (engine rationals) |
| Ordering / tie rules relied on | Tie order stays the field position; picked IDs are unique by construction (swap on duplicate, resolution on read) |
| Any display rounding near a decision? | No. The lesson shows the engine report's two-place percents; option labels are formatted after the value is chosen |
| How determinism across runs, round trip and locale is proven | Tests: a questionnaire build with picks equals the same scenario typed in the editor; picking the six example lists in the own naming builds the Israeli example's votes and seats; the same answers give the same input in ru, en and he; the lesson's values equal the engine composition of the preset |

## Files

| Path | Change |
| --- | --- |
| `src/ui/book.ts` | names pairs and plain sections, picks, option values, lessons, worked example |
| `src/ui/store.ts` | Next and Skip on lessons |
| `src/ui/BookView.tsx` | navigation, disclosure, names layout, ▾ lists, lessons |
| `src/ui/styles.css` | layout for the above |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | new and removed strings |
| `tests/ui/book.test.ts`, `tests/ui/bookView.test.tsx`, `tests/ui/store.test.ts`, `tests/ui/app.test.tsx` | new tests; amended tests that pinned four names per page and the old keys |
| `tests/e2e/helpers.ts`, `tests/e2e/book.spec.ts`, `tests/e2e/bookFit.spec.ts` | walk through lessons and the new names page; fit with eight names, lists and lessons |
| `doc/spec/elections-simulator.md` | Sections 14.5 and 14.6 as built (at close) |
| `.github/copilot-instructions.md` | repository map line for `book.ts` and `BookView.tsx` (at close) |
| `doc/backlog.md` | M2-25 and M6-06 |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Should a typed name over a picked list rename the list (keep its ID and
   colour) or make an own party? — **Recommendation:** an own party. A field is
   either a list from the catalog or the visitor's own; the editor still
   renames catalog lists for anyone who needs it.
2. Should «Пример» fill something on click, or explain? — **Recommendation:**
   explain. The value is already filled; a click that changes nothing visible
   would confuse more than a short sentence.
3. Do the ready lists belong in the editor too? — **Recommendation:** not in
   this item; filed as M6-06, so this item stays within the questionnaire the
   user reviewed.
4. Eight names on one part, or balanced parts? — **Recommendation:** up to
   eight at once as the user allowed; nine or ten in two balanced parts with
   the range line, so the second part is never a lone one or two names.
5. Where do the lessons go? — **Recommendation:** at the start of chapter 2,
   before the group set choice, so the definition comes before the first
   question that uses it.
6. Should the catalog description stay under a picked list on the names page?
   — **Recommendation:** yes, one short line as now, and also in the ▾ list;
   if the page-fit check fails at 1024 × 576 with eight lists, it stays only in
   the list and the deviation is recorded.

Approved 2026-10-30 on the user's instruction: "vse komentarii do etogo nuzhno zakonchit" and "vsegda predlagai spisok drop down kak option, no takzhe pozvolja pisat nazvanija samostojatelno" (2026-10-30), in autopilot mode; the recommendations above are the decisions.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | The lesson's group count and largest share come from a new engine function `voteSources` in `src/engine/composition.ts`, tested in `tests/engine/composition.test.ts`; `book.ts` reads the votes through `runSeats`. Neither file is in the Files table | The interface may import from the engine only run, schema, edit, numeric, report, coalitions, compare, composition and future. Comparing shares exactly needs `engine/rational`, so the comparison belongs in the engine. No seat path changes |
| /3-implement | `book.ts` exports a small `takesAnswer(page)` helper | The store and the view need the same rule (the opening page, a lesson and the review take no answer); one helper keeps them identical |
| /3-implement | A number picked from a list is written into the field in the notation of the interface language (`3,25` in Russian) | The field shows what a user would type; the parser accepts both separators, so the stored value is the same |
| /3-implement | Back and Next sit in one wrapper (`book__steps`) at the end of the bar | On a phone the bar wraps; the wrapper keeps the two buttons together instead of splitting them across rows |
| /3-implement | The list labels «{list} — {description}» and «{value}%» are joined in code, not stored as interface strings | They read the same in all three languages, and the existing i18n test rejects English and Hebrew strings identical to Russian |
| /3-implement | The names range line and the «Ещё …» cue are 14 px with a tighter line height | At 1024 × 576 the first part of ten catalog lists with their descriptions was 4 px too tall; Open Question 6 keeps the description line |
| /4-close | `tests/e2e/helpers.ts`, listed in Files, is unchanged | `nextTo` already turns pages with Next, which passes the lessons; the walks needed no new helper |
