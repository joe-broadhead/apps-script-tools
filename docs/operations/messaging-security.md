# Messaging Security

## Authentication

- Email operations use `GmailApp` (script/user OAuth context).
- Chat API operations use `auth.oauthToken` when supplied, otherwise `ScriptApp.getOAuthToken()`.
- Webhook transport should use restricted room-scoped webhook URLs.
- Slack API transport uses `auth.slackBotToken` or `MESSAGING_SLACK_BOT_TOKEN`.
- Slack/Teams webhook transports should use dedicated incoming webhook URLs with least-privilege scopes.

## Inbound webhook hardening

- Enforce signature/token validation with `ASTX.Messaging.inbound.verify(...)` or `routeInbound(...)`.
- Configure bounded skew (`MESSAGING_INBOUND_MAX_SKEW_SEC`) to reject stale requests.
- Keep replay protection enabled and backed by durable cache. The default backend is `script_properties`; prefer `storage_json` with `CACHE_STORAGE_URI` for high-volume shared deployments.
- For Slack/Teams and Google Chat signature mode, pass exact request bytes via `body.rawBody`.
- Never disable replay protection in production unless upstream already enforces one-time delivery IDs.
- Do not set `MESSAGING_INBOUND_REPLAY_BACKEND=memory` in production. Memory replay protection is execution-local and requires explicit dev/test opt-in with `MESSAGING_INBOUND_REPLAY_ALLOW_MEMORY=true`.

## Replay and idempotency durability

- Inbound replay and send idempotency records use `ASTX.Cache` backends with TTL pruning.
- `script_properties` is durable across Apps Script executions but is best for low-volume records because Apps Script properties have size and throughput limits.
- `storage_json` is the production scale-out option; configure the cache storage URI with `CACHE_STORAGE_URI`.
- Durable inbound replay read/write failures throw `AstMessagingCapabilityError`; they do not fall back to memory.
- Durable idempotency read/config failures throw before send. A post-send idempotency write failure returns `status='ok'` with warning `idempotencyWriteFailed=true`, because the provider side effect has already completed.
- Memory mode is execution-local, not shared across invocations, and is visible via `ASTX.Messaging.capabilities()` and `ASTX.Messaging.getResolvedConfig()`.
- Keep `MESSAGING_IDEMPOTENCY_TTL_SEC` long enough to cover provider retry windows and client retry loops.
- Keep `MESSAGING_INBOUND_REPLAY_TTL_SEC` long enough to cover provider retry/replay windows, while limiting stale replay-key retention.

## Tracking safety

- Tracking is disabled by default.
- Enable explicitly via config or per-request `options.track`.
- Use `MESSAGING_TRACKING_SIGNING_SECRET` to sign tracking events.
- Validate signatures in `tracking.handleWebEvent` before processing redirects/events.

## Template safety

- Prefer `ASTX.Messaging.registerTemplate(...)` with explicit variable schemas.
- Mark required variables with `required: true`; missing vars throw deterministic validation errors.
- Use typed vars (`string`, `number`, `boolean`, `object`, `array`) to fail fast on malformed payloads.
- Do not interpolate untrusted raw HTML into `htmlBody` unless it has already been sanitized for email clients.
- Keep template IDs non-sensitive and deterministic (for example `release_email_v1`).

## Logging and data handling

- Delivery/event logs default to `drive_json` backend.
- For multi-tenant or high-scale workloads, prefer `storage_json` backend with a dedicated URI.
- Avoid storing raw personal data in `metadata`; persist only required identifiers.

## Rollout controls

- Use `options.dryRun=true` for mutating operations during rollout.
- Use idempotency keys for retry-prone flows to prevent duplicate sends.
- Keep retries bounded (`options.retries`) and monitor rate-limit failures.

## Script properties

Recommended keys:

- `MESSAGING_CHAT_WEBHOOK_URL`
- `MESSAGING_SLACK_WEBHOOK_URL`
- `MESSAGING_SLACK_BOT_TOKEN`
- `MESSAGING_SLACK_CHANNEL`
- `MESSAGING_TEAMS_WEBHOOK_URL`
- `MESSAGING_TRACKING_BASE_URL`
- `MESSAGING_TRACKING_SIGNING_SECRET`
- `MESSAGING_LOG_BACKEND`
- `MESSAGING_LOG_STORAGE_URI` (if `storage_json`)
- `MESSAGING_IDEMPOTENCY_BACKEND`
- `MESSAGING_IDEMPOTENCY_NAMESPACE`
- `MESSAGING_IDEMPOTENCY_TTL_SEC`
- `MESSAGING_IDEMPOTENCY_ALLOW_MEMORY` (dev/test only)
- `MESSAGING_INBOUND_MAX_SKEW_SEC`
- `MESSAGING_INBOUND_REPLAY_ENABLED`
- `MESSAGING_INBOUND_REPLAY_BACKEND`
- `MESSAGING_INBOUND_REPLAY_NAMESPACE`
- `MESSAGING_INBOUND_REPLAY_TTL_SEC`
- `MESSAGING_INBOUND_REPLAY_ALLOW_MEMORY` (dev/test only)
- `MESSAGING_INBOUND_GOOGLE_CHAT_SIGNING_SECRET`
- `MESSAGING_INBOUND_GOOGLE_CHAT_VERIFICATION_TOKEN`
- `MESSAGING_INBOUND_SLACK_SIGNING_SECRET`
- `MESSAGING_INBOUND_TEAMS_SIGNING_SECRET`

Never log raw OAuth tokens, webhook secrets, or signing secrets.
