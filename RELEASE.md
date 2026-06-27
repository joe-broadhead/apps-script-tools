# Release Guide

## Versioning

Use semantic tags:

- `vMAJOR.MINOR.PATCH`

## Pre-Release Checklist

1. `npm run verify:release`
2. `npm run check:clasp:production`
3. test project only: `GAS_PRODUCTION_SCRIPT_ID=<production_script_id> GAS_TEST_SCRIPT_ID=<test_script_id> npm run clasp:test-push`
4. test project only, after the test push: `clasp run runAllTests`
5. test project only: `clasp run runPerformanceBenchmarks`
6. test project only, optional live-provider AI smoke: `clasp run runAiLiveSmoke --params '["openai","Reply with OK",""]'`
7. production project only, after the test deployment guard passes: `clasp push`
8. validate library from a clean consumer Apps Script project

## `v0.0.5` Release Prep Notes

- Confirm `CHANGELOG.md` `v0.0.5 (unreleased)` includes:
  - `AST.RAG` surface and typed error model
  - Drive ingestion coverage (`txt`, `pdf`, Docs, Slides + notes)
  - embedding provider registry and custom provider registration
  - grounding/citation/abstention behavior
  - `AST.Storage` contracts (`list`, `head`, `read`, `write`, `delete`) for `gcs`, `s3`, and `dbfs`
  - `AST.Chat` `ThreadStore` contracts for durable user-scoped thread state
  - breaking note that internal non-`AST` top-level globals are intentionally unstable
- Confirm docs and README release-state messaging is consistent:
  - published is `v0.0.4`
  - `v0.0.5` is unreleased until tag + GitHub release publish
- For release notes, include exact mapping:
  - `v0.0.5 -> Apps Script version N` (from `clasp version` output)

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
- production `.claspignore` excludes `apps_script_tools/testing/**` and live-smoke entrypoints.
- remote runtime test flows use a separate test Apps Script project and `.claspignore.test` via `npm run clasp:test-push`.
- test pushes refuse to run unless local `.clasp.json` is bound to `GAS_TEST_SCRIPT_ID` and distinct from `GAS_PRODUCTION_SCRIPT_ID`/`GAS_SCRIPT_ID`.
- do not add nested `.claspignore` files under `apps_script_tools/`.
- cookbook projects under `cookbooks/` are separate `clasp` workspaces and may include their own local `.claspignore` and `.clasp.json`.
- keep `.clasp.json` local-only (untracked) and use `.clasp.json.example` as the committed template.

Repository guardrails (enforced by `npm run lint`):

- root `.claspignore` must exist.
- `.claspignore.test` must exist and include the Apps Script runtime test harness for test deployments.
- `apps_script_tools/.claspignore` must not exist.
- `.clasp.json.example` must remain a valid template with:
  - `"scriptId": "<YOUR_SCRIPT_ID>"`
  - `"rootDir": "apps_script_tools"`
- tracked secret/config files are blocked (`.clasp.json`, `.clasprc.json`, `creds.json`, `client_secret.json`).

Publish flow:

```bash
clasp status
npm run check:clasp:production
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
- recommended library identifier (`ASTLib`) or the custom identifier used by the release smoke project
- exact mapping (`vX.Y.Z -> Apps Script version N`)
- key changes and migration guidance
- docs URL
- benchmark highlights for perf-sensitive releases
