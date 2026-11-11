# Test Plan — M2-04 Preference Editor: Restricted And Open Modes, Explicit Rebalance

| Field | Value |
| --- | --- |
| item | M2-04 |
| memo | `doc/work/archive/phase-2/M2-04-memo.md` |
| created | 2026-10-28 |
| state | green |

<!-- Real failing tests exist before implementation. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/numeric.test.ts` | Vitest (node) | Percent to fraction and back, exact totals, count parsing, rebalance with locks, rounding, refusals, property sum, determinism, exact-arithmetic source scan |
| `tests/engine/edit.test.ts` | Vitest (node) | Group fraction setters, raw text kept, voting mode, allow/disallow, weights, rules, majority mode, share and weight rebalance, 60/30/10 via editor operations, purity |
| `tests/ui/store.test.ts` | Vitest (node) | Lock keys, toggle, rebalance actions and refusals, locks cleared on new input, locks pruned on delete, allowlist adds `numeric` |
| `tests/ui/editor.test.tsx` | Vitest (node, render-to-string) | Rules section, group panel fractions and sliders, raw values, mode, destinations, weight totals, locks, disabled rebalance with reason, share total, ASCII digits per locale |

## Happy Path

| Behaviour | Test |
| --- | --- |
| Percent text stored exactly | `converts %j to %j exactly`; `stores %s from percent text exactly` |
| Mode, destinations, weights | `switches mode without touching destinations`; `allows a party with weight zero, once`; `sets a weight from percent text, keeping key order` |
| Rules | `sets %s from %j`; `switches to an override at a simple majority` |
| Rebalance | `rescales unlocked shares to exactly 100%`; `rescales one group's weights over its allowed parties`; `rebalances shares around a locked group to a valid scenario` |
| Editor | `shows the rules as editable values`; `lists every party as a possible destination`; `shows a valid share total of 100%` |

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test |
| --- | --- |
| Editor operations reproduce a fixture split exactly | `reproduces the 60/30/10 split through editor operations` |
| Rebalance sums to exactly 1 | `always sums to exactly 100%`; `rounds to 18 places by largest remainder, ties to the earlier row` |
| Determinism | `is deterministic`; `round-trips through percent text exactly` |
| No float arithmetic | `uses exact arithmetic only` (numeric and edit sources); engine-wide scan in `fixtures.test.ts` |

## Edge And Degenerate Cases

| Case | Test |
| --- | --- |
| Unparseable text kept raw and shown | `keeps unparseable text so validation can show it`; `shows an unparseable value as typed` |
| Disallowing a weighted party | `disallowing a party drops its weight and the total shows the gap` |
| Restricted mode across blocks | `switches mode without touching destinations` (validation code) |
| All unlocked rows zero | `splits equally when every unlocked row is zero` |
| Locked rows fill or exceed the target | `sets unlocked rows to zero when locked rows already fill the target`; `refuses when %s` |
| Refused rebalance in the store and UI | `leaves the input untouched when the engine refuses`; `marks share locks and disables rebalance when it would be refused` |
| Locks after deletes and new input | `drops locks that name a deleted entity`; `clears locks on a new input or preset` |
| Hebrew and English fields | `keeps ASCII digits in fields for %s` |

## Deliberately Not Tested

| What | Why / where |
| --- | --- |
| Typing behaviour of the percent field (local text kept while typing) | No DOM environment; M2-10 Playwright |
| Slider dragging | M2-10 Playwright |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | `npm test` | 121 failed / 557 passed | Failures from stubs and absent markup only; the numeric source scan passes; the edit purity test fails because new setters are stubs |
| 2026-10-28 | `npm run typecheck` | clean | |
| 2026-10-28 | `npm test` | 681 passed | After /3-implement; typecheck, lint, prettier check and build also clean |
| 2026-10-28 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check` (close gate) | green | 681 tests; typecheck, lint, prettier, build clean |
