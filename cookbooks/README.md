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
      # optional HtmlService assets for webapp cookbooks:
      # Index.html
      # IndexLayout.html
      # IndexStyles.html
      # IndexScript.html
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
- `ai_playground`: practical `AST.AI` cookbook covering text, structured output, tool calls, stream callbacks, and optional provider routing/fallback.
- `config_cache_patterns`: runtime composition cookbook for `AST.Config`, `AST.Runtime`, `AST.Secrets`, and `AST.Cache`.
- `data_workflows_starter`: core data workflow example using `Series`, `DataFrame`, `GroupBy`, `AST.Drive`, `AST.Sheets`, `AST.Sql`, and `AST.Utils`.
- `storage_ops`: practical `AST.Storage` example covering object CRUD, `walk`, `transfer`, `copyPrefix`, `deletePrefix`, and `sync`.
- `github_issue_digest`: template-v2 GitHub automation cookbook for issues, PRs, checks, Actions, GraphQL, Projects v2, and dry-run mutation planning via `AST.GitHub`.
- `http_ingestion_pipeline`: template-v2 `AST.Http` cookbook for resilient request flows, batch error handling, safe redaction, and optional cache/telemetry composition.
- `jobs_triggers_orchestration`: template-v2 orchestration cookbook for `AST.Jobs` and `AST.Triggers`, including retry/resume flows, schedule bridge, and DLQ lifecycle.
- `telemetry_alerting`: template-v2 observability cookbook for `AST.Telemetry` and `AST.TelemetryHelpers`, including redaction checks, grouped metrics, alert rules, and dry-run notifications.
- `rag_chat_starter`: template-v2 webapp starter for grounded `AST.RAG` chat with `AST.Chat` thread persistence, linked citations, and configurable branding.
- `dbt_manifest_summary`: template-v2 DBT artifact explorer for manifest search, lineage, governance, and artifact comparison via `AST.DBT`.
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
