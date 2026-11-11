# Memo — M7-01 Exact party-first engine and versioned scenario

| Field | Value |
| --- | --- |
| item | M7-01 |
| epic | M7 |
| phase | Phase 3 — M7 party-first coalition simulation |
| status | closed |
| created | 2026-10-30 |
| closed | 2026-10-31 |

## Problem

The questionnaire asks for party vote shares, but its build converts them to
group inputs rounded to four decimal places and then calculates the party
results again. The [audit](../../audits/2026-10-30-audit.md) proves that a party
entered at the 3.25% threshold can fall below it and lose four seats. The new
party-control requirements also need coalition results without demographic
inputs. Party shares must therefore become exact authoritative inputs without
changing the results of existing group-first scenarios.

## Scope

**In scope**

- Add a versioned party-first scenario mode, exact party shares and overall
  turnout, and an explicit unknown party composition. A party-first baseline
  calculates votes, threshold, seats and coalitions without any groups.
- Correct both the questionnaire build and skip paths so the entered party
  shares, not rounded derived group rows, determine year-zero seats. Keep the
  current questionnaire order, including group turnout before party shares.
- Continue to import and calculate versions 1–3 as group-first scenarios.
  Preserve their existing validation tolerance, participation factors,
  group-specific valid-ballot rates, preferences, tie order, directed refusals
  and results. Exports use the new version without discarding those inputs.
- Preserve the existing editor and result views where their meaning remains
  valid; explicitly guard controls, demographic reports and projections that
  cannot truthfully operate on party-first inputs yet.
- Keep party and block identities, coalition rules, import/export, comparison,
  worker and main-thread paths consistent in both modes. Keep all interface
  messages complete in Russian, English and Hebrew.

**Out of scope**

- Automatic proportional redistribution, locks and the exact edited-value
  policy for party shares: [M7-02](../../../backlog.md).
- The party slider, inline baseline deltas, overall-turnout control and compact
  coalition panel: [M7-03](../../../backlog.md).
- A composition editor, an unknown-composition control and independently
  sourced population-reference comparison: [M7-04](../../../backlog.md).
- The separate group-turnout experiment: [M7-05](../../../backlog.md).
- The 40-list historical 2022 preset and its provenance: [M7-06](../../../backlog.md).
  This item only ensures that exact historical ratios can be represented.
- Making questionnaire composition optional and revising the full questionnaire
  flow: [M7-07](../../../backlog.md). Existing required composition pages remain.
- The complete political-copy and Hamilton wording review:
  [M7-08](../../../backlog.md).

## Approach

Sections 3, 4, 6, 11, 14.2 and 14.5 of the
[specification](../../../spec/elections-simulator.md) describe today's group-first
model. Introduce a separate party-first mode rather than changing the meaning
of those existing inputs. Schema version 4 identifies the mode explicitly.
Versions 1–3 migrate to the group mode; validation and the group vote pipeline
retain their current semantics, including the sum tolerance. A version 4
scenario must identify its mode, so a missing discriminator cannot silently
choose a calculation.

In party mode, each party's share is its fraction of **all** valid votes,
including votes for parties that fail the threshold and parties that cannot
join a government. Shares sum exactly to one. Overall turnout and the common
valid-ballot rate produce total cast and valid ballots from the eligible-voter
total; each party receives that exact valid-ballot total multiplied by its
stored share. The simplified party mode assumes all eligible voters are
available; it does not invent a separate participation factor. The standard
rate for new party-mode scenarios is 99.9%. Threshold, Hamilton allocation,
tie handling and coalition compatibility then use the existing engine stages.

Each party may have a complete composition over known group IDs or an
explicitly unknown composition. A complete row sums exactly to one. Known
group contributions are the party's exact votes multiplied by the row's
shares. An unknown portion remains unknown; it is not a fabricated group,
population, growth rate or support pattern. Aggregate reports include that
unknown portion in the total denominator rather than renormalizing known
groups to 100%. A group contribution describes valid voters, not the
population. Potential-supporter and population figures are shown only when
their required assumptions can actually be derived. A user-selected group
named «Другие / не классифицированы» remains an ordinary group; it is not the
same thing as a party's unknown composition.

The questionnaire already has complete compositions. Its build retains the
entered exact shares and compositions and, where those inputs determine it,
derives its initial overall turnout from the group turnouts and voter mix
using exact engine arithmetic. If turnout is underdetermined, such as when a
zero-turnout group has no known voters, use the questionnaire's 70% example
as an explicitly listed overall-turnout assumption, not as an inferred fact.
Keep group population unknown and explain when the missing information
prevents a future projection. The existing check can display rounded derived
figures, but those figures are not written back as decision inputs. Existing
filled-answer and confirmation behavior is preserved; an impossible or
unrepresentable resolved build produces an explicit issue rather than a silent
substitute. Group-turnout questions remain before party shares, as the user
requested.

