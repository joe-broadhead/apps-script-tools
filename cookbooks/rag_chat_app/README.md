# RAG Chat App Cookbook

Reusable Apps Script web app starter for grounded chat over Drive files, built on `apps-script-tools`.

This sample is intentionally neutral and production-oriented:

- no company-specific prompt logic
- no game/demo-only features
- brand/theme configurable via Script Properties
- uses `AST.RAG`, `AST.AI`, and `AST.Cache` directly

## Features

- fast/deep chat modes
- index build, sync, and rebuild controls
- thread history per user (persisted cache)
- citation chips with source links
- resilient index bootstrapping (rebuilds when stale `RAG_INDEX_FILE_ID` is invalid)
- run-as-user security gates (allowlist + admin controls)
- async-safe index bootstrapping via `AST.Jobs` (queued/resumed index jobs)
- per-user chat rate limiting and in-flight guardrails
- short-lived request dedupe cache to suppress duplicate submits
- operational metrics endpoint + built-in load-test helper

## Architecture (AST surfaces used)

- `AST.RAG.buildIndex(...)`
- `AST.RAG.syncIndex(...)`
- `AST.RAG.inspectIndex(...)`
- `AST.RAG.answer(...)`
- `AST.AI.text(...)` (model warm-up path)
- `AST.Cache.*` (thread and index metadata caching)

## 5-Minute Setup

1. Create a standalone Apps Script project for your app.
2. Add the `apps-script-tools` library in Apps Script IDE.
3. Set identifier to `ASTLib`.
4. Select a library version that contains `AST.RAG`, `AST.AI`, and `AST.Cache`.
   - For external consumers, use a numbered release version (not library development mode).
5. In this folder, copy local clasp config:

```bash
cd cookbooks/rag_chat_app
cp .clasp.json.example .clasp.json
```

6. Edit `.clasp.json`:
   - set your new Apps Script `scriptId`
   - keep `rootDir` as `rag_chat_app`
7. Set required Script Properties (below).
8. Push and deploy:

```bash
clasp push
```

9. Deploy as Web App and open the URL.

## Web App Execution Mode (Run as user accessing)

This cookbook is configured for Apps Script Web App:

- `executeAs: USER_ACCESSING`
- `access: ANYONE` (Google-account authenticated users)

Secret safety model:

- secrets stay server-side in Script Properties
- secrets are never returned by web handlers
- requests are gated server-side before index mutation endpoints

If you only need internal users, deploy with access restricted to your domain from the Apps Script deployment UI.

## Required Script Properties (Vertex default)

Set these first:

- `RAG_SOURCE_FOLDER_ID` (Drive folder to index)
- `VERTEX_PROJECT_ID`
- `VERTEX_LOCATION` (example: `us-central1`)
- `VERTEX_EMBED_MODEL` (example: `text-embedding-005`)
- `VERTEX_GEMINI_MODEL_FAST` (example: `gemini-2.5-flash`)
- `VERTEX_GEMINI_MODEL_DEEP` (example: `gemini-2.5-pro`)

Provider defaults if omitted:

- `AI_GENERATION_PROVIDER=vertex_gemini`
- `AI_EMBEDDING_PROVIDER=vertex_gemini`

## Vertex Auth Modes

The cookbook now supports two Vertex auth modes:

1. User OAuth (default): uses `ScriptApp.getOAuthToken()`.
2. Service Account JSON: set Script Property `VERTEX_SERVICE_ACCOUNT_JSON`.

When `VERTEX_SERVICE_ACCOUNT_JSON` is present, the cookbook mints a short-lived access token from the service account and uses that token for Vertex calls.

Minimum required service-account JSON fields:

- `client_email`
- `private_key`
- optional `token_uri` (defaults to `https://oauth2.googleapis.com/token`)

Storage note:

- store the full JSON as a single Script Property value in `VERTEX_SERVICE_ACCOUNT_JSON`
- do not commit service-account JSON to source control

