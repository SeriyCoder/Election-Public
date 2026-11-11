# Memo — M7-15 Natural compact questionnaire

| Field | Value |
| --- | --- |
| item | M7-15 |
| epic | M7 |
| phase | Phase 3 — M7 party-first coalition simulation |
| status | closed |
| created | 2026-11-02 |
| closed | — |

## Approval

The user approved on 2026-11-02: "vse ispolni samostojatelno" ("carry out
everything yourself"), given together with the M7-15 request. This approves the
recommendations below. It does not allow skipping steps, faking RED, weakening
tests, raising the 460800-byte offline limit or the 200 ms responsiveness
budget, or placing electoral arithmetic outside `src/engine/`.

## Problem

The user's 2026-11-02 review of the questionnaire (screenshots 2–11 of the
review document) finds it long and paged: group turnout, party compositions,
the voter-structure check and growth are cut into "Часть n из m" parts; every
party needs two extra pages (a known/unknown choice and the composition) after
a global "leave composition unknown" choice; cooperation uses large grey
buttons with a 1/2 pager. The Basic (Israel) group set lacks a knitted-kippa /
settlers group and two of its names do not match the user's wording. Two small
Demographic Future defects were also reported: the timeline header always says
"лет" ("через 4 лет") and the growth-rate fields show ASCII "0.25" in Russian.

## Scope

**In scope**

