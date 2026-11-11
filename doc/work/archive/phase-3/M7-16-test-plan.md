# Test Plan — M7-16 Two ready examples at the start

| Field | Value |
| --- | --- |
| item | M7-16 |
| memo | `doc/work/archive/phase-3/M7-16-memo.md` |
| created | 2026-11-02 |
| state | green |

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/fixtures/new8.json` | — | Byte-identical copy of the user's "New 8 parties.json" (SHA-256 ADE5DA97…C847) |
| `tests/ui/startExamples.test.tsx` | Vitest | Example equality with the file, prefilled pages, edits, 2022 seats, determinism over ru/en/he, store start choices and confirmations, opening-page render |
| `tests/build/compactLocales.test.ts` | Vitest | Russian translation keys absent from the built translation bundle; tables still exact |
| `tests/e2e/startExamples.spec.ts` | Playwright (desktop, phone) | Four starts on the opening page, both examples opened on Coalitions and Demographic Future with the expected seats, prefilled leafing and build |
| `tests/e2e/bookFit.spec.ts` (unchanged) | Playwright (desktop) | The opening page with its cards fits the six Section 14.6 sizes (the walk checks `intro` first) |
| `tests/build/offline.test.ts` (unchanged) | Vitest | File stays at or under 460800 bytes |

## Happy Path

- `startExample('eight')` builds a scenario whose `serializeScenario` equals
  the parsed fixture — "builds exactly the scenario of the user file".
- The same seats, minimal winning coalitions and projected years 1, 10, 50 —
  "gives the same seats, coalitions and futures as importing the file".
- Every page shows the example's values, answered, not suggested, without
  errors — "prefills every questionnaire page with the example values".
- `startExample('israel')`: party mode, Basic groups, seats 31/30/11/14/18/16
  equal to `israelExample` — "builds the party-mode six-list example…".
- Store: "opens an example on Coalitions without changes left over", "leafs
  through an example from its first page, every value prefilled" (then builds
  the file's scenario), "starts an empty book on its first question".
- Opening page: four cards, two modes per example, one navigation skip, no
  raw keys, no user names — "offers the four starts in ru/en/he".
- Browser: "opens the eight/israel example on Coalitions and Demographic
  Future", "leafs through the eight-party example with every value prefilled".

## Seat-Calculation Correctness (mandatory when the engine is touched)

The engine is not touched; the examples feed it, so equality with the imported
file is the correctness check.

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | "gives the same seats…" (sum 120); engine suite unchanged |
| Determinism: repeated runs, JSON round trip, ru/en/he | "%s builds the same input on every call", "%s opens the same scenario in every interface language" |
| Threshold below / at / above | Not new: unchanged engine suite; the example's 3.25% equals the file |
| Exact remainder tie → tieBreakOrder → party ID | Canonical serialisation equality includes `tieBreakOrder` |
| Fixtures from exact inputs | `tests/fixtures/new8.json` exact canonical equality; 2022 seats fixture |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Answers already given before choosing an example | "asks before an example replaces given answers, and can cancel" |
| Changed editor scenario before opening an example | "asks before an example replaces a changed scenario" |
| Fresh start after an example | "asks before a fresh start drops given answers" |
| Edited example value | "rebuilds with an edited value and changes only that value" |
| Names with trailing spaces | "keeps the user names exactly, trailing spaces included" |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Import on the opening page | Out of scope (memo) |
| Wording of en/he strings | M3-05 |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-11-02 | `npx vitest run` | 21 failed, 3142 passed | RED as intended: 20 in `startExamples.test.tsx` (stub `startExample` throws "not implemented", `startBook` is a no-op, no start cards), 1 in `compactLocales.test.ts` (key text `app.title` still in the bundle) |
| 2026-11-02 | `npx vite build; npx playwright test tests/e2e/startExamples.spec.ts` | 8 failed (4 desktop, 4 phone) | RED as intended: no `[data-start-card]`, `[data-start]` or `start-skip` controls on the opening page; HTML 459,6 kB before the change |
| 2026-11-02 | `npx vitest run` | 3163 passed | GREEN after implement; two test defects fixed (see memo Deviations) |
| 2026-11-02 | `npm run typecheck; npm run lint; npx prettier --check <changed files>` | clean | — |
| 2026-11-02 | `npm run build; npm run test:e2e` | 386 passed, 48 skipped | GREEN; the six §14.6 fit checks include the new opening page; HTML 451,268 bytes |
| 2026-11-02 | /4-close: `npm test; npm run typecheck; npm run lint; npx prettier --check <changed files>; npm run build; npm run test:e2e` | 3163 passed; clean; 386 passed, 48 skipped | Independent close gates green; HTML 451,268 bytes |
