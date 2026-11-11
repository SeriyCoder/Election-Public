# Memo — M7-10 Demographic future and critical party sets

| Field | Value |
| --- | --- |
| item | M7-10 |
| epic | M7 |
| phase | Phase 3 — M7 party-first coalition simulation |
| status | closed |
| created | 2026-10-31 |
| closed | 2026-11-01 |

## Problem

The future view already calculates a selected year and follows up to three
coalitions, but its tables do not make changes in eligible population and party
votes immediately visible. It cannot independently monitor the red and orange
party combinations requested by the user or find the first year when either
reaches half the seats. The new view must keep existing projections and legacy
semantics exact, avoid presenting missing allocations as zero, and stay
responsive and usable offline.

## Scope

**In scope**

- In the future view's left-hand region, compare group populations and party
  valid votes today and in the selected year with separate, labelled visual
  scales, exact-value tables and accessible legends.
- Preserve the existing chosen year, tables and up to three followed-coalition
  cards. Add two independently editable, initially empty party sets, identified
  by red and orange as well as text, not by an inferred political label.
- Show each set's combined valid votes, share and seats today and in the
  selected year, distinguishing half the seats from the applicable majority.
  Arbitrary sets are not asserted to be feasible or politically guaranteed
  coalitions.
- Search all integer years 0–20 for the first half-seat crossing without
  assuming the number of seats moves monotonically. Distinguish a proven
  first crossing, a first known crossing after missing years, no crossing in a
  complete range, unavailable data, no allocation, cancellation and failure.
- Run the range search in a cancellable offline worker with progress, stale
  result protection and an explicit unavailable state if a worker cannot run.
- Use fixed current turnout and preferences in the simplified model. Keep
  legacy annual-turnout changes, participation, validity and restrictions
  effective until the separately confirmed M7-09 conversion.
- Preserve exact deterministic allocation, all three languages, keyboard,
  RTL and phone access, the original three-followed-coalition limit and the
  unchanged 450 KiB single-file budget.

**Out of scope**

- Changing threshold, Hamilton allocation, tie order, historical results or
  the version-5 scenario format.
- Replacing the separately saved baseline or the 2022 historical reference,
  or claiming that demographic assumptions predict real voter behavior.
- The full cross-language wording review and publication review, already
  scheduled as M7-08, M7-11 and M3-05.
- Publication, hosting, subgroup models or a general parameter-sweep solver;
  those belong to the existing later backlog items.

## Approach

Sections 5.1, 6, 9 and 14.2–14.3 of the
[specification](../../spec/elections-simulator.md) define scenario
compatibility, exact seats, projection and the current future view. Reuse
`runSeats` and the existing year-0 and selected-year report as the only
authoritative calculation paths. The selected year is a view setting and
changes no scenario data.

For each year shown, derive the group chart from eligible population and the
party chart from all valid votes, including votes for lists below threshold.
Use different captions, totals and denominators: a group is not a party, and
valid voters are not the whole eligible population. Pair the year-0 and
year-k bars for each measure on a shared absolute scale within that measure,
so both the total volume and its internal proportions are visible. Display the
totals, individual amounts, percentages and changes as text alongside the
colored segments. Compute display boundaries from exact engine values; never
reconstruct decisions from rounded labels. Zero totals and genuinely unknown
group populations receive explicit empty or unavailable states, not fabricated
equal slices. No allocation does not erase otherwise known valid-vote data.

The visual controls occupy the future view's existing left region, above or
beside the three-coalition chooser. On desktop keep them physically left of
the results in both LTR and RTL; on phones they precede the results without
horizontal page overflow. Keep a usable year selector and today's known
figures even when a future projection is unavailable. Reuse the current group
palette and party colors, with text and accessible table alternatives so color
is never the only identifier.

