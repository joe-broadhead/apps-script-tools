# Security

## Defaults

- No dynamic string predicate execution in `Series.query`.
- SQL request validation is mandatory.
- Placeholder interpolation is disabled unless explicitly enabled.

## Secret Management

- Do not commit `.clasp.json`, `.clasprc.json`, client secrets, or refresh tokens.
- Use CI secrets for integration workflows.
