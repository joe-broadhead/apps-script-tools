import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadAiScripts } from './ai-helpers.mjs';

function busyWait(ms) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < ms) {
    // busy wait for deterministic timeout simulation in sync runtime
  }
}

function baseToolRequest(tools, options = {}) {
  return {
    provider: 'openai',
    operation: 'tools',
    model: 'gpt-4.1-mini',
    input: 'calculate',
    auth: {
      apiKey: 'key'
    },
    tools,
    options: Object.assign({
      retries: 0,
      maxToolRounds: 3,
      includeRaw: false
    }, options)
  };
}

test('astRunAiRequest executes tool handlers referenced by function', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  let calls = 0;

  context.astRunOpenAi = request => {
    calls += 1;

    if (calls === 1) {
      return context.astNormalizeAiResponse({
        provider: 'openai',
        operation: 'tools',
        model: 'gpt-4.1-mini',
        output: {
          toolCalls: [{
            id: 'call_1',
            name: 'sum_tool',
            arguments: { a: 2, b: 4 }
          }]
        }
      });
    }

    return context.astNormalizeAiResponse({
      provider: 'openai',
      operation: 'tools',
      model: 'gpt-4.1-mini',
      output: {
        text: 'done'
      }
    });
  };

  const request = baseToolRequest([
    {
      name: 'sum_tool',
      description: 'sum values',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number' },
          b: { type: 'number' }
        }
      },
      handler: args => args.a + args.b
    }
  ]);
  const response = context.astRunAiRequest(request);

  context.astRunOpenAi = originalRunOpenAi;

  assert.equal(response.output.text, 'done');
  assert.equal(response.output.toolResults.length, 1);
  assert.equal(response.output.toolResults[0].result, 6);
});

test('astRunAiRequest executes tool handlers referenced by global name string', () => {
  const context = createGasContext();
  loadAiScripts(context);

  context.globalAdderTool = args => args.a + args.b;

  const originalRunOpenAi = context.astRunOpenAi;
  let calls = 0;

  context.astRunOpenAi = request => {
    calls += 1;

    if (calls === 1) {
      return context.astNormalizeAiResponse({
        provider: 'openai',
        operation: 'tools',
        model: 'gpt-4.1-mini',
        output: {
          toolCalls: [{
            id: 'call_2',
            name: 'global_adder',
            arguments: '{"a":1,"b":9}'
          }]
        }
      });
    }

    return context.astNormalizeAiResponse({
      provider: 'openai',
      operation: 'tools',
      model: 'gpt-4.1-mini',
      output: {
        text: 'done global'
      }
    });
  };

  const response = context.astRunAiRequest(baseToolRequest([
    {
      name: 'global_adder',
      description: 'sum values',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number' },
          b: { type: 'number' }
        }
      },
      handler: 'globalAdderTool'
    }
  ]));

  context.astRunOpenAi = originalRunOpenAi;

  assert.equal(response.output.text, 'done global');
  assert.equal(response.output.toolResults[0].result, 10);
});

test('astRunAiRequest throws AstAiToolLoopError when max rounds exceeded', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;

  context.astRunOpenAi = () => {
    return context.astNormalizeAiResponse({
      provider: 'openai',
      operation: 'tools',
      model: 'gpt-4.1-mini',
      output: {
        toolCalls: [{
          id: `loop_${new Date().getTime()}`,
          name: 'loop_tool',
          arguments: {}
        }]
      }
    });
  };

  assert.throws(
    () => context.astRunAiRequest(baseToolRequest([
      {
        name: 'loop_tool',
        description: 'keep looping',
        inputSchema: { type: 'object', properties: {} },
        handler: () => 'ok'
      }
    ], { maxToolRounds: 2 })),
    /Tool execution exceeded maxToolRounds/
  );

  context.astRunOpenAi = originalRunOpenAi;
});

