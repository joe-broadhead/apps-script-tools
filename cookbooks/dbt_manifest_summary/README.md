# DBT Manifest Summary Cookbook

Practical Apps Script cookbook that uses `AST.DBT` to load a dbt `manifest.json` from Drive and produce a compact project summary.

## Files

- `src/main.gs`: runnable entrypoint (`runDbtManifestSummarySmoke`)
- `src/appsscript.json`: library binding + scopes
- `.clasp.json.example`: local clasp config template

## Setup

1. Copy clasp config and set your target script id:

```bash
cp .clasp.json.example .clasp.json
```

2. Set script property:

- `DBT_MANIFEST_DRIVE_FILE_ID`

3. Set the published AST library version in `src/appsscript.json`.
4. Push and run:

```bash
clasp push
# Run runDbtManifestSummarySmoke from Apps Script editor or clasp run.
```

## Notes

- Uses `AST.DBT.loadManifest`, `AST.DBT.inspectManifest`, and `AST.DBT.listEntities` only.
- Keeps manifest handling in library APIs rather than custom parsing.