Overall turnout is independent after the initial questionnaire build. Editing
a group turnout is demographic metadata in party mode and does not change
baseline party shares, seats or overall turnout. Where group assumptions imply
a different overall turnout or cannot establish a group population, explain
the mismatch or lack of information rather than changing party shares or
blocking the baseline. A zero-turnout group with no known voters does not by
itself prove that the group has zero population.

For year zero, compute the baseline even when compositions are unknown. For a
later year, use all parties' exact base contributions and the group growth and
turnout assumptions only when they are sufficient and mutually consistent.
If a positive-share party has unknown composition, a needed group baseline is
undefined, or a full projection cannot be justified, return a typed
unavailable reason and show it on the future view. Never omit those votes and
reallocate all seats among the remaining parties. Year zero remains
available. A complete, consistent questionnaire scenario must still support
the existing demographic future; the result is an educational projection, not
an inference from group names.

Keep the current interface usable in group mode. In party mode, retain
non-conflicting edits such as names, colors, seat count, threshold and
coalition rules. Group turnout and growth inputs describe demographic
assumptions, with a clear explanation of their effect. Until M7-02 through
M7-04 provide their replacements, disable group-first preference,
participation and cohort controls that would misleadingly imply a change to
party shares. Adding a zero-share party or deleting a zero-share party may
proceed if all references remain valid; a positive-share deletion or a group
deletion that would invalidate a known composition must be refused with an
explanation, not silently rebalance, discard composition or corrupt references.
The same guards apply to store and engine edit entry points, not only buttons.

**Rejected alternative:** convert party shares into rounded group inputs and
calculate them back, because this already changes a threshold decision and
cannot preserve arbitrary exact proportional or historical shares.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario | Add `inputMode`, with `groups` and `parties` variants. Keep IDs, names, notes, blocks and coalition rules. | Version 4; versions 1–3 migrate to `groups`; a version 4 input requires a recognized mode. |
| Group-mode rules, groups and parties | Keep the current fields, validation and calculation, including the existing 1e-9 sum tolerance. | No reinterpretation or rounding on migration; valid old scenarios retain their results and references. |
| Party-mode rules | Keep eligible-voter total, seat count, majority and threshold; add exact overall turnout and one common decimal-string valid-ballot rate. | New party-mode inputs; new scenarios use the existing 99.9% standard. Zero turnout and zero validity are valid inputs with no valid votes. |
| Party-mode party | Add exact `voteShare` and `composition`, either a group-ID-to-exact-share map or `null` for unknown. | Exact total one for party shares and for each known composition; unknown is distinct from an empty or zero-valued known row. |
| Party-mode group | Keep identity, name, notes, turnout, growth and turnout change as demographic assumptions. No group or group preference is required for baseline calculation. | Group-only vote weights, availability and validity are not authoritative in this mode. Unknown population is not serialized as zero. |
| Exact fractions | Serialize a fraction as decimal digit strings for its numerator and positive denominator, reduced by GCD; zero has denominator one. The validated output is canonical. | A decimal user input converts exactly; finite decimal strings alone cannot store every historical or redistributed ratio. No JavaScript number is accepted for an exact fraction. |
| Validation and resource limits | Check digit-string syntax and lengths before BigInt conversion, positive nonzero denominator, [0, 1] ranges, exact totals, existing IDs and references. Retain the 2 MiB file and entity limits. | Recommend at most 256 digits per numerator or denominator and a 2,048-digit aggregate budget for distinct input denominators in party mode, subject to the responsiveness tests below. Reject excess with a path and a localized issue; never round to fit. Apply no new bound retroactively to valid legacy group scenarios. |
| Result and projection state | Distinguish known amounts, unknown demographic amounts, no votes, and a projection unavailable for a stated reason. | No change to group-mode result semantics; party-mode group rows are not filled with invented zero population. |

The denominator budget is a safety bound, not an arithmetic approximation.
Validation and later exact operations must be bounded before expensive work;
the accepted limits must support the questionnaire's eight groups and ten
parties, ordinary decimal inputs, and the 40 separate historical lists. Test
the bounds against the browser responsiveness budget, and tighten them before
release if necessary. If a valid baseline cannot support a requested
projection within the bound, keep the baseline and report that projection as
unavailable. The implementation and closing documentation record the final
limits. The implementation adopts 256 digits per fraction component and
2,048 total digits across distinct party-mode denominators; schema tests cover
both component and aggregate rejection, and the full browser performance suite
passes within its budget.

