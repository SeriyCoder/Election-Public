# Memo — M2-08 JSON Import/Export With Safety Limits

| Field | Value |
| --- | --- |
| item | M2-08 |
| epic | M2 |
| phase | Phase 2 — M2 first usable release |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-28 |
| closed | 2026-10-28 |

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

The only way to get a scenario into the app today is a built-in preset, and the
only way to keep edits is to leave the tab open. Section 2.5 makes versioned
JSON the sharing format, and the Section 12 [M2] check requires that tie
resolution and every input survive export and import and reproduce the results
in a second browser session. The schema module already validates JSON text with
the 2 MiB limit (`parseScenarioJson`), but nothing serialises a scenario,
nothing reads a file, and a rejected file has no place to report its problems.

## Scope

**In scope**

- Export the current valid scenario as a JSON file: deterministic text built
  from the validated scenario, locale-independent, named after the scenario ID.
- Import a JSON file chosen by the user: size check before reading, then
  `parseScenarioJson`; a valid file replaces the current input with the
  validated scenario (unknown fields dropped).
- A rejected import leaves the current input untouched and shows a dismissable
  list of issues (code text and path), capped so that a large broken file
  cannot flood the page.
- Import and Export controls in the toolbar, in all three languages.
- Proof that export → import reproduces inputs, tie order and the seat result
  byte for byte for every preset and the Section 8 fixtures.
- Proof that hostile content stays inert: script-tag names and notes, a
  `__proto__` or `constructor` ID, an oversize file, a future schema version.

**Out of scope**

- HTML snapshot export with baseline and language (M4, Section 2.5).
- CSV result export (M4).
- URL-fragment sharing and local-storage autosave (later; Section 2.5 and 11).
- A paste-JSON text box and multi-scenario files.
- Exporting the saved baseline (decision 1 below).

## Approach

**Serialisation in the schema module (Section 11).** `schema.ts` gains a pure
serialiser for a validated scenario: fixed key order (the order the validator
rebuilds), two-space indentation, a trailing newline. Fractions are already
decimal strings, so the text is exact and locale-independent. Because import
rebuilds the scenario from known fields in the same order, serialise → parse →
serialise is a fixed point, and the seats result serialises identically.

**Import pipeline.** A small UI helper reads the chosen file. It refuses a file
whose size exceeds `LIMITS.jsonBytes` without reading it, and reports a read
failure as its own issue. Text goes to the store, which calls
`parseScenarioJson` (byte limit, JSON parse, validation with count limits
before any calculation). A valid result replaces the input exactly like a
preset load: pending delete, rebalance locks and coalition selection are
cleared, and the baseline is kept. A rejected result keeps the input and stores
the issues for display.

**Download.** The helper builds a Blob, an object URL and a temporary link,
clicks it and revokes the URL. This works from a local `file://` page in
Chromium and Firefox; nothing is fetched and nothing is uploaded.

**Safety (Section 11).** Names and notes are rendered as text by Preact, so a
`</script>` name is inert; the tests prove it through import. Objects are
rebuilt by the validator from known fields only; a party ID such as
`__proto__` is a legal ID and must stay an ordinary own key in vote weights and
pair lists — a test pins this. The displayed issue list is capped at 20 lines
plus a count of the rest.

**View.** Two toolbar controls: Export (a button, disabled while the input is
invalid) and Import (a labelled file input with `accept` set to JSON). The
issue box uses `role="alert"`, names the file problem in the selected
language, shows each issue path in an LTR-isolated code span, and has a
Dismiss button.

**Rejected alternative:** exporting the raw store input, including an invalid
draft — the file might not import again, and the export would then carry
unknown fields and editor-only state instead of the authoritative scenario.

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| Scenario JSON file | New export: the validated scenario, fixed key order, two-space indentation, trailing newline | None; schema version 1 |
| Store state | Adds the last import's issues (or none); UI only, not exported | None |

## Interface Delta

