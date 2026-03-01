# Changelog

## v0.0.5 (unreleased)

### Added

- New `AST.Http` namespace with:
  - `request`, `requestBatch`
  - `capabilities`
  - `configure`, `getConfig`, `clearConfig`
- HTTP docs:
  - `api/http-contracts.md`
- New `AST.Messaging` namespace with:
  - `run`, `operations`, `capabilities`
  - `configure`, `getConfig`, `clearConfig`
  - `email.*` send/draft/mailbox methods
  - `chat.*` webhook/API send and read methods
  - `tracking.*` pixel/link/event helper methods
  - `logs.*` list/get/delete event logs
- Messaging reliability/runtime features:
  - mutation dry-run planning (`options.dryRun`)
  - idempotent send replay protection
  - bounded retry handling for transient provider failures
  - optional async enqueue via `AST.Jobs`
  - default durable log backend (`drive_json`) with backend overrides
- New messaging docs:
  - `getting-started/messaging-quickstart.md`
  - `api/messaging-contracts.md`
  - `api/messaging-email.md`
  - `api/messaging-chat.md`
  - `operations/messaging-security.md`
- CI security workflows:
  - `Security - CodeQL` (`.github/workflows/security-codeql.yml`)
  - `Security - Dependency Review` (`.github/workflows/security-dependency-review.yml`)
  - `Security - Secret Scan` (`.github/workflows/security-secret-scan.yml`)
- Deterministic local secret scanning command:
  - `npm run test:security` via `scripts/security-scan.mjs`
- Repo-scoped secret-scan allowlist for non-production fixtures:
  - `.security/secret-scan-allowlist.json`
- New `AST.DBT` namespace with:
  - `run`, `loadManifest`, `loadArtifact`, `inspectManifest`, `inspectArtifact`
  - `listEntities`, `search`, `getEntity`, `getColumn`, `lineage`
  - `diffEntities`, `impact`
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
  - `api/dbt-artifacts-impact.md`
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
- GitHub App + webhook security additions:
  - new helpers: `AST.GitHub.authAsApp(...)`, `AST.GitHub.verifyWebhook(...)`, `AST.GitHub.parseWebhook(...)`
  - app credential config keys: `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY`
  - webhook secret config key: `GITHUB_WEBHOOK_SECRET`
  - app/webhook operation groups in `AST.GitHub.operations()` and `capabilities(...)`
  - local + GAS contract coverage for app auth dry-run, token exchange path, and signature verification
- Messaging chat transport expansion:
  - new transports: `slack_webhook`, `slack_api`, and `teams_webhook`
  - added config keys: `MESSAGING_SLACK_WEBHOOK_URL`, `MESSAGING_SLACK_BOT_TOKEN`, `MESSAGING_SLACK_CHANNEL`, `MESSAGING_SLACK_API_BASE_URL`, `MESSAGING_TEAMS_WEBHOOK_URL`
  - chat read operations remain constrained to `chat_api` transport
  - local test coverage for Slack/Teams send paths, validation contracts, and capability discovery

### Changed

- `AST` namespace now exposes `AST.DBT`.
- `AST` namespace now exposes `AST.Secrets`.
- `AST` namespace now exposes `AST.Triggers`.
- `AST.Runtime.configureFromProps(...)` now supports module `DBT`.
- `AST.Runtime.configureFromProps(...)` now supports module `Secrets`.
- `AST.Runtime.configureFromProps(...)` now supports module `Triggers`.
- Added transformation ergonomics:
  - `Series.map(mapper, options)` with callback / object / `Map` / `Series` mapper support.
  - `DataFrame.apply(fn, options)` with explicit axis handling and deterministic scalar/tabular/DataFrame return-shape contracts.
  - `DataFrame.applyMap(fn)` for element-wise non-mutating transforms.
