# Memo — M1-07 Coalition Search

| Field | Value |
| --- | --- |
| item | M1-07 |
| epic | M1 |
| phase | Phase 1 — M1 engine |
| status | closed |
| created | 2026-10-28 |
| closed | 2026-10-28 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

After seats are allocated, the simulator must say which governments the configured rules permit: which parties may govern, which pairs may not sit together, which coalitions reach the majority with no surplus member, how much margin each has, and whether the configured model has any feasible majority at all (Section 7). The answer must be exact, deterministic and honest about truncation: a bounded search cannot prove deadlock.

## Scope

**In scope**

- Required majority: the override when the majority mode is override, otherwise half the seat count rounded down plus one.
- Effective incompatibility: explicit party pairs, plus block pairs expanded to every member pair, minus compatible party overrides. Reported as a list so the interface can show the effective rules and their source.
- Government-eligible parties: allowed to join government and holding at least one seat.
- Enumeration of all minimal winning coalitions under the rules, with members, seats, majority margin and opposition seats.
- Feasibility status: feasible, deadlock (only after a complete search), unknown (truncated search found nothing) or no allocation.
- Search bounds: a node budget and the 20-eligible-party limit; a bounded result is explicitly marked incomplete.
- Balancing parties: parties that appear in winning alternatives together with members of a forbidden pair.
- Evaluation of one user-chosen coalition on request, including larger non-minimal or forbidden combinations, with the reasons it is or is not feasible.

**Out of scope**

- Web Worker wrapping and cancellation (interface milestone; the engine function stays pure and synchronous).
- Pivotal-party metrics (optional in Section 7; needs its own defined metric).
- Minority governments, confidence support, defections (excluded by Section 7).
- Section 8 end-to-end fixtures across all four presets (M1-08), although the baseline and zero-turnout cases are used here.

## Approach

Take the validated scenario and the M1-06 allocation. If there is no allocation, return the no-allocation status with no coalitions. Otherwise build the effective forbidden-pair set, then order eligible parties by seats descending and persisted party order ascending. A depth-first include/exclude search adds parties in that order. A branch is cut when it would contain a forbidden pair, or when its seats plus all remaining compatible seats cannot reach the majority. When a branch reaches the majority it is recorded and not extended, because every superset is non-minimal; because parties are added in descending seat order the last-added member is the smallest, so the coalition is minimal exactly when removing that member drops below the majority. Every visited node counts against a budget; exhausting it, or having more than 20 eligible parties, marks the result incomplete.

Coalitions are listed by seats descending, then in search order; members are listed in scenario party order. Status is feasible when any coalition was found (a found coalition is proof regardless of truncation), deadlock only when the search was complete and found nothing, unknown otherwise.

A party is balancing when it belongs to two found minimal coalitions whose union contains a forbidden pair. In the Section 8 zero-turnout preset this marks Party 4, which can govern with either rival.

Coalition evaluation on request takes a set of party IDs and reports seats, margin, opposition, whether it reaches the majority, the members that cannot govern, the forbidden pairs inside it, whether it is feasible and whether it is minimal.

All quantities are integer seat counts bounded by 10000, so plain integers are exact; no fraction is involved.

**Rejected alternative:** enumerating all subsets and filtering. It is simple but exponential with no pruning, cannot be bounded honestly, and Section 7 requires pruning of incompatible and unreachable branches. It is kept only as the reference oracle in tests for small fixtures.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| — | None; results are derived | None |

## Interface Delta

New engine module `coalitions` exporting an analysis function from scenario and allocation (with an optional node budget) to: required majority and whether it is overridden, status, completeness flag, eligible party IDs, effective forbidden pairs with their source (party rule or block rule), minimal winning coalitions, balancing party IDs and the node count. A second function evaluates one coalition on request.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | Coalitions: majority, margins, opposition, feasibility |
| Where exact rationals are required | None; seat counts are integers no greater than 10000 |
| Ordering / tie rules relied on | Eligible order by seats descending then persisted party order; output order defined above; never locale collation |
| Any display rounding near a decision? | None |
| How determinism across runs, round trip and locale is proven | Pure function; repeated-run test; comparison against a brute-force oracle on seeded small fixtures; source scan forbids float and locale APIs |

## Files

| Path | Change |
| --- | --- |
| `src/engine/coalitions.ts` | Majority, effective rules, bounded search, balancing parties, coalition evaluation |
| `tests/engine/coalitions.test.ts` | Section 8 baseline deadlock and zero-turnout alternatives, margins, overrides, block expansion, eligibility, override majority, incomplete marking, brute-force oracle property test, evaluation, determinism, source scan |
| `doc/spec/elections-simulator.md` | Section 7: state the eligibility rule, the status values, the balancing definition, the output order and the node budget |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

Approved 2026-10-28 under the user's standing instruction to run M1-02 through M1-08 autonomously; every recommendation is accepted as the decision.

1. Are zero-seat parties eligible? — **Decision:** No. They can never be in a minimal coalition, and listing them would inflate the 20-party limit.
2. What is the default node budget? — **Decision:** 1,000,000 visited nodes, overridable per call. It completes every 20-party case seen in tests in well under a second.
3. Does a truncated search that found a coalition report feasible? — **Decision:** Yes; one found coalition proves feasibility. Only deadlock requires completeness, and the completeness flag is still reported.
4. How is a balancing party defined? — **Decision:** a party belonging to two found minimal coalitions whose union contains a forbidden pair. This matches Section 7's "both rival blocks" without needing a separate rivalry concept.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| 3-implement | No explicit minimality check in the search | Adding parties in descending seat order makes every coalition that first reaches the majority minimal; the oracle test confirms it |
