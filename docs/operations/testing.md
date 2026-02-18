# Testing

## Local

```bash
npm run lint
npm run test:local
```

## Docs Validation

```bash
mkdocs build --strict
```

## Apps Script Integration

Run `.github/workflows/integration-gas.yml` via workflow dispatch.

Execution API note:

- `clasp run runAllTests` requires an Apps Script deployment configured as API executable.
- Current project deployment is configured and validated for this flow.