- `DataFrame` now rejects column names that collide with reserved DataFrame members (for example `sort`, `len`, `columns`, `data`, `index`) to prevent method/property shadowing on instances.
- `GroupBy.agg(...)` and `GroupBy.apply(...)` now return deterministic empty `DataFrame` results for zero-row inputs instead of throwing via `DataFrame.concat([])`.
- `Series.dt.toDateString()` now honors `useUTC` consistently, and `Series` now constructs `DateMethods` with the normalized single-argument constructor (`new DateMethods(this)`).
- `AST.Config.fromScriptProperties(...)` now defaults implicit ScriptProperties reads to fresh snapshots (avoids stale shared memoized defaults in warm GAS web-app runtimes); optional `cacheDefaultHandle=true` re-enables implicit-handle memoization.
- `AST.Runtime.configureFromProps(...)` now forwards explicit ScriptProperties handle and config snapshot controls (`scriptProperties`, `disableCache`, `forceRefresh`, `cacheScopeId`, `cacheDefaultHandle`) to `AST.Config.fromScriptProperties(...)`.
- Local/perf test suites now include DBT manifest coverage and performance thresholds.
- Local/perf test suites now include DBT artifact/diff/impact coverage and deterministic diff benchmark thresholds.
- Data docs and perf gate coverage for pandas-parity methods:
  - new docs page: `docs/api/pandas-compatibility-matrix.md`
  - expanded API docs/examples for `sample`, `join`, `pivotTable`, `apply`, delta methods, and statistical selectors
  - new perf checks: `dataframe.sample_n1000_100000`, `dataframe.join_inner_on_100000`, `dataframe.apply_rows_20000`, `dataframe.pivotTable_sum_50000`
- Additional pandas-parity method coverage:
  - `DataFrame`: `isNull`/`isNa`, `notNull`/`notNa`, `duplicated`, `nunique`, `valueCounts`, `agg`, `transform`
  - `Series`: `agg`, `interpolate`, `toFrame`
- `AST.AI`, `AST.RAG`, and `AST.Storage` config resolution now supports optional `secret://...` values through `AST.Secrets.resolveValue(...)`.
- `AST.Cache` now includes batch primitives for high-throughput workloads: `getMany`, `setMany`, `fetchMany`, and `deleteMany` with per-item status/aggregate stats outputs.
- `AST.Storage` now includes bulk prefix operations: `walk`, `copyPrefix`, `deletePrefix`, and `sync` (with `dryRun`, `maxObjects`, filter controls, and per-item progress/failure summaries).

## v0.0.4 - 2026-02-25

### Added

- New `AST.GitHub` namespace with:
  - `run` + helper methods for repo/branch/commit/file/issue/PR/release/tag/search flows
  - `graphql(...)` for explicit GraphQL queries/mutations
  - `operations`, `providers`, `capabilities`, `configure`, `getConfig`, `clearConfig`
- GitHub operation registry and typed error model:
  - `AstGitHubError`, `AstGitHubValidationError`, `AstGitHubAuthError`, `AstGitHubNotFoundError`
  - `AstGitHubRateLimitError`, `AstGitHubConflictError`, `AstGitHubCapabilityError`
  - `AstGitHubProviderError`, `AstGitHubParseError`
- GitHub mutation dry-run planning (`options.dryRun=true`) with deterministic `plannedRequest` payloads.
- GitHub GraphQL client support with typed GraphQL error mapping and optional cache/ETag revalidation.
- GitHub read cache + ETag revalidation policy with stale-on-error fallback support.
- GitHub local/perf/GAS test coverage:
  - local: namespace, validation, config precedence, read/write routing, dry-run, graphql, cache/etag, rate-limit, typed errors
  - perf: `github.cache_profile` benchmark with warm-cache and ETag ratio thresholds
  - GAS: namespace and contract smoke tests in `runAllTests`
- GitHub docs set:
  - `getting-started/github-quickstart.md`
  - `api/github-contracts.md`
  - `api/github-operations.md`
  - `operations/github-security.md`

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

- `AST.VERSION` and package version moved to `0.0.5` development line.
- `AST` namespace now exposes `AST.GitHub`.
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

## v0.0.3 - 2026-02-21

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

## v0.0.2 - 2026-02-19

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

## v0.0.1 - 2026-02-19

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

## v0.0.0 - 2026-02-18

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
