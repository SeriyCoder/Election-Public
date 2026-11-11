# Memo — M3-02 Hosted build

| Field | Value |
| --- | --- |
| item | M3-02 |
| epic | M3 |
| phase | Phase 4 — M3 public preview |
| status | closed |
| created | 2026-11-08 |
| closed | 2026-11-08 |

## Problem

The offline build produces only `dist/elections.html`; there is no upload-ready
GitHub Pages folder, social preview metadata or universal not-a-forecast
notice. The user supplied `https://github.com/SeriyCoder/Israel-Election-Simulator.git`
and requested an upload and commit. M3-02 must prepare and validate the public
files and a controlled Pages deployment workflow without changing electoral
results. The user subsequently allowed public source publication and approved
revising the plan to one public repository with MIT licensing.

**Revision approval, 2026-11-08.** The user wrote “mne net problem pokazat
ishodniki” and “Razhreshaju otkorektorovat plan M3-02”. This authorizes this
plan revision, not automatic approval of the revised memo or advancement to
tests. The user also requested a security check before source publication.
The reported MIT license in the destination must be verified and preserved;
it has not been inspected here.

**Approval, 2026-11-08.** The user answered “approved” to the revised memo.
All five recommendations are accepted: one public MIT source repository,
the notice in both targets, manual Pages release after safety checks,
language review before publication and an explicit pre-push source/history
inspection. This approval advances exactly one step, `/2-tests`, without
uploading source or deploying Pages.

## Scope

**In scope**

- Add a separate hosted build from the same app, while retaining the offline
  single-file build and its 460800-byte limit.
- Prepare an upload folder containing `index.html`, `preview.png` and `README.md`.
- Add the Hebrew preview metadata and three-language notice approved in M3-01.
- Capture the approved eight-party Coalitions view as a 1200 × 630 PNG.
- Adopt the supplied repository and its corresponding Pages subpath in build
  settings and current documentation.
- Validate the hosted page locally under that subpath, beside the offline file.
- Prepare a manually triggered GitHub Actions workflow that validates, builds
  and deploys only the generated site to Pages from the public source repository.
- Define source-publication safety checks, minimum workflow permissions and
  separation between saving source in GitHub and releasing the site.

**Out of scope**

- GitHub uploads, repository commits, Pages configuration and live HTTPS
  verification (M3-03). The user's request is recorded below, not executed in
  this memo step.
- Actually pushing source or history to GitHub (M3-03, following publication
  safety checks and an explicit current authorization to run Git).
- Facebook post text and other launch screenshots (M3-04).
- Whole-interface English and Hebrew review (M3-05) and flag controls (M3-06).
- PWA installation, service workers, analytics and server-side storage (M5).
- Engine changes, scenario migrations or edits to the approved examples.

## Approach

### Repository and publication boundary

The supplied repository replaces the former planned `elections` name. The
expected Pages address is
`https://seriycoder.github.io/Israel-Election-Simulator/`, conditional on the
repository's actual Pages configuration. It is not presented as a verified
working link. Repository contents, visibility, authentication and Pages state
have not been inspected in this step.

Use this single public repository for development source, tests, safe project
documentation and MIT licensing. Pages receives the generated site artifact,
not the source tree. There is no second private repository and no manual
synchronization between two projects. A local commit saves history; a push
uploads it; neither must automatically release the site.

The earlier source-private choice is superseded by the user's express
source-publication decision on 2026-11-08. Before any write in M3-03, inspect
the destination, its MIT license, branch and history, and preserve unrelated
files. Do not overwrite the remote or force-push to reconcile it with the
local project. If histories differ, agree a non-destructive integration route.
No credentials are copied into files, logs or chat.

ADR 0002 remains immutable. Propose ADR 0003 at close to supersede its repository,
address, source-private and manual-upload choices, using the dated user
requests as the decision source. The rest of M3-01's runtime privacy and
public-example choices are unchanged.

