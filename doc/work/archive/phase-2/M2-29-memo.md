# Memo — M2-29 Editor in pages

| Field | Value |
| --- | --- |
| item | M2-29 |
| epic | M2 |
| phase | Phase 2 — M2 reopened for second-review corrections |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-30 |
| closed | 2026-10-30 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

The input column on the editor screen is one long sheet: scenario, rules,
every group with its whole vote split, parties, blocks and coalition rules.
With the Israeli example it runs many screens deep, and on a desktop the result
tabs on the right scroll away with it. The user asked for the left half to
turn pages on its own — «Страница 1 из X» with a title — while the result tabs
stay beside it and change live. The user also said that the vote split of a
group («Как голосует группа») is the picture of the world of whoever fills in
the questionnaire; the group page does not say so.

## Scope

**In scope**

- The editor is divided into pages, in this order: «Сценарий и правила»
  (scenario fields and rules), one page per voter group in group order
  («Группа избирателей: <name>»), «Партии», «Блоки», «Правила коалиций».
  With no groups, one «Группы избирателей» page holds the empty list and the
  add button.
- A pager at the top of the input column: «Страница n из N · <title>», the
  buttons «Назад» and «Далее» side by side (disabled at the ends), and a
  select listing every page by number and title to jump directly.
- A group page shows only that group's row with its panel, the share total
  with its rebalance command, the delete confirmation for that group, and the
  add button. Adding or duplicating a group opens the new group's page.
  Deleting a group opens the group now at its position, else the last group,
  else the empty groups page. Moving a group keeps its page (the page follows
  the group ID).
- Changing the page moves focus to the pager title and scrolls the input
  column to its top.
- The page is editor state only: not saved in the scenario or local storage.
  Loading a preset, importing a file and building the questionnaire open page
  1; other input changes keep the page.
- On a desktop (768 px and wider) the input column scrolls on its own: it is at
  most one viewport high and sticks to the top while the page scrolls, so the
  result tabs stay beside it. The pager stays visible at the top of the column.
  On a phone the page scrolls as now.
- The group panel explains, above the vote split, that the split is the user's
  own picture of the world: «Как группа делит голоса между партиями — это ваша
  картина мира. Симулятор не знает настоящих избирателей: он показывает, к
  каким местам и коалициям ведёт эта картина.»
- The issue list and the automatically filled list stay above the pager, so an
  issue on another page is still visible.
- Every new string in ru, en and he.

**Out of scope** (at least two)

- Party-first editing, where a party page lists its voters by group: M6-07.
- Jumping from an issue in the list to the page of its field: the list already
  names the path, and no spec requirement asks for it; not filed.
- Paging the result views on the right: they keep their own tabs.
- The demographic future tab and its coalition chooser: M2-30.
- Splitting the parties page when there are many parties: the column scrolls
  on its own, so a long page stays reachable.

## Approach

A new language-free module `src/ui/editorPages.ts` builds the page list from
the draft: each page has a stable key (`scenario`, `group:<ID>`, `groups`,
`parties`, `blocks`, `coalition-rules`) and its kind. A second pure function
resolves the saved page against the current list: a key still present is
used; a missing group key falls back to the group page at the saved position,
clamped to the last group, or to the empty groups page; anything else falls
back to page 1.

The store keeps `editorPage`, the key and its index at the moment of
navigation, with `setEditorPage(key)`. `loadPreset`, `importScenario` and the
questionnaire build reset it to page 1.

The editor keeps rendering every section, as now; sections of other pages and
group rows of other groups carry the `hidden` attribute, and a global rule
makes `hidden` win over component display styles. This keeps the editor's
render-to-string tests valid and costs nothing in the calculation path. The
pager reads the resolved page, shows the title (group names through
`entityName`, as inert text) and calls `setEditorPage`. The add and duplicate
buttons of the groups section set the page to the new group after the edit.

CSS: the desktop editor region gets a maximum block size of the viewport less
the workspace gap, its own vertical scroll and sticky positioning; the pager is
sticky at the top of the region. Spec Section 10 gets an "As built in M2-29"
note at close; Section 5 is unchanged because no input changes.

**Rejected alternative:** rendering only the current page's sections. It would
remove hidden fields from the DOM, so every editor unit test that renders the
whole editor would need a page argument, and focus or typed text in a field
could be lost on a store update during navigation; hiding gives the same view
with less risk.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario | None; the page is not saved | None |
| Store state | New `editorPage` (key and index), UI only | None |

## Interface Delta

- New `src/ui/editorPages.ts`: the page list and the resolver.
- Store: `editorPage` state and `setEditorPage`; page 1 after a preset, an
  import or the questionnaire build.
- Editor: pager (`data-editor-pager`, title, «Назад», «Далее», page select),
  `data-editor-page` on each page's sections, hidden inactive sections and
  group rows, the group-picture note (`data-note="group-picture"`).
- CSS: global `[hidden]` rule, pager, desktop editor region scroll.
- Strings: page counter, the two buttons, the select label, page titles for
  scenario and rules, a group, the empty groups page, and the group note.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None. The item changes which editor fields are visible; every edit still goes through the same `src/engine/edit.ts` function |
