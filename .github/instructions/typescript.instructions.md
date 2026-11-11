---
applyTo: '**/*.{ts,tsx}'
description: 'TypeScript, Vite and Preact layering, forbidden patterns and check commands.'
---

# TypeScript

## Layering

| Path | Contains | May import |
| --- | --- | --- |
| `src/engine/` | Pure electoral arithmetic and schema validation | Only `src/engine/` |
| `src/i18n/` | String tables and locale formatting | Nothing from UI |
| `src/workers/` | Web Worker wrappers for long engine calls | `src/engine/` |
| `src/ui/` | Preact components and state | `src/engine/`, `src/i18n/` |

`src/engine/` has no DOM, no `Date`, no randomness, no global state and no I/O.

## Forbidden

- `number` arithmetic for any electoral decision; use the `rational` module.
- `Math.round` / `toFixed` on values that are later compared or allocated.
- Locale-dependent `sort` (`localeCompare`) in engine ordering.
- `innerHTML`, `dangerouslySetInnerHTML`, `eval`, `new Function`.
- CDN URLs, remote fonts or runtime `fetch` of scenario data.
- `any`; use `unknown` and narrow at the import boundary.

## Checks

These are the gates for `/3-implement` and `/4-close`:

- Tests: `npm test`
- Types: `npm run typecheck`
- Lint: `npm run lint`
- Format: `npm run format`
- Browser: `npm run test:e2e` (builds the offline file, then runs Playwright).
  Required when an item changes `src/ui/`, `src/workers/`, `src/i18n/`,
  `index.html`, styles or build configuration; not part of `npm test`.

TypeScript runs with `strict: true`.
