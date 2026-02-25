import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadAiScripts } from './ai-helpers.mjs';

function createSuccessResponse(context, provider, model, text) {
  return context.astNormalizeAiResponse({
    provider,
    operation: 'text',
    model,
    output: {
      text
    }
  });
}

function createProviderError(statusCode, message = 'provider failure') {
  const error = new Error(message);
  error.name = 'AstAiProviderError';
  error.details = {
    statusCode
  };
  return error;
}

test('astValidateAiRequest accepts provider routing candidates without top-level provider', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const normalized = context.astValidateAiRequest({
    input: 'hello',
    routing: {
      strategy: 'priority',
      candidates: [
        {
          provider: 'gemini',
          model: 'gemini-2.0-flash',
          auth: { apiKey: 'gemini-key' }
        },
        {
          provider: 'openai',
          model: 'gpt-4.1-mini',
          auth: { apiKey: 'openai-key' }
        }
      ]
    }
  });

  assert.equal(normalized.provider, 'gemini');
  assert.equal(normalized.routing.strategy, 'priority');
  assert.equal(normalized.routing.candidates.length, 2);
});

test('astRunAiRequest falls back to next routing candidate on transient provider errors', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  const originalRunGemini = context.astRunGemini;

  context.astRunOpenAi = () => {
    throw createProviderError(503, 'temporary upstream failure');
  };
  context.astRunGemini = request => createSuccessResponse(context, 'gemini', request.model, 'fallback-success');

  const response = context.astRunAiRequest({
    input: 'hello',
    routing: {
      strategy: 'priority',
      candidates: [
        {
          provider: 'openai',
          model: 'gpt-4.1-mini',
          auth: { apiKey: 'openai-key' }
        },
        {
          provider: 'gemini',
          model: 'gemini-2.0-flash',
          auth: { apiKey: 'gemini-key' }
        }
      ]
    }
  });

  context.astRunOpenAi = originalRunOpenAi;
  context.astRunGemini = originalRunGemini;

  assert.equal(response.provider, 'gemini');
  assert.equal(response.output.text, 'fallback-success');
  assert.equal(response.route.selectedProvider, 'gemini');
  assert.equal(response.route.attempts.length, 2);
  assert.equal(response.route.attempts[0].status, 'error');
  assert.equal(response.route.attempts[0].error.statusCode, 503);
  assert.equal(response.route.attempts[0].error.retryable, true);
  assert.equal(response.route.attempts[1].status, 'ok');
});

test('astRunAiRequest does not fail over deterministic provider 4xx errors by default', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  const originalRunGemini = context.astRunGemini;
  let geminiCalls = 0;

  context.astRunOpenAi = () => {
    throw createProviderError(400, 'bad request');
  };
  context.astRunGemini = request => {
    geminiCalls += 1;
    return createSuccessResponse(context, 'gemini', request.model, 'should-not-run');
  };

  assert.throws(
    () => context.astRunAiRequest({
      input: 'hello',
      routing: {
        strategy: 'priority',
        candidates: [
          {
            provider: 'openai',
            model: 'gpt-4.1-mini',
            auth: { apiKey: 'openai-key' }
          },
          {
            provider: 'gemini',
            model: 'gemini-2.0-flash',
            auth: { apiKey: 'gemini-key' }
          }
        ]
      }
    }),
    error => {
      assert.equal(error.name, 'AstAiProviderError');
      assert.equal(error.details.statusCode, 400);
      assert.equal(error.details.route.attempts.length, 1);
      assert.equal(error.details.route.attempts[0].error.retryable, false);
      return true;
    }
  );

  context.astRunOpenAi = originalRunOpenAi;
  context.astRunGemini = originalRunGemini;

  assert.equal(geminiCalls, 0);
});

test('astRunAiRequest can fail over deterministic provider errors when retryOn.providerErrors=true', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  const originalRunGemini = context.astRunGemini;

  context.astRunOpenAi = () => {
    throw createProviderError(400, 'bad request');
  };
  context.astRunGemini = request => createSuccessResponse(context, 'gemini', request.model, 'fallback-on-4xx');

  const response = context.astRunAiRequest({
    input: 'hello',
    routing: {
      strategy: 'priority',
      retryOn: {
        providerErrors: true
      },
      candidates: [
        {
          provider: 'openai',
          model: 'gpt-4.1-mini',
          auth: { apiKey: 'openai-key' }
        },
        {
          provider: 'gemini',
          model: 'gemini-2.0-flash',
          auth: { apiKey: 'gemini-key' }
        }
      ]
    }
  });

  context.astRunOpenAi = originalRunOpenAi;
  context.astRunGemini = originalRunGemini;

  assert.equal(response.provider, 'gemini');
  assert.equal(response.output.text, 'fallback-on-4xx');
  assert.equal(response.route.attempts.length, 2);
  assert.equal(response.route.attempts[0].error.retryable, true);
});

