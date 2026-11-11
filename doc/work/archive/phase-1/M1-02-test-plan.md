# Test Plan — M1-02 Exact Rational Arithmetic

| Field | Value |
| --- | --- |
| item | M1-02 |
| memo | `doc/work/archive/phase-1/M1-02-memo.md` |
| created | 2026-10-28 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/rational.test.ts` | Vitest (node) | Normalization, integer conversion, exact arithmetic, comparison, floor, decimal parsing, fraction text, generated properties, source constraints |
| `tests/vite-env.d.ts` | TypeScript | Test-only Vite client types so tests can read engine source through `?raw` without exposing Node types to `src/engine/` |
| `src/engine/rational.ts` | — | Type-only stub: exported signatures throw `not implemented` |

## Happy Path

- `rational` reduces by GCD, keeps a positive denominator and freezes the value.
- `add`, `sub`, `mul`, `div`, `neg`, `sum` are exact; `0.1 + 0.2` equals `0.3`.
- `compare` and the predicate helpers decide exactly at a threshold-like boundary.
- `floor` rounds toward negative infinity, including negative values.
- `parseDecimal` converts plain decimal strings exactly.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Not owned here (memo decision 3): no allocator yet. Rational floor at an integer quota boundary: `floors a seat quota exactly at an integer boundary` |
| Determinism: repeated runs, JSON round trip, ru/en/he | `produces identical fraction text on repeated evaluation`; `preserves a decimal string through a JSON round trip`; locale independence: `does not route rational decisions through floating point` (no locale APIs). Scenario-level locale runs belong to M1-08 |
| Threshold below / at / above | `provides consistent predicate helpers at an exact boundary` |
| Exact remainder tie → tieBreakOrder → party ID | Exact equality used for tie detection: `orders values by exact cross-multiplication`; ordering rule belongs to M1-06 |
| Fixtures from exact inputs | Expectations are hand-derived fractions (`912/17`, `1/2`, `15/2`), never rounded text |
| No float decisions | `does not route rational decisions through floating point` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `sums an empty list to zero and a list exactly`; `rejects malformed decimal ""` |
| Single element | `defaults the denominator to one` |
| All values equal | `gives equal values identical fields` |
| Maximum size (20 / 30 / 10) | Not applicable to scalar arithmetic; size limits are `accepts 128 characters and rejects longer input` and the 18-digit fraction limit |
| No feasible solution | `rejects a zero denominator`; `rejects division by zero`; malformed and unsafe inputs |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Display formatting to floating point | Not provided; display conversion is a UI concern after decisions |
| Scenario-level determinism under ru/en/he | Owned by M1-08 |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | `npx vitest run` | RED: 47 failed, 1 passed | Every behavioral test fails with `Error: not implemented` from the stub; the source-constraint test passes on the stub. Type check and lint green |
| 2026-10-28 | `npx vitest run`; `npm run typecheck`; `npm run lint`; `prettier --check` | GREEN: 48 passed | Implementation complete; gates green |
