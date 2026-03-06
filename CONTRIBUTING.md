# Contributing

## Branching

- Use `codex/` branch prefixes for Codex-assisted implementation branches.
- `feature/` prefixes are also acceptable for manual feature branches.
- Keep PRs focused by scope (API/security, correctness, tests/CI, docs, release).

## Quality Gates

Before opening a PR:

1. `npm run lint`
2. `npm run test:local:coverage`
3. `npm run test:perf:check`
4. `npm run test:security`
5. `mkdocs build --strict` (for docs changes)
6. `clasp push && clasp run runAllTests` (when Apps Script credentials are configured)

Coverage threshold defaults enforced by the local coverage runner and CI:

- lines: `88%`
- branches: `86%`
- functions: `72%`
- files: `88%`

Override for local experimentation via:

- `COVERAGE_MIN_LINES`
- `COVERAGE_MIN_BRANCHES`
- `COVERAGE_MIN_FUNCTIONS`
- `COVERAGE_MIN_FILES`
- `COVERAGE_ENFORCE` (`true`/`false`)

## Code Standards

- Keep public APIs under the `AST` namespace.
- Do not introduce dynamic code execution (for example, `eval`, `new Function`).
- Prefer explicit validation for public request objects.
- Keep Apps Script service usage least-privilege and documented.

## Documentation Sync Requirements

When a PR changes public behavior, contracts, defaults, or configuration:

1. Update the relevant API/getting-started docs under `docs/`.
2. Update `docs/api/quick-reference.md` and/or `docs/api/tools.md` when surface area changes.
3. Update `README.md` when top-level module coverage or setup guidance changes.
4. Update `CHANGELOG.md` `v0.0.5 (unreleased)` with user-facing additions/changes/fixes.
5. Update `mkdocs.yml` nav when adding new documentation pages.

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

## Pull Request Checklist

Before requesting review:

- all quality gates pass locally
- docs are updated for any public-surface change
- changelog entry is added/updated under `v0.0.5 (unreleased)`
