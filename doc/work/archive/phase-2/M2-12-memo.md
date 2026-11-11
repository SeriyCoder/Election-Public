# Memo — M2-12 Rate Controls: Sliders, Segmented Controls, Override Flag

| Field | Value |
| --- | --- |
| item | M2-12 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release, reopened for review fixes |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-29 |
| closed | 2026-10-29 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

Sections 5 and 10 ask for a slider alongside the number input for every rate,
and segmented controls for model selection. Today only population share and
turnout have sliders; valid-ballot rate, participation factor, vote weights and
the threshold are number-only. Voting mode and majority mode are plain radio
lists. Section 6.3 asks that a majority override be "visibly identified"; the
coalition view marks it, but the results summary shows the overridden majority
without any mark.

## Scope

**In scope**

- One shared slider component in the editor, used for:
  - all four group rate fields (population share, turnout, valid-ballot rate,
    participation factor);
  - every vote weight row (disabled when the party is not a destination);
  - the threshold.
- Voting mode and majority mode shown as segmented controls. They stay native
  radio buttons, so keyboard arrows, form semantics and the existing tests keep
  working; only the presentation changes.
- The results summary marks an overridden majority with the same "set
  manually" text the coalition view uses. The report gains a
  `majorityOverridden` flag so the view does not read rules itself.

**Out of scope**

- A slider for counts (seat count, population total, majority override):
  they are not rates; the number input stays.
- Party/block turnout shortcuts: M2-18.
- Chart interaction: M2-14.

## Approach

**Slider.** The existing population-share/turnout slider moves into a small
`RateSlider` component in `src/ui/Editor.tsx`:
- range 0–100 percent, step 0.1, the same as today;
- it shows the stored fraction as a percent, and passes the slider's percent
  text to the same edit function as the number input (`setGroupFraction`,
  `setVoteWeight`, `setRule`), so there is one write path per field;
- `aria-label` is the field label; it is disabled exactly when the number
  input is.

The number input remains the exact control: a slider position can only express
0.1% steps, and typing keeps full precision. Moving a slider replaces the value
with the slider position, as today.

**Threshold range.** 0–100% like the other rates. A narrower range would make a
threshold above the maximum show the slider pinned at its end while the number
says otherwise; the number input covers fine values such as 3.25%.

**Segmented controls.** The two radio groups get a `segmented` container. Each
label becomes a segment at least 44 × 44 px. The radio input is visually hidden
but stays focusable. The checked segment is filled with the accent colour, and
the focused segment gets the same focus outline as other controls. Text stays
visible on every segment, so the selection is not shown by colour alone.

**Override flag.** `buildReport` adds `majorityOverridden` from the scenario
rules. `Results.tsx` appends the "set manually" text to the majority value and
marks it with a data attribute, the same way the coalition summary does.

**Rejected alternative:** replacing the radios with toggle buttons and
`aria-pressed`. It loses native arrow-key navigation and radio-group semantics,
and needs new keyboard code for no user-visible gain.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| None | UI and report only | None |

## Interface Delta

- `ResultReport.majorityOverridden: boolean` (report module, display data).
- Editor: `data-slider` for each group rate field; `data-weight-slider` per
  destination; `data-rule-slider="threshold"`; `segmented` containers on the
  voting-mode and majority-mode groups.
- Results summary: `data-majority-overridden` on the majority value when set.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None. Sliders call the existing edit functions; the report gains a boolean copied from the rules |
| Where exact rationals are required | Unchanged; slider text goes through the same exact percent parsing as typed text |
| Ordering / tie rules relied on | None |
| Any display rounding near a decision? | No. The slider snaps its position to 0.1% only for display; it does not write unless moved |
| How determinism across runs, round trip and locale is proven | Existing suites; a test checks that a slider value and the same typed value give the same draft |

## Files

| Path | Change |
| --- | --- |
| `src/ui/Editor.tsx` | `RateSlider`; sliders for every rate and the threshold; segmented markup |
| `src/ui/styles.css` | Segmented control styles; slider layout in weight rows and rules |
| `src/engine/report.ts` | `majorityOverridden` |
| `src/ui/Results.tsx` | Override mark in the summary |
| `tests/ui/editor.test.tsx` | Slider and segmented tests |
| `tests/ui/results.test.tsx` | Summary override mark |
| `tests/engine/report.test.ts` | `majorityOverridden` |
| `tests/e2e/interaction.spec.ts` | Click a segment; keyboard on the threshold slider |
| `doc/spec/elections-simulator.md` | "As built in M2-12" note in Section 10 (at close) |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Threshold slider range? — **Decision:** 0–100% like every rate (see
   Approach); the number input handles precise thresholds.
2. Keep radios under the segmented look? — **Decision:** yes, for native
   keyboard and semantics.

Approved 2026-10-29 on the user's instruction: "vse eto nado s integriroval i realizovat".

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | `.field` in `styles.css` gained `align-content: start` | With a slider in every rate cell, a number input stretched to the height of its grid row; found in the screenshot check |
