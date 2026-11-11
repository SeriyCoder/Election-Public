# Memo — M7-11 Accurate party-mode turnout explanation

| Field | Value |
| --- | --- |
| item | M7-11 |
| epic | M7 |
| phase | Phase 3 — M7 party-first coalition simulation |
| status | closed |
| created | 2026-11-01 |
| closed | 2026-11-01 |

## Problem

The party-mode group note in all three language tables says that group turnout
cannot change party shares, votes or seats, but M7-05 links an available group
turnout edit to the exact party and seat calculation. The note must explain
when that edit is available, what it recalculates, and that demographic
projections remain assumptions rather than predictions.

## Scope

**In scope**

- Correct `editor.partyModeGroupNote` in Russian, English and Hebrew. Say that
  when the exact linked group basis is available, changing group turnout
  recalculates the overall turnout, party vote totals and shares, and current
  seats.
- Explain that the group-turnout experiment is unavailable when party
  compositions or population assumptions are unknown, inconsistent or the
  linked model is suspended; ordinary party results remain available.
- State that demographic projections use assumptions and do not describe or
  predict real voters.
- Add focused coverage that rejects the old contradictory claim and requires
  the availability, recalculation and assumption distinctions in all three
  locale strings; retain the existing rendered-note check.

**Out of scope**

- Changing linked-turnout calculations, availability rules, scenario data or
  seat allocation; those remain the M7-05 engine contract.
- Redesigning the group editor, coalition workspace or demographic-future
  panels; the accepted prototype integration is recorded in M7-12.
- Reviewing every translation or notice in the application; the broader
  language and disclaimer review remains M7-08 and M3-05.

## Approach

Keep the single existing `editor.partyModeGroupNote` key and its current
placement under party-mode group controls. Replace its wording in all three
tables with a concise explanation of the conditional linked edit and its
effects, the unavailable state when assumptions do not determine a consistent
basis, and the hypothetical nature of projections. Do not imply that changing
growth changes today's party shares or seats. The specification's existing
linked-turnout behavior in §§3 and 14.3 is already accurate and remains
authoritative; no spec change is expected.

**Rejected alternative:** Keep the existing blanket statement and rely on the
disabled-control error; it remains visible when editing is available and
misdescribes the successful edit.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| `editor.partyModeGroupNote` | Translation text only | None |

## Interface Delta

The explanation beneath party-mode group controls accurately distinguishes a
linked turnout edit that recalculates national party results from unavailable
group experiments, while describing demographic projections as assumptions.
No controls or result displays change.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None; this item changes only explanatory text and tests. |
| Where exact rationals are required | No new arithmetic; the existing linked engine remains the only calculation path. |
| Ordering / tie rules relied on | None changed; existing scenario party order and tie rules remain untouched. |
| Any display rounding near a decision? | None; no displayed value or decision changes. |
| How determinism across runs, round trip and locale is proven | Existing exact-engine and round-trip tests remain unchanged; localized strings never enter scenario input or the calculation path. |

Exact allocation, thresholds, tie ordering and engine results are not affected
because this item changes explanatory translations only.

## Files

| Path | Change |
| --- | --- |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Correct the same existing party-mode group note in every locale. |
| `tests/ui/editor.test.tsx` | Add focused multilingual assertions for the explanation while preserving the rendered-note check. |
| `dist/elections.html` | Regenerate the shipped offline file with the corrected translations. |
| `doc/work/active/M7-11-memo.md`, `doc/work/active/M7-11-test-plan.md`, `doc/work/STATUS.md` | Record the loop steps, RED/GREEN evidence and status transitions. |
| `doc/backlog.md` | `/4-close` records completion; no scope is added in this memo step. |

## Definition of Done

- [x] Tests are written first and fail for the intended contradictory wording.
- [x] All three locale values explain conditional availability, recalculation
      and the hypothetical nature of projections without promising that every
      group edit changes every party's individual results.
- [x] The focused rendered-note and locale tests pass.
- [x] Full tests, typecheck, lint, formatting and offline browser gates pass.
- [x] Existing engine behavior and exact seat results remain unchanged.
- [x] Specification and project brief are checked and synced if needed.
- [x] Deviations are recorded.

## Open Questions

1. How much detail should the group note give about linked-basis availability?
   **Recommendation:** name unknown or inconsistent compositions/population
   assumptions and a suspended basis as reasons the experiment may be
   unavailable; explicitly say that ordinary party results remain available.
   Keep the wording concise and do not list internal refusal codes.
   **Decision (2026-11-01): Approved by the user.**

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | Regenerated `dist/elections.html` through the required offline browser gate. | The shipped offline page must include the updated translations; the build measured 459,901 bytes against the 460,800-byte limit. |
