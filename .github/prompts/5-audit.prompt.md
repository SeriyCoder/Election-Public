---
agent: agent
description: 'Step 5 — audit backlog, docs, working folder and seat-calculation coverage for drift. Never changes source code.'
---

# Step 5 — Audit

Runs at any stage and does not change `stage`.

## Do

1. Copy [audit.template.md](../../doc/work/templates/audit.template.md) to
   `doc/work/audits/<YYYY-MM-DD>-audit.md` and fill every section. If that
   file exists, name it `<YYYY-MM-DD>-audit-<topic>.md`; never overwrite an
   earlier audit.
2. Check the contour files listed in
   [workflow.instructions.md](../instructions/workflow.instructions.md) still
   agree with each other and with STATUS field names. Check STATUS against
   reality: `phase` matches the backlog, every item closed since the Step Log
      was introduced has `memo → tests → implement → idle` rows in it, and archived memos
   are `status: closed` with plans linking to the archive path. Tick open
      `CONTOUR-*` items this audit verified, except ones it created. Confirm a
      `blocked` stage has a documented retry path through `/3-implement`.
3. Check seat-calculation correctness coverage: every engine module has the
   mandatory test category, and no arithmetic exists outside `src/engine/`.
4. Fix documentation drift directly. Record each fix under Actions Taken.
5. File one backlog item per HIGH finding.
6. Set `last_audit` and `updated` in [STATUS.md](../../doc/work/STATUS.md) and
   append a Step Log row (stage unchanged).

## Never

- Change source code or tests.
- Leave a HIGH finding only in the report.

Finish with the handoff block from
[workflow.instructions.md](../instructions/workflow.instructions.md).
