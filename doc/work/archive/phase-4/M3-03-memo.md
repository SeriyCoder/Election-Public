# Memo — M3-03 Publication and HTTPS verification

| Field | Value |
| --- | --- |
| item | M3-03 |
| epic | M3 |
| phase | Phase 4 — M3 public preview |
| status | closed |
| created | 2026-11-08 |
| closed | 2026-11-12 |

**Owner approval, 2026-11-10.** The user requested: “Fix all issues ... at the
end ... published code and a working link ... and a user-level skill for
publishing and writing proper code without secrets.” This authorizes an
expedited non-commercial MVP publication, post-release reporting of ordinary
defects, and the requested personal skill. The user selected “Fix all issues”
after receiving the redacted security findings. This does not authorize
revealing secret values, overwriting unrelated files, or falsely claiming that
already-public history has been erased.

**Release sequencing, 2026-11-11.** The user approved Plan B: document a
one-time exception allowing the authorized M3-03 source commit and Pages
deployment before `/4-close`, so closure records the real live-release result.
The user understands that the local unit suite passing does not mean all
release checks have passed and accepts reporting ordinary defects for
post-release fixes. This exception applies only to M3-03.

**Acceptance scope, 2026-11-12.** The user decided: “Ne vazhno kak eto
rabotaet na telefone, glavnoe kak na kompe M3-03 zakrivaem.” Desktop is the
acceptance target; phone-size, real Firefox and real Safari checks become
non-blocking follow-ups and are not reported as passed. Exact live/local
parity is established by artifact identity: the live `index.html` equals a
fresh local hosted build of the current tree except for 15 carriage returns,
all in the template markup outside the inlined script, so the executed code
and every exact result are identical in all languages and starts.

**Destination revision, 2026-11-11.** The user chose to keep
`SeriyCoder/Election` private, save the current project there first, and
publish a sanitized snapshot without private history in a separate public MIT
repository. The user created `SeriyCoder/Election-Public` and explicitly
authorized the public snapshot commit, push and Pages configuration. The
deployed URL is `https://seriycoder.github.io/Election-Public/`; its response
and exact artifact correspondence have been verified. This supersedes both
earlier proposed destinations and the single-repository plan below.

## Problem

M3-02 has prepared and locally validated the hosted artifact and manual Pages
workflow. The user reported publishing source to `main`, but inspection found
that the supplied public repository contains only its MIT license and a short
README; the planned Pages URL returns 404. M3-03 must safely publish the
reviewed source snapshot and verify the app over HTTPS without changing
electoral results. The
user prioritizes an early, non-commercial MVP and accepts that copy or usability
flaws may be reported and corrected after release; M3-05 is a follow-up, not a
deployment blocker for this publication.

## Scope

**In scope**

- Read-only verification of the supplied repository, its visibility, default
  branch, MIT license, published commit and existing Pages configuration.
- Inspect the exact published files and reachable published history for
  credentials, personal information, local paths and unintended artifacts;
  reconcile the published revision with the reviewed local M3-02 work.
- Record coverage and limitations of that inspection without copying secrets
  or personal data into the report.
- Preserve the remote license and initial content, publish the reviewed current
  source snapshot without uploading local Git history, and use private GitHub
  noreply author metadata for new commits.
- Configure Pages for GitHub Actions and run the existing manual workflow under
  the user's current explicit publication authorization.
- Verify its exact revision, build gates, generated artifact, deployment
  outcome and HTTPS URL, then compare live and local scenario/results.
- Record desktop and phone checks in ru/en/he. Use Edge where available;
  Firefox and Safari checks are follow-ups if those browsers are unavailable.

**Out of scope**

- Whole-interface translation review and language-control changes (M3-05,
  M3-06); the user explicitly accepts release before the full M3-05 review.
- Facebook post, launch screenshots and public sharing (M3-04).
- Engine, scenario schema, examples, calculation methods or UI redesign.
- Automatic deployment on push, a second repository, analytics, accounts,
  service workers or advanced hosting (M5).
- Replacing the remote license, rotating credentials or changing account
  security without separate authorization. A real credential exposure stops
  release and requires revocation/rotation.

## Approach