Recommended IAM for the service account:

- Vertex AI User on the target project
- access to any backing resources your workflow requires

## Optional Script Properties

### Branding

- `APP_NAME`
- `APP_TAGLINE`
- `APP_PLACEHOLDER`
- `APP_LOGO_URL`
- `APP_FONT_FAMILY` (optional)

### Palette

- `APP_COLOR_PRIMARY`
- `APP_COLOR_ACCENT`
- `APP_COLOR_BG_START`
- `APP_COLOR_BG_END`
- `APP_COLOR_SURFACE`
- `APP_COLOR_TEXT`
- `APP_COLOR_MUTED`

Color input format:

- best supported: `#RRGGBB` (or `#RGB`)
- also supported: `rgb(r,g,b)`

### RAG behavior

- `RAG_TOP_K_FAST` (default `6`)
- `RAG_TOP_K_DEEP` (default `10`)
- `RAG_MIN_SCORE` (default `0.2`)
- `RAG_MAX_OUTPUT_TOKENS_FAST` (default `1400`)
- `RAG_MAX_OUTPUT_TOKENS_DEEP` (default `2600`)
- `RAG_INSUFFICIENT_EVIDENCE_MESSAGE`
- `RAG_AUTO_BUILD_INDEX` (`true`/`false`, default `true`)
- `RAG_INDEX_NAME`

### Cache persistence (threads + index metadata)

Default cache backend is `drive_json` (persisted JSON in Drive), not in-memory.

- `RAG_CACHE_BACKEND` (optional: `drive_json`, `script_properties`, `storage_json`, `memory`)
- `RAG_CACHE_NAMESPACE` (default `rag_chat_app`)
- `RAG_CACHE_DRIVE_FOLDER_ID` (optional; if omitted, Drive root is used for the executing user)
- `RAG_CACHE_DRIVE_FILE_NAME` (default `rag-chat-cache.json`)
- `RAG_CACHE_STORAGE_URI` (optional; for `storage_json` backend)
- `RAG_CACHE_LOCK_TIMEOUT_MS` (default `30000`)
- `RAG_CACHE_LOCK_SCOPE` (`user` default; options: `user`, `script`, `none`)
- `RAG_CACHE_UPDATE_STATS_ON_GET` (`false` default; set `true` if you want read-hit stats persisted)

Notes:

- With Web App `executeAs: USER_ACCESSING`, `drive_json` persistence is created in the accessing user's Drive context.
- The full RAG index remains a separate Drive JSON file managed by `AST.RAG`; cache stores thread state and index metadata only.
- Global `CACHE_*` script properties are also supported by AST cache config. `RAG_CACHE_*` is preferred for this cookbook.

### Web-app security controls

- `WEBAPP_REQUIRE_AUTHENTICATED_USER` (`true`/`false`, default `true`)
- `WEBAPP_ALLOWED_EMAILS` (comma-separated)
- `WEBAPP_ALLOWED_DOMAINS` (comma-separated)
- `WEBAPP_ALLOWED_USER_KEYS` (comma-separated, optional fallback identity)
- `WEBAPP_ADMIN_EMAILS` (comma-separated)
- `WEBAPP_ADMIN_DOMAINS` (comma-separated)
- `WEBAPP_ADMIN_USER_KEYS` (comma-separated)
- `WEBAPP_RESTRICT_INDEX_MUTATIONS_TO_ADMINS` (`true`/`false`, default `true`)
- `WEBAPP_RESTRICT_WARMUP_TO_ADMINS` (`true`/`false`, default `true`)

Recommended secure baseline:

- set `WEBAPP_ALLOWED_DOMAINS` or explicit `WEBAPP_ALLOWED_EMAILS`
- set explicit admin list via `WEBAPP_ADMIN_EMAILS`
- keep index mutation restriction enabled

Important:

