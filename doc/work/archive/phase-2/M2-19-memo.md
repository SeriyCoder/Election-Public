# Memo — M2-19 Language Consistency Of Default Names

| Field | Value |
| --- | --- |
| item | M2-19 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release, reopened for language consistency |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-29 |
| closed | 2026-10-29 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

With Hebrew selected, the interface still shows Russian text: the scenario
title "Базовый сценарий (раздел 8)" and every "Группа N", "Партия N" and
"Блок N" in the editor, the result tables, the vote-destination rows, the
coalition pair lists and the comparison. The interface strings are complete in
all three languages; the Russian comes from the **scenario data**. The startup
scenario is built with a Russian translator, and every preset, every added
entity and every duplicate stores a translated name (`entity.*`, `preset.*`,
`entity.copy`) into the scenario. Names are inputs, so a later language switch
cannot change them, and an exported JSON file carries the language of the
moment, against Section 10 ("exported JSON remains locale-independent").

## Scope

**In scope**

- **Rule.** The app never writes interface-language text into a scenario.
  Only the user types names.
- **Default names are empty.** The six presets, the startup scenario, added
  groups, parties and blocks store an empty `name`. A preset scenario stores an
  empty scenario `name`.
- **Displayed default label.** Wherever an entity name is shown, an empty or
  whitespace-only name is shown as the localized kind label with the number of
  its ID: `entity.group`, `entity.party` or `entity.block` with `n` set to the
  digits of an ID of the form prefix plus digits (`G`, `P`, `B`, the
  `ID_PREFIX` of `src/engine/edit.ts`), otherwise to the whole ID. The label
  follows the ID, so reordering never renumbers it. The number is inserted as
  text, so no thousands separator appears.
- **Displayed scenario title.** An empty scenario name is shown as the preset
  title when the scenario ID is one of the six preset IDs, otherwise as
  `app.untitled`. This applies to the toolbar title and the comparison's
  baseline label.
- **Name fields.** Group, party, block and scenario name fields keep the stored
  value; an empty field shows the displayed default as its placeholder, so
  clearing a name restores the default label at once.
- **Duplicate.** A copy of an entity with an empty name gets an empty name
  (its own default label from the new ID). A copy of a custom name gets a
  language-neutral suffix: a trailing " (k)" of digits is removed, and the
  smallest n from 2 upward for which "name (n)" is not already a name in the
  same list is appended. If the result would exceed the 200-character name
  limit, the copy gets an empty name instead. The `entity.copy` key is removed
  from the three tables.
- **One resolution point for results.** The seat results, the coalition view
  and the comparison receive a display copy of the validated scenario in which
  every empty name is already resolved for the current language; the editor
  resolves names through the same helper. No view reads a raw name for display.
- **Custom names untouched.** A name the user typed is shown exactly as typed in
  every language (Section 10: custom names are not translated).

**Out of scope**

- Migrating files exported before M2-19, whose names are stored text such as
  "Партия 1": they stay custom names, as imports are authoritative (Section
  11). Clearing the field restores the localized default. The app is not
  published, so only the developer's own files are affected. No backlog item.
- The language buttons keep their endonyms (Русский, English, עברית) in every
  language, each marked with its own `lang`: a reader must find their own
  language in a foreign interface. Intentional; no backlog item.
- The static page title and `lang` in `index.html` stay Russian, the default
  language; the app replaces them at startup. No backlog item.
- Wording review of the English and Hebrew tables by a native reader: filed as
  a separate translation-review item before publication by the contour change
  that follows this item, not by this memo.

## Approach

A new UI module `src/ui/names.ts` holds four pure helpers, all without the
banned number functions:

| Helper | Purpose |
| --- | --- |
| `entityName` | Kind, ID and stored name to the displayed name |
| `scenarioTitle` | Scenario ID and stored name to the displayed title |
| `withDisplayNames` | Validated scenario and translator to a copy with every empty scenario, group, party and block name resolved |
| `copyName` | Source name and the names of its list to the copy's name |

`src/ui/presets.ts` builds every preset without a translator, with empty names;
`presetInput` takes only the preset ID, and a new lookup returns the preset for
a scenario ID. `src/ui/store.ts` stops passing a translator to presets.
`src/ui/App.tsx` resolves the toolbar title through `scenarioTitle` and passes
`withDisplayNames` copies of the current and baseline scenarios to Results,
Coalitions and Compare. `src/ui/Editor.tsx` replaces its `label` helper (which
falls back to the raw ID) with `entityName` everywhere a name is shown, adds the
placeholders, adds entities with an empty name and duplicates with `copyName`.
The coalition runner keeps receiving the store's scenario, not the display copy.

Section 10 already separates custom names (never translated) from interface
text (always in the selected language); default names were interface text
stored as data, and this item moves them back into the interface.

**Rejected alternative:** renaming default-looking names when the language
changes — it rewrites inputs on a language switch, which Section 10 forbids
("switching languages preserves inputs"), cannot tell a typed "Партия 1" from a
generated one, and misses imported files.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario, group, party, block `name` in presets and new entities | Stored empty instead of a translated label | None: the schema already accepts an empty name |
| Exported scenario JSON | Default names exported empty, so the file is the same in every language | None |

## Interface Delta

- `presetInput(id)` loses its translator parameter; `baselineInput()` is
  language-free. A new preset lookup by scenario ID.
