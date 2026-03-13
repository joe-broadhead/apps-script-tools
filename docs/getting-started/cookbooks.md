# Cookbooks

Use cookbook projects when you want to build app-specific Apps Script solutions (for example, a webapp chat UI) without adding project code into the core library package.

## Why this pattern

- Keeps `apps_script_tools/` focused on reusable library features.
- Lets each app have its own Apps Script deployment lifecycle and Script ID.
- Prevents accidental coupling between library internals and one-off app logic.

## Recommended structure

```text
cookbooks/
  _template/
  my-project/
    .clasp.json          # local-only
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

## Create a cookbook project

```bash
cp -R cookbooks/_template cookbooks/my-project
cd cookbooks/my-project
cp .clasp.json.example .clasp.json
```

Update `.clasp.json`:

- `scriptId`: target script for this app
- `rootDir`: keep as `src`

Then push:

```bash
clasp push
```

Then run:

1. `seedCookbookConfig()`
2. `runCookbookAll()`

## Use the library in cookbook code

```javascript
function runCookbook() {
  const ASTX = ASTLib.AST || ASTLib;
  Logger.log(ASTX.VERSION);
}
```

## Template contract

The template at `cookbooks/_template` is the canonical contract for new cookbook projects.

Required entrypoints:

- `seedCookbookConfig()`
- `validateCookbookConfig()`
- `runCookbookSmoke()`
- `runCookbookDemo()`
- `runCookbookAll()`

Each cookbook should:

- use only public `AST` APIs
- document Script Properties and expected outputs
- include a deterministic smoke entrypoint
- include least-privilege OAuth scope guidance
- explain common failure modes and setup steps

## Scope guidance

Put reusable logic back into the library (`apps_script_tools/`) only when it is generic enough for other consumers.

## Available cookbook examples

- `_template`: baseline scaffold for new cookbook projects.
- `ai_playground`: `AST.AI` cookbook for text, structured output, tools, stream callbacks, and optional routing/fallback.
- `config_cache_patterns`: runtime composition cookbook for `AST.Config`, `AST.Runtime`, `AST.Secrets`, and `AST.Cache`.
- `data_workflows_starter`: end-to-end `Series`/`DataFrame`/`GroupBy` + Drive/Sheets/SQL workflow example.
- `storage_ops`: practical `AST.Storage` cookbook covering object CRUD plus `walk`, `transfer`, `copyPrefix`, `deletePrefix`, and `sync`.
- `github_issue_digest`: template-v2 GitHub automation cookbook for issues, PRs, checks, Actions, GraphQL, Projects v2, and dry-run mutation planning via `AST.GitHub`.
- `http_ingestion_pipeline`: template-v2 `AST.Http` cookbook for resilient request flows, batch error handling, safe redaction, and optional cache/telemetry composition.
- `dbt_manifest_summary`: template-v2 DBT artifact explorer covering manifest load/search, lineage, governance, and artifact comparison via `AST.DBT`.
- `storage_cache_warmer`: focused `AST.Cache` example for warming persisted `storage_json` cache entries.

## Example validation

For each cookbook:

1. `clasp push` in the cookbook directory.
2. Run the documented `*Smoke` entrypoint.
3. Confirm log output and expected side effects.