### Existing publication and authority

Use the supplied repository
`https://github.com/SeriyCoder/Israel-Election-Simulator` and planned address
`https://seriycoder.github.io/Israel-Election-Simulator/` (spec 2.4).
The user's statement that source was published was verified against the
repository and is not evidence that the site is live or publication is safe.

The user's current 2026-11-10 request explicitly authorizes checking and
publishing this project, including GitHub writes and Pages release. Keep
authentication in the owner's existing tools; never ask for a token/password
in chat or copy credentials into project files.

Read-only inspection established `main` at one initial commit, a public
repository with MIT license, two root files, and no Pages site. Preserve that
license and root content. Build a clean source snapshot from the reviewed local
commit and add it as a new commit on top of the existing remote `main`; do not
upload local commit history. Redact the local user-profile path from the
snapshot and exclude ignored/generated reports. Use GitHub noreply metadata
for this new commit, without changing global Git identity. The user approved
this one-time exception to the usual post-close commit rule so the live
deployment can be verified before closing M3-03. Never resolve divergent
histories through reset or force-push.

On 2026-11-11, the repository stopped resolving through anonymous GitHub
access: the repository API, repository page, search and `git clone` returned
404/not found. A raw `LICENSE` URL still returned cached content, which does
not establish current repository visibility or branch state. No push, Pages
settings change or dispatch was made. Stop until the owner restores public
access or provides the correct public repository URL; re-read `main` and its
files before any write.

### Safety review and findings

Treat the requested pre-push check as missed, not retroactively passed. A
bounded read-only security-review agent inspected the public target and local
workspace/history on 2026-11-10. No credentials, tokens, private keys or actual
session/account data were identified within its scope. It found an author
email in existing public commit metadata, one local profile path in a tracked
archived test plan and local history, and a similar path in an ignored local
Playwright report. Absolute values are intentionally omitted from project
documents and this memo.

Cover credentials, tokens, keys, environment files, private scenario imports,
session/account data, machine-specific paths, document metadata, fixtures and
generated or cached artifacts. `.gitignore` does not hide tracked files or
historical versions. Distinguish public reference data and the explicitly
approved eight-party fixture from accidental private content; do not infer
personal attributes from demographic labels.

The public target currently contains only `LICENSE` and `README.md`; it does
not contain the simulator. The repository is public, its license is MIT, `main`
has one initial commit, and the planned Pages URL currently returns 404. The
local repository's `origin` points elsewhere. The review examined all three
advertised public refs (one commit reachable from `main`, three unique commits
across refs) and the local 21-commit ancestry and 725 unique blobs, plus the
candidate tracked/untracked tree and generated report/image metadata. No
credential indicators were found. Pattern scanning cannot prove absence of
arbitrary or obfuscated secrets.

The already-public author metadata cannot be reliably withdrawn from GitHub,
PR refs, caches or forks; treat that address as exposed. Do not rewrite remote
history or claim erasure. Do not upload the local history that contains the
profile path; redact it from the candidate snapshot and keep ignored reports
out. Use GitHub noreply metadata for the new public commit only, without
changing the global Git identity.

### Release scope and sequencing

M3-05 remains unticked, but the user's current direction explicitly accepts an
early non-commercial MVP and later reports/corrections for translation or
usability flaws. Record this as a user-approved departure from the former
pre-publication language-review gate; do not state that English/Hebrew copy
received a full human review. M3-05 remains a post-release follow-up.

### Controlled release

After the candidate snapshot is cleaned and local gates pass, inspect Pages
settings and use the
existing manual-only workflow from the approved `main` revision. Confirm its
SHA pins, non-persisted checkout credentials, read-only build job and separate
Pages/OIDC deploy job. Keep its sequential unit gate and two browser workers.
Never introduce personal access tokens or automatic push/PR deployments.

Confirm successful cloud installation, unit tests, types, lint, both builds,
browser tests and upload of exactly `dist-hosted/`. Local GREEN is not evidence
of cloud success. Associate the run, deployed revision and artifact with the
live URL. Investigate failures explicitly; no fake success or alternate
untested upload route. A tightly scoped cloud compatibility fix, if needed,
requires a documented regression at the appropriate loop step.

