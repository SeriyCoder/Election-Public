# Test Plan — M2-15 Clear Saved Data

| Field | Value |
| --- | --- |
| item | M2-15 |
| memo | `doc/work/archive/phase-2/M2-15-memo.md` |
| created | 2026-10-29 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/storage.test.ts` (new) | Vitest (node) | The prefix is `elections-simulator.` and the language key is unchanged; load, save and a later save after clear; clear removes every prefixed key (three adjacent ones, so re-indexing during removal is caught) and keeps keys of other sites and near-miss keys; the whole-origin clear is never called; blocked storage, failing reads and writes and a failing removal; only `src/ui/storage.ts` mentions local or session storage or the prefix, and it never calls `.clear()` |
| `tests/ui/store.test.ts` | Vitest (node) | No notice at start; one `clear()` call gives `cleared`; no storage gives `cleared`; refusing or throwing storage gives `failed`; language, view, input, baseline, coalition selection and the derived result object stay identical; one notification; the notice drops on a view change, an input update, a preset load, a lock toggle and a language choice (which saves again); a second clear shows a fresh outcome |
| `tests/ui/app.test.tsx` | Vitest (server render) | In ru, en and he the toolbar has a `type="button"` `[data-action="clear-data"]` with the localized label, placed after the language switcher; no notice before the action; each outcome renders `p[data-storage-notice][role="status"]` with its localized text; the three strings are distinct and translated in every locale |
| `tests/e2e/offline.spec.ts` | Playwright (desktop, phone) | Choose Hebrew, add another site's key, clear: the notice is shown as a status, the page stays in Hebrew, only the other key remains, the notice goes on the next view change, and after a reload the page opens in Russian with the other key intact |
| `tests/e2e/a11y.spec.ts` (existing) | Playwright | The new button is at least 44 × 44 px, shows a visible focus indicator and passes axe in every view and locale |
| `tests/e2e/layout.spec.ts` (existing) | Playwright | The longer toolbar still wraps without page overflow on desktop and phone |

## Happy Path

- A user on a shared device clears the saved language — `clear saved data forgets the language and keeps other sites keys`.
- Only the app's keys go — `clears every app key and keeps every other key`.
- The current visit is not disturbed — `keeps the language, scenario, view, baseline and seats of this visit`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Engine not touched; existing suite |
| Determinism: repeated runs, JSON round trip, ru/en/he | `keeps the language, scenario, view, baseline and seats of this visit` (same derived object and serialized seats) |
| Threshold below / at / above | Not touched |
| Exact remainder tie → tieBreakOrder → party ID | Not touched |
| Fixtures from exact inputs | Not applicable |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input (nothing stored) | `reports cleared when nothing was stored`; `reports cleared when no storage is configured` |
| Single element | `saves the language under its key` |
| All values equal | Not applicable |
| Maximum size | Not applicable |
| No feasible solution | Not applicable |
| Rounding edge cases | Not applicable |
| Storage blocked or failing | `survives blocked storage and reports that it could not clear`; `survives failing reads and writes`; `reports a failed removal`; `reports failed when the storage cannot clear`; `survives storage that throws` |
| Neighbouring sites on the same origin | `clears every app key and keeps every other key`; the e2e test |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| A real browser with storage disabled | Playwright cannot block storage on a `file://` page portably; the adapter tests cover the throwing getter and methods |
| Notice text read aloud | `role="status"` is asserted; screen-reader output is outside automation |

## Changed Existing Tests

| Test | Change | Reason |
| --- | --- | --- |
| `memoryStorage()` in `store.test.ts` | Moved to file scope; gains `clear()` with a call count and a chosen result | The storage contract gains `clear()`; the new describe block shares the helper |
| `survives storage that throws` | Its storage also throws from `clear()`; the test then expects `failed` | The contract gains `clear()` |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-29 | `npx vitest run` | 17 failed / 1078 passed; `storage.test.ts` fails to load | No `src/ui/storage.ts`, no `clearSavedData`, no `storageNotice`, no toolbar button or i18n keys |
| 2026-10-29 | `npx playwright test tests/e2e/offline.spec.ts` | 2 failed / 10 passed | The new test (desktop, phone) times out clicking `[data-action="clear-data"]` |
| 2026-10-29 | `npm test`; typecheck; lint | 1141 passed; clean | After `src/ui/storage.ts` (prefix-only clear), `main.tsx` using it, `clearSavedData` and `storageNotice` in the store, the toolbar button and status line, styles and three i18n keys |
| 2026-10-29 | `npx playwright test` offline, a11y, layout | 69 passed / 9 skipped | New clear test passes on desktop and phone; the button passes the 44 px, focus and axe checks; the toolbar wraps without overflow. Toolbar screenshots (ru, en, he; desktop, phone) checked by eye |
| 2026-10-29 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 1141 passed; e2e 92 passed / 14 skipped |
