# Test Plan — M2-22 Israeli Educational Example And The 2022 List Catalog

| Field | Value |
| --- | --- |
| item | M2-22 |
| memo | `doc/work/archive/phase-2/M2-22-memo.md` |
| created | 2026-10-30 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/catalog.test.ts` (new) | Vitest (node) | `CATALOG_YEAR` 2022; six groups with the Section 14.4 colours; ten 2022 lists in seat order with distinct colours; IDs schema-safe and unique; the six-list set `EXAMPLE_LISTS` in table order and inside the catalog; no i18n import; `catalogNameKey` / `catalogAboutKey` for every list and group; nothing for a wrong kind, a block, `P1`, `Likud`, `likud `, empty, `constructor`, `toString`, `__proto__`; `catalogGroupColor` for catalog groups only; every name, description, `catalog.line`, `preset.israelExample` and `example.israel.note` in ru, en, he, list names distinct; exact Russian names and neutral descriptions; the note says educational, 2022, not a poll, assumptions; the catalog line carries the description and the year in every locale |
| `tests/ui/store.test.ts` | Vitest (node) | Preset list gains `israelExample` last; the example's rules (120, 3.25%, Hamilton, population 1 000 000), six groups (shares, 70% turnout, zero growth and change, full validity and participation, open voting over the six lists, the Section 14.4 weights with zeros stored), six lists (catalog colours, no block, tie order 1–6, may join), no blocks, empty coalition rules; votes 182 000 / 175 000 / 68 250 / 91 000 / 103 250 / 80 500 of 700 000, all qualified; seats 31 / 30 / 12 / 15 / 18 / 14 with no cut-off tie; loading from the list; export and import keep the IDs and the seats. The existing `it.each(PRESETS)` tests (empty names, ASCII only, version 2 with zero change, valid with 120 seats, same input in every language, found by scenario ID) cover the new preset |
| `tests/ui/names.test.ts` | Vitest (node) | `PRESET_SCENARIO_ID` gains `israel-example` (title test covers it); empty, whitespace and missing names of catalog lists and groups show the catalog name in ru, en, he; likud is Likud / Ликуд / הליכוד; a typed name wins; a block, a wrong kind, `Likud`, `constructor`, `toString` keep the default label; the example's display names are its catalog names, all distinct. Existing row `party likud → Party likud` changed to `meretz` (not a 2022 list), since `likud` now has a catalog name |
| `tests/ui/views.test.tsx` | Vitest (node) | `groupColorOf`: a catalog group takes its catalog colour at any position (six groups); any other ID, including `Secular` and `constructor`, the palette colour of its position; Composition and Future mark `arab` and `secular` out of catalog order by catalog colour and a plain group by position; the example's six groups in Composition |
| `tests/ui/editor.test.tsx` | Vitest (node) | Example in ru, en, he: list and group name placeholders are the catalog names with no value; one `data-catalog-about` line per empty-named catalog list with the localized `catalog.line` and the year; the line goes once a name is typed; no line for groups, for a block with a catalog ID, or for the baseline |
| `tests/ui/app.test.tsx` | Vitest (node) | Example in ru, en, he and every view: toolbar title is the preset name; `data-example-note` inside the results region with the localized note; lists by catalog names in the results; no foreign-script text; the note stays after an edit; no note for other presets or the example under another scenario ID |
| `tests/e2e/israel.spec.ts` (new) | Playwright | Load the example from the preset picker in ru: title, seats 31 / 30 / 12 / 15 / 18 / 14, the note, Ликуд; names follow the language (Likud, הליכוד) with the same seats; the editor's catalog line for Shas with the year and placeholder ШАС, gone after a name is typed, the note still shown (desktop) |

## Happy Path

- A learner picks "Израильский учебный пример (2022)" and presses Load —
  `loads on request and shows the 2022 lists with the note` (e2e) and
  `allocates 31 / 30 / 12 / 15 / 18 / 14 with no cut-off tie`.
- The learner switches to Hebrew — `switches the catalog names with the
  language` (e2e) and `resolves the Israeli example to catalog names in %s`.
- The learner renames a list — `drops the catalog line once the list has a
  typed name` and `lets a typed name win over the catalog in %s`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

The engine is not touched; the preset is input data.

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `%s is valid and allocates every seat` (per preset); existing allocation suite |
| Determinism: repeated runs, JSON round trip, ru/en/he | `loads %s to the same input in every language`; `keeps the catalog IDs and the seats through export and import`; `%s gives the same seats with display names` (existing, per preset) |
| Threshold below / at / above | Every list qualifies with a wide margin (smallest 9.75% against 3.25%): `gives 700 000 valid votes split as the table implies`; threshold logic itself not touched |
| Exact remainder tie → tieBreakOrder → party ID | No tie by design (remainders .2 / .0 / .7 / .6 / .7 / .8): `allocates ... with no cut-off tie` |
| Fixtures from exact inputs | Votes compared as exact rationals; seats 31 / 30 / 12 / 15 / 18 / 14 |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | Empty and whitespace names fall back to the catalog name; an empty ID has no catalog key |
| Single element | One list renamed while the others keep catalog names: `drops the catalog line once the list has a typed name` |
| All values equal | Not applicable: no arithmetic added |
| Maximum size (20 / 30 / 10) | Not applicable: the example has 6 groups and 6 lists; palette wrap is already covered |
| No feasible solution | Not applicable: no coalition rule is added; the example has no restrictions |
| Prototype keys | `constructor`, `toString`, `__proto__` find no catalog entry |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Hebrew and English catalog strings word by word | Presence, distinct names and script purity are tested; exact wording is pinned for Russian, the language of the request |
| Historical accuracy of the descriptions | A content review item, not a behaviour; the memo records the wording |
| Pixel layout of the catalog line and the note | Covered by the existing layout spec (no overflow on desktop and phone) once the example is loadable, not by screenshots |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-30 | `npx vitest run --reporter=json`; `npm run typecheck`; `npm run lint`; `npx prettier --check` | red: 1679 passed, 83 failed of 1762; typecheck, lint and format clean | Expected: `src/ui/catalog.ts` is an empty stub, `groupColorOf` ignores the ID, the `israelExample` builder throws and is not in `PRESETS`, no catalog strings, no editor line, no note |
| 2026-10-30 | `npx playwright test tests/e2e/israel.spec.ts` | red: 6 failed | Expected: the preset picker has no `israelExample` option |
| 2026-10-30 | `npx vitest run --reporter=json`; `npm run typecheck`; `npm run lint`; `npx prettier --check`; `npx vite build`; `npm run test:e2e` | green: 1773 of 1773 unit; typecheck, lint and format clean; build 214.62 kB; e2e 142 passed, 16 skipped by design | The unit total grew by 11 because the existing `it.each(PRESETS)` tests now include `israelExample`. No test changed during implementation |
| 2026-10-30 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 1773 unit; e2e 142 passed, 16 skipped by design; build 214.62 kB |
