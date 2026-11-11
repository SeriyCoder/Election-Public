# Memo — M7-09 Simplified controls and legacy safety

| Field | Value |
| --- | --- |
| item | M7-09 |
| epic | M7 |
| phase | Phase 3 — M7 party-first coalition simulation |
| status | closed |
| created | 2026-10-31 |
| closed | 2026-10-31 |

## Problem

The interface still exposes participation coefficients, restricted voting and
blocks even though the approved party-first workflow should use simple party
controls. Old files and presets can depend on those fields and on block-based
coalition exceptions, so hiding the controls must not silently change their
calculations or destroy the original scenario.

## Scope

**In scope**

- Hide participation-factor, restricted/open voting and block-management
  controls and block concepts throughout the user-facing interface. New
  group-mode defaults already use full participation and open voting; the new
  party-first example and converted inputs use the equivalent simple model.
- Preserve the unconverted results and serialized semantics of existing
  group-mode and party-mode scenarios, including participation, validity,
  majority overrides, old future behavior, block rules, party exceptions and
  directed refusals. Display an understandable legacy warning and the effective
  party-pair restrictions rather than an editable block interface.
- Provide an explicit, reversible-in-session conversion workflow: analyze the
  current valid input without changing it, present the original and candidate
  results, allow cancellation, and apply only after explicit confirmation. Keep
  an independent exportable copy of the pre-conversion scenario; do not
  overwrite the user's original file or replace the separately saved baseline.
- Convert exactly where the existing version-5 model can represent the
  original relative party and group vote distribution. Refuse otherwise with
  a specific visible reason; never round a fraction to make a conversion
  succeed, lose a directed refusal or turn a blocked pair into an allowed one.
- Show differences in turnout, absolute valid votes, vote shares, seats,
  coalition compatibility and the selected demographic-future year. Label
  unavailable allocations, projections and incomplete searches as such.
- Retain offline operation, all three languages, keyboard and phone access,
  the 450 KiB single-file limit and the existing deterministic engine.

**Out of scope**

- New demographic-future graphics, two critical party sets and a cancellable
  0–20-year threshold search belong to [M7-10](../../../backlog.md).
- The comprehensive wording review across the three languages belongs to
  [M7-08 and M7-11](../../../backlog.md); correct only text made misleading by
  the controls and compatibility behavior in this item.
- Changing Hamilton, threshold or tie ordering, inferring real voters'
  behavior, publication and hosting are not part of this item.

## Approach

Sections 3–7, 9–11 and 14 of the
[specification](../../../spec/elections-simulator.md) describe the two input
models, exact vote totals, coalition rules, import and projections. Existing
version-5 files remain valid and are not rewritten merely because they are
opened. Normal import/export continues to serialize the same validated
scenario, and an untouched legacy scenario is always calculated by its
original engine path.

Remove the block page and block assignment from the editor, block tables and
block detail rows from results, block targets from composition, and block
rule editors and source labels from coalition views. Retain the current
party-pair rules and the names of parties issuing directed refusals. The
effective list may originate from a legacy block rule, but the simplified
interface describes the resulting party pair without exposing a block
configuration. Do not remove or filter user-entered names or notes merely
because they contain a word that also names an old feature.

Hide the participation coefficient and voting-mode selector. Existing group
values stay intact and are still used by the engine. A legacy group input
offers an explanation that its old selection restrictions remain in effect;
edits that would conflict with those hidden restrictions are explicitly
unavailable until conversion, rather than silently changing the mode.
Ordinary safe edits and the existing original-result view remain available.
If an old scenario uses a nonstandard validity or majority rule, disclose
that it still affects its result; do not silently replace it with a default.

Show the conversion entry point only when a validated scenario carries a
legacy group mode or an additional old rule requiring normalization. An
invalid draft keeps its validation messages; it is never converted. Preparing
the candidate is a pure engine operation on the current validated scenario,
not an update to the store. A stale preview cannot be confirmed after the
input, selected future year or relevant settings change: cancel it or build
and show a fresh preview first. Cancellation and failed preparation leave the
current scenario and saved baseline untouched.

