# Memo — M7-06 Historical 2022 preset and reference

| Field | Value |
| --- | --- |
| item | M7-06 |
| epic | M7 |
| phase | Phase 3 — M7 party-first coalition simulation |
| status | closed |
| created | 2026-10-31 |
| closed | 2026-10-31 |

## Problem

The existing Israeli example has six lists and invented teaching preferences,
not the official 2022 results. Users need a distinct, clearly historical
40-list reference and editable preset, without losing their own saved
baseline, confusing official seats with the simulator's Hamilton seats, or
guessing any demographic composition.

## Scope

**In scope**

- Add all 40 lists, each separately, with the exact valid-vote counts and
  official historical seats. The first 13 total 4,693,527 votes; the other 27
  total 71,215; together they total 4,764,742. Store integer counts, not
  rounded published percentages. Retain the names and joint-list identity in
  the 2022 context, including Religious Zionism — Otzma Yehudit.
- Keep an immutable built-in historical reference separate from the user's
  saved baseline and from an editable historical preset. Replacing, editing,
  saving or restoring a scenario does not rewrite the reference. The existing
  neutral and six-list educational presets remain available.
- The new party-mode preset uses 6,788,804 eligible voters, the exact turnout
  4,794,593 / 6,788,804, each list's exact share of 4,764,742 valid votes,
  120 seats, a 3.25% threshold and the existing 99.9% model validity rate.
  Every party's composition is unknown; no demographic preferences,
  compatibility claims or historical coalition restrictions are invented.
- Show the historical totals, official valid and invalid ballots, exact
  turnout rounded to 70.63% for display, source attribution and the 99.9%
  model assumption. Explain that model ballot counts need not equal the
  historical counts. Show official Bader–Ofer historical seats separately
  from the model's Hamilton seats, and never describe the model as a
  reproduction of the official seat method.
- Make the reference available without replacing the scenario or saving a
  baseline. The existing comparison view is its initial home; M7-03 will
  carry it into the redesigned coalition workspace. Compare exact vote
  shares and seats only for unambiguous matches, with any displayed delta
  explicitly identifying whether its reference is the official historical
  seat count or the model's Hamilton count.
- Match automatically only by an established 2022 list ID whose current
  entity still has its catalog identity. A custom-renamed entity, a split
  or unmatched list is not matched by a similar name or treated as zero.
  Allow an explicit, reversible one-to-one user mapping, reject duplicate
  assignments and display unmatched or unavailable values as such. Explicit
  matches are transient view state, not scenario data, and are cleared on
  scenario replacement and pruned on deletion. Preserve the user's saved
  baseline and its existing comparison independently.
- Keep the one-file offline and accessibility contracts, the 450 KiB size
  budget, keyboard access, phone layout, RTL and the three language tables.
  The source is shipped as a text attribution; it is not fetched at runtime.

**Out of scope**

- National party sliders, locks and the redesigned coalition workspace:
  [M7-03](../../backlog.md). The reference and identity mapping are designed
  for that item to reuse.
- Demographic group assumptions, linked turnout editing, early language
  selection and questionnaire changes: [M7-05](../../backlog.md) and
  [M7-07](../../backlog.md). Unknown historical composition is not an
  ordinary “Other” group.
- Implementing the Bader–Ofer allocation method or promising that Hamilton
  reproduces historical mandates. The existing allocation method is not
  changed.
- Publishing the app or treating 2022 list identities, coalitions or results
  as current political facts.

## Approach

Sections 6, 9, 11 and 14.4 of the specification already define exact party
shares, threshold qualification, stable IDs, comparison and the separate
educational example. Add one language-independent, versioned-by-election
dataset of 40 stable IDs, valid-vote counts and official seat counts. Reuse
existing catalog IDs for the ten established 2022 winning lists; add distinct
IDs for the remaining lists without adding them to the questionnaire's
existing ten-list default set. Resolve names in ru/en/he through the existing
name and translation mechanisms, and identify the 2022 joint list correctly.
Data are facts about lists and ballots, not demographic measurements.

