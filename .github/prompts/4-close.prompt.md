---
agent: agent
description: 'Step 4 — gate on a green suite, tick the backlog, sync docs, archive the memo. Runs git only when asked.'
---

# Step 4 — Close

## Preconditions

[STATUS.md](../../doc/work/STATUS.md) `stage` must be `implement`. Otherwise
refuse and name the missing step.

## Do

1. Re-run the full suite, type check, linter and, where it applies, the browser
   suite named in
   [typescript.instructions.md](../instructions/typescript.instructions.md).
   Anything red: record the failed
   gate in the test plan Run Record, set STATUS `stage: blocked` and `updated`,
   append a Step Log row (`implement → blocked`), then report and stop. No
   approval overrides this gate. Resume through `/3-implement`.
2. Compare the memo's Files table with the files actually changed. Explain every
   difference in Deviations.
3. Tick the item in [backlog.md](../../doc/backlog.md). This is the only step
   allowed to tick a product item; `CONTOUR-*` items are ticked by `/5-audit`.
4. Sync documentation from the code: the
   [specification](../../doc/spec/elections-simulator.md) where behaviour was
   clarified, the [project brief](../copilot-instructions.md) repository map
   where folders were added.
5. If the item made a lasting design decision, propose an ADR under
   `doc/adr/` in the handoff; write it only on approval.
6. Set the memo to `status: closed`. Move the memo and test plan to
   `doc/work/archive/phase-<N>/` and rewrite the plan's `memo` link to the
   archived path.
7. Reset STATUS: `current_item: —`, `stage: idle`, `active_memo: —`, `updated`;
   if this was the last unticked item of its epic, set `phase` to
   `Phase N — <epic> complete`. Append a row to the Closed Items Log and a Step
   Log row (`implement → idle`).
8. Print a suggested commit message as plain text. Commit only if the user
   explicitly asked for commits; see
   [workflow.instructions.md](../instructions/workflow.instructions.md).

## Never

- Run git unless the user explicitly asked for commits.
- Close with a red or unrun suite.
- Close from any stage other than `implement`, or set `stage` by hand to pass
  the precondition.

Finish with the handoff block from
[workflow.instructions.md](../instructions/workflow.instructions.md), naming the
next unticked backlog item. Do not start `/1-memo`.
