# Release

## Versioning

- Use semantic tags: `vMAJOR.MINOR.PATCH`.
- Record release notes in both GitHub Release and `CHANGELOG.md`.

## Current state

- Published release: `v0.0.3`
- Next release target on `master`: `v0.0.4` (unreleased)

`v0.0.4` release scope check:

- RAG module (`AST.RAG`) shipped on `master` with docs and tests.
- Drive-only ingestion support includes txt/pdf/Docs/Slides (+ notes).
- Embedding provider registry supports built-ins and runtime custom providers.
- Storage module (`AST.Storage`) ships unified CRUD for `gcs`, `s3`, and `dbfs`.
- Release-note source of truth is `CHANGELOG.md` (`v0.0.4` section).

## Pre-release checks

```bash
npm run lint
npm run test:local
npm run test:perf:check
mkdocs build --strict
```

Apps Script runtime validation:

```bash
clasp status
clasp push
clasp run runAllTests
clasp run runPerformanceBenchmarks
clasp run runAiLiveSmoke --params '[\"openai\",\"Reply with OK\",\"\"]' # optional
```

Core library vs cookbook projects:

- Core library release uses repository root `.clasp.json` (local), root `.claspignore`, and `rootDir=apps_script_tools`.
- Cookbook apps under `cookbooks/` should use their own local `.clasp.json` (`rootDir=src`) and isolated deployment lifecycle.
- Keep cookbook-specific UI/workflow code out of `apps_script_tools/` unless promoting reusable library functionality.

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
