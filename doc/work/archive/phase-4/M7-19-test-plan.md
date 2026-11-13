# Test Plan — M7-19 Design revision

| Field | Value |
| --- | --- |
| item | M7-19 |
| memo | `doc/work/archive/phase-4/M7-19-memo.md` |
| created | 2026-11-12 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

Minimal plan by the user's decision of 2026-11-12 (memo Deviations): a few
focused tests now, existing suites updated and the full gates run once after
all three parts.

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/designRevision.test.ts` | Vitest | Screens, screen navigation, turnout defaults, exact small-share rule, example descriptions, custom tile edit |
| Existing `tests/ui/*`, `tests/e2e/*` | Vitest, Playwright | Updated at the end for screens; final regression |

## Happy Path

- The questionnaire has the eight agreed screens; Next confirms every page of a
  screen; Back and review links open the screen holding a page.
- Example turnout suggestion: haredi 85%, arab 70%, others 70%.
- Shares at or below 7% are found exactly (7, 6.99, "7,00" yes; 7.01 no).
- Example descriptions appear only for the unchanged example name in its slot.
- A custom tile is edited in place with its key kept.

## Seat-Calculation Correctness (mandatory when the engine is touched)

The engine is not touched. The final run of the unchanged engine, build and
`startExamples` suites (eight-party example identical to `new8.json`) is the
regression check.

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Existing engine suite, unchanged |
| Determinism: repeated runs, JSON round trip, ru/en/he | Existing `startExamples` serialisation test |
| Threshold below / at / above | Not affected |
| Exact remainder tie → tieBreakOrder → party ID | Not affected |
| Fixtures from exact inputs | `new8.json` comparison, unchanged |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Share exactly 7, comma decimal, invalid text | marks shares at or below 7% exactly |
| Unknown tile key | edits a custom tile in place, keeping its key |
| Renamed example party | describes the eight-party example names only while unchanged |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Tint colours and lock brightness | Visual; axe contrast check in the final browser run |
| Graphical review layout | Covered by updated render and browser tests at the end |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-11-12 | npx vitest run tests/ui/designRevision.test.ts | 6 failed of 6 (red) | Missing APIs: screens, smallShares, exampleAbout, replaceCustomTile |
| 2026-11-12 | npx vitest run tests/ui/designRevision.test.ts | 6 passed of 6 (green) | After parts A-C |
| 2026-11-12 | npm test; npm run typecheck; npm run lint; npm run test:e2e -- --workers=2 | 3231 unit passed (72 files); types and lint clean; 404 browser passed, 48 skipped | Single final gate run; offline file 465.17 kB, within the 900000-byte budget; four layout defects found by the fit suite fixed first (book height not bounded, public notice stretched by flex-basis, opening page 11 px too tall, combo arrow shrinking) |
