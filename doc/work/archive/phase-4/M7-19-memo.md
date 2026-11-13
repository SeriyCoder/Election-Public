# Memo — M7-19 Design revision: start screen, merged questionnaire screens, framing and tile editing

| Field | Value |
| --- | --- |
| item | M7-19 |
| epic | M7 |
| phase | Phase 4 — M3 public preview |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-11-12 |
| closed | 2026-11-12 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

**Approval.** User, 2026-11-12: "ok, rashir memo i davai vnesem vse izmenenija
po chastjam, esli nuzhno kakie to minimalnie testy mozhesh sdelat, no vse testy
kogdnjat kazhdii raz do vnesenija vsheh izmenenii ne nuzhno". Clarified the same
day: small-share locks apply both in the questionnaire and in the Coalitions
panel; "how many parties" merges with the naming choice, the names list stays a
separate screen. The wording recommendations in Decisions below are applied
under this approval; the user may change wording at review without a new memo.

## Problem

The user reviewed the questionnaire and the simulation and asked for ten design
changes (backlog M7-19): the questionnaire has too many small screens, the
start screen does not invite the user strongly enough, the purpose of the
simulator is not stated, the free example names carry no explanation, the
small-party locks are invisible until used, the final check is a text list,
and a custom coalition tile cannot be changed after it is created.

## Scope

**In scope** — the ten points, grouped in three implementation parts.

Part A — start, purpose, descriptions

1. The "8 parties (free names)" card and the "Fill in the questionnaire" card
   on the opening page get a light-blue tint and a stronger primary button:
   calm, readable, visible focus, not alarming.
2. A short purpose statement on the opening page and on the Coalitions
   workspace: the aim is to find which coalitions are feasible under the
   scenario's current voter structure; the simulation tabs are built for that;
   the demographic future shows how feasibility changes. It is followed by the
   user's thesis, labelled as a question for discussion (see Decisions).
3. Neutral descriptions under the free names of the eight-party example on the
   names screen, shown only while the field still holds that example's name
   for that slot in the current language: Likud without Bibi and Yisrael
   Beiteinu without Lieberman reuse the existing Likud and Yisrael Beiteinu
   descriptions; Religious Zionism, Another National Camp, Democrats and
   further left and Arab parties get new descriptions in ru, en and he.

Part B — questionnaire screens

4. Screens. A screen shows one or more existing pages stacked; navigation,
   validation, confirmation and review links work by screen. The page keys,
   stored answers and the build are unchanged. Screens:
   - opening page;
   - party count + naming choice;
   - party names;
   - what a voter group is + where a party gets its votes (both lessons,
     compact) + group set choice + group count and group names when own;
   - group turnout + party vote shares + party voter composition;
   - resulting voter structure (check) + yearly group growth;
   - seats + threshold + who cooperates;
   - review.
5. Turnout suggestion per example group: ultra-Orthodox 85%, Arab 70%, every
   other group 70% as now. The Section 14.4 worked example and its suggested
   shares use the same per-group values so the example stays consistent.
6. Party vote-share rows in the questionnaire get locks like the composition
   rows, with an "Align" action that keeps locked rows. Rows at or below 7%,
   compared exactly, start locked; every lock can be opened. A closed lock is
   drawn clearly brighter than an open one, in the questionnaire and in the
   panel.
7. The Coalitions panel party-share list starts with rows at or below 7%
   locked, under the same exact comparison; locks stay unlockable.
8. The review becomes one screen without parts: every chapter is a small
   graphic (stacked bars for parties, groups, turnout, growth; figures for
   seats and threshold; a cooperation summary), each with its "Edit" button
   under the graphic leading to the screen that holds that chapter.

Part C — custom coalition tile

9. A custom tile in the Coalitions panel shows its members and has an "Edit"
   action that opens the existing creation dialog prefilled; saving keeps the
   tile's key and replaces its members and label; cancelling changes nothing.

