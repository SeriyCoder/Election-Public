# Memo — M1-06 Hamilton Allocation With Persisted Tie Order

| Field | Value |
| --- | --- |
| item | M1-06 |
| epic | M1 |
| phase | Phase 1 — M1 engine |
| status | closed |
| created | 2026-10-28 |
| closed | 2026-10-28 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

Qualified parties must receive integer seats by Hamilton / largest remainder so that every allocation sums exactly to the seat count, exact remainder ties are broken by persisted party order and then by party ID, and seats are aggregated to blocks only afterwards (Section 6.3). This is the core correctness guarantee of the project.

## Scope

**In scope**

- Exact quota, floor seats, remainder and remainder seat for each qualified party, in persisted party order.
- Remainder ranking: remainder descending, then tie-break order ascending, then party ID ascending by code unit.
- An indicator of whether the last remainder seat was decided by an exact tie.
- Block aggregation of seats and votes after allocation, including an unassigned bucket.
- A no-allocation result propagated from the threshold step with zero seats.
- A seeded pseudo-random generator for property tests, as a test helper.

**Out of scope**

- Majority rule and coalitions (M1-07).
- Other allocation methods (D'Hondt, Sainte-Laguë); the schema allows only Hamilton.
- End-to-end Section 8 fixture suite and locale runs (M1-08).

## Approach

Take the validated scenario and the M1-05 threshold result. If there is no allocation, return every party with zero seats and the reason; nothing is divided. Otherwise, for each qualified party compute the quota as seat count times votes over qualifying votes, its floor and the remainder, all exact. Non-qualified parties, including zero-vote parties, have no quota and zero seats, so they can never receive a remainder seat. The remaining seats, seat count minus the floor sum, are fewer than the number of qualified parties; award one each to the first parties in the ranking. Because remainders sum exactly to the number of remaining seats, the total always equals the seat count. The tie indicator is set when the last awarded and the first unawarded remainders are exactly equal.

Block aggregation sums party seats and votes per block in scenario block order, followed by one unassigned entry when any party has no block. Seat counts are reported as ordinary integers, which is exact because they never exceed the 10000-seat schema limit; all quotas and remainders stay rational.

**Rejected alternative:** sorting by floating-point remainder or rounding quotas independently; Section 6.3 forbids independent rounding and float sorting cannot detect exact ties.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| — | None; results are derived | None |

## Interface Delta

New engine module `allocate` exporting a function from a validated scenario and its threshold result to an allocation result: seat count, no-allocation reason, per-party quota, floor seats, remainder, remainder-seat flag and seats, per-block seats and votes, and the cutoff-tie indicator.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | Quota, floor, remainder, remainder ranking, ties, block aggregation |
| Where exact rationals are required | Quota, remainder and every comparison in the ranking |
| Ordering / tie rules relied on | Remainder descending; persisted `tieBreakOrder` ascending; party ID ascending by UTF-16 code unit, never locale collation |
| Any display rounding near a decision? | None |
| How determinism across runs, round trip and locale is proven | Pure function; repeated-run test; party array order does not affect a tie decided by `tieBreakOrder`; source scan forbids float and locale APIs; seeded property test reproducible from a fixed seed |

## Files

| Path | Change |
| --- | --- |
| `src/engine/allocate.ts` | Hamilton allocation, ranking, cutoff tie, block aggregation |
| `tests/engine/allocate.test.ts` | Quotas, Section 8 baseline and zero-turnout seats, ties, odd sizes, zero-vote and below-threshold parties, no allocation, blocks, property test |
| `tests/engine/helpers/prng.ts` | Seeded pseudo-random generator for property tests |
| `doc/spec/elections-simulator.md` | Section 6.3: state the code-unit party ID order, the cutoff-tie indicator and the unassigned block bucket |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

Approved 2026-10-28 under the user's standing instruction to run M1-02 through M1-08 autonomously; every recommendation is accepted as the decision.

1. How is "stable party ID" ordered? — **Decision:** ascending by UTF-16 code unit. It is locale-independent and IDs are ASCII, so it equals byte order.
2. Should the result expose whether a tie decided the last seat? — **Decision:** Yes, as one flag; the interface can then say a seat was decided by persisted order rather than by votes.
3. Where do unassigned parties appear in block totals? — **Decision:** in one unassigned entry after all blocks, present only when such a party exists.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| 3-implement | Property test draws seat counts 1-501 instead of 1-200 | Wider coverage at no cost; still includes odd values |