For group mode, take the exact existing population and valid group-to-party
vote contributions from the old engine. The converted group turnout combines
the original participation factor and turnout, so the current number of cast
ballots is preserved. Store the existing group population shares and
preferences in the linked basis, retaining explicitly known zero-turnout group
preferences. Open voting makes all existing parties eligible destinations,
but their existing zero or nonzero preference weights remain unchanged.
Derive exact party shares and known party compositions from the original
valid contributions; a zero-vote party's composition remains unknown.

The converted simple model uses the standard 99.9% common validity rate and
default half-plus-one majority. It keeps IDs, order, names, notes, colours,
party eligibility, population, threshold and growth. Converted group turnout
changes are set to zero so future differences are visible rather than silently
retaining annual turnout movement in the simple demographic model. Existing
unconverted inputs retain their original future behavior. A candidate is
accepted only if the resulting linked model reproduces the original exact
relative group-by-party valid-vote matrix and current party shares; unequal
group validity, zero valid votes, underdetermined data, numeric limits or
other constraints that prevent this are reported as typed refusals. Uniform
validity different from 99.9% can still be converted: its changed absolute
valid votes and any consequent projection differences appear in the preview.
Do not treat an unknown composition as an all-zero composition.

For an existing party-mode scenario, preserve exact party shares, group data,
known or unknown compositions and the linked basis. Normalize the old
majority and common validity only in the candidate; preserve or explicitly
report unavailable group assumptions. Open the linked basis to all parties
without changing its current preference weights. Reset annual turnout
movement in the candidate and show resulting future differences.

Expand every effective forbidden pair into the candidate's party-pair rules
after applying existing block exceptions. Keep direct incompatibilities and
the original directed refusals, including who refused whom. A compatible
override removes only the block-origin prohibition it actually overrides;
it never overrides a direct incompatibility or a refusal. Remove block
assignments and block rules only from the candidate. Validate all party IDs,
distinct pair counts and exact-integer budgets under the existing schema; a
limit violation refuses the conversion without dropping an entry.

The preview shows before and after values by stable ID, including current
turnout, ballots, valid votes, each party's votes and vote share, qualification
and seats, the effective restrictions and selected-coalition evaluation.
Show the original and candidate future results for the current selected year,
including an explicit unavailable reason, and label an unchanged value as
such. Reuse existing comparison and formatting helpers for displayed values.
Coalition searches use the cancellable worker lifecycle and retain incomplete
or unavailable status; the preview must not invent a guaranteed coalition or
block user input while searching. Neither display rounding nor an incomplete
search decides whether exact conversion is allowed.

On confirmation, save a deep independent pre-conversion scenario for an
explicit original-scenario download, replace the current input atomically with
the validated candidate, clear view state that no longer applies and retain the
user's separate baseline. A subsequent unrelated scenario replacement clears
the conversion snapshot. The downloadable snapshot represents the validated
pre-conversion scenario; the user-selected original file is never edited.

**Rejected alternative:** hide the legacy controls while automatically
changing their fields on load, because it would quietly change votes,
restrictions, projections and possibly seats.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Unconverted scenario | Keep existing original fields and their engine meaning, including block rules and directed refusals. | None; versions 1–4 continue to migrate as currently supported. |
| Converted scenario | Produce a validated party-mode scenario with exact shares, effective party pairs, no block assignments, standard validity and default majority. | None; version 5 already represents the required fields. |
| Linked demographic basis | Store exact existing population, effective turnout and preferences only when they reconcile with the original relative vote matrix. | None; existing linked model, no invented demographic data. |
| Conversion preview and original copy | Transient UI state, keyed to the exact input and selected future year; original is independently exportable after confirmation. | None; not added to the scenario or silently persisted. |
| Baseline and historical reference | Remain independent of conversion and of the exportable original copy. | None. |

## Interface Delta

- Add a pure, typed conversion result with explicit refusal reasons and a
  validated candidate; reuse the current exact vote and coalition helpers.
- Replace obsolete controls and displays with party-only equivalents on Data,
  Results, Composition, Coalitions and any associated detail panels.
