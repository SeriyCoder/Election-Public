# Test Plan — M7-01 Exact party-first engine and versioned scenario

| Field | Value |
| --- | --- |
| item | M7-01 |
| memo | `doc/work/archive/phase-3/M7-01-memo.md` |
| created | 2026-10-30 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/helpers/scenarios.ts` | Vitest fixture | Version 4 party-mode scenarios with exact share fractions, near-budget canonical denominators, and known, zero and unknown population cases. |
| `tests/engine/partyMode.test.ts` | Vitest | Exact votes, threshold, seats, coalitions, unknown projections, zero votes, ties, determinism and 40 separate lists. |
| `tests/engine/schema.test.ts` | Vitest | Version 4 validation and round trip; migration of versions 1–3; raw and canonical denominator bounds, including exactly 2,048 and 2,049 digits. |
| `tests/engine/allocate.test.ts`, `tests/engine/threshold.test.ts` | Vitest | Existing Hamilton and threshold decision regressions remain intact. |
| `tests/engine/edit.test.ts` | Vitest | Party-mode-safe group fields, zero-share add/duplicate/delete, positive-share protection, composition-safe group deletion, and complete known compositions when a group is added or duplicated. |
| `tests/engine/future.test.ts` | Vitest | Known and zero party-mode group populations in years 0 and 1; unknown composition and zero-turnout population remain unknown. |
| `tests/engine/report.test.ts` | Vitest | Existing maximum-size coverage: 20 groups, 30 parties and 10 blocks. |
| `tests/ui/book.test.ts` | Vitest | Questionnaire build and the exact threshold-boundary regression. |
| `tests/ui/editor.test.tsx`, `tests/ui/views.test.tsx` | Vitest | Group-first controls are absent in party mode; party colour remains editable; protected deletes explain the constraint; unavailable-projection explanation is covered. |
| `tests/ui/store.test.ts` | Vitest | Build and skip preserve exact party shares; party-mode results remain locale-independent. |
| `tests/e2e/book.spec.ts` | Playwright | Real questionnaire build preserves a party exactly at the threshold on desktop and phone. |
| `tests/e2e/editorPages.spec.ts`, `tests/e2e/future.spec.ts` | Playwright | Adding and duplicating groups, party colour editing, and known group populations in the future report on desktop and phone. |
| `tests/e2e/interaction.spec.ts` | Playwright | An import whose canonical denominators exceed the limit is rejected without replacing the existing scenario or seats. |
| `tests/e2e/performance.spec.ts` | Playwright | Desktop import of 40 lists and projection of eight known groups near the denominator limit, with median response at most 200 ms. |

## Happy Path

- A version 4 party-mode scenario with no groups calculates exact party votes,
  Hamilton seats and coalition results.
- Exact shares `13/400` and `387/400` allocate 4 / 116 seats at a 3.25%
  threshold, including when built or skipped from the questionnaire.
- Version 4 export/import preserves the scenario and its result; versions 1–3
  retain group-mode results after migration.
- The browser regression exercises the full questionnaire and expects 4 / 116
  seats for the entered 3.25% / 96.75% shares.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `preserves exact seat sums for seeded party-share distributions` checks 30 generated cases with 101 seats; `allocates every seat across forty separate electoral lists` checks the 120-seat sum. |
| Determinism: repeated runs, JSON round trip, ru/en/he | `serializes repeated exact results identically`; `accepts a group-free scenario with exact non-terminating shares` compares version 4 results before and after import/export; `keeps party-first seat results unchanged in every language`. |
| Threshold below / at / above | `classifies a %s/400 share exactly at the threshold boundary` tests 12/400, 13/400 and 14/400 against 13/400; `reports no allocation when every party is below the threshold`. |
| Exact remainder tie → tieBreakOrder → party ID | `resolves exact remainder ties by persisted tie-break order`; `uses party ID as the final exact-tie fallback`. |
| Fixtures from exact inputs | Exact fractions in `partyMode.test.ts`; the audited 3.25% questionnaire regression expects 4 / 116, not rounded report values. |
| No float decisions | Exact fraction assertions cover party votes and threshold outcomes; existing UI static-scan tests prohibit float parsing or rounding outside the formatter. |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Invalid root / no groups | `rejects non-object root` covers malformed input; party-mode tests exercise a valid scenario with no groups. |
| Single element | `allocates all seats to one party without electorate groups`. |
| All values equal | `uses party ID as the final exact-tie fallback` uses four equal shares. |
| Maximum size (20 / 30 / 10) | `handles 20 groups, 30 parties and 10 blocks`; party mode separately tests 40 distinct lists. |
| No feasible solution | `reports no allocation when turnout or validity is zero`; `reports no allocation when every party is below the threshold`; `reports a deadlock when the only majority is forbidden`. |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Share redistribution, locks, edited-value preservation and party share controls | Deferred to M7-02 and M7-03. |
| Composition editor, population-reference data and demographic consistency UI | Deferred to M7-04. |
| Recalculating party results from group-turnout experiments | Deferred to M7-05. |
| The 2022 historical preset and its provenance | Deferred to M7-06; M7-01 tests representation, not historical sourcing. |
| Making questionnaire composition optional or changing its full flow | Deferred to M7-07; this plan only checks exact shares on the existing flow. |
| Final political copy and Hamilton wording review | Deferred to M7-08. |

## Audit Coverage Gaps

The [2026-10-31 audit](../../audits/2026-10-31-audit.md) reproduced these
memo-scope discrepancies against the running modules. Focused regressions
failed for the intended reasons and now pass after the repairs; the run record
below also records the full gates.

- Adding or duplicating a party-mode group with a known composition must add
  its zero share, keep the scenario valid and preserve existing votes and
  seats; an unknown composition remains unknown.
- A party-mode party retains its colour-editing control.
- When a successful party-mode projection determines a group's population,
  the future report must show its known base and projected values; truly
  unknown population must not be reported as zero.

The subsequent close check also reproduced a canonicalization gap: raw
denominators can share an under-budget value while reducing to distinct
denominators whose total exceeds the limit. The resulting accepted scenario
failed revalidation. The added schema and browser regressions reproduced the
defect and now pass; the 2,048-digit boundary and valid near-budget cases
continue to pass.

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-30 | `npm test` | RED: 26 failed, 2467 passed (2493 total); 4 files failed, 36 passed. | Failures are in the new party-mode, v4 schema/migration, questionnaire and locale cases; the current implementation does not yet support the expected version 4 behavior. |
| 2026-10-30 | `npm run test:e2e -- --grep "exact threshold-boundary share"` | RED: 2 failed (desktop and phone). | Build succeeded. Both browser runs reached the expected assertion but received 0 / 120 instead of 4 / 116, reproducing the audited rounding defect. |
| 2026-10-30 | `npm run typecheck` | Pass. | No TypeScript errors in the new tests. |
| 2026-10-30 | `npx eslint tests/engine/helpers/scenarios.ts tests/engine/partyMode.test.ts tests/engine/schema.test.ts tests/ui/book.test.ts tests/ui/store.test.ts tests/e2e/book.spec.ts --max-warnings 0` | Pass. | Modified test files only. |
| 2026-10-30 | `npx prettier --check tests/engine/helpers/scenarios.ts tests/engine/partyMode.test.ts tests/engine/schema.test.ts tests/ui/book.test.ts tests/ui/store.test.ts tests/e2e/book.spec.ts` | Pass. | Modified test files only. |
| 2026-10-30 | `npm run format` | Pass. | Formatted the final engine, UI, locale and test changes. |
| 2026-10-30 | `npm test` | Pass: 2511 tests across 40 files. | Full Vitest suite after party-mode editor, delete guards and aggregate denominator-limit coverage. |
| 2026-10-30 | `npm run typecheck` | Pass. | Strict TypeScript check. |
| 2026-10-30 | `npm run lint` | Pass. | ESLint across the repository with zero warnings. |
| 2026-10-30 | `npx prettier --check` on all changed TypeScript files | Pass. | Engine, UI, i18n and test changes use the repository format. |
| 2026-10-30 | `npm run test:e2e` | Pass: 220 passed, 36 skipped. | Full offline browser suite; production file 385.44 kB, within the 450 kB budget. |
| 2026-10-31 | `npm test` | Pass: 2511 tests across 40 files. | Audit rerun of the existing suite; the three coverage gaps above remain. |
| 2026-10-31 | In-memory Vite module reproduction | Three discrepancies confirmed. | Add and duplicate report missing `parties[0].composition.G2`; party colour control absent; a known group reports null / null while its population total is 1000 / 1100. No source or tests changed. |
| 2026-10-31 | `npx vitest run tests\engine\edit.test.ts tests\engine\future.test.ts tests\ui\editor.test.tsx` | RED: 5 failed, 413 passed. | Adding and duplicating a group omit known composition fields; year-0 and year-1 group populations are null; party colour input is absent. The unknown-composition and zero-turnout guards pass. |
| 2026-10-31 | `npm test` | RED: 5 failed, 2513 passed; 3 failed and 37 passed files. | The same three discrepancies account for every failure. |
| 2026-10-31 | `npm run test:e2e -- --grep "M7-01 party-mode regressions" --workers 2` | RED: 6 failed, on desktop and phone. | The built offline file reproduces disabled export after group addition, the missing colour input, and `-` for a known group population. |
| 2026-10-31 | `npm run typecheck` | Pass. | New tests compile without TypeScript errors. |
| 2026-10-31 | `npx eslint` and `npx prettier --check` on the six regression test files | Pass. | The fixture, two engine tests, UI test and two browser tests are lint-clean and formatted. |
| 2026-10-31 | `npm test` (`/4-close` gate) | BLOCKED: 5 failed, 2513 passed; 3 failed and 37 passed files. | The full close gate independently reproduced the three documented defects. The remaining close checks were not run after this failed gate. |
| 2026-10-31 | `npx vitest run tests\engine\edit.test.ts tests\engine\future.test.ts tests\engine\partyMode.test.ts tests\ui\editor.test.tsx` | Pass: 434 tests. | The repaired group edits, exact projection, unknown cases and colour control all pass. |
| 2026-10-31 | `npm run test:e2e -- --grep "M7-01 party-mode regressions" --workers 2` | Pass: 6 tests. | Group additions and copies, party colours and future populations work in the offline desktop and phone projects. |
| 2026-10-31 | `npm test` | Pass: 2518 tests across 40 files. | Full suite after the regression repairs. |
| 2026-10-31 | `npm run typecheck` and `npm run lint` | Pass. | Strict TypeScript and repository-wide ESLint checks. |
| 2026-10-31 | `npm run format` and `npx prettier --check` on the four final source files | Pass. | Repository formatting was unchanged; the final projection guard is formatted. |
| 2026-10-31 | `npm run test:e2e -- --workers 2` | Pass: 226 passed, 36 skipped. | Full offline desktop and phone suite after the final source change; production file 386.32 kB. |
| 2026-10-31 | Near-budget 40-list Vite and offline-browser probe | Defect reproduced; close not completed. | Raw input with 2,021 distinct-denominator digits validates; the canonical result fails revalidation with 21 `too-long` issues, and the imported browser scenario hides its results. |
| 2026-10-31 | `npx vitest run tests\engine\schema.test.ts -t "canonical\|aggregate distinct-denominator\|near the canonical"` | RED: 4 failed, 4 passed, 176 skipped. | Share, composition, turnout and the 2,049-digit cases are wrongly accepted. The exact 2,048-digit boundary and accepted near-budget round trips pass. |
| 2026-10-31 | `npm test` | RED: 4 failed, 2521 passed across 40 files. | Only the four intended canonical-budget cases fail; all other tests pass. |
| 2026-10-31 | `npm run test:e2e -- --grep "M7-01 (rejects canonical\|performance near)" --workers 2` | RED: 2 failed. | Desktop and phone import tests find no `too-long` issue because the invalid canonical scenario is accepted. The separate performance cases were not discovered in this run and were moved to top-level test registration before being rerun. |
| 2026-10-31 | `npx playwright test performance.spec.ts --grep "exact denominator budget" --project desktop --workers 1 --reporter json` | Pass: 2 tests. | Nine measurements each: 40-list import median 10.2 ms; eight-group projection median 9.8 ms, both within 200 ms. |
| 2026-10-31 | `npm run typecheck`; targeted `npx eslint` and `npx prettier` | Pass. | The fixture, schema, browser import and performance tests compile, lint and format cleanly. |
| 2026-10-31 | `npm test` (`/4-close` gate) | BLOCKED: 4 failed, 2521 passed across 40 files. | The independently rerun close gate confirms the canonical-budget defect; no other close checks were run after the failed gate. |
| 2026-10-31 | `npx vitest run tests\engine\schema.test.ts -t "canonical\|aggregate distinct-denominator\|near the canonical"` | Pass: 8 passed, 176 skipped. | Both exact boundaries, all canonical checks and near-budget round trips pass. |
| 2026-10-31 | `npm run test:e2e -- --grep "rejects canonical denominator overflow" --workers 2` | Pass: 2 tests. | The invalid import is rejected and the existing scenario and seats remain intact on desktop and phone. |
| 2026-10-31 | `npm test` | Pass: 2525 tests across 40 files. | Full suite after the canonical-budget repair. |
| 2026-10-31 | `npm run typecheck`, `npm run lint`, `npm run format` and repository-wide Prettier check | Pass. | Strict types, lint and formatting are clean. |
| 2026-10-31 | `npm run test:e2e -- --workers 2` | Pass: 230 passed, 38 skipped. | Full offline desktop and phone suite, including both new performance checks; production file 386.33 kB. |
| 2026-10-31 | `npx playwright test performance.spec.ts --grep "exact denominator budget" --project desktop --workers 1 --reporter json` | Pass: 2 tests. | Nine measurements each after repair: 40-list import median 10.1 ms; eight-group projection median 10.6 ms, both within 200 ms. |
| 2026-10-31 | `npm test`; `npm run typecheck`; `npm run lint`; repository-wide Prettier check (`/4-close` gate) | Pass: 2525 tests across 40 files; types, lint and format pass. | Independently rerun for close. |
| 2026-10-31 | `npm run test:e2e -- --workers 2` (`/4-close` gate) | Pass: 230 passed, 38 skipped. | Independently rerun offline desktop and phone suite; production file 386.33 kB. |
