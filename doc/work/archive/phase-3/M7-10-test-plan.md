# Test Plan — M7-10 Demographic future and critical party sets

| Field | Value |
| --- | --- |
| item | M7-10 |
| memo | `doc/work/archive/phase-3/M7-10-memo.md` |
| created | 2026-10-31 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/futureRange.test.ts` | Vitest | Exact graphic inputs, set summaries, exhaustive crossing classification and projected seats. |
| `tests/engine/helpers/futureFixtures.ts` | Shared fixture | Separately derived population, nonmonotone and final-year boundary cases. |
| `tests/ui/futureVisuals.test.tsx` | Vitest | Accessible graphics, unknown and zero data, transient sets, locale keys and legacy field visibility. |
| `tests/ui/futureScanRunner.test.ts` | Vitest | Worker messages, progress, cancellation, stale messages, errors, retry and store connection. |
| `tests/ui/editor.test.tsx` | Vitest | Existing group editor checks updated for the deliberate hidden-field behavior while retaining value-preservation checks. |
| `tests/ui/store.test.ts` | Vitest | Existing UI-to-engine import allowlist admits the approved `futureRange` API; arithmetic restrictions stay intact. |
| `tests/ui/futureCoalitions.test.tsx` | Vitest | Existing three-coalition behavior; element extraction now balances nested sections, with assertions unchanged. |
| `tests/e2e/futureRange.spec.ts` | Playwright | Offline desktop and phone, English and Hebrew, RTL position, keyboard, axe, overlapping sets and worker errors. |
| `tests/e2e/performance.spec.ts` | Playwright | Existing 200 ms responsiveness budget while a real maximum-size future scan starts and runs. |
| Existing engine, UI, build and browser suites | Vitest / Playwright | Existing projections, followed coalitions, compatibility, offline CSP and unchanged size budget. |

During the RED step, `src/engine/futureRange.ts` and
`src/ui/futureScanRunner.ts` contained type contracts and throwing compile-only
stubs. No new behavior was implemented in that step. The stubs made each
missing behavior fail explicitly rather than failing test discovery or type
checking. The 2026-11-01 implementation replaces them with the exact helpers
and cancellable worker runner.

## Happy Path

- Compare exact group populations and party valid votes for year 0 and the
  selected year, keeping the measures and absolute scales distinct.
- Select independent red and orange sets, including an overlapping party;
  show current and projected votes and seats without claiming cooperation.
- Visit all 21 years, report progress, and identify the first exact half-seat
  crossing even when the curve subsequently falls.
- Keep the three existing followed coalitions, locale changes and selected
  display year independent of the range scan.

## Seat-Calculation Correctness

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and seeded property cases | `matches exact allocations and the full seat sum for seeded scenarios`; `uses the exact tie order for an odd parliament and the half-seat boundary` |
| Determinism: repeated runs, JSON round trip, ru/en/he and membership order | `is deterministic after a JSON round trip, membership reordering and locale changes` |
| Threshold below / at / above | `respects the exact threshold at %s` |
| Exact remainder tie → tieBreakOrder → party ID | `uses the exact tie order for an odd parliament and the half-seat boundary`; `uses party ID as the final exact tie breaker when persisted order is equal` |
| Fixtures from exact inputs, independently calculated | `establishes exact nonmonotone and final-year fixture boundaries independently`; `separates eligible populations from all valid votes in both years` |
| Half versus majority and override | `distinguishes 60 of 120 seats from both the ordinary and override majorities`; `does not round down half of an odd seat count` |
| No floating-point decisions | The scan must use existing `runSeats`, exact rationals and integer seat comparisons; expected fixtures are from independent rational arithmetic, never rounded labels. |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty selections | `starts empty and permits the same party in both sets`; `starts no work while both sets are empty` |
| Single party and all parties | `handles a single party selected in both sets without inventing another party`; `deduplicates membership, preserves party order and refuses unknown IDs`; 20/30/10 test |
| Equal votes and odd seat count | Exact tie and party-ID fallback tests |
| Maximum size: 20 groups / 30 parties / 10 blocks | `handles the 20-group, 30-party, 10-block reference size without changing seats` |
| No valid votes or no qualifying parties | `does not turn a no-allocation result into zero seats or a zero vote share`; `keeps exact votes when every party is below the threshold`; incomplete scan with no allocation |
| Nonmonotone, year 0 and year 20 | `finds a nonmonotone first crossing even though year 20 falls below half`; `proves a crossing in year zero even if a later year is missing`; `includes the final year and finds its first crossing` |
| Missing previous or subsequent years | Synthetic missing-year cases and `reports a first known crossing after a real threshold-created allocation gap`; complete versus incomplete negative cases |
| Unknown demographics or genuinely zero totals | `preserves known present votes when populations and the future are unknown`; known and zero party-mode populations; unavailable-year and zero-vote UI cases |
| Legacy annual turnout changes | `keeps the original and explicitly converted turnout projections distinct`; hidden-field preservation and explanation; existing engine future tests |
| Worker disabled, failed, cancelled or stale | Dedicated runner tests for each state; no blocking fallback; browser progress/cancel/stale-message and worker-unavailable retry cases |
| Scenario replacement and party deletion | Critical-set state lifecycle tests; existing followed-coalition lifecycle tests |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| A political prediction or guaranteed coalition | The feature is an educational hypothetical; the user-defined sets do not establish political cooperation. |
| Current or historical social-group composition | Official 2022 election counts do not supply those data; unknown data must remain unknown. |
| Network access to election data | Runtime and tests remain offline; historical reference was handled in earlier items. |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-31 | `npm run typecheck`; `npm run lint` | Pass | Compile-only contracts and tests type-check and lint; no behavior is implemented. |
| 2026-10-31 | Focused Vitest: `futureRange.test.ts`, `futureVisuals.test.tsx`, `futureScanRunner.test.ts`, `editor.test.tsx` | RED: 175 passed, 68 failed | Before the last five cases were added; all failures came from the missing feature, compile-only stubs or the still-visible legacy control. |
| 2026-10-31 | `npm test -- --reporter=json --outputFile <session-report> --no-color` | RED: 2,822 passed, 73 failed | Final full suite: 32 engine, 13 runner, 19 future-visual and 9 intentionally updated editor failures; all were checked against their intended causes, with no unrelated failure. |
| 2026-10-31 | `npx vitest run tests\ui\store.test.ts -t "imports only approved engine APIs" --reporter=dot --no-color` | Pass: 38 selected | The first full run exposed the new engine module missing from the import allowlist; adding only the approved API restored the boundary check. |
| 2026-10-31 | `npx vite build` | Pass | Offline HTML: 442,855 bytes, below the unchanged 460,800-byte limit. |
| 2026-10-31 | `npx playwright test futureRange.spec.ts --project=desktop --grep "keeps the year control" --workers=1 --timeout=15000 --reporter=list` | RED: 1 failed | The year selector is absent for an unavailable projection, as expected. |
| 2026-10-31 | Focused Playwright graphics and last-year selection, desktop | RED: 2 failed | The population graphic and critical-party checkbox do not exist yet. |
| 2026-10-31 | Focused Playwright progress/cancel and 200 ms scan, desktop | RED: 2 failed | Both cases reach the future view but the critical-party checkbox does not exist yet. The responsiveness measurement itself awaits implementation. |
| 2026-10-31 | `npx playwright test performance.spec.ts --project=desktop --grep "a long coalition search shows progress" --workers=1 --timeout=30000 --reporter=list` | Pass: 1 | The pre-existing responsiveness test still passes after extending its measurement helper. |
| 2026-11-01 | Focused engine/future/runner and UI/editor Vitest runs; `npm run typecheck` | Pass: 302 tests; types pass | An initial duplicate editor binding was removed; no expectations changed. |
| 2026-11-01 | First full `npm test`; types and lint | 2,890 passed, 9 failed; types/lint pass | Eight failures were the old nested-section extractor; one was the 461,503-byte HTML exceeding 460,800 bytes. Both are documented in the memo. |
| 2026-11-01 | Focused `futureCoalitions.test.tsx`, `offline.test.ts`, `compactLocales.test.ts` | Pass: 53 | Balanced extraction retains every assertion; the larger dictionary preserves all three exact translation tables and restores the size gate. |
| 2026-11-01 | First full `npm run test:e2e -- --reporter=line` | 331 passed, 1 failed, 40 conditional skips | The scan finished but its status container was empty and therefore invisible. The real failure also reproduced with one worker. |
| 2026-11-01 | `npm run build`; `npx playwright test performance.spec.ts --project=desktop --grep "a future range scan" --workers=1 --reporter=line` | Pass: 1 | A localized, live completion notice makes the done state visible. The actual scan stays within the unchanged 200 ms budget. |
| 2026-11-01 | Final `npm run format`; `npm test -- --reporter=dot --no-color`; `npm run typecheck`; `npm run lint` | GREEN: 2,899 tests in 53 files; all other gates pass | Includes existing exact seats, round trips, legacy projections, static layer guards and production-table equivalence. |
| 2026-11-01 | Final `npm run test:e2e -- --reporter=line` | GREEN: 332 passed, 40 conditional skips, 0 failed | Both projects, three-language accessibility, phone fit, RTL placement, real workers, cancellation, retry and performance. No test was newly skipped. Rebuilt offline HTML: 459,267 bytes of the unchanged 460,800-byte budget. |

## Implementation File Walk

The memo's file list was checked after implementation. Changes are confined
to exact future helpers and projected-population metadata; the future runner,
shared subscription hook and worker entry; store, App, Future, focused future
visuals and the hidden legacy field; all three locale tables, CSS and
lossless locale packing; the existing section-extraction test helper; the
working documents, queued integration requirements and rebuilt offline HTML.
Existing threshold, Hamilton, schema, coalition selection and future report
helpers remain authoritative and pass their original suites. Specification
sync, archiving and the backlog completion tick belong to `/4-close`, not
this implementation step. The accepted standalone prototypes are unchanged.
