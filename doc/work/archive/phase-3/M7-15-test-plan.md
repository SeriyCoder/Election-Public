# Test Plan — M7-15 Natural compact questionnaire

| Field | Value |
| --- | --- |
| item | M7-15 |
| memo | `doc/work/archive/phase-3/M7-15-memo.md` |
| created | 2026-11-02 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/scalePercents.test.ts` | Vitest | Exact proportional alignment of percent texts to 100 (`scalePercents`): proportion, largest remainder with ties to the lower index, zeros, comma notation, refusals, random determinism |
| `tests/ui/naturalBook.test.tsx` | Vitest | Basic (Israel) catalog order and names, the reference panel without an invented share, ID-mapped statistic, the new page list, one compose page with the even-split assumption, the six-list example compositions by ID, build with exact compositions and unchanged example seats, typed sum/percent errors naming the party, align, compose render in ru/en/he, single-part compact pages for 10 long parties and 8 long groups, unpaged directed strips, plural categories, `formatYears`, timeline header, growth-field notation |
| `tests/e2e/naturalBook.spec.ts` | Playwright (desktop, 1440x900) | Default walk page list, build and exported compositions; compose page error, party turn and align; Basic set with "—" and note; all controls of compact pages inside the window; one-end refusal toggle; ru growth notation on Demographic Future |

## Happy Path

- The default walk goes intro → parties.count → parties.naming → parties.names → people.about → people.mix → people.set → turnout → votes.shares → compose → votes.check → growth → rules.seats → rules.threshold → coalitions → review and builds (`naturalBook.spec.ts` "walks the default book…", `naturalBook.test.tsx` "has no composition choice pages…").
- Every built party carries an exact composition keyed by the seven Basic groups ("builds every party with an exact composition and keeps the example seats").
- A party off 100% keeps the learner on the page with a typed error and the selector on that party; align brings it to exactly 100% ("refuses to leave…", "aligns one party exactly…", e2e "keeps the learner on the compose page…").

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | `naturalBook.test.tsx` "builds every party with an exact composition and keeps the example seats" (seats [31,30,11,14,18,16] sum to 120); the existing allocation property suites stay unchanged and must remain green |
| Determinism: repeated runs, JSON round trip, ru/en/he | Same test asserts identical seats in ru, en and he; `scalePercents.test.ts` "is deterministic over repeated runs and sums to 100 for random inputs" |
| Threshold below / at / above | Not touched: the item does not change threshold code; existing threshold suites cover it |
| Exact remainder tie → tieBreakOrder → party ID | `scalePercents.test.ts` "keeps the sum at exactly 100 by largest remainder, ties to the lower index" (percent alignment ties; seat ties untouched, existing suites) |
| Fixtures from exact inputs | `scalePercents.test.ts` "scales an exact proportion to 100", "reads the comma notation exactly" |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `scalePercents.test.ts` "refuses invalid, negative, empty or all-zero input" |
| Single element | `scalePercents.test.ts` "leaves zeros at zero and an exact 100 unchanged" |
| All values equal | `scalePercents.test.ts` "keeps the sum at exactly 100 by largest remainder…" (three and seven equal values) |
| Maximum size (20 / 30 / 10) | `naturalBook.test.tsx` "keeps every compact page in one part even with ten long parties and eight long groups" and the four following tests (10 parties, 8 groups of 60 characters) |
| No feasible solution | `scalePercents.test.ts` all-zero input returns null; compose sum error is typed ("refuses to leave…") |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Exact pixel look of the compact pages | Covered by the existing Section 14.6 fit walk (`bookFit.spec.ts`, amended in /3-implement) and the before/after screenshots |
| English and Hebrew wording quality | Reviewed as a whole in M3-05 (user decision 2026-10-29) |
| Data tab handling of imported unknown compositions | Out of scope; unchanged existing tests cover it |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-11-02 | `npx tsc --noEmit` | pass | Stubs compile |
| 2026-11-02 | `npx vitest run` | RED: 43 failed / 3096 passed (66 files, 2 failed) | Only the two new files fail (the refusal test and four naturalBook guards of values that must stay already pass against the stubs), each on an assertion of missing behaviour (old catalog order and wording, compose.mode/known pages present, `Unknown questionnaire page compose`, paged parts, stub `scalePercents` null, stub plural `other`, stub `formatYears` without a unit); every existing test passes |
| 2026-11-02 | `npx vite build; npx playwright test tests/e2e/naturalBook.spec.ts` | RED: 5 failed, 5 skipped (phone project, desktop-only by design) | Failures: old page list, 6 instead of 7 set groups, paged turnout rates, no `data-growth` ru value, compose selector missing |
| 2026-11-02 | `npx vitest run` | GREEN: 3139 passed (66 files) | Superseded expectations amended as listed in the memo's Deviations |
| 2026-11-02 | `npm run typecheck; npm run lint` | pass | — |
| 2026-11-02 | `npx vite build` | pass | `dist/elections.html` 459587 bytes (limit 460800) |
| 2026-11-02 | `npx playwright test` | GREEN: 378 passed, 48 skipped | Skips are the existing project-conditional ones (desktop-only fit/motion and naturalBook on phone, phone-only checks on desktop); bookFit passes at all six Section 14.6 sizes |
| 2026-11-02 | /4-close: `npm test; npm run typecheck; npm run lint; npx prettier --check` (changed files); `npm run test:e2e` | GREEN: 3139 passed; types, lint, format clean; 378 browser passed, 48 skipped | Independent re-run; `dist/elections.html` 459587 bytes (limit 460800) |
