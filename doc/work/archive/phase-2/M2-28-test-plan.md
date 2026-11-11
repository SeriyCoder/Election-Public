# Test Plan — M2-28 Fixed rules

| Field | Value |
| --- | --- |
| item | M2-28 |
| memo | `doc/work/archive/phase-2/M2-28-memo.md` |
| created | 2026-10-30 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/validity.test.ts` | Vitest | New: the constant `'0.999'`; the exact check `isStandardValidity`; a uniform 99.9% leaves shares, qualification, quotas, remainders, seats and coalitions unchanged (Section 8 fixture, threshold boundary, exact tie, 200 seeded scenarios); valid votes exactly 999/1000; determinism |
| `tests/engine/edit.test.ts` | Vitest | A new group takes `validBallotRate: '0.999'` |
| `tests/ui/store.test.ts` | Vitest | Every preset puts every group at `'0.999'`; the Israeli example group rows at `'0.999'`; existing preset seat tests (46/50/18/6, 31/30/11/14/18/16) unchanged |
| `tests/ui/book.test.ts` | Vitest | The empty-draft questionnaire build at `'0.999'`; the example build follows the preset |
| `tests/ui/editor.test.tsx` | Vitest | Rules: no majority choice and no method row for a default scenario; the fixed majority line and the validity line; the eligible-voter label; the majority choice kept for an imported override. Group panel: validity field hidden at 99.9%, shown at any other rate in its usual place |
| `tests/ui/results.test.tsx` | Vitest | Summary without the method row; removed keys gone from `ru`; 999 000 valid and 1 000 invalid of a million; reworded population labels; the validity note in ru, en and he; no note when a group has another rate |

## Happy Path

- A new scenario shows the rules without the majority choice or the method,
  with "Для большинства нужно больше половины мест" and the 0.1% note.
- Group panels show no valid-ballot field; the results summary shows 999 000
  valid votes, 1 000 invalid, the same seats, and the note under it.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `gives equal shares, statuses, seats and coalitions over 200 seeded scenarios` (seat counts 1–151, sum checked); store `%s is valid and allocates every seat` |
| Determinism: repeated runs, JSON round trip, ru/en/he | `gives byte-identical results on a repeat run and after a JSON round trip`; store `loads %s to the same input in every language` (existing) |
| Threshold below / at / above | `qualifies a list exactly at the threshold at both rates`; `leaves a list just below the threshold below it at both rates` |
| Exact remainder tie → tieBreakOrder → party ID | `resolves an exact remainder tie by tie-break order at both rates` |
| Fixtures from exact inputs | `keeps the Section 8 baseline at 46 / 50 / 18 / 6 with 999 000 valid votes` (party votes 379 620 / 419 580 / 149 850 / 49 950 by hand); results `counts 999 000 valid votes of a million at the standard rate` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `does not count an empty string / unreadable text / a missing value as the standard rate` |
| Single element | Seeded scenarios with one group and one party (seeds draw 1–5 groups, 1–7 parties) |
| All values equal | `resolves an exact remainder tie by tie-break order at both rates` (four equal lists) |
| Maximum size (20 / 30 / 10) | Not added: the change is a value, not a size; existing limit tests cover the editor |
| No feasible solution | Seeded scenarios include zero turnout and thresholds up to 25% (no-allocation compared equal at both rates); `turnoutZero` preset at 99.9% |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| e2e changes | No e2e test pins a baseline vote count, the method text or the majority radios; the future fixture sets its own validity of 1 |
| English and Hebrew wording of the new strings | Reviewed as a whole in M3-05; the tests require only that the keys exist and render |
| A separate engine test of preset seats | The store suite already pins the preset seats; the engine test proves the uniform factor cannot change them |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-30 | `npx vitest run`; `npm run typecheck`; `npm run lint`; `npx prettier --check src tests` | red: 30 failed, 2204 passed of 2234; typecheck, lint, format clean | All for the intended reason: the `edit.ts` stub keeps the rate at `'1'` and `isStandardValidity` returns false; presets, new groups and the questionnaire still at `'1'`; the majority choice, method row and summary method still shown; no notes; old labels. No TypeError or ReferenceError |
| 2026-10-30 | `npx vitest run` | red: 1 failed, 2233 passed of 2234 | Store `gives 700 000 valid votes split as the table implies` still pinned the Israeli example at 100% validity; this plan had missed it. Corrected to the memo's decision 2 with exact values: 700 000 ballots, 699 300 valid, each party at its table vote × 999/1000 (renamed `gives 700 000 ballots, 699 300 valid, split as the table implies`). Seats unchanged at 31 / 30 / 11 / 14 / 18 / 16 |
| 2026-10-30 | `npx vitest run`; `npm run typecheck`; `npm run lint`; `npx prettier --check src tests`; `npm run build`; `npm run test:e2e` | green: 2234 of 2234; typecheck, lint, format clean; build 341.50 kB; e2e 182 passed, 30 skipped | Skips are the usual phone-only exclusions |
| 2026-10-30 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 2234 of 2234; build 341.50 kB; e2e 182 passed, 30 skipped |
