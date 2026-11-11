# Test Plan — M2-16 Coalitions On Request

| Field | Value |
| --- | --- |
| item | M2-16 |
| memo | `doc/work/archive/phase-2/M2-16-memo.md` |
| created | 2026-10-29 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/coalitions.test.ts` | Vitest (node) | Larger coalitions: one-party extensions, a coalition reached twice kept once, forbidden and ineligible additions skipped, zero-seat parties never added, equal seats ordered by party position, independent of input order, empty for no minimal winning list or no allocation, none in the four Section 8 presets, two rows when Party 3 may govern. Blocked majorities: the three baseline rows with seats, margin, opposition and reasons (pair source kept), the single rival pair at zero turnout, the three-party Party 3 row at 7% and 8%, both reasons on one row, a blocked single-party majority, zero-seat parties never listed, empty complete result for no allocation, a budget cut marked incomplete and a subset of the full list, the default budget. Exhaustive-enumeration oracle for both lists over 300 seeded fixtures (order included). Repeated runs give identical JSON |
| `tests/ui/coalitionRunner.test.ts` | Vitest (node) | The done message carries the lists on request (baseline: no larger rows, three blocked rows, both complete); on the 20-eligible large scenario both lists are capped at 200 with totals above 200 and marked incomplete; the done run copies the lists from the message in the worker and in-page paths |
| `tests/ui/coalitions.test.tsx` | Vitest (server render) | Ten new keys defined in ru, en and he; two closed `details` disclosures after the minimal winning section and before the forbidden pairs, each summary with its count; blocked rows with members in `bdi`, seats and reasons (forbidden pair text, ineligible text, never the other); empty sentences for each list; partial and row-limit notes and the summary count using the total; hidden for no allocation and for a result without the lists; hostile party names inert; labels in every locale |
| `tests/e2e/offline.spec.ts` | Playwright (desktop, phone) | On the baseline the built file's worker returns three blocked rows; they are hidden until the summary is clicked; each pair row has one reason; the larger disclosure opens from the keyboard and shows its empty sentence |
| `tests/e2e/a11y.spec.ts`, `layout.spec.ts` (existing) | Playwright | The new disclosures pass axe and keep the coalition view free of page overflow on desktop and phone in every locale |

## Happy Path

- A user sees why the baseline has no government: three majorities, each with
  its blocking rule — `lists the three blocked pairs of the Section 8 baseline`;
  `lists the blocked baseline majorities with their reasons`; the e2e test.
- A user looks for a safer government than the minimal one —
  `lists bigger governments when Party 3 may govern`;
  `lists larger coalitions with seats, margin and opposition`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Allocation not touched; existing suite |
| Determinism: repeated runs, JSON round trip, ru/en/he | `returns identical larger and blocked lists on repeated runs`; `does not depend on the order of the minimal winning list`; `labels both lists in %s` |
| Threshold below / at / above | Not touched |
| Exact remainder tie → tieBreakOrder → party ID | Not touched; equal-seat coalition rows: `orders equal seats by party position` |
| Fixtures from exact inputs | `finds none in the four Section 8 presets`; `lists only the rival pair at zero Group 3 turnout`; `names the three-party majority Party 3 blocks at 7% and 8%` |
| Exhaustive enumeration on small fixtures (Section 12) | `lists larger coalitions as exhaustive enumeration does`; `lists blocked majorities as exhaustive enumeration does` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `returns nothing without minimal winning coalitions or an allocation` |
| Single element | `blocks a single-party majority that cannot govern`; `never adds a party without seats` |
| All values equal | `orders equal seats by party position`; `marks a search cut by its budget as incomplete` (twelve equal parties) |
| Maximum size | `caps both lists on request at LISTED_COALITIONS and reports their totals` |
| No feasible solution | `lists the three blocked pairs of the Section 8 baseline` (deadlock) |
| No allocation | `returns an empty complete result when there is no allocation`; `hides the lists when there is no allocation or the result has none` |
| Search cut short | `marks a search cut by its budget as incomplete`; `says when a list is partial or cut at the row limit` |
| Zero-seat parties | `never adds a party without seats`; `never lists a party without seats` |
| Hostile names | `keeps hostile party names inert` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Blocked search time on 30 parties | Bounded by its node budget, tested; the existing performance spec covers input staying responsive while the worker runs |
| Disclosure animation or marker glyph | Browser default rendering; not behaviour |

## Changed Existing Tests

| Test | Change | Reason |
| --- | --- | --- |
| `brute-force oracle > matches exhaustive enumeration on seeded small fixtures` | Fixture generation moved into a shared `randomCase` helper, unchanged in order and seed; assertions unchanged | The two new oracle tests reuse the same 300 cases |
| `summary()` in `coalitions.test.ts` | Now built on a shared `rows()` helper | The new lists use the same row format |
| `posts the analysis of the full run` | Renamed `... with the lists on request`; the expected message gains `extras` | The done message gains the lists |
| `lists at most LISTED_COALITIONS coalitions ...` | Expected message gains `extras: expect.any(Object)` | Same; capping is checked in its own new test |
| `reports progress and the finished analysis`; `searches in the page with %s` | The expected run is built from the worker body's done message, `extras` included | The done run gains the lists |
| `KEYS` in `coalitions.test.tsx` | Ten keys added | New strings |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-29 | `npx vitest run` | 36 failed / 1137 passed | 21 engine tests (no `largerCoalitions`, `blockedMajorities`, `BLOCKED_NODE_BUDGET`); 3 runner tests (no `extras`); 3 key tests and 9 view tests (no keys, no disclosures). The refactored oracle passes |
| 2026-10-29 | `npx playwright test tests/e2e/offline.spec.ts -g "rules block"` | 2 failed | Desktop and phone: no `tr[data-blocked]` rows in the built file |
| 2026-10-29 | `npx vitest run` | 1173 passed | All engine, runner, key and view tests green. Typecheck, lint and Prettier clean (two test files reformatted only) |
| 2026-10-29 | `npx playwright test tests/e2e/offline.spec.ts tests/e2e/a11y.spec.ts tests/e2e/layout.spec.ts` | 71 passed / 9 skipped | Blocked rows open by click and by Enter. Temporary screenshots in he and ru, desktop and phone, with both lists open: no page overflow, summary at least 44 px, reason column start-aligned |
| 2026-10-29 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 1173 unit, 94 e2e passed / 14 skipped; typecheck, lint, Prettier clean |
