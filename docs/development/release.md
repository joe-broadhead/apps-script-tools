# Release

## Versioning

- Use semantic tags: `vMAJOR.MINOR.PATCH`.
- Record release notes in both GitHub Release and `CHANGELOG.md`.

## Pre-release checks

```bash
npm run lint
npm run test:local
mkdocs build --strict
```

Apps Script runtime validation:

```bash
clasp status
clasp push
clasp run runAllTests
```

Consumer validation (recommended):

- Install library in a clean Apps Script project.
- Select target library version.
- Run smoke script covering namespace, utils, dataframe, groupby, series query.

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

- Script ID
- Library identifier
- Exact mapping: tag -> Apps Script version number
- Key changes
- Migration notes (if any)
- Docs URL

## Post-release checks

- Verify GitHub release is published for the tag.
- Verify docs site build/deploy succeeded.
- Verify consumer install works with released version.
