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
