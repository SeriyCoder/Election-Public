# Test Plan — M1-06 Hamilton Allocation With Persisted Tie Order

| Field | Value |
| --- | --- |
| item | M1-06 |
| memo | `doc/work/archive/phase-1/M1-06-memo.md` |
| created | 2026-10-28 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/allocate.test.ts` | Vitest (node) | Section 8 seats, exact quotas, ties, excluded parties, no-allocation, blocks, seeded property test, determinism, source scan |
| `tests/engine/helpers/prng.ts` | — | Seeded mulberry32 generator and exact millionths formatting for generated scenarios |
| `src/engine/allocate.ts` | — | Stub: types real, `allocateSeats` throws `not implemented` |

## Happy Path

- Section 8 baseline allocates 46 / 50 / 18 / 6; zero Group 3 turnout allocates 54 / 59 / 0 / 7.
- Quota for P1 is exactly 228/5, floor 45, remainder 3/5.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `always allocates exactly seatCount seats by the Hamilton rule` (400 seeded scenarios, seat counts 1–501); `handles the largest seat count` |
| Determinism: repeated runs, JSON round trip, ru/en/he | `returns identical output on repeated runs`; `does not depend on the array order of parties`; round trip and locales in M1-08 |
| Threshold below / at / above | Owned by M1-05; here `allocates only over qualifying votes` |
| Exact remainder tie → tieBreakOrder → party ID | `breaks an exact tie by persisted tie-break order`; `breaks equal tie-break order by party ID in code-unit order` |
| Fixtures from exact inputs | Section 8 tests; quota 228/5 and 110/19 |
| No float decisions | Source scan; property test recomputes quotas with rationals and checks the ranking invariant |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `returns zero seats and the reason when nothing can be allocated` |
| Single element | `allocates a single seat to the largest remainder` |
| All values equal | `gives odd seat counts to the lowest tie-break orders among equals`; `detects a tie that does not matter as no cutoff tie` |
| Maximum size (20 / 30 / 10) | Property test draws up to 20 groups, 30 parties, 10 blocks; `handles the largest seat count` (10000) |
| No feasible solution | `propagates no party qualifying` |

Additional: `never gives a zero-vote party a remainder seat`; `adds an unassigned bucket after all blocks`; `omits the unassigned bucket when every party has a block`.

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Allocation methods other than Hamilton | Out of scope for v1 |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | `npx vitest run tests/engine/allocate.test.ts` | RED: 20 failed, 1 passed | All failures `Error: not implemented`; source scan passes on the stub. Type check and lint green |
| 2026-10-28 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check` | GREEN | 220 passed (21 allocate) |
