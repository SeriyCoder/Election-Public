# Test Plan — M2-08 JSON Import/Export With Safety Limits

| Field | Value |
| --- | --- |
| item | M2-08 |
| memo | `doc/work/archive/phase-2/M2-08-memo.md` |
| created | 2026-10-28 |
| state | green |

<!-- /4-close rewrites `memo` to doc/work/archive/phase-<N>/<ITEM-ID>-memo.md. -->

## Test Files

| Path | Runner | Covers |
| --- | --- | --- |
| `tests/engine/schema.test.ts` | Vitest (node) | `serializeScenario`: validator field order, two-space indentation, one trailing newline, unknown fields dropped, vote weights in allowed party order; round trip for the documented example, Section 8 fixtures and an exact remainder tie; tie winner kept; `__proto__` and `constructor` IDs; script-tag names and notes |
| `tests/ui/store.test.ts` | Vitest (node) | `importScenario` like a preset load with the baseline kept; validated input only; independent copies; rejections keep input, locks, selection and pending delete; full issue list; issues cleared on success; `rejectImport`; `dismissImport`; language independence |
| `tests/ui/fileTransfer.test.ts` | Vitest (node, fake file and fake download parts) | File name; size check before reading, limit edge, read failure; `importFile` into the store; download order (create, click, revoke) and blob type and text; `exportScenario` refuses invalid input, excludes the baseline, is locale-independent; every preset round-trips export → import → export byte for byte with identical seats |
| `tests/ui/transfer.test.tsx` | Vitest (node, render-to-string) | Keys in ru/en/he; export button and labelled JSON file input; export disabled while invalid; issue box with `role="alert"`, message text, LTR path, dismiss, cap of 20 plus a count, escaping; App toolbar wiring, issue box, hostile imported name inert |

## Happy Path

- Export the baseline preset: `baseline.json` holds the validated scenario — `downloads the serialised scenario named after its ID`.
- Export → import → export of every preset gives identical text and identical seats — `round-trips the %s preset through export and import`.
- Importing a valid file replaces the input like a preset load and keeps the saved baseline — `loads valid text like a preset and keeps the baseline`.

## Seat-Calculation Correctness (mandatory when the engine is touched)

| Check | Test name |
| --- | --- |
| Exact seat sum, including odd sizes and property test | Unchanged arithmetic; `keeps the tie-break winner and party order after the round trip` uses an odd seat count (3) and checks 1 + 2 |
| Determinism: repeated runs, JSON round trip, ru/en/he | `%s survives export and import unchanged` (seat result serialised byte-identically); `writes the same text under every language`; `imports the same text to the same input under every language` |
| Threshold below / at / above | Not touched; the round trip covers the Section 8 fixtures, whose threshold is part of the scenario |
| Exact remainder tie → tieBreakOrder → party ID | `keeps the tie-break winner and party order after the round trip` (P2 has the lower tie order and wins the extra seat after import) |
| Fixtures from exact inputs | `the Section 8 baseline survives export and import unchanged`; Group 3 turnout zero; an 18-digit turnout |
| No floats on the way | Fractions stay decimal strings; `prints the validator field order with two-space indentation` compares with the validated scenario text |

## Edge And Degenerate Cases

| Case | Test name |
| --- | --- |
| Empty input | `refuses to export an invalid input`; `rejects malformed JSON and keeps everything else` |
| Single element | `keeps __proto__ and constructor party IDs as ordinary own keys` (one group) |
| All values equal | `an exact remainder tie survives export and import unchanged` |
| Maximum size | `accepts a file of exactly the limit`; `refuses an oversize file without reading it`; `rejects oversize text and keeps everything else` |
| No feasible solution | Not applicable: import does not run the coalition search; a no-allocation scenario is a valid file like any other |
| Rounding edge cases | Not applicable: nothing is rounded; the 18-digit turnout round trip proves no digits are lost |
| Future schema version | `rejects a future schema version and keeps everything else`; `records the validator issues of an invalid file` |
| Unreadable file | `reports a read failure as unreadable`; `records an unreadable file and keeps the input` |
| Many issues | `lists at most 20 issues and counts the rest`; `shows no overflow line at exactly the cap` |
| Hostile content | `carries script-tag names and notes as plain text`; `renders an imported hostile name as inert text`; `escapes a hostile issue path`; `keeps __proto__ and constructor party IDs as ordinary own keys` |

## Deliberately Not Tested

| What | Why |
| --- | --- |
| A real file picker, `File` object and browser download | No DOM in the node runner; the helpers take the browser parts as arguments and are tested with fakes; the browser smoke at implement and M2-10 cover the real path |
| `browserDownloadTarget` | A thin wrapper over `document` and `URL`; exercised by the browser smoke |
| Clicks on Export, Import and Dismiss | Render-to-string has no events; each handler calls a store or helper function tested directly |

## Changed Existing Tests

| Test | Change | Reason |
| --- | --- | --- |
| None | — | New `importIssues` state field defaults to null, so existing state tests are unaffected |
| `tests/ui/fileTransfer.test.ts` — `does not export the saved baseline` (new test, during /3-implement) | Exact-text comparison after changing the input, instead of a substring search | The substring `baseline"` matched the preset's own ID |

## Run Record

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | `npm test` | 59 failed / 944 passed | Failures: `not implemented` from the `serializeScenario`, store import and `fileTransfer` stubs; `Transfer` and `ImportIssues` render nothing; missing message keys. Three new tests pass trivially against the stubs (no issues at start, empty issue box, no box before an import) |
| 2026-10-28 | `npm run typecheck`; `npm run lint` | clean | |
| 2026-10-28 | `npm test` | 1003 passed | All M2-08 tests green after one test fix (see Changed Existing Tests) |
| 2026-10-28 | `npm run typecheck`; `npm run lint`; `prettier --check`; `npm run build` | clean | `dist/index.html` 155.17 kB; browser smoke on `file://`: export gives `baseline.json` from a blob URL ending in a newline; split exported, baseline loaded, split imported with identical seats; a broken file shows the alert box and keeps the input; Dismiss clears it; the file input resets |
| 2026-10-28 | `npm test`; `npm run typecheck`; `npm run lint`; `prettier --check` (close gate) | green | 1003 passed; typecheck, lint, format and build clean |
