# Memo — M2-24 Visual world and page fit

| Field | Value |
| --- | --- |
| item | M2-24 |
| epic | M2 |
| phase | Phase 2 — M2 reopened for the questionnaire, time model and Israeli example |
| status | closed |
| created | 2026-10-30 |
| closed | 2026-10-30 |

## Problem

Section 14.6 asks for an illustrated, light Israeli questionnaire whose every
page fits without scrolling at 1280 × 720, 1366 × 768 and 1440 × 900 at 100%
and 125% zoom, with long names, errors and narrator replies, and with all
actions visible. M2-23 left an empty illustration slot on every page, and a
measurement of the built file shows that it does not fit: with ten parties,
eight own groups and 90-character names, preference pages overflow by up to
404 px, coalition pages by 321 px, names pages by 126 px and the review by
1 131 px at 1280 × 720 at 125%. Even the default four parties overflow on the
review (374 to 720 px) and on the names and shares pages at 125%. A confirmation
opened inside the page pushes the navigation further down.

## Scope

**In scope**

- Original drawings made for this project as inline SVG, one per motif named by
  the page: menorah (opening page), ballots (parties), people (electorate),
  pie (preferences), ballot box with a queue (turnout), calendar (growth and
  turnout change), Knesset (seats and review), threshold line (threshold),
  round table (coalitions), and both sides of a one-shekel coin (facts page).
  Palms frame the motif on the opening and review pages. No motif is tied to a
  party, no figure has ethnic features, and no state emblem, inscription or
  official form is imitated.
- Example captions under the motifs that show numbers, each starting with
  "Пример" and fixed, never read from the answers: preferences (40 of 100),
  turnout (7 of 10), growth (1 000 to 1 020), turnout change (70% to 71%),
  threshold (a notional line).
- Short entry animations, run once when a page appears and never blocking a
  button: palm leaves sway, the coin turns over, the other motifs draw or fade
  in. Under `prefers-reduced-motion: reduce` there is no animation and the
  final state shows at once. No sound.
- Page parts: a percents page (shares, preferences) or a coalition page with
  more rows than fit is shown in parts with "часть n из m"; the review is
  shown in parts by chapter. Next walks the parts; the last part confirms the
  page as today.
- The page frame for the required sizes: compact head, text and answer column
  beside a narrower illustration column, navigation at the bottom; name and
  label text wraps anywhere; names pages show their fields in two columns on
  wide screens.
- Questionnaire names limited to 60 characters (editor unchanged) and four
  names per page instead of five.
- Confirmations open as a dialog over the page; the page behind is inert.
- A browser page-fit check at the six size and zoom combinations, and a motion
  check with and without reduced motion.
- The offline size budget raised from 300 kB to 350 kB.

**Out of scope** (at least two)

- Photographs or third-party raster images: Section 14.6 settles on inline SVG
  drawn for the project, so no rights or downloads are involved.
- A sticky navigation bar or other changes below the required sizes: Section
  14.6 allows scrolling there with the navigation reachable in the flow.
- Illustrations, page fit or animation in the editor and results views.
- Reviewed English and Hebrew wording of the new captions (M3-05).
- Motifs that react to the user's answers (for example as many ballots as
  parties): every drawing is fixed so no illustration can read as a result.

## Approach

Section 14.6, building on the Section 14.5 model.

**Parts.** A part is a view of one questionnaire page, not a new page: the
draft, page keys, suggestions, answered state and validation of M2-23 stay as
they are. `src/ui/book.ts` gains the part plan as a pure function of the draft
and the page: the visible rows of a percents or coalition page are cut into
`ceil(rows / 4)` parts of balanced size, in field order (six rows give 3 + 3,
ten give 4 + 3 + 3); a coalition page's own column is not a row, and "may join
a government" is the first row. Every other answer page has one part. The
review is cut into parts by chapter, packed in order against an estimated line
count taken from the number of names and their typed lengths (untyped names
count as short); the constants live in `BOOK_LIMITS` and are tuned in
`/3-implement` against the browser check, any change recorded as a deviation.
The questionnaire state gains the current part, starting at 0.

