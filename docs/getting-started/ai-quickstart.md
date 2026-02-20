# AI Quick Start

## Import pattern

Use your configured Apps Script library identifier (recommended: `ASTLib`) and normalize once:

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## 1) Configure script properties

Set provider-native keys in script properties (Project Settings -> Script properties):

- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `GEMINI_API_KEY`, `GEMINI_MODEL`
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`
- `PERPLEXITY_API_KEY`, `PERPLEXITY_MODEL`
- `VERTEX_PROJECT_ID`, `VERTEX_LOCATION`, `VERTEX_GEMINI_MODEL`

Per-call values in `request.auth` and `request.model` override script properties.

Optional one-time runtime config load:

```javascript
const ASTX = ASTLib.AST || ASTLib;
ASTX.AI.configure(PropertiesService.getScriptProperties().getProperties());
```

## 2) Text generation

```javascript
function aiTextExample() {
  const response = ASTX.AI.text({
    provider: 'openai',
    input: 'Write a one-line status update.',
    options: {
      maxOutputTokens: 120
    }
  });

  Logger.log(response.output.text);
}
```

## 3) Structured output

```javascript
function aiStructuredExample() {
  const response = ASTX.AI.structured({
    provider: 'gemini',
    input: 'Return a JSON object with priority and owner.',
    schema: {
      type: 'object',
      properties: {
        priority: { type: 'string' },
        owner: { type: 'string' }
      },
      required: ['priority', 'owner']
    }
  });

  Logger.log(JSON.stringify(response.output.json));
}
```

## 4) Tool calling

```javascript
function aiToolExample() {
  const response = ASTX.AI.tools({
    provider: 'openai',
    input: 'What is 12 + 30?',
    tools: [{
      name: 'add_numbers',
      description: 'Adds two numbers',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number' },
          b: { type: 'number' }
        },
        required: ['a', 'b']
      },
      handler: args => args.a + args.b
    }],
    options: {
      maxToolRounds: 3
    }
  });

  Logger.log(response.output.text);
  Logger.log(JSON.stringify(response.output.toolResults));
}
```

## 5) Image generation

```javascript
function aiImageExample() {
  const response = ASTX.AI.image({
    provider: 'openai',
    input: 'An icon of a spreadsheet with sparkles',
    model: 'gpt-image-1'
  });

  const image = response.output.images[0];
  const blob = Utilities.newBlob(
    Utilities.base64Decode(image.base64),
    image.mimeType,
    'ai-image.png'
  );

  DriveApp.createFile(blob);
}
```

## Notes

- Use `ASTX.AI.providers()` for supported providers.
- Use `ASTX.AI.capabilities(provider)` to check provider-level operation support.
- Set `options.includeRaw=true` when you need provider-native raw payloads for debugging.
