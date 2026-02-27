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

test('getRepository returns normalized data and rate limit headers', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });
        return createResponse(
          200,
          { id: 123, full_name: 'octocat/hello-world' },
          {
            'x-ratelimit-limit': '5000',
            'x-ratelimit-remaining': '4998',
            'x-ratelimit-reset': '2000000000'
          }
        );
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_TOKEN: 'token'
  });

  const response = context.AST.GitHub.getRepository({
    owner: 'octocat',
    repo: 'hello-world'
  });

  assert.equal(calls.length, 1);
  assert.equal(response.status, 'ok');
  assert.equal(response.operation, 'get_repository');
  assert.equal(response.data.id, 123);
  assert.equal(response.rateLimit.limit, 5000);
  assert.equal(response.source.path, '/repos/octocat/hello-world');
});

test('listIssues uses pagination and parses link headers', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });
        return createResponse(
          200,
          [{ id: 1 }, { id: 2 }],
          {
            link: '<https://api.github.com/repositories/1/issues?page=3>; rel="next"'
          }
        );
      }
    }
  });

  loadGitHubScripts(context);
  context.astGitHubSetRuntimeConfig({ GITHUB_TOKEN: 'token' });

  const response = context.astRunGitHubRequest({
    operation: 'list_issues',
    owner: 'octocat',
    repo: 'hello-world',
    options: {
      page: 2,
      perPage: 25
    }
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /page=2/);
  assert.match(calls[0].url, /per_page=25/);
  assert.equal(response.page.page, 2);
  assert.equal(response.page.perPage, 25);
  assert.equal(response.page.nextPage, 3);
  assert.equal(response.page.hasMore, true);
});

test('listCommits honors top-level ref as sha query filter', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });
        return createResponse(200, [{ sha: 'abc' }]);
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({ GITHUB_TOKEN: 'token' });

  context.AST.GitHub.listCommits({
    owner: 'octocat',
    repo: 'hello-world',
    ref: 'feature/main'
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /sha=feature%2Fmain/);
});

test('getPullRequestDiff sends diff accept header', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });
        return createResponse(200, 'diff --git a/file b/file\n+line');
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({ GITHUB_TOKEN: 'token' });

  const response = context.AST.GitHub.getPullRequestDiff({
    owner: 'octocat',
    repo: 'hello-world',
    pullNumber: 22
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.Accept, 'application/vnd.github.v3.diff');
  assert.equal(typeof response.data, 'string');
  assert.match(response.data, /diff --git/);
});

test('getPullRequestDiff respects accept override and returns JSON payload', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });
        return createResponse(200, { id: 22, title: 'PR' });
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({ GITHUB_TOKEN: 'token' });

  const response = context.AST.GitHub.getPullRequestDiff({
    owner: 'octocat',
    repo: 'hello-world',
    pullNumber: 22,
    providerOptions: {
      accept: 'application/vnd.github+json'
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.Accept, 'application/vnd.github+json');
  assert.equal(response.data.id, 22);
  assert.equal(typeof response.data, 'object');
});

test('searchPullRequests appends is:pr qualifier when missing', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });
        return createResponse(200, { total_count: 0, items: [] });
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({ GITHUB_TOKEN: 'token' });

  context.AST.GitHub.searchPullRequests({
    query: 'repo:octocat/hello-world label:bug'
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /is%3Apr/);
});

test('getPullRequestComments validates pullNumber before network request', () => {
  let fetchCalls = 0;
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        fetchCalls += 1;
        return createResponse(200, []);
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({ GITHUB_TOKEN: 'token' });

  assert.throws(
    () => context.AST.GitHub.getPullRequestComments({
      owner: 'octocat',
      repo: 'hello-world'
    }),
    /pullNumber/
  );
  assert.equal(fetchCalls, 0);
});

test('searchPullRequests appends is:pr when query contains overlapping qualifier text', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });
        return createResponse(200, { total_count: 0, items: [] });
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({ GITHUB_TOKEN: 'token' });

  context.AST.GitHub.searchPullRequests({
    query: 'repo:octocat/hello-world is:private label:bug'
  });

  assert.equal(calls.length, 1);
  const decodedUrl = decodeURIComponent(calls[0].url);
  assert.match(decodedUrl, /is:private/);
  assert.match(decodedUrl, /is:pr/);
});
