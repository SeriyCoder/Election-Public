# Memo — M7-20 Second Design Revision: Purpose Emphasis, Chapter Fixes, Simulator Pathways

| Field | Value |
| --- | --- |
| item | M7-20 |
| epic | M7 |
| phase | Phase 4 — M3 public preview |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-11-12 |
| closed | 2026-11-13 |

Approval: the user invoked `/2-tests` on 2026-11-12 immediately after the
handoff that named `/2-tests` as the step following approval and stated that a
bare approval accepts all six recommendations. Treated as approval; all six
recommended answers are accepted and binding: (1) dedicated description key,
(2) chapter-2 order question → footnote lesson → votes lesson → count → names,
(3) the banner replaces the small same-coalitions caption and tops both modes,
(4) marker-based safe emphasis, (5) permanent future-tab accent, (6) no
simulator button on the opening page.

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

After M7-19 the purpose-and-hypothesis block exists but hides its core thesis
behind a closed disclosure, the opening page gives all four start cards near
equal visual weight, the fifth example party's description is too thin, the
chapter-2 screen leads with a lesson instead of the question, and the path
from the Coalitions view to the "Симуляции коалиций" view is a plain tab the
user's readers do not find — the 2026-11-12 comments ask for an always-open
accented message, one dominant call to action, and two bright in-page buttons
plus a highlighted tab leading into the future simulation, with a prominent
banner there instead of a small caption.

## Scope

**In scope**

- Opening page: the purpose block always open as an accent card — light
  background, a 4 px leading bar, two short paragraphs (demographics and
  sector turnout decide the outcome; the two-large-secular-parties thesis
  framed explicitly as a hypothesis for discussion), with keywords emphasised
  through a safe renderer, never HTML inside translation strings.
- Opening page: one primary saturated-blue button with white text,
  «Заполнить анкету (8 партий)» / "Fill Out Questionnaire (8 Parties)" /
  «מילוי שאלון (8 מפלגות)» (user's wording verbatim), starting the
  eight-party questionnaire; all other start actions restyled as visually
  secondary.
- Chapter 1: only the fifth party's description («Наш дом Израиль без
  Либера») replaced with the user's exact RU/EN/HE texts about Russian-speaking
  secular immigrants and their children; other parties and the section layout
  untouched.
- Chapter 2: the screen opens with the «Какие группы избирателей» question
  carrying a footnote asterisk; the «Что такое группа избирателей» lesson with
  its picture moves below the question as the footnote explanation; answers,
  page keys and stored data unchanged.
- Coalitions view: the same purpose card always open and prominent (card,
  4 px bar, 15–16 px body text, keyword emphasis), its text additionally
  explaining that editing numbers on the left recalculates the majority and
  that the future makes the task harder; below it a bright button
  «Открыть Симулятор коалиций →» that switches to the future view.
- Coalitions tiles block: heading changed to «Возможные коалиции» /
  "Possible Coalitions" / «קואליציות אפשריות» (user's wording verbatim); a
  hint «Отметьте до 4 вариантов и проверьте, выживут ли они при росте
  секторов и смене явки» (EN/HE by meaning); a second bright
  go-to-simulator button next to the selection; the «Симуляции коалиций»
  item visually accented in the top view bar.
- Future view: the small caption replaced by a prominent banner with the
  user's exact Russian text (demographics and turnout as the two main
  factors; move the year slider or change turnout on the left to see the
  followed coalitions on the right gain or lose the 61-seat majority),
  translated by meaning into EN/HE.
- All new and changed strings present in all three tables; RTL correct;
  responsiveness at the Section 14.6 sizes and offline operation preserved.

**Out of scope** (at least two)

- The full English/Hebrew wording review — stays in M3-05, deferred by the
  user until after the first non-commercial release.
- Phone/Firefox/Safari live checks — M3-07.
- Any publication or hosted-build change: the work is local; the live
  preview is untouched until the user asks.
