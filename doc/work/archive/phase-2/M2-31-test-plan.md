# Test Plan — M2-31 Eligible-voter hint

| Field | Value |
| --- | --- |
| item | M2-31 |
| memo | `doc/work/archive/phase-2/M2-31-memo.md` |
| created | 2026-10-30 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/hint.test.tsx` | Vitest (`preact-render-to-string`) | Keys and approved wording; the button's markup on the rules page, every group page, the results summary, the comparison totals and the future totals, in ru, en and he; no label wrapper; unique, always present text targets |
| `tests/e2e/hint.spec.ts` | Playwright (desktop and phone) | Hover title, click open and close, Enter, Space and Escape, phone tap, label text does not toggle, accessible names, group page, the three result places, axe on opened hints in ru and he |
| `tests/e2e/a11y.spec.ts` (existing) | Playwright | The phone 44 x 44 touch-target check and the axe check of every view now include the new buttons |

## Happy Path

- `hint strings › defines every hint key in ru / en / he`;
  `translates every hint key in en / he`; `names the explained label in …`;
  `uses the approved Russian wording` (memo Open Question 3).
- `hint in the editor › explains the eligible-voter rule in ru / en / he`: one
  `button.hint[data-hint="population"]` on the rules page, `type="button"`,
  title = `hint.population`, accessible name = `hint.open` with the rule's
  label, `aria-expanded="false"`, `aria-controls` set; the only hint there.
- `explains every group's population share in …`: every group row has exactly
  one hint, `data-hint="populationShare"`, with the group-share text.
- `hint in the results › explains the summary total / the comparison total /
  the demographic-future total in …`: one hint on the «Имеют право голоса»
  row and none on the other rows of the same block.
- e2e: `hover shows the explanation as the tooltip`; `a click opens the text and
  a second click closes it`; `Enter and Space toggle it and Escape closes it`
  (focus stays on the button); `phone: a tap opens the text`; `a group page
  explains the population share`; `the results, comparison and future totals
  carry the hint`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

Not applicable: the item adds interface text and a button; no engine file, no
input, no stored value and no calculation changes (memo, Seat-Calculation
Correctness). The existing engine and determinism suites run unchanged.

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Not applicable — engine untouched |
| Determinism: repeated runs, JSON round trip, ru/en/he | Not applicable — engine untouched |
| Threshold below / at / above | Not applicable — engine untouched |
| Exact remainder tie → tieBreakOrder → party ID | Not applicable — engine untouched |
| Fixtures from exact inputs | Not applicable — engine untouched |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Several hints on one page (rule, every group, summary) | `gives every hint its own closed text` — `aria-controls` values are unique and each names an element that is present and `hidden` while closed |
| A button inside a `label` would become the label's control | `keeps the hint out of a label wrapper`; e2e `the label text does not toggle the hint and the field keeps its name` |
| The population input's accessible name | `keeps the population input name`; e2e role query by name |
| Right-to-left layout | e2e `an opened hint has no serious axe findings in he` |
| Phone touch target | existing `a11y.spec.ts › phone: every control in … is at least 44 x 44` |
| Empty input / single element / all equal / maximum size / no feasible solution | Not applicable — no collection or calculation is added |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| The browser's drawing of the native `title` tooltip | Drawn by the browser outside the page; the `title` attribute is the contract and is checked |
| Hints on other fields, the questionnaire, the future groups column | Out of scope (memo) |
| Seat-calculation categories | Engine untouched (see above) |

Test-step decision recorded here: the opened text element is always rendered
and carries `hidden` while closed, so `aria-controls` always names an element
that exists (axe `aria-valid-attr-value`). This refines the memo's "when
expanded, a text span follows the button" without changing what is seen.

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-30 | `npx vitest run tests/ui/hint.test.tsx` | red: 26 failed, 1 passed | Keys undefined and no `data-hint` buttons; the structural guards (rules section, group rows with `data-fraction="populationShare"`, compare and future totals tables) are found, so the failures are the missing feature. `keeps the population input name` passes as a guard for the wrapper change |
| 2026-10-30 | `npx vite build; npx playwright test tests/e2e/hint.spec.ts` | red: 14 failed, 4 skipped | Every failure is a missing `button.hint` (element not found); skips are the desktop-only and phone-only cases on the other project |
| 2026-10-30 | `npx vitest run` | green: 39 files, 2402 tests | `tests/ui/hint.test.tsx` 27/27 |
| 2026-10-30 | `npm run typecheck`; `npm run lint`; `npx prettier --check src tests` | green | — |
| 2026-10-30 | `npm run test:e2e` | green: 214 passed, 36 skipped | Includes `hint.spec.ts` and the existing phone 44 x 44 and axe checks; offline file 365.77 kB, gzip 101.74 kB (budget 450 kB) |
| 2026-10-30 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | unit 2402, e2e 214 passed / 36 skipped, 365.77 kB |
