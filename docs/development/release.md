# Release

## Versioning

- Use semantic tags: `vMAJOR.MINOR.PATCH`.
- Record release notes in both GitHub Release and `CHANGELOG.md`.

## Current state

- Published release: `v0.0.1`
- Next release target on `master`: `v0.0.2` (release candidate, not tagged yet)

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
```

Consumer validation (recommended):

- install library in a clean Apps Script project
- select target library version
- run smoke script covering namespace/utils/dataframe/groupby/series query

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
