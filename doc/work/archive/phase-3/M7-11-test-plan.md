# Test Plan — M7-11 Accurate party-mode turnout explanation

| Field | Value |
| --- | --- |
| item | M7-11 |
| memo | `doc/work/archive/phase-3/M7-11-memo.md` |
| created | 2026-11-01 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/editor.test.tsx` | Vitest | The party-mode group note states linked-turnout availability and effects, preserves availability of ordinary party results, and identifies demographic projections as assumptions in ru/en/he. |

## Happy Path

- For each supported locale, the party-mode group note distinguishes a
  consistent linked group model from unavailable cases, explains the
  recalculation of overall turnout, party votes/shares and seats, and says
  demographic projections do not describe or predict real voters.
- The existing group-panel rendering test continues to verify that this note
  appears with the party-mode group controls.

## Seat-Calculation Correctness (mandatory when the engine is touched)

Not applicable: this item changes only explanatory translations and their
rendered text; no engine, scenario input, import or export behavior is touched.
Existing exact-engine, round-trip and locale-determinism tests remain unchanged.

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Not applicable; no calculation path changes. |
| Determinism: repeated runs, JSON round trip, ru/en/he | Not applicable; locale strings do not enter scenario inputs. |
| Threshold below / at / above | Not applicable; no threshold behavior changes. |
| Exact remainder tie → tieBreakOrder → party ID | Not applicable; no allocation behavior changes. |
| Fixtures from exact inputs | Not applicable; no calculation fixtures change. |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | Not applicable; no input handling changes. |
| Single element | Not applicable; no engine behavior changes. |
| All values equal | Not applicable; no engine behavior changes. |
| Maximum size (20 / 30 / 10) | Not applicable; no limits or schema changes. |
| No feasible solution | Not applicable; no linked-turnout or allocation behavior changes. |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Linked-basis construction, turnout edits and seat results | Existing M7-05 engine and browser coverage owns these behaviors; M7-11 changes only explanatory text. |
| Layout, accessibility and offline build | No component markup or styling changes; existing rendered-note assertion is retained. |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-11-01 | `npm test -- tests/ui/editor.test.tsx -t 'explains linked group turnout accurately'` | RED: 3 targeted locale cases failed; 183 tests skipped | All three fail because the current strings contain the contradictory blanket claim. Vitest compiled and ran the assertions; no syntax or tooling failure. |
| 2026-11-01 | `npm test -- tests/ui/editor.test.tsx -t 'explains linked group turnout accurately'` | GREEN: 3 passed; 183 skipped | Russian, English and Hebrew note text matches the approved explanation. |
| 2026-11-01 | `npx prettier --write src/i18n/ru.ts src/i18n/en.ts src/i18n/he.ts tests/ui/editor.test.tsx` | PASS | All four files were already formatted. |
| 2026-11-01 | `npm test` | PASS: 53 files, 2902 tests | Full Vitest suite. |
| 2026-11-01 | `npm run typecheck` | PASS | TypeScript check clean. |
| 2026-11-01 | `npm run lint` | PASS | ESLint clean. |
| 2026-11-01 | `npm run test:e2e` | PASS: 332 passed, 40 skipped | Offline build and browser suite passed; generated HTML is 459901 bytes, below the 460800-byte limit. |
| 2026-11-01 | `/4-close`: `npm test` | PASS: 53 files, 2902 tests | Re-run close gate. |
| 2026-11-01 | `/4-close`: `npm run typecheck` | PASS | Re-run close gate. |
| 2026-11-01 | `/4-close`: `npm run lint` | PASS | Re-run close gate. |
| 2026-11-01 | `/4-close`: `npm run test:e2e` | PASS: 332 passed, 40 skipped | Re-run offline build and browser close gate; file remains under the size limit. |