test('astRunAiRequest routes structured schema failures to next candidate', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  const originalRunGemini = context.astRunGemini;
  let openAiCalls = 0;
  let geminiCalls = 0;

  context.astRunOpenAi = request => {
    openAiCalls += 1;
    return createSuccessResponse(context, 'openai', request.model, '{"ok":"bad","source":"openai"}');
  };

  context.astRunGemini = request => {
    geminiCalls += 1;
    return context.astNormalizeAiResponse({
      provider: 'gemini',
      operation: 'structured',
      model: request.model,
      output: {
        text: '{"ok":true,"source":"gemini"}',
        json: { ok: true, source: 'gemini' }
      }
    });
  };

  const response = context.astRunAiRequest({
    operation: 'structured',
    input: 'return json',
    options: {
      reliability: {
        maxSchemaRetries: 0,
        repairMode: 'none',
        strictValidation: true
      }
    },
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        source: { type: 'string' }
      },
      required: ['ok', 'source'],
      additionalProperties: false
    },
    routing: {
      strategy: 'priority',
      candidates: [
        {
          provider: 'openai',
          model: 'gpt-4.1-mini',
          auth: { apiKey: 'openai-key' }
        },
        {
          provider: 'gemini',
          model: 'gemini-2.0-flash',
          auth: { apiKey: 'gemini-key' }
        }
      ]
    }
  });

  context.astRunOpenAi = originalRunOpenAi;
  context.astRunGemini = originalRunGemini;

  assert.equal(openAiCalls, 1);
  assert.equal(geminiCalls, 1);
  assert.equal(response.provider, 'gemini');
  assert.equal(JSON.stringify(response.output.json), JSON.stringify({ ok: true, source: 'gemini' }));
  assert.equal(response.route.attempts.length, 2);
  assert.equal(response.route.attempts[0].status, 'error');
  assert.equal(response.route.attempts[0].error.name, 'AstAiResponseParseError');
  assert.equal(response.route.attempts[1].status, 'ok');
});

test('astRunAiRequest applies cost_first strategy to routing candidates', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  const originalRunGemini = context.astRunGemini;
  const originalRunOpenRouter = context.astRunOpenRouter;
  const callOrder = [];

  context.astRunOpenAi = request => {
    callOrder.push(request.provider);
    return createSuccessResponse(context, request.provider, request.model, 'openai');
  };
  context.astRunGemini = request => {
    callOrder.push(request.provider);
    return createSuccessResponse(context, request.provider, request.model, 'gemini');
  };
  context.astRunOpenRouter = request => {
    callOrder.push(request.provider);
    return createSuccessResponse(context, request.provider, request.model, 'openrouter');
  };

  const response = context.astRunAiRequest({
    input: 'hello',
    routing: {
      strategy: 'cost_first',
      candidates: [
        {
          provider: 'openai',
          model: 'gpt-4.1-mini',
          auth: { apiKey: 'openai-key' }
        },
        {
          provider: 'gemini',
          model: 'gemini-2.0-flash',
          auth: { apiKey: 'gemini-key' }
        },
        {
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
          auth: { apiKey: 'openrouter-key' }
        }
      ]
    }
  });

  context.astRunOpenAi = originalRunOpenAi;
  context.astRunGemini = originalRunGemini;
  context.astRunOpenRouter = originalRunOpenRouter;

  assert.equal(response.provider, 'openrouter');
  assert.equal(response.output.text, 'openrouter');
  assert.equal(callOrder.length, 1);
  assert.equal(callOrder[0], 'openrouter');
  assert.equal(response.route.attempts[0].provider, 'openrouter');
});

test('astRunAiRequest preserves base options when routing candidate options are omitted', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  let observedRequest = null;

  context.astRunOpenAi = request => {
    observedRequest = request;
    return createSuccessResponse(context, 'openai', request.model, 'ok');
  };

  context.astRunAiRequest({
    input: 'hello',
    options: {
      retries: 0,
      timeoutMs: 12000
    },
    routing: {
      candidates: [
        {
          provider: 'openai',
          model: 'gpt-4.1-mini',
          auth: { apiKey: 'openai-key' }
        }
      ]
    }
  });

  context.astRunOpenAi = originalRunOpenAi;

  assert.ok(observedRequest);
  assert.equal(observedRequest.options.retries, 0);
  assert.equal(observedRequest.options.timeoutMs, 12000);
});

test('astRunAiRequest does not leak generic auth keys across provider fallback candidates', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          GEMINI_API_KEY: 'script-gemini-key',
          GEMINI_MODEL: 'gemini-2.0-flash'
        })
      })
    }
  });
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  const originalRunGemini = context.astRunGemini;

  context.astRunOpenAi = () => {
    throw createProviderError(503, 'temporary upstream failure');
  };
  context.astRunGemini = (_request, config) => {
    assert.equal(config.apiKey, 'script-gemini-key');
    return createSuccessResponse(context, 'gemini', config.model, 'gemini-success');
  };

  const response = context.astRunAiRequest({
    input: 'hello',
    routing: {
      strategy: 'priority',
      candidates: [
        {
          provider: 'openai',
          model: 'gpt-4.1-mini',
          auth: { apiKey: 'openai-key' }
        },
        {
          provider: 'gemini'
        }
      ]
    }
  });

  context.astRunOpenAi = originalRunOpenAi;
  context.astRunGemini = originalRunGemini;

  assert.equal(response.provider, 'gemini');
  assert.equal(response.output.text, 'gemini-success');
});

test('astValidateAiRequest rejects multi-candidate routing when stream is set in candidate options', () => {
  const context = createGasContext();
  loadAiScripts(context);

  assert.throws(
    () => context.astValidateAiRequest({
      input: 'hello',
      onEvent: () => {},
      routing: {
        candidates: [
          {
            provider: 'openai',
            auth: { apiKey: 'openai-key' }
          },
          {
            provider: 'gemini',
            auth: { apiKey: 'gemini-key' },
            options: { stream: true }
          }
        ]
      }
    }),
    /single routing candidate/
  );
});