- Any engine change: no arithmetic, schema or scenario-content change.

## Approach

All changes are presentation and interface strings on top of the M7-19
structure (spec sections 14.5 and 14.6; the purpose statement is specified in
14.5's closing paragraphs).

1. **Purpose card.** The existing purpose component drops its disclosure: the
   goal paragraph and the hypothesis paragraph are both always visible inside
   one accent card with a 4 px inline-start bar (RTL-aware, so the bar sits
   right in Hebrew). The hypothesis keeps its "hypothesis for discussion"
   label as a small heading. Body text sits at 15–16 px on the Coalitions
   view. Keyword emphasis uses a tiny safe renderer: the translation string
   carries a neutral marker around emphasised fragments, the component splits
   the string and renders the marked fragments as bold text nodes — no HTML
   parsing, translations stay inert text. The existing purpose texts are
   revised to state demographics-and-turnout causality first, the hypothesis
   second; the neutral "the simulator draws no political conclusions" note
   stays.
2. **Primary start button.** The eight-party card's questionnaire button
   becomes the page's single primary action with the user's label in the
   three languages; the blank, 2022 and skip actions and the eight-party
   open-editor action restyle to a muted secondary look. Start behaviour
   (which draft each card builds) is unchanged.
3. **Fifth party description.** The eight-party example's fifth slot
   currently points at the shared catalog description key of Yisrael
   Beiteinu. A dedicated example-description key is added with the user's
   exact three texts and the slot's mapping in the start-example module
   switches to it, so the catalog party's own short note (shown under ready
   catalog names elsewhere) stays untouched and "only the fifth party"
   holds literally.
4. **Chapter 2 reorder.** Within the chapter-2 screen the group-set question
   page becomes the screen's first page and the what-is-a-group lesson moves
   below it; the question title gains an asterisk and the lesson block is
   introduced as the footnote (asterisk prefix on the lesson card). The
   where-parties-get-votes lesson keeps its place after the explanation. The
   reorder happens in the questionnaire model's page order so navigation,
   parts and the review links stay consistent; page keys, answers and the
   derived draft are untouched.
5. **Simulator pathways.** The purpose component accepts an optional "open
   the simulator" action; the Coalitions workspace passes it (switching the
   store's view to the future view), the opening page does not, so the
   questionnaire shows no dangling button. The tiles block gets the new
   heading, the hint line and a second bright button with the same action
   next to the tile list. The top view bar accents the future view's item
   with a distinct style so it reads as the destination tab.
6. **Future banner.** The small same-coalitions caption is promoted to one
   prominent banner at the top of the future workspace, shown in both modes,
   carrying the user's text; the old small-caption key is replaced rather
   than duplicated.

**Rejected alternative:** editing the shared catalog description of Yisrael
Beiteinu in place — rejected because that key also labels the catalog's ready
party name wherever it is offered, which would silently change text outside
the fifth example slot the user scoped.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| — | None: no scenario field, storage key or export changes | None (stays version 5) |

## Interface Delta

- Purpose component: disclosure removed (always open); optional
  open-simulator action; safe keyword-emphasis rendering; revised texts.
- Opening page: primary questionnaire button with new label; secondary
  styling for the other start actions.
- Questionnaire model: chapter-2 page order changed (question first, lesson
  as footnote below); no page added or removed.
- Start examples: fifth slot's description key switches to a new dedicated
  key with the user's texts.
- Coalitions view: tiles heading, hint and two bright go-to-simulator
  buttons; accented future-view tab in the view bar.
- Future view: prominent two-mode banner replacing the small caption.
- Translation tables: new and changed keys in all three languages in the
  same change (missing-key test enforces it).
