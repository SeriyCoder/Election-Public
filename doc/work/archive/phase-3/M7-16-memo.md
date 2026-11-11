# Memo — M7-16 Two ready examples at the start

| Field | Value |
| --- | --- |
| item | M7-16 |
| epic | M7 |
| phase | Phase 3 — M7 party-first coalition simulation |
| status | closed |
| created | 2026-11-02 |
| closed | 2026-11-02 |

## Approval

The user approved on 2026-11-02: "vse ispolni samostojatelno" ("carry out
everything yourself"), given together with the M7-16 request. This approves the
recommendations below. It does not allow skipping steps, faking RED, weakening
tests, raising the 460800-byte offline limit or the 200 ms responsiveness
budget, or placing electoral arithmetic outside `src/engine/`.

## Problem

The questionnaire's opening page offers only "Далее" and "Пропустить анкету".
The user wants to begin, without typing anything, from one of two ready
examples — exactly the eight-party set of the user's file "New 8 parties.json"
(seven own groups, turnout, shares, full compositions, growth and 20 directed
refusals) or the existing six-list 2022 educational example — and then either
go straight to Coalitions and Demographic Future, or leaf through the
questionnaire with every value already filled in and editable. Today the only
way to get the eight-party set is to import the file in the editor, after which
the questionnaire stays empty.

## Scope

**In scope**

- The opening page (`intro`) shows four compact choices, in ru/en/he:
  1. **Начать с нуля** — the questionnaire from an empty draft (current
     behaviour of "Далее").
  2. **8 партий (свободные названия)** — the user's eight-party example, with
     two buttons: "Листать анкету" and "К коалициям".
  3. **2022 (учебный)** — the six-list 2022 educational example, with the same
     two buttons.
  4. **Пропустить анкету** — the current skip, landing on Coalitions where
     "Импорт / Настройка" stays available.
- "Листать анкету" replaces the draft with the example's answers, marks every
  answer page answered and turns to `parties.count`; each page then shows the
  example's values (names, groups, turnout, shares, compositions, growth,
  seats, threshold, refusals), all editable, and the review builds through the
  existing `buildBook` path. "К коалициям" builds the same scenario and opens
  Coalitions directly.
- Untouched, the eight-party example builds a scenario whose canonical
  serialisation (`serializeScenario`) equals importing the user's file, so
  seats, coalitions and futures are equal; the 2022 example builds the
  questionnaire's party-mode educational example (seats 31/30/11/14/18/16, the
  same as `israelExample`).
- Confirmation before an example or a fresh start replaces existing answers,
  and before "К коалициям" replaces a changed editor scenario.
- Size: the bundle keeps its 460800-byte limit by moving the Russian
  translation keys into the deflated translation payload at build time
  (`build/compactLocales.ts`); the 19.9 KB plain key list leaves the file.

**Out of scope**

- A general imported-scenario → questionnaire mapping (any JSON file opened in
  the questionnaire). The two examples are encoded as questionnaire answers;
  a general mapping would need to express blocks, notes, own colours,
  non-standard populations, majorities and tie orders the questionnaire cannot
  ask. Not requested beyond the two examples; no backlog item is added by this
  memo.
- An import button on the opening page. Import stays on the Coalitions page
  ("Импорт / Настройка"), one click after "Пропустить анкету"; adding a second
  file input to the questionnaire costs size and a second import path for
  little gain.
- English and Hebrew wording review of the new strings (M3-05).
- The group-mode `israelExample` preset itself stays unchanged (fixture data
  for tests; legacy read-only in party views).

## Approach

**Examples as questionnaire answers.** The user's file is itself a
questionnaire build: id `questionnaire`, empty scenario name and notes,
population 1000000, valid-ballot rate 0.999, party mode, eight lists named by
the user with catalog picks `shas` and `utj`, seven own groups with catalog
picks `secular`, `religious`, `haredi`, `other`, colours by palette position
or catalog, tie order by position, overall turnout derived (1560000/2564959).
So the example is stored as the page answers that produce it, in a new
language-free module `src/ui/startExamples.ts`:

- the answers per page as plain text lists (counts, choice keys, name pairs,
  percent decimals, refusal flags), the same texts a person types;
- `startExample(id)` applies them in page order through `editPage` and
  `confirmPage` (shapes, IDs and colours computed by the questionnaire itself),
  confirms every remaining answer page from its suggestion, and returns the
  draft with every answer page answered.

