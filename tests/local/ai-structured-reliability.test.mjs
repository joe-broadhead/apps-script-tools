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
  return context.normalizeAiResponse(Object.assign({
    provider: 'openai',
    operation: 'structured',
    model: 'gpt-4.1-mini'
  }, payload));
}

test('validateAiRequest normalizes structured reliability defaults', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const normalized = context.validateAiRequest(baseStructuredRequest());

  assert.equal(normalized.options.reliability.maxSchemaRetries, 2);
  assert.equal(normalized.options.reliability.repairMode, 'json_repair');
  assert.equal(normalized.options.reliability.strictValidation, true);
});

test('runAiRequest retries schema failures and returns valid structured output', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.runOpenAi;
  let calls = 0;

  context.runOpenAi = request => {
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

  const response = context.runAiRequest(baseStructuredRequest());

  context.runOpenAi = originalRunOpenAi;

  assert.equal(calls, 2);
  assert.equal(JSON.stringify(response.output.json), JSON.stringify({ ok: true, source: 'openai' }));
});

test('runAiRequest repairs malformed JSON in structured output with json_repair mode', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.runOpenAi;
  let calls = 0;

  context.runOpenAi = () => {
    calls += 1;
    return normalizedStructuredResponse(context, {
      output: {
        text: '```json\n{"ok": true, "source": "openai",}\n```',
        json: null
      }
    });
  };

  const response = context.runAiRequest(baseStructuredRequest({
    options: {
      reliability: {
        maxSchemaRetries: 0,
        repairMode: 'json_repair',
        strictValidation: true
      }
    }
  }));

  context.runOpenAi = originalRunOpenAi;

  assert.equal(calls, 1);
  assert.equal(JSON.stringify(response.output.json), JSON.stringify({ ok: true, source: 'openai' }));
});

test('runAiRequest supports llm_repair mode for malformed structured output', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.runOpenAi;
  let calls = 0;

  context.runOpenAi = request => {
    calls += 1;

    if (request.operation === 'text') {
      return context.normalizeAiResponse({
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

  const response = context.runAiRequest(baseStructuredRequest({
    options: {
      reliability: {
        maxSchemaRetries: 0,
        repairMode: 'llm_repair',
        strictValidation: true
      }
    }
  }));

  context.runOpenAi = originalRunOpenAi;

  assert.equal(calls, 2);
  assert.equal(JSON.stringify(response.output.json), JSON.stringify({ ok: true, source: 'repair' }));
});

test('runAiRequest throws deterministic parse error with diagnostics after retry exhaustion', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const originalRunOpenAi = context.runOpenAi;
  let calls = 0;

  context.runOpenAi = () => {
    calls += 1;
    return normalizedStructuredResponse(context, {
      output: {
        text: '{"ok":"still-wrong"}',
        json: { ok: 'still-wrong' }
      }
    });
  };

  assert.throws(
    () => context.runAiRequest(baseStructuredRequest({
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

  context.runOpenAi = originalRunOpenAi;
  assert.equal(calls, 2);
});
