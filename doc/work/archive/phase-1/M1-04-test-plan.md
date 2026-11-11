# Test Plan — M1-04 Votes And Denominators

| Field | Value |
| --- | --- |
| item | M1-04 |
| memo | `doc/work/archive/phase-1/M1-04-memo.md` |
| created | 2026-10-28 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/votes.test.ts` | Vitest (node) | Section 6.1 formulas, outcome identity, contributions, party votes and shares, preference edits, Section 8 shares, degenerate inputs, determinism, source scan |
| `tests/engine/helpers/scenarios.ts` | — | Builders for validated scenarios and the Section 8 preset (reused by M1-05 to M1-08) |
| `src/engine/votes.ts` | — | Stub: result types real, `computeVotes` throws `not implemented` |

## Happy Path

- A group with participation 0.5, turnout 0.75 and valid rate 0.9 of 400000 people yields 200000 available, 150000 cast, 135000 valid.
- A 60/30/10 split sends exactly 81000 / 40500 / 13500 votes.
- Party votes, shares, totals and overall turnout match hand-computed fractions.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Not owned here (M1-06) |
| Determinism: repeated runs, JSON round trip, ru/en/he | `returns identical fraction text on repeated runs`; `does not use floating point or locale APIs`. Round trip and locale runs at scenario level belong to M1-08 |
| Threshold below / at / above | Not owned here (M1-05) |
| Exact remainder tie → tieBreakOrder → party ID | Not owned here (M1-06); party order preserved: `lists every party in persisted order with exact votes` |
| Fixtures from exact inputs | `reproduces the baseline vote shares exactly`; `gives Group 3 exactly 3/37 of valid votes at 50% turnout` (Section 12 "≈ 8.108108%"); `gives Group 3 no votes at zero turnout and rescales the others` |
| No float decisions | `does not use floating point or locale APIs`; all expectations are exact fractions |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `reports no vote shares when nobody votes`; `keeps all ballots invalid when the valid-ballot rate is zero` |
| Single element | `keeps a restricted group inside its allowed parties` (single destination) |
| All values equal | `scales with the population total without changing shares` |
| Maximum size (20 / 30 / 10) | Not exercised here; linear arithmetic, covered by the M1-06 property test over random sizes |
| No feasible solution | `gives zero votes to a party no group selects`; `gives zero votes to an allowed party without a weight` |

Additional: `separates disabled participation from zero turnout`, `does not normalize shares within the tolerance`, `reports all valid votes as the sum of party votes`, `does not change turnout or total valid votes` (Section 12 preference edit).

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Invalid scenarios | The function takes a validated scenario; rejection is M1-03 |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | `npx vitest run tests/engine/votes.test.ts` | RED: 22 failed, 1 passed | All failures `Error: not implemented`; the source-scan test passes on the stub. Type check and lint green |
| 2026-10-28 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check` | GREEN | 181 passed (23 votes) |
