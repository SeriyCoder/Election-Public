# Memo — M7-04 Optional party composition

| Field | Value |
| --- | --- |
| item | M7-04 |
| epic | M7 |
| phase | Phase 3 — M7 party-first coalition simulation |
| status | closed |
| created | 2026-10-31 |
| closed | 2026-10-31 |

## Problem

Version 4 already permits an unknown voter composition, but the party-mode
editor cannot enter or remove a composition, and the composition view can
show zero-valued group rows without displaying the unknown share. Users need
to enter a conditional mix without inventing demographic facts, changing
party votes, or losing coalition results while entering values.

## Scope

**In scope**

- In party mode, make each party's composition an optional, collapsed editor.
  Keep an unknown composition explicitly unknown until the user chooses to
  supply one; require a deliberate confirmation before replacing a known
  composition with unknown.
- Allow the user to begin with clearly labelled equal **model assumptions**
  over the existing groups, then edit each exact group percentage. Keep the
  total exactly 100% by proportionally adjusting the other groups; display
  the rule, the percentages, group colours and an updating pie or bars.
  With no groups, explain that a group must be added first.
- Preserve the selected percentage exactly, refuse invalid or unrepresentable
  inputs with a visible reason, and preserve the original scenario and
  results on refusal. An unchanged field or merely opening the editor never
  rewrites a non-terminating stored fraction using its rounded display.
- Show known contributions and unknown composition separately in the party
  and block reports. Explicitly distinguish unknown from the ordinary
  "Other / unclassified" group. Label these as valid voters in the scenario,
  not the population. Report unavailable or inconsistent derived group
  populations separately without blocking seats or claiming realism.
- Preserve all recognized and draft-only data except the edited party's
  composition. Party shares, votes, seats, qualification and coalition
  inputs do not change; the existing future projection may become available
  or unavailable according to the new demographic assumptions.

**Out of scope**

- National party sliders, locks and the redesigned coalition workspace:
  [M7-03](../../../backlog.md).
- Reallocation of party votes within groups and turnout experiments:
  [M7-05](../../../backlog.md). A composition edit here changes an assumption,
  not the baseline vote share or group turnout.
- The complete historical reference and unknown 2022 social compositions:
  [M7-06](../../../backlog.md); questionnaire optionality and initial language:
  [M7-07](../../../backlog.md).
- Hiding block controls and converting legacy group-mode scenarios:
  [M7-09](../../../backlog.md). Existing group-mode editing and reports retain
  their current behavior.

## Approach

Reuse version 4's exact composition map and null representation, the existing
fraction limits, the current scenario validation and the calculation contract
in specification Sections 5, 6, 11 and 14.2–14.3. The edit operation works
with stable party and group IDs and validated values; an optional shared exact
redistribution helper may be extracted from M7-02 rather than duplicating
electoral arithmetic. The edited group keeps its exact typed value, and the
other group shares receive the remainder in proportion to their former
shares; if all recipients were zero, split it equally. A single group can
only be 100%. Schema component and aggregate denominator limits are checked
before a candidate is applied. Failures are typed, displayed and leave the
caller-owned draft and seats unchanged.

An unknown party stays unknown until the user presses the explicitly labelled
equal-assumption action. The equal fractions, including non-terminating ones,
are exact; they are not described as statistics. The user can instead leave
the field unknown. Switching an existing known composition to unknown
requires an explicit confirmation, with cancellation preserving it.

The editor applies only the new composition to the original raw draft. It
must not replace that draft with the canonical validator result, since the
validator intentionally drops unknown fields. Invalid intermediate input
stays visible with a localized reason and is not committed; the last valid
composition remains authoritative. Localized display rounding is not used
for an electoral decision and must not be written back merely by rendering,
focusing or closing a field.

For party-mode reports, reuse the engine's unknown-composition amount rather
than treating it as an actual group. For group-population diagnosis, use the
same exact assumptions and availability checks as the existing future
projection; show an inconsistency or missing data separately. Such a check
is a consistency check of the scenario, not confirmation of real-world
accuracy. Keep the pre-existing group-mode report and the legacy block target.

**Rejected alternative:** store incomplete or rounded composition values in
the scenario while typing, because that would hide otherwise valid seats or
quietly change the user's exact assumptions.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Party `composition` | Existing null or complete exact group map can be edited in party mode; only an explicit user action creates equal assumptions. | None; version 4 remains authoritative. |
| Editor input/error state | Transient text, refusal and confirmation state is not scenario data. | None. |
| Composition report | Unknown contributions and demographic consistency are shown explicitly and separately. | None; derived display only. |

## Interface Delta

Add reusable typed engine operations for initialization, exact group-share
editing and marking unknown, with explicit failure results. Add a collapsed
party composition control to the existing party editor, with accessible labels,
localized errors and confirmation; retain keyboard, phone and RTL usability.
The existing composition view distinguishes known, unknown and unavailable
data. All new interface text is added in ru/en/he together. No user string is
stored in the scenario.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | Composition and diagnostic arithmetic changes; baseline party votes, threshold, Hamilton allocation and coalition rules must remain identical. Later-year projections may change as assumptions change. |
| Where exact rationals are required | Initialization, entered percentages, proportional redistribution, composition totals, reported known/unknown group contributions and the population-consistency decision. |
| Ordering / tie rules relied on | Stable group IDs address values, scenario group order governs display and any equal display-rounding tie; existing persisted party tie order and ID fallback decide seats. |
| Any display rounding near a decision? | None. Rounded labels and pie boundaries are display only; invalid or non-terminating edits never rewrite values on render or blur. |
| How determinism across runs, round trip and locale is proven | Compare votes, threshold, seat JSON and coalition results before and after each composition edit, test exact boundary and ties, odd seat totals over seeded inputs, JSON round trips and ru/en/he. |