test('astRunAiRequest downgrades named toolChoice to auto after first tool round', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  const seenToolChoices = [];
  let calls = 0;

  context.astRunOpenAi = request => {
    calls += 1;
    seenToolChoices.push(request.toolChoice);

    if (calls === 1) {
      return context.astNormalizeAiResponse({
        provider: 'openai',
        operation: 'tools',
        model: 'gpt-4.1-mini',
        output: {
          toolCalls: [{
            id: 'call_named_1',
            name: 'sum_tool',
            arguments: { a: 1, b: 2 }
          }]
        }
      });
    }

    return context.astNormalizeAiResponse({
      provider: 'openai',
      operation: 'tools',
      model: 'gpt-4.1-mini',
      output: {
        text: 'done named'
      }
    });
  };

  const request = baseToolRequest([
    {
      name: 'sum_tool',
      description: 'sum values',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number' },
          b: { type: 'number' }
        }
      },
      handler: args => args.a + args.b
    }
  ], { maxToolRounds: 3 });
  request.toolChoice = { name: 'sum_tool' };

  const response = context.astRunAiRequest(request);

  context.astRunOpenAi = originalRunOpenAi;

  assert.equal(response.output.text, 'done named');
  assert.equal(seenToolChoices.length, 2);
  assert.equal(JSON.stringify(seenToolChoices[0]), JSON.stringify({ name: 'sum_tool' }));
  assert.equal(seenToolChoices[1], 'auto');
});

test('astRunAiRequest rejects async tool handlers with typed error', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  context.astRunOpenAi = () => context.astNormalizeAiResponse({
    provider: 'openai',
    operation: 'tools',
    model: 'gpt-4.1-mini',
    output: {
      toolCalls: [{
        id: 'call_async',
        name: 'async_tool',
        arguments: {}
      }]
    }
  });

  assert.throws(
    () => context.astRunAiRequest(baseToolRequest([
      {
        name: 'async_tool',
        description: 'async tool should fail',
        inputSchema: { type: 'object', properties: {} },
        handler: () => Promise.resolve('ok')
      }
    ])),
    error => {
      assert.equal(error.name, 'AstAiToolExecutionError');
      assert.match(error.message, /returned a Promise/);
      return true;
    }
  );

  context.astRunOpenAi = originalRunOpenAi;
});

test('astRunAiRequest rejects non-serializable tool results', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  context.astRunOpenAi = () => context.astNormalizeAiResponse({
    provider: 'openai',
    operation: 'tools',
    model: 'gpt-4.1-mini',
    output: {
      toolCalls: [{
        id: 'call_circular',
        name: 'circular_tool',
        arguments: {}
      }]
    }
  });

  const circular = {};
  circular.self = circular;

  assert.throws(
    () => context.astRunAiRequest(baseToolRequest([
      {
        name: 'circular_tool',
        description: 'returns circular object',
        inputSchema: { type: 'object', properties: {} },
        handler: () => circular
      }
    ])),
    error => {
      assert.equal(error.name, 'AstAiToolExecutionError');
      assert.match(error.message, /non-serializable result/);
      return true;
    }
  );

  context.astRunOpenAi = originalRunOpenAi;
});

test('astRunAiRequest enforces timeout guardrail for tool handlers', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;

  context.astRunOpenAi = request => {
    if (request.messages && request.messages.some(message => message.role === 'tool')) {
      return context.astNormalizeAiResponse({
        provider: 'openai',
        operation: 'tools',
        model: 'gpt-4.1-mini',
        output: { text: 'done' }
      });
    }

    return context.astNormalizeAiResponse({
      provider: 'openai',
      operation: 'tools',
      model: 'gpt-4.1-mini',
      output: {
        toolCalls: [{
          id: 'tool_timeout',
          name: 'slow_tool',
          arguments: {}
        }]
      }
    });
  };

  assert.throws(
    () => context.astRunAiRequest(baseToolRequest([
      {
        name: 'slow_tool',
        description: 'simulates slow work',
        inputSchema: { type: 'object', properties: {} },
        guardrails: {
          timeoutMs: 5
        },
        handler: () => {
          busyWait(30);
          return { ok: true };
        }
      }
    ])),
    error => {
      assert.equal(error.name, 'AstAiToolTimeoutError');
      assert.match(error.message, /exceeded timeoutMs/);
      return true;
    }
  );

  context.astRunOpenAi = originalRunOpenAi;
});

