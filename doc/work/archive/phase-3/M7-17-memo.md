# Memo — M7-17 Second prototype-fidelity pass for Coalitions and Demographic Future

| Field | Value |
| --- | --- |
| item | M7-17 |
| epic | M7 |
| phase | Phase 3 — M7 party-first coalition simulation |
| status | closed |
| created | 2026-11-02 |
| closed | 2026-11-02 |

## Approval

The user approved on 2026-11-02: "vse ispolni samostojatelno" ("carry out
everything yourself"), given together with the M7-17 request. This approves the
recommendations below. It does not allow skipping steps, faking RED, weakening
tests, raising the 460800-byte offline limit or the 200 ms responsiveness
budget, or placing electoral arithmetic outside `src/engine/`.

## Problem

After M7-14 the built file, compared with the two accepted prototypes on the
user's eight-party data at 1440x900, still differs in visible ways. On the
Demographic Future tab the left column is clipped, there is no full-width
timeline bar, and the right column shows the old tables instead of "the same
coalitions through the years": four donut-pair cards whose sets match the
Coalitions tiles. On the Coalitions tab, supporter turnout shows long raw target
decimals instead of the prototype's per-party −1..+1 coefficient. Directed rules
are split into pages instead of two columns. The old result sections take up
most of the page instead of sitting closed below the four cards.

## Scope

**In scope**

- Demographic Future layout from the prototype.
  - A full-width timeline bar: "Сегодня → через N лет", the 0–50 years slider,
    К началу, a Пуск/Пауза toggle, a "Год" year select and the speed select.
  - A left card, "Рост групп избирателей". Each group row has its rate field,
    a coloured slider, share today → year, and the change in percentage points
    beneath. The card also has "Численность от старта: 100% → X%", "Рост как в
    файле" (restores the loaded file's growth rates) and a 51-year share chart.
    The chart has 0/10/…/50 year ticks, percent gridlines and a dashed marker
    on the chosen year.
  - A right card, "Те же коалиции через годы". It opens with a summary strip:
    overall turnout year 0 → year k, majority N of seats, threshold. Under it
    sit up to four coalition cards (№1–№4). Each card has its badge, a
    coalition select, and year-0 and year-k donuts of all seats: the
    coalition's parties in colour, the rest grey, seats in the centre over
    "/ 120", and a majority tick. Each card also shows "большинство есть" or
    "не хватает N", "±N мест · голоса по стране a → b" and a member legend
    "Party 39→39".
  - The four sets are the Coalitions tab tiles (same `panel.tiles` session,
    labels and nearest default). A card select writes the same tile list, so
    both tabs always show the same sets. "отметьте до четырёх коалиций" is no
    longer the default view.
  - Experiment mode ("Эксперимент явки · 1 коалиция"), as in the prototype's
    turnout preview. On the left, "Явка сторонников партий" rows: an exact
    target % field with slider, and the year-k turnout beside it. Under them,
    "Получившаяся явка групп: база → эксперимент". On the right, one coalition
    select and three donuts (original today, new turnout today, new turnout in
    year k). Under them: "Явка: ±N мест; затем демография: ±M мест", a member
    seat table with each member's share inside the coalition, and national vote
    shares original → experiment.
  - The old detailed content stays, inside one closed disclosure below: the
    chooser with its checkboxes, graphics and red/orange pickers, and the
    Итоги/Группы/Партии tables, followed cards and critical results. The left
    card is no longer clipped: the future layout drops the sticky,
    height-capped editor column.
- Coalitions "Явка сторонников".
  - Each party gets the prototype coefficient −1..+1 (−1: никто, 0: как в
    базе, +1: все). It has a −1..+1 slider with step 0.05, a field showing two
    decimals and −/+ steppers of exactly 0.05 (the prototype adds and subtracts
    1/20).
  - Under the field: the resulting party turnout and the base turnout, both
    rounded to one decimal.
  - "Сбросить явку" resets the frozen experiment.
  - The coefficient feeds the existing frozen supporter-turnout experiment
    through an exact engine mapping. The prototype's `turnoutAt` maps c ≥ 0 to
    t + c·(1 − t) and c < 0 to t·(1 + c). The existing lifecycle, reset and
    tests stay.
  - The exact target % entry stays in the enlarged ("Крупно") view.
- Directed rules "Правила: кто с кем не сядет".
  - A party select between ◀ and ▶ buttons, and every relation of that party
    at once in two columns, with no pager.
  - Each row reads: left party · seats, its ✓/✗ end, a two-half line (each half
    dashed red for a refusal or solid green otherwise), the other end, and the
    other party · seats.
  - The reset reads "Как в файле". Each end stays independent. The
    questionnaire keeps its paged strip.
- Coalitions page tail.
  - Below the four prototype cards, one compact "Подробнее" area. Every one of
    these closed disclosures is kept and only starts closed:
    - "Прежние связанные настройки";
    - the Состав entry;
    - Сравнение;
    - Исторический ориентир;
    - the "Результаты" coalition block (minimal winning list, pivotal parties,
      forbidden pairs).
- Typography and density at the prototype's scale: 13 px body, 20/15/14 px
  headings, 10 px card padding. The four Coalitions cards fit about one
  1440x900 screen. No horizontal overflow at the Section 14.6 sizes; Hebrew
  RTL and the phone project still pass.
- Every new visible string in ru, en and he.

**Out of scope**

- M7-15 (natural compact questionnaire) and M7-16 (two ready examples).
- Any scenario schema change or export change. The coefficient is a session
  experiment entry, like the M7-12 targets, and is never stored in a scenario.
- Prototype features without an engine counterpart in this app: the
  prototype's "＋ Собрать свою…" dialog on future cards (the Coalitions tab
  already offers own sets, which then appear in the future selects), and its
  separate "Сбросить к файлу" header button (each card keeps its own reset).
