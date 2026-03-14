# Messaging Hub Cookbook

Template-v2 cookbook for `AST.Messaging`.

This cookbook demonstrates:
- email send planning via `ASTX.Messaging.email.send(...)`
- chat send planning across Google Chat, Slack, and Teams webhook transports
- reusable template registration, rendering, and dry-run sends
- tracking pixel and click URL generation plus event handling
- delivery/event log persistence via the configured log backend
- inbound verification, parsing, and routing for Slack and Google Chat fixtures

## Setup

1. Copy `.clasp.json.example` to `.clasp.json` and set the target `scriptId`.
2. Replace `<PUBLISHED_AST_LIBRARY_VERSION>` in `src/appsscript.json`.
3. `clasp push`
4. Run `seedCookbookConfig()`.
5. Run `runCookbookAll()`.

## Script properties

| Key | Required | Default | Purpose |
| --- | --- | --- | --- |
| `MESSAGING_HUB_APP_NAME` | Yes | `AST Messaging Hub` | Human-readable cookbook name used in outputs |
| `MESSAGING_HUB_DEFAULT_EMAIL_TO` | Yes | `user@example.com` | Recipient used by email dry-run examples |
| `MESSAGING_HUB_CHAT_TRANSPORT` | Yes | `webhook` | Default chat transport: `webhook`, `slack_webhook`, `teams_webhook` |
| `MESSAGING_HUB_CHAT_WEBHOOK_URL` | No | Chat placeholder URL | Google Chat webhook used in dry-run planning |
| `MESSAGING_HUB_SLACK_WEBHOOK_URL` | No | Slack placeholder URL | Slack webhook used in dry-run planning |
| `MESSAGING_HUB_TEAMS_WEBHOOK_URL` | No | Teams placeholder URL | Teams webhook used in dry-run planning |
| `MESSAGING_HUB_TRACKING_BASE_URL` | Yes | `https://example.com` | Base URL for click/open tracking helpers |
| `MESSAGING_HUB_TRACKING_SIGNING_SECRET` | Yes | `messaging-hub-tracking-secret` | Signing secret for tracking URL validation |
| `MESSAGING_HUB_TRACKING_ALLOWED_DOMAINS` | Yes | `example.com` | Comma-separated allowlist for click redirect examples |
| `MESSAGING_HUB_INBOUND_SLACK_SIGNING_SECRET` | Yes | `messaging-hub-slack-secret` | Slack signing secret used by deterministic inbound fixtures |
| `MESSAGING_HUB_INBOUND_GOOGLE_CHAT_TOKEN` | Yes | `messaging-hub-google-chat-token` | Google Chat verification token used by deterministic inbound fixtures |
| `MESSAGING_HUB_LOG_BACKEND` | Yes | `memory` | Log backend: `memory`, `drive_json`, `script_properties`, `storage_json` |
| `MESSAGING_HUB_LOG_NAMESPACE` | Yes | `ast_cookbook_messaging_logs` | Namespace for delivery/event logs |
| `MESSAGING_HUB_LOG_DRIVE_FOLDER_ID` | No | `` | Required only when `MESSAGING_HUB_LOG_BACKEND=drive_json` |
| `MESSAGING_HUB_LOG_DRIVE_FILE_NAME` | No | `ast_messaging_hub_logs.json` | Drive JSON file name for log backend |
| `MESSAGING_HUB_LOG_STORAGE_URI` | No | `` | Required only when `MESSAGING_HUB_LOG_BACKEND=storage_json` |
| `MESSAGING_HUB_TEMPLATE_BACKEND` | Yes | `memory` | Template backend: `memory`, `drive_json`, `script_properties`, `storage_json` |
| `MESSAGING_HUB_TEMPLATE_NAMESPACE` | Yes | `ast_cookbook_messaging_templates` | Namespace for stored templates |
| `MESSAGING_HUB_TEMPLATE_DRIVE_FOLDER_ID` | No | `` | Required only when `MESSAGING_HUB_TEMPLATE_BACKEND=drive_json` |
| `MESSAGING_HUB_TEMPLATE_DRIVE_FILE_NAME` | No | `ast_messaging_hub_templates.json` | Drive JSON file name for templates |
| `MESSAGING_HUB_TEMPLATE_STORAGE_URI` | No | `` | Required only when `MESSAGING_HUB_TEMPLATE_BACKEND=storage_json` |
| `MESSAGING_HUB_VERBOSE` | No | `false` | Enables extra helper logging when customized |

