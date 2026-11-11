# Memo — M2-14 Chart Details: Select a Bar Segment or Seat, Dismiss by Escape or Outside Click

| Field | Value |
| --- | --- |
| item | M2-14 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release, reopened for review fixes |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-29 |
| closed | 2026-10-29 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

Section 10 asks for "selected chart details dismissible by Escape or outside
click", and Section 12 lists "chart details" among the browser checks. Today
the vote bar, seat bar and seat diagram are pictures only: a user who sees a
thin segment or a run of seats cannot find out which party it is and what
exact values stand behind it without reading the tables below.

## Scope

**In scope**

- Selecting a party from the charts:
  - a click or tap on a vote-bar segment, seat-bar segment or seat selects that
    party;
  - each legend entry becomes a toggle button that selects the same party, so
    the keyboard and screen-reader path is a normal button, not a 5-pixel
    segment.
- A details panel for the selected party, below the seat diagram:
  - the party name, its block (or "Unassigned"), valid votes, vote share,
    qualification status, seats, seat share and Hamilton quota, from the same
    report the tables use;
  - a Close button.
- Dismissal: Escape anywhere, the Close button, or a click outside the panel
  and outside every selectable chart part. If focus was in the panel or on the
  legend button, it returns to that party's legend button.
- The selected party's segments and seats are outlined, and its legend button
  reports `aria-expanded="true"`.
- Details follow the current scenario: they always show the current report;
  if the party is deleted or no seats are allocated, the panel disappears.

**Out of scope**

- Details for blocks or for coalitions: the spec asks for chart details, and
  the block table already lists blocks; no backlog item needed.
- A flow diagram (Section 10, optional) and image export: not planned for
  version 1; image export formats are a deferred option in Section 13.

## Approach

**Selection lives in the results view.** It is view state, not scenario data:
it is not exported, not saved with a baseline and not kept across a reload.
`Results` keeps the selected party ID. The panel is built on every render from
the current report, so it never shows stale numbers.

**Pointer path.** One click handler on each bar and on the seat diagram reads
the party ID from the segment or seat that was hit. The segments and seats stay
plain, non-focusable elements: 120 focusable seats would flood the Tab order
and cannot each be 44 × 44 pixels. The bars stay hidden from assistive
technology; the legend buttons and the tables are the accessible path, as the
spec's "accessible table alternatives" asks.

**Keyboard path.** The legend buttons are at least 44 × 44 pixels with the
standard focus outline. Enter or Space toggles the panel. Focus stays on the
button. The panel sits in a polite live region, so its content is announced.

**Dismissal.** While the panel is open, a document-level listener closes it on
Escape and on a click whose target is neither inside the panel nor a
selectable chart part. Clicking another segment switches the selection instead
of closing. When the panel closes while focus is inside it, focus moves to the
party's legend button, so it is never lost to the page body.

**Layout.** The panel is in normal flow under the seat diagram: nothing is
drawn on top of the charts, so the phone layout cannot overlap. When it opens
from a seat or segment, it is scrolled into view only as far as needed. Long
names wrap.

**Rejected alternatives:**
- A floating tooltip by the pointer: it overlaps the charts on a phone, and
  touch has no hover.
- Making each segment and seat a button: too many tab stops and touch targets
  far below 44 pixels.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| None | Selection is view state only | None |

## Interface Delta

- `Results.tsx`:
  - legend entries become `button[data-select-party]` with `aria-expanded`;
  - bars and the seat diagram accept clicks;
  - a details panel `[data-details]` holding a `dl` and a Close button
    `[data-action="close-details"]`, inside an always-present live slot
    `[data-details-slot]`;
  - selected segments and seats carry `data-selected="true"`.
- `ChartDetails` is exported, so its markup can be tested without a browser.
- i18n:
  - `details.title` ("Details: {name}");
  - `details.close`;
  - `details.block`;
  - `legend.select` (the button label "Show details: {name}");
  - existing column and status labels are reused.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None. The panel prints values already in the report |
| Where exact rationals are required | Unchanged |
| Ordering / tie rules relied on | None |
| Any display rounding near a decision? | No. Panel values use the same formatting as the tables, and a test pins that they match the table cells |
| How determinism across runs, round trip and locale is proven | Panel values equal the table row in ru/en/he (unit test) |

## Files

| Path | Change |
| --- | --- |
| `src/ui/Results.tsx` | Selection state, click handlers, legend buttons, `ChartDetails`, dismissal |
| `src/ui/styles.css` | Legend buttons, selected outline, panel layout |
| `src/i18n/en.ts`, `ru.ts`, `he.ts` | Four keys |
| `tests/ui/results.test.tsx` | Legend buttons; `ChartDetails` content equals the table row in each locale; inert names; unassigned block; no-allocation hides legend and panel |
| `tests/e2e/interaction.spec.ts` | Segment click opens details, a click on another seat switches, Escape closes, outside click closes, keyboard Enter on the legend opens and Escape returns focus |
| `doc/spec/elections-simulator.md` | Section 10 "As built in M2-14" note (at close) |
| `.github/copilot-instructions.md` | `Results.tsx` description |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Which element is the keyboard target? — **Decision:** the legend entry,
   turned into a toggle button; segments and seats are pointer-only shortcuts.
2. Floating or in-flow panel? — **Decision:** in flow, under the seat diagram.
3. Does selection persist? — **Decision:** no; it is view state.

Approved 2026-10-29 on the user's instruction: "vse eto nado s integriroval i realizovat".

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
