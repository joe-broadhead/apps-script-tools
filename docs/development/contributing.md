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
npm run verify:release
```

For inner-loop work, `npm test` runs the fast local gate only (`lint` + local Node tests). It does not enforce coverage, security, docs, or perf thresholds.

Dependency policy:

- Commit `package-lock.json` with any npm dependency changes.
- CI installs with `npm ci --ignore-scripts`; missing lockfiles fail the shared Node setup action.
- `npm run test:dependencies` runs the lockfile-backed high-severity production dependency audit.

Apps Script integration checks when credentials are configured:

```bash
npm run check:clasp:production
GAS_PRODUCTION_SCRIPT_ID=<production_script_id> GAS_TEST_SCRIPT_ID=<test_script_id> npm run clasp:test-push
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
