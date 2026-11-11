# Memo — M2-10 Playwright Layout, Accessibility And Offline Checks; 200 ms Budget

| Field | Value |
| --- | --- |
| item | M2-10 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-28 |
| closed | 2026-10-28 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

Every M2 item so far was tested in Node with render-to-string and no DOM. Each
test plan deferred the parts that need a real browser to this item. Section 12
also has three [M2] checks that only a browser can show:

- desktop and phone layout in three languages, long Unicode names, keyboard
  actions and intentional matrix scrolling, with no overlap or page overflow;
- the network-off HTML, a JSON round trip into a second browser session, and
  inert hostile text;
- 200 ms for ordinary edits at 20 groups / 30 parties on a documented machine,
  plus a coalition search that never blocks input and shows progress,
  cancellation and incomplete status.

Deferred to here by earlier test plans:

| From | Deferred check |
| --- | --- |
| M2-01 | Phone and desktop layout, 44 px touch targets, live clicks, the 20 / 30 / 10 maximum |
| M2-02 | `lang`/`dir` on the document, language kept in local storage, RTL layout |
| M2-03 | Delete with a repair dialog, focus after delete, row and dialog layout |
| M2-04 | Typing in a percent field keeps the typed text; slider dragging |
| M2-05 | Bars and seat grid with long names; colour contrast |
| M2-06 | The real inline worker; coalition view clicks |
| M2-07 | Baseline save, reset and clear clicks; two workers at once |
| M2-08 | A real file picker and download |
| M2-09 | The Content-Security-Policy honoured by a browser; the network-off smoke automated |

## Scope

**In scope**

- Playwright as the browser runner, with tests in `tests/e2e/`, run by a new
  `npm run test:e2e` that builds first.
- The tests drive the built `dist/elections.html` from `file://`, with the
  network off. That file is the product.
- Two projects: desktop (1280 × 800) and phone (360 × 740, touch).
- Checks grouped in five files: offline and languages, layout,
  accessibility, interaction, performance.
- Small CSS or markup fixes that the new checks expose, recorded as
  deviations.
- The reference machine and the measured timings, recorded in the test plan
  and the spec.

**Out of scope**

- Other browser engines (Firefox, WebKit). M3 verifies real phone browsers on
  the hosted link.
- Pixel-compared screenshots. Screenshots are attached to the report for
  review, but geometry assertions decide pass or fail.
- Chart-detail popovers. M2-05 chose to print every value as text, so the
  Escape/outside-click rule has nothing to dismiss; the check is recorded as not
  applicable.
- Running the browser suite inside `npm test`. That stays the fast Node suite.

## Approach

**Runner and browser.** Add `@playwright/test` and drive the installed
Microsoft Edge (`channel: 'msedge'`).

- It needs no browser download and no network, so it fits an offline-first
  project.
- Edge ships with every Windows machine.
- The price: Edge updates itself, so the engine version is not pinned. The run
  record names the version.

**What is tested.** `npm run test:e2e` runs `vite build`, then Playwright.
Every test:

- opens `dist/elections.html` as a `file://` URL in a context set offline;
- fails on any request that is not `file:`, `blob:` or `data:`;
- fails on any console error or `securitypolicyviolation` event.

So every test also re-checks the M2-09 offline guarantee.

**Fixtures.** One e2e helper module:

- builds scenario JSON, including the 20-group / 30-party / 10-block maximum
  and a long mixed-script name set (Cyrillic, Latin, Hebrew, digits, about
  80 characters);
- loads it through the real file input, so the import path is exercised
  every time.

**Checks, by file:**

| File | Checks |
| --- | --- |
| `offline.spec.ts` | Section 8 baseline seats 46 / 50 / 18 / 6 in ru, en, he; switching language keeps inputs and results; `lang`/`dir` on the document; the choice survives a reload; the worker starts from `blob:`/`data:`; CSP meta present |
| `layout.spec.ts` | Every view × language × project: no horizontal page overflow; toolbar, view switcher, editor and results do not overlap; long names wrap with no overflow and every action stays inside the viewport. Phone: stacked regions and a view switcher reachable at the bottom. `.table-scroll` regions may scroll; the page may not. A screenshot per case is attached |
| `a11y.spec.ts` | axe-core WCAG 2 A/AA scan of each view in each language, failing on serious or critical findings. Phone: every visible button, select, text and number input is at least 44 × 44 CSS px. Keyboard: Tab reaches the toolbar, language buttons, view switcher and editor; Enter and Space switch views; the focused control has a visible focus indicator |
| `interaction.spec.ts` | Typing a percent keeps the typed text and updates seats; slider drag; delete with the repair dialog, cancel and confirm, then focus lands on a sensible control; baseline save, reset and clear, with both workers running; export to a download and re-import in a second browser context reproduces the results, tie order included; script-tag names and notes stay inert (no script runs, the text is shown) |
| `performance.spec.ts` | At 20 / 30 / 10, median of repeated ordinary edits (one percent field) from input to updated seats ≤ 200 ms. A coalition search that runs long shows progress; input still responds while it runs; Cancel reaches the cancelled state; a search that hits the node budget shows the incomplete status |

**Timing method.** Measured in the page:

- start: `performance.now()` just before the input event is dispatched;
- end: the next animation frame after the seats table shows the new value.

This measures what a user sees. It excludes Playwright's round trips.

**Reference machine.** This development machine:

