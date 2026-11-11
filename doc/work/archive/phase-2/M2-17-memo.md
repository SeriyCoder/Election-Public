# Memo — M2-17 Pivotal-Party View

| Field | Value |
| --- | --- |
| item | M2-17 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release, reopened for review fixes |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-29 |
| closed | 2026-10-29 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

Section 7 allows "an optional pivotal-party view" and requires that it "must
define its metric", and adds that "a truncated search cannot … support a claim
about all pivotal parties". The coalition view has no such view. Worse, the
existing balancing-party heading claims more than the engine computes: it reads
"Parties every winning coalition needs" in English (and the same in Russian and
Hebrew), while the engine marks a party as balancing when it has coalition
partners on both sides of a forbidden pair. A party can balance without being
needed by every coalition, so the heading can be false. Users cannot tell which
parties actually hold the key to every permitted government.

## Scope

**In scope**

- **Stated metric.** For each government-eligible seated party: the number of
  permitted minimal winning coalitions that include it. Every member of a
  minimal winning coalition is pivotal in it (the coalition loses its majority
  without that member), so this is the number of permitted coalitions in which
  the party is pivotal. It is the counting form of the Holler public good
  index. A party is **needed by every coalition** when it is in all of them.
- **Truncation honesty.** When the search is incomplete, counts are lower
  bounds ("at least n"), and "needed by every coalition" is shown as
  "unknown" for a party that is in every coalition found, because a missing
  coalition could exclude it. A party missing from a found coalition is
  provably not needed by every one, complete or not.
- Computed in the worker over the full minimal winning list, not only the 200
  rows the page shows.
- A closed disclosure "Pivotal parties" in the coalition view, with one
  sentence that states the metric and the coalition count it is taken over.
- **Heading fix.** The balancing-party heading states what the engine
  computes: parties that can govern with either side of a forbidden pair, in
  ru, en and he.

**Out of scope**

- Banzhaf or Shapley–Shubik indices: Section 7 asks for one stated metric, and
  these would need every feasible winning coalition, not just the minimal
  ones. No backlog item needed.
- Percent shares of the count: "n of N" says the same without display
  rounding. No backlog item needed.
- Pivotal counts in the comparison view: Section 9 compares coalition
  feasibility, not power. No backlog item needed.
- Pivotal counts for blocked majorities: a party cannot be pivotal in a
  government the rules forbid. No backlog item needed.

## Approach

**Engine (Section 7).** A pure function takes a coalition analysis and returns
one row per government-eligible party, in the analysis's eligible list: the
party, its count of minimal winning coalitions, and whether it is needed by
every coalition — yes, no or unknown:

- **yes**: the search is complete and the party is in every coalition found;
- **no**: some found coalition leaves it out, or the complete search found
  none;
- **unknown**: the search is incomplete and the party is in every coalition
  found so far.

Rows are ordered by count descending, then persisted party order. With no
allocation the list is empty. Counting is integer membership over the full
list; nothing is divided or rounded.

**Worker.** After the analysis and before the list is cut to 200 rows, the
worker computes the rows and sends them with the other lists on request, plus
whether the search was complete. A result without them still renders.

**View.** A closed disclosure "Pivotal parties", placed after the minimal
winning table and the balancing parties and before the larger coalitions. It
holds:

- a definition sentence naming the coalition count the metric is taken over;
- a table with three columns: party, number of coalitions, and needed by
  every coalition (yes, no or unknown);
- a partial note when the search was incomplete, with counts shown as
  "at least n".

When no permitted coalition was found, a sentence replaces the table. Party
names are isolated as elsewhere.

**Heading fix.** The balancing-party heading becomes, in English, "Balancing
parties: can govern with either side of a forbidden pair", with matching
Russian and Hebrew. The engine definition does not change.

**Rejected alternative:** a Banzhaf swing count over all feasible winning
coalitions. It needs a second, larger enumeration in the worker and is harder
to explain in one sentence; the minimal-winning count reuses the list the user
already sees.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario | None | None |
| Worker result extras | Pivotal rows and whether the search was complete | None; never exported |

## Interface Delta

- `src/engine/coalitions.ts`: `pivotalParties(analysis)` returning
  `PivotalParty` rows (`partyId`, `coalitions`, `indispensable` as true, false
  or null for unknown).
- `src/ui/coalitionRunner.ts`: `CoalitionExtras` gains `pivotal` and
  `pivotalComplete`.
- `src/ui/Coalitions.tsx`: `details[data-extra="pivotal"]` with
  `table[data-table="pivotal"]`, rows `tr[data-pivotal="<party id>"]`, cells
  `[data-cell="coalitions"]` and `[data-cell="indispensable"]`; empty
  `[data-empty="pivotal"]`; partial note `[data-note="pivotal-partial"]`.
- i18n in ru, en, he: new `coalition.pivotal`, `coalition.pivotal.intro`
  (with the total), `coalition.pivotal.none`, `coalition.pivotal.partial`,
  `coalition.pivotal.atLeast`, `coalition.column.party`,
  `coalition.column.coalitions`, `coalition.column.indispensable`,
  `coalition.unknown`; changed `coalition.balancing`.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | Coalitions only: an integer membership count over the existing minimal winning list |
| Where exact rationals are required | Not needed: counts are integers; no division |
| Ordering / tie rules relied on | Count descending, then persisted party order |
| Any display rounding near a decision? | No; counts are shown whole |
| How determinism across runs, round trip and locale is proven | Oracle check against counts recomputed from an exhaustive enumeration on seeded fixtures; Section 8 fixtures; incomplete-search cases with a small node budget |

## Files

| Path | Change |
| --- | --- |
| `src/engine/coalitions.ts` | `pivotalParties` and `PivotalParty` |
| `src/ui/coalitionRunner.ts` | Extras carry the pivotal rows and completeness |
| `src/ui/Coalitions.tsx` | Pivotal disclosure |
| `src/i18n/en.ts`, `ru.ts`, `he.ts` | Nine new keys; balancing heading reworded |
| `tests/engine/coalitions.test.ts` | Section 8 counts; oracle; incomplete search; no allocation; ordering |
| `tests/ui/coalitionRunner.test.ts` | Extras carry pivotal rows from the full list |
| `tests/ui/coalitions.test.tsx` | Disclosure, definition, yes/no/unknown, at-least counts, empty, inert names, every locale, heading text |
| `tests/e2e/offline.spec.ts` | Zero-turnout example: one party needed by every coalition, shown on opening |
| `doc/spec/elections-simulator.md` | "As built in M2-17" note in Section 7 (at close) |
| `.github/copilot-instructions.md` | Engine and UI module descriptions |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Which metric? — **Decision:** the number of permitted minimal winning
   coalitions that include the party, with "needed by every coalition" as the
   strongest claim. It is exact, integer, cheap and explained in one sentence.
2. Are government-ineligible parties listed? — **Decision:** no; they cannot
   be in any permitted coalition, and the summary already names who can join a
   government.
3. Fix the balancing heading here? — **Decision:** yes; next to a "needed by
   every coalition" column, the old heading would state the same claim for a
   different set of parties.

Approved 2026-10-29 on the user's instruction: "vse eto nado s integriroval i realizovat".

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