## Interface Delta

- `validateScenario`, scenario serialization and JSON import/export accept
  both modes and retain the mode and exact inputs across round trips.
  Malformed or oversized party-mode data returns normal validation issues;
  it never falls back to group mode.
- `computeVotes`, `runSeats` and `runScenario` use exact party shares in party
  mode and the existing group calculation in group mode. A later-year request
  that cannot include every relevant party has an explicit, typed unavailable
  outcome that every caller handles; it is not a successful empty allocation.
- The result, composition, comparison and future interfaces distinguish a
  genuinely zero quantity from an unknown one. Mixed known and unknown party
  composition is reported against the complete target total.
- The questionnaire builds the new mode without changing its page order or
  required questions in this item. Both the explicit build and skip paths use
  the same exact authoritative inputs.
- Editor and store guards, group-page labels, deletion/reference repair,
  preset construction, result rendering, worker messages and main-thread
  fallback handle the new mode. Existing group-mode controls keep their
  behavior.
- Fractional values that have no finite decimal representation may be rounded
  for display, but displaying or opening a field must not write that rounded
  text back into the scenario. Future exact editing is M7-03.
- New notices and validation messages are added to all three language tables.
  They explain disabled edits and missing or inconsistent demographic inputs
  without claiming that a seat majority guarantees a political coalition.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | Party-mode votes now come directly from exact valid ballots and party shares. Existing threshold, Hamilton quota, remainder, tie and coalition stages consume those votes. Legacy group-mode arithmetic stays unchanged. |
| Where exact rationals are required | Party shares, their exact sum, overall turnout, valid ballots, known group contributions, threshold comparisons, quotas, remainders and projected inputs. The denominator for the threshold includes every party's valid votes, even below the threshold. |
| Ordering / tie rules relied on | Keep persisted `tieBreakOrder`, then party ID by UTF-16 code unit. Array order, group labels and locale do not resolve seat ties. Coalition compatibility and directed refusals remain separate from share calculation. |
| Any display rounding near a decision? | None. The questionnaire's four-decimal group display and all other rounded reports are output only; no rounded value is fed back into a vote, threshold, seat or coalition decision. |
| How determinism across runs, round trip and locale is proven | Compare exact result serialization for repeated runs, version 4 export/import, migrated versions 1–3 and all three locales; include exact threshold and remainder boundaries, saved tie order, seeded generated scenarios and seat-sum checks. |

For the audited regression, two parties enter 3.25% and 96.75%, the threshold
is 3.25%, both group turnouts are 70%, and their compositions are 1% / 99%
and 5% / 95%. The current rounded conversion produces 3.24998924% for the
first party and seats 0 / 120. The corrected questionnaire must retain the
entered 3.25% exactly, qualify that party and allocate **4 / 116** seats.

Changing known or unknown composition cannot change baseline votes or seats.
Changing overall turnout preserves shares, qualification and seats only while
both turnout and validity leave a positive valid-vote total. At zero turnout or
zero valid-ballot rate, shares of cast valid votes are undefined and the
existing `no-valid-votes` result applies; no seats or coalition are fabricated.
All electoral arithmetic remains in `src/engine/`.

## Files

The table lists the expected implementation, test and closing surfaces. A
listed file that proves unchanged is recorded as a deviation rather than
modified just to match the list.

