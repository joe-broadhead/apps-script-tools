# Security Policy

This page mirrors the repository security policy for docs-site discoverability.

Source of truth: [`SECURITY.md`](https://github.com/joe-broadhead/apps-script-tools/blob/master/SECURITY.md).

## Supported line

- Current published release line: `v0.0.4`
- Current development line on `master`: `v0.0.5` (unreleased)

## How to report vulnerabilities

Preferred:

- GitHub private vulnerability report:
  - <https://github.com/joe-broadhead/apps-script-tools/security/advisories/new>

Fallback:

- Open a maintainer contact issue without exploit details:
  - <https://github.com/joe-broadhead/apps-script-tools/issues/new/choose>
  - include `[SECURITY]` in the title

## SLA targets

- acknowledgement: within 3 business days
- triage (severity + repro): within 7 business days
- remediation plan:
  - critical/high: within 14 days
  - medium/low: within 30 days

## Security defaults

- unsafe SQL placeholder interpolation is disabled by default
- dynamic string-evaluated predicates are not part of public API contracts
- secret scanning and dependency/code scanning are enforced in CI
