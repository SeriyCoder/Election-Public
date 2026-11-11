# Test Plan — M7-14 Prototype-faithful Coalitions and Demographic Future

| Field | Value |
| --- | --- |
| item | M7-14 |
| memo | `doc/work/archive/phase-3/M7-14-memo.md` |
| created | 2026-11-02 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/panelStep.test.ts` | Vitest | Exact ±0.25 stepper, 0–100 clamp, invalid text, determinism |
| `tests/ui/prototypeLook.test.tsx` | Vitest (render to string) | Prototype grid and cards, summary tiles and badge, red align state, vertical party cards with bars, number, steppers and lock, composition mix bar and group cards, one turnout link per group, population bar rows and group pies, coalition tiles with badge, mini bar and majority mark, directed rule strips, future timeline with start/play/speed, growth rows, year-0/year-k donut pair; ru/en/he |
| `tests/ui/packedStyles.test.ts` | Vitest | Runtime DEFLATE decode, one inert style element, no-op before the build token is replaced |
| `tests/build/packStyles.test.ts` | Vitest (in-memory Vite build) | Lossless round trip, explicit count errors, shipped HTML has no style tag or token and carries exactly the Vite stylesheet packed |
| `tests/e2e/prototypeLook.spec.ts` | Playwright (desktop, phone) | One decoded stylesheet, card radius and border, vertical slider writing mode and accent, exact stepper moves, red/calm align colours, lock state, Hebrew RTL cards without overflow, no overflow at the six Section 14.6 sizes, future start button and donut pair |
| Existing `tests/ui/panel.test.tsx`, `tests/e2e/panel.spec.ts`, `futureWorkspace.spec.ts`, `coalitionWorkspace.spec.ts`, `future.spec.ts`, `layout.spec.ts`, `a11y.spec.ts`, `book*.spec.ts`, `tests/build/offline.test.ts` | Vitest, Playwright | Unchanged behaviour contract, accessibility, phone touch targets, questionnaire fit, single-file offline gates and size budget |

## Happy Path

- The Coalitions tab renders the prototype layout from `workspaceLinked`
  values: sum 100 with an agreed badge, turnout 60 → 60, party cards with
  base/now fills, steppers and locks.
- A + click moves 50 to exactly 50.25; two − clicks to 49.75; the align button
  turns red, and aligning restores the calm state.
- The future tab shows the timeline card; "К началу" returns the year to 0; a
  followed coalition shows two donuts side by side.
- The shipped file carries the stylesheet packed and installs it before the
  first render.

## Seat-Calculation Correctness (mandatory when the engine is touched)

The engine change is a percent-text stepper that feeds the existing exact panel
edit; no allocation path changes. The existing seat suites stay unchanged and
must stay green.

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Existing engine suites, unchanged |
| Determinism: repeated runs, JSON round trip, ru/en/he | `is deterministic across repeated moves`; `lays out the prototype grid and cards in %s` |
| Threshold below / at / above | Existing, unchanged |
| Exact remainder tie → tieBreakOrder → party ID | Existing, unchanged |
| Fixtures from exact inputs | `moves %s by %i quarter point to %s` (repeating decimal kept exact) |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `refuses the invalid percent text %j` |
| Single element | Two-party scenario: one rule strip (`draws directed rules as strips…`) |
| All values equal | `workspaceLinked` 50/50 shares |
| Maximum size (20 / 30 / 10) | Existing 30-party 200 ms workspace check, unchanged |
| No feasible solution | Clamp at 0 and 100 (`clamps %s moved by %i to %s`) |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Pixel comparison with the prototype screenshots | Values differ by scenario; structure and computed styles are asserted instead, plus manual screenshots |
| Experiment-mode markup in render-to-string | Mode is local component state; the browser suite covers it |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-11-02 | `npx vitest run tests/engine/panelStep.test.ts tests/ui/packedStyles.test.ts tests/ui/prototypeLook.test.tsx tests/build/packStyles.test.ts` | RED: 33 failed, 6 passed | Intended: stub stepper returns null; stub decoder returns empty; stub packer leaves the style tag; missing `ws-` structure and strings |
| 2026-11-02 | `npx playwright test tests/e2e/prototypeLook.spec.ts` | RED: 9 failed, 1 skipped | Intended: `.ws-card`, `.ws-range`, `.ws-tile`, `.ws-timeline`, `future-start` not found; phone skips the desktop size sweep |
| 2026-11-02 | `npm run typecheck` | Pass | Stubs compile; no production behaviour added |
| 2026-11-02 | `npx vitest run` | RED: 33 failed, 2995 passed (62 files, 4 failing) | Only the four new files fail; every existing test passes |
| 2026-11-02 | `npm test` | GREEN: 3028 passed (62 files) | Harness correction in `tests/build/packStyles.test.ts`: the recorder plugin is `enforce: 'post'` so it sees the packed bundle; no assertion changed |
| 2026-11-02 | `npm run typecheck`, `npm run lint`, `npx prettier --check src tests build vite.config.ts` | Pass | |
| 2026-11-02 | `npm run build` | Pass: `dist/elections.html` 441724 bytes | Budget 460800 unchanged |
| 2026-11-02 | `npx playwright test` | GREEN: 359 passed, 41 skipped, 0 failed | Skips are the existing project-conditional ones plus the phone skip of the desktop size sweep |
| 2026-11-02 | /4-close: `npm test`, `npm run typecheck`, `npm run lint`, `npx prettier --check src tests build vite.config.ts playwright.config.ts`, `npm run test:e2e` | GREEN: 3028 unit/build passed; 359 browser passed, 41 skipped, 0 failed; HTML 441724 bytes | Independent close gates |