- admin-restricted operations require an explicit admin policy.
- if `WEBAPP_RESTRICT_INDEX_MUTATIONS_TO_ADMINS=true` (default), set at least one of:
  - `WEBAPP_ADMIN_EMAILS`
  - `WEBAPP_ADMIN_DOMAINS`
  - `WEBAPP_ADMIN_USER_KEYS`

### Provider overrides (advanced)

- `AI_GENERATION_PROVIDER` (`vertex_gemini`, `openai`, `gemini`, `openrouter`, `perplexity`)
- `AI_EMBEDDING_PROVIDER` (same set)
- `AI_MODEL_FAST`
- `AI_MODEL_DEEP`
- `AI_EMBEDDING_MODEL`

Auth keys required if you move off Vertex:

- OpenAI: `OPENAI_API_KEY`
- Gemini AI Studio: `GEMINI_API_KEY`
- OpenRouter: `OPENROUTER_API_KEY`
- Perplexity: `PERPLEXITY_API_KEY`

Per-request override (advanced):

- pass `request.generationAuth.serviceAccountJson` and/or `request.embeddingAuth.serviceAccountJson` to override script properties at runtime.

### Index persistence

- `RAG_INDEX_FILE_ID` is auto-populated on first successful build/sync.
- `RAG_INDEX_JOB_ID` is managed automatically while async index jobs are queued/running.

If this value exists, app startup reuses the existing index and does not reindex every session.

### Runtime guardrails and scaling controls

- `RAG_CHAT_RATE_LIMIT_WINDOW_SEC` (default `60`)
- `RAG_CHAT_RATE_LIMIT_MAX_REQUESTS` (default `20`)
- `RAG_CHAT_REQUEST_DEDUPE_TTL_SEC` (default `20`)
- `RAG_CHAT_INFLIGHT_LOCK_TTL_SEC` (default `45`)
- `RAG_INDEX_JOB_AUTO_RESUME_ON_INIT` (default `true`)
- `RAG_INDEX_JOB_MAX_RUNTIME_MS` (default `90000`)
- `RAG_INDEX_JOB_MAX_RETRIES` (default `1`)
- `RAG_INDEX_JOB_PROPERTY_PREFIX` (default `RAG_CHAT_INDEX_JOB_`)
- `RAG_METRICS_TTL_SEC` (default `604800`)
- `RAG_METRICS_MAX_EVENTS` (default `250`)

## Source File Types Indexed

The cookbook intentionally limits source MIME types to those supported by `AST.RAG`:

- `text/plain`
- `application/pdf`
- `application/vnd.google-apps.document`
- `application/vnd.google-apps.presentation`

Unsupported MIME values are ignored by the cookbook request builder.

## Customization Example

Set these Script Properties for quick white-labeling:

- `APP_NAME=Acme Knowledge Chat`
- `APP_TAGLINE=Ask grounded questions about internal docs`
- `APP_LOGO_URL=https://example.com/logo.png`
- `APP_COLOR_PRIMARY=#0b5fff`
- `APP_COLOR_ACCENT=#00a870`
- `APP_COLOR_BG_START=#eef4ff`
- `APP_COLOR_BG_END=#eefcf7`
- `APP_COLOR_TEXT=#0f172a`

## Troubleshooting

`AstRagValidationError: source.includeMimeTypes contains unsupported mime types`

- Cause: request includes MIME types outside the supported RAG set.
- Fix: remove unsupported values; this cookbook now sanitizes and ignores unsupported entries.

`Missing Vertex projectId`

- Cause: `VERTEX_PROJECT_ID` is not set and no request-level override exists.
- Fix: set Script Property `VERTEX_PROJECT_ID`.

`Failed to mint Vertex service-account access token`

- Cause: malformed `VERTEX_SERVICE_ACCOUNT_JSON`, invalid key, or insufficient IAM.
- Fix: verify JSON fields (`client_email`, `private_key`) and service-account permissions.

