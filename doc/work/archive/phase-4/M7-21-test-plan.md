# Test Plan — M7-21 Coalition Workspace Hierarchy And Future-Model Clarity

| Field | Value |
| --- | --- |
| item | M7-21 |
| memo | `doc/work/archive/phase-4/M7-21-memo.md` |
| created | 2026-11-22 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/coalitionHierarchy.test.tsx` | Vitest SSR | Right-column order, one explicit enlarge marker, and RU/EN/HE future model copy |
| `tests/e2e/coalitionHierarchy.spec.ts` | Playwright | First-two default checkboxes, manual-choice persistence, and editing a custom coalition from its enlarged detail |

## Happy Path

- On Coalitions, the possible-coalitions card is before the group-vote card and
  the population card.
- Every tile has a labelled "Enlarge" action.
- Fresh scenarios check exactly the first two future-coalition checkboxes.
- Unchecking a default remains unselected after a normal party-share edit.
- Enlarging a custom coalition exposes the custom editor pencil and prefilled
  party choices.
- Future mode shows a distinct fixed-agenda model card with a title and no
  separate hypothesis paragraph in each language.

## Seat-Calculation Correctness (mandatory when the engine is touched)

Not applicable: M7-21 does not touch `src/engine/` or scenario import/export.
Existing engine suites remain unchanged and are the close-stage guard.

| Check | Test name |
| --- | --- |
| Exact seat sum / determinism / boundaries / ties / fixtures | Existing `tests/engine/`; no new engine path |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| No coalition selected by the user | Manual uncheck leaves the remaining one; future empty choice remains a valid implementation case |
| Custom coalition | `edits a custom coalition from its enlarged detail` |
| RTL and EN copy | `shows a labelled enlarge action and fixed-agenda model card in %s` |
| Invalid/no-allocation workspace | Existing panel repair tests remain the guard |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Pixel colour/spacing of the new model card | Existing layout/axe e2e run at close verifies fit and contrast |
| Translation quality | Only key presence and RTL rendering are asserted; M3-05 remains the full review |
| Maximum 30-party search | No engine/search algorithm changes |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-11-22 | `npx vitest run tests/ui/coalitionHierarchy.test.tsx` | 4 failed / 4 | RED for intended reasons: coalition tiles still follow group voting; no `tile-enlarge`; no future model card/keys in RU/EN/HE. No syntax or tooling failure. |
| 2026-11-22 | `npm run build`; `npx playwright test tests/e2e/coalitionHierarchy.spec.ts` | 4 failed / 4 projects | RED for intended reasons: fresh tiles have zero checked rather than first two, and custom detail has no enlarge/custom-edit path. No browser navigation or tooling error. |
| 2026-11-22 | `npx vitest run tests/ui/coalitionHierarchy.test.tsx tests/ui/panel.test.tsx` | 11 passed | Green for right-column order, explicit enlarge, whole-card toggle, hidden nearest control, bright simulator button and RU/EN/HE model card. |
| 2026-11-22 | `npm run build`; `npx playwright test tests/e2e/coalitionHierarchy.spec.ts tests/e2e/panel.spec.ts` | 16 passed | Green for first-two selection, manual persistence, custom edit from detail, whole-card toggle and add-based tile refill. |
| 2026-11-22 | `npm test`; `npm run typecheck`; `npm run lint` | 3249 passed / 74 files; clean | Full unit, strict types and lint green. |
| 2026-11-22 | `HOSTED_BASE_URL=…; npm run test:e2e -- --workers=2` | 408 passed, 48 skipped | Final CI-mode build/offline/hosted/Playwright gate green. The hosted and questionnaire helpers now follow the prefilled 8-party book route because the opening's direct-to-coalitions button was intentionally removed. |
| 2026-11-22 | `npm test`; `npm run typecheck`; `npm run lint`; `HOSTED_BASE_URL=…; npm run test:e2e -- --workers=2` | 3249 passed / 74 files; clean; 408 passed, 48 skipped | Final re-run after the full-card layout clarification: fullscreen now includes rules, both sections are bounded/centred/top-aligned, and the added e2e assertion keeps the rules visible in the expanded view. |
| 2026-11-22 | `/4-close` full re-run | 3249 passed / 74 files; typecheck/lint clean; 408 browser passes, 48 skips (two workers) | Close gate repeated after all M7-21 implementation and layout clarifications; green. |