test('astRunAiRequest enforces argument payload size guardrail', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  context.astRunOpenAi = () => context.astNormalizeAiResponse({
    provider: 'openai',
    operation: 'tools',
    model: 'gpt-4.1-mini',
    output: {
      toolCalls: [{
        id: 'tool_large_args',
        name: 'limited_args_tool',
        arguments: {
          value: 'abcdefghijklmnopqrstuvwxyz'
        }
      }]
    }
  });

  assert.throws(
    () => context.astRunAiRequest(baseToolRequest([
      {
        name: 'limited_args_tool',
        description: 'caps argument size',
        inputSchema: { type: 'object', properties: {} },
        guardrails: {
          maxArgsBytes: 16
        },
        handler: () => 'ok'
      }
    ])),
    error => {
      assert.equal(error.name, 'AstAiToolPayloadLimitError');
      assert.equal(error.details.payloadType, 'arguments');
      return true;
    }
  );

  context.astRunOpenAi = originalRunOpenAi;
});

test('astRunAiRequest enforces result payload size guardrail', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  context.astRunOpenAi = request => {
    if (request.messages && request.messages.some(message => message.role === 'tool')) {
      return context.astNormalizeAiResponse({
        provider: 'openai',
        operation: 'tools',
        model: 'gpt-4.1-mini',
        output: { text: 'done' }
      });
    }

    return context.astNormalizeAiResponse({
      provider: 'openai',
      operation: 'tools',
      model: 'gpt-4.1-mini',
      output: {
        toolCalls: [{
          id: 'tool_large_result',
          name: 'limited_result_tool',
          arguments: {}
        }]
      }
    });
  };

  assert.throws(
    () => context.astRunAiRequest(baseToolRequest([
      {
        name: 'limited_result_tool',
        description: 'caps result size',
        inputSchema: { type: 'object', properties: {} },
        guardrails: {
          maxResultBytes: 10
        },
        handler: () => ({ payload: 'too-large-for-limit' })
      }
    ])),
    error => {
      assert.equal(error.name, 'AstAiToolPayloadLimitError');
      assert.equal(error.details.payloadType, 'result');
      return true;
    }
  );

  context.astRunOpenAi = originalRunOpenAi;
});

test('astRunAiRequest retries failed tool handlers when retries guardrail is set', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  let handlerAttempts = 0;

  context.astRunOpenAi = request => {
    if (request.messages && request.messages.some(message => message.role === 'tool')) {
      return context.astNormalizeAiResponse({
        provider: 'openai',
        operation: 'tools',
        model: 'gpt-4.1-mini',
        output: { text: 'done retry' }
      });
    }

    return context.astNormalizeAiResponse({
      provider: 'openai',
      operation: 'tools',
      model: 'gpt-4.1-mini',
      output: {
        toolCalls: [{
          id: 'tool_retry',
          name: 'retry_tool',
          arguments: { value: 2 }
        }]
      }
    });
  };

  const response = context.astRunAiRequest(baseToolRequest([
    {
      name: 'retry_tool',
      description: 'retries once',
      inputSchema: { type: 'object', properties: {} },
      guardrails: {
        retries: 1
      },
      handler: args => {
        handlerAttempts += 1;
        if (handlerAttempts === 1) {
          throw new Error('first failure');
        }
        return args.value * 2;
      }
    }
  ]));

  context.astRunOpenAi = originalRunOpenAi;

  assert.equal(handlerAttempts, 2);
  assert.equal(response.output.text, 'done retry');
  assert.equal(response.output.toolResults[0].result, 4);
});

test('astRunAiRequest replays idempotent tool calls without re-running handler', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  let providerCalls = 0;
  let handlerCalls = 0;

  context.astRunOpenAi = request => {
    providerCalls += 1;

    if (providerCalls === 1) {
      return context.astNormalizeAiResponse({
        provider: 'openai',
        operation: 'tools',
        model: 'gpt-4.1-mini',
        output: {
          toolCalls: [{
            id: 'tool_same_1',
            name: 'idempotent_tool',
            arguments: { a: 1, b: 2 }
          }]
        }
      });
    }

    if (providerCalls === 2) {
      return context.astNormalizeAiResponse({
        provider: 'openai',
        operation: 'tools',
        model: 'gpt-4.1-mini',
        output: {
          toolCalls: [{
            id: 'tool_same_2',
            name: 'idempotent_tool',
            arguments: { a: 1, b: 2 }
          }]
        }
      });
    }

    return context.astNormalizeAiResponse({
      provider: 'openai',
      operation: 'tools',
      model: 'gpt-4.1-mini',
      output: {
        text: 'done idempotent'
      }
    });
  };

  const response = context.astRunAiRequest(baseToolRequest([
    {
      name: 'idempotent_tool',
      description: 'returns deterministic output',
      inputSchema: { type: 'object', properties: {} },
      guardrails: {
        idempotencyKeyFromArgs: true
      },
      handler: args => {
        handlerCalls += 1;
        return args.a + args.b;
      }
    }
  ], { maxToolRounds: 4 }));

  context.astRunOpenAi = originalRunOpenAi;

  assert.equal(response.output.text, 'done idempotent');
  assert.equal(handlerCalls, 1);
  assert.equal(response.output.toolResults.length, 2);
  assert.equal(response.output.toolResults[0].result, 3);
  assert.equal(response.output.toolResults[1].result, 3);
  assert.equal(response.output.toolResults[1].idempotentReplay, true);
});

