# Memo — M2-30 Demographic future of chosen coalitions

| Field | Value |
| --- | --- |
| item | M2-30 |
| epic | M2 |
| phase | Phase 2 — M2 reopened for second-review corrections |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-30 |
| closed | 2026-10-30 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

The «Будущее» tab shows only tables: population and turnout per group, votes
and seats per party, year 0 beside year k. The user called the tool a
coalition simulator more than an election one and asked that this tab answer a
coalition question: pick up to three of today's coalitions with checkboxes in
the left column, where the data editor sits now, and see on the right, as
pies, how the same coalitions would look after the demographic change of the
chosen year. The tab is to be called «Демографическое будущее».

## Scope

**In scope**

- The view label `view.future` becomes «Демографическое будущее» (en
  "Demographic future", he "עתיד דמוגרפי"); the panel title follows it.
- On the future view the left column shows a coalition chooser instead of the
  editor, titled «Коалиции для прогноза», with a one-line hint: «Отметьте до
  трёх коалиций — справа видно, сколько мест у них будет в выбранном году.»
  The editor stays on every other view; data are edited on «Данные».
- The chooser lists, each with a checkbox, the member names joined by « + » and
  today's seats:
  1. ticked coalitions that no longer appear below, so they can always be
     unticked;
  2. the coalition put together on the «Коалиции» tab, when it has at least one
     party and is not already a listed minimal winning coalition, marked
     «Ваша коалиция с вкладки «Коалиции»»;
  3. today's minimal winning coalitions from the coalition search, in the
     search's order, at most `LISTED_COALITIONS` (200).
  The same party set appears once. While the search runs, the list says so;
  with no minimal winning coalition it says «Сегодня выигрышных коалиций нет.»;
  a cancelled or failed search shows the same notice as the «Коалиции» tab.
- At most three coalitions are ticked. With three ticked, the other checkboxes
  are disabled and a note says «Можно выбрать не больше трёх. Снимите отметку,
  чтобы выбрать другую.»
- The ticked coalitions are view state: kept in tick order, not saved in the
  scenario, local storage or exports. A ticked coalition is dropped when any of
  its parties is deleted. Loading a preset, importing a file and building the
  questionnaire clear them, as they clear the «Коалиции» tab's selection.
- On the right, under the year controls and the year's status line and above
  the existing tables, a section «Выбранные коалиции» shows one card per ticked
  coalition in tick order. With none ticked it says «Отметьте до трёх коалиций
  в списке коалиций.»
- A card has the member names as its title and two pies side by side, «Год 0»
  and «Год k». Each pie is the whole parliament: the members' seats in their
  party colours in scenario order, then the other parties' seats as one grey
  slice, with a mark at the majority seat. Under each pie: «m из N мест» and
  «есть большинство» or «нет большинства»; in a year that allocates no seats,
  the no-allocation reason instead. The pies are images with a text
  alternative that states the same.
- Under the pies a table gives the exact values: one row per member with seats
  in year 0, in year k and the change; a total row; a row with the seats
  needed for a majority. A coalition that breaks the coalition rules (a party
  that cannot join a government, or a forbidden pair) carries the note
  «Нарушает правила коалиций (вкладка «Коалиции»)»; rules do not change with
  the year.
- On a desktop the chooser column scrolls on its own and sticks like the editor
  column (M2-29). On a phone the future view shows the chooser above the
  results.
- Every new string in ru, en and he.

**Out of scope** (at least two)

- Searching for the coalitions that become minimal winning in year k. Section
  14.2 says the coalition search is not run for a future year; the cards show
  today's coalitions after the change. Not a specification requirement, so no
  item is filed.
- Editing data on the future tab. The editor stays on «Данные» and the other
  views; the year controls stay in the results column.
- A chart of a coalition over all years 0–20; the cards compare year 0 with the
  chosen year only.
- Saving or exporting the ticked coalitions.

## Approach

Section 14.3 stays the basis: the year is a view setting, year k reuses
`runSeats(scenario, k)` through the store's cached projection, and the
coalition search runs for the current scenario only.

