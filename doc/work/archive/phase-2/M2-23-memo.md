# Memo — M2-23 Questionnaire book at startup

| Field | Value |
| --- | --- |
| item | M2-23 |
| epic | M2 |
| phase | Phase 2 — M2 reopened for the questionnaire, time model and Israeli example |
| status | closed |
| created | 2026-10-30 |
| closed | 2026-10-30 |

## Problem

Section 14.5 asks for a book-like questionnaire as the first screen: one
question per page with a short explanation, a narrator reply and no results
until "Построить мою симуляцию". Today the app opens straight into the full
editor and the results. There is no draft kept apart from the scenario, no
way to skip with a consistent fill-in, no marker for automatically filled
values, and loading a preset silently replaces whatever the user has changed.

## Scope

**In scope**

- A questionnaire screen shown at startup in place of the toolbar, editor and
  results. Pages: an opening page; parties (count, naming, names); people
  (example or own groups, count, names, shares); one preferences page per
  group; one turnout page per group; growth and turnout change, each asked
  yes / no first and then one page per group; seats; threshold; coalitions
  (all may cooperate, or one page per party); review by chapter with
  "Построить мою симуляцию".
- Every page: chapter number and name, page progress, one question, two or
  three sentences, one main input, a decorative illustration slot, Back, Next
  and "Пропустить анкету" always present. Pages change only on a button.
- Narrator replies chosen from the answer (party count range, naming, group
  set, turnout, yes / no pages, threshold, coalition mode); never a computed
  result. Suggested values are labelled "Пример".
- A separate facts page with the Section 14.4 official facts (2021 and 2022,
  threshold since 2014), opened from the narrator and closed with a way back.
- Naming: own names, names from the 2022 catalog in seat order, or the
  six-list educational set; the set changes the party count only after
  confirmation. A typed name always wins over the catalog name.
- The draft is kept apart from the scenario. "Построить мою симуляцию" builds
  the scenario and opens the seat results. "Пропустить анкету" opens the
  editor: with no answers the scenario stays; otherwise it is built from the
  answered pages, every other page takes its suggestion, and the editor lists
  what was filled automatically.
- Confirmation before the questionnaire or a preset replaces a scenario the
  user has changed, before starting the questionnaire over, and before the
  six-list set changes the party count.
- A toolbar button that returns to the questionnaire with the draft kept.
- Scenarios built by the questionnaire: title "Моя симуляция" and a note that
  every number is the user's assumption.
- Russian text written and reviewed; the same keys in English and Hebrew
  (Section 14.1: reviewed in M3-05). No language switcher in the questionnaire.

**Out of scope** (at least two)

- Drawings, animations and reduced motion: M2-24 fills the illustration slot.
- Page fit at 1280 × 720, 1366 × 768 and 1440 × 900 at 100% and 125%: M2-24
  verifies it and splits pages where needed.
- Questions on population total, availability, ballot validity, blocks,
  majority override and tie order: they keep their editor defaults
  (1 000 000, 100%, 100%, none, simple majority, list order).
- Confirmation before an import replaces a changed scenario: choosing a file
  is already an explicit act.
- More than ten parties or eight own groups in the questionnaire: the editor
  allows the full limits.
- Undo of an applied questionnaire (M6-03).

## Approach

Section 14.5. The questionnaire is a language-free answers record held in the
store beside the scenario, not a second scenario. `src/ui/book.ts` owns it:
the draft type, the page list derived from the draft, the suggestion for every
page, page validation, the narrator variant, the confirmation of a page and
the build. `src/ui/BookView.tsx` renders one page from it; `src/ui/store.ts`
holds the draft, the current page, the confirmed pages and any pending
confirmation, and applies a build.

The draft stores raw texts by position: the party count, the naming, party
names, the group set, the group count, group names, shares, preferences per
group, turnout, growth and turnout change per group, seats, threshold, the
coalition mode, government eligibility per party and incompatible party
pairs. An unset value shows its suggestion. A page counts as answered when it
was left with Next while valid, its stored values still fit the current
party and group counts, and they are still valid; a structural change thus
re-opens the pages that depended on it without erasing anything.

