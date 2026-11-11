# Memo — M2-28 Fixed rules

| Field | Value |
| --- | --- |
| item | M2-28 |
| epic | M2 |
| phase | Phase 2 — M2 reopened for second-review corrections |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-30 |
| closed | 2026-10-30 |

## Problem

The rules column of the editor offers settings the user never wants to touch
and sees as noise: a majority choice (simple majority or a custom seat count)
and a read-only "allocation method: Hamilton" row, repeated as "Method" in the
results summary. A coalition always needs more than half of the seats. Each
group also carries its own valid-ballot rate, a field the user calls one common
figure for everyone that should not be simulated: fixed at 99.9%, hidden, with
a note that 0.1% of ballots are assumed invalid for every party. Finally the
user asked whether «Население» counts everyone with the right to vote; it does
(Section 6.1: the full eligible population, voters and non-voters), but the
label does not say so.

## Scope

**In scope**

- Editor rules: the majority fieldset is shown only while the scenario's
  `majorityMode` is `override` (an imported or older file), unchanged, so the
  user can switch it back; once it is `default` the fieldset disappears. A
  fixed line says that a majority needs more than half of the seats.
- Editor rules: the method row is removed. The results summary loses its
  "Method" row; the majority row stays, with its overridden mark.
- One constant for the standard valid-ballot rate, 99.9% (`'0.999'`), in
  `src/engine/edit.ts`, with an exact check `isStandardValidity(value)`. New
  groups, all seven presets and the questionnaire build use it.
- Group panel: the valid-ballot field and slider are hidden while the group's
  rate is exactly 99.9%; for any other value (an imported or older file) they
  are shown as now, so the value stays visible and editable.
- The assumption is written twice: a line in the editor rules, and a line under
  the results summary while every group is at 99.9% — «Предполагается, что
  0,1% бюллетеней недействительны — одинаково у всех групп и партий».
- Labels: `rules.populationTotal` «Избиратели с правом голоса»;
  `summary.population` and `compare.total.population` «Имеют право голоса»
  (en "Eligible voters", he «בעלי זכות בחירה»). The removed strings
  `rules.method`, `rules.method.hamilton` and `summary.method` leave all three
  tables.
- Spec Sections 5, 6.1, 6.3 and 8 say what is fixed and what imports keep.

**Out of scope** (at least two)

- The file format: `majorityMode`, `majorityOverride`, `allocationMethod` and
  `validBallotRate` stay in schema version 2, and an imported file keeps its
  values. Removing them would refuse existing files for no gain.
- The Hamilton calculation table in the seat results stays: it explains how
  the seats came out, it is not a setting.
- The participation factor field stays; the user did not ask about it.
- Party-first editing of the voters in the editor: M6-07.

## Approach

Rules (Section 6.3): `majorityRequired` already gives more than half for
`default`; nothing changes in the engine. `RulesSection` renders the majority
fieldset only when `rules.majorityMode === 'override'`, and in every case the
fixed majority line and the validity line. The method row goes.

Validity (Section 6.1): `STANDARD_VALID_BALLOT_RATE` and
`isStandardValidity(value: unknown): boolean` live in `edit.ts` beside the new
entity defaults; the check parses the decimal string and compares it with
999/1000 exactly, so `'0.9990'` counts and an unreadable value does not.
`newEntity('group')`, the preset builders and the questionnaire skeleton take
the constant. `GroupPanel` filters `validBallotRate` out of the fraction fields
when the check holds. `Results` receives one more prop, whether every group is
standard (computed in `App` with the engine check), and shows the note under
the summary.

A uniform validity multiplies every group's valid ballots, and so every party's
votes, by the same exact factor. Vote shares, threshold qualification and Hamilton
quotas are ratios of those votes, so they do not change; only the vote counts
shown drop by 0.1%.

**Rejected alternative:** dropping `validBallotRate` from the schema with a
version 3 migration. It would refuse or rewrite every existing file to remove
a field that hiding already removes from view.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| New group, presets, questionnaire build: `validBallotRate` | `'1'` → `'0.999'` | None; the field and its range are unchanged |
| `rules.majorityMode`, `majorityOverride`, `allocationMethod` | Unchanged; the editor no longer offers them for a default scenario | None |

## Interface Delta

- `src/engine/edit.ts`: new `STANDARD_VALID_BALLOT_RATE` and
  `isStandardValidity`.
- Editor rules: majority fieldset only for `override`; method row removed; two
  fixed lines (majority, validity).
- Group panel: validity field only for a non-standard rate.
- Results summary: method row removed; validity note while every group is
  standard; `ResultsProps` gains `standardValidity: boolean`.
- Strings: new `rules.majority.fixed` and `validity.note`; removed
  `rules.method`, `rules.method.hamilton`, `summary.method`; three labels
  reworded.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | Votes only through the input value: presets, new groups and the questionnaire now carry validity 999/1000 instead of 1. No engine formula changes |