**Engine.** A new `buildCoalitionFuture(scenario, base, projected, partyIds)`
in `src/engine/future.ts` takes the seat results of year 0 and year k, as
`buildFutureReport` does, and a party set. It evaluates the set in both years
with `evaluateCoalition` and returns: the members in scenario order with their
name, colour and seats in each year with the change; per year the total seats,
whether the majority is reached, the no-allocation reason or none, and the
cumulative pie stops of the members as percent of `seatCount` rounded to two
places; the majority seat's stop; the seats needed for a majority; and the
rule breaches (ineligible parties and forbidden pairs) from the evaluation.
An unknown party is refused, as `evaluateCoalition` refuses it. Every number
is computed there from exact rationals; the UI only formats.

**Choice.** A new `src/ui/coalitionChoice.ts` holds the limit of three, the
order-free key of a party set (IDs sorted by code unit and joined), and the
pure function that builds the chooser's entry list from the ticked sets, the
«Коалиции» tab selection and the runner's minimal winning list, removing
repeats by key. No arithmetic: it compares IDs only.

**Store.** New UI-only state `futureCoalitions` (party ID lists in tick order)
and `toggleFutureCoalition(partyIds)`: removes a ticked set, else appends it
when fewer than three are ticked, else does nothing. `commit` drops a set any
of whose parties is gone, beside the existing `pruneSelection`; the preset,
import and questionnaire paths clear it where they clear `coalitionSelection`.

**View.** `App.tsx` renders, on the future view, a chooser region
(`data-region="chooser"`) in the place of the editor region; the editor element
is kept in its memo and comes back on the other views. A new
`src/ui/FutureChooser.tsx` renders the list from the runner state. `Future.tsx`
gains the «Выбранные коалиции» section: it calls `buildCoalitionFuture` per
ticked set and draws each pie as a `conic-gradient` from the returned stops,
with the majority mark placed from the returned stop. The desktop sticky and
scroll rules of the editor region also apply to the chooser region; the phone
rule that hides the side region on result views does not hide the chooser.
Spec Section 14.3 gets an "As built in M2-30" note at close.

**Rejected alternative:** putting the checkboxes inside the results column
above the pies. The user asked for them in the column where the data sit, and
the result column would push the pies below a list of up to 200 coalitions.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario | None; ticked coalitions are not saved | None |
| Store state | New `futureCoalitions`, UI only | None |

## Interface Delta

- Engine: `buildCoalitionFuture` and its result types in `src/engine/future.ts`.
- New `src/ui/coalitionChoice.ts`: the limit, the set key, the entry list.
- Store: `futureCoalitions`, `toggleFutureCoalition`; pruned on input change,
  cleared by a preset, an import or the questionnaire build.
- New `src/ui/FutureChooser.tsx`: chooser region content
  (`data-future-choice` per entry with the set key, a checkbox, the own-coalition
  mark, running, empty and limit notes).
- `Future.tsx`: `data-future-coalitions` section, `data-future-coalition` card
  per set with two `data-pie` images (`base`, `year`), the majority mark and a
  `data-table="future-coalition"` table.
- `App.tsx`: the chooser region on the future view.
- CSS: chooser list with 44 px rows, cards, pies, majority mark, sticky chooser
  region on a desktop, chooser shown on a phone.
- Strings: the renamed view label, chooser title, hint, own-coalition mark,
  running, empty and limit notes, section title, empty-section hint, seats of
  the parliament, majority yes and no, other parties, total, seats needed, rule
  breach note, pie text alternative.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | No path changes. The item reads year 0 and year k allocations that `runSeats` already produces and evaluates a party set with the existing `evaluateCoalition` and `majorityRequired` |
| Where exact rationals are required | The pie stops (member seats over `seatCount`, cumulative, and the majority seat over `seatCount`) are exact rationals in `src/engine/future.ts`, rounded to two places only for drawing |
| Ordering / tie rules relied on | Members in scenario order, as `evaluateCoalition` returns them; the chooser keeps the search's order; the set key sorts IDs by code unit, which is locale-free |
| Any display rounding near a decision? | No. Majority is the integer comparison of seats with the seats needed, done before any rounding; the rounded stops and the majority mark only draw |
| How determinism across runs, round trip and locale is proven | Engine tests: year 0 equals `evaluateCoalition` on the base allocation; member seats plus the rest equal `seatCount` in both years; stops never decrease and end at most at 100; a Section 14.2 based fixture where the chosen year moves a coalition across the majority; identical results on repeated runs and for the set given in any order. UI tests: ticking and pruning never change the input or the seat result |

