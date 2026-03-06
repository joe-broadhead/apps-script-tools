# Contributing

This page mirrors the repository contribution contract so contributors can work from the docs site.

Source of truth: [`CONTRIBUTING.md`](https://github.com/joe-broadhead/apps-script-tools/blob/master/CONTRIBUTING.md).

## Branching

- Prefer `codex/` for Codex-assisted feature branches.
- `feature/` is also valid for manual implementation branches.
- Keep each PR scoped to one concern (behavior fix, API expansion, docs sync, CI, release prep).

## Quality gates

Run before opening a PR:

```bash
npm run lint
npm run test:local:coverage
npm run test:perf:check
npm run test:security
mkdocs build --strict
```

Apps Script integration checks when credentials are configured:

```bash
clasp push
clasp run runAllTests
```

## Documentation requirements

If public API behavior changes, update all applicable docs:

- module API docs in `docs/api/`
- quick indexes: `docs/api/quick-reference.md`, `docs/api/tools.md`
- top-level overview in `README.md` when needed
- `CHANGELOG.md` under `v0.0.5 (unreleased)`
- `mkdocs.yml` nav for new pages

## Naming and API conventions

- Public surfaces belong on `AST` namespace bindings.
- Internal top-level helpers must be clearly internal (`ast*`, `__ast*`, or `*_` suffix).
- Public request contracts should validate strictly and emit typed errors.
