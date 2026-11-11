# Test Plan — M7-09 Simplified controls and legacy safety

| Field | Value |
| --- | --- |
| item | M7-09 |
| memo | `doc/work/archive/phase-3/M7-09-memo.md` |
| created | 2026-10-31 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/legacyConversion.test.ts` | Vitest | Exact group and party conversion, compatibility, zero and invalid inputs, uniform and unequal validity, round trips, future projections and deterministic seats. |
| `tests/ui/legacySimplification.test.tsx` | Vitest | Obsolete editor and result controls absent; legacy notice and explicit conversion entry point. |
| `tests/ui/coalitionRunner.test.ts`, existing editor and store tests | Vitest | Safe restriction edits, preview replacement, worker errors and stale messages. |
| `tests/build/compactLocales.test.ts`, `tests/build/offline.test.ts` | Vitest | Lossless locale packing, production reconstruction, offline policy and unchanged size budget. |
| `tests/e2e/legacyConversion.spec.ts` | Playwright | Offline user-visible removal, preview, cancel, confirm, independent original export and preserved seats. |
| Existing engine, UI, offline and browser suites | Vitest and Playwright | Original scenario behavior, pair exceptions, accessibility, mobile, RTL, offline policy and size budget. |

## Happy Path

- An unconverted legacy scenario keeps its exact original results while the
  interface presents only the simplified controls and effective party pairs.
- A user previews exact conversion differences, cancels without mutation or
  explicitly confirms and can then export the preserved original separately.
- Uniform nonstandard validity changes absolute valid votes but not current
  exact party shares; the selected future year displays the difference.

## Seat-Calculation Correctness

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `preserves the seat sum and allocation over seeded exact legacy fixtures`. |
| Determinism: repeated runs, JSON round trip, ru/en/he | `round-trips and produces identical exact results in every locale`; versioned legacy cases. |
| Threshold below / at / above | `preserves the exact threshold decision` at 3.24%, 3.25% and 3.26%, plus the existing exact threshold suite. |
| Exact remainder tie → tieBreakOrder → party ID | Existing Hamilton tie suite and the odd 101-seat conversion fixture. |
| Fixtures from exact inputs | `preserves exact current shares and group assumptions without mutating the original` checks 1/5, 3/10, 475, 999/2 and 20/20/31/30/0. |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Invalid / empty input | `refuses invalid input explicitly without mutating it`; existing schema empty-input tests. |
| Single party | Existing schema and allocation tests; conversion must preserve it. |
| All values equal | Seeded exact legacy fixtures and exact remainder tie. |
| Maximum size (20 / 30 / 10) | `keeps every effective party pair in a large valid legacy scenario`; 20-group, 30-party precision-budget fixture; existing performance tests. |
| No feasible allocation | `keeps a no-allocation state when every party is below the threshold`; zero valid votes refuse conversion without invented shares. |
| Unknown composition | `retains unknown composition when normalizing an existing party scenario`. |
| Zero-vote party and zero-turnout group | Exact fixture retains null composition and known linked group preferences. |
| Refusals and exceptions | `expands effective restrictions after exceptions and preserves both directed refusals`. |
| Nonuniform validity | `refuses a group-validity mismatch rather than changing the voter matrix`. |
| Old projection | `shows a real selected-year future difference without changing the source`. |
| Stale preview and exact precision | Changed input and selected year each refuse confirmation; a valid 20-group, 30-party exact matrix exceeds the v5 precision budget without mutation. |
| Hidden restriction edit | A last restricted destination cannot be removed; an invalid empty group can choose a replacement; conflicting hidden overrides cannot be silently changed. |
| No-allocation normalization | A zero-validity party scenario can gain an allocation after conversion; the preview explicitly discloses the difference. |
| Worker and download failures | Worker unavailability, posting errors and late success after failure remain explicit; original-download failure reports its own error without replacing the scenario. |
| Literal translation markers | Repeated words and literal private-use characters survive packing exactly; the built production tables equal the sources. |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Demographic labels as evidence of actual voter preferences | They are user assumptions, not facts about real voters. |
| New critical-party threshold search | M7-10, not this conversion item. |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-31 | `npm run typecheck`; targeted `npx eslint` and `npx prettier` | Pass | The temporary type-correct conversion stub and all new tests compile and are lint-clean and formatted. |
| 2026-10-31 | `npx vitest run tests\engine\legacyConversion.test.ts tests\ui\legacySimplification.test.tsx --reporter=dot --no-color` | RED: 29 failed, 1 passed | The exact legacy fixture passes. Conversion cases reach the deliberate unimplemented stub; removed-control, notice and lifecycle checks fail for the intended missing behavior. |
| 2026-10-31 | `npm test -- --reporter=dot --no-color` | RED: 29 failed, 2777 passed, 50 files | Only the new conversion and simplified-interface assertions fail; all 48 prior files pass. |
| 2026-10-31 | `npx playwright test legacyConversion.spec.ts --project=desktop --reporter=line --timeout=10000 --workers=1` | RED: 4 failed | The old participation fields are still rendered and the explicit conversion action is missing. Tests use the last fresh offline build. |
| 2026-10-31 | Independent exact-fraction precision fixture check | Pass | The valid 20-group, 30-party matrix requires 9,361 distinct denominator digits for its compositions and effective turnouts, exceeding the existing 2,048-digit budget without rounding. |
| 2026-10-31 | Focused late-regression runs in Vitest and Playwright | RED, then pass | Observed missing handling before fixing locale packing, restricted-destination recovery, hidden overrides, no-allocation disclosure, scenario replacement, worker failures and original-download errors. |
| 2026-10-31 | `npx playwright test 'editorPages.spec.ts\|future.spec.ts\|interaction.spec.ts' --reporter=line --timeout=15000 --workers=2` | Initially 56 passed, 4 skipped, 2 failed | Both failures were an incorrect expected composition for the chosen Y fixture. Exact votes are 60 and 320, so the subsequent isolated desktop and phone checks pass at 15.79% and 84.21%. |
| 2026-10-31 | `npm run test:e2e -- --workers=1 --reporter=line` | Initially 313 passed, 39 skipped, 2 failed | Both failures expected the obsolete Russian preset label. Its confirmation/cancellation test was corrected to the approved new label and passed in isolation on desktop and phone. |
| 2026-10-31 | `npm test -- --reporter=dot --no-color` | Pass: 50 files, 2825 tests | Includes exact conversion, seat correctness, all locale reconstruction and the in-memory offline budget gate. Repeated after the final build-source formatting. |
| 2026-10-31 | `npm run typecheck`; `npm run lint`; `npm run format` | Pass | Strict TypeScript, ESLint and project formatter. The changed stylesheet and build compactor, omitted by the standard formatter, also pass `npx prettier --check`. |
| 2026-10-31 | `npm run test:e2e -- --workers=1 --reporter=line` | Pass: 315 tests, 39 skipped | Fresh offline build; desktop, phone, RTL, accessibility and performance coverage. Skips are existing platform-specific conditions. |
| 2026-10-31 | `npm run build`; SHA-256 comparison and UTF-8/line-ending checks | Pass | The final 442,855-byte offline HTML is byte-identical to the browser-tested file and below the 460,800-byte limit. The 32 touched source, build and test files are UTF-8 without BOM, use LF and contain no replacement characters. |
| 2026-10-31 | `/4-close`: `npm test -- --reporter=dot --no-color`; `npm run typecheck`; `npm run lint`; `npm run format` | Pass | Independent close gate: 50 files and 2825 tests passed; typecheck, lint and formatting passed. |
| 2026-10-31 | `/4-close`: `npm run test:e2e -- --workers=1 --reporter=line` | Pass: 315 tests, 39 skipped | Independent fresh-build desktop and phone suite; the offline file is 442,855 bytes against the unchanged 460,800-byte limit. |
