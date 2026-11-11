# Memo — M1-02 Exact Rational Arithmetic

| Field | Value |
| --- | --- |
| item | M1-02 |
| epic | M1 |
| phase | Phase 1 — M1 engine |
| status | closed |
| created | 2026-10-28 |
| closed | 2026-10-28 |

## Problem

The engine needs a shared exact arithmetic foundation before votes, thresholds or seats can be calculated. Implement a normalized rational module and decimal-string parsing so every later electoral decision can avoid binary floating-point approximations.

## Scope

**In scope**

- Add a pure rational type backed by `BigInt` numerator and denominator, normalized by GCD with a positive denominator and one canonical representation for zero.
- Provide exact addition, subtraction, multiplication, division, comparison and mathematical floor operations.
- Parse bounded base-10 decimal strings exactly, with explicit rejection of malformed or out-of-bound inputs.
- Test normalization, arithmetic, comparison boundaries, floor behavior, parsing, invalid inputs and exactness without floating-point decisions.
- Clarify Section 6.4’s exact input contract if the approved decision requires decimal strings rather than JavaScript numbers at the engine boundary.

**Out of scope**

- Votes, threshold qualification, quota allocation, remainder-seat distribution and coalitions; these are handled by later M1 items.
- Scenario schema, versioning, import validation and numeric-field domain limits; these belong to M1-03.
- UI number entry, locale formatting and conversion of rational results for display.

## Approach

Keep the module pure and independent of UI, DOM, locale and I/O. Normalize every rational at construction so equivalent values have one representation, reject zero denominators and division by zero, and use integer cross-products for exact comparison. Implement mathematical floor rather than relying on truncating integer division for negative values. Parse ordinary decimal notation directly into a rational: permit an optional leading minus and a decimal point, require digits on both sides when the point is present, and reject a leading plus, exponent notation, whitespace and grouping separators. Do not make a floating-point conversion part of the decision path. The recommendation is to cap the decimal input at 18 fractional places and 128 characters total, while leaving field-specific value ranges to schema validation. Section 6.4 currently permits finite numbers as well as strings; a JavaScript number may have lost the user's original decimal token, so the exact engine boundary should use strings unless the original JSON number text is preserved before parsing.

**Rejected alternative:** Use `number` for intermediate values and round near comparisons; this cannot guarantee exact threshold boundaries, quota floors or remainder ties.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Rational engine values | Add an internal exact numeric representation; no scenario entity or persisted field is introduced. | None in this item; scenario schema and import rules remain M1-03. |
| Decimal input contract | Clarify whether exact engine inputs must be decimal strings rather than parsed JavaScript numbers. | No schema version change planned; preserve the decision in the specification. |

## Interface Delta

Add an internal engine module exposing normalized rational construction, decimal-string parsing, exact arithmetic, comparison and floor operations. No UI, export format or scenario-schema interface is added.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | The foundational exact arithmetic, comparison and floor operations used by all those paths. This item does not implement any allocation or coalition behavior. |
| Where exact rationals are required | Every operation and comparison in the module; no binary floating-point conversion may affect parsing, equality, ordering or floor decisions. |
| Ordering / tie rules relied on | Rational comparison must be exact and locale-independent. Equality identifies an exact remainder tie; persisted party order and stable party ID remain the responsibility of the later allocation item. |
| Any display rounding near a decision? | None. The module does not format display values; rounding remains downstream of every decision. |
| How determinism across runs, round trip and locale is proven | Canonical GCD normalization, positive denominators, `BigInt` operations and an ASCII decimal grammar produce stable values independent of locale. Tests should repeat exact fixtures and verify decimal-string preservation through a JSON string round trip; end-to-end seat-result and locale determinism remain covered by later allocation and fixture items. |

Exact seat totals and persisted seat-tie behavior are not directly affected because this item adds rational primitives but no seat allocator; those integration properties must be tested by the later allocation and fixture items.

## Files

| Path | Change |
| --- | --- |
| `src/engine/rational.ts` | Add the pure normalized rational representation, arithmetic, comparison, floor and exact decimal-string parser. |
| `tests/engine/rational.test.ts` | Add exact arithmetic, parser, boundary, invalid-input and generated-property tests. |
| `doc/spec/elections-simulator.md` | Clarify the exact decimal input boundary and parser limits if the string-only recommendation is accepted. |

## Definition of Done

- [x] Tests are written first and fail for the intended missing rational behavior
- [x] Exact arithmetic, normalization, division/floor boundaries and decimal parsing are covered, including invalid input and generated properties
- [x] Mandatory seat-calculation correctness tests are present where applicable; allocation and scenario-level checks remain assigned to their later owning items
- [x] Suite, type check and lint are green
- [x] No electoral decision uses floating-point arithmetic
- [x] Specification and project brief are synchronized
- [x] Deviations are recorded

## Open Questions

Approved 2026-10-28 under the user's standing instruction to run M1-02 through M1-08 autonomously; every recommendation is accepted as the decision.

1. Should the exact engine input API accept decimal strings only, with Section 6.4 clarified to reject already-parsed JavaScript numbers for exact decisions? — **Decision:** Yes. A JavaScript number cannot retain every original decimal token, while the simulator requires exact decimal intent.
2. Should the parser accept at most 18 fractional digits and 128 total characters, rejecting exponent notation, whitespace and grouping separators? — **Decision:** Yes. This gives precision finer than the documented input-sum tolerance while bounding parser work; field-specific ranges remain the schema validator's responsibility.
3. Should M1-02 test rational-level exactness now and leave seat-total, persisted tie-order and scenario/locale determinism assertions to the allocator and fixture items? — **Decision:** Yes. Those integration behaviors do not exist yet, and adding them here would exceed the rational-module scope.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | Added `tests/vite-env.d.ts` (one-line Vite client type reference) | The source-scan test reads engine source via Vite `?raw`; using `node:fs` would require `@types/node` and expose Node types to `src/engine/`. Test-only file |
| /4-close | Synced `.github/copilot-instructions.md` current-state line and repository map; spec header status and Section 13 intro | Stale "no application yet" text contradicted the existing engine |
