# Memo — M2-05 Results: Vote/Seat Tables, Stacked Bars, Seat Diagram

| Field | Value |
| --- | --- |
| item | M2-05 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release |
| status | closed |
| created | 2026-10-28 |
| closed | 2026-10-28 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

The engine computes votes, threshold qualification and Hamilton seats, but the
results region still shows a placeholder. A user who edits a scenario sees only
"120 seats allocated" and cannot read who won what, why a party got no seats,
or how vote share turned into seat share. Spec Section 10 requires tables for
exact values, stacked vote/seat bars and a seat diagram, with labels that keep
population share, turnout, vote share and seat share apart, and with the active
allocation method shown.

## Scope

**In scope**

- A pure engine report module that turns a validated scenario and its result
  into display rows: rounded decimal strings, bar weights and the ordered seat
  sequence. All rounding happens there, exactly.
- A locale-aware decimal formatter in `src/i18n/format.ts` that formats an
  ASCII decimal string (integer grouping and decimal separator) without
  converting it to a floating-point number.
- The seats panel: a totals summary (population, unavailable, abstaining, cast,
  invalid, valid, threshold, method), a party table (block, votes, vote share,
  qualification status, seats, seat share), a block table (votes, vote share,
  seats, seat share), a Hamilton details table (quota, floor seats, remainder,
  remainder seat), stacked vote and seat bars, and a seat diagram.
- States: invalid scenario shows no results (only the status line, as now);
  "no allocation" shows the totals and the party table with the reason and no
  seat columns, bars or diagram; a cut-off tie is called out in text.
- The inputs view keeps showing this panel beside the editor on desktop, as it
  does now.

**Out of scope**

- Coalition view and coalition pair editing — M2-06. The coalitions and compare
  panels keep their placeholders.
- Baseline comparison deltas — M2-07.
- A semicircle (hemicycle) seat diagram: it needs trigonometry, which neither
  the UI nor the exact engine should do. A row-wise grid is used instead.
- Per-group vote flow tables and a flow diagram (spec marks the diagram
  optional) — candidates for M4 analysis.
- Chart detail popovers. Every value is printed as text next to its mark, so the
  Escape/outside-click rule has nothing to dismiss yet.
- Exact fraction display. Exact values go to the JSON export in M2-08.

## Approach

**Engine report (spec 6.4, 11).** A new module `src/engine/report.ts` exposes
one function that takes the validated scenario and the scenario result and
returns a report object. It contains:

- totals as rounded decimal strings: people and votes to whole numbers, shares
  to two decimal places of a percent;
- one party row per party in scenario order with name, color, block ID, votes,
  vote share, qualification status, seats, seat share, quota, floor seats,
  remainder (four decimal places) and the remainder-seat flag;
- one block row per entry of the allocation's block list, in that order, with
  name and color (the unassigned row has no block and a neutral label);
- bar segments for votes and for seats: party ID, color and a weight string;
  segments are ordered by block (scenario block order, unassigned last) then by
  party order, so allied parties sit together;
- the seat sequence: one party ID per seat, in the same order as the bar
  segments, for the seat diagram;
- the majority line: the number of seats needed, taken from the existing
  coalition helper, so the diagram and later coalition view agree.

Rounding uses a new exact helper in `src/engine/numeric.ts`: round half away
from zero to a given number of decimal places, returning an ASCII decimal
string with exactly that many places. Display values are produced only from
the exact rationals; no decision is ever taken from a rounded value.

**Formatting (spec 10).** `src/i18n/format.ts` gains a decimal formatter that
splits the ASCII string, groups the integer part through `Intl.NumberFormat`
on a big integer, and joins the locale's decimal separator taken from the same
formatter. Percent signs and units come from message templates.

**Seats panel (spec 10).** A new `src/ui/Results.tsx` renders the report:

- The summary is a definition list. The method line reuses the M2-04 method
  label. Labels distinguish "vote share" and "seat share" explicitly.
- Tables use `<table>` with `<caption>` and `scope` headers, so the bars and the
  diagram have accessible table alternatives. Numbers sit inside `<bdi>` and
  are right-aligned with logical properties.
