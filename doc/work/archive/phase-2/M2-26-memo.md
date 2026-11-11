# Memo — M2-26 Israeli example group shares from 2022 statistics

| Field | Value |
| --- | --- |
| item | M2-26 |
| epic | M2 |
| phase | Phase 2 — M2 reopened for first-review corrections |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-30 |
| closed | 2026-10-30 |

## Problem

The questionnaire offers a «Учебный набор групп», and the lesson before it shows
how Likud and Ra'am draw votes from groups. Both use the same six groups and
shares, but the choice page does not say so, and the shares (35 / 25 / 10 / 10
/ 15 / 5%) are round assumptions, not data. The user asked for the set to match
the Likud example, the same groups, with shares from historical 2022 figures
where they exist, summing to 100%, and always including «Другие / не
классифицированы».

## Scope

**In scope**

- New shares of the six example groups from the Central Bureau of Statistics
  (CBS) figures for the 2022 electorate, one decimal, «Другие / не
  классифицированы» the exact remainder to 100%. One source of truth, so the
  preset, the questionnaire's example shares, the example preference pages and
  the lesson change together.
- The people.set page shows the set it offers: the six groups with their
  colour keys and shares, titled as the same groups as the example before it,
  and a source line.
- The narrator reply for the example set and the results note of the Israeli
  example say where the shares come from and that preferences stay assumptions.
- Specification: Section 14.1 allows official CBS figures for the example
  shares; Section 14.4 gets the new share column, the derivation with sources
  and the new preset results; Section 14.5 the new lesson numbers.

**Out of scope** (at least two)

- Preference weights stay teaching assumptions. Calibrating them to surveys
  belongs to the survey reference data, M6-05.
- Group turnout stays 70% for every group. Per-group turnout from 2022 was not
  requested and no specification requirement asks for it.
- Own groups are not forced to include «Другие / не классифицированы»; the ▾
  list already offers it (Open Question 4).
- English and Hebrew wording of the new strings is reviewed with the rest in
  M3-05.

## Approach

**Data.** Two official CBS releases from 2022:

| Figure | Source |
| --- | --- |
| Eligible voters for the 25th Knesset: 77% Jews, of whom Haredim are 11% of all eligible voters; 17% Arabs; 6% others (non-Arab Christians and residents without religious classification) | CBS media release 342/2022, "Number of voters in Israel before the elections to the 25th Knesset" |
| Self-definition of Jews aged 20 and over: secular 45.3%, traditional not so religious 19.2%, traditional-religious 13.9%, religious 10.7%, Haredi 10.5% | CBS release of 20 September 2022 (reported by JNS) |

Haredim and Arabs come straight from the first release. The remaining 66% of
eligible voters (Jews, not Haredi) are split in proportion to the three
non-Haredi categories of the second (45.3 : 33.1 : 10.7, the two traditional
categories together), rounded to one decimal. «Другие / не классифицированы»
is the exact remainder, which equals the CBS «others» figure.

| Group | Share now | New share | Derivation |
| --- | --- | --- | --- |
| Светские евреи (`secular`) | 35% | 33.6% | 66 × 45.3 / 89.1 |
| Традиционные евреи, масорти (`traditional`) | 25% | 24.5% | 66 × 33.1 / 89.1 |
| Религиозные евреи, не харедим (`religious`) | 10% | 7.9% | 66 × 10.7 / 89.1 |
| Харедим (`haredi`) | 10% | 11% | CBS, eligible voters |
| Арабские граждане (`arab`) | 15% | 17% | CBS, eligible voters |
| Другие / не классифицированы (`other`) | 5% | 6% | remainder to 100% (CBS «others») |

The shares live in the single `EXAMPLE_GROUPS` table in `src/ui/presets.ts`,
which the preset, the questionnaire suggestions and the lesson already read
(Section 14.4). Its comment names the sources. Weights are unchanged.

