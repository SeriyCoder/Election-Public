# Memo — M2-04 Preference Editor: Restricted And Open Modes, Explicit Rebalance

| Field | Value |
| --- | --- |
| item | M2-04 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release |
| status | closed |
| created | 2026-10-28 |
| closed | 2026-10-28 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

The editor can rename and restructure entities (M2-03) but cannot change any
number. Section 5 requires editing population shares, group turnout,
valid-ballot rates and vote destinations, and changing parliament size,
majority rule and threshold. Section 4 requires both voting models: a
restricted group splits votes only among its allowed parties; an open group
distributes `voteWeights` over its allowed parties, summing to 100%. Switching
modes surfaces invalid destinations and never discards votes silently. Section
5 also requires number inputs alongside sliders, an error when a total is
invalid, and an explicit proportional rebalance that adjusts unlocked rows and
preserves locked rows, never normalizing as the user types. M2-03 decision 4
moved the rules fields here.

## Scope

**In scope**

- Percent entry for every fraction field: population share, turnout,
  valid-ballot rate, participation factor, vote weights, threshold. A text
  field (exact) plus a range slider for share, turnout and weights.
- Per group: voting mode switch, allowed-party checkboxes, a weight per
  allowed party, the weight total and its validity, a lock per weight row and
  a rebalance command for weights.
- Groups section: the population-share total, a lock per group share and a
  rebalance command for shares.
- Rules section: seat count, population total, majority mode and override,
  threshold. Allocation method is shown, not editable (only Hamilton exists).
- Exact conversions between percent text and fraction strings, exact totals and
  the rebalance computation, all in the engine.
- New strings in ru, en and he.

**Out of scope**

- Party/block turnout shortcut and block-level bulk edit (Section 5, optional)
  — later item if feedback asks for it.
- Coalition pair editing — M2-06.
- Sweeps and the inverse solver — M4.
- Persisting locks in the scenario or export — see decision 2.

## Approach

**Engine: new `numeric` module** (pure, exact):

| Function | Behaviour |
| --- | --- |
| Percent to fraction | Accepts a plain decimal with `.` or `,`, optional surrounding spaces, at most 16 fractional digits; divides by 100 exactly and returns the canonical decimal string. Anything else returns no value |
| Fraction to percent | Multiplies a valid decimal string by 100 and returns the canonical decimal string; invalid input returns no value |
| Sum of fractions | Exact sum of decimal strings as a canonical string; no value when any entry is invalid |
| Count from text | Digits only, 1–5 digits, no leading zero; returns an integer or no value |
| Rebalance | Inputs: rows (key, current fraction, locked flag) and a target total (1). Locked rows keep their values. The remaining amount (target minus locked sum) is split over unlocked rows in proportion to their current values, or equally when all unlocked values are zero. Results are rounded to 18 decimal places by largest remainder (ties by row order) so the total is exactly the target. Returns no value when the locked sum exceeds the target, when no row is unlocked, or when any value is invalid |

**Engine: `edit` additions** — set a group fraction field, set voting mode,
allow or disallow a party for a group, set a party's weight in a group, set a
rule field. Allowing a party adds it with weight 0. Disallowing removes the ID
and its weight; the weight total then shows the gap. Mode switch changes only
the mode; validation reports cross-block destinations of a restricted group.
Setters store canonical values for parseable text and the raw text otherwise,
so validation shows the problem instead of the edit being dropped.

**Store.** UI state gains a list of lock keys (share of a group; weight of a
party in a group). Actions: toggle a lock, rebalance shares, rebalance weights
of one group. A rebalance that the engine refuses leaves the input unchanged;
the UI disables the button with the reason shown. Loading a preset or setting
a new input clears locks; deleting an entity drops locks naming it.