- Intel Core i9-13900HX, 32 GB RAM, Windows 11 Pro;
- the Edge version from the run record.

The spec records it as the documented reference machine.

**Rejected alternatives:**

- Playwright's bundled Chromium: a large download, and it ties the suite to
  the network.
- jsdom for clicks: no layout, no workers, no CSP, so it cannot answer the
  deferred questions.
- Snapshot pixel diffs: flaky across font and Edge updates, and they say
  "different" rather than "broken".

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| None | Tests and tooling only | None |

## Interface Delta

- `package.json`:
  - dev dependencies `@playwright/test` and `@axe-core/playwright`;
  - script `test:e2e`.
- `playwright.config.ts`: the two projects, Edge channel, `tests/e2e`, report
  folder ignored by lint and the formatter.
- Any CSS or markup fix the checks expose (recorded as deviations).

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None. Browser tests read results; no engine source changes |
| Where exact rationals are required | Not affected |
| Ordering / tie rules relied on | The round-trip test checks that tie resolution survives export and import in a second browser session (Section 12 [M2]) |
| Any display rounding near a decision? | No |
| How determinism across runs, round trip and locale is proven | Baseline seats checked in all three languages in the built file; the round-trip test compares the full seats table before and after re-import in a fresh context |

Not affected because the engine is not edited. The engine suites stay as they
are.

## Files

| Path | Change |
| --- | --- |
| `package.json` | Two dev dependencies; `test:e2e` script |
| `playwright.config.ts` | New: projects, channel, test folder, offline context |
| `tsconfig.json` | Include `playwright.config.ts` |
| `eslint.config.js` | Ignore the Playwright report and results folders |
| `tests/e2e/helpers.ts` | New: open offline, guard requests and console, scenario builders, file import |
| `tests/e2e/offline.spec.ts` | New |
| `tests/e2e/layout.spec.ts` | New |
| `tests/e2e/a11y.spec.ts` | New |
| `tests/e2e/interaction.spec.ts` | New |
| `tests/e2e/performance.spec.ts` | New |
| `src/ui/styles.css`, `src/ui/*.tsx` | Only fixes the checks expose |
| `.github/copilot-instructions.md` | `tests/e2e/` no longer "planned"; the e2e command (at close) |
| `doc/spec/elections-simulator.md` | "As built in M2-10" in Section 12: reference machine, timings, chart details not applicable (at close) |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Which browser? — **Decision:** the installed Edge through the
   `msedge` channel. No download and no network, and it matches what most
   desktop users here open the file with. The run record names the version.
2. Run the browser suite in `npm test`? — **Decision:** no. It is a separate
   `npm run test:e2e`, required at implement and close of items that touch the
   UI. The fast Node suite stays the default gate.
3. Add axe-core? — **Decision:** yes, failing on serious and critical
   findings. It catches missing names and contrast problems that are hard to
   spot by hand, for one small dependency.
4. What counts as "red" in step 2, when the app already exists? —
   **Decision:** the first run is real evidence. Checks that fail on today's
   UI are the red set. Checks that pass are guards, as in M2-09. If nothing
   fails, the plan says so.

Approved on the user's standing instruction: "samostoyatelno rzreshaju approve doiti do M3-01".

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | Fixtures live in `tests/e2e/scenarios.ts` and reuse the engine test builders; the memo named only `helpers.ts` | Keeps scenario data apart from page plumbing; same builders as the engine suites |
| /3-implement | D1: phone page wider than the screen with long names. `.app`, `.editor` and eleven single-column grids got `grid-template-columns: minmax(0, 1fr)`; `fieldset` `min-inline-size: 0`; `select` `max-inline-size: 100%`; `overflow-wrap: anywhere` on `.app` | Implicit `auto` grid columns and the fieldset default grew to the longest name; on a phone the layout viewport widened and the fixed switcher left the screen |
| /3-implement | D2: duplicate label "Copy: {name}" / "Копия: {name}"; lock label split into `lock.label.on` / `lock.label.off` matching the visible word in ru, en, he | WCAG 2.5.3 label in name (axe `label-content-name-mismatch`); one `{state}: {name}` template failed the i18n check that English and Hebrew are translated |
| /3-implement | D3: the delete confirmation moves focus to its checked option on open, Escape cancels, cancel returns focus to the row's delete button, confirm moves it to the section's add button | Focus was left on a removed or hidden element |
| /3-implement | D4: `.chooser__item` minimum height `var(--touch)` | Coalition chooser labels were 90 x 24 on phone |
| /3-implement | D5: the worker hands at most `LISTED_COALITIONS` = 200 minimal winning coalitions to the page plus `minimalWinningTotal`; the coalitions and compare tables note "first 200 of N"; compare treats a cut list as inconclusive. New key `coalition.rowLimit` (ru, en, he). The engine still returns the full list | 348,096 coalitions: rendering never finished; copying them out of the worker stalled the page about 440 ms; comparing two such lists took about 1 s |
| /3-implement | The editor vnode is memoized on the store state in `App.tsx` | Each search progress message re-rendered the 20-group editor with its rational rebalance checks: 110–170 ms stalls during a long search, over the 200 ms budget with the measuring window |
| /3-implement | Unit tests added in `tests/ui/coalitionRunner.test.ts`, `coalitions.test.tsx`, `compare.test.tsx`; four existing runner expectations gained `minimalWinningTotal` | New behaviour of D5; the finished-run shape gained a field |