- No engine function, worker contract or export format changes.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None — strings, layout, page order within one questionnaire screen and view switching only. |
| Where exact rationals are required | Nowhere new; no engine file changes. |
| Ordering / tie rules relied on | None; the chapter-2 reorder affects lesson/question presentation order, not answers or the built draft. |
| Any display rounding near a decision? | No new numbers are displayed; existing seat displays are untouched. |
| How determinism across runs, round trip and locale is proven | Existing engine and determinism suites run unchanged; a UI test asserts the eight-party example still serialises identically to the fixture file after the description-key change. |

Not affected: the item changes presentation and interface strings only, and
nothing in `src/engine/` changes.

## Files

| Path | Change |
| --- | --- |
| `src/ui/Purpose.tsx` | Always-open accent card, safe keyword emphasis, optional open-simulator action and button |
| `src/ui/BookView.tsx` | Primary eight-party button, secondary start actions, chapter-2 footnote presentation (asterisk on the question, footnote prefix on the lesson) |
| `src/ui/book.ts` | Chapter-2 page order: group-set question first, what-is-a-group lesson below it; screen break moved with it |
| `src/ui/startExamples.ts` | Fifth slot's description mapping switches to the new dedicated key |
| `src/ui/CoalitionWorkspace.tsx` | Passes the open-simulator action to the purpose card |
| `src/ui/CoalitionTiles.tsx` | Heading «Возможные коалиции», hint line, second bright go-to-simulator button |
| `src/ui/App.tsx` | Accent styling hook for the future tab; wiring the view switch into the Coalitions workspace |
| `src/ui/FutureWorkspace.tsx` | Prominent banner at the top of both modes, replacing the small same-coalitions caption |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | New/changed keys: purpose texts, primary button, fifth-party description, footnote texts, tiles heading and hint, simulator buttons, future banner |
| `src/ui/styles.css` | Accent card and 4 px bar (RTL-aware), primary/secondary buttons, bright simulator buttons, tab accent, banner, footnote styles |
| `tests/ui/designRevision.test.ts` (or a new sibling) | Red-first tests: always-open purpose, chapter-2 order, fifth-slot key, tiles heading/hint, banner key usage, example still matching the fixture |
| `tests/ui/*.test.tsx` as touched | Existing shell/render expectations updated where markup changed |
| `tests/e2e/*.spec.ts` as touched | Buttons navigate to the future view; opening and Coalitions purpose visible without a click; page fit at the Section 14.6 sizes |
| `scripts/buildHosted.mjs` | Deviation at /3-implement: preview capture frame 2400 × 1260 at scale 0.5 (same 1200 × 630 PNG and invariants) |
| `doc/spec/elections-simulator.md` | 14.5/14.6 purpose-statement and screen-order paragraphs synced at close |
| `.github/copilot-instructions.md` | Repository map rows for the purpose block and chapter order synced at close |

## Definition of Done

- [ ] Tests written first and seen red
- [ ] Mandatory seat-calculation correctness tests present where applicable
- [ ] Suite, type check and lint green
- [ ] No electoral arithmetic outside `src/engine/`
- [ ] Spec and project brief synced
- [ ] Deviations recorded

## Open Questions