No float and no scenario→draft arithmetic: the values are the decimal texts the
questionnaire already converts with `percentToExactFraction`. A test proves the
built scenario's canonical serialisation equals parsing a fixture copy of the
user's file (`tests/fixtures/new8.json`, byte-identical copy), and that
seats, coalitions and a projected year are equal.

The user's names are kept exactly, trailing spaces included ("Религиозный
сионизм ", "Другой Государственный лагерь ", "Арабы "); they are user data,
rendered as inert text like any typed name, and shown in every interface
language (as an imported file would be). The schema does not trim names on
import, so neither does the example.

The 2022 example is the answers {six lists, naming `example`}; every other page
takes its existing suggestion (Basic group set with knitted kippot at 0 in
every composition, 70% turnout, the described shares and one-decimal
compositions, zero growth, 120 seats, 3.25%, everyone cooperating). This is the
party-mode educational example the questionnaire already offers through
"Пример" — the same seats as the group-mode `israelExample`, but editable in
Coalitions and Demographic Future, where a group-mode preset would be legacy
and read-only.

**Store.** `BookState` gains `start` — the example choice waiting for a
confirmation — and the store a `startBook(example, open)` action:

- `startBook(null, false)` (from scratch): with no answers, turn to
  `parties.count` on the empty draft; otherwise confirm `restart` and then
  start empty at `parties.count`.
- `startBook(id, false)`: with no answers, put the example draft and its
  answered pages in the book at `parties.count`; otherwise confirm
  `example-book` first.
- `startBook(id, true)`: with no answers and an unchanged scenario, build the
  example through `applyBook` and open Coalitions; otherwise confirm
  `example-open` first. The questionnaire keeps the example's answers, so a
  later "Анкета" shows them.
- `confirmBook` performs the waiting choice; `cancelBook` drops it.

