import { performance } from 'node:perf_hooks';

import { createGasContext } from '../local/helpers.mjs';
import { loadCacheScripts } from '../local/cache-helpers.mjs';

function measureMs(task) {
  const start = performance.now();
  task();
  return performance.now() - start;
}

function buildSeedEntries(count) {
  const entries = [];
  for (let idx = 0; idx < count; idx += 1) {
    entries.push({
      key: `k:${idx}`,
      value: { idx, value: `v${idx}` }
    });
  }
  return entries;
}

export function runCachePerf(_context, options = {}) {
  const samples = Number.isInteger(options.samples) ? Math.max(1, options.samples) : 1;
  const keyCount = 500;

  const metrics = [];
  for (let sampleIdx = 0; sampleIdx < samples; sampleIdx += 1) {
    const context = createGasContext();
    loadCacheScripts(context, { includeAst: true });

    context.AST.Cache.clearConfig();
    context.AST.Cache.configure({
      backend: 'memory',
      namespace: `perf_cache_batch_${sampleIdx}_${Date.now()}`
    });

    const keys = [];
    for (let idx = 0; idx < keyCount; idx += 1) {
      keys.push(`k:${idx}`);
    }
    const entries = buildSeedEntries(keyCount);

    const singleSetMs = measureMs(() => {
      for (let idx = 0; idx < entries.length; idx += 1) {
        const entry = entries[idx];
        context.AST.Cache.set(entry.key, entry.value, { ttlSec: 120, tags: ['perf'] });
      }
    });

    context.AST.Cache.clear();

    const batchSetMs = measureMs(() => {
      context.AST.Cache.setMany(entries, { ttlSec: 120, tags: ['perf'] });
    });

    const singleGetMs = measureMs(() => {
      for (let idx = 0; idx < keys.length; idx += 1) {
        context.AST.Cache.get(keys[idx]);
      }
    });

    const batchGetMs = measureMs(() => {
      context.AST.Cache.getMany(keys);
    });

    const setManyRelativePct = singleSetMs > 0 ? (batchSetMs / singleSetMs) * 100 : 0;
    const getManyRelativePct = singleGetMs > 0 ? (batchGetMs / singleGetMs) * 100 : 0;

    metrics.push({
      singleSetMs,
      batchSetMs,
      singleGetMs,
      batchGetMs,
      setManyRelativePct,
      getManyRelativePct
    });
  }

  const bestSample = metrics
    .slice()
    .sort((left, right) => (left.batchGetMs + left.batchSetMs) - (right.batchGetMs + right.batchSetMs))[0];
  const medianSample = metrics
    .slice()
    .sort((left, right) => (left.singleGetMs + left.singleSetMs) - (right.singleGetMs + right.singleSetMs))[Math.floor(metrics.length / 2)];

  return [{
    name: 'cache.batch_profile',
    bestMs: Number((bestSample.batchGetMs + bestSample.batchSetMs).toFixed(3)),
    medianMs: Number((medianSample.singleGetMs + medianSample.singleSetMs).toFixed(3)),
    maxHeapDeltaBytes: 0,
    samples,
    counters: {
      keyCount,
      singleSetMs: Number(bestSample.singleSetMs.toFixed(3)),
      batchSetMs: Number(bestSample.batchSetMs.toFixed(3)),
      singleGetMs: Number(bestSample.singleGetMs.toFixed(3)),
      batchGetMs: Number(bestSample.batchGetMs.toFixed(3)),
      setManyRelativePct: Number(bestSample.setManyRelativePct.toFixed(3)),
      getManyRelativePct: Number(bestSample.getManyRelativePct.toFixed(3))
    },
    outputType: 'Object'
  }];
}
