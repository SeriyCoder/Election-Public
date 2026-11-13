# Backlog

IDs are `<EPIC>-<NN>`. Status: `[ ]` open, `[x]` done. Only `/4-close` ticks a
product item; only `/5-audit` ticks a `CONTOUR-*` item. Spec references point to
[elections-simulator.md](spec/elections-simulator.md).

## CONTOUR — Process

- [x] CONTOUR-01 Verify at the next `/5-audit` the five-step contour installed
  directly on 2026-10-28 at the `Election` root, with the spec moved to
  `doc/spec/`, plus `.github/skills/` entry points added because Copilot SDK
  chats list skills, not prompt files
- [x] CONTOUR-02 Verify at the next `/5-audit` the `doc/adr/` row added
  directly to the project brief repository map on 2026-10-28, when ADR 0001
  (toolchain, proposed at the M1-01 close) was written
- [x] CONTOUR-03 Verify at the next `/5-audit` the STATUS fixes made directly on
  2026-10-28 after the autonomous M1 run left STATUS batched (M1-06 went
  `idle → implement` without `tests`) and `phase` stale: STATUS Protocol and
  Autonomous Runs rules in `workflow.instructions.md`; a Step Log in STATUS
  appended by every step; `/1-memo` and `/4-close` own `phase`; memo lifecycle
  `draft → approved → closed`; `/4-close` rewrites the archived plan's memo
  link; `/5-audit` checks STATUS against reality and ticks verified
  `CONTOUR-*` items; git only on explicit request, once per item after close
- [x] CONTOUR-04 Verify at the next `/5-audit` the blocked-stage recovery
  protocol: failed close gates record the blocker and `implement → blocked`;
  `/3-implement` accepts `blocked`, reruns gates and logs the transition back
  to `implement` (or remains `blocked`); README and workflow rules agree
- [x] CONTOUR-05 Verify at the next `/5-audit` the memo template epic list
  extended to M5 on 2026-10-28, when the backlog was revised to put the public
  preview (M3) before analysis (M4) and make the PWA optional (M5)
- [x] CONTOUR-06 Verify at the next `/5-audit` the `tests.instructions.md`
  layout line extended on 2026-10-28 (M2-01) with UI tests in `tests/ui/`
  (store and server-rendered HTML, no DOM)
- [x] CONTOUR-07 Verify at the next `/5-audit` the browser gate added directly
  on 2026-10-28 (M2 audit): `typescript.instructions.md` Checks lists
  `npm run test:e2e` for UI, worker, i18n, HTML, style and build changes, and
  `/3-implement` and `/4-close` name it
- [x] CONTOUR-08 Verify at the next `/5-audit` the hold rule added directly on
  2026-10-29, when the user put M3 and M4 on hold: STATUS Protocol "Hold"
  bullet in `workflow.instructions.md`, `/1-memo` step 2 restores a memo from
  `doc/work/on-hold/`, README diagram note and files-table row
- [x] CONTOUR-09 Verify at the next `/5-audit` the memo template rule added
  directly on 2026-10-29 (audit finding 9): an "Out of scope" entry that defers
  a specification requirement names its backlog item
- [x] CONTOUR-10 Verify at the next `/5-audit` the same-day audit naming added
  directly on 2026-10-29 (M2 review audit, finding 2): `/5-audit` step 1 and the
  `doc/work/README.md` files table name a second audit on the same day
  `<YYYY-MM-DD>-audit-<topic>.md` and forbid overwriting the first
- [x] CONTOUR-11 Verify at the next `/5-audit` the interface-language rule
  added directly on 2026-10-29 after M2-19: `workflow.instructions.md`
  Conventions — development reviewed in Russian, all three tables kept
  complete, English and Hebrew wording reviewed in M3-05
- [x] CONTOUR-12 Verify at the next `/5-audit` the memo template correction
  made directly on 2026-10-30: the epic placeholder accepts any epic ID, and
  a deferred requirement names an existing backlog item because `/1-memo`
  cannot edit the backlog
- [x] CONTOUR-13 Verify at the next `/5-audit` the late-regression path added
  directly on 2026-10-31: `/2-tests` may add documented, memo-scope tests at
  `implement` without changing that stage; a genuine RED goes through the
  `/4-close` blocked gate before `/3-implement`, with no fabricated failure
  or manually changed STATUS
- [x] CONTOUR-14 Verify at the next `/5-audit` the project-brief engine map
  synced directly on 2026-10-31: scenario schema version 4, versions 1–3
  migrated to group mode, and party-mode projections and population reporting
- [x] CONTOUR-15 Verify at the next `/5-audit` the project-brief entry added
  directly on 2026-10-31 for the M7-02 exact party-share engine operation
- [x] CONTOUR-16 Verify at the next `/5-audit` the project-brief entries added
  directly on 2026-10-31 for exact composition editing, shared redistribution,
  the optional party editor and unknown-composition reporting
- [x] CONTOUR-17 Verify at the next `/5-audit` the project-brief entries added
  directly on 2026-10-31 for linked turnout, constrained transfers and schema
  version 5, including migration of version-4 party scenarios
- [x] CONTOUR-18 Verify at the next `/5-audit` the project-brief entries added
  directly on 2026-10-31 for the historical 2022 preset, immutable reference
  and temporary one-to-one identity matching
- [x] CONTOUR-19 Verify at the next `/5-audit` the project-brief entries added
  directly on 2026-10-31 for the coalition workspace, atomic linked edits and
  build-only translation-key compaction
- [x] CONTOUR-20 Verify at the next `/5-audit` the project-brief entries added
  directly on 2026-10-31 for optional questionnaire demographics, the editable
  fresh example, shared language controls and Hebrew fallback
- [x] CONTOUR-21 Verify at the next `/5-audit` the project-brief entries synced
  directly on 2026-10-31 for simplified controls, exact legacy conversion,
  the separate preview worker and lossless translation-value compaction
- [x] CONTOUR-22 Verify at the next `/5-audit` the project-brief map synced
  directly on 2026-11-01 for exact future visuals, transient party sets and
  the dedicated cancellable worker
- [x] CONTOUR-23 Verify at the next `/5-audit` the project-brief map synced
  directly on 2026-11-01 for integrated exact panels, frozen cohort experiments,
  the 0–50/four-coalition contract and lossless DEFLATE locale values
- [x] CONTOUR-24 Verify at the next `/5-audit` the project-brief map synced
  directly on 2026-11-02 by the second 2026-11-02 audit: M7 complete in "What
  This Is", the packed-stylesheet build step (`build/packStyles.ts`,
  `src/ui/packedStyles.ts`), Russian keys in the deflated locale payload, the
  460800-byte limit, `stepPanelPercent`/`panelDisplay`, `coalitionTileReport`,
  `scalePercents` and `tests/fixtures/new8.json`

- [x] CONTOUR-25 Verify at the next `/5-audit` the Copilot prompt-to-skill
  compatibility update made directly on 2026-11-04: all five existing project
  entry points retain their single-source prompt bodies, require explicit
  invocation and preserve the memo argument hint. Six existing user-level
  entries were updated separately at user scope, without duplication. All
  eleven source prompts remain required; `agent: agent` stays in the source
  rather than becoming unsupported skill metadata. Static validation covers
  frontmatter, hints, links and unchanged procedure bodies; refreshed-harness
  discovery and representative invocation remain pending in a new chat.
