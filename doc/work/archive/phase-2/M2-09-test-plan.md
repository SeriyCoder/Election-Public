# Test Plan — M2-09 Single-File Offline Build And Local Link Delivery

| Field | Value |
| --- | --- |
| item | M2-09 |
| memo | `doc/work/archive/phase-2/M2-09-memo.md` |
| created | 2026-10-28 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/build/offline.test.ts` | Vitest (node, Vite build API in memory) | Output name; exactly one emitted file; UTF-8 declared before the title; one inline module script; no external `src`/`href`/`data` and no non-data `url()`; no web address except namespace identifiers; no network API (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, dynamic `import`); coalition worker inline; exact Content-Security-Policy directives; 300 kB size budget |

## Happy Path

- `npm run build` gives `dist/elections.html` and nothing else — `emits exactly one file`.
- The file needs no network — `calls no network API: %s`; `forbids every network connection through its content policy`.
- Network-off browser smoke from `file://` (recorded below at implement): edit, seats, worker search, three languages, export and import.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Not touched; engine suites unchanged |
| Determinism: repeated runs, JSON round trip, ru/en/he | Not touched; existing suites. The network-off smoke checks the Section 8 baseline seats 46 / 50 / 18 / 6 in the built file under ru, en and he |
| Threshold below / at / above | Not touched |
| Exact remainder tie → tieBreakOrder → party ID | Not touched |
| Fixtures from exact inputs | Not touched (see the smoke above) |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | Not applicable: the build has no runtime input |
| Single element | `emits exactly one file`; `inlines the application as one module script` |
| All values equal | Not applicable |
| Maximum size | `stays within 300 kB` |
| No feasible solution | Not applicable |
| Rounding edge cases | Not applicable |
| Renamed output, accidental second file | `emits exactly one file`; `is named elections.html` |
| XML namespace strings in the renderer | `contains no web address except namespace identifiers` (allowlist of three identifiers that are compared, never fetched) |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| The CSP being honoured by a real browser | Needs a browser; checked in the network-off smoke and repeated by M2-10's Playwright tests |
| Opening the file on a phone | Spec 2.3: phones use the hosted link (M3), not a local file |
| Writing to `dist/` | The test builds in memory (`write: false`) so it never races with a developer's build; `npm run build` is a gate at implement and close |

## Changed Existing Tests

| Test | Change | Reason |
| --- | --- | --- |
| None | — | — |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | `npm test` | 3 failed / 1015 passed | Failures: the output is still `index.html`; the module-preload polyfill's `fetch(`; no CSP meta. The other 12 build checks pass already and guard the existing single-file behaviour |
| 2026-10-28 | `npm run typecheck`; `npm run lint` | clean | |
| 2026-10-28 | `npm test` | 1018 passed | After the offline-file plugin and polyfill switch |
| 2026-10-28 | typecheck; lint; prettier --check; `npm run build` | clean; `dist/elections.html` 154.70 kB, the only file in `dist/` | |
| 2026-10-28 | Network-off browser smoke, `file://` | pass | Offline context: CSP meta present; no requests, no console errors or CSP violations; seats 46 / 50 / 18 / 6; coalition search Complete in a `blob:` worker; ru / he (rtl) / en switch; export `baseline.json` (2735 chars) and re-import of an edited copy |
| 2026-10-28 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check` (close gate) | green | 1018 passed; dist/elections.html 154.70 kB; network-off smoke pass |
