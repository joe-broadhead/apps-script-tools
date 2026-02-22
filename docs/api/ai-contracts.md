# AI Contracts

## Namespace

```javascript
ASTX.AI.run(request)
ASTX.AI.text(request)
ASTX.AI.structured(request)
ASTX.AI.tools(request)
ASTX.AI.image(request)
ASTX.AI.providers()
ASTX.AI.capabilities(provider)
ASTX.AI.configure(config, options)
ASTX.AI.getConfig()
ASTX.AI.clearConfig()
```

`configure` is useful in consumer projects when you want to load script properties once and avoid passing `auth` on every call.

Auth/model resolution order:

1. per-call `request.auth.*` / `request.model`
2. runtime config loaded via `ASTX.AI.configure(...)`
3. script properties
4. throw `AstAiAuthError` if still missing

## Common request contract

```javascript
{
  provider: 'openai' | 'gemini' | 'vertex_gemini' | 'openrouter' | 'perplexity',
  operation: 'text' | 'structured' | 'tools' | 'image',
  model: 'optional-model-override',
  input: 'prompt' | [{ role, content }],
  system: 'optional system instruction',
  options: {
    temperature: 0.2,
    maxOutputTokens: 1024,
    timeoutMs: 45000,
    retries: 2,
    includeRaw: false,
    maxToolRounds: 3
  },
  auth: { ...provider overrides... },
  providerOptions: { ...provider-native extras... }
}
```

`options.timeoutMs` is accepted for cross-runtime parity, but Apps Script `UrlFetchApp.fetch` does not provide hard request-timeout control. Use `options.retries` plus provider-side timeout settings where supported.

## Structured request additions

```javascript
{
  provider,
  input,
  schema: { ...JSON Schema... }
}
```

`ASTX.AI.structured(...)` returns parsed JSON at `response.output.json`.

## Tool request additions

```javascript
{
  provider,
  input,
  tools: [{
    name,
    description,
    inputSchema,
    handler, // function(args) or global function name string
    guardrails: {
      timeoutMs: 5000,
      maxArgsBytes: 50000,
      maxResultBytes: 200000,
      retries: 0,
      idempotencyKeyFromArgs: false,
      idempotencyKey: 'optional-fixed-key' // scoped per tool name
    }
  }],
  toolChoice: 'auto' | 'none' | { name: 'tool_name' },
  options: {
    maxToolRounds: 3
  }
}
```

## Normalized response contract

```javascript
{
  provider,
  operation,
  model,
  id,
  createdAt,
  finishReason,
  output: {
    text,
    json,
    images,
    toolCalls,
    toolResults // includes idempotentReplay=true when replayed from idempotency guardrail
  },
  usage: {
    inputTokens,
    outputTokens,
    totalTokens
  },
  raw // present when options.includeRaw=true
}
```

## Error contracts

Typed errors thrown by AI surface:

- `AstAiError`
- `AstAiValidationError`
- `AstAiAuthError`
- `AstAiCapabilityError`
- `AstAiProviderError`
- `AstAiToolExecutionError`
- `AstAiToolTimeoutError`
- `AstAiToolPayloadLimitError`
- `AstAiToolIdempotencyError`
- `AstAiToolLoopError`
- `AstAiResponseParseError`

Recommended usage:

```javascript
try {
  const out = ASTX.AI.text({ provider: 'openai', input: 'hello' });
  Logger.log(out.output.text);
} catch (error) {
  Logger.log(`${error.name}: ${error.message}`);
}
```