**View.** On `intro` the text column shows a compact list of four cards
(title, one-line description, buttons) under the question; the navigation keeps
Back/Next/"Пропустить анкету" unchanged. Card buttons carry `data-start` and
`data-start-mode` attributes; the skip card uses `data-action="start-skip"`
(the navigation's `book-skip` stays unique). The page must still fit the six
Section 14.6 sizes without scrolling.

**Size.** `compactLocales` deflates `[keys, values]` together for `ru`; `en`
and `he` keep reading keys from `ru`. Saves about 15 KB, comfortably covering
the new strings, the example answers and the cards (estimated under 4 KB).

**Rejected alternative:** storing the user's JSON (deflated) and mapping any
scenario back to questionnaire answers — larger, needs a lossy general mapping
for fields the questionnaire cannot ask, and the drafted answers already
reproduce the file exactly.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario JSON | None; examples build ordinary version-5 party-mode scenarios | None |
| `BookState.start` | New UI-only pending start choice (not persisted) | None |
| `BookConfirm` | Adds `example-book`, `example-open` | None |

Fields of the user's file and how they are expressed:

| Scenario field | Expressed by |
| --- | --- |
| party names, groups, picks, counts | names pages (pick or own text) |
| group turnout, growth | turnout and growth pages |
| party shares, compositions | votes.shares and compose pages |
| seatCount, threshold | rules pages |
| partyRefusals (20), eligibility | cooperation page |
| id, name, notes, populationTotal, majority, allocation, validBallotRate, turnoutChange 0, colours, tieBreakOrder, no blocks, overallTurnout | questionnaire constants or derived exactly; equal to the file |

No field is dropped: every field of the file is either asked or equals the
questionnaire's constant, which the equality test proves.

## Interface Delta

- `src/ui/startExamples.ts`: `START_EXAMPLES` (`eight`, `israel`) and
  `startExample(id)` returning `{ draft, answered }`.
- `Store.startBook(example: StartExampleId | null, open: boolean)`.
- Opening page: four choice cards; new i18n keys `book.start.*` and
  `book.confirm.example-book`, `book.confirm.example-open` in ru/en/he.
- Build: `compactLocales` no longer emits the Russian key list as text.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None. Examples are answers converted by the existing exact questionnaire build; all results come from the unchanged engine |
| Where exact rationals are required | Percent texts to exact fractions (existing `percentToExactFraction` / `exactPercentShare`); derived overall turnout exact (1560000/2564959) |
| Ordering / tie rules relied on | Tie order by questionnaire position, equal to the file's `tieBreakOrder` |
| Any display rounding near a decision? | No |
| How determinism across runs, round trip and locale is proven | Canonical serialisation of the built example equals the fixture; seats, coalition list and a projected year equal those of the imported fixture; the build is repeated with the store in ru, en and he and gives identical input |

## Files

| Path | Change |
| --- | --- |
| `src/ui/startExamples.ts` | New: language-free example answers and `startExample` |
| `src/ui/book.ts` | `BookState.start`, new `BookConfirm` keys |
| `src/ui/store.ts` | `startBook`; confirm/cancel handle the start choice |
| `src/ui/BookView.tsx` | Opening page start cards |
| `src/ui/styles.css` | Start cards layout |
| `src/i18n/ru.ts`, `en.ts`, `he.ts` | New strings |
| `build/compactLocales.ts` | Russian keys inside the deflated payload |
| `tests/fixtures/new8.json` | Byte-identical copy of the user's file |
| `tests/ui/startExamples.test.ts(x)` | Example equality, prefilled pages, store flows, intro render |
| `tests/build/compactLocales.test.ts` | Key text absent from the translation bundle |
| `tests/e2e/startExamples.spec.ts` | Browser: both examples to Coalitions and Future, prefilled leafing, opening-page fit |
| `doc/spec/elections-simulator.md` | §14.5 opening-page choices (at close) |
| `.github/copilot-instructions.md` | Map entry for `startExamples.ts` (at close) |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Encode the examples as questionnaire answers instead of a stored scenario
   plus a general scenario→questionnaire mapping? — **Recommendation:** answers;
   exact by construction, proven equal to the file, smallest.
2. Which 2022 example: the group-mode `israelExample` preset or the
   questionnaire's party-mode educational example? — **Recommendation:** the
   party-mode one; same seats, fully editable in Coalitions and Future, and it
   is what the questionnaire's "Пример" already means.
3. Keep the user's trailing spaces in names? — **Recommendation:** keep; they
   are user data and the schema keeps them on import, so the example equals the
   file.
4. Import on the opening page? — **Recommendation:** no; one click away after
   skip, saves size.
5. Pay for the size by moving the Russian translation keys into the deflated
   payload? — **Recommendation:** yes; this changes the existing build test's
   "one `app.title`" assertion to "no key text", recorded as a deviation.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | `tests/build/compactLocales.test.ts`: the "exactly one `app.title`" assertion became "no `app.title`, `book.skip` or `results.empty` key text in the translation bundle" | Approved open question 5: the Russian keys now travel inside the deflated payload, so key text no longer appears once; the exact-table check is unchanged |
| /3-implement | Two test defects fixed in `tests/ui/startExamples.test.tsx`: future seats compared with `toEqual` instead of `JSON.stringify` (BigInt rationals cannot be stringified), and the edit test read `partyRefusals` from the scenario root instead of `coalitionRules` (it compared `undefined` with `undefined`); the edit test now also requires 20 refusals | Both were broken assertions, not behaviour; the replacements are at least as strict |
| /3-implement | `tests/e2e/startExamples.spec.ts` waits for `data-party-seat-state="ready"` instead of visibility of the first seat cell | Since M7-15 the per-party seat cells sit in a collapsed region of the Coalitions page; `book.spec.ts` and `coalitionWorkspace.spec.ts` read them the same way |
| /3-implement | `book.page.intro.explain` rewritten in ru/en/he to introduce the four choices | The old text described only the questionnaire; the page must fit the §14.6 sizes with the new cards |
| /3-implement | HTML shrank from 459,587 to 451,268 bytes | Packing the Russian keys saved more than the examples, strings and styles cost; the 460,800-byte limit is unchanged |
| /4-close | Files table: the opening-page fit at the six §14.6 sizes is proven by the existing `tests/e2e/bookFit.spec.ts` walk (which starts on the opening page), not by `startExamples.spec.ts`; `doc/backlog.md` (tick) and the §14.4 first-screen row of the specification also changed | The fit walk already covered the intro page; no duplicate check was added |
| /4-close | Scenario fields outside the questionnaire (id `questionnaire`, empty name, population 1000000, valid-ballot rate 0.999, derived overall turnout, colours and tie order by position) are not editable in the book | The user's file was itself a questionnaire build, so these equal what the book produces; nothing is dropped |
