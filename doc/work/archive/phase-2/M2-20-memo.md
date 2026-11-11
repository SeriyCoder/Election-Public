# Memo — M2-20 Time Model In The Engine

| Field | Value |
| --- | --- |
| item | M2-20 |
| epic | M2 |
| phase | Phase 2 — M2 reopened for the questionnaire, time model and Israeli example |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-30 |
| closed | 2026-10-30 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

The model is static: a group has one population share and one turnout, so the
simulator cannot answer the question of requirement text (b) — what happens to
votes and seats if a group grows or its turnout drifts over the years. It also
cannot say who makes up a party's or a block's electorate, which texts (a) and
(c) ask for as the "Блоки" screen and the inverse "Кто составляет электорат
этой партии?" view. Both are arithmetic, so they belong in the engine before
any view shows them (spec Section 14.2).

## Scope

**In scope**

- Schema version 2: optional group fields `growthRate` and `turnoutChange`,
  decimal strings in [−1, 1], absent read as `0`; version 1 accepted and
  migrated; the validator returns version 2; versions above 2 refused.
- Votes for a year k, an integer 0–20, by the Section 14.2 formulas; seats
  for a year through the same threshold and allocation; year 0 byte-identical
  to today.
- Exact integer power of a rational.
- Electorate composition of a party or a block on two bases: potential
  supporters and valid votes.
- Presets and new groups written as version 2 with both fields `0`.

**Out of scope** (at least two)

- Views and editor controls for growth, turnout change and composition —
  M2-21.
- A projection horizon stored in the scenario — rejected in Section 14.1; the
  year is a view setting (M2-21).
- Coalition search for a future year — not requested; M2-21 shows votes and
  seats only.
- Nested subgroups — M6-04.

## Approach

`computeVotes` takes an optional year (default 0). Per group it scales the
year-0 population by (1 + r)^k and replaces turnout by t + k·δ clamped to
[0, 1]; everything after that is the present code path unchanged. `runSeats`
passes the year through. A year that is not an integer 0–20 is refused with a
range error, because only validated input reaches the engine and the year is
a caller parameter. The schema reads both new fields with a new signed bound
[−1, 1], places them after `populationShare` and after `turnout` respectively
in the validated group, and accepts `schemaVersion` 1 or 2. A new pure module
`composition` takes a scenario, its vote result and a target (party or block
ID) and returns one row per group with the amount and the share of the
target's total, the share undefined when the total is zero. Potential
supporters are population × weight; valid votes are the existing
contributions. For a block the amounts of its parties are summed.

**Rejected alternative:** projecting a year by writing a new scenario with
recomputed shares and turnouts — projected shares are not finite decimals
(660/1060), so they could not be stored as decimal strings without rounding,
which would break exactness.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| `schemaVersion` | 2; 1 accepted and migrated | Bumped to 2 |
| Group `growthRate` | New, optional, decimal string in [−1, 1], default `0`, after `populationShare` | Version 2 |
| Group `turnoutChange` | New, optional, decimal string in [−1, 1], default `0`, after `turnout` | Version 2 |
| `LIMITS.projectionYears` | New constant 20 | None |

## Interface Delta

- `computeVotes(scenario, year?)` and `runSeats(scenario, year?)`: optional
  year, default 0.
- `rational`: integer power.
- New module `src/engine/composition.ts`: electorate composition by target and
  basis.
- Export files become version 2 and carry both new group fields.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | Votes only: group population and turnout for year k. Threshold, quota, remainders, ties and coalitions are unchanged and receive the year-k votes |
| Where exact rationals are required | Growth power, turnout shift and clamp, composition shares |
| Ordering / tie rules relied on | Unchanged |
| Any display rounding near a decision? | No; composition shares are display values only |
| How determinism across runs, round trip and locale is proven | Year 0 result bytes equal the present bytes for every Section 8 fixture; year-k results byte-identical across repeated runs and after a JSON round trip of a version 2 file; the Section 14.2 fixtures in exact fractions; a property test that every year-k allocation sums to `seatCount` |

## Files

| Path | Change |
| --- | --- |
| `src/engine/schema.ts` | Version 2, migration, two group fields, signed bound, projection-year limit |
| `src/engine/rational.ts` | Integer power |
| `src/engine/votes.ts` | Optional year |
| `src/engine/run.ts` | Optional year on `runSeats` |
| `src/engine/composition.ts` | New |
| `src/engine/edit.ts` | New groups carry both fields `0` |
| `src/ui/presets.ts` | Version 2, both fields `0` |
| `tests/engine/schema.test.ts`, `votes.test.ts`, `run.test.ts`, `rational.test.ts`, `edit.test.ts`, `fixtures.test.ts` | Version 2, migration, year and power tests |
| `tests/engine/composition.test.ts` | New |
| `tests/engine/helpers/scenarios.ts` | Version 2 builder |
| `tests/ui/store.test.ts`, `fileTransfer.test.ts` | Unsupported version is now 3 |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Should version 1 files keep importing? — **Recommendation:** yes, migrated
   with zero growth and zero turnout change, as text (b) requires.
2. Range of `growthRate`? — **Recommendation:** [−1, 1] a year: −100% empties
   a group; more than doubling a year is outside an educational model.
3. Where does the projection year live? — **Recommendation:** in the view
   (Section 14.1), so a scenario file stays one set of present-day inputs.

Approved 2026-10-30 on the user's instruction for an autonomous run: "izuchi
vnedrenie, vizualizaion i implement vse eto, do nachala M2" (2026-10-30), in
autopilot mode; the recommendations above are the decisions.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | Year, fixture and property tests live in a new `tests/engine/projection.test.ts`; `votes.test.ts`, `run.test.ts` and `fixtures.test.ts` are unchanged | One file holds the Section 14.2 contract; the existing files keep passing on the version 2 helpers, which proves year 0 unchanged |
| /2-tests | `tests/ui/store.test.ts` also checks that every preset is version 2 with both fields `0` | The memo lists the preset change; this is its test |
| /3-implement | `votes.ts` exports `checkYear`; `rational.pow` refuses exponents above 1000 | One year check shared by votes and later callers; a cap keeps a bad caller from building huge integers |
| /3-implement | `electorateComposition` takes the vote result of the year shown instead of computing it | The view already has that result; computing it twice would double the work for every selection |
