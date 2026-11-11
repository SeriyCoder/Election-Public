# Memo — M2-21 Composition and future views, with growth and turnout-change controls

| Field | Value |
| --- | --- |
| item | M2-21 |
| epic | M2 |
| phase | Phase 2 — M2 reopened for the questionnaire, time model and Israeli example |
| status | closed |
| created | 2026-10-30 |
| closed | 2026-10-30 |

## Problem

M2-20 put the time model and the electorate composition into the engine, but
nobody can reach them: the editor has no field for a group's annual growth or
turnout change, and the results offer no way to see who makes up a list's
electorate or what the votes and seats look like in a later year. Section 14.3
asks for two result views, Composition and Future, and for the two group
controls in the editor, with group colours that mark people and stay apart
from the party colours.

## Scope

**In scope**

- Editor: per group, a growth field (percent per year) and a turnout-change
  field (percentage points per year), each a text field with a slider. The text
  accepts the full stored range −100 … +100; the slider covers −10 … +10.
- Composition view: a selector of the scenario's parties, then its blocks; one
  table with a row per group (group marker, name, potential supporters as a
  share and an amount, valid votes as a share and an amount) and a total row;
  a note that defines the two bases; a note when the chosen list or block has
  no valid votes, its shares shown as empty.
- Future view: a year chooser 0–20 (default 4) as a select and a slider; the
  allocation status of that year; three tables for year 0 beside the chosen
  year with the change: totals (population, ballots cast, turnout), groups
  (population, turnout) and parties (votes, vote share, seats); a note that the
  projection starts from the stored scenario and that coalitions are not
  computed for future years.
- Group colours from a fixed palette by group position, drawn as a round
  marker; party colours stay square swatches.
- Store: the chosen year, the chosen composition target and a cached
  projection for the chosen year.
- Engine display builders for both views, so the interface only formats.
- All new strings in the Russian, English and Hebrew tables.
- Phone: the view switcher holds six entries in two rows of three.

**Out of scope** (at least two)

- Catalog group colours, catalog names and the Israeli example preset — M2-22.
- The questionnaire and its page flow — M2-23; drawings and animations — M2-24.
- A coalition search for a future year: Section 14.2 runs it only for year 0.
- Comparing a future year against the saved baseline: the Compare view stays
  on year 0.
- Keeping the chosen year in the scenario, the export or browser storage: it
  is a view setting (Section 14.1).
- A chart across all twenty years: Section 14.3 asks for one chosen year
  beside year 0, which the tables show.

## Approach

Engine (Section 14.2, 14.3):

- `src/engine/votes.ts` exports the per-group turnout of a year, the clamp of
  today's turnout plus the elapsed years times the annual change, and
  `computeVotes` uses it, so the Future view shows the same turnout the votes
  were computed with.
- `src/engine/composition.ts` gains a display builder: for a scenario with
  display names, a vote result and a target it returns one row per group with
  both bases (amount rounded to whole voters, share as a percent with two
  places, empty when the total is zero) and both totals, built on
  `electorateComposition`.
- New `src/engine/future.ts`: a display builder that takes the scenario, the
  year-0 seat result, the year-k seat result and k, refuses a year outside
  0–20, and returns the year, both no-allocation reasons, the totals and party
  rows of the existing scenario comparison (the same scenario on both sides)
  and its own group rows (population and turnout of year 0 and year k with the
  change). The rounding helper of `compare.ts` is exported for it.

Store (`src/ui/store.ts`): two views are appended after Compare; the state
gains the chosen year (default 4) and the composition target (a party or a
block, or none); setting a year outside 0–20 or not an integer is refused and
changes nothing; a projection getter runs the seat calculation for the chosen
year and caches it by input and year, and returns nothing for invalid input.
A target that no longer exists falls back to the first party at render.

Interface: `src/ui/Composition.tsx` and `src/ui/Future.tsx` render the two
views from the builders; `src/ui/App.tsx` shows them in the results panel;
`src/ui/Editor.tsx` adds the two group controls through the existing percent
field and slider (the slider gains a range); `src/ui/groupColors.ts` holds the
palette. The year select and slider map their text back to a year by looking
it up among 0–20, so the interface parses no numbers.

**Rejected alternative:** subtracting the year-0 and year-k results inside the
view components — that is electoral arithmetic outside `src/engine/` and would
round in the interface; the builders do it exactly and round once.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario | none | none |
| App state (interface only) | chosen future year; composition target | none |

## Interface Delta

- `src/engine/votes.ts`: exported per-group turnout of a year.
- `src/engine/composition.ts`: composition display builder and its row types.
- `src/engine/future.ts` (new): future display builder and its types.
- `src/engine/compare.ts`: the rounded-change helper is exported.
- `src/engine/edit.ts`: a list of the two signed group fields; the group
  fraction setter accepts them.
