# Memo — M2-11 Load All Four Section 8 Example Presets

| Field | Value |
| --- | --- |
| item | M2-11 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release, reopened for review fixes |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-29 |
| closed | 2026-10-29 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

Section 8 names four required example presets. The example menu offers only the
baseline plus two extra examples (open split, multi-party block). The other
three Section 8 rows — Group 3 turnout zero, Group 3 at a 7% final share and at
an 8% final share — exist only as engine test fixtures. A user cannot open
them, so the central lesson of Section 8.1 (turnout is not final vote share)
and the 8.2 corrections (two rival majorities at zero turnout, ten seats at 8%)
are not visible in the product.

## Scope

**In scope**

- Three new presets in the example menu, built from the baseline by changing
  only Group 3 turnout:
  - turnout zero: `0`;
  - 7% final share: 119/279 truncated to 18 decimals (`0.426523297491039426`);
  - 8% final share: 34/69 truncated to 18 decimals (`0.492753623188405797`).
- Menu order: the four Section 8 rows first, then the open-split and
  multi-block examples.
- Localized names in ru, en and he.
- Tests: each new preset reproduces its Section 8 seats, permitted pairs and
  status, in every language.

**Out of scope**

- A final-share target control (inverse solver): M4-03, on hold.
- Explanatory notes inside the preset scenarios: entity and scenario notes are
  M2-13; the preset name states the share, and the editor shows the turnout.

## Approach

`src/ui/presets.ts` gains three builders that take the baseline and replace
Group 3's turnout, the same way the open-split preset replaces one group. The
two truncated turnouts are string constants with a comment naming their exact
source (Section 8.1 inverse); the test recomputes them independently from
119/279 and 34/69 rather than reading the constants.

The 18-digit truncation is the scenario decimal limit. The engine fixtures
already prove every remainder decision in these two presets is far from the
truncation error, so the seats are exactly the Section 8 seats.

Each preset gets its own scenario `id` (`turnout-zero`, `share-7`, `share-8`)
so a saved baseline from one preset is distinguishable from another.

**Rejected alternative:** computing the turnout at load time from a target
share. That is the inverse solver (M4-03); a preset must be a plain input.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| None | New preset inputs only | None |

## Interface Delta

- `PresetId` adds `turnoutZero`, `share7`, `share8`; `PRESETS` order becomes
  baseline, turnoutZero, share7, share8, split, multiBlock.
- Three new translation keys `preset.turnoutZero`, `preset.share7`,
  `preset.share8`.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None in the engine. New inputs exercise all of them |
| Where exact rationals are required | Unchanged; the test checks the 7% and 8% presets' Group 3 share is within 1e-15 of 7/100 and 8/100 using exact rationals |
| Ordering / tie rules relied on | Persisted `tieBreakOrder` 1–4, unchanged from the baseline |
| Any display rounding near a decision? | No |
| How determinism across runs, round trip and locale is proven | Existing per-preset tests (same result in every language; JSON round trip) cover the new presets automatically; new tests check Section 8 seats and pairs |

## Files

| Path | Change |
| --- | --- |
| `src/ui/presets.ts` | Three builders, `PresetId`, `PRESETS` order |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Three preset names each |
| `tests/ui/store.test.ts` | Preset list expectation; Section 8 preset tests |
| `doc/spec/elections-simulator.md` | "As built in M2-11" note in Section 8 (at close) |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Where in the menu? — **Decision:** the four Section 8 rows first, in
   table order, then the two extra examples. The menu then reads like Section 8.
2. Default preset on start? — **Decision:** still the baseline.

Approved 2026-10-29 on the user's instruction: "vse eto nado s integriroval i realizovat".

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
