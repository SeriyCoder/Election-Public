# Test Plan — M7-22 First-Visit Welcome Dialog

| Field | Value |
| --- | --- |
| item | M7-22 |
| memo | `doc/work/archive/phase-4/M7-22-memo.md` |
| created | 2026-11-23 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/storage.test.ts` | Vitest | Welcome key, read/mark contract, blocked storage and prefix-only clear |
| `tests/ui/welcomeDialog.test.tsx` | Vitest SSR | Three simultaneous headings, HE RTL, language buttons, inert SVG/highlights and modal wiring |
| `tests/e2e/welcome.spec.ts` | Playwright | First visit, once-only persistence, ×/backdrop/Escape, language choice/close, focus return, phone/RTL/offline and clear-data reset |

## Happy Path

- A fresh origin shows the native welcome dialog above the questionnaire.
- It contains one inline SVG, the three user-approved headings, three muted
  educational notes and the RU / EN / HE actions.
- Clicking a language action changes the app language and closes the dialog.
- ×, backdrop and Escape all close and mark the welcome as seen.
- Reload does not show the dialog until owned storage is cleared.
- Focus enters the dialog and returns to the previously focused element after
  close.

## Seat-Calculation Correctness (mandatory when the engine is touched)

Not applicable: M7-22 changes only first-visit UI/storage and calls the
existing language action. It does not touch `src/engine/` or scenario input.
The existing engine suites remain the close-stage guard.

| Check | Test name |
| --- | --- |
| Exact seat sum / determinism / boundaries / ties / fixtures | Existing `tests/engine/`; no new arithmetic path |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Storage blocked | `survives blocked welcome storage` |
| Revisit / remembered marker | e2e reload stays closed |
| Clear saved data | e2e clear removes all owned keys and next reload shows welcome |
| No prior focus target | dialog still closes without throwing |
| Phone + Hebrew RTL | e2e welcome at 360×740, no serious axe findings/overflow |
| Escape / backdrop / close button | one e2e parameterised close route |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Artistic subjective quality of the SVG | Manual visual review in browser; automated checks prove inline/accessible/offline and no external resource |
| Full M3-05 wording review | Deferred by the user; exact requested text is asserted |
| Real iOS/Safari behaviour | M3-07 remains the real-device follow-up |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-11-23 | `npx vitest run tests/ui/storage.test.ts tests/ui/welcomeDialog.test.tsx` | 4 failed / 91; 87 passed | RED for intended reasons: `browserStorage` has no welcome read/mark methods and App has no `data-welcome-dialog`/art/headings/locale actions. No syntax or tooling failure. |
| 2026-11-23 | `npm run build`; `npx playwright test tests/e2e/welcome.spec.ts` | 4 failed / 4 | RED for intended reasons: fresh page has no visible welcome dialog/art/focus target in desktop or phone project. Build and browser launch succeeded. |
| 2026-11-23 | `npx vitest run tests/ui/storage.test.ts tests/ui/welcomeDialog.test.tsx` | 93 passed | GREEN after storage + UI implementation. |
| 2026-11-23 | `npm run build`; `npx playwright test tests/e2e/welcome.spec.ts` | 6 passed | GREEN for language close, ×/backdrop/Escape, remembered visit, clear reset, 40×40 close/focus, phone/RTL and serious axe. |
| 2026-11-23 | `npm test`; `npm run typecheck`; `npm run lint` | 3262 passed / 75 files; clean | Full unit, strict types and lint green. |
| 2026-11-23 | `HOSTED_BASE_URL=…; npm run test:e2e -- --workers=2` | 414 passed, 48 skipped | Full hosted/offline browser build green; hosted capture dismisses the first-visit dialog with Hebrew before its existing capture, and existing tests keep a test-only seen marker except `welcome.spec.ts`. |
| 2026-11-23 | `npm run format`; `npm test`; `npm run typecheck`; `npm run lint` | 3262 passed / 75 files; clean | Final post-format confirmation; strict types and lint exit 0. |
| 2026-11-23 | `npm run build`; `npx playwright test tests/e2e/welcome.spec.ts` | 6 passed | Added the visible «Вступление» reopen action after the first welcome; Escape closes the re-opened modal and reload still stays dismissed. |
| 2026-11-23 | `npm test`; `npm run typecheck`; `npm run lint`; `HOSTED_BASE_URL=…; npm run test:e2e -- --workers=2` | 3262 passed / 75 files; clean; 414 passed, 48 skips | Final re-run after adding the visible «Вступление» reopen action. |
| 2026-11-23 | `/4-close` final re-run | 3262 passed / 75 files; typecheck/lint clean; 414 browser passes, 48 skips (two workers) | Release gate repeated before publication scan; green. |
