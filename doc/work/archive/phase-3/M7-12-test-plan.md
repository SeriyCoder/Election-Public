# Test Plan — M7-12 Integrated coalition and demographic panels

| Field | Value |
| --- | --- |
| item | M7-12 |
| memo | `doc/work/archive/phase-3/M7-12-memo.md` |
| created | 2026-11-01 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| tests/engine/panel.test.ts | Vitest | Raw independent edits, exact alignment, unknown population, correction invariants, locked smoothing, fallback, impossible locks, 60-round precision regression |
| tests/engine/supporterTurnout.test.ts | Vitest | Frozen cohorts, endpoints, every old year, year 50, all competitors, zero turnout, exact seat boundaries, deterministic locale/round-trip results |
| tests/engine/coalitionVariants.test.ts | Vitest | All compatible nonempty sets, majority proximity, both refusal directions |
| tests/ui/panel.test.tsx | Vitest SSR | Translated panel surfaces, ordered tabs, two modes and playback |
| tests/e2e/panel.spec.ts | Offline Edge | Raw edits and repair focus, smoothing, confirmation/cancel/Escape, readonly experiment, enlarged editing, repeated smoothing, tile lifecycle, directed decisions, overflow and axe |
| tests/e2e/futureWorkspace.spec.ts | Offline Edge | Three snapshots, all-party comparison, enlargement, integer playback/end stop/edit pause |
| Existing schema/projection/futureRange, store/chooser/futureScanRunner/futureCoalitions and future browser tests | Existing runners | Explicit 50-year, four-coalition and ordered-navigation contract; prior legacy coverage retained |

## Happy Path

Edit shared votes/compositions, align/smooth explicitly, inspect population
against the frozen source, correct baseline turnout with confirmation, freeze
and reset a supporter experiment, choose fixed/custom coalition memberships,
compare demographic and turnout futures through year 50, and export only the
valid authoritative scenario.

## Seat-Calculation Correctness

| Check | Test |
| --- | --- |
| Exact sum, odd parliament, generated cases | 80 generated target/year combinations, 101-seat fixture |
| Determinism | Repeat and JSON round trip in each of ru/en/he |
| Threshold below / at / above | 49.9999 / 50 / 50.0001 supporter targets with exact 50% threshold |
| Exact remainder tie | Reversed persisted order, then equal order and ID |
| Independent fixtures | Existing 0–20 engine agreement and rational 11/10 to power 50 |
| No float decisions | Exact rational expectations; existing static architecture tests |

## Edge And Degenerate Cases

| Case | Coverage |
| --- | --- |
| No groups / unknown composition | Typed unavailable basis and no inferred population |
| Zero-vote party / all turnout zero | No division by zero; explicit no allocation |
| Equal values | Exact persisted-order seat tie |
| Maximum reference size | Existing 20-group/30-party/10-block range scan now 51 years |
| No feasible match | Named row-lock refusal or row-normalized named group fallback |
| Repeated fractions | 60 edit/smooth/lock/fallback rounds and 12 browser rounds |
| Invalid percent | Empty, text, negative, over 100 and exponent notation |
| Source changes | Browser Data consistency and correction/experiment reset checks |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Prototype HTML or scripts | Immutable reference artifacts, not the shipped app |
| M7-13 questionnaire and toolbar changes | Separate approved backlog item |
| Real-voter demographic claims | Model assumptions only |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-11-01 | npm test (initial) | 37 new failures, existing tests pass | Corrected one invalid test fixture before final RED |
| 2026-11-01 | npm test | 53 failed, 2901 passed, 2954 total | Intended missing panel/cohort/variant behavior and changed 50/four/navigation expectations; behavior-free typed engine stubs only |
| 2026-11-01 | npm run typecheck | PASS | RED tests compile |
| 2026-11-01 | npm run build | PASS | Existing offline application, no production implementation yet |
| 2026-11-01 | npx playwright test 'panel.spec\|futureWorkspace.spec' --project=desktop --timeout=8000 --workers=2 | 7 failed | Each missing accepted-panel control; earlier backslash filename filter matched no tests and was corrected |
| 2026-11-01 | npm test (implementation) | 2963 passed, 57 files | Includes unchanged single-file/size gate and exact decoded locale values |
| 2026-11-01 | npm run typecheck; npm run lint; changed-file Prettier | PASS | Separate sequential commands, no skipped failures |
| 2026-11-01 | npm run test:e2e (implementation) | 346 passed, 40 conditional skips | Offline Edge desktop/phone, accessibility, layouts and 200 ms performance gates; HTML 451354 bytes |
| 2026-11-01 | Independent close: npm test, typecheck, lint, formatting | PASS | 2963 tests; no production changes since implementation |
| 2026-11-01 | Independent close: npm run test:e2e | 345 passed, 1 failed, 40 skips | Future-range responsiveness measured 256.5 ms against the unchanged 200 ms gate; closing blocked |
| 2026-11-01 | Focused future-range responsiveness, 5 repetitions | 5 passed | Isolated progress rendering; all years and the 200 ms assertion unchanged |
| 2026-11-01 | Resumed implementation: full unit/types/lint/format/browser gates | PASS | 2963 Vitest tests; 346 browser passes, 40 skips; 451400-byte HTML |
| 2026-11-01 | Second independent close: npm test, typecheck, lint, formatting, npm run test:e2e | PASS | 2963 tests in 57 files; 346 browser passes, 40 skips; HTML 451400 bytes; no gate relaxed |

Intermediate browser gate failures were retained during repair: 25, then 11
old disclosure/layout issues, 10 contrast failures, and one near-budget future
render failure. Final GREEN follows their repairs; assertions were not
disabled and performance/size limits were not increased.

The existing old-panel linked-edit tests remain as regression coverage for
the separately retained advanced/legacy operations. Any replacement of their
presentation assertions must be explicitly recorded, not silently weakened.
