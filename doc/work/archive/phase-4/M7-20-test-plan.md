# Test Plan — M7-20 Second Design Revision: Purpose Emphasis, Chapter Fixes, Simulator Pathways

| Field | Value |
| --- | --- |
| item | M7-20 |
| memo | `doc/work/archive/phase-4/M7-20-memo.md` |
| created | 2026-11-12 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/designRevision2.test.tsx` | Vitest | All seven memo behaviours: always-open emphasised purpose card, single primary eight-party button with the user's exact labels, dedicated fifth-party description key with the catalog note unchanged, chapter-2 question-first order with footnote markers, tiles heading and hint, two open-simulator buttons and the accented future tab, the future banner replacing the small caption |

Minimal plan, following the M7-19 precedent and the user's instruction in the
M7-20 request: full suites (unit, build, types, lint, Playwright) run once
after all changes, not per part.

## Happy Path

- Opening page renders the purpose card without a disclosure, hypothesis
  visible, emphasis as rendered strong text with no raw marker characters,
  and the combined Russian purpose text naming demographics and turnout.
- Opening page shows exactly one call-to-action-styled button; it is the
  eight-party questionnaire start and carries the user's verbatim label in
  ru/en/he; no simulator button on the opening.
- `exampleAbout` maps slot 4 (the user's fifth party name in each language)
  to the new dedicated key whose ru/en/he values are the user's verbatim
  texts; the shared catalog note of Yisrael Beiteinu is unchanged; slots 0
  and 7 keep their keys.
- The chapter-2 screen is `people.set`, `people.about`, `people.mix` in that
  order; the rendered screen marks the question with a footnote reference and
  the what-is-a-group lesson as the footnote.
- `panel.tiles` reads «Возможные коалиции» / "Possible Coalitions" /
  «קואליציות אפשריות»; the up-to-four hint exists in all three languages with
  the user's exact Russian wording.
- The Coalitions view renders at least two `open-simulator` actions with the
  exact Russian label «Открыть Симулятор коалиций →», and the future tab
  carries the accent class.
- The future view renders a banner element with the user's exact Russian
  text; `panel.sameNote` is gone from the tables (replaced, not duplicated).

## Seat-Calculation Correctness (mandatory when the engine is touched)

Not applicable: the item changes interface strings, layout and questionnaire
page order only; no file in `src/engine/` changes and nothing feeding the
engine changes. Guards that stay green and prove it:

| Check | Test name |
| --- | --- |
| The eight-party example still serialises identically to `tests/fixtures/new8.json` (descriptions never enter the scenario) | existing `tests/ui/startExamples.test.tsx` |
| Engine determinism and allocation suites unchanged | existing `tests/engine/` suite at the final gate |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Changed fifth-party name no longer shows the description | existing `describes the eight-party example names only while unchanged` (designRevision.test.ts), updated key at implement |
| Hebrew (RTL) exact labels | locale loops in all `designRevision2` tests |
| Emphasis marker never leaks as text | `keeps the purpose and hypothesis always open, with safe emphasis` |
| Only one primary action on the opening | `opens the questionnaire with one saturated primary action` |

## Existing Tests To Update At Implement (approved behaviour supersedes)

| File | Expectation that changes |
| --- | --- |
| `tests/ui/designRevision.test.ts` | Chapter-2 screen order; `exampleAbout` slot 4 key |
| `tests/ui/store.test.ts` | Positions assuming `people.about` opens chapter 2 |
| `tests/ui/bookView.test.tsx`, `tests/ui/naturalBook.test.tsx`, `tests/ui/book.test.ts` | Page-order and lesson-rendering assumptions on the chapter-2 screen, if any fail |
| `tests/e2e/book.spec.ts`, `tests/e2e/bookFit.spec.ts`, `tests/e2e/naturalBook.spec.ts` | Chapter-2 page order in walks and fit lists |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Colours, font sizes, 4 px bar, tab accent styling values | CSS presentation; verified visually and by the existing Playwright fit/accessibility checks at the final gate |
| Click navigation of the simulator buttons in a browser | Covered by the data-action wiring assertions here and the Playwright run at the final gate |
| English/Hebrew wording quality beyond the user's verbatim strings | Deferred to M3-05 by the user |
| Responsiveness at the Section 14.6 sizes | Existing `tests/e2e/bookFit.spec.ts` at the final gate |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-11-12 | `npx vitest run tests/ui/designRevision2.test.tsx` | 7 failed / 7 | RED for the intended reasons: purpose still renders a disclosure; `book.start.eight.fill`, `panel.tilesHint`, `panel.openSimulator`, `panel.futureBanner` keys missing; slot 4 still maps to the catalog key; chapter-2 screen still lesson-first; `panel.tiles` still «Коалиции»; no footnote/banner/cta markup. No syntax or tooling failures. |
| 2026-11-12 | `npx vitest run tests/ui/designRevision2.test.tsx` | 7 passed | GREEN after implementation. |
| 2026-11-12 | `npm test` | 3238 passed / 73 files | Existing chapter-2-order expectations updated per the plan's list (designRevision, book, bookView, naturalBook, store); the eight-party example still serialises identically to `tests/fixtures/new8.json`. |
| 2026-11-12 | `npm run typecheck`; `npm run lint`; `npm run format` | clean | No warnings. |
| 2026-11-12 | `npm run test:e2e` (with `HOSTED_BASE_URL`) | 404 passed, 48 skipped | Includes the hosted capture (2400 × 1260 at 0.5, see memo deviation), the updated bookFit walks (scrolling opening) and axe checks; two earlier red rounds fixed the opening fit, the 14 px minimum on the purpose note and the non-member caption contrast. |
| 2026-11-13 | `npx vitest run tests/ui/designRevision2.test.tsx` | 12 passed | Five new cases for the user's mid-implement additions: the default-lock rule with the zeros fallback, the min-two refusal with notice, kept touched questionnaire locks, supporter recovery through «Выровнять автоматически» (align + rebuild), and the overall-turnout line. |
| 2026-11-13 | `npm test`; `npm run typecheck`; `npm run lint`; `npm run format` | 3243 passed / 73 files; clean | Example figures from the user's file (fixture regenerated); `tests/ui/coalitionWorkspace.test.tsx` updated for the min-two rule. |
| 2026-11-13 | `npm run test:e2e` (with `HOSTED_BASE_URL`) | 404 passed, 48 skipped | `startExamples` walk uses the new figures; `coalitionWorkspace` and `prototypeLook` lock walks assert the min-two hint on two-party scenarios. |
| 2026-11-13 | `npm test`; `npm run typecheck`; `npm run lint`; `npm run format`; `npm run test:e2e` | 3244 passed / 73 files; clean; 404 passed, 48 skipped | Third addition: chapter-2 names under the question with the footnote lesson last, rules screen starting with cooperation, any-locale example-name translation (new unit case); page-order expectations updated in book/store/naturalBook/designRevision tests and the naturalBook/bookFit walks. |
| 2026-11-13 | `npm test`; `npm run typecheck`; `npm run lint`; `npm run format`; `npm run test:e2e` | 3245 passed / 73 files; clean; 404 passed, 48 skipped | Language-mix fix: the frozen experiment basis and the saved baseline now translate untouched example names on a language switch; new unit case freezes an experiment in Russian and checks Hebrew names after the switch. |
| 2026-11-13 | `npm test`; `npm run typecheck`; `npm run lint`; `npm run format`; `npm run test:e2e` | 3245 passed / 73 files; clean; 404 passed, 48 skipped | Experiment snapshot captions: middle card names the changed supporter turnout with overall turnout before → after; third card names the combined new turnout + demographics; the i18n parity suite covers the new keys in all three tables. |
| 2026-11-13 | `/4-close`: `npm test`; `npm run typecheck`; `npm run lint`; `HOSTED_BASE_URL=https://seriycoder.github.io/Election-Public/; npm run test:e2e` | 3245 passed / 73 files; clean; 404 passed, 48 skipped | Close gates. One first-pass flake (`hosted.spec.ts` israel/ru parity under full parallel load) passed in isolation (16/16) and in the full re-run. |