The build starts from a skeleton (catalog or numbered IDs, empty names unless
typed, open voting with every party allowed, catalog or palette colours, tie
order by position, population 1 000 000, simple majority, Hamilton) and then
applies the answers through the editor's own edit functions: group fractions,
vote weights, rules, eligibility and pairs. A value typed in the
questionnaire is therefore stored exactly as the same text typed in the
editor. The result is checked by the scenario validator before it replaces
the input.

Suggestions: 4 parties with own names; the six example groups when the lists
are the six-list set, otherwise 4 own groups; shares and preferences as whole
percents split evenly with the larger parts first, or the Section 14.4 table
when both the lists and the groups are the example's; turnout 70%; no growth
and no turnout change; 120 seats; threshold 3.25%; all may cooperate.

Percent checks, the remainder to 100% and the even split are exact and live
in `src/engine/numeric.ts`; the interface does no arithmetic.

**Rejected alternative:** keeping the draft as a scenario edited in place —
every change of the party or group count would have to rewrite weights and
pairs, and an invalid half-typed value would sit in a scenario-shaped object
that "Пропустить" must then repair. Positional answers keep each page
independent and make the fill-in a plain per-page choice.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario | none; questionnaire scenarios use ID `questionnaire` and the existing fields | none |
| Store state | `screen` (book or app), questionnaire state (draft, page, confirmed pages, error shown, facts page, pending confirmation), the input as last loaded, a preset waiting for confirmation, the automatically filled pages | none (interface state only, not saved) |

## Interface Delta

- `src/engine/numeric.ts`: a percent within a range, the remainder of percents
  to 100, whole percents split evenly.
- `src/ui/book.ts` (new): draft, pages, chapters, suggestions, validation,
  narrator, page confirmation, build with the filled pages.
- `src/ui/BookView.tsx` (new): the questionnaire screen.
- `src/ui/store.ts`: screen; open, next, back, go to, facts, skip, build,
  restart, confirm and cancel for the questionnaire; preset request with
  confirmation; filled-pages list and its dismissal.
- `src/ui/App.tsx`: the questionnaire screen, the return button, the preset
  confirmation, the filled-pages list, the questionnaire note.
- `src/ui/names.ts`: the questionnaire title.
- `src/ui/presets.ts`: the Section 14.4 rows exported for the prefill.
- `src/main.tsx`: the store starts on the questionnaire.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None of the electoral paths. New exact helpers check percent ranges, compute the remainder of a percent list to 100 and split 100 into whole percents; they only shape inputs |
| Where exact rationals are required | In the three new helpers (decimal strings parsed to rationals, no floating point) and, unchanged, everywhere downstream of the built scenario |
| Ordering / tie rules relied on | Tie order is the party position, 1 to N; the even split gives the extra percent to the earlier positions |
| Any display rounding near a decision? | No: the remainder to 100 is exact and the Next check requires an exact sum of 100 |
| How determinism across runs, round trip and locale is proven | The build is a pure function of the draft. Tests pin that the questionnaire's six-list path with example groups gives the Israeli example's seats 31 / 30 / 12 / 15 / 18 / 14, that typed values are stored exactly as the editor's edit functions store them, that the built scenario validates and round-trips through export and import, and that the language does not change the built input |

## Files

| Path | Change |
| --- | --- |
| `src/engine/numeric.ts` | percent range check, remainder to 100, even split |
| `src/ui/book.ts` | new: questionnaire model and build |
| `src/ui/BookView.tsx` | new: questionnaire screen |
| `src/ui/store.ts` | questionnaire state and actions, loaded input, preset confirmation, filled pages |
| `src/ui/App.tsx` | screen switch, return button, preset confirmation, filled list, note |
| `src/ui/names.ts` | questionnaire title |
| `src/ui/presets.ts` | export the Section 14.4 rows |
| `src/main.tsx` | start on the questionnaire |
| `src/ui/styles.css` | questionnaire layout, dialogs, filled list |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | questionnaire strings |
| `tests/engine/numeric.test.ts` | the three helpers |
| `tests/ui/book.test.ts` | new: pages, suggestions, validation, narrator, build, fill-in |
| `tests/ui/bookView.test.tsx` | new: page markup, no results, narrator, errors, dialogs, facts, review |
| `tests/ui/store.test.ts` | questionnaire actions, confirmations, loaded input, filled list |
| `tests/ui/app.test.tsx` | screen switch, return button, preset confirmation, filled list, note |
| `tests/ui/names.test.ts` | questionnaire title |
| `tests/e2e/helpers.ts` | open the app through "Пропустить анкету" |
| `tests/e2e/offline.spec.ts` | the reload tests pass the questionnaire again |
| `tests/e2e/book.spec.ts` | new: startup, skip, the six-list path, return, fill-in |
| `doc/spec/elections-simulator.md` | Section 14.5 as built |
| `.github/copilot-instructions.md` | repository map |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. What is the draft? — **Recommendation:** a language-free record of raw
   answers by position, kept in the store; an unset answer shows its
   suggestion; a page is answered when left with Next while valid and its
   stored values still fit the current counts.
