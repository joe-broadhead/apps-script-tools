# AI Playground Cookbook

This cookbook demonstrates production-style `AST.AI` usage using public `AST` APIs only:

- `ASTX.AI.text(...)`
- `ASTX.AI.structured(...)`
- `ASTX.AI.tools(...)`
- `ASTX.AI.stream(...)`
- `ASTX.AI.providers()`
- `ASTX.AI.capabilities(provider)`
- `ASTX.AI.configure(...)`
- `ASTX.AI.getConfig()` / `ASTX.AI.clearConfig()`
- routing/fallback via `routing.candidates`
- optional tool guardrail failure handling

It follows the template v2 contract from `cookbooks/_template`.

## What it covers

Smoke flow:

1. resolve the selected provider through `ASTX.AI.configure(...)`
2. run a deterministic text request
3. run a schema-constrained structured request
4. run a bounded tool call with guardrails and verify the tool result

Demo flow:

1. emit synthetic stream events through `ASTX.AI.stream(...)`
2. run token-budget preflight with `ASTX.AI.estimateTokens(...)`
3. optionally execute provider routing/fallback with `routing.candidates`
4. optionally run a tool guardrail failure example and capture the typed error

## Folder contract

```text
cookbooks/ai_playground/
  README.md
  .clasp.json.example
  .claspignore
  src/
    appsscript.json
    00_Config.gs
    10_EntryPoints.gs
    20_Smoke.gs
    30_Examples.gs
    99_DevTools.gs
```

## Setup

1. Copy `.clasp.json.example` to `.clasp.json`.
2. Set your Apps Script `scriptId`.
3. Replace `<PUBLISHED_AST_LIBRARY_VERSION>` in `src/appsscript.json`.
4. Push with `clasp push`.
5. Set the provider auth/model script properties you want to use.
6. Run `seedCookbookConfig()`.
7. Run `runCookbookAll()`.

## Cookbook script properties

| Key | Required | Default | Purpose |
| --- | --- | --- | --- |
| `AI_PLAYGROUND_APP_NAME` | Yes | `AST AI Playground` | Display name included in outputs. |
| `AI_PLAYGROUND_PRIMARY_PROVIDER` | Yes | `openai` | Provider used for smoke and stream demos. |
| `AI_PLAYGROUND_ROUTING_ENABLED` | No | `false` | Enables the routing demo in `runCookbookDemo()`. |
| `AI_PLAYGROUND_FALLBACK_PROVIDER` | No | `''` | Optional fallback provider used in routing demos. |
| `AI_PLAYGROUND_ROUTING_RETRY_PROVIDER_ERRORS` | No | `false` | Enables fallback on deterministic provider `4xx` errors. |
| `AI_PLAYGROUND_TEXT_PROMPT` | No | `Reply with exactly READY on a single line.` | Prompt used for the text smoke example. |
| `AI_PLAYGROUND_MAX_OUTPUT_TOKENS` | No | `192` | Output token cap used across examples. |
| `AI_PLAYGROUND_STREAM_CHUNK_SIZE` | No | `12` | Synthetic stream chunk size for `ASTX.AI.stream(...)`. |
| `AI_PLAYGROUND_TOOL_TIMEOUT_MS` | No | `5000` | Per-tool timeout guardrail. |
| `AI_PLAYGROUND_TOOL_MAX_ARGS_BYTES` | No | `4096` | Serialized tool args cap. |
| `AI_PLAYGROUND_TOOL_MAX_RESULT_BYTES` | No | `4096` | Serialized tool result cap. |
| `AI_PLAYGROUND_RUN_GUARDRAIL_DEMO` | No | `false` | Runs the explicit payload-limit failure example in `runCookbookAll()`. |

## Provider auth/model properties

The cookbook does not invent its own auth layer. It relies on the normal `AST.AI` script properties:

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
- optional: `VERTEX_SERVICE_ACCOUNT_JSON`
- optional: `VERTEX_AUTH_MODE=oauth|service_account|auto`

### Databricks

- `DATABRICKS_TOKEN`
- `DATABRICKS_AI_ENDPOINT`
  or
- `DATABRICKS_HOST`
- `DATABRICKS_AI_SERVING_ENDPOINT`
- optional: `DATABRICKS_AI_MODEL`

### OpenRouter

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- optional: `OPENROUTER_HTTP_REFERER`
- optional: `OPENROUTER_X_TITLE`

### Perplexity

