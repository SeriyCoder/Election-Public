# Test Plan — M7-17 Second prototype-fidelity pass

| Field | Value |
| --- | --- |
| item | M7-17 |
| memo | `doc/work/archive/phase-3/M7-17-memo.md` |
| created | 2026-11-02 |
| state | red |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/supporterCoefficient.test.ts` | Vitest | Exact coefficient mapping `turnoutAt`, parsing, entry prefix, the ±1/20 stepper with clamping, coefficient equal to the same exact target in seats, generated-coefficient seat sums and determinism, `supporterRows`, timeline `delta`/`scale`, `populationTrend` geometry, `CoalitionYear.missing`/`voteShare` |
| `tests/engine/future.test.ts` (extended) | Vitest | The four exact `CoalitionYear` objects gain `missing` and `voteShare` (hand-checked: X 50.0 → 57.1, 1 → 0 missing; empty set 6 missing, 0.0; no allocation null/null). No assertion removed |
| `tests/ui/prototypeFidelity.test.tsx` | Vitest + render-to-string | Future: region not sticky-editor, timeline with slider, growth card, four `ws-fcard` cards equal to the Coalitions tile keys, followed edits of `session.tiles`, ring centre `/ N`, ticks, conic gradient, change line and legend, summary strip, growth reset and trend chart, closed `data-future-details` holding the old chooser. Coalitions: coefficient fields, nudges, range −1..1 step 0.05, legend, reset turnout, rounded result, unpaged rules with arrows and a list, the closed "more" area with results inside. All three locales |
| `tests/e2e/prototypeFidelity.spec.ts` | Playwright (desktop, phone) | Four future cards sharing tiles, a card select writing the Coalitions tiles, experiment mode with three rings, no clipped ancestors at 1440×900 with details open, coefficient nudge/fill/reset with the read-only correction, two-column rules with arrows, closed "more" sections, Hebrew RTL width on both tabs |
| `tests/e2e/panel.spec.ts` (adapted line 74) | Playwright | Same lifecycle test; the Coalitions tab now enters coefficient `0.5` (= target 80% from the 60% base) instead of the removed raw target field |

## Happy Path

- Coalitions: a party's coefficient field reads `0.00`, `+` makes it `0.05`, typing `0.5` makes the result line `80.0`, the correction becomes read-only, "Сбросить явку" returns `0.00` and `60.0`.
- Future: the tab opens on the timeline bar, the growth card and four cards whose sets are exactly the Coalitions tiles; choosing another set on card 1 changes tile 1 on the Coalitions tab.
- Experiment: one coalition with three rings and the turnout/demography split line.

## Seat-Calculation Correctness (mandatory when the engine is touched)

The engine change is an exact coefficient path feeding the existing frozen
supporter run, plus display helpers. Allocation code is unchanged.

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `allocates exactly seatCount and repeats for generated coefficients`; existing supporter and allocation suites unchanged |
| Determinism: repeated runs, JSON round trip, ru/en/he | Same generated test (repeat equality); `lays out timeline, growth card and four cards in %s`; `enters supporter turnout as a coefficient in %s` |
| Threshold below / at / above | Existing, unchanged (no threshold change) |
| Exact remainder tie → tieBreakOrder → party ID | Existing, unchanged |
| Fixtures from exact inputs | `maps turnout %s with coefficient %s to %s exactly`; `gives the same exact seats as the equivalent target percent`; `reports seats missing to the majority and the rounded national share` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `refuses the coefficient text %j` (empty string); empty coalition in `future.test.ts` |
| Single element | One-party coalition `['P1']` in the missing/vote-share test |
| All values equal | `workspaceLinked` 60% everywhere, coefficient 0 equals base |
| Maximum size (20 / 30 / 10) | Existing 30-party 200 ms check, unchanged |
| No feasible solution | `reports a year without an allocation` (missing and vote share null); coefficient clamp at ±1 |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Pixel identity with the prototypes | Values differ by scenario; structure and computed layout are asserted, with manual before/after screenshots |
| Experiment-mode markup in render-to-string | Mode is component state; the browser suite covers it |
| Font sizes in pixels | Typography is a styling change; the overflow and clipping checks guard the layout |

## Harness Adaptations At /3-implement

- `tests/e2e/helpers.ts` `showView`: open `[data-coalition-results]` on the coalitions/compare views and `[data-future-details]` on the future view, because the default state of those sections becomes closed. Assertions about their content stay as they are.
- `tests/ui/prototypeFidelity.test.tsx`: the four-card and per-card tests use `workspaceGrowing()` (the first fixture has no group compositions, so its projection is unavailable); a new test covers the unavailable projection with year-0 rings and the reason. The unavailable marker on the cards is `data-cards-unavailable`.
- `tests/ui/app.test.tsx`: on the coalitions view, coalition results are read from the workspace `data-panel="coalitions"` block (location change only).

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-11-02 | `npx vitest run tests/engine/supporterCoefficient.test.ts tests/ui/prototypeFidelity.test.tsx` | RED: 48 failed, 10 passed | Intended: stub coefficient helpers return null/empty, missing `ws-fcard`, `data-supporter-coef`, `data-workspace-more`, strings. Passing ones are refusals the null stubs already satisfy and `turnoutAt` with coefficient 0 |
| 2026-11-02 | `npx vitest run tests/engine/future.test.ts` | RED: 2 failed, 29 passed | Intended: stub `missing`/`voteShare` are null |
| 2026-11-02 | `npx vitest run` | RED: 51 failed, 3035 passed (64 files, 3 failing) | Only the three files above fail |
| 2026-11-02 | `npx playwright test tests/e2e/prototypeFidelity.spec.ts` | RED: 10 failed, 2 skipped, 4 passed | Intended: no cards, coefficient field, rules list or "more" area; the four Hebrew width checks already pass and stay as guards; phone skips the desktop-only checks |
| 2026-11-02 | `npm run typecheck` | Pass | Stubs compile; no production behaviour added |
| 2026-11-02 | `tests/e2e/panel.spec.ts` line 74 adapted | Expected RED until the coefficient field exists | Same lifecycle assertions; only the entry field changes |
| 2026-11-02 | `npx vitest run` | Pass: 3091 passed (64 files) | GREEN |
| 2026-11-02 | `npm run typecheck`; `npm run lint`; `npx prettier --check` (changed files) | Pass | |
| 2026-11-02 | `npm run build` | Pass: `dist/elections.html` 458080 bytes | Within 460800 |
| 2026-11-02 | `npm run test:e2e` | Pass: 373 passed, 43 skipped | Skips: 41 existing conditional skips plus the 2 desktop-only checks on phone |
| 2026-11-02 | /4-close: `npm test`, `npm run typecheck`, `npm run lint`, `npx prettier --check` (changed files), `npm run build`, `npm run test:e2e` | Pass: 3091 unit/build tests; types, lint, format clean; HTML 458086 bytes; 373 browser passes, 43 conditional skips | Independent close gates |
