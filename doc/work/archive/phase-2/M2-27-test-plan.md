# Test Plan — M2-27 Party-first electorate in the questionnaire

| Field | Value |
| --- | --- |
| item | M2-27 |
| memo | `doc/work/archive/phase-2/M2-27-memo.md` |
| created | 2026-10-30 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/electorate.test.ts` | Vitest | New `deriveElectorate` and `describeElectorate`: the described example, turnout effect, zero-vote group, invalid inputs, exact sums, canonical strings, purity, exact-arithmetic source scan |
| `tests/engine/numeric.test.ts` | Vitest | New `roundPercents` (largest remainder, ties to the lower index, null on invalid or non-100 input, RangeError on bad places) and `percentStops` (pie ends, invalid as 0, scaled above 100) |
| `tests/ui/book.test.ts` | Vitest | Page list without people.shares and prefs; turnout before votes.shares, compose.N and votes.check; specs, suggestions (example by party, CBS for example groups, even otherwise), validation (turnout 1–100, sums of 100), parts of up to 8 rows or 4 with long names, `electorateCheck`, build of the example and with Arab turnout 50, zero-vote group, review sizes, ready values |
| `tests/ui/store.test.ts` | Vitest | Navigation only to pages of the current list; parts walk on compose and votes.shares with long group names; skip from a part; per-language build equal to the preset seats with derived population shares; engine import list gains `electorate` |
| `tests/ui/bookView.test.tsx` | Vitest, server render | Chapter 3 Явка and 4 Избиратели партий numbering; the pie and colour keys on votes.shares, compose and votes.check; rest slice and scaling; check page rows, statistics, zero-vote note; row range and "more after Next" cue; review lines; lesson points; part and caption languages |
| `tests/ui/app.test.tsx` | Vitest, server render | Automatically filled list names Голоса партий and Избиратели партии, no Предпочтения |
| `tests/e2e/book.spec.ts` | Playwright | axe scans on compose.0 and votes.check instead of prefs.0 |
| `tests/e2e/bookFit.spec.ts` | Playwright | Error states on compose.0; heavy walk reaches turnout.7, votes.shares#1, compose.9#1, votes.check#1; the pie is checked for overlap like a drawing |

## Happy Path

- The described example (shares 25.61 / 24.77 / 9.69 / 11.95 / 14.93 / 13.05,
  the six one-decimal compositions, 70% turnout) derives population
  33.5821 / 24.5047 / 7.9165 / 10.9991 / 17.002 / 5.9956 and the Section 14.4
  weights within rounding: `derives the group shares and vote weights of the
  described example exactly`.
- Turnout is asked in chapter 3 before the parties' voters in chapter 4:
  `asks turnout before the parties’ voters, then shows the derived check`.
- One compose page per party, about that party, fields per group: `asks the
  composition of every party, one page each`, `numbers the chapter and the
  group or party`.
- The check page gives back 33.6 / 24.5 / 7.9 / 11 / 17 / 6 beside the 2022
  statistics, and Arab turnout 50 moves it to 31.4 / 23 / 7.4 / 10.3 / 22.3 /
  5.6: `gives the 2022 statistics back for the unchanged example`, `shows how a
  lower turnout makes a group larger`, `shows the derived group shares beside
  the 2022 statistics`, `moves the derived shares with the turnout`.
- Pies follow the typed values in list and group colours: `asks the party votes
  with a pie in the list colours`, `draws a party composition in the group
  colours`, `follows the typed values, leaving the rest grey and scaling a sum
  over 100%`.
- Six-list pages fit one part; ten parties split 5 + 5 with a range and a cue:
  `shows the six-list pages of party voters whole`, `shows only the rows of the
  current part, with the part line`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

The new engine module derives scenario inputs; allocation is unchanged. The
fixtures come from an exact hand computation (`files/m227_fixtures.py`,
memo Seat-Calculation Correctness).

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `gives the Israeli example, derived from the parties’ voters, every page confirmed` (31 / 30 / 11 / 14 / 18 / 16, sum 120); `lets turnout shape the group sizes and keeps the year-0 seats`; `sums every result to exactly 100 in canonical four-decimal percents` (seeded property test); engine allocation tests unchanged |
| Determinism: repeated runs, JSON round trip, ru/en/he | `is pure and gives identical strings on every call`; `builds the same scenario on every call, through a schema round trip`; `round-trips through export and import with the same seats`; store `builds the six picked example lists the same under every language` |
| Threshold below / at / above | Unchanged engine tests; the derived example keeps every list above the threshold (same seats as the preset) |
| Exact remainder tie → tieBreakOrder → party ID | `gives the larger remainder the unit, ties to the lower index` (`roundPercents`); allocation tie tests unchanged |
| Fixtures from exact inputs | `derives the group shares and vote weights of the described example exactly`; `divides each group’s votes by its turnout`; `describes the Section 14.4 example by party`; `derives back to the group shares it was described from`; `uses exact arithmetic only` (source scan) |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `gives no result for no parties`, `gives no result for no groups`; `percentStops` of `[]`; `roundPercents` of `[]` returns null |
| Single element | `roundPercents` `["100"]`; one party at 100 (`gives a party without votes an even composition` covers the other party) |
| All values equal | `gives back the group shares when every party has the same composition and turnout is even`; `roundPercents` 25 × 4 |
| Maximum size (20 / 30 / 10) | 10 parties and 8 groups with 60-character names: store `walks the parts of a dense page before turning it` and `walks the parts of the check page before turning it`; e2e heavy walk at six sizes |
| No feasible solution | Invalid inputs give null: the 14 `gives no result for …` cases of `deriveElectorate` and 8 of `describeElectorate` |
| A group no party draws from | `gives a group no party draws from a zero share and even weights` (engine and build); `shows a group no party draws from as zero, the rest summing to 100`; `shows own groups without statistics and marks a group nobody draws from` |
| Turnout 0 in a voting group | `gives no result for no turnout in a group that votes`; questionnaire turnout minimum 1: `refuses turnout.0 "0" outside 1..100 percent` |
| Unconfirmed typed values | `uses only confirmed answers, like the build` |
| Sum above 100 in a pie | `percentStops` `["60","60"]` and `["200","0","100"]`; `follows the typed values, leaving the rest grey and scaling a sum over 100%` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Exact equality of the derived example with the preset's group shares | The one-decimal compositions cannot reproduce 0.336 … 0.06 exactly; the memo accepts the approximation and the tests pin the derived values and the unchanged seats |
| Pie rendering in pixels | The conic gradient stops are checked in the server render; page fit and overlap at the six sizes are checked by `bookFit.spec.ts` in `/3-implement` |
| English and Hebrew wording | Reviewed as a whole in M3-05 (user decision 2026-10-29); the missing-key test enforces the keys |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-30 | `npx vitest run` | red: 117 failed, 2074 passed of 2191 | All for the intended reason: engine stubs return null or `[]`; `votes.shares`, `compose.N` and `votes.check` unknown (RangeError, "stuck at review" in the walk helpers); people.shares and prefs pages still present; no pie, keys, check rows or row range. No TypeError or ReferenceError. Typecheck, lint, format clean. The e2e specs are updated and run in `/3-implement` after the build |
| 2026-10-30 | `npx vitest run`; `npx tsc --noEmit -p .`; `npx eslint tests src`; `npx prettier --check src tests` | green: 2192 passed | One store test added (`walks the parts of the check page before turning it`); test corrections listed in the memo Deviations |
| 2026-10-30 | `npm run build`; `npm run test:e2e` | green: 182 passed, 30 skipped | The heavy fit walk passes at all six sizes and reaches `votes.shares#1`, `compose.9#1` and `votes.check#1`; skips are the laptop-only and desktop-only tests on the other project |
| 2026-10-30 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 2192 unit passed; build; e2e 182 passed, 30 skipped |
