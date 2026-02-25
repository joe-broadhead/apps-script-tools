import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadAiScripts } from './ai-helpers.mjs';

function baseSchema() {
  return {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      source: { type: 'string' }
    },
    required: ['ok', 'source'],
    additionalProperties: false
  };
}

function baseStructuredRequest(overrides = {}) {
  return Object.assign({
    provider: 'openai',
    operation: 'structured',
    input: 'return json',
    model: 'gpt-4.1-mini',
    auth: {
      apiKey: 'test-key'
    },
    schema: baseSchema()
  }, overrides);
}

function normalizedStructuredResponse(context, payload = {}) {
  return context.astNormalizeAiResponse(Object.assign({
    provider: 'openai',
    operation: 'structured',
    model: 'gpt-4.1-mini'
  }, payload));
}

test('astValidateAiRequest normalizes structured reliability defaults', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const normalized = context.astValidateAiRequest(baseStructuredRequest());

  assert.equal(normalized.options.reliability.maxSchemaRetries, 2);
  assert.equal(normalized.options.reliability.repairMode, 'json_repair');
  assert.equal(normalized.options.reliability.strictValidation, true);
});

test('astRunAiRequest retries schema failures and returns valid structured output', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  let calls = 0;

  context.astRunOpenAi = request => {
    calls += 1;

    if (calls === 1) {
      return normalizedStructuredResponse(context, {
        output: {
          text: '{"ok":"true","source":"openai"}',
          json: { ok: 'true', source: 'openai' }
        }
      });
    }

    return normalizedStructuredResponse(context, {
      output: {
        text: '{"ok":true,"source":"openai"}',
        json: { ok: true, source: 'openai' }
      }
    });
  };

  const response = context.astRunAiRequest(baseStructuredRequest());

  context.astRunOpenAi = originalRunOpenAi;

  assert.equal(calls, 2);
  assert.equal(JSON.stringify(response.output.json), JSON.stringify({ ok: true, source: 'openai' }));
});

test('astRunAiRequest repairs malformed JSON in structured output with json_repair mode', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  let calls = 0;

  context.astRunOpenAi = () => {
    calls += 1;
    return normalizedStructuredResponse(context, {
      output: {
        text: '```json\n{"ok": true, "source": "openai",}\n```',
        json: null
      }
    });
  };

  const response = context.astRunAiRequest(baseStructuredRequest({
    options: {
      reliability: {
        maxSchemaRetries: 0,
        repairMode: 'json_repair',
        strictValidation: true
      }
    }
  }));

  context.astRunOpenAi = originalRunOpenAi;

  assert.equal(calls, 1);
  assert.equal(JSON.stringify(response.output.json), JSON.stringify({ ok: true, source: 'openai' }));
});

test('astRunAiRequest supports llm_repair mode for malformed structured output', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  let calls = 0;

  context.astRunOpenAi = request => {
    calls += 1;

    if (request.operation === 'text') {
      assert.equal(Array.isArray(request.messages), true);
      assert.equal(request.messages[0].role, 'system');
      assert.equal(request.messages[1].role, 'user');
      return context.astNormalizeAiResponse({
        provider: 'openai',
        operation: 'text',
        model: 'gpt-4.1-mini',
        output: {
          text: '{"ok":true,"source":"repair"}'
        }
      });
    }

    return normalizedStructuredResponse(context, {
      output: {
        text: 'not-json-response',
        json: null
      }
    });
  };

  const response = context.astRunAiRequest(baseStructuredRequest({
    options: {
      reliability: {
        maxSchemaRetries: 0,
        repairMode: 'llm_repair',
        strictValidation: true
      }
    }
  }));

  context.astRunOpenAi = originalRunOpenAi;

  assert.equal(calls, 2);
  assert.equal(JSON.stringify(response.output.json), JSON.stringify({ ok: true, source: 'repair' }));
});

test('astRunAiRequest throws deterministic parse error with diagnostics after retry exhaustion', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.astRunOpenAi;
  let calls = 0;

  context.astRunOpenAi = () => {
    calls += 1;
    return normalizedStructuredResponse(context, {
      output: {
        text: '{"ok":"still-wrong"}',
        json: { ok: 'still-wrong' }
      }
    });
  };

  assert.throws(
    () => context.astRunAiRequest(baseStructuredRequest({
      options: {
        reliability: {
          maxSchemaRetries: 1,
          repairMode: 'none',
          strictValidation: true
        }
      }
    })),
    error => {
      assert.equal(error.name, 'AstAiResponseParseError');
      assert.equal(error.details.retryCount, 1);
      assert.equal(Array.isArray(error.details.attempts), true);
      assert.equal(error.details.attempts.length, 2);
      assert.equal(error.details.attempts[0].kind, 'schema_validation');
      return true;
    }
  );

  context.astRunOpenAi = originalRunOpenAi;
  assert.equal(calls, 2);
});
