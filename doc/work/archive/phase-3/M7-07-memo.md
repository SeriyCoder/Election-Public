# Memo — M7-07 Questionnaire alignment

| Field | Value |
| --- | --- |
| item | M7-07 |
| epic | M7 |
| phase | Phase 3 — M7 party-first coalition simulation |
| status | closed |
| created | 2026-10-31 |
| closed | 2026-10-31 |

## Problem

The questionnaire still requires a social composition for every party and
fills unanswered rows with illustrative assumptions, although party-mode
coalitions do not need demographic data. It also offers no language selection
on its opening screen, defaults to Russian, opens other views after completion
or skip, and presents the navigation in the old order. The untouched startup
scenario is a group-mode fixture, so simply opening its coalition view would
leave the principal party-share controls read-only.

## Scope

**In scope**

- Offer a no-groups path and optional party-by-party compositions. A user can
  obtain and edit party results and coalitions without filling any demographic
  table. Unanswered or explicitly unknown composition remains unknown, not an
  invented equal split or a real-world claim.
- Keep each requested group-turnout question before party shares. When a
  composition is supplied, require its group shares to total exactly 100%.
  Preserve the selected group identities, their turnouts, and any explicitly
  accepted illustrative assumptions.
- Ask for overall turnout as a visible exact input when it cannot be derived
  from sufficient group assumptions. Explain which inputs are assumptions,
  which group experiments are unavailable, and why the ordinary coalition
  result remains available.
- Distinguish the group mix of valid voters, the separately implied electorate
  population, the unknown part of the voter mix, and the 2022 educational
  population reference. No group named Other / unclassified is a substitute
  for unknown composition. Do not label an illustrative party composition as
  an official or surveyed 2022 result.
- Provide Russian, English and Hebrew selection on the first questionnaire
  screen and retain it throughout the questionnaire. Hebrew is the fallback
  only when no valid saved or explicit language exists. Switching language
  keeps the page, part, answers, confirmation and scenario, and updates
  direction and translated text without navigating or rebuilding.
- Open Coalitions after every completion, skip and confirmed replacement,
  including an untouched skip. Order the visible views Coalitions,
  Composition, Data and Demographic Future; keep the seat report, baseline
  operations and historical comparison already retained by M7-03.
- Start a fresh visit with a clearly labelled, editable, party-mode educational
  scenario derived from the questionnaire's own neutral suggestions. Keep the
  Section 8 baseline preset unchanged and selectable. Skipping an untouched
  questionnaire over an existing scenario must not replace or convert it.
- Retain keyboard access, Russian/English/Hebrew text, RTL, responsive page fit,
  offline operation, the unchanged single-file size limit and existing
  seat-calculation and legacy-scenario guarantees.

**Out of scope**

- Hiding block, participation and legacy voting-mode controls, or converting
  an old scenario: [M7-09](../../backlog.md). Existing scenarios keep their
  original semantics; an untouched skip does not silently convert them.
- New demographic-future diagrams and critical combinations:
  [M7-10](../../backlog.md).
- The broader political and multilingual copy review and the editor's
  group-mode explanation: [M7-08 and M7-11](../../backlog.md). This item does
  correct questionnaire text made inaccurate by its own optional path.
- Changing Hamilton, the qualification threshold, tie ordering, the official
  2022 data, or describing Hamilton as the Israeli Bader–Ofer method.
- Flag artwork and the separate human publication-language review:
  [M3-06 and M3-05](../../backlog.md).

## Approach

The existing party-mode schema in Sections 3 and 5 of the
[specification](../../spec/elections-simulator.md) already permits no groups
and a null composition for each party. Sections 10, 14.5 and 14.6 describe the
questionnaire, navigation and page-fit constraints. Reuse those structures
rather than introducing another scenario mode.

On the group-set page, offer no demographic groups as the default as well as
the existing educational and custom group choices. The two existing lessons
remain available but describe groups as optional model assumptions. The
educational group set retains its existing source, colours and Other /
unclassified member; no group is silently added to a no-groups scenario.
When no groups are selected, omit group-specific turnout, composition,
population-check, growth and turnout-change questions. Ask for overall turnout
before the party shares and continue through the ordinary rules, coalition
and review pages.

When groups are selected, keep their names and turnout questions before the
party-share page. Afterwards offer a choice to leave every composition unknown
or to describe parties individually; unknown is the safe default. On the
individual path each party has a clear unknown/enter choice. A table appears
only for a party the user chooses to describe. Existing illustrative
percentages can be offered there, explicitly as assumptions. An unfinished
row filled automatically after the user chose to enter it must be listed as
such. Merely choosing group names or an educational set does not establish a
party's social composition.

