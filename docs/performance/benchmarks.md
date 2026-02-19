# Benchmarks and SLAs

## Running benchmarks locally

```bash
npm run test:perf
```

Generate/update baseline snapshot:

```bash
npm run test:perf:baseline
```

Run hard threshold checks:

```bash
npm run test:perf:check
```

## Node 20 SLA targets (100k rows)

| Operation | SLA |
| --- | --- |
| `DataFrame.fromRecords` (100k x 10) | <= 2200 ms |
| `DataFrame.sort` (single numeric key) | <= 1800 ms |
| `DataFrame.dropDuplicates` (subset keys) | <= 1600 ms |
| `DataFrame.merge` (inner, 100k x 100k) | <= 2600 ms |
| `DataFrame.groupBy().agg()` | <= 900 ms |
| `DataFrame.toRecords` (100k x 10) | <= 1400 ms |
| `Series.multiply` (100k) | <= 120 ms |

Threshold config lives at:

- `tests/perf/perf-thresholds.json`

## Apps Script runtime targets (20k rows)

`runPerformanceBenchmarks` enforces:

- `fromRecords` <= 3500 ms
- `sort` <= 3000 ms
- `dropDuplicates` <= 2500 ms
- `merge(inner)` <= 4500 ms
- `groupBy + agg` <= 1200 ms
- full suite <= 60000 ms

Run from script editor or via CI workflow dispatch (`integration-gas.yml`, `suite=perf`).

## Baseline artifacts

Stored at:

- `benchmarks/baselines/node20.json`
- `benchmarks/baselines/gas.json`

CI report artifacts are written to:

- `benchmarks/latest/node20.json`

## Counter-based regression checks

Some thresholds enforce architectural constraints, not just wall-clock time.

Examples:

- `sort` must keep `toRecords` counter at `0`
- `dropDuplicates` must keep `toRecords` counter at `0`

This protects against accidental reintroduction of row-materialization-heavy code paths.
