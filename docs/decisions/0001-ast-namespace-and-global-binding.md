# ADR-0001: AST Namespace and Global Binding Model

- Status: Accepted
- Date: 2026-03-05
- Related: `/apps_script_tools/AST.js`

## Context

Apps Script executes in a flat global runtime. The library needs predictable namespace exposure without breaking local test harnesses or module load order.

## Decision

Expose product APIs through a single `AST` namespace with lazy facade binding in `AST.js`. Keep module internals private unless explicitly exported for runtime compatibility.

## Alternatives Considered

1. Eager global exports for every module function.
2. Multi-namespace globals without a single root object.
3. Generated registry with dynamic loader.

## Consequences

### Positive

- Stable user-facing API surface (`AST.*`).
- Safer internal refactors with fewer global collisions.
- Better portability across clasp/GAS/local-vm test contexts.

### Negative

- Requires disciplined export wiring for new modules.
- Additional facade maintenance cost.

### Follow-up

- Keep facade coverage tests updated when adding namespaces.
- Prefer internal helper naming with `_` suffix where feasible.

## Rollout / Validation

- Namespace tests in local and GAS suites.
- Lint checks validating AST binding conventions.
