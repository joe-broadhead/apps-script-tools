# RFC: DataFrame Select Expressions

## Status

Draft for post-`v0.0.2` planning.

## Problem

Common projections require repeated `assign(...)` calls and manual field wiring, which is verbose for wide tables.

## Proposed API

```javascript
const out = df.selectExpr({
  id: 'id',
  region_upper: row => row.region.toUpperCase(),
  amount_usd: ({ amount_cents }) => amount_cents / 100,
  is_large: ({ amount_cents }) => amount_cents >= 10000
});
```

## Contract

- Values in `selectExpr(map)` can be:
  - string column passthrough
  - `(row) => value` projection function
  - `(columns, rowIndex) => value` advanced projection function
- Function mode executes in-process only (no string eval).

## Complexity Targets

- Projection pass target: `O(n * k)` where `k` is expression count.
- Memory overhead target: one output column array per projected field, no row object persistence.

## Validation Rules

1. Reject empty projection maps.
2. Reject unknown passthrough columns with explicit errors.
3. Require deterministic function return values (no async).
4. Preserve projected key order.

## Test Plan

1. Mixed passthrough + expression coverage.
2. Unknown column and invalid expression errors.
3. Null/undefined handling in expression functions.
4. Perf test at 100k rows, 10 projected fields.

## Migration Notes

- Additive API.
- Existing `select(...).assign(...)` pipelines remain valid.
- Provide mapping examples from current patterns to `selectExpr(...)`.