- Add an accessible legacy notice, comparison preview, cancel and confirm
  actions, pending/incomplete search feedback and original export. Apply
  translations in Russian, English and Hebrew in the same change.
- Existing UI tests that assert now-removed controls must be replaced with
  assertions for their deliberate absence; retain their substantive legacy
  arithmetic and restriction coverage in engine, import/export and conversion
  tests instead of weakening it.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | Conversion constructs exact party and group vote shares and may change absolute validity and majority; existing threshold, Hamilton allocation and coalition search stay authoritative. Effective block restrictions are represented as equivalent party pairs. |
| Where exact rationals are required | Every population, effective turnout, group-by-party contribution, party share and composition, and every consistency decision, stays in `src/engine/` as an exact rational. Validate canonical numerator, denominator and scenario budgets. |
| Ordering / tie rules relied on | Preserve party IDs, persisted order and `tieBreakOrder`; represent effective pairs deterministically, retaining both directed refusals and explicit exceptions. Never sort with the UI locale. |
| Any display rounding near a decision? | None. The preview may round for display, but candidate eligibility, demographic consistency, threshold, allocation and refusal decisions use exact values. |
| How determinism across runs, round trip and locale is proven | Repeat conversion, compare exact inputs and results after JSON round trip and ru/en/he rendering, and exercise threshold boundaries, exact remainder ties, odd seat totals, generated fixtures, zero votes, pair overrides and the maximum supported limits. |

Test a heterogeneous-validity case that must be refused, a uniform
nonstandard-validity case with preserved shares and changed absolute valid
votes, zero-turnout groups with stored preferences, a zero-vote party, a
historical v1–v4 import, a no-allocation result, block exceptions combined
with refusals from both directions, a pair-budget boundary, excessive exact
precision, and a changed-input stale preview. The selected future year must
show before/after changes or an explicit unavailable reason, never a false
zero.

## Files

