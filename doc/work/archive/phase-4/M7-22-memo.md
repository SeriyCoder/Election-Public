# Memo — M7-22 First-Visit Welcome Dialog With Multilingual Inline-SVG Illustration

| Field | Value |
| --- | --- |
| item | M7-22 |
| epic | M7 |
| phase | Phase 4 — M3 public preview |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-11-23 |
| closed | 2026-11-23 |

Approval: user replied `approved` on 2026-11-23; all six recommendations are
accepted as written.

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

The offline simulator opens directly on the questionnaire, so first-time
visitors receive no short visual welcome, no explanation of the educational
purpose, and no explicit language choice before reading the rest of the
interface. M7-22 adds one first-visit modal with a local, original SVG
illustration and simultaneous RU / HE / EN headings, while preserving the
existing offline, no-network opening and questionnaire behaviour.

## Scope

**In scope**

- First-visit welcome dialog shown once per browser/origin, remembered through
  one key in the existing `elections-simulator.` storage namespace.
- Three bottom actions in visual locale order: `Русский`, `English`, `עברית`;
  selecting one updates the interface language through the existing store,
  closes the dialog, and marks the welcome as seen.
- The questionnaire's "Вступление" label is a button; after the first visit it
  can reopen the same welcome dialog on demand without clearing storage.
- Close in four ways: top-right `×`, backdrop click, Escape, or a language
  button. Any successful close marks the welcome as seen for later visits.
- Modal accessibility: native dialog, `aria-modal` semantics, labelled title,
  focus moves into the card, Tab stays in the dialog, Escape closes it, and
  focus returns to the element that had focus before opening.
- White card centred over a translucent dark/backdrop-blurred layer; rounded
  16–20 px corners, soft shadow, phone-safe width and scrollable body, close
  button at least 40×40 px. The card keeps the physical close button in the
  upper-right in both directions, while text and language actions follow the
  selected locale direction.
- Original inline SVG, no external image, font, link or runtime fetch: a warm
  sun in the centre with person-like rays. Geometric figures use varied skin
  tones and respectful clothing/headwear cues for secular citizens, knitted-
  kippah wearers, hat wearers, ultra-Orthodox dress, immigrants, Ethiopian
  Jews and Arab citizens. No figure is labelled by identity, no figure stands
  for a party, and the drawing has no numerical or political meaning.
- Three simultaneous headings below the illustration, using the user's exact
  text and order:
  1. RU — «Добро пожаловать в Симулятор ДЕМОГРАФИЧЕСКИХ выборов Израиля»
  2. HE — «ברוכים הבאים לסימולטור הבחירות הדמוגרפיות של ישראל»
  3. EN — «Welcome to the Israel DEMOGRAPHIC Election Simulator»
  The HE heading uses `dir="rtl"`; only the named keyword is highlighted by
  an accent component. Translation strings contain no HTML.
- A small muted note in each of the three language blocks, by meaning:
  “Educational mathematical model for exploring coalitions and turnout.”
- Offline-safe, responsive, reduced-motion-safe presentation. The dialog is
  shown only by `main.tsx`; server-rendered/UI tests can render the app without
  a welcome adapter and remain deterministic.

**Out of scope** (at least two)

- Public publication or deployment — M7-22 remains local until the user asks.
- Changing the existing start choices, questionnaire, engine, scenario schema,
  coalition arithmetic or political hypotheses.
- Replacing the existing inline motif set with the welcome SVG.
- Full visual-identity, branding, logo export or M3-04 launch-kit work.
- M3-05 whole-language review and M3-07 real phone/Firefox/Safari checks.

## Approach

The welcome state belongs to presentation/storage, not the scenario store
(spec 14.5 and 14.6). `storage.ts` gains a typed first-visit adapter method and
one versioned key under `STORAGE_PREFIX`; `main.tsx` creates that adapter once,
passes it to both `createStore` and a separate welcome prop on `App`.
`App.tsx` owns only the transient “open now” flag. It renders one native
`WelcomeDialog` above the existing book/app screen and does not alter screen,
view, draft or scenario state.

`WelcomeDialog.tsx` renders the native dialog and language controls. Its close
handler is the only place that marks the welcome seen; each route — close,
backdrop, Escape or language — calls it. A language control first calls the
existing `store.setLanguage(locale)` then closes. When storage is unavailable,
the component still closes for this page load; it may show again on a later
reload because there is no durable place to record the choice.

`welcomeArt.tsx` holds the original SVG as geometry only. It is decorative
(`aria-hidden`) because the three headings already give the accessible
meaning. Flat shapes and clothing cues avoid portraits, logos, party colours
and inferred real-voter statistics. The SVG and the highlighted heading words
are rendered as Preact text/elements; no `innerHTML` or translated markup is
accepted.