## Entry points

### `runCookbookSmoke()`

Deterministic smoke path that:
- configures `AST.Messaging` from Script Properties
- registers reusable email/chat templates
- renders the email template and validates the rendered subject/body
- runs dry-run send planning for one email and one chat message
- records and lists one tracking event via the configured log backend
- verifies and routes a signed Slack inbound fixture
- verifies a Google Chat token-based inbound fixture

Expected high-signal output:
- `emailPlan.dryRun === true`
- `chatPlan.dryRun === true`
- `slackRoute.handled === true`
- `googleChatVerification.valid === true`

### `runCookbookDemo()`

Richer public-surface demo that shows:
- direct email dry-run planning
- chat batch dry-run planning
- template-based dry-run chat send
- pixel URL generation and click redirect wrapping/handling
- log get/delete roundtrip
- Slack form-encoded parse example
- Google Chat route handler selection

### `runCookbookAll()`

Runs validation, smoke, and demo in one call.

## Least-privilege scopes

The default `src/appsscript.json` intentionally does not add extra OAuth scopes. Add only what your deployment actually needs.

Typical scope choices:
- `https://www.googleapis.com/auth/script.external_request` for live Chat/Slack/Teams webhook delivery
- `https://www.googleapis.com/auth/gmail.send` for live Gmail sends
- `https://www.googleapis.com/auth/gmail.modify` if you want mailbox reads/label updates beyond this cookbook
- Drive scopes only when using `drive_json` template/log backends

Default cookbook behavior is safe:
- outbound sends run as `dryRun`
- inbound flows use deterministic fixtures
- logs/templates default to `memory`

That means the smoke path works without actually sending email or webhook traffic.

## Secure webhook handling guidance

- Keep real webhook URLs and signing secrets in Script Properties only.
- Do not return secrets from editor entrypoints; this cookbook redacts them in public summaries.
- Use HTTPS-only webhook URLs.
- Keep `MESSAGING_HUB_TRACKING_ALLOWED_DOMAINS` narrow so click redirects stay constrained.
- Use separate secrets for tracking signatures and inbound Slack verification.

## Backend notes

### `memory`
- fastest for smoke/demo work
- resets per execution
- recommended default for validation

### `drive_json`
- durable storage in Drive
- requires Drive folder IDs for logs/templates
- useful for Apps Script-native operator workflows

### `script_properties`
- lightweight persistence without extra services
- keep payload sizes modest

### `storage_json`
- durable object-storage backed logs/templates via `AST.Storage`
- good when you want shared retention outside Apps Script

## Troubleshooting

`Cookbook config is invalid`
- Run `seedCookbookConfig()` again.
- Ensure all webhook URLs begin with `https://`.
- If using `drive_json` or `storage_json`, set the matching folder/URI keys.

`Inbound verification fails`
- Confirm the Slack signing secret and Google Chat token values are consistent.
- The cookbook generates its own deterministic Slack signature; if this fails, your AST library version is likely stale.

`Tracking click handling rejects the URL`
- Add the target host to `MESSAGING_HUB_TRACKING_ALLOWED_DOMAINS`.
- Only HTTPS targets are accepted by the click handler.

`Real delivery needs scopes`
- Dry-run does not call Gmail or external webhook endpoints.
- Live sends require you to add the matching OAuth scopes and reauthorize the script.

## Suggested validation flow

1. `seedCookbookConfig()`
2. `validateCookbookConfig()`
3. `runCookbookSmoke()`
4. `runCookbookDemo()`
5. `runCookbookAll()`
