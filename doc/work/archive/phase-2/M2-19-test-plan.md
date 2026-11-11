# Test Plan — M2-19 One Interface Language At A Time

| Field | Value |
| --- | --- |
| item | M2-19 |
| memo | `doc/work/archive/phase-2/M2-19-memo.md` |
| created | 2026-10-29 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/names.test.ts` (new) | Vitest (node) | `entityName`: custom names returned exactly as typed (untrimmed, any script, hostile text); the default label per kind and locale from the ID digits; whitespace, NBSP, non-string and missing names count as empty; the whole ID when it is not prefix plus digits (`likud`, `G2` as a party, `P01`, `P0`, `P1a`, `P`, `g3`, `B-2`); the number inserted as text with no thousands separator (`P12345`). `scenarioTitle`: a custom name kept; each of the six preset IDs titled in every locale; other IDs (`custom`, `Baseline`, `baseline `, `baseline-2`, `turnoutZero`, empty) untitled; whitespace and non-string names; non-object inputs. `withDisplayNames`: every empty name resolved per locale; custom names kept; no mutation; nothing but names changes; the same serialized seat result for every preset. `copyName`: empty sources give an empty copy; ` (2)`, the next free number, a copy of a copy numbered from its base, the smallest free number, only a trailing bracketed number stripped, Hebrew and Cyrillic kept, exact comparison with non-string entries ignored, the 200-character limit (196 fits, 197 empties, stripping before the check). No `entity.copy` key in any table |
| `tests/ui/store.test.ts` | Vitest (node) | Every preset stores empty names, only ASCII JSON, is valid with 120 seats and loads to the same input in every language; `presets.ts` does not import the translation tables; the startup input is the language-free baseline whatever language is stored; `presetIdOf` finds each preset and returns null for near misses and non-strings; loading a preset in Hebrew stores no interface text |
| `tests/ui/app.test.tsx` | Vitest (server render) | `one interface language at a time`: no other script in any view per locale (language buttons excluded); the startup title in the toolbar and the compare baseline title in the current language; unnamed entities labelled in every view (all kinds in the inputs view, parties in the results region of seats, coalitions and compare, blocks in seats); no raw ID as text or in an accessible attribute; every preset title follows a language switch; a switch keeps the same input object; an unnamed non-preset scenario is untitled. Custom names stay untranslated in every locale |
| `tests/ui/editor.test.tsx` | Vitest (server render) | `default names`: an empty name renders no value and the default label as placeholder for every kind, ID and locale; a custom name stays the value with the default label as placeholder; the scenario name placeholder is the preset title, or untitled for a non-preset ID; row action labels, group destinations, the block choice, the turnout shortcut, the coalition-rules section and the delete dialog (title and repair targets) use default labels in every locale |
| `tests/ui/results.test.tsx` (fixture fix in /3-implement) | Vitest (server render) | The expected party and block names come from the report of the display copy (`withDisplayNames`), the names the screen shows; before, they came from the stored names, which are now empty and made several assertions pass on an empty string |
| `tests/ui/fileTransfer.test.ts` | Vitest (node) | A loaded preset exports byte-identical text under every language with no Cyrillic or Hebrew; the startup scenario exports the language-free baseline in every language |
| `tests/e2e/offline.spec.ts` | Playwright (desktop, phone) | In ru, en and he, every view (inputs, seats, coalitions after the search, compare with a saved baseline and both runs done): no text node, input or textarea value, `aria-label`, `placeholder` or `title` of the app, and no document title, in another script; only the language buttons keep their endonyms |
| `tests/e2e/interaction.spec.ts` | Playwright (desktop, phone) | In Hebrew: an added party has an empty value and the Hebrew placeholder, which becomes Russian after a switch; renaming P1 to `Likud` and duplicating it twice gives `Likud (2)` and `Likud (3)`; duplicating an unnamed party gives an empty name with its own placeholder; the exported JSON (desktop) has no Cyrillic or Hebrew and exactly these names |

## Happy Path

- A Hebrew user opens the app and sees only Hebrew, including the scenario
  title and the party, group and block labels —
  `he shows no text of another language in any view`;
  `he titles the startup scenario in its own language`;
  `he labels unnamed entities in its own language in every view`; the e2e
  `shows one interface language at a time in every view`.
- The same user switches to Russian or English and every default label
  follows, while the scenario itself stays the same object —
  `switches every default label without touching the input`;
  `titles the %s preset in the current language after a switch`.
- A user names a party and duplicates it; the copy is numbered without any
  interface word, and the export carries no interface text —
  `appends (2) to a fresh custom name`; the e2e
  `added and duplicated parties keep names out of the scenario`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

The engine is not touched. Display names must not reach the arithmetic:

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Allocation not touched; existing suite |
| Determinism: repeated runs, JSON round trip, ru/en/he | `loads %s to the same input in every language`; `exports the loaded %s preset identically under every language`; `%s gives the same seats with display names` |
| Threshold below / at / above | Not touched |
| Exact remainder tie → tieBreakOrder → party ID | Not touched |
| Fixtures from exact inputs | Section 8 preset tests now run on the language-free presets and still give 46 / 50 / 18 / 6, 54 / 59 / 0 / 7, 50 / 55 / 8 / 7 and 49 / 55 / 10 / 6 |
| Display names leave the result alone | `changes nothing but the names in %s`; `does not mutate the stored scenario` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty and whitespace names | `treats the name %j as empty`; `gives an empty name for a copy of the empty name %j` |
| Non-string names and inputs | `treats a name that is not a string (%j) as empty`; `treats an entity without a name field as empty`; `shows untitled for the input %j` |
| IDs that are not prefix plus digits | `uses the whole ID when %s ID %s is not its prefix and digits` |
| Large numbers | `inserts the number as text, without a separator, in %s` |
| Near-miss preset IDs | `shows the empty-named scenario %j as untitled`; `finds no preset for the scenario ID %j` |
| Name limit | `keeps a copy at the name limit and empties a longer one`; `strips the old number before checking the limit` |
| Copy numbering | `takes the next free number`; `fills the smallest free number`; `numbers a copy of a copy from its base name`; `strips only a trailing number in brackets` |
| Mixed scripts and hostile text | `keeps Hebrew and Cyrillic names`; `keeps a custom name exactly as typed in %s` (includes `<script>`) |
| Raw IDs on screen | `%s never shows a raw ID in place of an empty name` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Translation quality of en and he | Reviewed by a person before publication (backlog M3-05), not by tests |
| Scenarios imported with names in some language | Imported names are user data and are shown as stored; covered by the custom-name tests |
| Layout of placeholders | Existing `layout.spec.ts` and `a11y.spec.ts` run on the changed inputs view in every locale |
| Language button endonyms | Intentional: each button names its own language |

## Changed Existing Tests

| Test | Change | Reason |
| --- | --- | --- |
| `store.test.ts` presets and Section 8 fixtures | `presetInput(id)` without a translator; locale loops removed; scenario names expected empty | Presets no longer depend on the interface language |
| `store.test.ts` baseline replace and import tests | Compare the scenario ID instead of the name; use `presetInput(id)` | The name is empty by design |
| `app.test.tsx` startup title | Expects `preset.baseline` in the current language | The title is derived, not stored |
| `app.test.tsx` `keeps user-entered names untranslated` | Runs in every locale with custom names | Custom names are the only stored names left |
| `editor.test.tsx` scenario name, entity names, notes label | Use custom names, or expect the default label in the notes `aria-label` | Stored names are empty |
| `coalitionRunner.test.ts`, `fileTransfer.test.ts` | `presetInput(id)`; unused `translator` imports removed | Signature change |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-29 | `npx vitest run` | 172 failed / 1272 passed (1444) | All failures are assertions or the stub error `M2-19: not implemented` (31); no type or reference errors. names 94, store 41, app 17, editor 11, fileTransfer 9. Russian names stored in presets, the startup scenario and added entities; raw IDs shown for empty names |
| 2026-10-29 | `npm run typecheck`; `npm run lint`; `npx prettier --check` | clean | Stubs are typed; `presetInput` takes an optional translator for now |
| 2026-10-29 | `npx vite build`; `npx playwright test offline interaction -g "one interface language\|keep names out"` | 4 failed | Desktop and phone: `en inputs` shows Russian stored names; an added party in Hebrew has the value `מפלגה 5` instead of an empty name |
| 2026-10-29 | `npx vitest run` | 4 failed / 1440 passed (1444) | Implementation done. The four failures were older tests that took the expected name from the stored scenario (now empty): editor `groupName` and the pair-remove label, results `reportOf`. Fixed to expect the display name; recorded in the memo |
| 2026-10-29 | `npx vitest run` | 1444 passed (1444) | Green |
| 2026-10-29 | `npm run typecheck`; `npm run lint`; `npx prettier --check`; `npx vite build` | clean | `dist/elections.html` 189.20 kB |
| 2026-10-29 | `npm run test:e2e` | 1 failed / 103 passed, 14 skipped | Phone legend Escape test (unchanged, not name-related) timed out under parallel load; passed 10 of 10 with `--repeat-each=5` alone |
| 2026-10-29 | `npm run test:e2e` | 104 passed, 14 skipped | Green; +4 against the 100 before M2-19. Screenshots in he, en and ru (inputs, seats) show no other script apart from the language buttons |
| 2026-10-29 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 1444 unit; e2e 104 passed / 14 skipped; build clean |
