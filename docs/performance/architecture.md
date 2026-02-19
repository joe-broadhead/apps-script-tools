# Performance Architecture

## Goals

`apps-script-tools` performance work focuses on two constraints:

- runtime speed for high-row-count transforms
- allocation control to avoid expensive object churn in Apps Script and Node runtimes

## Core design changes

## 1. Columnar-first construction

`DataFrame.fromRecords` now builds column arrays first, then constructs `Series` in one pass via `DataFrame.fromColumns`.

Benefits:

- avoids per-cell `Series.append()` overhead
- avoids repeated type recomputation during construction
- keeps memory writes sequential and cache-friendly

## 2. Conversion-path control

`DataFrame.toArrays` and `DataFrame.sort` avoid mandatory row materialization.

- `toArrays` reads column arrays directly.
- `sort` sorts row indexes and rebuilds columns from index order.
- `dropDuplicates` deduplicates on subset key arrays directly.

## 3. Canonical key semantics

Key-based operations share stable canonicalization helpers:

- null, undefined, and missing keys normalize to `null` for key comparisons
- objects are canonicalized by sorted key order
- dates are canonicalized by ISO value

This is used by:

- `dropDuplicates`
- joins (`joinRecordsOnKeys`)
- set-like utilities (`arrayUnion`, `arrayDifference`, `arrayIntersect`)

## 4. Lightweight perf counters

`DataFrame` now exposes internal counters for benchmark assertions:

```javascript
DataFrame.__resetPerfCounters();
DataFrame.__getPerfCounters();
```

Current counters:

- `fromRecords`
- `fromColumns`
- `toRecords`
- `toArrays`

These are used to ensure critical paths do not regress into row-conversion-heavy implementations.

## Runtime notes

- Node benchmarks (100k rows) are enforced in release validation.
- Apps Script benchmarks (20k rows) are available via `runPerformanceBenchmarks`.
- Functional correctness remains primary: all perf changes ship behind full local + GAS tests.
