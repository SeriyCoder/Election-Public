# Memo — M1-03 Scenario Schema, Versioning And Import Validation

| Field | Value |
| --- | --- |
| item | M1-03 |
| epic | M1 |
| phase | Phase 1 — M1 engine |
| status | closed |
| created | 2026-10-28 |
| closed | 2026-10-28 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

Every later engine module needs one trusted scenario shape. Untrusted JSON (imports, presets, later the UI store) must be turned into that shape or rejected with actionable, path-addressed errors, so vote, threshold, seat and coalition code never handles malformed, dangling or out-of-range data (Section 11, Section 12 "invalid totals, NaN and missing destinations produce actionable errors").

## Scope

**In scope**

- Types for the version 1 scenario: rules, groups, parties, blocks and coalition rules, as listed in Section 11.
- A pure validator from an unknown value to either a freshly rebuilt scenario or a list of issues `{path, code, message}`.
- A JSON text entry point enforcing the 2 MiB limit before parsing.
- Schema versioning: version 1 accepted, future versions rejected as unsupported.

**Out of scope**

- Calculating votes, thresholds, seats or coalitions (M1-04 to M1-07).
- Migration between schema versions (only version 1 exists).
- Application settings, saved comparisons and sweep requests (M2, M3).
- Default presets and UI repair flows (M1-08 fixtures, M2-03).

## Approach

**Shape.** The scenario keeps exact fractions as decimal strings, as the data contract requires (Section 11, Section 6.4); later modules parse them with the M1-02 rational module. Integers that are naturally integral (`seatCount`, `majorityOverride`, `tieBreakOrder`) are JSON numbers that must be safe integers. `populationTotal` is a positive decimal string. `majorityMode` is `default` or `override`; `majorityOverride` is null in default mode and an integer in 1..seatCount in override mode. `allocationMethod` is `hamilton`, the only method. `votingMode` is `restricted` or `open`. Parties carry `blockId` (null means unassigned), `tieBreakOrder` and `canJoinGovernment`. Coalition rules hold three lists of unordered party or block ID pairs: incompatible party pairs, incompatible block pairs (block defaults expanded later to member parties) and compatible party overrides that lift a block default.

**Validation, in order.** Version check first; then entity counts (groups at most 100, parties at most 100, blocks at most 50, each pair list at most 5000) before any per-entity work; then per-field checks; then cross-references and totals. All issues found are collected rather than stopping at the first, except that structural failures skip dependent checks.

- IDs match ASCII letters, digits, underscore and hyphen, 1 to 64 characters; unique within their kind; every reference resolves.
- Colors are `#RRGGBB`.
- Names are strings of at most 200 characters; notes at most 10000. Empty names are allowed so new entities can start empty (Section 5).
- Fractions (shares, turnout, valid-ballot rate, participation factor, threshold, weights) are decimal strings in the closed range 0 to 1.
- `populationShare` over all groups and `voteWeights` within each group sum to 1 within 1e-9, compared exactly as rationals. Totals are never normalized.
- `allowedPartyIds` is non-empty and duplicate-free; every `voteWeights` key is an allowed party. A restricted group's allowed parties must all share one `blockId` (all unassigned counts as one); an open group may span blocks (Section 4).
- Pairs have two distinct, existing IDs; an unordered pair may not repeat within a list; a party pair may not be both incompatible and an override.

**Output.** The validator builds a new object from known fields only. Unknown fields are dropped, so prototype keys and stray data never reach the engine. Maps are read with own-property checks.

**Rejected alternative:** a generic schema library (for example Zod); it adds a runtime dependency and still needs custom exact-decimal, sum and cross-reference rules, which make up most of the work.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario | Defined as schema version 1 with the Section 11 fields | Establishes version 1 |
| Rules, Group, Party, Block | Field types, domains and enums fixed as above | Version 1 |
| Coalition rules | Concrete field names: `incompatiblePartyPairs`, `incompatibleBlockPairs`, `compatiblePartyOverrides` | Version 1; Section 11 named them only loosely |

## Interface Delta

New engine module `schema` exporting the scenario types, the version constant, the entity limits, a scenario validator returning a discriminated result, and a JSON-text import function applying the size limit. No UI surface.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None calculated here. The validator guarantees inputs those paths rely on: fractions in range, totals within tolerance, safe-integer seat count and tie order, resolvable references |
| Where exact rationals are required | Range checks and the sum-to-one tolerance comparison use exact rationals; no float parsing of fractions |
| Ordering / tie rules relied on | `tieBreakOrder` preserved exactly as given (duplicates allowed; party ID resolves them in M1-06). Entity array order preserved |
| Any display rounding near a decision? | None |
| How determinism across runs, round trip and locale is proven | Output is rebuilt in a fixed field order from input order; tests assert a validated scenario survives a JSON round trip unchanged and that validation output is identical on repeat. Locale is never consulted |

## Files

| Path | Change |
| --- | --- |
| `src/engine/schema.ts` | Types, constants, validator and JSON import |
| `tests/engine/schema.test.ts` | Valid scenario, every rejection class, limits, round trip, unknown-field dropping |
| `doc/spec/elections-simulator.md` | Section 11: record the concrete field names, enums, ID and color rules, limits and the restricted-mode block rule |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

Approved 2026-10-28 under the user's standing instruction to run M1-02 through M1-08 autonomously; every recommendation is accepted as the decision.

1. Should a restricted group be required to keep all allowed parties in one block? — **Decision:** Yes. Section 4.1 describes restricted groups as voting within a configured set, "usually within one block", and Section 4 says switching modes surfaces invalid destinations; without a rule the mode would have no effect. All-unassigned counts as one block.
2. Are duplicate `tieBreakOrder` values allowed? — **Decision:** Yes. Section 6.3 resolves equal tie order by stable party ID, which implies duplicates are legal.
3. Are unknown fields an error or dropped? — **Decision:** Dropped. Later versions and exports of derived results (Section 11) may carry extra fields; dropping them keeps the engine input clean without blocking import.
4. Entity caps? — **Decision:** 100 groups, 100 parties, 50 blocks: five times the Section 5 minimum, small enough to bound work.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | Added issue codes `not-an-integer` and `inconsistent-majority` beyond the memo's examples | Distinguish non-integral numbers from wrong types and majority mode/value mismatches for actionable errors |
