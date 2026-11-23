# Memo — M7-21 Coalition Workspace Hierarchy And Future-Model Clarity

| Field | Value |
| --- | --- |
| item | M7-21 |
| epic | M7 |
| phase | Phase 4 — M3 public preview |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-11-22 |
| closed | 2026-11-22 |

Approval: user replied `approved` on 2026-11-22; all five recommendations are
accepted as written.

## Problem

On the Coalitions view, the most important output — possible coalitions — is
below the group-vote and population graphics, so the reader has to search for
the result; custom coalitions also lose their pencil after opening the
enlarged detail. The future selector has no clear initial choice, and the
future banner does not say that the model holds parties, priorities and the
current agenda fixed, so readers may mistake the simulation for a model of
political change rather than only demographics and turnout.

## Scope

**In scope**

- Right column of the Coalitions workspace: move the "Possible coalitions"
  block above "How each group votes"; keep population pie charts after the
  group-vote block. This is a visual order change only.
- Every coalition tile gets an explicit "Enlarge" action in addition to the
  existing clickable main area; it opens the same detail dialog used now.
- The "Possible coalitions" heading itself is a button: clicking it expands
  that whole card to the screen, and the same control becomes "Standard view"
  to return. In the compact header, the favourite-only checkbox and "Nearest"
  reset button are hidden; the "Open Coalition Simulator" action is visually
  stronger.
- In that dialog, a custom coalition keeps an "Edit" pencil. The pencil opens
  the same custom-coalition editor, with the selected parties prefilled, and
  saving returns to the same enlarged detail view.
- Default future selection: only the first two of the four shown coalition
  tiles are checked for "Coalition simulations" until the user changes the
  selection. The user's first manual checkbox action marks the selection as
  explicitly managed for the current scenario/session; later recomputation
  does not silently re-check defaults. A changed/replaced scenario resets the
  default selection as before, because it can have different coalitions.
- On the "Demographic future" view, replace the small banner with a brighter
  model card containing the user's exact Russian text and semantic EN/HE
  translation:
  **Sуть модели (при сохранении сегодняшней повестки)**, an explanation that
  demography and turnout are the changing factors while parties, priorities
  and the political agenda remain today's. The separate hypothesis paragraph
  was explicitly removed by the user during implementation (it remains on the
  opening and Coalitions purpose cards, not in the simulator card). Keyword
  emphasis uses text markers, never translation HTML.
- Minimum RTL/desktop/phone verification and offline build. No publication.

**Out of scope** (at least two)

- Changing seat, vote, threshold or coalition arithmetic.
- Changing the four-coalition limit, candidate search, favourites or custom
  coalition identity.
- Reworking the demographic model to simulate party-position or agenda
  changes (the new wording explicitly says those stay fixed).
- M3-04 launch kit, M3-05 full translation review, M3-07 real phone/Firefox/
  Safari checks, or public deployment.

## Approach

The hierarchy is implemented in the existing integrated panel composition in
`src/ui/PanelControls.tsx` (spec 14.3.1 and 14.6): reorder only the right
column's three blocks — coalitions, group voting, population — while retaining
the components' internal state and IDs.

The tile component already owns the detail and custom-editor state in
`CoalitionTiles.tsx`. Add an explicit enlarge button that sets the existing
`detail` state. When the detail entry is custom, render a pencil beside the
modal title that sets `editing` and `custom` from `detailEntry.partyIds`.
After save, set `detail` back to the resolved custom key. No duplicate editor
or arithmetic path is introduced.

Default future selection is resolved in `tileSets.ts` / `store.ts`, not in the
render: when the selection session has never been touched and the four shown
tile keys are known, initialise the first two as followed. Once any
future-coalition checkbox is used, a session flag preserves the user's exact
selection (including zero selected). Existing import, prune and replace
behaviour remains.

**Rejected alternative:** selecting the first two at initial app creation.
That would run before candidates and displayed tiles are known, and would
create stale IDs after import/preset changes.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| `PanelSession` UI state | Add one session-only "future selection explicitly managed" flag | None; scenario/export schema stays version 5 |
| Stored future selections | Existing `futureCoalitions` continues to hold party sets; no persisted scenario field | None |

## Interface Delta

- Right-column block order in `PanelControls.tsx`.
- Coalition tile "Enlarge" button and enlarged custom edit action.
- Whole-card expand/collapse action with compact-header controls reduced.
- Default first-two future checkbox selection, with a "touched" state.
- Brighter future banner model card with title and explanatory paragraph in
  RU/EN/HE.
