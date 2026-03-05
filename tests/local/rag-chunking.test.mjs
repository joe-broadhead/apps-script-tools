import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadRagScripts } from './rag-helpers.mjs';

test('RAG chunking normalization defaults to char strategy and accepts sentence strategy', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAi: false, includeUtilities: false });

  const defaultChunking = context.astRagNormalizeChunking({});
  assert.equal(defaultChunking.chunkStrategy, 'char');

  const sentenceChunking = context.astRagNormalizeChunking({
    chunkSizeChars: 200,
    chunkOverlapChars: 20,
    minChunkChars: 10,
    chunkStrategy: 'sentence'
  });
  assert.equal(sentenceChunking.chunkStrategy, 'sentence');

  assert.throws(
    () => context.astRagNormalizeChunking({
      chunkStrategy: 'tokens'
    }),
    /chunking.chunkStrategy must be one of: char, sentence/
  );
});

test('RAG char chunk strategy remains unchanged when strategy is omitted', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAi: false, includeUtilities: false });

  const segment = {
    section: 'body',
    page: null,
    slide: null,
    text: 'Alpha one. Bravo two. Charlie three. Delta four.'
  };
  const defaultChunks = context.astRagChunkSegments([segment], {
    chunkSizeChars: 18,
    chunkOverlapChars: 4,
    minChunkChars: 1
  });
  const explicitCharChunks = context.astRagChunkSegments([segment], {
    chunkSizeChars: 18,
    chunkOverlapChars: 4,
    minChunkChars: 1,
    chunkStrategy: 'char'
  });

  assert.equal(JSON.stringify(defaultChunks), JSON.stringify(explicitCharChunks));
});

test('RAG sentence chunk strategy keeps boundaries and sentence-level overlap', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAi: false, includeUtilities: false });

  const chunks = context.astRagChunkSegments([{
    section: 'body',
    text: 'Alpha one. Bravo two. Charlie three. Delta four.'
  }], {
    chunkSizeChars: 30,
    chunkOverlapChars: 10,
    minChunkChars: 1,
    chunkStrategy: 'sentence'
  });

  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].text, 'Alpha one. Bravo two.');
  assert.equal(chunks[1].text, 'Bravo two. Charlie three.');
  assert.equal(chunks[2].text, 'Charlie three. Delta four.');
});

test('RAG sentence chunk strategy falls back safely for long sentences', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAi: false, includeUtilities: false });

  const longSentence = `${'A'.repeat(70)}. Tail sentence.`;
  const chunks = context.astRagChunkSegments([{
    section: 'body',
    text: longSentence
  }], {
    chunkSizeChars: 25,
    chunkOverlapChars: 0,
    minChunkChars: 1,
    chunkStrategy: 'sentence'
  });

  assert.equal(chunks.length > 1, true);
  assert.equal(chunks.every(chunk => chunk.text.length <= 25), true);
  assert.equal(chunks.some(chunk => chunk.text.indexOf('Tail sentence.') !== -1), true);
});

test('RAG sentence splitter preserves newline-delimited text without punctuation', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAi: false, includeUtilities: false });

  const sentences = context.astRagSplitTextIntoSentences('Alpha line\nBravo line.');
  assert.equal(JSON.stringify(sentences), JSON.stringify(['Alpha line', 'Bravo line.']));
});

test('RAG sentence chunking does not drop undersized pre-long-sentence content', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAi: false, includeUtilities: false });

  const chunks = context.astRagChunkSegments([{
    section: 'body',
    text: 'Hi. Supercalifragilisticexpialidocioussupercalifragilisticexpialidocious.'
  }], {
    chunkSizeChars: 20,
    chunkOverlapChars: 0,
    minChunkChars: 10,
    chunkStrategy: 'sentence'
  });

  assert.equal(chunks.length > 1, true);
  assert.equal(chunks.some(chunk => chunk.text.indexOf('Hi.') !== -1), true);
});