- Basic (Israel) groups: new catalog group `knitted-kippot` (colour #BE185D,
  names in ru/en/he: "Вязаные кипы, поселенцы", "Knitted kippot, settlers",
  "כיפות סרוגות, מתנחלים"); renamed `traditional` ("Традиционные евреи, масорти
  ле дати" / "Traditional Jews (Masorti, traditional-religious)" / "יהודים
  מסורתיים ומסורתיים-דתיים") and `arab` ("Арабские граждане" / "Arab citizens"
  / "אזרחים ערבים"). Catalog and Basic order: secular, traditional, religious,
  knitted-kippot, arab, haredi, other (the user's own set).
- The Basic reference panel on `people.set` lists the seven groups by ID with
  the CBS 2022 share where the source gives one; `knitted-kippot` shows "—" and
  a note that the source counts these voters within the religious and
  traditional categories. No figure is invented. The Section 14.4 six-group
  `israelExample` preset and `EXAMPLE_GROUPS` stay unchanged.
- Example data mapped by group ID instead of position: the six-list +
  Basic party-side example compositions (the new group gets 0 there) and the
  2022 statistic column of `votes.check` (empty for the new group).
- Composition always distributed: the `compose.mode` page and every
  `compose.known.N` page are removed, with their choices, fictional A–D
  explanation and strings. With groups, every party has a composition.
- One compact `compose` page ("Из кого состоят избиратели партий?") after
  `votes.shares`: ‹ party select › over all parties (each option marked
  complete or with its remainder), a stacked bar of the selected party, every
  group on the same screen with an exact text field, a slider and the ▾ ready
  values, "Осталось распределить" for that party, and "Выровнять до 100%"
  (exact proportional scaling with sum-preserving rounding to two decimals, in
  the engine). The page says the starting values are an assumption to edit.
  Next checks every party; a party not at exactly 100% is a typed `sum`
  (or `percent`) error and the selector turns to that party.
- Starting composition: the Section 14.4 party-side example (mapped by ID)
  when the six lists and Basic groups are both chosen; otherwise the whole
  even split of `evenPercents` (Basic included, since the new group has no
  source share) — the explicit equal-split assumption.
- Single compact screens: `turnout` and `growth` (all groups in a card grid
  with slider and exact field; growth keeps −5..+5 in 0.25 steps and the soft
  warnings strictly below −0.5 or above +2.5 through `unusualGrowth`),
  `votes.shares` (all parties in the same card grid with a stacked bar instead
  of the side pie), `votes.check` (one table of all groups with the pie) and
  `coalitions` (the M7-17 unpaged `DirectedRelations` strips: ◀ party ▶, two
  columns, ✓/✗ per end, dashed red / solid green line, ends independent).
  No "Часть n из m" or "Ещё N — после «Далее»" on these pages.
- Direct fixes listed here as copy/format changes: plural forms of years in
  the Demographic Future timeline header and the other "через N лет" strings
  of that tab (ru год/года/лет, en year/years, he שנה/שנתיים/שנים, chosen with
  `Intl.PluralRules` in `src/i18n/format.ts`); growth-rate fields there show
  the value with `formatDecimal` and still accept exact typed text.

**Out of scope** (at least two)

- The review page keeps its parts by chapter and the names pages keep parts of
  at most eight names (not named in the review document).
- The two ready examples at the start (M7-16).
- The Data tab and imports: unknown compositions in imported scenarios stay
  valid, unchanged and handled as today; the Coalitions panel (M7-14/M7-17).
- English and Hebrew wording review as a whole (M3-05).

## Approach

Spec Section 14.5 and 14.6. `src/ui/book.ts` keeps the indexed draft answers
(`compose.N`, `turnout.N`, `growth.N`, `coalitions.N`) and adds `compose` to
the compact overview pages, like M7-13 did for turnout, growth and coalitions:
one page key confirms, validates, fills and edits its children through the
existing `compactChildren` facade (`compose` text index = party × groups +
group). `compositionsOf` reads `compose.N` for every party whenever there are
groups; the build passes those exact texts through the existing party-mode
build. `pageParts` returns one part for every compact and percents page and for
the check page; balanced parts remain only for names. The view gets a shared
card grid (book CSS with at least 14 px text and no clipping, as Section 14.6
fit requires) used by turnout, growth, vote shares and composition, a
composition card with the party selector and bar, and the book uses
`DirectedRelations` unpaged. The selected composition party is local view
state; on a Next error it follows the error index. A new exact engine helper
`scalePercents` in `src/engine/numeric.ts` does the alignment; the bar uses
`percentStops`. Catalog and Basic order change in `src/ui/catalog.ts`;
example lookups use group IDs.

**Rejected alternative:** keeping `compose.N` as separate pages but without
parts — still one page per party, which the review explicitly rejects.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Catalog group `knitted-kippot` | New catalog ID; stored like other catalog groups (ID, empty name) | None (IDs are free text) |
| Questionnaire build | Every party gets a composition when there are groups | None; version 5 unchanged |
| Book draft keys `compose.mode`, `compose.known.N` | No longer read | None (draft is not persisted in scenarios) |

## Interface Delta

- Pages removed: `compose.mode`, `compose.known.N`; added: `compose` (compact).
- New page list with groups: intro, parties.count, parties.naming,
  parties.names, people.about, people.mix, people.set, [people.count,
  people.names], turnout, votes.shares, compose, votes.check, growth,
  rules.seats, rules.threshold, coalitions, review.
- `exampleGroupSet()` returns the seven Basic groups, share `null` for
  `knitted-kippot`.
- Engine: `scalePercents(texts, places)` in `numeric.ts`.
- i18n: `pluralCategory(locale, n)` in `format.ts`; year phrases via
  `unit.years.*`.
- `PanelNumber` gains an optional display formatter.
- `BOOK_LIMITS` loses the percent/check paging limits.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None of the seat paths. The questionnaire build still writes exact party vote shares and compositions through the existing edit functions; compositions now always present affect derived overall turnout and population only. |
| Where exact rationals are required | `scalePercents` (exact scaling, largest-remainder rounding, sum exactly 100), composition sum checks (`percentRemainder`), bar boundaries (`percentStops`). |
| Ordering / tie rules relied on | Largest remainder ties to the lower index in `roundExactPercents`; `tieBreakOrder` by position unchanged. |
| Any display rounding near a decision? | No; the selector and bar only display; a page is accepted only when the exact sum is 100. |
| How determinism across runs, round trip and locale is proven | Unit tests of `scalePercents` (repeated runs, comma notation), of the build (identical input text for identical answers, compositions exact) and the existing questionnaire seat regressions (31/30/11/14/18/16 for the six-list example). |

## Files

| Path | Change |
| --- | --- |
| `src/ui/catalog.ts` | New group, Basic order |
| `src/ui/book.ts` | Remove composition choices, compact `compose`, single parts, ID-mapped example data |
| `src/ui/BookView.tsx` | Card grid, composition card, unpaged strips, single check table, Basic panel |
| `src/ui/DirectedRelations.tsx` | Only if the book needs a hook for its styling |
| `src/ui/PanelControls.tsx` | Optional display formatter on `PanelNumber` |
| `src/ui/FutureWorkspace.tsx` | Plural year phrases, formatted growth fields |
| `src/engine/numeric.ts` | `scalePercents` |
| `src/i18n/format.ts` | `pluralCategory` |
| `src/i18n/ru.ts`, `en.ts`, `he.ts` | Group names, new strings, removed strings |
| `src/ui/styles.css` | Book compact grid, bar, strips |
| `tests/ui/naturalBook.test.tsx`, `tests/engine/scalePercents.test.ts`, `tests/e2e/naturalBook.spec.ts` | New tests |
| Existing tests (`tests/ui/book.test.ts`, `bookView.test.tsx`, `store.test.ts`, `compactBook.test.tsx`, `catalog.test.ts`, `tests/e2e/*.spec.ts`, `helpers.ts`) | Amended where they assert removed pages, parts, six catalog groups or old names |
| `doc/spec/elections-simulator.md` | Section 14.4 catalog, 14.5, 14.6 |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Starting composition for Basic groups — **Recommendation:** whole even
   split (the source has no share for the new group; using the CBS shares
   would silently give it 0); the six-list example keeps its Section 14.4
   compositions with 0 for the new group.
2. Vote-share page pie — **Recommendation:** replace the side pie with the
   panel's stacked bar so ten parties fit one screen; the check page keeps
   its pie.
3. Alignment precision — **Recommendation:** two decimals, sum exactly 100.
4. Selected composition party — **Recommendation:** local view state, turned
   to the first incomplete party on a Next error; no new store field.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | `tests/ui/naturalBook.test.tsx`: the `buildBook` helper's list of answered pages was corrected | Own test defect found while turning green; the assertion on the built compositions and seats is unchanged |
| /3-implement | `tests/ui/i18n.test.ts`: `he:unit.years.one` / `he:unit.years.two` exempted from the "uses the reference placeholders" check | Hebrew «שנה» (one year) and «שנתיים» (two years) carry the number in the word, so they have no `{n}` placeholder |
| /3-implement | `tests/ui/catalog.test.ts`, `views.test.tsx`, `app.test.tsx`, `store.test.ts`: seven Basic groups in the new order, new names "Традиционные евреи, масорти ле дати" and "Арабские граждане"; the israelExample preset test skips `knitted-kippot` (the Section 14.4 six-group preset stays unchanged); no `compose.mode` / `compose.known.N` steps; the compose step now types eight composition keys | These tests asserted the superseded six-group catalog, the old names and the removed choice pages |
| /3-implement | `tests/ui/book.test.ts` (170 → 168 tests): one `compose` page; even split `15,15,14,14,14,14,14` replaces the statistical suggestions; the six-list compositions remapped to the new order with 0 for knitted kippot; the electorate check's statistics column has `null` for the new group; the page-parts tests merged into one single-part test; `partError` single part; M7-07 tests rewritten (an untouched party gets the even split, so overall turnout is 2/3, and `pageSpec` throws `RangeError` for the removed choice pages); `BOOK_LIMITS` no longer has `partRows` / `percentRows` | The paged parts and the "unknown" choice they asserted are removed by the approved scope; every exactness assertion is kept |
| /3-implement | `tests/ui/compactBook.test.tsx`: seven groups; `compose.mode` throws; confirming `compose` gives every party a composition; one `data-compose-party` and no fictional parties | Same superseded pages |
| /3-implement | `tests/ui/bookView.test.tsx`: compose questions on one page ("Из кого состоят избиратели партий?"); the vote-share and composition pies replaced by stacked bars (`data-shares-bar`, `data-compose-bar`), the rest of an under-100 bar left empty instead of grey; check-page and Basic-set values for seven groups with "—"; one-screen parts (ten shares, all compose cells, a sum error refuses Next on the same page); 10 / 18 unpaged refusal ends; M7-07 check case now shows the even split rather than an unknown part | Approved design (Open Questions 1–2): bars instead of side pies, no parts, no unknown choice |
| /3-implement | `tests/e2e/book.spec.ts`, `compactBook.spec.ts`, `bookFit.spec.ts`: walks go through the single `compose` page (the second party via `compose-next`); 7 rate rows; exported compositions are all present (not `null`); 10 unpaged refusal ends without a pager; the fit walk checks the error states on `compose`, 18 refusal ends per selected party, 7 growth warnings, and that turnout, shares, compose, check and growth have no second part | Same superseded pages; the Section 14.6 fit rules themselves (no clipping, text ≥14 px, no page scroll, controls in the window) are unchanged and pass at all six sizes |
| /3-implement | Copy: `book.set.title` in ru/en/he now names seven groups ("Базовый набор — шесть групп из примера на прошлой странице и вязаные кипы") | The old title said "the same six groups" after the seventh group was added |
| /3-implement | Desktop-only CSS: smaller controls (2rem) and 14 px names inside the compact cells, rate rows and cooperation strips; the composition tally sits on the party-selector row | Needed for the 1280x720 125% worst case (ten 60-character parties, eight 60-character groups) to stay on one screen; phones keep 44 px touch targets |
| /4-close | Files table vs. actual: `src/ui/store.ts` (the `bookAlign` action takes the shown party for the single compose page) and `src/i18n/index.ts` (`formatYears`, the plural year phrase) also changed; `src/ui/DirectedRelations.tsx` and `tests/e2e/helpers.ts` did not need changes | The book store action follows the single compose page; the plural phrase belongs with the translator; the book styles the strips through its own CSS and the walk helpers already went page by page |
