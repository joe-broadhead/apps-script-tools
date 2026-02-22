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

test('runAiRequest executes tool handlers referenced by function', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.runOpenAi;
  let calls = 0;

  context.runOpenAi = request => {
    calls += 1;

    if (calls === 1) {
      return context.normalizeAiResponse({
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

    return context.normalizeAiResponse({
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
  const response = context.runAiRequest(request);

  context.runOpenAi = originalRunOpenAi;

  assert.equal(response.output.text, 'done');
  assert.equal(response.output.toolResults.length, 1);
  assert.equal(response.output.toolResults[0].result, 6);
});

test('runAiRequest executes tool handlers referenced by global name string', () => {
  const context = createGasContext();
  loadAiScripts(context);

  context.globalAdderTool = args => args.a + args.b;

  const originalRunOpenAi = context.runOpenAi;
  let calls = 0;

  context.runOpenAi = request => {
    calls += 1;

    if (calls === 1) {
      return context.normalizeAiResponse({
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

    return context.normalizeAiResponse({
      provider: 'openai',
      operation: 'tools',
      model: 'gpt-4.1-mini',
      output: {
        text: 'done global'
      }
    });
  };

  const response = context.runAiRequest(baseToolRequest([
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

  context.runOpenAi = originalRunOpenAi;

  assert.equal(response.output.text, 'done global');
  assert.equal(response.output.toolResults[0].result, 10);
});

test('runAiRequest throws AstAiToolLoopError when max rounds exceeded', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.runOpenAi;

  context.runOpenAi = () => {
    return context.normalizeAiResponse({
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
    () => context.runAiRequest(baseToolRequest([
      {
        name: 'loop_tool',
        description: 'keep looping',
        inputSchema: { type: 'object', properties: {} },
        handler: () => 'ok'
      }
    ], { maxToolRounds: 2 })),
    /Tool execution exceeded maxToolRounds/
  );

  context.runOpenAi = originalRunOpenAi;
});

test('runAiRequest downgrades named toolChoice to auto after first tool round', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.runOpenAi;
  const seenToolChoices = [];
  let calls = 0;

  context.runOpenAi = request => {
    calls += 1;
    seenToolChoices.push(request.toolChoice);

    if (calls === 1) {
      return context.normalizeAiResponse({
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

    return context.normalizeAiResponse({
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

  const response = context.runAiRequest(request);

  context.runOpenAi = originalRunOpenAi;

  assert.equal(response.output.text, 'done named');
  assert.equal(seenToolChoices.length, 2);
  assert.equal(JSON.stringify(seenToolChoices[0]), JSON.stringify({ name: 'sum_tool' }));
  assert.equal(seenToolChoices[1], 'auto');
});

test('runAiRequest rejects async tool handlers with typed error', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.runOpenAi;
  context.runOpenAi = () => context.normalizeAiResponse({
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
    () => context.runAiRequest(baseToolRequest([
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

  context.runOpenAi = originalRunOpenAi;
});

test('runAiRequest rejects non-serializable tool results', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.runOpenAi;
  context.runOpenAi = () => context.normalizeAiResponse({
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
    () => context.runAiRequest(baseToolRequest([
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

  context.runOpenAi = originalRunOpenAi;
});

test('runAiRequest enforces timeout guardrail for tool handlers', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.runOpenAi;

  context.runOpenAi = request => {
    if (request.messages && request.messages.some(message => message.role === 'tool')) {
      return context.normalizeAiResponse({
        provider: 'openai',
        operation: 'tools',
        model: 'gpt-4.1-mini',
        output: { text: 'done' }
      });
    }

    return context.normalizeAiResponse({
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
    () => context.runAiRequest(baseToolRequest([
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

  context.runOpenAi = originalRunOpenAi;
});

test('runAiRequest enforces argument payload size guardrail', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.runOpenAi;
  context.runOpenAi = () => context.normalizeAiResponse({
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
    () => context.runAiRequest(baseToolRequest([
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

  context.runOpenAi = originalRunOpenAi;
});

test('runAiRequest enforces result payload size guardrail', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.runOpenAi;
  context.runOpenAi = request => {
    if (request.messages && request.messages.some(message => message.role === 'tool')) {
      return context.normalizeAiResponse({
        provider: 'openai',
        operation: 'tools',
        model: 'gpt-4.1-mini',
        output: { text: 'done' }
      });
    }

    return context.normalizeAiResponse({
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
    () => context.runAiRequest(baseToolRequest([
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

  context.runOpenAi = originalRunOpenAi;
});

test('runAiRequest retries failed tool handlers when retries guardrail is set', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.runOpenAi;
  let handlerAttempts = 0;

  context.runOpenAi = request => {
    if (request.messages && request.messages.some(message => message.role === 'tool')) {
      return context.normalizeAiResponse({
        provider: 'openai',
        operation: 'tools',
        model: 'gpt-4.1-mini',
        output: { text: 'done retry' }
      });
    }

    return context.normalizeAiResponse({
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

  const response = context.runAiRequest(baseToolRequest([
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

  context.runOpenAi = originalRunOpenAi;

  assert.equal(handlerAttempts, 2);
  assert.equal(response.output.text, 'done retry');
  assert.equal(response.output.toolResults[0].result, 4);
});

test('runAiRequest replays idempotent tool calls without re-running handler', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.runOpenAi;
  let providerCalls = 0;
  let handlerCalls = 0;

  context.runOpenAi = request => {
    providerCalls += 1;

    if (providerCalls === 1) {
      return context.normalizeAiResponse({
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
      return context.normalizeAiResponse({
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

    return context.normalizeAiResponse({
      provider: 'openai',
      operation: 'tools',
      model: 'gpt-4.1-mini',
      output: {
        text: 'done idempotent'
      }
    });
  };

  const response = context.runAiRequest(baseToolRequest([
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

  context.runOpenAi = originalRunOpenAi;

  assert.equal(response.output.text, 'done idempotent');
  assert.equal(handlerCalls, 1);
  assert.equal(response.output.toolResults.length, 2);
  assert.equal(response.output.toolResults[0].result, 3);
  assert.equal(response.output.toolResults[1].result, 3);
  assert.equal(response.output.toolResults[1].idempotentReplay, true);
});

test('runAiRequest throws AstAiToolIdempotencyError on fixed-key collisions', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.runOpenAi;
  let providerCalls = 0;

  context.runOpenAi = () => {
    providerCalls += 1;

    if (providerCalls === 1) {
      return context.normalizeAiResponse({
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

    return context.normalizeAiResponse({
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
    () => context.runAiRequest(baseToolRequest([
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

  context.runOpenAi = originalRunOpenAi;
});
