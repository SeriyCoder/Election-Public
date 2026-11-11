# ADR 0002 — Public Preview Hosting

| Field | Value |
| --- | --- |
| status | accepted |
| date | 2026-11-05 |
| origin | M3-01 publication decision, approved 2026-11-04 |

## Context

The offline simulator needs a public HTTPS link for a social post, but the user
does not want to publish the source repository. The public preview is an
educational demonstration, not a forecast or legal calculator. The user
approved the hosting plan and Hebrew-language preview in M3-01.

## Decision

- Host the free, non-commercial preview on GitHub Pages under the user's
  account.
- The user creates a separate public repository named `elections` (fallback:
  `coalition-sim`). It contains only the built `index.html`, a 1200 × 630
  preview image and a short README. The source remains local.
- The user uploads the prepared files through GitHub's web interface and
  configures Pages to deploy from `main`, `/ (root)`.
- Planned address: `https://seriycoder.github.io/elections/`; fallback:
  `https://seriycoder.github.io/coalition-sim/`. The address is not considered
  live until the user uploads and M3-03 verifies it.
- The page defaults to Hebrew when no language is saved. The Facebook post and
  preview metadata are in Hebrew (`he_IL`); the app's language switcher offers
  Russian and English.
- Publish only the approved built-in examples. The page has no analytics,
  cookies, trackers, forms or external requests; its existing
  Content-Security-Policy stays.

## Consequences

- The source, tests, documentation and history are not published in the preview
  repository.
- Updating the preview requires uploading a new built page through the web
  interface.
- M3-02 prepares the hosted folder; M3-03 covers the user's upload and
  independent desktop and phone link verification.

## Rejected

- Publishing the source repository: not wanted by the user at this stage.
- Cloudflare Pages Direct Upload: viable fallback, but adds a second account.
- Netlify: its free-plan credit limit can pause sites when exhausted.
