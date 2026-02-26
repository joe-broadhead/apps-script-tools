# Changelog

## v0.0.5 (unreleased)

### Added

- CI security workflows:
  - `Security - CodeQL` (`.github/workflows/security-codeql.yml`)
  - `Security - Dependency Review` (`.github/workflows/security-dependency-review.yml`)
  - `Security - Secret Scan` (`.github/workflows/security-secret-scan.yml`)
- Deterministic local secret scanning command:
  - `npm run test:security` via `scripts/security-scan.mjs`
- Repo-scoped secret-scan allowlist for non-production fixtures:
  - `.security/secret-scan-allowlist.json`
- New `AST.DBT` namespace with:
  - `run`, `loadManifest`, `inspectManifest`, `listEntities`, `search`
  - `getEntity`, `getColumn`, `lineage`
  - `providers`, `capabilities`
  - `validateManifest`, `configure`, `getConfig`, `clearConfig`
- dbt manifest source loading support for:
  - `drive://file/<id>`
  - `drive://path/<folderId>/<fileName>`
  - `gcs://`, `s3://`, and `dbfs:/` via `AST.Storage` read contracts
- dbt manifest validation modes:
  - `strict`, `basic`, `off` for `manifest_v12` contracts
- Preindexed manifest bundle model for fast repeated lookup/search:
  - `byUniqueId`, `bySection`, `byResourceType`, `byPackage`, `byTag`
  - `columnsByUniqueId` and token indexes for entities/columns
  - lineage normalization from `parent_map`/`child_map` with `depends_on.nodes` fallback
- New docs:
  - `getting-started/dbt-manifest-quickstart.md`
  - `api/dbt-manifest-contracts.md`
  - `api/dbt-manifest-search.md`
- New `AST.Secrets` namespace with:
  - `run`, `get`, `set`, `delete`
  - `providers`, `capabilities`
  - `configure`, `getConfig`, `clearConfig`
  - `resolveValue` for `secret://...` references
- Secret providers:
  - `script_properties` (`get/set/delete`)
  - `secret_manager` (`get`)
- New typed secrets errors:
  - `AstSecretsError`, `AstSecretsValidationError`, `AstSecretsAuthError`
  - `AstSecretsCapabilityError`, `AstSecretsProviderError`, `AstSecretsNotFoundError`
  - `AstSecretsParseError`
- New docs:
  - `api/secrets-contracts.md`
- New `AST.Triggers` namespace with:
  - `run`, `upsert`, `list`, `delete`, `runNow`
  - `configure`, `getConfig`, `clearConfig`
- Trigger orchestration contracts:
  - idempotent upsert identity over schedule + dispatch definition
  - time-based schedules (`every_minutes`, `every_hours`, `every_days`, `every_weeks`)
  - dispatcher path to direct handlers or `AST.Jobs` enqueue/resume
  - `dryRun` planning mode for non-mutating validation
- New docs:
  - `api/triggers-contracts.md`

### Changed

- `AST` namespace now exposes `AST.DBT`.
- `AST` namespace now exposes `AST.Secrets`.
- `AST` namespace now exposes `AST.Triggers`.
- `AST.Runtime.configureFromProps(...)` now supports module `DBT`.
- `AST.Runtime.configureFromProps(...)` now supports module `Secrets`.
- `AST.Runtime.configureFromProps(...)` now supports module `Triggers`.
- Local/perf test suites now include DBT manifest coverage and performance thresholds.
- `AST.AI`, `AST.RAG`, and `AST.Storage` config resolution now supports optional `secret://...` values through `AST.Secrets.resolveValue(...)`.

## v0.0.4 - 2026-02-25

### Added

- New `AST.Cache` namespace with:
  - `get`, `set`, `delete`, `invalidateByTag`, `stats`
  - `backends`, `capabilities`
  - `configure`, `getConfig`, `clearConfig`, `clear`
