# Test Plan — M2-07 Baseline Save And Compare

| Field | Value |
| --- | --- |
| item | M2-07 |
| memo | `doc/work/archive/phase-2/M2-07-memo.md` |
| created | 2026-10-28 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/compare.test.ts` | Vitest (node) | `compareScenarios`: self comparison, totals, group turnout, party votes, shares, status and seats, exact change rounding, majority, matching by ID, added and removed rows, row order, no allocation, purity, round trip. `compareCoalitions`: matching by member set, presence, order, conclusiveness, missing sides, no allocation |
| `tests/ui/store.test.ts` | Vitest (node) | Baseline save, refusal, replacement, independence from edits, derived and cached baseline, reset, clear, initial baseline; engine allowlist |
| `tests/ui/coalitionRunner.test.ts` | Vitest (node, fake worker, manual clock) | `connectBaselineRunner`: null without a baseline, one stable scenario per save, one search per save, disconnect |
| `tests/ui/i18n.test.ts` | Vitest (node) | `formatChange`: plus sign, minus kept, zero unsigned, grouping, refusal of non-decimal text, all locales |
| `tests/ui/compare.test.tsx` | Vitest (node, render-to-string) | Keys in ru/en/he; placeholder removed; empty state; actions; totals, groups and parties tables against the engine comparison; change direction markers; added and removed rows; no allocation; escaping; locales; coalition comparison states; App panel |
| `tests/ui/app.test.tsx` | Vitest (node, render-to-string) | The compare panel renders the view, not a placeholder |

## Happy Path

- Section 8 baseline against Group 3 turnout halved: valid votes −75,000, turnout −7.50, Group 3 turnout −50.00, Party 3 seats 18 → 10 — `halving Group 3 turnout moves votes, turnout and seats`.
- Save, edit, reset: the input returns to an independent copy of the baseline — `resets the current input to a fresh copy of the baseline`.
- The compare view renders every engine value with the right sign and direction — `shows votes, shares, seats and status per party`.
- Deadlock baseline against an all-eligible scenario: two coalitions appear — `lists coalitions that appear and both outcomes`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `agrees with the engine seats on both sides` (seat changes sum to zero); the sum property stays in `allocate.test.ts` |
| Determinism: repeated runs, JSON round trip, ru/en/he | `does not change its inputs and repeats exactly`; `reproduces after a JSON round trip of both inputs`; `keeps the same rows in %s` |
| Threshold below / at / above | `reports a qualification change under a raised threshold` (6% threshold: Party 4 drops out, seats 48 / 53 / 19 / 0) |
| Exact remainder tie → tieBreakOrder → party ID | Unchanged; covered in `allocate.test.ts`; the comparison reads allocation results only |
| Fixtures from exact inputs | Section 8 baseline seats 46 / 50 / 18 / 6 — `shows the known Section 8 seats on both sides` |
| Display change rounded from the exact difference | `rounds the exact change, not the difference of rounded values` (33.3349% → 33.3451%: change 0.01, not 0.02) |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `refuses to save an invalid input and keeps the old baseline`; `shows no comparison for an invalid scenario` |
| Single element | `lists no rows while the %s side is missing` |
| All values equal | `gives zero changes everywhere` |
| Maximum size | Not applicable: the comparison is linear in rows; size limits are enforced by the schema |
| No feasible solution | `reports absent seats and no seat change on a side without seats`; `shows an empty note when neither side has a coalition`; `carries the no-allocation status` |
| Rounding edge cases | `rounds the exact change, not the difference of rounded values` |
| Truncated coalition search | `is not conclusive when either search is incomplete`; `warns when a truncated search cannot prove a change` |
| Renamed, added, removed and reordered entities | `keeps a renamed party on one row with the current name`; `marks added and removed parties and orders removed rows last`; `marks added and removed groups`; `follows the current persisted order for rows on both sides` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Button clicks for save, reset and clear | Render-to-string has no events; the handlers call store actions tested directly; M2-10 covers clicks |
| Two real Web Workers at once | No worker in the node runner; the baseline runner is the same tested runner; M2-10 checks the browser |
| Visual styling of change markers | Covered by the `data-direction` marker; layout checks are M2-10 |

## Changed Existing Tests

| Test | Change | Reason |
| --- | --- | --- |
| `tests/ui/app.test.tsx` — required keys | `placeholder.compare` no longer required | The compare panel now shows the view (memo scope) |
| `tests/ui/app.test.tsx` — `keeps the compare placeholder until its item lands` | Replaced by `renders the compare view instead of a placeholder` | Same reason; the placeholder was a stand-in for this item |
| `tests/ui/store.test.ts` — engine allowlist | Adds `compare` | The compare view calls `compareScenarios` and `compareCoalitions` |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | `npm test` | 78 failed / 857 passed | Failures: `not implemented` from the `compareScenarios`, `compareCoalitions`, `formatChange`, store baseline and `connectBaselineRunner` stubs; the compare view renders nothing; missing message keys; the compare placeholder still present |
| 2026-10-28 | `npm run typecheck`; `npm run lint` | clean | |
| 2026-10-28 | `npm test` | 935 passed | All M2-07 tests green; no existing test changed beyond the list above |
| 2026-10-28 | `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run build` | clean | `dist/index.html` 150.42 kB; browser smoke on `file://`: save, preset change (seat changes +5 / +2 / -7 / 0), both worker searches done, reset to zero changes, clear back to empty |
| 2026-10-28 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check` (close gate) | green | 935 passed; typecheck, lint, format and build clean |
