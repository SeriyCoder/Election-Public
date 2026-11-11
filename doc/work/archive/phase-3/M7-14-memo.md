# Memo — M7-14 Prototype-faithful Coalitions and Demographic Future

| Field | Value |
| --- | --- |
| item | M7-14 |
| epic | M7 |
| phase | Phase 3 — M7 party-first coalition simulation |
| status | closed |
| created | 2026-11-02 |
| closed | 2026-11-02 |

## Approval

The user approved on 2026-11-02: "vse ispolni samostojatelno" ("execute
everything yourself"), given together with the M7-14 request. This approves the
recommendations below. It does not allow skipping steps, faking RED, weakening
tests, raising the 460800-byte offline limit or the 200 ms responsiveness
budget, or placing electoral arithmetic outside `src/engine/`.

## Problem

M7-12 and M7-13 integrated the accepted coalition panel and demographic future
prototypes behaviourally, but the integrated Coalitions and Demographic Future
tabs render near-default controls: native vertical sliders, plain buttons, bare
number boxes, unstyled bars and plain tables. The user wants both tabs to look
almost exactly like the two accepted standalone prototypes while every value
still comes from the scenario and exact engine results. The shipped file is
already 458442 of 460800 bytes, so the prototype styling cannot simply be added.

## Scope

**In scope**

- Coalitions tab: a two-column card layout (one column below 1100 px, phone
  rules from the prototype) with rounded cards and soft backgrounds; two summary
  tiles (party-share sum with an agreed / not-100 badge; turnout base → now);
  "Голоса партий" party cards with column headers, styled vertical sliders over
  before/now bars, decimal value boxes, −/+ steppers of exactly 0.25, lock
  buttons, the bright "Выровнять" button and its red state when the sum is off;
  the supporter-turnout cards in the same style; the composition card with
  ‹ party select ›, a stacked bar, per-group rows with gauges and "Сгладить";
  population bars "Население / Как в файле / Пришли" and per-group pies;
  prototype coalition tiles (badge, seats, mini bar with majority mark,
  green/red state); directed rule strips (V / X ends per party, solid or dashed
  line); "Крупно" enlarged dialogs restyled.
- Demographic Future tab: mode switch, growth rate rows with "today → year"
  shares, the population trend, the timeline card with "К началу", play, year
  and speed, side-by-side year-0 / year-k donut pies for up to four followed
  coalitions, and the one-coalition supporter-turnout experiment with three
  snapshot pies.
- One exact engine helper for the steppers: a ±0.25 percent step clamped to
  0–100, computed with rationals in `src/engine/panel.ts`.
- Build-only lossless DEFLATE packing of the inlined CSS, decoded before first
  render (see Approach).
- New visible strings in `ru.ts`, `en.ts` and `he.ts`.

**Out of scope** (at least two)

- Questionnaire visuals and group renames — M7-15.
- Ready examples at the start, including the user's eight-party set — M7-16.
- The prototypes' own model code and their −1..+1 turnout coefficient model;
  only their look is ported. All behaviour stays the M7-12/M7-13 engine path.
- Any change to seat allocation, threshold, coalition search or schema.

## Approach

**Layout.** `IntegratedPanel` in `src/ui/PanelControls.tsx` is restructured
into the prototype's layout using prefixed classes (`ws-…`) so no existing
app class (`.status`, `.rules`, `.lock`, `.summary`, `.pie`, `.panel` …)
changes meaning. All existing data attributes, actions, focus, dialog, lock,
smoothing, alignment, correction and repair behaviour are kept, so the M7-12
and M7-13 unit and browser suites remain the behaviour contract. Values are the
exact engine results already used (`panelTotals`, `panelPopulation`,
`populationGaps`, `panelSlices`, `coalitionTileReport`, `buildCoalitionFuture`,
`populationTimeline`, `runSupporters`), shown through `formatDecimal` and
`formatChange`. Bar widths and pie stops come from engine percent strings;
the UI performs no arithmetic. `DirectedRelations` keeps its select, pages and
two `data-refusal` buttons per pair with `aria-pressed` = refused, and gains the
strip structure (name | end | line | end | name) styled by `data-refused`.
`CoalitionTiles`, `FutureWorkspace` and the followed-coalition cards in
`Future.tsx` get the prototype tile, timeline and donut structure while keeping
their data attributes. Section 14.3.1 records the presentation.

**CSS packing.** A pure build function `build/packStyles.ts` takes the
single-file HTML after `vite-plugin-singlefile`, finds exactly one inlined
`<style>` element, compresses its text losslessly with DEFLATE (level 9) and
base64, replaces exactly one placeholder token in the module script with it and
removes the `<style>` element; any count mismatch throws an explicit error. It
runs in the existing `offlineFile` bundle hook in `vite.config.ts`. At runtime
`src/ui/packedStyles.ts` decodes the base64 with `atob`, inflates it with the
browser `DecompressionStream('deflate')`, and inserts the text as the content of
one `<style>` element in the head; `src/main.tsx` awaits it before the store is
created and the first render, beside the locale tables, so there is no flash of
unstyled content. When the token is not replaced (development and tests) it
does nothing and the ordinary CSS import applies. The CSP is unchanged
(`style-src 'unsafe-inline'` already allows it); there is no network, separate
asset, `eval` or second script. Build tests prove the decoded CSS is
byte-identical to the CSS Vite produced. Estimated: about 42 KB of CSS becomes
about 12 KB of base64, leaving room for the ported prototype CSS within the
unchanged 460800-byte limit. If it still does not fit, the item stops and
reports rather than raising the limit.

**Rejected alternative:** raising the size limit or shipping the CSS as a
separate file — both violate the unchanged offline single-file contract.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| — | None; presentation and build only | None (stays version 5) |

## Interface Delta

- Engine: `stepPanelPercent(text, direction)` in `src/engine/panel.ts` — exact
  ±0.25 step of a percent text, clamped to 0–100; returns `null` for invalid
  text.
- UI: restructured Coalitions and Demographic Future tabs as described; new
  modules `src/ui/packedStyles.ts` and `build/packStyles.ts`.
- Export formats: unchanged.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None. The stepper helper only produces a percent text that enters the existing exact panel edit path |
| Where exact rationals are required | The ±0.25 step and its 0–100 clamp |
| Ordering / tie rules relied on | Unchanged persisted tie order |
| Any display rounding near a decision? | No; display strings come from existing engine formatting after every decision |
| How determinism across runs, round trip and locale is proven | Existing seat suites stay untouched and green; new helper tests prove exact steps, clamps and invalid input |

Seat calculation is not affected: this item changes presentation, a percent
text step and build packing, never the allocation path.

## Files

| Path | Change |
| --- | --- |
| `src/ui/PanelControls.tsx` | Prototype card layout, summary tiles, styled party/supporter cards, composition and population cards |
| `src/ui/CoalitionTiles.tsx` | Prototype tile structure |
| `src/ui/DirectedRelations.tsx` | Rule strip structure |
| `src/ui/FutureWorkspace.tsx`, `src/ui/Future.tsx` | Timeline, growth rows, experiment pies, followed-coalition donuts |
| `src/ui/styles.css` | Ported prototype styles (`ws-` prefix); obsolete `integrated-*` rules removed |
| `src/ui/packedStyles.ts`, `src/main.tsx` | Runtime decode before first render |
| `build/packStyles.ts`, `vite.config.ts` | Build-time CSS packing |
| `src/engine/panel.ts` | `stepPanelPercent` |
| `src/engine/coalitionVariants.ts` | Exact `required` seats and majority mark for tiles (added at implement) |
| `src/i18n/ru.ts`, `en.ts`, `he.ts` | New strings |
| `tests/ui/prototypeLook.test.tsx`, `tests/engine/panelStep.test.ts`, `tests/build/packStyles.test.ts`, `tests/e2e/prototypeLook.spec.ts` | New tests |
| `doc/spec/elections-simulator.md` | §14.3.1 presentation, §10 packed CSS |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Should the prototype's vertical sliders keep the app's exact text box as the
   authority? — **Recommendation:** yes; the slider moves in 0.25 steps and the
   decimal box accepts any exact value, as in M7-12.
2. Should the ported classes be prefixed? — **Recommendation:** yes, `ws-`, to
   avoid collisions with existing app classes.
3. Where does the "Сегодня → через N лет" year live? — **Recommendation:** keep
   the existing year select (`data-future-year`) as the single year state and
   bind the timeline range, play and speed to it.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| implement | `tests/build/packStyles.test.ts` recorder plugin set to `enforce: 'post'` | Harness bug: it recorded the bundle before packing; assertions unchanged |
| implement | `src/engine/coalitionVariants.ts` also exposes `required` and a majority mark position | Tile mini bar and majority mark need exact engine values, not UI arithmetic |
| implement | Timeline sits inside the future panel card, not full page width | The app keeps its two-column shell with results beside the workspace |
| implement | Supporter panel keeps M7-12 turnout targets instead of the prototype's −1..+1 coefficients | Approved M7-12 behaviour is preserved; only the look is ported |
| implement | Vertical sliders are a 28 px centred column inside each party card | Native range under vertical writing mode; plot width stays for the bars |
| implement | Pies are CSS conic gradients, not SVG | Smaller CSS within the size budget; values come from engine pie stops |
| implement | Group cards use auto-fit grids, not a fixed group-count grid | Phone and RTL fit without horizontal overflow |
| implement | Prototype "fix-note" overlays are not ported | They were prototype review annotations, not product behaviour |
