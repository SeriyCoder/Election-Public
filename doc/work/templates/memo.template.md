# Memo — <ITEM-ID> <Title>

| Field | Value |
| --- | --- |
| item | <ITEM-ID> |
| epic | <EPIC-ID> |
| phase | <phase from STATUS> |
| status | draft |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | <YYYY-MM-DD> |
| closed | — |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

One paragraph. If it needs two, the item is too big.

## Scope

**In scope**

-

**Out of scope** (at least two)

<!-- An entry that defers a specification requirement names an existing
     backlog item. /1-memo does not add backlog items. -->

-
-

## Approach

How it will work, referencing spec sections.

**Rejected alternative:** one sentence and why.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |

## Interface Delta

Public engine functions, UI surfaces or export formats added or changed.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | |
| Where exact rationals are required | |
| Ordering / tie rules relied on | |
| Any display rounding near a decision? | |
| How determinism across runs, round trip and locale is proven | |

If not affected, say why in one sentence.

## Files

| Path | Change |
| --- | --- |

## Definition of Done

- [ ] Tests written first and seen red
- [ ] Mandatory seat-calculation correctness tests present where applicable
- [ ] Suite, type check and lint green
- [ ] No electoral arithmetic outside `src/engine/`
- [ ] Spec and project brief synced
- [ ] Deviations recorded

## Open Questions

1. <Question> — **Recommendation:** <answer>

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
