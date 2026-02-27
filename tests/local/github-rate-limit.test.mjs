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

test('secondary rate limit 403 throws AstGitHubRateLimitError', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => createResponse(
        403,
        { message: 'You have exceeded a secondary rate limit.' },
        { 'x-ratelimit-remaining': '10' }
      )
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_TOKEN: 'token',
    GITHUB_RETRIES: 0
  });

  assert.throws(
    () => context.AST.GitHub.getMe(),
    error => {
      assert.equal(error.name, 'AstGitHubRateLimitError');
      assert.equal(error.details.statusCode, 403);
      return true;
    }
  );
});

test('transient 503 retries and eventually succeeds', () => {
  let calls = 0;
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        calls += 1;
        if (calls < 3) {
          return createResponse(503, { message: 'try later' });
        }
        return createResponse(200, { login: 'octocat' });
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_TOKEN: 'token',
    GITHUB_RETRIES: 2
  });

  const response = context.AST.GitHub.getMe();
  assert.equal(calls, 3);
  assert.equal(response.data.login, 'octocat');
});

test('non-retriable provider 501 fails fast without exhausting retries', () => {
  let calls = 0;
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        calls += 1;
        return createResponse(501, { message: 'not implemented' });
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_TOKEN: 'token',
    GITHUB_RETRIES: 3
  });

  assert.throws(
    () => context.AST.GitHub.getMe(),
    error => {
      assert.equal(error.name, 'AstGitHubProviderError');
      assert.equal(error.details.statusCode, 501);
      return true;
    }
  );

  assert.equal(calls, 1);
});