- Pixel identity with the prototypes. The target is the same layout, scale,
  colours and content at 1440x900, not identical pixels.

## Approach

Specification Section 14.3.1 (integrated panels) is extended. No seat
arithmetic changes.

1. **Engine (`src/engine/`)**:
   - `supporterTurnout.ts` gains the exact `turnoutAt(turnout, coefficient)`
     with a −1..+1 range check. A coefficient entry form for the session target
     record is marked by a fixed prefix, so `runSupporters` reads either an
     exact target percent (as today) or an exact coefficient. A target such as
     t + 0.3·(1 − t) is generally not a finite decimal, so it could not be
     stored as target text without loss.
   - Also in `supporterTurnout.ts`:
     - `supporterRows(basis, targets, year)` returns, per party: the
       coefficient (two decimals), the turnout now, the base turnout (one
       decimal), the year-k turnout and the field text.
     - `stepCoefficient(text, direction)` moves the coefficient by exactly 1/20
       and clamps it to −1..+1.
   - `populationTimeline` rows gain the change against year 0 in percentage
     points and the population scale against year 0. A new `populationTrend`
     returns the prototype chart geometry, with every number decided exactly:
     the maximum is max(40, the share maximum rounded up to the next 10), plus
     gridline values, path data per group and the year x position.
   - `future.ts`: each `CoalitionYear` gains `missing` (seats short of the
     majority) and `voteShare` (the coalition's national valid-vote share,
     rounded for display), so the cards never subtract or sum in the UI.
2. **Shared tile sets (`src/ui/tileSets.ts`)**: the candidates, labels,
   entries, nearest default and shown-tile logic now inside `CoalitionTiles`
   moves into one hook, used by `CoalitionTiles` and by the future cards. Both
   read and write `panel.tiles` and `panel.labels`, so the sets are the same
   by construction.