- [ ] CONTOUR-26 Verify at the next `/5-audit` the project-brief map synced
  directly on 2026-11-04 by the 2026-11-04 audit: `src/ui/HoverPie.tsx`,
  `rebuildPanelBasis` and `panelTrackPosition`

## M1 — Engine (no UI)

- [x] M1-01 Toolchain: `package.json`, TypeScript strict, Vite, Vitest, lint and
  format scripts, empty `src/engine/` and `tests/engine/` (§2.1, §11)
- [x] M1-02 Exact rational arithmetic module and exact decimal-string parsing
  (§6.4)
- [x] M1-03 Scenario schema, versioning and import validation (§11)
- [x] M1-04 Votes and denominators for restricted and open groups (§4, §6.1)
- [x] M1-05 Threshold qualification and no-allocation states (§6.2)
- [x] M1-06 Hamilton allocation with persisted tie order (§6.3)
- [x] M1-07 Coalition search: eligibility, forbidden pairs, minimal winning,
  margins, incomplete marking (§7)
- [x] M1-08 Section 8 fixtures and determinism suite (§8, §12 [M1])

## M2 — First Usable Release

- [x] M2-01 Preact app shell, state store, phone/desktop layout
- [x] M2-02 i18n ru/en/he with RTL, missing-key check
- [x] M2-03 Entity editor: groups, parties, blocks, stable IDs, repair on delete
- [x] M2-04 Preference editor: restricted and open modes, explicit rebalance
  (also group numeric fields and rules: seat count, majority, threshold — M2-03
  decision 4)
- [x] M2-05 Results: vote/seat tables, stacked bars, seat diagram
- [x] M2-06 Coalition view in a cancellable worker (also coalition pair
  editing — M2-03 decision 4)
- [x] M2-07 Baseline save and compare
- [x] M2-08 JSON import/export with safety limits
- [x] M2-09 Single-file offline build and local link delivery
- [x] M2-10 Playwright layout, accessibility and offline checks; 200 ms budget

Reopened 2026-10-29 after the user's review against the original specification
([audit](work/audits/2026-10-29-audit.md)): requirements that M2 memos deferred
without a backlog item.

- [x] M2-11 Load all four Section 8 example presets in the UI: baseline, Group 3
  turnout zero, Group 3 at 7% and at 8% final share (§8)
- [x] M2-12 Rate controls: slider with number input for every rate field and
  the threshold; segmented controls for voting mode and majority mode; the
  results summary flags a majority override (§5, §6.3, §10)
- [x] M2-13 Optional descriptive notes on groups, parties and blocks (§5, §11)
- [x] M2-14 Chart details: select a bar segment or seat to see its exact values;
  dismiss by Escape or outside click (§10, §12)
- [x] M2-15 Clear saved data: one action that removes everything the app keeps
  in local storage (§11)
- [x] M2-16 Coalitions on request: selected larger coalitions and blocked
  majorities with their reasons, matched against exhaustive enumeration (§7)
- [x] M2-17 Pivotal-party view with a stated metric, marked as a lower bound
  when the search is incomplete (§7, optional)
- [x] M2-18 Turnout shortcut for a party or block with one dedicated cohort;
  shared cohorts shown instead; block bulk turnout edit naming the affected
  cohorts (§5, optional)

Added 2026-10-29 at the user's request, after the Hebrew interface still showed
Russian group, party, block and scenario names: the last M2 item before M3.

- [x] M2-19 Language consistency: default and example names follow the
  interface language; the app writes no interface-language text into a
  scenario; custom names stay exactly as typed (§10)

Added 2026-10-30 at the user's request to study, visualize and implement four
Russian requirement texts before M3 (refinement list, electorate composition
and growth model, step wizard with an Israeli example, questionnaire book);
reconciled in spec Section 14, where the questionnaire book wins conflicts.

- [x] M2-20 Time model in the engine: schema version 2 with annual group
  growth and annual turnout change, version 1 files migrated with zero change,
  votes and seats for a year 0–20, electorate composition of a party or block
  (§11, §14.2)
- [x] M2-21 Composition and future views, with growth and turnout-change
  controls in the editor (§10, §14.3)
- [x] M2-22 Israeli educational example: six groups, six lists, a catalog of
  the lists that won seats in 2022 with neutral descriptions, catalog names
  shown in the interface language (§14.4)
- [x] M2-23 Questionnaire book at startup: one question per page, narrator
  replies, a draft kept apart from the scenario, skip with consistent fill-in
  and auto-filled markers, build on confirmation, no results before the end
  (§14.5)
- [x] M2-24 Visual world and page fit: original drawings (palms, shekel coin
  sides, Knesset, menorah, people, ballot box), short animations dropped under
  reduced motion, every page fitting without scrolling at the required sizes
  and zoom levels (§14.6)

Added 2026-10-30 from the user's first review of the questionnaire ("vot
pervichnie popravki"), with the instruction to finish all of it and to offer a
ready-values dropdown beside every field while still allowing typed names.

- [x] M2-25 Questionnaire first-review corrections: Back and Next side by side
  with Skip apart, a working «Пример», up to eight names per page part with a
  cue that more follow, a ready-values dropdown on every questionnaire field
  (catalog lists and groups as picks, typed names as own entities), and pages
  that explain what a voter group is and how a party draws votes from groups
  (§14.5, §14.6)

Added 2026-10-30 from the user's request "sdelai tak chto by uchebnii nabor
group sootvestvoval primeru s likad , rovno tezhe gruppi i procenty vozmi esli
est na sitoricheskih dannih za 22 god, i raspredeli tak chto by vknoche
vihodilo 100% i vsegda dolzhan byt sredi nih grupa - Другие / не
классифицированы".

