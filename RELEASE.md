# Release Guide

## Versioning

Use semantic tags:

- `vMAJOR.MINOR.PATCH`

## Pre-Release Checklist

1. `npm run lint`
2. `npm run test:local`
3. `npm run test:perf:check`
4. `mkdocs build --strict`
5. `clasp push`
6. `clasp run runAllTests`
7. `clasp run runPerformanceBenchmarks`
8. validate library from a clean consumer Apps Script project

## Apps Script Publish (`clasp`)

Use a local `.clasp.json` (not committed):

```json
{
  "scriptId": "1gZ_6DiLeDhh-a4qcezluTFDshw4OEhTXbeD3wthl_UdHEAFkXf6i6Ho_",
  "rootDir": "apps_script_tools"
}
```

`.claspignore` model:

- root `.claspignore` is the only authoritative ignore file for `clasp` operations.
- do not add nested `.claspignore` files under `apps_script_tools/`.

Publish flow:

```bash
clasp status
clasp push
clasp version "vX.Y.Z"
clasp versions
```

Record the Apps Script version created for that tag.

## Tag release

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

## CI release workflows

Tag push matching `v*` triggers:

- `.github/workflows/release.yml` (validation + GitHub release)
- `.github/workflows/docs.yml` (docs deployment)

## GitHub Release Notes

Include:

- script ID
- library identifier (`AST`)
- exact mapping (`vX.Y.Z -> Apps Script version N`)
- key changes and migration guidance
- docs URL
- benchmark highlights for perf-sensitive releases
