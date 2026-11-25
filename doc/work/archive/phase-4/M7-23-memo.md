# Memo — M7-23 Preserve Party Compositions When Adding A Questionnaire Group

| Field | Value |
| --- | --- |
| item | M7-23 |
| epic | M7 |
| phase | Phase 4 — M3 public preview |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-11-23 |
| closed | 2026-11-25 |

Approval: user replied "memo approved, do /2-tests and implementation" on
2026-11-25; all memo recommendations are approved for the sequential
`/2-tests → /3-implement` run.

## Problem

Increasing the own voter-group count in the questionnaire changes the
composition page's shape; `usable(...)` then treats every saved `compose`
row as stale and replaces it with even percentages. In the reported
`questionnaire.json`, all eight parties consequently drew 13/13/13/13/
12/12/12/12 from the eight groups, so turnout/growth changes scale every
party proportionally and their seats legitimately do not move. This destroys
the seven-group party compositions before the person edits the eighth group
and looks like a seat-calculation failure.

## Scope

**In scope**

- When an own-group questionnaire count increases, retain each existing
  party's composition row by group ID and set newly added group cells to
  exact `0`.
- Keep every retained party row at its exact 100% sum and preserve its stored
  decimal strings; no automatic rebalance over existing groups.
- Let the person open the composition page and transfer weight to the new
  group with the existing exact align action/locks; show the normal remainder
  when values are edited.
- Cover growth, turnout and derived-seat output after the retained values
  build into a scenario: at least one non-uniform party/group fixture must
  move seats/differential party votes when group growth or turnout changes.
- Keep count decreases and group-name renames deterministic; no unrelated
  value reset.

**Out of scope** (at least two)

- Changing Hamilton allocation, qualification, quota, remainder or coalition
  arithmetic.
- Changing the scenario schema, JSON import/export format or linked-turnout
  equations.
- Automatically inferring how voters should be moved into the new group.
- Reworking party composition semantics or the existing 7% locks.

## Approach

The source bug is in the questionnaire model in `src/ui/book.ts`, spec
14.5: `shapeOf('compose')` includes current group IDs and `usable(...)`
returns null on any shape mismatch. Replace that all-or-nothing check for
`compose` with a narrow shape-aware migration: parse the previous party IDs,
set mode and group IDs; if the party set and set mode are unchanged, map every
stored cell from an old group ID into its corresponding current group ID,
append current groups at `0`, and omit deleted groups. Require the stored text
length to equal oldPartyCount × oldGroupCount; invalid/foreign shapes still
fall back to normal suggestions.

The migration runs only for questionnaire text, never scenario JSON. Build
continues through the existing exact functions, so a party row remains 100%
at addition time and the current linked-basis construction sees the real
non-uniform distributions. A fresh own-group count increase from an existing
typed/example draft therefore keeps differing party vote behaviour.

**Rejected alternative:** silently scaling the old values down and assigning
equal weight to the new group. That invents a demographic claim and would
change all party compositions without the user's instruction.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Questionnaire `BookDraft.values.compose` | Shape migration after group addition/removal only; stored texts preserved by group ID | None |
| Scenario JSON | No change | None — version 5 |

## Interface Delta

- No new visible control.
- `shownTexts(draft, 'compose')` after a group-count increase exposes the old
  values plus exact `0` for every new group.
- Existing composition editor, locks and align button handle later edits.
- No public engine or export API change.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | The migration feeds existing electorate construction; no allocation/coalition code changes. |
| Where exact rationals are required | Existing exact percent parsing/build keeps the party rows at 100%. |
| Ordering / tie rules relied on | Existing group and party ID order from the questionnaire; no seat tie/order change. |
| Any display rounding near a decision? | No; migrated strings are reused exactly and `0` is exact. |
| How determinism across runs, round trip and locale is proven | Same `BookDraft` gives same migrated rows; existing scenario serialization and engine determinism tests run unchanged, plus a locale-independent store/UI regression. |

Not affected: the Hamilton/coalition engine is unchanged; the fix prevents a
questionnaire edit from replacing the engine's inputs with uniform defaults.

## Files

| Path | Change |
| --- | --- |
| `src/ui/book.ts` | Shape-aware `compose` text migration by previous/current party and group IDs |
| `tests/ui/book.test.ts` | Red/green group-add migration with differing party rows and exact 100% |
| `tests/ui/startExamples.test.tsx` or `tests/ui/designRevision2.test.tsx` | Add a group to the ready eight-party example and keep the non-uniform first row |
| `tests/ui/store.test.ts` | Store/book transition retains the composition values through the increased count |
| `tests/e2e/book.spec.ts` or `tests/e2e/startExamples.spec.ts` | Browser regression: add eighth group, build, and future/growth UI remains non-uniform; no lost composition |
| `doc/spec/elections-simulator.md` | State that group-count increase preserves prior party-composition cells and adds new groups at zero |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec synced
- [x] Deviations recorded

## Open Questions

1. On group addition, should the new group start at 0% or at an automatically
   redistributed positive share? — **Recommendation:** 0%; assigning a
   positive share would invent a demographic assumption.
2. On count decrease, should the removed group's share be redistributed or
   should the row become an explicit non-100 remainder for the person to
   resolve? — **Recommendation:** preserve retained values exactly and show
   the normal under-100 remainder. No hidden rebalance.
3. If a group was renamed but its ID is unchanged, should its column migrate?
   — **Recommendation:** yes, ID is the identity.
4. Should this apply when switching to a different group set (basic/own), not
   only own count increase? — **Recommendation:** no; different set identities
   keep the existing full-reset suggestion behaviour.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | Updated the existing count-decrease expectation to "retain values / show under-100 remainder" rather than "fresh even suggestions" | The approved memo explicitly chose preservation on count decrease and on IDs; this is the same migration path as group addition. |
| /4-close | The UI regression lives in `tests/ui/book.test.ts` and the browser regression in `tests/e2e/startExamples.spec.ts`; no `store.test.ts` change was needed | Both paths exercise the store-backed draft through the actual `editPage`/build flow; the memo listed `store.test.ts` as an alternative, not an additional required surface. |
