# Test Plan — M2-06 Coalition View In A Cancellable Worker, With Coalition Pair Editing

| Field | Value |
| --- | --- |
| item | M2-06 |
| memo | `doc/work/archive/phase-2/M2-06-memo.md` |
| created | 2026-10-28 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/run.test.ts` | Vitest (node) | Seats-only run equals the full run minus coalitions; key order; determinism; JSON round trip; serialization prefix |
| `tests/engine/coalitions.test.ts` | Vitest (node) | Progress callback: interval constant, multiples of 20,000, unchanged result, silent below the interval and without allocation |
| `tests/engine/edit.test.ts` | Vitest (node) | `addPair` / `removePair`: persisted order, self, duplicate, reversed duplicate, override/explicit conflicts, unknown IDs, wrong kind, limit, out-of-range index, purity |
| `tests/ui/store.test.ts` | Vitest (node) | Derived result has no coalitions; pair actions return true/false; refused edits do not notify; selection toggling, pruning and clearing |
| `tests/ui/coalitionRunner.test.ts` | Vitest (node, fake worker, manual clock) | Worker body; debounce; progress; done; stale messages; cancel; rerun; failure; invalid scenario; in-page fallback; dispose; store connection |
| `tests/ui/coalitions.test.tsx` | Vitest (node, render-to-string) | Message keys in ru/en/he; idle, running, cancelled, failed and in-page states; summary; minimal winning table; balancing; forbidden pairs; no-allocation; chooser and evaluation; App panel |
| `tests/ui/editor.test.tsx` | Vitest (node, render-to-string) | Coalition rules section: pair lists, selects, remove/add/allow buttons, effective pairs with source, invalid scenario |
| `tests/ui/app.test.tsx` | Vitest (node, render-to-string) | Coalitions placeholder removed from every locale; compare keeps its placeholder |

## Happy Path

- Section 8 scenario (P3 ineligible, pair P1|P2): deadlock, forbidden P1|P2 from the party list, no minimal winning coalition — `shows a deadlock with its forbidden pair and no winners`.
- Same scenario with every party eligible: minimal winning P2+P3 (68) and P1+P3 (64), P3 balancing — `lists minimal winning coalitions and the balancing party`.
- The runner debounces, posts one request, reports progress and ends with the engine's analysis — `reports progress and the finished analysis`.
- Pairs are added and removed through the store — `adds and removes pairs through the engine edits`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `matches the full run without coalitions (group 3 turnout %s)` (seats-only allocation equals the full run; the sum property stays in `allocate.test.ts`) |
| Determinism: repeated runs, JSON round trip, ru/en/he | `serializes identically across runs and after a JSON round trip`; `%s gives the same result in every language` (store) |
| Threshold below / at / above | Unchanged; covered in `threshold.test.ts`; the seats-only run reuses the same pipeline (`matches the full run without coalitions`) |
| Exact remainder tie → tieBreakOrder → party ID | Unchanged; covered in `allocate.test.ts` |
| Fixtures from exact inputs | Section 8 fixture in `run.test.ts` and `coalitions.test.tsx` |
| Coalition result unchanged by progress reporting | `reports multiples of the interval without changing the result` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `shows no coalition view for an invalid scenario`; `sends null for an invalid scenario`; `hides the effective list for an invalid scenario` |
| Single element | `refuses a self pair` |
| All values equal | `reports multiples of the interval without changing the result` (24 equal parties) |
| Maximum size | `refuses a pair beyond the list limit`; `explains an incomplete search with too many eligible parties` |
| No feasible solution | `shows a deadlock with its forbidden pair and no winners`; `hides winners and the chooser when there is no allocation`; `does not report when there is no allocation` |
| Rounding edge cases | Not applicable: coalition values are integers |
| Search incomplete | `explains an incomplete search stopped by the budget` |
| Worker unavailable | `searches in the page with %s` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| A real Web Worker and the inline worker bundle | No worker in the node runner; the worker body is tested as `runCoalitionRequest`; M2-10 Playwright checks the worker in a browser |
| Real timers for the 300 ms debounce | The schedule is injected; the constant is asserted |
| Event handlers wired to buttons and selects | Render-to-string has no events; handlers call store/runner methods tested directly; M2-10 covers clicks |

## Changed Existing Tests

| Test | Change | Reason |
| --- | --- | --- |
| `tests/ui/store.test.ts` — `directRun` | Uses `runSeats` | The store derives seats only; the search runs in the worker (memo) |
| `tests/ui/store.test.ts` — baseline deadlock check | Reads `runScenario(...).coalitions` | Same reason |
| `tests/ui/store.test.ts` — engine allowlist | Adds `coalitions` | The coalitions view calls `evaluateCoalition` and `effectiveForbiddenPairs` |
| `tests/ui/app.test.tsx` — required keys | `placeholder.coalitions` no longer required | The coalitions panel now shows the view |
| `tests/ui/app.test.tsx` — placeholder test | Compare only; new test that the coalitions placeholder is gone | Same reason |
| `tests/ui/editor.test.tsx` — section list | Adds `coalition-rules` | Memo decision 4 |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | `npm test` | 83 failed / 766 passed | Failures: `not implemented` from the `runSeats`, `addPair`, `removePair`, store and runner stubs; the progress test receives no calls; the coalitions view renders nothing; missing message keys and editor section |
| 2026-10-28 | `npm run typecheck`; `npm run lint` | clean | |
| 2026-10-28 | `npm test` | 855 passed | After /3-implement; typecheck, lint, prettier check (src, tests, css) and build clean; one test defect fixed (escaped `+`, see memo Deviations); browser smoke on `dist/index.html` from `file://`: worker search, deadlock summary, chooser evaluation |
| 2026-10-28 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check` (close gate) | green | 855 passed; typecheck, lint, prettier and build clean |
