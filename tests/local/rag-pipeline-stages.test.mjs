import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadRagScripts } from './rag-helpers.mjs';

test('rag stage helpers build answer diagnostics with stable defaults', () => {
  const context = createGasContext();
  loadRagScripts(context);

  const diagnostics = context.astRagBuildAnswerDiagnostics({
    backend: 'memory',
    namespace: 'ast_rag',
    lockScope: 'script'
  }, 1500);

  assert.equal(typeof diagnostics, 'object');
  assert.equal(diagnostics.cache.backend, 'memory');
  assert.equal(diagnostics.cache.namespace, 'ast_rag');
  assert.equal(diagnostics.retrieval.timeoutMs, 1500);
  assert.equal(diagnostics.retrieval.candidateCounts.returned, 0);
  assert.equal(diagnostics.generation.status, 'not_started');
});

test('rag stage helpers deterministically select shard refs by vector similarity', () => {
  const context = createGasContext();
  loadRagScripts(context);

  const selected = context.astRagSelectShardRefsForSearch({
    shards: [
      { shardId: 'z', fileId: 'file_z', centroid: [0, 1], centroidNorm: 1 },
      { shardId: 'a', fileId: 'file_a', centroid: [1, 0], centroidNorm: 1 }
    ]
  }, {
    mode: 'hybrid',
    partition: {
      enabled: true,
      maxShards: 1
    }
  }, [1, 0]);

  assert.equal(Array.isArray(selected), true);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].shardId, 'a');
});

test('rag stage helpers mark timeout diagnostics and throw typed retrieval error', () => {
  const context = createGasContext();
  loadRagScripts(context);

  const diagnostics = {
    retrieval: {
      timedOut: false,
      timeoutMs: null,
      timeoutStage: null
    }
  };

  assert.throws(
    () => context.astRagAssertRetrievalWithinBudgetShared(1, 0, 'retrieval', diagnostics),
    /RAG retrieval exceeded maxRetrievalMs budget/
  );
  assert.equal(diagnostics.retrieval.timedOut, true);
  assert.equal(diagnostics.retrieval.timeoutMs, 1);
  assert.equal(diagnostics.retrieval.timeoutStage, 'retrieval');
});