- New `AST.Jobs` namespace with:
  - `run`, `enqueue`, `resume`, `status`, `list`, `cancel`
  - `configure`, `getConfig`, `clearConfig`
- New `AST.Chat` namespace with:
  - `configure`, `getConfig`, `clearConfig`
  - `ThreadStore.create(config)` for durable user-scoped chat state
  - store methods: `getOrCreateState`, `listThreads`, `getThread`, `newThread`, `switchThread`, `appendTurn`, `buildHistory`, `clearUser`
- New `AST.Config` namespace with:
  - `fromScriptProperties(options)` for normalized script property snapshots.
- New `AST.Runtime` namespace with:
  - `configureFromProps(options)` and `modules()` for one-shot runtime bootstrap.
- Cache backend support:
  - `memory`
  - `drive_json`
  - `script_properties`
  - `storage_json` (AST.Storage-backed via `gcs://`, `s3://`, or `dbfs:/` URI)
- Deterministic cache TTL semantics (`ttlSec`) and tag-based invalidation contracts.
- New `AST.AI.stream(request)` helper with callback-based `start` / `token` / `tool_call` / `tool_result` / `done` / `error` event emission.
- AI tool-runtime guardrails:
  - per-tool timeout (`timeoutMs`)
  - argument/result payload caps (`maxArgsBytes`, `maxResultBytes`)
  - bounded handler retries (`retries`)
  - idempotent replay controls (`idempotencyKeyFromArgs`, `idempotencyKey`)
- New typed tool guardrail errors:
  - `AstAiToolTimeoutError`
  - `AstAiToolPayloadLimitError`
  - `AstAiToolIdempotencyError`
- AI provider routing and fallback contract (`request.routing`) with:
  - candidate-based selection (`priority`, `fastest`, `cost_first`)
  - deterministic retry/failover policy controls
  - response/error attempt trace metadata (`response.route` and `error.details.route`)
- Structured output reliability layer for `AST.AI.structured(...)`:
  - schema validation pass over normalized provider JSON
  - bounded retry policy (`options.reliability.maxSchemaRetries`)
  - optional repair modes (`json_repair`, `llm_repair`)
  - deterministic diagnostics on failure (`AstAiResponseParseError.details.attempts`)
- New `AST.AI.OutputRepair.continueIfTruncated(...)` helper for bounded continuation repair of partial/truncated text outputs.
- New `AST.Telemetry` namespace with:
  - `configure`, `getConfig`, `clearConfig`
  - `startSpan`, `endSpan`, `recordEvent`, `getTrace`
- New `AST.TelemetryHelpers` namespace with:
  - `startSpanSafe`, `endSpanSafe`, `recordEventSafe`
  - `withSpan`, `wrap`
- Telemetry foundation module with:
  - typed errors (`AstTelemetryError`, `AstTelemetryValidationError`, `AstTelemetryCapabilityError`)
  - secret redaction (`apiKey`, `token`, `authorization`, `cookie`, etc.)
  - sink support for `logger` and Drive NDJSON (`drive_json`)
- `Telemetry drive_json` sink now uses partitioned NDJSON batch writes (no full-file read/append path), honoring `flushMode`, `batchMaxEvents`, `batchMaxBytes`, and explicit `AST.Telemetry.flush()`.
- Runtime instrumentation for:
  - `AST.AI` request execution (`ai.run` spans)
  - `AST.RAG.buildIndex(...)` (`rag.buildIndex` spans)
  - `AST.RAG.answer(...)` (`rag.answer` spans)
- New `AST.RAG` namespace with:
  - `configure`, `getConfig`, `clearConfig`
  - `buildIndex`, `syncIndex`, `search`, `answer`, `inspectIndex`
  - `embeddingProviders`, `embeddingCapabilities`
  - `registerEmbeddingProvider`, `unregisterEmbeddingProvider`
