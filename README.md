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
- `AST.Sql`: Databricks/BigQuery query execution
- `AST.Utils`: utility helpers like `arraySum`, `dateAdd`, `toSnakeCase`

Current release state:

- Published: `v0.0.1`
- Current `master` hardening target: `v0.0.2` (unreleased)

## Install As Apps Script Library

1. In your Apps Script project, open **Libraries**.
2. Add script ID: `1gZ_6DiLeDhh-a4qcezluTFDshw4OEhTXbeD3wthl_UdHEAFkXf6i6Ho_`.
3. Select version `v0.0.1` release mapping from this repo's release notes.
4. Use identifier: `AST`.

## Quickstart

```javascript
function demoAstLibrary() {
  const df = AST.DataFrame.fromRecords([
    { id: 1, amount: 10 },
    { id: 2, amount: 20 }
  ]);

  const enriched = df.assign({
    amount_doubled: frame => frame.amount.multiply(2)
  });

  Logger.log(enriched.toMarkdown());

  // Utility helpers are also available
  const total = AST.Utils.arraySum([1, 2, 3, 4]);
  Logger.log(total); // 10
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

## Release

See `RELEASE.md` for full release and `clasp` publishing steps.
