# Cookbooks

`cookbooks/` holds project-specific Apps Script implementations that consume this library.

Goal:

- Keep reusable platform code in `apps_script_tools/`.
- Keep app-specific code (webapps, demos, integrations) in isolated cookbook projects.

## Folder Model

```text
cookbooks/
  _template/
    .clasp.json.example
    .claspignore
    README.md
    src/
      appsscript.json
      00_Config.gs
      10_EntryPoints.gs
      20_Smoke.gs
      30_Examples.gs
      99_DevTools.gs
  my-project/
    .clasp.json          # local only (ignored)
    .claspignore
    README.md
    src/
      appsscript.json
      00_Config.gs
      10_EntryPoints.gs
      20_Smoke.gs
      30_Examples.gs
      99_DevTools.gs
```

## Create a New Cookbook Project

```bash
cp -R cookbooks/_template cookbooks/<project-name>
cd cookbooks/<project-name>
cp .clasp.json.example .clasp.json
```

Edit `.clasp.json`:

- set `scriptId` to the target Apps Script project
- keep `rootDir` as `src`

Then push:

```bash
clasp push
```

Run the template bootstrap in Apps Script:

1. `seedCookbookConfig()`
2. `runCookbookAll()`

## Template v2 contract

All new cookbooks should start from `cookbooks/_template` and keep these required entrypoints:

- `seedCookbookConfig()`
- `validateCookbookConfig()`
- `runCookbookSmoke()`
- `runCookbookDemo()`
- `runCookbookAll()`

The template README documents:

- script properties and defaults
- expected smoke/demo outputs
- least-privilege scope guidance
- deployment checklist
- troubleshooting notes

## Available examples

- `_template`: cookbook template v2 contract and starter scaffold.
- `config_cache_patterns`: runtime composition cookbook for `AST.Config`, `AST.Runtime`, `AST.Secrets`, and `AST.Cache`.
- `data_workflows_starter`: core data workflow example using `Series`, `DataFrame`, `GroupBy`, `AST.Drive`, `AST.Sheets`, `AST.Sql`, and `AST.Utils`.
- `storage_ops`: practical `AST.Storage` example covering object CRUD, `walk`, `transfer`, `copyPrefix`, `deletePrefix`, and `sync`.
- `github_issue_digest`: fetch open issues/PRs via `AST.GitHub` and emit a digest.
- `dbt_manifest_summary`: load Drive manifest and summarize models via `AST.DBT`.
- `storage_cache_warmer`: focused `AST.Cache` example for warming persisted `storage_json` cache entries.

## Smoke instructions

Each example README includes required script properties and the entrypoint function to run.
Recommended smoke order:

1. `clasp push`
2. Run the example's `*Smoke` function from Apps Script.
3. Verify logged output and expected external side effects (where applicable).

## Rules

- Do not place cookbook code under `apps_script_tools/`.
- Do not commit `.clasp.json`, `.clasprc.json`, or credentials.
- Use `const ASTX = ASTLib.AST || ASTLib;` inside cookbook scripts.
- Keep cookbook code on public AST APIs only; do not reach into library internals.
