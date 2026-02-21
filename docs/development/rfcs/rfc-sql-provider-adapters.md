# RFC: SQL Provider Adapter Layer

## Status

Draft for the `v0.0.3` feature line (post-hardening).

## Objective

Refactor SQL execution internals behind a provider adapter contract so validation, execution, and error mapping are centralized and consistent across providers.

## Motivation

Provider logic is currently distributed across helper files. This increases duplication, makes behavior drift likely, and slows down onboarding of new providers.

## Proposed Architecture

### Provider Registry

```javascript
const SQL_PROVIDER_ADAPTERS = {
  bigquery: BigQueryAdapter,
  databricks: DatabricksAdapter
};
```

### Adapter Contract

```javascript
{
  provider: 'bigquery' | 'databricks' | string,
  capabilities: {
    supportsPlaceholders: boolean,
    supportsTimeoutOptions: boolean,
    supportsTableLoad: boolean
  },
  validateRequest(request): normalizedRequest,
  executeQuery(normalizedRequest): DataFrame,
  executeLoad?(normalizedLoadRequest): void,
  mapError(error, context): Error
}
```

### Router Contract

- `runSqlQuery(request)`:
  1. resolve adapter by `request.provider`
  2. validate and normalize once
  3. execute via adapter
  4. throw adapter-mapped typed error on failure

- `DataFrame.toTable(config)`:
  1. route to provider adapter load path where available
  2. preserve existing public config shape

## Error Semantics

- Unknown provider: `SqlProviderValidationError`
- Validation failure: `SqlProviderValidationError` with `details`
- Execution failure:
  - BigQuery: `BigQuerySqlError`
  - Databricks: `DatabricksSqlError`
- Load failure:
  - BigQuery load: `BigQueryLoadError`
  - Databricks load: `DatabricksLoadError`

All typed errors include:

- `name`
- `provider`
- `details` (when available)
- `cause` (when wrapping lower-level exceptions)

## Performance and Memory Gates

These are required before implementation PR merge.

### Node 20 (100k-row representative query result)

- Adapter dispatch overhead: `<= 1ms` median
- Query path overhead vs baseline: `<= 3%`
- Load path overhead vs baseline: `<= 5%`

### GAS Runtime (20k representative scale)

- No measurable regression (`<= 5%`) for existing SQL smoke/perf cases.

### Allocation Policy

- No additional full-result copy pass introduced by adapter layer.
- Preserve columnar `DataFrame` return path for query results.

## Implementation Outline

1. Introduce adapter interfaces and shared validation helpers.
2. Wrap existing BigQuery/Databricks logic into concrete adapters.
3. Replace direct provider conditionals in routers with registry dispatch.
4. Keep current request schema stable.
5. Incrementally migrate table-load routing to adapter load methods.

## Test Plan

### Contract Tests

1. Adapter registration and unknown-provider behavior.
2. `validateRequest` success/failure per provider.
3. `mapError` shape parity and deterministic typing.

### Integration Tests

1. `runSqlQuery` parity with current BigQuery and Databricks behavior.
2. `DataFrame.toTable` provider routing parity.
3. Option forwarding parity (`maxWaitMs`, `pollIntervalMs`, placeholders policy).

### Performance Tests

1. Router overhead micro-bench.
2. End-to-end query/load benchmarks before/after adapter layer.
3. Conversion counter checks to prevent new row-materialization loops.

## Migration Notes

- Public API remains unchanged:
  - `AST.Sql.run(request)`
  - `DataFrame.toTable(config)`
- Existing provider request shapes remain valid.
- Migration is internal; user-facing docs focus on clarified typed errors.

## Non-Goals (v0.0.3)

- Adding new SQL providers in this PR.
- Streaming query responses.
- Changing table-load public config signatures.

## Open Questions

1. Should adapter capabilities be publicly exposed (`AST.Sql.providers()`)?
2. Should load APIs move to `AST.Sql.load(...)` in a future minor?
3. Do we want provider-specific retry policies in adapter config, or keep centralized retry behavior?
