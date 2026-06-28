import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadGitHubScripts } from './github-helpers.mjs';

const PUBLIC_GITHUB_HELPER_OPERATIONS = Object.freeze({
  graphql: 'graphql',
  authAsApp: 'auth_as_app',
  verifyWebhook: 'verify_webhook',
  parseWebhook: 'parse_webhook',
  getMe: 'get_me',
  getRepository: 'get_repository',
  createRepository: 'create_repository',
  forkRepository: 'fork_repository',
  listBranches: 'list_branches',
  createBranch: 'create_branch',
  listCommits: 'list_commits',
  getCommit: 'get_commit',
  getFileContents: 'get_file_contents',
  createOrUpdateFile: 'create_or_update_file',
  deleteFile: 'delete_file',
  pushFiles: 'push_files',
  listIssues: 'list_issues',
  getIssue: 'get_issue',
  getIssueComments: 'get_issue_comments',
  createIssue: 'create_issue',
  updateIssue: 'update_issue',
  addIssueComment: 'add_issue_comment',
  listPullRequests: 'list_pull_requests',
  searchPullRequests: 'search_pull_requests',
  getPullRequest: 'get_pull_request',
  getPullRequestDiff: 'get_pull_request_diff',
  getPullRequestFiles: 'get_pull_request_files',
  getPullRequestComments: 'get_pull_request_comments',
  getPullRequestReviewComments: 'get_pull_request_review_comments',
  getPullRequestReviews: 'get_pull_request_reviews',
  getPullRequestStatus: 'get_pull_request_status',
  createPullRequest: 'create_pull_request',
  updatePullRequest: 'update_pull_request',
  mergePullRequest: 'merge_pull_request',
  updatePullRequestBranch: 'update_pull_request_branch',
  createPullRequestReview: 'create_pull_request_review',
  submitPendingPullRequestReview: 'submit_pending_pull_request_review',
  deletePendingPullRequestReview: 'delete_pending_pull_request_review',
  addCommentToPendingReview: 'add_comment_to_pending_review',
  replyToPullRequestComment: 'reply_to_pull_request_comment',
  listReleases: 'list_releases',
  getLatestRelease: 'get_latest_release',
  getReleaseByTag: 'get_release_by_tag',
  listTags: 'list_tags',
  getTag: 'get_tag',
  listWorkflows: 'list_workflows',
  getWorkflow: 'get_workflow',
  listWorkflowRuns: 'list_workflow_runs',
  getWorkflowRun: 'get_workflow_run',
  rerunWorkflowRun: 'rerun_workflow_run',
  cancelWorkflowRun: 'cancel_workflow_run',
  listWorkflowRunArtifacts: 'list_workflow_run_artifacts',
  getWorkflowRunArtifact: 'get_workflow_run_artifact',
  listCheckRuns: 'list_check_runs',
  getCheckRun: 'get_check_run',
  createCheckRun: 'create_check_run',
  updateCheckRun: 'update_check_run',
  listCommitStatuses: 'list_commit_statuses',
  listProjectsV2: 'list_projects_v2',
  listProjectV2Items: 'list_project_v2_items',
  updateProjectV2FieldValue: 'update_project_v2_field_value',
  searchRepositories: 'search_repositories',
  searchUsers: 'search_users',
  searchCode: 'search_code',
  searchIssues: 'search_issues',
  rateLimit: 'rate_limit'
});

test('AST exposes GitHub surface with all public helper methods', () => {
  const context = createGasContext();
  loadGitHubScripts(context, { includeAst: true });

  const methods = [
    'run',
    'graphql',
    'authAsApp',
    'verifyWebhook',
    'parseWebhook',
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
    'listWorkflows',
    'getWorkflow',
    'listWorkflowRuns',
    'getWorkflowRun',
    'rerunWorkflowRun',
    'cancelWorkflowRun',
    'listWorkflowRunArtifacts',
    'getWorkflowRunArtifact',
    'listCheckRuns',
    'getCheckRun',
    'createCheckRun',
    'updateCheckRun',
    'listCommitStatuses',
    'listProjectsV2',
    'listProjectV2Items',
    'updateProjectV2FieldValue',
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

test('GitHub public operation helpers are discoverable via operations and capabilities', () => {
  const context = createGasContext();
  loadGitHubScripts(context, { includeAst: true });

  const operations = context.AST.GitHub.operations();

  Object.entries(PUBLIC_GITHUB_HELPER_OPERATIONS).forEach(([method, operation]) => {
    assert.equal(typeof context.AST.GitHub[method], 'function', method);
    assert.equal(operations.includes(operation), true, `${method} missing operation ${operation}`);

    const capabilities = context.AST.GitHub.capabilities(operation);
    assert.equal(capabilities.operation, operation);
    assert.equal(capabilities.supported, true);
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
  assert.equal(operations.includes('list_projects_v2'), true);
  assert.equal(operations.includes('list_project_v2_items'), true);
  assert.equal(operations.includes('update_project_v2_field_value'), true);
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

  const actionsCaps = context.AST.GitHub.capabilities('actions');
  assert.equal(actionsCaps.group, 'actions');
  assert.equal(actionsCaps.operations.includes('list_workflow_runs'), true);

  const checksCaps = context.AST.GitHub.capabilities('checks');
  assert.equal(checksCaps.group, 'checks');
  assert.equal(checksCaps.operations.includes('list_check_runs'), true);

  const projectsCaps = context.AST.GitHub.capabilities('projects_v2');
  assert.equal(projectsCaps.group, 'projects_v2');
  assert.equal(projectsCaps.operations.includes('list_projects_v2'), true);
  assert.equal(projectsCaps.operations.includes('update_project_v2_field_value'), true);

  const projectOperationCaps = context.AST.GitHub.capabilities('update_project_v2_field_value');
  assert.equal(projectOperationCaps.operation, 'update_project_v2_field_value');
  assert.equal(projectOperationCaps.graphql, true);
  assert.equal(projectOperationCaps.mutation, true);
  assert.equal(projectOperationCaps.dryRun, true);

  const graphqlCaps = context.AST.GitHub.capabilities('graphql');
  assert.equal(graphqlCaps.operation, 'graphql');
  assert.equal(graphqlCaps.mutation, true);
  assert.equal(graphqlCaps.cache, true);

  const defaultCaps = context.AST.GitHub.capabilities();
  assert.equal(Array.isArray(defaultCaps.operations), true);
  assert.equal(defaultCaps.operations.includes('graphql'), true);
  assert.equal(defaultCaps.operations.includes('auth_as_app'), true);
  assert.equal(defaultCaps.operations.includes('list_workflows'), true);
  assert.equal(defaultCaps.operations.includes('list_check_runs'), true);
  assert.equal(defaultCaps.operations.includes('list_projects_v2'), true);
  assert.equal(defaultCaps.groups.includes('projects_v2'), true);
  assert.equal(defaultCaps.auth.githubApp, true);
  assert.equal(defaultCaps.projectsV2, true);
});
