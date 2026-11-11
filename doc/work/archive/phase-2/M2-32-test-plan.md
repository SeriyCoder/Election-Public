# Test Plan — M2-32 Israeli names by default

| Field | Value |
| --- | --- |
| item | M2-32 |
| memo | `doc/work/archive/phase-2/M2-32-memo.md` |
| created | 2026-10-30 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/book.test.ts` | Vitest | The suggestion and fallback of `parties.naming`, the empty-draft entities and names page, the default build with catalog IDs, colours and seats by position, an explicit own answer kept |
| `tests/ui/bookView.test.tsx` | Vitest (`preact-render-to-string`) | The default names page, question texts, review lines and pie colours with the 2022 lists; own-name placeholders and palette after choosing own names |
| `tests/ui/store.test.ts` | Vitest | The six-list confirmation leaves the suggestion `catalog`; skip and pick through the store |
| `tests/e2e/book.spec.ts` | Playwright (desktop and phone) | The naming page opens on the 2022 lists; a default walk builds with catalog IDs; a pick among own names after choosing own names |

## Happy Path

- `suggestions › suggests the catalog names and keeps own names once chosen`
  (new): the empty draft shows `catalog`, marked suggested; party IDs are the
  first four catalog lists, names empty; ten parties take all ten lists in
  seat order; an explicit `own` answer is shown, not marked suggested, and
  numbers `P1` … `P6`.
- `suggestions › shows a suggestion on every page of an empty draft`: the
  naming page shows `catalog` and the names page the four lists with empty
  typed names.
- `build › builds the first four catalog lists and four own groups from an
  empty draft` (was "four own parties"): catalog IDs, catalog colours,
  `tieBreakOrder` 1 … 4, own groups `G1` … `G4`, `parties.naming` in the
  filled list.
- `build › builds four own parties when own names are chosen` (new): a
  confirmed `own` answer gives `P1` … `P4` in palette colours and is not in the
  filled list.
- `bookView` default renders: `numbers the chapter and the group or party`
  («Еш Атид» on `compose.1`), `asks about cooperation …` («Ликуд»), the review
  lines `lists the answers by chapter …` and `marks chapters …` (the lists'
  Russian names), `colours the suggested lists by the catalog` (new),
  `shows the default name as the placeholder …` (now: default store shows
  «Ликуд», a store that chose own names shows the «Партия 1» placeholder).
- e2e `suggests the Israeli list names` (new): the «Подобрать названия из
  Израиля» choice is checked; the names page shows «Ликуд» and picks `likud`.
  `walks to the review, builds and returns with the answers`: five parties
  build as `likud`, `yesh-atid`, `religious-zionism`, `national-unity`, `shas`
  with 24 seats each.

## Seat-Calculation Correctness (mandatory when the engine is touched)

The engine is not touched (memo). The default build changes which IDs stand at
each position, so the questionnaire's own seat checks are extended:

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `build › gives the suggested catalog lists the seats own parties get in the same places` — the sum is exactly 120; the engine's exact-sum and property suites run unchanged |
| Determinism: repeated runs, JSON round trip, ru/en/he | Same test: two builds are equal and an export/import round trip gives the same seats; `builds the same scenario on every call, through a schema round trip` and the store's every-language build test run unchanged |
| Threshold below / at / above | Same test: a 5% barrier with a 6% list above it; the engine threshold suite runs unchanged |
| Exact remainder tie → tieBreakOrder → party ID | Not changed: `tieBreakOrder` stays by position (1 … N), asserted in the default build test; the engine tie suite runs unchanged |
| Fixtures from exact inputs | Same test: shares 31.5 / 24.5 / 20 / 18 / 6 of 120 seats give 38 / 29 / 24 / 22 / 7, the Hamilton result from exact quotas 37.8 / 29.4 / 24 / 21.6 / 7.2 (remainders 0.8 and 0.6 take the two left seats), and equal the own-name build seat for seat by position |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| The six-list example kept with a count other than six | `drops the six-list set to the suggestion when the count is not six` — now falls back to `catalog` and the first four lists |
| The six-list confirmation cancelled | store `asks before the six-list set changes the party count` — the shown answer stays the `catalog` suggestion |
| An unconfirmed naming at build | `uses only confirmed answers; typed but unconfirmed values take the suggestion` — keys are catalog IDs |
| The pick list opens on the shown value | `opens the list on the value shown in the field` — `likud` on the default names page, `''` on an own field |
| A typed name on a suggested list field | `bookView › shows the default name …` — typing makes the field own and clears the pick |
| Ten parties | `colours the suggested lists by the catalog`; `suggests the catalog names …` |
| Empty input / maximum size / no feasible solution | Covered by the existing questionnaire suites; no new collection or calculation |

## Tests Kept On Own Names

These tests are about own parties, own IDs or own typed names; under the new
default they would test the 2022 lists instead. Each now chooses «Придумать
свои названия» first, with no other change, and stays green:

| File | Test |
| --- | --- |
| `tests/ui/book.test.ts` | `says which group or party a page is about and where it stands` (custom cooperation and seven-party drafts); `numbers own parties and groups`; `keeps typed names through a change of the party count`; `colours catalog lists by the catalog and own parties by the palette` (ten own parties); `gives a group no party draws from a zero share and even weights`; `takes a picked list as the party, by its catalog ID and with no name`; `swaps two fields when a list taken elsewhere is picked` (own part); `suggests vote shares and compositions again when a list changes …` (cooperation part); `colours a picked list by the catalog and an own party by the palette` |
| `tests/ui/bookView.test.tsx` | `colours own parties as the build does` |
| `tests/ui/store.test.ts` | `takes a list picked from the ready values as that party` |
| `tests/e2e/book.spec.ts` | `takes a list by name and builds with it` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Group set suggestion with the 2022 lists | Unchanged and out of scope; the existing `suggests own groups for own and catalog names` covers it |
| Choice order and wording on the naming page | Out of scope (memo) |
| Editor and presets | Out of scope (memo) |
| `tests/ui/app.test.tsx`, `tests/e2e/helpers.ts` and other specs | Listed in the memo "where they do"; the probe below found no test there that depends on the default |

Test-step method: to find every test that depends on the old default, the two
`own` defaults in `src/ui/book.ts` were switched to `catalog` for one run and
then restored byte for byte from a backup (the probe; no production change
remains). It failed 24 unit tests and 2 e2e tests on both projects, and each is
handled above: changed to the new default, or kept on own names.

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-30 | Probe: `npx vitest run`; `npx playwright test` with both defaults set to `catalog`, then restored | 24 unit, 4 e2e failed | Dependency survey only; `src/ui/book.ts` restored from the backup and the offline file rebuilt |
| 2026-10-30 | `npx vitest run tests/ui/book.test.ts tests/ui/bookView.test.tsx tests/ui/store.test.ts` | red: 16 failed, 580 passed | Every failure is an assertion of the new default (`'own'` shown where `'catalog'` is expected, `P1` … where catalog IDs are expected, palette colours where catalog colours are expected); the tests kept on own names pass |
| 2026-10-30 | `npx playwright test tests/e2e/book.spec.ts` | red: 4 failed, 24 passed | `suggests the Israeli list names` (the catalog choice is not checked) and `walks to the review …` (seats keyed `P1` …), each on desktop and phone |
| 2026-10-30 | `npx vitest run` | green: 39 files, 2406 tests | The 16 red tests pass; 4 new tests in the count |
| 2026-10-30 | `npm run typecheck`; `npm run lint`; `npx prettier --check src tests` | green | — |
| 2026-10-30 | `npm run build`; `npm run test:e2e` | green: 216 passed, 36 skipped | Offline file 365.78 kB, gzip 101.74 kB (budget 450 kB) |
| 2026-10-30 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | unit 2406, e2e 216 passed / 36 skipped, 365.78 kB |
