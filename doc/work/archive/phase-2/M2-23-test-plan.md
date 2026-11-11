# Test Plan — M2-23 Questionnaire Book At Startup

| Field | Value |
| --- | --- |
| item | M2-23 |
| memo | `doc/work/archive/phase-2/M2-23-memo.md` |
| created | 2026-10-30 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/numeric.test.ts` | Vitest (node) | `percentWithin` (comma or point, surrounding spaces, signs, bounds inclusive, the canonical fraction such as `0.0325`, down to 16 decimal places; out of range by the smallest step, empty, letters, exponent, percent sign, two points refused); `percentRemainder` (exact remainder to 100 as an ASCII decimal, negative when over, 100 for an empty list, malformed entries refused); `evenPercents` (whole percents summing to 100 for 1 to 10 parts, larger parts first; `RangeError` for 0, −1, 1.5, NaN, 101) |
| `tests/ui/book.test.ts` (new) | Vitest (node) | Page list for the default book, the six-list path, names five to a page, growth / turnout change / custom cooperation branches, invalid counts following the suggestion, Next and Back along the list; page spec (eight chapters, section, kind, motif, subject, step, fields, choices, ranges); suggestions on every page of an empty draft, even splits, the Section 14.4 table only for the six lists with example groups; entity IDs and names; editing (typed text kept, shape changes re-open per-group pages, names kept by position, symmetric cooperation); validation codes with all five error fields; remainder; answered pages; narrator variants and parameters, the official 2021 and 2022 Knesset facts and the 3.25% threshold since 2014; build (Israeli example seats, filled list in page order, four own parties and groups from an empty draft, editor equivalence, export–import round trip, catalog and palette colours, only confirmed answers, pages behind a no ignored, pure resolution); the module stays free of i18n, rendering and floating point |
| `tests/ui/bookView.test.tsx` (new) | Vitest (node) | The book renders alone (no regions, language switcher, views, preset or export); Hebrew right to left; on every page of the fully branched book: one question, one explanation, a decorative motif slot, Back / Next or Build / Skip; no result markup anywhere before the build; Back disabled on the opening page; chapter label "Глава n из 8 · …" and step "Группа n из N"; focusable question; "Пример" label on suggestions; narrator with the Knesset numbers and the facts link; error only after Next, as an alert, with `aria-invalid`; remainder text; catalog names for the six lists and the example groups; name placeholders; cooperation checkboxes; the six-list count confirmation; the facts page with official numbers, the threshold and the source, and the way back; the review by chapter with edit buttons and "Пример" marks after a change; no raw `book.` key in ru, en, he |
| `tests/ui/store.test.ts` | Vitest (node) | Default screen `app`; loaded input and what counts as changed (edit vs preset, reset, import, set input); Next confirms valid pages (suggestions included) and stops on invalid ones with `attempted`; Back without confirming; `bookGoTo` limited to the current list; facts over the current page; the six-list count confirmation; input, baseline and view untouched until the build; skip with nothing answered, with answers (built input, filled list, view `inputs`, selection cleared, seats 31 / 30 / 12 / 15 / 18 / 14), with a valid or invalid value typed on the current page, over a changed scenario (confirm, cancel); build (view `seats`, ID `questionnaire`, locks cleared, baseline kept, filled list from an unvisited book, answers kept for a return, confirmation over a changed scenario, same input in every language); restart with and without answers; preset replacement with and without changes; the filled list survives edits and is cleared by dismiss, preset, import, reset and set input |
| `tests/ui/app.test.tsx` | Vitest (node) | Only the book while it is open; the "Анкета" button in the toolbar; a built scenario titled by `book.scenarioTitle` with the assumption note in every view and every language, "Моя симуляция" in Russian, no Israeli example note; no assumption note for presets; the filled list in the editor region with section and entity labels and "Скрыть"; the preset confirmation dialog with its text and buttons |
| `tests/ui/names.test.ts` | Vitest (node) | `scenarioTitle` gives `book.scenarioTitle` for an empty-named `questionnaire` scenario in ru, en, he ("Моя симуляция" in Russian) and keeps a typed name |
| `tests/e2e/helpers.ts` | Playwright | `openApp` passes the questionnaire through "Пропустить анкету"; new `skipBook` |
| `tests/e2e/offline.spec.ts` | Playwright | The two reload tests check the language on the questionnaire, then skip it before reading the switcher |
| `tests/e2e/interaction.spec.ts` | Playwright | The second offline context skips the questionnaire before choosing English |
| `tests/e2e/book.spec.ts` (new) | Playwright | Startup on the book alone and skip to the baseline seats; focus on each question and no page turn without a click; error after Next; skip after the six lists gives the filled list and seats 31 / 30 / 12 / 15 / 18 / 14; a walk to the review with five parties builds 24 × 5 seats, the title, the note, and a return keeps the answers; facts page and return; preset replacement confirmation; no serious axe finding on the opening, names, preferences, review and facts pages |

## Happy Path

- A learner opens the file and reads the opening page, then answers one
  question per page — `opens first, alone, and skips to the unchanged
  baseline` (e2e) and `shows one question, an explanation, a picture slot and
  the navigation on every page`.
- The learner chooses four parties and reads the narrator's Knesset facts —
  `answers the party count with the official Knesset numbers` and
  `shows the official results with a way back`.
- The learner picks the six-list set and skips — `skips after the six lists
  and fills the rest from the example` (e2e) and `builds from the answers
  given, fills the rest and lists it`.
- The learner walks to the review and builds — `walks to the review, builds
  and returns with the answers` (e2e) and `builds every answer and opens the
  seat results`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

The engine's electoral paths are not touched. `numeric.ts` gains three exact
input helpers.

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Existing allocation suite; every build validates and allocates (`builds four own parties and groups from an empty draft`, `gives the Israeli example from the six lists, every page confirmed`) |
| Determinism: repeated runs, JSON round trip, ru/en/he | `round-trips through export and import with the same seats`; `builds the same scenario under every language`; `resolves the draft page by page and is pure` |
| Threshold below / at / above | Not changed; the questionnaire stores the threshold text through `setRule` (`stores every typed value exactly as the editor stores it`) |
| Exact remainder tie → tieBreakOrder → party ID | Tie order is the party position 1 to N (`builds four own parties and groups from an empty draft`); the even build gives 30 × 4 and 24 × 5 seats with no cut-off decision by tie order beyond the existing rules |
| Fixtures from exact inputs | `evenPercents` and `percentRemainder` checked against exact decimals; seats 31 / 30 / 12 / 15 / 18 / 14 equal `presetInput('israelExample')` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `builds four own parties and groups from an empty draft`; `opens the editor unchanged when nothing was answered`; empty names keep the default label |
| Single element | One own group: `evenPercents(1)` is `['100']`; the people count accepts 1 |
| All values equal | Even splits of 100 for 1, 2, 3, 4, 6, 7, 8, 10 parts, larger parts first |
| Maximum size (20 / 30 / 10) | Ten parties (two names pages, palette colours 1–10); eight groups; 10 000 seats; the editor keeps the full limits |
| No feasible solution | Not applicable: cooperation pages only write incompatible pairs; the existing search statuses are unchanged |
| Prototype keys | Not applicable: page keys are produced by the page list; `bookGoTo('nonsense')` is ignored |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| English and Hebrew questionnaire wording | Presence is tested in every page of every language; exact wording is pinned in Russian, the language of the request |
| Pictures, animation and page fit at 1280×720, 1366×768, 1440×900 | M2-24 draws the motifs and adds the page-fit checks; M2-23 renders empty decorative slots |
| Focus movement in the unit renderer | Server rendering has no focus; the e2e test checks it in the browser |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-30 | `npx vitest run --reporter=json`; `npm run typecheck`; `npm run lint`; `npx prettier --check` | red: 1786 passed, 200 failed of 1986; typecheck, lint and format clean | Expected: `book.ts`, the numeric helpers and the store actions throw "M2-23: not implemented"; `Book.tsx` renders nothing; no questionnaire strings, toolbar button, filled list, preset dialog or questionnaire title. No earlier test fails. Six new tests pass as guards (empty book constants, source purity, no assumption note on presets, default screen, changed after an edit) |
| 2026-10-30 | `npx vite build`; `npx playwright test` | red: 158 failed, 16 skipped by design | Expected: every spec opens through "Пропустить анкету", which does not exist yet |
| 2026-10-30 | `npx vitest run --reporter=json`; `npm run typecheck`; `npm run lint`; `npx prettier --check`; `npx vite build`; `npm run test:e2e` | green: 1986 of 1986; typecheck, lint and format clean; `dist/elections.html` 294.11 kB; e2e 158 passed, 16 skipped by design | After amendments 1–3; the screen file is `src/ui/BookView.tsx` (memo deviation) |
| 2026-10-30 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 1986 unit; e2e 158 passed, 16 skipped by design; build 294.11 kB |

## Amendments

| Date | Change | Reason |
| --- | --- | --- |
| 2026-10-30 | `tests/ui/book.test.ts` "colours catalog lists by the catalog and own parties by the palette" builds its draft through `walk()` | The old draft set names on pages never confirmed, which contradicted the confirmed-answers-only rule the other tests pin |
| 2026-10-30 | `tests/ui/store.test.ts` "asks before dropping answers and keeps the input" expects four answered pages, not three | Six parties take two names pages, so the walk answers one page more than the test counted |
| 2026-10-30 | `tests/build/offline.test.ts` shared `beforeAll` builds with `NODE_ENV=production` through `vi.stubEnv` | Vitest sets `NODE_ENV=test`, so the Preact preset added JSX debug data and the size test measured 351 795 bytes of a build nobody ships; the shipped file is 294 115 bytes. The 300 kB budget is unchanged |
