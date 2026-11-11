---
agent: agent
description: 'Step 3 — implement the approved memo until the suite is green. No scope beyond the memo.'
---

# Step 3 — Implement (GREEN)

## Preconditions

[STATUS.md](../../doc/work/STATUS.md) must be either:

- `stage: tests` and the active test plan is `state: red`; or
- `stage: blocked` with the active memo and test plan present. Read the latest
  Step Log entry to identify the blocker before resuming.

Otherwise refuse and name the missing step.

## Do

1. Implement exactly what the memo describes, in the files it lists.
2. Run the full test suite, then the type check, linter and (where it applies)
   browser suite named in
   [typescript.instructions.md](../instructions/typescript.instructions.md).
   Fix until all are green. If a blocker prevents completion, record it in the
   memo and stop before `/4-close`.
3. Record every departure from the memo in its Deviations table, with a reason.
4. File anything discovered outside the memo's scope as a new backlog item. Do
   not tick it and do not implement it.
5. Update the test plan Run Record with the actual results; set `state: green`
   only when all gates pass.
6. Update STATUS: `stage: implement`, `updated`. If still blocked, set
   `stage: blocked` and state the blocker in the memo. Append a Step Log row
   (`tests → implement`, `tests → blocked`, `blocked → implement` or
   `blocked → blocked`).

## Never

- Exceed the memo's scope.
- Weaken, skip, delete or rewrite a test's expectation to make it pass.
- Duplicate electoral arithmetic outside `src/engine/`.

Finish with the handoff block from
[workflow.instructions.md](../instructions/workflow.instructions.md). Do not
continue into `/4-close`.
