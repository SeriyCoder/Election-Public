# Test Plan — M2-21 Future And Composition Views

| Field | Value |
| --- | --- |
| item | M2-21 |
| memo | `doc/work/archive/phase-2/M2-21-memo.md` |
| created | 2026-10-30 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/edit.test.ts` | Vitest (node) | `GROUP_CHANGE_FIELDS` order; `setGroupFraction` for `growthRate` and `turnoutChange` with `2`, `-2,5`, `-100`, `1`, `-0.5`, `0` stored as exact fractions in a valid scenario; a lone `-` kept raw (invalid decimal); `150` stored as `1.5` and refused as out of range |
| `tests/engine/projection.test.ts` | Vitest (node) | `groupTurnout`: year 0 and default give the stored 7/10; +0.01 for 5 years gives 3/4, −0.01 gives 13/20; clamp to 1 and 0; equals cast / population of `computeVotes` for years 0–20; years −1, 21, 1.5, NaN refused |
| `tests/engine/composition.test.ts` | Vitest (node) | `buildCompositionReport`: X rows A 480 / 85.71 and 240 / 75.00, B 80 / 14.29 and 80 / 25.00, totals 560 / 320, name; block K 42.86 / 57.14 of 700; list Z with every share empty and totals 0; year 1 with A +10%: 264 / 76.74 and 80 / 23.26 of 344; unknown target refused |
| `tests/engine/future.test.ts` | Vitest (node) | `buildFutureReport` for year 1 with A +10%: totals (population 1000 → 1060, cast 700 → 730, turnout 70.00 → 68.87), group rows (A 600 → 660, turnout 50.00 both years; B unchanged at 100.00), party rows (X 320 → 344, share 45.71 → 47.12, seats 5 / 5; Y 380 → 386); turnout clamp up (100.00) and down (0.00, cast 400); year 0 has every change zero; Section 8 seats 46 / 50 / 18 / 6; a year without valid votes reports `no-valid-votes`; year bounds; no floating point or locale APIs in the source |
| `tests/ui/store.test.ts` | Vitest (node) | Six views in order; `DEFAULT_FUTURE_YEAR` 4; `setFutureYear` accepts 0–20 and refuses −1, 21, 2.5, NaN without a commit; the year survives `setInput` and `loadPreset`; `getProjection` equals `runSeats(year)`, is the year-0 result at year 0, is cached by input and year, is null for invalid input and runs no coalition search; composition target default, set, reset and initial |
| `tests/ui/editor.test.tsx` | Vitest (node) | Group panel: growth and turnout change fields show `0` for a new group, `-2,5` and `1` stored values as −2.5 and 1; signed sliders −10..10; field order after the four fractions; labels in ru, en and he |
| `tests/ui/app.test.tsx` | Vitest (node) | The results region shows the composition and future panels on their views; both views label unnamed parties and groups in the current language; no foreign text and no raw IDs in any of the six views |
| `tests/ui/views.test.tsx` | Vitest (node) | New Russian strings (turnout change in percentage points); group palette distinct, by position, wrapping; composition target list (parties, then blocks), default first party, the two bases with exact values and totals, round group markers in palette colours, basis note, chosen block with caption, fallback for a stale target, no-votes note with empty shares, nothing for invalid input; future year select 0–20 starting at 4, slider attributes, year 0 beside year 1 with the §14.2 values, group colours, ready and no-allocation states, the note, nothing for invalid input; both views in ru, en, he with locale number formatting |
| `tests/e2e/helpers.ts` | — | `VIEWS` lists six views, so layout, a11y and offline specs cover the new views on desktop and phone |
| `tests/e2e/future.spec.ts` | Playwright | Growth typed in the editor moves year 1 (X 344, A 660, turnout 68.87); the year slider follows ArrowRight and Home; composition of X (75.00 / 25.00), of block K (42.86) and the no-votes note for Z |

## Happy Path

- A user enters 10% yearly growth for a group and looks one year ahead —
  `a growth rate typed in the editor moves the chosen year` (e2e) and
  `shows year 0 beside year 1 with the change`.
- A user asks who votes for list X —
  `shows both bases per group with exact rounded values`.
- A user switches the composition to a block —
  `follows the chosen block`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Allocation not touched; `sums every year-k allocation exactly to the seat count` (M2-20) still runs; future rows read seats from `runSeats` |
| Determinism: repeated runs, JSON round trip, ru/en/he | `projection caches by input and year`; `%s formats the numbers for its locale` (same figures in three locales); engine takes no locale |
| Threshold below / at / above | Threshold not touched; existing suite |
| Exact remainder tie → tieBreakOrder → party ID | Allocation not touched; existing suite |
| Fixtures from exact inputs | `turnout of a year adds the change once per year` (3/4, 13/20); composition report 85.71 / 75.00; future report 344 / 1060 / 68.87; `matches the section 8 seats in both columns` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | A list without supporters: `shows empty shares for a list without supporters`, `says so when the list has no votes and leaves shares empty`; a year without valid votes: `reports it for the year without dropping year 0`, `reports a year without an allocation` |
| Single element | One group and one list in the no-allocation fixtures |
| All values equal | Year 0: `changes nothing`; `is the year-0 result at year 0` |
| Maximum size (20 / 30 / 10) | Year 20 accepted, 21 refused in engine and store; group palette at `LIMITS.groups − 1` |
| No feasible solution | Turnout pushed past 1 or 0: clamp tests in `groupTurnout` and the future report; invalid input shows no table |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| A scenario with no parties in the composition view | Unreachable: a valid scenario has at least one group (shares sum to 1) and every group at least one allowed party; the memo's "no parties" message is dropped |
| Coalition search for a future year | Out of scope in the memo; the note says so and `does not run the coalition search` guards it |
| Pixel layout of the six-view phone switcher | Covered by the existing layout spec looping over `VIEWS` (no overflow, touch targets), not by screenshots |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-30 | `npx vitest run --reporter=json` | red: 1523 passed, 47 failed of 1570; 2 suites not loaded | Expected: `src/engine/future.ts` and `src/ui/groupColors.ts` missing; `GROUP_CHANGE_FIELDS`, `groupTurnout`, `buildCompositionReport`, store year and projection, editor change fields and both views absent |
| 2026-10-30 | `npx vitest run --reporter=json`; `npm run typecheck`; `npm run lint`; `npx prettier --check`; `npx vite build`; `npm run test:e2e` | green: 1646 of 1646 unit; e2e 136 passed, 16 skipped | /3-implement amended one test: the engine-import allowlist in `tests/ui/store.test.ts` now admits `composition` and `future`, which are report modules like `compare` (a /2-tests omission). `Composition.tsx` takes the vote type as `SeatResult['votes']` from `run`, not from `votes`. The first e2e run failed the composition layout with long names (a select grows to its longest option); fixed by capping the select to its column |
| 2026-10-30 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 1646 unit; e2e 136 passed, 16 skipped |
