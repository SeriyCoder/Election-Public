# Test Plan — M7-08 Multilingual model notices

| Field | Value |
| --- | --- |
| item | M7-08 |
| memo | `doc/work/archive/phase-3/M7-08-memo.md` |
| created | 2026-11-01 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/i18n.test.ts` | Vitest | Four corrected notices in each locale; existing key/placeholder parity |
| Existing `tests/ui/` and `tests/e2e/` suites | Vitest / Playwright | Rendered workspace, future, unknown-data and historical disclosures |

## Happy Path

- Each locale identifies the actual Hebrew fallback, active linked basis,
  Hamilton versus Bader–Ofer, majority versus cooperation, and hypothetical
  future with fixed new-model turnout versus retained legacy changes.
- Preserve key and placeholder sets; no new translation lookup or UI markup.

## Seat-Calculation Correctness (mandatory when the engine is touched)

Not applicable: translated prose does not feed the engine. Existing exact
seat-sum, boundary, tie, round-trip and locale-determinism suites remain intact.

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty, single, equal, maximum-size input | Existing engine suites; copy is independent of party counts |
| Unknown data, no feasible allocation, partial search | Existing UI and browser tests preserve explicit unavailable states |
| Legacy turnout changes | `future.note describes the model accurately in %s` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| New electoral arithmetic | No arithmetic changes |
| Human publication language certification | Deferred M3-05; no claim of human review |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-11-01 | `npm test` | RED: 12 failed, 2902 passed | Four stale notices in ru/en/he; assertion mismatches only, no tooling or syntax failures |
| 2026-11-01 | `npx prettier --write` on the four changed TypeScript files; `npm test`; `npm run typecheck`; `npm run lint` | GREEN: 2914 tests; formatting, types and lint pass | Each command exit checked before continuing |
| 2026-11-01 | `npm run test:e2e` | GREEN: 332 passed, 40 conditional skips | Offline HTML 460031 bytes, below 460800 |
| 2026-11-01 | `/4-close`: `npm test`; `npm run typecheck`; `npm run lint`; `npm run test:e2e` | PASS: 2914 tests, 332 browser checks, 40 skips; types/lint pass | Independent sequential reruns; offline HTML remains 460031 bytes |
