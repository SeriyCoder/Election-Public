# Memo — M2-07 Baseline Save And Compare

| Field | Value |
| --- | --- |
| item | M2-07 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-28 |
| closed | 2026-10-28 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

The compare view is still a placeholder. A user who wants to see what a turnout
or preference change does has to remember the earlier numbers. Section 4.2 and
Section 9 ask for a saved baseline that is an independent snapshot, a side by
side comparison of votes, turnout, seats and coalition feasibility, and a reset
that restores the baseline. The M2 milestone (Section 13.1) names baseline
compare as part of the first usable release; multi-scenario comparison is M4.

## Scope

**In scope**

- One baseline per session: Save as baseline copies the current valid scenario
  as a deep, independent snapshot. Saving again replaces it. Clear baseline
  removes it.
- Reset to baseline replaces the current scenario with a fresh copy of the
  baseline (pending delete, locks and the chosen-coalition selection are
  cleared, as on preset load). The baseline itself stays.
- A pure engine comparison of two scenarios and their seats-only results:
  - totals: population, cast ballots, valid votes and overall turnout, each
    baseline, current and change;
  - groups matched by stable ID: turnout input as a percent, baseline, current
    and change, with added and removed groups marked;
  - parties matched by stable ID: votes, vote share, qualification status and
    seats, each baseline, current and change, with added and removed parties
    marked;
  - required majority, baseline and current.
- A pure engine comparison of two coalition analyses: status, complete or
  incomplete, and the minimal winning coalitions matched by member set and
  marked as baseline only, current only or both.
- A second coalition runner for the baseline, fed by the store's baseline, so
  the baseline search also runs in a worker and never blocks input.
- The compare view: the empty state with Save as baseline; with a baseline, the
  baseline name, Save again, Reset to baseline, Clear baseline and the tables
  above, plus the coalition comparison with each side's run state.
- All new strings in ru, en and he.

**Out of scope**

- Several saved scenarios, named duplicates and comparing three or more
  scenarios (Section 9; M4).
- Persisting the baseline across reloads or in JSON export (M2-08 decides the
  export shape; HTML snapshots with baseline are M4).
- Comparing a chosen coalition across baseline and current.
- Block-level comparison rows and comparison charts; tables only.
- Comparison of the vote destinations inside each group.

## Approach

**Snapshot (Section 4.2, Section 11 "Saved comparison").** The store keeps the
baseline as its own deep copy of the raw input, taken only when the current
input validates. No later edit, preset load or reset can reach it, because
every action replaces the current input and the baseline object is never
handed out for editing: reset copies it again. Language changes do not touch
it; custom names are not translated.

**Comparison in the engine (Section 10 rounding).** A new `src/engine/compare.ts`
takes both validated scenarios and both seats-only results. Every change is
computed exactly from the rationals and then rounded half away from zero with
the existing display places (whole votes and people, two places for percents);
the change is therefore not the difference of two rounded numbers. Seat
changes are integers. When either side has no allocation, that side's seats are
reported as absent and no seat change is given. Rows are ordered by the current
scenario's persisted order, then baseline-only rows in the baseline's order.
Matching uses IDs only, so renames never break a row.

**Coalition comparison.** Also in `compare.ts`: given the two analyses (or an
absent one while a search is running, cancelled or failed), it reports both
statuses and completeness and merges the minimal winning coalitions by member
ID set. Order: coalitions in the current analysis order, then baseline-only
coalitions in the baseline order. An incomplete side is shown as such; the view
never claims a coalition disappeared when that side's search was truncated.

**Second runner.** `main.tsx` creates a second runner with the same worker
factory and connects it to the store's baseline instead of the current
scenario. The runner itself is unchanged; a small connect function picks the
baseline's validated scenario. The baseline search runs once per save (and
again after Run again), not on every edit.

**View.** `Compare.tsx` replaces `placeholder.compare`. Deltas carry an explicit
sign and a direction marker for styling, are formatted through `format.ts`, and
mixed-direction values stay isolated. Dense tables scroll inside a labelled
region, as in the seats view.

**Rejected alternative:** computing the comparison in the view from the two
rounded reports — subtracting rounded values breaks the Section 10 rounding
rule and puts arithmetic outside `src/engine/`.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Store state | Adds `baseline` (deep copy of a valid raw input, or none); not persisted, not exported | None |
| Scenario | None | None |

## Interface Delta

- Engine: `compareScenarios` (totals, groups, parties, majority) and
  `compareCoalitions` with their result types, in `src/engine/compare.ts`.
