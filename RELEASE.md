# Release Guide

## Versioning

Current target: `v0.0.0`.

## Pre-Release Checklist

1. `npm run lint`
2. `npm run test:local`
3. `mkdocs build --strict`
4. Confirm Apps Script integration workflow status.

## Apps Script Publish (clasp)

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
clasp version "v0.0.0"
clasp versions
```

Tag release:

```bash
git tag v0.0.0
git push origin v0.0.0
```

## GitHub Release Notes

Include:

- Script ID
- Apps Script version number created by `clasp version`
- Breaking changes summary
- Docs URL
