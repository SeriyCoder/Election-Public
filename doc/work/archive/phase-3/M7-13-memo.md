# Memo — M7-13 Compact questionnaire and integrated navigation

| Field | Value |
| --- | --- |
| item | M7-13 |
| epic | M7 |
| phase | Phase 3 — M7 party-first coalition simulation |
| status | closed |
| created | 2026-11-01 |
| closed | 2026-11-02 |

## Approval

The user approved on 2026-11-01: "approved to you and by your own to execute
all phases and substesp of EPIC 7, do not stop to ask me". This approves the
recommendations below, not bypassing RED, independent closing gates, or the
unchanged offline size and responsiveness limits.

## Problem

M7-12 integrated the coalition and future panels, but its accepted questionnaire
and toolbar requirements remain outstanding: long individual group questions,
obsolete preliminary choices, and prominent preset loading conflict with the
compact party-first workflow. Section 14.5 and the M7-12/M7-13 backlog contract
must agree with the resulting interface without inventing demographic data.

## Scope

**In scope**

- Basic (Israel), own groups, no groups, in that order; Basic selected initially.
- Simultaneous turnout controls and simultaneous zero-initialized growth controls;
  six default groups on desktop, accessible larger sets and phones.
- Distribution first/default, unknown second, four fictional-party explanation;
  individual compositions stay unknown until explicitly chosen and confirmed.
- No overall-turnout, future-turnout-change, growth yes/no, or cooperation
  yes/no question. Exact derivable turnout wins; otherwise disclose 70% fallback.
- Growth sliders −5 to +5, step 0.25, exact fields; existing engine soft unusual
  warnings strictly outside −0.5 to +2.5. No aggregate is displayed because an
  aggregate without a known population would manufacture certainty.
- Shared selected-party directed pair-end editor, default willing, preserving
  both ends independently. Imported data are never rebuilt through a questionnaire
  merely because fields are hidden.
- Exactly Coalitions, Demographic Future, Data tabs (already established by
  M7-12), no synchronization copies, prominent Questionnaire, no preset selector
  or Load example, localized Export Set Up and Import Set Up.
- All locales, inert names, offline file, RTL, fit, exactness and responsiveness.

**Out of scope**

- New electoral formulas, import schema versions, forecasting or demographic law.
- Reworking M7-12 smoothing, scan progress isolation, experiments or tile search.
- Audit and unrelated backlog work; the parent runs the final audit.

## Approach

Replace group-by-group navigation with compact overview pages in the language-free
book model; retain legacy indexed draft helpers where practical so historical
model tests can still express individual edits. Resolve and confirm overview
answers atomically. Keep per-party explicit known/unknown confirmation. Build
through existing exact engine conversion and deriveOverallTurnout; zero fresh
turnout change and fallback turnout are assumptions, not overwritten imports.
Extract the existing visual relationship renderer for reuse with questionnaire
drafts and the live authoritative store. Reuse unusualGrowth from panel.ts and
numeric conversions; the UI decides no electoral arithmetic.

Test fixtures formerly loaded through the hidden preset toolbar will instead
use validated import, preserving their actual behavioral assertions. Old tests
for visible removed questions/defaults will be amended to the new contract,
not deleted or skipped. The legacy preset store API remains covered directly.

**Rejected alternative:** Synchronizing per-tab copies or pre-populating known
compositions would lose edits or falsely imply demographic evidence.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Questionnaire draft | Compact overview navigation and explicit directed choices | None; transient |
| Fresh scenario | Derived turnout or disclosed 70%; zero annual turnout change | None |
| Imported scenario | No field mutation due to navigation or hidden questions | None |

## Interface Delta

Compact group overview inputs and shared visual relationship editing replace
superseded questions. Preset APIs and Composition detail APIs remain available;
only visible entry points change. Transfer remains validated scenario JSON.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched | Questionnaire feeds exact votes, growth and directed coalition rules; allocation algorithm unchanged |
| Where exact rationals are required | Percent conversion, overall-turnout derivation, growth warning boundaries, imported values |
| Ordering / tie rules relied on | Existing stable party IDs, tieBreakOrder then ID, unchanged Hamilton |
| Any display rounding near a decision? | None; exact fields feed existing engine functions; slider presentation does not clamp imports |
| How determinism is proven | Generated questionnaire allocations including odd seats, threshold/tie fixtures, repeated and JSON-roundtrip results in ru/en/he; existing engine suite retained |

## Files

