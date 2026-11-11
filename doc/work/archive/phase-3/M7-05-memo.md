# Memo — M7-05 Linked party and group turnout

| Field | Value |
| --- | --- |
| item | M7-05 |
| epic | M7 |
| phase | Phase 3 — M7 party-first coalition simulation |
| status | closed |
| created | 2026-10-31 |
| closed | 2026-10-31 |

## Problem

Party-mode votes are currently independent of the displayed group-turnout
fields. Linking them requires an exact, durable group-by-party basis; without
one, changing turnout or party shares would either accumulate rounding, invent
missing voters or silently contradict the party results.

## Scope

**In scope**

- Derive an exact group-by-party vote matrix and group population shares only
  when the existing positive-vote compositions, turnout and total electorate
  determine a consistent model. Unknown or inconsistent data leave ordinary
  party votes and coalition results available and explain why the group
  experiment is unavailable.
- Preserve a linked model's exact population shares, group preferences,
  current turnout, last nonzero turnout profile and explicit allowed
  destinations across edits and JSON round trips. Do not infer a preference
  from a group with zero observed votes or infer permission from a nonzero
  value. Group-mode scenarios retain their existing semantics.
- Change a group turnout from this stable basis, recompute exact party shares
  and compositions, and recalculate seats and coalitions. The same turnout
  entered repeatedly, or after a round trip, must not accumulate error.
  Transient party locks do not prevent turnout-driven changes.
- When a linked model is active, apply a direct party-share edit and its locks
  to the national shares, then transfer votes within groups while preserving
  each group's vote total, population and turnout. Respect explicit destination
  restrictions and preserve the exact requested column totals. An impossible
  or unsupported transfer is refused visibly and changes nothing.
- Overall turnout changes scale all linked group turnouts proportionally
  without changing party shares or seats; refuse a value requiring a group
  turnout above 100%. A saved nonzero profile permits a return from zero.
  Without a linked model, overall turnout remains independently available.
- Integrate the existing party-mode group-turnout fields with the linked
  operation; do not make an enabled control silently change only an unused
  field. Prepare typed engine operations for the overall-turnout and party
  controls that [M7-03](../../backlog.md) will expose. Display typed refusals
  and model availability in ru/en/he.
- Preserve unrelated and draft-only fields. A composition-only edit never
  changes baseline votes: if it invalidates a stored linked basis, suspend
  that basis with an explicit explanation and retain its assumptions rather
  than silently using or discarding them. Offer an explicit rebuild when
  the current composition and turnout data determine a consistent basis.

**Out of scope**

- The redesigned coalition workspace, visible party-share sliders and baseline
  comparison: [M7-03](../../backlog.md).
- The official 2022 reference and historical comparisons:
  [M7-06](../../backlog.md).
- Conversion or removal of legacy group-mode and block controls:
  [M7-09](../../backlog.md); its conversion must preserve any restrictions
  recorded by the linked-model schema.
- New demographic-future graphics and critical combinations:
  [M7-10](../../backlog.md); existing future results must remain correct.

## Approach

Use the party shares and known party compositions as exact conditional inputs,
not as claims about actual voters. A linked basis can be created only when the
existing exact population derivation is available and consistent and each
positive-population group has an observable, defined preference row. An
unknown composition in a party with positive votes, zero turnout without a
previously saved basis, missing groups, zero validity or conflicting population
assumptions makes derivation unavailable. Merely opening the editor never
creates a basis or changes a scenario.

The basis stores population *shares*, so changing the total eligible population
scales all groups without changing their relative sizes. Its per-group
preference row is independent of the current number of ballots; a zero turnout
therefore does not erase previously known preferences. Recompute the matrix
from the population shares, exact group turnouts, common validity and stored
preference rows, never from a previously rounded result. Update the national
shares and positive-vote party compositions from that matrix. If all turnouts
are zero, retain the last defined party shares and compositions for display
while the ordinary no-valid-votes result remains authoritative. Restore using
the saved nonzero profile, not invented equal turnouts.

For a direct party edit, reuse M7-02's exact locked national redistribution.
With a current linked basis, determine the gains and losses and transfer them
between parties only inside each group. First use the existing group
contributions proportionally where feasible; an exact bounded residual-flow
search resolves competing destinations and may reroute earlier transfers.
Stable IDs determine traversal and tie order, not locale or display order.
The search respects only explicit destination restrictions; zero historical
support alone is not a prohibition. If no feasible flow exists, the bounded
search cannot complete, or a component or aggregate denominator limit would
be exceeded, return a distinct typed refusal before modifying the draft.

When the linked basis is unavailable or suspended, direct party-share and
overall-turnout edits still work without inventing group results. An explicit
composition edit suspends any current basis, retains its assumptions for
inspection/recovery, and explains that a valid basis must be rebuilt from
consistent inputs before group experiments resume. Adding, copying or deleting
entities must preserve or explicitly suspend/repair the basis; deleting a
zero-vote entity cannot silently discard a positive modeled population or
latent preference. Existing imported restrictions cannot be bypassed.

