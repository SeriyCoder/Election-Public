# Test Plan — M2-01 Preact App Shell, State Store, Phone/Desktop Layout

| Field | Value |
| --- | --- |
| item | M2-01 |
| memo | `doc/work/archive/phase-2/M2-01-memo.md` |
| created | 2026-10-28 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/store.test.ts` | Vitest (node) | Baseline preset, store state and actions, derived validation and result, caching, determinism, subscriptions, static scan of `src/ui` and `src/i18n` |
| `tests/ui/app.test.tsx` | Vitest (node) with `preact-render-to-string` | Russian table and lookup, shell regions, view switcher, active view, results panel per view, status line per validity state, name escaping |

## Happy Path

- The default store holds the Section 8 baseline; seats 46 / 50 / 18 / 6; coalition status deadlock.
- Switching views changes only the view; the derived result object is reused.
- The shell renders toolbar, editor and results regions, four navigation entries and an allocated-seats status line.

## Seat-Calculation Correctness (mandatory when the engine is touched)

The engine is not changed; the UI feeds it, so determinism and the absence of UI arithmetic are tested.

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Engine suite (unchanged); store reproduces `is the Section 8 baseline: 46 / 50 / 18 / 6 and a deadlock` |
| Determinism: repeated runs, JSON round trip, ru/en/he | `serializes byte-identically to a direct engine run`, `is identical after a JSON round trip of the input`, `is identical across repeated stores`; ru/en/he deferred to M2-02 |
| Threshold below / at / above | Engine suite (unchanged) |
| Exact remainder tie → tieBreakOrder → party ID | Engine suite (unchanged) |
| Fixtures from exact inputs | Baseline preset test; UI performs no arithmetic: `imports only run and schema from the engine`, `uses no float or locale APIs` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `withholds the result for input that is not an object`, `shows a fallback title when the input has no usable name` |
| Single element | Not applicable to the shell; covered by engine and M2-03 editor tests |
| All values equal | Not applicable to the shell |
| Maximum size (20 / 30 / 10) | Deferred to M2-10 (200 ms budget) |
| No feasible solution | `reports a no-allocation result instead of withholding it`, `reports the no-allocation reason`; deadlock in the baseline test |
| Invalid edit preserved | `keeps an invalid edit exactly and withholds the result`, `restores the result once the input is valid again` |
| Stale result after edit | `recomputes only when the input identity changes`, `reports the issue count and withholds results for invalid input` |
| Markup in user text | `escapes markup in the scenario name` |
| Unknown string key | `returns the key itself for an unknown key` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| CSS layout at phone and desktop widths, touch target sizes | Needs a real browser; M2-10 Playwright |
| Click handling and the `useStore` hook in a live DOM | No DOM emulator by decision (memo Q1); M2-10 Playwright |
| `index.html`, `src/main.tsx`, `dev`/`build` scripts | Exercised by the build in `/3-implement` and by M2-09 |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | `npm test` | 30 failed / 285 passed | All 30 new failures come from stubs: `createStore: not implemented` (17), `baselineInput: not implemented` (6), `t: not implemented` (2), empty `ru` table (1), empty `VIEWS` (1) and app tests depending on them. The 10 static-scan guards pass by design. `it.each(VIEWS)` tests appear once `VIEWS` is filled. Engine suite 274 still green |
| 2026-10-28 | `npm run typecheck`; `npm run lint` | clean | JSX for Preact, `.tsx` includes, browser globals for `src/` configured |
| 2026-10-28 | `npm test` | 325 passed | 51 UI tests (including the per-view cases now that `VIEWS` is filled) plus 274 engine tests |
| 2026-10-28 | `npm run typecheck`; `npm run lint`; `prettier --check` | clean | |
| 2026-10-28 | `npm run build` | ok | `dist/index.html` 40.5 kB single file; opened from `file://`, view switching works |
| 2026-10-28 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check` (close gate) | green | 325 tests; build ok |
