# ADR 0001 — Development Toolchain

| Field | Value |
| --- | --- |
| status | accepted |
| date | 2026-10-28 |
| origin | M1-01 ([memo](../work/archive/phase-1/M1-01-memo.md)) |

## Context

The specification (Section 2.1) fixes the language, bundler, UI library and test
runners, but not the package manager, linter, formatter or line-ending policy.
M1-01 had to choose them, and every later item depends on the choice.

## Decision

| Concern | Choice |
| --- | --- |
| Package manager | npm, with `package-lock.json` committed; clean installs use `npm ci` |
| Type checking | TypeScript `strict`, plus `noUncheckedIndexedAccess`, via `npm run typecheck` |
| Engine tests | Vitest in the `node` environment, `tests/**/*.test.ts`, via `npm test` |
| Lint | ESLint flat config with `typescript-eslint` recommended rules, zero warnings, via `npm run lint` |
| Format | Prettier (single quotes, trailing commas), via `npm run format` |
| Offline build | `vite-plugin-singlefile` installed now; the build itself is M2-09 |
| Line endings | LF in the repository, enforced by `.gitattributes`, so Prettier checks pass on Windows checkouts |

## Consequences

- Every loop step uses the same three gates: `npm test`, `npm run typecheck`,
  `npm run lint`.
- Changing the package manager, linter or formatter needs a new ADR that
  supersedes this one.
- All of the above are development dependencies; no runtime dependency was
  added, consistent with the offline single-file requirement.

## Rejected

- pnpm or Yarn: no project need justifies a second package manager.
- Biome instead of ESLint and Prettier: narrower type-aware rule coverage than
  `typescript-eslint` for the engine's strictness needs.
