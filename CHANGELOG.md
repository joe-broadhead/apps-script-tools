# Changelog

## v0.0.3 (unreleased)

### Added

- New `AST.AI` namespace with:
  - `run`, `text`, `structured`, `tools`, `image`, `providers`, and `capabilities`.
- Multi-provider AI adapters for:
  - OpenAI
  - Gemini (AI Studio)
  - Vertex Gemini
  - OpenRouter
  - Perplexity
- Typed AI error model:
  - `AstAiError`, `AstAiValidationError`, `AstAiAuthError`, `AstAiCapabilityError`,
    `AstAiProviderError`, `AstAiToolExecutionError`, `AstAiToolLoopError`, `AstAiResponseParseError`.
- Bounded auto tool runtime with function-ref and global-name handlers.
- `DataFrame.selectExpr(map, options)` for single-pass passthrough + computed projection.
- `DataFrame.window(spec).assign(map)` for partitioned row-number, lag/lead, and running aggregates.
- Internal SQL provider adapter registry for `ASTX.Sql.run(...)` routing (`validateRequest`, `executeQuery`, `classifyError`).
- Optional live AI smoke workflow:
  - `.github/workflows/integration-ai-live.yml`

### Changed

- Public AST namespace now includes `AST.AI`.
- AI auth/model resolution now checks per-call overrides, then `AST.AI.configure(...)` runtime config, then script properties.
- Script manifest now includes `https://www.googleapis.com/auth/cloud-platform` for Vertex support.
- Test harness defaults now include `PropertiesService` and `ScriptApp` stubs for deterministic local AI tests.
- GAS functional suite now runs AI namespace/tool smoke tests via `runAllTests`.
- `runSqlQuery` now dispatches provider execution through adapter lookup instead of provider branching in the router.
- BigQuery and Databricks polling behavior now uses elapsed-time timeout enforcement with bounded final-sleep intervals.
- Databricks table-load contracts are stricter for mode/schema/merge-key validation.
- `DataFrame.toSheet(...)` mode and header semantics are explicit for append/overwrite/overwriteRange flows.
- Repository clasp model now enforces:
  - root-only `.claspignore`
  - `.clasp.json.example` template guardrails
  - tracked secret/config file blocking in lint

### Fixed

- `DataFrame.selectExpr(...)` projector dispatch edge cases for columnar projector pathways.
- `decrypt(...)` malformed UTF-8 handling now fails closed to `''` while re-throwing non-UTF8/runtime failures.
- BigQuery SQL timeout handling reliability and provider option validation.
- Databricks SQL/load reliability and typed error surfacing (`DatabricksSqlError`, `DatabricksLoadError`).

### CI / Docs

- Expanded docs with AI contracts/providers/tool-calling and AI security guidance.
- Expanded docs with DataFrame patterns for `selectExpr` and window workflows.
- Added SQL contract docs for adapter-routed execution and provider-specific error semantics.

## v0.0.2

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

Initial public release for `apps-script-tools`.

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
