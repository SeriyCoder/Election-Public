# Memo — M7-08 Multilingual model notices

| Field | Value |
| --- | --- |
| item | M7-08 |
| epic | M7 |
| phase | Phase 3 — M7 party-first coalition simulation |
| status | closed |
| created | 2026-11-01 |
| closed | 2026-11-01 |

## Approval

Autonomous approval, 2026-11-01: "approved to you and by your own to execute
all phases and substesp of EPIC 7, do not stop to ask me".
This approves the recommendations below, not skipping any workflow gate.

## Problem

The simplified workspace must consistently distinguish model assumptions from
real voters and political commitments. Review found three stale claims: clearing
storage promises Russian rather than the Hebrew default, known composition alone
is presented as sufficient for linked redistribution, and the future note does
not distinguish fixed turnout in new scenarios from retained legacy changes.
The workspace should also name Hamilton explicitly rather than leaving the
method distinction only in the historical disclosure.

## Scope

**In scope**

- Correct the four existing notices in ru/en/he: storage reset, linked workspace
  assumptions, workspace majority/method disclosure, and future assumptions.
- Verify unknown composition is not zero or Other, ordinary results remain
  available, historical official seats use Bader–Ofer while model seats use
  Hamilton, and half of seats is distinct from a majority or cooperation.
- Add independent expected-copy regressions and keep existing rendered notices.

**Out of scope**

- No engine, scenario schema, inputs or allocation changes.
- Accepted panel integration is M7-12; questionnaire/navigation is M7-13.
- Human publication review of English/Hebrew remains M3-05.

## Approach

Use the existing rendered keys; no additional controls or translation lookup
mechanism. The coalition note names the educational Hamilton model, not the
Israeli Bader–Ofer method, and retains the non-guarantee of cooperation.
The future note says assumptions, not a forecast; new scenarios hold turnout
fixed while old files retain saved changes. The linked note requires an active
model and preserves the lock distinction. The storage notice follows the
existing Hebrew fallback. Spec sections 10, 14.3 and 14.4 remain authoritative.

Reviewed surfaces: workspace majority and assumptions; party-composition unknown,
partial and consistency messages; linked availability and M7-11 group note;
legacy conversion; historical source/validity/method labels; future unavailable,
half-seat, configured-majority, incomplete-search and non-cooperation notices.
Apart from the four keys above, these are consistent with their engine contracts.

**Rejected alternative:** adding another general warning panel duplicates
existing disclosures and consumes scarce offline space without correcting them.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Four translated notices | Copy only | None |

## Interface Delta

Existing notice placements are preserved. No arithmetic or permissions change.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched | None |
| Where exact rationals are required | Existing engine only |
| Ordering / tie rules relied on | Unchanged |
| Any display rounding near a decision? | None |
| Determinism across runs, round trip and locale | Existing engine tests; strings never feed the engine |

Seat calculation is unaffected because only explanatory text changes.

## Files

| Path | Change |
| --- | --- |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Four notices in each table |
| `tests/ui/i18n.test.ts` | Locale-specific notice regressions |
| `dist/elections.html` | Required offline rebuild |
| `doc/spec/elections-simulator.md` | Record clarified interface notices at close |
| `doc/backlog.md` | Tick only after independent close gates |
| `doc/work/active/M7-08-memo.md`, `doc/work/active/M7-08-test-plan.md`, `doc/work/STATUS.md` | Step evidence and archive lifecycle |

## Definition of Done

- [x] New regressions seen RED, then GREEN without changing expectations
- [x] Review matrix and all four corrections cover ru/en/he
- [x] Full tests, typecheck, lint, formatting and offline browser gates pass
- [x] No changes to engine or scenario data; offline size limit retained
- [x] Specification checked and updated; project map needs no new entries
- [x] Deviations recorded

## Open Questions

1. Add a new warning panel? **Recommendation and approved decision:** no; fix
   the existing rendered notices, preserving their placements.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /4-close | None: changed files match the Files table. | Only copy, regression tests, generated offline file and listed workflow/specification documents changed; no new lasting design decision or project-map entry. |
