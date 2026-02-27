# Contributing

## Branching

- Use `feature/` branch prefixes for implementation branches.
- Keep PRs focused by scope (API/security, correctness, tests/CI, docs, release).

## Quality Gates

Before opening a PR:

1. `npm run lint`
2. `npm run test:local:coverage`
3. `mkdocs build --strict` (for docs changes)

## Code Standards

- Keep public APIs under the `AST` namespace.
- Do not introduce dynamic code execution (for example, `eval`, `new Function`).
- Prefer explicit validation for public request objects.
- Keep Apps Script service usage least-privilege and documented.

## Naming Convention (Top-Level Functions)

- Public top-level functions must be explicitly exposed:
  - via `AST` bindings in `apps_script_tools/AST.js`, or
  - via explicit global assignment (`this.<name> = ...` / `globalThis.<name> = ...`).
- Internal-only top-level functions must be clearly marked with one of:
  - prefix `ast` (for example `astResolveCacheConfig`)
  - prefix `__ast` (private test/debug hooks)
  - suffix `_` (entrypoint/helpers intentionally scoped as internal scripts)
- Non-compliant top-level function names are blocked by `npm run lint` (no legacy exceptions).

## Test Expectations

- Add regression tests for every bug fix.
- Add local tests for pure logic.
- Keep Apps Script runtime tests in `apps_script_tools/testing` for integration behavior.

## Commit Guidelines

- Use clear, descriptive commit messages.
- Do not bundle unrelated refactors with behavior changes.
