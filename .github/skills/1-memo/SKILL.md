---
name: 1-memo
disable-model-invocation: true
argument-hint: '<ITEM-ID>, e.g. M1-01'
description: 'Step 1 of the Elections contour: write a design memo for one backlog item, no code. Use when the user runs /1-memo <ITEM-ID>.'
---

# 1-memo

This skill is a thin entry point. The step itself is defined once, in
[`.github/prompts/1-memo.prompt.md`](../../prompts/1-memo.prompt.md).

1. Read that prompt file in full.
2. Follow it exactly, including its preconditions, prohibitions and the handoff
   block from `.github/instructions/workflow.instructions.md`.
3. The arguments are the backlog item ID (for example M1-01). If none is given, ask for it.

Do not continue into the next step.