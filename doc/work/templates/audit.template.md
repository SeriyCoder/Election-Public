# Audit — <YYYY-MM-DD>

## Backlog Drift

Ticked items without code, code without items, stale in-progress items.

## Documentation Drift

Spec vs code; project brief repository map vs folders.

## Working-Folder Hygiene

Stray files in `active/`, STATUS matching reality, unarchived closed items.

## Decision Coverage

Lasting decisions without an ADR.

## Seat-Calculation Correctness Coverage

Engine modules missing the mandatory test category; arithmetic outside
`src/engine/`; float or locale-dependent decisions.

## Convention Compliance

Layering, forbidden patterns, contour files consistent with each other.

## Findings

| # | Severity | Finding | Location | Backlog item |
| --- | --- | --- | --- | --- |

Severity: **HIGH** — seat-calculation correctness or determinism violated or
untested, or data can be lost. **MEDIUM** — docs contradict code, or a broken
convention that will spread. **LOW** — cosmetic.

## Actions Taken

-