| Where exact rationals are required | `isStandardValidity` compares the parsed rational with 999/1000; votes stay exact (Section 6.4) |
| Ordering / tie rules relied on | Unchanged. Quotas are ratios of votes, so a uniform factor leaves every remainder as it was and the tie order meets the same ties |
| Any display rounding near a decision? | No. The hidden field and the note are display only; the majority is still `majorityRequired` |
| How determinism across runs, round trip and locale is proven | A seeded property test: random scenarios with every group at 100% and at 99.9% give equal vote shares, qualification, quotas, seats and coalition analyses, and valid votes exactly 999/1000 of each other; every preset gives the Section 8 and Section 14.4 seats; the questionnaire example builds the same seats as before |

## Files

| Path | Change |
| --- | --- |
| `src/engine/edit.ts` | Constant, exact check, new group default |
| `src/ui/presets.ts` | Seven presets at 99.9% |
| `src/ui/book.ts` | Questionnaire skeleton at 99.9% |
| `src/ui/Editor.tsx` | Rules: majority only for override, method removed, two fixed lines; group panel validity only when non-standard |
| `src/ui/Results.tsx` | Method row removed; validity note; new prop |
| `src/ui/App.tsx` | Passes the standard-validity flag to the seat results |
| `src/ui/styles.css` | Only if the notes need a style |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Two new strings, three removed, three reworded |
| `tests/engine/validity.test.ts` | New: the constant, the exact check, the uniform-validity property test, preset seats |
| `tests/engine/edit.test.ts` | New group default |
| `tests/ui/editor.test.tsx` | Rules and group panel rendering |
| `tests/ui/results.test.tsx` | Summary rows and the note |
| `tests/ui/presets.test.ts`, `tests/ui/book.test.ts`, `tests/ui/store.test.ts` | Validity of presets and builds; changed vote counts where pinned |
| `tests/e2e/*.spec.ts` | Only where a pinned vote count or label changes |
| `doc/spec/elections-simulator.md` | At close: Sections 5, 6.1, 6.3, 8 |
| `.github/copilot-instructions.md` | At close: `edit.ts` entry in the repository map |
| `doc/backlog.md`, `doc/work/STATUS.md` | Loop bookkeeping |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. An imported scenario with a custom majority: the control appears only then,
   so it can be switched back. — **Recommendation:** yes; hiding it there
   would leave a setting the user cannot see or undo.
2. Presets move to 99.9%: valid votes of the baseline become 999 000 instead
   of 1 000 000; shares and seats do not change. — **Recommendation:** yes, so
   the note is true for every scenario the app makes.
3. The Hamilton table of the seat results stays. — **Recommendation:** yes;
   the request was about the setting, and the table is the explanation of the
   result.
4. Label of the population field. — **Recommendation:** «Избиратели с правом
   голоса» in the editor, «Имеют право голоса» in the result totals.
5. The results note only while every group is at 99.9%. —
   **Recommendation:** yes; an imported file with other rates would make it
   untrue.

Approved 2026-10-30 on the user's request: "Vopros pro Gamilton nuzhno ubrat ,
skrit, vsegda koalicija eto polovina +1, tozhe skrit, eto ne nuzho …
Distvitelnie billjuteni eto obshii pokazatel dlja vseh i ediniy, ya by ne stal
ego simulirovat skril kak 99.9%, napisat gde to chot predpolagaetsa chto 0.1%
biljutenei u vseh partih ne deistvitelna" (2026-10-30), in autopilot mode; the
recommendations above are the decisions.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| `/3-implement` | The fixed-majority line shows only while the majority mode is default, not in every case | With an imported override the line would be untrue; the override radios and field show instead |
| `/3-implement` | The editor validity line shows only while every group is at 99.9% | Same rule as the results note (Q5): with a non-standard rate the assumption no longer holds |
| `/3-implement` | Preset validity is checked in `tests/ui/store.test.ts` (`%s puts every group at the standard 99.9% valid-ballot rate`), not in `tests/ui/presets.test.ts` | That file does not exist; the store suite already pins preset seats, and the engine test proves the uniform factor cannot change them |
| `/3-implement` | The override majority field lost its `disabled` state | It now renders only in override mode, where it is always editable |
| `/3-implement` | Store test `gives 700 000 valid votes split as the table implies` corrected to 700 000 ballots and 699 300 valid votes, each party at its table vote × 999/1000 | The test plan had missed this pinned count; decision 2 lowers valid votes by 0.1%. Exact values, seats unchanged, so the test is not weakened |
| `/3-implement` | `ResultsProps.standardValidity` is optional; absent means no note | The results tests and other callers render `Results` without it; only `App` knows the scenario groups |
| `/4-close` | Files table: `tests/ui/presets.test.ts` and `tests/e2e/*.spec.ts` unchanged; `src/ui/styles.css` gained `.rules__note`; the results note reuses the existing `.note` class | No such presets test exists (see above); no e2e spec pins a changed count or label, and e2e stayed green; the rules note needed a muted full-width line |
| `/4-close` | Spec also synced in Section 10 (method no longer shown) and Section 14.4 (Israeli example at 699 300 valid votes) | Both stated the old behaviour or count |
