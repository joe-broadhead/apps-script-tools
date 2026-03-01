# GitHub Security

## Authentication baseline

- PAT (`GITHUB_TOKEN`) is the baseline for this release.
- GitHub App auth is supported via `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, and `GITHUB_APP_PRIVATE_KEY`.
- Do not hardcode PATs in source files.
- Load secrets from Script Properties or CI secret managers.

## Token scope guidance

- Use least-privilege PAT scopes for the operations you call.
- Prefer GitHub App installation permissions for automation that does not require user-scoped PAT access.
- Prefer separate tokens for read-only automation and write automation.
- Rotate tokens regularly and invalidate leaked tokens immediately.

## Webhook verification

- Validate `X-Hub-Signature-256` before processing event payloads.
- Configure `GITHUB_WEBHOOK_SECRET` (or pass `auth.webhookSecret`) and call `ASTX.GitHub.verifyWebhook(...)`.
- Use `ASTX.GitHub.parseWebhook(...)` with `options.verifySignature=true` to parse + verify in one call.

## Dry-run for mutation safety

- Use `options.dryRun=true` during rollout and change review.
- Dry-run validates request shape and returns `dryRun.plannedRequest`.
- Mutations are never sent when dry-run is enabled.

## Caching and data sensitivity

- Read caching can persist payload snapshots and ETags.
- Use dedicated cache namespaces per environment/team.
- Avoid caching sensitive responses unless required.
- Keep `includeRaw=false` in production unless debugging.

## Logging/redaction behavior

- Authorization and token-like headers are redacted in typed errors.
- Webhook secrets are never included in thrown error details.
- Avoid logging full request/response payloads containing secrets.

## Retry and rate-limit behavior

- Retries are limited to transient statuses (`429`, `502`, `503`, `504`) and secondary-rate-limit `403`.
- Rate-limit responses map to `AstGitHubRateLimitError` with parsed limit metadata.
- Respect `rateLimit.resetAt` before retrying high-volume workloads.

## Recommended production posture

- Configure `timeoutMs` and `retries` explicitly.
- Enable cache+ETag for read-heavy workflows.
- Keep mutation paths non-cached and use dry-run in CI/preview checks.
- Validate critical writes with branch protection and PR workflows.