| Path | Expected change or explicit compatibility verification |
| --- | --- |
| `doc/work/active/M7-01-memo.md`, `doc/work/active/M7-01-test-plan.md`, `doc/work/STATUS.md` | Memo, red/green plan and each step's status and log entry. |
| `doc/work/archive/phase-3/M7-01-memo.md`, `doc/work/archive/phase-3/M7-01-test-plan.md` | Archive the closed artifacts at `/4-close`. |
| `doc/backlog.md`, `doc/spec/elections-simulator.md`, `.github/copilot-instructions.md` | Close M7-01 and sync the specification and project brief at `/4-close`; record any contour edit under its required process. |
| `src/engine/schema.ts`, `src/engine/rational.ts`, `src/engine/numeric.ts` | Versioned discriminated schema, bounded exact serialization and exact conversion/format helpers. |
| `src/engine/votes.ts`, `src/engine/electorate.ts`, `src/engine/run.ts` | Party-first baseline, exact questionnaire derivation and explicit projection availability. |
| `src/engine/composition.ts`, `src/engine/report.ts`, `src/engine/compare.ts`, `src/engine/future.ts` | Known/unknown demographic results and compatible reports. |
| `src/engine/edit.ts`, `src/engine/threshold.ts`, `src/engine/allocate.ts`, `src/engine/coalitions.ts` | Mode-aware edits and references; verify the existing decision and coalition algorithms remain unchanged. |
| `src/ui/book.ts`, `src/ui/BookView.tsx`, `src/ui/presets.ts`, `src/ui/names.ts` | Exact questionnaire build, check/issue presentation and valid group-mode presets and display names. |
| `src/ui/store.ts`, `src/ui/App.tsx`, `src/ui/Editor.tsx`, `src/ui/editorPages.ts`, `src/ui/PercentField.tsx` | Mode-aware actions, safe controls, references, projection state and field display. |
| `src/ui/Results.tsx`, `src/ui/Composition.tsx`, `src/ui/Future.tsx`, `src/ui/Compare.tsx`, `src/ui/Coalitions.tsx` | Show accurate results and explicit unavailable or unknown states. |
| `src/ui/coalitionRunner.ts`, `src/ui/coalition.worker.ts`, `src/ui/fileTransfer.ts`, `src/ui/Transfer.tsx`, `src/ui/styles.css` | Worker/fallback and import/export compatibility; minimal styling for any required notices. |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Matching notices and validation keys in all languages. |
| `tests/engine/helpers/scenarios.ts`, `tests/engine/partyMode.test.ts` | Mode-aware fixtures and focused exact party-mode regressions. |
| `tests/engine/schema.test.ts`, `tests/engine/rational.test.ts`, `tests/engine/numeric.test.ts`, `tests/engine/votes.test.ts`, `tests/engine/electorate.test.ts`, `tests/engine/run.test.ts`, `tests/engine/fixtures.test.ts` | Exact inputs, migration, audited threshold fixture, limits, round trips and determinism. |
| `tests/engine/edit.test.ts`, `tests/engine/composition.test.ts`, `tests/engine/projection.test.ts`, `tests/engine/future.test.ts`, `tests/engine/report.test.ts`, `tests/engine/compare.test.ts`, `tests/engine/validity.test.ts` | Safe edits, unknown amounts, projections, reports and validity in both modes. |
| `tests/engine/threshold.test.ts`, `tests/engine/allocate.test.ts`, `tests/engine/coalitions.test.ts` | Verify exact boundary, tie, allocation and coalition invariants for the new inputs. |
| `tests/ui/book.test.ts`, `tests/ui/bookView.test.tsx`, `tests/ui/store.test.ts`, `tests/ui/editor.test.tsx`, `tests/ui/editorPages.test.ts`, `tests/ui/app.test.tsx` | Questionnaire build/skip, guarded edits, migration and shell behavior. |
| `tests/ui/views.test.tsx`, `tests/ui/results.test.tsx`, `tests/ui/futureCoalitions.test.tsx`, `tests/ui/compare.test.tsx`, `tests/ui/coalitions.test.tsx` | Results, unknown composition and unavailable future, including followed coalitions. |
| `tests/ui/coalitionRunner.test.ts`, `tests/ui/transfer.test.tsx`, `tests/ui/fileTransfer.test.ts`, `tests/ui/names.test.ts`, `tests/ui/catalog.test.ts`, `tests/ui/i18n.test.ts` | Worker/fallback, import/export, naming, presets and translation parity. |
| `tests/e2e/helpers.ts`, `tests/e2e/book.spec.ts`, `tests/e2e/interaction.spec.ts`, `tests/e2e/editorPages.spec.ts`, `tests/e2e/future.spec.ts`, `tests/e2e/israel.spec.ts` | Real questionnaire, editor and future behavior on desktop and phone. |
| `tests/e2e/offline.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/performance.spec.ts`, `tests/build/offline.test.ts`, `dist/elections.html` | Offline build, accessibility, responsiveness and existing size budget. |

## Definition of Done

- [x] Write the test plan and real failing tests first; observe the audited
  questionnaire threshold regression fail for the intended reason.
- [x] Cover exact threshold below / equal / above, remainder ties, persisted
  tie order, integer seat sums, seeded generated scenarios and determinism
  across repeats, JSON round trips and `ru` / `en` / `he`.
- [x] Verify non-terminating ratios, canonical serialization, malformed and
  oversized inputs, exact party/composition totals, unknown composition and
  limits; reject rather than silently round or silently change modes.
- [x] Verify legacy versions 1–3, their nonstandard validity, participation,
  tolerances, directed refusals and future results against unchanged exact
  fixtures. Preserve their group-first editor and export/import behavior.
- [x] Verify positive overall-turnout invariance, zero turnout and zero
  validity, single and zero-vote parties, below-threshold votes, and no
  allocation or feasible coalition.
