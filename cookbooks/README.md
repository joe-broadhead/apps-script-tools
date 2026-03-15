# Cookbooks

`cookbooks/` holds project-specific Apps Script implementations that consume this library through the public `AST` surface.

Goal:

- Keep reusable platform code in `apps_script_tools/`.
- Keep app-specific code (webapps, demos, integrations) in isolated cookbook projects.
- Publish a discoverable catalog so each major `AST` surface has a runnable example.

## Folder model

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

## Create a new cookbook project

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

All new cookbook projects should start from `cookbooks/_template` and keep these required entrypoints:

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

## Published cookbook catalog

| Cookbook | Type | AST modules covered | Required script properties | Entrypoints |
| --- | --- | --- | --- | --- |
| `_template` | Template v2 scaffold | `AST.DataFrame`, `AST.Cache` sample usage only | `COOKBOOK_*` | `seedCookbookConfig`, `validateCookbookConfig`, `runCookbookSmoke`, `runCookbookDemo`, `runCookbookAll` |
| `ai_playground` | Script-run | `AST.AI` | `AI_PLAYGROUND_*` plus provider auth as needed | standard template-v2 entrypoints |
| `config_cache_patterns` | Script-run | `AST.Config`, `AST.Runtime`, `AST.Secrets`, `AST.Cache` | `CONFIG_CACHE_*` plus backend-specific cache secrets/URIs | standard template-v2 entrypoints |
| `data_workflows_starter` | Script-run | `AST.Series`, `AST.DataFrame`, `AST.GroupBy`, `AST.Drive`, `AST.Sheets`, `AST.Sql`, `AST.Utils` | `DATA_WORKFLOWS_*` plus optional Drive/Sheets/SQL config | standard template-v2 entrypoints |
| `dbt_manifest_summary` | Script-run | `AST.DBT` | `DBT_*` / cookbook DBT source and cache properties | standard template-v2 entrypoints |
| `github_issue_digest` | Script-run | `AST.GitHub` | `GITHUB_*` / cookbook GitHub defaults and token | standard template-v2 entrypoints |
| `http_ingestion_pipeline` | Script-run | `AST.Http`, optional `AST.Cache`, `AST.Telemetry` | `HTTP_INGESTION_*` plus target API config | standard template-v2 entrypoints |
| `jobs_triggers_orchestration` | Script-run | `AST.Jobs`, `AST.Triggers` | `JOBS_TRIGGERS_*` | standard template-v2 entrypoints |
| `messaging_hub` | Script-run | `AST.Messaging` | `MESSAGING_HUB_*` plus optional live webhook/mail settings | standard template-v2 entrypoints |
| `rag_chat_starter` | Webapp | `AST.RAG`, `AST.Chat`, `AST.AI`, `AST.Cache` | `RAG_CHAT_*` plus provider/index/cache settings | standard template-v2 entrypoints + HtmlService webapp |
| `storage_cache_warmer` | Focused script-run | `AST.Cache`, `AST.Storage` | `STORAGE_CACHE_URI`, optional `STORAGE_CACHE_NAMESPACE`, provider auth | `runStorageCacheWarmerSmoke` |
| `storage_ops` | Script-run | `AST.Storage` | `STORAGE_OPS_*` plus provider auth/URIs | standard template-v2 entrypoints |
| `telemetry_alerting` | Script-run | `AST.Telemetry`, `AST.TelemetryHelpers` | `TELEMETRY_COOKBOOK_*` | standard template-v2 entrypoints |

## Validation hooks

Use the structural verifier before release or when adding a cookbook:

```bash
npm run check:cookbooks
```

This check verifies:

- every published cookbook directory is catalogued
- each template-v2 cookbook contains the required scaffold files
- `cookbooks/README.md` and `docs/getting-started/cookbooks.md` both mention every catalogued cookbook

`npm run lint` also runs this cookbook structure check.

## Smoke instructions

Each cookbook README includes required script properties and the primary entrypoint function to run.
Recommended smoke order:

1. `clasp push`
2. Run the example's documented smoke entrypoint from Apps Script.
3. Verify logged output and expected external side effects (where applicable).

Use the full validation matrix in `docs/getting-started/cookbooks.md` for pre-release sign-off.

## Rules

- Do not place cookbook code under `apps_script_tools/`.
- Do not commit `.clasp.json`, `.clasprc.json`, or credentials.
- Use `const ASTX = ASTLib.AST || ASTLib;` inside cookbook scripts.
- Keep cookbook code on public AST APIs only; do not reach into library internals.
