# Memo — M2-32 Israeli names by default

| Field | Value |
| --- | --- |
| item | M2-32 |
| epic | M2 |
| phase | Phase 2 — M2 reopened for review corrections |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-30 |
| closed | 2026-10-30 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

The questionnaire page «Как назовём участников?» offers «Придумать свои
названия», «Подобрать названия из Израиля» and, for six parties, the six-list
example. Today the first one is the suggested answer, so a reader who passes
the page with Next gets parties called «Партия 1» … «Партия N» and has to type
or pick every name. The user asked that «Подобрать названия из Израиля» be the
default, so the names page starts from real 2022 lists and nobody has to type
unless they want to.

## Scope

**In scope**

- The suggested answer of `parties.naming` becomes «Подобрать названия из
  Израиля» (`catalog`): an unanswered page shows it selected and marked as the
  suggestion, and Next records it like any suggestion.
- Wherever the questionnaire needs the naming and has no usable answer — no
  answer yet, an unreadable one, or the six-list example with a party count
  other than six — it now takes `catalog` instead of `own`. The names page then
  starts from the 2022 lists in seat order, one per field (Likud, Yesh Atid,
  Religious Zionism, National Unity for the suggested four; up to all ten).
- A build or a skip with that naming makes the parties catalog entries (their
  catalog IDs, names and colours), exactly as choosing the option by hand does
  today.

**Out of scope** (at least two)

- The group set. «Учебный набор» stays suggested only after the six-list
  example; with the 2022 lists the suggestion is still the user's own groups.
  The user asked about names only.
- The order of the three choices on the page and their wording.
- The editor and the presets: an added party still gets an empty name and a
  numbered default label (Section 10, M2-19).
- Any change to the catalog, its names or its colours.

## Approach

`src/ui/book.ts` holds both places: the fixed suggestion of `parties.naming`
and the naming fallback inside the questionnaire's context. Both change from
`own` to `catalog`; nothing else in the model needs to change, because the
names page, its stored-answer shape, the pick list and the build already handle
`catalog` (M2-23, M2-25). A stored answer is kept as it is: a reader who chose
«Придумать свои названия» keeps it, and a draft saved with an explicit answer
is not reinterpreted.

The narrator reply of the page follows the shown answer, so the suggested page
now shows the reply for the 2022 lists; no new text is needed.

**Rejected alternative:** keeping `own` as the model's fallback and only
changing the page's suggestion. The two would then disagree: the page would
show «из Израиля» while a skip without that answer built own names.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| — | None; the questionnaire draft is not part of the scenario, and a built scenario holds catalog IDs as it already can | None |

## Interface Delta

- «Как назовём участников?» opens with «Подобрать названия из Израиля»
  selected and marked as suggested; the names page that follows lists the 2022
  lists in seat order.
- A build or skip without an answer to this page gives the 2022 lists instead
  of «Партия 1» … «Партия N».
- No new keys, components or styles.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None in the engine; the build still goes through the editor's edit functions |
| Where exact rationals are required | Unchanged; the vote shares and turnout of a default build are the same texts as before |
| Ordering / tie rules relied on | The build sets `tieBreakOrder` by field position (1 … N), so an exact remainder tie goes to the same position as before; only the party ID behind that position changes |
| Any display rounding near a decision? | No |
| How determinism across runs, round trip and locale is proven | A test builds the default answers and compares seats by position with the old own-name build; the existing questionnaire-equals-editor and round-trip tests run on the new default |

Not affected in the engine: the item changes which IDs and names the
questionnaire suggests, not how a scenario is calculated.

## Files

| Path | Change |
| --- | --- |
| `src/ui/book.ts` | Suggested and fallback naming `catalog` |
| `tests/ui/book.test.ts` | New: suggestion, fallback, default build with catalog IDs and seats by position; old expectations of `own` as the suggestion updated |
| `tests/ui/store.test.ts`, `tests/ui/bookView.test.tsx`, `tests/ui/app.test.tsx` | Expectations that assumed the own-name default, where they do |
| `tests/e2e/*.spec.ts`, `tests/e2e/helpers.ts` | A questionnaire walk that expects `P1` … IDs after passing the naming page, where one does |
| `doc/spec/elections-simulator.md` | At close: Section 14.5 suggestions and an "As built in M2-32" note |
| `doc/backlog.md`, `doc/work/STATUS.md` | Loop bookkeeping |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Should the six-list example still win when the count is six? —
   **Recommendation:** no change: it stays a choice, not the suggestion; the
   suggestion is the 2022 lists for every count.
2. Should «Подобрать названия из Израиля» move to the top of the list? —
   **Recommendation:** no; the order stays and the suggestion mark shows the
   default.
3. Should choosing the 2022 lists also suggest the example groups? —
   **Recommendation:** no, out of scope; the example groups belong to the
   six-list example's numbers (Section 14.4).

Approved 2026-10-30 on the user's request: "Vlkadka kak nazovom uchastnikov,
podobrat nazvanija iz izrailja dolzhni byt defaults" (2026-10-30), in
autopilot mode; the recommendations above are the decisions.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | `tests/ui/app.test.tsx` and `tests/e2e/helpers.ts` are unchanged, though the Files table names them "where they do" | A test run with both defaults switched to the catalog showed no test there depending on the own-name default (test plan, Deliberately Not Tested and Run Record) |
