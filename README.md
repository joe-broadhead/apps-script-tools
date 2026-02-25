# 🚀 apps-script-tools

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Google Apps Script Library](https://img.shields.io/badge/Google%20Apps%20Script-library-34A853?logo=google&logoColor=white)](https://script.google.com/)
[![Docs](https://img.shields.io/badge/docs-mkdocs%20material-blue.svg?logo=materialformkdocs&logoColor=white)](https://joe-broadhead.github.io/apps-script-tools/)
[![Release](https://img.shields.io/github/v/release/joe-broadhead/apps-script-tools?label=release&logo=github)](https://github.com/joe-broadhead/apps-script-tools/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/joe-broadhead/apps-script-tools/ci.yml?branch=master&label=CI)](https://github.com/joe-broadhead/apps-script-tools/actions/workflows/ci.yml)

</div>

```text
    _    ____  ____  ____    ____   ____ ____  ____ ___ ____ _____
   / \  |  _ \|  _ \/ ___|  / ___| / ___|  _ \|_ _|_ _|  _ \_   _|
  / _ \ | |_) | |_) \___ \  \___ \| |   | |_) || | | || |_) || |
 / ___ \|  __/|  __/ ___) |  ___) | |___|  _ < | | | ||  __/ | |
/_/   \_\_|   |_|   |____/  |____/ \____|_| \_\___|___|_|    |_|

 _____ ___   ___  _     ____
|_   _/ _ \ / _ \| |   / ___|
  | || | | | | | | |   \___ \
  | || |_| | |_| | |___ ___) |
  |_| \___/ \___/|_____|____/

     Practical data workflows for Google Apps Script.
```

`apps-script-tools` provides a unified `AST` namespace for:

- `AST.Series`: typed series operations
- `AST.DataFrame`: tabular transformations and IO
- `AST.GroupBy`: grouped aggregation/apply workflows
- `AST.Sheets` + `AST.Drive`: workspace helpers
- `AST.Storage`: object storage CRUD for GCS, S3, and DBFS
- `AST.Cache`: backend-agnostic caching (memory, Drive JSON, script properties, Storage URI) with single-key ops, tag invalidation, and stats
- `AST.Config`: script-properties snapshot helpers for runtime bootstrap
- `AST.Runtime`: one-shot runtime config hydration across namespaces
- `AST.Telemetry`: trace spans/events with redaction and sink controls
- `AST.TelemetryHelpers`: safe span/event wrappers for app workflows
- `AST.Jobs`: script-properties checkpointed multi-step job orchestration with retry/resume semantics
- `AST.Chat`: durable user-scoped thread state store for chat apps
- `AST.AI`: unified AI providers, structured outputs, tools, and image flows
- `AST.RAG`: Drive indexing, retrieval, and grounded Q&A with citations
- `AST.DBT`: dbt `manifest.json` loading, indexing, search, and lineage helpers
- `AST.Sql`: Databricks/BigQuery execution with prepared statements + status/cancel controls
- `AST.Utils`: utility helpers like `arraySum`, `dateAdd`, `toSnakeCase`

Current release state:

- Published: `v0.0.4`
- Next release target on `master`: `v0.0.5` (unreleased)

`v0.0.5` (in progress) highlights:

- New `AST.DBT` module with:
  - `loadManifest`, `inspectManifest`, `listEntities`, `search`, `getEntity`, `getColumn`, `lineage`
  - provider loading via `drive://file/<id>`, `drive://path/<folderId>/<fileName>`, `gcs://`, `s3://`, and `dbfs:/`
  - strict/basic/off v12 validation modes
  - preindexed manifest bundle for fast repeated lookup/search

`v0.0.4` release highlights:

- New `AST.RAG` module with Drive ingestion (`txt`, `pdf`, Docs, Slides + notes).
- RAG embedding registry with built-in providers and runtime custom provider registration.
- Grounded `RAG.answer(...)` orchestration with strict citation mapping and abstention.
- Drive JSON index lifecycle APIs: `buildIndex`, `syncIndex`, `search`, `previewSources`, `answer`, `inspectIndex`.
- RAG retrieval payload interop APIs for preview-to-answer reuse: `buildRetrievalCacheKey`, `putRetrievalPayload`, `getRetrievalPayload`, `deleteRetrievalPayload`.
- RAG index orchestration wrapper: `AST.RAG.IndexManager.create(...).ensure/sync/fastState`.
- Retrieval mode support in `RAG.search(...)` / `RAG.answer(...)` for `vector`, `hybrid`, and `lexical` (no-embedding) paths, plus optional reranking with explainable score fields (`vectorScore`, `lexicalScore`, `finalScore`).
- RAG retrieval access-control (`retrieval.access`) and citation/source policy enforcement (`options.enforceAccessControl`).
- New `AST.Storage` module with unified URI contracts and CRUD operations across `gcs`, `s3`, and `dbfs`.
- Storage advanced ops: `exists`, `copy`, `move`, `signedUrl`, and `multipartWrite` for production object workflows.
- SQL ergonomics: `prepare`, `executePrepared`, `status`, and `cancel` on top of provider-routed `run`.
- New `AST.Cache` module with deterministic TTL semantics, tag invalidation, backend selection, and namespace stats/clear helpers.
- Cache backend posture for production: prefer `storage_json`; use `drive_json` and `script_properties` only for low-scale paths.
- New `AST.Telemetry` module with typed spans/events, secret redaction, and `logger`/Drive/storage NDJSON sinks (including batched `drive_json`/`storage_json` + `flush`).
- New bootstrap helpers: `AST.Config.fromScriptProperties(...)` and `AST.Runtime.configureFromProps(...)`.
- New `AST.TelemetryHelpers` wrappers for safe instrumented execution (`withSpan`, `wrap`, `startSpanSafe`, `endSpanSafe`).
- RAG request-level cache controls for embedding/search/answer hot paths with backend overrides.
- New `AST.Jobs` module with script-properties checkpointing and run/enqueue/resume/status/list/cancel contracts.
- New `AST.Chat` module with `ThreadStore.create(...)` for user-scoped thread persistence, lock-aware writes, and bounded history assembly.
- Breaking contract: internal non-`AST` top-level globals are intentionally unstable; consume documented surfaces through `ASTX.*` only.
- DataFrame schema contracts with `validateSchema(...)` reporting and `enforceSchema(...)` strict/coercion pathways.
- `AST.AI.tools(...)` guardrails for timeout, payload caps, retries, and idempotent replay.
- `AST.AI.structured(...)` reliability policy with schema retries and optional JSON/LLM repair.
- `AST.AI.OutputRepair.continueIfTruncated(...)` helper for bounded continuation of truncated outputs.
- `AST.RAG.Citations.*` utility helpers for inline normalization, filtering, and source-link mapping.
- `AST.RAG.Fallback.fromCitations(...)` deterministic citation-only fallback synthesis.
- `AST.RAG.answer(...)` recovery controls (`retrieval.recovery`) and optional per-phase diagnostics (`options.diagnostics` or `RAG_DIAGNOSTICS_ENABLED`).
- `AST.RAG.answer(...)` fallback controls for retrieval error/empty paths (`fallback.onRetrievalError`, `fallback.onRetrievalEmpty`).
- `AST.RAG.search(...)` / `AST.RAG.answer(...)` retrieval latency budgets (`options.maxRetrievalMs`) and answer timeout policy (`options.onRetrievalTimeout`).
- `AST.RAG.answer(...)` prompt controls (`generation.instructions`, `generation.style`, `generation.forbiddenPhrases`) with grounding preserved.
- `AST.RAG.search(...)` / `AST.RAG.answer(...)` lexical prefilter control (`retrieval.lexicalPrefilterTopN`) and prompt context budgets (`generation.maxContextChars`, `generation.maxContextTokensApprox`) for larger indexes.

## Install As Apps Script Library

1. In your Apps Script project, open **Libraries**.
2. Add script ID: `1gZ_6DiLeDhh-a4qcezluTFDshw4OEhTXbeD3wthl_UdHEAFkXf6i6Ho_`.
3. Select the latest published version from this repo's release notes.
4. Use identifier: `AST`.

## Quickstart

```javascript
function demoAstLibrary() {
  const ASTX = ASTLib.AST || ASTLib;

  const df = ASTX.DataFrame.fromRecords([
    { id: 1, amount: 10 },
    { id: 2, amount: 20 }
  ]);

  const enriched = df.assign({
    amount_doubled: frame => frame.amount.multiply(2)
  });

  Logger.log(enriched.toMarkdown());

  // Utility helpers are also available
  const total = ASTX.Utils.arraySum([1, 2, 3, 4]);
  Logger.log(total); // 10
}
```

```javascript
function demoAstAi() {
  const ASTX = ASTLib.AST || ASTLib;
  ASTX.Runtime.configureFromProps({
    modules: ['AI']
  });

  const response = ASTX.AI.stream({
    provider: 'openai',
    input: 'Write a one-line project status update.',
    onEvent: event => {
      if (event.type === 'token') {
        Logger.log(`delta: ${event.delta}`);
      }
    }
  });

  Logger.log(response.output.text);
}
```

```javascript
function demoAstTelemetryHelpers() {
  const ASTX = ASTLib.AST || ASTLib;

  const result = ASTX.TelemetryHelpers.withSpan(
    'demo.telemetry.helper',
    { feature: 'quickstart' },
    () => ASTX.Utils.arraySum([1, 2, 3, 4]),
    { includeResult: true }
  );

  Logger.log(result); // 10
}
```

```javascript
function demoAstRagAnswer() {
  const ASTX = ASTLib.AST || ASTLib;

  const response = ASTX.RAG.answer({
    indexFileId: 'YOUR_INDEX_FILE_ID',
    question: 'What are the open risks?',
    generation: { provider: 'openai' },
    options: { requireCitations: true }
  });

  Logger.log(response.status);
  Logger.log(response.answer);
  Logger.log(response.citations);
}
```

```javascript
function demoAstStorageRead() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Storage.read({
    uri: 'gcs://my-bucket/project/config.json'
  });

  Logger.log(out.output.data.json || out.output.data.text);
}
```

```javascript
function demoAstDbtManifestSearch() {
  const ASTX = ASTLib.AST || ASTLib;

  const loaded = ASTX.DBT.loadManifest({
    uri: 'gcs://my-bucket/dbt-artifacts/manifest.json',
    options: { validate: 'strict', schemaVersion: 'v12', buildIndex: true }
  });

  const search = ASTX.DBT.search({
    bundle: loaded.bundle,
    target: 'all',
    query: 'orders',
    filters: {
      resourceTypes: ['model'],
      column: { namesAny: ['order_id'] }
    },
    include: { meta: true, columns: 'summary' }
  });

  Logger.log(search.items);
}
```

## Documentation

Project docs are built with MkDocs and published to GitHub Pages:

- Site: <https://joe-broadhead.github.io/apps-script-tools/>
- Config: `mkdocs.yml`
- Content: `docs/`

## Cookbooks (Separate `clasp` Projects)

Use `cookbooks/` for project-specific Apps Script apps so the core library code in `apps_script_tools/` stays clean.

Quick start:

```bash
cp -R cookbooks/_template cookbooks/my-project
cd cookbooks/my-project
cp .clasp.json.example .clasp.json
# edit .clasp.json with your project Script ID
clasp push
```

Notes:

- Keep project app code in `cookbooks/<project>/src/`.
- Keep reusable logic in the library (`apps_script_tools/`).
- `.clasp.json` and credentials stay local-only and untracked.

## Development

- Local checks: `npm run lint && npm run test:local`
- Docs check: `mkdocs build --strict`
- Apps Script integration checks: `.github/workflows/integration-gas.yml`
- Optional live AI smoke checks: `.github/workflows/integration-ai-live.yml`
- Naming convention and contribution rules: `CONTRIBUTING.md`

## Release

See `RELEASE.md` for full release and `clasp` publishing steps.
