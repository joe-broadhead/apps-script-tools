# Cookbooks

Use cookbook projects when you want to build app-specific Apps Script solutions without adding project code into the core library package.

## Why this pattern

- Keeps `apps_script_tools/` focused on reusable library features.
- Lets each app have its own Apps Script deployment lifecycle and Script ID.
- Prevents accidental coupling between library internals and one-off app logic.

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

## Setup tiers

Use these tiers to decide how much setup is required before you run a cookbook.

| Tier | Meaning | Cookbooks |
| --- | --- | --- |
| `Tier 0` | Local/editor-only validation; no external credentials required beyond the AST library binding | `_template`, `data_workflows_starter` |
| `Tier 1` | Script Properties required; may use Drive, cache, or durable state but defaults stay local/dry-run | `config_cache_patterns`, `jobs_triggers_orchestration`, `messaging_hub`, `storage_cache_warmer`, `storage_ops`, `telemetry_alerting` |
| `Tier 2` | External API/provider credentials required for realistic runs | `ai_playground`, `dbt_manifest_summary`, `github_issue_digest`, `http_ingestion_pipeline`, `sql_execution_patterns` |
| `Tier 3` | Deployable webapp or richer app shell with UI/session/index configuration | `rag_chat_starter` |

## Published cookbook index

