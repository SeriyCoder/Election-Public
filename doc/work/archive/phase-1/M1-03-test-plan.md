# Test Plan — M1-03 Scenario Schema, Versioning And Import Validation

| Field | Value |
| --- | --- |
| item | M1-03 |
| memo | `doc/work/archive/phase-1/M1-03-memo.md` |
| created | 2026-10-28 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/schema.test.ts` | Vitest (node) | Valid scenario rebuild, unknown-field dropping, versioning, limits, IDs and references, field domains, totals, coalition pairs, JSON import |
| `src/engine/schema.ts` | — | Stub: types and constants real, both functions throw `not implemented` |

## Happy Path

- A complete version 1 scenario is accepted and rebuilt as a new, equal object.
- Sparse vote weights, duplicate tie-break order, an open group spanning blocks, a restricted group of unassigned parties, a majority override and a block-pair override are accepted.
- Valid JSON text imports to the same scenario.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Not owned here (no allocator). Seat-count domain: `rejects seat count ...`, `accepts one seat and the maximum seat count` |
| Determinism: repeated runs, JSON round trip, ru/en/he | `returns identical output on repeated validation`; `survives a JSON round trip unchanged`; locale is never consulted (scenario-level locale runs in M1-08) |
| Threshold below / at / above | Domain only: `rejects an out-of-range threshold`, `accepts boundary fraction ...`; qualification belongs to M1-05 |
| Exact remainder tie → tieBreakOrder → party ID | Preservation of tie data: `allows duplicate tie-break order values`, `rejects a non-integer tie-break order` |
| Fixtures from exact inputs | Fractions stay decimal strings: `does not normalize shares silently` |
| No float decisions | `decides the tolerance exactly at the boundary`; `accepts population shares within the 1e-9 tolerance` / `rejects ... outside the tolerance` (differences of 1e-10 decide) |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `rejects non-object root ...`; `rejects an empty destination list`; `rejects an empty weight map as an invalid total`; `accepts empty names ...` |
| Single element | `accepts one seat and the maximum seat count` |
| All values equal | `allows duplicate tie-break order values` |
| Maximum size (20 / 30 / 10) | Caps above the minimum: `accepts exactly the maximum number of parties`; `rejects more groups/parties/blocks than the limit`; `rejects an oversized pair list`; `measures the size limit in UTF-8 bytes` |
| No feasible solution | Rejections for every issue class, including `rejects malformed JSON` and `rejects a future schema version and stops` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Migration from older versions | Only version 1 exists |
| UI repair flows after a rejected import | M2-03 / M2-08 |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | `npx vitest run tests/engine/schema.test.ts` | RED: 110 failed | Every failure is `Error: not implemented` from the stub; type check and lint green |
| 2026-10-28 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check` | GREEN | 158 passed (110 schema) |