- `src/ui/store.ts`: views `composition` and `future`; state fields and setters
  for the year and the target; the projection getter.
- `src/ui/Composition.tsx`, `src/ui/Future.tsx`, `src/ui/groupColors.ts` (new).
- `src/ui/App.tsx`, `src/ui/Editor.tsx`, `src/ui/styles.css`.
- `src/i18n/ru.ts`, `en.ts`, `he.ts`: view names, the two group fields and the
  strings of both views.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None changed. The Future view calls the seat calculation with a year (built in M2-20); votes only move the turnout clamp into an exported helper with the same result |
| Where exact rationals are required | Composition amounts and shares, year-k minus year-0 differences and the group turnout of a year are exact rationals until the single display rounding |
| Ordering / tie rules relied on | Rows follow scenario order of groups and parties, as in the comparison |
| Any display rounding near a decision? | No. Threshold and allocation run on exact year-k votes before any rounding; rounded values are display only |
| How determinism across runs, round trip and locale is proven | Builder tests on the Section 14.2 fixtures (composition 75 / 25, year 1 values 344, 386, 1060, 730, 68.87%); year 0 shows zero change everywhere; render tests in all three locales; unchanged seat tests stay green |

## Files

| Path | Change |
| --- | --- |
| `src/engine/votes.ts` | export the turnout of a year |
| `src/engine/composition.ts` | composition display builder |
| `src/engine/future.ts` | new: future display builder |
| `src/engine/compare.ts` | export the rounded-change helper |
| `src/engine/edit.ts` | signed group field list; setter accepts it |
| `src/ui/store.ts` | views, year, target, projection |
| `src/ui/Composition.tsx` | new view |
| `src/ui/Future.tsx` | new view |
| `src/ui/groupColors.ts` | new palette |
| `src/ui/App.tsx` | panels for the two views |
| `src/ui/Editor.tsx` | growth and turnout-change controls; slider range |
| `src/ui/styles.css` | group marker, year chooser, phone switcher in two rows |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | new strings |
| `tests/engine/composition.test.ts`, `tests/engine/future.test.ts`, `tests/engine/projection.test.ts`, `tests/engine/edit.test.ts` | builder, turnout helper and setter tests |
| `tests/ui/store.test.ts`, `tests/ui/app.test.tsx`, `tests/ui/editor.test.tsx`, `tests/ui/views.test.tsx` | store, shell, editor and view render tests |
| `tests/e2e/helpers.ts`, `tests/e2e/future.spec.ts` | six views; browser check of both views |
| `doc/spec/elections-simulator.md` | Section 14.3 as built |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Where do the two views go in the switcher? — **Recommendation:** after
   Compare, in the order Composition, Future; appending keeps every existing
   view and test in place.
2. What range should the growth and turnout-change sliders cover? —
   **Recommendation:** −10 … +10 per year; the text field takes the full
   −100 … +100 the schema allows.
3. How does the phone switcher fit six entries? — **Recommendation:** two rows
   of three, with the page padding raised to match, rather than shrinking the
   labels.
4. Which group turnout does the Future view show? — **Recommendation:** the
   turnout of the year as computed (today's turnout plus the change, clamped),
   the same quantity the Compare view shows for year 0.
5. What does Composition show before a target is chosen? — **Recommendation:**
   the first party; with no parties it shows a short message instead of the
   table.

Approved 2026-10-30 on the user's instruction for an autonomous run: "izuchi vnedrenie, vizualizaion i implement vse eto, do nachala M2" (2026-10-30), in autopilot mode; the recommendations above are the decisions.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | The composition "no parties" message and its key `composition.noParties` were dropped | Unreachable: a valid scenario has at least one group and every group at least one allowed party |
| /3-implement | `src/ui/Compare.tsx` changed, though not in the Files table: it now exports `Format`, `DecimalCells`, `CountCells`, `SideHeaders` and `Section` | The Future view reuses the side-by-side table cells instead of copying them |
| /3-implement | `tests/ui/store.test.ts`: the engine-import allowlist also admits `composition` and `future` | Both are rounded-report modules like `compare`; the allowlist was not extended at /2-tests |
| /3-implement | `Composition.tsx` types its votes as `SeatResult['votes']` from `run.ts` | The UI may not import `votes.ts` directly |
| /3-implement | The composition and future selects are capped to their column | A select is as wide as its longest option; long names widened the page in the layout spec |
| /4-close | `.github/copilot-instructions.md` module map updated | Lists `future.ts`, the composition report, `groupTurnout` and the new UI files |
