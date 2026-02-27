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

function expectMappedError(statusCode, expectedName) {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => createResponse(statusCode, { message: `status ${statusCode}` })
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_TOKEN: 'token',
    GITHUB_RETRIES: 0
  });

  assert.throws(
    () => context.AST.GitHub.getRepository({
      owner: 'octocat',
      repo: 'hello-world'
    }),
    error => {
      assert.equal(error.name, expectedName);
      assert.equal(error.details.statusCode, statusCode);
      return true;
    }
  );
}

test('http errors map to typed GitHub errors', () => {
  expectMappedError(401, 'AstGitHubAuthError');
  expectMappedError(404, 'AstGitHubNotFoundError');
  expectMappedError(409, 'AstGitHubConflictError');
  expectMappedError(422, 'AstGitHubValidationError');
  expectMappedError(500, 'AstGitHubProviderError');
});

test('GitHub errors redact sensitive headers and query parameters', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => createResponse(403, { message: 'rate limited' }, {
        'x-ratelimit-remaining': '0',
        'set-cookie': 'sensitive-cookie'
      })
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_TOKEN: 'token',
    GITHUB_RETRIES: 0
  });

  assert.throws(
    () => context.astGitHubHttpRequest({
      operation: 'get_repository',
      method: 'get',
      url: 'https://api.github.com/repos/octocat/hello-world?access_token=secret123&per_page=1',
      headers: {
        Authorization: 'Bearer secret-token',
        'x-custom': 'safe'
      }
    }),
    error => {
      assert.equal(error.name, 'AstGitHubRateLimitError');
      assert.equal(
        error.details.url,
        'https://api.github.com/repos/octocat/hello-world?access_token=[redacted]&per_page=1'
      );
      assert.equal(error.details.request.headers.Authorization, '[redacted]');
      assert.equal(error.details.request.headers['x-custom'], 'safe');
      assert.equal(error.details.response.headers['set-cookie'], '[redacted]');
      return true;
    }
  );
});
