# Memo — M2-22 Israeli educational example and the 2022 list catalog

| Field | Value |
| --- | --- |
| item | M2-22 |
| epic | M2 |
| phase | Phase 2 — M2 reopened for the questionnaire, time model and Israeli example |
| status | closed |
| created | 2026-10-30 |
| closed | 2026-10-30 |

## Problem

Section 14.4 asks for a recognisable Israeli example that a learner can load on
purpose, beside the neutral start, and for a catalog of the lists that won
seats in the 25th Knesset (2022), with short neutral descriptions, so that
the questionnaire (M2-23) can offer real names. Today every preset is a
Section 8 abstraction with numbered parties; there is no catalog, no way for a
stored entity to show a real list name in the interface language, and the
group palette knows nothing about the six example groups.

## Scope

**In scope**

- A language-free catalog in the interface layer: six example groups (ID and
  colour, Section 14.4) and the ten lists that won seats in 2022 (ID, colour,
  seat order), tagged with the year; the six-list educational set as an ordered
  subset.
- Preset "Israeli educational example" after the existing ones: 120 seats,
  threshold 3.25%, population 1 000 000, the six groups with their shares,
  turnout 70%, zero growth and turnout change, full participation and
  validity, open voting with all six lists allowed and the preference table of
  Section 14.4 (zeros stored as zeros), no blocks, every list may join a
  government, no coalition restrictions. Groups and lists use their catalog
  IDs and empty names.
- Display names: an entity with an empty name whose ID is a catalog ID shows
  the catalog name in the interface language; a typed name wins (the M2-19
  rule). The scenario title shows the preset name.
- Group colours: a catalog group takes its catalog colour; any other group
  keeps the palette colour by position.
- Editor: a party row whose ID is a catalog list and whose name is empty shows
  one line with the catalog year and the neutral description.
- A note at the top of the results while the example is loaded: an educational
  example after the 2022 election; shares and preferences are assumptions, not
  election results or a poll.
- All catalog names, descriptions, the preset name and the note in Russian,
  English and Hebrew.

**Out of scope** (at least two)

- "Подобрать названия из Израиля", the six-list set offered in the
  questionnaire and the narrator's historical facts — M2-23.
- Confirmation before a preset or the questionnaire replaces a scenario the
  user has changed — M2-23 (Section 14.5).
- Drawings, coin, Knesset and other motifs — M2-24.
- A catalog for other years (for example 2021): Section 14.4 asks only for
  the 2022 lists.
- An editor control that adds a list from the catalog: Section 14.5 places
  the catalog choice in the questionnaire.
- Survey reference data (IDI, Pew) — M6-05.

## Approach

Section 14.4. The catalog ID is the entity ID itself: scenario IDs already
accept lower-case letters, digits, `-` and `_`, so `likud` or `secular` is a
valid ID, export and import keep it, and no schema field or version is added.
`src/ui/catalog.ts` lists the catalog entries without any translation import,
like `presets.ts`. `src/ui/presets.ts` builds the example from the catalog IDs.
`src/ui/names.ts` resolves an empty-named catalog entity to its catalog name
key before falling back to the numbered default label, so every view, the
editor placeholder and the duplicate-name rule see the same name.
`src/ui/groupColors.ts` gains a colour-by-group lookup (catalog first, then
position), used by Composition and Future. The note and the editor line read
the catalog through the same module.

