# Cookbook Template v2

This template is the contract for all cookbook Apps Script projects in this repo. It is designed to be copied into a standalone script project that consumes `apps-script-tools` only through the public library surface.

## Template contract

Folder layout:

```text
cookbooks/<name>/
  README.md
  .clasp.json.example
  .claspignore
  src/
    appsscript.json
    00_Config.gs
    10_EntryPoints.gs
    20_Smoke.gs
    30_Examples.gs
    99_DevTools.gs
```

Required entrypoints:

- `seedCookbookConfig()`
- `validateCookbookConfig()`
- `runCookbookSmoke()`
- `runCookbookDemo()`
- `runCookbookAll()`

Required usage pattern:

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Setup

1. Copy the template:

```bash
cp -R cookbooks/_template cookbooks/<project-name>
cd cookbooks/<project-name>
cp .clasp.json.example .clasp.json
```

2. Edit `.clasp.json` and set `scriptId`.
3. Update `src/appsscript.json`:
   - replace `<PUBLISHED_AST_LIBRARY_VERSION>`
   - add only the OAuth scopes your cookbook actually needs
4. Push:

```bash
clasp push
```

## Script properties

The template uses these script properties:

| Key | Required | Default | Purpose |
| --- | --- | --- | --- |
| `COOKBOOK_APP_NAME` | Yes | `AST Cookbook Template` | Human-readable app name used in outputs |
| `COOKBOOK_RUN_MODE` | Yes | `demo` | Default run mode metadata |
| `COOKBOOK_SAMPLE_MESSAGE` | No | `Hello from the apps-script-tools cookbook template.` | Sample text included in results |
| `COOKBOOK_VERBOSE` | No | `false` | Enables extra helper logging when customized |

Run `seedCookbookConfig()` once after deployment to write the defaults into Script Properties. After that, customize the values in the Apps Script editor or override them programmatically.

## Entry points

`seedCookbookConfig()`

- Writes template defaults into Script Properties.
- Returns a structured validation summary.

`validateCookbookConfig()`

- Resolves required and optional keys.
- Returns `{ status, warnings, errors, config }`.

`runCookbookSmoke()`

- Runs a deterministic DataFrame-based smoke example.
- Returns a structured object with row counts, totals, AST version, and preview rows.

`runCookbookDemo()`

- Runs a slightly richer demo using `AST.DataFrame` and `AST.Cache`.
- Returns totals, markdown preview, and cache round-trip confirmation.

`runCookbookAll()`

- Runs validation, smoke, and demo in one call.
- Best default function for CI/manual verification.

## Expected outputs

`runCookbookSmoke()` returns a shape like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookSmoke",
  "appName": "AST Cookbook Template",
  "runMode": "demo",
  "astVersion": "0.0.x",
  "rowCount": 3,
  "grossRevenue": 175
}
```

`runCookbookDemo()` returns a shape like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookDemo",
  "cacheRoundTrip": true,
  "totals": {
    "orders": 35,
    "revenue": 1295
  }
}
```

## Scopes guidance

The template `appsscript.json` intentionally does not ship broad OAuth scopes. Add only what your cookbook needs.

Examples:

- Use `https://www.googleapis.com/auth/script.external_request` for HTTP, AI, GitHub, Messaging webhooks, or external APIs.
- Use `https://www.googleapis.com/auth/drive.readonly` or broader Drive scopes only for Drive-backed examples.
- Use Gmail/Chat scopes only for messaging cookbooks that actually send mail or call Chat APIs.

## Deployment checklist

1. Replace the AST library version placeholder.
2. Set the cookbook script ID in `.clasp.json`.
3. Add least-privilege scopes to `src/appsscript.json`.
4. `clasp push`
5. Run `seedCookbookConfig()`
6. Run `runCookbookAll()`
7. Confirm the returned summary object and logs match expectations.

## Troubleshooting

`Missing library version or ASTLib not found`

- Verify the library dependency in `src/appsscript.json`.
- Confirm the published AST library version exists.

`Cookbook config is invalid`

- Run `seedCookbookConfig()` again.
- Check Script Properties for typos or invalid `COOKBOOK_RUN_MODE` values.

`The demo runs but your real cookbook needs more scopes`

- Add the exact scopes required by the modules you use.
- Re-run authorization in the Apps Script editor after pushing.

`You want to inspect the template contract from the editor`

- Run `showCookbookContract()`.
- Run `clearCookbookConfig()` to reset the template keys.