3. **Future tab**: `App` renders one full-width future region.
   `FutureWorkspace` draws the timeline bar, the two-card workspace and the
   experiment from engine results it receives:
   - the display scenario;
   - the year-0 and year-k seat results;
   - the coalition run.

   Below it, a closed `data-future-details` disclosure holds the previous
   chooser and results regions unchanged; `Future` takes a `controls` prop so
   the year select is not duplicated. Playback, speed and pause-on-edit
   behaviour is unchanged.
4. **Coalitions tab**:
   - `SupporterControls` shows the coefficient.
   - `DirectedRelations` gains an unpaged two-column mode with ◀ ▶.
   - `CoalitionWorkspace` wraps its disclosures in the "Подробнее" area and
     receives the coalition result block from `App` as a closed disclosure. On
     the coalitions view the results region keeps only its status line.
5. **Styles**: prototype scale and the new card, donut, timeline, chart and
   rule-list styles go into `styles.css`. The CSS is packed at build time, so
   the extra bytes cost about a third of their raw size.

**Rejected alternative:** convert the coefficient to a target percent text and
reuse the existing target path. The target is generally not a finite decimal,
so it would have to be rounded, and an exact experiment would then depend on
display precision.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Session `panel.targets` value | May hold a prefixed exact coefficient instead of a target percent | None (session only, never exported) |
| Scenario | No change | None |

## Interface Delta

- Engine:
  - `turnoutAt`, `coefficientEntry`, `stepCoefficient`, `supporterRows` and
    `populationTrend` are new;
  - `populationTimeline` rows gain `delta` and `scale`;
  - `CoalitionYear` gains `missing` and `voteShare`;
  - `runSupporters` accepts coefficient entries.
- UI:
  - a full-width future region with a timeline bar, growth card, coalition
    cards and experiment card, plus the closed `data-future-details`;
  - coefficient controls `data-supporter-coef`;
  - the two-column rule list;
  - the "Подробнее" area `data-workspace-more` with the closed
    `data-coalition-results`;
  - `store.resetGrowth()`.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | Supporter-turnout votes, through the coefficient mapping. Votes, threshold, quota, remainder and ties are otherwise untouched. Coalition card values come from `evaluateCoalition` |
| Where exact rationals are required | Coefficient to group turnout (`turnoutAt`), the 1/20 steps, the share change in percentage points, the population scale, the coalition vote share, and the chart maximum and coordinates |
| Ordering / tie rules relied on | Unchanged Hamilton order; tile order from the existing nearest list and session tiles |
| Any display rounding near a decision? | No. Rounding happens only after the exact seat results; the coefficient field's two decimals are display only, and the stored entry stays exact |
| How determinism across runs, round trip and locale is proven | Engine tests check that coefficient 0 equals the base and ±1 means everyone or no one. Each coefficient must give the same seats as its exact target, every seat sum must equal `seatCount`, and generated coefficients must repeat across runs. UI tests show identical engine-derived values in ru, en and he |

## Files

| Path | Change |
| --- | --- |
| `src/engine/supporterTurnout.ts` | Coefficient mapping, entry form, stepping, row view, timeline change and scale, trend geometry |
| `src/engine/future.ts` | `missing` and `voteShare` per coalition year |
| `src/ui/tileSets.ts` | New shared tile-set hook |
| `src/ui/CoalitionTiles.tsx` | Uses the hook |
| `src/ui/FutureWorkspace.tsx` | Prototype timeline, growth card, coalition cards, experiment |
| `src/ui/Future.tsx` | `controls` prop; donut exported for reuse |
| `src/ui/App.tsx` | Future region and disclosure; coalitions result block moved into "Подробнее" |
| `src/ui/PanelControls.tsx` | Coefficient supporter controls; PanelNumber step options |
| `src/ui/DirectedRelations.tsx` | Unpaged two-column mode with ◀ ▶ and two-half lines |
| `src/ui/CoalitionWorkspace.tsx` | "Подробнее" area and closed result disclosure |
| `src/ui/store.ts` | `resetGrowth` |
| `src/ui/styles.css` | Prototype scale and new card styles |
| `src/i18n/ru.ts`, `en.ts`, `he.ts` | New strings |
| `tests/engine/supporterTurnout.test.ts`, `tests/engine/future.test.ts` (or a new file) | Exact mapping and view tests |
| `tests/ui/*`, `tests/e2e/*` | New layout tests; helpers open the new default-closed disclosures |
| `doc/spec/elections-simulator.md` | Section 14.3.1 |
| `.github/copilot-instructions.md` | Map row for `tileSets.ts` and the new engine helpers |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Which coalitions appear in experiment mode? — **Recommendation:** the same
   tile entries. The select defaults to the first shown tile, and its option
   list matches the card selects.
