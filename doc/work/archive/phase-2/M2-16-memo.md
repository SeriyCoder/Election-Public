# Memo — M2-16 Coalitions On Request

| Field | Value |
| --- | --- |
| item | M2-16 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release, reopened for review fixes |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-29 |
| closed | 2026-10-29 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

Section 7 asks to "list minimal winning coalitions, selected larger coalitions
and incompatible combinations on request". The coalition view lists only the
minimal winning coalitions and the forbidden pairs. A user cannot see which
bigger, safer governments exist, nor which seat majorities exist on paper but
are ruled out by the coalition rules. In the Section 8 baseline that second
list is the whole story: three pairs reach 61 seats and every one is blocked,
by the Party 1 – Party 2 ban or by Party 3 not joining a government. Section 12
also asks that coalition search on small fixtures "matches exhaustive
enumeration"; the new lists must meet the same bar.

## Scope

**In scope**

- **Larger coalitions.** The stated selection: every feasible coalition made
  by adding one more government-eligible seated party to a listed minimal
  winning coalition, compatible with all its members.
- **Blocked majorities.** Every seat-minimal majority of seated parties that
  the rules forbid, each with its reasons: the forbidden pairs it contains and
  the members that cannot join a government.
- Both lists in the coalition view, each in its own collapsed disclosure that
  the user opens; the summary line of each shows how many rows it holds.
- Partial results are labelled as such: a list cut by the search budget, by
  the minimal-winning row limit or by the row limit says so.
- Exhaustive-enumeration oracle tests for both lists on seeded random fixtures,
  and the four Section 8 fixtures.

**Out of scope**

- Pivotal-party counts: M2-17.
- Extensions by two or more parties: the one-party rule is the stated
  selection; deeper supersets add rows without adding insight. No backlog item
  needed.
- Minority governments, confidence support, abstention: version 1 excludes
  them (Section 7). No backlog item needed.
- Showing the new lists in the comparison view: comparison reports
  feasibility, not lists. No backlog item needed.

## Approach

**Larger coalitions (pure engine function).** Given the scenario, the seat
allocation and a list of minimal winning coalitions, add to each coalition, in
turn, every government-eligible party with at least one seat that is not a
member and has no forbidden pair with any member. Identical member sets met
twice are kept once. The order is seats descending, then the members' persisted
party positions compared lexicographically, so the list does not depend on the
order of the input. Each row carries seats, margin and opposition seats, as
the minimal winning rows do. A coalition in this list loses its majority only
if more than one supporting party leaves; the margin column shows how many
seats it can lose.

**Blocked majorities (pure engine function).** A depth-first search over every
seated party, eligible or not, in descending seat order, with no compatibility
pruning, enumerates the seat-minimal majorities: sets that reach the majority
and lose it when any member leaves. Adding parties largest first makes every
recorded set minimal, as in the existing search. A set is kept when it holds a
party that cannot join a government or a forbidden pair. Reasons list the
forbidden pairs in the effective-rules order and the ineligible members in
persisted order. The search has its own node budget; running out marks the
result incomplete. Zero-seat parties never appear, because removing one keeps
the majority. No allocation gives an empty, complete result. Order: seats
descending, then persisted positions lexicographically, as above.

**Worker.** After the existing analysis, the worker computes both lists and
sends them with the result:

- larger coalitions from the first 200 minimal winning coalitions, the ones
  the page already lists;
- blocked majorities with their own budget.

Each list is capped at 200 rows with its full count, like the minimal winning
list. The larger list is complete only when the minimal winning search was
complete and listed every coalition; the blocked list is complete when its own
search finished within budget. The in-page fallback runs the same code. A
result without the new lists still renders, so older messages and test
fixtures stay valid.

**View.** After the minimal winning table and the balancing parties, before
the forbidden pairs:

- "Larger coalitions (n)": a table with members, seats, margin and opposition.
- "Majorities blocked by the rules (n)": one intro sentence, then a table with
  members, seats and reason. A reason reads "Forbidden pair: A – B" and/or
  "Cannot join a government: C".