The requested first 13 vote counts, the official totals and the available
full table agree with the
[Israel Democracy Institute's 2022 results](https://en.idi.org.il/israeli-elections-and-parties/elections/2022/).
The [Central Elections Committee's 2022 national results](https://votes25.bechirot.gov.il/nationalresults)
returned HTTP 403 in this environment, as did its root page. Do not claim a
direct successful official-site import: record the accessible published table
and this limitation as provenance. The source table contains the remaining
27 counts separately and their independent sum is 71,215. At implementation
time cross-check all 40 entries, their order, totals and official seats against
the accessible source; a missing or contradictory entry blocks the item.

Build the preset from fresh copies of the reference data, representing every
party share as its vote count over the official valid-vote total and turnout
as the exact historical cast-to-eligible ratio. Reuse schema version 5,
validation, `runSeats`, threshold and Hamilton allocation; the source
reference itself is not a mutable or imported scenario. A single uniform
99.9% validity rate makes model valid ballots 4,789,798.407, not the
historical 4,764,742; both must be labelled honestly.

Keep historical facts, model results, selected matches and the saved baseline
as distinct concepts. A comparison may use a catalog ID only when it denotes
the same 2022 electoral list and its current name has not been customized.
Do not infer identity from labels. When no automatic match is justified,
an explicit mapping can link one current list to one historical list; show
the choice, allow its removal, and reject a second use of either side.
Resolve current names from the raw scenario before display-name substitution,
so a custom rename cannot be mistaken for an untouched catalog name.
An unmatched list, no valid-vote allocation or an invalid current draft yields
an explicit unavailable value, not a fabricated zero. Keep mapping controls
compact rather than rendering a 40-option selector for every row.

The official reference is always visibly historical and remains unchanged
when the editable preset is modified. Display current model seats beside the
reference's separately identified historical Bader–Ofer seats and its
Hamilton-model seats. Baseline saving and reset continue to operate only on
the user's scenario. Full source URLs belong in documentation rather than the
shipped HTML, whose existing offline test permits no non-namespace web URL.

**Rejected alternative:** merge the 27 small lists into “Other”, calculate
shares from rounded percentages, or invent party demographics; each would
change the model's meaning or manufacture unsupported facts.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Historical reference | Immutable 2022 list IDs, exact vote counts, official seats and national totals, with source and method labels. | None; built-in data, not a scenario field. |
| Historical preset | Fresh version-5 party scenario with exact vote-count shares and turnout; all compositions unknown. | None; existing exact fields and validation. |
| Match choices | Explicit one-to-one current-to-historical mapping; clear on replacement and prune deleted entities. | None; transient UI state, separate from the saved baseline. |
| Names | Localized catalog names and a context-correct 2022 joint-list label. | None; interface strings are not stored in scenario JSON. |

## Interface Delta

Add a historical preset to the existing preset menu and a persistent reference
section to the comparison view, with accessible totals, source, method
disclosures, 40 separate historical rows, identity-match controls and current
comparison values. The reference is usable when no baseline is saved and
remains present when demographics are unknown. Existing baseline actions,
legacy presets, import/export, worker behavior and ordinary seat results
remain intact. Provide matching strings and accessible controls in ru/en/he;
the reference remains legible on a phone and in RTL.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | The new preset feeds exact official vote-derived shares through the existing threshold, Hamilton and coalition paths. No allocation rule or compatibility restriction changes. |
| Where exact rationals are required | Cast-to-eligible turnout, each list's votes over all historical valid votes, current/reference percentage-point changes and every threshold, quota and remainder decision. |
| Ordering / tie rules relied on | Distinct stable list IDs; published reference order sets deterministic preset tie order; the existing persisted order and ID fallback settle model seat ties. |
| Any display rounding near a decision? | None. The displayed 70.63% turnout, percentages and charts are derived after exact decisions and are never read back into a scenario on display or blur. |
| How determinism across runs, round trip and locale is proven | Check the complete independent 40-count fixture and sums, 13/27 subtotals, exact threshold, qualifying lists, the 120-seat Hamilton fixture, official seats separately, coalition results, JSON round trips and ru/en/he. |

The independently calculated Hamilton fixture for the ten qualifying lists in
published vote order is 31 / 23 / 14 / 12 / 11 / 8 / 6 / 5 / 5 / 5 seats,
while their official historical seats are 32 / 24 / 14 / 12 / 11 / 7 / 6 /
5 / 5 / 4. Neither array is substituted for the other.

## Files

| Path | Change |
| --- | --- |
| `doc/work/active/M7-06-memo.md`, `doc/work/active/M7-06-test-plan.md`, `doc/work/STATUS.md` | Record the design, independent source limitation, RED/GREEN evidence and each step. |
| `src/engine/historical2022.ts`, `src/engine/historicalReference.ts`, `src/engine/compare.ts`, `src/engine/rational.ts` if needed | Authoritative built-in numeric data, fresh exact preset construction and exact reference comparison; reuse existing arithmetic rather than duplicating it in UI. |
| `src/ui/presets.ts`, `src/ui/catalog.ts`, `src/ui/names.ts` | Add the separate preset and stable localized list identities without altering the existing default list set or storing localized scenario names. |
| `src/ui/Compare.tsx`, `src/ui/App.tsx`, `src/ui/store.ts`, a focused reference component and `src/ui/styles.css` as needed | Expose the persistent reference and compact, explicit matching; preserve baseline actions, responsive layout and scenario-replacement safety. |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | All 40 list names, historical source, method, totals, matching, availability and error labels. |
| `tests/engine/historical2022.test.ts`, related schema / comparison tests | Independent 40-list source fixture, exact counts, threshold, Hamilton and historical-seat distinction, identities, no-mutation and serialization. |
| `tests/ui/`, `tests/e2e/historical2022.spec.ts`, `tests/build/`, `dist/elections.html` | Preset and reference, all locales, mapping and baseline independence, offline browser, accessibility, size and performance gates. |
| `doc/spec/elections-simulator.md`, `doc/backlog.md`, `.github/copilot-instructions.md`, `doc/work/archive/phase-3/` | Sync behavior and archive at close; record any project-brief contour edit. |

## Definition of Done

- [x] Tests written first and observed RED for the intended missing behavior.
- [x] All 40 source entries, the 13/27 subtotals, official totals, exact
  turnout, unknown compositions and separate official seats independently
  verified; the source-access limitation is visible in the documentation.
- [x] Exact threshold, Hamilton, tie, seat-sum, coalition, locale and JSON
  round-trip regressions pass without changing the existing method.
- [x] Automatic and explicit identity matching, renamed / split / unmatched
  lists, duplicate refusals, no-allocation and baseline independence pass.
- [x] Full unit, type, lint, formatting, offline size, performance and
  desktop/phone accessibility gates pass; documentation and deviations are
  recorded at close.
- [x] No electoral arithmetic is added to the UI and no network request is
  required at runtime.

## Open Questions

1. What source is usable when the official site refuses access? —
   **Recommendation:** use the independently accessible IDI table, retain
   each list separately, cite both the official source and the actual
   transcription source, and disclose the failed direct access.
2. How should the official and model ballot totals coexist? —
   **Recommendation:** keep the chosen 99.9% model validity, display the
   official counts as historical facts and explicitly label the difference.
3. How are list identities compared? —
   **Recommendation:** automatic matches require an unchanged established
   catalog identity; use an explicit reversible one-to-one choice otherwise.
   Never infer by name or turn missing data into zero.
4. Which seat figures should appear? —
   **Recommendation:** show both official Bader–Ofer historical seats and
   educational Hamilton seats with explicit labels; compare current model
   seats only against a clearly identified reference column.
5. Where should the reference live before the workspace redesign? —
   **Recommendation:** add it to the existing comparison view independently
   of the user's saved baseline; M7-03 will move or reuse it alongside
   coalition controls.

**Approval:** The autonomous request on 2026-10-31 was: “nachinai i approved,
vnosi polnosju vse izmenenija kak zaplanirovanno i 1 nachinai, 2 approved , i
zamoskaem kak ty hotel 1-memo M7-01”. The recommendations above are adopted
for this item.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | Split the planned historical comparison into the behavior-free `historicalReference.ts` stub, alongside the data/preset stub. | This keeps exact comparison and match contracts distinct from the existing saved-baseline comparison; no product behavior was implemented in the RED step. |
| /3-implement | Extended the existing UI engine-module allowlist and exact preset-ID fixture, and updated the Russian joint-list expectations in the catalog and questionnaire review tests. The non-catalog fallback test now uses another unknown ID. | The new pure historical modules, preset and catalog identities are intentional; the existing architectural guard and exact text assertions remain in force. Meretz is no longer an unknown ID. |
| /3-implement | Added focused store and browser checks for reversible matching and invalid-draft preservation after those behaviors had been implemented; they passed immediately. | These are supplementary checks for the approved contract, not fabricated RED evidence; the original new unit and browser suite had already failed in `/2-tests`. |
| /3-implement | Filed M7-11 for the stale party-mode group-turnout explanation and noted the remaining single-file size headroom in M7-03. | Both observations affect later work and are outside this memo; neither changes the current item's scope or relaxes the size gate. |
| /4-close | The existing `names.ts`, `compare.ts`, `rational.ts`, schema and unrelated schema tests did not need changes. | Existing catalog-based name resolution and exact arithmetic already support the separate reference module and preset without a schema change. |
