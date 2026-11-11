# Memo — M2-06 Coalition View In A Cancellable Worker, With Coalition Pair Editing

| Field | Value |
| --- | --- |
| item | M2-06 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-28 |
| closed | 2026-10-28 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

The coalitions view is still a placeholder, and coalition rules (incompatible
party pairs, incompatible block pairs, compatible party overrides) cannot be
edited, which M2-03 decision 4 assigned to this item. Worse, the store derives
results with `runScenario`, which runs the full coalition search synchronously
on every edit: at 30 parties the search may visit up to 1,000,000 nodes on the
input path, against the Section 12 requirement that coalition search never
blocks input and shows progress, cancellation and incomplete status.

## Scope

**In scope**

- Split the synchronous result into votes, threshold and allocation only. The
  store stops running the coalition search; seats stay immediate.
- A coalition runner in the UI layer that runs `analyzeCoalitions` in a Web
  Worker, restarts on every valid scenario change (after a short debounce),
  terminates the stale run, and exposes the states idle, running (with nodes
  visited), done, cancelled and failed.
- A Cancel action while running and a Run again action after cancel or failure.
- The coalitions view: status (feasible, deadlock, unknown, no allocation),
  complete or incomplete with the reason (budget or more than 20 eligible
  parties), required majority with the override mark, government-eligible
  parties, minimal winning coalitions with members, seats, margin and
  opposition, balancing parties, and the effective forbidden pairs with their
  source (party rule or block rule).
- Evaluating a user-chosen coalition (checkbox per party) with
  `evaluateCoalition`, synchronously: seats, margin, opposition, majority
  reached, members that cannot govern, forbidden pairs inside, feasible,
  minimal.
- A Coalition rules section in the editor: add and remove incompatible party
  pairs and incompatible block pairs; an effective-rules list where every
  block-derived pair offers Allow (adds a compatible override) and every
  override offers Remove. New parties visibly inherit block defaults through
  that list.
- Pure draft edits for pairs in `src/engine/edit.ts`, refusing self-pairs,
  duplicates in either order and overrides that repeat an explicit incompatible
  pair (Section 11).
- An optional progress callback on the engine search that does not change the
  traversal.
- All new strings in ru, en and he.

**Out of scope**

- Listing selected larger coalitions and incompatible combinations on request
  (Section 7); deferred until feedback asks for it.
- An optional pivotal-party view and its metric (Section 7).
- Selected partners or constrained search above 20 eligible parties; the
  bounded result marked incomplete is the version 1 behaviour.
- The 200 ms measurement and browser checks of the worker in the single-file
  build (M2-10).
- Baseline comparison of coalitions (M2-07).

## Approach

**Sync and async split (Section 7, Section 12).** The engine gains a seats-only
run that computes votes, threshold and allocation; `runScenario` keeps its
current shape so every M1 fixture and `serializeResult` stay identical. The
store's derived result becomes the seats-only result, and `buildReport` accepts
it (the report never read coalitions).

**Worker.** A worker entry in `src/ui/` receives the validated scenario (plain
data, structured-clone safe), recomputes the seats-only result, runs
`analyzeCoalitions` with the default node budget and a progress callback, and
posts progress and the final analysis (plain numbers and strings, no
rationals). The page loads it with Vite's inline worker import so the
single-file build stays one file. Cancellation is `terminate()`: the search is
one synchronous call, so terminating is the only real cancel, and a fresh
worker starts the next run.

**Runner.** A small runner owns the worker, a request counter and the coalition
state, and takes a worker factory so tests use an in-process fake that calls the
same engine function. It ignores messages from superseded requests. When the
store's validated scenario changes, it waits 300 ms, terminates any running
search and starts a new one; an invalid scenario clears the state. If creating
a worker throws, it falls back to running the search on a timer in the page
with the same budget and records that the run blocked input (shown as a note).

**Progress.** `CoalitionOptions` gains an optional progress callback invoked
every 20,000 visited nodes with the count so far. It is called after the node
is counted and never changes the visit order, pruning or the result. The view
shows nodes visited against the budget as a determinate progress bar, because
the true search size is unknown.

**Pair editing (Section 7, Section 11).** Edits live in `edit.ts`: add a party
pair, add a block pair, remove a pair by list and index, allow a block-derived
pair (adds the override), remove an override. Each refuses invalid input with
the existing edit error, and the store surfaces refusals the same way as
rebalance. The effective list uses `effectiveForbiddenPairs` on the validated
scenario; with an invalid scenario only the raw lists are shown. Deleting a
party or block already repairs pair references (M2-03).

**Rejected alternative:** a cooperative, time-sliced search on the main thread —
it needs an iterative rewrite of a verified M1 engine path, still competes with
input handling, and the spec explicitly asks for a Web Worker.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| `coalitionRules` | Now editable in the UI; shape unchanged | None |
| Store state | Adds coalition run state (not persisted, not exported) | None |

## Interface Delta

- Engine: a seats-only run function and its result type in `run.ts`;
  `ScenarioResult` remains that plus `coalitions`.
- Engine: `CoalitionOptions` gains an optional progress callback and a
  `PROGRESS_INTERVAL` constant.
- Engine: pair edits in `edit.ts` (add party pair, add block pair, remove pair,
  allow override, remove override).