test('astRunAiRequest throws AstAiToolIdempotencyError on fixed-key collisions', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  let providerCalls = 0;

  context.astRunOpenAi = () => {
    providerCalls += 1;

    if (providerCalls === 1) {
      return context.astNormalizeAiResponse({
        provider: 'openai',
        operation: 'tools',
        model: 'gpt-4.1-mini',
        output: {
          toolCalls: [{
            id: 'collision_1',
            name: 'collision_tool',
            arguments: { value: 1 }
          }]
        }
      });
    }

    return context.astNormalizeAiResponse({
      provider: 'openai',
      operation: 'tools',
      model: 'gpt-4.1-mini',
      output: {
        toolCalls: [{
          id: 'collision_2',
          name: 'collision_tool',
          arguments: { value: 2 }
        }]
      }
    });
  };

  assert.throws(
    () => context.astRunAiRequest(baseToolRequest([
      {
        name: 'collision_tool',
        description: 'uses a fixed idempotency key',
        inputSchema: { type: 'object', properties: {} },
        guardrails: {
          idempotencyKey: 'fixed-key'
        },
        handler: args => args.value
      }
    ], { maxToolRounds: 3 })),
    error => {
      assert.equal(error.name, 'AstAiToolIdempotencyError');
      return true;
    }
  );

  context.astRunOpenAi = originalRunOpenAi;
});

test('astRunAiRequest scopes fixed idempotency keys by tool name', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  let providerCalls = 0;
  let alphaCalls = 0;
  let betaCalls = 0;

  context.astRunOpenAi = () => {
    providerCalls += 1;

    if (providerCalls === 1) {
      return context.astNormalizeAiResponse({
        provider: 'openai',
        operation: 'tools',
        model: 'gpt-4.1-mini',
        output: {
          toolCalls: [{
            id: 'tool_alpha_1',
            name: 'alpha_tool',
            arguments: { value: 1 }
          }]
        }
      });
    }

    if (providerCalls === 2) {
      return context.astNormalizeAiResponse({
        provider: 'openai',
        operation: 'tools',
        model: 'gpt-4.1-mini',
        output: {
          toolCalls: [{
            id: 'tool_beta_1',
            name: 'beta_tool',
            arguments: { value: 2 }
          }]
        }
      });
    }

    return context.astNormalizeAiResponse({
      provider: 'openai',
      operation: 'tools',
      model: 'gpt-4.1-mini',
      output: {
        text: 'done scoped idempotency'
      }
    });
  };

  const response = context.astRunAiRequest(baseToolRequest([
    {
      name: 'alpha_tool',
      description: 'alpha tool',
      inputSchema: { type: 'object', properties: {} },
      guardrails: {
        idempotencyKey: 'shared-fixed'
      },
      handler: args => {
        alphaCalls += 1;
        return args.value;
      }
    },
    {
      name: 'beta_tool',
      description: 'beta tool',
      inputSchema: { type: 'object', properties: {} },
      guardrails: {
        idempotencyKey: 'shared-fixed'
      },
      handler: args => {
        betaCalls += 1;
        return args.value;
      }
    }
  ], { maxToolRounds: 4 }));

  context.astRunOpenAi = originalRunOpenAi;

  assert.equal(response.output.text, 'done scoped idempotency');
  assert.equal(alphaCalls, 1);
  assert.equal(betaCalls, 1);
  assert.equal(response.output.toolResults.length, 2);
  assert.equal(response.output.toolResults[0].name, 'alpha_tool');
  assert.equal(response.output.toolResults[1].name, 'beta_tool');
});
