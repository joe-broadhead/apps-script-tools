# Changelog

## v0.0.2 (release candidate)

### Added

- `DataFrame.fromColumns(columns, options)` for high-throughput columnar construction.
- `DataFrame.toColumns(options)` for column-oriented export paths.
- Local Node performance harness under `tests/perf` with benchmark runners and threshold checks.
- Apps Script performance suite entrypoint: `runPerformanceBenchmarks`.
- Performance documentation section (architecture, benchmarks, optimization playbook).

### Changed

- `DataFrame.fromRecords` now builds columns in a single pass before constructing `Series`.
- `DataFrame.sort` and `DataFrame.dropDuplicates` use index/key strategies that avoid mandatory row materialization.
- `DataFrame.toArrays` now reads column arrays directly.
- Join and dedupe key handling canonicalizes object/date values and normalizes null/undefined/missing comparisons.
- Set-like utilities (`arrayUnion`, `arrayDifference`, `arrayIntersect`) now use canonical key semantics.
- `DataFrame.generateSurrogateKey(...)` now preserves caller-provided column arrays (no input mutation).
- Databricks SQL failures now throw provider-specific errors instead of returning `null`.
- SQL placeholder replacement now escapes placeholder keys for regex-safe matching.

### CI / Release

- Added blocking `perf-gate` (`npm run test:perf:check`) to PR CI.
- Kept `perf-report` benchmark artifact job for visibility.
- Added performance threshold gate (`npm run test:perf:check`) to release validation.
- Extended Apps Script integration workflow dispatch to support functional/perf suite selection.

## v0.0.1

### Fixed

- Date utilities now accept cross-context `Date` objects when called from consumer Apps Script projects.
- `dateAdd`, `dateSub`, and `dateDiff` now validate via `convertDateToUnixTimestamp` instead of realm-specific `instanceof` checks.
- Release workflow no longer hardcodes stale Apps Script version mappings in generated release notes.

### Tests

- Added local regression coverage for cross-context `Date` handling.
- Added Apps Script regression cases for `convertDateToUnixTimestamp` and `dateAdd` with Date-like inputs.

### Docs

- Expanded getting-started, API, operations, and release docs with detailed contracts, examples, and troubleshooting.
- Added pages for SQL contracts, DataFrame patterns, and operational troubleshooting.

## v0.0.0

Initial public release candidate for `apps-script-tools`.

### Added

- Stable public namespace: `AST`.
- Utility namespace: `AST.Utils` (includes helpers like `arraySum`).
- `DataFrame.groupBy(keys)` API.
- BigQuery table load support.
- Local Node-based test harness and CI checks.
- MkDocs documentation site and GitHub Pages deployment workflow.

### Changed

- `Series.query()` now accepts function predicates only.
- SQL execution now uses validated request objects.
- `DataFrame.toTable()` uses validated request payloads.

### Fixed

- `dateSub()` subtraction semantics.
- BigQuery empty result handling returns `DataFrame`.
- CSV serialization preserves falsy values (`0`, `false`, `""`).
- Removed debug logging from SHA-256 utility.
