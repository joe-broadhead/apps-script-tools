# SQL Contracts

## `ASTX.Sql.run(request)`

`request` shape:

```javascript
{
  provider: 'databricks' | 'bigquery',
  sql: 'select ...',
  parameters: { ... },
  placeholders: { ... },
  options: {
    allowUnsafePlaceholders: false
  }
}
```

Validation rules:

- `provider` must be `databricks` or `bigquery`.
- `sql` must be a non-empty string.
- `parameters`, `placeholders`, and `options` must be objects.
- If `placeholders` is non-empty, you must set `options.allowUnsafePlaceholders=true`.

### Databricks parameters

```javascript
{
  host: 'dbc-....cloud.databricks.com',
  sqlWarehouseId: 'warehouse-id',
  schema: 'analytics',
  token: 'dapi...'
}
```

Notes:

- Query execution uses Databricks SQL statements API.
- Results are downloaded in chunks and combined into a `DataFrame`.
- On provider errors, Databricks path may return `null`.

### BigQuery parameters

```javascript
{
  projectId: 'my-gcp-project'
}
```

Notes:

- Uses BigQuery Jobs API (`Jobs.query` + `getQueryResults`).
- Empty result sets return an empty `DataFrame` with schema columns.

## `DataFrame.toTable(request)`

Use `toTable` to write dataframe rows to provider tables.

```javascript
{
  provider: 'databricks' | 'bigquery',
  config: { ... },
  headerOrder: ['optional', 'column', 'order']
}
```

### BigQuery `config`

```javascript
{
  tableName: 'dataset.table',
  tableSchema: { id: 'INT64', amount: 'FLOAT64' },
  mode: 'insert' | 'overwrite',
  bigquery_parameters: {
    projectId: 'my-gcp-project'
  }
}
```

### Databricks `config`

```javascript
{
  tableName: 'analytics.sales',
  tableSchema: { id: 'INT', amount: 'DOUBLE' },
  mode: 'insert' | 'overwrite' | 'merge',
  mergeKey: 'id', // required for merge mode
  batchSize: 500,
  databricks_parameters: {
    host: 'dbc-....cloud.databricks.com',
    sqlWarehouseId: 'warehouse-id',
    schema: 'analytics',
    token: 'dapi...'
  }
}
```

## Error behavior quick list

- Invalid provider: throws.
- Empty SQL string: throws.
- Unsafe placeholders without explicit opt-in: throws.
- `toTable` with missing `config.tableSchema`: throws.
- BigQuery load mode not in (`insert`, `overwrite`): throws.

## Provider error semantics

- `ASTX.Sql.run(...)` throws on validation failures before execution.
- BigQuery execution/load failures throw errors from the provider path.
- Databricks execution failures throw `DatabricksSqlError` with:
  - `name: "DatabricksSqlError"`
  - `provider: "databricks"`
  - optional `details` and `cause` fields for diagnostics

Recommended usage:

```javascript
try {
  const df = ASTX.Sql.run(request);
  Logger.log(df.len());
} catch (error) {
  Logger.log(`${error.name}: ${error.message}`);
}
```