Retain language-free draft answers and associate each composition choice and
row with the actual party and group identities. Changing a count, name
selection or group set must not apply a stale row to another entity. Returning
to a still-compatible answer may restore it; switching locale never changes
its identity or values. Conditional pages, page parts, Back, Next, review,
skip, restart, the existing confirmation dialogs and automatic filling must
all resolve the same visible branch. In particular, automatic filling of an
unvisited composition choice selects unknown, not a purported known row.

For group questions, explain that the entered group turnouts and
compositions are assumptions. While any positive-vote party's composition is
unknown, group turnout cannot determine the missing voter allocation or an
implied population. Preserve the entered group turnouts, ask for overall
turnout as a separate exact percentage after the composition choices, and show
that linked group editing and demographic projections need additional
consistent assumptions. The suggested overall turnout is 70%, labelled as an
example and recorded in the filled list when accepted automatically. The
user may enter any valid overall turnout from 0% to 100%.

Where every positive-vote party has a known composition and the existing
turnout assumptions determine the result, derive the initial overall turnout
using exact engine arithmetic as before. An unknown composition of a
zero-vote party contributes exactly zero; it remains null in the scenario and
does not by itself make the derivation unavailable. When an exact derivation
is otherwise underdetermined, show the overall-turnout input and the reason,
not a fabricated population or a silently inferred 70%. Entering an overall
turnout must not change party shares. Later edits use M7-05's existing linked
basis, availability checks, explicit refusal reasons and rebuild behavior.

The questionnaire check and review must distinguish the group mix among
**valid voters** from the group shares among **all eligible voters**. Compute
the former from party shares and known compositions in the engine, with the
whole valid-vote total as denominator. If some positive-vote composition is
unknown, show its unknown share separately; known group contributions are
partial, not complete group totals, and must not be renormalized to 100%.
When all composition is unknown, do not call the group's share zero. The
implied electorate population and its comparison with the educational 2022
population reference are available only when the necessary assumptions are
complete and determinate. Otherwise show an explicit unavailable reason, not
an empty percent, false zero or a validation error blocking coalitions.
Retain the source and approximation caveat of the reference; it does not
provide party compositions.

For example, with party shares 60% and 40%, compositions 50% / 50% and
0% / 100%, and group turnout 50% and 100%, the voter mix is 30% / 70%; the
implied population mix is approximately 46.1538% / 53.8462%, and exact overall
turnout is 10/13. If the second party's composition is unknown, the known
contributions are 30% / 30%, the remaining 40% is unknown, and the implied
population is unavailable. Neither display changes the entered 60% / 40%
party shares or the seats.

On a new visit construct the neutral party-mode starting input from the same
resolved, no-groups questionnaire suggestions: four catalog parties at equal
shares, the explicitly illustrative 70% overall turnout, 120 seats, the
suggested threshold, standard ballot validity and no assumed cooperation
restrictions. Surface its automatically filled assumptions as an educational
example. Keep the existing Section 8 fixture and all preset results intact.
This starting input is chosen only for a fresh application start. If a
questionnaire was opened over another scenario and skipped without answers,
retain that scenario byte-for-byte; only the selected view changes.

Reuse one accessible language-control implementation in the questionnaire and
main toolbar. Keep valid saved choices and explicit initial choices ahead of
the fallback; storage failure leaves the user's choice active for the visit.
The next visit without a saved choice starts in Hebrew. Update the clear-data
notice in all three languages and the static HTML's initial language and
direction; the running app still applies a saved language immediately.

**Rejected alternative:** prefill equal or historical-looking party
compositions whenever the user skips a demographic table, because a useful
coalition calculation must not turn missing data into invented knowledge.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Questionnaire draft | Add language-free group and composition choices, conditional answers, and an overall-turnout answer when needed. | None; transient UI state only. |
| Party-mode groups | An empty array explicitly means no demographic model; selected groups retain their inputs. | None; version 5 already permits it. |
| Party composition | Store null for every unknown row; a known row has all selected group IDs and sums exactly to one. | None; version 5 already supports both. |
| Party-mode rules | Overall turnout is the exact derived value or the user's explicit exact input, including a labelled suggested value. | None; existing exact fraction. |
| Linked demographic basis | Do not invent a basis. Existing eligibility, consistency, suspension and rebuild rules continue to govern it. | None. |
| Language preference | Reuse the existing language storage key and valid saved values; default changes only when no valid selection exists. | No scenario field or version change. |

## Interface Delta

- Extend the questionnaire model and engine electorate helpers to represent
  optional rows and an unknown-aware voter/population check. Invalid inputs
  and unavailable derivations must have distinguishable, explicit outcomes.
- Reuse the language selector on both screens and expose the new choices,
  unavailable reasons, review lines and filled items in all three languages.
- Change fresh-visit initialization, questionnaire exit routes and visible
  view order as described above; retain explicit scenario replacement
  confirmations and imported group-mode behavior.
