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
- `AST.Secrets`: secure secret resolution across script properties and Google Secret Manager
- `AST.Cache`: backend-agnostic caching (memory, Drive JSON, script properties, Storage URI) with single-key ops, tag invalidation, and stats
- `AST.Config`: script-properties snapshot helpers for runtime bootstrap
- `AST.Runtime`: one-shot runtime config hydration across namespaces
- `AST.Telemetry`: trace spans/events with redaction and sink controls
- `AST.TelemetryHelpers`: safe span/event wrappers for app workflows
- `AST.Jobs`: script-properties checkpointed multi-step job orchestration with retry/resume semantics
- `AST.Triggers`: declarative time-based trigger lifecycle with optional `AST.Jobs` dispatch
- `AST.Chat`: durable user-scoped thread state store for chat apps
- `AST.AI`: unified AI providers, structured outputs, tools, and image flows
- `AST.RAG`: Drive indexing, retrieval, and grounded Q&A with citations
- `AST.DBT`: dbt `manifest.json` loading, indexing, search, and lineage helpers
- `AST.Sql`: Databricks/BigQuery execution with prepared statements + status/cancel controls
- `AST.Utils`: utility helpers like `arraySum`, `dateAdd`, `toSnakeCase`
- Global utility structures: `Queue`, `Deque`, `Stack`, `PriorityQueue`, `LinkedList`, `Graph`, `Trie`, `TernarySearchTree`, `BinarySearchTree`, `DisjointSet`, `LruCache`

Current release state:

- Published: `v0.0.4`
- Next release target on `master`: `v0.0.5` (unreleased)

`v0.0.5` (in progress) highlights:

- New `AST.DBT` module with:
  - `loadManifest`, `inspectManifest`, `listEntities`, `search`, `getEntity`, `getColumn`, `lineage`
  - provider loading via `drive://file/<id>`, `drive://path/<folderId>/<fileName>`, `gcs://`, `s3://`, and `dbfs:/`
  - strict/basic/off v12 validation modes
  - preindexed manifest bundle for fast repeated lookup/search
- New `AST.Secrets` module with:
  - `get`, `set`, `delete`, and `resolveValue` helpers
  - providers: `script_properties` and `secret_manager`
  - optional `secret://...` config references for `AST.AI`, `AST.RAG`, and `AST.Storage`
- New `AST.Triggers` module with:
  - `upsert`, `list`, `delete`, and `runNow` APIs for idempotent trigger lifecycle control
  - time-based schedule contracts (`every_minutes`, `every_hours`, `every_days`, `every_weeks`)
  - optional dispatch routing into `AST.Jobs` (`dispatch.mode='jobs'`) for resilient queued execution

Released highlights are tracked in `CHANGELOG.md` under `v0.0.4`.

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

```javascript
function demoAstStructures() {
  // These classes are available globally after the library loads.
  const queue = new Queue();
  queue.enqueue('a');
  queue.enqueue('b');
  Logger.log(queue.dequeue()); // a

  const ds = new DisjointSet(['u1', 'u2', 'u3']);
  ds.union('u1', 'u2');
  Logger.log(ds.connected('u1', 'u2')); // true

  const cache = new LruCache(2);
  cache.set('k1', { ok: true });
  cache.set('k2', { ok: true });
  cache.get('k1');
  cache.set('k3', { ok: true }); // evicts k2
  Logger.log(cache.get('k2')); // null
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
- Security check: `npm run test:security`
- Docs check: `mkdocs build --strict`
- Apps Script integration checks: `.github/workflows/integration-gas.yml`
- Security workflows:
  - `.github/workflows/security-codeql.yml`
  - `.github/workflows/security-dependency-review.yml`
  - `.github/workflows/security-secret-scan.yml`
- Optional live AI smoke checks: `.github/workflows/integration-ai-live.yml`
- Naming convention and contribution rules: `CONTRIBUTING.md`

## Release

See `RELEASE.md` for full release and `clasp` publishing steps.
