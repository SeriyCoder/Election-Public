# Memo — M7-03 Coalition workspace

| Field | Value |
| --- | --- |
| item | M7-03 |
| epic | M7 |
| phase | Phase 3 — M7 party-first coalition simulation |
| status | closed |
| created | 2026-10-31 |
| closed | 2026-10-31 |

## Problem

Party-mode scenarios have exact party-share and linked-turnout operations but
the current coalition view places the ordinary multi-page editor beside its
results. The user cannot adjust national party shares and turnout together,
see their consequences beside coalition results, or consult the historical
reference there. Duplicate Seats and Compare tabs repeat or separate existing
results and baseline operations.

## Scope

**In scope**

- In the coalition view, show party names and colours, numeric vote shares,
  sliders, transient locks, seats and a clearly labelled change against the
  2022 reference and the user's saved baseline. Show the actual share
  graphically as well as numerically. Include below-threshold parties; unknown
  comparisons and unavailable allocations are not zero.
- In the same control region show overall turnout and group turnout, with
  exact inputs, sliders, availability and specific explanations for missing,
  inconsistent or suspended assumptions. Keep the chosen coalition, its seats,
  majority margin, compatibility and the available coalition search alongside.
  Majority is not a guarantee of political cooperation.
- Reuse the exact linked party and turnout operations, stored preferences,
  refusal reasons, group controls and worker lifecycle. A successful direct
  party edit retains the requested share exactly, redistributes all other
  unlocked party shares deterministically and preserves existing destination
  restrictions. Locks govern party-share edits only, not group-turnout edits.
- Preserve the independent saved baseline, save, reset, clear, complete
  comparison tables and the full historical 2022 reference and reversible
  one-to-one matching. Remove the duplicate Seats and Compare navigation;
  retain the full seat results on Data and put comparison and history in
  accessible disclosures of the coalition workspace. Historical facts must
  remain accessible even when the current draft is invalid.
- On a wide screen controls are physically left and coalitions right, including
  Hebrew RTL. On a phone controls precede results without horizontal page
  overflow. All controls are keyboard accessible, labelled, and translated in
  Russian, English and Hebrew. Retain the existing visual style.
- Continue displaying and calculating legacy group-mode inputs without
  conversion. Party shares are read-only in this mode; group-turnout edits
  retain the existing group-mode semantics and all legacy fields. Explain
  why the national party controls and overall-turnout edit are unavailable.
- Preserve the existing single-file, no-network, security-policy and 450 KiB
  build gates. Reuse and consolidate existing UI components and strings rather
  than silently raising the budget or deleting required features.

**Out of scope**

- Opening Coalitions after the questionnaire, the final tab order, early
  language selection and default Hebrew: [M7-07](../../backlog.md).
- Hiding participation, block controls and block references, or converting
  legacy files: [M7-09](../../backlog.md). Existing settings and their
  semantics remain accessible in Data until that separately approved work.
- New demographic-future charts and critical combinations:
  [M7-10](../../backlog.md); broader language review and correction of the
  existing group explanation: [M7-08 and M7-11](../../backlog.md).
- Changing the allocation algorithm, threshold, persisted tie order, 2022
  source data, or asserting that a Hamilton result is Bader–Ofer.

## Approach

Sections 5, 6, 9, 10, 11 and 14 of the specification already define exact
party inputs, linked edits, results, comparison, accessibility and offline
delivery. Introduce a compact coalition control region using the existing
store, editor controls, report, historical comparison and coalition runner.
Selected coalition evaluation and search remain independent of comparison
disclosures and update from the same authoritative scenario. Reuse the full
seat and comparison components in their new locations, rather than deleting
their information.

For a valid party-mode draft with a current linked basis, use the linked
party and overall-turnout edits directly. If no basis has yet been stored but
the existing availability check proves that a basis can be built, build it as
part of the same candidate edit and commit both only on success. A suspended
basis is never rebuilt silently: ordinary party and overall-turnout edits stay
available without changing its saved assumptions, and the explicit rebuild
remains available. If demographic assumptions are unknown or inconsistent,
ordinary party and overall-turnout edits still work; group turnout is
disabled with the reason. A refused edit leaves the entire original draft,
including extension fields, untouched and presents the reason.