Provide two separately labelled checkbox groups for the red and orange sets.
Each may contain any scenario parties, including below-threshold parties, and
the same party may occur in both. Empty means no set has been selected; do not
pick real parties automatically. Both sets are transient view state, not
scenario fields: retain them during ordinary valid edits, prune deleted party
IDs, and clear them on an explicit scenario replacement. An invalid draft
must not turn prior results into results for a different input. Keep the
existing three followed-coalition selections independent from these sets.

For each nonempty set and each available allocation, add its party votes and
integer seats in the engine. A half-seat crossing means twice the set's seats
is at least `seatCount`; for 120 seats, 60 reaches half while the ordinary
majority is 61. This comparison is independent of any legacy majority override.
Show the applicable majority separately, and never describe the set's seat
total as proof that its parties can cooperate.

Evaluate the integer years in ascending order from 0 through
`LIMITS.projectionYears`, currently 20. Run the existing exact vote,
threshold and Hamilton allocation once per year and evaluate both sets from
that same result. Do not binary-search or assume monotonicity. A first
crossing is proven only if every earlier year has an available allocation.
If an earlier year is unavailable or has no allocation, retain its reason and
label any later crossing as the first *known* crossing rather than the proven
first. If no crossing is found, claim none in the range only when every year
was evaluable; otherwise report an incomplete result. A cancelled or failed
search is never displayed as a complete negative result.

Use a dedicated runner and worker instance following the existing cancellable
worker lifecycle. Reuse or extend the already inlined worker entry and its
typed protocol where practical rather than embedding a second copy of the
engine. Terminate obsolete work on input or set changes, explicit cancellation
or leaving the relevant view; ignore messages from stale workers. Changing
only the selected display year or language must not change the 0–20 search
identity. Show progress and a retry path. A missing or failed worker is
reported visibly without starting a potentially blocking range search on the
main thread.

New and explicitly converted simple scenarios have zero annual turnout change,
so existing exact projection keeps today's group turnout and preferences while
populations grow. Hide the annual-turnout-change editor to avoid reintroducing
that legacy behavior through the simplified controls; never rewrite a stored
nonzero value merely by opening or editing the scenario. An unconverted
legacy input continues to project its own stored annual changes and receives a
clear contextual explanation. The M7-09 confirmation and original-export path
remain the only conversion route.

**Rejected alternative:** silently zero every imported turnout-change value or
use a rounded/binary-searched chart to decide crossings, because either can
change legacy results or miss the actual first crossing.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario and legacy inputs | Preserve all stored fields and their existing year-by-year meaning; simple and converted inputs keep zero annual turnout change. | None; version 5 and existing migrations remain unchanged. |
| Red and orange party sets | Two independent, transient lists of party IDs; pruned on deletion and cleared on scenario replacement. | None; not exported or saved in scenario JSON. |
| Visual comparison | Exact group-population and party-vote values plus display-only bar widths, labels and explicit unavailable states for each year. | None; derived, never used to allocate seats. |
| Range search | Transient worker request, progress and typed per-set results, tied to the validated input and both sets. | None; no persisted result or inferred demographics. |

## Interface Delta

- Add pure engine helpers for exact party-set summaries, visual comparison
  inputs and a bounded first-crossing scan over existing seat results.
- Extend the future view's left region with two group and two party comparison
  bars, total and percentage labels, and independent red/orange party pickers.
- Retain the three existing followed coalitions and current exact future
  tables. Present chosen-year set votes and seats plus the range-search
  outcome and separate majority explanation.
- Add accessible progress, cancellation, retry, no-data and incomplete-result
  messages in Russian, English and Hebrew. Retain the year control when the
  projection cannot be computed.
- Hide the annual-turnout-change field while preserving legacy values and
  warning about their continuing effect until conversion.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | Each sampled year calls the existing vote, threshold and Hamilton paths; set totals sum allocated seats and valid party votes without running a new coalition search or modifying the input. |
