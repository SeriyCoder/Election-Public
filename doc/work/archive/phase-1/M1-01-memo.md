# Memo — M1-01 Toolchain

| Field | Value |
| --- | --- |
| item | M1-01 |
| epic | M1 |
| phase | Phase 1 — M1 engine |
| status | closed |
| created | 2026-10-28 |
| closed | 2026-10-28 |

## Problem

The project has no application or test toolchain yet, so engine work cannot be checked consistently. Establish the strict TypeScript, Vite, Vitest, lint and format foundation and the empty engine and engine-test directories without starting application or electoral-engine behavior.

## Scope

**In scope**

- Establish an npm-managed TypeScript project in strict mode with Vite and Vitest.
- Add repeatable test, type-check, lint and format scripts, with a clean initial run possible before engine tests exist.
- Add ESLint and Prettier configuration and ignore generated dependencies, build output and coverage.
- Establish the empty `src/engine/` and `tests/engine/` directories.
- Include the Vite single-file plugin as a dependency for the specified offline distribution, without building the application in this item.

**Out of scope**

- Implementing the engine, scenario schema, electoral arithmetic or any tests.
- Creating the Preact application shell, user interface or browser-test suite.
- Building or publishing the offline HTML or hosted/PWA distribution.

## Approach

Use npm and TypeScript strict mode as the project foundation. Configure Vite and Vitest together so the M1 engine suite runs without a DOM or network, and allow the initially empty suite to complete successfully until a later engine item adds its first tests. Provide type-check, lint and format scripts matching the project instructions. Keep the application entry point and offline build for later UI and delivery items; install the specified single-file plugin now so the declared stack is present.

**Rejected alternative:** Defer all tooling until engine code exists; that would leave the first implementation and red-test steps without the repeatable checks the project requires.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario data | None | None |

## Interface Delta

No public engine functions, UI surfaces or export formats are added or changed. The package scripts provide developer checks only.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None. The item creates no engine behavior. |
| Where exact rationals are required | Not affected: no electoral calculation is introduced; future engine code remains governed by Sections 6.4 and 11. |
| Ordering / tie rules relied on | None. Tie ordering remains a later engine concern and must follow the persisted ordering contract. |
| Any display rounding near a decision? | None. This item introduces no decisions or result display. |
| How determinism across runs, round trip and locale is proven | Not affected: no scenario results are calculated or serialized. M1 acceptance checks remain owned by the engine items. |

Seat calculation is not affected because this item is limited to development tooling and empty directories.

## Files

| Path | Change |
| --- | --- |
| `package.json` | Add project scripts and TypeScript, Vite, Vitest, lint, format and single-file build-tool dependencies. |
| `package-lock.json` | Record the npm dependency resolution. |
| `tsconfig.json` | Configure strict TypeScript checking. |
| `vite.config.ts` | Configure Vite and Vitest for a DOM-free engine test environment. |
| `eslint.config.js` | Configure linting for the project. |
| `.prettierrc.json` | Configure consistent formatting. |
| `.gitignore` | Ignore installed dependencies and generated build/test output. |
| `src/engine/.gitkeep` | Establish the empty engine directory. |
| `tests/engine/.gitkeep` | Establish the empty engine-test directory. |

## Definition of Done

- [x] Test, type-check, lint and format scripts are runnable; the empty test suite is handled intentionally
- [x] No production engine code or electoral behavior is introduced
- [x] No electoral arithmetic exists outside `src/engine/`
- [x] Toolchain choices match the spec and project brief
- [x] Deviations recorded

## Open Questions

1. Is npm acceptable as the package manager, with `package-lock.json` checked in? — **Decision:** Accepted; use npm because no package manager is specified and it provides a reproducible lockfile.
2. Should the Vite single-file plugin be installed with the initial toolchain while the offline build is deferred? — **Decision:** Accepted; include the plugin to match Section 2.1, while leaving the app entry point and distribution work to later items.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| 1-memo | Selected M1-01, the first open backlog item, because the invocation omitted an item ID and clarification was unavailable. | Autopilot continuation; no other item could be identified from the request. |
| 3-implement | Clarified that the empty suite remains intentional until a later engine item adds tests. | The `/2-tests` step for this toolchain-only item correctly added no test source. |
| 4-close | Updated the project brief repository map to reflect the now-present engine and test directories; this required documentation sync was outside the implementation Files list. | Required by the close-step documentation sync. |
