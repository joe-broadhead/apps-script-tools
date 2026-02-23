# apps-script-tools

<span class="subtitle">A production-focused Google Apps Script data toolkit</span>

`apps-script-tools` is a library-first toolkit for tabular data workflows in Google Apps Script. It exposes a single public namespace (`AST`) for dataframe-style transforms, SQL execution, and Apps Script workspace IO.

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
- `AST.Cache`: backend-agnostic cache layer for repeated computations and API responses.
- `AST.Telemetry`: request-level tracing spans/events with redaction and sink controls.
- `AST.Jobs`: checkpointed multi-step job runner with retry/resume and status controls.
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
    B --> O[AST.Telemetry]
    B --> T[AST.Jobs]
    D --> F[BigQuery]
    D --> G[Databricks SQL API]
    I --> J[OpenAI / Gemini / Vertex / OpenRouter / Perplexity]
    K --> L[Drive JSON Index + Cosine Retrieval]
    M --> N[GCS / S3 / DBFS APIs]
    Q --> R[Memory / Drive JSON / Script Properties]
    O --> P[Logger / Drive NDJSON]
    T --> U[Script Properties Checkpoints]
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
- `AST.Cache` cache contracts (`get`, `set`, `delete`, `invalidateByTag`, `stats`) for `memory`, `drive_json`, `script_properties`, and `storage_json` (`gcs://`, `s3://`, `dbfs:/`).
- `AST.Telemetry` observability foundation (`startSpan`, `endSpan`, `recordEvent`, `getTrace`) with redaction and sink control.
- `AST.Jobs` orchestration contracts (`run`, `enqueue`, `resume`, `status`, `list`, `cancel`) with persisted checkpoint state.

## Import pattern

In consumer projects, use the library identifier you configured (recommended: `ASTLib`) and normalize once:

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

Then use `ASTX.DataFrame`, `ASTX.Series`, `ASTX.Utils`, and so on.
