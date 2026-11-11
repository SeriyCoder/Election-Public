# Memo — M7-12 Integrated coalition and demographic panels

| Field | Value |
| --- | --- |
| item | M7-12 |
| epic | M7 |
| phase | Phase 3 — M7 party-first coalition simulation |
| status | closed |
| created | 2026-11-01 |
| closed | 2026-11-01 |

## Problem

The accepted independent coalition (revision 10) and demographic prototypes
have no shared authoritative scenario in the main app. Integrating their
behavior requires exact engine operations, explicit transient experiments,
bounded searches and arithmetic, and accessible translated controls, without
losing legacy calculations or exceeding the 460,800-byte offline budget.

## Scope

**In scope**

- Revisions 2–10 supersede earlier conflicting prototype decisions: no
  accept-baseline step, no shared turnout slider, no known-composition switch,
  no automatic redistribution while typing a composition, and no eligibility
  multiplier invented by the panel.
- Independent vote entries and 0.25-point sliders, vote locks, exact balance
  status and alignment; first supporter-turnout move freezes the eligible
  party/group cohorts. Each target changes only its party's raw share until
  alignment. Unbalanced/invalid inputs suspend charts and coalitions, with
  focus-only repair links; unknown compositions remain unknown.
- Free composition entries and cell locks, sum/locked/movable and signed
  redistribution reports; exact, bounded smoothing to a frozen reference
  population, row-only fallback naming unmatched groups, party-specific lock
  refusals, and reversible smoothing. Already settled inputs remain unchanged.
- Group pies (four per row, at most two compact rows), population/voter bars,
  signed reference gaps, largest gap, population/abstention bars with reference
  ticks, and live enlarged vote, turnout, composition and population panels.
- Zero to four adjustable coalition tiles, nearest compatible candidates,
  stable session labels, custom letter-labelled sets, favourites/filter,
  removal/add/nearest, and detailed seats, pivotal members, joiners and directed
  conflicts. Existing bounded coalition analysis remains available.
- Directed pair decisions and source-rule reset. Baseline group-turnout dialog
  with source values, explanatory 45–85% guide, preview, invalid-value refusal,
  explicit apply confirmation, cancel/Escape and source reset; applying resets
  experiments, changes assumptions rather than party votes/compositions/seats,
  and recomputes determinable turnout. During experiments it is read-only with
  an explicit experiment-reset action.
- Shared authoritative input immediately visible in Data and both panels;
  source replacement clears transient baselines, locks and coalition identity;
  ordinary external edits invalidate an experiment rather than silently using
  an obsolete baseline.
- Two future modes: demographic growth with four fixed memberships, and one
  coalition's supporter experiment with original today, changed today and
  changed future. All allocations include every competing party. Cohort
  turnouts, not averaged party turnout, persist into future years.
- Explicit expansion to integer years 0–50 and four followed coalitions;
  retain nonmonotone critical scans and unknown reasons. Population share
  chart across all years; integer playback at 1/2/5 years per second, stopping
  at 50 and pausing on edits, view changes and visibility loss. Enlarged views
  share the same state and live controls.
- All strings in ru/en/he, inert user text, offline/browser/accessibility and
  responsive-layout verification. Hide Composition navigation and order the
  three simulation tabs Coalitions, Demographic Future, Data.

**Out of scope**

- M7-13 questionnaire defaults, group-question consolidation, questionnaire
  growth/cooperation controls and toolbar/transfer redesign.
- Publication, networks, new scenario schema, persistent experiment storage,
  edits to either accepted standalone prototype and all git operations.

## Approach

Sections 5–7, 10–12 and 14.2–14.3 remain authoritative for legacy arithmetic.
New pure engine helpers prepare a frozen cohort basis, evaluate exact
supporter turnout, compute reference-population diagnostics and perform
locked composition smoothing. They reuse rational arithmetic, the existing
Hamilton/threshold pipeline and bounded flow techniques, never prototype
allocation or locale-dependent ordering. A common fine vote unit includes
the denominators of locked constraints; proportional starts are quantized
before exact residual completion. Explicit precision and operation limits
prevent repeated typing/locking from freezing the UI.

The store remains the sole editable input. Invalid intermediate panel edits
are stored as raw drafts and cannot masquerade as fresh results. Transient
cohort baselines, correction previews, labels, favourites and selections are
not serialized. Replacement resets these; input edits made outside the
experiment reset its baseline. Both the panel and future view use the same
source, while experiment comparisons retain an explicitly frozen original.
Legacy scenarios retain existing editing/projection semantics and conversion.

Candidate searches are bounded and report incompleteness rather than silently
claiming all coalitions were searched. Candidate identities are membership
sets, not rank positions. Existing comparison/history and no-allocation
disclosures remain reachable. Superseded presentation may be replaced to
recover size, but useful behavior and gates are not removed.