### Source-publication safety gate

A read-only security-review agent was invoked on 2026-11-08 with instructions
to inspect prospective public files for secrets, personal information and
exploitable app/build behavior, without Git or network uploads. It returned
“No security vulnerabilities found in the reviewed changes.” It supplied no
file-level findings, inventory or coverage evidence. This is a preliminary
result, not proof of a comprehensive secret scan or a clean publication set.

Before the first push, inspect the exact intended files and all Git history
that would be uploaded. Check for credentials, tokens, private keys, environment
files, account/session data, private imports, machine-specific paths and
identifying metadata in documents and fixtures. `.gitignore` does not remove
already tracked files or secrets in old commits. Exclude dependencies,
generated reports, caches, local profiles and session artifacts. Review names
and notes explicitly; the approved eight-party example is intentional public
content, not an inferred personal attribute.

Do not claim that publishing code cannot expose accounts or a computer. If an
actual credential is found, stop publication, report only its location and
type without the value, and require revocation/rotation before proceeding.
History cleanup or choosing a clean initial public history requires a separate
decision; do not destroy local history. Passwords and authentication remain
with the owner. Account two-factor authentication is recommended, but its
status is not inspected or changed by this item.

### Controlled Pages deployment

Add a workflow triggered only by an explicit manual dispatch, restricted to
the approved default branch. Ordinary pushes save source without deploying
the site. Use the GitHub Pages environment and a single deployment concurrency
group. Separate read-only validation/build from deployment: repository-content
read permission for building, Pages write and OIDC token permission only for
deployment. Use the provided short-lived GitHub token, not a personal access
token in repository settings or code. Disable persisted checkout credentials.

Pin third-party Actions to verified full commit SHAs and use `npm ci` with the
lockfile. Run tests, type checking, lint and required browser/build checks
before uploading exactly `dist-hosted/` as the Pages artifact. The preview
generator currently needs installed Edge; use a Windows build runner with
verified Edge availability and fail explicitly if unavailable. The Pages
deployment job can run separately on a compatible runner.

No deployment runs on pull requests, untrusted branches or `pull_request_target`.
Workflow preparation is M3-02; Pages settings, the first manual deployment
and verification of the live link remain M3-03. The first release must still
respect the M3-05 language-review gate.

### Build targets

Keep `npm run build` producing only `dist/elections.html`. Add
`npm run build:hosted` to build the same application into `dist-hosted/`, then
capture the preview and complete the README. The hosted folder must contain
exactly the three public files, with no source maps, source files, caches,
scenario exports or development history. Ignore the generated folder locally.

Reuse the existing translation compaction, single-file inlining, packed
stylesheet, inline workers and CSP. Extend the build-only finalization to select
the output name and metadata for the hosted target, without making the app
fetch its preview image or any other resource. Use relative asset paths and
disable the preload polyfill for both targets.

A single build-time setting holds the Pages base URL. Validate it explicitly:
HTTPS, no credentials, query or fragment, and a trailing slash. Derive the
canonical page URL and absolute preview image URL from it; escape metadata
values correctly. Invalid settings or missing build assets fail the command.
The offline HTML contains none of the hosted URLs or preview tags.

### Preview and README

Use the exact Hebrew title and description from spec 2.4, with `og:locale`
`he_IL`, Open Graph title, description, type, URL, image, image dimensions and
descriptive image text. Include ordinary description and canonical metadata,
plus a summary-large-image social card. Crawlers see these in the initial
HTML, without executing the app. The app still starts in Hebrew unless a
visitor has a saved language preference.

After building, use the installed Edge through Playwright to capture the
actual built page. Open a fresh context without user storage, choose the
eight-party start in Hebrew and wait for the Coalitions view and search results
to settle. Capture a 1200 × 630 viewport with the notice and coalition results
visible, not a loading frame. Verify PNG dimensions and usable content. Do not
import any personal scenario or read an existing browser profile.

