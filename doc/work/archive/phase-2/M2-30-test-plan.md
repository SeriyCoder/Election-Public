# Test Plan — M2-30 Demographic future of chosen coalitions

| Field | Value |
| --- | --- |
| item | M2-30 |
| memo | `doc/work/archive/phase-2/M2-30-memo.md` |
| created | 2026-10-30 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/future.test.ts` | Vitest | New fixture (group A 50% all for X, growth 10%; group B 50% split Y 60 / Z 40; 10 seats): X 5, Y 3, Z 2 in year 0 and X 6, Y 2, Z 2 in year 3, checked by hand against `runSeats`. `buildCoalitionFuture`: {X} gains the majority by year 3 (full result); cumulative stops in scenario order for {Y, X}; {Y, Z} loses seats; 11 seats give the majority stop '54.55'; the IDs in any order or repeated give the same result; year 0 twice gives equal sides and zero change; the empty set; an unknown party is refused; a year without an allocation gives null seats, no majority, stops '0.00'; an ineligible party and a forbidden pair are reported. A 60-run seeded property test (seed 2030) and a determinism and JSON round-trip test. The existing source scan forbids floating point and locale APIs in `future.ts` |
| `tests/ui/coalitionChoice.test.ts` | Vitest | New: `coalitionKey` is order-free, sorts by code unit, ignores repeats, leaves its input alone, gives '' for none; `chooserEntries` keeps the search's order, puts the «Коалиции» tab set first in scenario order, does not repeat it when the search lists it, leaves out an empty one, puts ticked sets missing below on top and checks listed ones in place, disables the rest once three are ticked and nothing below that, drops a set with an unknown party, lists a repeated search set once; no interface text in the module |
| `tests/ui/store.test.ts` | Vitest | New describe "future coalitions": starts empty and keeps an initial value; tick order and untick in any order; three at most (a fourth tick leaves the same state object and calls no listener); input, loaded input and seats unchanged; a set is dropped when one of its parties is deleted; all are dropped on input that is not a scenario; kept through a turnout edit, a view change, a year change and a «Коалиции» tab tick; cleared by `setInput`, a preset, an import, a reset to the baseline and the questionnaire build; never written into the scenario. Every clearing test first proves the sets were followed |
| `tests/ui/futureCoalitions.test.tsx` | Vitest | New: the renamed view label in ru, en and he; every new key in every locale; the chooser region replaces the editor on the future view only; entries in the search's order with checkbox, `<bdi>` names joined by " + " and today's seats; running, none, cancelled and failed states; the «Коалиции» tab set first and marked; checked and disabled flags and the limit note; hostile names inert; nothing listed for invalid input; the empty section; one card per ticked set in tick order; two pies with `role="img"`, `conic-gradient(` from the engine stops, `data-pie-state` and the majority mark at the engine's stop; captions and the text alternative; the member, total and needed rows; the breach note; the no-allocation reason; labels in every locale |
| `tests/e2e/future.spec.ts` | Playwright | New describe "coalitions in the demographic future": tick X+Y, the card shows X 5 → 6 in year 3 and 5 in year 0, untick removes it; the «Коалиции» tab set {X} goes from minority in year 0 to majority in year 3; five equal lists give ten entries, three ticked disable the fourth and show the limit, unticking one frees it; the chooser stands left of the results on a desktop and above them on a phone |

## Happy Path

- Load the fixture, open «Демографическое будущее»: the left column lists
  «Party X + Party Y» and «Party X + Party Z» with today's seats. Tick the
  first; a card with two pies and a table appears. Year 3 shows X 6 seats;
  year 0 shows 5 and a majority in both pies.
- Tick the «Коалиции» tab set {X}: «5 из 10 мест, нет большинства» in year 0,
  «6 из 10 мест, есть большинство» in year 3.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `agrees with the allocation and the coalition evaluation` (60 seeded scenarios: members plus the rest equal `seatCount` in both years, seats equal `evaluateCoalition`, stops non-decreasing and equal to exact seat shares, majority equals `seats >= majorityRequired`); `reaches an odd-seat majority exactly` (11 seats, stop '54.55') |
| Determinism: repeated runs, JSON round trip, ru/en/he | `is deterministic and survives a JSON round trip`; `does not depend on the order or repeats of the IDs`; the view tests render the same seats in every locale |
| Threshold below / at / above | Not changed: the item reads `runSeats` results; `reports a year without an allocation` covers the case where no list qualifies |
| Exact remainder tie → tieBreakOrder → party ID | Not changed: the allocation is read, not recomputed; the fixture's seats are hand-checked |
| Fixtures from exact inputs | `allocates the hand-checked seats in year 0 and year 3`; `shows a party that gains the majority by year 3` (full result object) |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `gives an empty set no seats and no majority`; `coalitionKey` of none is ''; `lists nothing for invalid input`; `asks for a choice when nothing is ticked` |
| Single element | `shows a party that gains the majority by year 3` (one party); e2e `the Coalitions tab set can cross the majority line` |
| All values equal | e2e `follows three coalitions at most` (five equal lists, ten minimal winning sets) |
| Maximum size (20 / 30 / 10) | Three followed sets at most: store `follows three sets at most`, choice `disables the unticked entries once three are ticked`; the list is capped by the runner's existing `LISTED_COALITIONS` |
| No feasible solution | `says so when today has no minimal winning coalition`; `reports a year without an allocation`; `gives the reason in a year without an allocation`; `refuses an unknown party`; a set losing a party is dropped |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Pixel geometry of the pie and the majority mark | The gradient stops and the mark's custom property come from the engine and are asserted as text; the CSS only draws them |
| English and Hebrew wording of the new strings | Reviewed as a whole in M3-05; the tests require every key in every locale |
| A coalition search for year k | Out of scope by the memo and Section 14.2 |
| Phone sticky behaviour of the chooser | The phone keeps page scroll by design (M2-29); the e2e checks only that the chooser stands above the results |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-30 | `npx vitest run`; `npm run typecheck`; `npm run lint`; `npx prettier --check src tests` | red: 59 failed, 2308 passed of 2367; typecheck, lint, format clean | All four failing files are M2-30's and fail for the intended reason: engine 12 ("buildCoalitionFuture is not implemented"), choice 14 (the `coalitionChoice.ts` stub throws), store 9 (the toggle is a no-op; every clearing test now proves the set was followed first), view 24 (no chooser region, no cards, missing keys). Passing new tests are guards: the editor stays on the other five views, invalid input lists nothing, the fixture, limits and starting state |
| 2026-10-30 | `npm run build`; `npx playwright test tests/e2e/future.spec.ts --reporter=line` | red: 8 failed, 6 passed | The four new tests fail on both projects waiting for the chooser region; the three existing future and composition tests pass |
| 2026-10-30 | `npx vitest run`; `npm run typecheck`; `npm run lint`; `npx prettier --check src tests` | blocked: 2370 passed, 1 failed of 2371; typecheck, lint, format clean | Every M2-30 test passes (engine, choice, store, view). The one failure is the size guard `stays within 350 kB`: 362 481 bytes against 358 400 (M2-29 closed at 347 540). See the memo's Blocker |
| 2026-10-30 | `npm run build`; `npm run test:e2e` | green: 200 passed, 32 skipped by design | Both projects, msedge, offline file. Screenshots of the Israeli example at 1280 × 800 and 390 × 844 with two coalitions ticked: chooser left (desktop) and above (phone), pies side by side, majority mark at 61 of 120 (183°) |
| 2026-10-30 | `npx vitest run`; `npm run typecheck`; `npm run lint`; `npx prettier --check src tests`; `npm run build`; `npm run test:e2e` | green: 2371 passed of 2371; typecheck, lint, format clean; e2e 200 passed, 32 skipped by design | After the approved 450 kB budget (spec Section 2, `tests/build/offline.test.ts`): the size guard passes at 362 481 bytes, gzip 100.94 kB |
| 2026-10-30 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | unit 2371/2371; e2e 200 passed, 32 skipped by design; offline file 362.48 kB within the 450 kB budget, gzip 100.94 kB |
