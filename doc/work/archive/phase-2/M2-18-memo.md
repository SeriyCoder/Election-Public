# Memo — M2-18 Turnout Shortcut For Parties And Blocks

| Field | Value |
| --- | --- |
| item | M2-18 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release, reopened for review fixes |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-29 |
| closed | 2026-10-29 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

Section 5 makes group turnout the canonical value, but allows "an optional
party/block turnout shortcut … only where a dedicated cohort mapping is
unambiguous", requires that shared cohorts "show the underlying groups instead
of a misleading party-level turnout", and that "a block-level bulk edit
identifies the affected cohorts and never applies twice". Today turnout can be
changed only inside each group's panel. A user who thinks in parties ("what if
Party 3's voters stay home?") must first work out which groups vote for that
party, and nothing tells them when a party's voters come from a group that also
votes for other parties.

## Scope

**In scope**

- **Feeding groups.** A group feeds a party when the party is one of its
  allowed destinations and its stored weight for that party is not exactly
  zero. A weight that cannot be read counts as feeding, so an unreadable draft
  withholds the shortcut instead of offering a wrong one.
- **Cohorts of a target.** The target is one party, or every party of one
  block. Its cohorts are the groups feeding any of its parties, in group order,
  each listed once. A cohort is **dedicated** when every party it feeds belongs
  to the target, and **shared** when it also feeds a party outside it.
- **Shortcut.** When the target has exactly one cohort and that cohort is
  dedicated, the party or block row offers that group's turnout as a field and
  slider, labelled with the group's name. It writes the group's own turnout, so
  the group panel shows the same value at once.
- **Bulk edit.** Otherwise, when the target has at least one dedicated cohort,
  the row lists the dedicated cohorts with their turnouts under "this edit
  changes", takes one new turnout, and on an explicit button sets it on each
  listed group once.
- **Shared cohorts shown, not changed.** Shared cohorts are listed with their
  turnouts and the reason they are not changed: they also vote for another
  party (party row) or outside the block (block row).
- **No cohort.** A target no group feeds says so in one sentence.
- Russian, English and Hebrew text; names isolated; percentages left to right.

**Out of scope**

- Relative bulk edits ("lower by 10 points", "scale by 0.9"): the edit sets one
  absolute turnout, which is what makes applying it twice harmless. No backlog
  item needed.
- Bulk edits of the valid-ballot rate or the participation factor: Section 5
  names turnout only. No backlog item needed.
- A derived party or block turnout figure in the results: it would be a result,
  not an input, and the summary already reports overall turnout against the
  full electorate (Section 6.1). No backlog item needed.
- Changing shared cohorts from a party or block row: that would change another
  party's or block's votes from a control that names only this one.

## Approach

**Engine (Section 5).** Two pure functions in the draft editing module.

The first takes a draft, a kind (party or block) and an ID, and returns the
dedicated and shared cohort IDs, each in group order. It reads allowed
destinations and weights only. Zero is tested exactly through the existing
decimal parser; dangling party IDs in a group are ignored. For a block, the
target is every party whose block is that block; a block with no parties has no
cohorts.

The second takes a draft, a list of group IDs and a percent text, and sets that
turnout on each listed group once. Repeated IDs are applied once. It refuses,
with a new edit error, text that is not a percent from 0 to 100, and an unknown
group ID refuses as elsewhere. The value is stored as the exact fraction the
group field would store. Because the edit is absolute, applying it again gives
the same draft.

**View.** Each party row and each block row gains a collapsed "Turnout"
disclosure next to the notes disclosure, in the same style, so rows keep their
height until opened. Inside it, in this order:

- the shortcut field and slider, when the single-dedicated-cohort case holds;
  they write through the same group edit as the group panel;
- otherwise the "this edit changes" list, a percent field and a button "Set
  turnout of the listed groups"; the button stays disabled until the engine
  accepts the text;
- the shared cohort list with its reason;
- or the no-cohort sentence.

Each listed group shows its name and current turnout, read from the draft as
the group field shows it. The disclosure recomputes from the current draft, so
renaming a group, changing a weight or moving a party to another block updates
it with no stored state. The typed bulk value is local editing state, like the
rebalance locks, and is not saved in the scenario.

**Presets (Section 8).**

- **Baseline:** every party and every block has one dedicated cohort, so every
  row offers the shortcut.
- **Split:** Party 1 and Party 2 show a dedicated group, plus Group 3 as
  shared. Party 3's only cohort is Group 3, which is shared, so it gets no
  shortcut.
- **Multi-party block:** Block 1 has one dedicated cohort, Group 1, which feeds
  both Party 1 and Party 5. Block 1's row therefore offers the shortcut for
  Group 1. Party 1's and Party 5's rows show Group 1 as shared.

**Rejected alternative:** a party-level turnout that scales every feeding group
proportionally. It changes groups that also vote elsewhere, compounds when
applied twice, and presents exactly the misleading party-level figure the
specification rules out.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario | None; the edit writes the existing group `turnout` | None |
| Editing state | Typed bulk turnout per party or block row, not saved | None |

## Interface Delta

- `src/engine/edit.ts`: `turnoutCohorts(draft, kind, id)` returning
  `TurnoutCohorts` (`dedicated`, `shared`: group IDs);
  `setCohortTurnout(draft, groupIds, percentText)`; new edit error code
  `invalid-turnout`.
