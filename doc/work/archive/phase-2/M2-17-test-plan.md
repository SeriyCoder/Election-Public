# Test Plan — M2-17 Pivotal-Party View

| Field | Value |
| --- | --- |
| item | M2-17 |
| memo | `doc/work/archive/phase-2/M2-17-memo.md` |
| created | 2026-10-29 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/coalitions.test.ts` | Vitest (node) | Pivotal rows for the Section 8 zero-turnout (Party 4 in both, needed by every one), 7% (Parties 2 and 4 both needed, Party 1 none) and baseline (all zero, none needed) fixtures, and the baseline with Party 3 eligible; only eligible seated parties listed; a single majority party; equal counts in eligible-list order, not ID order; unknown instead of yes after an incomplete search (too many eligible parties, a budget cut with counts equal to the found list, a cut search that found nothing); no rows without an allocation; the analysis is not changed. Exhaustive-enumeration oracle over the 300 seeded fixtures (counts, order and needed-by-every). Repeated runs give identical JSON |
| `tests/ui/coalitionRunner.test.ts` | Vitest (node) | The baseline done message carries three zero pivotal rows and a complete flag; on the 20-eligible large scenario (9,610 coalitions) the rows equal those of the full list, not of the 200 listed rows, and the counts sum to every membership; on the 21-eligible large scenario the rows are marked incomplete |
| `tests/ui/coalitions.test.tsx` | Vitest (server render) | Nine new keys in ru, en and he; a closed `details` after the minimal winning table and the balancing parties and before the larger list; the definition sentence with the full-search total; three columns; rows in engine order with names in `bdi`, counts and yes or no; at-least counts, unknown and a partial note for an incomplete search; the empty sentence for no coalition, with the partial note when cut; hidden for no allocation and for a result without the lists; hostile names inert; labels in every locale. The balancing heading states the engine definition in English, differs from the old wording in every locale, and is rendered |
| `tests/e2e/offline.spec.ts` | Playwright (desktop, phone) | After loading the zero-turnout preset the built file's worker returns three pivotal rows, hidden until the summary is clicked; exactly one says Yes, the first, with two coalitions |
| `tests/e2e/a11y.spec.ts`, `layout.spec.ts` (existing) | Playwright | The new disclosure passes axe and keeps the coalition view free of page overflow on desktop and phone in every locale |

## Happy Path

- A user loads the zero-turnout example and sees that Party 4 is in both
  permitted coalitions and the rivals in one each —
  `counts each party in the zero Group 3 turnout alternatives`;
  `states the metric and counts each party with yes or no`; the e2e test.
- A user reads the balancing heading and is no longer told that a balancing
  party is needed by every coalition —
  `states what the engine computes in English`;
  `no longer claims every coalition needs the party in %s`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Allocation not touched; existing suite |
| Determinism: repeated runs, JSON round trip, ru/en/he | `returns identical pivotal rows on repeated runs`; `does not change the analysis it reads`; `labels the pivotal view in %s` |
| Threshold below / at / above | Not touched |
| Exact remainder tie → tieBreakOrder → party ID | Not touched; equal counts: `orders equal counts by the eligible list, not by party ID` |
| Fixtures from exact inputs | `counts each party in the zero Group 3 turnout alternatives`; `marks both members of the only 7% coalition as needed by every one`; `needs no party in the complete baseline deadlock` |
| Exhaustive enumeration on small fixtures (Section 12) | `counts pivotal parties as exhaustive enumeration does` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `returns no rows when there is no allocation` |
| Single element | `needs a single majority party in its own coalition` |
| All values equal | `orders equal counts by the eligible list, not by party ID` (four equal parties) |
| Maximum size | `counts pivotal parties over the full list, not the listed rows` (20 eligible, 9,610 coalitions) |
| No feasible solution | `needs no party in the complete baseline deadlock`; `replaces the table with a sentence when no coalition was found` |
| No allocation | `returns no rows when there is no allocation`; `hides the view when there is no allocation or the result has no lists` |
| Search cut short | `reports unknown, not yes, after a search with too many eligible parties`; `gives lower-bound counts and unknown after a search cut by its budget`; `reports unknown for every party when a cut search found nothing`; `marks the pivotal rows of an incomplete search`; `shows lower-bound counts, unknown and a partial note for an incomplete search` |
| Ineligible and seatless parties | `lists only government-eligible parties with seats` |
| Hostile names | `keeps hostile party names inert` (pivotal view) |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Time to count 9,610 coalitions | One integer pass over a list the worker already built; the existing performance spec covers input staying responsive while the worker runs |
| Banzhaf or Shapley–Shubik values | Out of scope in the memo |

## Changed Existing Tests

| Test | Change | Reason |
| --- | --- | --- |
| `posts the analysis of the full run with the lists on request` | The expected extras gain `pivotal` and `pivotalComplete` | The done message gains the pivotal rows |
| `withExtras` in `coalitions.test.tsx` | Moved from inside `coalitions on request` to the top level, unchanged | The pivotal-view tests use it too |
| `KEYS` in `coalitions.test.tsx` | Nine keys added | New strings |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-29 | `npx vitest run` | 33 failed / 1170 passed | 14 engine tests (no `pivotalParties`); 3 runner tests (no pivotal extras); 3 key tests, 9 view tests (no keys, no `data-extra="pivotal"`) and 4 heading tests (old wording). The hide test passes, as the view is absent |
| 2026-10-29 | `npx playwright test tests/e2e/offline.spec.ts -g "zero-turnout coalition needs"` | 2 failed | Desktop and phone: the preset loads and the search completes, but no `tr[data-pivotal]` rows in the built file |
| 2026-10-29 | `npx vitest run` | 1203 passed | All engine, runner, key, view and heading tests green. Typecheck, lint and Prettier clean |
| 2026-10-29 | `npx playwright test tests/e2e/offline.spec.ts tests/e2e/a11y.spec.ts tests/e2e/layout.spec.ts` | 73 passed / 9 skipped | Pivotal rows open by click on desktop and phone. Temporary screenshots in he and ru, desktop and phone, with the disclosure open: no page overflow, party column start-aligned, headers wrap only between words |
| 2026-10-29 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | Pivotal parties counted over the minimal winning list; indispensable flag unknown when the search is incomplete; balancing heading reworded |
