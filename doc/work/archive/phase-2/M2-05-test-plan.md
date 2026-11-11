# Test Plan — M2-05 Results: Vote/Seat Tables, Stacked Bars, Seat Diagram

| Field | Value |
| --- | --- |
| item | M2-05 |
| memo | `doc/work/archive/phase-2/M2-05-memo.md` |
| created | 2026-10-28 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/numeric.test.ts` | Vitest (node) | Exact rounding to fixed places: half away from zero, padding, no negative zero, large values, invalid place counts |
| `tests/engine/report.test.ts` | Vitest (node) | Totals, party rows, block rows, segment order and weights, seat sequence, no-allocation, no valid votes, cut-off tie, maximum size, determinism, source scan |
| `tests/ui/i18n.test.ts` | Vitest (node) | Decimal string formatting per locale, big integers, malformed input |
| `tests/ui/results.test.tsx` | Vitest (node, render-to-string) | Panel states, summary, party/block/Hamilton tables, bars, legend, seat diagram, locale formatting, special states |
| `tests/ui/app.test.tsx` | Vitest (node, render-to-string) | Seats placeholder removed; coalitions and compare keep theirs |
| `tests/ui/store.test.ts` | Vitest (node) | UI engine import allowlist adds `report` |

## Happy Path

- Section 8 preset: votes 380000/420000/150000/50000, shares 38.00/42.00/15.00/5.00, seats 46/50/18/6, quota 45.6000, remainder 0.6000 with the remainder seat — `shows the Section 8 votes, shares and seats`.
- The baseline scenario renders a ready results panel with every table, both bars and the seat diagram — `renders in the seats panel for a valid scenario`, `shows votes, shares, status and seats per party`, `draws vote and seat segments in report order with weights`, `draws one seat per seat in sequence order`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `copies seat counts from the allocation unchanged`; `lists one party per seat in segment order`; `handles 20 groups, 30 parties and 10 blocks` (the property test for the sum itself stays in `allocate.test.ts`) |
| Determinism: repeated runs, JSON round trip, ru/en/he | `is identical across runs and after a JSON round trip`; `is the same seat sequence in every language` |
| Threshold below / at / above | `keeps the engine status when rounding meets the threshold` (3.249% shows as 3.25% and stays below a 3.25% threshold); `has no seat values when no party qualifies` |
| Exact remainder tie → tieBreakOrder → party ID | `passes a cut-off tie through`; `calls out a cut-off tie` (tie resolution itself is covered in `allocate.test.ts`) |
| Fixtures from exact inputs | Section 8 fixture values in `shows the Section 8 votes, shares and seats` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `is absent while the scenario is invalid` |
| Single element | `omits parties without votes or seats from the bars` (one seat-holding party) |
| All values equal | `passes a cut-off tie through` (four equal parties, two seats) |
| Maximum size (20 / 30 / 10) | `handles 20 groups, 30 parties and 10 blocks` |
| No feasible solution | `has no seat values when no party qualifies`; `has no vote shares when there are no valid votes`; `shows votes but no seats when nothing is allocated` |
| Rounding edge cases | `rounds %s to %i places as %s` (0.9995 → 1.000, -0.001 → 0.00, 1/3, 2/3); `rounds large values without losing digits` |
| Locale formatting | `%s groups the integer part and uses the locale separator`; `formats shares for %s`; `formats integers beyond the float range exactly` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Visual layout of bars and the seat grid, wrapping of long names | No DOM layout in Vitest; M2-10 Playwright |
| Color contrast of party colors against seat cells | Colors are user-chosen; text labels carry the meaning; M2-10 accessibility checks |

## Changed Existing Tests

| Test | Change | Reason |
| --- | --- | --- |
| `tests/ui/app.test.tsx` — required keys | `placeholder.seats` no longer required | The seats panel now shows real results (memo scope) |
| `tests/ui/app.test.tsx` — panel per view | Placeholder assertion moved to a coalitions/compare-only test | Same reason; the panel mapping assertion is unchanged |
| `tests/ui/store.test.ts` — engine allowlist | Adds `report` | Memo interface delta |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | `npm test` | 69 failed / 692 passed | Failures: `not implemented` from the `roundToPlaces`, `formatDecimal` and `buildReport` stubs, missing result markup and missing message keys; the report source scan passes |
| 2026-10-28 | `npm run typecheck` | clean | |
| 2026-10-28 | `npm test` | 761 passed | After /3-implement; typecheck, lint, prettier check (src, tests, css) and build also clean |
| 2026-10-28 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check` (close gate) | green | 761 tests; typecheck, lint, prettier, build clean |
