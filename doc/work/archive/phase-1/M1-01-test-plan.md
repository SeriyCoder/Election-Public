# Test Plan — M1-01 Toolchain

| Field | Value |
| --- | --- |
| item | M1-01 |
| memo | `doc/work/archive/phase-1/M1-01-memo.md` |
| created | 2026-10-28 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| None | Not applicable | This item establishes the toolchain and empty test directory; it introduces no behavior. The initial missing test command was the required RED gate for this toolchain item. |

## Happy Path

- After implementation, `npm test` runs successfully with no test files yet.
- The strict TypeScript type-check script runs successfully.
- The lint and format scripts run successfully on the initial project.
- npm can resolve and install the Vite, single-file plugin, Vitest, TypeScript, ESLint and Prettier dependencies from the lockfile.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Not applicable; this item does not touch the engine. |
| Determinism: repeated runs, JSON round trip, ru/en/he | Not applicable; no scenario results are calculated or serialized. |
| Threshold below / at / above | Not applicable; no electoral rules are implemented. |
| Exact remainder tie → tieBreakOrder → party ID | Not applicable; no allocation behavior is implemented. |
| Fixtures from exact inputs | Not applicable; no engine fixtures are introduced. |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | Not applicable; no behavioral test files are introduced. |
| Single element | Not applicable; no behavioral test files are introduced. |
| All values equal | Not applicable; no behavioral test files are introduced. |
| Maximum size (20 / 30 / 10) | Not applicable; no engine inputs are processed. |
| No feasible solution | Not applicable; no engine or coalition behavior is introduced. |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Engine calculations, schema validation and scenario import/export | Explicitly out of scope for M1-01; covered by later M1 items. |
| Preact application, browser tests and offline HTML output | Explicitly deferred to UI and distribution items. |
| Test source behavior | The memo excludes tests; the toolchain's missing test command is the RED gate for this item. |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
[local machine-specific path redacted from the public source snapshot]
| 2026-10-28 | `npm ci` | PASS | Clean dependency installation from `package-lock.json`; npm reported zero vulnerabilities. |
| 2026-10-28 | `npm test` | PASS | Vitest ran with the configured Node environment; no test files exist yet and the command exited successfully as intended. |
| 2026-10-28 | `npm run typecheck` | PASS | TypeScript strict type check completed successfully. |
| 2026-10-28 | `npm run lint` | PASS | ESLint completed with zero warnings. |
| 2026-10-28 | `npm run format -- --check` | PASS | Prettier reported all matched files use the configured style. |
