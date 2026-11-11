# Test Plan — M2-13 Optional Descriptive Notes on Groups, Parties and Blocks

| Field | Value |
| --- | --- |
| item | M2-13 |
| memo | `doc/work/archive/phase-2/M2-13-memo.md` |
| created | 2026-10-29 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/schema.test.ts` | Vitest (node) | Absent entity notes become `""`; notes kept as given (any script, line breaks); non-string notes give `wrong-type` at `groups[0]`, `parties[0]`, `blocks[0].notes`; over 10000 characters gives `too-long`, exactly 10000 is accepted; `notes` printed right after `name`; JSON round trip keeps hostile notes and the seats equal those without notes |
| `tests/engine/edit.test.ts` | Vitest (node) | New group, party and block start with `notes: ""` after `name`; a duplicate copies the notes; `setEntityNotes` changes only that entity's notes and neither seats nor coalition rules; unknown entity refused; the input draft is never mutated |
| `tests/ui/editor.test.tsx` | Vitest (server render) | Every group, party and block row has a collapsed `details[data-notes]`; its summary says "Notes" when empty and "Notes (written)" when filled; the text area has `maxlength` 10000, `dir="auto"` and `aria-label` "Notes: {name}"; markup in notes stays escaped; a non-string note in an invalid draft renders as empty |
| `tests/e2e/interaction.spec.ts` | Playwright (desktop, phone) | A note typed into party 2 flips the summary text and is exported; an imported hostile party note shows as the text-area value and stays inert |
| `tests/e2e/a11y.spec.ts` (existing) | Playwright | The summaries are at least 44 × 44 px on the phone and show a visible focus indicator |

## Happy Path

- A user writes a party note and exports it — `a party note typed in the editor is exported with the scenario`.
- Earlier exports without entity notes still import — `treats absent group, party and block notes as empty`.
- The row shows in text whether it has notes — `says in the summary text which rows have notes, kept as inert text`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Arithmetic not touched; existing engine suite |
| Determinism: repeated runs, JSON round trip, ru/en/he | `survives export and import and never changes the seats`; `sets the notes of a %s and nothing else` compares serialized seats |
| Threshold below / at / above | Not touched |
| Exact remainder tie → tieBreakOrder → party ID | Not touched |
| Fixtures from exact inputs | Not applicable |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `treats absent group, party and block notes as empty` |
| Single element | Not applicable |
| All values equal | Not applicable |
| Maximum size | `rejects notes over the limit and accepts notes at it` |
| No feasible solution | Not applicable |
| Rounding edge cases | Not applicable |
| Wrong type in an invalid draft | `rejects non-string %s`; `shows a non-string note as empty instead of failing` |
| Hostile markup | `survives export and import ...`; `says in the summary text ...`; e2e `hostile names and notes stay inert text` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Separate e2e import of a typed note | The export test covers typing and export; the hostile e2e test covers import of a party note into the editor; the unit round trip covers both halves together |
| Notes in result views | Out of scope by the memo |

## Changed Existing Tests

| Test | Change | Reason |
| --- | --- | --- |
| `validInput()` in `schema.test.ts` | Groups, blocks and the `party()` helper carry `notes: ''` after `name` | The validated scenario always carries the field; complete-scenario equality tests compare against it |
| `appends a group ...`, `appends an unassigned eligible party ...`, `appends a block ...` | Expect `notes: ''` right after `name` | New entities start with empty notes |
| `never mutates the input draft` | Also calls `setEntityNotes` | New pure edit function |
| `hostileInput()` in `tests/e2e/scenarios.ts` | Party 1 also carries the hostile notes | Lets the existing hostile test cover entity notes |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-29 | `npx vitest run` | 26 failed / 1042 passed | Missing entity `notes` in schema, `setEntityNotes`, `notes` in new entities, editor disclosure (`missing summary`) |
| 2026-10-29 | `npx playwright test tests/e2e/interaction.spec.ts` | 3 failed / 13 passed / 2 skipped | No notes disclosure: the export test (desktop) and the hostile test (desktop, phone) time out on `[data-notes] > summary` |
| 2026-10-29 | `npm test`; typecheck; lint; prettier --check | 1068 passed; clean | After optional entity notes in the schema, `setEntityNotes`, `notes` in new entities, the `EntityNotes` disclosure, styles and two i18n keys |
| 2026-10-29 | `npm run test:e2e` | 86 passed / 14 skipped | New export test and extended hostile test pass; a11y touch-target and visible-focus checks pass on the summaries. Screenshots (en, he; desktop, phone) checked by eye: the native disclosure marker flips in RTL |
| 2026-10-29 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 1068 passed; e2e 86 passed / 14 skipped |
