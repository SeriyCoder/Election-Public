# Memo — M2-13 Optional Descriptive Notes on Groups, Parties and Blocks

| Field | Value |
| --- | --- |
| item | M2-13 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release, reopened for review fixes |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-29 |
| closed | 2026-10-29 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

Section 5 says the user can "rename groups, parties and blocks; edit colors and
optional descriptive notes". Today only the scenario has notes. Groups, parties
and blocks have no notes field in the schema, the draft or the editor, so a
user cannot record why a cohort or a list was set up a certain way.

## Scope

**In scope**

- An optional `notes` text on every group, party and block:
  - schema: read, length-checked (10000 characters, as scenario notes), kept
    in the validated scenario, written on export;
  - draft edit: one pure setter by entity kind and ID;
  - new entities start with empty notes; a duplicate copies the notes;
  - editor: a collapsed "Notes" disclosure in each entity row holding a
    plain-text area.
- Notes stay inert text everywhere: rendered only as a text-area value, never
  as markup.

**Out of scope**

- Showing entity notes in the results, coalition or compare views: the spec
  asks only that notes can be edited and kept; no backlog item needed.
- CSV and HTML snapshot export (where notes would also travel): M4-04, M4-05.

## Approach

**Schema.** Group, party and block gain `notes: string`. On import the field is
optional: absent means empty, so every version-1 file written before this item
still imports unchanged. A present value must be a string of at most 10000
characters, reported with the same `wrong-type` and `too-long` codes and paths
such as `parties[2].notes`. The validated scenario always carries the field, so
export writes `"notes": ""` for an entity without notes.

**Schema version stays 1.** The change is additive and optional. Files written
before M2-13 load in this build. A file written by this build and opened in an
older build loses entity notes silently, because unknown fields are dropped;
that is the existing rule for unknown fields, and there is no older public
build to protect. Bumping the version would make every earlier export
unreadable for no arithmetic change.

**Edits.** `setEntityNotes(draft, kind, id, text)` in `src/engine/edit.ts`,
built on the existing per-entity update, like `renameEntity`. `newEntity`
writes `notes: ''`. `duplicateEntity` already clones every field, so notes are
copied; a test pins that.

**Editor.** Each entity row gets a `details` disclosure after the actions:
- the summary reads "Notes" when empty and "Notes (written)" when not, so the
  state is shown in text, not only by an icon or colour;
- inside, a text area with `dir="auto"`, `maxLength` 10000 and an
  `aria-label` "Notes: {name}";
- collapsed by default, so 20 groups and 30 parties do not each show an open
  text area. The summary is at least 44 px high and has the standard focus
  outline.

**Presets.** The preset builders go through validation, so they gain the empty
field without listing it; names stay as they are.

**Rejected alternative:** an always-visible text area per row. With the
first-release sizes (20 groups, 30 parties, 10 blocks) it adds 60 large
controls to the editor for an optional field.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| `groups[].notes`, `parties[].notes`, `blocks[].notes` | New optional string, at most 10000 characters; absent means `""` | None: additive and optional; version stays 1 |

## Interface Delta

- `Group.notes`, `Party.notes`, `Block.notes: string` in `src/engine/schema.ts`.
- `setEntityNotes(draft, kind, id, text)` in `src/engine/edit.ts`.
- Editor: `data-notes` disclosure per entity row, `data-field="notes"` text area
  inside it.
- i18n: `entity.notes.filled`, `entity.notes.label` in ru, en, he
  (`editor.notes` is reused for the empty summary).

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None. Notes are text fields the engine never reads |
| Where exact rationals are required | Unchanged |
| Ordering / tie rules relied on | None |
| Any display rounding near a decision? | No |
| How determinism across runs, round trip and locale is proven | A test shows identical seats with and without notes; JSON round trip keeps notes |

## Files

| Path | Change |
| --- | --- |
| `src/engine/schema.ts` | `notes` on group, party, block; optional read with length check |
| `src/engine/edit.ts` | `setEntityNotes`; `notes: ''` in new entities |
| `src/ui/Editor.tsx` | Notes disclosure in `EntityRow` |
| `src/ui/styles.css` | Disclosure layout, touch size, focus |
| `src/i18n/en.ts`, `ru.ts`, `he.ts` | Two keys |
| `tests/engine/schema.test.ts` | Optional field, length, type, round trip, inert text |
| `tests/engine/edit.test.ts` | Setter, new entity, duplicate |
| `tests/ui/editor.test.tsx` | Disclosure, summary state, escaping |
| `tests/e2e/interaction.spec.ts` | Type a party note, export-import keeps it |
| `doc/spec/elections-simulator.md` | Section 11 table and field rules; "As built in M2-13" note (at close) |
| `.github/copilot-instructions.md` | Only if a module description changes |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Required or optional on import? — **Decision:** optional; absent means
   empty, so earlier exports stay valid.
2. Bump `schemaVersion`? — **Decision:** no (see Approach).
3. Always visible or collapsed? — **Decision:** collapsed disclosure with the
   filled state in the summary text.

Approved 2026-10-29 on the user's instruction: "vse eto nado s integriroval i realizovat".

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