| Where exact rationals are required | Group populations, party votes, vote shares and all threshold/allocation decisions stay in `src/engine/`; the half-seat test uses exact integer seats and `seatCount`. |
| Ordering / tie rules relied on | Sample years in ascending order, preserve scenario party and group IDs/order, and reuse persisted tie-break order and party-ID fallback. Set membership is order-independent. |
| Any display rounding near a decision? | None. Chart widths and formatted numbers are display only; neither their rounding nor a majority override determines the exact 50% crossing. |
| How determinism across runs, round trip and locale is proven | Compare per-year engine results and first-crossing summaries across repeated runs, serialized scenario round trips, set selection orders and ru/en/he; retain exact threshold-boundary, remainder-tie and seat-sum property tests. |

Tests must cover 60 of 120 seats versus the 61-seat majority, odd parliament
sizes, exact threshold and remainder boundaries, a rise followed by a fall
within 0–20, a crossing at year 0, a crossing at year 20, no crossing, missing
or no-allocation years, unknown demographics, zero votes, single-party and
overlapping sets, all parties, deleted parties, and the 20-group/30-party
reference size. A later known crossing after a missing earlier year must not
be called the proven first. Check that the conversion and unconverted legacy
future fixtures still produce their respective original results.

## Files

| Path | Expected change or explicit compatibility verification |
| --- | --- |
| `doc/work/active/M7-10-memo.md`, `doc/work/active/M7-10-test-plan.md`, `doc/work/STATUS.md` | Design, RED/GREEN evidence and one recorded transition per step. |
| `doc/work/archive/phase-3/M7-10-memo.md`, `doc/work/archive/phase-3/M7-10-test-plan.md`, `doc/backlog.md`, `doc/spec/elections-simulator.md`, `.github/copilot-instructions.md` | Close, archive and synchronize the documented behavior and project map. |
| `src/engine/future.ts`, new `src/engine/futureRange.ts` | Exact population and vote comparison inputs, party-set summaries and bounded crossing results. |
| `src/engine/run.ts`, `src/engine/votes.ts`, `src/engine/allocate.ts`, `src/engine/threshold.ts`, `src/engine/numeric.ts`, `src/engine/schema.ts` | Reuse and verify the authoritative projection, allocation, exact display helpers and schema; change only shared functionality genuinely needed by this item. |
| `src/ui/Future.tsx`, `src/ui/FutureChooser.tsx`, `src/ui/App.tsx`, `src/ui/store.ts`, `src/ui/Editor.tsx` | Charts, critical-set controls, unavailable projection handling, transient lifecycle and hidden legacy annual-change input. |
| `src/ui/FutureVisuals.tsx`, `src/ui/futureScanRunner.ts`, `src/ui/useRunner.ts`, `src/ui/coalition.worker.ts`, `src/ui/coalitionRunner.ts`, `src/main.tsx` | Focused visuals and cancellable, typed range work using the existing inline-worker mechanism and shared subscription hook; retain current and baseline coalition searches. |
| `src/ui/styles.css`, `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Responsive, accessible presentation and complete messages. |
| `tests/engine/future.test.ts`, new `tests/engine/futureRange.test.ts`, existing exact seat and schema tests | Exact chart data, party-set totals, threshold crossings, legacy projections and deterministic seats. |
| `tests/ui/futureCoalitions.test.tsx`, `tests/ui/store.test.ts`, `tests/ui/editor.test.tsx`, new future-view and runner tests | Independent sets, lifecycle, no-data handling, cancellation, stale messages and hidden legacy field. |
| `tests/e2e/future.spec.ts`, new future-range browser tests, existing layout, accessibility, performance and offline suites | Real desktop/phone/RTL charts, keyboard selection, worker progress/cancel, missing data and unchanged followed-coalition behavior. |
| `tests/build/offline.test.ts`, `build/compactLocales.ts`, `vite.config.ts`, `dist/elections.html` | Verify one offline file and unchanged 450 KiB gate; optimize losslessly if necessary without removing behavior. |

## Definition of Done

- [ ] Tests are written first and fail for the intended missing behavior.
- [ ] Group population and party vote graphics and numeric values are
      distinguishable, accessible and correct for year 0 and the chosen year.
- [ ] Two independent party sets coexist with all three followed coalitions;
      no seat majority is presented as guaranteed cooperation.
- [ ] Every 0–20 crossing is found without a monotonicity assumption and
      incomplete or unavailable years are never reported as zero or as a
      proven complete search.
- [ ] Legacy projections remain unchanged until conversion; the simplified
      model keeps current turnout and preferences fixed across future years.
- [ ] Exact seat sums, ties, threshold boundaries, round trips, locale
      determinism, odd seat counts and seeded property cases pass.
- [ ] Worker cancellation, stale messages, errors, keyboard, phone, RTL,
      offline policy, responsiveness and the unchanged size budget pass.
- [ ] Full tests, typecheck, lint, formatting and browser gates pass; the
      specification, project map and deviations are synchronized at close.

## Open Questions

1. What does 50% mean? — **Recommendation:** half of all parliament seats,
   compared exactly; display the separate applicable majority and vote share.
2. Are red and orange automatically political blocs? — **Recommendation:**
   no; start with two empty independent user-defined party sets, allowing the
   same party in both.
3. What if an earlier year has no allocation or cannot be projected? —
   **Recommendation:** display its reason and label a later crossing as first
   known, not proven first; never claim an incomplete range contains no crossing.
4. How are old annual turnout changes handled? — **Recommendation:** hide the
   field but preserve and explain its stored effect until M7-09 conversion;
   new and converted scenarios keep current turnout fixed.
5. How should the range scan stay responsive offline? — **Recommendation:**
   reuse the inlined worker mechanism with cancellation and explicit worker
   errors, never a blocking main-thread fallback.

**Approval:** On 2026-10-31 the user requested: “nachinai i approved,
vnosi polnosju vse izmenenija kak zaplanirovanno i 1 nachinai, 2 approved , i
zamoskaem kak ty hotel 1-memo M7-01”. The recommendations above are adopted
for this item.

**Resume confirmation (2026-11-01):** The user confirmed that the other
development window is no longer editing the project and selected one step at
a time here. Resume `/3-implement` for this approved memo, then stop before
`/4-close`. The accepted prototype integration and questionnaire changes are
queued in M7-12 and its follow-on work; they do not expand this step's scope.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| 3-implement | Exposed exact projected party-mode group populations as optional derived vote-result metadata. | The visual API accepts seat results without a year argument; reusing populations already computed by projection avoids inferring a year or duplicating electoral arithmetic. Scenario schema and allocation decisions are unchanged. |
| 3-implement | Generalized the existing runner subscription hook for the future runner and reused the inlined coalition worker with a typed request union. | Keeps one lifecycle pattern and avoids another embedded engine bundle; the future scan still uses a separate worker instance. |
| 3-implement | Corrected the existing `futureCoalitions.test.tsx` element extractor to balance nested tags, with all assertions unchanged. | Eight false failures came from stopping at the first nested graphic section's closing tag, before the actual chooser. Nested semantic sections are valid and part of the new view. |
| 3-implement | Raised the existing lossless locale word-dictionary cap from 256 to 512. | The first full build was 461,503 bytes, 703 above the unchanged 460,800-byte gate. Production-table round-trip tests verify that packing changes no translation. |
| 2-tests | Updated existing group-editor display assertions for annual turnout change to assert a hidden control and preserved stored value instead. | M7-10 intentionally replaces the previously visible control; growth controls and legacy storage remain tested. |
| 2-tests | Added the approved `futureRange` engine module to the existing UI import allowlist. | The new typed runner must use the named engine API; all restrictions on UI arithmetic and other imports remain in force. |