The allocation, threshold and coalition search are untouched; the new engine
function only reads their results.

## Files

| Path | Change |
| --- | --- |
| `src/engine/future.ts` | `buildCoalitionFuture` and its types |
| `src/ui/coalitionChoice.ts` | New: limit, set key, chooser entry list |
| `src/ui/store.ts` | `futureCoalitions`, `toggleFutureCoalition`, pruning and clearing |
| `src/ui/FutureChooser.tsx` | New: chooser list in the left column |
| `src/ui/Future.tsx` | «Выбранные коалиции» section: cards, pies, table |
| `src/ui/App.tsx` | Chooser region on the future view in place of the editor |
| `src/ui/styles.css` | Chooser, cards, pies, majority mark, desktop and phone region rules |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Renamed view label and the new strings |
| `tests/engine/future.test.ts` | `buildCoalitionFuture` correctness and determinism |
| `tests/ui/coalitionChoice.test.ts` | New: set key and entry list |
| `tests/ui/store.test.ts` | Toggle, limit, pruning, clearing, input unchanged |
| `tests/ui/views.test.tsx`, `tests/ui/app.test.tsx` | Chooser region, cards, pies, renamed label |
| `tests/e2e/future.spec.ts` | Tick coalitions, limit of three, pies follow the year, phone stacking |
| `doc/spec/elections-simulator.md` | At close: Section 14.3 note |
| `.github/copilot-instructions.md` | At close: `future.ts`, `coalitionChoice.ts`, `FutureChooser.tsx`, store and `Future.tsx` entries |
| `doc/backlog.md`, `doc/work/STATUS.md` | Loop bookkeeping |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Blocker

`/3-implement` 2026-10-30: every gate passes except one guard. The offline
build test `stays within 350 kB` (`tests/build/offline.test.ts`, budget set in
spec Section 2) measures 362 481 bytes against 358 400. M2-29 closed at
347 540 bytes; this item adds about 15 kB: the new strings in three tables
(about 5 kB, Cyrillic and Hebrew take two bytes a letter), the chooser and the
cards (about 6 kB), their styles (about 2 kB), engine and store (about 2 kB).
The bundle holds no debug code; gzip is 100.9 kB.

`/3-implement` may not change a test's expectation, and the budget is a spec
decision, so the item stops here.

**Recommendation:** raise the budget to 450 kB (460 800 bytes) in spec
Section 2 and in `tests/build/offline.test.ts`, as M2-24 raised it from 300 kB.
The file opens from disk, so size costs little; the guard still catches an
accidental dependency or duplicated bundle. 450 kB leaves room for M3 and M4.
Cutting this item's text to fit would save at most 2.5 kB and leave the next
item blocked again; trimming other views' strings is outside this memo. On
approval, `/3-implement` applies the new budget as a memo amendment, reruns the
gates and records it below.

**Resolved 2026-10-30:** the user approved the 450 kB budget; it is applied and
every gate is green (see Deviations).

## Open Questions

1. Which coalitions does the chooser list? — **Recommendation:** today's
   minimal winning coalitions (at most 200), plus the coalition put together on
   the «Коалиции» tab, plus any ticked set that dropped out of the list; this
   covers "today's coalitions" and lets the user follow any coalition.
2. Does the chooser replace the editor on the future tab on a desktop? —
   **Recommendation:** yes, as the user asked; data stay one click away on
   «Данные», and the other views keep the editor.
3. What does a pie show? — **Recommendation:** the whole parliament: the
   members in party colours, the rest grey, a mark at the majority seat; two
   pies per coalition, year 0 and the chosen year, with an exact table under
   them.
4. Is anything ticked when the tab opens? — **Recommendation:** no; the
   section asks the user to tick coalitions, and the existing tables stay
   below.
