import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext, loadScripts } from './helpers.mjs';
import { loadAiScripts } from './ai-helpers.mjs';

function normalizedTextResponse(context, text, finishReason = null) {
  return context.astNormalizeAiResponse({
    provider: 'openai',
    operation: 'text',
    model: 'gpt-4.1-mini',
    finishReason,
    output: {
      text
    }
  });
}

function loadOutputRepairFacadeOrder(context, order) {
  const common = [
    'apps_script_tools/ai/general/errors.js'
  ];
  const outputRepair = 'apps_script_tools/ai/general/outputRepair.js';
  const aiFacade = 'apps_script_tools/ai/AI.js';
  const astFacade = 'apps_script_tools/AST.js';

  if (order === 'implementation-first') {
    loadScripts(context, [...common, outputRepair, aiFacade, astFacade]);
    return context;
  }

  loadScripts(context, [...common, aiFacade, astFacade]);
  return context;
}

function assertOutputRepairUsesImplementation(context) {
  const result = context.AST.AI.OutputRepair.continueIfTruncated({
    provider: 'openai',
    model: 'gpt-4.1-mini',
    partial: 'This answer is already complete.',
    auth: { apiKey: 'test-key' }
  });

  assert.equal(result.continued, false);
  assert.equal(result.likelyTruncated, false);
  assert.equal(result.text, 'This answer is already complete.');
}

test('AST.AI.OutputRepair resolves when implementation loads before AI facade', () => {
  const context = createGasContext();
  loadOutputRepairFacadeOrder(context, 'implementation-first');

  assertOutputRepairUsesImplementation(context);
});

test('AST.AI.OutputRepair resolves when implementation loads after AI facade', () => {
  const context = createGasContext();
  loadOutputRepairFacadeOrder(context, 'facade-first');

  assert.throws(
    () => context.AST.AI.OutputRepair.continueIfTruncated({
      provider: 'openai',
      model: 'gpt-4.1-mini',
      partial: 'This answer is already complete.',
      auth: { apiKey: 'test-key' }
    }),
    error => {
      assert.equal(error.name, 'AstAiValidationError');
      assert.match(error.message, /OutputRepair runtime is not available/);
      return true;
    }
  );

  loadScripts(context, ['apps_script_tools/ai/general/outputRepair.js']);
  assertOutputRepairUsesImplementation(context);
});

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
  const originalRunOpenAi = context.astRunOpenAi;
  context.astRunOpenAi = () => {
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

  context.astRunOpenAi = originalRunOpenAi;

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

  const originalRunOpenAi = context.astRunOpenAi;
  context.astRunOpenAi = () => normalizedTextResponse(
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

  context.astRunOpenAi = originalRunOpenAi;

  assert.equal(result.text, 'The project phases are plan, build, and launch.');
});

test('OutputRepair.continueIfTruncated uses the partial tail in continuation prompts', () => {
  const context = createGasContext();
  loadAiScripts(context, { includeAst: true });

  let capturedPrompt = '';
  const originalRunOpenAi = context.astRunOpenAi;
  context.astRunOpenAi = request => {
    capturedPrompt = request.input;
    return normalizedTextResponse(context, ' and completion.');
  };

  const partial = 'HEAD_MARKER_SHOULD_NOT_BE_IN_TAIL\n'
    + 'a'.repeat(5000)
    + '\nTAIL_MARKER_SHOULD_BE_PRESENT';

  context.AST.AI.OutputRepair.continueIfTruncated({
    provider: 'openai',
    model: 'gpt-4.1-mini',
    partial,
    finishReason: 'length',
    auth: { apiKey: 'test-key' }
  });

  context.astRunOpenAi = originalRunOpenAi;

  assert.equal(capturedPrompt.includes('HEAD_MARKER_SHOULD_NOT_BE_IN_TAIL'), false);
  assert.equal(capturedPrompt.includes('TAIL_MARKER_SHOULD_BE_PRESENT'), true);
});
