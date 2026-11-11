# Test Plan — M3-01 Publication decisions

| Field | Value |
| --- | --- |
| item | M3-01 |
| memo | `doc/work/archive/phase-4/M3-01-memo.md` |
| created | 2026-11-04 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

This item changes documents only, so its tests are document checks (memo Open
Question 5, approved 2026-11-04). No file under `src/`, `tests/` or the build
configuration changes; executable checks for the notice, the preview metadata
and the hosted build belong to M3-02.

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `doc/spec/elections-simulator.md` (Section 2.4) | PowerShell content checks C1–C7 | Recorded decisions D1–D10 and the public text |
| `doc/spec/elections-simulator.md` (Section 13.2) | PowerShell content check C8 | No open "decided in M3-01" wording remains |
| `.github/copilot-instructions.md` | PowerShell content checks C9–C10 | Brief names the address and the publish-only repository |
| `doc/adr/0002-public-preview-hosting.md` | `Test-Path`, C11 | Accepted ADR written after the recorded user approval |

## Happy Path

| Check | Passes when |
| --- | --- |
| C1 | Spec 2.4 contains `https://seriycoder.github.io/elections/` (and the fallback `coalition-sim`) |
| C2 | Spec 2.4 no longer says the host choice "is made in M3-01" |
| C3 | Spec 2.4 says the public repository holds only the built page (plus preview image and README); source stays local |
| C4 | Spec 2.4 records the Hebrew preview card: title, description, `he_IL`, image 1200 × 630 of the "8 parties" Coalitions page with an absolute URL |
| C5 | Spec 2.4 records Hebrew as the first-visit language with Russian and English in the switcher |
| C6 | Spec 2.4 contains the not-a-forecast notice in ru, en and he, always visible in the header area |
| C7 | Spec 2.4 records privacy: no analytics, cookies, trackers, forms or external requests; CSP stays |
| C8 | Spec 13.2 no longer says "Remaining publication decisions … are made in M3-01" or "host chosen in M3-01" |
| C9 | The project brief names `seriycoder.github.io/elections/` |
| C10 | The project brief says the public repository holds only the built page; source stays local |
| C11 | `doc/adr/0002-public-preview-hosting.md` exists with status accepted |

Review check (not scripted): D6 public examples in spec 2.4 match what the
built page ships — the "8 parties (free names)" and "2022 (educational)"
starts, the fresh no-group example and the 2022 historical reference.

## Seat-Calculation Correctness (mandatory when the engine is touched)

Not applicable: the engine, import/export and anything feeding them are not
touched. The existing suite must stay green unchanged.

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Existing suite, unchanged |
| Determinism: repeated runs, JSON round trip, ru/en/he | Existing suite, unchanged |
| Threshold below / at / above | Existing suite, unchanged |
| Exact remainder tie → tieBreakOrder → party ID | Existing suite, unchanged |
| Fixtures from exact inputs | Existing suite, unchanged |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Fallback address when `elections` is taken | C1 (fallback named) |
| Notice text identical in spec and memo | C6 |
| Empty input, single element, equal values, maximum size, no feasible solution | Not applicable: no computation |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| Notice rendering, preview meta tags, hosted `index.html` | M3-02 |
| Live HTTPS link on desktop and phone | M3-03, after the user uploads |
| English and Hebrew wording quality | M3-05 review |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-11-04 | PowerShell checks C1–C11 (`String.Contains` / `-match` on spec 2.4, spec 13.2 and the brief; `Test-Path` for the ADR) | 0 / 11 pass | Red for the intended reason: the decisions were not yet written into the spec, brief or ADR. No syntax or tooling failure |
| 2026-11-05 | PowerShell checks C1–C11 and the D6 review check | 11 / 11 pass; D6 pass | Checked the final spec sections, project brief and accepted ADR; test criteria passed without changing their expected outcomes |
| 2026-11-05 | `npm test` | 69 files, 3184 tests passed | Existing full suite; no engine or UI tests added because the item changes documentation only |
| 2026-11-05 | `npm run typecheck` | Passed | |
| 2026-11-05 | `npm run lint` | Passed | Browser suite not applicable: no source, UI, worker, HTML, style or build configuration changed |
| 2026-11-08 | PowerShell checks C1–C11 and D6 source/consent review | 11 / 11 pass; D6 pass | Compared notice and preview text with the memo. The earlier D6 check verified the example list but missed that the eight-party start reproduces the user's scenario and includes recognizable party names; the user confirmed `keep` for the public example and preview |
| 2026-11-08 | `npm test` | 69 files, 3184 tests passed | Full close gate |
| 2026-11-08 | `npm run typecheck` | Passed | |
| 2026-11-08 | `npm run lint` | Passed | Browser suite not applicable: this item changes documentation only |