| Cookbook | Type | README | AST modules | Smoke | Demo |
| --- | --- | --- | --- | --- | --- |
| `_template` | Template v2 scaffold | [README](https://github.com/joe-broadhead/apps-script-tools/blob/master/cookbooks/_template/README.md) | `AST.DataFrame`, `AST.Cache` sample usage | `runCookbookSmoke()` | `runCookbookDemo()` |
| `ai_playground` | Script-run | [README](https://github.com/joe-broadhead/apps-script-tools/blob/master/cookbooks/ai_playground/README.md) | `AST.AI` | `runCookbookSmoke()` | `runCookbookDemo()` |
| `config_cache_patterns` | Script-run | [README](https://github.com/joe-broadhead/apps-script-tools/blob/master/cookbooks/config_cache_patterns/README.md) | `AST.Config`, `AST.Runtime`, `AST.Secrets`, `AST.Cache` | `runCookbookSmoke()` | `runCookbookDemo()` |
| `data_workflows_starter` | Script-run | [README](https://github.com/joe-broadhead/apps-script-tools/blob/master/cookbooks/data_workflows_starter/README.md) | `AST.Series`, `AST.DataFrame`, `AST.GroupBy`, `AST.Drive`, `AST.Sheets`, `AST.Sql`, `AST.Utils` | `runCookbookSmoke()` | `runCookbookDemo()` |
| `dbt_manifest_summary` | Script-run | [README](https://github.com/joe-broadhead/apps-script-tools/blob/master/cookbooks/dbt_manifest_summary/README.md) | `AST.DBT` | `runCookbookSmoke()` | `runCookbookDemo()` |
| `github_issue_digest` | Script-run | [README](https://github.com/joe-broadhead/apps-script-tools/blob/master/cookbooks/github_issue_digest/README.md) | `AST.GitHub` | `runCookbookSmoke()` | `runCookbookDemo()` |
| `http_ingestion_pipeline` | Script-run | [README](https://github.com/joe-broadhead/apps-script-tools/blob/master/cookbooks/http_ingestion_pipeline/README.md) | `AST.Http`, optional `AST.Cache`, `AST.Telemetry` | `runCookbookSmoke()` | `runCookbookDemo()` |
| `jobs_triggers_orchestration` | Script-run | [README](https://github.com/joe-broadhead/apps-script-tools/blob/master/cookbooks/jobs_triggers_orchestration/README.md) | `AST.Jobs`, `AST.Triggers` | `runCookbookSmoke()` | `runCookbookDemo()` |
| `messaging_hub` | Script-run | [README](https://github.com/joe-broadhead/apps-script-tools/blob/master/cookbooks/messaging_hub/README.md) | `AST.Messaging` | `runCookbookSmoke()` | `runCookbookDemo()` |
| `rag_chat_starter` | Webapp | [README](https://github.com/joe-broadhead/apps-script-tools/blob/master/cookbooks/rag_chat_starter/README.md) | `AST.RAG`, `AST.Chat`, `AST.AI`, `AST.Cache` | `runCookbookSmoke()` | `runCookbookDemo()` |
| `sql_execution_patterns` | Script-run | [README](https://github.com/joe-broadhead/apps-script-tools/blob/master/cookbooks/sql_execution_patterns/README.md) | `AST.Sql`, optional `AST.DataFrame` write path | `runCookbookSmoke()` | `runCookbookDemo()` |
| `storage_cache_warmer` | Focused script-run | [README](https://github.com/joe-broadhead/apps-script-tools/blob/master/cookbooks/storage_cache_warmer/README.md) | `AST.Cache`, `AST.Storage` | `runStorageCacheWarmerSmoke()` | n/a |
| `storage_ops` | Script-run | [README](https://github.com/joe-broadhead/apps-script-tools/blob/master/cookbooks/storage_ops/README.md) | `AST.Storage` | `runCookbookSmoke()` | `runCookbookDemo()` |
| `telemetry_alerting` | Script-run | [README](https://github.com/joe-broadhead/apps-script-tools/blob/master/cookbooks/telemetry_alerting/README.md) | `AST.Telemetry`, `AST.TelemetryHelpers` | `runCookbookSmoke()` | `runCookbookDemo()` |

## Manual smoke validation matrix

Use this matrix for cookbook release-readiness checks.

| Cookbook | Minimum prep | Validation run | Expected result |
| --- | --- | --- | --- |
| `_template` | set library version, run `seedCookbookConfig()` | `runCookbookAll()` | validation is `ok`; smoke/demo both return structured summaries |
| `ai_playground` | seed `AI_PLAYGROUND_*`; configure one provider | `runCookbookAll()` | text/structured/tools paths return deterministic summaries or dry-run plans |
| `config_cache_patterns` | seed `CONFIG_CACHE_*`; choose a cache backend | `runCookbookAll()` | runtime/config precedence and cache round-trips succeed |
| `data_workflows_starter` | seed `DATA_WORKFLOWS_*`; optional Drive/Sheets/SQL config | `runCookbookAll()` | frame summaries and sample outputs render without external failures |
| `dbt_manifest_summary` | provide manifest source/cache config | `runCookbookAll()` | manifest load, inspect, search, and lineage summaries are populated |
| `github_issue_digest` | provide `GITHUB_TOKEN` / cookbook GitHub defaults | `runCookbookAll()` | read flows succeed; mutation examples return dry-run plans |
| `http_ingestion_pipeline` | provide target endpoint config or leave dry-run/defaults | `runCookbookAll()` | request/response summaries show retries/redaction/caching behavior |
| `jobs_triggers_orchestration` | seed `JOBS_TRIGGERS_*` | `runCookbookAll()` then `cleanupCookbookArtifacts()` | job, trigger, and DLQ flows succeed; cleanup removes cookbook-owned state |
| `messaging_hub` | seed `MESSAGING_HUB_*` (defaults are safe) | `runCookbookAll()` | dry-run email/chat plans, template render, tracking logs, and inbound fixture routing succeed |
| `rag_chat_starter` | configure index, provider, cache, and branding settings | `runCookbookSmoke()` + deploy webapp if needed | smoke confirms index/chat setup; webapp loads and grounded responses cite sources |
| `sql_execution_patterns` | seed `SQL_COOKBOOK_*`; provide Databricks or BigQuery config only when live execution is enabled | `runCookbookAll()` | smoke returns provider/prepared summaries; demo returns direct/prepared/status/write plans or live execution summaries |
| `storage_cache_warmer` | set `STORAGE_CACHE_URI` and provider auth | `runStorageCacheWarmerSmoke()` | cache object warms successfully and persisted backend responds |
| `storage_ops` | seed `STORAGE_OPS_*` and provider auth | `runCookbookAll()` | CRUD/list/walk/sync summaries match the configured provider |
| `telemetry_alerting` | seed `TELEMETRY_COOKBOOK_*`; keep sink `logger` for easiest run | `runCookbookAll()` | grouped metrics, redaction preview, alert evaluation, and dry-run notifications succeed |

## Release-readiness checklist

Before a release that touches cookbook code, docs, or the underlying AST modules they depend on:

1. Run `npm run check:cookbooks`.
2. Run `npm run lint`.
3. Run `uv run mkdocs build --strict`.
4. Execute the smoke entrypoint for every cookbook that changed in the release.
5. For shared-module changes, also execute the matrix rows that depend on those modules.
6. Confirm every cookbook README still matches its Script Properties and entrypoints.
7. Confirm `cookbooks/README.md` and this page both list the same cookbook set.

## Scope guidance

Put reusable logic back into the library (`apps_script_tools/`) only when it is generic enough for other consumers.