**Rejected alternative:** embedding the standalone scripts would duplicate
electoral arithmetic, unsafe HTML rendering and scenario state.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario | Existing exact vote/composition/turnout and refusal fields remain authoritative | None; version 5 |
| Projection bound | 20 becomes 50, preserving all imported legacy rates | None |
| UI state | Frozen cohorts/reference, editing locks, undo, correction preview, stable variants/custom/favourite tiles, future mode/playback | Not exported |
| Followed memberships | Maximum increases from three to four | Not exported |

## Interface Delta

Exact panel diagnostics/edits, locked smoothing with typed failure/fallback,
frozen cohort experiment and projected experiment helpers; bounded nearest
coalition candidates; store actions for transient experiment and tile state;
compact/enlarged panel controls and a confirmed turnout correction dialog.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched | Cohort population, turnout, vote contributions, year compounding, threshold, Hamilton allocation and candidate ordering |
| Where exact rationals are required | Every input, normalization, smoothing constraint/flow, vote, threshold, quota, remainder and compounding decision |
| Ordering / tie rules | Existing persisted tieBreakOrder then party ID; candidate ties use deterministic persisted order, never locale |
| Any display rounding near a decision? | None; fine-grid placement is an exact constrained vote distribution, with exact residual routing and no rounded threshold/seat decisions |
| Determinism proof | Repeated and JSON-round-trip results under ru/en/he; 0–20 agreement with existing engine, independent year-50 fixtures, exact threshold/tie boundaries, odd seat totals and generated seat-sum checks |

## Files

| Path | Change |
| --- | --- |
| src/engine/panel.ts | Raw panel edits, diagnostics, baseline corrections, locked smoothing and bounded exact results |
| src/engine/supporterTurnout.ts | Frozen cohorts and exact present/future experiment |
| src/engine/coalitionVariants.ts | Bounded deterministic nearest compatible sets |
| src/engine/schema.ts | Explicit 50-year horizon |
| src/ui/store.ts | Authoritative input and transient lifecycle/actions |
| src/ui/coalitionChoice.ts | Four followed sets |
| src/ui/CoalitionWorkspace.tsx | Integrated compact/enlarged panel |
| src/ui/PanelControls.tsx | Shared exact controls, modal and correction presentation |
| src/ui/CoalitionTiles.tsx | Stable/custom/favourite tiles and relationship editor |
| src/ui/Future.tsx, src/ui/FutureVisuals.tsx | Two modes, population chart and three comparisons |
| src/ui/FutureWorkspace.tsx | Shared experiment and playback controls |
| src/ui/App.tsx | Panel wiring and three ordered tabs |
| src/ui/coalition.worker.ts, src/ui/coalitionRunner.ts | Bounded candidate search protocol if required |
| src/ui/styles.css | Compact and expanded layout, sliders, grids and mobile fit |
| src/i18n/ru.ts, src/i18n/en.ts, src/i18n/he.ts | All panel text and changed limits |
| tests/engine/panel.test.ts, tests/engine/supporterTurnout.test.ts, tests/engine/coalitionVariants.test.ts | Exact operations, degenerate/precision/ordering/property regressions |
| tests/ui/panel.test.tsx, tests/ui/futureWorkspace.test.tsx | Shared-state lifecycle, availability and translated SSR |
| tests/e2e/panel.spec.ts, tests/e2e/futureWorkspace.spec.ts | Offline interaction, layout, playback, focus, keyboard and accessibility |
| Existing horizon/follow-limit/nav assertions in tests/engine, tests/ui, tests/e2e | Honest RED updates for the explicit 50/four/three-tab contract |
| build/compactLocales.ts, tests/build/compactLocales.test.ts, vite.config.ts | Only if measured safe lossless size optimization is needed; unchanged byte gate |
| doc/spec/elections-simulator.md, doc/backlog.md | Delivered contract and completion evidence at close |
| doc/work/active/M7-12-memo.md, doc/work/active/M7-12-test-plan.md, doc/work/STATUS.md | Each separate workflow stage and gate evidence |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Full unit/build, type, lint and browser gates green, independently rerun at close
- [x] Exact smoothing repetition/lock regression bounded
- [x] No electoral arithmetic outside src/engine/
- [x] Accepted behavior matrix covered, including unavailable and legacy paths
- [x] Offline HTML at most 460,800 bytes; no relaxed gate
- [x] Spec synced; project-map changes, if necessary, recorded as contour changes
- [x] Deviations recorded

## Open Questions

1. What happens after a shared-source edit? — **Recommendation:** reset the
   experiment explicitly; preserve membership identities unless parties were
   deleted, and clear all transient identities on scenario replacement.
2. How is an impossible population match handled? — **Recommendation:** keep
   locked cells unchanged, normalize rows if possible and show a named
   unmatched-group fallback; refuse impossible row locks atomically.
3. What happens if integration cannot meet the existing offline budget?
   — **Recommendation:** optimize only losslessly and preserve useful behavior;
   record a genuine blocked gate rather than raise the limit or tick partial
   scope.

## Approval

