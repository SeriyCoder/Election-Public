# Test Plan — M7-13 Compact questionnaire and integrated navigation

| Field | Value |
| --- | --- |
| item | M7-13 |
| memo | `doc/work/archive/phase-3/M7-13-memo.md` |
| created | 2026-11-01 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| tests/ui/compactBook.test.tsx | Vitest | Defaults, compact pages, unknown composition, exact derived/fallback turnout, warnings, import preservation, toolbar and generated seat correctness |
| tests/e2e/compactBook.spec.ts | Playwright | Real compact flow, exact warning boundaries, independent pair ends, three locales, RTL, axe, phone overflow |
| tests/ui/book.test.ts, bookView.test.tsx, store.test.ts | Vitest | Existing questionnaire semantics, exact threshold/tie fixtures, confirmations and revised navigation |
| tests/e2e/book.spec.ts, bookFit.spec.ts | Playwright | Complete flow, six desktop sizes, maximum long names, unchanged no-clipping/no-hidden-control checks |
| tests/engine, tests/build, other tests/ui and tests/e2e | Existing suites | Exact engine, unchanged import roundtrip, shared tab lifecycle, offline budget and 200 ms response |

## Happy Path

Basic selected; six group turnout controls; explicit optional compositions;
growth zero with exact fields; every party willing until its own refusal is
toggled. Build feeds the shared store. Transfer is validated import/export.

## Seat-Calculation Correctness

| Check | Test |
| --- | --- |
| Exact sum, odd sizes, generated inputs | compactBook generated odd seat rules and existing seeded engine property suite |
| Repeated, roundtrip, ru/en/he | compactBook generated rules |
| Threshold below / at / above | existing book exact boundary cases and engine threshold suite retained |
| TieBreakOrder then ID | existing book/allocation suite retained |
| Exact fixtures | 50%/75% group turnout with equal voter shares derives exactly 3/5 |

## Edge And Degenerate Cases

| Case | Coverage |
| --- | --- |
| No groups / unknown | Explicit 70% fallback, no invented compositions |
| Single group | Existing book group-count limits and engine suite |
| Equal values | Default exact shares, generated odd-seat ties |
| Maximum | Eight custom groups / ten questionnaire parties, long names in fit suite; engine 20/30/10 retained |
| No feasible result | Existing zero turnout/threshold/coalition suite retained |
| Imported out-of-range slider rates | Stored 12% growth and −3% annual turnout change survive navigation and untouched questionnaire |

## Deliberately Not Tested

No demographic-law assertion or aggregate growth without a determined population.
No new schema or numerical algorithm is introduced.

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-11-01 | npm test; npm run typecheck | RED: 9 failed, 2971 passed; types pass | Intended defaults, missing compact pages, derived turnout and toolbar failures |
| 2026-11-01 | npx playwright test compactBook.spec.ts --project=desktop --reporter=line | RED: 1 failed | Basic is not selected; a prior Windows backslash selector discovered no tests and is not counted as RED |
| 2026-11-02 | npx vitest run tests/ui/compactBook.test.tsx -t "repair a later invalid group" | RED: 1 failed, 17 unselected | During the still-open tests stage, new overview parts wrongly blocked navigation to a later invalid field; regression written before fixing |
| 2026-11-02 | npx playwright test compactBook.spec.ts --reporter=line | GREEN: 4 passed | Desktop/phone, full unknown-composition build, exact warnings, imported 12% growth and −3% legacy turnout change, directed decisions and shared-tab exports |
| 2026-11-02 | npm test; npm run typecheck; npm run lint; changed-file Prettier; npm run test:e2e | GREEN: 2985 unit/build tests, 350 browser passes, 40 conditional skips; all other gates pass | Full strict six-size fit includes every selectable party and all six growth warnings. HTML 458442 / 460800 bytes. Existing response-budget checks pass. |
| 2026-11-02 | Independent /4-close: npm test; npm run typecheck; npm run lint; changed-file prettier --check; npm run test:e2e | GREEN: 2985 unit/build tests, 350 browser passes, 40 conditional skips; types/lint/format pass | Fresh build remains 458442 bytes, exact 460800-byte limit unchanged; complete offline/RTL/accessibility/fit and response-budget gates rerun |
