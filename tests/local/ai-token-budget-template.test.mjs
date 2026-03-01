import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadAiScripts } from './ai-helpers.mjs';

function createContext() {
  const context = createGasContext();
  loadAiScripts(context, { includeAst: true });
  return context;
}

test('AST.AI.estimateTokens returns provider-aware budget diagnostics', () => {
  const context = createContext();

  const openAiEstimate = context.AST.AI.estimateTokens({
    provider: 'openai',
    system: 'You are concise.',
    input: 'Summarize customer churn risks and mitigations.',
    options: {
      maxOutputTokens: 300,
      maxTotalTokens: 320
    }
  });

  const geminiEstimate = context.AST.AI.estimateTokens({
    provider: 'gemini',
    system: 'You are concise.',
    input: 'Summarize customer churn risks and mitigations.',
    options: {
      maxOutputTokens: 300,
      maxTotalTokens: 320
    }
  });

  assert.equal(openAiEstimate.status, 'ok');
  assert.equal(openAiEstimate.provider, 'openai');
  assert.equal(openAiEstimate.budget.maxTotalTokens, 320);
  assert.equal(openAiEstimate.totalTokens > 0, true);
  assert.equal(openAiEstimate.budget.exceedsBudget, openAiEstimate.totalTokens > 320);

  assert.equal(geminiEstimate.status, 'ok');
  assert.equal(geminiEstimate.provider, 'gemini');
  assert.notEqual(
    openAiEstimate.approximation.charsPerToken,
    geminiEstimate.approximation.charsPerToken
  );
});

test('AST.AI.truncateMessages applies tail strategy deterministically', () => {
  const context = createContext();

  const response = context.AST.AI.truncateMessages({
    provider: 'openai',
    messages: [
      { role: 'system', content: 'Always cite evidence.' },
      { role: 'user', content: 'Question one with lots of context 1111111111111111111111111111' },
      { role: 'assistant', content: 'Answer one with details 22222222222222222222222222222222' },
      { role: 'user', content: 'Question two with lots of context 3333333333333333333333333333' },
      { role: 'assistant', content: 'Answer two with details 44444444444444444444444444444444' }
    ],
    maxInputTokens: 35,
    strategy: 'tail'
  });

  assert.equal(response.status, 'ok');
  assert.equal(response.strategy, 'tail');
  assert.equal(response.truncated, true);
  assert.equal(response.after.inputTokens <= 35, true);
  assert.equal(response.messages[0].role, 'system');
  assert.equal(response.messages[response.messages.length - 1].content.includes('4444'), true);
});

test('AST.AI.truncateMessages semantic_blocks keeps complete turn blocks', () => {
  const context = createContext();

  const response = context.AST.AI.truncateMessages({
    provider: 'openai',
    messages: [
      { role: 'system', content: 'Return grounded answers only.' },
      { role: 'user', content: 'turn1 user 111111111111111111111111111111111111111' },
      { role: 'assistant', content: 'turn1 assistant 111111111111111111111111111111111' },
      { role: 'user', content: 'turn2 user 222222222222222222222222222222222222222' },
      { role: 'assistant', content: 'turn2 assistant 222222222222222222222222222222222' },
      { role: 'user', content: 'turn3 user 333333333333333333333333333333333333333' }
    ],
    maxInputTokens: 45,
    strategy: 'semantic_blocks'
  });

  const containsTurn2User = response.messages.some(msg => typeof msg.content === 'string' && msg.content.includes('turn2 user'));
  const containsTurn2Assistant = response.messages.some(msg => typeof msg.content === 'string' && msg.content.includes('turn2 assistant'));

  assert.equal(response.status, 'ok');
  assert.equal(response.strategy, 'semantic_blocks');
  assert.equal(response.after.inputTokens <= 45, true);
  assert.equal(containsTurn2User, containsTurn2Assistant);
});

test('AST.AI.truncateMessages rejects unsupported strategy', () => {
  const context = createContext();

  assert.throws(
    () => context.AST.AI.truncateMessages({
      provider: 'openai',
      input: 'hello',
      maxInputTokens: 20,
      strategy: 'middle'
    }),
    /strategy must be one of/
  );
});

test('AST.AI.renderPromptTemplate fails on missing variables in strict mode', () => {
  const context = createContext();

  assert.throws(
    () => context.AST.AI.renderPromptTemplate({
      template: 'Hello {{ user.name }}, ticket {{ ticket.id }} is {{ ticket.status }}.',
      variables: {
        user: { name: 'Alex' },
        ticket: { id: 'INC-42' }
      }
    }),
    /missing variables/
  );
});

test('AST.AI.renderPromptTemplate supports strict unused checks', () => {
  const context = createContext();

  assert.throws(
    () => context.AST.AI.renderPromptTemplate({
      template: 'Owner {{ owner }}',
      variables: {
        owner: 'team-a',
        extra: 'unused'
      },
      options: {
        failOnUnused: true
      }
    }),
    /unused values/
  );
});

test('AST.AI.renderPromptTemplate failOnUnused ignores nested leaf paths when parent is used', () => {
  const context = createContext();

  const response = context.AST.AI.renderPromptTemplate({
    template: 'Owner {{ owner }}',
    variables: {
      owner: {
        team: 'revops'
      }
    },
    options: {
      failOnUnused: true
    }
  });

  assert.equal(response.status, 'ok');
  assert.equal(response.text.includes('"team":"revops"'), true);
});

test('AST.AI.renderPromptTemplate missingBehavior=error throws even when strict=false', () => {
  const context = createContext();

  assert.throws(
    () => context.AST.AI.renderPromptTemplate({
      template: 'Hello {{name}} {{missing}}',
      variables: { name: 'AST' },
      options: {
        strict: false,
        missingBehavior: 'error'
      }
    }),
    /missing variables/
  );
});

test('AST.AI.renderPromptTemplate can keep missing placeholders when configured', () => {
  const context = createContext();

  const response = context.AST.AI.renderPromptTemplate({
    template: 'Hello {{ name }}, status={{ status }}.',
    variables: {
      name: 'Taylor'
    },
    options: {
      strict: false,
      missingBehavior: 'keep'
    }
  });

  assert.equal(response.status, 'ok');
  assert.equal(response.text, 'Hello Taylor, status={{ status }}.');
  assert.equal(JSON.stringify(response.missingVariables), JSON.stringify(['status']));
  assert.equal(JSON.stringify(response.usedVariables), JSON.stringify(['name']));
});
