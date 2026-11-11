# Test Plan — M2-12 Rate Controls: Sliders, Segmented Controls, Override Flag

| Field | Value |
| --- | --- |
| item | M2-12 |
| memo | `doc/work/archive/phase-2/M2-12-memo.md` |
| created | 2026-10-29 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/editor.test.tsx` | Vitest (server render) | A range slider (0–100, percent value, field-label `aria-label`) for each of the four group rate fields, every destination weight (disabled when not allowed) and the threshold; voting mode and majority mode inside `segmented` containers |
| `tests/engine/report.test.ts` | Vitest (node) | `majorityOverridden` true with an override, false by default |
| `tests/ui/results.test.tsx` | Vitest (server render) | The summary marks an overridden majority in ru/en/he and shows no mark by default |
| `tests/e2e/interaction.spec.ts` | Playwright (desktop, phone) | Clicking a segment switches the voting mode; arrow keys on the threshold slider write the same value as typing it |
| `tests/e2e/a11y.spec.ts` (existing) | Playwright | Segments stay at least 44 × 44 px and show a visible focus indicator |

## Happy Path

- Every rate has a slider beside its number — `offers a %s slider beside the number`, `offers a slider for every destination weight`, `offers a threshold slider beside the number`.
- A slider move writes through the same edit path as typing — `the threshold slider follows the keyboard` (one ArrowRight step gives the number field `0.1`, the value typing `0.1` gives).
- An overridden majority is visibly identified — `marks an overridden majority in %s`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Arithmetic not touched; existing engine suite |
| Determinism: repeated runs, JSON round trip, ru/en/he | `marks an overridden majority in %s` per locale; the flag is copied from rules |
| Threshold below / at / above | Not touched; `the threshold slider follows the keyboard` checks a slider-written 0.1% threshold leaves the baseline seats unchanged |
| Exact remainder tie → tieBreakOrder → party ID | Not touched |
| Fixtures from exact inputs | Not applicable |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | Not applicable |
| Single element | Not applicable |
| All values equal | Not applicable |
| Maximum size | Not applicable; one slider per existing number input |
| No feasible solution | Not applicable |
| Rounding edge cases | `offers a threshold slider beside the number` (3.25% shown exactly) |
| Destination not allowed | `offers a slider for every destination weight` (P4 slider disabled) |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Pixel styling of the checked segment | The a11y suite checks size and focus; colour fill is presentation only and the label text stays visible |
| Slider drag on weight and rate fields other than turnout | Same component and write path as the existing turnout drag test |

## Changed Existing Tests

| Test | Change | Reason |
| --- | --- | --- |
| `offers sliders for share and turnout` | Replaced by `offers a %s slider beside the number` over all four rate fields, also checking range and `aria-label` | Memo scope: every rate gets the shared slider |
| `shows the summary ...` in `results.test.tsx` | Also asserts no override mark by default | Guards the new mark against false positives |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-29 | `npx vitest run` | 11 failed / 1038 passed | Missing sliders (validBallotRate, participationFactor, weights, threshold), segmented containers, `majorityOverridden`, override mark. Share and turnout slider rows already pass and guard current behaviour |
| 2026-10-29 | `npx playwright test tests/e2e/interaction.spec.ts` | 2 failed / 13 passed | Threshold slider missing (desktop, phone). The segment-click test passes on the plain radios and guards the restyle |
| 2026-10-29 | `npm test`; typecheck; lint; prettier --check | 1049 passed; clean | After `RateSlider`, segmented markup and styles, `majorityOverridden` and the summary mark |
| 2026-10-29 | `npm run test:e2e` | 85 passed / 13 skipped | New interaction tests pass; a11y touch-target and visible-focus checks pass on the segments. Screenshots (en, he; desktop, phone) checked by eye: `.field` gained `align-content: start` so a number input no longer stretches to its grid row |
| 2026-10-29 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run test:e2e` (close gate) | green | 1049 passed; e2e 85 passed / 13 skipped |
