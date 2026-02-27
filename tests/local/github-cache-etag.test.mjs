import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadGitHubScripts } from './github-helpers.mjs';

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
        const set = tags.get(tag) || new Set();
        set.add(key);
        tags.set(tag, set);
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
    _store: store
  };
}

test('cache miss then fresh hit avoids second network call', () => {
  const cache = createCacheMock();
  let fetchCalls = 0;

  const context = createGasContext({
    AST_CACHE: cache,
    UrlFetchApp: {
      fetch: () => {
        fetchCalls += 1;
        return createResponse(200, { id: 1 }, { etag: '"v1"' });
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_TOKEN: 'token',
    GITHUB_CACHE_ENABLED: true,
    GITHUB_CACHE_BACKEND: 'memory',
    GITHUB_CACHE_NAMESPACE: 'gh_cache_test',
    GITHUB_CACHE_TTL_SEC: 120,
    GITHUB_CACHE_STALE_TTL_SEC: 600,
    GITHUB_CACHE_ETAG_TTL_SEC: 3600
  });

  const first = context.AST.GitHub.getRepository({
    owner: 'octocat',
    repo: 'hello-world'
  });
  const second = context.AST.GitHub.getRepository({
    owner: 'octocat',
    repo: 'hello-world'
  });

  assert.equal(fetchCalls, 1);
  assert.equal(first.cache.hit, false);
  assert.equal(second.cache.hit, true);
  assert.equal(second.cache.revalidated304, false);
});

test('etag revalidation uses If-None-Match and returns cached payload on 304', () => {
  const cache = createCacheMock();
  const seenHeaders = [];
  let fetchCalls = 0;

  const context = createGasContext({
    AST_CACHE: cache,
    UrlFetchApp: {
      fetch: (_url, options) => {
        fetchCalls += 1;
        seenHeaders.push(options.headers || {});

        if (fetchCalls === 1) {
          return createResponse(200, { id: 1, state: 'fresh' }, { etag: '"v1"' });
        }

        return createResponse(304, '', { etag: '"v1"' });
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_TOKEN: 'token',
    GITHUB_CACHE_ENABLED: true,
    GITHUB_CACHE_BACKEND: 'memory',
    GITHUB_CACHE_NAMESPACE: 'gh_cache_304',
    GITHUB_CACHE_TTL_SEC: 0,
    GITHUB_CACHE_STALE_TTL_SEC: 600,
    GITHUB_CACHE_ETAG_TTL_SEC: 3600
  });

  const first = context.AST.GitHub.getRepository({
    owner: 'octocat',
    repo: 'hello-world'
  });
  const second = context.AST.GitHub.getRepository({
    owner: 'octocat',
    repo: 'hello-world'
  });

  assert.equal(fetchCalls, 2);
  assert.equal(first.cache.hit, false);
  assert.equal(second.cache.hit, true);
  assert.equal(second.cache.revalidated304, true);
  assert.equal(second.data.state, 'fresh');
  assert.equal(typeof seenHeaders[1]['If-None-Match'], 'string');
});

test('cache serves stale response on provider error when enabled', () => {
  const cache = createCacheMock();
  let fetchCalls = 0;

  const context = createGasContext({
    AST_CACHE: cache,
    UrlFetchApp: {
      fetch: () => {
        fetchCalls += 1;
        if (fetchCalls === 1) {
          return createResponse(200, { id: 1, source: 'cached' }, { etag: '"v1"' });
        }
        return createResponse(503, { message: 'upstream unavailable' });
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_TOKEN: 'token',
    GITHUB_CACHE_ENABLED: true,
    GITHUB_CACHE_BACKEND: 'memory',
    GITHUB_CACHE_NAMESPACE: 'gh_cache_stale',
    GITHUB_RETRIES: 0,
    GITHUB_CACHE_TTL_SEC: 0,
    GITHUB_CACHE_STALE_TTL_SEC: 600,
    GITHUB_CACHE_ETAG_TTL_SEC: 0,
    GITHUB_CACHE_SERVE_STALE_ON_ERROR: true
  });

  context.AST.GitHub.getRepository({
    owner: 'octocat',
    repo: 'hello-world'
  });
  const second = context.AST.GitHub.getRepository({
    owner: 'octocat',
    repo: 'hello-world'
  });

  assert.equal(fetchCalls, 2);
  assert.equal(second.cache.hit, true);
  assert.equal(second.data.source, 'cached');
  assert.equal(second.warnings.length > 0, true);
});

test('graphql mutation invalidates cached read tags', () => {
  const cache = createCacheMock();
  let repoCalls = 0;
  let graphqlCalls = 0;

  const context = createGasContext({
    AST_CACHE: cache,
    UrlFetchApp: {
      fetch: url => {
        if (String(url).indexOf('/graphql') !== -1) {
          graphqlCalls += 1;
          return createResponse(200, { data: { updateIssue: { issue: { id: 'I_1' } } } });
        }

        repoCalls += 1;
        if (repoCalls === 1) {
          return createResponse(200, { id: 1, name: 'first' }, { etag: '"v1"' });
        }
        return createResponse(200, { id: 2, name: 'second' }, { etag: '"v2"' });
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_TOKEN: 'token',
    GITHUB_CACHE_ENABLED: true,
    GITHUB_CACHE_BACKEND: 'memory',
    GITHUB_CACHE_NAMESPACE: 'gh_cache_graphql_invalidate',
    GITHUB_CACHE_TTL_SEC: 120,
    GITHUB_CACHE_STALE_TTL_SEC: 600,
    GITHUB_CACHE_ETAG_TTL_SEC: 3600
  });

  const firstRead = context.AST.GitHub.getRepository({
    owner: 'octocat',
    repo: 'hello-world'
  });
  assert.equal(firstRead.cache.hit, false);

  context.AST.GitHub.graphql({
    query: 'mutation { updateIssue(input:{id:\"I_1\",title:\"x\"}) { issue { id } } }',
    variables: { owner: 'octocat', repo: 'hello-world' }
  });

  const secondRead = context.AST.GitHub.getRepository({
    owner: 'octocat',
    repo: 'hello-world'
  });

  assert.equal(graphqlCalls, 1);
  assert.equal(repoCalls, 2);
  assert.equal(secondRead.cache.hit, false);
  assert.equal(secondRead.data.id, 2);
});

test('rest mutation invalidates cached graphql read entries via github:all tag', () => {
  const cache = createCacheMock();
  let graphqlCalls = 0;
  let restMutationCalls = 0;

  const context = createGasContext({
    AST_CACHE: cache,
    UrlFetchApp: {
      fetch: (url, options = {}) => {
        const normalizedUrl = String(url || '');
        const method = String(options.method || 'get').toLowerCase();

        if (normalizedUrl.indexOf('/graphql') !== -1) {
          graphqlCalls += 1;
          const login = graphqlCalls === 1 ? 'first' : 'second';
          return createResponse(200, { data: { viewer: { login } } });
        }

        if (normalizedUrl.indexOf('/issues') !== -1 && method === 'post') {
          restMutationCalls += 1;
          return createResponse(201, { id: 101, number: 5 });
        }

        return createResponse(200, {});
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_TOKEN: 'token',
    GITHUB_CACHE_ENABLED: true,
    GITHUB_CACHE_BACKEND: 'memory',
    GITHUB_CACHE_NAMESPACE: 'gh_cache_rest_mutation_invalidate_graphql',
    GITHUB_CACHE_TTL_SEC: 120,
    GITHUB_CACHE_STALE_TTL_SEC: 600,
    GITHUB_CACHE_ETAG_TTL_SEC: 3600
  });

  const firstGraphql = context.AST.GitHub.graphql({
    query: 'query { viewer { login } }'
  });
  assert.equal(firstGraphql.cache.hit, false);
  assert.equal(firstGraphql.data.data.viewer.login, 'first');

  context.AST.GitHub.createIssue({
    owner: 'octocat',
    repo: 'hello-world',
    body: { title: 'invalidate graphql cache' }
  });

  const secondGraphql = context.AST.GitHub.graphql({
    query: 'query { viewer { login } }'
  });

  assert.equal(restMutationCalls, 1);
  assert.equal(graphqlCalls, 2);
  assert.equal(secondGraphql.cache.hit, false);
  assert.equal(secondGraphql.data.data.viewer.login, 'second');
});

test('cache key varies by accept override for identical read operation path', () => {
  const cache = createCacheMock();
  let fetchCalls = 0;

  const context = createGasContext({
    AST_CACHE: cache,
    UrlFetchApp: {
      fetch: (_url, options = {}) => {
        fetchCalls += 1;
        return createResponse(200, {
          id: fetchCalls,
          accept: options.headers.Accept
        }, { etag: `"v${fetchCalls}"` });
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_TOKEN: 'token',
    GITHUB_CACHE_ENABLED: true,
    GITHUB_CACHE_BACKEND: 'memory',
    GITHUB_CACHE_NAMESPACE: 'gh_cache_accept_vary',
    GITHUB_CACHE_TTL_SEC: 120,
    GITHUB_CACHE_STALE_TTL_SEC: 600,
    GITHUB_CACHE_ETAG_TTL_SEC: 3600
  });

  const first = context.AST.GitHub.getRepository({
    owner: 'octocat',
    repo: 'hello-world',
    providerOptions: {
      accept: 'application/vnd.github.raw+json'
    }
  });
  const second = context.AST.GitHub.getRepository({
    owner: 'octocat',
    repo: 'hello-world'
  });
  const third = context.AST.GitHub.getRepository({
    owner: 'octocat',
    repo: 'hello-world',
    providerOptions: {
      accept: 'application/vnd.github.raw+json'
    }
  });

  assert.equal(fetchCalls, 2);
  assert.equal(first.cache.hit, false);
  assert.equal(second.cache.hit, false);
  assert.equal(third.cache.hit, true);
  assert.equal(first.data.id, 1);
  assert.equal(second.data.id, 2);
  assert.equal(third.data.id, 1);
});

test('cache key varies by apiVersion override for identical graphql query', () => {
  const cache = createCacheMock();
  let fetchCalls = 0;

  const context = createGasContext({
    AST_CACHE: cache,
    UrlFetchApp: {
      fetch: (_url, options = {}) => {
        fetchCalls += 1;
        return createResponse(200, {
          data: {
            viewer: {
              login: `v${options.headers['X-GitHub-Api-Version']}`
            }
          }
        }, { etag: `"v${fetchCalls}"` });
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_TOKEN: 'token',
    GITHUB_CACHE_ENABLED: true,
    GITHUB_CACHE_BACKEND: 'memory',
    GITHUB_CACHE_NAMESPACE: 'gh_cache_version_vary',
    GITHUB_CACHE_TTL_SEC: 120,
    GITHUB_CACHE_STALE_TTL_SEC: 600,
    GITHUB_CACHE_ETAG_TTL_SEC: 3600
  });

  const first = context.AST.GitHub.graphql({
    query: 'query { viewer { login } }',
    providerOptions: {
      apiVersion: '2022-11-28'
    }
  });
  const second = context.AST.GitHub.graphql({
    query: 'query { viewer { login } }',
    providerOptions: {
      apiVersion: '2099-01-01'
    }
  });
  const third = context.AST.GitHub.graphql({
    query: 'query { viewer { login } }',
    providerOptions: {
      apiVersion: '2022-11-28'
    }
  });

  assert.equal(fetchCalls, 2);
  assert.equal(first.cache.hit, false);
  assert.equal(second.cache.hit, false);
  assert.equal(third.cache.hit, true);
  assert.equal(first.data.data.viewer.login, 'v2022-11-28');
  assert.equal(second.data.data.viewer.login, 'v2099-01-01');
  assert.equal(third.data.data.viewer.login, 'v2022-11-28');
});
