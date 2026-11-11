# Test Plan — M1-05 Threshold Qualification And No-Allocation States

| Field | Value |
| --- | --- |
| item | M1-05 |
| memo | `doc/work/archive/phase-1/M1-05-memo.md` |
| created | 2026-10-28 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/threshold.test.ts` | Vitest (node) | Boundary, block rescue, totals, allocation shares, zero-vote parties, no-allocation states, determinism, source scan |
| `src/engine/threshold.ts` | — | Stub: types real, `applyThreshold` throws `not implemented` |

## Happy Path

- Parties at or above the threshold qualify; allocation shares are computed over qualifying votes (25/48 and 23/48 in the block fixture).
- At a zero threshold every party with votes qualifies.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Not owned here (M1-06) |
| Determinism: repeated runs, JSON round trip, ru/en/he | `returns identical output on repeated runs`; `does not use floating point or locale APIs`; scenario-level round trip and locales in M1-08 |
| Threshold below / at / above | `rejects a party just below the threshold` (1e-18 below); `qualifies a party exactly at the threshold`; `qualifies a party just above the threshold` |
| Exact remainder tie → tieBreakOrder → party ID | Not owned here (M1-06) |
| Fixtures from exact inputs | `reports the parsed threshold exactly` (13/400); Section 8: `distinguishes zero turnout from threshold failure` |
| No float decisions | 1e-18 boundary tests would misclassify under binary floating point; source scan |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `reports no valid votes when turnout is zero everywhere` |
| Single element | `qualifies a party holding every vote at a threshold of one` |
| All values equal | `reports that no party qualifies when all are below threshold` (two equal halves) |
| Maximum size (20 / 30 / 10) | Not exercised; per-party linear pass. Covered by the M1-06 property test |
| No feasible solution | `reports that no party qualifies when all are below threshold`; `reports no valid votes ...` |

Additional: `never lets a block total rescue its members`; `marks a zero-vote party as no votes even at a zero threshold`.

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Joint electoral lists | Out of scope by Section 6.2 |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | `npx vitest run tests/engine/threshold.test.ts` | RED: 17 failed, 1 passed | All failures `Error: not implemented`; source scan passes on the stub. Type check and lint green |
| 2026-10-28 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check` | GREEN | 199 passed (18 threshold) |
