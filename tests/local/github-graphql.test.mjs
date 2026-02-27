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

test('graphql query returns normalized response and supports includeRaw', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (_url, _options) => createResponse(200, {
        data: {
          viewer: {
            login: 'octocat'
          }
        }
      })
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({ GITHUB_TOKEN: 'token' });

  const response = context.AST.GitHub.graphql({
    query: 'query { viewer { login } }',
    options: {
      includeRaw: true
    }
  });

  assert.equal(response.operation, 'graphql');
  assert.equal(response.data.data.viewer.login, 'octocat');
  assert.ok(response.raw);
  assert.equal(response.raw.statusCode, 200);
});

test('graphql maps upstream errors to AstGitHubProviderError', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => createResponse(200, {
        data: null,
        errors: [{ message: 'boom' }]
      })
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({ GITHUB_TOKEN: 'token' });

  assert.throws(
    () => context.AST.GitHub.graphql({ query: 'query { viewer { login } }' }),
    error => {
      assert.equal(error.name, 'AstGitHubProviderError');
      assert.equal(Array.isArray(error.details.errors), true);
      return true;
    }
  );
});

test('graphql dryRun detects mutation selected by operationName in multi-operation document', () => {
  let fetchCalls = 0;
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        fetchCalls += 1;
        throw new Error('should not call fetch in dryRun');
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({ GITHUB_TOKEN: 'token' });

  const response = context.AST.GitHub.graphql({
    query: `
      query ReadViewer { viewer { login } }
      mutation UpdateIssue { updateIssue(input: { id: "I_1", title: "x" }) { issue { id } } }
    `,
    operationName: 'UpdateIssue',
    options: {
      dryRun: true
    }
  });

  assert.equal(fetchCalls, 0);
  assert.equal(response.dryRun.enabled, true);
  assert.equal(response.dryRun.plannedRequest.operation, 'graphql');
});