Across all parts: local work only; no publication, push or deployment.

**Out of scope**

- Any change to `src/engine/` arithmetic, the scenario schema or the exported
  JSON; the stored questionnaire answers and the eight-party example's
  serialisation (`tests/fixtures/new8.json`) stay identical.
- New catalog descriptions for the standard catalog lists, beyond reusing the
  existing ones.
- Classifying governments as religious-dependent or Arab-dependent in the
  engine, or presenting the user's thesis as a computed result.
- The full English and Hebrew language review (M3-05 stays deferred).
- Publishing the result to `Election-Public` or the hosted preview.

## Approach

Screens are a thin layer over the existing page list in `src/ui/book.ts`: a
language-free grouping of consecutive page keys. The store moves between
screens: Next validates every answer page of the screen with the existing page
errors, confirms all of them and records them as answered; Back and the review
links open a screen by any page it holds. Answers carry their page explicitly,
so a stacked page edits its own answer. Pages keep their keys, so drafts,
saved questionnaires and the start examples keep working. Merged screens may
scroll; the one-screen fit check applies to the opening and names screens.

The small-share rule is one exact comparison of a decimal percent with 7,
placed with the existing exact percent helpers; the questionnaire alignment
reuses the exact proportional alignment already used for composition rows.

The review graphics reuse the existing stacked-bar component and the resolved
answers; they compute nothing new.

The tile edit reuses the creation dialog and the panel session's custom list.

**Rejected alternative:** really merging the page keys (one key per screen).
It would change stored answers, the start examples and every questionnaire
test, and gains nothing visible over stacking.

## Decisions (recommendations applied under the approval)

1. The thesis about the two large secular parties is shown as a labelled
   question for discussion: "Hypothesis to test: without cooperation between
   the two large secular parties, the right and the centre, it is hard to form
   a government that depends neither on religious nor on Arab parties; the
   demographic future makes the task harder. It may take changed priorities
   and shared values." Under it, one line says the simulator computes seats and
   configured cooperation, not political conclusions.
2. Arab parties description: "A group of Arab parties, religious and secular;
   their voters are mostly Arab citizens of Israel." The word "enclaves" and
   claims about voters' origin are not used.
3. Religious Zionism (free name): "Parties that represent, among others,
   settlers and communities beyond the Green Line." Another National Camp:
   "Centrist, secular, market-oriented camp." Democrats and further left:
   "Secular left, social-democratic."
4. The tint uses the existing accent blue at low opacity with dark text;
   contrast stays at WCAG AA, checked by axe in the browser suite.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Questionnaire draft and page keys | None; screens group existing pages | None |
| Turnout suggestion | Per example group: haredi 85, others 70; the Israeli educational preset follows it (see Deviations) | None |
| Panel session custom tiles | Existing entry edited in place, key kept | None |
| Scenario JSON and engine results | None | None |

## Interface Delta

Fewer, taller questionnaire screens; tinted start cards; purpose statement on
the opening page and Coalitions workspace; example descriptions; vote-share
locks in the questionnaire; default small-share locks; brighter closed locks;
graphical one-screen review; editable custom tiles. New strings in all three
tables. No engine API change beyond one exact comparison helper if it does not
already exist.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None. Locks and alignment only change which shares the user's alignment keeps; alignment uses the existing exact helper. |
| Where exact rationals are required | The ≤7% comparison and the share alignment use exact decimal-to-rational helpers, never floats. |
| Ordering / tie rules relied on | Unchanged. |
| Any display rounding near a decision? | No; the lock default compares the stored exact text, not a rounded display. |
| How determinism across runs, round trip and locale is proven | The eight-party example still serialises identically to `new8.json`; the existing engine and questionnaire build suites run unchanged at the end. |

## Files

