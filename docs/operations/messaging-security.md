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
- Keep replay protection enabled and backed by shared cache for multi-instance deployments.
- For Slack/Teams and Google Chat signature mode, pass exact request bytes via `body.rawBody`.
- Never disable replay protection in production unless upstream already enforces one-time delivery IDs.

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
- `MESSAGING_INBOUND_MAX_SKEW_SEC`
- `MESSAGING_INBOUND_REPLAY_ENABLED`
- `MESSAGING_INBOUND_REPLAY_BACKEND`
- `MESSAGING_INBOUND_REPLAY_NAMESPACE`
- `MESSAGING_INBOUND_REPLAY_TTL_SEC`
- `MESSAGING_INBOUND_GOOGLE_CHAT_SIGNING_SECRET`
- `MESSAGING_INBOUND_GOOGLE_CHAT_VERIFICATION_TOKEN`
- `MESSAGING_INBOUND_SLACK_SIGNING_SECRET`
- `MESSAGING_INBOUND_TEAMS_SIGNING_SECRET`

Never log raw OAuth tokens, webhook secrets, or signing secrets.
