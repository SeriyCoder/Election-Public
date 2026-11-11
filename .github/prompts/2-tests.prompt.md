---
agent: agent
description: 'Step 2 — write the test plan and real failing tests for the approved memo. No production code.'
---

# Step 2 — Tests (RED)

## Preconditions

1. The active memo must have `status: approved`. On `draft`, refuse and list the
   unanswered open questions.
2. [STATUS.md](../../doc/work/STATUS.md) `stage` must be either:
   - `memo`, for the normal initial test step; or
   - `implement`, with the existing green test plan and a documented,
     previously untested defect or acceptance case already in the approved
     memo's scope, for the late-regression path below.

## Normal Initial Test Step

1. Copy [test-plan.template.md](../../doc/work/templates/test-plan.template.md)
   to `doc/work/active/<ITEM-ID>-test-plan.md` and fill it.
2. Include the mandatory **seat-calculation correctness** category from
   [tests.instructions.md](../instructions/tests.instructions.md) whenever the
   item touches the engine, import/export or anything that feeds it.
3. Write real tests in the paths the memo names. Minimal stubs or type-only
   exports are allowed so the suite compiles; no behaviour.
4. Run the suite. Confirm the new tests fail for the intended reason, not because
   of syntax or missing tooling. Record the run in the plan, `state: red`.
5. Update STATUS: `stage: tests`, `updated`. Append a Step Log row
   (`memo → tests`).

If the toolchain does not exist yet and the item is the toolchain item, the RED
check is the failing or missing test command itself; record exactly what failed.

## Late-Regression Path

1. Keep the existing test plan and tests. Add focused real regressions for the
   documented, approved memo-scope behavior and list them in the plan. Do not
   add product scope, production code or behavior stubs.
2. Run the new tests and then the suite. Check each failure is caused by the
   intended missing behavior, not syntax, tooling or an unrelated failure.
   Record the actual commands and results. If any regression fails for the
   intended reason, set the plan to `state: red`; if all pass, retain
   `state: green` and document that no defect was reproduced.
3. Update STATUS `updated` and append one Step Log row
   (`implement → implement`); do not change the stage.
4. With a genuine RED, `/4-close` must run its real gate, record
   `implement → blocked` and stop; `/3-implement` then fixes the item. If the
   new cases pass, do not manufacture a failed gate.

## Never

- Implement behaviour to make a test pass.
- Weaken, skip or delete a test.
- Change STATUS to bypass a precondition or replace the existing test plan on
  the late-regression path.

Finish with the handoff block from
[workflow.instructions.md](../instructions/workflow.instructions.md). Do not
continue into `/3-implement`.