### Verification

At /2-tests, define an evidence checklist that remains RED until deployment
and live verification evidence exist; do not make an intentionally failing
network request. Retain the existing local hosted/offline parity tests
unchanged. Repository tests must not access the network; perform the
authorized live check manually after deployment, in a fresh browser context.

Fetch initial HTML and preview PNG from the authorized site. Verify HTTPS,
subpath, Hebrew crawler metadata, canonical/image URLs, PNG dimensions,
HTML/PNG correspondence with the approved artifact and absence of unintended
public source files in the deployment. Account for host redirects explicitly.

Use fresh browser contexts, not user profiles. On desktop and phone sizes,
verify Hebrew startup, all language switches and RTL, questionnaire and main
notice, both approved starts, coalition workers, import/export and future view.
Compare canonical exported input and exact engine results at years 0 and 4
with the corresponding local artifact; compare displayed seats in each locale.
Watch for console errors, missing assets and unintended runtime requests.
The initial site/image fetches are release verification, not app data traffic.

Record browser/version, device/viewport, locale, revision and each outcome.
Installed Edge with a phone viewport is not real Safari/iPhone coverage.
Unavailable Firefox desktop or Safari phone checks remain pending, never
reported green, but do not block this expedited MVP release.
Stop all temporary servers and close helper contexts after checks.

**Rejected alternative:** force-push local history to the target repository;
it contains a local profile path, and rewriting the already-public author's
metadata cannot guarantee erasure from other public refs or caches.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario, saved preferences and engine output | None | None |
| Pages settings and release revision | External deployment configuration and evidence only | None |
| Safety and browser evidence | Work documents with redacted locations and coverage | None |

## Interface Delta

No new app controls, engine APIs or export formats are planned. The existing
hosted app becomes accessible through its verified HTTPS link only after gates.

## Seat-Calculation Correctness

No arithmetic is modified: this item publishes the same reviewed bundle and
verifies its results rather than recalculating them in deployment code.

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None; existing engine and inline workers are shipped unchanged |
| Where exact rationals are required | Existing vote, threshold, Hamilton, projection and coalition decisions |
| Ordering / tie rules relied on | Persisted tieBreakOrder and party-ID fallback; no scenario reordering |
| Any display rounding near a decision? | None; displayed seats are compared, but expectations come from exact exported input |
| How determinism across runs, round trip and locale is proven | Existing engine tests plus local/live canonical input and exact result comparisons for both starts in ru/en/he, including years 0 and 4 |

## Files

| Path / resource | Expected change |
| --- | --- |
| `doc/work/active/M3-03-memo.md` | Scope, approvals, release prerequisites and deviations |
| `doc/work/active/M3-03-test-plan.md` | RED evidence checklist and subsequent actual results |
| `doc/work/active/M3-03-publication-review.md` | Redacted source/history coverage and findings; no secret values |
| `doc/work/active/M3-03-live-verification.md` | Revision, run, URL and desktop/phone/browser evidence |
| `doc/work/STATUS.md` | Truthful loop state and step rows, including explicit hold if requested |
| `doc/work/archive/phase-4/M3-03-*.md` | Closed work documents; any supporting reports moved together at close |
| `doc/backlog.md`, `doc/spec/elections-simulator.md`, `.github/copilot-instructions.md`, `README.md` | At implementation/close, reflect verified publication facts and outstanding gates |
| `.github/workflows/pages.yml` | Review existing workflow; changes only for a proven scoped cloud failure with regression evidence |
| `dist/elections.html`, `dist-hosted/index.html`, `dist-hosted/preview.png`, `dist-hosted/README.md` | Rebuild reviewed revision for artifact/local/live comparison; no hand editing |
| GitHub repository, Pages environment/settings and workflow run | Read-only inspection first; configuration/dispatch only with explicit release authorization |

The local source snapshot must exclude local history, redact the identified
profile path, and retain the remote license and initial content. ADR 0003
remains a separate proposal from M3-02, not automatically approved or created
by this memo invocation.

## Definition of Done