The generated site README names the planned link, educational status and
local-only scenario processing. The source repository README explains MIT
licensing, local build/test commands and the distinction between pushing code
and manually releasing Pages. Neither claims the site is live, translations
fully reviewed or allocation legally certified.

### Universal notice

Add `notice.forecast` to ru, en and he with the approved wording. Show it as a
compact, readable, non-dismissible header notice on the opening questionnaire,
every questionnaire page and every main-app view. Put it outside the
questionnaire form and reuse the same rendering in both app-screen branches.
It is inert text, changes with the interface language and follows RTL.

Include the notice in both builds so the offline version remains the same
educational app. Preserve the existing questionnaire fit, mobile navigation,
contrast and accessibility; do not hide the notice or shrink it to illegible
text to make a layout test pass. Existing contextual example disclosures remain.
The size limit stays unchanged; exceeding it blocks this item.

### Verification

Write real red tests before implementation. Build checks cover exact public
file shapes, metadata text and URLs, malformed settings, CSP, inline workers
and absence of external runtime assets. Keep all offline tests unchanged and
passing, including the exact 460800-byte threshold.

UI tests cover the notice in both screen branches and all three languages.
Browser tests cover fresh Hebrew startup, language changes, questionnaire and
main-view notice visibility, mobile fit and a hosted page served locally under
`/Israel-Election-Simulator/`. Use an ephemeral loopback server for this check,
allow only that origin and inline worker URLs, reject external requests and
stop the server when the test ends. Do not weaken the offline tests' network
watcher or use a live host as a local gate.

Compare exact exported scenario data and the seat allocation for the approved
examples between offline and hosted builds, including a projected year and
ru/en/he. Exercise coalition workers and import/export on the hosted target.
The preview generator is also a gate: wrong dimensions, unavailable Edge,
loading results or missing notice are explicit failures, not placeholder images.

Review workflow triggers, branch guard, pinned Actions, job-level permissions,
checkout credentials and exact artifact path against the deployment contract.
Document the actual source/history safety check separately before M3-03's
first push; the preliminary review is not a substitute.

**Rejected alternatives:** uploading the current offline file immediately
would omit the required hosted metadata and notice; two repositories add
unnecessary synchronization now that public source is allowed; deploying on
every push prematurely releases work; a second UI or engine bundle creates
unnecessary divergence between delivery modes.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario and saved input | None; approved examples unchanged | None |
| Pages base URL | Build-time setting only, not stored in a scenario | None |
| Interface notice | Translation-table key only | None |

## Interface Delta

A universal three-language header notice is added to both delivery modes.
The hosted HTML gains static crawler metadata; a new build command creates
the three public files. No electoral control, saved preference, party name,
result report or engine API changes.

## Seat-Calculation Correctness

The item changes build packaging and explanatory UI only; no engine inputs,
arithmetic or tie ordering change. Integration tests must prove that packaging
does not change the results users receive.

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None; both targets use the existing engine and worker bundle |
| Where exact rationals are required | Existing votes, threshold, Hamilton allocation, projection and coalition paths remain exact |
| Ordering / tie rules relied on | Persisted `tieBreakOrder` and party-ID fallback remain unchanged; examples are not reordered |
| Any display rounding near a decision? | No; preview formatting and notice do not feed calculations |
| How determinism across runs, round trip and locale is proven | Full existing engine suite plus offline/hosted example comparisons, canonical scenario export, projected-year checks and locale comparisons |

## Files