**UI.** A percent field component keeps the text the user is typing while it
still converts to the stored value, so typing `0.0` or `12,` is not rewritten
under the cursor; when the stored value changes from elsewhere (rebalance,
preset) the field shows the new value. Each group row gains a collapsible
details panel: fractions, mode, destinations list (checkbox, weight field,
slider, lock), total with a validity mark, rebalance button. The groups section
shows the share total, share locks and its rebalance button. A rules section
precedes the entity sections. Numbers in fields are plain ASCII digits in every
locale; totals use the existing locale formatter.

**Rejected alternative:** silent normalization on every keystroke. The spec
forbids it, and it makes exact entry impossible.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| UI state | Adds lock keys | None |
| Scenario | None; edits produce schema-version-1 drafts | None |

## Interface Delta

- Editor: rules section; per-group details panel; share total, locks and
  rebalance in the groups section.
- New engine module `numeric`; the UI import allowlist grows by it.
- Store: `locks`, `toggleLock`, `rebalanceShares`, `rebalanceWeights`.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None in the calculation; only input editing. Rebalance computes new input fractions |
| Where exact rationals are required | Percent conversion, totals, rebalance shares and rounding |
| Ordering / tie rules relied on | Rebalance rounding ties go to the earlier row; deterministic |
| Any display rounding near a decision? | No; fields show exact values, totals are exact |
| How determinism across runs, round trip and locale is proven | Weights entered through the editor (60/30/10) give the same seats as the split preset; rebalance output sums to exactly 1 and is identical across runs; percent round trip is exact; seats do not depend on the UI language |

## Files

| Path | Change |
| --- | --- |
| `src/engine/numeric.ts` | New: percent conversion, totals, count parsing, rebalance |
| `src/engine/edit.ts` | Group fraction, mode, allowed party, weight and rule setters |
| `src/ui/store.ts` | Locks and rebalance actions |
| `src/ui/PercentField.tsx` | New: exact percent text field with optional slider |
| `src/ui/Editor.tsx` | Rules section, group details panel, totals, locks, rebalance |
| `src/ui/styles.css` | Panel, field and destination list layout |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Field, mode, total, lock and rebalance strings |
| `tests/engine/numeric.test.ts` | New: conversions, totals, counts, rebalance |
| `tests/engine/edit.test.ts` | New setters |
| `tests/ui/store.test.ts` | Locks, rebalance actions, allowlist adds `numeric` |
| `tests/ui/editor.test.tsx` | Rules section, group panel markup, totals, disabled rebalance |

## Definition of Done

- [x] Every fraction field and rule is editable; values stored exactly.
- [x] Restricted and open modes editable; invalid destinations shown, nothing
      discarded silently.
- [x] Rebalance of shares and weights preserves locked rows and sums to exactly
      100%; refused cases leave input unchanged and are explained.
- [x] Editor 60/30/10 split reproduces the split preset seats.
- [x] Suite, type check, lint, format and build green.

## Open Questions

Approved autonomously under the user's instruction "samostoyatelno rzreshaju
approve doiti do M3-01, esli nuzhno delai audit. takzhe po hodu posle kazdogo
zakonchenogo Phase delai local commit".

1. How is unparseable text handled? — **Decision:** stored raw so validation
   shows it; nothing is dropped.
2. Are locks saved with the scenario? — **Decision:** no; UI state only. The
   schema stays at version 1 and exports are unaffected.
3. Rebalance precision. — **Decision:** 18 decimal places, largest remainder,
   ties by row order, equal split when all unlocked rows are zero.
4. Rules scope. — **Decision:** seat count, population total, majority mode
   and override, threshold; allocation method read-only.
5. Disallowing a weighted party. — **Decision:** removes it and its weight; the
   total shows the gap and rebalance can repair it.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | `PercentField.tsx` exports a generic `ValueField` with percent, count and decimal codecs; the rules section reuses it. Sliders are rendered by the Editor next to the field rather than inside it | One local-text mechanism for every numeric field avoids a second component for counts; the slider needs no typing state |
| /3-implement | Removed a duplicated `issueCodes` helper from `tests/engine/edit.test.ts` | Test-writing slip that broke the file's type check; no assertion changed |