- `src/ui/Editor.tsx`: in party and block rows,
  `details.entity__turnout[data-turnout]`. Inside it:
  - shortcut field `[data-turnout-field]` and slider `[data-turnout-slider]`;
  - lists `ul[data-cohorts="dedicated"]` and `ul[data-cohorts="shared"]` with
    rows `li[data-cohort="<group id>"]`;
  - bulk field `[data-turnout-bulk]` and button
    `[data-action="set-cohort-turnout"]`;
  - empty sentence `[data-empty="turnout"]`.
- i18n in ru, en, he: new `turnout.shortcut`, `turnout.of` (with the group
  name), `turnout.changes`, `turnout.sharedParty`, `turnout.sharedBlock`,
  `turnout.value`, `turnout.apply`, `turnout.noneParty`, `turnout.noneBlock`.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None directly: the edit writes group turnout, which reaches votes only through the existing Section 6.1 path |
| Where exact rationals are required | The exact-zero weight test and the 0–100% range check use the existing decimal parser; the stored turnout is the exact fraction the group field stores |
| Ordering / tie rules relied on | Cohort lists follow persisted group order; no ties |
| Any display rounding near a decision? | No; turnouts in the lists use the same exact percent text as the group field |
| How determinism across runs, round trip and locale is proven | Engine tests: a bulk edit equals the same per-group edits, applying it twice equals once, and seats after the shortcut equal seats after editing the group directly on the Section 8 baseline; export and re-import keeps the turnout; locales change labels only |

## Files

| Path | Change |
| --- | --- |
| `src/engine/edit.ts` | `turnoutCohorts`, `TurnoutCohorts`, `setCohortTurnout`, `invalid-turnout` |
| `src/ui/Editor.tsx` | Turnout disclosure in party and block rows |
| `src/ui/styles.css` | Disclosure and cohort list layout, matching the notes disclosure |
| `src/i18n/en.ts`, `ru.ts`, `he.ts` | Nine new keys |
| `tests/engine/edit.test.ts` | Feeding rule, exact zero, unreadable weight, dedicated and shared, blocks, presets, bulk edit, refusals, applied once, idempotent, same seats as a direct group edit |
| `tests/ui/editor.test.tsx` | Shortcut, bulk, shared and empty states; the button names nothing but the listed groups; live update after a weight edit; inert names; every locale |
| `src/ui/store.ts` | `setCohortTurnout(kind, id, percentText)`: recomputes the dedicated cohorts from the current draft and applies the engine edit; false on refusal, input unchanged |
| `tests/ui/store.test.ts` | Store bulk edit for a block and a party; applied twice gives an equal input; refusals keep the same input object |
| `tests/e2e/interaction.spec.ts` | Baseline: the Party 3 shortcut changes Group 3 turnout and the seats; split: the Block 1 bulk edit sets Group 1 and leaves the shared Group 3 unchanged |
| `doc/spec/elections-simulator.md` | "As built in M2-18" note in Section 5 (at close) |
| `.github/copilot-instructions.md` | Engine and UI module descriptions (at close) |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Does a group with a zero weight for a party count as voting for it? —
   **Decision:** no. Votes flow only through a weight above zero; a newly
   ticked destination starts at zero, and should not hide a shortcut that is
   still exact.
2. Does a block edit change groups that also vote outside the block? —
   **Decision:** no. They are listed with the reason. Changing them would
   change another block's votes from a control that names only this block.
3. Do parties get the bulk edit too, when several groups vote only for them? —
   **Decision:** yes, with the same rules as blocks. One component and one
   rule set; a party with two dedicated groups of different turnout has no
   single turnout to show.
4. Where does it live? — **Decision:** a collapsed "Turnout" disclosure in the
   party and block rows, beside the notes. The shortcut is found where the
   user looks for the party, and rows stay compact on a phone.
5. Live field or explicit button? — **Decision:** live field for the single
   dedicated group, which is the group's own value under another label; an
   explicit button for the bulk edit, which writes several groups.

Approved 2026-10-29 on the user's instruction: "vse eto nado s integriroval i realizovat".

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | Cohort lists are `div[role="list"][data-cohorts]` with rows `div[role="listitem"][data-cohort]`, not `ul` and `li` | Party and block rows are themselves `li` items of the entity list; the editor tests cut a row at its first closing `li`, and the existing rule that keeps nested list items out of entity rows applies. The ARIA roles keep list semantics |
| /2-tests | New store method `setCohortTurnout(kind, id, percentText)` returning true or false; `src/ui/store.ts` and `tests/ui/store.test.ts` join the Files list | Mirrors `rebalanceWeights`: the store recomputes the dedicated cohorts from the draft at the moment of the click, so the button never writes a stale list, and a refusal leaves the input object unchanged. The typed bulk text stays in component state, as the memo says |
| /3-implement | The turnout disclosure sits after the notes disclosure in each party and block row | The existing notes tests read the first `summary` in a row; placing turnout second keeps them valid and keeps notes in their established place |
| /3-implement | The single-group field shows the group name in `bdi` followed by ", %"; the full `turnout.of` sentence is the aria-label of the field and the slider | Keeps a mixed-script group name isolated from the surrounding RTL or LTR text while screen readers still hear the full label |
| /3-implement | Cohort rows are flex rows with the percent in a non-wrapping `turnout__value` span | A long group name squeezed the percent on a 360 px phone and broke it across lines; the name now wraps on its own |
