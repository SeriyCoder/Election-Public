# Test Plan — M2-24 Visual World And Page Fit

| Field | Value |
| --- | --- |
| item | M2-24 |
| memo | `doc/work/archive/phase-2/M2-24-memo.md` |
| created | 2026-10-30 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/book.test.ts` | Vitest (node) | `EMPTY_BOOK.part` is 0; `BOOK_LIMITS` gains `namesPerPage` 4, `nameLength` 60, `partRows` 4 and a positive whole `reviewLines`; names four to a page (ten parties give three names pages, five give two, four give one); names kept by position and through a change of the party count with four per page; 60 characters accepted (Cyrillic too), 61 refused with `length` and max `60`. New `page parts`: one part for every single-field, choice, intro and names page; balanced percents parts of at most four rows, larger parts first (5 → 3 + 2, 6 → 3 + 3, 7 → 4 + 3, 10 → 4 + 3 + 3, eight groups → 4 + 4, one group → one part); a property loop over 2 to 10 parties for preferences and every coalition page (every row once, in order, the own column left out, ceil(rows / 4) parts, sizes one apart); coalition rows with "may join a government" first; `partError` reports range and choice errors of its own fields only, never the sum, `null` outside the parts, and equals `pageError` on single-part pages. New `review parts`: chapters 1 to 7 once, in order, in non-empty parts, `partCount` equal to the number of parts; greedy packing against `reviewLines`; `reviewSize` a positive whole number, larger for longer typed names in chapters 1, 2 and 4, equal for catalog and untyped own names, independent of names in chapters 3, 5, 6 and 7; ten long names give more review parts than the light book |
| `tests/ui/store.test.ts` | Vitest (node) | New `questionnaire parts`: Next walks `prefs.0#0` → `#1` → `prefs.1#0` and marks the page answered only after its last part; a wrong value stops its own part with `attempted`, the sum error stays on the last part; a wrong value in an earlier part sends Next from the last part back to that part; Back goes through the parts and to the last part of the previous page, down to `people.set#0`; `bookGoTo` and starting again land on part 0; the facts page keeps the part; the review is walked in parts with ten 60-character names, Next stops on the last part and the build works; skip from part 1 builds the whole page |
| `tests/ui/bookView.test.tsx` | Vitest (node) | Every page: Build only on the last review part, Next otherwise; the review chapters and edit buttons and the "Пример" marks collected over all review parts. New `questionnaire parts`: only the rows of the current part, `data-part` on the book, "Часть n из m" beside "Группа n из N", no part line on one-part pages, the remainder of the whole page on every part, the error and `aria-invalid` on the part that holds the wrong value, coalition parts with "may join a government" first, the review in parts with Build on the last. New `questionnaire drawings`: an inline SVG motif named by the page on every page, `aria-hidden` and not focusable; palms only on the opening and review pages; both coin sides on the facts page; the five example captions start with "Пример: " and show 100 / 40 / 40%, 10 / 7 / 70%, 1 000 / 1 020 / 2%, 70% / 71% and the threshold line; drawing and caption unchanged by the answers. New `questionnaire dialog`: the confirmation is an `alertdialog` with `aria-modal`, head, body and navigation inert while it is open and not after. New languages check: the part line and every caption in ru, en, he without a raw key |
| `tests/ui/motifs.test.tsx` (new) | Vitest (node) | `MOTIF_NAMES` equals the ten `Motif` values; each `MotifArt` is an `<svg>` with a view box, `aria-hidden`, `focusable="false"`, no role, no text, image, foreign object, script, style, link, `href`, `url(`, event handler, `tabindex` or title, no party palette colour, the same markup on every render, a different drawing per motif; the coin has one lily side and one "1" side; `Palms` draws a start and an end palm under the same rules |
| `tests/build/offline.test.ts` | Vitest (node) | Size budget 350 kB instead of 300 kB |
| `tests/e2e/helpers.ts` | Playwright | Shared `book`, `openBook`, `bookAt` (`page#part`), part-aware `next` and `back`, `nextTo` and `toBuild` (walk the review parts to the build button) |
| `tests/e2e/book.spec.ts` | Playwright | Uses the shared helpers; walks the review parts before Build and goes back to the part with chapter 1 after the return |
| `tests/e2e/bookFit.spec.ts` (new) | Playwright, desktop project | At 1280 × 720, 1366 × 768, 1440 × 900 at scale 1 and 1024 × 576, 1092 × 614, 1152 × 720 at scale 1.25: a heavy walk (ten parties and eight own groups, every name 60 characters, growth, turnout change and custom coalitions, a percent error on a part, a sum error, the narrator and the facts page) and a catalog walk (ten catalog lists, the six-list confirmation, the narrator and facts) check every page and part plus the restart confirmation: no page scroll in either direction, every control inside the window, nothing under the drawing, no element with `overflow` auto, scroll, hidden or clip, no text under 14 px. Motion: after each page turn the drawing animates, every animation ends within 2 s and repeats at most twice, Back, Next and Skip are enabled at once, the coin animates on the facts page; under reduced motion nothing in the book animates and the drawing is fully opaque |