## Files

| Path | Change |
| --- | --- |
| `doc/work/active/M7-04-memo.md`, `doc/work/active/M7-04-test-plan.md`, `doc/work/STATUS.md` | Record design, RED/GREEN evidence and each step. |
| `src/engine/composition.ts`, `src/engine/partyShares.ts`, `src/engine/numeric.ts`, a shared exact redistribution or composition-edit module if needed | Implement or share exact composition editing, typed refusals and report data without UI arithmetic. |
| `src/engine/edit.ts`, `src/ui/store.ts` | Apply only the changed composition to the original draft; retain unrelated and draft-only fields and preserve seats on refusal. |
| `src/ui/Editor.tsx`, a reusable `src/ui/PartyCompositionEditor.tsx`, `src/ui/Composition.tsx`, `src/ui/styles.css` | Collapsed editor, labelled chart, known/unknown report and separate consistency explanation. |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Accessible labels, explanation, confirmations and errors in all locales. |
| `tests/engine/compositionEdit.test.ts`, `tests/engine/composition.test.ts`, `tests/engine/partyShares.test.ts`, `tests/engine/partyMode.test.ts`, `tests/engine/helpers/scenarios.ts` | RED-first exact composition, denominator, metadata, seat, tie and projection cases; reuse shared fixtures. |
| `tests/ui/editor.test.tsx`, `tests/ui/store.test.ts`, `tests/ui/views.test.tsx`, `tests/ui/i18n.test.ts`, `tests/e2e/` | Exercise editing, failure and confirmation paths, no-change behavior, unknown reports, locale, accessibility and desktop/phone offline interaction. |
| `tests/build/offline.test.ts`, `dist/elections.html` | Verify production offline build, size and performance gates. |
| `doc/spec/elections-simulator.md`, `doc/backlog.md`, `.github/copilot-instructions.md`, `doc/work/archive/phase-3/` | Sync implemented behavior and archive at close; record any project-brief contour edit. |

## Definition of Done

- [x] Observe real RED tests before implementing.
- [x] Verify explicit unknown/equal initialization, confirmation, exact
  redistribution, zero recipients, one/no group, errors and unchanged input.
- [x] Verify unknown versus ordinary "Other", known/unknown contributions,
  separate demographic consistency and no claimed population inference.
- [x] Verify baseline votes, seats, coalitions, ties and thresholds unchanged,
  seeded odd-seat sums, JSON round trips, three locales and legacy group mode.
- [x] Verify draft-only fields and non-terminating fractions survive ordinary
  rendering, focus, blur, cancellation and refused edits.
- [x] Run unit, type, lint, formatting, offline build and browser gates,
  including keyboard, RTL, desktop/phone and the 200 ms performance budget.
- [x] Record deviations, sync the spec and close through the working contour.

## Open Questions

1. How is an unknown composition started? — **Recommendation:** keep it
   unknown until the user explicitly chooses labelled equal model assumptions;
   never substitute an "Other" group or claim survey data.
2. How is the sum kept at 100% while editing? — **Recommendation:** retain
   the typed group exactly and proportionally adjust the others, with an
   equal split when the recipients previously had zero; explain the rule.
3. What happens when removing a known composition? — **Recommendation:** ask
   for explicit confirmation; cancel keeps the existing exact values.
4. Do conflicting demographics block results? — **Recommendation:** no;
   show the separate consistency or missing-data reason and keep baseline
   party shares, votes, seats and coalition calculations available.
5. Are displayed rounded fractions silently saved? — **Recommendation:** no;
   only an explicit valid input updates an exact fraction.

**Approval:** The autonomous request on 2026-10-31 was: “nachinai i approved,
vnosi polnosju vse izmenenija kak zaplanirovanno i 1 nachinai, 2 approved , i
zamoskaem kak ty hotel 1-memo M7-01”. The recommendations above are adopted
for this item.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | Added a dedicated composition-edit test file and a typed behavior-free engine stub. | Exact editing has its own focused contract; the stub makes the real tests fail for missing behavior rather than a missing import. |
| /3-implement | The new browser tests explicitly open the seats view before comparing visible seats, then return to the editor. | On phones the existing layout hides the seats table on the inputs view; the original tests incorrectly assumed it was visible. The same seat-invariance assertions remain in place. |
| /3-implement | The shared export test helper now selects the latest JSON Blob and has a deterministic worker-Blob regression test. | A full browser run exposed a race in which a later asynchronous worker Blob was mistaken for the exported scenario; JSON contents remain asserted. |
| /4-close | The existing `edit.ts`, `numeric.ts`, `store.ts` and listed existing regression files did not need changes. | The dedicated composition-edit module applies changes to the raw draft through existing APIs, and the existing regression suites already cover those unchanged files. |