Existing later-year calculations and composition diagnostics must use a
current linked basis where present, including a group whose current turnout
is zero, and must never use a suspended basis. Group-mode calculations remain
unchanged. Validate both raw and canonical exact fractions and the aggregate
denominator budget before accepting a candidate, and apply the changed fields
to the original draft rather than replacing it with a validator's stripped
canonical copy.

**Rejected alternative:** recompute each new turnout from the previous party
percentages or rounded group tables, because that accumulates error and loses
the preferences of a group temporarily at zero turnout.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Party-mode group turnout | Store an exact numerator/denominator fraction; growth and turnout change keep their existing meanings. | Version 5; migrate each version-4 decimal turnout exactly, without changing its value. Group-mode turnout remains a decimal string. |
| Party-mode linked basis | Optional current or suspended basis with exact population shares, preference rows, last nonzero turnout profile and explicit allowed destinations. | Version 5; versions 1–3 remain group mode and version 4 keeps its original input mode, votes and seats. Missing basis migrates as unavailable, not fabricated. |
| Party shares and composition | Recomputed exactly from the current basis when the linked experiment changes; unknown remains distinct from an ordinary Other group. | Existing version-4 meanings retained. |
| Locks and input errors | Transient UI state; locks govern manual party edits but not turnout-driven changes. | Not serialized. |

## Interface Delta

Expose pure typed operations for linked party shares, group turnout and overall
turnout, and an availability/consistency result with explicit reasons. The
existing group editor uses the group operation in party mode and shows its
availability and refusal reason; the legacy group editor is unchanged.
Existing composition and future views disclose suspended, missing or
inconsistent assumptions without hiding baseline seats. Numeric input may
show an approximation of a non-terminating fraction but does not commit it on
render, focus or blur. National controls are integrated in M7-03.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | Linked edits change exact party votes and thus threshold, Hamilton allocation and coalition inputs; overall turnout alone must not change seats. |
| Where exact rationals are required | Population shares, turnout profiles, preference matrix, valid votes, party columns, flow capacities and transfers, composition, threshold and seat decisions. |
| Ordering / tie rules relied on | Stable group and party IDs for deterministic transfer traversal; persisted tie order and party ID for seat ties; no locale-dependent ordering. |
| Any display rounding near a decision? | None. Display text and charts are post-decision only; entering, exporting, restoring and projecting preserve exact fractions. |
| How determinism across runs, round trip and locale is proven | Independent exact fixtures and seeded tests compare repeated edits, reversals, serialization, ru/en/he, constraints and byte-identical seat/coalition results, including odd seat totals and threshold boundaries. |

## Files

| Path | Change |
| --- | --- |
| `doc/work/active/M7-05-memo.md`, `doc/work/active/M7-05-test-plan.md`, `doc/work/STATUS.md` | Record the design, RED/GREEN evidence and each step. |
| `src/engine/schema.ts`, `src/engine/votes.ts`, `src/engine/future.ts` | Versioned exact basis, strict migration/validation and projection from current linked assumptions. |
| `src/engine/linkedTurnout.ts`, an exact bounded transfer helper, `src/engine/partyShares.ts`, `src/engine/compositionEdit.ts`, `src/engine/edit.ts`, `src/engine/numeric.ts` | Pure linked edits, explicit refusals, destination restrictions, basis lifecycle, exact display and raw-draft preservation. |
| `src/ui/Editor.tsx`, `src/ui/PartyCompositionEditor.tsx`, `src/ui/PercentField.tsx`, `src/ui/Composition.tsx`, `src/ui/store.ts`, `src/ui/book.ts`, `src/ui/presets.ts`, `src/ui/styles.css` | Existing controls, model availability, exact fraction editing and version-5 construction; only files actually needed are changed. |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Matching explanation and refusal strings. |
| `tests/engine/linkedTurnout.test.ts`, `tests/engine/schema.test.ts`, `tests/engine/partyMode.test.ts`, `tests/engine/partyShares.test.ts`, `tests/engine/compositionEdit.test.ts`, `tests/engine/helpers/` | RED-first linked math, migration, restrictions, boundary, invariance, property and performance cases. |
| `tests/ui/`, `tests/e2e/`, `tests/build/`, `dist/elections.html` | Real controls, unavailable states, exact export/import, legacy behavior, RTL, offline, size and timing gates. |
| `doc/spec/elections-simulator.md`, `doc/backlog.md`, `.github/copilot-instructions.md`, `doc/work/archive/phase-3/` | Sync behavior and archive at close; record any project-brief contour edit. |

## Definition of Done

- [x] Tests written first, observed RED for the intended missing behavior.
- [x] Exact derivation, direct transfers, restrictions, locks, zero and
  unavailable cases, refusals and preservation verified.
- [x] Group and overall turnout repeat, reverse and export/import exactly;
  turnout-only results follow the independent two-group fixture.
- [x] Baseline seats remain available without demographics; composition-only
  edits do not change votes or seats; legacy modes and old imports are intact.