The user explicitly authorized autonomous execution on 2026-11-01:
"approved to you and by your own to execute all phases and substesp of EPIC 7,
do not stop to ask me". This approves these recommendations and the normal
ordered steps, not skipping gates or expanding limits. Approval is recorded
before the RED step.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | Corrected the correction-invariant test to compare allocated party seats, not allocation-stage absolute ballot totals | Changing derived overall turnout changes absolute ballots for a fixed population; vote shares, compositions and every seat remain unchanged as the relative prototype requires |
| /3-implement | Updated the existing API allowlist, legacy 21-year fixture slice and remaining navigation assertions | The approved new engine APIs are still pure; the old fixture remains asserted in full for its original 21 years, while the scan length is separately asserted as 51 |
| /3-implement | Updated browser navigation to the contextual composition report and opened the advanced disclosure explicitly in old linked-workspace tests | Composition is no longer a main tab; legacy linked controls remain accessible but are not the accepted compact panel's primary controls |
| /3-implement | Replaced build-only word substitution with DEFLATE-compressed translation values decoded by the browser's standard DecompressionStream API | Measured integration was 500,661 bytes; lossless transformed-table tests and unchanged offline gate pass at 437,420 bytes, with no executable decoding, network, extra output file or increased budget; requires a browser supporting Compression Streams (verified in installed Edge) |
| /3-implement | Corrected new browser fixtures to open Coalitions after the existing helper deliberately opens Data; scoped reset to the active dialog and asserted competitor identity using a data marker | These fix test setup/strict-locator assumptions without changing the required user interactions |
| /3-implement | Added package.json/package-lock.json, FutureChooser.tsx, futureScanRunner.ts and the existing browser helpers/book checks to the file list | A real missing node:zlib type dependency required @types/node; stable labels and effective experiment projections must reach the existing chooser/scan; old controls are explicitly opened rather than dropping their assertions |
| /3-implement | Reused FutureVisuals.tsx, coalition.worker.ts, vite.config.ts and the existing build tests without editing them; consolidated new SSR checks in panel.test.tsx rather than a separate futureWorkspace.test.tsx | Existing worker routing, visual reports, build wiring and exact decoded-table tests already cover these paths |
| /3-implement | The integrated two-column deck occupies the full coalition region, with the old analysis below; its editor is no longer sticky over that analysis | Preserves readable paired panels and phones. RTL placement checks now compare the actual vote controls and population results; all overlap and accessibility gates remain unchanged |
| /3-implement | Alignment and other authored source edits end/rebase a frozen experiment with an explicit notice; saved linked assumptions are suspended, not deleted | A locked alignment can differ from an experiment's proportional normalization. Silently retaining that old basis would make Future disagree with Data. Imported restrictions survive and require explicit rebuild before reuse |
| /3-implement | Source reference uses saved linked populations, explicit group populations, or the determinable original party-source population in that order | Party-mode files may omit redundant population shares. Unknown sources remain unavailable; no equal-population fallback is introduced |
| /3-implement | Population timeline compounds known baseline group populations directly; experiment snapshots are computed only in experiment mode | The existing near-denominator-budget browser gate exposed unnecessary 51-year seat recomputation. Display percentages now round arbitrary derived rationals rather than applying input-denominator limits to them |
| /4-close | Synced the existing project brief as a separate CONTOUR-23 map change | Its former 20-year/three-coalition and locale-packing descriptions had become false; the next audit must verify this map update |

## Implementation Evidence

The final implementation run passed 2,963 Vitest tests in 57 files, typecheck,
lint, changed-file formatting, and 346 offline Edge checks (40 pre-existing
conditional skips). The single HTML is 451,354 bytes. Intermediate failures
included the unchanged size gate, old disclosure/navigation selectors,
sticky-region overlap, colour contrast and the near-denominator-budget future
check; each was repaired before this GREEN record.

The population/correction reports include source gaps, abstention and the
largest mismatch; smoothing undo restores compositions only. Invalid field
text survives enlargement/navigation. Deleting parties prunes custom tiles;
source replacement clears identities. Candidate enumeration remains explicitly
bounded (20 eligible parties, 250,000 visits, 200 listed variants), with an
incomplete/capped notice rather than a claim of exhaustive results.

## Resolved Close Gate Blocker

The independent close rerun measured a 256.5 ms main-thread stall during the
20-group/30-party future range scan (200 ms limit). Unit/types/lint/format
passed, and 345 browser checks passed with one failure and 40 conditional
skips. The item was correctly blocked. The scan subscription now belongs to
the critical-results component instead of rerendering the entire app for every
worker progress message. All 51 exact progress samples and existing assertions
are retained. Five focused responsiveness repetitions and the complete resumed
implementation gates pass: 2,963 Vitest tests, 346 browser passes, 40 skips,
types/lint/format, and 451,400-byte HTML. The second independent close reran
all gates and passed with the same counts and size. Specification 10,
14.2–14.3.1, the backlog and project map are synchronized. M7-13 and the
subsequent audit are explicitly outside this completed item.