- JSON import/export and the worker contract remain compatible. No scenario
  translation text or invented party composition is persisted, and no demo
  group is added when the user selected no groups.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | The questionnaire constructs party vote shares and overall turnout; its optional aggregate check reads compositions. Existing vote, threshold, Hamilton, tie and coalition algorithms remain unchanged. |
| Where exact rationals are required | Parse party shares, compositions and turnout as exact fractions; compute the aggregate valid-voter mix and any determinable overall turnout in `src/engine/`. Unknown is not a numeric zero, except that an unknown zero-vote party has an exact zero contribution. |
| Ordering / tie rules relied on | Preserve party IDs and persisted tie order. Existing Hamilton and coalition ordering remain authoritative; language and questionnaire page order cannot resolve a seat tie. |
| Any display rounding near a decision? | None. Rounded check figures, pie segments and reference comparisons are display-only and are never written back as vote shares, turnout or seat inputs. |
| How determinism across runs, round trip and locale is proven | Compare exact inputs, votes, qualification, seats and coalition results across repeated builds, all three locales and JSON round trips. Cover zero-share unknown parties, positive-share unknown parties, threshold and Hamilton ties, legacy scenarios and the seat-sum invariant. |

After a party-mode scenario is built, editing composition alone must not alter
its current party votes or seats. During questionnaire construction, changing
an assumption may instead change the derived initial overall turnout, and
therefore absolute vote counts, while the entered party shares and seats stay
the same when valid ballots remain positive. Changing overall turnout preserves
shares and allocation under that same condition; at zero turnout the established
no-valid-votes state applies and no seats or coalition are fabricated. No
electoral arithmetic is added to UI components or display-formatting helpers.

## Files

The table lists the expected surfaces for the complete item; the present memo
step changes only the memo and STATUS. A listed file that proves unchanged is
recorded as a deviation rather than edited merely to match the table.

