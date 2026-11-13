# Elections Simulator — Project Brief

## Start Here

1. Read [STATUS.md](../doc/work/STATUS.md).
2. If `active_memo` is set, read that memo.

## What This Is

An educational, offline-first browser simulator of turnout, vote distribution,
electoral threshold, Hamilton seat allocation and coalition feasibility. Not a
forecast or a legal calculator. Current state: milestone M1, the pure engine,
is complete in `src/engine/` (entry point `run.ts`); M2, the first usable
interface, is complete in `src/ui/` and ships as the offline file
`dist/elections.html`; M7, the party-first coalition simulation, is complete;
M3 public preview is live (M3-03 closed; launch kit, translation review and
phone/Firefox/Safari checks remain), and M4 analysis remains on hold. See
`doc/backlog.md` for progress.

The public preview is live at `https://seriycoder.github.io/Election-Public/`,
deployed from the public MIT repository `SeriyCoder/Election-Public`, which
holds a sanitized source snapshot without private history. This repository,
`SeriyCoder/Election`, stays private. Publish nothing new unless the user
explicitly asks; inspect the exact publication set for secrets and personal
data before any release. `npm run build:hosted` requires `HOSTED_BASE_URL` and
installed Edge, and prepares only `index.html`, `preview.png` and `README.md`
in `dist-hosted/`. The manual-only `.github/workflows/pages.yml` releases that
artifact from `main`; a push does not deploy the site.
The user explicitly deferred M3-05's full English/Hebrew language review until
after the first non-commercial release; do not claim that review is complete.

## Repository Map

