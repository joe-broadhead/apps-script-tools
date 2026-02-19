# Testing

## Test layers

The project uses three complementary test layers:

1. local Node correctness harness (`tests/local`)
2. local Node performance harness (`tests/perf`)
3. Apps Script runtime suite (`apps_script_tools/testing`)

## Local correctness checks

```bash
npm run lint
npm run test:local
```

## Local performance checks

Report run:

```bash
npm run test:perf
```

Threshold gate:

```bash
npm run test:perf:check
```

Refresh baseline snapshot:

```bash
npm run test:perf:baseline
```

## Docs checks

```bash
mkdocs build --strict
```

## Apps Script integration checks

Run via workflow dispatch:

- `.github/workflows/integration-gas.yml`

Dispatch options:

- `suite=functional` -> runs `runAllTests`
- `suite=perf` -> runs `runPerformanceBenchmarks`

Or locally with configured `clasp` auth:

```bash
clasp status
clasp push
clasp run runAllTests
clasp run runPerformanceBenchmarks
```

## Consumer smoke test

Before release, validate from a clean consumer project:

- add library by script ID
- select target version
- run smoke tests covering:
  - namespace + version
  - `ASTX.Utils`
  - `DataFrame` transforms
  - `GroupBy`
  - `Series.query` function-only contract

## CI expectations

Pull requests should pass:

- `CI` workflow checks:
  - `lint-and-local-tests`
  - `perf-gate` (`npm run test:perf:check`)
  - `docs-build`

`perf-report` remains informational and publishes benchmark artifacts.

Release validation requires:

- lint
- local tests
- performance threshold check (`npm run test:perf:check`)
- docs strict build