`Index inspect/build fails at startup`

- Cause: stale or deleted `RAG_INDEX_FILE_ID`.
- Behavior: admin requests can clear stale index ID and rebuild if `RAG_SOURCE_FOLDER_ID` is present.
- Fix if still failing: verify `RAG_SOURCE_FOLDER_ID` permissions and source contents.

`Knowledge index is still building. Please retry in a moment.`

- Cause: index initialization is currently running as a queued/resumed job.
- Fix: wait for completion; admins can call `indexJobStatusWeb({})` and `getIndexStateWeb({})`.

`Rate limit exceeded. Please wait a moment and retry.`

- Cause: user exceeded `RAG_CHAT_RATE_LIMIT_MAX_REQUESTS` within `RAG_CHAT_RATE_LIMIT_WINDOW_SEC`.
- Fix: increase limits for your workload or slow client submit frequency.

`Another request is currently running for your account. Please wait.`

- Cause: concurrent submit while an in-flight request lock is active.
- Fix: disable duplicate client submits and/or tune `RAG_CHAT_INFLIGHT_LOCK_TTL_SEC`.

`Access denied ... your account is not allowlisted`

- Cause: user is outside configured allowlist/domain list.
- Fix: update `WEBAPP_ALLOWED_EMAILS` / `WEBAPP_ALLOWED_DOMAINS`.

`Access denied ... admin privileges are required`

- Cause: endpoint is admin-only (`syncIndexWeb`, `rebuildIndexWeb`, or warmup when restricted).
- Fix: add user to `WEBAPP_ADMIN_EMAILS` or adjust admin restriction properties.

`Admin policy is not configured`

- Cause: admin-only operation was called but no admin list was configured.
- Fix: set one of `WEBAPP_ADMIN_EMAILS`, `WEBAPP_ADMIN_DOMAINS`, or `WEBAPP_ADMIN_USER_KEYS`.

## Security Notes

- Do not commit `.clasp.json`, `.clasprc.json`, or API keys.
- Use least-privilege scopes for your final app deployment.
- Keep provider keys in Script Properties, not in code.

## File Map

- `rag_chat_app/00_Config.js`: defaults + Script Property resolution
- `rag_chat_app/05_Security.js`: access gates and admin checks
- `rag_chat_app/10_WebApp.js`: web handlers (`initAppWeb`, `chatTurnWeb`, etc.)
- `rag_chat_app/15_RuntimeGuards.js`: rate limits, in-flight lock, and request dedupe helpers
- `rag_chat_app/20_IndexManager.js`: index build/sync/reuse logic
- `rag_chat_app/30_ThreadsStore.js`: thread persistence
- `rag_chat_app/40_AnswerFormatting.js`: answer/citation normalization
- `rag_chat_app/50_PromptRuntime.js`: provider/runtime resolution and system prompt
- `rag_chat_app/60_ContextUtils.js`: helper utilities
- `rag_chat_app/70_Observability.js`: ops metrics and admin status endpoint
- `rag_chat_app/95_LoadTest.js`: benchmark helper (`runCookbookLoadTest`)
- `rag_chat_app/Index*.html`: UI shell, styling, and client script

## Operational Endpoints (Server Functions)

- `indexJobStatusWeb(request)`:
  - Returns active/last index job state (`queued|running|paused|completed|failed|canceled`).
- `getIndexStateWeb(request)`:
  - Returns current `indexFileId`, compact index info, and pending job state.
- `getOpsStatusWeb(request)`:
  - Admin-only operational snapshot (runtime config summary, index/job state, and rolling metrics).
- `runCookbookLoadTest(request)`:
  - Editor-triggered benchmark harness for chat latency and stability checks.

## Development Pattern

Use this cookbook for project-level orchestration and UI. Keep broadly reusable logic in core library modules.

```javascript
const ASTX = ASTLib.AST || ASTLib;
```