- Store: `baseline` in state; `saveBaseline` (refuses an invalid input),
  `resetToBaseline`, `clearBaseline`; derived baseline validation and
  seats-only result, cached like the current one.
- UI: `connectBaselineRunner` in `coalitionRunner.ts`; `Compare.tsx`; App
  passes the baseline runner; `format.ts` gains a signed-change formatter.
- `placeholder.compare` is removed; the panel placeholder path disappears.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None changed. The comparison reads existing vote, threshold and allocation results and subtracts exact rationals; the coalition comparison only matches member lists |
| Where exact rationals are required | Every vote, share and turnout change is computed exactly before display rounding |
| Ordering / tie rules relied on | Persisted entity order for rows; the Section 7 minimal winning order from M1-07 for coalitions |
| Any display rounding near a decision? | No decision is made from a change; a rounded change of zero next to a changed qualification status is shown as it is |
| How determinism across runs, round trip and locale is proven | Comparing a scenario with itself gives zero changes everywhere; comparing the Section 8 baseline with the 7% and 8% fixtures gives the known seat changes; a hand-computed change that differs from the difference of rounded values is asserted; the baseline is unchanged after edits, preset loads and reset; the compare view shows the same rows in every language |

## Files

| Path | Change |
| --- | --- |
| `src/engine/compare.ts` | New: scenario and coalition comparison |
| `src/ui/store.ts` | Baseline state, save, reset, clear, derived baseline |
| `src/ui/coalitionRunner.ts` | Baseline connect function |
| `src/ui/Compare.tsx` | New: compare view |
| `src/ui/App.tsx` | Compare panel; baseline runner prop |
| `src/main.tsx` | Creates and connects the baseline runner |
| `src/i18n/format.ts` | Signed-change formatter |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | New keys; remove `placeholder.compare` |
| `src/ui/styles.css` | Compare view and change markers |
| `tests/engine/compare.test.ts` | New |
| `tests/ui/compare.test.tsx` | New |
| `tests/ui/store.test.ts`, `tests/ui/coalitionRunner.test.ts`, `tests/ui/app.test.tsx`, `tests/ui/i18n.test.ts` | Baseline actions, baseline runner, placeholder removal, signed formatter |
| `.github/copilot-instructions.md`, `doc/spec/elections-simulator.md` | Brief map; Section 9 note on the M2 baseline (at close) |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Should Reset to baseline ask for confirmation? — **Decision:** no. It
   sits in the compare view next to the table that shows exactly what would be
   lost, and Save as baseline before editing is the documented flow. Revisit
   if M3 feedback reports lost edits.
2. Where does Save as baseline live? — **Decision:** in the compare view
   only, so the phone toolbar does not grow. The empty compare view explains
   the flow in one sentence.
3. Should loading a preset clear the baseline? — **Decision:** no.
   Comparing a preset against an earlier saved scenario is a valid use; Clear
   baseline is explicit.
4. Which turnout does the group comparison use? — **Decision:** the group
   `turnout` input, the canonical value per Section 5; the overall turnout row
   covers the computed cast-ballot rate.
5. Does the baseline search run on every edit? — **Decision:** no, only
   when a baseline is saved, replaced or rerun; the baseline never changes in
   between.

Approved on the user's standing instruction: "samostoyatelno rzreshaju approve doiti do M3-01".

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | The seat-change fixtures are Group 3 turnout halved (P3 18 → 10) and a 6% threshold (48 / 53 / 19 / 0), not the 7% and 8% fixtures named in the Seat-Calculation table | Both give known Section 8 seat changes from exact inputs, and the 6% case also exercises a qualification change; the 7% and 8% fixtures stay covered in `allocate.test.ts` |
| /3-implement | The compare view has no Cancel or Run again control for the baseline search; a cancelled or failed baseline search is retried by saving the baseline again | Save already restarts the search with a fresh scenario; a second set of search controls on the compare panel would duplicate the coalitions view for little gain |
| /3-implement | The "coalitions pending" note shows only while a side is idle or running; a cancelled or failed side shows its own status text instead | The note would otherwise promise a result that will not arrive |
| /3-implement | The baseline deep copy is a JSON round trip, not `structuredClone` | Raw scenario input is plain JSON, and the round trip behaves the same in the node test runner and every target browser |
| /3-implement | The now unused `.placeholder` CSS rule is removed with the compare placeholder | The compare panel was its last user |
