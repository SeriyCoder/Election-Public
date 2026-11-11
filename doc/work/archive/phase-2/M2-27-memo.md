# Memo — M2-27 Party-first electorate in the questionnaire

| Field | Value |
| --- | --- |
| item | M2-27 |
| epic | M2 |
| phase | Phase 2 — M2 reopened for first-review corrections |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-30 |
| closed | 2026-10-30 |

## Problem

The questionnaire asks the electorate the way the engine stores it: first the
share of each voter group («Какую долю избирателей составляет каждая группа?»,
split into two parts that look like two unrelated pages), then, per group, how
the group divides its votes among the parties, then turnout. The user finds
this backwards. A person thinks about who votes for a party, not about how a
social group splits across ten lists, and the group shares are hard to guess
directly. The user asked to describe each party by the groups its voters come
from, with a live pie while typing, to set group turnout before that, and to
let the split of society by groups come out of these answers and be shown at
the end as a check.

## Scope

**In scope**

- New chapter order: 1 Партии, 2 Состав избирателей (the two lessons, the
  group set, own group count and names; the group-shares page is removed),
  3 Явка (one page per group, unchanged pages, now before the parties'
  voters), 4 Избиратели партий (new), then Будущее, Правила, Коалиции,
  Проверка. The chapter count stays eight.
- Chapter 4 pages:
  - «Сколько голосов получает каждая партия?» (`votes.shares`): one percents
    page across the parties, summing to 100%, with a live pie.
  - «Из кого состоят избиратели партии «…»?» (`compose.N`, one page per
    party): percents across the groups, summing to 100%, with a live pie in
    the group colours. Replaces the per-group preference pages (`prefs.N`).
  - «Какой получилась структура избирателей?» (`votes.check`): a page that
    takes no answer and shows the group shares derived from the answers as a
    pie and a list; when the example groups are chosen, each row also shows
    the 2022 statistics share from Section 14.4.
- Derivation in a new engine module `src/engine/electorate.ts`, in exact
  rationals: from party vote shares, party compositions and group turnout, the
  votes of each group, the group population shares (votes divided by turnout,
  normalized) and each group's vote weights across the parties. The build
  writes these through the editor's existing edit functions, so the scenario
  stays in the engine's group-first form.
- Example suggestions computed by the same module in the forward direction
  from the Section 14.4 example (CBS 2022 shares, 70% turnout, example
  weights), so the derived check of an unchanged example reproduces the 2022
  shares.
- Percents pages (`votes.shares`, `compose.N`) and the check page shown on
  one page part whenever they fit: up to eight rows per part, four when a
  typed name is longer than 32 characters; parts show the same range and
  "Ещё N — после «Далее»" cue as names pages, and the pie always shows every
  row of the page.
- Questionnaire turnout limits become 1% to 100% (a group with votes and no
  turnout has no defined size). The editor keeps 0 to 100%.
- Lesson «Что такое группа избирателей?»: the closing list follows the new
  chapter order (turnout in chapter 3, party composition in chapter 4, group
  size derived and checked in chapter 4, future in chapter 5). Narrator
  replies that mention the preference chapter or say the shares come from
  statistics are reworded.
- Review lines: chapter 2 lists the group names, chapter 3 the turnouts,
  chapter 4 the party vote shares and the derived group shares. Filled-item
  labels for the new pages; the filled-item name of `compose.N` is a party.
- New strings in all three tables; the removed pages' strings deleted.
- Specification Sections 14.4, 14.5, 14.6 and the engine module table, and the
  repository map, synced at close.

**Out of scope** (at least two)

- A page per group showing how that group divides across the parties. The
  user raised it and named the problem himself; after the build the split is
  visible in the editor's group rows (vote weights). No backlog item: no
  specification requirement asks for it.
- Bars as an alternative to the pie on the new pages. The lesson before
  already uses bars; the user named the pie first.
- A party-first mode in the editor. The editor stays group-first; it shows the
  derived values after the build. Not requested.
- Calibrating party compositions to surveys: survey reference data, M6-05.
- The final-share inverse solver of Section 8.1 (M4-03) is a different
  inverse and is not touched; the module name `inverse` stays reserved for it.
- English and Hebrew wording of the new strings: reviewed as a whole in M3-05.

## Approach

