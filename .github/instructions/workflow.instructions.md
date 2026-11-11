---
applyTo: '**'
description: 'Elections simulator working contour: STATUS first, five-step loop, domain risk, handoff format.'
---

# Workflow

## Start

Read [STATUS.md](../../doc/work/STATUS.md) before answering anything about
project state or next steps, then the active memo if one exists.

## The Loop

| Step | Prompt | Requires stage | Sets stage | Never |
| --- | --- | --- | --- | --- |
| 1 | `/1-memo <ID>` | `idle` | `memo` | Writes code or tests |
| 2 | `/2-tests` | `memo`, memo approved; or `implement` for a documented late regression | `tests` / unchanged | Writes production code |
| 3 | `/3-implement` | `tests` + red plan, or `blocked` | `implement` / `blocked` | Exceeds the memo, weakens a test |
| 4 | `/4-close` | `implement`; gates must pass to close | `idle` / `blocked` | Runs git unasked |
| 5 | `/5-audit` | any | unchanged | Changes source code |

One item at a time. Scope creep becomes a backlog item, never a silent addition.
If an approved memo's untested defect is discovered at `implement`,
`/2-tests` may add its regression without changing the stage. A genuine RED
then makes `/4-close` record `implement → blocked`; `/3-implement` resumes
the item. Do not set a stage by hand or fabricate a failing test.

## STATUS Protocol

[STATUS.md](../../doc/work/STATUS.md) is the single record of where the loop
is. It must be true between any two steps, not only after a close.

- **Read first.** Every step starts by reading STATUS and checking its
  precondition. A failed precondition changes nothing in STATUS.
- **Write last.** Every completed step ends by updating the STATUS fields it
  owns and appending exactly one row to the **Step Log**: date, item, step,
  `stage before → after`, one-line result. A failed gate that changes STATUS
  also requires a row.
- **Never edit STATUS to satisfy a precondition.** If the stage is wrong, run the
  missing step. Setting `stage` to a value the step did not reach is forbidden.
- **Phase.** `/4-close` sets `phase` to `Phase N — <epic> complete` when it ticks
  the last item of an epic; `/1-memo` of the first item of the next epic sets
  `Phase N+1 — <epic>`.
- **Hold.** Only on the user's request, an item at stage `memo` can be put on
  hold: its draft memo moves to `doc/work/on-hold/`, STATUS returns to `idle`
  (`current_item` and `active_memo` set to `—`, `phase` back to the epic still
  in progress) and the Step Log gets a `memo → idle` row quoting the request.
  `/1-memo <ID>` later restores that memo instead of starting from the
  template. An item past `memo` is never put on hold.

## Autonomous Runs

When the user asks to run several items without stopping, that request is the
approval for each memo: quote it, with its date, in the memo's approval note.
Nothing else changes:

- Each step still runs in order as its own step, with its precondition check,
  its STATUS update and its Step Log row, before the next step begins.
- Helper scripts may batch file edits, but never replace a step, skip one or set
  a stage the step did not reach.
- If the user asked for commits, commit once per item, after `/4-close`.

The loop is for behaviour: anything that changes what the engine computes, what
a scenario stores or imports, what the UI presents as a result, or what is
published. Copy edits, translation string fixes and styling are direct changes.

## Domain Risk — Hard Rule

**Seat calculation is correct and deterministic.**

- Identical inputs give identical votes, quotas, seats and coalitions on every
  run, browser and UI locale.
- Every valid allocation sums exactly to `seatCount`.
- Threshold, quota floor, remainder and tie decisions use exact rational
  arithmetic; floating point is for display only, after every decision.
- Electoral arithmetic exists only in `src/engine/`. UI, workers and exports call
  it; they never reimplement it.

A change that weakens any of these is rejected regardless of approval.

## Handoff Block

Every step ends its reply with these five parts, written for someone who has
not read the prompt:

1. **Status** — `was → now`, and what that means.
2. **What happened** — one or two plain sentences.
3. **Where it lives** — links to every artifact touched.
4. **What I need from you** — numbered decisions, each with a recommendation.
5. **Next** — the exact next command and what it does.

If a bare "approved" is not a complete answer, the recommendations are missing.

## Approval Rule

"approved" means: apply every recommendation, record it in the artifact (not
only in chat), advance the stage, and run **exactly one** next step, then hand
off again. A partial approval is not an approval. No approval overrides a gate:
red suite, missing correctness tests, or an unapproved memo.

## Contour Files

These files are the process itself:

- `.github/prompts/1-memo.prompt.md` … `5-audit.prompt.md` — the step logic
- `.github/skills/1-memo/SKILL.md` … `5-audit/SKILL.md` — thin `/` entry points
  for Copilot SDK / CLI chats; they only point at the prompts and must never
  restate step logic
- `.github/instructions/*.instructions.md`
- `.github/copilot-instructions.md`
- `doc/work/README.md`, `doc/work/STATUS.md` field names and table columns
- `doc/work/templates/*.md`

Edit them **directly** — no memo, no tests, no close step. Record each edit as a
`CONTOUR-*` backlog item and a Step Log row; the next `/5-audit` verifies the
contour still holds together and ticks the item. A process cannot validate a
change to itself, so an audit never ticks a contour item it created.

## Conventions

- Never run git unless the user explicitly asks in the current request; then
  commit only after `/4-close` or a contour change. Otherwise suggest commands
  as text.
- Shell: PowerShell 5.1 — chain with `;`, never `&&`.
- Working documents, memos, backlog and specs: English. Chat replies follow the
  user's language.
- Interface language during development (user decision 2026-10-29, after
  M2-19): the user works with and reviews the app in Russian. Every new
  interface string still goes into all three tables in the same change — the
  missing-key test enforces it — and the app still writes no interface text
  into a scenario. English and Hebrew wording is reviewed as a whole in M3-05,
  before publication; do not ask the user to review it per item.
- Working documents live in `doc/work/`; the specification in `doc/spec/`.
