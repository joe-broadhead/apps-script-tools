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

test('GitHub config derives GHES GraphQL URL from REST /api/v3 base', () => {
  const context = createGasContext({
    PropertiesService: createPropertiesService({
      GITHUB_TOKEN: 'script-token',
      GITHUB_API_BASE_URL: 'https://ghe.example.com/api/v3'
    })
  });
  loadGitHubScripts(context);

  context.astGitHubClearRuntimeConfig();
  const normalized = context.astGitHubValidateRequest({
    operation: 'graphql',
    query: '{ viewer { login } }'
  });

  const resolved = context.astGitHubResolveConfig(normalized);
  assert.equal(resolved.baseUrl, 'https://ghe.example.com/api/v3');
  assert.equal(resolved.graphqlUrl, 'https://ghe.example.com/api/graphql');
});

test('GitHub config resolves webhook secret for verify_webhook without token', () => {
  const context = createGasContext({
    PropertiesService: createPropertiesService({
      GITHUB_WEBHOOK_SECRET: 'webhook-secret'
    })
  });
  loadGitHubScripts(context);

  const normalized = context.astGitHubValidateRequest({
    operation: 'verify_webhook',
    payload: '{"action":"opened"}',
    headers: {
      'x-github-event': 'issues',
      'x-hub-signature-256': 'sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    }
  });
  const resolved = context.astGitHubResolveConfig(normalized);

  assert.equal(resolved.token, null);
  assert.equal(resolved.webhookSecret, 'webhook-secret');
});

test('GitHub config resolves secret:// values through AST.Secrets', () => {
  const context = createGasContext({
    PropertiesService: createPropertiesService({
      GITHUB_TOKEN: 'secret://script/github-token'
    }),
    AST_SECRETS: {
      resolveValue: reference => reference === 'secret://script/github-token'
        ? 'resolved-token'
        : null
    }
  });
  loadGitHubScripts(context);

  const normalized = context.astGitHubValidateRequest({ operation: 'get_me' });
  const resolved = context.astGitHubResolveConfig(normalized);

  assert.equal(resolved.token, 'resolved-token');
});

test('GitHub config does not eagerly resolve app secret refs for PAT operations', () => {
  const context = createGasContext({
    PropertiesService: createPropertiesService({
      GITHUB_TOKEN: 'runtime-token',
      GITHUB_APP_ID: '12345',
      GITHUB_APP_INSTALLATION_ID: '67890',
      GITHUB_APP_PRIVATE_KEY: 'secret://script/app-private-key'
    })
  });
  loadGitHubScripts(context);

  const normalized = context.astGitHubValidateRequest({ operation: 'get_me' });
  const resolved = context.astGitHubResolveConfig(normalized);

  assert.equal(resolved.token, 'runtime-token');
  assert.equal(resolved.tokenType, 'pat');
});

test('GitHub webhook parse without verifySignature skips token secret resolution', () => {
  const context = createGasContext({
    PropertiesService: createPropertiesService({
      GITHUB_TOKEN: 'secret://script/github-token'
    })
  });
  loadGitHubScripts(context);

  const normalized = context.astGitHubValidateRequest({
    operation: 'parse_webhook',
    payload: '{"action":"opened"}',
    headers: {
      'x-github-event': 'issues'
    }
  });
  const resolved = context.astGitHubResolveConfig(normalized);

  assert.equal(resolved.token, null);
});

test('GitHub app auth request does not resolve token secret when tokenType=github_app', () => {
  const context = createGasContext({
    PropertiesService: createPropertiesService({
      GITHUB_TOKEN: 'secret://script/github-token',
      GITHUB_APP_ID: '12345',
      GITHUB_APP_INSTALLATION_ID: '67890',
      GITHUB_APP_PRIVATE_KEY: 'test_private_key_placeholder'
    })
  });
  loadGitHubScripts(context);

  const normalized = context.astGitHubValidateRequest({
    operation: 'auth_as_app',
    auth: {
      tokenType: 'github_app'
    }
  });
  const resolved = context.astGitHubResolveConfig(normalized);

  assert.equal(resolved.token, null);
  assert.equal(resolved.tokenType, 'github_app');
  assert.equal(resolved.appId, '12345');
  assert.equal(resolved.appInstallationId, '67890');
});
