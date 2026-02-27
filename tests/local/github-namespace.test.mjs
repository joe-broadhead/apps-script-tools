import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadGitHubScripts } from './github-helpers.mjs';

test('AST exposes GitHub surface with all public helper methods', () => {
  const context = createGasContext();
  loadGitHubScripts(context, { includeAst: true });

  const methods = [
    'run',
    'graphql',
    'getMe',
    'getRepository',
    'createRepository',
    'forkRepository',
    'listBranches',
    'createBranch',
    'listCommits',
    'getCommit',
    'getFileContents',
    'createOrUpdateFile',
    'deleteFile',
    'pushFiles',
    'listIssues',
    'getIssue',
    'getIssueComments',
    'createIssue',
    'updateIssue',
    'addIssueComment',
    'listPullRequests',
    'searchPullRequests',
    'getPullRequest',
    'getPullRequestDiff',
    'getPullRequestFiles',
    'getPullRequestComments',
    'getPullRequestReviewComments',
    'getPullRequestReviews',
    'getPullRequestStatus',
    'createPullRequest',
    'updatePullRequest',
    'mergePullRequest',
    'updatePullRequestBranch',
    'createPullRequestReview',
    'submitPendingPullRequestReview',
    'deletePendingPullRequestReview',
    'addCommentToPendingReview',
    'replyToPullRequestComment',
    'listReleases',
    'getLatestRelease',
    'getReleaseByTag',
    'listTags',
    'getTag',
    'searchRepositories',
    'searchUsers',
    'searchCode',
    'searchIssues',
    'rateLimit',
    'operations',
    'providers',
    'capabilities',
    'configure',
    'getConfig',
    'clearConfig'
  ];

  methods.forEach(method => {
    assert.equal(typeof context.AST.GitHub[method], 'function');
  });
});

test('GitHub operations includes graphql and known registry operations', () => {
  const context = createGasContext();
  loadGitHubScripts(context, { includeAst: true });

  const operations = context.AST.GitHub.operations();
  assert.equal(Array.isArray(operations), true);
  assert.equal(operations.includes('graphql'), true);
  assert.equal(operations.includes('get_repository'), true);
  assert.equal(operations.includes('create_issue'), true);
});

test('GitHub providers and capabilities report expected support', () => {
  const context = createGasContext();
  loadGitHubScripts(context, { includeAst: true });

  const providers = context.AST.GitHub.providers();
  assert.equal(Array.isArray(providers), true);
  assert.equal(providers.length, 1);
  assert.equal(providers[0], 'github');

  const operationCaps = context.AST.GitHub.capabilities('get_repository');
  assert.equal(operationCaps.operation, 'get_repository');
  assert.equal(operationCaps.read, true);
  assert.equal(operationCaps.mutation, false);

  const groupCaps = context.AST.GitHub.capabilities('pull_requests');
  assert.equal(groupCaps.group, 'pull_requests');
  assert.equal(groupCaps.operations.includes('merge_pull_request'), true);

  const graphqlCaps = context.AST.GitHub.capabilities('graphql');
  assert.equal(graphqlCaps.operation, 'graphql');
  assert.equal(graphqlCaps.mutation, true);
  assert.equal(graphqlCaps.cache, true);

  const defaultCaps = context.AST.GitHub.capabilities();
  assert.equal(Array.isArray(defaultCaps.operations), true);
  assert.equal(defaultCaps.operations.includes('graphql'), true);
});
