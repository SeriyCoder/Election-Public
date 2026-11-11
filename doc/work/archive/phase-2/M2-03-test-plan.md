# Test Plan — M2-03 Entity Editor: Groups, Parties, Blocks, Stable IDs, Repair On Delete

| Field | Value |
| --- | --- |
| item | M2-03 |
| memo | `doc/work/archive/phase-2/M2-03-memo.md` |
| created | 2026-10-28 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/edit.test.ts` | Vitest (node) | Draft guard, ID numbering, add/duplicate defaults and limits, palette, rename/recolor/block/eligibility/scenario text, move, references, repair modes, delete with reassign/remove/unassign, pair removal, invalid repairs and weights, purity, exact-arithmetic source scan |
| `tests/engine/rational.test.ts` | Vitest (node) | Terminating-decimal formatter: minimal digits, signs, large values, sums, round trip, refusal of non-terminating values |
| `tests/ui/store.test.ts` | Vitest (node) | Presets (list, Russian baseline equality, translated names, validity and seat sum in every language, locale-independent results, split and multi-block shapes, loading), pending delete flow (immediate group delete, confirmation, cancel, confirm with recomputed seats, failed repair keeps the dialog, unknown entity, non-draft input, pending kept or dropped by later edits); engine allowlist adds `edit` |
| `tests/ui/editor.test.tsx` | Vitest with `preact-render-to-string` | Issue-code keys (type-level completeness over `IssueCode`), sections, rows in order, name values and length limit, party color/block/eligibility, block colors, action labels, move bounds, add buttons and limits, inert hostile names, non-draft message, confirmation content and accessible name, issue list with code/path/message, preset picker, editor per language |
| `tests/ui/app.test.tsx` | Vitest with `preact-render-to-string` | The inputs placeholder key is no longer required |

## Happy Path

- The baseline opens with one editable row per group, party and block.
- Renaming or recoloring keeps the serialized result byte-identical.
- Deleting party 4 with reassignment to party 2 after confirmation yields 46 / 56 / 18 seats.

## Seat-Calculation Correctness (mandatory when the engine is touched)

The engine gains an input-editing module and a decimal formatter; allocation is not touched.

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Engine suite (unchanged); `%s is valid and allocates every seat` for each preset |
| Determinism: repeated runs, JSON round trip, ru/en/he | `%s gives the same result in every language`; `renames a %s without touching anything else`; `recolors a %s`; `does not change any party seat count` |
| Threshold below / at / above | Engine suite (unchanged) |
| Exact remainder tie → tieBreakOrder → party ID | `swaps with the neighbour and keeps tie-break orders`; `copies a party without votes and with the next tie-break order` |
| Fixtures from exact inputs | `builds the existing baseline in Russian`; `reassigns a party: weights are summed exactly and pairs removed`; `preserves every valid vote on reassignment`; `prints an exact sum of two decimals` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `starts at 1 when there is no entity`; `shows a message instead of controls for a non-draft input` |
| Single element | `is a no-op at either end`; `disables moving the first row up and the last row down` |
| All values equal | Not applicable |
| Maximum size (20 / 30 / 10) | `refuses a %s beyond the limit of %d`; `disables add and duplicate at the block limit` |
| No feasible solution | Not applicable |
| Referenced delete without repair | `requires a repair for a referenced %s` |
| Wrong repair or target | `refuses the %s repair %j for ID 1`; `keeps the confirmation open when the repair is invalid` |
| Unparseable weight on reassignment | `refuses to reassign a weight that is not a decimal` |
| Non-terminating decimal | `refuses the non-terminating %d/%d` |
| Hostile names | `keeps hostile names inert`; `keeps any Unicode or markup in a name as plain data` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Click and input handlers, focus after delete | No DOM test environment; handlers only call store actions and edit functions tested here; M2-10 Playwright |
| Visual layout of rows and the dialog | M2-10 Playwright |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | `npm test` | 150 failed / 397 passed | Failures from stubs only: edit functions, `toDecimalString`, store delete and preset actions, `presetInput`, empty `PRESETS` and `PALETTE`; editor markup and keys absent. A stub name `nextIdNumber` tripped the engine float-token scan (`Number(`) and was renamed `nextIdIndex` |
| 2026-10-28 | `npm run typecheck` | clean | `everyCodeListed` ties the issue-code list to `IssueCode` |
| 2026-10-28 | `npm run lint` | unused stub parameters only | Disappear with the implementation |
| 2026-10-28 | `npm test` | 556 passed | After implementation. Two editor assertions loosened to accept the bare `value` attribute that preact-render-to-string emits for an empty string (HTML-equivalent to `value="`) |
| 2026-10-28 | `npm run typecheck`; `npm run lint`; `npx prettier --check`; `npm run build` | clean | Single-file build 72.63 kB |
| 2026-10-28 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check` (close gate) | green | 556 tests green; typecheck, lint, format, build clean |
