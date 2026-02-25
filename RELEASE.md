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
8. optional live-provider AI smoke: `clasp run runAiLiveSmoke --params '["openai","Reply with OK",""]'`
9. validate library from a clean consumer Apps Script project

## `v0.0.4` Release Prep Notes

- Confirm `CHANGELOG.md` `v0.0.4 (unreleased)` includes:
  - `AST.RAG` surface and typed error model
  - Drive ingestion coverage (`txt`, `pdf`, Docs, Slides + notes)
  - embedding provider registry and custom provider registration
  - grounding/citation/abstention behavior
  - `AST.Storage` contracts (`list`, `head`, `read`, `write`, `delete`) for `gcs`, `s3`, and `dbfs`
  - `AST.Chat` `ThreadStore` contracts for durable user-scoped thread state
  - breaking note that internal non-`AST` top-level globals are intentionally unstable
- Confirm docs and README release-state messaging is consistent:
  - published is `v0.0.3`
  - `v0.0.4` is unreleased until tag + GitHub release publish
- For release notes, include exact mapping:
  - `v0.0.4 -> Apps Script version N` (from `clasp version` output)

## Apps Script Publish (`clasp`)

Use a local `.clasp.json` (not committed):

```json
{
  "scriptId": "1gZ_6DiLeDhh-a4qcezluTFDshw4OEhTXbeD3wthl_UdHEAFkXf6i6Ho_",
  "rootDir": "apps_script_tools"
}
```

`.claspignore` model:

- for the core library publish flow, root `.claspignore` is authoritative.
- do not add nested `.claspignore` files under `apps_script_tools/`.
- cookbook projects under `cookbooks/` are separate `clasp` workspaces and may include their own local `.claspignore` and `.clasp.json`.
- keep `.clasp.json` local-only (untracked) and use `.clasp.json.example` as the committed template.

Repository guardrails (enforced by `npm run lint`):

- root `.claspignore` must exist.
- `apps_script_tools/.claspignore` must not exist.
- `.clasp.json.example` must remain a valid template with:
  - `"scriptId": "<YOUR_SCRIPT_ID>"`
  - `"rootDir": "apps_script_tools"`
- tracked secret/config files are blocked (`.clasp.json`, `.clasprc.json`, `creds.json`, `client_secret.json`).

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
