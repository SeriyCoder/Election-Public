# Test Plan — M2-33 Each party's own cooperation answer

| Field | Value |
| --- | --- |
| item | M2-33 |
| memo | `doc/work/archive/phase-2/M2-33-memo.md` |
| created | 2026-10-30 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/helpers/scenarios.ts` | — | Builders write `SCHEMA_VERSION` and an empty `partyRefusals` list |
| `tests/engine/schema.test.ts` | Vitest | Version 3; versions 1 and 2 migrated with no refusals; `partyRefusals` validation (direction, order, malformed, dangling, duplicate, wrong type, size limit, override conflict, explicit pair allowed); field order; byte-stable round trip with the same results; `__proto__` and `constructor` IDs |
| `tests/engine/coalitions.test.ts` | Vitest | Refused pairs in the effective pairs with `refusedBy`; one entry per pair; party source wins; an override never lifts a refusal; same analysis as the explicit pair; blocked reasons and evaluation; seeded property test; brute-force oracle with directed refusals; determinism |
| `tests/engine/edit.test.ts` | Vitest | Four pair lists; directed add; reverse recorded apart; explicit pair and refusal side by side; self, duplicate, unknown and override conflicts refused; removal by index; references and delete repair |
| `tests/ui/book.test.ts` | Vitest | Answers not mirrored; the build writes refusals and no incompatible pairs, equal to the same refusals typed in the editor; base input version 3; coalition pages in one part |
| `tests/ui/bookView.test.tsx` | Vitest (`preact-render-to-string`) | Coalition page shows every partner with no part line (six and ten parties); one party's refusal leaves the other page alone; the explanation names the refusal |
| `tests/ui/store.test.ts` | Vitest | Presets are version 3 with no refusals; refusals added and removed through the store; a future version is `SCHEMA_VERSION + 1` |
| `tests/ui/fileTransfer.test.ts` | Vitest | A future version is `SCHEMA_VERSION + 1` |
| `tests/ui/editor.test.tsx` | Vitest (`preact-render-to-string`) | «Отказы партий» list with refuser and refused selects, add and remove; effective rules name who refused and offer no override; list order |
| `tests/ui/coalitions.test.tsx` | Vitest (`preact-render-to-string`) | Forbidden list, blocked reasons and evaluation name who refused; a pair nobody refused keeps its source label; same output in ru, en and he; new keys in all three tables |
| `tests/e2e/book.spec.ts` | Playwright (desktop and phone) | One-part coalition page in 3:1 columns on desktop; an unticked partner stays on its own page; the built scenario names who refused |
| `tests/e2e/bookFit.spec.ts` | Playwright (desktop, six laptop sizes) | Every coalition page of the ten-party walk is one part and fits |

## Happy Path

- `schema.test.ts › party refusals › keeps each refusal with its direction, in
  the given order` and `… › reads an absent refusal list as empty and prints it
  after the overrides`: `partyRefusals` is kept as given and printed after
  `compatiblePartyOverrides`.
- `coalitions.test.ts › party refusals › forbids a refused pair as a party rule
  and names the refuser`: P3 refusing P1 gives `{ partyIds: ['P1','P3'],
  source: 'party', refusedBy: ['P3'] }`.
- `coalitions.test.ts › party refusals › names both refusers in party order
  whatever the list order`.
- `edit.test.ts › coalition pair edits › keeps the direction of a refusal` and
  `… › records the reverse refusal as a separate answer`.
- `book.test.ts › editing › keeps each party's answer its own`: P1 refusing P3
  leaves P3's page all `yes`; P3's answer never changes P1's page.
- `book.test.ts › build › writes each unticked partner as a refusal by that
  party only` and `… › stores every typed value exactly as the editor stores
  it` (the editor chain adds the same refusal with `addPair`).
- `book.test.ts › page parts › puts "may join a government" first and every
  other party on one coalition screen` and `… › keeps every row once, in order,
  with part sizes one apart` (coalition pages are always one part).
- `bookView.test.tsx › questionnaire parts › asks "may join a government"
  first and every partner on one screen`, `… › shows ten partners on one
  coalition screen`, `… › leaves the other party's page alone when one party
  refuses it`, `… › explains that an unticked box is the refusal of this party
  only`.
