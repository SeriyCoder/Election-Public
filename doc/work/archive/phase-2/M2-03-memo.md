# Memo — M2-03 Entity Editor: Groups, Parties, Blocks, Stable IDs, Repair On Delete

| Field | Value |
| --- | --- |
| item | M2-03 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release |
| status | closed |
| created | 2026-10-28 |
| closed | 2026-10-28 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

The editor region is a placeholder. Section 5 requires renaming groups, parties
and blocks, editing colors, and adding, duplicating, deleting and reordering
them with stable internal IDs. Editing a label must not break preferences,
comparisons or coalition references. Deleting a referenced entity requires
confirmation and an explicit reassignment or validation repair. New entities
start with explicit zero or empty values. Section 12 [M2] also requires at
least one open/split group preset and one multi-party block preset, and the
validation issues the editor produces must be shown in the interface language.

## Scope

**In scope**

- A pure edit module over the scenario draft: add, duplicate, rename, recolor,
  reorder, set a party's block and government eligibility, list references,
  delete with a chosen repair. IDs are generated, never edited.
- Exact decimal output for the party reassignment repair (weights of the
  deleted party are added to the target's weights).
- Store state for a pending delete confirmation and actions to request, cancel
  and confirm it.
- Editor UI in the inputs view: scenario name and notes; group, party and block
  lists with name fields, colors, party block and eligibility, move up/down,
  duplicate, delete; an add button per list, disabled at the schema limits.
- Inline delete confirmation listing the references and offering the repairs.
- A validation issue list with messages translated per issue code, plus the
  path.
- Presets: baseline, an open/split group preset and a multi-party block preset,
  with entity names from the current language; a toolbar preset picker.
- All new strings in ru, en and he.

**Out of scope**

- Numeric group fields (population share, turnout, valid-ballot rate,
  participation), vote destinations, voting mode and rebalance — M2-04.
- Rules (seat count, majority, threshold) — M2-04, next to the numeric fields.
- Editing coalition pair lists — M2-06, with the coalition view.
- Per-entity descriptive notes: the schema has scenario notes only; adding
  entity notes is a schema change and is left for a later item.
- Undo history.

## Approach

**Draft guard.** The store keeps raw input that may be invalid. The editor works
only on a structural draft: an object with `groups`, `parties`, `blocks` arrays
of objects carrying string IDs, and a coalition rules object. A guard checks
this shape; when it fails, the editor shows a message instead of controls.
Values inside the draft may be invalid; validation reports them.

**Edit module.** All operations are pure functions in a new engine module that
return a new draft and never mutate the old one. It lives in the engine because
the reassignment repair adds exact decimals; the UI may import it alongside
`run` and `schema` (the static scan allowlist grows by this one module).

| Operation | Behaviour |
| --- | --- |
| Add | ID is the kind prefix (`G`, `P`, `B`) with the next number above the largest existing one; the caller supplies the localized name. Group: population share 0, turnout, valid rate and participation 1, open mode, no destinations. Party: first unused palette color, no block, tie-break order after the largest, eligible. Block: first unused palette color |
| Duplicate | Inserted directly after the source with a new ID and the caller's name. A duplicated group keeps rates and destinations but gets population share 0. A duplicated party gets no votes anywhere and the next tie-break order. A duplicated block gets no member parties |
| Rename, recolor, set block, set eligibility, scenario name and notes | Change one field; IDs and every reference stay as they were |
| Move | Swap with the neighbour; no-op at either end; tie-break order is not touched |
| References | Party: groups listing it as allowed or weighting it, and pairs naming it. Block: member parties and block pairs. Group: none |
| Delete party | Repair `reassign` to another party: in each group the target replaces the deleted ID in the allowed list (once) and receives the sum of both weights. Repair `remove`: the ID and its weights are dropped, so totals may become invalid and validation shows where |
| Delete block | Repair `reassign` moves member parties to another block; repair `unassign` leaves them without a block |
| Delete group | No references; its population share leaves the total and validation reports the gap |
| Pairs | In every delete, pairs naming the deleted ID are removed; the confirmation states how many |

Weight sums use the exact rational module and a new terminating-decimal
formatter. A sum of two finite decimals always terminates, so the result is
exact; the formatter refuses non-terminating values.

**Store.** State gains the pending delete (kind and ID, or none). Requesting a
delete of an unreferenced entity deletes it at once; a referenced one sets the
pending state. Confirming applies the chosen repair and clears it; cancelling
clears it. Editing through any other action keeps the pending state only while
the entity still exists. Field edits go through `updateInput` with the edit
module, so derived results recompute from the new input reference.

**UI.** Text inputs for names (maximum 200 characters, schema limit), color
inputs, a block select, an eligibility checkbox, and icon-free text buttons with
accessible labels naming the entity. User text is rendered as text inside
bidirectional isolation. Rows carry `data-entity` and `data-id`; buttons carry
`data-action`. The confirmation is an inline region with `role="alertdialog"`,
a repair choice and Confirm/Cancel.

**Issue messages.** One key per issue code in every locale; the list shows the
translated message and the technical path.

**Presets.** A preset builder takes a preset ID and a translator and returns a
fresh draft. Baseline output in Russian stays identical to the current
baseline. `split`: baseline with group 3 open, sending 60/30/10% to parties 3,
1 and 2. `multiBlock`: five parties, block 1 holds parties 1 and 5, group 1 is
restricted to both with 70/30%. Loading a preset replaces the scenario.

**Rejected alternative:** keeping the delete confirmation in component state.
There is no DOM test environment; state in the store makes the whole flow
testable through render-to-string, and Playwright (M2-10) covers the clicks.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| UI state | Adds the pending delete | None |
| Scenario | None; edits produce schema-version-1 drafts | None |

## Interface Delta

- Editor region: scenario, groups, parties, blocks, issues.
- Toolbar: preset picker.
- New engine module for draft edits; rational gains a terminating-decimal
  formatter.
- Store: `pendingDelete`, `requestDelete`, `cancelDelete`, `confirmDelete`,
  `loadPreset`.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None; only input editing. Reassignment adds two vote weights exactly |
| Where exact rationals are required | Weight sum on party reassignment, formatted as an exact decimal |
| Ordering / tie rules relied on | Tie-break order is never changed by move; new and duplicated parties take the next order |
| Any display rounding near a decision? | None |
| How determinism across runs, round trip and locale is proven | Rename and recolor leave the serialized result byte-identical; the Russian baseline preset equals the existing baseline; reassignment yields exactly the summed weight and unchanged seats when the target is equivalent |

## Files

| Path | Change |
| --- | --- |
| `src/engine/edit.ts` | New: draft guard, ID generation, all edit operations, references, delete repairs |
| `src/engine/rational.ts` | Terminating-decimal formatter |
| `src/ui/store.ts` | Pending delete state and actions, preset loading |
| `src/ui/presets.ts` | Preset IDs and translated builder; baseline kept |
| `src/ui/Editor.tsx` | New: editor sections, rows, confirmation, issue list |
| `src/ui/App.tsx` | Editor in the editor region, preset picker |
| `src/ui/styles.css` | Editor rows and confirmation layout |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Editor, preset, repair and issue-code strings |
| `tests/engine/edit.test.ts` | New: operations, IDs, references, repairs, immutability |
| `tests/engine/rational.test.ts` | Decimal formatter |
| `tests/ui/store.test.ts` | Pending delete flow, presets, determinism under rename; allowlist adds the edit module |
| `tests/ui/editor.test.tsx` | New: rendering of rows, attributes, confirmation, issues, inert user text |

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

1. Can a deleted ID be reused by a later add? — **Decision:** yes, when it was
   the largest; numbering continues above the largest existing ID. Baseline
   comparison (M2-07) must therefore show names next to IDs.
2. Does loading a preset ask for confirmation? — **Decision:** no; it replaces
   the scenario. Baseline save arrives in M2-07 and import/export in M2-08.
3. A new group has no destinations and makes the scenario invalid until
   destinations are set. Acceptable? — **Decision:** yes; Section 5 forbids
   invented votes, and the issue list shows the repair. M2-04 adds the
   destination editor.
4. Rules and coalition pairs are not in any M2 backlog title. — **Decision:**
   rules go to M2-04, pair editing to M2-06; both items' memos must include
   them.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | Stub `nextIdNumber` renamed `nextIdIndex` | The engine float-token scan in `fixtures.test.ts` matches the substring `Number(` |
| /3-implement | Move test renamed `does not change any party seat count` and compares seats by party ID | Moving a party reorders serialized results, so byte equality was the wrong check |
| /3-implement | Two editor assertions accept a bare `value` attribute on the "no block" option | preact-render-to-string writes `value="` as `value`; the HTML meaning is identical |
| /4-close | `tests/ui/app.test.tsx` changed, not in Files | The shell test listed `placeholder.inputs` as a required key; the editor replaced that placeholder |
| /4-close | `.github/copilot-instructions.md` and the spec (Section 6 ID numbering) synced | Documentation sync required by the close step |