The example's seats follow from the table without any new arithmetic: votes
are 182 000, 175 000, 68 250, 91 000, 103 250 and 80 500 of 700 000 valid
ballots (Likud, Yesh Atid, Avoda, Religious Zionism, Shas, Ra'am), every list
passes 3.25%, and Hamilton gives 31, 30, 12, 15, 18 and 14 seats (remainders
0.2, 0.0, 0.7, 0.6, 0.7, 0.8; the three extra seats go to Ra'am, Avoda and
Shas; the fourth remainder, 0.6, is below them, so no tie decides a seat).

**Rejected alternative:** a separate `catalogId` field on groups and parties —
it needs schema version 3, a migration and a second identity to keep in sync,
while the existing ID already carries the meaning and survives export.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario | none; catalog entities use catalog IDs as their ID | none |
| Preset list | `israelExample`, scenario ID `israel-example`, after the six existing presets | none |

## Interface Delta

- `src/ui/catalog.ts` (new): catalog year, groups (ID, colour), lists (ID,
  colour, seat order), the six-list set, lookups by kind and ID.
- `src/ui/presets.ts`: the new preset.
- `src/ui/names.ts`: catalog names for empty-named catalog entities.
- `src/ui/groupColors.ts`: colour of a group by ID and position.
- `src/ui/Composition.tsx`, `src/ui/Future.tsx`: group colour by ID.
- `src/ui/Editor.tsx`: catalog line in party rows.
- `src/ui/App.tsx`: example note in the results region.
- `src/ui/styles.css`: the catalog line.
- `src/i18n/ru.ts`, `en.ts`, `he.ts`: preset name, note, catalog year label,
  ten list names and descriptions, six group names.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None. The preset is input data; names and colours are display only |
| Where exact rationals are required | Unchanged: the engine computes the example from its decimal strings |
| Ordering / tie rules relied on | Tie order 1–6 in table order; it decides nothing here because no two lists share the cut-off remainder |
| Any display rounding near a decision? | No; the threshold margin is wide (the smallest list has 9.75%) |
| How determinism across runs, round trip and locale is proven | A fixture test pins the votes and the seats 31 / 30 / 12 / 15 / 18 / 14 above; the existing per-preset tests (valid, 120 seats, same input in every language, same seats with display names, ASCII only) cover the new preset; an export and import round trip keeps the catalog IDs and the seats |

## Files

| Path | Change |
| --- | --- |
| `src/ui/catalog.ts` | new: language-free catalog |
| `src/ui/presets.ts` | Israeli educational example |
| `src/ui/names.ts` | catalog names |
| `src/ui/groupColors.ts` | catalog group colours |
| `src/ui/Composition.tsx`, `src/ui/Future.tsx` | group colour by ID |
| `src/ui/Editor.tsx` | catalog description line in party rows |
| `src/ui/App.tsx` | example note |
| `src/ui/styles.css` | catalog line style |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | new strings |
| `tests/ui/catalog.test.ts` | new: catalog shape, colours, set, names in every locale |
| `tests/ui/store.test.ts` | preset list, example fixture, round trip |
| `tests/ui/names.test.ts` | catalog names, typed name wins, title |
| `tests/ui/views.test.tsx`, `tests/ui/editor.test.tsx`, `tests/ui/app.test.tsx` | catalog colours, catalog line, note |
| `tests/e2e/israel.spec.ts` | new: load the example in the browser |
| `doc/spec/elections-simulator.md` | Section 14.4 as built |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. How does a stored entity remember its catalog entry? — **Recommendation:**
   the catalog ID is the entity ID (`likud`, `secular`); no schema change.
2. What do the catalog IDs look like? — **Recommendation:** lower-case Latin
   transliterations joined with `-`: groups `secular`, `traditional`,
   `religious`, `haredi`, `arab`, `other`; lists `likud`, `yesh-atid`,
   `religious-zionism`, `national-unity`, `shas`, `utj`, `yisrael-beiteinu`,
   `raam`, `hadash-taal`, `avoda`.
3. Which list colours? — **Recommendation:** ten distinct colours readable on
   white, close to the lists' familiar hues but not claimed as official:
   Likud `#1D4ED8`, Yesh Atid `#38BDF8`, Religious Zionism `#CA8A04`, National
   Unity `#0D9488`, Shas `#475569`, United Torah Judaism `#1E293B`, Yisrael
   Beiteinu `#4338CA`, Ra'am `#65A30D`, Hadash–Ta'al `#9D174D`, Avoda
   `#DC2626`; group colours are those of Section 14.4.
4. What is the Russian name of the 2022 joint list? — **Recommendation:**
   "Религиозный сионизм", its official 2022 name, with the description naming
   its parties (Religious Zionist Party, Otzma Yehudit, Noam); the earlier text
   called it "Религиозный сионизм / Оцма Йехудит".
5. When does the editor show the catalog description? — **Recommendation:**
   only while the name is empty, because a typed name may describe a
   different list.
6. Where is the example labelled? — **Recommendation:** a note at the top of
   the results region for as long as the scenario ID is the example's, also
   after edits, because the numbers remain the example's assumptions.

Approved 2026-10-30 on the user's instruction for an autonomous run: "izuchi vnedrenie, vizualizaion i implement vse eto, do nachala M2" (2026-10-30), in autopilot mode; the recommendations above are the decisions.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | `tests/ui/names.test.ts`: the existing row for an unnamed party with ID `likud` ("Party likud") now uses `meretz` | `likud` now resolves to a catalog name; the row tests the numbered fallback, and Meretz won no seats in 2022, so it is not in the catalog |
| /2-tests | Stubs were committed with the tests: an empty `catalog.ts`, a `groupColorOf` that ignored the ID, a throwing example builder | The suite compiled and failed on behaviour, not on missing imports |
| /3-implement | `styles.css` also gained `.example-note`, not only the catalog line | The results note needs a visible frame to read as a label |
| /3-implement | The catalog lookups are named `catalogNameKey`, `catalogAboutKey`, `catalogGroupColor` and `catalogListColor`; list colours are looked up as well as group colours | The preset builder takes list colours from the catalog instead of repeating them |
| /4-close | `.github/copilot-instructions.md` module map names `catalog.ts` and `groupColorOf` | Repository map sync |