| Where exact rationals are required | Unchanged; no value is computed in the pager |
| Ordering / tie rules relied on | None; page order follows the stored group order, which the engine does not read for ties |
| Any display rounding near a decision? | No |
| How determinism across runs, round trip and locale is proven | Existing seat and round-trip suites stay green unchanged; a store test checks that navigating pages leaves the input and the seat result identical |

Not affected beyond that: the item adds no arithmetic and changes no stored
value.

## Files

| Path | Change |
| --- | --- |
| `src/ui/editorPages.ts` | New: page list and resolver |
| `src/ui/store.ts` | `editorPage` state, `setEditorPage`, reset to page 1 on preset, import and questionnaire build |
| `src/ui/Editor.tsx` | Pager, hidden sections and rows, group note, add and duplicate open the new group's page, focus on page change |
| `src/ui/styles.css` | `[hidden]` rule, pager, desktop editor region scroll |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Page strings and the group note |
| `tests/ui/editorPages.test.ts` | New: page list and resolver |
| `tests/ui/store.test.ts` | Page state, resets, input unchanged by navigation |
| `tests/ui/editor.test.tsx` | Pager rendering, hidden sections and rows, group note, navigation buttons |
| `tests/e2e/helpers.ts` | A helper that opens an editor page through the select |
| `tests/e2e/*.spec.ts` | Specs that edit a group, party or block open its page first; a new `tests/e2e/editorPages.spec.ts` checks paging, focus and the desktop column scroll |
| `doc/spec/elections-simulator.md` | At close: Section 10 note |
| `.github/copilot-instructions.md` | At close: `editorPages.ts`, store and Editor entries |
| `doc/backlog.md`, `doc/work/STATUS.md` | Loop bookkeeping |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Page list: scenario and rules, one page per group, parties, blocks,
   coalition rules. — **Recommendation:** yes; groups are the deepest part,
   and one group fits about one screen.
2. Pager: «Страница n из N · title», «Назад» and «Далее» side by side, a
   select to jump. — **Recommendation:** yes; the buttons sit together, as the
   user asked for the questionnaire.
3. Adding or duplicating a group opens its page; deleting one opens the group
   now at its position. — **Recommendation:** yes; otherwise the new group is
   invisible and a delete would leave an empty page.
4. The page resets to 1 on a preset, an import or the questionnaire build, and
   is not saved. — **Recommendation:** yes; a new scenario starts at its
   beginning, and the page is not part of the model.
5. Desktop: the input column scrolls on its own and sticks; the phone keeps
   page scroll. — **Recommendation:** yes; on a phone only one region is
   shown at a time.
6. The share total and the add button appear on every group page. —
   **Recommendation:** yes; a share edit changes the total, and the user should
   see it where they type.
7. The group note text. — **Recommendation:** as written in Scope.

Approved 2026-10-30 on the user's request: "seichas v konce tablichka dannie
uhodit vniz gluboko i zanimet levuju polovinu ekrani luche vmeste togo chot by
idti vniz otdelno eta levala polovina ctho by listalas, otrkvaja 1 is X
stranicu, s nazvaniem 2 iz i tak dalee . eto horoshaja ideja sprava pokazivat
drugie kladki kak oni zimenajutsa ot izmenenija dannihs … Kak golosuet
gruppa, teper pomenjaetsa saschet togo cho my soobshaem rasklad … eto teper
kartina mira cheloveka kotoriy zapolnjal anketu" (2026-10-30), in autopilot
mode; the recommendations above are the decisions.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | The store settles the saved page on every input change in `commit` (`settlePage`): a deleted group's page re-keys to the group now at its position, and a moved group's page keeps its key with the new index. Resets stay as decided (preset, import, questionnaire build) | The saved page must always name the page on screen, so Back, Next and the select start from what the user sees |
| /3-implement | The share total on a group page is pinned by its existing `data-action="rebalance-shares"` button, with no new attribute | The markup already identifies it |
| /3-implement | The pager sticks only on desktop (768 px and up), offset by the region padding so no content shows above it; on a phone it scrolls with the page | Question 5: the phone keeps page scroll. A sticky pager took about 170 of 740 px on a phone and, under a tall toolbar, covered the fixed view switcher |
| /3-implement | `.editor-pager` joins the single-column grid list, and a global `[hidden] { display: none !important }` rule is added | The page select's longest option widened the phone page; author `display` rules on rows and sections would otherwise override the `hidden` attribute |
| /3-implement | The unit test "marks the current page in the page select" now reads only the page select's options; the assertion is unchanged | It scanned every `<option>` in the editor, including other selects that carry their own selected option, so it could not pass for any implementation |
| /4-close | Sections carry no separate `data-editor-page` attribute (Interface Delta) | Each section is already named by `data-editor` and the shown page by the pager's `data-page`; the tests read those |
| /4-close | `doc/backlog.md` also gained M6-08 (browser-suite stability under parallel load) | Found during `/3-implement`, outside this item's scope |
