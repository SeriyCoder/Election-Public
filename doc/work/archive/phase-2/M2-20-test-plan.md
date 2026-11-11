# Test Plan — M2-20 Time Model In The Engine

| Field | Value |
| --- | --- |
| item | M2-20 |
| memo | `doc/work/archive/phase-2/M2-20-memo.md` |
| created | 2026-10-30 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/projection.test.ts` | Vitest (node) | Section 14.2 fixtures (X 320 / Y 380, turnout 7/10; year 1 with A +10%: X 344, Y 386, population 1060, ballots 730, turnout 73/106; three years compounded 3993/5); turnout change in points (710, 750, 900); clamp at 100% and at 0; turnout change leaves population; growth −100% empties a group from year 1; negative growth; preferences kept inside a group; year 0 default and byte-identical, growth ignored at year 0, Section 8 at year 0; years 0–20 allowed, −1, 21, 1.5, NaN, infinity refused by `computeVotes` and `runSeats`; property test that every year-k allocation sums to the seat count; determinism and a version 2 file round trip |
| `tests/engine/composition.test.ts` | Vitest (node) | Valid-vote composition of X 3/4 and 1/4; potential composition 6/7 and 1/7; target and basis echoed; every group listed in scenario order with zero rows; shares undefined for a list with no supporters on both bases; block sums on both bases; year-k composition 33/43 and 10/43; unknown party, a block ID given as a party and a party ID given as a block refused; no floating point or locale APIs in the source |
| `tests/engine/rational.test.ts` | Vitest (node) | `pow`: exact positive powers including a negative base, exponent 0 (also 0^0), (1.02)^20 as 51^20 / 50^20, exponents −1, 1.5, NaN and above 1000 refused |
| `tests/engine/schema.test.ts` | Vitest (node) | `validInput` is version 2 with both fields; `SCHEMA_VERSION` is 2; version 3 refused before anything else; version 1 accepted and returned as version 2 with both fields `0` in the documented key order; fields out of place reordered; absent fields read as `0` in a version 2 file; a migrated Section 8 file gives the same results and export as a version 2 one; a migrated export is version 2; both fields accept −1, 1, −0.5, 0, 0.000001, −1.000, 1.0 and refuse values below −1 or above 1, non-decimals, `+0.1`, empty text and non-strings; `LIMITS.projectionYears` is 20 |
| `tests/engine/helpers/scenarios.ts` | — | Builds version 2 input; optional `growthRate` and `turnoutChange` options |
| `tests/engine/edit.test.ts` | Vitest (node) | A new group carries `growthRate` and `turnoutChange` `0` in the documented key order |
| `tests/ui/store.test.ts` | Vitest (node) | Every preset is version 2 with both fields `0`; the unsupported version in the import refusal is now 3 |
| `tests/ui/fileTransfer.test.ts` | Vitest (node) | The unsupported version in the file import refusal is now 3 |
| Existing engine, UI and e2e suites | Vitest, Playwright | Unchanged results for every present scenario at year 0 through the version 2 helpers and presets |

## Happy Path

- A user's version 1 file still opens and gives the same seats —
  `gives a migrated file the same results as before`.
- A group grows 10% and the year-1 votes follow the Section 14.2 table —
  `grows group A by 10% in year 1: X 344, Y 386, 1060 voters, 730 ballots`.
- A user asks who votes for X —
  `splits valid votes for X: 3/4 from A, 1/4 from B`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `sums every year-k allocation exactly to the seat count` (60 seeded scenarios, 1–151 seats, years 0–20, signed growth and turnout change) |
| Determinism: repeated runs, JSON round trip, ru/en/he | `is identical across runs and after a version 2 file round trip`; `ignores growth and turnout change`; `keeps the Section 8 result at Group 3 turnout %s`; the engine takes no locale input |
| Threshold below / at / above | Threshold not touched; existing suite runs on year-0 votes |
| Exact remainder tie → tieBreakOrder → party ID | Allocation not touched; existing suite |
| Fixtures from exact inputs | `reproduces the base year: X 320, Y 380, turnout 70%`; `grows group A by 10% in year 1 …`; `compounds growth exactly over several years`; `keeps twenty years of 2% growth exact` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | A group emptied by −100% growth: `empties a group at -100% growth from year 1 on`; a list with no supporters: `leaves shares undefined for a list with no supporters` |
| Single element | `adds the annual change in percentage points` (one group, one list) |
| All values equal | `does not change the population` |
| Maximum size (20 / 30 / 10) | Year 20: `allows years 0 to 20`; `keeps twenty years of 2% growth exact` |
| No feasible solution | Year 21 and non-integer years: `refuses year %s`; turnout pushed past 0 or 1: the two clamp tests |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Views, editor controls and the horizon setting | M2-21 |
| Coalition search for a future year | Out of scope in the memo |
| Very large exponents beyond 20 years | The engine refuses years above `LIMITS.projectionYears`; `pow` alone is capped at 1000 |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-30 | `npx vitest run --reporter=json` | red: 1027 passed, 405 failed of 1432 | Expected: version 2 refused by the version 1 validator (every helper-built scenario), `pow` and `src/engine/composition.ts` missing, year parameter ignored |
| 2026-10-30 | `npx vitest run --reporter=json`; `npm run typecheck`; `npm run lint`; `npx prettier --check`; `npx vite build`; `npm run test:e2e` | green: 1517 unit passed; e2e 104 passed, 14 skipped; `dist/elections.html` 190.72 kB | Schema version 2 with migration, `pow`, year in `computeVotes` / `runSeats`, `composition.ts`, new-group and preset fields |
| 2026-10-30 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 1517 unit; e2e 104 passed, 14 skipped |
