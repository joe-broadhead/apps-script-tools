import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadAiScripts } from './ai-helpers.mjs';

function asResponse(json, status = 200) {
  return {
    getResponseCode: () => status,
    getContentText: () => JSON.stringify(json)
  };
}

function baseRequest(operation = 'text') {
  return {
    provider: 'openai',
    operation,
    messages: [{ role: 'user', content: 'hello' }],
    options: {
      temperature: null,
      maxOutputTokens: null,
      timeoutMs: 45000,
      retries: 0,
      includeRaw: false,
      maxToolRounds: 3
    },
    providerOptions: {}
  };
}

test('astRunOpenAi normalizes text output', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        id: 'resp_1',
        created: 1700000000,
        model: 'gpt-4.1-mini',
        choices: [{
          finish_reason: 'stop',
          message: { content: 'hello from openai' }
        }],
        usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 }
      })
    }
  });

  loadAiScripts(context);

  const output = context.astRunOpenAi(baseRequest('text'), {
    provider: 'openai',
    apiKey: 'key',
    model: 'gpt-4.1-mini'
  });

  assert.equal(output.output.text, 'hello from openai');
  assert.equal(output.usage.totalTokens, 7);
  assert.equal(output.provider, 'openai');
});

test('astRunGemini normalizes text output', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        candidates: [{
          finishReason: 'STOP',
          content: {
            parts: [{ text: 'hello from gemini' }]
          }
        }],
        usageMetadata: {
          promptTokenCount: 2,
          candidatesTokenCount: 5,
          totalTokenCount: 7
        }
      })
    }
  });

  loadAiScripts(context);

  const request = Object.assign(baseRequest('text'), {
    provider: 'gemini'
  });

  const output = context.astRunGemini(request, {
    provider: 'gemini',
    apiKey: 'key',
    model: 'gemini-2.0-flash'
  });

  assert.equal(output.output.text, 'hello from gemini');
  assert.equal(output.usage.totalTokens, 7);
  assert.equal(output.provider, 'gemini');
});

test('astRunGemini forwards system messages as systemInstruction when request.system is omitted', () => {
  let capturedPayload = null;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: (_url, options) => {
        capturedPayload = JSON.parse(options.payload);
        return asResponse({
          candidates: [{
            finishReason: 'STOP',
            content: {
              parts: [{ text: 'ok' }]
            }
          }],
          usageMetadata: {
            promptTokenCount: 1,
            candidatesTokenCount: 1,
            totalTokenCount: 2
          }
        });
      }
    }
  });

  loadAiScripts(context);

  const request = Object.assign(baseRequest('text'), {
    provider: 'gemini',
    messages: [
      { role: 'system', content: 'Follow strict JSON policy.' },
      { role: 'user', content: 'hello' }
    ]
  });

  context.astRunGemini(request, {
    provider: 'gemini',
    apiKey: 'key',
    model: 'gemini-2.0-flash'
  });

  assert.equal(capturedPayload.systemInstruction.parts[0].text, 'Follow strict JSON policy.');
  assert.equal(capturedPayload.contents.length, 1);
});

test('astRunVertexGemini normalizes text output', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        candidates: [{
          finishReason: 'STOP',
          content: {
            parts: [{ text: 'hello from vertex' }]
          }
        }],
        usageMetadata: {
          promptTokenCount: 4,
          candidatesTokenCount: 6,
          totalTokenCount: 10
        }
      })
    }
  });

  loadAiScripts(context);

  const request = Object.assign(baseRequest('text'), {
    provider: 'vertex_gemini'
  });

  const output = context.astRunVertexGemini(request, {
    provider: 'vertex_gemini',
    projectId: 'p',
    location: 'us-central1',
    model: 'gemini-2.0-flash',
    oauthToken: 'oauth'
  });

  assert.equal(output.output.text, 'hello from vertex');
  assert.equal(output.usage.totalTokens, 10);
  assert.equal(output.provider, 'vertex_gemini');
});

test('astRunVertexGemini forwards system messages as systemInstruction when request.system is omitted', () => {
  let capturedPayload = null;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: (_url, options) => {
        capturedPayload = JSON.parse(options.payload);
        return asResponse({
          candidates: [{
            finishReason: 'STOP',
            content: {
              parts: [{ text: 'ok' }]
            }
          }],
          usageMetadata: {
            promptTokenCount: 1,
            candidatesTokenCount: 1,
            totalTokenCount: 2
          }
        });
      }
    }
  });

  loadAiScripts(context);

  const request = Object.assign(baseRequest('text'), {
    provider: 'vertex_gemini',
    messages: [
      { role: 'system', content: 'Use terse responses.' },
      { role: 'user', content: 'hello' }
    ]
  });

  context.astRunVertexGemini(request, {
    provider: 'vertex_gemini',
    projectId: 'p',
    location: 'us-central1',
    model: 'gemini-2.0-flash',
    oauthToken: 'oauth'
  });

  assert.equal(capturedPayload.systemInstruction.parts[0].text, 'Use terse responses.');
  assert.equal(capturedPayload.contents.length, 1);
});

