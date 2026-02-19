# RFC: DataFrame Window Operations

## Status

Draft for post-`v0.0.2` planning.

## Problem

`DataFrame` users need native window-style operations without falling back to manual loops or per-group post-processing.

## Proposed API

```javascript
const out = df.window({
  partitionBy: ['account_id'],
  orderBy: [{ column: 'event_ts', ascending: true }]
}).assign({
  amount_running_sum: w => w.col('amount').running('sum'),
  amount_lag_1: w => w.col('amount').lag(1),
  row_number: w => w.rowNumber()
});
```

## Complexity Targets

- Single partition running aggregates: `O(n)`
- Partitioned operations: `O(n log n)` including ordering
- Additional memory overhead target: `< 2x` input column storage

## Data/Execution Model

1. Build partition index maps once.
2. Reuse ordered row-index arrays per partition.
3. Compute each requested window metric in columnar arrays.
4. Return `DataFrame.fromColumns(...)` without row-object materialization.

## Edge Cases

- Null ordering semantics (default nulls last, configurable later).
- Duplicate order keys (stable tie behavior required).
- Empty partitions after filtering.
- Non-numeric running metrics with strict type validation.

## Test Plan

1. Deterministic correctness tests for `lag`, `lead`, running `sum`, `mean`, and `rowNumber`.
2. Partition boundary tests (first/last rows in partition).
3. Null handling and mixed-type rejection tests.
4. Perf tests at 100k rows with:
   - narrow tables (5 cols)
   - wider tables (20 cols)
5. Counter checks to ensure no hidden `toRecords` loops in hot path.

## Migration Notes

- Additive API only.
- No behavior change to existing `groupBy` or `sort`.
- Document recommended migration from custom row loops to `window()`.