- No public engine or export changes.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None. Only panel order, modal controls, selection defaults and strings. |
| Where exact rationals are required | Nowhere new; coalition reports and future calculations continue to come from `src/engine/`. |
| Ordering / tie rules relied on | The displayed candidates' established order determines "first two"; seat/tie search order is not changed. |
| Any display rounding near a decision? | No: the enlarged report reuses its existing exact report and display formatting. |
| How determinism across runs, round trip and locale is proven | Store/UI tests assert the same first two, locale-independent party sets; existing engine determinism and fixture parity run unchanged. |

Not affected: no electoral arithmetic is added or changed.

## Files

| Path | Change |
| --- | --- |
| `src/ui/PanelControls.tsx` | Reorder right-column sections: coalition tiles first, group voting second, population third |
| `src/ui/CoalitionTiles.tsx` | Explicit enlarge action; pencil available in enlarged custom detail |
| `src/ui/tileSets.ts` | Expose the stable displayed/default tile keys needed for first-two initial selection |
| `src/ui/store.ts` | Session flag for manually managed future selections and default first-two selection hook |
| `src/ui/FutureWorkspace.tsx` | Brighter model card replacing current future banner |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | Enlarge/edit/model-title text and semantic translations |
| `src/ui/styles.css` | Block hierarchy, explicit enlarge button, modal pencil, brighter model card |
| `tests/ui/panel.test.tsx` | Block order and model card |
| `tests/ui/designRevision2.test.tsx` or `tests/ui/panel.test.tsx` | First-two default and manual-touch preservation |
| `tests/e2e/panel.spec.ts` | Enlarge, custom edit from detail, checkbox selection and right-column order |
| `doc/spec/elections-simulator.md` | Sync 14.3.1 / 14.5 presentation and future-model caveat |
| `doc/backlog.md` | Add the M7-21 item and close it only at /4-close |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec synced
- [x] Deviations recorded

## Open Questions

1. “Крупно” means a separate labelled action that opens the existing enlarged
   detail, rather than changing every tile to a permanently larger layout. —
   **Recommendation:** yes; retain the compact overview and add one explicit
   button per tile.
2. Which future coalitions start checked? —
   **Recommendation:** first two of the currently shown four tiles, only
   until the user first uses a future checkbox.
3. Does “user first changes it” include manually unchecking one of the two
   defaults, leaving only one checked or none? —
   **Recommendation:** yes; thereafter that exact choice, including zero, is
   never auto-filled in the same session.
4. Should the pencil appear for automatically numbered coalitions? —
   **Recommendation:** no; only custom coalitions have editable membership.
5. Future banner copy: use the user's Russian wording verbatim in ru and a
   literal/meaning-preserving translation in EN/HE; keep strong emphasis on
   the fixed-agenda scope. —
   **Recommendation:** yes; the separate hypothesis was later removed by the
   user's explicit request during `/3-implement`.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /3-implement | Removed the model-card hypothesis paragraph and its three `panel.modelHypothesis` strings | User explicitly requested: “Etu chast nuzhno prosto ubrat iz texta s simuljatora koalicii”; the title and fixed-agenda explanation remain. |
| /3-implement | Expanded the M7-21 enlarge scope from per-tile only to a full-screen coalition-card toggle; removed the compact favourite-only checkbox and “Nearest” button, and amplified the simulator button | User explicitly added this during implementation with the screenshot; “Добавить” remains for refilling tiles one at a time. |
| /3-implement | Full-screen mode expands the whole Coalitions card including the “Rules: who will not sit together” block and centres both within a bounded, top-aligned surface | User clarified after viewing the large screen that the rules must enter the expanded view and the upper area needs better use. |
| /4-close | Actual test files are `tests/ui/coalitionHierarchy.test.tsx` and `tests/e2e/coalitionHierarchy.spec.ts`; opening-path compatibility also touched `scripts/buildHosted.mjs`, `tests/e2e/helpers.ts`, `tests/e2e/startExamples.spec.ts`, `tests/e2e/hosted.spec.ts` and `tests/e2e/interaction.spec.ts`; `panel.spec.ts` updated tile-refill expectations | The new M7-21 tests use descriptive dedicated files; the helper/build edits preserve the already-approved M7-20 change that the 8-party path has no direct-to-coalitions start button. |
