# Testing

## Test layers

The project uses three complementary test layers:

1. local Node correctness harness (`tests/local`)
2. local Node performance harness (`tests/perf`)
3. Apps Script runtime suite (`apps_script_tools/testing`)

## Local correctness checks

Fast local gate:

```bash
npm test
```

`npm test` is an alias for `npm run test:fast` and intentionally covers lint plus local Node tests only.

Canonical local release gate:

```bash
npm run verify:release
```

`verify:release` runs lint, coverage-enforced local tests, the deterministic secret scan, lockfile-backed dependency audit, cookbook catalog checks, strict docs build, and performance thresholds.

Local coverage report (uses Node test coverage, writes artifacts to `coverage/`):

```bash
npm run test:local:coverage
```

Coverage thresholds (default runner/CI values):

- lines: `88%`
- branches: `86%`
- functions: `72%`
- files: `88%`

Optional local overrides:

```bash
COVERAGE_MIN_LINES=90 \
COVERAGE_MIN_BRANCHES=88 \
COVERAGE_MIN_FUNCTIONS=74 \
COVERAGE_MIN_FILES=90 \
COVERAGE_ENFORCE=true \
npm run test:local:coverage
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

## Security checks

Deterministic repo secret scan:

```bash
npm run test:security
```

Security CI workflows:

- `.github/workflows/security-codeql.yml`
- `.github/workflows/security-dependency-review.yml`
- `.github/workflows/security-secret-scan.yml`

## Apps Script integration checks

Run via reusable workflow:

- `.github/workflows/integration-gas.yml`

PR CI runs `suite=functional` through the `gas-functional` job (internal PRs and branch pushes) when clasp secrets are configured.

Required repository settings for integration workflows:

- variables: `GAS_SCRIPT_ID` for the production library project, `GAS_TEST_SCRIPT_ID` for the separate test project
- secrets: `CLASP_CLIENT_ID`, `CLASP_CLIENT_SECRET`, `CLASP_REFRESH_TOKEN`
- Apps Script projects used by `GAS_SCRIPT_ID` and `GAS_TEST_SCRIPT_ID` must be linked to the same standard Google Cloud project that owns `CLASP_CLIENT_ID`; `scripts.run` returns `PERMISSION_DENIED` when the OAuth client project and script project differ.
- Mint `CLASP_REFRESH_TOKEN` with project scopes after the manifest scopes change: `clasp login --use-project-scopes --creds client_secret.json`.

Production-vs-test deployment behavior:

- Production library pushes use root `.claspignore`, which excludes `apps_script_tools/testing/**` and live-smoke entrypoints.
- Remote Apps Script tests push to the separate `GAS_TEST_SCRIPT_ID` project with `.claspignore.test` via `npm run clasp:test-push`, then run `runAllTests` or `runPerformanceBenchmarks` there. The wrapper passes `.claspignore.test` through clasp's alternate ignore-file setting and does not edit production `.claspignore`.
- The test-push wrapper refuses to run unless local `.clasp.json` is bound to `GAS_TEST_SCRIPT_ID` and distinct from `GAS_PRODUCTION_SCRIPT_ID`/`GAS_SCRIPT_ID`; this prevents accidentally disabling the production ignore rules against the production script.
- `npm run check:clasp:production` verifies the production push set before any test-mode push.

Secret scoping requirements:

- `CLASP_*` secrets must not be set at workflow job scope. They are passed only to the dedicated clasp-auth step, after checkout, Node dependency installation, and clasp installation are complete.
- Live-smoke provider tokens must be set only on the step that writes or uses that token.

Dispatch options:

- `suite=functional` -> runs `runAllTests`
- `suite=perf` -> runs `runPerformanceBenchmarks`
- functional suite includes AI, RAG, and Storage namespace smoke tests

Or locally with configured `clasp` auth:

```bash
clasp status
npm run check:clasp:production
GAS_PRODUCTION_SCRIPT_ID=<production_script_id> GAS_TEST_SCRIPT_ID=<test_script_id> npm run clasp:test-push
clasp run runAllTests
clasp run runPerformanceBenchmarks
```

Optional live-provider smoke workflow:

- `.github/workflows/integration-ai-live.yml` (manual dispatch only)
- executes `runAiLiveSmoke(provider, prompt, model)` against configured provider credentials (runtime config or script properties)

## GAS assertion helper

Namespace contract suites can use `astTestRunWithAssertions(...)` from `/apps_script_tools/testing/TestAssertions.js` to enforce at least one assertion per test:

```javascript
test: () => astTestRunWithAssertions(t => {
  t.ok(AST && AST.AI, 'AST.AI is not available');
  t.equal(typeof AST.AI.run, 'function', 'AST.AI.run is not available');
})
```

## Production backend posture

For app workloads with concurrent users:

- prefer `ASTX.Cache` backend `storage_json`
- use `ASTX.Jobs` with the supported `checkpointStore='properties'`; design long-running handlers to checkpoint compact, JSON-serializable state
- keep telemetry sink on `logger` for low overhead unless a storage-backed sink is configured
- treat `drive_json` and `script_properties` cache backends as low-scale options

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
    - includes `npm run test:local:coverage`
    - uploads `local-coverage` artifact with raw output + JSON/Markdown summary
  - `security-gate` (`npm run test:security`)
  - `perf-gate` (`npm run test:perf:check`)
  - `docs-build`
  - `gas-functional` (Apps Script runtime functional suite for internal PRs, when clasp secrets are available)
- Security workflow checks:
  - `codeql-analyze`
  - `dependency-review`
  - `secret-scan` (`npm run test:security`)
  - dependency review / fallback dependency audit (`npm run test:dependencies`)

`perf-report` remains informational and publishes benchmark artifacts.

Release validation requires:

- local deterministic release gate (`npm run verify:release`)
- remote Apps Script functional/perf suites when clasp credentials are configured
