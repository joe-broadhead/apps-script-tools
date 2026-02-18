# apps-script-tools

A production-focused Google Apps Script data toolkit.

`apps-script-tools` provides a unified `AST` namespace for:

- `AST.Series`: typed series operations
- `AST.DataFrame`: tabular transformations and IO
- `AST.GroupBy`: grouped aggregation/apply workflows
- `AST.Sheets` + `AST.Drive`: workspace helpers
- `AST.Sql`: Databricks/BigQuery query execution

## Install As Apps Script Library

1. In your Apps Script project, open **Libraries**.
2. Add script ID: `1gZ_6DiLeDhh-a4qcezluTFDshw4OEhTXbeD3wthl_UdHEAFkXf6i6Ho_`.
3. Select version `v0.0.0` release mapping from this repo's release notes.
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
