# Optimization Playbook

## When to use `fromColumns`

Use `DataFrame.fromColumns` when data is already column-oriented.

```javascript
const df = ASTX.DataFrame.fromColumns({
  id: [1, 2, 3],
  amount: [10, 20, 30]
});
```

This avoids row-object construction and is the fastest path for large in-memory builds.

## Prefer subset keys in dedupe

```javascript
df.dropDuplicates(['user_id', 'event_date']);
```

Using explicit subset keys:

- reduces key payload size
- improves dedupe speed
- keeps behavior explicit

## Minimize unnecessary `toRecords()` in hot paths

Use column-oriented methods when possible:

- `toColumns()` for in-memory downstream transforms
- `toArrays()` for sheet/file output

Avoid converting to records unless you specifically need row objects.

## Join tuning guidance

- Join on narrow keys (`id`, `composite surrogate`) when possible.
- Avoid high-cardinality object keys unless required.
- For repeated joins, normalize key shape upstream.

## Memory-aware pipeline patterns

For large datasets:

- chain transformations in one flow before output
- avoid intermediate debug materialization (`Logger.log(df.toRecords())`) in hot sections
- move expensive formatting (`toJson`, `toMarkdown`) to pipeline edges

## Perf regression workflow

1. Run `npm run test:perf`.
2. Compare output with baseline artifact.
3. Run `npm run test:perf:check`.
4. If regressions are intentional, update thresholds/baseline and document rationale in PR notes.

## Safety checks before merge

- All local tests pass (`npm run test:local`).
- GAS integration passes (`runAllTests`).
- Performance thresholds pass (`npm run test:perf:check`).
- Docs build strict (`mkdocs build --strict`).
