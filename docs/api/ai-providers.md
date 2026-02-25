# AI Providers

## Supported providers

- `openai`
- `gemini` (AI Studio)
- `vertex_gemini` (Vertex AI)
- `openrouter`
- `perplexity`

## Capability matrix (current)

| Provider | Text | Structured | Tool Calls | Image Generation | Image Understanding |
|---|---|---|---|---|---|
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

For Vertex service-account JSON specifically:

1. `request.auth.serviceAccountJson` (object or JSON string)
2. `ASTX.AI.configure({ VERTEX_SERVICE_ACCOUNT_JSON: ... })`
3. script property `VERTEX_SERVICE_ACCOUNT_JSON`
4. fallback to OAuth path when `authMode=auto`

## Notes

- `providerOptions` are passed through to provider payloads for advanced use.
- Keep provider/model mappings explicit in production automations for deterministic behavior.
