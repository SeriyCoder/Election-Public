# Test Plan — M2-14 Chart Details: Select a Bar Segment or Seat, Dismiss by Escape or Outside Click

| Field | Value |
| --- | --- |
| item | M2-14 |
| memo | `doc/work/archive/phase-2/M2-14-memo.md` |
| created | 2026-10-29 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/results.test.tsx` | Vitest (server render) | Each legend entry is a `button[data-select-party]` with `aria-expanded="false"` and the label "Show details: {name}"; an empty polite details slot; nothing selected at start; no legend or slot without an allocation; `ChartDetails` shows the same votes, vote share, status, seats, seat share and quota as the tables in ru/en/he; block name or "Unassigned"; labelled Close button; hostile name inert; unknown party renders nothing; labels in every locale |
| `tests/e2e/interaction.spec.ts` | Playwright (desktop, phone) | A vote-bar segment opens P2 details matching the table; the legend button reports expanded; the seat-bar segment is marked selected; a seat click switches to P4; Escape closes; a click inside the panel keeps it; a click on a table caption closes it; from the keyboard Enter/Space toggle the legend button, Escape in the panel and the Close button return focus to the legend button |
| `tests/e2e/a11y.spec.ts`, `layout.spec.ts` (existing) | Playwright | The legend buttons meet 44 × 44, show visible focus, pass axe, and long names wrap within the width |

## Happy Path

- Tap a thin segment and read the exact numbers — `a chart segment or seat shows exact details; ...`.
- Keyboard users reach the same details — `the legend opens details from the keyboard and returns focus on close`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Engine not touched |
| Determinism: repeated runs, JSON round trip, ru/en/he | `shows the same values as the party table in %s` |
| Threshold below / at / above | Not touched |
| Exact remainder tie → tieBreakOrder → party ID | Not touched |
| Fixtures from exact inputs | e2e checks the P2 seats against the Section 8 baseline |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | Not applicable |
| Single element | Not applicable |
| All values equal | Not applicable |
| Maximum size | Not applicable; one panel at a time |
| No feasible solution | `shows votes but no seats when nothing is allocated` (no legend buttons, no slot) |
| Rounding edge cases | Panel uses the table formatting; compared cell by cell |
| Party missing from the report | `renders nothing for a party that is not in the report` |
| Unassigned party | `names the block, or says the party is unassigned` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Scroll-into-view on open | Viewport-dependent; the in-flow panel cannot overlap, and the layout suite checks overflow |
| Panel after the selected party is deleted | Same path as the unknown-party unit test: the panel is built from the current report |

## Changed Existing Tests

| Test | Change | Reason |
| --- | --- | --- |
| `shows votes but no seats when nothing is allocated` | Also expects no legend buttons and no details slot | Details exist only with an allocation |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-29 | `npx vitest run` | 9 failed / 1069 passed | No `ChartDetails`, legend buttons, details slot or i18n keys. `keeps a hostile party name inert` passes vacuously until the component exists |
| 2026-10-29 | `npx playwright test tests/e2e/interaction.spec.ts` | 4 failed / 16 passed / 2 skipped | Both new tests, desktop and phone: no details panel, no legend buttons |
| 2026-10-29 | `npm test`; typecheck; lint | 1078 passed; clean | After legend toggle buttons, click handlers on bars and seats, `ChartDetails`, document-level Escape and outside-click dismissal, styles and four i18n keys |
| 2026-10-29 | `npm run test:e2e` | 90 passed / 14 skipped | New tests pass on desktop and phone; a11y (axe, 44 px, visible focus) and layout (long names) pass with the legend buttons. Screenshots (en, he; desktop, phone) checked by eye |
| 2026-10-29 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 1078 passed; e2e 90 passed / 14 skipped |
