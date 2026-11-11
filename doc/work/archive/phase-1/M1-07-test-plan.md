# Test Plan — M1-07 Coalition Search

| Field | Value |
| --- | --- |
| item | M1-07 |
| memo | `doc/work/archive/phase-1/M1-07-memo.md` |
| created | 2026-10-28 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/coalitions.test.ts` | Vitest (node) | Majority, effective rules, Section 8 coalitions, minimality, eligibility, override majority, no allocation, bounded search, evaluation on request, brute-force oracle, determinism, source scan |
| `src/engine/coalitions.ts` | — | Stub: types and constants real, functions throw `not implemented` |

## Happy Path

- Section 8 zero Group 3 turnout yields P2+P4 = 66 (margin 5, opposition 54) and P1+P4 = 61 (margin 0, opposition 59), with Party 4 balancing.
- A single majority party governs alone.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Not owned here (M1-06); oracle checks opposition = seatCount − coalition seats |
| Determinism: repeated runs, JSON round trip, ru/en/he | `returns identical output on repeated runs`; round trip and locales in M1-08 |
| Threshold below / at / above | Majority boundary instead: `counts a coalition exactly at the majority as winning`; `reports a negative margin below the majority` |
| Exact remainder tie → tieBreakOrder → party ID | Not owned here (M1-06) |
| Fixtures from exact inputs | Section 8 baseline, zero turnout, Party 3 eligible; override majority 50 |
| No float decisions | Integer seats only; source scan |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `reports no allocation without coalitions` |
| Single element | `lets a single majority party govern alone`; oracle includes one-party fixtures |
| All values equal | `excludes supersets of winning coalitions` (two equal partners); `still reports feasible when a truncated search found a coalition` (12 equal parties) |
| Maximum size (20 / 30 / 10) | `marks more than 20 eligible parties as incomplete`; `accepts exactly 20 eligible parties as complete` |
| No feasible solution | `finds no permitted majority in the baseline`; `reports a complete deadlock when every pair is forbidden`; `reports unknown rather than deadlock when the budget runs out` |

Additional: block expansion, overrides, inheritance by a new block member, duplicate rule reporting, ineligible and seatless parties, evaluation with reasons, 300 seeded fixtures against exhaustive enumeration (coalition set, status, effective pairs, ordering, margins, balancing).

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Web Worker cancellation | Interface milestone; the engine function is synchronous |
| Pivotal-party metric | Optional in Section 7 and not implemented |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | `npx vitest run tests/engine/coalitions.test.ts` | RED: 25 failed, 1 passed | All failures `Error: not implemented`; source scan passes on the stub. Type check and lint green |
| 2026-10-28 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check` | GREEN | 246 passed (26 coalitions); 30 equal parties at the default budget finish in under 1 s |