**Derivation (engine, exact).** Inputs are percent texts: the party vote
shares s (one per party, summing to exactly 100), one composition row c per
party (one value per group, summing to exactly 100) and the group turnouts t.
For each group g the share of all votes it casts is v(g) = Σ over parties of
s(p)·c(p, g). Its population share is v(g)/t(g) divided by the sum of that
quantity over the groups. Its vote weight for party p is s(p)·c(p, g)/v(g). A
group with v(g) = 0 gets population share 0 and even weights across the
parties. All of this is exact; only the result is rounded, to four decimals of
a percent (six decimals of a fraction), with a sum-preserving largest
remainder rule (ties to the lower index), so the population shares sum to
exactly 100% and each group's weights sum to exactly 100%. Invalid input
(wrong counts, a value that is not a percent, a row that does not sum to 100,
a group that casts votes with zero turnout) gives no result. The forward
counterpart takes population shares, turnouts and weight rows and returns the
party vote shares and composition rows, each rounded with the same rule to a
requested number of decimals; it gives the example suggestions.

**Consequence.** In the questionnaire path the year-0 result reproduces the
typed party vote shares (within the six-decimal rounding of the stored
fractions); turnout no longer moves the year-0 seats, it shapes the group
sizes, and through them the results of later years once growth or turnout
change is set. The turnout explanation and the check page say this.