| Path | Change |
| --- | --- |
| src/ui/book.ts | Compact page model, confirmation/build, defaults and derived turnout |
| src/ui/BookView.tsx | Group overview, fictional explanation, review and relationship editor |
| src/ui/DirectedRelations.tsx | Reusable visual pair ends |
| src/ui/PanelControls.tsx | Reuse relationship renderer without arithmetic changes |
| src/ui/App.tsx | Prominent questionnaire and hidden preset toolbar |
| src/ui/styles.css | Compact accessible responsive layout |
| src/i18n/ru.ts, en.ts, he.ts | Consistent new copy and transfer labels |
| tests/ui/compactBook.test.tsx | New model, rendering, state and exactness regressions |
| tests/ui/book.test.ts, bookView.test.tsx, editor.test.tsx, coalitionWorkspace.test.tsx, store.test.ts | Honest amendments to superseded visible/default expectations where needed |
| tests/e2e/compactBook.spec.ts | New offline compact flow, boundaries, directed edits, fit and a11y |
| tests/e2e/helpers.ts | Validated fixture import and new questionnaire navigation |
| tests/e2e/book.spec.ts, bookFit.spec.ts | Compact questionnaire walk and fit |
| tests/e2e/offline.spec.ts, interaction.spec.ts, israel.spec.ts, historical2022.spec.ts, coalitionWorkspace.spec.ts | Preserve fixture assertions without preset toolbar |
| doc/spec/elections-simulator.md, doc/backlog.md | Final behavior and completion |
| doc/work/STATUS.md, active M7-13 memo and test plan, archive/phase-3 | Separate step evidence and lifecycle |
| dist/elections.html | Rebuilt offline deliverable |

The project brief already maps the same files and shared scenario; no contour
edit is planned. Any necessary additional file is recorded as a deviation first.

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Full tests, type check, lint, formatting and offline browser suite green
- [x] Independent close reruns green; HTML at most 460800 bytes, 200 ms responsiveness
- [x] No electoral arithmetic outside src/engine/
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. How to represent unknown default compositions? **Recommendation:** Keep the
   explicit per-party unknown/known choice; selecting distribution alone creates
   no known rows.
2. Display aggregate growth? **Recommendation:** Do not display one in the
   questionnaire; unknown population prevents an honest weighted aggregate.
3. Keep legacy functionality? **Recommendation:** Preserve preset/store and
   Composition APIs, validate imports unchanged, hide only requested navigation.

All recommendations approved by the autonomous request quoted above.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /1-memo | Memo recorded approved immediately | Explicit dated autonomous approval |
| /3-implement | Amend superseded tests in the listed files | Basic is now default, group pages are overviews, obsolete questions are absent, and presets load as validated test fixtures rather than through a hidden toolbar. Existing exact result assertions are retained; fresh turnout-change expectations become zero. Legacy preset confirmation remains unit-tested, browser coverage moves to questionnaire replacement confirmation. |
| /3-implement | Retain indexed draft model APIs behind compact overview facades | Preserves exact older fixtures while confirming all overview fields atomically; avoids parallel scenario state |
| /3-implement | Added a RED-first overview-part navigation regression while stage remained tests | A later invalid field must not prevent returning through valid earlier parts to repair it |
| /3-implement | Short per-group soft warning, with no demographic-law assertion | Strict fit with six simultaneous warnings exposed 50 pixels of overflow at 1024×576; concise repeated copy fixes fit without hiding controls or weakening checks |
| /3-implement | Actual completion date is 2026-11-02 | Local clock crossed midnight during implementation; approval and initial memo/RED remain dated 2026-11-01 |
| /4-close | tests/ui/coalitionWorkspace.test.tsx required no edits; tests/ui/app.test.tsx also remained unchanged | Existing assertions pass after preserving per-entity automatically-filled disclosures; no new folders or contour changes required |

Implementation verification: 2985 unit/build tests, 350 offline browser checks
passed, 40 existing conditional skips; types, lint and changed-file formatting
passed. HTML is 458442 bytes under the unchanged 460800-byte gate. No production
engine, schema, scan-progress isolation, prototype, or contour file changed.
The existing project brief's book/store/panel mappings remain accurate; the new
shared renderer is documented in specification 14.5.

Independent close on 2026-11-02 reran all gates: 2985 unit/build tests,
350 browser passes and 40 existing conditional skips, types/lint/changed-file
formatting green, HTML 458442 bytes. Files table walked against filesystem
changes without git. No new backlog items, no ADR needed, and no audit run.
All thirteen M7 items are ticked; the parent next runs /5-audit, including the
existing unticked CONTOUR-13 through CONTOUR-23 checks.