## Happy Path

- A learner on a laptop at 125% opens the book and turns every page without
  scrolling — `fits every page with ten long names and eight own groups` and
  `fits every page with ten catalog lists` (e2e).
- The learner fills six-list preferences in two parts and turns the page —
  `walks the parts of a dense page before turning it` and
  `shows only the rows of the current part, with the part line`.
- The learner reads the example captions beside the drawings —
  `captions the example drawings with fixed numbers marked as an example` and
  `draws a decorative picture on every page`.
- The learner checks the answers over several review parts and builds —
  `walks the review parts, then stops for the build` and
  `walks to the review, builds and returns with the answers` (e2e).

## Seat-Calculation Correctness (mandatory when the engine is touched)

Not applicable: the engine is not touched (memo, Seat-Calculation
Correctness). The build path is unchanged; the tests that pin the questionnaire
build against the editor and the Israeli example seats 31 / 30 / 12 / 15 / 18 /
14 keep running unchanged, and `skips from any part with the whole page` checks
that parts never change what is built.

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `shows a short page as one part with all its fields` (empty draft); the review of an untyped book in `shows every review chapter once, in order` |
| Single element | One own group gives one shares part; one-part pages show no part line (`shows no part line on a page with one part`) |
| All values equal | Even splits keep part sizes one apart (`keeps every row once, in order, with part sizes one apart`) |
| Maximum size (20 / 30 / 10) | Ten parties, eight groups, 60-character names: `cuts preferences and shares into balanced parts of at most four rows`, `estimates longer chapters for longer typed names only`, the heavy fit walk at six sizes |
| No feasible solution | Not applicable: no search or allocation changes |
| Prototype keys | Not applicable: page keys come from the page list; parts are numbers checked by `partError` returning `null` outside the range |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| How the drawings look | A test cannot judge a picture; the unit tests pin structure, decoration and safety, and the fit check pins placement |
| Page fit below 1024 × 576 CSS pixels and on the phone project | Section 14.6 allows scrolling there with the navigation in the flow; existing phone layout tests keep running |
| English and Hebrew caption wording | Presence is checked in every language; review is M3-05 |
| Exact review packing constants | They are tuned in `/3-implement` against the browser check; the unit tests pin the packing rule, not the numbers |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-30 | `npx vitest run --reporter=json`; `npm run typecheck`; `npm run lint`; `npx prettier --check` | red: 1984 passed, 52 failed of 2036; typecheck, lint and format clean | Expected: the part functions throw "M2-24: not implemented", `partCount` returns 1, `BOOK_LIMITS` keeps five names per page and 200 characters with zero part and review constants, `motifs.tsx` draws nothing, the view has no parts, drawings, captions or dialog. The six updated `book.test.ts` tests fail on the four-name pages and the 60-character limit. No other earlier test fails |
| 2026-10-30 | `npm run test:e2e` | red: 13 failed, 159 passed, 30 skipped by design; `dist/elections.html` 294.17 kB | Expected: all 12 fit walks fail (12.8 px "Пример" mark from the first choice page; 598 px page height in a 576 px window at 1280 × 720 at 125%), and the motion test finds no animation. The reduced-motion guard passes: nothing animates yet. `book.spec.ts` passes with the shared helpers |
| 2026-10-30 | `npx vitest run --reporter=json`; `npm run typecheck`; `npm run lint`; `npx prettier --check` | green: 2036 passed of 2036; typecheck, lint and format clean | After the implementation and the amendment below |
| 2026-10-30 | `npx vite build`; `npx playwright test tests/e2e/bookFit.spec.ts --project=desktop` | first 3 failed, 11 passed; then 14 passed | The first run overflowed only review parts at 1024 × 576 and 1092 × 614 (15 to 105 px); fixed by the review layout recorded as a memo deviation |
| 2026-10-30 | `npm run test:e2e` | green: 172 passed, 30 skipped by design; `dist/elections.html` 307.90 kB of the 350 kB budget | Desktop and phone, msedge, offline |
| 2026-10-30 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | unit 2036 of 2036; fit spec 14 of 14; e2e 172 passed, 30 skipped by design; dist/elections.html 307.90 kB of 350 kB |

## Amendments

| Date | Change | Reason |
| --- | --- | --- |
| 2026-10-30 | `tests/ui/bookView.test.tsx`, "names the six lists and the example groups from the catalog" (M2-23): ШАС is checked on the second part of `prefs.0` | The approved four-row parts put the fifth list on part 2; the test's intent (catalog names and example values) is unchanged |
| 2026-10-30 | `tests/e2e/bookFit.spec.ts`, motion test: Back twice to `parties.count` before opening the facts page | Test bug: after three turns the page is `parties.names.0`, which has no facts button |
| 2026-10-30 | `tests/e2e/bookFit.spec.ts`, `expectFit` uses `expect.soft` | One walk reports every misfit instead of stopping at the first; the expectations are unchanged |
