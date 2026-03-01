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

test('mutation dryRun returns plan and skips UrlFetchApp.fetch', () => {
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

  const response = context.AST.GitHub.createPullRequest({
    owner: 'octocat',
    repo: 'hello-world',
    body: {
      title: 'Draft',
      head: 'feature/x',
      base: 'main'
    },
    options: {
      dryRun: true
    }
  });

  assert.equal(fetchCalls, 0);
  assert.equal(response.dryRun.enabled, true);
  assert.equal(response.dryRun.plannedRequest.operation, 'create_pull_request');
  assert.equal(response.dryRun.plannedRequest.source.method, 'POST');
});

test('pushFiles dryRun returns a consolidated planned request', () => {
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

  const response = context.AST.GitHub.pushFiles({
    owner: 'octocat',
    repo: 'hello-world',
    body: {
      message: 'bulk',
      files: [
        { path: 'a.txt', content: 'YQ==' },
        { path: 'b.txt', content: 'Yg==' }
      ]
    },
    options: {
      dryRun: true
    }
  });

  assert.equal(fetchCalls, 0);
  assert.equal(response.dryRun.enabled, true);
  assert.equal(Array.isArray(response.dryRun.plannedRequest.body.files), true);
  assert.equal(response.dryRun.plannedRequest.body.files.length, 2);
});

test('read operations execute even when dryRun is set', () => {
  let fetchCalls = 0;
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        fetchCalls += 1;
        return createResponse(200, { login: 'octocat' });
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({ GITHUB_TOKEN: 'token' });

  const response = context.AST.GitHub.getMe({
    options: {
      dryRun: true
    }
  });

  assert.equal(fetchCalls, 1);
  assert.equal(response.dryRun.enabled, false);
  assert.equal(response.data.login, 'octocat');
});

test('createBranch dryRun without sha does not perform lookup network calls', () => {
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

  const response = context.AST.GitHub.createBranch({
    owner: 'octocat',
    repo: 'hello-world',
    branch: 'feature/test',
    options: {
      dryRun: true
    }
  });

  assert.equal(fetchCalls, 0);
  assert.equal(response.dryRun.enabled, true);
  assert.equal(response.dryRun.plannedRequest.operation, 'create_branch');
  assert.equal(response.dryRun.plannedRequest.source.path, '/repos/octocat/hello-world/git/refs');
});

test('rerunWorkflowRun dryRun returns plan and skips network call', () => {
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

  const response = context.AST.GitHub.rerunWorkflowRun({
    owner: 'octocat',
    repo: 'hello-world',
    runId: 321,
    options: {
      dryRun: true
    }
  });

  assert.equal(fetchCalls, 0);
  assert.equal(response.dryRun.enabled, true);
  assert.equal(response.dryRun.plannedRequest.operation, 'rerun_workflow_run');
  assert.equal(response.dryRun.plannedRequest.source.path, '/repos/octocat/hello-world/actions/runs/321/rerun');
});
