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

function parsePayload(options) {
  if (!options || typeof options.payload === 'undefined') {
    return null;
  }
  return JSON.parse(String(options.payload));
}

test('createIssue maps method/path/body correctly', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });
        return createResponse(201, { number: 42, title: 'Issue title' });
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({ GITHUB_TOKEN: 'token' });

  const response = context.AST.GitHub.createIssue({
    owner: 'octocat',
    repo: 'hello-world',
    body: {
      title: 'Issue title',
      body: 'Issue body'
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, 'post');
  assert.match(calls[0].url, /\/repos\/octocat\/hello-world\/issues$/);
  assert.deepEqual(parsePayload(calls[0].options), {
    title: 'Issue title',
    body: 'Issue body'
  });
  assert.equal(response.data.number, 42);
});

test('pushFiles uses default message and executes file updates', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });
        return createResponse(200, {
          content: {
            sha: 'new-sha'
          },
          commit: {
            sha: 'commit-sha'
          }
        });
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({ GITHUB_TOKEN: 'token' });

  const response = context.AST.GitHub.pushFiles({
    owner: 'octocat',
    repo: 'hello-world',
    body: {
      branch: 'main',
      message: 'bulk update',
      files: [
        {
          path: 'README.md',
          content: 'IyBIZWxsbwo='
        },
        {
          path: 'docs/guide.md',
          content: 'IyBHdWlkZQo=',
          message: 'specific message'
        }
      ]
    }
  });

  assert.equal(calls.length, 2);
  assert.equal(parsePayload(calls[0].options).message, 'bulk update');
  assert.equal(parsePayload(calls[1].options).message, 'specific message');
  assert.equal(response.data.count, 2);
  assert.equal(response.data.results.length, 2);
});

test('createBranch resolves default branch when sha not provided', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });

        if (url.endsWith('/repos/octocat/hello-world')) {
          return createResponse(200, { default_branch: 'master' });
        }

        if (url.endsWith('/repos/octocat/hello-world/git/ref/heads/master')) {
          return createResponse(200, {
            object: { sha: 'base-sha' }
          });
        }

        if (url.endsWith('/repos/octocat/hello-world/git/refs')) {
          return createResponse(201, {
            ref: 'refs/heads/feature/test',
            object: { sha: 'base-sha' }
          });
        }

        throw new Error(`Unexpected URL: ${url}`);
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({ GITHUB_TOKEN: 'token' });

  const response = context.AST.GitHub.createBranch({
    owner: 'octocat',
    repo: 'hello-world',
    branch: 'feature/test'
  });

  assert.equal(calls.length, 3);
  assert.equal(parsePayload(calls[2].options).sha, 'base-sha');
  assert.equal(parsePayload(calls[2].options).ref, 'refs/heads/feature/test');
  assert.equal(response.status, 'ok');
});