- RAG retrieval UX/interop APIs:
  - `previewSources(...)` for citation-ready source cards + reusable retrieval payloads
  - `buildRetrievalCacheKey(...)`, `putRetrievalPayload(...)`, `getRetrievalPayload(...)`, `deleteRetrievalPayload(...)`
  - `IndexManager.create(...).ensure/sync/fastState` convenience wrapper over build/sync/inspect
- New public RAG utility helpers:
  - `AST.RAG.Citations.normalizeInline/extractInlineIds/filterForAnswer/toUrl`
  - `AST.RAG.Fallback.fromCitations(...)` deterministic citation-only fallback builder
- `AST.RAG.answer(...)` now supports retrieval recovery controls (`retrieval.recovery`) and deterministic fallback policy controls (`fallback.onRetrievalError`, `fallback.onRetrievalEmpty`).
- `AST.RAG.answer(...)` supports stable retrieval/generation diagnostics (`diagnostics.totalMs`, `pipelinePath`, per-phase timing/status fields) when enabled via `options.diagnostics` or `RAG_DIAGNOSTICS_ENABLED`.
- Drive-only source ingestion for:
  - plain text (`text/plain`)
  - PDF (`application/pdf`)
  - Google Docs
  - Google Slides (slide text + speaker notes)
- Drive JSON index lifecycle with source fingerprinting and chunk metadata.
- Embedding provider registry with built-ins (`openai`, `gemini`, `vertex_gemini`, `openrouter`, `perplexity`) plus runtime custom provider registration.
- Grounded answer orchestration with citation IDs (`S1..Sn`) and abstention behavior (`status=insufficient_context`).
- Hybrid RAG retrieval mode (`mode=hybrid`) with weighted vector + lexical score fusion.
- Lexical-only RAG retrieval mode (`mode=lexical`) for no-embedding low-latency retrieval paths.
- Optional RAG reranking (`retrieval.rerank`) for top-N post-rank refinement.
- RAG access-control contract for retrieval and answer flows (`retrieval.access`) with enforceable source/citation boundaries.
- Search/answer retrieval responses now expose explainability fields: `vectorScore`, `lexicalScore`, `finalScore`, and `rerankScore` (when enabled).
- `RAG.answer(...)` now accepts retrieval payload reuse (`retrievalPayload` or `retrievalPayloadKey`) to skip re-search/embedding on hot paths.
- `RAG.previewSources(...)` retrieval-payload cache key generation now reuses the already-normalized search request (no second search-contract validation pass), with regression coverage for single-load hot paths.
- `RAG.search(...)` and `RAG.answer(...)` now support retrieval latency budgets via `options.maxRetrievalMs`, with typed timeout errors (`AstRagRetrievalError` with `details.timedOut=true`).
- `RAG.answer(...)` timeout policy controls via `options.onRetrievalTimeout` (`error`, `insufficient_context`, `fallback`).
- `RAG.answer(...)` prompt customization controls via `generation.instructions`, `generation.style`, and `generation.forbiddenPhrases`.
- RAG diagnostics now include cache backend/lock metadata and lock timings (`cache.backend`, `cache.namespace`, `cache.lockScope`, `cache.lockContention`, `timings.lockWaitMs`).
- RAG cache config now supports `lockScope` (`script`, `user`, `none`) including runtime/script-property resolution (`RAG_CACHE_LOCK_SCOPE`).
- DataFrame schema contract APIs:
  - `DataFrame.validateSchema(...)` / `df.validateSchema(...)` for deterministic validation reports.
  - `DataFrame.enforceSchema(...)` / `df.enforceSchema(...)` for coercion + strict enforcement workflows.
- DataFrame expression DSL foundation:
  - `df.selectExprDsl(map, options)` with a safe parser/evaluator contract (no dynamic code execution).
  - bounded compiled-plan cache for repeated expression execution.
