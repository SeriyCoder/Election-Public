# Memo — M2-09 Single-File Offline Build And Local Link Delivery

| Field | Value |
| --- | --- |
| item | M2-09 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-28 |
| closed | 2026-10-28 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

`npm run build` already inlines everything into one `dist/index.html`
(155 kB, with the coalition worker inlined as a blob or data URL), but nothing
guarantees it stays that way. The file does not have the name Section 2.2
promises (`elections.html`). The bundle still carries Vite's module-preload
polyfill, which contains a `fetch` call. No check fails if a future change adds
an external script, font or stylesheet. And the Section 12 [M2] check "works
with the network disabled; its working local file link is delivered" has never
been run or recorded.

## Scope

**In scope**

- The production build emits exactly one file, `dist/elections.html`, with
  scripts, styles, worker, translations and presets inlined.
- Remove the module-preload polyfill, so the bundle contains no network call.
- A Content-Security-Policy meta tag that forbids every network connection and
  every external resource. It allows only the page's own inline script and
  style and blob/data workers.
- An automated build check in Vitest: build into a temporary folder, then
  assert:
  - one output file with the right name;
  - no external `src`/`href`;
  - no `http(s)` URL except the XML namespace URIs the renderer needs;
  - no network APIs (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`,
    `sendBeacon`, dynamic `import`);
  - the CSP present;
  - the worker inlined;
  - the size within a budget.
- Browser verification from `file://` with the network turned off:
  - the editor works;
  - seats and the coalition search (worker) work;
  - the language switch works;
  - export and import work.
- Deliver the local link and record it in the project brief.

**Out of scope**

- The hosted build, link preview metadata, the not-a-forecast notice and a
  favicon (M3).
- PWA manifest and service worker (M5; they do not run from `file://`).
- The Playwright suite (layout, accessibility, offline and timing checks as
  repeatable tests). That is M2-10; this item does a recorded manual smoke.
- A build version stamp in the page and a `<noscript>` message.

## Approach

**Output name.** Keep `index.html` as the dev entry, so the dev server is
unchanged. A small build-only step in `vite.config.ts` renames the emitted
HTML asset to `elections.html` after the single-file plugin has inlined it.
The name lives in one constant in the config, and the build check reads it
from there.

**No network code.** Turn off Vite's module-preload polyfill. The single file
has no preload links, so the polyfill is dead code, but it is the only `fetch`
in the bundle.

**CSP (Section 11 safety).** `index.html` gains a CSP meta tag:

- default: none;
- script: self plus inline (the bundle is one inline module script);
- style: inline (Preact sets style attributes for bars and swatches);
- worker: blob and data (Vite's inline worker uses a blob URL, with a data-URL
  fallback);
- image: data;
- connect: none.

Downloads by blob URL navigation and file input reads are not affected. A
fetched script, font or stylesheet, or a network request from a future change,
is blocked by the browser. The build check also flags it.

**Build check.** A Vitest file runs the Vite build through its JavaScript API
into a temporary folder, with the project's own config, and inspects the
emitted file text. It needs no browser and no network.

The size budget is 300 kB, about double today's file:
- generous enough not to be noisy;
- still catches an accidentally bundled large dependency or duplicate.

**Network-off verification.** Open the built file from `file://` in a browser
with the network disabled. Exercise:
- the edit path;
- the worker search;
- the three languages;
- export and import.

Record the result in the test plan run record. M2-10 turns the same path into
an automated Playwright test.

**Delivery.** The working link is `dist/elections.html` in the project folder,
opened as a `file://` URL. The project brief records the build command and the
output path.

**Rejected alternative:** renaming the dev entry itself to `elections.html`.
That changes the dev server URL and every reference to the entry, for no gain
over renaming the build output.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| None | Build and delivery only | None |

## Interface Delta

- Build output: `dist/elections.html` replaces `dist/index.html`.
- `index.html`: Content-Security-Policy meta tag.
- `vite.config.ts`: output-name constant, rename step, preload polyfill off.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None. The engine source and its bundling are unchanged; only the HTML file name, one meta tag and the removal of a dead polyfill change |
| Where exact rationals are required | Not affected |
| Ordering / tie rules relied on | Not affected |
| Any display rounding near a decision? | No |
| How determinism across runs, round trip and locale is proven | The existing engine and UI suites stay green. The network-off smoke checks that the built file shows the Section 8 baseline seats 46 / 50 / 18 / 6 in all three languages |

Not affected because no source under `src/engine/` or `src/ui/` changes; the
item changes how the same bundle is packaged and named.

## Files

| Path | Change |
| --- | --- |
| `vite.config.ts` | Output name constant; rename step after single-file inlining; module-preload polyfill off |
| `index.html` | CSP meta tag |
| `tests/build/offline.test.ts` | New: build into a temporary folder and check the single offline file |
| `tsconfig.json` | Only if the new test folder or the config import needs including |
| `.github/copilot-instructions.md` | Build output path and local link (at close) |
| `doc/spec/elections-simulator.md` | "As built in M2-09" note in Section 2.2 (at close) |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Add a Content-Security-Policy meta tag now? — **Decision:** yes,
   with `connect-src 'none'`. It turns "no network" from a convention into
   something the browser enforces. It also prepares the hosted build in M3,
   which reuses the same HTML.
2. Keep `dist/index.html` as well, for hosts that expect an index? —
   **Decision:** no. M3 chooses the host and can add an index or a
   redirect then; one output file keeps the offline delivery unambiguous.
3. Should the build check run in the normal `npm test`? —
   **Decision:** yes. It takes about two seconds and needs no browser.
   A regression in packaging is as serious as one in the engine, because the
   offline file is the product.
4. What size budget? — **Decision:** 300 kB for the single file.
   Today it is 155 kB; the budget catches a large accidental dependency without
   failing on normal growth through M2-10.

Approved on the user's standing instruction: "samostoyatelno rzreshaju approve doiti do M3-01".

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | The build check runs Vite's build in memory (`write: false`) instead of into a temporary folder | `@types/node` is not installed, so a typed temp-folder path would add a dependency; in memory also never races with a developer's `npm run build` |
| /3-implement | The CSP meta tag is injected at build time by the `vite.config.ts` plugin (`transformIndexHtml`), not written into `index.html`; the policy is the `CONTENT_SECURITY_POLICY` constant | In `index.html` it would also apply to the dev server, whose injected client script and WebSocket it forbids. The built file carries exactly the approved policy |
| /3-implement | The rename re-emits the inlined page under the new name rather than editing the asset in place | Rollup's bundle keys are the file names; re-emitting keeps them consistent |