# ADR-0002: Dual Test Harness (Node + GAS)

- Status: Accepted
- Date: 2026-03-05
- Related: `/tests/local`, `/apps_script_tools/testing`, `.github/workflows/ci.yml`, `.github/workflows/integration-gas.yml`

## Context

The library targets Apps Script but must keep CI deterministic and fast for contributors without GAS credentials.

## Decision

Maintain two complementary test harnesses:
- local Node-based tests (primary gating),
- GAS runtime tests for integration behavior (optional/conditional in CI, full in integration workflows).

## Alternatives Considered

1. GAS-only tests.
2. Node-only tests.
3. End-to-end live tests as required CI gates.

## Consequences

### Positive

- Fast deterministic feedback in pull requests.
- Runtime confidence for Apps Script-specific behavior.
- Lower contributor friction.

### Negative

- Duplicate fixture/mocking infrastructure.
- Some behavior only visible in integration runs.

### Follow-up

- Keep contract tests mirrored where runtime behavior differs.
- Persist integration logs as artifacts for failure triage.

## Rollout / Validation

- `npm run test:local`
- `npm run test:perf:check`
- `clasp run runAllTests` in integration workflows