- `buildReport` takes the seats-only result.
- Store: `Derived.result` becomes the seats-only result; new pair actions;
  coalition state accessor and actions (cancel, run again).
- UI: `Coalitions.tsx` (view), a Coalition rules section in `Editor.tsx`,
  `coalitionRunner.ts`, `coalition.worker.ts`.
- The coalitions panel replaces `placeholder.coalitions`.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | Coalitions: only an observer callback is added to the search. Votes, threshold and allocation are called in the same order through the seats-only run. Pair edits change inputs, not arithmetic |
| Where exact rationals are required | Unchanged: votes, threshold and allocation stay exact; the coalition search works on integer seats |
| Ordering / tie rules relied on | Section 7 rules fixed in M1-07: minimal winning order, persisted party order for members and pairs, search order largest first |
| Any display rounding near a decision? | No; seats, margins and opposition are integers |
| How determinism across runs, round trip and locale is proven | The seats-only run equals the first three fields of `runScenario` on all Section 8 fixtures; the search returns the same analysis with and without a progress callback, and the callback count matches the visited nodes; the runner's result equals `runScenario(...).coalitions`; the coalitions view renders the same members in every language |

## Files

| Path | Change |
| --- | --- |
| `src/engine/run.ts` | Seats-only run and result type |
| `src/engine/coalitions.ts` | Optional progress callback and interval constant |
| `src/engine/edit.ts` | Coalition pair edits |
| `src/engine/report.ts` | Accepts the seats-only result |
| `src/ui/store.ts` | Seats-only derived result; pair actions; coalition run state |
| `src/ui/coalitionRunner.ts` | New: worker lifecycle, debounce, cancel, fallback |
| `src/ui/coalition.worker.ts` | New: worker entry |
| `src/ui/Coalitions.tsx` | New: coalitions view and chosen-coalition evaluation |
| `src/ui/Editor.tsx` | Coalition rules section |
| `src/ui/App.tsx` | Coalitions panel; runner wiring |
| `src/main.tsx` | Creates the runner with the real worker factory |
| `src/vite-env.d.ts` | Already references Vite client types; checked for the inline worker import |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | New keys; remove `placeholder.coalitions` |
| `src/ui/styles.css` | Coalition view, progress and pair editor styles |
| `tests/engine/run.test.ts` (new), `tests/engine/coalitions.test.ts`, `tests/engine/edit.test.ts` | Seats-only run, progress callback, pair edits |
| `tests/ui/coalitions.test.tsx`, `tests/ui/coalitionRunner.test.ts` | New |
| `tests/ui/app.test.tsx`, `tests/ui/store.test.ts`, `tests/ui/editor.test.tsx` | Placeholder and allowlist updates; pair editor |
| `.github/copilot-instructions.md`, `doc/spec/elections-simulator.md` | Brief map; Section 7 note on the worker and progress (at close) |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Start the search automatically on every change, or only on a Run button? —
   **Decision:** automatically after a 300 ms debounce, cancelling the
   stale run; Cancel and Run again remain available. A results view that needs
   a click to be current invites stale reading.
2. How is progress shown when the total is unknown? — **Decision:** nodes
   visited against the node budget, reported every 20,000 nodes, labelled as
   search budget used, not as percent complete.
3. Include chosen-coalition evaluation in this item? — **Decision:** yes;
   it is a synchronous, quadratic engine call already built in M1-07 and it is
   the main way to test a specific claim.
4. Where do coalition pairs get edited? — **Decision:** in a Coalition
   rules section of the editor, next to the other inputs; the coalitions view
   shows the effective rules read-only. All inputs stay in one place.
5. What if the worker cannot be created? — **Decision:** run the same
   search on a timer in the page with the same budget, and show a note that the
   search ran without a worker. M2-10 verifies that the worker works in the
   single-file build from a local file.

Approved on the user's standing instruction: "samostoyatelno rzreshaju approve doiti do M3-01".

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | The coalition run state lives in the runner, read by a new `src/ui/useRunner.ts` hook; the store keeps only the chosen-coalition selection | The runner already owns the run lifecycle; a second copy in the store would need syncing and would re-render the editor on every progress report |
| /3-implement | `coalition.worker.ts` types the worker global with a narrow local interface instead of the `webworker` lib | A `webworker` lib reference applies to the whole program and clashes with the DOM lib |
| /3-implement | The runner keeps one worker across searches and terminates it only when a search is in flight; `onerror` terminates it and the next search creates a new one | Avoids a new worker per finished search; a stale search is still stopped by termination |
| /3-implement | The effective-pairs list shows a plain empty note without a `data-empty` marker | Not covered by the markup contract; keeps `data-empty` values unique per section |
| /3-implement | Fixed `tests/ui/coalitions.test.tsx`: the `data-coalition` marker escapes `+` for the regex helper | Test defect: `+` acted as a quantifier, so the row lookup could never match; the assertion itself is unchanged |
| /3-implement | Added label keys beyond the markup contract: `coalition.summary.*`, `coalition.column.*`, `coalition.evaluation.*`, `coalition.minimalWinning`, `coalition.forbidden`, `pairs.first`, `pairs.second`, `pairs.effective` | Headings, column headers, select labels and summary terms need text in all three languages |