5. Labels: «Демографическое будущее», "Demographic future", "עתיד דמוגרפי". —
   **Recommendation:** yes; on a phone the label wraps to two lines inside the
   switcher.
6. Do the ticked coalitions survive edits? — **Recommendation:** yes, until a
   member party is deleted; a preset, an import or the questionnaire build
   clears them.

Approved 2026-10-30 on the user's request: "Vo vkladke budushie mozhno pokazta
kak diagrama piroga koalicii, naprimer mozhno vibral s chek box do 3x koaliciy
i togda v budushem smotret kak tezhe koalicii vibljadili by s uchetom
izmenenija demografii. Budushee ,e to luchse Demograficheskoe budushie. … Kstati
mozhno imenno na etoi vkladek s pravoi storoni gde do sih por nahodilis danniy
napisat kolacicii ih vibirat checkbox a s prava pokazivat simulation"
(2026-10-30), in autopilot mode; the recommendations above are the decisions.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| `/2-tests` | A reset to the baseline and `setInput` also clear the followed coalitions, besides a preset, an import and the questionnaire build | Both replace the input as a whole, like a preset; keeping sets of a scenario that was replaced would show coalitions the user did not choose for it |
| `/2-tests` | The chooser and card view tests are in the new `tests/ui/futureCoalitions.test.tsx`, not in `views.test.tsx` and `app.test.tsx` | One file for the item's interface keeps the fixture and helpers together; the existing app region test is unchanged because the default view stays «Данные» |
| `/2-tests` | `chooserEntries` takes the scenario's party order and returns `checked` and `disabled` per entry | Members are shown in scenario order whatever order a source gave, sets with a deleted party are dropped before rendering, and the limit is decided in one tested place instead of in the component |
| `/3-implement` | `tests/ui/futureCoalitions.test.tsx`: the `entry` and `card` helpers escape the key before building their pattern | A key such as `X+Y` holds `+`, which a regular expression reads as a quantifier, so the helpers could never match; the expectations are unchanged |
| `/3-implement` | `tests/ui/futureCoalitions.test.tsx` `shows names as inert text` expects the name with `<` escaped, not `>` too | The renderer escapes `<` and `&` in text and leaves `>`; this is the repository's existing check (`tests/ui/editor.test.tsx` `shows a group name in the page title and list as inert text`). The test still requires the escaped name in the entry and no raw `<img` anywhere |
| `/3-implement` | While the search runs, the chooser already lists the ticked sets and the «Коалиции» tab set; today's minimal winning coalitions join when it ends | Both are known without the search; the state line still says the search is running |
| `/3-implement` | `futureCoalitions.pieNone` reads «Диаграмма, {year}: {reason}» (en "Chart, …", he "תרשים, …") | The i18n test forbids an English or Hebrew string equal to the Russian one, and `{year}: {reason}` was the same in all three |
| `/3-implement` | `future.note` now says new coalitions are not searched for future years and the chosen ones are recounted with the year's seats | The old sentence "Coalitions are not searched for future years" read as if the section did nothing with coalitions |
| `/3-implement` | Phone view switcher: 13 px labels with hyphenation | «Демографическое будущее» broke inside the first word in a third of a 390 px screen; it now wraps at the space |
| `/3-implement` | The two pies of a card always stand side by side (two equal columns, each pie at most 8 rem) | On a phone they stacked, which hid the change between year 0 and the chosen year |
| `/3-implement` (resumed) | The offline size budget is 450 kB (460 800 bytes), raised from 350 kB in spec Section 2 and `tests/build/offline.test.ts` | The Blocker above; approved 2026-10-30: "Na vorpos, trebovanie 4,5 soglasen and Implement" (the user agreed to the handoff's decisions: the 450 kB budget and the seven deviations). The file is 362.48 kB, gzip 100.94 kB |
| `/4-close` | Files actually changed differ from the Files table: the view tests are in `tests/ui/futureCoalitions.test.tsx` (not `views.test.tsx` or `app.test.tsx`), and `tests/build/offline.test.ts` and spec Section 2 changed for the budget | See the `/2-tests` row on the test file and the resumed `/3-implement` row on the budget |
