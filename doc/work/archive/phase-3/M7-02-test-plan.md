# Test Plan — M7-02 Exact proportional party-share editing

| Field | Value |
| --- | --- |
| item | M7-02 |
| memo | `doc/work/archive/phase-3/M7-02-memo.md` |
| created | 2026-10-31 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/partyShares.test.ts` | Vitest | Exact proportional edits; locks and zero recipients; typed refusals; unchanged input and metadata; schema bounds; threshold, ties, determinism and odd-seat properties; 40-list timing. |
| `tests/ui/store.test.ts` | Vitest | The same edited exact scenario produces the same seats in the ru, en and he store languages. |
| `tests/engine/schema.test.ts`, `tests/engine/partyMode.test.ts` | Vitest | Existing version 4, exact threshold, zero-turnout and canonical-budget regressions remain intact. |
| `tests/engine/threshold.test.ts`, `tests/engine/allocate.test.ts` | Vitest | Existing exact qualification, Hamilton seat totals and tie-order tests remain intact. |
| `tests/e2e/performance.spec.ts`, `tests/build/offline.test.ts` | Playwright / Vitest | Offline size and near-budget 40-list / projection responsiveness remain intact. |

## Happy Path

- An edit of 20% / 30% / 50% to 40% for the first party returns exact
  40% / 22.5% / 37.5% shares without mutating its input.
- Non-terminating ratios are returned as exact reduced fractions; a comma or
  point and all 16 supported decimal places retain the entered value.
- A selected party may be edited directly even when its own lock is set;
  other locked shares stay fixed, and unlocked zero recipients split equally
  when their previous total is zero.

## Seat-Calculation Correctness

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `keeps exact totals and odd seat sums for seeded share edits` runs 40 seeded scenarios with 101 seats; the 40-list timing case checks 120 seats. |
| Determinism: repeated runs, JSON round trip, ru/en/he | `round-trips an edit and gives identical votes, seats and coalitions`; `keeps an edited exact party share and seats unchanged in every language`. |
| Threshold below / at / above | `keeps the %s percent edit exact across the threshold boundary` checks 3%, 3.25% and 3.5%, including the 4 / 116 threshold result. |
| Exact remainder tie → tieBreakOrder → party ID | `retains persisted tie order and the party-ID fallback after an edit`. |
| Fixtures from exact inputs | Expected shares are reduced rational strings; qualification and seats use the existing exact engine, not rounded display text. |
| No float decisions | Every share expectation is an exact fraction or exact rational comparison; timing uses a clock only for responsiveness. |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Invalid / empty input | `refuses an invalid scenario or a legacy group-mode scenario`; `refuses invalid percentage text %j`. |
| Single party | `accepts a single party only at 100 percent`. |
| All other parties locked | `allows an unchanged value when all other parties are locked`; `refuses a change when all other parties are locked`. |
| All available parties at zero | `splits the remainder equally when all available shares were zero`; locked zeros and mixed zero/nonzero recipients are separate cases. |
| Maximum and safety bounds | Existing 20 / 30 / 10 coverage remains; `accepts an unchanged edit at exactly 2048 canonical denominator digits`; aggregate and component overflow cases; 40-list edit timing. |
| No feasible allocation | `retains exact shares but allocates no seats at zero turnout`; existing threshold tests cover all parties below the threshold. |
| Locked capacity exceeded | `refuses a request that leaves less than the other locked shares`. |
| Unknown IDs | `refuses unknown selected and locked IDs without changing the input`. |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Visible party controls and lock buttons | M7-03; no control is exposed in this item. |
| Group-party matrix, linked turnout and preservation of group totals | M7-05; the operation here is an explicitly share-only intermediate. |
| Optional composition editing and historical data | M7-04 and M7-06. |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-31 | `npx vitest run tests\engine\partyShares.test.ts tests\ui\store.test.ts -t "exact party-share edits\|keeps an edited exact party share"` | RED: 33 failed, 378 skipped. | All failures reach the deliberate `Party-share redistribution is not implemented` stub, not syntax or fixture errors. |
| 2026-10-31 | `npm test` | RED: 33 failed, 2526 passed across 41 files. | Only the new share-operation and locale cases fail for the missing implementation. |
| 2026-10-31 | `npm run typecheck`; targeted `npx eslint` and `npx prettier` | Pass. | The temporary type-correct stub and all new tests compile and are lint-clean and formatted. |
| 2026-10-31 | Focused `vitest` command above | GREEN: 33 passed, 378 skipped. | Includes exact limits, threshold boundaries, ties, locks, locale and 40-list timing. |
| 2026-10-31 | `npm test` | GREEN: 2559 passed across 41 files. | Includes the in-memory production offline build and existing arithmetic regressions. |
| 2026-10-31 | `npm run typecheck`; `npm run lint`; `npm run format`; `prettier --check` | Pass. | TypeScript, repository-wide lint and formatting gates. |
| 2026-10-31 | `npm run test:e2e -- --grep "exact denominator budget" --project desktop --workers 1` | 2 passed. | Fresh offline build 386.33 kB; accepted near-budget 40-list import and group projections meet the 200 ms browser checks. |
| 2026-10-31 | Independent temporary seeded oracle | 459 randomized locked edits passed; 40-list median 0.1541 ms in Node over nine edits. | Compared each result with independent BigInt fractions, checked 101-seat sums and input immutability; temporary script removed. |
| 2026-10-31 | `/4-close`: `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check` | Pass: 2559 unit tests across 41 files; types, lint and formatting clean. | Independently rerun at close. |
| 2026-10-31 | `/4-close`: `npm run test:e2e -- --workers 2` | Pass: 230, skipped: 38. | Full desktop and phone suite against a fresh 386.33 kB offline build. |
