# Test Plan — M3-03 Publication and HTTPS verification

| Field | Value |
| --- | --- |
| item | M3-03 |
| memo | `doc/work/archive/phase-4/M3-03-memo.md` |
| created | 2026-11-10 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-4/M3-03-memo.md. -->

**Release acceptance, 2026-11-11.** The user approved the one-time Plan B
exception to publish and verify before `/4-close`. They understand the local
unit suite passing is not the same as all release checks passing, and accept
post-release reports for ordinary defects. No deployment or live-browser
verification is recorded as passed until actually performed.

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| None added | — | No application behavior or engine code changes are planned. Use existing offline tests as regression gates and a manual release evidence checklist; repository tests must not access the network. |

## Happy Path

| Check | Expected evidence |
| --- | --- |
| Publish reviewed source | A sanitized snapshot is committed on top of existing public `main`; existing `LICENSE` and `README.md` are preserved; local history, ignored reports and the identified profile path are absent; new author metadata uses GitHub noreply without changing global identity. |
| Build and regression gates | `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run build:hosted`, and `npm run test:e2e` pass on the approved revision. Existing offline/hosted parity and offline browser checks remain unchanged. |
| GitHub Actions release | The manually dispatched workflow succeeds for the approved SHA; the artifact contains exactly the expected `dist-hosted/` output; the deployed revision and workflow run are recorded. |
| Hosted response and metadata | The planned HTTPS URL returns the expected page and preview image; redirects, subpath, Hebrew crawler metadata, canonical/image URLs, image dimensions and correspondence to the approved artifact are checked. No unintended source files are publicly deployed. |
| Live application | In fresh browser contexts, Hebrew startup, ru/en/he switching and RTL, questionnaire and notice, both approved starts, coalition workers, import/export and future view work on desktop and phone-size viewports. No console errors, missing assets or unintended runtime requests occur. |
| Exact result parity | For both approved starts, compare canonical exported input and exact engine results at years 0 and 4 between the approved local artifact and live app; displayed seats agree in ru/en/he. Expectations come from exact inputs, never rounded text. |

## Seat-Calculation Correctness (mandatory when the engine is touched)

The engine and scenario inputs are not changed by this item, so new engine
tests are not applicable. The hosted release still has the exact local/live
result-parity check above; the existing engine test suite remains a regression
gate.

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Existing engine suite; no new test |
| Determinism: repeated runs, JSON round trip, ru/en/he | Existing engine suite; live parity captures exact result JSON |
| Threshold below / at / above | Existing engine suite; no new test |
| Exact remainder tie → tieBreakOrder → party ID | Existing engine suite; no new test |
| Fixtures from exact inputs | Existing engine suite; live parity uses canonical exported input |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Missing deployment or wrong HTTP response | Manual hosted response check must fail; no network test is added |
| Profile path, secret indicator or generated report in candidate snapshot | Bounded local candidate scan must report no matches before publication |
| Existing remote files overwritten or local commit history uploaded | Review candidate commit/tree; reject the release if either occurs |
| Unexpected public files beyond the reviewed hosted artifact | Inspect deployment inventory; reject the release |
| One locale or viewport fails | Record the exact browser, locale and viewport; do not report the whole release as green |
| Existing author metadata remains on the original public commit | Disclose as a residual exposure; do not rewrite history or claim erasure |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Network access from Vitest or Playwright | Repository test instructions prohibit network tests; the live check is a manual, authorized release verification. |
| Real Safari/iPhone or Firefox when unavailable | These are explicitly non-blocking follow-ups in the approved memo; do not infer them from Edge emulation. |
| Absence of every possible secret in arbitrary/obfuscated forms | Pattern scanning is bounded and cannot prove that guarantee; methods and limitations are reported. |
| Removal of author metadata from existing public history, caches or forks | This cannot be reliably guaranteed without risky history rewriting; preserve the existing commit and report the residual exposure. |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-11-10 | Read-only public repository and URL review (recorded in approved memo) | RED | Public `main` contains only `LICENSE` and `README.md`; planned Pages URL returns 404. The app is not yet available for hosted parity checks. |
| 2026-11-11 | `npm test` | PASS | 71 test files, 3221 tests passed. Existing application regression gate only; no new tests or network access. Vite emitted its existing native-config warning. |
| 2026-11-11 | `npm run typecheck`; `npm run lint` | PASS | Both exit codes 0; lint enforced `--max-warnings 0`. |
| 2026-11-11 | `HOSTED_BASE_URL=https://seriycoder.github.io/Israel-Election-Simulator/; npm run test:e2e -- --workers=2` | PASS | 404 browser tests passed, 48 existing project-scoped skips; hosted output contained exactly `index.html`, `preview.png`, `README.md`; offline HTML 458179 bytes. This is a local browser/build result, not a live-host check. |
| 2026-11-11 | Candidate publication snapshot and GitHub Pages deployment | RED / pending | Source snapshot, live workflow, Pages settings, HTTPS response and exact local/live result comparison are not yet completed. |
| 2026-11-11 | GitHub target recheck and non-destructive clone | BLOCKED | GitHub API, repository page, search and anonymous clone returned 404/not found. No push or Pages settings change was attempted; current remote branch and visibility must be re-established first. |
| 2026-11-11 | Sanitized `Election-Public` candidate: `npm test`; `npm run typecheck`; `npm run lint` | PASS | 3221 tests passed; typecheck and lint passed on the candidate with the new Pages path. |
| 2026-11-11 | Candidate `npm run test:e2e -- --workers=2`, with the `Election-Public` base | PASS | 404 browser tests passed, 48 existing project-scoped skips; local offline and hosted builds succeeded. |
| 2026-11-11 | Manual GitHub Pages workflow `43068778237` | PASS | Build and deployment succeeded on public revision `4d267bdf6a44f444346a78beb6cc1bc3ed2b5938`; the artifact contains exactly three files. |
| 2026-11-11 | HTTPS and live-artifact verification | PARTIAL | Site and preview image return HTTP 200; image is 1200×630; all three live files match the workflow artifact byte-for-byte. Fresh browser opened Hebrew startup, switched to Russian and displayed the eight-party coalition example. Full live parity, other languages, phone and actual Firefox/Safari remain unverified. |
| 2026-11-12 | `npm test`; `npm run typecheck`; `npm run lint` | PASS | 71 files, 3221 tests; typecheck and lint exit 0. |
| 2026-11-12 | `HOSTED_BASE_URL=https://seriycoder.github.io/Election-Public/; npm run test:e2e -- --workers=2` | PASS | 404 browser tests passed, 48 existing project-scoped skips. |
| 2026-11-12 | Live `index.html` versus fresh local `npm run build:hosted` | PASS | Identical after removing 15 carriage returns, all in template markup outside the inlined script; executed code and exact results identical in every language and start. Desktop accepted by the user; phone, Firefox and Safari moved to M3-07. |
| 2026-11-12 | `/4-close`: `npm test`; `npm run typecheck`; `npm run lint`; `HOSTED_BASE_URL=https://seriycoder.github.io/Election-Public/; npm run test:e2e -- --workers=2` | PASS | 71 files, 3221 tests; typecheck and lint exit 0; 404 browser tests passed, 48 existing project-scoped skips. |
