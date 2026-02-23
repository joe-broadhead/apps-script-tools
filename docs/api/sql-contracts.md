# SQL Contracts

## `ASTX.Sql.providers()` and `ASTX.Sql.capabilities(provider)`

Supported providers:

- `bigquery`
- `databricks`

Capabilities currently expose:

- `supportsPlaceholders`
- `supportsTimeoutOptions`
- `supportsTableLoad`
- `supportsPreparedStatements`
- `supportsStatus`
- `supportsCancel`

## `ASTX.Sql.run(request)`

Direct SQL execution contract:

```javascript
{
  provider: 'databricks' | 'bigquery',
  sql: 'select ...',
  parameters: { ... },
  placeholders: { ... },
  options: {
    allowUnsafePlaceholders: false,
    maxWaitMs: 120000,
    pollIntervalMs: 500
  }
}
```

Validation rules:

- `provider` must be `databricks` or `bigquery`.
- `sql` must be a non-empty string.
- `parameters`, `placeholders`, and `options` must be objects.
- If `placeholders` is non-empty, you must set `options.allowUnsafePlaceholders=true`.
- `options.maxWaitMs` and `options.pollIntervalMs` must be positive integers when provided.
- `options.pollIntervalMs` cannot be greater than `options.maxWaitMs`.

## `ASTX.Sql.prepare(request)`

Prepared statement compilation contract:

```javascript
{
  provider: 'databricks' | 'bigquery',
  sql: 'select * from t where id = {{id}} and region = {{region}}',
  paramsSchema: {
    id: 'integer',
    region: { type: 'string', required: true }
  },
  parameters: { ... }, // optional default provider parameters
  options: { ... }     // optional default execution options
}
```

Returns:

```javascript
{
  statementId: 'sqlprep_...',
  provider: 'bigquery',
  templateParams: ['id', 'region'],
  createdAt: 'ISO-8601',
  paramSchema: { ...normalized schema... }
}
```

Notes:

- Placeholder tokens for prepared mode are `{{paramName}}`.
- Parameter schema supports types:
  - `string`, `number`, `integer`, `boolean`, `date`, `timestamp`, `json`, `raw`.
- Prepared statements are cached in runtime memory (in-process), keyed by `statementId`.

## `ASTX.Sql.executePrepared(request)`

Prepared execution contract:

```javascript
{
  statementId: 'sqlprep_...',
  params: { id: 1, region: 'north' },
  parameters: { ... }, // optional overrides on top of prepared defaults
  options: { ... }     // optional overrides on top of prepared defaults
}
```

Returns:

```javascript
{
  provider: 'bigquery' | 'databricks',
  statementId: 'sqlprep_...',
  sql: 'rendered sql ...',
  dataFrame: DataFrame,
  execution: {
    provider,
    executionId,
    state,
    complete,
    ...provider metadata
  } | null
}
```

## `ASTX.Sql.status(request)`

Execution status contract:

```javascript
// BigQuery
{
  provider: 'bigquery',
  executionId: 'job-id', // or jobId
  parameters: { projectId: 'my-project' }
}

// Databricks
{
  provider: 'databricks',
  executionId: 'statement-id', // or statementId
  parameters: { host: 'dbc....', token: 'dapi...' }
}
```

## `ASTX.Sql.cancel(request)`

Execution cancellation contract:

```javascript
// BigQuery
{
  provider: 'bigquery',
  executionId: 'job-id', // or jobId
  parameters: { projectId: 'my-project' }
}

// Databricks
{
  provider: 'databricks',
  executionId: 'statement-id', // or statementId
  parameters: { host: 'dbc....', token: 'dapi...' }
}
```

### Provider parameters

Databricks execution parameters:

```javascript
{
  host: 'dbc-....cloud.databricks.com',
  sqlWarehouseId: 'warehouse-id',
  schema: 'analytics',
  token: 'dapi...'
}
```

BigQuery execution parameters:

```javascript
{
  projectId: 'my-gcp-project'
}
```

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
  },
  options: {
    maxWaitMs: 120000,
    pollIntervalMs: 1000
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
  },
  options: {
    maxWaitMs: 120000,
    pollIntervalMs: 500
  }
}
```

## Error behavior quick list

- Invalid provider: throws.
- Empty SQL string: throws.
- Unsafe placeholders without explicit opt-in: throws.
- Unknown `statementId` for `executePrepared`: throws `SqlPreparedStatementError`.
- Missing or type-invalid prepared params: throws `SqlPreparedStatementError`.
- Missing provider execution IDs (`jobId`/`statementId`) for `status`/`cancel`: throws `SqlExecutionControlError`.
- `toTable` with missing `config.tableSchema`: throws.
- BigQuery load mode not in (`insert`, `overwrite`): throws.
- Databricks load mode not in (`insert`, `overwrite`, `merge`): throws.
- Databricks merge mode without `mergeKey`: throws.
- Adapter lookup for unknown providers throws `SqlProviderValidationError`.

## Provider error semantics

- `ASTX.Sql.run(...)` throws on validation failures before execution.
- BigQuery execution/load failures throw errors from the provider path.
- Databricks execution failures throw `DatabricksSqlError` with:
  - `name: "DatabricksSqlError"`
  - `provider: "databricks"`
  - optional `details` and `cause` fields for diagnostics
- Databricks table-load failures throw `DatabricksLoadError` with:
  - `name: "DatabricksLoadError"`
  - `provider: "databricks"`
  - optional `details` and `cause` fields for diagnostics

Recommended usage:

```javascript
try {
  const prepared = ASTX.Sql.prepare({
    provider: 'bigquery',
    sql: 'select * from events where user_id = {{user_id}}',
    paramsSchema: { user_id: 'integer' },
    parameters: { projectId: 'my-project' }
  });

  const result = ASTX.Sql.executePrepared({
    statementId: prepared.statementId,
    params: { user_id: 42 }
  });

  Logger.log(result.dataFrame.len());
  Logger.log(result.execution && result.execution.executionId);
} catch (error) {
  Logger.log(`${error.name}: ${error.message}`);
}
```
