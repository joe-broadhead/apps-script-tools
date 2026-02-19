# RFC: SQL Provider Adapter Layer

## Status

Draft for post-`v0.0.2` planning.

## Problem

Provider-specific validation and execution details are spread across helpers, making it harder to extend providers and keep error semantics uniform.

## Proposed Architecture

Introduce provider adapters behind `ASTX.Sql.run(...)`:

```javascript
const sqlProviders = {
  bigquery: bigQueryAdapter,
  databricks: databricksAdapter
};
```

Each adapter contract:

```javascript
{
  validate(request): NormalizedRequest,
  execute(normalizedRequest): DataFrame,
  classifyError(error): ProviderError
}
```

## Goals

1. Uniform throw semantics across providers.
2. Centralized provider-specific validation.
3. Easier onboarding for new providers without changing public API.

## Complexity / Performance Targets

- Adapter dispatch overhead: `< 1ms` at steady state.
- No extra result-copy pass beyond provider execution path.
- No conversion to records for successful provider responses unless unavoidable.

## Test Plan

1. Contract tests per adapter:
   - validation success/failure
   - execution success/failure
   - error classification shape
2. Router tests to ensure unknown providers fail deterministically.
3. Integration tests for current BigQuery and Databricks behavior parity.

## Migration Notes

- Public interface remains `ASTX.Sql.run(request)`.
- Existing request shape remains valid.
- Internal refactor only, with documented provider error names/codes.