**Prototype (session script, not in the repository).** From the Section 14.4
example the forward direction gives party shares 25.605 / 24.765 / 9.695 /
11.95 / 14.935 / 13.05% (Likud, Yesh Atid, Avoda, Religious Zionism, Shas,
Ra'am). Rounded to two decimals, 25.61 / 24.77 / 9.69 / 11.95 / 14.93 / 13.05,
they keep the preset seats 31 / 30 / 11 / 14 / 18 / 16; one decimal would give
31 / 30 / 12 / 14 / 18 / 15, so the suggestions use two. Compositions rounded
to one decimal (for example Likud 32.8 / 43.1 / 6.2 / 4.3 / 6.6 / 7.0, Ra'am
0 / 0 / 0 / 0 / 97.7 / 2.3) derive back, at 70% turnout, to 33.5821 / 24.5047
/ 7.9165 / 10.9991 / 17.002 / 5.9956%, which is the CBS 33.6 / 24.5 / 7.9 / 11
/ 17 / 6 at one decimal. Built seats stay 31 / 30 / 11 / 14 / 18 / 16, also
with Arab turnout at 50%.

**Suggestions.**

| Page | Suggestion |
| --- | --- |
| `votes.shares` | The two-decimal example shares when the six-list set and the example groups are both chosen; otherwise even shares |
| `compose.N` | The one-decimal example row of that list when both are chosen; otherwise the group set's suggested shares (the CBS shares for the example groups, even shares for own groups), which at even turnout derives back to exactly those shares |
| `turnout.N` | 70%, unchanged |

**Pie.** A circle drawn as a CSS conic gradient in the illustration column,
replacing the motif on the three pages; slices in party colours on
`votes.shares` and group colours on `compose.N` and `votes.check`, a light
grey rest when the typed sum is below 100%, scaled to a full circle when above.
The slice boundaries are cumulative sums computed exactly in the engine's
numeric module and rounded to two decimals for display only; the interface
sources keep their no-float rule. The pie is decorative (`aria-hidden`); the
fields and the check list carry the values. Each field label gets a colour key
like the lesson's. On the phone layout, where the illustration column is
hidden, the pie shows under the fields.

**Pages and parts.** `BOOK_LIMITS` gains the percents-page row cap (eight, four
with a name over 32 characters), calibrated by `tests/e2e/bookFit.spec.ts` at
the six Section 14.6 sizes; if eight rows do not fit at 1024 × 576, the
largest cap that fits is used and recorded as a deviation. The example (six
parties, six groups) and ten catalog lists split 5 + 5 are expected; eight
60-character groups give 4 + 4.

**Rejected alternative:** asking the group shares and deriving the party
compositions keeps the old direction the user rejected; asking compositions
without party vote shares leaves the group sizes undetermined.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario | None: groups, population shares, turnouts and vote weights are written as before, from derived values | None (stays 2) |
| Questionnaire draft | Page keys `people.shares` and `prefs.N` removed; `votes.shares` and `compose.N` added; `votes.check` takes no answer. The draft is kept only in memory, so no stored draft needs migration | None |

## Interface Delta

- Engine `src/engine/electorate.ts` (new): the party-first derivation of
  population shares and vote weights, and its forward counterpart for party
  shares and compositions, both on percent texts, exact, with sum-preserving
  rounding.
- Engine `src/engine/numeric.ts`: a sum-preserving rounding of percents to a
  given number of decimals (largest remainder, ties to the lower index) and
  the cumulative pie boundaries of a list of percent texts.
- `src/ui/book.ts`: new sections and page keys, page kind `check`, page parts
  for percents and check pages, review and filled-item changes, the
  derived-electorate view of a draft for the check page and the build.
- `src/ui/BookView.tsx`: the pie, colour keys on percents fields, the check
  page, part cue on percents and check pages, review lines, lesson points.
- Interface sources may import the new engine module (the allowed-import list
  of the source scan gains `electorate`).

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None of them change. The new derivation produces scenario inputs (population shares and vote weights); votes, threshold, Hamilton quotas, remainders, ties and coalitions are computed by the unchanged engine from the built scenario |
| Where exact rationals are required | The whole derivation: group votes, population shares, vote weights and the forward shares and compositions. Rounding happens once, at the end, to six decimals of a fraction with an exact largest-remainder rule; pie boundaries are exact sums before their display rounding |
| Ordering / tie rules relied on | Largest-remainder ties go to the lower index (group order for population shares, party order for weights and party shares, group order for compositions). Party tie order stays the party index, as in every questionnaire build |
| Any display rounding near a decision? | No. The stored fractions are inputs, not decisions; seats are computed exactly from them. The pie and the check list are rounded for display after the derivation and never feed back |
| How determinism across runs, round trip and locale is proven | Engine tests: repeated derivation gives identical strings, sums are exactly 100, a zero-vote group and invalid inputs behave as specified, derive after describe reproduces the example within 0.0001 percentage points. Book and store tests: the example build allocates 31 / 30 / 11 / 14 / 18 / 16 of 120, the build is identical in all three interface languages, survives a schema serialize and validate round trip, and equals the same values typed in the editor |

## Files

| Path | Change |
| --- | --- |
| `src/engine/electorate.ts` | New: party-first derivation and forward description |
| `src/engine/numeric.ts` | Sum-preserving percent rounding; pie boundaries |
| `src/ui/book.ts` | Sections, page order, limits (turnout 1–100), suggestions, page specs, parts, check page, build through derived values, review, filled items, ready values |
| `src/ui/BookView.tsx` | Pie, colour keys, check page, part cue, step kind and subject of `compose.N`, captions, lesson points, review lines |
| `src/ui/App.tsx` | Filled-item name of `compose.N` is a party |
| `src/ui/styles.css` | Pie, check list, compact percents rows, phone pie |
| `src/ui/motifs.tsx` | Only if the preference pie drawing becomes unused and must go |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Chapter titles 3 and 4, new page, check, review, filled and lesson strings; removed strings of `people.shares` and `prefs` |
| `tests/engine/electorate.test.ts` | New: exactness, sums, zero-vote group, invalid input, determinism, example round trip |
| `tests/engine/numeric.test.ts` | Percent rounding and pie boundaries |
| `tests/ui/book.test.ts` | Page order, sections, limits, suggestions, parts, check page, build, review, filled items |
| `tests/ui/bookView.test.tsx` | Pie, keys, check page, cue, lesson, review rendering |
| `tests/ui/store.test.ts` | Allowed engine imports; questionnaire build and seats through the store |
| `tests/e2e/book.spec.ts`, `tests/e2e/bookFit.spec.ts`, `tests/e2e/helpers.ts` | Page keys of the walks, error states on the new percents pages, fit of the pie pages |
| `doc/spec/elections-simulator.md` | At close: module table, Sections 14.4, 14.5, 14.6 |
| `.github/copilot-instructions.md` | At close: repository map |
| `doc/backlog.md`, `doc/work/STATUS.md` | Loop bookkeeping |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Party vote shares become a new question (`votes.shares`). — **Recommendation:**
   yes; without them the group sizes cannot be derived from party compositions.
2. In the questionnaire path turnout shapes the group sizes and no longer
   moves the year-0 seats, which reproduce the typed vote shares. —
   **Recommendation:** accept and say it on the turnout and check pages; it is
   the only consistent reading of "turnout first, then who votes for whom".
3. Derived values are stored with four decimals of a percent. —
   **Recommendation:** yes; two decimals of a percent could move a seat.
4. Questionnaire turnout minimum 1%. — **Recommendation:** yes; the editor keeps
   0%.
5. A group no party draws from gets share 0% and even weights; the check page
   says such a group casts no votes. — **Recommendation:** yes.
6. The unchanged example now builds an approximation of the preset (same
   seats, group shares equal to CBS at one decimal) rather than the preset
   itself. — **Recommendation:** accept; tests assert the seats and the
   one-decimal shares.
7. Pie, not bars, on the new pages. — **Recommendation:** pie.
8. Percents parts of up to eight rows, four with a name over 32 characters. —
   **Recommendation:** yes, calibrated by the fit test.
9. With the example groups but other parties, each composition suggests the
   CBS shares, so the check shows the 2022 split at even turnout. —
   **Recommendation:** yes.

Approved 2026-10-30 on the user's requests: "zakonchi predidushie komenty o
ploche sdelat vse eto rapsredelenie # Какую долю избирателей составляет каждая
группа? na odnoi stranice i pokazat diagrammu piraga", "Pravilnei pokazivat kak
my dumaem spstav kazhoi partii iz razniih group, a ot etogo pust uzhe
formiruetsa nasha naseleenie" and "ya da hochu upravljat etim pokazatelem i eto
dolzhno zapolnjatsa esho do togo kak my zaolnaem % izbiratelei v kazhdoi
partii" (2026-10-30), in autopilot mode; the recommendations above are the
decisions.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| `/3-implement` | `parsePercent` and the new `roundExactPercents` are exported from `numeric.ts` | The questionnaire reads typed percents and rounds exact fractions through the engine, since UI files may not parse or round on their own |
| `/3-implement` | New engine function `castingGroups(shares, compositions, groups)` in `electorate.ts`, used by `electorateCheck` for the "casts no votes" note | `book.ts` may not import `engine/rational`; a `casts` field on `DerivedElectorate` broke five engine `toEqual` fixtures, so the flag became its own pure function |
| `/3-implement` | The check page reads only confirmed answers, like the build | A half-typed page must not move the check; pinned by `uses only confirmed answers, like the build` |
| `/3-implement` | `partyColorOf(id, index)` helper in `book.ts`, shared by the pie and the colour keys | One place for list colours: catalog colour first, then position, as `groupColorOf` does for groups |
| `/3-implement` | The `'pie'` motif stays in the section table, but the pages draw the live pie in its place | The motif keys of the section table are pinned by tests; the drawing slot shows the typed values instead |
| `/3-implement` | Pie pages use 3:1 columns, like the review; the phone rule lists the same `:has` selectors | At 125% a 60-character group name wrapped to three lines in the 2:1 text column and the compose page overflowed by about 70px; the phone rule lost to the more specific `:has` selector |
| `/3-implement` | The remainder line and the "ещё — после «Далее»" cue share one line (`.book__tally`) | Saves a line on dense parts at 125% |
| `/3-implement` | A typed name over 32 characters is cut to 24 characters and "…" in the review lists of percents (chapters 3 and 4), with `BOOK_LIMITS.reviewItemName` and `reviewItemName`; `reviewSize` counts the cut length | Chapter 4 with ten long party names and eight long group names came to about 24 lines and overflowed; chapters 1 and 2 still list every name in full |
| `/3-implement` | `bookNext` turns the parts of a page that takes no answer (the check) before turning the page; new store test `walks the parts of the check page before turning it` | The check page was cut into parts but Next jumped to the next page from its first part, found by the heavy fit walk (`votes.check#1`) |
| `/3-implement` | Test corrections: store skip test expects `P1: 0.460829`; the bookView remainder test restores 25 before turning the page; the caption test checks `turnout.0` before `votes.shares`; `walkBook` in `bookFit.spec.ts` records every page and part it shows | Each test assumed the old order or values (12.5% compositions where the pinned suggestion is whole even percents; turnout now before the votes) or failed to record later parts of a page; every assertion is kept |
| `/4-close` | Files table against the changed files: `src/ui/store.ts` (the check-page parts in `bookNext`) and `tests/ui/app.test.tsx` (filled-item names, listed in the test plan) changed without a row; `src/ui/motifs.tsx` and `tests/e2e/helpers.ts` did not change | The pie drawing stays as the section motif, so `motifs.tsx` keeps it; the walk helpers in `helpers.ts` already followed any page list, and the page keys of the walks live in the two specs |
