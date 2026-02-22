# Storage Security

## Credential handling

Do not hardcode credentials in source code.

Use script properties and runtime config:

- `GCS_SERVICE_ACCOUNT_JSON`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_SESSION_TOKEN`
- `DATABRICKS_TOKEN`

Prefer CI secrets or secure bootstrap logic for non-local environments.

## Least privilege guidance

- Use bucket/path-scoped IAM wherever possible.
- For service-account JSON, grant minimum Storage roles.
- For S3 credentials, restrict IAM policy to required buckets/prefixes.
- For Databricks PATs, use short-lived tokens and rotate regularly.

## Request validation defaults

- unsupported providers/operations fail fast
- write payloads require one canonical source (`base64`, `text`, or `json`)
- not-found results throw typed errors

## Logging policy

- Authorization and security token headers are redacted in provider error details.
- Avoid logging raw payloads in production scripts unless explicitly needed.

## Reliability guardrails

- Retry policy is limited to transient HTTP failures (`429`, `5xx`).
- Soft payload cap defaults to 50 MB to avoid runtime instability.
- Keep `includeRaw=false` by default in production calls.

## Release checklist

- Verify no secrets are tracked.
- Verify not-found behavior remains typed and deterministic.
- Re-run functional tests for all providers after auth logic changes.
- Re-run docs strict build after contract changes.