| Path | Change |
| --- | --- |
| `src/ui/book.ts` | Screens over pages; per-group turnout suggestion; vote-share alignment with locks |
| `src/ui/store.ts` | Screen navigation, answer by page, review links, vote-share locks state |
| `src/ui/BookView.tsx` | Stacked screen render, start-card tint, purpose text, example descriptions, vote-share locks, graphical review |
| `src/ui/startExamples.ts` | Example description keys per slot |
| `src/ui/PanelControls.tsx` | Default small-share locks; brighter closed lock |
| `src/ui/CoalitionTiles.tsx` | Members shown and edit of a custom tile |
| `src/ui/CoalitionWorkspace.tsx` | Purpose statement |
| `src/engine/numeric.ts` | Exact "at most" percent comparison, only if missing |
| `src/ui/styles.css` | Tint, stacked screens, brighter lock, review graphics |
| `src/i18n/ru.ts`, `en.ts`, `he.ts` | New strings |
| `tests/ui/book.test.ts`, `tests/ui/bookView.test.tsx`, `tests/ui/store*.test.ts` | Minimal new tests; existing tests updated for screens |
| `tests/e2e/helpers.ts`, `tests/e2e/book*.spec.ts`, `tests/e2e/startExamples.spec.ts`, `tests/e2e/coalition*.spec.ts` | Walk by screen; fit check scope |
| `doc/spec/elections-simulator.md` | Questionnaire screens, defaults, locks, review, tile edit |

## Definition of Done

- [x] Minimal focused tests for screens, defaults, locks, descriptions and tile edit
- [x] The eight-party example still serialises identically to `new8.json`
- [x] One final run: `npm test`, `npm run typecheck`, `npm run lint`, `npm run test:e2e`
- [x] Offline file at or below 900000 bytes (raised from 460800 by the user, 2026-11-12: "podnjat do 900000"; the file was 465049 bytes)
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded
- [x] Changes stay local; nothing published

## Open Questions

None open; the two clarifications of 2026-11-12 are recorded in the approval.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /1-memo | The earlier three-slice split is replaced by one item covering all ten points | User, 2026-11-12: "rashir memo i davai vnesem vse izmenenija po chastjam" |
| /1-memo | Minimal new tests instead of a full red plan; the full gates run once, after all three parts | Same user decision; recorded here so `/4-close` checks the final run |
| /3-implement | The Israeli educational preset (and the "2022 (учебный)" start example) now uses haredi 85% turnout, so its example seats change from 31/30/11/14/18/16 to 30/29/11/15/20/15 and the Data Delta "suggestion only" no longer holds for that preset | Point 5 requires the example to stay consistent with the new suggestion; the test agent found the start example and preset disagreeing. Allocation arithmetic is unchanged; only an input value moved |
| /3-implement | Offline size budget raised from 460800 to 900000 bytes | The file reached 465049 bytes; user, 2026-11-12: "podnjat do 900000" |
| /3-implement | The questionnaire's motif drawing and its fixed caption are shown only on single-page screens; the check pie moves inline into the check block, without its caption line | Multi-page screens need the full width; the pie keeps its colour keys in the table beside it |
| /3-implement | Page fit without scrolling is kept for single-page screens; multi-page screens scroll inside the body with head and navigation in view | Stacking pages, as requested, cannot fit the smallest checked window |
| /3-implement | Existing unit and browser tests were updated to walk screens and scope per page block; expected example values changed exactly, never loosened | Consequence of the screen merge and the turnout default |
| /3-implement | The one-screen review is long (up to ~2200 px with ten long names), so it scrolls inside the body like the stacked screens instead of fitting without scrolling | Point 6 asks for all checks on one screen; head and navigation stay in the window |
| /3-implement | `Purpose.tsx`, `src/ui/presets.ts`, `tests/build/offline.test.ts`, `.github/copilot-instructions.md`, and several specific UI/browser test files were also changed beyond the Files table's named paths | The purpose block was extracted as a shared component; the 85% haredi example needed matching preset/test values; the user-approved 900000-byte limit needed its build gate and project map synced; screen grouping required adapting affected test locators |
