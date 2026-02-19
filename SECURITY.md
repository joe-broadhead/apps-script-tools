# Security Policy

## Supported Version

Current published release line: `v0.0.1`.
Current hardening target on `master`: `v0.0.2` (unreleased).

## Reporting Security Issues

Please report vulnerabilities privately to the maintainers before public disclosure.

## Security Defaults

- Public SQL execution requests are validated.
- Unsafe placeholder interpolation is disabled by default.
- Dynamic string-evaluated predicates are not supported in public APIs.
- Manifest scopes are explicitly declared.

## Secret Handling

- Never commit `.clasp.json`, `.clasprc.json`, OAuth client files, API tokens, or refresh tokens.
- Use GitHub Actions secrets for CI integration jobs.
