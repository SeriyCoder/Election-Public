# Test Plan — M2-29 Editor in pages

| Field | Value |
| --- | --- |
| item | M2-29 |
| memo | `doc/work/archive/phase-2/M2-29-memo.md` |
| created | 2026-10-30 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/editorPages.test.ts` | Vitest | New: the page list (scenario, a page per group in stored order, parties, blocks, coalition rules); kinds and group IDs; the Israeli example; the order after a move; the empty `groups` page; 20 groups give 24 distinct pages; `groupPageKey` and `FIRST_PAGE`; the resolver (listed key, deleted middle group, deleted last group, no group left, `groups` gone once groups exist, stale group position clamped, unknown key); no interface text in the module |
| `tests/ui/store.test.ts` | Vitest | Opens at `FIRST_PAGE`; `setEditorPage` records key and position; an unlisted key is ignored; turning pages leaves the input (same object), the derived result and a direct engine run unchanged; the page survives a language change and an edit; a moved group keeps its page; a deleted group falls to its successor, its predecessor or the `groups` page; page 1 after a loaded preset, a confirmed preset, an import and a questionnaire build (direct and confirmed); a refused import keeps the page; no page is written into the scenario |
| `tests/ui/editor.test.tsx` | Vitest | The eight new Russian strings exist; the pager markup (`data-editor-pager`, `data-page`, the title "Страница n из N · title" with `tabindex="-1"`, Back and Next adjacent and disabled at the ends, the page select with "n. title" options and the current page selected); page 1 shows scenario and rules only; a group page shows only its row with the share total and the add button; the parties and blocks pages; the group-picture note above the mode switch; the empty `groups` page; the issue list above the pager; hostile group names inert in the title and options; no pager for non-editable input; counter and labels in ru, en and he |
| `tests/e2e/editorPages.spec.ts` | Playwright | New: Back and Next turn pages, the title reads "Страница 1 из 8 · Сценарий и правила", focus goes to the title, other rows are hidden, the note shows; the select jumps and Next stops at the last page; Back and Next sit side by side; adding a group opens `group:G5` ("Страница 6 из 9"); desktop: the editor column has `overflow-y: auto`, fits the viewport, keeps the pager on top while it scrolls and stays in view while the window scrolls; a page turn scrolls the column to its top |
| `tests/e2e/helpers.ts` | Playwright | New `openEditorPage(page, key)`: selects the page and waits for `data-page` |
| `tests/e2e/interaction.spec.ts`, `israel.spec.ts`, `performance.spec.ts`, `offline.spec.ts`, `future.spec.ts` | Playwright | Existing flows turn to the page of the row they edit (`group:G3`, `group:G1`, `group:A`, `parties`, `blocks`) before a visible interaction; assertions unchanged |

## Happy Path

- The editor opens on "Страница 1 из 8 · Сценарий и правила" with Back
  disabled; Next shows group 1 alone with the picture-of-the-world note; the
  select jumps to "Блоки"; Next reaches "Правила коалиций" and stops.
- On desktop the left column scrolls by itself under a pinned pager while the
  results stay beside it.

## Seat-Calculation Correctness (mandatory when the engine is touched)

Not mandatory: M2-29 changes no file in `src/engine/` and no stored field. The
page is UI state outside the scenario. One check stands in for the category:

| Check | Test name |
| --- | --- |
| Navigation cannot change input or seats | store `leaves the input and the seats untouched while turning pages` (same input object, same derived result, byte-identical direct run) |
| Page never reaches the scenario | store `writes no page into the scenario` |
| Determinism across languages | store `keeps the page across a language change and an edit`; existing seat tests unchanged |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `shows one empty groups page when there are no groups`; editor `shows the empty groups page when there are no groups`; `shows no pager for input the editor cannot edit` |
| Single element | `shows the empty groups page when every group is deleted` walks down to one group and then none |
| All values equal | Not applicable: no values are compared |
| Maximum size (20 groups) | `lists a page for each of the maximum number of groups` (24 distinct keys); the performance e2e edits group 1 of 20 on its page |
| No feasible solution | `falls back to the first page for a key it does not know`; `keeps a stale group position inside the group pages`; `ignores a page that is not listed` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| English and Hebrew wording of the new strings | Reviewed as a whole in M3-05; the tests require the keys, the counter in each language and the missing-key test |
| Focus after delete and after Back/Next on the phone | The desktop e2e pins focus on the title; the phone layout uses the same component |
| Scroll position of the window on the phone | The phone keeps page scroll by design; only desktop gets the column scroll |
| `setInput` and `resetToBaseline` page reset | The memo keeps the page there and relies on the resolver, which the resolver tests cover |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-30 | `npx vitest run`; `npm run typecheck`; `npm run lint`; `npx prettier --check src tests` | red: 50 failed, 2243 passed of 2293; typecheck, lint, format clean | All for the intended reason: the `editorPages.ts` stub lists no pages and resolves to 0; the store's `setEditorPage` is a no-op; no pager markup ("missing tag data-editor-pager", "missing page title"); the eight strings are missing. No ReferenceError; the one TypeError is `toMatch` on a missing string |
| 2026-10-30 | `npx playwright test tests/e2e/editorPages.spec.ts --project=desktop -g "Back and Next turn"` (on the M2-28 build) | red: 1 failed | Waits for `[data-editor-pager]`, which the build does not have. The full e2e run is left for `/3-implement`, after the build |
| 2026-10-30 | `npx vitest run`; `npm run typecheck`; `npm run lint`; `npx prettier --check src tests` | green: 2293 of 2293; typecheck, lint, format clean | One test narrowed to its target: "marks the current page in the page select" now reads only the page select's options (it had scanned every select in the editor); the assertion is unchanged. Recorded in the memo's Deviations |
| 2026-10-30 | `npm run build`; `npm run test:e2e` | green: 192 passed, 32 skipped (project-scoped); offline file 347.54 kB | Earlier runs: 11 phone failures, fixed in CSS. The page select's longest option widened the phone page, and the sticky pager covered the fixed view switcher; the pager now sticks on desktop only. Then twice 1 failed and 191 passed: the desktop "a long coalition search … keeps input free" stall check under full parallel load. Alone it measured 6–7 ms against the 200 ms budget, the same with the pre-M2-29 region CSS, and passed 9 of 9 repeats. Screenshots at 1280 × 800 and 360 × 740 checked |
| 2026-10-30 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 2293 of 2293 unit; typecheck, lint, format clean; e2e 192 passed, 32 skipped on the first run |
