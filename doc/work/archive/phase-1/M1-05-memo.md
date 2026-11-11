# Memo — M1-05 Threshold Qualification And No-Allocation States

| Field | Value |
| --- | --- |
| item | M1-05 |
| epic | M1 |
| phase | Phase 1 — M1 engine |
| status | closed |
| created | 2026-10-28 |
| closed | 2026-10-28 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

Seats are allocated only over parties that pass the electoral threshold, and the boundary must be decided exactly: a party exactly at the threshold qualifies (Section 6.2). The engine must also distinguish a party that received no votes from one that failed the threshold, and must report an explicit no-allocation state instead of dividing by zero when nothing qualifies (Section 12).

## Scope

**In scope**

- Per-party qualification status in persisted party order: qualified, below threshold, or no votes.
- Qualifying votes, below-threshold votes and each qualified party's seat-allocation share.
- A no-allocation reason when there are no valid votes or no party qualifies.

**Out of scope**

- Seat allocation itself (M1-06) and coalitions (M1-07).
- Joint electoral lists or block-level thresholds; Section 6.2 defers them to a separately specified model.
- Display of percentages (M2-05).

## Approach

Take the validated scenario and the M1-04 vote result. Parse the threshold once. A party with zero votes has status no votes, whatever the threshold, so a zero threshold never makes a zero-vote party eligible (Section 6.3: zero-vote parties never receive seats). A party with positive votes qualifies when its vote share is greater than or equal to the threshold, compared as exact rationals; otherwise it is below threshold. The test is per party only; block membership is not consulted, so a block total cannot rescue its members.

Qualifying votes is the sum over qualified parties; below-threshold votes is the sum over below-threshold parties; both remain part of all valid votes. A qualified party's allocation share is its votes over qualifying votes; other parties have share zero. When all valid votes are zero the reason is no valid votes; when votes exist but no party qualifies the reason is no party qualifies; in both cases allocation shares are absent, nothing is divided, and the state is never labeled a coalition deadlock.

**Rejected alternative:** comparing rounded percentages against the threshold; it misclassifies parties at the boundary, which Section 12 requires to be tested exactly.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| — | None; results are derived | None |

## Interface Delta

New engine module `threshold` exporting a function from a validated scenario and its vote result to a threshold result: threshold value, per-party status and allocation share, qualifying and below-threshold totals, and a nullable no-allocation reason.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | Threshold qualification and the qualifying-votes denominator used by quotas |
| Where exact rationals are required | Share-versus-threshold comparison, totals and allocation shares |
| Ordering / tie rules relied on | Output in persisted party order; equality at the threshold qualifies |
| Any display rounding near a decision? | None |
| How determinism across runs, round trip and locale is proven | Pure function; repeated-run equality test and a source scan forbidding float and locale APIs; scenario-level round trip and locales in M1-08 |

## Files

| Path | Change |
| --- | --- |
| `src/engine/threshold.ts` | Qualification, totals, allocation shares, no-allocation reason |
| `tests/engine/threshold.test.ts` | Below / at / above, block cannot rescue, zero-vote parties, no-allocation states, Section 8 zero turnout, determinism |
| `doc/spec/elections-simulator.md` | Section 6.2: name the three statuses and the two no-allocation reasons |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

Approved 2026-10-28 under the user's standing instruction to run M1-02 through M1-08 autonomously; every recommendation is accepted as the decision.

1. Does a zero-vote party qualify under a zero threshold? — **Decision:** No. Section 6.2 requires positive votes, and a separate no-votes status keeps zero turnout distinguishable from threshold failure.
2. What allocation share does a non-qualified party get? — **Decision:** Zero when an allocation exists; absent for every party in a no-allocation state.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| — | None | — |
