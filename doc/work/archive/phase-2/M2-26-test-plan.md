# Test Plan — M2-26 Israeli example group shares from 2022 statistics

| Field | Value |
| --- | --- |
| item | M2-26 |
| memo | `doc/work/archive/phase-2/M2-26-memo.md` |
| created | 2026-10-30 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/store.test.ts` | Vitest | Preset shares, CBS figures and exact sum, vote counts, seats, no cut-off tie, preset load, export and import, questionnaire builds of the example |
| `tests/ui/book.test.ts` | Vitest | Example shares suggested on people.shares; lesson composition numbers; the example set export |
| `tests/ui/bookView.test.tsx` | Vitest, server render | Lesson numbers in ru, en, he; people.set shows the set, shares and source; narrator reply |
| `tests/ui/catalog.test.ts` | Vitest | The Israeli example note names the CBS source |
| `tests/e2e/israel.spec.ts`, `tests/e2e/book.spec.ts` | Playwright | Seats of the loaded preset and of the questionnaire-built example |
| `tests/e2e/bookFit.spec.ts` | Playwright | Unchanged; the people.set page with its new list must still fit at the six sizes |

## Happy Path

- The preset's group shares are 0.336 / 0.245 / 0.079 / 0.11 / 0.17 / 0.06 with
  the Section 14.4 weights unchanged: `has the six example groups with their
  shares and 70% turnout`.
- Haredim, Arabs and others carry the CBS figures 11 / 17 / 6%, the Jewish
  groups add up to 77%, the shares sum to exactly 1, `other` is last and every
  weight row sums to 1: `takes the group shares from the CBS 2022 electorate,
  Other the exact rest`.
- people.shares suggests 33.6 / 24.5 / 7.9 / 11 / 17 / 6 for the example set:
  `suggests the Section 14.4 table for the six lists and the example groups`.
- `exampleGroupSet` lists the six lesson groups in lesson order with the same
  percents the questionnaire suggests, summing to exactly 100: `lists the six
  lesson groups with their shares, Other last, summing to 100%`.
- people.set shows the title, six groups with catalog names and shares in the
  locale's notation, and a source line naming CBS, 2022 and the remainder to
  100%; the example narrator reply names 2022 and assumptions; the list stays
  for own groups and is absent from the lesson page: `shows the example set
  with its shares and source on the set page`, `%s shows the example set in its
  own notation`.
- The results note names the CBS source: `labels the example as educational,
  not results or a poll`.
- Lesson numbers from the engine: Likud six groups, traditional 43.06%; Ra'am
  two groups, Arab 97.70%: `takes where Likud and Ra’am get their valid votes
  from the engine`, `show where Likud and Ra’am get their votes, from the
  engine`, `%s has both lessons with the engine numbers`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

The engine is not touched; the preset feeds it, so the preset fixtures are
updated from an independent hand computation (memo, Seat-Calculation
Correctness).

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `allocates 31 / 30 / 11 / 14 / 18 / 16 with no cut-off tie` (sum 120); engine sum and property tests unchanged |
| Determinism: repeated runs, JSON round trip, ru/en/he | `keeps the catalog IDs and the seats through export and import`; `builds the six picked example lists the same under every language`; `builds the same scenario under every language`; e2e `switches the catalog names with the language` |
| Threshold below / at / above | Unchanged engine tests; every example list is far above 22 750 (`gives 700 000 valid votes split as the table implies` checks all qualify) |
| Exact remainder tie → tieBreakOrder → party ID | Unchanged engine tests; the example has no cut-off tie (`cutoffTie` false) |
| Fixtures from exact inputs | Vote counts 179 235 / 173 355 / 67 865 / 83 650 / 104 545 / 91 350 compared as exact rationals: `gives 700 000 valid votes split as the table implies` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | Not applicable: the set is fixed data |
| Single element | Not applicable |
| All values equal | Not applicable |
| Maximum size (20 / 30 / 10) | Not applicable |
| No feasible solution | Not applicable |
| Own groups chosen: the example list stays as a reference | `shows the example set with its shares and source on the set page` |
| Example shares with one decimal sum to exactly 100 in the questionnaire's exact check | `lists the six lesson groups with their shares, Other last, summing to 100%` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| The CBS figures themselves | External sources; the memo records them and the tests pin the values taken from them |
| Page fit of people.set | Covered by the existing `bookFit.spec.ts` walk at the six Section 14.6 sizes, run in `/3-implement` |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-30 | `npx vitest run` | red: 22 failed, 2075 passed of 2097 | All for the intended reason: old shares, votes and seats; lesson 43.27 / 97.83; `exampleGroupSet` stub returns nothing; no set on people.set; note without source. Typecheck, lint, format clean |
| 2026-10-30 | `npx vitest run`; `npm run typecheck`; `npm run lint`; `npx prettier --check src tests`; `npm run test:e2e` | green: 2097 of 2097; typecheck, lint and format clean; browser suite 182 passed, 30 skipped (project-scoped); offline file 329.33 kB | Two stale seat fixtures in `book.test.ts` corrected to the memo values; the whole-book axe walk given the 180 s `bookFit` budget after two 60 s timeouts under load with no finding. Screenshots of people.set at 1280 × 800, 1024 × 576 (scale 1.25) and 390 × 844 checked; the share no longer wraps |
| 2026-10-30 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 2097 unit passed; e2e 182 passed / 30 skipped; offline file 329.33 kB |
