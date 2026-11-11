# Test Plan — M7-06 Historical 2022 preset and reference

| Field | Value |
| --- | --- |
| item | M7-06 |
| memo | `doc/work/archive/phase-3/M7-06-memo.md` |
| created | 2026-10-31 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/helpers/historical2022.ts` | Vitest fixture | Independently transcribed 40 list IDs, vote counts and official seats, plus separately calculated Hamilton seats. |
| `tests/engine/historical2022.test.ts` | Vitest | Source identity and totals, exact preset and turnout, 40 separate threshold entries, historical versus Hamilton seats, exact seat invariants and comparison matching. |
| `tests/ui/historical2022.test.tsx` | Vitest / Preact SSR | Separate preset, all localized names, historical source and method labels, 40 rows, saved-baseline independence and invalid-draft availability. |
| `tests/e2e/historical2022.spec.ts` | Playwright | Offline preset and exact export, reference values, explicit mapping, collision handling, scenario replacement, saved baseline, RTL, axe and phone fit. |
| Existing engine, UI and build tests | Vitest | Existing scenarios, exact arithmetic, offline build and size budget. |

In `/2-tests`, `src/engine/historical2022.ts` and
`src/engine/historicalReference.ts` were type-compatible, behavior-free stubs.
They were implemented in `/3-implement`.

## Happy Path

- Check every list and official seat in the independently transcribed table;
  the first 13 votes total 4,693,527 and the remaining 27 total 71,215.
- The fresh preset contains 40 separate exact party shares, historical turnout,
  no groups and unknown compositions. It retains the 99.9% model validity,
  whose absolute ballots differ from the separately displayed official totals.
- The existing threshold qualifies the first ten lists, and the simulator's
  120 Hamilton seats are 31 / 23 / 14 / 12 / 11 / 8 / 6 / 5 / 5 / 5. Show the
  distinct official historical seat array without using it in allocation.
- A permanent reference is available in all locales without a saved baseline.
  Match an unchanged catalog identity automatically, and allow an explicit
  one-to-one mapping when identity is otherwise unknown.

## Seat-Calculation Correctness

| Check | Test name |
| --- | --- |
| Exact sum, odd sizes and generated inputs | `keeps exact odd-seat sums across seeded seat sizes and the 40-list case`; the 20-group, 40-party, 10-block interactive case also checks a 120-seat sum. |
| Determinism: repeat, JSON round trip and ru/en/he | `is deterministic across repeats, JSON round trips and all UI locales` checks exact seats and coalition results. |
| Threshold below / at / above | `uses exact %s-threshold shares in the 40-list preset` checks 3.249%, 3.25% and 3.251% as fractions. |
| Exact remainder tie and ID fallback | `resolves exact equal remainders by tie order and then party ID` uses 101 seats and equal exact shares. |
| Independent fixtures | `retains the independent 40-list table and official seats without merging`; `derives every party share from its integer count and all valid votes`; `allocates Hamilton seats independently from official Bader-Ofer seats`. |
| No floating-point seat decisions | The threshold, shares, turnout and comparison assertions use exact rational values; timings are used only for the performance budget. |

## Edge And Degenerate Cases

| Case | Test name / expectation |
| --- | --- |
| Empty demographic inputs | `keeps seats available without groups and refuses allocation at zero turnout`; every historical composition remains null. |
| Single and equal parties | Existing engine suite; this item's exact tie case uses two equal positive parties and 38 independent zero-share lists. |
| Maximum operational case | `runs the 40-list preset with 20 groups and 10 blocks within the interaction budget`: seven samples, median under 200 ms, exact 120-seat sum. |
| No allocation | Zero turnout has no allocation; historical comparison shows unavailable current values rather than fabricated zeros. |
| Below-threshold lists | All 30 lower lists remain distinct, each below the threshold with zero seats; the 27 smaller lists are never aggregated. |
| Names, splits and mapping | Unchanged IDs auto-match, but renamed and split lists and similar names do not; explicit suppression and one-to-one mapping are reversible, with duplicate and unknown references refused. |
| Reversible matching | Supplementary store and browser cases check removing and restoring automatic and explicit matches, refusing collisions, and retaining choices through a temporary invalid draft. These passed after implementation rather than providing new RED evidence. |
| Draft and baseline | Invalid current drafts do not erase historical facts; user baseline and reference remain independent, including replacement and explicit match cleanup. |
| RTL, accessibility and offline | The browser spec runs in both projects, watches network and console, checks serious/critical axe findings and phone overflow. The production in-memory build retains its 450 KiB gate and prohibits runtime URLs. |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| A Bader–Ofer allocator or a demographic composition for historical parties | Neither exists in this item; official seats are published facts and demographic composition is unknown. |
| Redesigned coalition sliders and the final location of the reference | They are M7-03; this item tests the existing comparison view and a reusable reference. |
| A live request to the source | No network is allowed at runtime or in tests. Source access and the HTTP 403 limitation are documented in the memo. |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-31 | `npm run typecheck` | Pass | All new tests and behavior-free stubs compile under strict TypeScript. |
| 2026-10-31 | `npx eslint` on the six changed TypeScript files | Pass | Zero lint warnings. |
| 2026-10-31 | `npx prettier --write` on the six changed TypeScript files | Pass | Formatting applied before the checks. |
| 2026-10-31 | `npm test` | **RED:** 29 failed, 2664 passed; 2 failed / 43 passed files | Failures are the empty historical table, explicit unimplemented preset / comparison stubs, missing preset and missing historical UI / translations. |
| 2026-10-31 | `npx vite build` | Pass | Offline build before implementation: 433,644 bytes. |
| 2026-10-31 | `npx playwright test 'historical2022.spec.ts' --workers=1 --timeout=8000 --reporter=list` | **RED:** 12 failed, desktop and phone | The reference, match controls or historical preset are absent; no separate offline-guard failure was reported. |
| 2026-10-31 | The historical-preset browser case rerun alone on desktop | **RED:** 1 failed | The existing preset select resolved, but it does not yet contain `historical2022`; this is the intended missing behavior. |
| 2026-10-31 | `text-check.ps1` on new source, tests, memo and plan | Pass | UTF-8 without BOM; source / tests LF and working documents CRLF. |
| 2026-10-31 | Accessible IDI 2022 table, independently re-read | Pass | All 40 vote counts, list order and the ten official seat counts match the published table; the official site remained unavailable directly. |
| 2026-10-31 | Targeted historical, catalog, state, comparison and offline-build Vitest files | Pass | 740 tests; the historical file and 450 KiB build gate passed. |
| 2026-10-31 | `npx playwright test 'historical2022.spec.ts' --workers=1 --reporter=list` | Pass | 14 desktop and phone cases, including additional match reversal; RTL, axe, offline and phone fit passed. |
| 2026-10-31 | First full `npm test` during implementation | 2 failed, 2710 passed | Two questionnaire-review expectations still used the old joint-list name; all three exact related expectations were updated to the approved 2022 label, not weakened. |
| 2026-10-31 | `npm test` after label updates | Pass | 45 files, 2712 tests. |
| 2026-10-31 | `npm run typecheck`; `npm run lint` | Pass | Strict TypeScript and zero-warning ESLint. |
| 2026-10-31 | `npm run format`; CSS Prettier | Pass | Required formatter and the CSS file were checked. |
| 2026-10-31 | First `npm run test:e2e -- --workers=1` during implementation | 8 failed, 262 passed, 38 skipped | Long options made the new match selector expand the page in all three languages; the phone viewport expansion also blocked navigation in two other tests. |
| 2026-10-31 | Temporary layout probe before and after the CSS change | Pass after fix | The long-name select shrank from 768 px to its 224 px desktop / 294 px phone container; the phone document shrank from 801 px to 360 px. The temporary probe was removed. |
| 2026-10-31 | Targeted layout, hint and offline browser cases after the CSS fix | Pass | All 10 desktop / phone cases pass in ru/en/he without changing their assertions. |
| 2026-10-31 | Final `npm test`; `npm run typecheck`; `npm run lint` | **GREEN:** 2712 tests, 45 files | Strict TypeScript and zero-warning ESLint passed after the layout repair; the in-memory production build remains within budget. |
| 2026-10-31 | Final `npm run test:e2e -- --workers=1` | **GREEN:** 270 passed, 38 skipped | Desktop and phone, offline, RTL, axe, performance and long names; built HTML is 459,905 bytes, below the 460,800-byte gate. |
| 2026-10-31 | `text-check.ps1` on changed source, tests, backlog, memo and plan | Pass | UTF-8 without BOM, no replacement characters or mixed line endings. |
| 2026-10-31 | `/4-close`: `npm run format`; `npm test`; `npm run typecheck`; `npm run lint` | **GREEN:** 2712 tests, 45 files | Independent close gate; formatter, strict TypeScript and zero-warning ESLint passed. |
| 2026-10-31 | `/4-close`: `npm run test:e2e -- --workers=1` | **GREEN:** 270 passed, 38 skipped | Independent desktop and phone gate; offline build remains 459,905 bytes, under 460,800 bytes. |
