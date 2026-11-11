# Memo — M1-08 Section 8 Fixtures And Determinism Suite

| Field | Value |
| --- | --- |
| item | M1-08 |
| epic | M1 |
| phase | Phase 1 — M1 engine |
| status | closed |
| created | 2026-10-28 |
| closed | 2026-10-28 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

The M1 engine is complete only when the Section 12 [M1] acceptance checks pass end to end: all four Section 8 presets reproduce their seats and permitted majority pairs, and each yields byte-identical result JSON across repeated runs, after a scenario JSON round trip and under every UI locale. There is no single pipeline entry point and no canonical result serialization yet, so "byte-identical" cannot be stated.

## Scope

**In scope**

- One engine entry point that runs votes, threshold, allocation and coalition analysis for a validated scenario.
- A canonical result serialization: fixed key order, rationals as exact fraction strings, no whitespace variance.
- The four Section 8 fixtures: baseline, Group 3 turnout zero, Group 3 final share 7% and 8%, with their seats and permitted pairs.
- The 50% Group 3 turnout final-share check.
- Determinism: repeated runs, scenario JSON round trip, ru / en / he locale runs, and a runtime trap proving the engine calls no locale-sensitive API.
- A static scan of every engine source file for floating-point and locale tokens.
- A traceability table in the test plan mapping each Section 12 [M1] check to its test.

**Out of scope**

- The inverse final-share solver (M3); the 7% and 8% fixtures use turnouts computed in the test.
- Presets as shipped application data (M2 adds the preset library).
- Web Worker and interface wiring (M2).

## Approach

Add a run module whose function takes a validated scenario and an optional coalition node budget and returns the four stage results together. A serializer converts the result to JSON: every exact rational becomes its fraction string, every other value is emitted as is, and object keys follow the construction order of the engine, which is fixed by the code. Serialization is a pure function of the result, so byte equality of two serializations is equality of results.

The 7% and 8% presets need a Group 3 turnout of 119/279 and 34/69 respectively (Section 8.1 with s = 7% and 8%). Scenario fractions are terminating decimals with at most 18 digits, so the test truncates each to 18 decimal places with exact integer arithmetic. The resulting final shares differ from 7% and 8% by less than 10^-17, and the test asserts that every Hamilton remainder decision in those presets has a margin far larger than that, so the truncation cannot change a seat. The baseline and zero-turnout fixtures are exact.

Locale runs replace the locale-sensitive built-ins (number formatting, string collation, the Intl collator and number formatter) with versions bound to ru, en or he for the duration of the run, and compare bytes against the unpatched run. A final trap run replaces them with functions that throw, proving the engine never calls them. All patches are restored in a finally block.

**Rejected alternative:** snapshot files of the full result JSON. They would prove stability but not correctness, and would need regeneration on every intentional change; explicit seat and pair assertions plus byte-equality between runs carry the same guarantee with less maintenance.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| — | None; results are derived | None |

## Interface Delta

New engine module `run` exporting the pipeline function (scenario and options to a result holding votes, threshold, allocation and coalitions) and the canonical serializer (result to JSON text).

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | All, end to end; no new arithmetic |
| Where exact rationals are required | Unchanged; the serializer prints them as exact fractions, never decimals |
| Ordering / tie rules relied on | Those of M1-06 and M1-07; key order fixed by construction |
| Any display rounding near a decision? | None; the 18-digit turnout truncation is input precision, checked against remainder margins |
| How determinism across runs, round trip and locale is proven | Byte equality of serialized results across repeated runs, JSON round trip, three locale-bound runs and a throwing trap run; static scan of all engine files |

## Files

| Path | Change |
| --- | --- |
| `src/engine/run.ts` | Pipeline entry point and canonical result serializer |
| `tests/engine/fixtures.test.ts` | Four Section 8 fixtures, 50% turnout share, determinism suite, engine-wide static scan |
| `doc/spec/elections-simulator.md` | Section 12 or 13: name the run entry point and canonical serialization; note the 18-digit fixture turnouts |
| `.github/copilot-instructions.md` | Current state: M1 engine complete |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

Approved 2026-10-28 under the user's standing instruction to run M1-02 through M1-08 autonomously; every recommendation is accepted as the decision.

1. Should the serialized result include the scenario? — **Decision:** No. The result is derived; including the input would make byte equality after a round trip depend on input normalization rather than on calculation.
2. How are the 7% and 8% turnouts represented? — **Decision:** 18-digit truncated decimals computed in the test, with a remainder-margin assertion; the exact rational inverse arrives with the M3 solver.
3. Does the static scan replace the per-module scans? — **Decision:** No; it adds coverage for every current and future engine file, while the per-module scans stay as local guards.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| 3-implement | Harness self-test extended to prove the trap and locale binding are installed | Without it the locale tests could pass vacuously |