| Path | Change |
| --- | --- |
| `vite.config.ts` | Select offline or hosted finalization, output folder and relative base; retain shared build plugins and CSP |
| `build/hostedPreview.ts` | Validated base-URL setting, static metadata and public README generation |
| `scripts/buildHosted.mjs` | Orchestrate hosted build and settled built-app PNG capture with the installed Edge |
| `package.json` | Add the hosted build command; reuse existing dependencies |
| `.gitignore` | Ignore `dist-hosted/` |
| `.github/workflows/pages.yml` | Manual, branch-restricted validation/build and minimum-permission artifact deployment |
| `README.md` | Public source overview, commands, MIT licensing and manual site-release instructions |
| `src/ui/App.tsx` | Render the shared notice in questionnaire and main-app screen branches |
| `src/ui/styles.css` | Compact accessible notice layout without breaking page fit |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Add `notice.forecast` in all tables |
| `tests/build/hosted.test.ts` | Hosted output, metadata, configuration validation and runtime-resource checks |
| `tests/ui/publicNotice.test.tsx` | Notice on both screens and in every locale |
| `tests/e2e/hosted.spec.ts` | Local-subpath hosted checks, offline parity, preview dimensions and notice |
| `doc/spec/elections-simulator.md` | Record delivered build targets and new repository/base URL |
| `.github/copilot-instructions.md` | Sync hosted command, public address and upload boundary |
| `doc/backlog.md` | Tick M3-02 at close only |
| `doc/adr/0003-public-preview-repository.md` | Proposed at close: one public MIT source repository and manually dispatched Pages deployment, superseding ADR 0002 on approval |
| `doc/work/active/M3-02-memo.md`, `doc/work/active/M3-02-test-plan.md`, `doc/work/STATUS.md` | Memo, test evidence and lifecycle |
| `dist-hosted/index.html`, `dist-hosted/preview.png`, `dist-hosted/README.md` | Generated public deliverables; not development-source commits |

Existing offline, localization and page-fit tests are validation gates, not
targets for weakened expectations. No new package is planned.

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness integration checks present
- [x] Full suite, type check, lint and applicable browser checks green
- [x] Offline file remains one file at or below 460800 bytes
- [x] Hosted folder contains exactly the three approved files
- [x] Hebrew preview PNG is 1200 × 630 and shows settled results and the notice
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded
- [x] No GitHub upload or Pages-live claim made as part of this item
- [x] Workflow follows the manual-trigger, branch, artifact and permission contract
- [x] Source/history safety gate recorded as required before the first push

**Implementation evidence, 2026-11-08.** All 3221 unit/build/UI tests pass with
file parallelism disabled; format, typecheck and lint pass. The complete browser
gate passes 404 cases with two workers (48 existing project-scoped skips).
The final offline file is 458179 bytes against the unchanged 460800-byte limit.
Hosted output is exactly the approved three files; the real Hebrew 1200 × 630
PNG was visually inspected. See the test plan Run Record for commands,
intermediate failures, repairs and output sizes.

The file list above was walked: build helpers, command, generated-folder ignore,
workflow, source README, shared notice, CSS, all three translations and new
tests are delivered; specification and project brief are synchronized.
Backlog completion, archival and proposed superseding ADR 0003 remain
`/4-close`, not this step. No engine or schema file was changed. No Git command,
remote inspection, push or deployment occurred. MIT verification, exact
source/history inspection, cloud execution and live URL verification remain
pending; the preliminary security review is not a publication clearance.

**Independent close, 2026-11-08.** Re-ran all 3221 unit/build/UI tests,
typecheck and lint successfully. Rebuilt both targets and ran the complete
browser suite: 404 passed, 48 existing project-scoped skips, no failures.
The offline file remains 458179 bytes; hosted output remains exactly
`index.html` (459458 bytes), `preview.png` (165868 bytes) and `README.md`
(481 bytes). The Files table was reconciled against implementation records
and direct file reads without Git: delivered code/tests match the listed
scope, with the generated offline file and existing browser command also
updated as documented below. Backlog ticked, project map synced and work
documents archived. ADR 0003 is proposed in the handoff, not written without
its approval. No source upload, remote license inspection or Pages deployment.

## Open Questions

