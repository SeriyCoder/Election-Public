# Test Plan — M2-25 Questionnaire First-Review Corrections

| Field | Value |
| --- | --- |
| item | M2-25 |
| memo | `doc/work/archive/phase-2/M2-25-memo.md` |
| created | 2026-10-30 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/book.test.ts` | Vitest (node) | Page list with `parties.names`, the lessons `people.about` and `people.mix`, then `people.set`; one names page whatever the count; `BOOK_LIMITS.namesPerPage` 8; names specs list every entity, no step line; names texts are pick / name pairs (`pairs`, `picked` helpers); names parts slot-balanced with cap 8 (four parties one part of indices 0–7, ten parties 0–9 and 10–19); the length error points at the name text (odd index). New `lessons`: placed after the party names and before the group set, chapter 2, kind `lesson`, motif `people`, no fields or choices, inert (`editPage` and `confirmPage` return the same draft, never answered, no error, narration or remainder, one empty part), never filled automatically. New `group mix example`: Likud and Ra'am in that order, shares equal to the engine composition report of `israelExample` on valid votes (Likud 6 groups, top «traditional» 43.27; Ra'am 2 groups, top «arab» 97.83). New `names with picks`: default picks per naming, pick clears the name, swap on a taken list, «own» and a typed name clear the pick, invalid picks ignored, stale or duplicate picks resolved (default if free, else first free list in seat order, else own), unique IDs, preferences and coalitions reset when lists change, Section 14.4 preference rows only for the six example lists in table order. New `build with picks`: the six lists picked one by one build `israelExample` (seats 31 / 30 / 12 / 15 / 18 / 14) deterministically; catalog colour for a picked list, palette for own parties; picked and own group IDs. New `ready values`: option values and notes for every field kind, the rest option (`percentRemainder` of the other fields, only between 0 and 100), names options by kind, nothing on other pages or indices, every option passes `partError`, the rest option completes the page to exactly 100, `chosenPick` compares exact counts and percents (`3,250` → `3.25`, `-0,50` → `-0.5`) |
| `tests/ui/store.test.ts` | Vitest (node) | New `questionnaire lessons and names`: Next and Back pass the lessons without changing the draft or recording answers; Back from `people.about` lands on the names page; typing on a lesson is ignored; Skip from a lesson builds only what was answered (nothing answered → the editor opens unchanged, nothing listed); ten names in two parts, a long name on part 0 stops it; a list picked through `answerBook` builds as that party; six picked lists plus the example groups give the Israeli example seats and identical input in ru, en and he. Amended: names page keys, review parts with pairs, restart answered list |
| `tests/ui/bookView.test.tsx` | Vitest (node) | Amended: own field placeholder «Партия 1», picked field shows «Ликуд» with its description, a typed name clears the pick; review parts with ten long typed names. New `questionnaire navigation bar`: Skip, Restart (when shown), Back, Next / Build in that order on every page, Skip before the facts return. New `example disclosure`: «Пример» is a `details` summary with one sentence per page kind (names, choice, value, review), in every language. New `names page`: eight names on one part with eight lists, no range line; ten names in two parts with «Названия 1–5 из 10», the cue «Ещё 5 — после «Далее»» and «Названия 6–10 из 10»; list options «Своё название», «{list} — {description}», «Ликуд (поле 1)» for a taken list; group lists offer the six example groups. New `ready values`: a list beside every typed field and none on choices, coalitions, lessons, the opening or the review; labels for seats («120 — как в Кнессете»), threshold («3,25% — израильский барьер»), counts, turnout, growth («% в год»), turnout change («п. п. в год»), the rest option «Остаток до 100%: 25%» first, the row name in the list's label; every label in every language. New `lessons`: both lessons in ru, en and he without raw keys, five points on the first, two lists and eight bars with the engine percents on the second, no fields, lists or examples; the review's «Изменить» for chapter 2 opens `people.set` |
| `tests/ui/app.test.tsx` | Vitest (node) | Amended: the auto-filled list test walks to `parties.names` |
| `tests/engine/composition.test.ts` | Vitest (node) | New `vote sources`: only groups with a positive share, in scenario order, and the largest exact share; a zero group left out; no supporters gives no rows and no largest; a tie gives the first group (Amendment 2) |
| `tests/e2e/book.spec.ts` | Playwright | Amended: six lists stop on `parties.names`. New: axe on both lessons with eight bars; a value picked from the list fills the field and a typed value selects its option; a list picked by name shows «ШАС», a typed name clears its pick, the skip builds `shas` with `P2`–`P4`; Back and Next adjacent with Skip apart; a click on «Пример» opens its sentence |
| `tests/e2e/bookFit.spec.ts` | Playwright, desktop project | The heavy walk fills each names part (60-character names, eight own groups on one part) and must see `parties.names#1`, both lessons and no second group-names part; the catalog walk sees `parties.names#1`; every page and part fits the six Section 14.6 sizes with the lists and lessons |
| `tests/e2e/helpers.ts` | Playwright | Unchanged: `nextTo` passes the lessons with Next |

## Happy Path

