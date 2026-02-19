# Release Guide

## Versioning

Use semantic tags:

- `vMAJOR.MINOR.PATCH`

## Pre-Release Checklist

1. `npm run lint`
2. `npm run test:local`
3. `mkdocs build --strict`
4. `clasp push`
5. `clasp run runAllTests`
6. Validate library from a clean consumer Apps Script project.

## Apps Script Publish (`clasp`)

Use a local `.clasp.json` (not committed):

```json
{
  "scriptId": "1gZ_6DiLeDhh-a4qcezluTFDshw4OEhTXbeD3wthl_UdHEAFkXf6i6Ho_",
  "rootDir": "apps_script_tools"
}
```

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

- Script ID
- Library identifier (`AST`)
- Exact mapping (`vX.Y.Z -> Apps Script version N`)
- Breaking changes and migration guidance
- Docs URL
