# Memo — M2-31 Eligible-voter hint

| Field | Value |
| --- | --- |
| item | M2-31 |
| epic | M2 |
| phase | Phase 2 — M2 reopened for review corrections |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-30 |
| closed | 2026-10-30 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

The eligible-voter figures are labelled «Избиратели с правом голоса» in the
editor and «Имеют право голоса» in the results, and a group's size is «Доля
населения, %». The user asked whether these count everyone with the right to
vote, and, on hearing that they do (voters and non-voters alike, Section 6.1),
asked for the answer inside the program: an (i) mark or a hover explanation.
Today nothing on the screen says it, so a reader can take the figure for the
voters who came or for the whole population.

## Scope

**In scope**

- One small (i) button beside the label of each eligible-voter figure: the
  editor's «Избиратели с правом голоса» rule, a group's «Доля населения, %»,
  and «Имеют право голоса» in the results summary, the comparison totals and
  the demographic-future totals.
- Hovering shows the explanation as the button's tooltip; a click, tap, Enter
  or Space opens it as text under the label and a second one closes it.
- Two explanations in ru, en and he: the total (everyone with the right to
  vote, voters and non-voters; turnout says how many of them vote) and a
  group's share (the group's part of everyone with the right to vote,
  including those who will not vote).

**Out of scope** (at least two)

- Hints on other fields (turnout, growth, thresholds). The user asked about
  the eligible-voter figure; other hints can be filed when a review asks.
- The questionnaire. Its turnout lesson already explains that the people who
  do not vote stay in the group (Section 14.5).
- The demographic-future groups column «Численность» and the year-0 / year-k
  header pairs it shares with turnout; it is a projected count per group, and
  a hint there needs its own wording.
- Renaming «Доля населения, %». The label stays; the hint explains it.

## Approach

A new `src/ui/Hint.tsx` component renders a `button` (type button, class
`hint`, text «i» hidden from assistive technology) with:

- an accessible name «Пояснение: {label}» from a new `hint.open` key, so a
  screen reader says which figure it explains;
- the explanation in its `title`, which desktop browsers show on hover;
- `aria-expanded` and `aria-controls`; when expanded, a text span with the
  explanation follows the button, and Escape closes it. The open state is the
  component's own and is not stored.

The button sits inside the label text of each place listed above. The editor
rule field «Избиратели с правом голоса» is wrapped in a `label` today; a
button inside a label becomes the label's control, so this one field changes
to the same `div` wrapper the group fields use (its input keeps its
accessible name from the existing `label` attribute). Section 10's
accessibility rules apply: a 24 px target at least, a visible focus ring, and
the axe checks of the browser suite.

**Rejected alternative:** a native `details` disclosure. It needs no state, but
it is flow content and cannot sit inside a label text span or a `dt` heading
line without breaking the markup, and it gives no hover tooltip.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| — | None; the hint is interface text | None |

## Interface Delta

- New component `Hint` in `src/ui/Hint.tsx` (props: the explanation, the
  label it explains, a key used for `data-hint` and the text's id).
- Editor rules page: the «Избиратели с правом голоса» field gets a hint
  (`data-hint="population"`) and becomes a `div` field. Group page: «Доля
  населения, %» gets a hint (`data-hint="populationShare"`).
- Results summary, comparison totals and demographic-future totals: the
  «Имеют право голоса» row label gets a hint (`data-hint="population"`).
- New i18n keys in ru, en and he: `hint.open`, `hint.population`,
  `hint.populationShare`.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None |
| Where exact rationals are required | Not applicable |
| Ordering / tie rules relied on | None |
| Any display rounding near a decision? | No |
| How determinism across runs, round trip and locale is proven | Existing suites; the item adds text and a button only |

Not affected: the item adds an explanation beside labels and changes no input,
calculation or stored value.

## Files

| Path | Change |
| --- | --- |
| `src/ui/Hint.tsx` | New: the (i) button and its text |
| `src/ui/Editor.tsx` | Hint on the population rule (wrapper `div`) and on a group's population share |
| `src/ui/Results.tsx` | Hint on the summary's «Имеют право голоса» |
| `src/ui/Compare.tsx` | Hint on the totals row «Имеют право голоса» |
| `src/ui/Future.tsx` | Hint on the totals row «Имеют право голоса» |
| `src/ui/styles.css` | The (i) button, its focus ring and the opened text |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | `hint.open`, `hint.population`, `hint.populationShare` |
| `tests/ui/hint.test.tsx` | New: the button's markup in every place and locale, texts and keys |
| `tests/e2e/hint.spec.ts` | New: hover title, click and tap open and close, Escape, accessibility |
| `doc/spec/elections-simulator.md` | At close: Section 6.1 and Section 10 notes |
| `.github/copilot-instructions.md` | At close: `Hint.tsx` in the map |
| `doc/backlog.md`, `doc/work/STATUS.md` | Loop bookkeeping |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Hover, click or both? — **Recommendation:** both: the tooltip for a mouse,
   the click or tap for a phone and the keyboard, where hover does not exist.
2. Where does the opened text appear? — **Recommendation:** under the label,
   in the page's flow, not as a floating bubble that a phone screen would cut.
3. Which wording? — **Recommendation:** total: «Все, у кого есть право голоса:
   и те, кто придёт голосовать, и те, кто не придёт. Сколько из них
   проголосует, задаёт явка групп.»; group share: «Часть группы среди всех, у
   кого есть право голоса, включая тех, кто не придёт голосовать.»
4. Can several hints be open at once? — **Recommendation:** yes; each is
   independent and closes on its own button or Escape.

Approved 2026-10-30 on the user's request: "Eto trebuet comment pojasnenie v
samoi programme , tipo znachka (i) ili pri hover mouse" (2026-10-30), in
autopilot mode; the recommendations above are the decisions.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | The opened text element is always rendered and carries `hidden` while closed, rather than appearing only when expanded | `aria-controls` must always name an element that exists (axe `aria-valid-attr-value`); what the reader sees is unchanged |
| /3-implement | The text's id comes from Preact's `useId` (prefixed `hint-`), not from the `data-hint` key; `Hint` takes `kind`, `label`, `text` and `t` | The rule and the results summary both explain `population` on one page; a key-based id would repeat |
| /3-implement | The totals row header is a shared `TotalHeader` exported from `src/ui/Compare.tsx` and reused by `src/ui/Future.tsx` | Both tables already share `Section` and the cell helpers from `Compare.tsx`; one header keeps the hint in one place. Both files are in the memo's list |
| /3-implement | On a phone (under 768 px) the button is 44 x 44 px; on a wider screen 24 x 24 px around a 20 px circle | The existing phone check of `tests/e2e/a11y.spec.ts` requires 44 x 44 for every control (Section 10); the memo's 24 px is the desktop minimum |
