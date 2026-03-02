# AI Providers

## Supported providers

- `databricks` (Model Serving)
- `openai`
- `gemini` (AI Studio)
- `vertex_gemini` (Vertex AI)
- `openrouter`
- `perplexity`

## Capability matrix (current)

| Provider | Text | Structured | Tool Calls | Image Generation | Image Understanding |
|---|---|---|---|---|---|
| `databricks` | Yes | Yes | Yes | No (throws `AstAiCapabilityError`) | No (throws `AstAiCapabilityError`) |
| `openai` | Yes | Yes | Yes | Yes | Yes |
| `gemini` | Yes | Yes | Yes | Yes (model-dependent) | Yes |
| `vertex_gemini` | Yes | Yes | Yes | No (throws `AstAiCapabilityError`) | Yes |
| `openrouter` | Yes | Yes | Yes | Model-dependent | Model-dependent |
| `perplexity` | Yes | Yes | Yes | Model-dependent | Model-dependent |

Unsupported operation/provider pairs throw `AstAiCapabilityError`.

## Script property keys

### OpenAI

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

### Databricks

- `DATABRICKS_TOKEN`
- `DATABRICKS_AI_ENDPOINT` (full URL: `https://<workspace>/serving-endpoints/<name>/invocations`)
- `DATABRICKS_HOST` (used with `DATABRICKS_AI_SERVING_ENDPOINT` when endpoint URL is not provided)
- `DATABRICKS_AI_SERVING_ENDPOINT`
- `DATABRICKS_AI_MODEL` (optional; defaults to serving endpoint name when unset)

### Gemini (AI Studio)

- `GEMINI_API_KEY`
- `GEMINI_MODEL`

### Vertex Gemini

- `VERTEX_PROJECT_ID`
- `VERTEX_LOCATION`
- `VERTEX_GEMINI_MODEL`
- `VERTEX_SERVICE_ACCOUNT_JSON` (optional; enables service-account auth mode)
- `VERTEX_AUTH_MODE` (optional: `oauth` | `service_account` | `auto`, default `auto`)

Vertex auth modes:

- `oauth`: require OAuth token path (`auth.oauthToken` / `auth.accessToken` or `ScriptApp.getOAuthToken()`).
- `service_account`: require service account JSON (`auth.serviceAccountJson` or `VERTEX_SERVICE_ACCOUNT_JSON`) and exchange JWT for access token.
- `auto` (default): prefer service-account JSON when present, otherwise fallback to OAuth.

Service-account `token_uri` is validated against an allowlist:
- `https://oauth2.googleapis.com/token`
- `https://www.googleapis.com/oauth2/v4/token`

### OpenRouter

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_HTTP_REFERER` (optional)
- `OPENROUTER_X_TITLE` (optional)

### Perplexity

- `PERPLEXITY_API_KEY`
- `PERPLEXITY_MODEL`

## Precedence for auth/model values

For each required key:

1. per-call `request.auth.*` (or `request.model`)
2. runtime config from `ASTX.AI.configure(...)`
3. script properties
4. throw `AstAiAuthError`

Databricks endpoint resolution:

1. per-call `request.providerOptions.endpointUrl` / `request.auth.endpointUrl`
2. runtime/script property `DATABRICKS_AI_ENDPOINT`
3. otherwise require both host + serving endpoint:
   - `request.auth.host` / `DATABRICKS_HOST`
   - `request.providerOptions.servingEndpoint` / `request.auth.servingEndpoint` / `DATABRICKS_AI_SERVING_ENDPOINT`

For Vertex service-account JSON specifically:

1. `request.auth.serviceAccountJson` (object or JSON string)
2. `ASTX.AI.configure({ VERTEX_SERVICE_ACCOUNT_JSON: ... })`
3. script property `VERTEX_SERVICE_ACCOUNT_JSON`
4. fallback to OAuth path when `authMode=auto`

## Notes

- `providerOptions` are passed through to provider payloads for advanced use.
- Keep provider/model mappings explicit in production automations for deterministic behavior.
