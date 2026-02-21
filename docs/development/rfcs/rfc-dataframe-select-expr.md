# RFC: DataFrame Select Expressions

## Status

Draft for the `v0.0.3` feature line (post-hardening).

## Objective

Introduce `selectExpr` for concise, high-performance projection pipelines that combine passthrough columns and computed expressions in one pass.

## Motivation

Current projection flows require chained `select(...).assign(...)` calls and repeated function boilerplate for wide tables. A single projection map improves readability and enables a single optimized evaluation pass.

## Proposed API

### Surface

```javascript
const projected = df.selectExpr({
  id: 'id',
  region_upper: row => String(row.region).toUpperCase(),
  amount_usd: ({ amount_cents }) => amount_cents / 100,
  is_large: ({ amount_cents }) => amount_cents >= 10000,
  score_bucket: (columns, i) => {
    const score = columns.score.data[i];
    return score >= 80 ? 'high' : 'standard';
  }
});
```

### Contract

`selectExpr(map, options?)`

- `map` keys define output column order.
- `map` values support:
  - string passthrough (`'existing_col'`)
  - row projector `(row) => any`
  - columnar projector `(columns, rowIndex) => any`
- `options`:
  - `strict: boolean` (default `true`) throw on unknown passthrough columns
  - `onError: 'throw' | 'null'` (default `'throw'`) per-row expression error policy

## Semantics

- Projection executes left-to-right in map order.
- Expressions cannot reference projected columns from earlier keys in the same call.
- Async expressions are not supported.
- No string-eval mode; function-only expressions for safety.

## Performance and Memory Gates

These are required before implementation PR merge.

### Node 20 (100k rows)

- `selectExpr` with 10 outputs (5 passthrough + 5 computed): `<= 1200ms`
- `selectExpr` with 20 computed outputs: `<= 2200ms`

### GAS Runtime (20k rows)

- `selectExpr` with 10 outputs: `<= 2400ms`
- `selectExpr` with 20 outputs: `<= 4200ms`

### Allocation Policy

- Exactly one output array allocated per projected key.
- No full-dataframe row-object persistence.
- Avoid hidden `toRecords()` conversions in the execution path.

## Implementation Outline

1. Validate projection map once.
2. Pre-resolve passthrough source arrays.
3. Build a lightweight per-row proxy only for row-function mode.
4. Evaluate each projection in a single pass to output arrays.
5. Return via `DataFrame.fromColumns(...)`.

## Test Plan

### Correctness

1. Mixed passthrough + computed projections preserve output order.
2. Unknown passthrough behavior under `strict=true/false`.
3. `onError='null'` null-fills only failing row expressions.
4. Columnar projector `(columns, i)` parity with row projector mode.
5. Null/undefined handling in expressions.

### Failure Cases

1. Empty projection maps.
2. Non-function/non-string expression entries.
3. Async function returns.
4. Duplicate output keys (should be rejected by validation).

### Performance

1. 100k row tall-narrow and medium-wide scenarios.
2. High expression-count maps and branch-heavy expression functions.
3. Conversion-counter assertions for row-materialization avoidance.

## Migration Notes

- Additive API; existing `select` and `assign` remain unchanged.
- Migration guide should map common patterns to `selectExpr` one-liners.
- Recommend `selectExpr` for high-throughput ETL projection stages.

## Non-Goals (v0.0.3)

- SQL parser support for string expressions.
- Cross-row expressions (window behavior belongs in window RFC).
- Expression dependency graph inside one `selectExpr` call.

## Open Questions

1. Should we allow referencing prior projected keys in the same map in `v0.0.4`?
2. Is `onError='null'` sufficient, or do we need `onError='custom'` callback mode?
3. Should we add built-in helper macros (e.g., `coalesce`, `toNumber`) in this phase?
