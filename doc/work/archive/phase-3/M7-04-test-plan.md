# Test Plan — M7-04 Optional party composition

| Field | Value |
| --- | --- |
| item | M7-04 |
| memo | `doc/work/archive/phase-3/M7-04-memo.md` |
| created | 2026-10-31 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/compositionEdit.test.ts` | Vitest | Explicit initialization, exact proportions, refusals, precision limits, draft preservation, seat invariants and timing. |
| `tests/engine/composition.test.ts`, `tests/engine/partyMode.test.ts`, `tests/engine/partyShares.test.ts` | Vitest | Existing group reports, unknown projections and party-share regressions remain intact. |
| `tests/ui/editor.test.tsx`, `tests/ui/views.test.tsx` | Vitest | Optional collapsed control; no groups; distinct Other and unknown; partial known contribution; consistency and zero-vote state. |
| `tests/ui/store.test.ts`, `tests/ui/i18n.test.ts` | Vitest | Actual ru/en/he store results and complete language tables. |
| `tests/e2e/partyComposition.spec.ts`, `tests/e2e/helpers.ts` | Playwright | Offline editing and chart, exact export, worker-Blob race, invalid input, cancellation, confirmation, unknown report, RTL, focus, axe and overflow on desktop and phone. |
| `tests/build/offline.test.ts`, `tests/e2e/performance.spec.ts` | Vitest / Playwright | Offline build, existing 200 ms checks and size budget. |

## Happy Path

- Unknown remains null until the equal-assumption action; three groups start
  at exact 1/3 each. Changing the first group to 40% gives exact 2/5, 3/10,
  3/10, updates the chart and leaves party votes and seats unchanged.
- Explicit confirmation marks a known mix unknown; cancellation keeps every
  exact fraction. An unrelated raw draft field survives each edit.
- A known block contribution and an unknown party share are distinguished;
  "Other / unclassified" remains an ordinary group, never the unknown bucket.

## Seat-Calculation Correctness

| Check | Test name |
| --- | --- |
| Exact sum, including odd sizes and property test | `preserves deterministic exact shares and odd seat totals across seeded edits`; 40 inputs, exact composition total, 101 seats. |
| Determinism: repeated runs, JSON round trip, ru/en/he | The seeded test compares serialized seat results and round trips; `keeps votes and seats unchanged in %s` runs through the actual store in each language. |
| Threshold below / at / above | `keeps seats and threshold behavior unchanged at %s percent` covers 3%, 3.25% and 3.5%. |
| Exact remainder tie → tieBreakOrder → party ID | `keeps persisted tie order and the ID fallback after a composition edit` checks both tie rules. |
| Fixtures | Exact rational strings and independent expected fractions; no display rounding decides seats or a composition total. |
| Coalition invariance | Happy-path and seeded tests compare baseline and edited coalition results. |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Invalid / empty input | Invalid scenario, legacy group mode and six invalid percentage texts are explicitly refused. |
| Single or no groups | `handles no groups and a single group without inventing a recipient`. |
| All other groups zero | `splits zero recipients equally and keeps a zero beside positive recipients`. |
| Maximum and safety bounds | Component and aggregate denominator overflow cases; `edits 20 groups across 40 parties within the 200 ms median budget`. |
| No feasible allocation | `keeps zero-turnout seats unavailable rather than inventing votes`. |
| Unknown and zero votes | Reports explicitly show unknown without presenting its group shares as known zero; a zero-vote party still says its composition is unknown. |
| Inconsistent demographics | The separate diagnostic is visible while seats remain available. |
| Unchanged non-terminating input | Browser test focuses and blurs exact thirds, rejects invalid text, cancels and exports the original fractions. |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Party-share sliders and linked turnout | M7-03 and M7-05; this item does not change baseline party shares or group turnout. |
| Actual 2022 survey composition | M7-06 requires unknown absent separately sourced studies; equal initialization is explicitly a user-chosen model assumption. |
| Conversion of old group-mode scenarios | M7-09; this item keeps their current semantics and checks that no new editor appears. |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-31 | `npm test` | RED: 34 failed, 2561 passed across 42 files. | New engine/store cases reach the deliberate stub; UI cases expose the missing editor, unknown reporting or false known zero. |
| 2026-10-31 | `npm run test:e2e -- --grep "offers unknown" --project desktop --workers 1` | RED: 1 failed. | The intended party-composition editor is absent in the built offline file; 386.33 kB. |
| 2026-10-31 | `npm run typecheck`; targeted `npx eslint` and `npx prettier` | Pass. | The temporary typed engine stub and new tests compile and are lint-clean and formatted. |
| 2026-10-31 | Focused engine and UI Vitest files | 700 passed. | Exact editing, party-share regression, existing composition, editor, reports and store. |
| 2026-10-31 | `npm run test:e2e -- --grep "optional party composition" --workers 1` | Initially 7 passed, 3 failed; corrected run 10 passed. | The phone tests now navigate to the existing seats view before comparing visible results; desktop and phone, RTL and axe pass. |
| 2026-10-31 | `npm run test:e2e -- --workers 1` | Initially 239 passed, 38 skipped, 1 failed. | A worker Blob was created after export and the shared helper read it instead of the JSON; a deterministic later-worker-Blob case was added and observed RED before correcting the helper. |
| 2026-10-31 | `npm test` | 2600 passed across 42 files. | Includes the in-memory offline build check. |
| 2026-10-31 | `npm run typecheck`; `npm run lint`; `npm run format` | Pass. | Formatting was checked before the write command to avoid changing unrelated, nonconforming files. |
| 2026-10-31 | `npx playwright test --grep "optional party composition" --workers 1` | 12 passed. | Includes the formerly RED worker-Blob regression on desktop and phone. |
| 2026-10-31 | `npm run test:e2e -- --workers 1` | 242 passed, 38 skipped. | Complete offline desktop/phone suite, including 200 ms checks; built HTML 407.80 kB. |
| 2026-10-31 | Independent `/4-close` gates: `npm test`, `npm run typecheck`, `npm run lint`, Prettier check, `npm run test:e2e -- --workers 1` | Pass: 2600 unit and 242 browser tests, 38 skipped. | All gates rerun sequentially after implementation; offline HTML 407.80 kB. |
