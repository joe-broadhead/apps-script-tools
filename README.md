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

`apps-script-tools` is a production-focused toolkit for Google Apps Script with a unified `AST` namespace.

Core surfaces:

- Data: `AST.Series`, `AST.DataFrame`, `AST.GroupBy`
- Workspace and SQL: `AST.Sheets`, `AST.Drive`, `AST.Sql`
- Platform: `AST.Http`, `AST.Storage`, `AST.Secrets`, `AST.Cache`, `AST.Config`, `AST.Runtime`
- Automation and observability: `AST.Jobs`, `AST.Triggers`, `AST.Telemetry`, `AST.TelemetryHelpers`
- AI stack: `AST.AI` (OpenAI/Gemini/Vertex/OpenRouter/Perplexity/Databricks), `AST.RAG`, `AST.Chat`
- Messaging: `AST.Messaging` (Google Email + Google Chat/Slack/Teams automation, template registry/render/send, inbound webhook verify/parse/route APIs)
- Metadata and external APIs: `AST.DBT`, `AST.GitHub`
- Utilities and structures: `AST.Utils` plus global structures (`Queue`, `Deque`, `Stack`, `PriorityQueue`, `LinkedList`, `Graph`, `Trie`, `TernarySearchTree`, `BinarySearchTree`, `DisjointSet`, `LruCache`)

Release notes and version details:

- `CHANGELOG.md`
- GitHub releases: <https://github.com/joe-broadhead/apps-script-tools/releases>

## Install as Apps Script library

1. In your Apps Script project, open **Libraries**.
2. Add script ID: `1gZ_6DiLeDhh-a4qcezluTFDshw4OEhTXbeD3wthl_UdHEAFkXf6i6Ho_`.
3. Select the latest published version.
4. Use identifier: `AST` (or your preferred alias).

## Quick start

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
}
```

## Documentation

- Docs site: <https://joe-broadhead.github.io/apps-script-tools/>
- Installation: <https://joe-broadhead.github.io/apps-script-tools/getting-started/installation/>
- Quick Start: <https://joe-broadhead.github.io/apps-script-tools/getting-started/quickstart/>
- API Quick Reference: <https://joe-broadhead.github.io/apps-script-tools/api/quick-reference/>
- Tools index: <https://joe-broadhead.github.io/apps-script-tools/api/tools/>
- Config contracts: <https://joe-broadhead.github.io/apps-script-tools/api/config-contracts/>
- Pandas compatibility matrix: <https://joe-broadhead.github.io/apps-script-tools/api/pandas-compatibility-matrix/>

Module quickstarts:

- AI: <https://joe-broadhead.github.io/apps-script-tools/getting-started/ai-quickstart/>
- RAG: <https://joe-broadhead.github.io/apps-script-tools/getting-started/rag-quickstart/>
- DBT: <https://joe-broadhead.github.io/apps-script-tools/getting-started/dbt-manifest-quickstart/>
- Storage: <https://joe-broadhead.github.io/apps-script-tools/getting-started/storage-quickstart/>
- GitHub: <https://joe-broadhead.github.io/apps-script-tools/getting-started/github-quickstart/>
- Secrets: <https://joe-broadhead.github.io/apps-script-tools/getting-started/secrets-quickstart/>
- Cache: <https://joe-broadhead.github.io/apps-script-tools/getting-started/cache-quickstart/>
- Jobs: <https://joe-broadhead.github.io/apps-script-tools/getting-started/jobs-quickstart/>
- Triggers: <https://joe-broadhead.github.io/apps-script-tools/getting-started/triggers-quickstart/>
- Chat: <https://joe-broadhead.github.io/apps-script-tools/getting-started/chat-quickstart/>
- Messaging: <https://joe-broadhead.github.io/apps-script-tools/getting-started/messaging-quickstart/>
- Telemetry: <https://joe-broadhead.github.io/apps-script-tools/getting-started/telemetry-quickstart/>
- Contributing guide: `CONTRIBUTING.md`
- Release process: `RELEASE.md`
- Security policy: `SECURITY.md`

## Documentation standards

- `README.md` stays overview-focused (what the library provides, how to install/use it quickly).
- Detailed API contracts and operation behavior live in `docs/` (published via MkDocs).
- Every user-facing change should be recorded under `CHANGELOG.md` in `v0.0.5 (unreleased)` until release.
- When adding docs pages, include them in `mkdocs.yml` navigation.

## Cookbooks

Use `cookbooks/` for project-specific Apps Script apps so core library code in `apps_script_tools/` stays clean.

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

Global structures note:

- Structure classes are global constructors, not namespaced properties.
- Use `new Queue()` (or `new Trie()`, etc.), not `new ASTX.Queue()`.

## Development

- Lint gate: `npm run lint`
- Local coverage gate: `npm run test:local:coverage`
- Perf gate: `npm run test:perf:check`
- Security gate: `npm run test:security`
- Docs gate: `mkdocs build --strict`
- Apps Script integration gate (when configured): `clasp push && clasp run runAllTests`
- Full contributor guide: `CONTRIBUTING.md`

## Release

See `RELEASE.md` for release and `clasp` publishing steps.
