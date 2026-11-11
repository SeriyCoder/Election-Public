# Memo — M2-01 Preact App Shell, State Store, Phone/Desktop Layout

| Field | Value |
| --- | --- |
| item | M2-01 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release |
| status | closed |
| created | 2026-10-28 |
| closed | 2026-10-28 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

The engine is complete but nothing renders it. M2 needs a running Preact
application with one place that holds the scenario being edited, derives the
validation and the engine result from it, and lays out the toolbar, the editor
and the results for desktop and phone (Section 10). Every later M2 item plugs
into this shell, so its state model decides whether invalid edits are kept,
whether stale results can leak and whether arithmetic stays in the engine.

## Scope

**In scope**

- Preact and its Vite plugin; `dev`, `build` and `preview` scripts; an
  `index.html` entry with a phone viewport.
- A framework-independent store holding the editable scenario input (the
  schema version 1 JSON shape, with decimal strings) and the active view; it
  derives the validation result and, only when valid, the engine result.
- The Section 8 baseline as the default scenario, shipped as application data.
- The shell: a compact toolbar (scenario name, validity status), an editor
  region and a results region; a view switcher for inputs, seats, coalitions
  and comparison. Each view shows a placeholder until its own item fills it.
- A results status line: seats allocated, an explicit no-allocation reason, or
  the number of validation issues with results withheld.
- Layout CSS: desktop shows editor and results side by side; phone stacks one
  section at a time with a bottom view switcher; logical properties only; 44 px
  minimum touch targets.
- A Russian string table and a lookup function, so no UI text is hardcoded.

**Out of scope**

- English, Hebrew, RTL, language switching and the missing-key check (M2-02).
- Editing controls for groups, parties, blocks and preferences (M2-03, M2-04).
- Result tables and charts (M2-05); the coalition worker (M2-06).
- Baseline and comparison (M2-07); import/export (M2-08); the single-file build
  (M2-09); browser automation and the 200 ms budget (M2-10).
- Persisting the scenario across reloads.

## Approach

The store is a plain TypeScript module with no DOM or Preact dependency: it
keeps the current state, notifies subscribers, and exposes actions to replace
the scenario input, update it immutably and change the view. Derived values are
computed from the scenario input by calling the engine's validator and, only on
success, `runScenario`; they are cached by input identity so rendering does not
recompute. Keeping the raw input rather than the validated scenario lets later
editors hold a temporarily invalid value without losing it (Section 10: errors
preserve edits), and deriving the result only from a valid input means a stale
result can never be shown as current.

A small Preact hook subscribes a component to the store. The shell renders the
toolbar, the editor region and the results region. The view switcher is one
navigation list; CSS places it as tabs on desktop and as a fixed bottom bar on
phone. On desktop the editor is always visible and the results region shows the
selected result view (seats when "inputs" is selected); on phone only the
selected section is visible.

All visible text comes from a Russian table through one lookup function. M2-02
adds the other locales without touching components. Numbers shown in M2-01 are
integers (seat counts, issue counts) printed without locale formatting; locale
formatting arrives with M2-02.

Coalition analysis runs on the main thread inside `runScenario` for now; M2-06
moves it to a worker.

**Rejected alternative:** Preact signals as the store. They tie state to the UI
library and to its scheduling; a plain store is testable in Node without a DOM
and can later be shared with a worker boundary.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Default scenario | Section 8 baseline shipped as application data | None |
| UI state | Scenario input and active view, in memory only | None |

## Interface Delta

- New UI surfaces: toolbar, editor region, results region with status line,
  view switcher (inputs, seats, coalitions, comparison).
- New modules: the store, the store hook, the default preset, the Russian
  string table and its lookup.
- New scripts: `dev`, `build`, `preview`.
- No engine function changes.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None new; the store calls `validateScenario` and `runScenario` |
| Where exact rationals are required | Unchanged; the UI receives engine results and performs no electoral arithmetic |
| Ordering / tie rules relied on | Those of the engine; the store does not reorder results |
| Any display rounding near a decision? | None; only integer seat and issue counts are displayed |
| How determinism across runs, round trip and locale is proven | The store's result serializes byte-identically to a direct engine run of the same input, across repeated derivations and after a JSON round trip of the input; a static scan proves UI and i18n sources import no engine arithmetic and use no float or locale APIs on results |

## Files

| Path | Change |
| --- | --- |
| `package.json`, `package-lock.json` | Preact, Preact Vite preset, server renderer for tests; `dev`, `build`, `preview` scripts |
| `vite.config.ts` | Preact plugin; test include adds `.test.tsx` |
| `tsconfig.json` | JSX for Preact; include `.tsx` |
| `eslint.config.js` | Browser globals for `src/` |
| `index.html` | Application entry, phone viewport, `lang="ru"` |
| `src/main.tsx` | Mounts the shell |
| `src/ui/store.ts` | Store: state, actions, derived validation and result |
| `src/ui/useStore.ts` | Preact subscription hook |
| `src/ui/App.tsx` | Shell: toolbar, regions, view switcher, status line |
| `src/ui/presets.ts` | Default Section 8 baseline scenario input |
| `src/ui/styles.css` | Desktop and phone layout with logical properties |
| `src/i18n/ru.ts`, `src/i18n/index.ts` | Russian table and lookup |
| `tests/ui/store.test.ts` | Store behaviour, derivation, determinism, static scan |
| `tests/ui/app.test.tsx` | Shell rendering per view and per validity state |
| `.github/copilot-instructions.md` | Repository map: `src/ui/`, `src/i18n/`, `tests/ui/` |
| `.github/instructions/tests.instructions.md` | Layout line: UI tests in `tests/ui/` (contour edit, recorded as a CONTOUR item) |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

Approved 2026-10-28 under the user's standing instruction: "samostoyatelno
rzreshaju approve doiti do M3-01, esli nuzhno delai audit. takzhe po hodu posle
kazdogo zakonchenogo Phase delai local commit". Every recommendation is
accepted as the decision.

1. How are UI components tested before Playwright exists? — **Decision:**
   render to an HTML string in Node with Preact's server renderer, and test the
   store directly. No DOM emulator dependency; interaction and layout are
   covered by Playwright in M2-10.
2. Which views does the switcher list in M2? — **Decision:** inputs,
   seats, coalitions and comparison. Sweep arrives with M4 analysis and is not
   shown as a dead tab.
3. Should the scenario survive a page reload? — **Decision:** no, not in
   M2-01. Saving is through JSON export (M2-08); silent local storage of user
   scenarios is a privacy decision for later.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | Added `src/vite-env.d.ts` (Vite client types) | Type check needs a declaration for the CSS side-effect import in `src/main.tsx` |
| /2-tests | Russian table and lookup tests live in `tests/ui/app.test.tsx` | They are part of the shell contract; no separate file needed until M2-02 adds the missing-key check |
| /3-implement | Toolbar validity badge uses two extra string keys (`validity.valid`, `validity.invalid`) | The memo's "validity status" needs text; no hardcoded strings |