Navigation with parts, in the store: Next on a part before the last checks only
that part's fields for range errors and moves to the next part; Next on the
last part runs the full page check and confirmation of M2-23. When the full
check fails on a field in an earlier part, the store moves to that part and
shows the error there; a sum error stays on the last part. Back on a later part
goes to the previous part; Back from the first part goes to the previous page
at its last part. Going to a page from the review, starting over and opening or
closing the facts page land on part 0 of the page (the facts page keeps the
part it was opened from). "Пропустить анкету" and "Построить мою симуляцию"
ignore parts. On the review, Next walks the parts and the build button shows on
the last part. A percents part shows the remainder to 100% of the whole page.
Focus moves to the question on every part change, as on a page change. The page
element carries the part number for tests.

**Fit.** The book fills the viewport: head, body and navigation in rows, the
body as a text and answer column beside an illustration column of about a
third, smaller question type, no internal scroll region, no clipping and no
`overflow: hidden`. Labels, questions with a subject name and review lines
wrap anywhere. The name limit of 60 characters bounds every label and every
question that quotes a name to at most two lines, so the part sizes can be
fixed; four names per page lay out as two rows of two. The confirmation becomes
a centred dialog over the sheet with the head, body and navigation marked
inert while it is open; focus moves to its first button and returns to the
question when it closes. Below the required sizes the page may scroll; the
navigation stays in the flow.

**Drawings.** `src/ui/motifs.tsx` holds the drawings as small inline SVG
components with a fixed view box, decorative (`aria-hidden`, not focusable), in
the light palette: white, blue, palm green and coin metals, with neutral tones
for people. The coin shows the lily side and the "1" side of the one new shekel
without lettering, side by side, each turning over once on entry. The
illustration element is keyed by page and part, so the entry animation replays
on every page turn. Captions are text below the drawing from translation keys,
outside the SVG.

**Size.** The drawings, styles and strings add an estimated 15 to 20 kB to a
file that is 294 kB against a 300 kB budget set in M2-09. The budget becomes
350 kB in Section 2 and in the offline build test; it remains a guard.