- Engine: `serializeScenario` in `src/engine/schema.ts`.
- Store: `importScenario` (text in; returns whether it loaded),
  `rejectImport` (for size and read failures found before parsing),
  `dismissImport`, and the import issues in state.
- UI: `src/ui/transfer.ts` (file read with a size check; text download);
  toolbar Import and Export controls and the import issue box.
- New message keys for the controls, the issue box and the read failure.

## Seat-Calculation Correctness

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None. Import feeds the existing validator; export prints the validated scenario |
| Where exact rationals are required | Not computed here; every fraction stays a decimal string, so nothing is converted to a float on either side |
| Ordering / tie rules relied on | `tieBreakOrder` and persisted entity order must survive the round trip unchanged; the Section 6.3 tie fixtures are part of the round-trip test |
| Any display rounding near a decision? | No |
| How determinism across runs, round trip and locale is proven | For every preset and Section 8 fixture: serialise, import, serialise again gives identical text; the seats result serialises byte-identically before and after; export text is the same under ru, en and he; a scenario with an exact remainder tie keeps its winner after the round trip |

## Files

| Path | Change |
| --- | --- |
| `src/engine/schema.ts` | `serializeScenario` |
| `src/ui/store.ts` | Import issues state; `importScenario`, `rejectImport`, `dismissImport` |
| `src/ui/transfer.ts` | New: size-checked file read, text download |
| `src/ui/Transfer.tsx` | New: toolbar Import and Export controls, issue box |
| `src/ui/App.tsx` | Renders the transfer controls and the issue box |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/he.ts` | New keys |
| `src/ui/styles.css` | File-input label, issue box |
| `tests/engine/schema.test.ts` | Serialiser, round trip, hostile IDs |
| `tests/ui/store.test.ts` | Import, reject, dismiss, input preserved, baseline kept |
| `tests/ui/transfer.test.ts` | New: size check before reading, read failure, download with fake DOM parts |
| `tests/ui/transfer.test.tsx` | New: controls, disabled export, issue box, cap, escaping, keys |
| `.github/copilot-instructions.md`, `doc/spec/elections-simulator.md` | Brief map; Section 11 note on the export format (at close) |

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

1. Should the JSON export include the saved baseline? — **Decision:**
   no. The scenario file is the Section 11 scenario object only; the baseline
   travels in the M4 HTML snapshot.
2. Does an import keep the saved baseline? — **Decision:** yes, as a
   preset load does (M2-07 decision 3), so a user can import a variant and
   compare it with what they had.
3. May an invalid draft be exported? — **Decision:** no. Export is
   disabled while the input is invalid, so every exported file imports again.
4. What happens to the current input when an import is rejected? —
   **Decision:** nothing; the input, locks and selection stay, and the
   issue box lists up to 20 issues plus a count of the rest.
5. What is the file name? — **Decision:** the scenario ID plus `.json`;
   IDs are already limited to ASCII letters, digits, `_` and `-`.

Approved on the user's standing instruction: "samostoyatelno rzreshaju approve doiti do M3-01".

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /2-tests | The file helper is `src/ui/fileTransfer.ts` (tests in `tests/ui/fileTransfer.test.ts`), not `src/ui/transfer.ts` | On a case-insensitive file system `./Transfer` would resolve to `transfer.ts`; distinct names avoid the clash with `Transfer.tsx` |
| /2-tests | The helper also exports `importFile` and `exportScenario`, and the download takes its browser parts as an argument | Keeps the read → store and store → download paths testable without a DOM |
| /3-implement | `serializeScenario` re-validates its argument and throws on an invalid scenario | Guarantees the fixed key order for any scenario object, not only one built by the validator |
| /3-implement | The browser download target revokes the object URL after one second; the helper calls revoke right after the click | Some browsers start reading the blob after `click` returns |
| /3-implement | The import issue box is a full-width row inside the toolbar | No change to the app grid areas; the box stays next to the controls that caused it |
| /3-implement | Test fix: `does not export the saved baseline` no longer searches for the text `baseline"` | The baseline preset's own ID is `baseline`; the test now changes the input after saving and compares exact text |
