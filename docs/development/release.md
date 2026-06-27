# Release

## Versioning

- Use semantic tags: `vMAJOR.MINOR.PATCH`.
- Record release notes in both GitHub Release and `CHANGELOG.md`.

## Current state

- Published release: `v0.0.4`
- Next release target on `master`: `v0.0.5` (unreleased)
- Release-note source of truth is `CHANGELOG.md`.
- Keep README and docs home focused on current unreleased-line highlights; avoid duplicating past release bullet lists there.

## Pre-release checks

```bash
npm run lint
npm run test:local:coverage
npm run test:perf:check
npm run test:security
npm run check:cookbooks
mkdocs build --strict
```

Apps Script runtime validation:

```bash
clasp status
npm run check:clasp:production
GAS_PRODUCTION_SCRIPT_ID=<production_script_id> GAS_TEST_SCRIPT_ID=<test_script_id> npm run clasp:test-push
clasp run runAllTests
clasp run runPerformanceBenchmarks
clasp run runAiLiveSmoke --params '[\"openai\",\"Reply with OK\",\"\"]' # optional
clasp run seedGitHubLiveSmokeToken --params '[\"<github_token>\"]' # optional one-time setup for live smoke
clasp run runGitHubLiveSmokeForRepo --params '[\"octocat\",\"hello-world\"]' # optional (requires `GITHUB_TOKEN` script property)
```

Core library vs cookbook projects:

- Core library release uses repository root `.clasp.json` (local), root `.claspignore`, and `rootDir=apps_script_tools`.
- Production pushes use `.claspignore` and exclude `apps_script_tools/testing/**`; remote runtime tests use a separate test Apps Script project plus `.claspignore.test` through `npm run clasp:test-push`.
- `npm run clasp:test-push` refuses to run unless local `.clasp.json` is bound to `GAS_TEST_SCRIPT_ID` and distinct from `GAS_PRODUCTION_SCRIPT_ID`/`GAS_SCRIPT_ID`; do not point test deployment commands at the production library script ID.
- Cookbook apps under `cookbooks/` should use their own local `.clasp.json` (`rootDir=src`) and isolated deployment lifecycle.
- Keep cookbook-specific UI/workflow code out of `apps_script_tools/` unless promoting reusable library functionality.

CI workflow config:

- Set repository variable `GAS_SCRIPT_ID` for the production library project and `GAS_TEST_SCRIPT_ID` for GitHub Actions integration/live-smoke workflows.
- Set repository secrets: `CLASP_CLIENT_ID`, `CLASP_CLIENT_SECRET`, `CLASP_REFRESH_TOKEN`.
- Keep `CLASP_*` secrets out of workflow job-level `env`; inject them only into the dedicated clasp-auth step after checkout, Node dependency installation, and clasp installation have finished.
- Keep live-smoke provider tokens scoped to the exact step that needs them; do not expose them to checkout, dependency installation, clasp installation, or unrelated push/test steps.
- Keep the pinned clasp version in `.github/actions/setup-clasp/action.yml` (`clasp-version`) current; bump it intentionally and validate CI before release. The clasp install command must continue to use `--ignore-scripts --no-audit --no-fund`.

Cookbook validation:

```bash
npm run check:cookbooks
```

- Treat `docs/getting-started/cookbooks.md` as the source of truth for the manual cookbook smoke matrix.
- Run every changed cookbook's smoke entrypoint before release.
- For shared module changes, also run the cookbook rows that depend on those modules even if the cookbook itself did not change.
- Keep `cookbooks/README.md` and `docs/getting-started/cookbooks.md` aligned with the published cookbook set.

Documentation freshness checklist:

- `README.md`, [Installation](../getting-started/installation.md), [API Quick Reference](../api/quick-reference.md), and [API Tools](../api/tools.md) must use the same recommended library identifier (`ASTLib`) and local alias (`ASTX`), with custom identifiers called out explicitly.
- [API Quick Reference](../api/quick-reference.md) must match the exported `AST` namespace in `apps_script_tools/AST.js`; `npm run lint` enforces the namespace plus `Cache`, `Jobs`, `Sheets`, and `Utils` public-surface lists.
- [API Tools](../api/tools.md) must include the exported `Sheets` helpers/classes and public `Utils` helper list from `apps_script_tools/AST.js`.
- Jobs docs must describe only supported checkpoint stores; current runtime support is `checkpointStore='properties'`.
- Secrets docs must not print raw secret values in logging examples; use boolean/redacted verification output.

Consumer validation (recommended):

- install library in a clean Apps Script project
- select target library version
- run smoke script covering namespace/utils/dataframe/groupby/series query/storage CRUD

## Publish Apps Script version

```bash
clasp version "vX.Y.Z"
clasp versions
```

Capture the exact Apps Script version number created by `clasp version`.

## Tag and release

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Tag push triggers:

- `.github/workflows/release.yml`
- `.github/workflows/docs.yml`

## Release notes content

Include:

- script ID
- library identifier
- exact mapping: `tag -> Apps Script version number`
- key changes
- migration notes (if any)
- docs URL
- before/after benchmark highlights for major perf releases

## Post-release checks

- verify GitHub release is published for the tag
- verify docs site build/deploy succeeded
- verify consumer install works with released version
