# Testing

## Test layers

The project uses two test layers:

1. Local Node harness (`tests/local`) for deterministic module and API behavior.
2. Apps Script test suite (`apps_script_tools/testing`) executed in GAS runtime.

## Local checks

```bash
npm run lint
npm run test:local
```

What this catches:

- API contract regressions in critical surfaces.
- Utility/date/dataframe behavior changes.
- SQL request validation regressions.

## Docs checks

```bash
mkdocs build --strict
```

## Apps Script integration checks

Run via workflow dispatch:

- `.github/workflows/integration-gas.yml`

Or locally with configured `clasp` auth:

```bash
clasp status
clasp push
clasp run runAllTests
```

## Consumer smoke test

Before release, validate from a clean consumer project:

- Add library by script ID.
- Select target version.
- Run smoke tests covering:
  - namespace + version
  - `ASTX.Utils`
  - `DataFrame` transforms
  - `GroupBy`
  - `Series.query` function-only contract

## CI expectations

Pull requests should pass:

- `CI` workflow (`lint-and-local-tests`, `docs-build`)

Release readiness should also include:

- Apps Script runtime test pass (`runAllTests`)
- consumer smoke pass from a clean project