| Path | Expected change or explicit compatibility verification |
| --- | --- |
| `doc/work/active/M7-09-memo.md`, `doc/work/active/M7-09-test-plan.md`, `doc/work/STATUS.md` | Design, RED/GREEN evidence and one recorded transition per step. |
| `doc/work/archive/phase-3/M7-09-memo.md`, `doc/work/archive/phase-3/M7-09-test-plan.md`, `doc/backlog.md`, `doc/spec/elections-simulator.md`, `.github/copilot-instructions.md` | Close and archive, sync behavior and record any project-brief contour edit. |
| `src/engine/legacyConversion.ts` | Pure exact legacy analysis, candidate construction, effective pair expansion and typed refusals. |
| `src/engine/votes.ts`, `src/engine/coalitions.ts`, `src/engine/linkedTurnout.ts`, `src/engine/schema.ts`, `src/engine/edit.ts`, `src/engine/compare.ts` | Reuse existing exact calculations, validators, types and comparisons; modify only when shared functionality genuinely requires it. |
| `src/ui/editorPages.ts`, `src/ui/Editor.tsx`, `src/ui/Results.tsx`, `src/ui/Composition.tsx`, `src/ui/Coalitions.tsx` | Hide obsolete controls and block-facing views while retaining party restrictions and old calculations. |
| `src/ui/LegacyConversion.tsx`, `src/ui/App.tsx`, `src/ui/store.ts`, `src/ui/fileTransfer.ts`, `src/ui/coalitionRunner.ts` | Accessible preview, lifecycle and cancellation, atomic confirmation, preserved original and export. |
| `src/ui/styles.css`, `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Responsive presentation and complete visible messages. |
| `tests/engine/legacyConversion.test.ts`, existing engine and schema tests | Exact conversions and refusals, legacy semantics, pair rules, deterministic seats and projections. |
| `tests/ui/editorPages.test.ts`, `tests/ui/editor.test.tsx`, `tests/ui/results.test.tsx`, `tests/ui/views.test.tsx`, `tests/ui/store.test.ts`, `tests/ui/fileTransfer.test.ts`, new conversion-view tests | Removed-control behavior, preserved metadata, preview lifecycle, confirmation, export and no unintended changes. |
| `tests/e2e/legacyConversion.spec.ts`, existing editor, interaction, accessibility, layout, offline and workspace suites | Real file import, warning and confirmation, exact preview and export, mobile, RTL, offline and absence of obsolete controls. |
| `tests/build/offline.test.ts`, `vite.config.ts`, `dist/elections.html` | Verify unchanged offline policy and size limit; optimize without changing the budget if the new behavior exceeds it. |

## Definition of Done

- [x] Tests are written first and fail for the intended missing behavior.
- [x] No user-facing block controls or block concepts remain; legacy effective
      party restrictions and directed refusals remain visible and correct.
- [x] Old imports, exports, votes, seats, coalition rules and future behavior
      remain unchanged until conversion is explicitly confirmed.
- [x] Exact conversion and every documented refusal, including zero and
      precision edges, are covered without fabricated data or dropped pairs.
- [x] The user can inspect before/after current and future values, cancel,
      confirm, and export the original independently of the saved baseline.
- [x] Stale previews and incomplete searches cannot be presented as complete
      or applied as another scenario's conversion.
- [x] Mandatory exact seat, determinism, boundaries and round-trip tests pass.
- [x] The full suite, type check, lint, formatting, offline browser and
      unchanged size gates pass; documentation and deviations are synced.

## Open Questions

1. How are hidden legacy rules handled? — **Recommendation:** keep their
   calculations unchanged, show an explicit warning and effective party pairs,
   and never offer a control that silently changes a hidden restriction.
2. Which conversions are safe? — **Recommendation:** require an exact
   representation of the current relative group-by-party vote matrix, refuse
   with a reason otherwise, and show permitted absolute and future differences.
3. What is retained after confirmation? — **Recommendation:** an independent,
   exportable validated original in the current visit, without changing the
   source file or replacing the user's saved baseline.
4. How are legacy block exceptions represented? — **Recommendation:** expand
   the effective pairs after exceptions, retain direct and directed party
   rules, and refuse rather than truncate any excess or inexact data.
5. How is demographic future treated? — **Recommendation:** preserve the
   old projection until conversion; set converted annual turnout change to
   zero and preview the currently selected year, leaving the full new future
   visualization and threshold search to M7-10.

**Approval:** The autonomous request on 2026-10-31 was: “nachinai i approved,
vnosi polnosju vse izmenenija kak zaplanirovanno i 1 nachinai, 2 approved , i
zamoskaem kak ty hotel 1-memo M7-01”. The recommendations above are adopted
for this item.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | Wired the candidate-search runner in `src/main.tsx`, which was not named separately in the original file list. | A separate cancellable worker is required for the preview; an unavailable worker is reported rather than running a blocking search on the UI thread. |
| /3-implement | Extended the existing `build/compactLocales.ts` and `tests/build/compactLocales.test.ts` with deterministic, lossless translation-value packing. | The first complete bundle exceeded the unchanged 450 KiB limit. The actual production transform is tested to reconstruct every translation exactly, including literal private-use characters. |
| /3-implement | Updated obsolete assertions in the existing editor, results, composition, store and browser suites, including the questionnaire preset title. | The approved interface deliberately removes those controls and the old mode label. Replacement checks retain original scenario data, party restrictions, cohort edits, exact party composition, confirmation and export behavior. The composition fixture's corrected expectations are 60/380 and 320/380, not the unrelated values initially written for a different fixture. |
| /3-implement | Corrected the worker failure test to send its second error through a newly started worker; added a separate queued-success-after-failure regression. | A terminated worker must not be able to deliver a later successful result, so the former test's simulated event sequence was invalid. |
| /3-implement | Added late regression coverage and related fixes for hidden-restriction recovery and conflicting overrides, no-allocation normalization, stale or replaced previews, worker failures and original-download errors. | These are safety and error-reporting edges of the approved conversion workflow; their missing behavior was observed before the fixes rather than silently relaxing existing coverage. |
| /4-close | Verified the listed reusable engine modules, existing compatibility suites and build configuration without changing them; updated the project brief and filed CONTOUR-21 for its next audit. | Existing exact arithmetic and validators already supplied the required behavior, and the brief is a directly edited contour file. |