- `PERPLEXITY_API_KEY`
- `PERPLEXITY_MODEL`

## Single-provider mode

This is the safest starting point:

```text
AI_PLAYGROUND_PRIMARY_PROVIDER=openai
AI_PLAYGROUND_ROUTING_ENABLED=false
AI_PLAYGROUND_FALLBACK_PROVIDER=
```

Then provide only the matching provider keys, for example:

```text
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
```

## Routing mode

To test provider routing/fallback, enable a fallback provider:

```text
AI_PLAYGROUND_PRIMARY_PROVIDER=openai
AI_PLAYGROUND_ROUTING_ENABLED=true
AI_PLAYGROUND_FALLBACK_PROVIDER=gemini
AI_PLAYGROUND_ROUTING_RETRY_PROVIDER_ERRORS=false
```

Then configure both providers' auth/model keys. The routing demo will report:

- selected provider
- selected model
- attempt count
- per-attempt status

If the primary provider succeeds, the fallback will not be used. To test real failover, temporarily break the primary provider config or use a deliberately invalid model override in a scratch environment.

## Databricks example mode

To make Databricks your primary provider:

```text
AI_PLAYGROUND_PRIMARY_PROVIDER=databricks
DATABRICKS_TOKEN=...
DATABRICKS_HOST=https://<workspace>.cloud.databricks.com
DATABRICKS_AI_SERVING_ENDPOINT=<serving-endpoint-name>
DATABRICKS_AI_MODEL=<optional-model>
```

Or set `DATABRICKS_AI_ENDPOINT` directly to the full `/serving-endpoints/.../invocations` URL.

## Entrypoints

Required template entrypoints:

- `seedCookbookConfig()`
- `validateCookbookConfig()`
- `runCookbookSmoke()`
- `runCookbookDemo()`
- `runCookbookAll()`

Additional helper entrypoint:

- `runCookbookGuardrailDemo()`

## Expected output shape

`runCookbookSmoke()` returns a payload like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookSmoke",
  "provider": "openai",
  "text": {
    "containsReady": true
  },
  "structured": {
    "checksum": 42
  },
  "tools": {
    "toolResult": 42
  }
}
```

`runCookbookDemo()` returns a payload like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookDemo",
  "stream": {
    "tokenEventCount": 3,
    "finalText": "STREAM_OK"
  },
  "routing": {
    "status": "ok",
    "selectedProvider": "openai",
    "attemptCount": 1
  }
}
```

`runCookbookGuardrailDemo()` returns a payload like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookGuardrailDemo",
  "expectedErrorName": "AstAiToolPayloadLimitError"
}
```

## OAuth scopes

Baseline scope for most cookbook runs:

- `https://www.googleapis.com/auth/script.external_request`

Add this only when using `vertex_gemini` with Apps Script OAuth token mode:

- `https://www.googleapis.com/auth/cloud-platform`

If you use Vertex with service-account auth only, `script.external_request` is typically sufficient.

Keep the manifest least-privilege for the providers you actually use.

## Production guidance

Recommended:

- pin provider/model pairs explicitly in Script Properties
- start in single-provider mode, then enable routing only after both providers are validated
- keep tool guardrails strict even in demos (`timeoutMs`, args/result caps)
- use `ASTX.AI.estimateTokens(...)` before high-cost prompts

Anti-patterns:

- mixing many provider credentials into one scratch script without documenting ownership
- treating routing as a substitute for prompt validation
- using unbounded tool payloads in production workflows
- enabling fallback on deterministic `4xx` provider errors unless you truly want that behavior

## Troubleshooting

`AstAiAuthError`

- Confirm the script properties for the selected provider are present.
- Run `showCookbookProviders()` to inspect the configured cookbook provider settings.

`Cookbook config is invalid`

- Run `seedCookbookConfig()` again.
- If routing is enabled, set `AI_PLAYGROUND_FALLBACK_PROVIDER`.

`Vertex Gemini fails with OAuth errors`

- Add `https://www.googleapis.com/auth/cloud-platform` to `src/appsscript.json`.
- Or switch to `VERTEX_AUTH_MODE=service_account` and provide `VERTEX_SERVICE_ACCOUNT_JSON`.

`Databricks fails with endpoint resolution errors`

- Use either `DATABRICKS_AI_ENDPOINT` or the pair `DATABRICKS_HOST` + `DATABRICKS_AI_SERVING_ENDPOINT`.
- The full endpoint must end with `/invocations`.