Use the existing stored party-share fractions and engine-generated report,
historical deltas and baseline comparison. Formatting and chart widths are
display-only and never feed a decision. A field that was merely focused,
blurred or rendered must not write its rounded display value back. Surface
invalid typed text and engine refusals without replacing the last valid
scenario. Build any new read model or exact operation only in the engine;
do not implement electoral arithmetic in UI components.

For group-mode inputs keep the existing group turnout setter and the original
seat calculation, restrictions, blocks and turnout coefficients. Do not
silently convert, normalize, discard extensions or offer an apparently editable
party percentage that does not control that mode. With an invalid draft retain
the user's input and historical facts; clearly indicate which current
controls and results are unavailable. With zero valid votes or no allocation,
show unavailable results rather than invented zero-seat outcomes.

The current offline build is 459,905 bytes against 460,800 bytes, leaving
895 bytes. Treat its size as a hard implementation gate. Measure the actual
production bundle after coherent changes; eliminate duplicated presentation,
unreachable navigation and redundant code without losing behavior. Do not
change the budget, offline policy or tests to make the item pass. If safe
consolidation cannot meet the existing gate, record a blocker instead of
claiming completion.

**Rejected alternative:** convert every legacy scenario to party mode or
adjust shares with floating-point UI math; either could silently change votes,
restrictions or a seat decision.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario | Existing party shares, turnout, linked basis and legacy data remain authoritative; a derivable basis may be committed atomically with a successful edit. | None; schema version 5 remains unchanged. |
| Party locks | Add party-ID-scoped transient editing locks; prune on deletion and clear on scenario replacement. | None; never serialized. |
| Navigation and disclosures | Remove duplicate navigation entries and expose existing seat, baseline and historical surfaces in their new locations. | None; transient UI state only. |
| Historical identity and baseline | Reuse existing choices and independent saved snapshot; no data are merged. | None. |

## Interface Delta

- Add the coalition workspace and its accessible party and turnout controls;
  reuse or extract the existing exact field and slider implementations.
- Extend store lock handling for parties and route edits through existing
  engine operations. Any helper introduced for atomic basis creation must
  return typed failures and preserve the original draft on failure.
- Retain the existing coalition search, chosen-coalition evaluation, seat
  report, complete baseline comparison and historical identity interface.
  Comparison changes are labelled by source and measured in percentage points
  or seats as appropriate.
- Remove only the two duplicate navigation entries. The Data view retains
  the editor and full seat results; Composition and Demographic Future remain
  accessible. M7-07 owns the final order and initial view.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | UI edits feed the existing party/group vote paths, exact threshold, Hamilton allocation and coalition search; no decision algorithm changes. |
| Where exact rationals are required | Party shares and redistribution, group and overall turnout, linked vote transfers, valid-vote denominators and comparison deltas use existing exact engine operations. |
| Ordering / tie rules relied on | Existing stable-ID linked-transfer order and persisted seat tie order remain authoritative; locks never reorder parties. |
| Any display rounding near a decision? | None. Bars, percentages and signed deltas are rounded only after exact calculations; focus or blur cannot save them as new input. |
| How determinism across runs, round trip and locale is proven | Test independent exact share, threshold, seat and coalition fixtures, locks and constrained transfers, repeat/reverse edits, zero/unavailable inputs, export/import and ru/en/he; verify legacy inputs and results remain unchanged. |

## Files

