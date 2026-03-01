const AST_GITHUB_OPERATION_GROUPS = Object.freeze({
  auth: Object.freeze(['auth_as_app']),
  webhooks: Object.freeze(['verify_webhook', 'parse_webhook']),
  identity: Object.freeze(['get_me']),
  repositories: Object.freeze(['get_repository', 'create_repository', 'fork_repository']),
  branches: Object.freeze(['list_branches', 'create_branch']),
  commits: Object.freeze(['list_commits', 'get_commit']),
  files: Object.freeze(['get_file_contents', 'create_or_update_file', 'delete_file', 'push_files']),
  issues: Object.freeze(['list_issues', 'get_issue', 'get_issue_comments', 'create_issue', 'update_issue', 'add_issue_comment']),
  pull_requests: Object.freeze([
    'list_pull_requests',
    'search_pull_requests',
    'get_pull_request',
    'get_pull_request_diff',
    'get_pull_request_files',
    'get_pull_request_comments',
    'get_pull_request_review_comments',
    'get_pull_request_reviews',
    'get_pull_request_status',
    'create_pull_request',
    'update_pull_request',
    'merge_pull_request',
    'update_pull_request_branch',
    'create_pull_request_review',
    'submit_pending_pull_request_review',
    'delete_pending_pull_request_review',
    'add_comment_to_pending_review',
    'reply_to_pull_request_comment'
  ]),
  releases: Object.freeze(['list_releases', 'get_latest_release', 'get_release_by_tag', 'list_tags', 'get_tag']),
  actions: Object.freeze([
    'list_workflows',
    'get_workflow',
    'list_workflow_runs',
    'get_workflow_run',
    'rerun_workflow_run',
    'cancel_workflow_run',
    'list_workflow_run_artifacts',
    'get_workflow_run_artifact'
  ]),
  search: Object.freeze(['search_repositories', 'search_users', 'search_code', 'search_issues']),
  meta: Object.freeze(['rate_limit']),
  graphql: Object.freeze(['graphql'])
});

function astGitHubGetCapabilities(operationOrGroup) {
  const supportedOperations = Array.from(new Set(astGitHubListOperations().concat(['graphql']))).sort();

  if (typeof operationOrGroup === 'undefined' || operationOrGroup === null || operationOrGroup === '') {
    return {
      operations: supportedOperations,
      groups: Object.keys(AST_GITHUB_OPERATION_GROUPS).sort(),
      graphql: true,
      dryRun: true,
      cache: true,
      etag: true,
      auth: {
        pat: true,
        githubApp: true
      },
      webhooks: {
        verify: true,
        parse: true
      }
    };
  }

  const key = astGitHubNormalizePathString(operationOrGroup, '').toLowerCase();
  if (key === 'graphql') {
    return {
      operation: 'graphql',
      supported: true,
      read: true,
      mutation: true,
      cache: true,
      dryRun: true
    };
  }

  if (Object.prototype.hasOwnProperty.call(AST_GITHUB_OPERATION_GROUPS, key)) {
    return {
      group: key,
      operations: AST_GITHUB_OPERATION_GROUPS[key].slice(),
      count: AST_GITHUB_OPERATION_GROUPS[key].length
    };
  }

  const spec = astGitHubGetOperationSpec(key);
  if (!spec) {
    throw new AstGitHubValidationError('Unknown GitHub operation or capability group', {
      operationOrGroup: key
    });
  }

  return {
    operation: key,
    method: String(spec.method || 'get').toUpperCase(),
    read: spec.read === true,
    mutation: spec.mutation === true,
    paginated: spec.paginated === true,
    group: spec.group || null,
    cacheable: spec.read === true,
    dryRun: spec.mutation === true
  };
}
