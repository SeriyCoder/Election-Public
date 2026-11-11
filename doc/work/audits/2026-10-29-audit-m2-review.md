# Audit — 2026-10-29 (after the M2 review fixes)

Second audit of the day. The [first](2026-10-29-audit.md) traced the user's
pasted original specification into M2-11 … M2-18. This one checks that those
items closed cleanly and that nothing drifted while they did.

## Backlog Drift

- M2-11 … M2-18 are ticked, each with code, tests and an archived memo and plan.
  No M2 item is open, so M2 is complete.
- M3 and M4 stay on hold. The M3-01 draft memo is still in
  `doc/work/on-hold/`, `status: draft`, with the hold note and the request to
  re-check GitHub Pages when M3 resumes.
- CONTOUR-08 (hold rule) verified: the "Hold" bullet in
  `workflow.instructions.md`, `/1-memo` Do step 2 restoring from
  `doc/work/on-hold/`, the README note under the diagram and the `on-hold/` row
  in the README files table all agree. Ticked.
- CONTOUR-09 (memo template rule) verified: the comment under "Out of scope" in
  `memo.template.md` requires a backlog item for a deferred specification
  requirement. Ticked.
- CONTOUR-10 created by this audit (finding 2); left for the next audit.

Re-trace of the rows the first audit marked P or N and assigned to M2:

| § | Requirement | Was | Now | Evidence |
| --- | --- | --- | --- | --- |
| 5 | Notes on groups, parties, blocks | P | B | `setEntityNotes` in `src/engine/edit.ts`; spec 5 "As built in M2-13" |
| 5 | Party/block turnout shortcut; block bulk edit | N | B | `turnoutCohorts`, `setCohortTurnout` in `src/engine/edit.ts`; spec 5 "As built in M2-18" |
| 5, 10 | Sliders with number inputs for every rate | P | B | `RateSlider` used for every rate field in `src/ui/Editor.tsx`; spec 10 "As built in M2-12" |
| 6.3 | Majority override visibly identified in results | P | B | `majorityOverridden` in `src/engine/report.ts`; `data-majority-overridden` in `src/ui/Results.tsx` |
| 7 | Larger coalitions and blocked majorities on request | N | B | `largerCoalitions`, `blockedMajorities` in `src/engine/coalitions.ts`; spec 7 "As built in M2-16" |
| 7 | Pivotal-party view with a defined metric | N | B | `pivotalParties` in `src/engine/coalitions.ts`; spec 7 "As built in M2-17" |
| 8 | Four Section 8 presets loadable | P | B | `PRESETS` in `src/ui/presets.ts`; spec 8 "As built in M2-11" |
| 10 | Segmented controls for model selection | P | B | `data-segmented="majority"` and `"mode"` in `src/ui/Editor.tsx` |
| 10, 12 | Chart details dismissible by Escape or outside click | N | B | Escape handling in `src/ui/Results.tsx`; spec 10 "As built in M2-14" |
| 11 | Clear-data action for local storage | P | B | `clearSavedData` in `src/ui/store.ts`, `data-action="clear-data"` in `src/ui/App.tsx`; spec 11 "As built in M2-15" |

Rows assigned to M3 and M4 are unchanged and on hold.

## Documentation Drift

- The specification has an "As built" note for each of M2-11 … M2-18. Its status
  line, revision line, Section 1 paragraph and M2 milestone row said "M2
  reopened"; `/4-close` of M2-18 updated them to "M2 complete, including the
  review fixes".
- Project brief repository map: the engine row named `edit`, `run`, `numeric`,
  `report`, `compare`, `coalitions` and `schema` but not the M1 modules
  `rational`, `votes`, `threshold` and `allocate`; the UI row did not name
  `useStore.ts`. Fixed (finding 1).
- `doc/work/README.md` and `/5-audit` name one audit file per day, but two
  days now have two audits (`2026-10-28-audit-m2.md`, this file). Fixed as a
  contour edit (finding 2, CONTOUR-10).

## Working-Folder Hygiene

- `active/` holds only `.gitkeep`; `on-hold/` holds only the M3-01 draft.
- Every memo in `archive/phase-1/` and `archive/phase-2/` is `status: closed`
  with its Definition of Done ticked; every plan is `state: green` and links to
  its archived memo.
- The Step Log has `/1-memo`, `/2-tests`, `/3-implement` and `/4-close` rows
  for each of M2-11 … M2-18.
- STATUS: `stage: idle`, `current_item: —`, `active_memo: —`, `phase`
  "Phase 2 — M2 first usable release complete", which matches the backlog.

## Decision Coverage

- No new lasting decision. The M2-11 … M2-18 memos record their design choices
  and deviations; none changes the toolchain, the data contract version or the
  layering, so no ADR is proposed.

## Seat-Calculation Correctness Coverage

- Every `src/engine/` module has a test file in `tests/engine/`: `allocate`,
  `coalitions`, `compare`, `edit`, `numeric`, `rational`, `report`, `run`,
  `schema`, `threshold`, `votes`, plus the Section 8 `fixtures` suite.
- M2-16 and M2-17 added coalition engine functions with exhaustive-enumeration
  checks on small fixtures. M2-18 added draft edits only, with tests that the
  shortcut gives the same seats as editing the group directly.
- No `parseFloat`, `parseInt`, `toFixed`, `Math.` or `Number(` in `src/ui/`,
  `src/i18n/` or `src/main.tsx`; `Intl` appears only in `src/i18n/format.ts`,
  the one place allowed to format numbers. The source-ban tests enforce this.
- Gates at the M2-18 close: 1272 unit tests; typecheck, lint and Prettier
  clean; e2e 100 passed / 14 skipped.

## Convention Compliance

- Layering holds: the new UI code calls engine edits and never computes turnout,
  votes or seats itself.
- Contour files agree with each other and with the STATUS field names
  (`phase`, `current_item`, `stage`, `active_memo`, `last_audit`, `updated`,
  `contour_size`).
- Skill entry points still only point at their prompts.

## Findings

| # | Severity | Finding | Location | Backlog item |
| --- | --- | --- | --- | --- |
| 1 | LOW | Repository map left out four M1 engine modules and `useStore.ts` | `.github/copilot-instructions.md` | Fixed directly |
| 2 | LOW | One-audit-per-day file name has no rule for a second audit on the same day | `doc/work/README.md`, `.github/prompts/5-audit.prompt.md` | CONTOUR-10 |

Severity: **HIGH** — seat-calculation correctness or determinism violated or
untested, or data can be lost. **MEDIUM** — docs contradict code, or a broken
convention that will spread. **LOW** — cosmetic.

No HIGH findings.

## Actions Taken

- Ticked CONTOUR-08 and CONTOUR-09 after verifying them.
- Project brief: the engine row now names `rational.ts`, `votes.ts`,
  `threshold.ts` and `allocate.ts`; the UI row names `useStore.ts`.
- Contour edit: `/5-audit` step 1 and the README files table name a second
  same-day audit `<YYYY-MM-DD>-audit-<topic>.md`. Filed as CONTOUR-10, with a
  Step Log row.
- STATUS: `last_audit` and `updated` set to 2026-10-29; Step Log row appended.
