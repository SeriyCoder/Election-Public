# Memo — M1-04 Votes And Denominators

| Field | Value |
| --- | --- |
| item | M1-04 |
| epic | M1 |
| phase | Phase 1 — M1 engine |
| status | closed |
| created | 2026-10-28 |
| closed | 2026-10-28 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

Seats depend on party vote totals, and the interface must show unavailable, abstaining, invalid and valid ballots separately against the full electorate (Section 6.1). The engine needs one exact function that turns a validated scenario into per-group ballot breakdowns, party votes and overall totals, for restricted and open groups alike (Section 4).

## Scope

**In scope**

- Per-group population, available, unavailable, cast, abstaining, valid and invalid ballots, and the group's contribution to each allowed party.
- Party votes in persisted party order, vote shares of all valid votes, overall totals and overall turnout.
- A shared test helper that builds validated scenarios, including the Section 8 preset.

**Out of scope**

- Threshold qualification and below-threshold totals (M1-05).
- Seats and block aggregation (M1-06), coalitions (M1-07).
- The final-share inverse solver (M3-03) and display rounding (M2-05).

## Approach

Implement the Section 6.1 table directly on exact rationals from the M1-02 module, reading the decimal strings of a scenario already accepted by the M1-03 validator. For each group: population is the population total times the population share; available is population times the participation factor; cast is available times turnout; valid is cast times the valid-ballot rate. Unavailable, abstaining and invalid are the differences, so each group's population splits exactly into unavailable + abstaining + invalid + valid. A group's valid ballots go to each allowed party in proportion to its weight; an allowed party with no weight entry receives zero. Restricted and open groups use the same arithmetic; the restriction is enforced by the validator, so votes can never reach a non-allowed party.

Party votes are summed in persisted party order and include every party, even with zero votes. All valid votes is the sum of party votes, as Section 6.1 defines it; it equals total valid ballots whenever weights sum exactly to one, and may differ only within the validator's 1e-9 tolerance, which is reported rather than normalized away. Vote share is party votes over all valid votes, or absent when there are no valid votes. Overall turnout is total cast over total group population, so changing availability never changes the denominator.

**Rejected alternative:** computing shares from rounded per-group percentages, as the source discussion did; it breaks exactness and Section 8.2 warns against it.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| — | None; results are derived, not stored | None |

## Interface Delta

New engine module `votes` exporting a function from a validated scenario to a vote result: per-group breakdown with per-party contributions, per-party votes and vote shares, totals and overall turnout. All quantities are exact rationals.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | Votes: the numerators and denominator every later step uses |
| Where exact rationals are required | Every product, sum and share; fractional votes are kept, never rounded (Section 6.1) |
| Ordering / tie rules relied on | Party results follow persisted party order; group results follow group order |
| Any display rounding near a decision? | None; the module returns rationals only |
| How determinism across runs, round trip and locale is proven | Pure function over a validated scenario; tests repeat the computation and compare canonical fraction text; a source scan forbids float and locale APIs |

## Files

| Path | Change |
| --- | --- |
| `src/engine/votes.ts` | Ballot breakdown, party votes, shares, totals, turnout |
| `tests/engine/votes.test.ts` | Formula, identity, 60/30/10 split, open and restricted groups, Section 8.1 share, zero turnout, denominator preservation |
| `tests/engine/helpers/scenarios.ts` | Test-only builder of validated scenarios, including the Section 8 preset |
| `doc/spec/elections-simulator.md` | Section 6.1: state the denominator of overall turnout and the relation of all valid votes to valid ballots |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

Approved 2026-10-28 under the user's standing instruction to run M1-02 through M1-08 autonomously; every recommendation is accepted as the decision.

1. Overall turnout denominator: the population total or the sum of group populations? — **Decision:** the sum of group populations. It equals the population total when shares sum to one and keeps the ballot breakdown summing exactly to its denominator within the tolerance case.
2. Should all valid votes be the sum of party votes or the sum of valid ballots? — **Decision:** the sum of party votes, as Section 6.1 defines it; both totals are reported.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| — | None | — |
