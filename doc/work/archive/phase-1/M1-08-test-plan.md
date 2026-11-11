# Test Plan — M1-08 Section 8 Fixtures And Determinism Suite

| Field | Value |
| --- | --- |
| item | M1-08 |
| memo | `doc/work/archive/phase-1/M1-08-memo.md` |
| created | 2026-10-28 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/fixtures.test.ts` | Vitest (node) | Four Section 8 fixtures, truncation safety, 7% / 8% / 50% shares, canonical JSON, repeated runs, round trip, ru / en / he locale runs, locale trap, engine-wide static scan |
| `src/engine/run.ts` | — | Stub: result type real, `runScenario` and `serializeResult` throw `not implemented` |

## Happy Path

- Each Section 8 preset reproduces its seats and permitted majority pairs through the single pipeline entry point.
- The canonical JSON prints exact fractions, for example the P1 baseline quota `228/5`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Owned by M1-06 (`always allocates exactly seatCount seats by the Hamilton rule`); fixtures re-check the four presets |
| Determinism: repeated runs, JSON round trip, ru/en/he | `$name is byte-identical across repeated runs`; `... after a scenario JSON round trip`; `... under ru, en and he locales`; `$name never calls a locale-sensitive API` |
| Threshold below / at / above | Owned by M1-05 |
| Exact remainder tie → tieBreakOrder → party ID | Owned by M1-06 |
| Fixtures from exact inputs | Baseline and zero turnout exact; 7% / 8% use 18-digit truncations of 119/279 and 34/69 with `keeps every remainder decision far from the truncation error` |
| No float decisions | `scans every engine source for floating-point and locale tokens` |

## Section 12 [M1] Traceability

| Section 12 check | Test |
| --- | --- |
| Four Section 8 fixtures: seats and pairs | `fixtures.test.ts`: `$name reproduces seats and permitted pairs` |
| Byte-identical JSON: runs, round trip, locales | `fixtures.test.ts`: `determinism` block |
| 50% Group 3 turnout gives ≈ 8.108108% | `gives exactly 3/37 final share at 50% Group 3 turnout` |
| Manual 60 / 30 / 10 split; preferences do not change turnout or valid votes | `votes.test.ts`: `sends exactly 60/30/10 of the valid votes to the selected parties` |
| Restricted groups cannot reach forbidden destinations; open group may split across blocks | `schema.test.ts`: `rejects a weight for a party outside the allowed set`, `rejects a restricted group spanning blocks`; `votes.test.ts`: `lets an open group split between opposing blocks` |
| Exact `seatCount` seats including ties and odd sizes; property test | `allocate.test.ts`: `always allocates exactly seatCount seats by the Hamilton rule`, tie tests |
| Threshold below / at / above; no block rescue; zero-vote parties | `threshold.test.ts` boundary tests and `never lets a block total rescue its members`; `allocate.test.ts`: `never gives a zero-vote party a remainder seat` |
| No-allocation states; invalid totals, NaN, missing destinations | `threshold.test.ts` no-allocation tests; `schema.test.ts`: `rejects vote weights not summing to one`, NaN fraction cases, `rejects an empty destination list` |
| Coalition search matches exhaustive enumeration; minimal, forbidden, incomplete | `coalitions.test.ts`: `matches exhaustive enumeration on seeded small fixtures`, evaluation and bounded-search tests |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | Zero Group 3 turnout fixture (a cohort with no votes) |
| Single element | Not applicable to fixtures; owned by M1-06 and M1-07 |
| All values equal | Not applicable to fixtures |
| Maximum size (20 / 30 / 10) | Owned by M1-06 property test and M1-07 bound tests |
| No feasible solution | Baseline fixture: `deadlock` with a complete search |

Additional: `restores the patched built-ins` guards the locale harness itself.

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Exact 7% inverse turnout | M3 inverse solver |
| Result snapshots on disk | Rejected in the memo; explicit assertions plus byte equality |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | `npx vitest run tests/engine/fixtures.test.ts` | RED: 26 failed, 2 passed | All failures `Error: not implemented`; harness-restore and static-scan tests pass. Type check and lint green |
| 2026-10-28 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check` | GREEN | 274 passed (28 fixtures); M1 complete |