test('astRunOpenRouter normalizes text output', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        id: 'or_1',
        model: 'openrouter/model',
        choices: [{
          finish_reason: 'stop',
          message: { content: 'hello from openrouter' }
        }],
        usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 }
      })
    }
  });

  loadAiScripts(context);

  const request = Object.assign(baseRequest('text'), {
    provider: 'openrouter'
  });

  const output = context.astRunOpenRouter(request, {
    provider: 'openrouter',
    apiKey: 'key',
    model: 'openrouter/model'
  });

  assert.equal(output.output.text, 'hello from openrouter');
  assert.equal(output.usage.totalTokens, 3);
  assert.equal(output.provider, 'openrouter');
});

test('astRunOpenAi and astRunOpenRouter produce equivalent text/tool parsing for same envelope', () => {
  const completionEnvelope = {
    id: 'cmp_1',
    created: 1700000000,
    model: 'shared/model',
    choices: [{
      finish_reason: 'stop',
      message: {
        content: [
          { type: 'text', text: 'hello ' },
          { type: 'text', value: 'world' }
        ],
        tool_calls: [{
          id: 'tool_call_1',
          type: 'function',
          function: {
            name: 'lookup',
            arguments: '{"id":42}'
          }
        }]
      }
    }],
    usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 }
  };

  const openAiContext = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse(completionEnvelope)
    }
  });
  loadAiScripts(openAiContext);

  const openRouterContext = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse(completionEnvelope)
    }
  });
  loadAiScripts(openRouterContext);

  const openAiOut = openAiContext.astRunOpenAi(baseRequest('text'), {
    provider: 'openai',
    apiKey: 'key',
    model: 'shared/model'
  });

  const openRouterOut = openRouterContext.astRunOpenRouter(
    Object.assign(baseRequest('text'), { provider: 'openrouter' }),
    {
      provider: 'openrouter',
      apiKey: 'key',
      model: 'shared/model'
    }
  );

  assert.equal(openAiOut.output.text, 'hello world');
  assert.equal(openRouterOut.output.text, 'hello world');
  assert.equal(openAiOut.finishReason, openRouterOut.finishReason);
  assert.equal(openAiOut.usage.totalTokens, openRouterOut.usage.totalTokens);
  assert.equal(
    JSON.stringify(openAiOut.output.toolCalls),
    JSON.stringify(openRouterOut.output.toolCalls)
  );
});

test('astRunPerplexity normalizes text output', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        id: 'px_1',
        model: 'sonar-pro',
        choices: [{
          finish_reason: 'stop',
          message: { content: 'hello from perplexity' }
        }],
        usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 }
      })
    }
  });

  loadAiScripts(context);

  const request = Object.assign(baseRequest('text'), {
    provider: 'perplexity'
  });

  const output = context.astRunPerplexity(request, {
    provider: 'perplexity',
    apiKey: 'key',
    model: 'sonar-pro'
  });

  assert.equal(output.output.text, 'hello from perplexity');
  assert.equal(output.usage.totalTokens, 5);
  assert.equal(output.provider, 'perplexity');
});

test('astAiBuildOpenAiMessages omits empty tool message name', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const messages = context.astAiBuildOpenAiMessages([
    {
      role: 'tool',
      content: 'result payload',
      toolCallId: 'tool_call_1'
    }
  ]);

  assert.equal(messages.length, 1);
  assert.equal(messages[0].role, 'tool');
  assert.equal(messages[0].tool_call_id, 'tool_call_1');
  assert.equal(Object.prototype.hasOwnProperty.call(messages[0], 'name'), false);
});

test('astAiBuildOpenAiMessages normalizes empty assistant tool-call content to null', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const messages = context.astAiBuildOpenAiMessages([
    {
      role: 'assistant',
      content: '',
      toolCalls: [{
        id: 'tool_call_1',
        name: 'lookup',
        arguments: { id: 42 }
      }]
    }
  ]);

  assert.equal(messages.length, 1);
  assert.equal(messages[0].role, 'assistant');
  assert.equal(messages[0].content, null);
  assert.equal(messages[0].tool_calls.length, 1);
  assert.equal(messages[0].tool_calls[0].function.name, 'lookup');
  assert.equal(messages[0].tool_calls[0].function.arguments, '{"id":42}');
});

test('astAiBuildOpenAiMessages normalizes empty text-part assistant content to null for tool calls', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const messages = context.astAiBuildOpenAiMessages([
    {
      role: 'assistant',
      content: [{ type: 'text', text: '' }],
      toolCalls: [{
        id: 'tool_call_1',
        name: 'lookup',
        arguments: { id: 42 }
      }]
    }
  ]);

  assert.equal(messages.length, 1);
  assert.equal(messages[0].role, 'assistant');
  assert.equal(messages[0].content, null);
  assert.equal(messages[0].tool_calls.length, 1);
  assert.equal(messages[0].tool_calls[0].function.name, 'lookup');
  assert.equal(messages[0].tool_calls[0].function.arguments, '{"id":42}');
});

test('astAiBuildOpenAiMessages preserves non-empty whitespace assistant content for tool calls', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const messages = context.astAiBuildOpenAiMessages([
    {
      role: 'assistant',
      content: '   ',
      toolCalls: [{
        id: 'tool_call_1',
        name: 'lookup',
        arguments: { id: 42 }
      }]
    }
  ]);

  assert.equal(messages.length, 1);
  assert.equal(messages[0].role, 'assistant');
  assert.equal(messages[0].content, '   ');
  assert.equal(messages[0].tool_calls.length, 1);
  assert.equal(messages[0].tool_calls[0].function.name, 'lookup');
  assert.equal(messages[0].tool_calls[0].function.arguments, '{"id":42}');
});
