# AI Tool Calling

## Overview

`ASTX.AI.tools(request)` runs a bounded tool-calling loop:

1. Send request to provider.
2. Execute returned tool calls sequentially.
3. Append tool results and continue.
4. Stop when no more tool calls are returned.

Default round cap: `maxToolRounds = 3`.

If exceeded, the library throws `AstAiToolLoopError`.

## Tool definition contract

```javascript
{
  name: 'tool_name',
  description: 'what it does',
  inputSchema: {
    type: 'object',
    properties: { ... }
  },
  guardrails: {
    timeoutMs: 5000,            // per tool invocation
    maxArgsBytes: 50000,        // serialized arguments cap
    maxResultBytes: 200000,     // serialized result cap
    retries: 0,                 // retry handler on thrown errors
    idempotencyKeyFromArgs: false,
    idempotencyKey: 'optional-fixed-key'
  },
  handler: function(args) { ... } // OR 'globalFunctionName'
}
```

## Guardrail behavior

- `timeoutMs`: if handler duration exceeds this, throws `AstAiToolTimeoutError`.
- `maxArgsBytes` / `maxResultBytes`: throws `AstAiToolPayloadLimitError` when exceeded.
- `retries`: retries handler failures up to `retries + 1` total attempts.
- `idempotencyKeyFromArgs`: replays prior result for identical tool arguments.
- `idempotencyKey`: explicit fixed key when you need custom dedupe boundaries (scoped per tool name).

## Example: function handler

```javascript
function runToolExample() {
  const out = ASTX.AI.tools({
    provider: 'openai',
    input: 'calculate 7 + 9',
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

  Logger.log(out.output.text);
  Logger.log(JSON.stringify(out.output.toolResults));
}
```

## Example: global string handler

```javascript
function addNumbers(args) {
  return args.a + args.b;
}

function runStringHandlerExample() {
  const out = ASTX.AI.tools({
    provider: 'openai',
    input: 'calculate 7 + 9',
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
      handler: 'addNumbers'
    }]
  });

  Logger.log(out.output.text);
}
```

## Error semantics

- Tool definition issues -> `AstAiValidationError`
- Tool runtime failures -> `AstAiToolExecutionError`
- Tool timeout failures -> `AstAiToolTimeoutError`
- Tool payload-size failures -> `AstAiToolPayloadLimitError`
- Tool idempotency conflicts -> `AstAiToolIdempotencyError`
- Loop overflow -> `AstAiToolLoopError`
- Provider call failures -> `AstAiProviderError`
