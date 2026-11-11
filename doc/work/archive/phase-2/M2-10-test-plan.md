# Test Plan — M2-10 Playwright Layout, Accessibility And Offline Checks; 200 ms Budget

| Field | Value |
| --- | --- |
| item | M2-10 |
| memo | `doc/work/archive/phase-2/M2-10-memo.md` |
| created | 2026-10-28 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `playwright.config.ts` | Playwright | Installed Edge (`channel: 'msedge'`), `offline: true`; projects `desktop` 1280 x 800 and `phone` 360 x 740 (`isMobile`, touch) |
| `tests/e2e/helpers.ts` | Playwright | `file://` URL of `dist/elections.html`; auto fixture `problems` fails any test that makes a non-file request, logs a console error, a page error or a CSP violation; scenario loading through the real file input; download capture |
| `tests/e2e/scenarios.ts` | Playwright | Seeded 20 groups / 30 parties / 10 blocks fixture (eligible count chosen per test), long-names, hostile-text and tie fixtures |
| `tests/e2e/offline.spec.ts` | Playwright | Section 8 baseline seats in ru/en/he; inputs and results kept across a language change; language remembered after reload; coalition search in the inline worker; CSP present |
| `tests/e2e/layout.spec.ts` | Playwright | Each view x locale with long names: no page overflow, no overlap, screenshot attached; phone bottom switcher covers no content; desktop side by side; wide tables scroll inside their own region |
| `tests/e2e/a11y.spec.ts` | Playwright + axe-core | No serious or critical axe finding per view x locale; phone touch targets >= 44 x 44; keyboard Tab walk with visible focus; Enter and Space switch views |
| `tests/e2e/interaction.spec.ts` | Playwright | Percent typing keeps `50.`; slider drag; delete with repair and focus management; baseline save / reset / clear with two searches running; export then import in a second context keeps the tie result; hostile names and notes stay inert |
| `tests/e2e/performance.spec.ts` | Playwright (desktop only) | Median edit-to-seats time <= 200 ms at 20 / 30 / 10 (12 eligible); long search (30 eligible) shows progress, longest main-thread stall < 200 ms, stop and rerun; search over the limits ends Incomplete and a view switch takes < 1 s |

Command: `npm run test:e2e` (= `vite build && playwright test`). Kept out of `npm test`.

## Happy Path

- The built file opens from `file://` with the network off and shows 46 / 50 / 18 / 6 in every language — `shows the Section 8 baseline seats in every language`.
- An edit, a language switch and a reload keep the work — `keeps inputs and results when the language changes`; `remembers the chosen language after a reload`.
- Export and import reproduce the results — `export and import reproduce the results in a second session`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Engine not touched; existing suites |
| Determinism: repeated runs, JSON round trip, ru/en/he | `shows the Section 8 baseline seats in every language`; `export and import reproduce the results in a second session` (tie fixture survives the round trip) |
| Threshold below / at / above | Not touched |
| Exact remainder tie → tieBreakOrder → party ID | `export and import reproduce the results in a second session` (P1 5, P2 6 from tieBreakOrder) |
| Fixtures from exact inputs | Section 8 baseline in the built page |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `deleting a party asks for a repair and manages focus` (repair path) |
| Single element | Covered by unit suites; not repeated in the browser |
| All values equal | `export and import reproduce the results in a second session` (0.5 / 0.5 tie) |
| Maximum size | `performance at 20 groups / 30 parties / 10 blocks` (all three) |
| No feasible solution | `a search over the limits ends incomplete without freezing the page` |
| Rounding edge cases | `typing a percent keeps the typed text and updates seats` |
| Long names in three scripts and rtl | `layout › <view> in <locale> with long names fits the width` (12 per project) |
| Hostile text | `hostile names and notes stay inert text` |

## Red Evidence

First run: 34 failed / 13 skipped / 47 passed. Every failure traces to one of five product defects; no test was changed to pass.

