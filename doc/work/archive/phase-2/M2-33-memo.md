# Memo — M2-33 Cooperation answered by each party

| Field | Value |
| --- | --- |
| item | M2-33 |
| epic | M2 |
| phase | Phase 2 — M2 reopened for review corrections |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-30 |
| closed | 2026-10-30 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

When the reader chooses «Задам ограничения сам», the questionnaire asks one
page per party: «С кем готова сотрудничать партия «…»?». Today that page is
cut into parts of four rows, so seven parties already need two screens. The
page also mirrors answers: unticking B on A's page unticks A on B's page, and
ticking it back on B's page silently withdraws A's refusal. The user wants
every option on one screen and each party's answer kept as its own. A pair
still cannot govern together when either side refuses, but the scenario must
record who refused, so the results can say which party is the reason, and the
information stays available for later use.

## Scope

**In scope**

- One screen per coalition page: «Может войти в правительство» and every other
  party (at most nine with the questionnaire's ten-party limit) are shown at
  once, without «часть n из m».
- Each party's answers stay its own. A's refusal of B no longer changes B's
  page, and B's «yes» to A no longer withdraws A's refusal.
- A directed refusal list in the scenario: `coalitionRules.partyRefusals`, each
  entry naming the party that refuses and the party it refuses. Schema
  version 3; versions 1 and 2 are migrated with an empty list.
- The coalition engine forbids a pair when either side refuses it, exactly as
  an incompatible pair, and every forbidden pair it reports says who refused.
- The questionnaire build writes the refusals instead of incompatible pairs.
- The editor's coalition-rules page lists, adds and removes refusals; deleting
  a party removes the refusals that name it, like any pair.
- Every place that gives a forbidden pair as a reason names the party that
  refused: the coalition view's forbidden list, the reasons of blocked
  majorities, the chosen-coalition evaluation and the editor's effective
  rules.
- The page explanation says that each party answers for itself and that the
  results show who refused (Russian, English and Hebrew in the same change).

**Out of scope** (at least two)

- A hint on B's page that A refuses B, or a list of refusals on the review
  page. The reasons belong in the results; the page stays compact.
- Conditional cooperation ("only without C"), minority governments and
  external support; Section 7 keeps them out of version 1.
- New metrics built on refusals, such as which party blocks the most
  majorities. No specification requirement asks for one; the stored refusals
  make it possible later.
- The future view's coalition cards: their breach note names no pair, so it
  stays as it is.
- Review of the English and Hebrew wording, which stays with M3-05.

## Approach

**One screen.** `pageParts` stops cutting coalition pages: a coalition page is
one part holding the government row and every other party. The partner list is
already a two-column grid; the coalition page takes the 3:1 columns of the pie
and review pages so the answer column is wider. Check rows keep the 44 px
touch size. The Section 14.6 fit walk (ten parties, 60-character names, six
sizes) is the gate.

**Own answers.** `shown()` and `editPage` in `src/ui/book.ts` drop the
mirroring: a coalition page shows and stores only its own answers. The
suggestion stays «everyone may cooperate» (every box ticked).

**Refusals in the scenario.** `coalitionRules` gains `partyRefusals`, a list
of ordered pairs: first the party that refuses, then the party it refuses.
Unlike the three existing lists, direction matters: A refusing B and B refusing
A are two entries and may both be present. The existing lists keep their
meaning: `incompatiblePartyPairs` stays a mutual rule typed in the editor with
no "who", block pairs stay block defaults, and overrides still lift only block
defaults (Section 7, M1-07). A refusal is a party rule, so an override never
lifts it.

**Engine.** Effective forbidden pairs (Section 7) become: explicit party pairs
plus refused pairs plus member pairs of incompatible block pairs, minus
overrides, which lift only the block part. A pair forbidden by several rules is
still reported once, under the party source when any party rule (explicit or
refusal) forbids it. Each reported pair also carries `refusedBy`: the party IDs
that refused the other, in persisted party order — empty, one party or both.
The search, minimal winning list, larger and blocked lists, balancing and
pivotal parties all read the same effective pairs, so refusing A–B in either
direction gives exactly the coalitions an incompatible pair A–B gives.

**Questionnaire build.** For each party in persisted order, each other party it
leaves unticked becomes a refusal, in persisted order of the refused party.
Nothing goes into `incompatiblePartyPairs` any more. The build still runs
through the editor's own edit functions, so the same refusals typed in the
editor give the same input text.

**Display.** A forbidden pair with refusals shows «отказ: <names>» (one or both
parties) in place of the source label; a pair with no refusal keeps «запрет
пары партий» or «из запрета пары блоков». Names are rendered as inert text
inside `bdi`, like every name.

**Rejected alternative:** making `incompatiblePartyPairs` directed. Every
existing file holds mutual pairs in persisted order, so its first party would
suddenly read as "the one who refused", which nobody said; the validator's
duplicate rule would also change meaning.

**Rejected alternative:** keeping the questionnaire's incompatible pair and
adding the refusal as a side note. The pair and the note could disagree after
an edit (remove one, keep the other), and two lists would describe one fact.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| `coalitionRules.partyRefusals` | New list of ordered pairs [refusing party, refused party]; two different existing party IDs; one entry per direction; optional on import, read as empty when absent; at most 5 000 entries; the validated scenario always carries it, after `compatiblePartyOverrides` | Version 3. Versions 1 and 2 are read and migrated with an empty list; the validator returns version 3, so exports are version 3; versions above 3 are refused as unsupported |
| `coalitionRules.compatiblePartyOverrides` | An override may not repeat a refused pair in either direction (new `conflicting-pair` case) | Same version 3 |
| Presets and the questionnaire's base input | Written as version 3 with an empty refusal list | None beyond version 3 |

## Interface Delta

- Engine: the forbidden-pair record gains `refusedBy` (party IDs, persisted
  order, always present). `effectiveForbiddenPairs`, the analysis, the blocked
  majorities and the chosen-coalition evaluation all return it.
- Engine edits: the pair-list type gains `partyRefusals`. Adding a refusal
  keeps the given direction, refuses a self pair, a repeat of the same
  direction and a pair that has an override; adding an override refuses a
  refused pair. Removing works by position, like the other lists. Deleting a
  party removes every refusal that names it and counts them as references.
- Schema: version 3, the field rules above, and the exchange file's field
  order.
- Questionnaire: coalition pages are one part; answers are not mirrored; the
  build writes refusals.
- Editor: a «Отказы партий» list on the coalition-rules page, with a «кто
  отказывается» and a «от кого» select, an add button and a remove button per
  row; the effective rules show who refused.
- Coalition view: the forbidden list, the blocked reasons and the evaluation
  name who refused.
- New interface strings in all three tables; the coalition page explanation is
  updated.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | Coalitions only: the set of effective forbidden pairs gains the refused pairs. Votes, threshold, quotas, remainders and ties are untouched; the coalition rules never enter `runSeats` |
| Where exact rationals are required | No new arithmetic; seats stay integers from the exact Hamilton allocation, and the coalition search compares integer seat sums with the integer majority as before |
| Ordering / tie rules relied on | Effective pairs stay listed in persisted party order; `refusedBy` is in persisted party order; refusals are stored in the order they were added (the build adds them by refusing party, then refused party, in persisted order). The search order (seats descending, then persisted order) is unchanged |
| Any display rounding near a decision? | No; refusals are identifiers, not numbers |
| How determinism across runs, round trip and locale is proven | Tests: a refusal in either direction yields the same analysis as the incompatible pair, apart from `refusedBy`; seats are identical with and without any refusals (seeded property test over random refusal sets); a version 3 file with refusals round-trips byte-stable and gives the same analysis after import; a version 2 file imports as version 3 with no refusals and the same analysis; repeated runs and every interface language give the same forbidden pairs and coalitions; the questionnaire build equals the same refusals typed in the editor |

## Files

| Path | Change |
| --- | --- |
| `src/engine/schema.ts` | Version 3, `partyRefusals` validation and migration, override conflict, serialized order |
| `src/engine/coalitions.ts` | Refused pairs in the effective pairs; `refusedBy` on every forbidden pair |
| `src/engine/edit.ts` | `partyRefusals` in the pair lists: directed add, conflicts, removal, references and delete repair |
| `src/ui/book.ts` | Mirroring removed from `shown()` and `editPage`; coalition pages one part; build writes refusals; base input version 3; `BOOK_LIMITS` comment |
| `src/ui/BookView.tsx`, `src/ui/styles.css` | Coalition page in 3:1 columns, one part |
| `src/ui/Editor.tsx` | Refusals list on the coalition-rules page; effective rules name who refused |
| `src/ui/Coalitions.tsx` | Forbidden list, blocked reasons and evaluation name who refused |
| `src/ui/presets.ts` | Version 3 with an empty refusal list |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Refusal strings and the updated coalition page explanation |
| `tests/engine/schema.test.ts`, `tests/engine/coalitions.test.ts`, `tests/engine/edit.test.ts`, `tests/engine/helpers/scenarios.ts` | Version 3, refusals, migration, round trip, correctness and determinism |
| `tests/ui/book.test.ts`, `tests/ui/bookView.test.tsx`, `tests/ui/store.test.ts`, `tests/ui/editor.test.tsx`, `tests/ui/coalitions.test.tsx` | Own answers, one part, build writes refusals, editor list, who refused shown; symmetric-cooperation and four-row expectations replaced |
| `tests/e2e/book.spec.ts`, `tests/e2e/bookFit.spec.ts` | Own answers in the browser; a coalition page fits as one part at the six sizes |
| `doc/spec/elections-simulator.md` | At close: Sections 7, 11, 14.2 (schema version lines), 14.5 and 14.6 |
| `.github/copilot-instructions.md` | At close: schema version 3 and refusals in the repository map |
| `doc/backlog.md`, `doc/work/STATUS.md` | Loop bookkeeping |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Store refusals as a new directed list or give the existing incompatible
   pairs a direction? — **Recommendation:** a new list, `partyRefusals`; the
   existing pairs keep their mutual meaning, so no old file is reinterpreted.
2. Should a pair typed in the editor's «Несовместимые партии» also say who? —
   **Recommendation:** no; it stays a mutual rule. Who refused is recorded by
   the new refusals list, which the editor can also edit.
3. Bump the schema to version 3? — **Recommendation:** yes, with versions 1
   and 2 migrated. An older copy of the app would otherwise drop the refusals
   silently and show coalitions the scenario forbids; version 3 makes it refuse
   the file instead.
4. How should the results name the reason? — **Recommendation:** «отказ:
   <party>» or «отказ: <party>, <party>» in place of the source label, in the
   forbidden list, the blocked reasons, the evaluation and the editor's
   effective rules.
5. What if ten 60-character names still do not fit one screen at 125%? —
   **Recommendation:** keep the 44 px rows; first use the 3:1 columns; if the
   fit walk still fails, hide the decorative round-table drawing on coalition
   pages so the answers take the full width, and record it as a deviation.
6. Can an override in the editor lift a refusal? — **Recommendation:** no; an
   override lifts only a block default. The validator and the edit functions
   refuse an override of a refused pair, as they already do for an explicit
   one.

Approved 2026-10-30 on the user's request: "Eran gde ogovarivajutsa kto s kem
sotrudinchaet , nuzhno vse option pokazivat na odnom ekrane, seichas naprimer
dlja 7 partill eto razdeleno na 2 ekrana I ne udobno. Takzhe otvey dolzhni
registrirovatsa dvazhdi, esli partija A no gotova rabotat s B , no B gotova s
A, v konechnom itoge net koalicii no , v metadata dolzhno byt yasno kto
yavlaetsa prichinoi. Vozmozhno dalshe eta information ponadobisa" (2026-10-30),
in autopilot mode; the recommendations above are the decisions.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| `/3-implement` | `tests/ui/store.test.ts`: the Israeli example's `coalitionRules` expectation now also lists `partyRefusals: []` | `/2-tests` missed this exact-equality check; it contradicted the new preset test the memo requires (every example carries an empty refusals list). The expectation gains a field; nothing it checked before is dropped |
| `/3-implement` | Open Question 5 fallback applied: in a window at least 768 px wide and under 720 px high, a coalition page hides the round-table drawing, the answers take the full width and the partners use three columns instead of two | With the 3:1 columns alone, ten 60-character names at 1280x720 and 1366x768 at 125% gave a 640 px page in a 576 px and a 614 px window. Hiding the drawing alone gave 617 px; three columns bring it to 576 px. Rows stay 44 px; taller windows keep the drawing and two columns |
| `/4-close` | `tests/ui/fileTransfer.test.ts` changed but is missing from the Files table | `/2-tests` made its future-version case `SCHEMA_VERSION + 1` instead of a fixed 3, so it keeps meaning "unsupported" after the bump; the test plan lists it |
| `/4-close` | `src/ui/BookView.tsx` is in the Files table but was not changed | One part comes from `pageParts` in `src/ui/book.ts` and the 3:1 columns from `src/ui/styles.css`; the page component needed nothing |