2. How do existing tests that act inside the now-closed disclosures change?
   — **Recommendation:** the e2e helpers (`showView` for coalitions and future)
   open them, so content assertions stay unchanged. New tests check the closed
   default directly, and each adaptation is listed in the test plan.
3. Where does the year select sit? — **Recommendation:** in the timeline bar,
   keeping the `data-future-year` select (labelled "Год") and the
   `data-future-slider` range. The prototype's number field is replaced by the
   accessible select already used by playback tests.
4. Should the experiment's left rows use targets or coefficients? —
   **Recommendation:** exact targets (%), as in the demographic prototype's
   turnout preview. The Coalitions tab uses the coefficient, as in the coalition
   prototype. Both write the same session experiment.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | The enlarged supporter view shows the coefficient too; the exact target entry stays in the future experiment, as prototype-like rows (party, number field, year-k turnout) showing two decimals until edited | The memo allowed an exact entry to remain; the experiment needs it for its existing tests |
| /3-implement | No custom "build your own" dialog on the future cards; each card changes its coalition through its select | Out of scope; the select covers the user's requirement |
| /3-implement | The future-mode buttons sit above the timeline bar; the timeline uses the existing year select rather than a free number field | Reuses the tested `FutureYear` control and its unique `data-future-year` |
| /3-implement | The experiment keeps per-snapshot party seat lists | Existing M7-12 browser test reads them |
| /3-implement | The coefficient plot keeps faint base/now turnout bars | Keeps the M7-14 plot assertions intact |
| /3-implement | Two `tests/ui/prototypeFidelity.test.tsx` card tests use a new `workspaceGrowing()` fixture with group compositions; a test for the unavailable projection was added | The first fixture has no groups, so its projection is unavailable; the extra test strengthens coverage |
| /3-implement | `tests/ui/app.test.tsx` reads coalition results from the workspace on the coalitions view | Location change only: the results now sit inside the workspace "more" area |
| /3-implement | The future cards' unavailable note uses `data-cards-unavailable`; the experiment card is a `PanelBox` with `data-enlarge="future"` | `data-projection-unavailable` must stay unique for existing browser tests; the M7-12 test enlarges the experiment |
| /3-implement | The zero button's accessible name starts with its visible "0"; on phones the timeline slider takes its own row; in Hebrew the details keep the chooser physically left | axe `label-content-name-mismatch`, the 44 px touch rule and the M7-10 RTL layout check |
| /3-implement | Visual differences remain: growth rates are not locale-formatted, the user data (7 groups, long names) makes the Coalitions page taller than the prototype, the tiles keep the M7-14 future checkbox, the outer future region keeps its title | No pixel identity was promised; values and names come from the scenario |
| /4-close | Files differ from the plan: `Future.tsx` got a `showYear` prop instead of `controls`, and the donut is a local `Ring` in `FutureWorkspace.tsx` rather than an export from `Future.tsx`; the coefficient tests are a new `tests/engine/supporterCoefficient.test.ts`; `tests/e2e/helpers.ts` and `tests/ui/app.test.tsx` changed as harness adaptations | The timeline owns the year control, so the old view only needs to hide its own; a self-contained ring kept `Future.tsx` unchanged otherwise |
