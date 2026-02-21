# RFC: DataFrame Window Operations

## Status

Draft for the `v0.0.3` feature line (post-hardening).

## Objective

Add first-class window operations to `DataFrame` so users can compute partitioned rankings, offsets, and running aggregates without manual row loops.

## Motivation

Current workflows rely on combinations of `sort`, `groupBy`, and `assign` with custom closures. This is verbose, error-prone at partition boundaries, and difficult to optimize for large datasets.

## Proposed API

### Surface

```javascript
const windowed = df.window({
  partitionBy: ['account_id'],
  orderBy: [
    { column: 'event_ts', ascending: true, nulls: 'last' },
    { column: 'id', ascending: true }
  ]
});

const out = windowed.assign({
  row_number: w => w.rowNumber(),
  amount_lag_1: w => w.col('amount').lag(1),
  amount_lead_1: w => w.col('amount').lead(1),
  amount_running_sum: w => w.col('amount').running('sum'),
  amount_running_mean: w => w.col('amount').running('mean')
});
```

### Contract

- `df.window(spec)` returns a window context bound to the source dataframe.
- `spec.partitionBy`:
  - optional string[]
  - empty/missing means a single global partition
- `spec.orderBy`:
  - required for deterministic `rowNumber`, `lag`, `lead`, and running metrics
  - supports multi-key stable ordering
- Supported initial functions:
  - `rowNumber()`
  - `col(name).lag(offset = 1, defaultValue = null)`
  - `col(name).lead(offset = 1, defaultValue = null)`
  - `col(name).running('sum' | 'mean' | 'min' | 'max' | 'count')`

## Semantics

- Partitions are independent execution units.
- Null ordering defaults to `nulls: 'last'` unless explicitly set.
- Running functions are cumulative from the first row in the partition through current row.
- `lag/lead` out-of-range returns `defaultValue` (default `null`).
- Numeric running functions throw on non-numeric values (except `null`, which is skipped for `mean/sum/count` and considered for `min/max` only when all values are null).

## Performance and Memory Gates

These are required before implementation PR merge.

### Node 20 (100k rows)

- `window.rowNumber` (single partition, 1 sort key): `<= 1400ms`
- `window.lag` (partitioned by 1 key): `<= 1600ms`
- `window.running(sum,mean,count)` (partitioned by 1 key): `<= 1900ms`

### GAS Runtime (20k rows)

- `window.rowNumber`: `<= 2500ms`
- `window.lag`: `<= 3000ms`
- `window.running(sum,mean,count)`: `<= 3500ms`

### Allocation Policy

- No repeated `toRecords()` roundtrips in window hot paths.
- No per-row object persistence for intermediate window state.
- Peak heap target: `<= 2.5x` input column storage for worst-case partitioning.

## Implementation Outline

1. Precompute partition row-index lists.
2. Precompute ordered index vectors once per partition.
3. Compute each window metric as a direct columnar pass over ordered indices.
4. Materialize outputs with `DataFrame.fromColumns(...)` only.
5. Reuse shared typed helpers for numeric window reducers.

## Test Plan

### Correctness

1. `rowNumber` resets by partition and follows stable order.
2. `lag/lead` boundaries honor `defaultValue`.
3. Running `sum/mean/min/max/count` correctness on mixed null/numeric inputs.
4. Multi-key sort stability with duplicate primary keys.
5. Null ordering behavior for `nulls: 'first'|'last'`.

### Failure Cases

1. Missing order columns.
2. Unknown partition/order columns.
3. Invalid offset values.
4. Non-numeric values in numeric running operations.

### Performance

1. Tall narrow (`100k x 5`) and medium wide (`100k x 20`) datasets.
2. High-cardinality partitions and heavily skewed partitions.
3. Conversion counter assertions to block hidden row-materialization loops.

## Migration Notes

- Additive API only; no changes to existing `groupBy` behavior.
- Existing custom loop logic remains valid.
- Docs must include migration examples from `groupBy + assign` patterns.

## Non-Goals (v0.0.3)

- SQL-style frame clauses (`ROWS BETWEEN ...`).
- Percentile/rank variants beyond `rowNumber`.
- Cross-partition windows.

## Open Questions

1. Do we need `denseRank` in the first release or defer to `v0.0.4`?
2. Should null ordering default be globally configurable?
3. Should `running('mean')` treat all-null windows as `null` (proposed) or `0`?
