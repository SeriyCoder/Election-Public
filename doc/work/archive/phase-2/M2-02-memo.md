# Memo — M2-02 Interface Languages ru/en/he With RTL And A Missing-Key Check

| Field | Value |
| --- | --- |
| item | M2-02 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release |
| status | closed |
| created | 2026-10-28 |
| closed | 2026-10-28 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

M2-01 renders Russian only, through a single global lookup. Section 10 requires
Russian, English and Hebrew in the first release, switchable without resetting
the scenario, Russian first, an explicit choice persisted, Hebrew laid out
right to left, no partial translations, and a check that fails the build when a
key is missing in any locale. Displayed numbers must be localized while the
engine result stays locale-independent.

## Scope

**In scope**

- English and Hebrew string tables with exactly the Russian key set.
- A language type with the three locales, their text direction and their
  native display names.
- A per-language lookup used by the shell; the current language lives in the
  store next to the view.
- A language switcher in the toolbar (segmented control, each option labelled in
  its own language).
- The shell root carries `lang` and `dir`; the document element follows the
  current language in the browser.
- Persisting an explicit language choice through an injected storage port; the
  browser entry wires it to local storage and tolerates storage failure.
- Integer formatting per locale for displayed counts, isolated in one module.
- Missing-key check: a type-level constraint on every table plus a test that
  compares key sets, non-empty values and placeholder names across locales.

**Out of scope**

- Translating validation issue messages (they appear with the editors in
  M2-03/M2-04, using the same tables).
- Decimal and percentage formatting (M2-05, with the result tables).
- `uiLanguage` inside HTML snapshots (M2-09).
- Browser layout checks in RTL (M2-10).

## Approach

Each locale is a plain table. Russian stays the reference: the English and
Hebrew tables are declared as complete records over the Russian key type, so a
missing or extra key is a type error and `npm run typecheck` fails. A test also
compares the three key sets, rejects empty strings and requires the same
placeholder names in every translation of a key, which the type system cannot
see.

The lookup becomes a translator created for a language. The shell creates it
from the store's current language on every render, so switching language
re-renders text without touching the scenario input, the derived validation or
the engine result.

The store gains the current language and an action to set it. Explicit choices
are written to an optional storage port; on creation the store reads the port
and accepts only a known locale, falling back to Russian. The port keeps the
store free of browser APIs and testable in Node. Only the language is stored;
the scenario is still not persisted (M2-01 decision).

Integer formatting uses the platform number formatter in a single i18n module
that accepts integers only. The M2-01 static scan is narrowed accordingly: the
locale formatter is allowed in that one file and nowhere else in `src/ui` or
`src/i18n`; float parsing and rounding stay forbidden everywhere.

Direction comes from the language (Hebrew right to left). Layout already uses
logical properties, so no direction-specific CSS is expected; user-entered names
stay isolated with bidirectional isolation.

**Rejected alternative:** an i18n library with message catalogues and ICU
plurals. Three bundled tables and named placeholders cover the current text;
a library adds weight to the single-file build and a second source of truth for
missing keys.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| UI state | Adds the current language | None |
| Application settings | Explicit language choice stored locally (Section 11 `uiLanguage`) | None; not part of the scenario |

## Interface Delta

- Toolbar: language switcher with Русский, English, עברית.
- The shell root and the document element carry `lang` and `dir`.
- New modules: English and Hebrew tables, the integer formatter.
- The i18n lookup becomes per-language; the store gains language state, an
  action and an optional storage port.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None |
| Where exact rationals are required | Unchanged; formatting accepts integers only |
| Ordering / tie rules relied on | None |
| Any display rounding near a decision? | None; only integer counts are formatted |
| How determinism across runs, round trip and locale is proven | The store's serialized result is byte-identical before and after switching to each of ru, en and he; the static scan confines the locale formatter to one file |

## Files

| Path | Change |
| --- | --- |
| `src/i18n/ru.ts` | Language switcher label key; reference key type |
| `src/i18n/en.ts`, `src/i18n/he.ts` | New complete tables |
| `src/i18n/index.ts` | Locales, direction, display names, per-language translator |
| `src/i18n/format.ts` | Integer formatting per locale |
| `src/ui/store.ts` | Language state, `setLanguage`, optional storage port |
| `src/ui/App.tsx` | Translator from state, `lang`/`dir` on root, switcher, document sync, formatted counts |
| `src/ui/styles.css` | Switcher styling with 44 px targets |
| `src/main.tsx` | Local-storage port with failure tolerance |
| `tests/ui/i18n.test.ts` | Missing-key, placeholder, direction, formatting and translator tests |
| `tests/ui/store.test.ts` | Language state, persistence port, determinism across languages, narrowed static scan |
| `tests/ui/app.test.tsx` | Rendering per language, `lang`/`dir`, switcher state |

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

1. How does the browser learn the initial language when nothing is stored? —
   **Decision:** always Russian (Section 10, "Initial language:
   Russian"); do not read the browser's preferred languages.
2. Is the language persisted only on an explicit switch? — **Decision:**
   yes; loading the default never writes storage, so a visitor who never
   switches leaves nothing behind.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | The global Russian `t()` from M2-01 was removed; the message key type moved from `ru.ts` to `src/i18n/index.ts` | Every caller now uses a translator for the current language; a global Russian lookup would invite untranslated text |
