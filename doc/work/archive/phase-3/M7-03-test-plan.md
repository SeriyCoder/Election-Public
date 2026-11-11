# Test Plan — M7-03 Coalition workspace

| Field | Value |
| --- | --- |
| item | M7-03 |
| memo | `doc/work/archive/phase-3/M7-03-memo.md` |
| created | 2026-10-31 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/workspaceEdits.test.ts` | Vitest | Atomic basis creation, party and overall-turnout edits, locks, restrictions, failures, legacy mode, exact seats, ties, threshold, round trips, locales and maximum sizes. |
| `tests/engine/helpers/workspace.ts` | Vitest and Playwright helper | Independent exact two-group and three-party fixtures, including draft-only extension fields. |
| `tests/ui/coalitionWorkspace.test.tsx` | Vitest | Navigation, all three locales, party and turnout controls, comparison and history, invalid input, no allocation, legacy rendering and lock lifecycle. |
| `tests/e2e/coalitionWorkspace.spec.ts` | Playwright, desktop and phone | Actual controls, linked and ordinary edits, locks, chosen coalition, baseline, 2022 match, refusal, non-rounding, legacy data, RTL, axe, responsive layout and 200 ms at 30 parties. |
| `tests/build/compactLocales.test.ts` | Vitest | RED-first build-only key compaction, mismatched and malformed tables, Unicode and escaped values, and exact comparison of all three production-transformed tables. |
| `tests/engine/partyShares.test.ts`, `tests/engine/linkedTurnout.test.ts`, `tests/engine/allocate.test.ts`, `tests/build/offline.test.ts` | Vitest | Existing exact redistribution, constrained transfer, allocation and unchanged offline security and size gates. |
| Existing UI and browser suites | Vitest and Playwright | Retained results, compare tables, baseline operations, historical reference, import/export, worker cancellation and offline behavior. |

## Happy Path

- Three-party shares 20/30/50 become exactly 40/30/30 when the middle party
  is locked; the 101 seats become 41/30/30. The chosen first and second
  parties have 71 seats and the saved baseline reports the actual change.
- A known two-group basis is created only on a successful direct edit; a
  subsequent group-turnout change uses its updated preferences. Overall
  turnout scales the known group profile and leaves seats unchanged.
- Unknown party composition does not block ordinary party controls or seats.
  The historical 2022 comparison remains separate from the user's baseline.

## Seat-Calculation Correctness

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `keeps nonnegative integer seats summing to an odd total for generated edits`; `handles 20 groups, 30 parties and 10 blocks without requiring composition` |
| Determinism: repeated runs, JSON round trip, ru/en/he | `gives identical exact results across repeats, round trips and locales`; existing locale and serialization tests |
| Threshold below / at / above | `classifies an exact ... percent edit at the 10 percent barrier` with 9.9999, 10 and 10.0001 |
| Exact remainder tie → tieBreakOrder → party ID | `resolves exact remainder ties by stored order and then party ID` |
| Fixtures from exact inputs | `checks the linked fixture independently against existing exact edits`; `creates a consistent basis atomically with a direct share edit`; `honors locks and keeps exact extension fields on the original draft` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty or invalid input | `refuses invalid or empty input explicitly without mutating it`; `keeps historical facts available when the current draft is invalid` |
| Single party | `preserves a single party at 100 percent and refuses an impossible decrease` |
| Equal values, zero turnout and restoration | `scales a newly available basis on overall turnout without changing seats`; `shows no allocation as unavailable rather than a false zero` |
| Maximum size (20 / 30 / 10) | `handles 20 groups, 30 parties and 10 blocks without requiring composition`; browser `updates party seats within 200 ms at the supported 30-party size` |
| No feasible transfer, locked shares or turnout overflow | `preserves destination restrictions and refuses impossible group transfers`; `refuses a locked change without creating or mutating a basis`; `refuses an overall turnout that would push a group over 100 percent` |
| Suspended or unknown demographics | `does not silently rebuild suspended assumptions during a party edit`; `keeps party and overall-turnout edits available without known compositions` |
| Legacy data | `rejects party edits on legacy group-mode inputs without changing them`; browser `keeps old group-mode semantics and exposes group turnout without national party inputs` |
| Display rounding and historical identity | Browser `does not save rounded share or turnout values on focus and blur`; `shows the 2022 comparison by verified identity and makes it reversible` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Claims that demographic assumptions are real historical voter behavior | Composition is unknown in the historical preset; the simulator cannot infer individual voters from labels. |
| Publication, Hebrew-default startup and future critical combinations | They belong to later items and do not change this workspace's exact calculation contract. |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-31 | `npm run typecheck`; targeted `npx eslint ... --max-warnings 0` | Pass | Tests compile and lint cleanly; two signature-only throwing stubs have no production behavior. |
| 2026-10-31 | `npx vitest run tests\engine\workspaceEdits.test.ts -t "checks the linked fixture independently"` | Pass | Existing linked engine independently confirms the 7/10 composition, 111/175 vote share and 64/37 seats. |
| 2026-10-31 | `npm test` | RED: 28 failed, 2713 passed | The new workspace and navigation are absent; party locks are pruned and the two new exact edit signatures throw their explicit not-implemented errors. Existing tests pass. |
| 2026-10-31 | `npx vite build`; `npx playwright test coalitionWorkspace.spec.ts --project=desktop --workers=4` | RED: 8 failed | The original eight cases fail at the absent coalition workspace, not tooling. |
| 2026-10-31 | `npx playwright test coalitionWorkspace.spec.ts --project=desktop -g "does not save rounded|shows the 2022 comparison"` | RED: 2 failed | Both cases fail at the absent workspace. |
| 2026-10-31 | `npx playwright test coalitionWorkspace.spec.ts --project=desktop -g "updates party seats within 200 ms"` | RED: 1 failed | The performance case fails at the absent workspace; the 200 ms measurement remains a GREEN gate. |
| 2026-10-31 | `npx vitest run tests\build\compactLocales.test.ts` | RED: 8 failed | The signature-only compactor threw its not-implemented error before the size-preserving build implementation. |
| 2026-10-31 | `npx vitest run tests\build\compactLocales.test.ts` | Pass: 9 tests | Every shipped translation table matches the source; reordered, escaped and invalid input cases are covered. |
| 2026-10-31 | `npm run format`; `npx prettier --write build\compactLocales.ts src\ui\styles.css` | Pass | All changed source, test, build and CSS files formatted. |
| 2026-10-31 | `npm test`; `npm run typecheck`; `npm run lint` | Pass: 2748 tests | Complete Vitest suite, strict types and lint pass, including the offline policy and 450 KiB gate. |
| 2026-10-31 | `npm run test:e2e -- --workers=2 --reporter=list` | Pass: 292; 38 skipped | Fresh offline build; desktop and phone, RTL, accessibility, exact edits, old-screen regressions and 200 ms at 30 parties. The production HTML is 442,867 bytes. |
| 2026-10-31 | `/4-close`: `npm run format`; `npm test`; `npm run typecheck`; `npm run lint`; `npm run test:e2e -- --workers=2 --reporter=list` | Pass: 2748 unit, 292 browser; 38 browser skipped | Independent close gate; production single-file security and size checks retained. |
