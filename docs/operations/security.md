# Security

## Runtime safeguards

The library includes secure defaults for query and expression execution:

- `Series.query` supports function predicates only.
- Dynamic string predicate execution is not supported.
- SQL request object validation is mandatory.
- Placeholder interpolation is blocked unless explicitly enabled.
- Apps Script execution API access is set to `MYSELF`.

## Vulnerability reporting

Report vulnerabilities privately through:

- <https://github.com/joe-broadhead/apps-script-tools/security/advisories/new>

Disclosure timeline targets are defined in `SECURITY.md`:

- acknowledgement within 3 business days
- triage within 7 business days
- remediation planning within 14 days (critical/high) or 30 days (medium/low)

## SQL placeholder guidance

Prefer provider-native parameterization where possible.

If you use placeholder substitution:

- Treat substituted values as untrusted input.
- Restrict allowed values with explicit allowlists.
- Set `options.allowUnsafePlaceholders=true` only for controlled/internal queries.

## Credential handling

Do not commit credentials:

- `.clasp.json`
- `.clasprc.json`
- OAuth client secrets or refresh tokens

Use repository or organization secrets for CI-based integration runs.

For storage workflows, use script properties/runtime config instead of inline secrets:

- `GCS_SERVICE_ACCOUNT_JSON`
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_SESSION_TOKEN`
- `DATABRICKS_TOKEN`

## CI security gates

The repository runs three dedicated security workflows:

- `Security - CodeQL` (`.github/workflows/security-codeql.yml`)
- `Security - Dependency Review` (`.github/workflows/security-dependency-review.yml`)
- `Security - Secret Scan` (`.github/workflows/security-secret-scan.yml`)

Local equivalent for deterministic secret scanning:

```bash
npm run test:security
```

Allowlisted test fixtures are declared in:

- `.security/secret-scan-allowlist.json`

Keep this allowlist minimal and scoped to non-production fixture values only.

Dependency review behavior:

- Uses GitHub dependency review when Dependency Graph is enabled.
- Falls back to deterministic `npm audit --audit-level=high` when Dependency Graph is disabled.

## OAuth scopes

The library currently declares scopes for:

- External requests
- Cloud Platform (required for `vertex_gemini`)
- Spreadsheets
- Drive
- BigQuery
- Docs / Slides / Forms

Only authorize consumer scripts for the surfaces you actually use.

## Release checklist (security focus)

- Confirm no secret files are tracked.
- Confirm no dynamic SQL interpolation paths were introduced unintentionally.
- Confirm `appsscript.json` execution API access remains non-public.
- Re-run integration tests after any auth/scope changes.