- [x] Verify both questionnaire exit paths retain entered shares; test
  complete and partially unknown compositions, mixed blocks, inconsistent or
  underdetermined demographics, year zero, and unavailable later projections.
  No positive-share party disappears from a future allocation.
- [x] Verify party/group deletion and other unavailable edits are explicitly
  guarded, while names, rules, coalitions, group-mode actions, worker and
  fallback paths still work.
- [x] Run `npm test`, `npm run typecheck`, `npm run lint`,
  `npx prettier --check` for changed TypeScript files and `npm run test:e2e`;
  include offline, desktop, phone, accessibility, size and 200 ms
  responsiveness checks. Exercise the standard 20-group / 30-party / 10-block
  case and the accepted party-mode limits, including the 40-list input shape.
- [x] Sync the specification and project brief at close, and record
  deviations. The project remains offline and user names and notes stay inert.

## Audit Findings Resolved Before Close

The [2026-10-31 audit](../../audits/2026-10-31-audit.md) reproduced three
in-scope gaps not covered by the then-green suite:

- Adding or duplicating a group leaves an existing known party composition
  without the new group key, so validation rejects the scenario. The repair
  must add a zero share without changing existing shares or seats and must
  preserve unknown compositions as unknown.
- The party-mode editor hides the colour control, although this memo retains
  colour editing.
- A successful party-mode projection with known group population returns
  missing group population values in the future report.

Focused regressions were observed failing, the close gate recorded the failed
suite, and `/3-implement` fixed all three gaps. Group population reports
reuse the exact assumptions of the existing projection; unknown populations
remain distinct from known zero or positive values. The test plan records the
new green gates rather than relying on the earlier green run.

## Close-Check Regression

A 40-list scenario with 2,021 digits across distinct input denominators is
accepted and normalized, but some fractions reduce to different denominators.
The normalized result exceeds the 2,048-digit budget, so validating it again
fails: the browser accepts the import and then hides results as invalid. This
violates the already-approved canonical validation and round-trip contract.

The regression covers party shares, compositions and overall turnout. The
repair retains the raw safety check before arithmetic and applies the same
budget to the canonical values before returning success. An over-budget
canonical result is refused with a normal path-specific issue, so an import
retains the previous scenario. Inputs whose canonical form is within the
limit, including exactly 2,048 digits, validate and round-trip; 2,049
digits are rejected.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | Updated legacy questionnaire test expectations from complete group-first scenario equality to the approved version 4 party-first result contract. | The previous comparisons encoded the old conversion path and contradicted this memo; exact shares, compositions, votes, seats, migration compatibility and locale independence remain asserted. |
| /2-tests | Moved the new performance test group out of an existing test after Playwright discovered no matching performance cases. | Playwright requires tests to be registered at suite definition time; the coverage and 200 ms assertions were not weakened. |
| /4-close | The listed threshold, allocation and coalition decision modules were verified without changing their algorithms. | Existing exact decision behavior was retained and exercised by the full suite rather than modified to match the file list. |

## Open Questions

1. How should exact non-terminating shares be stored and bounded? —
   **Recommendation:** use canonical numerator/denominator digit strings,
   initially bounded to 256 digits per integer and 2,048 aggregate distinct
   denominator digits in party mode; verify realistic and worst-case
   responsiveness before finalizing the limits. Never approximate to fit.
2. How do independent overall and group turnouts coexist? —
   **Recommendation:** derive the initial overall turnout exactly when
   possible; otherwise explicitly list the 70% example as an assumption.
   Keep overall turnout independent afterwards. Report demographic
   inconsistencies or insufficient information without changing the baseline
   shares or blocking seats.
3. What should happen when a future projection lacks necessary demographic
   data? — **Recommendation:** keep year-zero results available, but show an
   explicit reason instead of a partial later-year allocation. This applies
   to any positive-share party with unknown composition and to other
   underdetermined or inconsistent required inputs.
4. What should existing group-first editor actions do for a questionnaire
   scenario before the new editor exists? — **Recommendation:** preserve
   compatible edits, explain and disable misleading controls, allow only safe
   zero-share add/delete operations, and refuse destructive deletions that
   cannot preserve exact shares or composition. Restore the full party and
   composition editing workflows in M7-02 through M7-04.
5. Does turnout invariance include zero turnout? — **Recommendation:** no.
   Preserve seats for changes with a positive valid-vote total; report
   `no-valid-votes` and allocate no seats when turnout or the valid rate is
   zero.

**Approval:** The user approved all five recommendations with “approved” on
2026-10-30. These decisions govern the test and implementation steps.