| Defect | Failing tests | Planned fix |
| --- | --- | --- |
| D1 Phone page wider than the screen with long names: the `.app` grid has no column template, so its implicit `auto` column grows to the min-content of long names (Inputs 820 px, Seats 553–575 px on a 360 px screen). The layout viewport widens, the fixed switcher leaves the screen (bottom at 899 instead of 740), and taps land on workspace content | phone: 12 x `layout › … fits the width`; `the view switcher sits at the bottom and covers no content`; `keeps inputs and results when the language changes`; `baseline save, reset and clear …` | `grid-template-columns: minmax(0, 1fr)` on `.app`; long words wrap |
| D2 Accessible name does not start with the visible text (axe `label-content-name-mismatch`, WCAG 2.5.3): Copy vs "Duplicate: …", ru "Копия" vs "Создать копию: …", he lock "נעל" vs "נעילה: …" | desktop: 12 x `… has no serious axe findings`; phone: 3 x inputs | Labels start with the visible word, in ru, en and he |
| D3 Delete confirmation dialog does not move focus in, and does not return it on cancel or keep it in the editor after confirm | desktop and phone: `deleting a party asks for a repair and manages focus` | Focus the dialog on open; restore it to the row's delete button on cancel; to a stable editor control after confirm |
| D4 Coalition chooser labels are 90 x 24 on phone | phone: `every control in coalitions is at least 44 x 44` | `min-block-size: var(--touch)` on `.chooser__item` |
| D5 An incomplete search with 348,096 minimal winning coalitions renders every row, so the page never finishes | desktop: `a search over the limits ends incomplete without freezing the page` | Cap rendered rows with a "N more" note (i18n ru/en/he); same for Compare |

The 47 passing tests already guard behaviour that works (offline, CSP, worker, keyboard, sliders, hostile text, the 200 ms edit budget, the long search's stall limit).
The 13 skipped tests are by project: performance and desktop-only layout on phone; phone-only touch, switcher and table-scroll checks on desktop.

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Firefox and WebKit / Safari | M3 hosted link; this item uses the installed Edge only, so no browser download |
| Pixel-diff screenshots | Fonts and antialiasing differ between machines; screenshots are attached for review, the assertions are geometric |
| Chart detail popovers | Not built in M2-05; not applicable |
| Performance on the phone project | Emulated phone timing measures the desktop CPU; the budget is set on the reference machine |

## Changed Existing Tests

| Test | Change | Reason |
| --- | --- | --- |
| `tests/ui/coalitionRunner.test.ts` › `posts the analysis of the full run`, `reports progress and the finished analysis`, two in-page search tests | Expect `minimalWinningTotal` in the done message and run | D5: the worker reports how many coalitions it found |
| `tests/ui/coalitionRunner.test.ts` | New: `lists at most LISTED_COALITIONS coalitions and reports how many were found` | D5 |
| `tests/ui/coalitions.test.tsx` | New key `coalition.rowLimit` in the key list; new: `says how many coalitions were found when only the first are listed` | D5 |
| `tests/ui/compare.test.tsx` | New: `warns when a side lists only the first of its coalitions` | D5 |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | `npm run typecheck`; `npm run lint` | clean | New suite and config |
| 2026-10-28 | `npm run test:e2e` | 34 failed / 13 skipped / 47 passed | Red: defects D1–D5 above |
| 2026-10-28 | `npm run test:e2e` | 12 failed / 13 skipped / 69 passed | After D2–D5 and the `.app` column: long names still widened the phone editor (fieldset default, implicit grid columns, select width) |
| 2026-10-28 | `npx playwright test performance --repeat-each=3` | 2 failed | Long search stall 223 ms: result copy from the worker (fixed by D5 cap) and editor re-render on each progress message (fixed by memoizing the editor) |
| 2026-10-28 | `npm test`; typecheck; lint; prettier --check | green | 1021 passed |
| 2026-10-28 | `npm run test:e2e` | 81 passed / 13 skipped | Edge 155.0.4283.45; i9-13900HX, 32 GB, Windows 11 Pro; `dist/elections.html` 156.6 kB |
| 2026-10-28 | `npx playwright test performance --project=desktop --repeat-each=5`; whole suite `--repeat-each=2` | 15 passed; 162 passed / 26 skipped | Median edit-to-seats 15–17 ms at 20 / 30 / 10; long search ends in about 0.9 s with no stall over the budget |
| 2026-10-28 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check` (close gate) | green | 1021 passed; e2e 81 passed / 13 skipped |