- `editor.test.tsx › coalition rules section › shows an empty refusal list
  with a refuser and a refused choice`, `… › lists refusals in their own
  direction with remove buttons`, `… › names who refused in the effective rules
  and offers no override`, `… › places the refusal list after the explicit party
  pairs`.
- `coalitions.test.tsx › who refused › names the refusing party in place of
  the source label`, `… › names both parties of a mutual refusal in party
  order`, `… › names the refusing party in the blocked reasons`, `… › names the
  refusing party in the chosen coalition`.
- `store.test.ts › coalition pairs and selection › adds refusals in their own
  direction and removes them by position`.
- `book.spec.ts › questionnaire book › records each party's own answer and
  names who refused`: six example lists, custom cooperation; `coalitions.0`
  has six fields and no part line, 3:1 columns on desktop; Likud unticks
  Avoda; Avoda's page still ticks Likud; the coalition view lists
  `likud|avoda` with `data-refused-by="likud"` and «отказ».

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `coalitions.test.ts › party refusals › never changes votes, threshold or seats, and acts like the same pairs made explicit` (seed `33_2026_10_30`, 200 cases: `runSeats` identical with no rules, with refusals and with explicit pairs; seats sum to `seatCount`; analysis equal to the explicit one apart from `refusedBy`; more than 100 cases with refusals) |
| Determinism: repeated runs, JSON round trip, ru/en/he | `coalitions.test.ts › determinism › returns identical refusal reasons on repeated runs`; `schema.test.ts › party refusals › survives export and import byte for byte and keeps the results`; `coalitions.test.tsx › who refused › shows the same refusals in ru / en / he`; the existing source scan `does not use floating point or locale APIs` |
| Threshold below / at / above | Not touched: the property test above proves `runSeats` is identical with and without refusals, so the threshold decisions cannot change |
| Exact remainder tie → tieBreakOrder → party ID | Not touched: same property test; coalition rules never enter `runSeats` |
| Fixtures from exact inputs | `coalitions.test.ts › brute-force oracle › matches exhaustive enumeration with directed refusals` (seed `33_2026_10_30`, 300 cases: minimal winning, forbidden pairs with source and `refusedBy`, blocked reasons, evaluation pairs; more than 150 cases with refusals); `coalitions.test.ts › party refusals › rules out what the incompatible pair rules out, in either direction` |
| Migration keeps results | `schema.test.ts › version 1 migration › reads a version 1 / 2 file without refusals as version 3 with none`, `… › gives a version 2 file without refusals the same coalitions`, `… › exports a migrated file as version 3` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `schema.test.ts › party refusals › reads an absent refusal list as empty and prints it after the overrides`; `store.test.ts › presets › %s is a version 3 file with no growth, no turnout change and no refusals`; `book.test.ts › build › ignores growth, turnout change and cooperation pages behind a no` |
| Single element | `coalitions.test.ts › party refusals › forbids a refused pair as a party rule and names the refuser` |
| All values equal | Mutual refusal: `coalitions.test.ts › party refusals › names both refusers in party order whatever the list order`; `coalitions.test.tsx › who refused › names both parties of a mutual refusal in party order` |
| Maximum size (20 / 30 / 10) | `schema.test.ts › entity limits › rejects an oversized refusal list before checking entries` (`LIMITS.pairs + 1`); ten parties on one coalition page: `bookView.test.tsx › … › shows ten partners on one coalition screen`, `bookFit.spec.ts › … › fits every page with ten long names and eight own groups` at six sizes |
| No feasible solution | Section 8 with the P1–P2 rule replaced by a refusal is a deadlock: `coalitions.test.tsx › who refused › names the refusing party in place of the source label` and `… › names the refusing party in the blocked reasons` |
| Refusal and explicit pair together | `coalitions.test.ts › party refusals › keeps an explicit pair and a refusal of it as one entry with the refuser`; `schema.test.ts › party refusals › accepts a refusal of a pair that is also explicitly incompatible`; `edit.test.ts › coalition pair edits › accepts a refusal of a pair that is explicitly incompatible, and the reverse` |
| Refusal and block pair together | `coalitions.test.ts › party refusals › reports a refused pair that blocks also forbid once, as a party rule` |
| Override against refusal | `coalitions.test.ts › party refusals › never lets an override lift a refusal`; `schema.test.ts › party refusals › rejects an override of a refused pair in the same / reverse direction`; `edit.test.ts › coalition pair edits › refuses a refusal P3-P4 / P4-P3 of an overridden pair`, `… › refuses an override P3-P4 / P4-P3 of a refused pair` |
| Malformed, dangling, duplicate, wrong type | `schema.test.ts › party refusals › rejects malformed refusal …`, `… › rejects a refusal naming an unknown party or a block`, `… › rejects the same refusal twice but accepts the reverse direction`, `… › rejects a refusal list that is not an array`; `edit.test.ts › coalition pair edits › refuses a self refusal`, `… › refuses the same refusal twice`, `… › refuses an unknown refusal P1-P9 / B1-P2` |
| Deleting a party | `edit.test.ts › references › lists refusals naming a party on either side`; `edit.test.ts › delete › drops refusals naming a party it deletes with remove / reassign` |
| Prototype-named IDs | `schema.test.ts › scenario export › keeps __proto__ and constructor party IDs as ordinary own keys` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| English and Hebrew wording of the new strings | Reviewed as a whole in M3-05; only their presence is tested (`coalitions.test.tsx › coalition strings`) |
| The future view's coalition cards | Their breach note names no pair; unchanged by this item (memo, Out of Scope) |
| 3:1 columns on the phone project | The book body is one column below the phone breakpoint by design; the ratio is checked on desktop only |
| Exact pixel layout of the one-part coalition page | The Section 14.6 fit walk at six sizes is the gate, as for every other page |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-30 | `npx vitest run tests/engine` | red: 43 failed, 896 passed | Engine tests first. Type-only stubs so the suite compiles: optional `CoalitionRules.partyRefusals`, `ForbiddenPair.refusedBy` always `[]`, `'partyRefusals'` in the `PairList` type (not in `PAIR_LISTS`), `PAIR_KIND.partyRefusals` in `Editor.tsx`; no behaviour |
| 2026-10-30 | `npx vitest run` | red: 77 failed, 2388 passed (41 files, 2465 tests) | Every failure has its intended reason: version 3 unsupported or version 2 returned; `partyRefusals` dropped by the validator; `refusedBy` empty and refusals ignored by the analysis; `addPair` orders and dedupes refusals as unordered pairs and `PAIR_LISTS` lacks them; the questionnaire still mirrors answers, writes incompatible pairs and cuts coalition pages into parts; the explanation does not name the refusal; editor and coalition view render no refusals; the new keys are missing from all three tables; presets are version 2 |
| 2026-10-30 | `npm run typecheck`; `npm run lint`; `npx prettier --check src tests` | green | — |
| 2026-10-30 | `npm run build`; `npx playwright test tests/e2e/book.spec.ts -g "own answer"` | red: 2 failed (desktop, phone) | The part step line is still shown on `coalitions.0` |
| 2026-10-30 | `npx playwright test tests/e2e/bookFit.spec.ts -g "1280x720 100% fits every page with ten long" --project=desktop` | red: 1 failed | `coalitions.0 on one part`: the walk still sees `coalitions.0#1` |
| 2026-10-30 | `npx vitest run` | green: 2465 passed (39 files) | After the implementation; the Israeli example expectation in `tests/ui/store.test.ts` gained `partyRefusals: []` (memo Deviations) |
| 2026-10-30 | `npm run test:e2e` | red: 2 failed, 216 passed, 36 skipped | Heavy walk at 1280x720 and 1366x768 at 125%: coalition pages 640 px high in 576 px and 614 px windows |
| 2026-10-30 | `npm run build`; `npx playwright test tests/e2e/bookFit.spec.ts` | green: 14 passed, 14 skipped | Open Question 5 fallback for short windows (memo Deviations) |
| 2026-10-30 | `npm run typecheck`; `npm run lint`; `npx prettier --check src tests`; `npx vitest run`; `npm run test:e2e` | green: 2465 passed; e2e 218 passed, 36 skipped | Final run |
| 2026-10-30 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 2465 passed (39 files); e2e 218 passed, 36 skipped |
