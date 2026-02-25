# apps-script-tools

<span class="subtitle">A production-focused Google Apps Script data toolkit</span>

`apps-script-tools` is a library-first toolkit for production Apps Script workflows. It exposes a single public namespace (`AST`) for dataframe transforms, SQL execution, workspace helpers, AI/RAG, storage, caching, telemetry, jobs, and chat state.

## Who this is for

- Teams building Apps Script automations that need more than raw 2D arrays.
- Projects that need a consistent API across Sheets, Drive, BigQuery, and Databricks.
- Library consumers who want a typed interface (`Series`, `DataFrame`, `GroupBy`) in Apps Script.

## Core surfaces

- `AST.Series`: vector-style operations over one column.
- `AST.DataFrame`: tabular transforms, joins, grouping, sorting, output.
- `AST.GroupBy`: grouped aggregations and grouped transforms.
- `AST.Sheets`: sheet open helpers and enhanced sheet classes.
- `AST.Drive`: read/write helpers for drive-backed file workflows.
- `AST.AI`: multi-provider text, structured output, tool calling, and image generation.
- `AST.RAG`: Drive-backed indexing, retrieval, and grounded answering with citations.
- `AST.Storage`: cross-provider object storage for GCS, S3, and DBFS.
- `AST.Cache`: backend-agnostic cache layer for repeated computations and API responses (single-key ops + invalidation/stats).
- `AST.Config`: script-properties snapshot helpers for configuration bootstrap.
- `AST.Runtime`: runtime configuration hydration across AST namespaces.
- `AST.Telemetry`: request-level tracing spans/events with redaction and sink controls.
- `AST.TelemetryHelpers`: safe wrappers for span lifecycle orchestration.
- `AST.Jobs`: script-properties checkpointed multi-step job runner with retry/resume and status controls.
- `AST.Chat`: durable user-scoped thread persistence and bounded history assembly.
- `AST.Sql`: validated SQL execution for Databricks and BigQuery.
- `AST.Utils`: utility helpers (`arraySum`, `dateAdd`, `toSnakeCase`, and others).

## Architecture at a glance

```mermaid
flowchart LR
    A[Consumer Script] --> B[AST Namespace]
    B --> C[Series/DataFrame/GroupBy]
    B --> D[AST.Sql]
    B --> E[AST.Sheets / AST.Drive]
    B --> I[AST.AI]
    B --> K[AST.RAG]
    B --> M[AST.Storage]
    B --> Q[AST.Cache]
    B --> S[AST.Config / AST.Runtime]
    B --> O[AST.Telemetry]
    B --> V[AST.TelemetryHelpers]
    B --> T[AST.Jobs]
    B --> W[AST.Chat]
    D --> F[BigQuery]
    D --> G[Databricks SQL API]
    I --> J[OpenAI / Gemini / Vertex / OpenRouter / Perplexity]
    K --> L[Drive JSON Index + Cosine Retrieval]
    M --> N[GCS / S3 / DBFS APIs]
    Q --> R["Memory / Drive JSON / Script Properties / Storage JSON"]
    O --> P[Logger / Drive NDJSON / Storage NDJSON]
    T --> U["Script Properties Checkpoints"]
    W --> X["Durable Thread Store"]
    C --> H[Records / Arrays / Sheets]
```

## Public release

- Current published release: `v0.0.3`
- Next release target on `master`: `v0.0.4` (unreleased)
- Script ID: `1gZ_6DiLeDhh-a4qcezluTFDshw4OEhTXbeD3wthl_UdHEAFkXf6i6Ho_`
- Docs: <https://joe-broadhead.github.io/apps-script-tools/>

## `v0.0.4` release-line scope

- `AST.RAG` module for Drive-only ingestion (`txt`, `pdf`, Docs, Slides + speaker notes).
- Embedding provider registry with built-ins and runtime custom provider registration.
- Grounded answering with strict citation mapping and deterministic abstention behavior.
- Drive JSON index lifecycle APIs (`buildIndex`, `syncIndex`, `inspectIndex`, `search`, `answer`).
- `AST.Storage` unified CRUD contracts (`list`, `head`, `read`, `write`, `delete`) for `gcs`, `s3`, and `dbfs`.
- `AST.Cache` cache contracts (`get`, `set`, `delete`, `invalidateByTag`, `stats`, `clear`) for `memory`, `drive_json`, `script_properties`, and `storage_json` (`gcs://`, `s3://`, `dbfs:/`).
- `AST.Telemetry` observability foundation (`startSpan`, `endSpan`, `recordEvent`, `getTrace`, `flush`) with redaction and sink control.
- `AST.Config.fromScriptProperties(...)` + `AST.Runtime.configureFromProps(...)` to bootstrap module runtime config from Script Properties.
- `AST.TelemetryHelpers` wrappers (`withSpan`, `wrap`, safe start/end/event helpers) for non-blocking app instrumentation.
- RAG hot-path cache controls for embedding/search/answer reuse across repeated queries.
- `AST.Jobs` orchestration contracts (`run`, `enqueue`, `resume`, `status`, `list`, `cancel`) with script-properties checkpoint state.
- `AST.Chat` `ThreadStore` contracts for per-user durable thread state and deterministic history bounds.
- Breaking contract: internal non-`AST` top-level globals are intentionally not stable; consume APIs through `ASTX.*` only.

## Import pattern

In consumer projects, use the library identifier you configured (recommended: `ASTLib`) and normalize once:

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

Then use `ASTX.DataFrame`, `ASTX.Series`, `ASTX.Utils`, and so on.