**Rejected alternative:** hiding the questionnaire with a normal page block.
A native modal gives focus containment, Escape semantics and an explicit
backdrop without duplicating the app's state/routing model.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Browser welcome key | Add `elections-simulator.welcomeSeen` under the existing prefix; value is a tiny versioned marker | None |
| Scenario schema | No fields added or changed | None — stays version 5 |
| Scenario/book state | No modification on showing, closing or choosing a language beyond the existing `setLanguage` action | None |

## Interface Delta

- New first-visit modal component with focus/keyboard/backdrop behaviour.
- New decorative inline-SVG welcome art component.
- Three language buttons that set the app language and close the dialog.
- New RU/EN/HE strings for the simultaneous headings, highlighted keyword
  pieces and educational notes.
- Storage adapter gains read/mark methods for the owned welcome key.
- `clearSavedData` removes this key because it uses prefix-only clearing;
  after a later reload the welcome can therefore appear again.
- No public engine or export API changes.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None. The modal changes only first-visit UI and language selection. |
| Where exact rationals are required | Nowhere; no engine value is read or written by the dialog. |
| Ordering / tie rules relied on | None. |
| Any display rounding near a decision? | No numbers are displayed. |
| How determinism across runs, round trip and locale is proven | Existing engine/fixture suites run unchanged; UI tests prove opening/closing/language selection leaves the scenario, draft and results identical. |

Not affected: this item is presentation, accessibility and browser-local
first-visit storage only, with no electoral arithmetic.

## Files

| Path | Change |
| --- | --- |
| `src/ui/WelcomeDialog.tsx` | Native first-visit dialog, close routes, focus, three language actions and simultaneous headings |
| `src/ui/welcomeArt.tsx` | Original autonomous inline SVG sun/person-ray illustration |
| `src/ui/storage.ts` | `elections-simulator.welcomeSeen` key and typed safe read/mark operations |
| `src/main.tsx` | Create one storage adapter and pass it to store and App for the first-visit check |
| `src/ui/App.tsx` | Optional welcome adapter prop and transient open/close state; render above the existing screen |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Exact three headings split into inert highlighted parts plus one educational note per language and close label |
| `src/ui/styles.css` | Backdrop blur, white 16–20 px card, 40×40 close control, SVG/title sizing, phone layout and RTL |
| `tests/ui/storage.test.ts` | Welcome key prefix, once-read/mark, blocked storage and prefix-only clear |
| `tests/ui/welcomeDialog.test.tsx` | SSR contract: three headings, three language actions, RTL `dir`, inert highlights and no scenario mutation |
| `tests/e2e/welcome.spec.ts` | First visit, close-by-×, backdrop and Escape; focus return; language close; remembered visit; clear-data shows it after reload; phone/RTL/offline |
| `doc/spec/elections-simulator.md` | Sections 14.5/14.6: first-visit modal, SVG ownership, one-shot key and accessibility |
| `.github/copilot-instructions.md` | Repository-map row for the welcome UI, art and storage key |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Local hosted/offline checks prove no external request and pass axe/layout
- [x] Deviations recorded

## Open Questions

1. Is a dismiss by `×`, backdrop or Escape counted as “seen” even if the user
   did not choose a language? — **Recommendation:** yes; first-visit means
   first view, not first language choice. The existing locale remains active.
2. What happens after **Clear saved data**? — **Recommendation:** because the
   welcome key is under the owned prefix, it is cleared with the other app
   keys; the next page load shows the welcome again.
3. Where is the close control in RTL? — **Recommendation:** preserve the
   user's explicit physical top-right placement in both directions; keep the
   card text and action order RTL-aware.
4. What happens when localStorage is blocked? — **Recommendation:** keep the
   dialog usable for the current load and mark it only in component memory;
   on a later reload it may appear again because durable storage failed.
5. Should the welcome auto-select Hebrew for a fresh visitor? —
   **Recommendation:** no change to startup language; the dialog offers all
   three buttons, while the existing stored/default locale remains until a
   user chooses.
6. Are all figures shown at once in the SVG? — **Recommendation:** yes, as one
   balanced respectful illustration; decorative only, with no labels or
   quantitative meaning.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | `tests/ui/i18n.test.ts` has an exact allowlist for keys beginning `welcome.title.` in the "no copied translations" guard | The welcome intentionally renders the exact same three heading languages at once regardless of the current interface; the other UI strings remain translation-checked normally. |
| /3-implement | Existing browser tests receive a test-only welcome-seen marker in `tests/e2e/helpers.ts`, except `welcome.spec.ts`; hosted capture dismisses the dialog explicitly | Existing feature tests should keep their original starting state; dedicated welcome tests still exercise a true first visit. |
| /3-implement | With no focusable prior element on initial page load, closing the modal focuses the active toolbar language button | A native first load usually has `body` as `document.activeElement`; the fallback gives focus a useful connected control while true prior focus is restored when available. |
| /3-implement | The questionnaire's «Вступление» label is a reopen button for the same welcome dialog | User found console/storage replay too difficult and requested a direct visible action; the one-time automatic visit and the seen marker are unchanged. |
