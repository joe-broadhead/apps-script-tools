# Data Workflows Starter

This cookbook demonstrates an end-to-end data workflow using public `AST` APIs only:

- `Series`, `DataFrame`, `GroupBy`
- `AST.Drive`
- `AST.Sheets`
- `AST.Sql`
- `AST.Utils`

It follows the cookbook template v2 contract from `cookbooks/_template`.

## Folder contract

```text
cookbooks/data_workflows_starter/
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
6. Run `runCookbookAll()`.

## Script properties

Required/optional cookbook keys:

| Key | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATA_WORKFLOWS_APP_NAME` | Yes | `AST Data Workflows Starter` | App label used in outputs |
| `DATA_WORKFLOWS_OUTPUT_PREFIX` | No | `data_workflows` | Prefix for generated Drive/Sheets artifacts |
| `DATA_WORKFLOWS_DESTINATION_FOLDER_ID` | No | `''` | Optional Drive folder id for outputs |
| `DATA_WORKFLOWS_WRITE_SHEET` | No | `true` | When true, writes grouped output to a spreadsheet |
| `DATA_WORKFLOWS_SQL_PROVIDER` | No | `''` | Optional SQL provider: `bigquery` or `databricks` |
| `DATA_WORKFLOWS_SQL_THRESHOLD` | No | `200` | Integer threshold used in the optional SQL step |

Optional SQL provider configuration:

- For BigQuery, set `BIGQUERY_PROJECT_ID`.
- For Databricks, set:
  - `DATABRICKS_HOST`
  - `DATABRICKS_TOKEN`
  - `DATABRICKS_SQL_WAREHOUSE_ID`
  - `DATABRICKS_SCHEMA` (optional; defaults to `default`)

## Entrypoints

- `seedCookbookConfig()`: seeds the cookbook script properties.
- `validateCookbookConfig()`: returns validation status, warnings, errors, and resolved config.
- `runCookbookSmoke()`: deterministic summary with `rowsIn`, `rowsOut`, `columnsOut`, and `durationMs`.
- `runCookbookDemo()`: richer end-to-end workflow that writes artifacts to Drive/Sheets and optionally runs SQL.
- `runCookbookAll()`: runs smoke + demo and returns one structured payload.

## What the cookbook does

Smoke flow:

1. builds a `DataFrame` from inline records
2. uses `Series` arithmetic and row-level mapping
3. aggregates with `GroupBy`
4. computes helper values with `AST.Utils`
5. returns a deterministic summary object

Demo flow:

1. transforms and enriches order records
2. merges in region target metadata
3. groups the output for reporting
4. writes CSV + JSON artifacts with `AST.Drive`
5. optionally writes a spreadsheet report with `AST.Sheets`
6. optionally runs a typed prepared SQL query with `AST.Sql`
7. merges the SQL result back into the grouped report preview

## Expected output examples

`runCookbookSmoke()` returns a shape like:

```json
{
  "status": "ok",
  "rowsIn": 6,
  "rowsOut": 3,
  "columnsOut": ["region", "net_revenue_sum", "net_revenue_mean", "units_sum"],
  "durationMs": 12
}
```

`runCookbookDemo()` returns a shape like:

```json
{
  "status": "ok",
  "artifacts": {
    "csvFileId": "drive-file-id",
    "jsonFileId": "drive-file-id",
    "spreadsheetId": "spreadsheet-id"
  },
  "sql": {
    "executed": false,
    "skipped": true
  }
}
```

## OAuth scopes

This cookbook currently requests:

- `https://www.googleapis.com/auth/script.external_request`
- `https://www.googleapis.com/auth/drive`
- `https://www.googleapis.com/auth/spreadsheets`

If you enable BigQuery, add the exact BigQuery scopes your environment requires. Keep the manifest least-privilege for the modules you actually use.

## Troubleshooting

`Cookbook config is invalid`

- Run `seedCookbookConfig()` again.
- Check that `DATA_WORKFLOWS_SQL_PROVIDER` is blank, `bigquery`, or `databricks`.

`The demo skips SQL`

- This is expected unless you configure `DATA_WORKFLOWS_SQL_PROVIDER` and the provider-specific script properties.

`Drive or Sheets writes fail`

- Confirm the script has been re-authorized after adding the Drive and Sheets scopes.
- Confirm `DATA_WORKFLOWS_DESTINATION_FOLDER_ID` points to a folder you can access.

`You want to inspect or reset the contract`

- Run `showCookbookContract()`.
- Run `clearCookbookConfig()`.
