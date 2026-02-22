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

Run via reusable workflow:

- `.github/workflows/integration-gas.yml`

PR CI runs `suite=functional` through the `gas-functional` job (internal PRs and branch pushes) when clasp secrets are configured.

Dispatch options:

- `suite=functional` -> runs `runAllTests`
- `suite=perf` -> runs `runPerformanceBenchmarks`
- functional suite includes AI, RAG, and Storage namespace smoke tests

Or locally with configured `clasp` auth:

```bash
clasp status
clasp push
clasp run runAllTests
clasp run runPerformanceBenchmarks
```

Optional live-provider smoke workflow:

- `.github/workflows/integration-ai-live.yml` (manual dispatch only)
- executes `runAiLiveSmoke(provider, prompt, model)` against configured provider credentials (runtime config or script properties)

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
  - `ASTX.AI.tools` guardrails (`timeoutMs`, payload caps, retries, idempotency replay)
  - `ASTX.Storage` CRUD contract checks (mocked or sandbox buckets/paths)
  - `ASTX.RAG` build/search/answer grounding behavior

## CI expectations

Pull requests should pass:

- `CI` workflow checks:
  - `lint-and-local-tests`
  - `perf-gate` (`npm run test:perf:check`)
  - `docs-build`
  - `gas-functional` (Apps Script runtime functional suite for internal PRs, when clasp secrets are available)

`perf-report` remains informational and publishes benchmark artifacts.

Release validation requires:

- lint
- local tests
- performance threshold check (`npm run test:perf:check`)
- docs strict build