| Path | Change |
| --- | --- |
| `doc/work/active/M7-03-memo.md`, `doc/work/active/M7-03-test-plan.md`, `doc/work/STATUS.md` | Design, RED/GREEN evidence and one log row per step. |
| `src/ui/App.tsx`, `src/ui/store.ts`, `src/ui/Coalitions.tsx`, a coalition workspace component | Layout, controls, transient locks, chosen coalition and navigation. |
| `src/ui/Editor.tsx`, `src/ui/PercentField.tsx`, `src/ui/Compare.tsx`, `src/ui/HistoricalReference.tsx`, `src/ui/Results.tsx`, `src/ui/styles.css` | Reuse or extract existing controls, comparison and full results; accessible responsive layout. Change only what is needed. |
| `src/engine/linkedTurnout.ts`, `src/engine/partyShares.ts`, `src/engine/report.ts`, `src/engine/compare.ts`, `src/engine/historicalReference.ts` | Reuse exact operations and display models; add an engine helper only if needed for atomic edits or reporting. |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Matching workspace labels, availability and refusal explanations. |
| `build/compactLocales.ts`, `vite.config.ts` | Build-only deduplication of translation keys; source tables, values and runtime functionality stay unchanged. |
| `tests/engine/`, `tests/ui/`, `tests/e2e/`, `tests/build/`, `dist/elections.html` | RED-first correctness, UI and browser tests, legacy safety, offline size and performance gates. |
| `doc/spec/elections-simulator.md`, `doc/backlog.md`, `.github/copilot-instructions.md`, `doc/work/archive/phase-3/` | Sync implemented behavior and archive at close; record any project-brief contour edit. |

## Definition of Done

- [x] Tests written first and observed RED for the intended missing behavior.
- [x] Exact share, locks, linked group and overall turnout, refusals, baseline
  and history, no-allocation and legacy behavior are verified.
- [x] Seat, threshold, ties, coalition, round-trip and locale correctness hold;
  no electoral arithmetic is added outside `src/engine/`.
- [x] Full existing results and baseline operations remain reachable after
  removing duplicate tabs; invalid drafts do not hide historical facts.
- [x] Suite, typecheck, lint, formatting, offline build, 450 KiB size,
  keyboard, phone, RTL and relevant response-time checks pass.
- [x] Specification, project brief and deviations are synced at close.

## Open Questions

1. What happens when demographics are unknown or inconsistent? —
   **Recommendation:** keep ordinary party results and party/overall-turnout
   controls; disable only the group experiment and state the reason.
2. How are legacy group-mode scenarios handled? —
   **Recommendation:** preserve and calculate them unchanged, expose their
   existing group turnout, and make national shares read-only until the
   separately confirmed conversion in M7-09.
3. Where should comparison and history live after removing their tab? —
   **Recommendation:** accessible disclosures in the coalition control region,
   retaining every baseline operation, result table and historical fact.
4. What if the single-file budget is exceeded? —
   **Recommendation:** consolidate existing code without losing functions;
   never raise the budget or weaken a gate without a separate user decision.

**Approval:** The autonomous request on 2026-10-31 was: “nachinai i approved,
vnosi polnosju vse izmenenija kak zaplanirovanno i 1 nachinai, 2 approved , i
zamoskaem kak ty hotel 1-memo M7-01”. The recommendations above are adopted
for this item.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | Added a build-only translation-key compactor and its tests to the file list. | The first complete workspace build was 477,050 bytes, above the unchanged 460,800-byte gate. The source tables remain readable and type-checked; the build maps the English and Hebrew values to the Russian reference keys, rejects mismatches, and the tests compare every value from the actual production-transformed bundle. No translation, feature, policy or budget was removed or weakened. |
| /3-implement | Updated legacy navigation tests to open the existing seat report on Data and the comparison and history disclosures in the coalition workspace; selected the history disclosure's direct summary in its new browser test. | Seats and Compare are intentionally no longer tabs. The nested historical table has its own summary, so the original descendant selector was ambiguous. The substantive result, comparison, accessibility and historical assertions are retained. |
| /3-implement | Kept baseline reset and clear actions available in the workspace when the current draft is invalid. | The saved baseline is independent of the current draft and can recover it; no invalid comparison is presented. |
