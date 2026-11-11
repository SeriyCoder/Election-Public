# Test Plan — M7-07 Questionnaire alignment

| Field | Value |
| --- | --- |
| item | M7-07 |
| memo | `doc/work/archive/phase-3/M7-07-memo.md` |
| created | 2026-10-31 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/book.test.ts` | Vitest | No-group, partial, complete and zero-vote-unknown builds; exact turnout, shares, population, rounding and scenario round trip. |
| `tests/ui/bookView.test.tsx` | Vitest | Opening language choices, state-preserving switch, voter/unknown check and unavailable population. |
| `tests/ui/store.test.ts` | Vitest | Hebrew fallback, saved choices, complete/skip/confirmed routes, preserved scenarios and view order. |
| `tests/e2e/book.spec.ts` | Playwright | Offline fresh start, language persistence, real editable coalition controls, keyboard and page state. |
| `tests/e2e/bookFit.spec.ts`, `tests/e2e/helpers.ts`, `tests/e2e/offline.spec.ts` | Playwright | All laptop sizes, long-name and pagination boundaries, explicit legacy baseline and preserved language storage behavior. |
| `tests/ui/app.test.tsx`, `tests/ui/views.test.tsx`, `tests/ui/i18n.test.ts`, `tests/ui/editor.test.tsx`, `tests/ui/results.test.tsx`, `tests/ui/futureCoalitions.test.tsx` | Vitest | Existing locale-specific and legacy scenario assertions with their intended explicit fixtures. |
| `tests/engine/*.test.ts`, existing build and browser suites | Vitest and Playwright | Existing exact arithmetic, legacy semantics, 450 KiB, fit, RTL and offline regression gates. |

## Happy Path

- A new visitor can skip demographics, enter party shares and overall turnout,
  and immediately edit an allocated coalition scenario.
- Selected groups are asked for turnout before party shares. Complete party
  compositions derive exact overall turnout; partial rows preserve an unknown
  portion and do not block coalition results.
- Every exit and confirmed replacement opens Coalitions; the four visible
  views remain in the specified order.
- Language controls appear at the start, preserve the current questionnaire
  and scenario, and respect valid saved choices.

## Seat-Calculation Correctness

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Existing allocation and party-mode property tests; M7-07 build tests sum the resulting seats. |
| Determinism: repeated runs, JSON round trip, ru/en/he | M7-07 build and store locale/round-trip tests plus existing deterministic engine tests. |
| Threshold below / at / above | Existing exact threshold suite and questionnaire 3.25% boundary regression. |
| Exact remainder tie → tieBreakOrder → party ID | Existing Hamilton tie and ordering suite; new questionnaire shares remain exact. |
| Fixtures from exact inputs | M7-07 60% / 40% two-group example, exact overall turnout 10/13, and partial-unknown 40% case. |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty demographic input | M7-07 default no-group path and untouched skip. |
| Single group | Existing electorate one-group suite; no-group and partial questionnaire tests. |
| All values equal | Default four-party example allocates 30 seats each. |
| Maximum size (20 / 30 / 10) | Existing engine and browser performance tests remain unchanged. |
| No feasible solution | Zero overall turnout yields the existing no-valid-votes state. |
| Positive-vote unknown composition | Unknown share is separate; population and linked assumptions remain unavailable. |
| Zero-vote unknown composition | Known positive rows still determine population and turnout without inventing the zero-vote row. |
| Unavailable or invalid storage | Hebrew fallback; an explicit choice remains effective for the visit. |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Actual political preferences of demographic groups | The simulator represents user assumptions, not facts about real voters. |
| Network or hosted deployment | Runtime is offline; publication remains separately gated. |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-31 | `npm run typecheck` | Pass | New tests compile before production changes. |
| 2026-10-31 | `npx vitest run tests\ui\book.test.ts tests\ui\bookView.test.tsx tests\ui\store.test.ts -t M7-07 --reporter=verbose --no-color` | RED: 19 failed, 4 passed | Failures are the missing no-group and optional-composition paths, opening language choices, Hebrew fallback, voter/population labels and coalition-first routes. Existing exact-threshold and complete-composition cases already pass. |
| 2026-10-31 | `npm test -- --reporter=dot --no-color` | RED: 19 failed, 2752 passed | All failures are the new M7-07 assertions; 45 other files pass. |
| 2026-10-31 | `npx playwright test book.spec.ts --project=desktop --grep "M7-07 fresh questionnaire" --reporter=line --timeout=8000 --workers=1` | RED: 3 failed | Untouched skip opens Data, the default is Russian and the opening screen has no language buttons. The existing offline build is unchanged. |
| 2026-10-31 | Playwright attempts with `--no-color` and a backslash-containing path selector | Invocation failed | This Playwright version rejects `--no-color`; the path is interpreted as a regex. The basename selector above runs the tests. |
| 2026-10-31 | `npx playwright test book.spec.ts --project=desktop --grep "labels the untouched\|changes language inside" --reporter=line --timeout=10000 --workers=1` | RED: 2 failed | The example notice lacked an educational label and the confirmation dialog had no active language selector. Both were added before correcting the UI. |
| 2026-10-31 | `npx vitest run tests\ui\book.test.ts tests\ui\store.test.ts -t "wider check table\|parts of the check page" --reporter=verbose --no-color` | RED: 2 failed | Measured long group names needed smaller check-page parts; existing navigation expectations were updated to verify every part. |
| 2026-10-31 | `npx vitest run tests\ui\book.test.ts -t "wider check table" --reporter=dot --no-color` | RED: 1 failed | Eight wide 32-character group names crossed the fit boundary without pagination. The matching browser walk also measured overflow before the fix. |
| 2026-10-31 | `npx playwright test bookFit.spec.ts --project=desktop --reporter=line --workers=1` and the added 32-character boundary walk | Pass | All six laptop sizes at 100% and 125%, long and catalog names, errors, confirmations, drawing motion and the new boundary fit without clipping. A three-locale layout probe also measured the group-set page at 1,024 × 576. |
| 2026-10-31 | `npm test -- --reporter=dot --no-color` | Pass: 2775 tests, 48 files | Includes the in-memory production build and the exact engine and legacy regression suites. |
| 2026-10-31 | `npm run typecheck`; `npm run lint`; `npm run format -- --log-level silent` | Pass | The formatting check preceded the configured formatter; the changed CSS was also formatted explicitly. |
| 2026-10-31 | `npm run test:e2e -- --workers=1 --reporter=line` | Pass: 305 passed, 39 skipped | Fresh offline build; desktop and phone, axe, storage, worker, imports, layout and fit. The additional skip is the new laptop-only boundary check on the phone project. |
| 2026-10-31 | Production-file byte count; UTF-8 and line-ending checks | Pass | `dist/elections.html` is 451,495 bytes against the unchanged 460,800-byte limit. Source and tests are LF; the existing HTML and work artifacts are CRLF; no BOM or replacement characters. |
| 2026-10-31 | `/4-close`: `npm test -- --reporter=dot --no-color` | Pass: 2775 tests, 48 files | Independent full-suite rerun. |
| 2026-10-31 | `/4-close`: Prettier check including changed CSS; `npm run format -- --log-level silent`; `npm run typecheck`; `npm run lint` | Pass | Independent format, type and lint gates; the formatter had no changes to make. |
| 2026-10-31 | `/4-close`: `npm run test:e2e -- --workers=1 --reporter=line` | Pass: 305 passed, 39 skipped | Independent fresh offline build and complete browser rerun; the HTML remains 451,495 bytes, under 460,800 bytes. |