- [x] Mandatory exact seat, threshold, tie, odd-total, locale, round-trip and
  coalition tests pass; no electoral arithmetic appears in UI code.
- [x] Full unit, type, lint, formatting, offline size, performance and
  desktop/phone browser gates pass; docs and deviations are recorded at close.

The independent close gates are recorded in the archived test plan.

## Open Questions

1. What if group assumptions are incomplete or inconsistent? —
   **Recommendation:** do not guess; keep the ordinary party calculation
   available and explain that only the linked experiment is unavailable.
2. How are exact group turnouts and the stable basis preserved? —
   **Recommendation:** add schema version 5, migrate old turnouts exactly and
   retain both preference rows and the last nonzero turnout profile.
3. What if a party edit cannot be transferred within permitted groups? —
   **Recommendation:** reject it with a specific reason and preserve all
   previous inputs; never bypass a restriction or approximate the result.
4. What if a user changes a party's composition after linking? —
   **Recommendation:** keep baseline votes unchanged, suspend the linked
   basis visibly and retain its assumptions until an explicit valid rebuild.
5. What if a group or overall turnout becomes zero? —
   **Recommendation:** keep the saved preference basis and the last nonzero
   profile; show no allocation until valid votes return.

**Approval:** The autonomous request on 2026-10-31 was: “nachinai i approved,
vnosi polnosju vse izmenenija kak zaplanirovanno i 1 nachinai, 2 approved , i
zamoskaem kak ty hotel 1-memo M7-01”. The recommendations above are adopted
for this item.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | Corrected the expected lock refusal from `no-unlocked-recipient` to `locked-total-exceeded` for a 60% request with another 50% share locked. | The requested and locked shares already exceed 100%; the existing exact redistribution reports this earlier, more specific refusal. |
| /2-tests | Scoped browser turnout selectors to group `G1`. | Other group pages remain in the DOM while hidden, so an unscoped selector matched multiple inputs rather than testing the intended control. |
| /3-implement | Corrected the raw aggregate-denominator test fixture to use distinct unreduced denominators. | The schema budget counts distinct denominators; repeating one denominator did not exceed the budget even though its repeated digit count was large. The corrected test still expects rejection. |
| /3-implement | Added the approved pure `linkedTurnout` engine API to the UI import allowlist and clarified the test name. | The existing guard enumerates permitted engine entry points; the new group control must call this memo's engine operation without duplicating electoral arithmetic in the UI. Other imports and UI arithmetic remain checked. |
| /3-implement | Added late RED regression cases for a zero-population group with saved preferences and a saved basis with zero ballot validity. | Review found that deleting the group could discard latent preferences, and the newly available projection incorrectly reported zero cast ballots. Both cases are inside this memo's preservation and projection scope. |
| /3-implement | Added a late RED migration case for an unrelated version-4 field named `linkedModel`. | A version-4 extension was incorrectly subjected to the version-5 fraction budget even though older files do not contain a linked model. On editing such a draft, preserve the colliding value under an unused `legacyV4LinkedModel` key so it cannot be mistaken for the new model. |
| /3-implement | Added late RED cases for empty and contradictory saved turnout profiles at zero turnout. | The accepted basis must have a recoverable nonzero profile consistent with its stored party shares and compositions, rather than importing a model that cannot be restored. |
| /3-implement | Added late RED cases for rebuilding with a dormant group and for assigning that group current votes. | A saved basis already knows the group's population and preferences; rebuilding must preserve those assumptions, while refusing a composition that assigns votes to a zero-turnout group. |
| /3-implement | Added a late RED recovery case for rebuilding a suspended all-zero basis. | The explicit rebuild uses the saved nonzero turnout profile as its reference, retaining zero current turnout until the user restores it; otherwise a composition edit at zero turnout leaves no way to recover the basis. |
| /3-implement | Added late RED cases for changing overall turnout while the basis is suspended. | The independent edit retains group assumptions; an explicit rebuild proportionally aligns their saved profile to the requested overall turnout, refuses overflow, and still checks exact demographic consistency. |
| /4-close | The planned transfer helper is `src/engine/linkedFlow.ts`; `src/engine/compare.ts` and `src/engine/composition.ts` also changed. | The helper implements bounded exact transfers, while comparison and composition had to consume version-5 group turnout and linked availability without reimplementing arithmetic. |
| /4-close | No separate changes were needed in the planned `future.ts`, `partyShares.ts`, `PartyCompositionEditor.tsx`, `PercentField.tsx`, `Composition.tsx`, `store.ts`, `presets.ts` or `styles.css`. | Their existing interfaces use the updated engine helpers, or the already-planned `Editor.tsx` provided the needed linked control. |
| /4-close | The planned existing party-mode, party-share, composition-edit, helper and build tests were run but did not need separate edits. The questionnaire and store assertions and the dedicated linked browser spec changed within the planned `tests/ui/` and `tests/e2e/` scopes. | Dedicated linked and schema fixtures, plus the full existing suites, cover the new exact representation and preserve the pre-existing behavior. |