**Questionnaire.** The people.set page (Section 14.5), which follows the Likud
and Ra'am lesson, shows a framed list under its two choices: title «Учебный
набор — те же шесть групп, что в примере на прошлой странице», then each
group as a colour key (the lesson's key square), its catalog name and its share
in the locale's notation, «Другие / не классифицированы» last, and a short
source line naming CBS and 2022. The book model gives the list as group IDs
with percent texts and no language. The narrator reply for the example set says
the shares come from the 2022 statistics and preferences are assumptions; the
results note of the Israeli example says the same. Every page still fits at the
Section 14.6 sizes.

**Rejected alternative:** multiplying the Jewish 77% by all five self-definition
shares gives Haredim 8.1%, below the 11% CBS counts directly among eligible
voters. Using the direct figure where one exists is closer to the data.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Preset `israelExample`, group `populationShare` | New values 0.336 / 0.245 / 0.079 / 0.11 / 0.17 / 0.06 | None; version 2. Saved scenarios keep the shares they were saved with |

## Interface Delta

- people.set page: framed list of the example set (`data-example-set`, one
  `data-set-group` entry per group with key, name and share) and a source line
  (`data-set-source`).
- Book model: one language-free export listing the example set as group IDs
  with percent texts.
- Strings in ru, en, he: the list title, the source line, the example-set
  narrator reply and the Israeli example note.
- No engine function, export format or schema changes.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None in code. The preset's input changes, so its votes, quotas, remainders, seats and coalitions change: valid votes 179 235 / 173 355 / 67 865 / 83 650 / 104 545 / 91 350 of 700 000 (Likud, Yesh Atid, Avoda, Religious Zionism, Shas, Ra'am); all pass 22 750 (3.25%); seats 31 / 30 / 11 / 14 / 18 / 16 = 120 |
| Where exact rationals are required | Shares are decimal strings summing to exactly 1; votes, threshold, quotas and remainders stay exact in the unchanged engine. The questionnaire's example shares sum to exactly 100 in its own exact check |
| Ordering / tie rules relied on | Hamilton remainders .922 (Shas), .726 (Likud), .718 (Yesh Atid), .66 (Ra'am) take the four remaining seats ahead of .634 (Avoda) and .34; no tie at the cut-off, so tie order decides nothing |
| Any display rounding near a decision? | No. The shown shares are the stored decimals; the lesson shares are rounded for display after the engine computes them |
| How determinism across runs, round trip and locale is proven | The existing preset tests re-run with the new votes and seats: exact vote counts, seats, no cut-off tie, preset load, export and import, and the language switch in the browser suite. A new test checks the example shares sum to exactly 1, `other` is last, and every weight row sums to 1 |

## Files

| Path | Change |
| --- | --- |
| `src/ui/presets.ts` | New `EXAMPLE_GROUPS` shares; comment with the sources |
| `src/ui/book.ts` | Export of the example set as group IDs and percent texts |
| `src/ui/BookView.tsx` | people.set page shows the set and the source line |
| `src/ui/styles.css` | Framed set list, reusing the lesson key square |
| `src/i18n/ru.ts`, `en.ts`, `he.ts` | Set title and source; example-set narrator reply; Israeli example note |
| `tests/ui/store.test.ts` | Table shares, vote counts, seats 31 / 30 / 11 / 14 / 18 / 16; sum check |
| `tests/ui/book.test.ts` | Example shares on people.shares, lesson shares, the set export |
| `tests/ui/bookView.test.tsx` | Lesson numbers; people.set list and source |
| `tests/e2e/israel.spec.ts`, `tests/e2e/book.spec.ts` | Expected seats |
| `doc/spec/elections-simulator.md` | Sections 14.1, 14.4, 14.5 |
| `.github/copilot-instructions.md` | Repository map line for `presets.ts`, if wording changes |
| `doc/backlog.md`, `doc/work/STATUS.md` | Tick and log at close |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Haredim: 11% directly from CBS, or 8.1% from the self-definition split? —
   **Recommendation:** 11%, the figure CBS gives for eligible voters.
2. Traditional and traditional-religious together in `traditional`? —
   **Recommendation:** yes; both are CBS «masorti» categories and the catalog
   group is «Традиционные евреи, масорти».
3. Precision of the shares? — **Recommendation:** one decimal; whole numbers
   would push a rounding error into some group.
4. Must own groups include «Другие / не классифицированы»? —
   **Recommendation:** no; the request concerns the educational set, own
   groups stay free and the ▾ list offers it.
5. Where to show the source? — **Recommendation:** on the people.set page,
   in the example-set narrator reply and in the results note; not on every
   page.
6. Keep the preference weights? — **Recommendation:** yes, as assumptions;
   survey calibration stays in M6-05.

Approved 2026-10-30 on the user's instruction: "prodolzhi to chot ty delaesh,
potm srazu otredaktirui sdelai tak chto by uchebnii nabor group sootvestvoval
primeru s likad , rovno tezhe gruppi i procenty vozmi esli est na sitoricheskih
dannih za 22 god, i raspredeli tak chto by vknoche vihodilo 100% i vsegda
dolzhan byt sredi nih grupa - Другие / не классифицированы" (2026-10-30), in
autopilot mode; the recommendations above are the decisions.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | `tests/ui/catalog.test.ts` changed, though not in the Files table | Its note test pins the example note text, which now names the Central Bureau of Statistics |
| /3-implement | Two seat expectations in `tests/ui/book.test.ts` (`gives the Israeli example from the six lists, every page confirmed`, `gives the Israeli example from the six lists picked one by one`) were changed from 12 / 15 / 18 / 14 to 11 / 14 / 18 / 16 | /2-tests missed them; the new values are the memo's hand-computed seats, the same the other fixtures pin, so no assertion is weaker |
| /3-implement | `tests/e2e/book.spec.ts` `has no serious axe findings on its pages` gets `test.setTimeout(180_000)` | Under the full parallel run on desktop it hit the 60 s limit during its last scan, with no finding (6.5 s alone); it is a whole-book walk like the `bookFit` walks, which already have 180 s. Assertions unchanged |
| /3-implement | The set list keeps each share on one line (`white-space: nowrap`) and lets the name wrap | A screenshot at 1024 × 576 showed «11 / %» split across two lines next to a long group name |