- A learner chooses six parties and sees all six names on one page, picking
  lists from ▾ — `shows up to eight names at once, each with its list` and
  `takes a list by name and builds with it` (e2e).
- A learner with ten parties sees which names are on this part and that more
  follow — `shows ten names in two parts with the range and a cue for the rest`.
- A learner reads what a voter group is and where Likud and Ra'am get their
  votes before choosing groups — `explain what a voter group is, in Russian`,
  `show where Likud and Ra'am get their votes, from the engine`.
- A learner fills any number from the list instead of typing —
  `fills a field from its list and keeps typing open` (e2e) and
  `puts a list beside every typed field and none on choices, coalitions, lessons, the opening or the review`.
- A learner clicks «Пример» and reads what it means —
  `opens the example note on a click` (e2e).

## Seat-Calculation Correctness (mandatory when the engine is touched)

The engine is not touched; the build path receives new IDs and names. These
tests pin that seats stay correct and deterministic:

| Property | Test name |
| --- | --- |
| Six lists picked one by one build exactly the Israeli example, seats 31 / 30 / 12 / 15 / 18 / 14 | `gives the Israeli example from the six lists picked one by one` (book), `builds the six picked example lists the same under every language` (store) |
| Same answers, same input and seats in ru, en and he | `builds the six picked example lists the same under every language` |
| Same draft built twice gives equal input (determinism, purity) | `gives the Israeli example from the six lists picked one by one` |
| IDs unique, so tie order (field position) is unambiguous | `reads a stale or repeated pick as the default of its field, else the first free list`, `swaps two fields when a list taken elsewhere is picked` |
| The rest option is exact: the page sums to exactly 100 | `completes the page to exactly 100 with the rest option` |
| The lesson numbers are the engine's, not recomputed | `takes where Likud and Ra'am get their valid votes from the engine` |
| Vote sources: positive shares only, largest by exact comparison, first on a tie | `vote sources` (composition) |
| `book.ts` stays language-free and free of floating point | the existing `book source` scan (no Math, Number(, parseFloat, parseInt, toFixed, toPrecision; no i18n or preact import) |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | Empty names give default IDs and grey names (`keeps a pick and a typed name for every field`); an empty field with «Своё название» stays own |
| Single element | One own group: the group names page has one field and one list (`offers the six example groups for own group names` covers the list; `asks every name on one page, whatever the count` covers counts 2 to 10) |
| All values equal | Equal shares: the rest option is offered and completes to 100 (`offers the rest to 100 first, then whole fives, on shares and preferences`) |
| Maximum size (20 / 30 / 10) | Ten parties, eight groups, 60-character names: two names parts, one group-names part, heavy fit walk at six sizes |
| No feasible solution | Not applicable: no search or allocation changes |
| Prototype keys | A pick of `__proto__` or `constructor` is ignored (`ignores a pick that is not a list or a group of the page`) |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| How the lesson bars look | A test cannot judge a picture; structure, colours by group and fit are pinned |
| English and Hebrew wording of the new strings | Presence is checked in every language; review is M3-05 |
| Native select popup rendering per browser | The browser draws it; the value flow is pinned by the e2e pick tests |
| Ready lists in the editor | Out of scope, M6-06 |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-30 | `npx vitest run --reporter=json`; `npm run typecheck`; `npm run lint`; `npx prettier --check` | red: 2018 passed, 69 failed of 2087; typecheck, lint and format clean | Expected: `fieldPicks` and `groupMixExample` return empty lists, `chosenPick` returns `''`, the names sections are still indexed pages of four with one text per name, the lessons are not in the page list (`stuck at review` for walks that look for them), the nav keeps Back first, «Пример» is a span. book 35, view 19, store 14, app 1. A temporary engine run confirmed Likud 6 groups, traditional 43.27%, and Ra'am 2 groups, arab 97.83% |
| 2026-10-30 | `npx vitest run --reporter=json`; `npm run typecheck`; `npm run lint`; `npx prettier --check`; `npx vite build`; `npm run test:e2e` | green: 2091 of 2091; typecheck, lint and format clean; browser suite 182 passed, 30 skipped (project-scoped); offline file 324.61 kB | The four new engine tests account for the 2087 → 2091 change. Fixes on the way: the phone bar split Back from Next (now one wrapper); one 1024 × 576 catalog part was 4 px tall (range lines at 14 px) |
| 2026-10-30 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 2091 unit passed; e2e 182 passed / 30 skipped; offline file 324.61 kB |

## Amendments

| Date | Change | Reason |
| --- | --- | --- |
| 2026-10-30 | `tests/ui/bookView.test.tsx`, `example disclosure`: each page is reached in a fresh book with every branch open, so the page itself is unconfirmed. The expectations are unchanged | `everyPage` reaches pages with Next, which confirms every earlier page. Only the coalition pages and the review still showed the example, so the test could not see the names and value sentences it asserts |
| 2026-10-30 | `tests/engine/composition.test.ts`: new `vote sources` block, 4 tests | The lesson's exact share comparison moved into the engine (memo Deviation 1) |