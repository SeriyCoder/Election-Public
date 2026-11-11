# Memo — M2-15 Clear Saved Data

| Field | Value |
| --- | --- |
| item | M2-15 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release, reopened for review fixes |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-29 |
| closed | 2026-10-29 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

Section 11 says local storage "may be an opt-in convenience, never the only
persistence mechanism; provide a clear-data action". The app stores one thing,
the explicitly chosen interface language (Section 10), but offers no way to
remove it. A user on a shared or borrowed device cannot make the browser forget
the simulator.

## Scope

**In scope**

- One toolbar action, "Clear saved data", that removes every key the app keeps
  in the browser's local storage and nothing else.
- A short status line after the action: cleared, or could not be cleared.
- The storage adapter moves out of `src/main.tsx` into a small testable module
  that owns the key names and the app's key prefix.

**Out of scope**

- Keeping scenarios or baselines in local storage: the spec allows it as an
  optional convenience, but no item asks for it; nothing to clear today. No
  backlog item needed.
- A confirmation dialog: the action removes only a language preference, which
  the next language click restores.

## Approach

**What is stored.** Only `elections-simulator.language`, written when the user
clicks a language. Every app key starts with the prefix `elections-simulator.`;
a source test pins that `localStorage` is touched only by the new module.

**Clear only the app's keys.** The action removes each key that starts with the
prefix and leaves every other key alone. It must not call the browser's
whole-origin clear: pages opened from `file://` may share one origin, and every
GitHub Pages project site of one account shares `<user>.github.io`, so a
whole-origin clear would delete other sites' data.

**Adapter.** `src/ui/storage.ts` exports the prefix, the language key and
`browserStorage(area)`, where `area` is a function returning the browser's
storage (reading `window.localStorage` itself can throw when storage is
blocked). The adapter implements the existing `LanguageStorage` contract plus
`clear()`, which returns true when no app key remains and false when storage
could not be reached or a removal failed. Keys are collected before any is
removed, so removal does not disturb the iteration.

**Store.** `clearSavedData()` calls `clear()` and records a UI-only
`storageNotice`: `cleared` or `failed`. A throwing `clear()` counts as failed.
No storage configured counts as cleared, because nothing could have been
written. The current language, scenario, baseline, view and selection stay as
they are: clearing affects the next visit, not this one. The notice disappears
on the next state change of any kind, so it never lingers as stale text; a
later language click writes the choice again, as before.

**Toolbar.** A text button `data-action="clear-data"` after the language
switcher; the notice is a `role="status"` line after it, so a screen reader
hears the outcome. The cleared text says the next visit opens in the default
language. Button at least 44 px, standard focus outline.

**Rejected alternative:** a "remember my language" opt-in switch. Section 10
already asks to persist an explicit choice; the click on a language is that
opt-in, and a second control would add a step without protecting anything.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario | None | None |
| Local storage | Documented prefix `elections-simulator.`; one key, `elections-simulator.language` (unchanged) | None |
| `AppState.storageNotice` | New UI-only field: `cleared`, `failed` or none | None; never exported |

## Interface Delta

- `src/ui/storage.ts`: `STORAGE_PREFIX`, `LANGUAGE_KEY`, `browserStorage(area)`.
- `LanguageStorage.clear(): boolean` in `src/ui/store.ts`.
- `Store.clearSavedData(): void`; `AppState.storageNotice`.
- Toolbar: `[data-action="clear-data"]` button; `[data-storage-notice]` status
  line.
- i18n: `storage.clear`, `storage.cleared`, `storage.failed` in ru, en, he.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None |
| Where exact rationals are required | Unchanged |
| Ordering / tie rules relied on | None |
| Any display rounding near a decision? | No |
| How determinism across runs, round trip and locale is proven | A store test shows the input and seats are identical before and after clearing |

## Files

| Path | Change |
| --- | --- |
| `src/ui/storage.ts` | New: prefix, key, browser adapter with `clear()` |
| `src/main.tsx` | Use the adapter instead of the inline one |
| `src/ui/store.ts` | `clear()` in the contract; `clearSavedData`; `storageNotice` |
| `src/ui/App.tsx` | Button and status line in the toolbar |
| `src/ui/styles.css` | Notice line layout |
| `src/i18n/en.ts`, `ru.ts`, `he.ts` | Three keys |
| `tests/ui/storage.test.ts` | New: adapter over a fake storage |
| `tests/ui/store.test.ts` | Clear outcomes; state kept; notice reset; only the adapter touches local storage |
| `tests/ui/app.test.tsx` | Button and notice in every locale |
| `tests/e2e/offline.spec.ts` | Clear, reload, default language; other keys kept |
| `doc/spec/elections-simulator.md` | "As built in M2-15" note in Section 11 (at close) |
| `.github/copilot-instructions.md` | Add `storage.ts` to the UI module list |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Clear the whole origin or only the app's keys? — **Decision:** only keys
   with the app prefix (see Approach).
2. Reset the current language on clear? — **Decision:** no; the visit keeps
   its language, the next visit starts in the default.
3. Confirm before clearing? — **Decision:** no; the loss is one preference
   restored by one click.

Approved 2026-10-29 on the user's instruction: "vse eto nado s integriroval i realizovat".

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
