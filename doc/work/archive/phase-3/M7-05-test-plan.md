# Test Plan — M7-05 Linked party and group turnout

| Field | Value |
| --- | --- |
| item | M7-05 |
| memo | `doc/work/archive/phase-3/M7-05-memo.md` |
| created | 2026-10-31 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/linkedTurnout.test.ts` | Vitest | Version migration, exact linked basis, turnout and party edits, constrained flow, lifecycle, malformed input, precision, performance and seat correctness. |
| `tests/engine/schema.test.ts` | Vitest | Updates the existing schema and migration assertions to version 5 while keeping legacy group-mode and result checks. |
| `tests/ui/book.test.ts` | Vitest | Questionnaire output uses version 5 and exact party-mode turnout fractions. |
| `tests/ui/store.test.ts` | Vitest | Keeps the preset schema assertion current-version-neutral; existing preset behavior is unchanged. |
| `tests/e2e/linkedTurnout.spec.ts` | Playwright | Offline group editor and slider, real seat updates, unavailable and invalid states, suspended-model disclosure and rebuild, exact export/import, no focus/blur rounding, RTL and phone layout. |
| Existing engine, UI and build tests | Vitest | Regression coverage for legacy modes, coalitions, schema, offline build and size budget. |

At the RED step, the exported signatures in `src/engine/linkedTurnout.ts` were
behavior-free stubs; their `unimplemented` refusal made the missing behavior
observable before implementation.

## Happy Path

- Migrate version-4 party group turnout exactly and retain party shares and
  seats. Versions 1–4 in group mode retain their previous calculations.
- Derive the two-group exact basis without mutating or stripping draft data.
  At group-1 turnout of 80%, the independent fixture produces shares `19/35`
  and `16/35` and 55 / 46 seats out of 101.
- Repeat, reverse, export and import turnout changes without drift; scaling
  overall turnout preserves shares, seats and coalition analysis.
- Move votes within groups for manual party edits, respect locks, and reroute
  a feasible transfer around a prohibited destination.
- Suspend the basis after a composition-only edit without changing seats or
  using the suspended basis for projections; explicitly rebuild it once its
  assumptions are consistent.

## Seat-Calculation Correctness

| Check | Test name |
| --- | --- |
| Exact seat sum, nonnegative integers, odd size and generated inputs | `keeps deterministic nonnegative odd-seat sums across seeded edits, locales and round trips`; also the exact 101-seat two-group fixture. |
| Determinism: repeat, JSON round trip and ru/en/he | `keeps deterministic nonnegative odd-seat sums across seeded edits, locales and round trips`; `repeats and reverses turnout edits exactly after JSON export and import`. |
| Threshold below / at / above | `keeps the exact %s%% threshold result after a linked turnout edit`: 3%, 3.25%, 3.5%, exact against a 3.25% threshold. |
| Exact remainder tie and ID fallback | `preserves tie order and the ID fallback after turnout edits`. |
| Independent exact fixtures | `recomputes party votes from group turnout using the independent two-group fixture`; `keeps zero-turnout group preferences for future projections` expects `74/205`. |
| No floating-point seat decisions | Assertions use rational components and the existing exact engine; timing uses `performance.now()` only to measure duration. |

## Edge And Degenerate Cases

| Case | Test name / expectation |
| --- | --- |
| No groups and single group | `handles no groups and a single known group without inventing preferences`; ordinary party seats remain available without groups. |
| Equal parties, zero turnout and restoration | `keeps preferences through zero turnout and restores the last nonzero profile`; no allocation at zero, no fabricated equal profile. |
| Maximum operational fixture | `edits 20 groups and 30 parties within the 200 ms median budget` also includes 10 blocks; seven timings, median under 200 ms. |
| No feasible majority | `keeps an empty coalition result when no elected party can join government`. |
| Missing / inconsistent assumptions | `refuses unavailable group models without blocking ordinary seats`; unknown composition, zero observed group turnout, incompatible demographics and disabled UI. |
| Restrictions, locks and no recipient | `does not bypass explicit group destination restrictions`, `honors locks`, `reports the absence of an unlocked recipient`, proportional rerouting and the nonproportional fallback. |
| Zero prior support | `allows newly positive support when no destination is forbidden`; absence of observed support alone is not a ban. |
| Structural changes and dormant assumptions | Addition and copying preserve or suspend the basis; deletion protects population and latent preferences even at zero turnout or zero population. |
| Malformed import and raw/canonical size limits | Invalid linked data, nonrecoverable zero-turnout profiles, version-4 field collisions and raw/canonical fraction budgets are checked separately. |
| Suspended-basis recovery | Explicit rebuild retains dormant group preferences and handles zero turnout or a changed overall turnout without using a suspended basis for projections; over-100% scaling is refused. |
| Zero ballot validity with a saved basis | Projected cast and invalid ballots remain correct while no valid votes are allocated. |
| Exact non-terminating turnout | `round-trips non-terminating group turnouts without replacing them by display approximations`; browser focus and blur preserve `4/7` and `3/7`. |
| Overflow and invalid input | `refuses overall turnout if proportional scaling exceeds 100% in a group`, `refuses a result beyond the exact fraction limit without modifying the basis`, and invalid-percent cases. |
| RTL, accessibility and offline operation | The browser spec runs in both configured projects, watches for network/console violations, checks serious/critical axe findings and checks horizontal fit. |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Redesigned national controls, historical comparison and future graphics | They belong to M7-03, M7-06 and M7-10, not this memo. Existing future arithmetic is tested here. |
| A claim that model demographic assumptions describe real voters | The model is explicitly conditional; no real-voter inference is permitted. |
| Timing for every schema maximum | The documented interactive budget is the 20-group, 30-party, 10-block case; larger valid inputs must still respect validation and bounded-search limits. |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-31 | `npm run typecheck` | Pass | All RED tests and stubs compile. |
| 2026-10-31 | `npm run lint` | Pass | Full repository lint, zero warnings. |
| 2026-10-31 | `npx prettier --check` on the six changed TypeScript files | Pass | The changed files were formatted before the checks. |
| 2026-10-31 | `npm test` | **RED:** 60 failed, 2588 passed; 3 failed / 40 passed files. | 47 linked tests stop at the missing version-5 behavior or `unimplemented` stubs; 9 schema and 4 questionnaire assertions expect the approved new version and fraction format. No syntax or fixture-baseline failure was observed. |
| 2026-10-31 | `npx vite build` | Pass | Offline file is 407.80 kB before implementation. |
| 2026-10-31 | `npx playwright test 'linkedTurnout.spec.ts' --workers=1 --reporter=list` | **RED:** 14 failed, desktop and phone. | Missing availability/error UI or the unimplemented linked operation. The no-network fixture reported no separate failure. |
| 2026-10-31 | Initial Playwright run with a backslash-containing path filter | No tests found | The filter was interpreted as a pattern; reran with the filename, not counted as RED evidence. |
| 2026-10-31 | First desktop run of the invalid-input test | Test selector error | Hidden group inputs caused a strict-mode ambiguity. Scoped selectors to group `G1`, reran the individual case, then reran both projects: it now fails on the intended missing error UI. |
| 2026-10-31 | Focused late-regression linked-model run | **RED:** 2 failed, 1 passed | A zero-population group could discard saved preferences on deletion, and a saved model with zero ballot validity reported zero projected ballots cast. The added group add/copy preservation case already passed. |
| 2026-10-31 | Focused version-4 migration regression | **RED:** 1 failed | Version-4 draft metadata named `linkedModel` was incorrectly read by the new version-5 fraction-budget check. |
| 2026-10-31 | Focused zero-turnout import regression | **RED:** 2 failed | Validation accepted a missing nonzero profile and a profile inconsistent with saved party shares. |
| 2026-10-31 | Focused suspended-model rebuild regression | **RED:** 2 failed | Rebuilding rejected a saved dormant group's assumptions and did not distinguish an inconsistent assignment of current votes. |
| 2026-10-31 | Focused all-zero suspended-model recovery | **RED:** 1 failed | Rebuild refused despite the saved nonzero turnout profile, leaving the basis unrecoverable at zero turnout. |
| 2026-10-31 | Focused suspended overall-turnout recovery | **RED:** 2 failed | Independent overall edits left a group profile that the explicit rebuild could not reconcile, both from a positive and a zero turnout. |
| 2026-10-31 | `npx vitest run 'tests\engine\linkedTurnout.test.ts' --reporter=dot` | **GREEN:** 60 passed | Includes the independent seat fixture, saved-profile and lifecycle regressions, constrained flow and the 200 ms median gate. |
| 2026-10-31 | `npm run format` | Pass | Repository formatter completed after the last source changes. |
| 2026-10-31 | `npm test` | **GREEN:** 2662 passed, 43 files | Includes the production in-memory offline build and size test. |
| 2026-10-31 | `npm run typecheck` | Pass | Strict TypeScript check. |
| 2026-10-31 | `npm run lint` | Pass | Full repository lint, zero warnings. |
| 2026-10-31 | `npm run test:e2e` | **GREEN:** 256 passed, 38 skipped | Desktop and phone, offline, RTL, accessibility and performance; production HTML 433,644 bytes, below the 460,800-byte budget. |
| 2026-10-31 | `text-check.ps1` on translation tables, memo, plan and STATUS | Pass | UTF-8 without BOM, no replacement characters or mixed line endings. |
| 2026-10-31 | `/4-close`: `npm test` | **GREEN:** 2662 passed, 43 files | Independent close gate, including the production in-memory offline build and size test. |
| 2026-10-31 | `/4-close`: `npm run typecheck`; `npm run lint`; `npm run format` | Pass | Independent TypeScript, repository lint and formatting gates. |
| 2026-10-31 | `/4-close`: `npm run test:e2e` | **GREEN:** 256 passed, 38 skipped | Independent desktop and phone gate; offline build 433,644 bytes, under 460,800 bytes. |

The final GREEN runs exercise the assertions beyond the original stubs,
including performance, round trips, no-mutation and accessibility checks.
The independent close gates repeated the full unit and browser suites.
