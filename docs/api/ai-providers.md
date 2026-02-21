# AI Providers

## Supported providers

- `openai`
- `gemini` (AI Studio)
- `vertex_gemini` (Vertex AI)
- `openrouter`
- `perplexity`

## Capability matrix (`v0.0.3` release line)

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

Runtime auth token defaults to `ScriptApp.getOAuthToken()`.

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

## Notes

- `providerOptions` are passed through to provider payloads for advanced use.
- Keep provider/model mappings explicit in production automations for deterministic behavior.
