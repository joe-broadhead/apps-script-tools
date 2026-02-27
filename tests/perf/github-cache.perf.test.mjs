import { performance } from 'node:perf_hooks';

import { createGasContext } from '../local/helpers.mjs';
import { loadGitHubScripts } from '../local/github-helpers.mjs';

function createResponse(statusCode, body, headers = {}) {
  const bodyText = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    getResponseCode: () => statusCode,
    getContentText: () => bodyText,
    getAllHeaders: () => headers
  };
}

function createCacheMock() {
  const store = new Map();
  const tags = new Map();

  return {
    get: key => (store.has(key) ? store.get(key) : null),
    set: (key, value, options = {}) => {
      store.set(key, value);
      const itemTags = Array.isArray(options.tags) ? options.tags : [];
      itemTags.forEach(tag => {
        const keySet = tags.get(tag) || new Set();
        keySet.add(key);
        tags.set(tag, keySet);
      });
      return true;
    },
    delete: key => store.delete(key),
    invalidateByTag: tag => {
      const keySet = tags.get(tag);
      if (!keySet) {
        return 0;
      }
      let removed = 0;
      keySet.forEach(key => {
        if (store.delete(key)) {
          removed += 1;
        }
      });
      tags.delete(tag);
      return removed;
    },
    clear: () => {
      store.clear();
      tags.clear();
    }
  };
}

function buildLargeRepositoryPayload() {
  const largeDescription = 'x'.repeat(512 * 1024);
  return {
    id: 123,
    name: 'hello-world',
    full_name: 'octocat/hello-world',
    description: largeDescription,
    topics: ['apps-script', 'cache', 'perf']
  };
}

function measureMs(fn) {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

export function runGithubPerf(_context, options = {}) {
  const samples = Number.isInteger(options.samples) ? Math.max(1, options.samples) : 1;

  const metrics = [];
  for (let idx = 0; idx < samples; idx += 1) {
    const cache = createCacheMock();
    const payload = buildLargeRepositoryPayload();

    let mode = 'cold';
    let fetchCalls = 0;

    const context = createGasContext({
      AST_CACHE: cache,
      UrlFetchApp: {
        fetch: () => {
          fetchCalls += 1;
          if (mode === 'etag') {
            return createResponse(304, '', { etag: '"repo-v1"' });
          }
          return createResponse(200, payload, { etag: '"repo-v1"' });
        }
      }
    });

    loadGitHubScripts(context, { includeAst: true });

    context.AST.GitHub.configure({
      GITHUB_TOKEN: 'perf-token',
      GITHUB_CACHE_ENABLED: true,
      GITHUB_CACHE_BACKEND: 'memory',
      GITHUB_CACHE_NAMESPACE: 'perf_github',
      GITHUB_CACHE_TTL_SEC: 120,
      GITHUB_CACHE_STALE_TTL_SEC: 600,
      GITHUB_CACHE_ETAG_TTL_SEC: 3600
    });

    const request = {
      owner: 'octocat',
      repo: 'hello-world'
    };

    const coldMs = measureMs(() => {
      context.AST.GitHub.getRepository(Object.assign({}, request, {
        options: {
          cache: {
            enabled: false
          }
        }
      }));
    });

    cache.clear();
    mode = 'cold';
    context.AST.GitHub.getRepository(request);
    mode = 'warm';
    const warmMs = measureMs(() => {
      context.AST.GitHub.getRepository(request);
    });

    cache.clear();
    context.AST.GitHub.configure({
      GITHUB_CACHE_TTL_SEC: 0,
      GITHUB_CACHE_STALE_TTL_SEC: 600,
      GITHUB_CACHE_ETAG_TTL_SEC: 3600
    });
    mode = 'cold';
    context.AST.GitHub.getRepository(request);
    mode = 'etag';
    const etagMs = measureMs(() => {
      context.AST.GitHub.getRepository(request);
    });

    const warmRelativePct = coldMs > 0 ? (warmMs / coldMs) * 100 : 0;
    const etagRelativePct = coldMs > 0 ? (etagMs / coldMs) * 100 : 0;

    metrics.push({
      coldMs,
      warmMs,
      etagMs,
      warmRelativePct,
      etagRelativePct,
      fetchCalls
    });
  }

  const bestSample = metrics.slice().sort((a, b) => a.warmRelativePct - b.warmRelativePct)[0];
  const medianSample = metrics.slice().sort((a, b) => a.coldMs - b.coldMs)[Math.floor(metrics.length / 2)];

  return [{
    name: 'github.cache_profile',
    bestMs: Number(bestSample.warmMs.toFixed(3)),
    medianMs: Number(medianSample.coldMs.toFixed(3)),
    maxHeapDeltaBytes: 0,
    samples,
    counters: {
      warmRelativePct: Number(bestSample.warmRelativePct.toFixed(3)),
      etagRelativePct: Number(bestSample.etagRelativePct.toFixed(3)),
      coldMs: Number(bestSample.coldMs.toFixed(3)),
      warmMs: Number(bestSample.warmMs.toFixed(3)),
      etagMs: Number(bestSample.etagMs.toFixed(3))
    },
    outputType: 'Object'
  }];
}