1. The fifth party's new description: dedicated example key, or edit the
   shared catalog key of Yisrael Beiteinu (which would also change the note
   under the catalog's ready name)? — **Recommendation:** dedicated key; it
   is the only reading under which "replace only the fifth party's
   description" holds exactly.
2. Chapter 2 final order: question with asterisk → what-is-a-group footnote
   with picture → where-parties-get-votes lesson → group count → group names.
   Acceptable, or should the where-parties-get-votes lesson move elsewhere?
   You offered to re-attach the screenshot if the layout is unclear. —
   **Recommendation:** the order above; it keeps every M7-19 chapter-2 element
   on one screen and only swaps the question ahead of the explanation. A
   screenshot is only needed if you want something different.
3. Which "small caption" does the future-view banner replace? —
   **Recommendation:** the small note beside «Те же коалиции через годы»
   (frozen year 0, only group sizes change); its content is subsumed by the
   banner, which moves to the top of the future workspace and shows in both
   modes.
4. Keyword emphasis mechanism: neutral markers inside translation strings,
   split and rendered as bold text nodes by the component. — **Recommendation:**
   accept; it keeps translations free of HTML and the emphasis identical in
   all three languages.
5. The future tab accent in the top bar: permanent distinct styling, or only
   highlighted while on the Coalitions view? — **Recommendation:** permanent;
   a conditional highlight reads as state, not as an invitation.
6. Does the opening purpose card also need the open-simulator button? —
   **Recommendation:** no; on the opening page the single primary action is
   the questionnaire button, and a simulator button would compete with it.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | Scope added by the user (2026-11-12, mid-implement): the coalition cards of both future modes group their captions into «В коалиции:» / «Вне коалиции:» (new keys `panel.inCoalition`/`panel.outCoalition`), members in saturated blue bold with a party-colour dot, the rest muted; displayed names trimmed so no space precedes the colon; growth-mode cards now also list non-member seats. No new tests per the user's instruction «не переписывая планы и тесты». | User request quoted: "Доработай подпись со списком партий и мандатов в нижней части карточек коалиций… Выделение участников коалиции vs оппозиции…" |
| /3-implement | The muted colour of non-members is #475569, not the requested #64748B. | #64748B on the tinted (green/red) card backgrounds fails the axe serious colour-contrast check that gates the browser suite; #475569 is the nearest compliant slate. |
| /3-implement | `scripts/buildHosted.mjs` capture viewport changed from 1920 × 1008 at scale 0.625 to 2400 × 1260 at scale 0.5 (same exact 1200 × 630 PNG). | The always-open purpose card made the Coalitions view taller; the old frame could no longer hold the notice and a settled coalition tile together. The M3-02 invariant (notice + settled tile visible, three output files, no external requests) is unchanged. |
| /3-implement | The opening page now scrolls inside its body like the stacked screens (`book__body--screen`), with the drawing kept in a side column on wide screens. | With the purpose card always open, the opening cannot fit the Section 14.6 sizes as a fixed page; the questionnaire's own stacked-screen scroll pattern was reused, and the side-column drawing keeps the motif clear of the navigation. |
| /3-implement | The purpose card lays out as two text columns with the button at the inline end on screens ≥ 1200 px wide. | A full-width single column produced unreadably long lines and an overly tall card; stacking is kept on narrow screens. |
| /3-implement | The chapter-2 footnote asterisk before the lesson title is drawn by CSS (`::before`), not a DOM node. | A text node inside the heading broke the shared heading-text test helper; the rendered look is identical and the marker stays decorative. |
| /3-implement | Second scope addition by the user (2026-11-12/13, mid-implement): (1) the built-in eight-party example takes the figures of the user's "New 8 parties.json" — party shares, group turnout and compositions rounded to two decimals with exact largest-remainder alignment to 100%; growth and refusals stay (the file has no growth); the fixture `tests/fixtures/new8.json` regenerated from the new example. (2) Default locks per the user's eight screenshots: on every numeric lock surface (panel party shares, panel composition cells, questionnaire shares and compose pages) values at or below 7% start locked; when that would leave fewer than two open positions, only exact zeros lock; a touched lock set is kept (book state / panel session) and never re-defaults until the input is replaced. (3) Hard rule everywhere, store locks included: at least two positions stay unlocked; a refused lock shows the `panel.minUnlocked` hint. (4) The supporter-turnout dead state (unbalanced input after an experiment reset) now shows «Выровнять автоматически», which aligns party shares with the current locks and rebuilds a suspended linked basis. (5) Both supporter entry modes show the computed overall turnout, frozen base → current. | User requests quoted: "prilozhenni default cifri dlja 8 Parity vstroennogo example pod korektirui… vse cheo <=7 dozlhno byt zakrito by default… minimum 2 pozicii dolzhni ostavatsa ne zakritie… dolzna vsplivat podskazka… ne hvataet knopki virovjat avtomaticheski… dolzhno byt pokazano raschetnoe chislo obshego % yavki"; lock placement from the user's screenshots ("Vot primer zamochkov dlja default 8 partii… cifri pust berutsa is json fila") |
| /3-implement | The future-simulation lock request is implemented as the default locks on the pictured surfaces; no new projection semantics (a lock still only shields values from rebalancing). | The user's clarification: "ya predostavlju kartinki s zamkami by default. vse dolzhno prodolzhat rabotat kak siechas"; the provided pictures show the party-vote and composition panels only. |
| /3-implement | Three e2e expectations updated with the approved behaviour: the eight-party walk uses the new figures; two-party scenarios can no longer lock any party (min-two rule), so the lock-refusal walks assert the hint instead. Focused unit tests for the additions were written alongside the implementation rather than red-first. | The additions arrived mid-implement at the user's request; the regression suite still covers each new behaviour (`tests/ui/designRevision2.test.tsx`, "M7-20 locks and supporter turnout"). |
| /3-implement | Third scope addition by the user (2026-11-13): (1) chapter 2 keeps the group count and names directly under the question, with the what-is-a-group footnote and the mix illustration as the lowest part of the screen; (2) the rules screen starts with cooperation, then the threshold, then the seat count (chapter numbers unchanged, so the screen is headed by chapter 7); (3) untouched example names now follow the interface language from any locale they were typed in, so a Russian-named example no longer stays Russian after switching to Hebrew; a source scan confirmed no hard-coded interface text outside the i18n tables. | User request quoted: "pod strochkoi… nuzhno vstavit section s nazvanie grupp a vot objasenie i iljstracie eto samaja nizhnjaja chast stranicy; (2) Stanica Pravila, dolzhan nachinatsa s section kto gotov sotrudnijachat, potom barjer i potom kolichestvo mest; (3) …udostversja chot net smeshivanija jazikov" |
| /3-implement | Language-mix bug fixed (user report 2026-11-13 with screenshot): a supporter-turnout experiment freezes its basis scenario, and the saved comparison baseline is an independent copy, so a language switch left their names in the previous language while catalog names translated — a mixed display. `setLanguage` now also renames untouched example names inside the frozen basis (name strings only, through the new `translateExampleTitles`; numbers and cohorts untouched) and in the baseline copy. | User report quoted: "nachali simuljaciju na ivrite, potom pereshl na russkii, pomenjal % … i pereshel na ivrit obratno, i na kartochkah … otobrozhalos smeshannoe sostojanie". |
| /3-implement | Experiment snapshot captions clarified at the user's request (2026-11-13): the middle snapshot is titled «Новая явка сторонников · сегодня», states that the supporters' turnout was changed as the turnout-simulation result and carries the overall turnout before → after; the third snapshot is titled «Новая явка + демография · через N лет» and states that the new turnout and the demographic shift apply together. All three languages. | User request quoted: "srednjaja plashka … dolzhna chetko skazat chto yavka storonnikov parti izmenena … i dolzhna vljuchat obhsuju yavku do i posle izmenenija. A trejatja … dolzhna simulirovat odnovremmenno izmenenie pre novoi yavke i s uchetom demografii. i dolzhan cheko ukazivat etot smysl" |
| /4-close | Files beyond the memo's table: `src/ui/PanelControls.tsx`, `src/ui/Editor.tsx` (lock defaults, min-two hint, supporter recovery and overall turnout), `tests/fixtures/new8.json` (regenerated), `tests/ui/coalitionWorkspace.test.tsx`, `tests/ui/startExamples.test.tsx` and `tests/e2e/coalitionWorkspace.spec.ts`, `tests/e2e/prototypeLook.spec.ts`, `tests/e2e/startExamples.spec.ts` (expectations of the new figures and the min-two rule). `scripts/buildHosted.mjs` was already recorded as a deviation row in the Files table. | All belong to the user's mid-implement additions recorded above; none exceeds the approved scope. |