- New `AST.Storage` namespace with:
  - `run`, `list`, `head`, `read`, `write`, `delete`
  - `exists`, `copy`, `move`, `signedUrl`, `multipartWrite`
  - `providers`, `capabilities`
  - `configure`, `getConfig`, `clearConfig`
- SQL ergonomics APIs:
  - `AST.Sql.prepare(...)`
  - `AST.Sql.executePrepared(...)`
  - `AST.Sql.status(...)`
  - `AST.Sql.cancel(...)`
  - `AST.Sql.providers()` / `AST.Sql.capabilities(provider)`
- Unified storage URI model:
  - `gcs://bucket/key`
  - `s3://bucket/key`
  - `dbfs:/path`
- Storage adapters for:
  - Google Cloud Storage (OAuth + service-account JWT exchange)
  - Amazon S3 (SigV4 signing)
  - Databricks DBFS (`/api/2.0/dbfs/*`)
- Typed storage error model:
  - `AstStorageError`, `AstStorageValidationError`, `AstStorageAuthError`,
    `AstStorageCapabilityError`, `AstStorageNotFoundError`, `AstStorageProviderError`,
    `AstStorageParseError`.
- Storage docs set:
  - `getting-started/storage-quickstart.md`
  - `api/storage-contracts.md`
  - `api/storage-providers.md`
  - `operations/storage-security.md`
- New typed RAG errors:
  - `AstRagError`, `AstRagValidationError`, `AstRagAuthError`, `AstRagAccessError`, `AstRagSourceError`,
    `AstRagIndexError`, `AstRagRetrievalError`, `AstRagEmbeddingCapabilityError`, `AstRagGroundingError`.
- RAG docs set:
  - `getting-started/rag-quickstart.md`
  - `api/rag-contracts.md`
  - `api/rag-embedding-providers.md`
  - `operations/rag-indexing.md`
- Cookbook scaffolding for project-specific Apps Script apps:
  - `cookbooks/_template/` with isolated `clasp` project model (`rootDir=src`)
  - `docs/getting-started/cookbooks.md` for setup and separation guidance

### Changed

- `AST.VERSION` and package version set to `0.0.4` for this release line.
- Breaking: internal non-`AST` top-level functions are now strictly internalized (`ast*` / `__ast*` / `*_` naming). Downstream consumers must use documented `AST` namespace APIs instead of direct global helper/function names.
- `AST` namespace now exposes `AST.RAG`.
- `AST` namespace now exposes `AST.Cache`.
- `AST` namespace now exposes `AST.Storage`.
- `AST` namespace now exposes `AST.Config`.
- `AST` namespace now exposes `AST.Runtime`.
- `AST` namespace now exposes `AST.Telemetry`.
- `AST` namespace now exposes `AST.TelemetryHelpers`.
- Local test harness defaults now include `Utilities.base64Encode` and `MimeType.PLAIN_TEXT` for deterministic RAG runtime tests.
- `AST` namespace now exposes `AST.Chat`.
- GAS functional suite now includes RAG namespace and grounded-answer smoke coverage.
- GAS functional suite now includes telemetry namespace smoke coverage.
- GAS and local AI tool-runtime suites now include idempotent replay coverage and guardrail contract validation.
- Storage `options.timeoutMs` is now enforced as a retry-budget timeout window across GCS, S3, and DBFS HTTP execution paths.
- Storage read paths now emit soft-cap warnings when payload size exceeds the 50 MB stability threshold.
- GAS functional integration is now reusable from CI (`gas-functional`) instead of manual-dispatch only.
- Removed unused storage URI parser helpers and removed dead `GCS_DEFAULT_BUCKET` config path.
- SQL provider adapters now expose execution-control hooks (`executePrepared`, `getStatus`, `cancelExecution`) in addition to `executeQuery`.
- BigQuery and Databricks SQL modules now expose detailed execution metadata helpers used by prepared execution and status/cancel workflows.

## v0.0.3

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