**Rejected alternative:** splitting dense pages into more model pages (one key
per slice of a group's preferences) — it would split one 100% sum across page
keys, answered states and fill-in rules, and rewrite the M2-23 model for a
layout concern. Also rejected: fitting by shrinking type or hiding the
illustration on dense pages — Section 14.6 forbids small type, and the slot is
required on every page.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Questionnaire state | current part added | None: the questionnaire state is never stored or exported |
| Questionnaire name limit | 200 → 60 characters | None: the scenario schema and the editor keep 200 |
| Names per page | 5 → 4 | None |

## Interface Delta

- `src/ui/book.ts`: the part plan of a page, the part-only range check and the
  review parts; `BOOK_LIMITS` gains the part constants and the name limit; the
  questionnaire state gains the part.
- `src/ui/store.ts`: Next, Back, go-to, start over and the facts page respect
  parts.
- `src/ui/motifs.tsx` (new): the drawings and the palm frame.
- `src/ui/BookView.tsx`: part rows, part step line, review parts, drawings,
  captions, confirmation dialog.
- Translations: the part step line and the five captions in ru, en and he.

## Seat-Calculation Correctness

Not affected: the item changes how questionnaire pages are laid out, paged and
drawn; `buildBook`, the editor functions and the engine are untouched, and the
only rule change (names over 60 characters are refused in the questionnaire)
acts before any value reaches the scenario. Existing tests that pin the
questionnaire build against the editor and the Israeli example seats
31 / 30 / 12 / 15 / 18 / 14 keep running unchanged.

## Files

| Path | Change |
| --- | --- |
| `src/ui/book.ts` | part plan, part check, review parts, constants, name limit, state part |
| `src/ui/store.ts` | part-aware navigation |
| `src/ui/motifs.tsx` | new: inline SVG drawings and palm frame |
| `src/ui/BookView.tsx` | parts, drawings, captions, confirmation dialog |
| `src/ui/styles.css` | page frame, grids, drawings, entry animations, reduced motion, dialog |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | part step line, captions |
| `tests/ui/book.test.ts` | part plans, review parts, name limit, four names per page |
| `tests/ui/store.test.ts` | part navigation, errors in earlier parts, Back across pages |
| `tests/ui/bookView.test.tsx` | part rows and step line, review parts, drawings, captions, dialog |
| `tests/ui/motifs.test.tsx` | new: every motif decorative, no external reference, both coin sides |
| `tests/build/offline.test.ts` | 350 kB budget |
| `tests/e2e/book.spec.ts` | the Next helper waits for a page or part change |
| `tests/e2e/bookFit.spec.ts` | new: page fit at the six sizes, motion with and without reduced motion |
| `doc/spec/elections-simulator.md` | Section 2 budget, Sections 14.5 and 14.6 as built |
| `.github/copilot-instructions.md` | repository map |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. What do "1280 × 720 … at 125%" measure? — **Recommendation:** the browser
   viewport, as the browser suite sets it: 1280 × 720, 1366 × 768 and
   1440 × 900 CSS pixels at scale 1, and 1024 × 576, 1092 × 614 and 1152 × 720
   CSS pixels at device scale 1.25 for 125%. Screen resolution minus browser
   chrome varies by browser and cannot be tested.
2. How are dense pages split? — **Recommendation:** parts within a page as
   described under Approach, at most four rows per part, balanced; the review
   in parts by chapter.
3. Does the questionnaire keep names up to 200 characters? — **Recommendation:**
   no, 60. Every 2022 list name fits, and the bound is what lets a page promise
   to fit; the editor keeps 200.
4. How many names per page? — **Recommendation:** four, in two columns on wide
   screens; a catalog description under each name still fits.
5. Photographs or drawings? — **Recommendation:** drawings made for the project
   as inline SVG, as Section 14.6 already says: no rights to verify, no
   downloads, small.
6. Where do the palms go? — **Recommendation:** framing the motif on the
   opening and review pages. At 1024 to 1152 CSS pixels the page margins are
   too narrow to show palms outside the sheet.
7. Do the captions use the user's numbers? — **Recommendation:** no; fixed
   examples labelled "Пример", the same for every answer.
8. Does the confirmation stay inside the page? — **Recommendation:** no, a
   dialog over the page with the rest inert; inside the page it pushes the
   navigation off screen.
9. What size budget? — **Recommendation:** 350 kB, set in Section 2 and the
   build test, leaving room for M3.
10. Where does Back from a page's first part go? — **Recommendation:** to the
    previous page's last part, as turning back a page in a book.

Approved 2026-10-30 on the user's instruction for an autonomous run: "izuchi vnedrenie, vizualizaion i implement vse eto, do nachala M2" (2026-10-30), in autopilot mode; the recommendations above are the decisions.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | `tests/e2e/helpers.ts` also changes: the book helpers (`book`, `openBook`, a part-aware `next` and `back`, `nextTo`, `toBuild`) move there from `book.spec.ts` | `bookFit.spec.ts` needs the same part-aware walking; one copy keeps both specs in step |
| /3-implement | The review page puts each chapter's edit button in the chapter's header row, moves "Начать анкету заново" from the text column into the navigation bar (also on the opening page), and widens the text column to 3fr/1fr; other pages keep 2fr/1fr | The tests pin whole-chapter packing, so one chapter must fit alone: eight 60-letter group names take 17 lines at 1024 × 576, and the first layout overflowed the review by 15 to 105 px at 125% |
| /3-implement | Constants as tuned: four names per page, 60 characters, four rows per part; the review estimate uses 14 lines per part, 3 lines per chapter frame, 64 characters per line, and 10 or 32 characters for an untyped party or group name | The review estimate is conservative for ordinary text and still fits the worst case (unbroken wide letters) because the layout above leaves the room |
