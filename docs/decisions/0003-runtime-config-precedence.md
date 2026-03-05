# ADR-0003: Runtime Config Precedence Contract

- Status: Accepted
- Date: 2026-03-05
- Related: module `resolve*Config` implementations (AI, Cache, DBT, GitHub, Messaging, Storage, Triggers, Jobs)

## Context

Modules accept per-request overrides, runtime configured defaults, and script properties. Inconsistent precedence creates non-deterministic behavior.

## Decision

Standardize precedence across modules:

1. Per-request explicit values.
2. Runtime `configure(...)` values.
3. Script Properties values.
4. Static defaults.

Missing required config after resolution must raise typed validation/auth errors.

## Alternatives Considered

1. Script properties override runtime.
2. Runtime-only config model.
3. Request and runtime merged without precedence.

## Consequences

### Positive

- Predictable behavior and easier debugging.
- Safer temporary overrides in workflows and jobs.
- Consistent module developer expectations.

### Negative

- Resolver code must stay explicit and tested.
- Potential migration cost for older assumptions.

### Follow-up

- Keep config precedence tests for all major namespaces.
- Document required keys and defaults in module API pages.

## Rollout / Validation

- Config precedence tests in local suites.
- Runtime smoke tests for configured modules.
