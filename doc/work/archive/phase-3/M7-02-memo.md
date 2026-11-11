# Memo — M7-02 Exact proportional party-share editing

| Field | Value |
| --- | --- |
| item | M7-02 |
| epic | M7 |
| phase | Phase 3 — M7 party-first coalition simulation |
| status | closed |
| created | 2026-10-31 |
| closed | 2026-10-31 |

## Problem

Party-mode scenarios now retain exact vote shares, but the engine has no
operation for changing one share while preserving an exact total and the
other parties' locks. The coalition workspace needs a deterministic,
unrounded operation that refuses impossible changes without damaging the
scenario or inventing votes.

## Scope

**In scope**

- Add a pure, typed engine operation for one party-mode share edit. A
  user-entered percentage is preserved exactly, and other unlocked parties
  are adjusted proportionally so all party shares total exactly one.
- Respect the supplied locked party IDs, including zero-share parties.
  Split a remaining amount equally when every available recipient started at
  zero; report an explicit failure when no legal distribution exists.
- Check the existing exact-fraction component and aggregate denominator
  limits for the result. Retain the original input on every failure, and
  never round, clamp, fabricate a recipient or silently discard data.
- Verify votes, threshold and Hamilton seat invariants using the actual
  engine, including below-threshold parties, parties ineligible to join
  government, exact ties, positive and zero turnout, a JSON round trip and
  the three UI locales.

**Out of scope**

- Visible party sliders, lock buttons, error messages, baseline deltas and
  store wiring: [M7-03](../../../backlog.md). That item depends on M7-05, so a
  user is not offered a share-only edit before the linked model is ready.
- Editing known or unknown voter compositions: [M7-04](../../../backlog.md).
- Moving votes within groups or changing group and overall turnout:
  [M7-05](../../../backlog.md). This item supplies only the exact national
  share calculation; it does not claim that unchanged composition is a
  complete linked-demographic edit.
- The historical 2022 data and matching: [M7-06](../../../backlog.md);
  questionnaire and language changes: [M7-07](../../../backlog.md).

## Approach

Use the version 4 party-mode schema and the existing exact rational and
percentage-input helpers (specification Sections 5, 6 and 11). The operation
accepts a scenario, a party ID, the percentage text and locked party IDs.
First validate the input scenario and percentage, without changing either.
Use all parties in the scenario, including those below the threshold and
those unable to join a government; a party not in the scenario has no share
to redistribute.

The target party keeps the entered exact percentage even if its own lock is
set: a lock protects it from another party's direct edit. All other locked
shares remain unchanged. The remaining share is the exact difference between
one, the entered share and the other locked shares. Divide that remainder
among the other unlocked parties in the proportions of their previous shares;
if their previous total is zero, divide it equally. A zero-share unlocked
party stays at zero when other unlocked parties have a positive total.

If locked shares plus the requested value exceed one, or a nonzero remainder
has no unlocked recipient, return a typed refusal. An unchanged value with no
recipient is a successful no-op. Unknown party or lock IDs, a non-party
scenario, invalid scenario or percentage, and a result outside the schema's
exact fraction limits also produce distinct, inspectable failures. A failure
contains the validation issues when applicable and leaves every caller-owned
object unchanged. The success value is an exact share-only candidate; existing
party identities, compositions, rules, turnout, groups and coalition data
remain intact. M7-05 must incorporate the new shares into its own group-party
matrix before M7-03 exposes a linked edit to users.

The existing group-mode rebalance deliberately rounds to 18 decimal places
and uses an explicit command. Keep that behavior unchanged; reuse its
percentage parser and rational primitives, not its rounded result. Validation
of both input and candidate uses the existing schema, including the raw and
canonical 2,048-digit aggregate denominator budget.

The candidate is a canonical validated scenario. The schema deliberately
drops fields it does not recognize; it does not change recognized scenario
data other than the shares. M7-05 and M7-03 must merge the candidate's shares
into any raw editor draft rather than replacing that draft wholesale, so
draft-only data is not lost.

**Rejected alternative:** round redistributed shares to a fixed number of
decimal places, because that can alter the requested value, the total or a
threshold and seat decision.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Party vote shares | Exact existing numerator / denominator values are replaced only in a successful share-only candidate. | None; version 4 and its limits remain authoritative. |
| Locked IDs | Passed as transient editing state; a selected party's own lock does not prevent its direct edit. | None; locks are not saved in scenario JSON. |
| Composition and turnout | Retained without modification by the share-only operation. | None; linked group redistribution belongs to M7-05. |
| Edit result | Typed success or refusal, with existing path-specific validation issues where appropriate. | None; results are not scenario data. |

## Interface Delta