| Path | Expected change or explicit compatibility verification |
| --- | --- |
| `doc/work/active/M7-07-memo.md`, `doc/work/active/M7-07-test-plan.md`, `doc/work/STATUS.md` | Record the design, red and green evidence, each step and its stage. |
| `doc/work/archive/phase-3/M7-07-memo.md`, `doc/work/archive/phase-3/M7-07-test-plan.md` | Archive the closed artifacts at `/4-close`. |
| `doc/backlog.md`, `doc/spec/elections-simulator.md`, `.github/copilot-instructions.md` | At close, tick the item and sync the actual questionnaire, startup, language and navigation behavior; record any contour edit under its required process. |
| `src/engine/electorate.ts`, existing exact numeric and vote helpers | Unknown-aware exact voter mix and determinable turnout/population; reuse existing arithmetic and preserve existing complete-row behavior. |
| `src/ui/book.ts`, `src/ui/BookView.tsx` | Conditional no-group and optional-composition paths, exact turnout input, correct check/review/filled states and retained page identities. |
| `src/ui/store.ts`, `src/ui/App.tsx`, `src/ui/LanguageControls.tsx`, `src/main.tsx` | Fresh editable party-mode start, every exit route, ordered navigation, preserved existing inputs and shared language controls. |
| `src/ui/styles.css`, `index.html` | Accessible opening selector and responsive fit; static Hebrew fallback, direction and title. |
| `src/i18n/index.ts`, `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Hebrew fallback and all new or directly affected questionnaire and storage notices. |
| `tests/engine/electorate.test.ts`, `tests/engine/partyMode.test.ts`, `tests/engine/linkedTurnout.test.ts`, `tests/engine/future.test.ts` | Exact derivation, unknown and zero-vote edges, allocation and linked/projection compatibility. |
| `tests/ui/book.test.ts`, `tests/ui/bookView.test.tsx`, `tests/ui/store.test.ts`, `tests/ui/app.test.tsx`, `tests/ui/i18n.test.ts`, `tests/ui/storage.test.ts`, `tests/ui/views.test.tsx` | Questionnaire branches, every exit, default and persisted languages, RTL, input preservation, navigation and accessible labels. |
| `tests/e2e/helpers.ts`, `tests/e2e/book.spec.ts`, `tests/e2e/bookFit.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/layout.spec.ts`, `tests/e2e/offline.spec.ts` | Test real startup, user-visible editing, saved languages, keyboard, all fit sizes, phone and offline behavior. Preserve Section 8 fixture coverage by explicitly selecting that preset where it is the subject of a test. |
| `tests/e2e/coalitionWorkspace.spec.ts`, `tests/e2e/editorPages.spec.ts`, `tests/e2e/future.spec.ts`, `tests/e2e/hint.spec.ts`, `tests/e2e/historical2022.spec.ts`, `tests/e2e/interaction.spec.ts`, `tests/e2e/israel.spec.ts`, `tests/e2e/linkedTurnout.spec.ts`, `tests/e2e/partyComposition.spec.ts`, `tests/e2e/performance.spec.ts` | Verify or adapt fixture selection and navigation without reducing the original behavioral, legacy, historical or performance assertions. |
| `tests/build/offline.test.ts`, `vite.config.ts`, `dist/elections.html` | Verify and build the existing offline artifact without weakening CSP or the 450 KiB gate; change config only if genuinely required. |

## Definition of Done

- [x] Tests are written first and observed failing for the intended missing
      behavior, without weakening existing correctness assertions.
- [x] No-group, all-unknown, partially known, fully known and zero-vote unknown
      paths build valid version-5 scenarios; examples remain identifiable as
      assumptions and unknown is never displayed as a fabricated zero.
- [x] The no-groups fresh start opens an editable coalition workspace with
      exact 100% party shares; existing scenarios survive untouched skip and
      replacement cancellation.
- [x] The exact 60% / 40% check above, exact threshold and tie fixtures,
      seat-sum invariant, zero-turnout no-allocation state, repeated builds,
      locale changes and JSON round trips are verified.
- [x] Every completion, skip and confirmation path opens Coalitions; the four
      visible views are in the specified order and existing reports remain
      reachable.
- [x] Fresh, invalid, blocked and saved language storage cases, early switching,
      direction, answers, page/part and confirmations are verified.
- [x] Existing six laptop/zoom questionnaire-fit sizes, keyboard and axe
      checks, phone overflow, offline build and the 450 KiB limit pass without
      removing features or relaxing gates.
- [x] Suite, typecheck, lint and formatting pass; specification, project brief
      and deviations are synced at close.

## Open Questions

1. What should an unanswered demographic section mean? —
   **Recommendation:** no groups by default and null per-party compositions;
   allow explicit educational assumptions and individual known rows, but
   never treat a missing row as an equal split.
2. How is overall turnout obtained? — **Recommendation:** derive it exactly
   when the necessary group assumptions are known; otherwise ask for an exact
   overall percentage, offering 70% only as a labelled, recorded example.
3. What should a fresh untouched skip open? — **Recommendation:** a labelled,
   neutral party-mode example with editable party controls; keep a preexisting
   scenario unchanged and keep the Section 8 baseline as a separate preset.
4. What do the demographic checks show when data are partial? —
   **Recommendation:** show known valid-voter contributions and the separate
   unknown portion without renormalizing; mark the population check and
   group-linked experiment unavailable until their assumptions suffice.
5. How should language changes and exits behave? — **Recommendation:** retain
   any valid saved language, otherwise start in Hebrew; preserve the complete
   questionnaire state on switching and open Coalitions on every exit.

**Approval:** The autonomous request on 2026-10-31 was: “nachinai i approved,
vnosi polnosju vse izmenenija kak zaplanirovanno i 1 nachinai, 2 approved , i
zamoskaem kak ty hotel 1-memo M7-01”. The recommendations above are adopted
for this item.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | Adapted the existing grouped questionnaire, editor, results and future-view fixtures to select their original demographic example and Russian locale explicitly. The untouched six-list skip now checks the new neutral shares, while a separate browser walk retains the original six-list seat fixture. | The fresh-start defaults deliberately changed; the legacy, historical, language and exact-seat assertions must still exercise the scenarios for which they were written. |
| /3-implement | Added focused RED checks for the educational-example notice, language selection inside a confirmation and long-name check pagination while the initial test plan was still red. | These are approved acceptance and fit cases that the initial tests did not exercise; both missing controls and the pagination boundaries were observed failing before the fixes. |
| /3-implement | The voter-mix check uses up to four rows for group names longer than 20 characters and two for names longer than 32; dense percentage fields use two columns in short desktop windows. The example set moves beside its question, and decorative illustrations yield space where necessary. | Measured 1,024 × 576 layout failures showed that the added voter and population columns and language controls could otherwise push content or controls outside the window. All names, figures, percentages, keyboard controls and the original size gates remain available; the check is paginated only when needed. |
| /3-implement | Existing exact engine and scenario compatibility suites were retained rather than editing every engine test listed as a verification surface. Added locale-specific fixture setup in `tests/ui/editor.test.tsx`, `tests/ui/results.test.tsx` and `tests/ui/futureCoalitions.test.tsx`. | The new questionnaire tests exercise exact voter contributions, zero-vote unknown rows, turnout and seats through the engine, while those additional UI fixtures had relied on the former Russian default. |
| /4-close | The listed existing storage, accessibility, layout, workspace, editor, future, hint, historical, interaction, linked-turnout, composition, performance and build tests, and `vite.config.ts`, were verified without unnecessary edits. | Their unchanged assertions pass with the explicit fixture selection in the shared browser helper and the existing in-memory build gate. |
