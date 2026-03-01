# Messaging Security

## Authentication

- Email operations use `GmailApp` (script/user OAuth context).
- Chat API operations use `auth.oauthToken` when supplied, otherwise `ScriptApp.getOAuthToken()`.
- Webhook transport should use restricted room-scoped webhook URLs.
- Slack API transport uses `auth.slackBotToken` or `MESSAGING_SLACK_BOT_TOKEN`.
- Slack/Teams webhook transports should use dedicated incoming webhook URLs with least-privilege scopes.

## Tracking safety

- Tracking is disabled by default.
- Enable explicitly via config or per-request `options.track`.
- Use `MESSAGING_TRACKING_SIGNING_SECRET` to sign tracking events.
- Validate signatures in `tracking.handleWebEvent` before processing redirects/events.

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

Never log raw OAuth tokens, webhook secrets, or signing secrets.
