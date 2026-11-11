# Test Plan — M2-02 Interface Languages ru/en/he With RTL And A Missing-Key Check

| Field | Value |
| --- | --- |
| item | M2-02 |
| memo | `doc/work/archive/phase-2/M2-02-memo.md` |
| created | 2026-10-28 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/ui/i18n.test.ts` | Vitest (node) | Locales, direction, native names, missing-key check (key sets, empty values, placeholders, untranslated copies), translator, integer formatting |
| `tests/ui/store.test.ts` | Vitest (node) | Language state, storage port (load, ignore unknown, explicit-over-stored, no write until chosen, throwing storage), determinism across languages, narrowed static scan |
| `tests/ui/app.test.tsx` | Vitest with `preact-render-to-string` | `lang`/`dir` on the root, strings per language, untranslated user names, switcher options and pressed state, switcher label |
| `npm run typecheck` | tsc | English and Hebrew tables are complete records over the Russian key type: a missing or extra key fails the type check |

## Happy Path

- The shell renders in Russian by default; switching to English or Hebrew changes text, `lang` and `dir` while the scenario, view and result object stay the same.
- An explicit choice is saved through the storage port and restored on the next store creation.

## Seat-Calculation Correctness (mandatory when the engine is touched)

The engine is not touched. Locale independence of the result is tested.

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Engine suite (unchanged) |
| Determinism: repeated runs, JSON round trip, ru/en/he | `leaves the derived result untouched in every language` (same object and byte-identical serialization in ru, en, he) |
| Threshold below / at / above | Engine suite (unchanged) |
| Exact remainder tie → tieBreakOrder → party ID | Engine suite (unchanged) |
| Fixtures from exact inputs | M2-01 store tests (unchanged); `uses no float parsing or rounding`, `uses no locale APIs outside the integer formatter` |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `ignores the unknown stored value ""` |
| Single element | Not applicable |
| All values equal | Not applicable |
| Maximum size (20 / 30 / 10) | Not applicable; M2-10 |
| No feasible solution | Not applicable |
| Unknown or wrong-case stored language | `ignores the unknown stored value "de"`, `"HE"` |
| Storage unavailable | `survives storage that throws` |
| Non-integer to the formatter | `rejects the non-integer 0.5 / NaN / Infinity` |
| Missing translation | `%s has exactly the reference key set`, type check |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Document element `lang`/`dir` sync and real local storage | Browser-only effects; M2-10 Playwright |
| RTL visual layout | M2-10 Playwright |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | `npm test` | 16 failed / 328 passed | Failures from stubs only: `translator`, `isLocale`, `direction`, `formatInteger`, `setLanguage` not implemented; empty `LOCALES` and `LOCALE_NAMES`; stored language ignored. Per-locale `it.each(LOCALES)` cases (key sets, placeholders, root `lang`/`dir`, switcher) appear once `LOCALES` is filled. The static scan is narrowed by design (memo): locale APIs allowed only in `src/i18n/format.ts` |
| 2026-10-28 | `npm run typecheck`; `npm run lint` | clean | |
| 2026-10-28 | `npm test` | 390 passed | 116 UI tests (per-locale cases now present) plus 274 engine tests |
| 2026-10-28 | `npm run typecheck` with `nav.label` removed from `he.ts` | TS1360 error | Missing-key type check proven, then restored; type check clean |
| 2026-10-28 | `npm run lint`; `prettier --check`; `npm run build` | clean; 44.5 kB single file | Hebrew switch in the built file: RTL layout, translated text, scenario name untouched |
| 2026-10-28 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check` (close gate) | green | 390 tests |