- New `src/ui/names.ts` with `entityName`, `scenarioTitle`, `withDisplayNames`
  and `copyName`.
- Name fields show a placeholder with the displayed default.
- Duplicated custom names end in " (n)" instead of a translated "(copy)";
  `entity.copy` removed from `ru`, `en` and `he`.
- Results, coalitions, comparison, editor and toolbar show default names in the
  interface language and follow a language switch.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None. The engine never reads a name; only stored names and their display change |
| Where exact rationals are required | Unchanged |
| Ordering / tie rules relied on | Unchanged: tie order is `tieBreakOrder`, then party ID, never a name |
| Any display rounding near a decision? | No |
| How determinism across runs, round trip and locale is proven | The Section 8 fixtures and the determinism suite stay unchanged and green; preset seats are asserted once per preset instead of once per language, because the preset input is now identical in every language; a test asserts that a preset input and its export are byte-identical whatever the interface language |

Not affected: names are labels only, and no engine module reads them.

## Files

| Path | Change |
| --- | --- |
| `src/ui/names.ts` | New: display-name, scenario-title, display-copy and copy-name helpers |
| `src/ui/presets.ts` | Presets without a translator and with empty names; preset lookup by scenario ID |
| `src/ui/store.ts` | Startup and `loadPreset` use the language-free presets |
| `src/ui/App.tsx` | Toolbar title through `scenarioTitle`; display copies for Results, Coalitions and Compare |
| `src/ui/Editor.tsx` | `entityName` for every shown name; placeholders; add with an empty name; duplicate with `copyName` |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Remove `entity.copy` |
| `tests/ui/names.test.ts` | New: helper tests |
| `tests/ui/store.test.ts`, `tests/ui/app.test.tsx`, `tests/ui/editor.test.tsx` | New consistency tests; existing calls and name expectations updated |
| `tests/ui/coalitionRunner.test.ts`, `tests/ui/fileTransfer.test.ts`, `tests/ui/transfer.test.tsx`, `tests/ui/results.test.tsx`, `tests/ui/compare.test.tsx`, `tests/ui/coalitions.test.tsx` | Existing `presetInput` calls updated where present |
| `tests/e2e/offline.spec.ts` | New: every visible default name follows the language in ru, en and he |
| `doc/spec/elections-simulator.md` | Section 10 "As built in M2-19" note (at close) |
| `.github/copilot-instructions.md` | Module map: `src/ui/names.ts` (at close) |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. How is a duplicate of a custom name marked? — **Recommendation:** a
   language-neutral " (n)" with the smallest free n from 2; a translated
   "(copy)" would put interface text into the data again.
2. Should imported names that equal a default label in some language
   ("Партия 1" on P1) be cleared on import? — **Recommendation:** no. Imports
   are authoritative and a user may have typed that name; clearing the field
   is one action.
3. Does an edited preset keep the preset title? — **Recommendation:** yes, while
   its name is empty and its ID is the preset ID, as it kept the stored title
   before; typing a name replaces it.
4. Default shown as the field value or as a placeholder? —
   **Recommendation:** placeholder. A value would reappear as soon as the user
   clears the field, so a name could never be erased and retyped.
5. Resolve names once for the result views or in each view? —
   **Recommendation:** once, through a display copy of the scenario in
   `App.tsx`; every result view then agrees, and no view can forget a fallback.

Approved 2026-10-29 on the user's instruction for an autonomous run: "Kogda ispravish yaziki ... sdelai eto kak M2- poslednaja phasa pered perehodom na M3" (2026-10-29), in autopilot mode; the recommendations above are the decisions.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | `presetInput` keeps an optional translator parameter (default Russian) as a red stub | The tests call `presetInput(id)` and must type-check before the change; `/3-implement` removes the parameter and the i18n import |
| /2-tests | Custom names are shown exactly as stored, without trimming | The old editor label trimmed; trimming at display time would show a name different from the field value. Only whitespace-only names count as empty |
| /2-tests | `presetIdOf(scenarioId)` exported from `presets.ts` as an extra test target | `scenarioTitle` needs the preset ID from the scenario ID; a separate tested map keeps the six IDs in one place |
| /3-implement | `CohortList` gains a `t` prop and `PairSelect` a `kind` prop; `nameIn` takes `t` | Both rendered names without the translator or the entity kind; the default label needs both |
| /3-implement | Four older assertions in `editor.test.tsx` and `results.test.tsx` now expect the display name (`entityName`, `withDisplayNames`) instead of the stored name | They read the expected name from the stored scenario, now empty; the screen shows the default label, so the old expectation was stale. Several similar assertions had passed on an empty string; they are meaningful again |
| /3-implement | `nextIdIndex` is no longer imported by the editor | Added entities get an empty name; the default label comes from the ID at display time |
| /4-close | `tests/e2e/interaction.spec.ts` changed but was not in the Files table | `/2-tests` added the e2e test for add and duplicate in Hebrew (empty value, placeholder, ` (n)` copies, language-free export) there, beside the other editor interactions |
| /4-close | `tests/ui/transfer.test.tsx`, `tests/ui/compare.test.tsx` and `tests/ui/coalitions.test.tsx` are listed but unchanged | They build scenarios from the engine test fixtures, which carry English names, and make no `presetInput` calls; the table said "where present" |
| /4-close | Section 5 of the specification gained one sentence besides the Section 10 note | Section 5 says how new entities start; it now points to the empty name and the localized default label |
