# SQL Execution Patterns

This cookbook demonstrates focused `AST.Sql` usage with template-v2 entrypoints.

Primary coverage:

- `AST.Sql.providers()` and `AST.Sql.capabilities(...)`
- `AST.Sql.run(...)`
- `AST.Sql.prepare(...)`
- `AST.Sql.executePrepared(...)`
- `AST.Sql.status(...)`
- `AST.DataFrame.toTable(...)` with an explicit opt-in write path

It is intentionally split into:

- deterministic smoke output that works without cloud access
- live Databricks or BigQuery examples when you explicitly enable them

## Folder contract

```text
cookbooks/sql_execution_patterns/
  README.md
  .clasp.json.example
  .claspignore
  src/
    appsscript.json
    00_Config.gs
    10_EntryPoints.gs
    20_Smoke.gs
    30_Examples.gs
    99_DevTools.gs
```

## Setup

1. Copy `.clasp.json.example` to `.clasp.json`.
2. Set your Apps Script `scriptId`.
3. Replace `<PUBLISHED_AST_LIBRARY_VERSION>` in `src/appsscript.json`.
4. Push with `clasp push`.
5. Run `seedCookbookConfig()`.
6. Run `runCookbookSmoke()`.
7. Only after config is correct, enable live execution and run `runCookbookDemo()`.

## Script properties

| Key | Required | Default | Purpose |
| --- | --- | --- | --- |
| `SQL_COOKBOOK_APP_NAME` | Yes | `AST SQL Execution Patterns` | App label used in cookbook outputs |
| `SQL_COOKBOOK_DEFAULT_PROVIDER` | Yes | `databricks` | Provider used by smoke/demo: `databricks` or `bigquery` |
| `SQL_COOKBOOK_ENABLE_LIVE` | No | `false` | Enables real provider execution instead of returning plans only |
| `SQL_COOKBOOK_ENABLE_TABLE_WRITE` | No | `false` | Enables the opt-in `DataFrame.toTable(...)` example |
| `SQL_COOKBOOK_RUN_STATUS_CHECK` | No | `true` | Calls `AST.Sql.status(...)` after prepared execution when possible |
| `SQL_COOKBOOK_QUERY_TIMEOUT_MS` | No | `30000` | SQL timeout budget in milliseconds |
| `SQL_COOKBOOK_POLL_INTERVAL_MS` | No | `500` | Poll interval in milliseconds |
| `SQL_COOKBOOK_TARGET_TABLE` | No | `''` | Required only when table writes are enabled |
| `SQL_COOKBOOK_DATABRICKS_HOST` | No | `''` | Databricks host for live Databricks runs |
| `SQL_COOKBOOK_DATABRICKS_SQL_WAREHOUSE_ID` | No | `''` | Databricks SQL warehouse id |
| `SQL_COOKBOOK_DATABRICKS_SCHEMA` | No | `default` | Databricks schema used by live runs |
| `SQL_COOKBOOK_DATABRICKS_TOKEN` | No | `''` | Databricks PAT |
| `SQL_COOKBOOK_BIGQUERY_PROJECT_ID` | No | `''` | BigQuery project id for live BigQuery runs |

Provider-specific live requirements:

- Databricks live runs require:
  - `SQL_COOKBOOK_DATABRICKS_HOST`
  - `SQL_COOKBOOK_DATABRICKS_SQL_WAREHOUSE_ID`
  - `SQL_COOKBOOK_DATABRICKS_TOKEN`
- BigQuery live runs require:
  - `SQL_COOKBOOK_BIGQUERY_PROJECT_ID`

## Entrypoints

- `seedCookbookConfig()`: seeds the cookbook properties.
- `validateCookbookConfig()`: validates provider settings and live execution prerequisites.
- `runCookbookSmoke()`: deterministic provider/capability/prepared-statement summary; optionally executes one direct live query.
- `runCookbookDemo()`: direct query, prepared query, optional status check, and optional table-write example.
- `runCookbookAll()`: runs smoke + demo in one payload.

## What the cookbook does

Smoke flow:

1. lists supported SQL providers and their capabilities
2. compiles a prepared statement template with a typed schema
3. returns direct/prepared/status/cancel request previews
4. optionally executes a single live direct query if `SQL_COOKBOOK_ENABLE_LIVE=true`

Demo flow:

1. executes a direct SQL query through `AST.Sql.run(...)`
2. executes a typed prepared statement through `AST.Sql.executePrepared(...)`
3. optionally checks execution status through `AST.Sql.status(...)`
4. returns cancel request and table write plans
5. optionally writes a sample `DataFrame` into a provider table when both:
   - `SQL_COOKBOOK_ENABLE_LIVE=true`
   - `SQL_COOKBOOK_ENABLE_TABLE_WRITE=true`

## Expected output examples

`runCookbookSmoke()` returns a shape like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookSmoke",
  "provider": "databricks",
  "providers": ["bigquery", "databricks"],
  "liveEnabled": false,
  "prepared": {
    "provider": "databricks",
    "templateParams": ["sample_id", "sample_label"]
  }
}
```

`runCookbookDemo()` returns a shape like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookDemo",
  "provider": "databricks",
  "directQuery": {
    "executed": false,
    "skipped": true
  },
  "preparedQuery": {
    "executed": false,
    "skipped": true
  },
  "tableWrite": {
    "executed": false,
    "skipped": true
  }
}
```

## OAuth scopes

This cookbook currently requests:

- `https://www.googleapis.com/auth/script.external_request`
- `https://www.googleapis.com/auth/bigquery`

Keep this least-privilege:

- If you only use Databricks live execution, `script.external_request` is the important scope.
- If you run BigQuery examples, keep the BigQuery scope and ensure the BigQuery advanced service/runtime access is enabled in your Apps Script project as required by your environment.

## Safety notes

- Live execution is off by default.
- Table writes are off by default.
- Tokens are redacted from cookbook summaries and request plans.
- `AST.Sql.cancel(...)` is shown as a request plan only; the cookbook does not auto-cancel statements because that would be nondeterministic and potentially destructive.

## Troubleshooting

`Cookbook config is invalid`

- Run `seedCookbookConfig()` again.
- Check that `SQL_COOKBOOK_DEFAULT_PROVIDER` is `databricks` or `bigquery`.
- If live is enabled, confirm the provider-specific credentials are present.

`The smoke/demo returns plans only`

- This is expected until `SQL_COOKBOOK_ENABLE_LIVE=true`.

`BigQuery live runs fail`

- Confirm `SQL_COOKBOOK_BIGQUERY_PROJECT_ID` is set.
- Confirm the Apps Script project is authorized for BigQuery access.

`Databricks live runs fail`

- Confirm the host, warehouse id, and PAT are all set.
- Confirm the warehouse is running and the configured schema is accessible.

`The demo skips table writes`

- This is expected unless `SQL_COOKBOOK_ENABLE_TABLE_WRITE=true` and `SQL_COOKBOOK_TARGET_TABLE` is configured.

`You want to inspect or reset the contract`

- Run `showCookbookContract()`.
- Run `clearCookbookConfig()`.