- Each stacked bar is a flex row whose segments use the engine weight as
  `flex-grow`. Each segment has the party color, a text label for wide
  segments, and a legend below lists every party with its value, so color is
  never the only carrier of meaning.
- The seat diagram is a wrapped grid of fixed-size seat cells in seat-sequence
  order, colored by party, with the majority seat marked and a caption
  "N seats, majority M". It is `role="img"` with a text label; the party table
  is its accessible alternative.
- Stable regions: bars and diagram have fixed block sizes so long names wrap in
  the tables and legend without moving the charts.

**Rejected alternative:** formatting rationals in the UI with
`toLocaleString` on a float — it breaks the exact-arithmetic rule, the UI
source scan forbids it, and rounding near the threshold could disagree with the
engine.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| — | None; the report is derived and never stored | None |

## Interface Delta

- Engine: `report.ts` with one report builder and its row types; `numeric.ts`
  gains exact fixed-place rounding.
- i18n: decimal string formatter in `format.ts`; result labels, column headers,
  status words and captions in all three locales.
- UI: `Results.tsx` replaces the placeholder in the seats panel; the UI engine
  import allowlist gains `report`.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None of the calculation changes. The report only reads the votes, threshold, allocation and majority results and rounds them for display |
| Where exact rationals are required | Rounding to fixed places is done on the exact rationals in the engine; bar weights come from the exact shares; totals are not re-summed from rounded values |
| Ordering / tie rules relied on | Party rows follow scenario order; segments and seat sequence follow scenario block order (unassigned last), then party order; deterministic |
| Any display rounding near a decision? | Yes: a vote share just under the threshold can round to the threshold (for example 3.249% shows as 3.25% with a 3.25% threshold). The qualification status column comes from the engine and is authoritative; a test pins this case. Seat counts are integers and never rounded |
| How determinism across runs, round trip and locale is proven | The report is a pure function: same input gives the same report in every run. Seat columns, seat sequence and bar weights are identical for ru, en and he; only the formatted strings differ. Seat counts in the table equal the allocation result |

## Files

| Path | Change |
| --- | --- |
| `src/engine/numeric.ts` | Exact rounding to fixed decimal places |
| `src/engine/report.ts` | New: display report built from scenario and result |
| `src/i18n/format.ts` | Locale decimal string formatter |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Result labels, headers, statuses, captions |
| `src/ui/Results.tsx` | New: summary, tables, bars, seat diagram |
| `src/ui/App.tsx` | Seats panel renders `Results` instead of the placeholder |
| `src/ui/styles.css` | Tables, bars, legend, seat grid |
| `tests/engine/numeric.test.ts` | Rounding cases |
| `tests/engine/report.test.ts` | New: rows, ordering, rounding, sequence, no-allocation, determinism |
| `tests/ui/format.test.ts` or the existing i18n test | Decimal formatting per locale |
| `tests/ui/results.test.tsx` | New: render-to-string markup checks |
| `tests/ui/store.test.ts` | UI engine import allowlist adds `report` |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Rounding rule for display. — **Decision:** half away from zero; it is
   what readers expect, and decisions never use the rounded value.
2. Precision. — **Decision:** whole numbers for people and votes, two
   decimal places for percentages, four for quota and remainder.
3. Seat diagram shape. — **Decision:** wrapped grid in seat-sequence
   order with the majority seat marked; a hemicycle is deferred.
4. Segment order in bars and diagram. — **Decision:** by block (scenario
   order, unassigned last), then by party order, so blocks read as one run.
5. What "no allocation" shows. — **Decision:** totals and the vote table
   with the reason; no seat columns, bars or diagram, so nothing looks like a
   seat result.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | Added label keys beyond the tested set: `results.summary`, `results.legend`, `results.empty`, `summary.*`, `column.*`, `remainder.yes/no`, `diagram.title`, `diagram.majority` | Table headers, summary labels and the null-value dash need text in all three languages; no behaviour change |
| /3-implement | With an invalid scenario the seats panel shows only its title; the status line already explains why | `placeholder.seats` was removed by scope, and repeating the status text would duplicate it |
