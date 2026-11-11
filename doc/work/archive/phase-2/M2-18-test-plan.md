# Test Plan — M2-18 Turnout Shortcut For Parties And Blocks

| Field | Value |
| --- | --- |
| item | M2-18 |
| memo | `doc/work/archive/phase-2/M2-18-memo.md` |
| created | 2026-10-29 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/edit.test.ts` | Vitest (node) | `turnoutCohorts`: the one dedicated group of every Section 8 party and block; the split preset (Parties 1 and 2 dedicated plus shared Group 3, Party 3 shared only, Party 4 dedicated, Blocks 1 and 3); a group feeding two parties of one block listed once; exact zero (including `0.000`) not counted; the smallest positive weight counted; unreadable weights (text, missing, a number) counted; a weight for a non-allowed party and a dangling destination ignored; group order after a move; no cohort for an unvoted party or an empty block; unknown party or block refused; each group at most once and never in both lists; follows the current weights; no mutation. `setCohortTurnout`: exact stored fractions; equal to group-by-group edits; repeated IDs once; applied twice equals once; accepted and refused percent texts with `invalid-turnout`; unknown group; empty list; shared groups untouched; the Party 3 shortcut gives the zero-turnout seats and the zero-turnout input; a group feeding two block parties changed once; JSON round trip; no mutation |
| `tests/ui/store.test.ts` | Vitest (node) | `setCohortTurnout(kind, id, text)`: the split Block 1 edit sets Group 1, leaves the shared Group 3 and changes the seats; the Party 3 shortcut gives 54 / 59 / 0 / 7; applied twice gives an equal input; refusals (not a percent, above 100%, a party with only a shared group, unknown party, unknown block, input that is not a draft) return false and keep the same input object |
| `tests/ui/editor.test.tsx` | Vitest (server render) | Nine new keys; a closed `details[data-turnout]` in every party and block row and none in group rows; the single-dedicated shortcut field and slider with the group-named label and the group's value; the bulk list, empty field, disabled button and the shared list with the party or block reason; shared-only party with no edit; listed groups with name and turnout; the multi-party block shortcut with both parties showing the shared group; the empty sentences for a party and a block; live update after a weight edit; hostile group names inert and isolated; no nested `li` in party and block rows; labels in every locale |
| `tests/e2e/interaction.spec.ts` | Playwright (desktop, phone) | Baseline: the Party 3 shortcut set to 0 changes the Group 3 field and gives seats 54 / 59 / 0 / 7. Split: the Block 1 disclosure lists Groups 1 and 3, the button is disabled until a percent is typed, the edit sets Group 1 to 50 and leaves Group 3 at 100, Party 1 loses seats, and a second click changes nothing |
| `tests/e2e/a11y.spec.ts`, `layout.spec.ts` (existing) | Playwright | The new disclosure passes axe and keeps the inputs view free of page overflow on desktop and phone in every locale |

## Happy Path

- A user asks "what if Party 3's voters stay home?", opens the Party 3 turnout
  disclosure, types 0 and sees the zero-turnout seats —
  `gives the zero-turnout seats through the Party 3 shortcut` (engine and
  store); `offers the group's own turnout for a party with one dedicated group`;
  the e2e shortcut test.
- A user lowers Block 1's turnout in the split example and sees which group
  changes and which shared group does not —
  `lists an open group that also votes elsewhere as shared`;
  `sets the dedicated groups of a block and leaves the shared ones`;
  `gives the reason in block terms in a block row`; the e2e bulk test.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Allocation not touched; existing suite |
| Determinism: repeated runs, JSON round trip, ru/en/he | `gives the same draft when applied twice`; `keeps the result through a JSON round trip`; `labels the turnout disclosure in %s` |
| Threshold below / at / above | Not touched |
| Exact remainder tie → tieBreakOrder → party ID | Not touched |
| Fixtures from exact inputs | `gives the zero-turnout seats through the Party 3 shortcut` (seats and the serialized zero-turnout input); `finds the one dedicated group of Section 8 party and block %i` |
| Exact zero and range tests | `does not count a destination whose weight is exactly zero`; `counts the smallest positive weight`; `refuses %j` (`-0.0000000000000001`, `100.0000000000000001`) |
| Same seats as a direct group edit | `equals the same edits made group by group`; `changes a group that feeds two block parties once, not twice` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `returns an equal draft for an empty list`; `refuses when the input is not a draft` |
| Single element | `finds the one dedicated group of Section 8 party and block %i` |
| No cohort | `finds no cohort for a party no group votes for`; `finds no cohort for a block without parties`; `says so when no group votes for a party or a block` |
| Unreadable draft | `counts an unreadable weight (%s) as a vote` |
| Dangling or non-allowed destinations | `ignores a destination that names no party`; `ignores a weight for a party that is not an allowed destination` |
| Unknown IDs | `rejects an unknown party or block`; `rejects an unknown group`; `refuses %s and keeps the input` |
| Repeated application | `applies a repeated group once`; `gives the same input when applied twice`; the e2e second click |
| Ordering | `follows group order, not party order`; `lists each group at most once and never as both kinds` |
| Live state | `follows the current weights with no stored state`; `follows a weight edit with no stored state` |
| Hostile names | `keeps hostile group names inert` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Slider drag on the shortcut | The slider is the existing `RateSlider` writing the same group edit; the group-panel slider drag is covered by `dragging a slider changes the field and the seats` |
| Relative or proportional bulk edits | Out of scope in the memo |
| Typed bulk text surviving a re-render | Local component state, not saved in the scenario by design |

## Changed Existing Tests

| Test | Change | Reason |
| --- | --- | --- |
| Imports of `edit.test.ts` | Gain `setCohortTurnout`, `turnoutCohorts`, `parseScenarioJson`, `serializeScenario` | New engine functions and the round-trip test |
| Imports of `editor.test.tsx` | Gain `renameEntity`, `setVoteWeight` | Hostile-name and live-update view tests |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-29 | `npx vitest run` | 69 failed / 1203 passed | 20 `turnout cohorts` and 24 `cohort turnout edit` engine tests (no `turnoutCohorts`, no `setCohortTurnout`); 9 store tests (no `store.setCohortTurnout`); 16 view tests (no keys, no `details[data-turnout]`). The pre-existing 1203 stay green |
| 2026-10-29 | `npx playwright test tests/e2e/interaction.spec.ts -g "turnout shortcut changes\|block bulk edit"` | 4 failed | Desktop and phone: the app loads and the preset loads, but no `[data-turnout] > summary` in the party or block row of the built file |
| 2026-10-29 | `npx vitest run`; `npm run typecheck`; `npm run lint`; `npx prettier --check` | 1272 passed; clean | The 69 red tests pass; the turnout disclosure moved after the notes disclosure so the existing notes summary tests stay valid |
| 2026-10-29 | `npx vite build`; `npx playwright test interaction a11y layout` | 81 passed / 11 skipped | Both new e2e tests pass on desktop and phone. A temporary geometry script (deleted) opened every turnout disclosure in he and ru, desktop and phone, with a long mixed-script group name: no page overflow, no element outside its row; the phone screenshot showed the percent breaking, fixed with a non-wrapping value span and rechecked |
| 2026-10-29 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 1272 unit; e2e 100 passed / 14 skipped; spec Section 5 and project brief synced |
