import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadAiScripts } from './ai-helpers.mjs';

test('astRunAiRequest emits deterministic stream events for text responses', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const events = [];
  const originalRunOpenAi = context.astRunOpenAi;

  context.astRunOpenAi = () => context.astNormalizeAiResponse({
    provider: 'openai',
    operation: 'text',
    model: 'gpt-4.1-mini',
    output: {
      text: 'abcdefghi'
    }
  });

  const response = context.astRunAiRequest({
    provider: 'openai',
    model: 'gpt-4.1-mini',
    input: 'hello',
    auth: { apiKey: 'key' },
    onEvent: event => events.push(event),
    options: {
      retries: 0,
      stream: true,
      streamChunkSize: 3
    }
  });

  context.astRunOpenAi = originalRunOpenAi;

  assert.equal(response.output.text, 'abcdefghi');
  assert.equal(
    JSON.stringify(events.map(event => event.type)),
    JSON.stringify(['start', 'token', 'token', 'token', 'done'])
  );
  assert.equal(
    JSON.stringify(events.filter(event => event.type === 'token').map(event => event.delta)),
    JSON.stringify(['abc', 'def', 'ghi'])
  );
});

test('AST.AI.stream helper forces stream mode and emits token events', () => {
  const context = createGasContext();
  loadAiScripts(context, { includeAst: true });

  const events = [];
  const originalRunOpenAi = context.astRunOpenAi;
  let seenRequest = null;

  context.astRunOpenAi = request => {
    seenRequest = request;
    return context.astNormalizeAiResponse({
      provider: 'openai',
      operation: 'text',
      model: 'gpt-4.1-mini',
      output: {
        text: 'wxyz'
      }
    });
  };

  const response = context.AST.AI.stream({
    provider: 'openai',
    model: 'gpt-4.1-mini',
    input: 'hello',
    auth: { apiKey: 'key' },
    onEvent: event => events.push(event),
    options: {
      retries: 0,
      streamChunkSize: 2
    }
  });

  context.astRunOpenAi = originalRunOpenAi;

  assert.equal(response.output.text, 'wxyz');
  assert.equal(Boolean(seenRequest && seenRequest.options && seenRequest.options.stream), true);
  assert.equal(
    JSON.stringify(events.filter(event => event.type === 'token').map(event => event.delta)),
    JSON.stringify(['wx', 'yz'])
  );
});

test('astRunAiRequest stream mode emits tool_call and tool_result events for tool workflows', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const events = [];
  const originalRunOpenAi = context.astRunOpenAi;
  let calls = 0;

  context.astRunOpenAi = () => {
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
            arguments: { a: 2, b: 5 }
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

  const response = context.astRunAiRequest({
    provider: 'openai',
    operation: 'tools',
    model: 'gpt-4.1-mini',
    input: 'calculate',
    auth: { apiKey: 'key' },
    tools: [
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
    ],
    onEvent: event => events.push(event),
    options: {
      retries: 0,
      stream: true,
      streamChunkSize: 16,
      maxToolRounds: 3
    }
  });

  context.astRunOpenAi = originalRunOpenAi;

  assert.equal(response.output.text, 'done');
  assert.equal(response.output.toolResults.length, 1);
  assert.equal(
    JSON.stringify(events.map(event => event.type)),
    JSON.stringify(['start', 'tool_call', 'tool_result', 'token', 'done'])
  );

  const toolCallEvent = events.find(event => event.type === 'tool_call');
  const toolResultEvent = events.find(event => event.type === 'tool_result');
  assert.equal(toolCallEvent.toolCall.name, 'sum_tool');
  assert.equal(JSON.stringify(toolCallEvent.toolCall.arguments), JSON.stringify({ a: 2, b: 5 }));
  assert.equal(toolResultEvent.toolResult.result, 7);
});

test('stream events use resolved config model when request.model is omitted', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          OPENAI_MODEL: 'script-default-model'
        })
      })
    }
  });
  loadAiScripts(context);

  const events = [];
  const originalRunOpenAi = context.astRunOpenAi;

  context.astRunOpenAi = () => context.astNormalizeAiResponse({
    provider: 'openai',
    operation: 'text',
    output: {
      text: 'hello world'
    }
  });

  const response = context.astRunAiRequest({
    provider: 'openai',
    input: 'hello',
    auth: { apiKey: 'key' },
    onEvent: event => events.push(event),
    options: {
      stream: true,
      streamChunkSize: 5
    }
  });

  context.astRunOpenAi = originalRunOpenAi;

  assert.equal(response.model, '');
  const eventModels = events.map(event => event.model);
  assert.equal(eventModels.every(model => model === 'script-default-model'), true);
});