Expose one engine function and its typed result from a dedicated party-share
module. It accepts the existing numeric percentage syntax and its current
16-fractional-digit input limit; a negative, above-100, malformed or
unsupported value is refused. It uses no UI, storage or floating-point
electoral arithmetic. The function can be consumed later by the group-matrix
logic and workspace; this item does not add an inaccessible or misleading
control to the present interface.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | The changed exact party shares feed existing year-zero votes, threshold and Hamilton allocations; coalition rules and search remain unchanged. All valid votes, including below-threshold lists, remain in the denominator. |
| Where exact rationals are required | The requested value, locked totals, remainder, proportional weights, equal splits, output shares and all downstream electoral decisions. |
| Ordering / tie rules relied on | Redistribution is keyed by stable party IDs, not locale or label. No rounding remainder is assigned. Existing persisted tie order and party-ID fallback remain the only seat tie-breakers. |
| Any display rounding near a decision? | None. The entered decimal is parsed exactly, and display formatting never changes or decides a share. |
| How determinism across runs, round trip and locale is proven | Repeat seeded exact edits and allocations, compare results through JSON export/import and ru/en/he formatting, and verify exact threshold boundaries, remainder ties and integer seat sums. |

## Files

| Path | Change |
| --- | --- |
| `doc/work/active/M7-02-memo.md`, `doc/work/active/M7-02-test-plan.md`, `doc/work/STATUS.md` | Record the memo, RED/GREEN evidence and each step. |
| `src/engine/partyShares.ts` | New pure exact redistribution and typed failures. |
| `src/engine/numeric.ts`, `src/engine/rational.ts`, `src/engine/schema.ts`, `src/engine/run.ts` | Reuse existing percentage, rational, validation and seat interfaces; modify only if a shared helper is genuinely required. |
| `tests/engine/partyShares.test.ts`, `tests/engine/helpers/scenarios.ts` | Real failing and then passing exact redistribution, limits and invariant cases. |
| `tests/engine/partyMode.test.ts`, `tests/engine/threshold.test.ts`, `tests/engine/allocate.test.ts`, `tests/ui/i18n.test.ts`, `tests/ui/store.test.ts` | Verify existing threshold, allocation, tie and locale behavior alongside the new cases; the store test exercises an edited scenario in each actual language. |
| `tests/e2e/performance.spec.ts`, `tests/build/offline.test.ts`, `dist/elections.html` | Verify accepted 40-list responsiveness, offline build and size budget. |
| `doc/spec/elections-simulator.md`, `doc/backlog.md`, `.github/copilot-instructions.md`, `doc/work/archive/phase-3/` | Sync implemented behavior and archive at close; record any project-brief contour edit through its own process. |

## Definition of Done

- [x] Observe real RED tests before implementing behavior.
- [x] Verify exact edited values, proportional changes, locks, zero recipients,
  all-locked and impossible edits, malformed input, and input immutability.
- [x] Verify valid inputs at the exact limits and explicit rejection without
  mutation when a result cannot fit the schema limits.
- [x] Verify seeded exact totals, threshold below / at / above, remainder
  ties, seat sums, locale independence, round trips and zero turnout.
- [x] Run unit, type, lint, formatting, offline build and browser checks,
  including the 200 ms accepted-input performance cases.
- [x] Record deviations, sync directly affected documentation and close
  through the working contour.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | Added an edited-scenario case in the existing store test to the file list. | It verifies the real ru/en/he language path without adding a premature UI control. |
| /3-implement | Clarified that successful candidates are canonical scenarios and that later draft wiring must preserve draft-only fields. | The existing schema intentionally drops unrecognized fields on validation; replacing a raw draft with the canonical candidate could otherwise discard editor data. |
| /4-close | The shared rational, numeric, schema and runner modules and existing threshold and allocation tests were reused without modification for this item. | Their existing interfaces already support the exact operation; no shared behavior needed to change. |

## Open Questions

1. Does a party's own lock block direct editing? — **Recommendation:** no;
   it protects that party only while another party is directly edited.
2. What happens when all remaining parties are locked or zero? —
   **Recommendation:** refuse a change without an available recipient, allow
   an unchanged value, and split a remainder equally over unlocked zero
   recipients.
3. What happens if exact output exceeds schema limits? —
   **Recommendation:** reject it with a typed reason and validation issues;
   keep the original scenario unchanged rather than round it.
4. Should this step expose share-only edits in the current UI? —
   **Recommendation:** no; complete group-matrix semantics in M7-05 before
   the linked workspace in M7-03 exposes editing.

**Approval:** The autonomous request on 2026-10-31 was: “nachinai i approved,
vnosi polnosju vse izmenenija kak zaplanirovanno i 1 nachinai, 2 approved , i
zamoskaem kak ty hotel 1-memo M7-01”. The recommendations above are adopted
for this item.