Party names are isolated as elsewhere. An empty list says so in a sentence.
Both disclosures are hidden when there is no allocation. They are native
disclosure elements, so keyboard and screen reader support come for free.
"On request" means the user opens them; the lists are computed in the worker
with the analysis, so opening one never blocks input.

**Rejected alternative:** computing the lists in the page when a disclosure
opens. A 30-party blocked search can take a noticeable time, and Section 12
asks that coalition work never blocks input; the worker already exists.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario | None | None |
| Worker result message | Optional extras: larger list, blocked list, their totals and completeness | None; never exported |

## Interface Delta

- `src/engine/coalitions.ts`: `largerCoalitions(scenario, allocation,
  minimalWinning)`; `blockedMajorities(scenario, allocation, options)` with a
  node budget; `BlockedMajority` (a coalition plus `ineligiblePartyIds` and
  `forbiddenPairs`); `BlockedMajorityResult` (`blocked`, `complete`,
  `nodesVisited`); `BLOCKED_NODE_BUDGET`.
- `src/ui/coalitionRunner.ts`: `CoalitionExtras`; optional `extras` on the
  done message and the done run.
- `src/ui/Coalitions.tsx`: `details[data-extra="larger"]` with
  `table[data-table="larger"]`; `details[data-extra="blocked"]` with
  `table[data-table="blocked"]`, reason cells `[data-cell="reason"]`; partial
  notes `[data-note="larger-partial"]`, `[data-note="blocked-partial"]`.
- i18n in ru, en, he: `coalition.larger`, `coalition.larger.none`,
  `coalition.larger.partial`, `coalition.blocked`, `coalition.blocked.intro`,
  `coalition.blocked.none`, `coalition.blocked.partial`,
  `coalition.column.reason`, `coalition.reason.forbidden`,
  `coalition.reason.ineligible`.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | Coalitions only: two new read-only lists over integer seats |
| Where exact rationals are required | Not needed: seats are integers; majority from the existing rule |
| Ordering / tie rules relied on | Seats descending, then persisted party positions lexicographically |
| Any display rounding near a decision? | No |
| How determinism across runs, round trip and locale is proven | Oracle equality including order on seeded fixtures; same output on repeated calls and on shuffled input lists |

## Files

| Path | Change |
| --- | --- |
| `src/engine/coalitions.ts` | Two pure functions, types, budget constant |
| `src/ui/coalitionRunner.ts` | Extras type; worker computes and caps both lists |
| `src/ui/Coalitions.tsx` | Two disclosures with tables, reasons, notes |
| `src/ui/styles.css` | Disclosure summary layout |
| `src/i18n/en.ts`, `ru.ts`, `he.ts` | Ten keys |
| `tests/engine/coalitions.test.ts` | Exhaustive-enumeration oracle; Section 8 lists; budget; no allocation; determinism |
| `tests/ui/coalitionRunner.test.ts` | Extras in done messages; caps and totals |
| `tests/ui/coalitions.test.tsx` | Disclosures, counts, reasons, empty and partial states, inert names, every locale |
| `tests/e2e/offline.spec.ts` | Baseline: the worker returns three blocked majorities, shown on opening |
| `doc/spec/elections-simulator.md` | "As built in M2-16" note in Section 7 (at close) |
| `.github/copilot-instructions.md` | Engine and UI module descriptions |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Which larger coalitions are "selected"? — **Decision:** one-party
   extensions of the listed minimal winning coalitions (see Approach).
2. Do blocked majorities include sets blocked only by an ineligible party? —
   **Decision:** yes; Section 8 shows those are the decisive cases, and the
   reason column says which rule blocks each one.
3. Compute in the worker or on opening? — **Decision:** in the worker.

Approved 2026-10-29 on the user's instruction: "vse eto nado s integriroval i realizovat".

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