2. How is the scenario built? — **Recommendation:** a skeleton plus the
   editor's own edit functions, then the validator, so that the questionnaire
   and the editor store the same text the same way.
3. Which ranges does the questionnaire accept? — **Recommendation:** 2 to 10
   parties (the 2022 catalog has ten lists and a preferences page must fit),
   1 to 8 own groups, names up to 200 characters, seats 1 to 10 000, percents
   0 to 100 and changes −100 to +100; the editor keeps the full limits.
4. Which values are suggested? — **Recommendation:** those listed under
   Approach; 4 parties because the text of (d) starts there and the neutral
   preset has four.
5. Does "Пропустить анкету" keep a valid value on the current page? —
   **Recommendation:** yes, it counts as leaving the page forward; an invalid
   one takes the suggestion and is listed as filled.
6. When is the scenario "changed"? — **Recommendation:** when the input is
   not the one last loaded at startup, from a preset, an import, a build or a
   reset to the baseline; an edit counts even if typed back.
7. What needs confirmation? — **Recommendation:** a build or skip that would
   replace a changed scenario, a preset load over a changed scenario,
   starting the questionnaire over once anything is answered, and the
   six-list set when the party count is not six. Import does not.
8. Who decides that the questionnaire opens first? — **Recommendation:** the
   entry point: `main.tsx` creates the store on the questionnaire, while
   `createStore()` keeps the app screen, so tests and the editor-only paths
   stay as they are.
9. How are questionnaire scenarios labelled? — **Recommendation:** scenario ID
   `questionnaire`, title "Моя симуляция", and a results note that every
   number is the user's assumption, not an election result or a poll.
10. Where is the filled list shown? — **Recommendation:** at the top of the
    editor region until dismissed or until the scenario is replaced.
11. What does M2-23 do for pictures? — **Recommendation:** every page names a
    motif and renders an empty decorative slot; M2-24 draws the motifs.

Approved 2026-10-30 on the user's instruction for an autonomous run: "izuchi vnedrenie, vizualizaion i implement vse eto, do nachala M2" (2026-10-30), in autopilot mode; the recommendations above are the decisions.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | Skip confirms the current page only when it holds a typed value that is valid; an untouched suggestion there is filled and listed like any other unanswered page | Refines Open Question 5: an untouched page was never answered, so the filled list must name it |
| /2-tests | The store applies a build without a runtime validator gate | Open Question 2's validator step is proven by tests instead (`accepts every suggestion`, the round trip, editor equivalence, every build validated in `book.test.ts`); an invalid build would still open in the editor with its issues listed |
| /2-tests | `tests/e2e/interaction.spec.ts` also changes: its second offline context opens the file directly and must skip the questionnaire | Missing from the Files table |
| /3-implement | The screen is `src/ui/BookView.tsx` exporting `BookView`, not `src/ui/Book.tsx` | Windows paths ignore case, so `./Book` resolved to the model `book.ts` and the screen rendered nothing; the references above are updated |
| /3-implement | `tests/build/offline.test.ts` changes: the size test now measures a production build | It measured a test-mode build with JSX debug data (351 795 bytes); the shipped file is 294 115 bytes, inside the unchanged 300 kB budget. Test-plan amendment 3 |
| /3-implement | Two test expectations corrected (`book.test.ts` colours draft, `store.test.ts` answered count) | Both contradicted the approved rules; test-plan amendments 1 and 2 |
