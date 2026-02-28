# Security Policy

## Supported Version

Current published release line: `v0.0.4`.
Next release target on `master`: `v0.0.5` (unreleased).

## Reporting Security Issues

Please report vulnerabilities privately before public disclosure.

Preferred channel:

- GitHub private vulnerability report:
  - <https://github.com/joe-broadhead/apps-script-tools/security/advisories/new>

Fallback channel:

- Open a private maintainer contact request via:
  - <https://github.com/joe-broadhead/apps-script-tools/issues/new/choose>
  - include `[SECURITY]` in the title and avoid posting exploit details publicly.

## Disclosure Process and Timeline

- Acknowledgement target: within 3 business days.
- Triage target (severity + reproduction): within 7 business days.
- Remediation target:
  - critical/high: patch or mitigation plan within 14 days.
  - medium/low: patch or mitigation plan within 30 days.
- Coordinated disclosure: after a fix is released or a mitigation is documented.

## Security Defaults

- Public SQL execution requests are validated.
- Unsafe placeholder interpolation is disabled by default.
- Dynamic string-evaluated predicates are not supported in public APIs.
- Manifest scopes are explicitly declared.

## Secret Handling

- Never commit `.clasp.json`, `.clasprc.json`, OAuth client files, API tokens, or refresh tokens.
- Use GitHub Actions secrets for CI integration jobs.
