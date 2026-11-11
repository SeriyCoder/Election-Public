---
applyTo: 'tests/**'
description: 'Test rules: red first, mandatory seat-calculation correctness category, no network.'
---

# Tests

Layout: engine tests in `tests/engine/**/*.test.ts` (Vitest, no DOM); UI tests
in `tests/ui/**/*.test.{ts,tsx}` (Vitest, store and server-rendered HTML, no
DOM); browser tests in `tests/e2e/**/*.spec.ts` (Playwright).

- Tests are written in `/2-tests`, before the behavior they check is
  implemented, and must fail first for the intended reason. A previously
  untested, memo-scope defect discovered after implementation may use the
  late-regression path in `/2-tests`; its test must fail before the defect is
  corrected. Do not invent a failure if the behavior is already correct.
- Never weaken, skip or delete a test to make it pass. A wrong test is fixed in
  the open, with the reason recorded in the memo's Deviations.
- No network in any test. E2E tests load the built file or a local server only.
- Test names state behaviour: `allocates the remainder seat to the larger
  fractional remainder`, not `test hamilton 2`.

## Mandatory Category — Seat-Calculation Correctness

Required for every item that touches `src/engine/`, scenario import/export, or
anything that feeds the engine:

- **Exact sum:** every valid allocation has exactly `seatCount` nonnegative
  integer seats, including odd sizes and a property test over generated inputs.
- **Determinism:** the same scenario gives byte-identical result JSON across
  repeated runs, after a JSON round trip, and under `ru`, `en` and `he`.
- **Exact boundaries:** threshold below / exactly at / above; exact remainder
  ties resolved by `tieBreakOrder`, then party ID.
- **Fixtures:** expectations come from exact inputs or an independent
  computation, never from rounded table text.
- **No float decisions:** no qualification, floor, remainder or tie test passes
  through a floating-point comparison.

## Degenerate Cases

Always consider: no groups or parties; a single party; all values equal; maximum
size (20 groups, 30 parties, 10 blocks); no feasible allocation or coalition
(zero turnout, every party below threshold, no permitted majority).
