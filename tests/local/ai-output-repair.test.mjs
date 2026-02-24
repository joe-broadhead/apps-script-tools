import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadAiScripts } from './ai-helpers.mjs';

function normalizedTextResponse(context, text, finishReason = null) {
  return context.normalizeAiResponse({
    provider: 'openai',
    operation: 'text',
    model: 'gpt-4.1-mini',
    finishReason,
    output: {
      text
    }
  });
}

test('OutputRepair.continueIfTruncated returns unchanged text when not truncated', () => {
  const context = createGasContext();
  loadAiScripts(context, { includeAst: true });

  const result = context.AST.AI.OutputRepair.continueIfTruncated({
    provider: 'openai',
    model: 'gpt-4.1-mini',
    partial: 'This is already complete.',
    auth: { apiKey: 'test-key' }
  });

  assert.equal(result.continued, false);
  assert.equal(result.likelyTruncated, false);
  assert.equal(result.text, 'This is already complete.');
});

test('OutputRepair.continueIfTruncated requests continuation when finishReason indicates truncation', () => {
  const context = createGasContext();
  loadAiScripts(context, { includeAst: true });

  let calls = 0;
  const originalRunOpenAi = context.runOpenAi;
  context.runOpenAi = () => {
    calls += 1;
    return normalizedTextResponse(context, ' and the final milestone is reopening.');
  };

  const result = context.AST.AI.OutputRepair.continueIfTruncated({
    provider: 'openai',
    model: 'gpt-4.1-mini',
    partial: 'The project has three milestones',
    finishReason: 'length',
    auth: { apiKey: 'test-key' }
  });

  context.runOpenAi = originalRunOpenAi;

  assert.equal(calls, 1);
  assert.equal(result.continued, true);
  assert.equal(
    result.text,
    'The project has three milestones and the final milestone is reopening.'
  );
});

test('OutputRepair.continueIfTruncated merges overlap to avoid duplicate continuation text', () => {
  const context = createGasContext();
  loadAiScripts(context, { includeAst: true });

  const originalRunOpenAi = context.runOpenAi;
  context.runOpenAi = () => normalizedTextResponse(
    context,
    'are plan, build, and launch.'
  );

  const result = context.AST.AI.OutputRepair.continueIfTruncated({
    provider: 'openai',
    model: 'gpt-4.1-mini',
    partial: 'The project phases are ',
    finishReason: 'length',
    auth: { apiKey: 'test-key' }
  });

  context.runOpenAi = originalRunOpenAi;

  assert.equal(result.text, 'The project phases are plan, build, and launch.');
});
