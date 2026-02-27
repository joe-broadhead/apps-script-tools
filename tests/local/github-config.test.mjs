import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadGitHubScripts } from './github-helpers.mjs';

function createPropertiesService(seed = {}) {
  const store = { ...seed };
  return {
    getScriptProperties: () => ({
      getProperties: () => ({ ...store }),
      getProperty: key => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null)
    })
  };
}

test('GitHub config precedence is request > runtime > script properties', () => {
  const context = createGasContext({
    PropertiesService: createPropertiesService({
      GITHUB_TOKEN: 'script-token',
      GITHUB_OWNER: 'script-owner',
      GITHUB_REPO: 'script-repo',
      GITHUB_TIMEOUT_MS: '30000',
      GITHUB_RETRIES: '5',
      GITHUB_CACHE_ENABLED: 'true',
      GITHUB_CACHE_NAMESPACE: 'script_ns'
    })
  });
  loadGitHubScripts(context);

  context.astGitHubClearRuntimeConfig();
  context.astGitHubSetRuntimeConfig({
    GITHUB_TOKEN: 'runtime-token',
    GITHUB_OWNER: 'runtime-owner',
    GITHUB_REPO: 'runtime-repo',
    GITHUB_TIMEOUT_MS: '20000',
    GITHUB_RETRIES: '3',
    GITHUB_CACHE_ENABLED: 'true',
    GITHUB_CACHE_NAMESPACE: 'runtime_ns'
  });

  const normalized = context.astGitHubValidateRequest({
    operation: 'get_repository',
    owner: 'request-owner',
    repo: 'request-repo',
    auth: { token: 'request-token' },
    options: {
      timeoutMs: 12000,
      retries: 1,
      cache: {
        enabled: false,
        namespace: 'request_ns'
      }
    }
  });

  const resolved = context.astGitHubResolveConfig(normalized);
  assert.equal(resolved.token, 'request-token');
  assert.equal(resolved.owner, 'request-owner');
  assert.equal(resolved.repo, 'request-repo');
  assert.equal(resolved.timeoutMs, 12000);
  assert.equal(resolved.retries, 1);
  assert.equal(resolved.cache.enabled, false);
  assert.equal(resolved.cache.namespace, 'request_ns');
});

test('GitHub config falls back to runtime/script defaults when request options omitted', () => {
  const context = createGasContext({
    PropertiesService: createPropertiesService({
      GITHUB_TOKEN: 'script-token',
      GITHUB_TIMEOUT_MS: '31000',
      GITHUB_RETRIES: '4'
    })
  });
  loadGitHubScripts(context);

  context.astGitHubClearRuntimeConfig();
  context.astGitHubSetRuntimeConfig({
    GITHUB_TOKEN: 'runtime-token',
    GITHUB_TIMEOUT_MS: '15000',
    GITHUB_RETRIES: '2',
    GITHUB_CACHE_ENABLED: 'true',
    GITHUB_CACHE_NAMESPACE: 'runtime_ns'
  });

  const normalized = context.astGitHubValidateRequest({
    operation: 'get_me'
  });
  const resolved = context.astGitHubResolveConfig(normalized);

  assert.equal(resolved.token, 'runtime-token');
  assert.equal(resolved.timeoutMs, 15000);
  assert.equal(resolved.retries, 2);
  assert.equal(resolved.cache.enabled, true);
  assert.equal(resolved.cache.namespace, 'runtime_ns');
});
