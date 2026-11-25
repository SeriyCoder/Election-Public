# Test Plan — M7-23 Preserve Party Compositions When Adding A Group

| Field | Value |
| --- | --- |
| item | M7-23 |
| memo | `doc/work/archive/phase-4/M7-23-memo.md` |
| created | 2026-11-25 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/book.test.ts` | Vitest | Increase 7 → 8 own groups, retain every party row, append exact zero, build valid scenario and exact 120-seat sum |
| `tests/e2e/startExamples.spec.ts` | Playwright | User path in the ready eight-party questionnaire: increase the group count and inspect the first composition row |

## Happy Path

- Add an eighth own group to the ready eight-party questionnaire.
- The first seven displayed composition values of every party remain
  byte-for-byte unchanged; the new eighth value is `0`.
- Building and validating the changed draft succeeds and allocates exactly 120
  seats.
- Repeating the build/validation from the same draft is deterministic.

## Seat-Calculation Correctness (mandatory because questionnaire output feeds the engine)

| Check | Test name |
| --- | --- |
| Exact seat sum, including the 120-seat reported case | `keeps ready party compositions when an eighth group is added` |
| Determinism: same migrated draft, two builds, JSON/locale-independent data | `keeps ready party compositions when an eighth group is added` |
| Threshold boundaries / remainder ties | Existing engine suite at the full gate; M7-23 does not change these paths |
| Fixtures from exact inputs | Existing `tests/fixtures/new8.json` supplies exact pre-add composition inputs |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| New group in an existing seven-group draft | UI + e2e migration cases |
| All parties must migrate, not only selected party | UI test checks every party row |
| New group has no invented share | UI test checks exact `0` |
| Count decrease / rename | Existing book-shape tests remain guards; if migration exposes a conflict, fix and record in memo |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Manual transfer of weight into the new group | Existing composition editing/alignment/lock suites cover it |
| 20-group or 30-party limits | No arithmetic/path-limit change; existing coverage remains |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-11-25 | `npx vitest run tests/ui/book.test.ts -t ...`; `npm run build`; `npx playwright test tests/e2e/startExamples.spec.ts -g ...` | UI RED 1/1; browser RED 2/2 | Intended failure: first party row becomes equal `13/13/13/13/12/12/12/12` instead of retaining `31.2/38.79/14.66/9.38/0/0/5.97` plus new `0`. No syntax/tooling failure. |
| 2026-11-25 | `npx vitest run tests/ui/book.test.ts -t ...`; `npm run build`; `npx playwright test tests/e2e/startExamples.spec.ts -g ...` | UI GREEN 2/2; browser GREEN 2/2 | Added group-ID migration; existing rows retained byte-for-byte, new group exact `0`. |
| 2026-11-25 | `npm test`; `npm run typecheck`; `npm run lint` | 3263 passed / 75 files; clean | Full unit, strict types and lint green. |
| 2026-11-25 | `HOSTED_BASE_URL=…; npm run test:e2e -- --workers=2` | 416 passed, 48 skipped | Full hosted/offline browser gate green. |
| 2026-11-25 | `/4-close` final re-run | 3263 passed / 75 files; typecheck/lint clean; 416 browser passes, 48 skips (two workers) | Close gate repeated after spec and memo reconciliation; green. |
