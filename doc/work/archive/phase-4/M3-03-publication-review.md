# M3-03 Publication Safety Review

| Field | Value |
| --- | --- |
| reviewed | 2026-11-11 |
| target | `SeriyCoder/Israel-Election-Simulator`, last observed public `main` |
| local source revision | `d265033440b95cf4fbe00d74ecc344820abcea9c` |
| candidate | Sanitized source snapshot; no local Git history |
| status | candidate safety review complete; target access currently blocked |

## Coverage

- Confirmed the public repository's `main` commit and root inventory through
  GitHub read-only access. It contains the existing MIT `LICENSE` and
  `README.md`; the planned Pages URL returns 404, and no Pages workflow is
  configured in the remote repository.
- Reviewed the local 21-commit ancestry and 725 unique blobs, all three
  advertised public refs (three unique commits across refs), and the tracked
  source tree. No credentials, tokens, private keys or actual session/account
  data were identified within this review's scope.
- Examined the candidate snapshot: 357 files, made from the reviewed `HEAD`
  archive plus four updated public documentation files and the exact existing
  remote MIT license. It contains no `.git`, `node_modules`, `dist`,
  `dist-hosted` or Playwright report.
- Checked the candidate for machine-specific absolute paths and common
  credential patterns. No matches remain. The local profile-path line found
  in `doc/work/archive/phase-1/M1-01-test-plan.md` was replaced in the
  candidate only; the original local archive was not edited.
- Confirmed the remote README's original heading and description are retained
  at the top of the candidate README. The existing remote license bytes match
  the candidate license.
- Reviewed `.github/workflows/pages.yml`: manual `workflow_dispatch` only,
  branch-restricted to `main`, pinned actions, checkout credentials not
  persisted, read-only build permissions and separate Pages/OIDC deploy
  permissions. The workflow is not yet present in the remote repository.

On 2026-11-11, subsequent live access checks changed: the repository API,
repository page, repository search and anonymous `git clone` returned
not-found/404. The raw license URL still returned content, but raw-file caches
do not prove current repository visibility or branch state. Do not rely on
earlier branch/file observations until access is restored and rechecked. No
GitHub write or deployment was attempted.

## Findings And Limits

1. The existing public initial commit contains author contact metadata. It is
   not a credential, but is a residual privacy exposure. It cannot be
   reliably removed from GitHub caches, forks or other refs; no history rewrite
   is planned. New publication commits use the account's GitHub noreply
   address without changing global Git identity.
2. The local archived test plan and ignored local Playwright report contain a
   machine-specific path. The path is absent from the candidate snapshot; the
   ignored report and local Git history are not uploaded.
3. Pattern scans cannot prove absence of arbitrary, encrypted or obfuscated
   secrets. No repository contents were sent to third-party scanning services.
   The approved public election examples and reference data are not treated as
   private voter data.

No identified credential finding blocks publication. The candidate must still
be rechecked immediately before the GitHub commit; a changed file inventory or
new finding stops the release.

**Current blocker:** the candidate is ready for a fresh read-only comparison,
but the GitHub target is not currently accessible. Resume only after the owner
restores public access or confirms the correct public repository URL.