- [x] Tests/evidence checklist written first and seen RED for missing facts
- [x] Published revision, visibility, license and source/history coverage established
- [x] Findings resolved or explicitly recorded as blocking; no safety guarantee fabricated
- [x] External write authorization recorded; M3-05 full human review explicitly deferred by user with wording limits disclosed
- [x] Cloud workflow and Pages artifact verified for the approved revision
- [x] Mandatory seat-calculation parity evidence present (artifact identity, 2026-11-12)
- [x] Full local suite, typecheck, lint and browser gates green
- [x] HTTPS, metadata, preview and desktop checks green; phone checks are a follow-up by user decision 2026-11-12
- [x] Firefox and Safari coverage recorded or clearly listed as follow-up
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced only from verified facts
- [x] Deviations recorded; no force-push, secret disclosure or unapproved deployment

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /1-memo | User-reported source upload was not present in the inspected target; safety review becomes a pre-publication assessment | The public repository contains only its initial `LICENSE` and `README.md`; no simulator source or Pages deployment was found |
| /1-memo revision, 2026-11-10 | Defer M3-05's full human language review until after the first release | User explicitly requests immediate non-commercial publication and accepts reporting/correcting ordinary copy and usability flaws after release |
| /1-memo revision, 2026-11-10 | Publish a sanitized source snapshot atop the remote's existing initial commit instead of uploading local history | Local history contains a workstation profile path; the existing public author metadata cannot be reliably erased |
| /1-memo revision, 2026-11-10 | Keep live-host checks manual and outside repository test suites | Test instructions prohibit network access in tests |
| /3-implement approval, 2026-11-11 | One-time exception: commit the sanitized snapshot and verify Pages before `/4-close` | User selected Plan B so closure reflects the actual live release; no general change to the commit-after-close rule |
| /3-implement, 2026-11-11 | Stop before any GitHub write because the target became unavailable | GitHub API, repository page, search and clone returned 404; current target branch and permissions cannot be verified |
| /3-implement resumption, 2026-11-11 | Use public `Election-Public` for the release, keeping `Election` private | User created the MIT repository, approved the new destination and explicitly authorized public commit, push and Pages configuration |
| /3-implement resumption, 2026-11-12 | Desktop-only acceptance; phone, Firefox and Safari checks moved to follow-up; per-language live parity replaced by artifact identity | User decision 2026-11-12 (“glavnoe kak na kompe”); identical executed code makes per-language result comparison redundant |
| /4-close, 2026-11-12 | Files versus plan: `.github/workflows/pages.yml` and `dist*` outputs unchanged in the private repository (no cloud failure needed a fix); `M3-03-publication-review.md` and `M3-03-live-verification.md` archived with the memo; `README.md`, spec 2.4/13.2 and the project brief now name `Election-Public` instead of `Israel-Election-Simulator` | The release went to the user-created `Election-Public` repository (2026-11-11 destination revision) |

## Resolved Questions

1. Publish the code and hosted app after the bounded scan and candidate
   snapshot cleanup? — **Confirmed:** yes; the user's current request authorizes
   the GitHub writes and Pages release.
2. Require M3-05 full human translation review first? — **Confirmed:** no;
   defer it and report any copy flaws for post-release correction.
3. Upload the full local history or rewrite the remote's existing commit?
   — **Recommendation accepted:** neither; publish a sanitized source snapshot
   atop existing `main`, use noreply for new author metadata, and disclose the
   already-public address as a residual exposure.
4. Require actual Firefox and Safari before release?
   — **Confirmed:** no; run available Edge desktop and phone-size checks and
   report unavailable browsers as follow-ups, never as passed.
5. Apply the M3-03 sequencing exception and accept incomplete release checks
   until they are actually run? — **Confirmed, 2026-11-11:** yes; record the
   exact test results, do not claim unrun checks passed, and report ordinary
   issues for post-release correction.
6. Continue writing to the previously reviewed target despite current 404
   responses? — **Not authorized or safe:** re-establish the correct public
   target and inspect its current `main` first.
7. Release to the user-created `Election-Public` instead?
   — **Confirmed, 2026-11-11:** yes; it is public with MIT license and the
   private `Election` repository remains private. The public release was
   deployed from the reviewed snapshot without private Git history.
