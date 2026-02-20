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
    handler // function(args) or global function name string
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
    toolResults
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
