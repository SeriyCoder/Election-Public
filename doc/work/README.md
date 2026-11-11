# Working Folder

The five-step loop turns one backlog item at a time into a reviewed, tested and
documented change.

```
idle --/1-memo--> memo --/2-tests--> tests --/3-implement--> implement --/4-close--> idle
                                                                  |
                                                                  v
                                                  blocked --/3-implement--> implement
```

`/5-audit` runs at any stage and leaves the stage unchanged. On the user's
request a `memo`-stage item can be put on hold (`memo → idle`); see Hold in
[workflow.instructions.md](../../.github/instructions/workflow.instructions.md).

For a documented, previously untested defect already in the approved memo,
`/2-tests` may add a late regression at `implement` without changing the stage.
If it fails for the intended reason, the real `/4-close` gate records
`implement → blocked`; `/3-implement` fixes it before another close. A passing
regression is recorded as passing, not made artificially red.

## Files

| Path | Lifecycle |
| --- | --- |
| `STATUS.md` | Updated by every step; one Step Log row per completed step or failed gate that changes STATUS; field names fixed |
| `active/<ID>-memo.md` | Created by `/1-memo`; `status: draft` → `approved` → `closed` |
| `active/<ID>-test-plan.md` | Created by `/2-tests`; `state: red`, then `green`; a late regression may turn it red again |
| `archive/phase-<N>/` | Memo and plan moved here by `/4-close`; the plan's `memo` link is rewritten to the archive path |
| `on-hold/<ID>-memo.md` | A draft memo parked on the user's request; moved back to `active/` by `/1-memo <ID>` |
| `audits/<YYYY-MM-DD>-audit.md` | One per `/5-audit`; a second audit on the same day adds a short suffix (`<YYYY-MM-DD>-audit-<topic>.md`) and never overwrites the first |
| `templates/` | Copied, never filled in place |

Memo approval is a human gate: answer the open questions (or reply
"approved" to accept the recommendations) before `/2-tests` will run.
In an explicitly requested autonomous run, the user's request can approve each
memo; quote that request in the memo approval note. The approval still must be
recorded before `/2-tests`.

## STATUS

| Field | Meaning | Written by |
| --- | --- | --- |
| `phase` | `Phase N — <epic>`, or `Phase N — <epic> complete` | `/1-memo` (first item of an epic), `/4-close` (last item) |
| `current_item` | Backlog ID in flight, or `—` | `/1-memo`, `/4-close` |
| `stage` | `idle`, `memo`, `tests`, `implement`, `blocked` | Steps 1-4 |
| `active_memo` | Path of the active memo, or `—` | `/1-memo`, `/4-close` |
| `last_audit` | Date of the last `/5-audit`, or `never` | `/5-audit` |
| `updated` | Date of the last step | Every step |
| `contour_size` | `Full` or `Lite` | Contour install |

**Closed Items Log** — one row per closed item, written by `/4-close`.

**Step Log** — one row per completed step or contour change: date, item,
step, `stage before → after`, result. It is the audit trail that proves no
stage was skipped. Also log any failed gate that changes STATUS. A `blocked`
item resumes through `/3-implement` after its blocker is addressed. Rules:
[workflow.instructions.md](../../.github/instructions/workflow.instructions.md).