1. Adopt `Israel-Election-Simulator` as the single public MIT source repository and use
   `https://seriycoder.github.io/Israel-Election-Simulator/` as the planned
   Pages base? — **Recommendation:** yes; it follows the supplied destination.
   Confirm its actual contents and Pages settings before M3-03 writes.
2. Add the educational notice to both hosted and offline versions, including
   the questionnaire? — **Recommendation:** yes; one shared app, no unlabelled
   results and no hidden disclaimer.
3. Upload the reviewed source in M3-03 and release the site through a manual
   GitHub Actions run, not on each push? — **Recommendation:** yes; check the
   exact publication files and history first, preserve the remote MIT license,
   and never upload secrets or local session artifacts.
4. Keep the full English/Hebrew review before public publication as currently
   required by M3-05, despite the earlier suggestion to review after feedback? —
   **Recommendation:** yes; M3-02 can prepare locally while that review remains
   a separate publication gate.
5. Treat the preliminary security-review result as limited, and require an
   explicit source/history inspection before the first push? —
   **Recommendation:** yes; no guarantee against account or machine compromise
   can be inferred from a short no-findings report.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /1-memo | New destination supersedes the earlier `elections` repository plan; current spec and accepted ADR are not edited in this step | User supplied `https://github.com/SeriyCoder/Israel-Election-Simulator.git` on 2026-11-08; a memo changes only `doc/work/` |
| Memo revision, 2026-11-08 | Replace the publish-only repository with one public source repository and a manually triggered Pages workflow | User expressly permits public source and approves correcting M3-02; reported MIT license must be verified |
| Memo revision, 2026-11-08 | Preliminary security review recorded with coverage limitations and a mandatory pre-push source/history gate | The security agent returned no findings but did not provide evidence sufficient to guarantee absence of secrets or personal data |
| /2-tests | Test contracts use `HOSTED_BASE_URL`, `mode: hosted`, `data-public-notice`, named build/deploy jobs and the orchestrated hosted command | Concrete seams are needed for executable RED without adding production stubs; the plan records these contracts |
| /2-tests | Full baseline verification repeated with file parallelism disabled | Seven in-memory build attempts added load; three existing tests timed out in the parallel run and all passed on a focused recheck and sequential full run without changing timeouts |
| /3-implement | Capture a 1920 × 1008 CSS viewport at device scale 0.625, producing the required 1200 × 630 PNG | At a 1200 × 630 CSS viewport, the notice and settled coalition tiles do not fit together. The real Hebrew screen is captured without modifying app content; the notice and first two tiles are visible, while lower content continues beyond the frame |
| /3-implement | The questionnaire uses remaining viewport height and tighter gaps/padding below 620 CSS pixels | The new notice exposed the old full-viewport sheet height. Existing fit tests required accommodating its actual height and wrapping without hiding content, reducing font size or weakening tests |
| /3-implement | Workflow runs unit/build tests sequentially and reads Windows Edge executable version metadata | Existing parallel build load produced timeouts at RED; sequential execution preserves all cases and timeouts. A Windows GUI executable's version flag is not a reliable launch gate; real headless launch is verified by the hosted build |
| /3-implement | Full browser validation and the workflow use two browser workers | An unrestricted run exposed one existing performance timeout and six hosted import/export polling timeouts; all passed in the bounded focused recheck. Budgets, cases and assertions stay unchanged |
| /4-close | `dist/elections.html` was regenerated, although only hosted deliverables were explicit in the Files table | The approved shared notice necessarily changes both targets; the offline output and unchanged budget were required gates |
| /4-close | Existing `test:e2e` command builds both targets before browser tests | New hosted tests require fresh hosted assets. It uses the existing dependencies and explicit base setting; no new test expectations were weakened |
| /4-close | ADR 0003 remains a proposal, not a created file | The closing procedure requires explicit approval before writing an ADR; accepted ADR 0002 remains immutable |
