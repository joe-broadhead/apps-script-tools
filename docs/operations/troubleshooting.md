# Troubleshooting

## `AST.VERSION` or `AST.Utils` is undefined in consumer script

Cause:

- Library identifier/namespace shape mismatch.

Fix:

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

Then call `ASTX.VERSION`, `ASTX.Utils`, `ASTX.DataFrame`, etc.

## `Both inputs must be valid Date objects.` when using `ASTX.Utils.dateAdd/dateSub/dateDiff`

Cause:

- Invalid/non-date values passed to date utilities.

Fix:

- Ensure values are real date instances (or ISO strings converted to `Date` before calling).
- Confirm you are on the latest published patch with cross-context date hardening.

## `Provider must be one of: databricks, bigquery`

Cause:

- Invalid `provider` value in SQL or table-write request.

Fix:

- Use exact values: `databricks` or `bigquery`.

## `Missing required AI configuration field 'apiKey'`

Cause:

- No API key was resolved from per-call `auth`, runtime AI config, or script properties.

Fix:

```javascript
const ASTX = ASTLib.AST || ASTLib;
ASTX.AI.configure(PropertiesService.getScriptProperties().getProperties());
```

Or pass per-call auth explicitly:

```javascript
ASTX.AI.text({
  provider: 'openrouter',
  auth: { apiKey: '...' },
  input: 'Reply with OK'
});
```

## `Unsafe placeholder interpolation is disabled by default`

Cause:

- `placeholders` were provided without explicit opt-in.

Fix:

```javascript
options: { allowUnsafePlaceholders: true }
```

Only do this for trusted, controlled queries.

## `clasp run runAllTests` fails from local shell

Common causes:

- Missing `clasp` auth.
- No API-executable deployment.
- Network/API auth issues.

Quick checks:

```bash
clasp status
clasp deployments
clasp run runAllTests
```

## Docs deploy failed on tag

Possible causes:

- GitHub Pages environment protection rules.
- Missing Pages permissions/config.

Fix:

- Verify repository Pages source is **GitHub Actions**.
- Re-run `docs.yml` via workflow dispatch on `master`.
