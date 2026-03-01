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

function bytesToHex(bytes) {
  return bytes
    .map(value => (value < 0 ? value + 256 : value).toString(16).padStart(2, '0'))
    .join('');
}

test('GitHub App auth exchanges installation token and reuses in-memory cache', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });

        if (url.includes('/app/installations/67890/access_tokens')) {
          return createResponse(201, {
            token: 'ghs_cached_token',
            expires_at: '2035-01-01T00:00:00Z',
            permissions: { contents: 'read' }
          });
        }

        return createResponse(200, { id: 1, full_name: 'octocat/hello-world' });
      }
    },
    Utilities: {
      ...createGasContext().Utilities,
      computeRsaSha256Signature: () => [1, 2, 3, 4]
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_APP_ID: '12345',
    GITHUB_APP_INSTALLATION_ID: '67890',
    GITHUB_APP_PRIVATE_KEY: 'test_private_key_placeholder'
  });

  const first = context.AST.GitHub.getRepository({
    owner: 'octocat',
    repo: 'hello-world',
    auth: {
      tokenType: 'github_app'
    }
  });
  const second = context.AST.GitHub.getRepository({
    owner: 'octocat',
    repo: 'hello-world',
    auth: {
      tokenType: 'github_app'
    }
  });

  assert.equal(first.status, 'ok');
  assert.equal(second.status, 'ok');
  assert.equal(calls.filter(entry => entry.url.includes('/access_tokens')).length, 1);
  assert.equal(calls.filter(entry => entry.url.includes('/repos/octocat/hello-world')).length, 2);

  const repoCall = calls.find(entry => entry.url.includes('/repos/octocat/hello-world'));
  assert.equal(repoCall.options.headers.Authorization, 'Bearer ghs_cached_token');
});

test('authAsApp returns dryRun plan without network call', () => {
  let fetchCalls = 0;
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        fetchCalls += 1;
        throw new Error('dryRun should not execute fetch');
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_APP_ID: '12345',
    GITHUB_APP_INSTALLATION_ID: '67890',
    GITHUB_APP_PRIVATE_KEY: 'test_private_key_placeholder'
  });

  const response = context.AST.GitHub.authAsApp({
    options: {
      dryRun: true
    }
  });

  assert.equal(response.status, 'ok');
  assert.equal(response.dryRun.enabled, true);
  assert.equal(fetchCalls, 0);
});

test('verifyWebhook validates signature and parseWebhook returns normalized event', () => {
  const context = createGasContext();
  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_WEBHOOK_SECRET: 'webhook-secret'
  });

  const payload = JSON.stringify({
    action: 'opened',
    repository: {
      id: 11,
      name: 'hello-world',
      full_name: 'octocat/hello-world',
      owner: { login: 'octocat' }
    },
    sender: {
      id: 22,
      login: 'octocat',
      type: 'User'
    },
    installation: {
      id: 33
    }
  });
  const signatureBytes = context.Utilities.computeHmacSha256Signature(payload, 'webhook-secret');
  const signatureHeader = `sha256=${bytesToHex(signatureBytes)}`;

  const verify = context.AST.GitHub.verifyWebhook({
    payload,
    headers: {
      'X-Hub-Signature-256': signatureHeader,
      'X-GitHub-Event': 'issues',
      'X-GitHub-Delivery': 'delivery-123'
    }
  });

  assert.equal(verify.status, 'ok');
  assert.equal(verify.data.valid, true);

  const parsed = context.AST.GitHub.parseWebhook({
    payload,
    headers: {
      'X-Hub-Signature-256': signatureHeader,
      'X-GitHub-Event': 'issues',
      'X-GitHub-Delivery': 'delivery-123'
    },
    options: {
      verifySignature: true
    }
  });

  assert.equal(parsed.status, 'ok');
  assert.equal(parsed.data.event, 'issues');
  assert.equal(parsed.data.deliveryId, 'delivery-123');
  assert.equal(parsed.data.repository.fullName, 'octocat/hello-world');
  assert.equal(parsed.data.verified, true);
});

test('verifyWebhook rejects tampered signature deterministically', () => {
  const context = createGasContext();
  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_WEBHOOK_SECRET: 'webhook-secret'
  });

  assert.throws(
    () => context.AST.GitHub.verifyWebhook({
      payload: '{"action":"opened"}',
      headers: {
        'X-Hub-Signature-256': 'sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'X-GitHub-Event': 'issues'
      }
    }),
    /signature verification failed/
  );
});