- [x] M2-26 Israeli example group shares from 2022 statistics: the six example
  groups (the same set as the Likud and Ra'am lesson) with shares taken from
  the Central Bureau of Statistics figures for the 2022 electorate, «Другие /
  не классифицированы» as the exact remainder to 100%, and the set with its
  source shown on the questionnaire page that offers it (§14.1, §14.4, §14.5)

Added 2026-10-30 from three consecutive user requests: "zakonchi predidushie
komenty o ploche sdelat vse eto rapsredelenie # Какую долю избирателей
составляет каждая группа? na odnoi stranice i pokazat diagrammu piraga";
"Pravilnei pokazivat kak my dumaem spstav kazhoi partii iz razniih group, a ot
etogo pust uzhe formiruetsa nasha naseleenie … Mozhno v knoce pokazat chto
cherezn nashu simjulacii u nas poluchilot opredelnenoi rassoenie obshestva po
gruppam i eto budet , nekii itogovoi proverochnii pokazatel. Ya bi hoetl videt
karitnku raspredelnijija naprjamuju izviratelev vnutri kazhdoi partii … s
vizualicacie vozmhonostju proisat procentiy i poluchit vizulano pirog"; and
"ya da hochu upravljat etim pokazatelem i eto dolzhno zapolnjatsa esho do togo
kak my zaolnaem % izbiratelei v kazhdoi partii". The earlier comments on the
two lesson pages (example frame, larger colour keys, chapter title, the voter
group definition) were already applied as direct lesson fixes recorded in
§14.5 with M2-25.

- [x] M2-27 Party-first electorate in the questionnaire: group turnout asked
  before the parties' voters, each party's vote share and each party's
  composition by group on one page each with a live pie, the group shares of
  the electorate derived from them and shown as a final check page with a pie,
  the derivation in exact rationals in the engine (§14.4, §14.5, §14.6)

Added 2026-10-30 from the user's second review of the editor screen: "seichas
v konce tablichka dannie uhodit vniz gluboko i zanimet levuju polovinu ekrani
luche vmeste togo chot by idti vniz otdelno eta levala polovina ctho by
listalas, otrkvaja 1 is X stranicu, s nazvaniem 2 iz i tak dalee … Vopros pro
Gamilton nuzhno ubrat , skrit, vsegda koalicija eto polovina +1, tozhe skrit …
Distvitelnie billjuteni eto obshii pokazatel dlja vseh i ediniy, ya by ne stal
ego simulirovat skril kak 99.9% … Budushee ,e to luchse Demograficheskoe
budushie. . To est dat vibiran check boxom koalicii". The remark that a
group's vote split is now the picture of the world of the person who filled in
the questionnaire is applied as an explanation on the group page (M2-29);
editing the parties' voters party-first in the editor is filed as M6-07.

- [x] M2-28 Fixed rules: the editor hides the majority setting (always more
  than half of the seats; an imported override stays visible so it can be
  switched back) and the allocation method row, the results summary drops the
  method; valid ballots are 99.9% for every new group, preset and
  questionnaire build, the field is hidden unless a group differs, and a note
  says 0.1% of ballots are assumed invalid; the population field is labelled
  as the people with the right to vote (§5, §6.1, §6.3, §8)
- [x] M2-29 Editor in pages: the input column turns pages «Страница n из N»
  with a title — scenario and rules, one page per group, parties, blocks,
  coalition rules — and scrolls on its own on a desktop while the result tabs
  stay beside it; the group page explains that its vote split is the
  questionnaire maker's picture of the world (§5)
- [x] M2-30 Demographic future of chosen coalitions: the «Будущее» tab becomes
  «Демографическое будущее»; on it the input column lists today's coalitions
  with checkboxes (up to three) and the result side shows each chosen
  coalition as a seat pie today and in the chosen year (§14.3)

Added 2026-10-30 from the user's reply to the M2-30 handoff: "Eto trebuet
comment pojasnenie v samoi programme , tipo znachka (i) ili pri hover mouse
(… «Население» включает всех, у кого есть право голоса …)"; "Vlkadka kak
nazovom uchastnikov, podobrat nazvanija iz izrailja dolzhni byt defaults"; and
"Eran gde ogovarivajutsa kto s kem sotrudinchaet , nuzhno vse option pokazivat
na odnom ekrane, seichas naprimer dlja 7 partill eto razdeleno na 2 ekrana I ne
udobno. Takzhe otvey dolzhni registrirovatsa dvazhdi, esli partija A no gotova
rabotat s B , no B gotova s A, v konechnom itoge net koalicii no , v metadata
dolzhno byt yasno kto yavlaetsa prichinoi".

- [x] M2-31 Eligible-voter hint: an (i) mark beside every label of the
  eligible-voter figures (the editor's «Избиратели с правом голоса», a group's
  share of them, «Имеют право голоса» in the results, comparison and future
  totals) explains that they count everyone with the right to vote, voters and
  non-voters alike; it shows on hover and opens as text on a click or tap
  (§5, §10)
- [x] M2-32 Israeli names by default: the suggested answer of «Как назовём
  участников?» becomes «Подобрать названия из Израиля», so the names page
  starts from the 2022 lists in seat order (§14.5)
- [x] M2-33 Cooperation answered by each party: a party's «С кем готова
  сотрудничать» page shows all other parties on one screen, and each party's
  answers stay its own (A refusing B no longer changes B's page); a pair is
  still ruled out when either side refuses, and the scenario records who
  refused, shown wherever a ruled-out pair is given as a reason (§7, §11,
  §14.5)
## M3 — Public Preview (needs separate approval) — resumed (2026-11-04)

M3 resumed on 2026-11-04. M3-01 records the approved public-example decisions;
M3-02 prepares both build targets and the revised one-public-source-repository,
manual-release workflow. M3-03 publishes a sanitized source snapshot and
verifies the live link. By the user's explicit 2026-11-10 decision, the first
non-commercial release may precede the full M3-05 English/Hebrew review; do not
describe those translations as fully reviewed. M3-05 remains a post-release
follow-up.

A free, non-commercial link shared in a social post with screenshots, so people
can try the simulator. Its feedback decides what M4 and M5 contain.

- [x] M3-01 Publication decisions: static host and account, whether a public
  repository is needed, site address, approved example scenarios and public
  text (§2.4)
- [x] M3-02 Hosted build: relative asset paths under the host's path, link
  preview metadata (title, description, image) and an in-app "educational
  model, not a forecast" notice (§2.2, §2.4)
  Closed 2026-11-08: exact three-file hosted output, Hebrew preview metadata
  and real 1200 × 630 PNG, shared ru/en/he notice, manual Pages workflow.
  Independent gates: 3221 tests, 404 browser passes (48 project-scoped skips),
  types and lint; offline 458179 bytes. No GitHub upload or live deployment.
- [x] M3-03 Publish and verify the HTTPS link on desktop and phone browsers
  in ru/en/he, with results identical to the local build (§12 [M3])
  Closed 2026-11-12: live at `https://seriycoder.github.io/Election-Public/`
  from a sanitized MIT snapshot in public `Election-Public` (development
  repository stays private). Live `index.html` equals a fresh local hosted
  build except 15 template carriage returns, so results match in every
  language and start. Desktop accepted by the user; phone, Firefox and Safari
  moved to M3-07. Gates: 3221 tests, 404 browser passes (48 project-scoped
  skips), types and lint.
- [ ] M3-04 Launch kit: screenshots and post text (content only; direct
  change, no loop)
- [ ] M3-05 Translation review: after the first release, a person reads every
  English and Hebrew interface string in context (all views, desktop and
  phone) and corrects the wording; the user explicitly deferred this review
  until after the non-commercial MVP release; development remains reviewed in Russian
  (§10; decision 2026-10-29, CONTOUR-11)
- [ ] M3-06 Hebrew as the default language for new visitors and a language
  button with Israel, UK and Russia flags; decided with M3-05 (§14.1).
  M7-07 brings the default and early language choice forward; flag presentation
  and the publication review remain in M3
- [ ] M3-07 Phone-size, real Firefox and real Safari checks of the live link
  (follow-up of M3-03; the user accepted desktop as the release target on
  2026-11-12)
## M4 — Analysis (revisit after M3 feedback) — on hold (2026-10-29)

- [ ] M4-01 Multi-scenario comparison (≥3 snapshots)
- [ ] M4-02 One-dimensional sweep with exact/bracketed boundaries
- [ ] M4-03 Final-share inverse solver (§8.1)
- [ ] M4-04 CSV export
- [ ] M4-05 HTML snapshot export with safe embedding

## M5 — Installable App And Advanced Hosting (optional, after feedback)

Not required for version 1. Start only if M3 feedback asks for it.

- [ ] M5-01 PWA manifest and service worker (build cache only)
- [ ] M5-02 Verify PWA install on Android and iOS and offline after first visit
- [ ] M5-03 Hosting upgrade, if feedback needs it (custom domain or other host)

## M6 — Later Interface Ideas (not scheduled)

Deferred on 2026-10-30 from the same four requirement texts (§14.1). Each needs
its own approval before work starts.

- [ ] M6-01 Political block templates: Right, Left, Center, Arab parties,
  Ultra-Orthodox, optionally Religious Zionism and state-oriented Zionism, with
  names in three languages and palettes. Not scheduled: M7-09 hides block
  controls in the simplified interface; any later templates need new approval
- [ ] M6-02 Optional interface sound, off by default
- [ ] M6-03 Undo / redo and reset of one parameter to its suggested value
- [ ] M6-04 Nested subgroups: a child group counted out of its parent, never
  twice
- [ ] M6-05 Survey reference data (IDI, Pew) shown with source, date and
  denominator, never as a full preference matrix
- [ ] M6-06 Ready-value dropdowns beside the editor's numeric and name fields,
  as the questionnaire has them since M2-25 (filed 2026-10-30 by the M2-25
  memo)
- [ ] M6-07 Party-first editing in the editor: each party's vote share and the
  groups its voters come from, edited as in the questionnaire's chapter 4,
  with the group shares and splits derived (filed 2026-10-30 from the second
  review). Its editor scope overlaps M7-03 and M7-04; it stays open until that
  work is delivered
- [ ] M6-08 Browser-suite stability: the desktop check "a long coalition
  search shows progress, can be stopped and keeps input free" failed in two of
  three full parallel runs, while alone it measures a 6–7 ms stall against its
  200 ms budget; run the performance spec in its own serial pass or with fewer
  workers, so a load spike is not read as a frozen page (filed 2026-10-30 by
  M2-29 `/3-implement`)

## M7 — Party-First Coalition Simulation

Requested on 2026-10-30. The user approved the full party-control scope, keeping
group turnout before party shares in the questionnaire, the standard 99.9%
valid-ballot rate, and an explanation instead of a demographic projection when
the necessary party compositions are unknown. Each item follows the working
loop. Existing group-first scenarios remain supported.

The [2026-10-31 audit](work/audits/2026-10-31-audit.md) records the approved
simplification and linked-turnout plan. M7-01 through M7-06 are complete;
M7-01 includes the audited coverage gaps and canonical-denominator import
regression. The remaining items are open. M3 remains on hold and publication
requires separate approval.

- [x] M7-01 Exact party-first engine and versioned scenario: retain party vote
  shares as authoritative exact values, allow unknown party composition, keep
  year-zero coalition results independent of demographic inputs, and migrate
  versions 1–3 without changing their results. Wire the current questionnaire
  to the exact inputs so four-decimal group derivation cannot change a
  threshold or seat decision; the reproducible HIGH finding and fixture are in
  the [2026-10-30 audit](work/audits/2026-10-30-audit.md). Preserve the
  existing interface and explicitly guard unavailable demographic projections
  (§3, §4, §6, §11, §14.2, §14.5). Before close, cover and correct the three
  in-scope group-addition, party-colour and future-group-report gaps in the
  [2026-10-31 audit](work/audits/2026-10-31-audit.md), and sync the
  specification and project brief to version 4. Canonical and raw exact
  fractions are both subject to the same denominator budget; over-budget
  imports preserve the prior scenario.
- [x] M7-02 Exact proportional party-share editing: preserve the edited value
  and locks, redistribute among unlocked parties in the scenario, split an
  all-zero remainder equally, and report impossible edits without silently
  changing inputs. Shares remain exactly 100% and use all valid votes,
  including below-threshold lists; qualification, Hamilton and tie ordering
  remain exact. Locks apply to direct party edits, not changes caused by group
  turnout (§5).
  Depends on M7-01
- [x] M7-03 Coalition workspace: place party sliders, exact inputs, locks,
  vote shares, seats and comparison beside group and overall turnout controls;
  show the selected and available coalitions alongside them. Preserve the
  user's saved baseline and provide the clearly historical 2022 reference.
  Remove duplicate Seats and Compare navigation without removing their results
  or baseline operations; retain the style, responsive layout and explanations
  when demographic controls are unavailable. The M7-06 single-file build leaves
  little room under the existing 450 KiB budget; preserve that gate while
  designing the workspace. Depends on M7-02, M7-04, M7-05 and M7-06; overlaps
  M6-07
- [x] M7-04 Optional party composition: edit or mark a composition unknown,
  show the mix of voters rather than claiming it is the population, and show
  any population reference or inconsistency separately without changing party
  shares or blocking coalition results. The example's "Other / unclassified"
  is an ordinary group, not a substitute for unknown composition.
  Depends on M7-01; overlaps M6-07
- [x] M7-05 Linked party and group turnout: derive an exact group-by-party
  matrix only when the necessary data are known and consistent; direct party
  edits redistribute votes within groups without changing group sizes or
  turnout, subject to existing restrictions. Group-turnout changes recalculate
  from a stable basis without cumulative rounding; overall turnout scales
  group turnout proportionally or refuses an impossible value. Preserve exact
  inputs through schema version 5; unavailable or
  inconsistent demographics never block ordinary coalition results. Apply
  canonical share candidates to the existing editor draft without discarding
  draft-only fields.
  Depends on M7-02 and M7-04
- [x] M7-06 Historical 2022 preset and reference: retain all 40 electoral lists
  separately, derive exact shares from vote counts, and match lists to another
  scenario only by stable identity or explicit user choice. Show official
  totals and turnout as historical facts, the model's 99.9% validity assumption
  and educational Hamilton seats separately from historical Bader–Ofer seats.
  Include provenance and unknown composition; do not infer demographic
  preferences. Reference totals: 6,788,804 eligible voters, 4,794,593
  ballots cast, 4,764,742 valid and 29,851 invalid; exact turnout is the
  cast-to-eligible ratio, displayed as 70.63%. The
  [IDI results](https://en.idi.org.il/israeli-elections-and-parties/elections/2022/)
  and [2022 results table](https://en.wikipedia.org/wiki/2022_Israeli_legislative_election)
  list all 40; the 27 not supplied in the request sum to 71,215 votes.
  Direct official-site access returned HTTP 403; the implemented table was
  independently checked against the accessible IDI source. The offline
  comparison retains the historical reference independently of the user's
  saved baseline and of invalid current drafts. Depends on M7-01 and M7-04
- [x] M7-07 Questionnaire alignment: keep group-turnout questions before
  party shares, make composition optional, allow coalition results with no
  demographic table, and label the voter-mix and population checks accurately.
  Offer language selection on the opening screen, default to Hebrew only when
  no saved choice exists, preserve questionnaire answers and direction when
  switching languages, and open Coalitions after completion or skip.
  Order views Coalitions, Composition, Data and Demographic Future.
  Depends on M7-03 and M7-04; overlaps M3-06
- [x] M7-08 Review the three language tables and notices: a seat majority is
  not a guaranteed political coalition, and Hamilton is never represented as
  the Israeli Bader–Ofer method. Review the simplified workspace, unknown
  demographic data, 2022 reference and future thresholds consistently.
  Depends on M7-03, M7-06, M7-07, M7-09, M7-10 and M7-11; the human English
  and Hebrew publication review remains M3-05
  Closed 2026-11-01: twelve RED copy regressions corrected; independent close
  gates pass with 2,914 tests and 332 browser checks (40 skips), types and lint.
  Offline HTML is 460,031 bytes; allocation and scenario data are unchanged.
- [x] M7-09 Simplified controls and legacy safety: hide participation,
  restricted/open mode and block controls and block references in the new
  interface; new inputs use 100% participation and open voting. Continue to
  calculate old files with their original semantics and effective party-pair
  restrictions. Offer a separate, explicitly confirmed conversion with a
  preview of changes to votes, seats, coalitions, turnout and future results;
  retain the original, refuse inexact conversions, and never discard directed
  refusals or block exceptions.
  Depends on M7-03 and M7-05
- [x] M7-10 Demographic future: visualize group populations and party votes
  now and in the selected year with fixed current turnout and preferences
  for the new model; preserve the old future semantics until conversion.
  Retain the three followed coalitions and add independent red and orange
  party sets, their votes and seats, and the first year reaching 50% of seats
  in years 0–20 without assuming monotonicity. Distinguish half of seats from
  a majority and avoid false zeros for unavailable allocations. Make range
  calculations cancellable and responsive. Depends on M7-03, M7-05 and M7-09
  Closed 2026-11-01: 2,899 unit/build tests and 332 browser checks passed
  (40 conditional skips); typecheck, lint, formatting and the 460,800-byte
  offline gate pass. Final HTML is 459,267 bytes.
- [x] M7-11 Correct the party-mode group explanation in all three languages:
  it previously said that group turnout could not change party shares or seats,
  contradicting the linked-turnout behavior delivered in M7-05. Explain when
  linked turnout is available and that demographic projections remain
  assumptions. Discovered during M7-06 implementation; depends on M7-05 and
  should be included in the M7-08 language review.
  Closed 2026-11-01: 2,902 unit/build tests and 332 browser checks passed
  (40 conditional skips); typecheck and lint passed; offline file is 459,901
  bytes under the 460,800-byte limit.
- [x] M7-12 Coalition left-panel redesign, requested directly by the user:
  first build and review an independent Russian-only offline prototype seeded
  from the user's version-5 setup, outside the main application. Pair compact
  party vote and turnout columns, with vertical sliders, exact numeric entry,
  0.25-percentage-point vote steps, locks, an explicit 100% balance indicator
  and alignment action. Keep turnout disabled until the baseline is accepted.
  Provide a compact selected-party voter-composition editor and a clearly
  labelled eligible-population group distribution. Experiment with a separate
  -1 to +1 coefficient for each party's group cohorts: zero preserves each
  group's original turnout, +1 reaches 100%, and -1 reaches zero. Never change
  those original turnout values; recalculate from a frozen baseline and show
  normalized experimental vote shares separately. Treat inferred population
  shares as scenario assumptions, not sociological evidence. Prototype
  revision 2 (user feedback 2026-10-31): there is no explicit accept-baseline
  step. Turnout opens once the votes total exactly 100%, and its first move
  freezes the baseline. A party's coefficient changes only that party's vote
  share, so the total may leave 100%. While it does, the group charts and any
  coalition output are shown as stale until the user aligns, with locks. Party
  composition is navigated with arrows and a dropdown. The right side shows one
  small pie chart per social group, splitting that group's voters by party,
  plus eligible-population and actual-voter group bars. Prototype revision 3
  (user feedback 2026-10-31): group pies shrink to 0.75 of their radius, four
  per row; above eight groups they scroll sideways in at most two rows, and an
  enlarge control opens a larger view with every party's share. Below the
  bars, a 2x2 grid shows the four coalitions nearest to a seat majority
  (50% + 1). A tile is greenish when it holds the majority, and otherwise
  reddish in proportion to the missing seats. The variants are every coalition
  that respects the directed refusals, closest to the majority first. Each
  tile can be replaced with another variant or with a user-built custom
  coalition, which may break the coalition rules. Every variant keeps a
  session-stable label (`№n` for a prepared variant, or a custom label) so the
  demographic-future view can show it later. A tile opens a detail window like
  the old chosen-coalition evaluation: a seat chart, member seats and pivotal
  roles, rule conflicts naming who refused, and parties that could join. Seats
  use the scenario's Hamilton threshold method, computed exactly; on
  integration they must come from `src/engine/`, never from UI code. Main-app
  integration remains out of scope until explicit user approval and the
  normal workflow. Prototype revision 4 (user feedback 2026-10-31): the
  eligible-voter total card is hidden; the population stays internal because
  the simulation is relative. Custom coalitions are labelled with letters
  (`Своя А`, `Своя Б`). In every tile list, «＋ Собрать свою…» comes first,
  then the user's own coalitions, then starred favourites, then the other
  prepared variants. A "favourites only" filter narrows the lists, but not the
  automatic nearest tiles. Party composition is edited with a slider or an
  exact field per group. The other unlocked groups of that party rebalance
  proportionally, so the row always sums to 100%, and the party is marked as
  having a known composition. The population implied by party votes,
  compositions and group turnout is compared with the reference population
  from the source file. Each group shows its signed gap in percentage points,
  and the largest conflict is named. «Сгладить» makes one exact adjustment:
  it changes only the compositions of parties without a known composition, so
  that the implied population equals the reference. Party votes and group
  turnout never change, and «Отменить» restores the previous compositions.
  When the known compositions alone already exceed a group's reference, the
  smoothing is refused and the group is named. Prototype revision 5 (user
  feedback 2026-10-31): composition edits move in 0.25-point steps. The
  unlocked other groups are rebalanced proportionally and then snapped to the
  same grid by largest remainders, so the row sums to exactly 100%; only
  smoothing may produce off-grid values. A stacked composition bar shows the
  whole row with its sum, the locked share and the movable share. A line
  under it and a signed shift under each group show how many points the last
  edit or smoothing redistributed, and between which groups. The model has no
  separate eligibility factor: everyone in the population is a voter, so the
  "eligible" wording is removed from the panel. Prototype revision 6 (user
  feedback 2026-10-31): the «состав известен» mode is removed. Composition
  cells are typed freely and no other cell moves, so a row may leave 100%;
  then the sum turns red with the excess or shortfall in points, the bar is
  outlined red (hatched remainder, or a 100% mark when over), the party list
  shows the row's sum, and the pies and population gaps wait. The user locks
  the cells they are sure of and presses «Сгладить», which, for all parties at
  once, changes only unlocked cells so that every row is 100% and the implied
  population equals the reference (exact max-flow on rationals). Locked cells,
  party votes and group turnout never change. When the locks make the
  population match impossible, «Сгладить» still brings every row to 100%
  through its unlocked cells and names the groups that cannot match. It refuses
  only when a party's locks exceed 100% (or every cell is locked off 100%),
  naming the party. «Отменить» restores. Prototype revision 7 (user report
  2026-10-31): repeated typing and «Сгладить» froze the page. Smoothing
  returned exact fractions that were stored back as the next starting point,
  and every press made their digits grow several times over until each
  keystroke recalculated numbers thousands of digits long; locking earlier
  results made it worse. Smoothing now places votes in whole multiples of one
  fixed fine unit (a trillionth of the votes, or finer where the data needs
  it), so the exact fractions stay about as short as the data itself however
  often the user types, locks and smooths, while a result differs from the
  former proportional placement by far less than the display resolution. A
  state that is already settled is returned unchanged, and the 100% fallback
  starts unlocked cells that carry long fractions from a fine grid. Locked
  cells, party votes and group turnout still never change and the implied
  population still equals the reference exactly. Regression tests cover
  repeated smoothing, the fallback and long chains of edits and locks, and a
  browser check covers twelve rounds of typing and smoothing. This detour does
  not advance or formally hold M7-10, which remains at its completed RED-test
  stage. Prototype revision 8 (user request 2026-11-01): a light party colour
  made the empty part of its slider track dark in Edge, which meant nothing;
  such colours now get a darker slider accent and every track stays light.
  The shared «Все» turnout slider is removed: turnout is set per party.
  «Выровнять» is brighter. When votes, a field or a composition block the
  turnout, pies or coalitions, a note there says which button brings 100%
  back and links to it; the link focuses and highlights the button but does
  not press it. «Голоса партий», «Явка сторонников» and «Население и кто
  пришёл» each get «Крупно», like the pies: one panel at a time opens over
  the page with taller sliders and a 10% grid. The coalition tiles are about
  a third shorter. Under them a rules editor shows the chosen party's pair
  with every other party as a segment: each end is one party's own decision,
  ✓ ready or ✗ refusal, and a click flips that end only. A refusal from either
  side keeps the pair out of the prepared variants, a note reports how their
  count changed, and «Как в файле» restores the file's rules. Edits stay in
  the page session. Prototype revision 9 (user request 2026-11-01): each
  group's «явка» line is a button that opens a group-turnout window over the
  coalition screen. The window says group turnout is a secondary parameter
  that reflects the user's picture of the world, with no direct statistics
  behind it; a soft 45–85% band, the user's scenario guide rather than a
  statistical norm or limit, is marked on each slider with the file value.
  It lists what changes at once, what changes only after
  «Сгладить» and what never changes, and previews every edit before
  «Применить»: each group's population before → after against the file,
  overall turnout and non-voters, and the largest gap from the file. Votes,
  seats and coalitions never move; group turnout reaches compositions only
  through «Сгладить» or the supporter-turnout experiment. «Отмена» and Escape
  discard, «Как в файле» restores the file values, and invalid values block
  «Применить». During the experiment the line reads, for example, «явка
  60→80%» and the window is read-only, with a link that resets the
  experiment. Under each group a bar now draws «нас.»: its length is the
  group's implied population against the file size (a black tick), the solid
  part came to vote, the hatched part did not, and a dashed or solid box
  marks a shortfall or an excess; a legend explains it. «нас.» stays because
  groups are population groups, not parties, so the check also holds for
  virtual parties. A model test checks that group turnout moves population
  and overall turnout but never votes, compositions or seats; a browser check
  covers preview, apply, cancel, invalid input, the read-only state,
  accessibility and phone-to-desktop widths. Compact experiment labels are
  checked for clipping at 1280 px. Edits stay in the page session.
  Prototype revision 10 (user request 2026-11-01): the composition panel's
  head now starts with «Сгладить» directly under «Выровнять» of the votes
  panel, at the same width and in the same blue that turns red while a
  composition row is not 100%; the party arrows and dropdown follow it, and
  «Крупно ⤢» in the right corner opens the composition over the page with
  larger bars, sliders, fields and locks where every edit still works.
  «Отменить» after smoothing sits next to «Крупно» so the party navigation
  does not move. Each coalition tile's list offers «✕ Ничего — убрать
  ячейку»; with two tiles left they fill the width with larger seats, bar
  and a per-party seat line, and a single tile grows further. While fewer
  than four tiles remain, «＋ Добавить» in the header adds the nearest
  variant not yet shown; «Ближайшие» restores four. Browser checks cover the
  alignment and colours at 1440 and 1280 px, the large composition view, and
  removing, growing and refilling tiles.
  Demographic companion prototype (user request and choices 2026-11-01):
  the coalition prototype was accepted, with integration explicitly deferred.
  Build an independent offline Russian page from the same saved scenario,
  not from unsaved edits in the open coalition page. The user selected
  party-supporter turnout controls and a 0–50-year horizon. One page has two
  modes: demographic growth with up to four fixed coalition memberships,
  and a turnout experiment comparing one coalition. Growth controls change
  group eligible-population counts, with current/future population shares,
  a 50-year share chart, exact annual compounding and a frozen year-0 result.
  Party targets apply today through the accepted cohort-turnout rule; group
  turnout is derived, and future years retain those cohort turnouts, not
  a constant party-wide average. Three experiment snapshots distinguish
  the original present, changed turnout today and changed turnout in the
  selected future year. Every allocation includes all competing parties.
  Parliament-seat pies and within-coalition percentages have explicit,
  different denominators. Custom memberships keep directed-refusal warnings.
  Playback steps through integer years at 1, 2 or 5 years per second, stops
  at 50 and pauses on edits or page hiding. Enlarged panels retain the same
  live timeline and controls; nothing writes back to the file or main app.
  The standalone model reuses the accepted prototype's rational and turnout
  helpers and honors stored seat tie order. Eleven model tests include exact
  agreement with the main engine for every year 0–20, independent year-50
  compounding, turnout endpoints, threshold boundaries, ties, seat sums,
  deterministic round trips and unavailable states. Ten offline Edge checks
  cover both modes, playback, invalid input, selection, enlarged controls,
  360–1280 px layouts and accessibility. The desktop view fits 1280×800;
  final timing measured under 8 ms per projected year and 17 ms for the
  population chart. The HTML is 94,187 bytes. These are prototype decisions,
  not amendments to the approved M7-10 memo: its three-coalition limit and
  0–20-year main-app contract, source files and current stage remain unchanged.
  Integration requested on 2026-11-01: the user accepted the demographic
  prototype without corrections and explicitly authorized moving toward
  integration. The following requested behavior is for the integration design
  and subsequent questionnaire work; it is not included in M7-10:
  - Integrate both accepted panels into the main offline application, using
    the authoritative engine rather than embedding the prototype arithmetic
    in the UI. Hide Composition navigation. Order the visible tabs
    Coalitions, Demographic Future, Data. Data must immediately reflect
    scenario edits made in Coalitions; both panels use that same scenario,
    not independent copies synchronized through a tab-switch event.
  - Preserve the accepted demographic page's two modes, up to four followed
    coalitions, one-coalition turnout experiment, 0-50 years, playback and
    enlarged editable panels. The old main-app limits remain in force until
    their explicit integration change has a memo, RED coverage and GREEN
    implementation. Define reset/rebase behavior when the shared scenario
    changes so a frozen experiment cannot silently use an obsolete source.
  - Make the questionnaire compact. On group selection, put "Basic (Israel)"
    first and select it by default, followed by custom groups and no groups.
    Retain the source and assumption disclosures; a demographic group name
    supplies no evidence about a party's voters.
  - Replace one-group-at-a-time turnout questions with a compact visual
    overview, a short explanation and simultaneous group turnout controls.
    Fit the six default groups on one desktop screen, keeping every control
    accessible for custom larger sets and on phones.
  - In Coalitions, show baseline group turnout as a secondary assumption,
    not another set of inline experiment sliders. A separate correction
    screen needs an explicit explanation of recalculation and reset effects.
    Confirmed: include that window now, require confirmation before applying
    baseline corrections, reset previous experiments and recalculate the
    shared scenario. Recalculation need not change every individual result.
  - Put "Distribute for each party" first and select it by default; put
    "Leave composition unknown" below it. Explain on the same page, with
    four illustrative fictional parties, what composition enables and what
    remains calculable when it is unknown. Do not silently invent known
    compositions merely because the distribution option is selected.
  - Remove the overall-turnout question. Derive the value when the supplied
    data determine it; retain 70% only as an explicit fallback assumption
    where needed, not as a forced replacement for a determinable turnout.
  - Remove the future-turnout-change question. Fresh questionnaire scenarios
    use zero annual turnout change; hiding a question must not rewrite
    existing imported legacy values.
  - Remove the preliminary population-growth yes/no question. Show all
    groups together with annual growth initially 0%, controls from -5% to
    +5% in 0.25-percentage-point steps, and a visual explanation.
    The requested warning boundaries are above +2.5% and below -0.5%;
    Confirmed: highlight each group and the aggregate when it is displayed;
    exact boundary values are not highlighted. Use a soft "Unusual rate -
    check the assumption" warning, not an input prohibition.
    Do not present those boundaries as a universal demographic law or
    describe a value as unnatural without supporting evidence. The new
    control range must not silently clamp valid imported growth values.
  - Replace the cooperation yes/no question with the accepted visual
    selected-party relationship editor. Fresh questionnaire scenarios start
    with everyone willing to cooperate; each end of a pair records that
    party's own decision. Preserve imported directed refusals.
  - Make the Questionnaire button more prominent. Hide the preset selector
    and Load example button. Rename the transfer controls to "Export Set Up"
    and "Import Set Up"; retain validated scenario-file import/export.
  - Apply related interface strings in all three language tables. Keep
    exact seats, unknown-data explanations, offline operation, accessibility,
    responsive layout and the existing single-file size/performance gates.
  Execution confirmed on 2026-11-01: the other development window is no
  longer editing the project. Continue here one step at a time.
  Closed integration on 2026-11-01: exact bounded engine helpers, one shared
  scenario, compact/enlarged coalition controls, source-turnout correction,
  stable/custom/favourite tiles and two-mode 0–50-year future with four
  memberships. Questionnaire/toolbar requirements remain M7-13. Independent
  close: 2963 Vitest tests, 346 offline browser checks (40 conditional skips),
  types/lint/format green; HTML 451400 bytes under the unchanged 460800-byte
  limit. A real close-time responsiveness failure was blocked, repaired by
  isolated progress rendering, and independently rerun green. Memo and plan:
  `doc/work/archive/phase-3/M7-12-memo.md` and `M7-12-test-plan.md`.
- [x] M7-13 Compact questionnaire and integrated navigation: implement the
  2026-11-01 questionnaire, defaults, visual group controls, directed
  cooperation editor and toolbar requirements recorded under M7-12.
  Preserve unknown compositions and imported legacy values; use confirmed
  soft growth warnings rather than unsupported demographic claims.
  Depends on M7-12. File this follow-on during M7-10 implementation; it is
  outside that memo and requires its own memo and RED tests.
  Closed 2026-11-02: Basic-first compact turnout/growth overviews, explicit
  optional compositions, exact derived turnout or disclosed 70% fallback,
  shared directed pair ends and simplified localized toolbar. Imported legacy
  values remain intact. Independent close: 2985 unit/build tests, 350 browser
  passes (40 existing conditional skips), types/lint/format green; HTML 458442
  bytes under the unchanged 460800-byte limit. Memo and test plan:
  `doc/work/archive/phase-3/M7-13-memo.md` and `M7-13-test-plan.md`.
- [x] M7-14 Prototype-faithful Coalitions and Demographic Future, requested by
  the user on 2026-11-02 ("vneshii vid byl pochti ili kak" the two accepted
  standalone prototypes, "tolko s temi ciframi chto vvedut user i programma
  raschitaet"). The integrated tabs currently render with near-default
  controls; restore the prototypes' cards, summary tiles, styled vertical
  sliders with before/now bars, steppers and locks, composition bars, population
  bars, coalition tiles, directed rule strips and the future timeline/pies,
  driven only by the authoritative scenario and exact engine results. Keep the
  450 KiB offline limit unchanged: lossless build-time compression of the
  inlined CSS, decoded as inert text before first render, is the intended way
  to make room. No forecast, no new arithmetic outside `src/engine/`.
  Closed 2026-11-02: both tabs ported to the prototypes' `ws-` cards, summary
  tiles, styled vertical sliders with before/now bars, exact ±0.25 steppers
  (`stepPanelPercent`), locks, red Align state, composition and population
  cards, coalition tiles with majority mark, ✓/✗ rule strips, timeline and
  donut pairs. Inlined CSS is packed with lossless DEFLATE and decoded before
  first render. Independent close: 3028 unit/build tests, 359 browser passes
  (41 conditional skips), types/lint/format green; HTML 441724 bytes under the
  unchanged 460800-byte limit. Deviations (CSS pies, narrow slider column,
  M7-12 turnout targets kept, no prototype review notes) are in the memo:
  `doc/work/archive/phase-3/M7-14-memo.md` and `M7-14-test-plan.md`.
- [x] M7-15 Natural compact questionnaire from the user's 2026-11-02 review
  document: Basic (Israel) groups renamed (traditional: "masorti le dati";
  Arab citizens) plus a new knitted-kippa/settlers group; every questionnaire
  page shows all groups or parties on one screen using the M7-14 panel visuals;
  party composition is always distributed (the "leave unknown" and per-party
  "is it known" choices are removed); voter structure review, growth and
  cooperation each fit one compact page, cooperation as two-sided party strips.
  Imported scenarios with unknown compositions remain valid and unchanged.
  Depends on M7-14.
  Closed 2026-11-02: the Basic set has seven catalog groups in the user's order
  (secular, "masorti le dati", religious, the new `knitted-kippot` "Вязаные
  кипы, поселенцы", Arab citizens, Haredi, other); the CBS panel shows "—" with
  a note for the new group instead of an invented figure, and the Section 14.4
  six-group preset is unchanged. The composition choice pages are removed: one
  `compose` page with a party selector, stacked bar, every group's field and
  slider, remaining sum and exact "Выровнять" (`scalePercents`) starts from the
  even split (or the Section 14.4 example by ID) as a stated assumption and
  refuses Next until every party sums to exactly 100%. Turnout, vote shares,
  the structure check, growth (−5..+5, 0.25 steps, soft warnings) and
  cooperation (unpaged directed strips) each fit one page at all six Section
  14.6 desktop sizes. Demographic Future says "через 4 года" with locale plural
  forms and shows growth values with the locale formatter. Independent close:
  3139 unit/build tests, 378 browser passes (48 conditional skips),
  types/lint/format green; HTML 459587 bytes under the unchanged 460800-byte
  limit. Deviations are in `doc/work/archive/phase-3/M7-15-memo.md` and
  `M7-15-test-plan.md`.
- [x] M7-16 Two ready examples at the start, requested on 2026-11-02: besides
  skipping the questionnaire, the user can open the bundled eight-party example
  (exactly the user's "New 8 parties" set: party shares, seven groups,
  turnout, growth, compositions and directed refusals) or the existing six-list
  2022 educational example. Opening an example fills the questionnaire with
  its values, editable page by page, and can go straight to Coalitions. Depends
  on M7-15.
  Closed 2026-11-02: the opening page offers four cards in ru/en/he — from
  scratch, "8 партий (свободные названия)", "2022 (учебный)" and skip (import
  stays on Coalitions). Each example is stored as exact questionnaire answers
  (`src/ui/startExamples.ts`); "К коалициям" builds it at once, "Листать
  анкету" opens page 1 with every value prefilled and editable. The eight-party
  build serialises identically to the user's file (names with their trailing
  spaces kept); the 2022 example is the questionnaire's party-mode educational
  example with the 2022 seats. Replacing existing answers or a changed scenario
  asks first. The Russian translation keys now travel inside the deflated
  payload. Independent close: 3163 unit/build tests, 386 browser passes (48
  conditional skips), types/lint/format green; HTML 451268 bytes under the
  unchanged 460800-byte limit. Deviations are in
  `doc/work/archive/phase-3/M7-16-memo.md` and `M7-16-test-plan.md`.
- [x] M7-17 Second prototype-fidelity pass, filed 2026-11-02 after the parent
  compared M7-14's built file with the prototypes on the user's eight-party
  data at 1440x900. Remaining visible gaps: Demographic Future clips its left
  card, keeps the old result tables instead of "the same coalitions through
  the years" (four coalition cards with year-0 / year-k donuts, default sets
  matching the Coalitions tiles) and lacks the full-width timeline bar;
  supporter turnout shows long raw target decimals instead of the prototype's
  exact −1..+1 per-party coefficient (0 = base, +1 = everyone, −1 = no one)
  with rounded turnout beneath; directed rules are paged instead of two
  columns; legacy result sections dominate the Coalitions page instead of
  being closed disclosures. Runs before M7-15.
  Closed 2026-11-02: Demographic Future has a full-width timeline bar, an
  unclipped growth card with a 51-year share chart, and four coalition cards
  (year-0 / year-k donuts of all seats, majority tick, shortfall, seat change,
  vote share, party legend) whose default sets are the Coalitions tiles; the
  old tables sit in a closed disclosure. Supporter turnout uses the exact
  −1..+1 coefficient (`turnoutAt`, 0.05 steps) with rounded turnout beneath;
  directed rules show all relations of one party in two columns; old Coalitions
  sections sit in a closed "Подробнее" area. Independent close: 3091
  unit/build tests, 373 browser passes (43 conditional skips), types/lint/format
  green; HTML 458086 bytes under the unchanged 460800-byte limit. Deviations
  are in `doc/work/archive/phase-3/M7-17-memo.md` and `M7-17-test-plan.md`.
- [x] M7-18 Direct polish at the user's request (2026-11-04, recorded by the
  2026-11-04 audit): explicit panel rebuild of a suspended linked basis from
  current numbers, two-decimal display in panel fields, drawn slider tracks,
  population shown as two hoverable pies, hoverable group-pie slices
- [x] M7-19 Design revision from the user's comments (2026-11-12). Local only:
  no publication until the user asks; no personal data of the user in any
  release. Contents:
  1. Start page: the "8 parties (free names)" card tinted light blue and the
     "questionnaire" card tinted too — safe-looking and attention-drawing.
  2. "How many parties" and "how will we name them" on one questionnaire page,
     one under the other.
  3. Neutral one-line notes under the ready party names, including the free
     names: "Likud without Bibi" gets the Likud note; "Religious Zionism" —
     union of parties representing settlers and settlements beyond the Green
     Line; "Other national camp" — centrist secular, market-oriented camp;
     "Yisrael Beiteinu without Liberman" gets the Yisrael Beiteinu note;
     "Democrats and left" — secular left, social-democratic; "Arabs" — group
     of Arab parties, religious and secular, whose voters are Arab citizens
     of Israel. All three languages; user approved neutral wording.
  4. One page: what a voter group is, where a party gets its votes, how many
     groups, and (below) how to name them.
  5. One page: group turnout (defaults ultra-Orthodox 85%, Arabs 70%), vote
     share of each party and each party's voter composition. Party-share rows
     at or below 7% start locked on that page (unlockable); a closed lock is
     visibly brighter.
  6. One page: resulting voter structure and yearly group growth.
  7. One page: seats in parliament, threshold and who will cooperate.
  8. One page for all checks, each shown graphically, with a button under each
     graphic back to its questionnaire section.
  9. Goal statement at the start and on the simulation screen: the aim is to
     find the coalitions possible under the current demographic balance, and
     that the simulation tabs are built for it. Stated as a general thesis:
     without cooperation of the two large secular parties, right and centrist,
     a government that is neither religious-dependent nor Arab-dependent
     cannot be formed, the future simulation shows the task grows harder, and
     shared values are needed.
  10. Coalitions tiles: a custom (manually created) tile can be edited after
      creation — its members shown and changed, not only deleted.
  Split into smaller items at `/1-memo` if the memo finds it too large.
- [x] M7-20 Second design revision from the user's comments (2026-11-12).
  Local only: no publication and no Git without an explicit request. Contents:
  1. Opening: the purpose-and-hypothesis block always open as an accent card
     (light background, 4 px bar, two short paragraphs, keywords emphasised);
     the text states that demographics and sector turnout decide the outcome
     and, as a hypothesis for discussion, that without a union of the two
     large secular parties — right and centrist — a government independent of
     religious or Arab parties is hard to form. The main call to action is a
     saturated blue button "Заполнить анкету (8 партий)" / "Fill Out
     Questionnaire (8 Parties)" / "מילוי שאלון (8 מפלגות)"; other start
     actions become visually secondary.
  2. Chapter 1: replace only the fifth party's description ("Наш дом Израиль
     без Либера") with the user's exact RU/EN/HE wording about Russian-speaking
     secular immigrants; other parties and the layout unchanged.
  3. Chapter 2: the screen starts with the "which voter groups" question
     carrying a footnote asterisk; the "what is a voter group" explanation
     with its picture moves below as the footnote text.
  4. Coalitions view: the top purpose block always open and prominent (card,
     4 px bar, 15–16 px text, keyword emphasis), explaining demographics,
     turnout, majority recalculation on left-side edits and the hypothesis,
     noting the task gets harder in the future; plus a bright button
     "Открыть Симулятор коалиций →" switching to the future view.
  5. Coalitions tiles block: heading "Возможные коалиции" / "Possible
     Coalitions" / "קואליציות אפשריות", a hint to tick up to four options and
     check whether they survive sector growth and turnout change, a second
     bright button to the simulator next to the selection, and a highlighted
     "Симуляции коалиций" tab in the top bar.
  6. Future view: replace the small caption with a prominent banner — the
     user's exact Russian text about demographics and turnout as the two main
     factors, the year slider and left-side turnout edits, and followed
     coalitions gaining or losing the 61-seat majority.
  All texts in RU/EN/HE including RTL; the user's quoted translations verbatim,
  the rest translated by meaning; emphasis rendered safely without HTML in
  translations; responsiveness and offline operation verified.
  Closed 2026-11-13 with the user's mid-implement additions: coalition-card
  captions grouped into members and the rest, revised example figures from the
  user's updated file, default ≤7% locks with a zeros fallback on every lock
  surface, the min-two-unlocked rule with its hint, the supporter-turnout
  recovery button «Выровнять автоматически» with the overall base → current
  turnout, chapter-2 and rules screen reorders, any-locale example-name
  translation (frozen basis and baseline included) and labelled experiment
  snapshots. Final gates: 3245 unit tests, typecheck/lint/format clean, 404
  browser passes (48 skips); offline file within the 900000-byte budget.
  Deviations are in `doc/work/archive/phase-4/M7-20-memo.md` and
  `M7-20-test-plan.md`.