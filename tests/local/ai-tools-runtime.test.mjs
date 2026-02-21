import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadAiScripts } from './ai-helpers.mjs';

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
