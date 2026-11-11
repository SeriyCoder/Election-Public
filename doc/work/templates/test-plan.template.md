# Test Plan — <ITEM-ID> <Title>

| Field | Value |
| --- | --- |
| item | <ITEM-ID> |
| memo | `doc/work/active/<ITEM-ID>-memo.md` |
| created | <YYYY-MM-DD> |
| state | red |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |

## Happy Path

-

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | |
| Determinism: repeated runs, JSON round trip, ru/en/he | |
| Threshold below / at / above | |
| Exact remainder tie → tieBreakOrder → party ID | |
| Fixtures from exact inputs | |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | |
| Single element | |
| All values equal | |
| Maximum size (20 / 30 / 10) | |
| No feasible solution | |

## Deliberately Not Tested

| What | Why |
| --- | --- |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