| Path | Read this when… |
| --- | --- |
| `doc/spec/elections-simulator.md` | You need required behaviour, formulas, fixtures or acceptance checks |
| `build/hostedPreview.ts`, `scripts/buildHosted.mjs`, `dist-hosted/`, `.github/workflows/pages.yml` | M3-02 hosted target: validated `HOSTED_BASE_URL`, static Hebrew metadata, fresh Edge capture of the eight-party Coalitions view, exactly three output files; manual-only Pages release with read-only build and separate Pages/OIDC deploy permissions. `npm run test:e2e` builds both targets and needs the base setting; workflow uses two browser workers |
| `doc/backlog.md` | You need the next item or want to file a new one |
| `doc/work/STATUS.md` | You need the current item and stage |
| `doc/work/README.md` | You need the loop, file naming or lifecycle |
| `doc/work/templates/` | You are writing a memo, test plan or audit |
| `doc/work/active/` | You are continuing the item in flight |
| `doc/work/archive/` | You need the reasoning behind a closed item |
| `doc/work/audits/` | You need past drift findings |
| `doc/adr/` | You need a lasting decision and its reason (0001: toolchain) |
| `.github/prompts/` | You are running a loop step — the step definitions |
| `.github/skills/` | A `/1-memo` … `/5-audit` command must appear in a Copilot SDK / CLI chat |
| `.github/instructions/` | You need path-scoped rules |
| `src/engine/partyShares.ts` | Exact share-only party redistribution with transient locks and typed refusals; used by the linked party edit |
| `src/engine/linkedTurnout.ts`, `src/engine/linkedFlow.ts` | Exact linked group, overall-turnout and party-share edits; atomic creation of a derivable basis with a national edit; current/suspended basis and explicit rebuild; bounded, restriction-aware transfers within groups |
| `src/engine/historical2022.ts`, `src/engine/historicalReference.ts` | Frozen 40-list 2022 vote and official-seat reference, fresh exact party-mode preset, separately modeled Hamilton results and exact one-to-one historical comparison |
| `src/engine/legacyConversion.ts`, `src/ui/LegacyConversion.tsx` | Exact legacy detection and conversion with typed refusals; explicit before/after preview, cancellation, confirmation and independent original export |
| `src/ui/CoalitionWorkspace.tsx` | Coalition-side party shares, locks, seats and baseline/historical deltas; overall and group turnout; comparison and historical disclosures; legacy shares remain read-only |
| `src/ui/LanguageControls.tsx`, `src/main.tsx` | Shared questionnaire and toolbar language controls; fresh startup builds a labelled, editable no-group party example, with Hebrew fallback when no language is saved |
| `src/ui/startExamples.ts` | M7-16 ready examples ("8 партий (свободные названия)" — the user's eight-party file — and "2022 (учебный)") stored as exact questionnaire answers; `startExample` prefills every page; the opening page's four start cards live in `BookView.tsx`, `store.startBook` opens or leafs them |
| `src/engine/electorate.ts`, `src/ui/book.ts` | Exact unknown-aware voter mix and determinable turnout; optional questionnaire groups (Basic set of seven, with knitted kippot since M7-15), one always-distributed `compose` page with exact `scalePercents` alignment (`src/engine/numeric.ts`), single-screen turnout, shares, check, growth and cooperation pages, conditional checks and overall turnout |
| `build/compactLocales.ts` | Build-only translation-key deduplication and lossless DEFLATE values decoded as inert JSON with browser Compression Streams (since M7-16 the Russian table's keys travel inside its deflated payload too); explicit mismatch errors and exact transformed-table tests preserve the unchanged offline budget |
| `build/packStyles.ts`, `src/ui/packedStyles.ts` | M7-14 build-only packing of the inlined stylesheet as lossless DEFLATE base64 (`packInlineStyles`, applied in `vite.config.ts`); `installPackedStyles` in `src/main.tsx` decodes it with `DecompressionStream('deflate')` as inert text into one `<style>` before the first render |
| `src/engine/compositionEdit.ts`, `src/engine/redistribute.ts` | Exact optional party-composition edits on the original draft and shared proportional redistribution for party vote shares and party-composition group shares; `composition.ts` exposes the edits, unknown-aware reporting and display-only pie values |
| `src/ui/PartyCompositionEditor.tsx` | Collapsed party-mode composition editor with explicit equal assumptions, chart, typed errors and confirmation before marking unknown; `Composition.tsx` separates unknown contributions and demographic consistency |
| `src/ui/HistoricalReference.tsx` | Offline historical totals and 40 lists, official versus Hamilton seat labels and exact current comparison; transient explicit matches in `store.ts` are reversible, pruned on delete and cleared on scenario replacement |
| M7-10/M7-12 future view | `src/engine/futureRange.ts` exact group-population and all-party valid-vote visuals, set summaries and exhaustive half-seat crossings; `src/ui/FutureVisuals.tsx` accessible comparisons and transient red/orange sets; `src/ui/futureScanRunner.ts` dedicated cancellable range worker sharing `coalition.worker.ts`; M7-12 expands the main-app range to 0–50 and the followed-coalition limit to four |
| M7-12 integrated panels | `src/engine/panel.ts` free edits, exact locked smoothing/fallback, reference population and confirmed turnout correction; `supporterTurnout.ts` frozen party/group cohorts and exact futures; `coalitionVariants.ts` bounded compatible candidates and tile reports; `src/ui/PanelControls.tsx`, `CoalitionTiles.tsx`, `FutureWorkspace.tsx` live compact/enlarged controls, stable/custom/favourite tiles, two modes and playback; `store.ts` owns shared input, reset/rebase and effective experiment projections. Since M7-14 `panel.ts` also holds the exact ±0.25 stepper `stepPanelPercent` and display text `panelDisplay`, and `coalitionVariants.ts` the tile report `coalitionTileReport` (members, missing seats, pivotal members, majority mark, joiners). See specification 14.3.1 |
| 2026-11-04 polish | `src/engine/panel.ts` `rebuildPanelBasis` (explicit rebuild of a suspended linked basis from current numbers, restrictions kept) and `panelTrackPosition` (display-only slider fill); `src/ui/HoverPie.tsx` SVG pie with hover and tap slices, used by the group pies and the two population pies in `PanelControls.tsx` (`SuspendedRepair`, `GroupPie`, `PopulationPies`) |
| M7-17 prototype fidelity | `src/engine/supporterTurnout.ts` exact −1..+1 supporter coefficient (`turnoutAt`, `parseCoefficient`, `stepCoefficient`, `supporterRows`) and `populationTrend`; `src/engine/future.ts` per-year `missing` and `voteShare`; `src/ui/tileSets.ts` `useTileSets`, the shared default sets of the Coalitions tiles and the four future cards; `FutureWorkspace.tsx` timeline bar, growth card, donut cards and experiment; `CoalitionWorkspace.tsx` closed "Подробнее" area; `DirectedRelations.tsx` unpaged two-column rules |
| M7-19 design revision | `src/ui/book.ts` `bookScreens`/`screenOf` (eight screens stacking pages; `book.page` is the first page of its screen), `GROUP_TURNOUT` (haredi 85, arab 70), `smallShares` (exact <= 7% default locks) and `alignShares`; `store.ts` screen-wide `bookNext`/`bookBack`/`bookGoTo`, `answerBook(index, text, page?)`, `bookAlignShares`; `BookView.tsx` `PageBlock` per page, one-screen graphical review; `src/ui/Purpose.tsx` goal and hypothesis on the opening and Coalitions; `startExamples.ts` `exampleAbout`; `tileSets.ts` `replaceCustomTile` with the ✎ edit in `CoalitionTiles.tsx`; default small-share locks in `PanelControls.tsx` |
| M7-20 second design revision | `Purpose.tsx` always-open accent card with marker-based `emphasized` text and the Coalitions-only «Открыть Симулятор коалиций →» action; `book.ts` `defaultLocks` (≤7% with a zeros fallback), `MIN_UNLOCKED`/`canLockAnother`, chapter-2 order (question, count, names, then the footnote lessons) and the rules screen as cooperation → threshold → seats; `startExamples.ts` revised 2026-11-13 example figures (fixture regenerated), the dedicated fifth-party description and `translateExampleTitles`; `store.ts` session `voteLocks`/`cellLocks`, book `locks`, min-two rule with `lockNotice`, `alignPartyShares` (align + suspended-basis rebuild) and any-locale example-name translation on `setLanguage` (frozen basis and baseline included); `PanelControls.tsx` default locks, the min-two hint, «Выровнять автоматически» and the overall base → current turnout in both supporter entries; `FutureWorkspace.tsx` top banner, labelled experiment snapshots (middle: changed supporter turnout with overall before → after; third: turnout + demographics) and the «В коалиции / Вне коалиции» card captions; `CoalitionTiles.tsx` «Возможные коалиции» heading, hint and second simulator button; `App.tsx` accented future tab; the opening scrolls like a stacked screen; `scripts/buildHosted.mjs` captures at 2400×1260 scale 0.5 |
| `src/ui/Editor.tsx` | Group turnout uses the linked operation in party mode; legacy group edits keep stored restrictions, while participation, voting-mode and block controls remain hidden |
| `src/engine/` | Electoral arithmetic — the only place it may live; `rational.ts` exact rationals, integer powers and decimal-string parsing; `votes.ts` exact group- and party-mode ballots, projections and their unavailable reasons, `groupTurnout` and known party-mode group populations; `composition.ts` the electorate composition of a party or block by group, its rounded report and `voteSources` (the groups a list draws votes from and the largest, compared exactly); `electorate.ts` the questionnaire's party-first derivation (group population shares and vote weights from party vote shares, party compositions and group turnout), its forward counterpart for the example and `castingGroups`; `future.ts` the rounded report of a projected year beside year 0 and `buildCoalitionFuture` (a chosen coalition's seats, majority and pie stops in year 0 and a projected year); `threshold.ts` qualification and no-allocation states; `allocate.ts` Hamilton allocation with persisted tie order; `edit.ts` holds pure draft edits (stable IDs, the standard 99.9% valid-ballot rate and its exact check `isStandardValidity`, references, repair on delete, entity name and notes, group and rule setters, coalition pair edits (including directed party refusals), rebalance, dedicated and shared turnout cohorts of a party or block and the bulk cohort turnout edit); `run.ts` holds `runSeats` (seats only, synchronous, optional projection year) and `runScenario`; `numeric.ts` holds exact percent conversion, totals, largest-remainder rebalance, sum-preserving percent rounding, exact proportional alignment to 100% (`scalePercents`), pie boundaries and display rounding; `report.ts` builds the rounded results report; `compare.ts` compares a baseline with the current scenario and two coalition analyses; `coalitions.ts` holds the minimal winning search, chosen-coalition evaluation, larger coalitions, blocked majorities with their reasons, forbidden pairs that name who refused (`refusedBy`), and pivotal-party counts over the minimal winning list; `schema.ts` validates and serialises scenario JSON (version 5 with exact party-mode group turnout and optional linked basis; versions 1–3 migrate to group mode and version 4 keeps its mode) |
| `src/ui/` | Preact interface: `store.ts` (screen — questionnaire or editor, questionnaire state with its page and part, and its confirmations, the input last loaded, a preset waiting for confirmation, the automatically filled list, scenario input, view, editor page (key and index, settled on every input change), pending delete, rebalance locks, cohort turnout bulk edit, chosen-coalition selection, saved baseline, last import issues, clear-data notice, future year and composition target, derived validation and seats result for both, projection of the chosen year cached by input and year, followed future coalitions — at most four, pruned on party delete, cleared when the input is replaced), `storage.ts` the only local-storage access (app key prefix, language key, prefix-only clear), `App.tsx` shell (questionnaire or editor screen, preset confirmation, filled list; on the future view the chooser takes the editor's region), `book.ts` the language-free questionnaire model (pages, lesson pages, page parts and review parts sized by `BOOK_LIMITS`, names as pick / name pairs, ready values per field (`fieldPicks`, `chosenPick`), the lesson's worked example from the engine, the example group set with its shares (`exampleGroupSet`), suggestions, validation, narrator variants, the derived-electorate check, the draft and its build through the editor's edit functions), `BookView.tsx` the questionnaire screen (page, part step line, numbered names with their range line, a ▾ ready-value list joined to every typed field, the "Пример" disclosure, lesson pages, the example group set with its source on the group-set page, drawing with its "Пример" caption, the stacked bars and colour keys of the shares and composition pages (party selector and "Выровнять" on the composition page), the check table with its pie, the unpaged cooperation strips, navigation bar, confirmation dialog; named apart from `book.ts` because Windows paths ignore case), `motifs.tsx` the questionnaire's decorative inline SVG drawings and palm frame, `editorPages.ts` the language-free editor page list (scenario and rules, a page per group or one empty groups page, parties, coalition rules) and `resolvePage` (a missing group page falls back to the group at its position), `Editor.tsx` pager (page counter and title, Back and Next, page select; other pages and other groups' rows hidden; a new group opens its page), entity (with collapsed per-entity notes and a party turnout shortcut), rules, group (with the picture-of-the-world note) and coalition-pair editor (with the directed «Отказы партий» list; effective rules name who refused), `PercentField.tsx` exact numeric text field, `Hint.tsx` the (i) explanation button (hover title, click or tap opens the text; on the eligible-voter total and a group's population share), `Results.tsx` summary, tables, bars, seat diagram, legend toggles and chart details panel, `Coalitions.tsx` coalition view (minimal winning list, then pivotal parties, larger and blocked lists on request as closed disclosures; forbidden pairs and reasons name who refused) and chosen-coalition evaluation, `Compare.tsx` baseline compare view (also exports the side-by-side table helpers), `Composition.tsx` electorate composition view, `Future.tsx` projected-year view («Демографическое будущее») with a card per followed coalition (year-0 and year-k seat pies with the majority mark, exact table), `FutureChooser.tsx` the future view's coalition chooser (checkboxes, limit note, search states), `coalitionChoice.ts` the follow limit, order-free set key and chooser entry list, `groupColors.ts` the group palette by position and `groupColorOf` (catalog colour first, then position), `catalog.ts` the language-free 2022 Knesset list and group catalog (IDs, colours, seat order, the six-list example set, the seven-group Basic order with `knitted-kippot`; name and description keys by kind and ID), `Transfer.tsx` JSON import/export controls and import issue box, `fileTransfer.ts` size-checked file read and download, `coalitionRunner.ts` worker lifecycle (debounce and cancel; one runner each for the current scenario, baseline and conversion preview; the preview reports an unavailable worker rather than using the main-thread fallback; hands the page at most `LISTED_COALITIONS` minimal winning coalitions plus the total, and the larger and blocked lists capped the same way, with pivotal counts taken before the cap) with `useRunner.ts` hook, `useStore.ts` store subscription hook, `coalition.worker.ts` worker entry, `presets.ts` (language-free examples with empty names: the four Section 8 rows, then open split, multi-party block and the Israeli educational example built from catalog IDs; `EXAMPLE_GROUPS` the Section 14.4 group rows shared with the questionnaire, shares from CBS 2022 figures; `presetIdOf`), `names.ts` the only place a shown name is resolved (typed name, then catalog name, then default label for an empty name from kind and ID digits, scenario title, display copy for result views, language-neutral duplicate name), `styles.css` |
| `src/i18n/` | UI string tables (`ru.ts` reference, `en.ts`, `he.ts` typed against its keys), `translator(locale)`, direction, and `format.ts` (`formatInteger`, `formatDecimal`, `formatChange`, `pluralCategory`), the only place locale number formatting is allowed |
| `src/main.tsx`, `index.html` | Browser entry, opening on the questionnaire; `src/vite-env.d.ts` gives the app Vite client types |
| `vite.config.ts`, `dist/elections.html` | Build config: translation compaction, single-file inlining, packed stylesheet, rename to `elections.html`, build-only CSP meta, preload polyfill off; the file must stay at or below 900000 bytes (raised from 460800 in M7-19) (`tests/build/offline.test.ts`). `npm run build` writes the offline file; the local link is `dist/elections.html` opened from disk |
| `tests/build/` | Vitest in-memory production build check of the offline file (runs in `npm test`; `NODE_ENV` stubbed to `production` so the size matches the shipped file) |
| `tests/engine/` | Vitest engine suite |
| `tests/engine/helpers/` | Shared scenario builders and the seeded PRNG for property tests |
| `tests/ui/` | Vitest UI suite: store tests and shell rendering with `preact-render-to-string` (no DOM) |
| `tests/fixtures/` | `new8.json`, the user's "New 8 parties" scenario file; the M7-16 eight-party start example must serialise identically to it (`tests/ui/startExamples.test.tsx`, `tests/e2e/startExamples.spec.ts`) |
| `tests/vite-env.d.ts` | Test-only Vite types (`?raw` source imports for static scans) |
| `tests/e2e/`, `playwright.config.ts` | Playwright browser suite on the built offline file (installed Edge, desktop and phone projects, axe-core, 200 ms budget; `helpers.ts` opens the app through "Пропустить анкету", turns the editor to a page (`openEditorPage`) and holds the part-aware questionnaire walk; `bookFit.spec.ts` checks page fit at the six Section 14.6 sizes and entry motion). Run `npm run test:e2e`; it is not part of `npm test` |

## The Loop

| Step | Prompt |
| --- | --- |
| Memo | `/1-memo <ID>` |
| Tests (red) | `/2-tests` |
| Implement (green) | `/3-implement` |
| Close | `/4-close` |
| Audit | `/5-audit` |

## Non-Negotiable

1. **Seat calculation is correct and deterministic** — exact rationals, sum
   equals `seatCount`, display rounding never decides a seat.
2. Electoral arithmetic only in `src/engine/`.
3. No network at runtime; the offline HTML works from disk.
4. User names and notes are always inert text.
5. No inference about real voters from demographic labels.

## Environment

PowerShell 5.1: chain with `;`, never `&&`. Git belongs to the user — run it
only when the user explicitly asks in the current request, and then commit once
per item after `/4-close`; otherwise suggest commands as text.
