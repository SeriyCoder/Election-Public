# Test Plan — M2-11 Load All Four Section 8 Example Presets

| Field | Value |
| --- | --- |
| item | M2-11 |
| memo | `doc/work/archive/phase-2/M2-11-memo.md` |
| created | 2026-10-29 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/store.test.ts` | Vitest (node) | Preset list order; each new preset differs from the baseline only in Group 3 turnout, id and name, in ru/en/he; Section 8 seats, permitted pairs, status and complete search; 7% and 8% final shares within 1e-15 |
| `tests/ui/store.test.ts`, `tests/ui/fileTransfer.test.ts`, `tests/ui/editor.test.tsx` (existing, parameterised by `PRESETS`) | Vitest | Every preset valid with 120 seats in every language; same result in every language; JSON round trip; every preset listed in the menu with its translated name |

## Happy Path

- The menu lists six presets, Section 8 rows first — `lists the four Section 8 presets first, then the extra examples`.
- Loading a Section 8 preset gives its table seats and pairs — `$id reproduces the Section 8 seats and permitted pairs`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Engine not touched; `%s is valid and allocates every seat` covers the new presets |
| Determinism: repeated runs, JSON round trip, ru/en/he | `%s gives the same result in every language`; `fileTransfer` round trip per preset |
| Threshold below / at / above | Not touched (threshold 0) |
| Exact remainder tie → tieBreakOrder → party ID | Not touched; engine fixtures prove the 7% and 8% remainders are far from the truncation error |
| Fixtures from exact inputs | Turnouts recomputed in the test from 119/279 and 34/69, not copied from the source |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | Not applicable |
| Single element | Not applicable |
| All values equal | Not applicable |
| Maximum size | Not applicable |
| No feasible solution | The baseline (deadlock) is unchanged; the three new rows are feasible |
| Rounding edge cases | `%s gives Group 3 a final vote share within 1e-15` |
| Group with zero turnout | `turnoutZero reproduces ...`: Party 3 gets 0 seats, both rival pairs are listed |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Menu rendering in a browser | Covered by the existing server-rendered menu test and the e2e suite, which loads presets by id |

## Changed Existing Tests

| Test | Change | Reason |
| --- | --- | --- |
| `lists the baseline, split and multi-block presets` | Renamed and expects six presets in Section 8 order | Memo decision 1 |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-29 | `npx vitest run tests/ui/store.test.ts` | 9 failed / 146 passed | All failures: the three presets do not exist yet |
| 2026-10-29 | `npm test` | 1038 passed | After the three builders and nine translation strings |
| 2026-10-29 | typecheck; lint; prettier --check; `npm run test:e2e` | clean; e2e 81 passed / 13 skipped | |
| 2026-10-29 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 1038 passed; e2e 81 passed / 13 skipped |
