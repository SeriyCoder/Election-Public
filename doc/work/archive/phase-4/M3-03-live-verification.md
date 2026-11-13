# M3-03 Live Publication Evidence

| Field | Value |
| --- | --- |
| verified | 2026-11-11 |
| source | `https://github.com/SeriyCoder/Election-Public` |
| site | `https://seriycoder.github.io/Election-Public/` |
| public revision | `4d267bdf6a44f444346a78beb6cc1bc3ed2b5938` |
| workflow | `https://github.com/SeriyCoder/Election-Public/actions/runs/43068778237` |
| status | deployed; desktop accepted 2026-11-12; phone, Firefox and Safari are follow-ups |

The public repository's original MIT license was retained. The source commit
is based on its original public commit, not the private development history.
The private `Election` repository was previously backed up and remains private.

The manual workflow built and deployed successfully. Its `github-pages` artifact
contains only `index.html`, `preview.png` and `README.md`; each deployed file
matches the corresponding artifact file byte-for-byte. The root page and
preview image return HTTP 200. The preview is PNG, 1200 by 630; the page has
the expected HTTPS canonical URL and Hebrew metadata.

In a fresh integrated browser page, Hebrew startup rendered, switching to
Russian worked, and the eight-party start displayed the coalition workspace.
This is a narrow desktop smoke check, not full acceptance.

The candidate's local checks passed: 3221 unit tests, types and lint; browser
suite 404 passed and 48 existing conditional skips. The cloud workflow's unit,
type, lint, browser, build and deploy steps all completed successfully.

**2026-11-12 desktop acceptance.** The live `index.html` (458655 bytes) was
compared with a fresh local `npm run build:hosted` of the current tree
(`HOSTED_BASE_URL` for `Election-Public`). Removing carriage returns makes them
identical; the local file's 15 carriage returns all lie in template markup
outside the inlined script (Windows line endings). The executed code is
therefore identical, so exact inputs and results match the local build in
every language and start. The user accepted desktop as the acceptance target;
phone-size, real Firefox and real Safari checks are follow-ups, not passed.

Superseded 2026-11-11 note — still pending at that time: exact live/local exported-input and result parity for both
starts and years 0/4 in all three languages, live English/Hebrew interactions,
phone-size checks, and any real Firefox/Safari checks. The user accepted
ordinary post-release issues and deferred full M3-05 language review; do not
describe these checks as completed or infer real-phone coverage from emulation.
