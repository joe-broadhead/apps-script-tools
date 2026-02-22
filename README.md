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
- `AST.Cache`: backend-agnostic caching (memory, Drive JSON, script properties, Storage URI)
- `AST.Telemetry`: trace spans/events with redaction and sink controls
- `AST.AI`: unified AI providers, structured outputs, tools, and image flows
- `AST.RAG`: Drive indexing, retrieval, and grounded Q&A with citations
- `AST.Sql`: Databricks/BigQuery query execution
- `AST.Utils`: utility helpers like `arraySum`, `dateAdd`, `toSnakeCase`

Current release state:

- Published: `v0.0.3`
- Next release target on `master`: `v0.0.4` (unreleased)

`v0.0.4` release-line highlights already on `master`:

- New `AST.RAG` module with Drive ingestion (`txt`, `pdf`, Docs, Slides + notes).
- RAG embedding registry with built-in providers and runtime custom provider registration.
- Grounded `RAG.answer(...)` orchestration with strict citation mapping and abstention.
- Drive JSON index lifecycle APIs: `buildIndex`, `syncIndex`, `search`, `answer`, `inspectIndex`.
- New `AST.Storage` module with unified URI contracts and CRUD operations across `gcs`, `s3`, and `dbfs`.
- New `AST.Cache` module with deterministic TTL semantics, tag invalidation, and backend selection.
- New `AST.Telemetry` module with typed spans/events, secret redaction, and `logger`/Drive NDJSON sinks.

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
  ASTX.AI.configure(PropertiesService.getScriptProperties().getProperties());

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

## Documentation

Project docs are built with MkDocs and published to GitHub Pages:

- Site: <https://joe-broadhead.github.io/apps-script-tools/>
- Config: `mkdocs.yml`
- Content: `docs/`

## Development

- Local checks: `npm run lint && npm run test:local`
- Docs check: `mkdocs build --strict`
- Apps Script integration checks: `.github/workflows/integration-gas.yml`
- Optional live AI smoke checks: `.github/workflows/integration-ai-live.yml`

## Release

See `RELEASE.md` for full release and `clasp` publishing steps.
