# Test Plan — M3-02 Hosted build

| Field | Value |
| --- | --- |
| item | M3-02 |
| memo | `doc/work/archive/phase-4/M3-02-memo.md` |
| created | 2026-11-08 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/build/hosted.test.ts` | Vitest | 13 checks: hosted index/README, Hebrew metadata, CSP and inline workers, separate command, six invalid base settings, manual Pages workflow and least-privilege contract |
| `tests/ui/publicNotice.test.tsx` | Vitest with server-rendered Preact | 24 checks: exact ru/en/he notice, questionnaire form boundary and six main views per language; rendering must not change scenario/results |
| `tests/e2e/hosted.spec.ts` | Playwright, installed Edge, desktop and phone | 8 cases per project: offline notice, exactly three public files/PNG dimensions, two examples in three locales with locally served subpath, downloads/import and exact offline parity |
| `tests/build/offline.test.ts` | Existing Vitest suite, unchanged | One offline file, inline resources, CSP, no network APIs and exact 460800-byte budget |
| Existing `tests/engine/` and `tests/ui/` suites | Vitest, unchanged | Arithmetic and interface regression coverage |
| Existing `tests/e2e/` suites | Playwright at implementation and close | Questionnaire fit, offline behavior, accessibility and browser regression coverage |

### Test contracts fixed for implementation

- `vite build --mode hosted` is the in-memory hosted target. The build-time
  environment setting is `HOSTED_BASE_URL`.
- The in-memory hosted build emits `index.html` and `README.md`; the
  orchestrator `node scripts/buildHosted.mjs`, exposed as `npm run build:hosted`,
  adds the settled-app `preview.png`. Its completed folder has exactly three
  files, not an unreviewed source tree.
- The notice is addressable by `data-public-notice`, appears once per screen
  and contains the exact approved inert translation.
- The Pages workflow uses named `build` and `deploy` jobs, manual dispatch,
  a `main` branch guard, pinned Actions, non-persisted checkout credentials,
  job-level minimum permissions and exactly `dist-hosted/` as its artifact.
- Canonical and image URLs are static metadata, not runtime asset requests.
  The canonical link must not be mistaken for a fetched resource by a scan.

No production stubs, exports, configuration or workflow were added at RED.

## Happy Path

- The hosted page carries exact Hebrew title/description, `he_IL`, canonical
  URL, absolute image URL, 1200 × 630 dimensions and a large-image card before
  its script.
- The same CSP and inline workers are retained, with no external runtime
  resources or network APIs.
- Existing offline build command and size budget remain unchanged.
- Both screens show the notice in all languages, including RTL; the
  questionnaire notice is not part of its form or a dismiss button.
- The local subpath serves the built page and does not permit external
  requests. Fresh startup is Hebrew; switching languages updates the notice.
- The eight-party and 2022 starts yield identical exported scenarios and
  displayed seats between delivery modes. Exact engine results, including year
  4, agree for the exported input.
- Importing the approved fixture and exporting it preserves exact values.
- A push or pull request cannot trigger site deployment; the deployment
  depends on the read-only build gate and uses limited Pages/OIDC permissions.

## Seat-Calculation Correctness

No engine or scenario-writing behavior is changed by the item. The full
existing engine suite remains mandatory, plus build-target parity checks.

| Check | Test name / coverage |
| --- | --- |
| Exact seat sum, odd sizes and generated inputs | Existing `tests/engine/allocate.test.ts`, unchanged; full suite passed at RED |
| Determinism, repeated runs, JSON round trip, ru/en/he | Existing engine suite; `keeps the notice on … without changing results`; `hosted and offline … examples agree in …` |
| Threshold below / at / above | Existing engine threshold tests, unchanged |
| Exact remainder tie → tieBreakOrder → party ID | Existing allocation tests, unchanged |
| Fixtures from exact inputs | Existing exact engine fixtures; browser parity uses parsed exported scenarios and engine results, never rounded percentages |
| Projection packaging parity | Browser comparison of `runSeats` at years 0 and 4, with canonical current result JSON |

## Edge And Degenerate Cases

| Case | Test name / coverage |
| --- | --- |
| Invalid base URL: HTTP, credentials, query, fragment, missing trailing slash, non-URL | Six `rejects the invalid hosted base …` cases; intended RED is the missing refusal |
| Missing hosted output or workflow | Explicit prerequisite assertions, not missing-import or syntax failures |
| Wrong PNG signature, dimensions, file set or tiny placeholder | `hosted output contains exactly the approved files and a 1200 by 630 PNG` |
| Empty input / no groups or parties | Existing engine/schema/UI coverage; notice uses normal shell independently of input |
| Single party, equal values, maximum size, no allocation or coalition | Existing engine suite, unchanged; no alternate arithmetic added |
| Questionnaire and all main views | Notice tests cover both screen branches and all six view IDs |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Repository contents, MIT license and Git history safety | Required pre-push inspection in M3-03; no Git or remote inspection authorized by this approval step |
| Actual GitHub Actions execution, Pages settings and live HTTPS | M3-03; no deployment during tests |
| Full English/Hebrew wording review | M3-05, required before publication |
| Guaranteed absence of secrets or account compromise | A no-findings report is not such a guarantee; exact source/history safety inspection remains required |

The workflow tests check its declared structure and permissions; verified
Action SHAs, actual platform execution and exact pre-push file inventory are
not proven by regex checks. Implementation must also review those contracts.
The PNG byte/dimension checks do not prove image content by themselves;
implementation must inspect the generated screenshot for settled Coalitions
results and the visible notice. Existing layout/accessibility gates must pass,
not be weakened.

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-11-08 | `npx prettier --write` on the three new test files; `npm run typecheck`; `npm run lint` | Passed after test-authoring corrections | Incorrect use of `runScenario`'s second argument and a misplaced loop brace were corrected before recording RED; neither was product failure |
| 2026-11-08 | `npx vitest run tests\build\hosted.test.ts tests\ui\publicNotice.test.tsx` | Initial focused RED | Missing notice translations/rendering, hosted target and workflow; suite compiled |
| 2026-11-08 | `npm test` | 40 failures, 3181 passes | 37 intended new failures plus three old test timeouts under concurrent build load; not accepted as baseline regressions |
| 2026-11-08 | `npx vitest run tests\engine\allocate.test.ts tests\ui\coalitionRunner.test.ts --no-file-parallelism` | 47 passed | Existing timed-out tests passed without parallel load; no production change or timeout increase |
| 2026-11-08 | `npx vitest run --no-file-parallelism` | 37 failed, 3184 passed; 2 failed files, 69 passed | All old tests green. Only 24 new notice tests and 13 hosted/workflow tests fail for the intended missing behavior |
| 2026-11-08 | `npm run build` | Passed; offline HTML 457782 bytes | Existing offline output rebuilt without source changes; below 460800 bytes |
| 2026-11-08 | `npx playwright test tests\e2e\hosted.spec.ts --workers=2 --reporter=list` | No tests selected | Windows path interpreted as a filter; rerun with a filename regex, not recorded as behavioral RED |
| 2026-11-08 | `npx playwright test 'hosted[.]spec[.]ts' --workers=2 --reporter=list` | 16 failed (8 desktop, 8 phone) | 2 missing offline-notice failures, 2 missing-preview failures and 12 missing-hosted-index failures. Browsers launched successfully; no local server started before the missing-index assertion |
| 2026-11-08 | `/3-implement`: hosted and offline builds; focused hosted browser suite | Builds passed; 16 browser checks passed | Real Hebrew PNG inspected: notice and settled top coalition tiles visible; lower page content continues beyond the image |
| 2026-11-08 | `npm run test:e2e` before notice-height repair | 19 failed, 385 passed, 48 project-scoped skips | Universal notice exposed the old full-viewport questionnaire sheet; not accepted as GREEN |
| 2026-11-08 | Full browser rerun after remaining-height repair | 8 failed, 396 passed, 48 project-scoped skips | One short-window fit failure, one existing performance timeout and six hosted phone import/export polling timeouts |
| 2026-11-08 | `npx playwright test '(bookFit\|hosted\|performance)[.]spec[.]ts' --workers=2 --reporter=list` after short-window spacing repair | 37 passed, 21 project-scoped skips | All fit, hosted parity/import and performance checks passed; no assertion, timeout or budget changed |
| 2026-11-08 | `npm run format`; targeted Prettier on build helper, orchestrator, CSS, workflow and README; `npm test -- --no-file-parallelism`; `npm run typecheck`; `npm run lint` | 3221 tests passed in 71 files; all other gates passed | Same sequential unit gate is declared in the workflow; existing engine tests unchanged |
| 2026-11-08 | `HOSTED_BASE_URL` set; `npm run test:e2e -- --workers=2` | 404 passed, 48 existing project-scoped skips; no failures | Both final targets rebuilt first; full browser suite includes all new parity/import checks, fit, accessibility and performance budgets |
| 2026-11-08 | Exact final output inventory and PNG inspection | Passed | Offline `elections.html`: 458179 bytes ≤ 460800; hosted `index.html`: 459458 bytes, `preview.png`: 165868 bytes (1200 × 630), `README.md`: 481 bytes; no other output files |
| 2026-11-08 | `/4-close`: `npm test -- --no-file-parallelism`; `npm run typecheck`; `npm run lint` | 3221 tests passed in 71 files; types and lint passed | Independent re-run, no production changes or Git commands |
| 2026-11-08 | `/4-close`: base set; `npm run test:e2e -- --workers=2`; exact output inventory | 404 passed, 48 existing project-scoped skips; both builds passed | Offline 458179 bytes; hosted exactly index 459458 bytes, PNG 165868 bytes and README 481 bytes; all applicable gates green |

Workflow review confirms manual dispatch only, `main` guard, SHA-pinned Actions,
non-persisted checkout credentials, read-only build and separate Pages/OIDC
deployment permissions. Locked Vite/Vitest/ESLint engines accept current Node
22 (minimum 22.13 across these packages); setup-node selects that major's latest
release. Actual cloud execution, MIT verification and exact pre-push
source/history safety inspection remain M3-03 gates, not claimed here.

Closed GREEN on 2026-11-08. Source upload and Pages deployment have not occurred.
