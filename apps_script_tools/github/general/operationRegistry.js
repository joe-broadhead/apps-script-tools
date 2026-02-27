const AST_GITHUB_OPERATION_REGISTRY = Object.freeze({
  get_me: Object.freeze({ method: 'get', path: () => '/user', read: true, paginated: false, group: 'identity' }),

  get_repository: Object.freeze({ method: 'get', path: request => astGitHubBuildRepoPath(request), read: true, paginated: false, group: 'repositories' }),
  create_repository: Object.freeze({ method: 'post', path: request => {
    const organization = astGitHubNormalizePathString(request.organization || (request.body && request.body.organization), '');
    if (organization) {
      return `/orgs/${encodeURIComponent(organization)}/repos`;
    }
    return '/user/repos';
  }, read: false, paginated: false, group: 'repositories', mutation: true }),
  fork_repository: Object.freeze({ method: 'post', path: request => astGitHubBuildRepoPath(request, '/forks'), read: false, paginated: false, group: 'repositories', mutation: true }),

  list_branches: Object.freeze({ method: 'get', path: request => astGitHubBuildRepoPath(request, '/branches'), read: true, paginated: true, group: 'branches' }),
  create_branch: Object.freeze({ method: 'custom', path: request => astGitHubBuildRepoPath(request), read: false, paginated: false, group: 'branches', mutation: true, customExecutor: 'create_branch' }),
  list_commits: Object.freeze({ method: 'get', path: request => astGitHubBuildRepoPath(request, '/commits'), read: true, paginated: true, group: 'commits' }),
  get_commit: Object.freeze({ method: 'get', path: request => {
    const ref = astGitHubEncodePathSegment(request.ref || request.sha, 'ref');
    return astGitHubBuildRepoPath(request, `/commits/${ref}`);
  }, read: true, paginated: false, group: 'commits' }),

  get_file_contents: Object.freeze({ method: 'get', path: request => astGitHubBuildFileContentsPath(request), read: true, paginated: false, group: 'files' }),
  create_or_update_file: Object.freeze({ method: 'put', path: request => astGitHubBuildFileContentsPath(request), read: false, paginated: false, group: 'files', mutation: true }),
  delete_file: Object.freeze({ method: 'delete', path: request => astGitHubBuildFileContentsPath(request), read: false, paginated: false, group: 'files', mutation: true }),
  push_files: Object.freeze({ method: 'custom', path: request => astGitHubBuildRepoPath(request), read: false, paginated: false, group: 'files', mutation: true, customExecutor: 'push_files' }),

  list_issues: Object.freeze({ method: 'get', path: request => astGitHubBuildRepoPath(request, '/issues'), read: true, paginated: true, group: 'issues' }),
  get_issue: Object.freeze({ method: 'get', path: request => astGitHubBuildIssueNumberPath(request), read: true, paginated: false, group: 'issues' }),
  get_issue_comments: Object.freeze({ method: 'get', path: request => astGitHubBuildIssueNumberPath(request, '/comments'), read: true, paginated: true, group: 'issues' }),
  create_issue: Object.freeze({ method: 'post', path: request => astGitHubBuildRepoPath(request, '/issues'), read: false, paginated: false, group: 'issues', mutation: true }),
  update_issue: Object.freeze({ method: 'patch', path: request => astGitHubBuildIssueNumberPath(request), read: false, paginated: false, group: 'issues', mutation: true }),
  add_issue_comment: Object.freeze({ method: 'post', path: request => astGitHubBuildIssueNumberPath(request, '/comments'), read: false, paginated: false, group: 'issues', mutation: true }),

  list_pull_requests: Object.freeze({ method: 'get', path: request => astGitHubBuildRepoPath(request, '/pulls'), read: true, paginated: true, group: 'pull_requests' }),
  search_pull_requests: Object.freeze({ method: 'get', path: () => '/search/issues', read: true, paginated: true, group: 'pull_requests' }),
  get_pull_request: Object.freeze({ method: 'get', path: request => astGitHubBuildPullNumberPath(request), read: true, paginated: false, group: 'pull_requests' }),
  get_pull_request_diff: Object.freeze({ method: 'get', path: request => astGitHubBuildPullNumberPath(request), read: true, paginated: false, group: 'pull_requests', accept: 'application/vnd.github.v3.diff' }),
  get_pull_request_files: Object.freeze({ method: 'get', path: request => astGitHubBuildPullNumberPath(request, '/files'), read: true, paginated: true, group: 'pull_requests' }),
  get_pull_request_comments: Object.freeze({ method: 'get', path: request => astGitHubBuildRepoPath(request, `/issues/${Number(request.pullNumber)}/comments`), read: true, paginated: true, group: 'pull_requests' }),
  get_pull_request_review_comments: Object.freeze({ method: 'get', path: request => astGitHubBuildPullNumberPath(request, '/comments'), read: true, paginated: true, group: 'pull_requests' }),
  get_pull_request_reviews: Object.freeze({ method: 'get', path: request => astGitHubBuildPullNumberPath(request, '/reviews'), read: true, paginated: true, group: 'pull_requests' }),
  get_pull_request_status: Object.freeze({ method: 'custom', path: request => astGitHubBuildPullNumberPath(request), read: true, paginated: false, group: 'pull_requests', customExecutor: 'pull_status' }),
  create_pull_request: Object.freeze({ method: 'post', path: request => astGitHubBuildRepoPath(request, '/pulls'), read: false, paginated: false, group: 'pull_requests', mutation: true }),
  update_pull_request: Object.freeze({ method: 'patch', path: request => astGitHubBuildPullNumberPath(request), read: false, paginated: false, group: 'pull_requests', mutation: true }),
  merge_pull_request: Object.freeze({ method: 'put', path: request => astGitHubBuildPullNumberPath(request, '/merge'), read: false, paginated: false, group: 'pull_requests', mutation: true }),
  update_pull_request_branch: Object.freeze({ method: 'put', path: request => astGitHubBuildPullNumberPath(request, '/update-branch'), read: false, paginated: false, group: 'pull_requests', mutation: true }),
  create_pull_request_review: Object.freeze({ method: 'post', path: request => astGitHubBuildPullNumberPath(request, '/reviews'), read: false, paginated: false, group: 'pull_requests', mutation: true }),
  submit_pending_pull_request_review: Object.freeze({ method: 'post', path: request => {
    const reviewId = Number(request.reviewId || (request.body && request.body.reviewId));
    if (!Number.isInteger(reviewId) || reviewId < 1) {
      throw new AstGitHubValidationError("Missing required GitHub request field 'reviewId'", { field: 'reviewId' });
    }
    return astGitHubBuildPullNumberPath(request, `/reviews/${reviewId}/events`);
  }, read: false, paginated: false, group: 'pull_requests', mutation: true }),
  delete_pending_pull_request_review: Object.freeze({ method: 'delete', path: request => {
    const reviewId = Number(request.reviewId || (request.body && request.body.reviewId));
    if (!Number.isInteger(reviewId) || reviewId < 1) {
      throw new AstGitHubValidationError("Missing required GitHub request field 'reviewId'", { field: 'reviewId' });
    }
    return astGitHubBuildPullNumberPath(request, `/reviews/${reviewId}`);
  }, read: false, paginated: false, group: 'pull_requests', mutation: true }),
  add_comment_to_pending_review: Object.freeze({ method: 'post', path: request => {
    const reviewId = Number(request.reviewId || (request.body && request.body.reviewId));
    if (!Number.isInteger(reviewId) || reviewId < 1) {
      throw new AstGitHubValidationError("Missing required GitHub request field 'reviewId'", { field: 'reviewId' });
    }
    return astGitHubBuildPullNumberPath(request, `/reviews/${reviewId}/comments`);
  }, read: false, paginated: false, group: 'pull_requests', mutation: true }),
  reply_to_pull_request_comment: Object.freeze({ method: 'post', path: request => {
    const commentId = Number(request.commentId || (request.body && request.body.commentId));
    if (!Number.isInteger(commentId) || commentId < 1) {
      throw new AstGitHubValidationError("Missing required GitHub request field 'commentId'", { field: 'commentId' });
    }
    return astGitHubBuildRepoPath(request, `/pulls/comments/${commentId}/replies`);
  }, read: false, paginated: false, group: 'pull_requests', mutation: true }),

  list_releases: Object.freeze({ method: 'get', path: request => astGitHubBuildRepoPath(request, '/releases'), read: true, paginated: true, group: 'releases' }),
  get_latest_release: Object.freeze({ method: 'get', path: request => astGitHubBuildRepoPath(request, '/releases/latest'), read: true, paginated: false, group: 'releases' }),
  get_release_by_tag: Object.freeze({ method: 'get', path: request => astGitHubBuildPathForTag(request, false), read: true, paginated: false, group: 'releases' }),
  list_tags: Object.freeze({ method: 'get', path: request => astGitHubBuildRepoPath(request, '/tags'), read: true, paginated: true, group: 'releases' }),
  get_tag: Object.freeze({ method: 'get', path: request => astGitHubBuildPathForTag(request, true), read: true, paginated: false, group: 'releases' }),

  search_repositories: Object.freeze({ method: 'get', path: () => '/search/repositories', read: true, paginated: true, group: 'search' }),
  search_users: Object.freeze({ method: 'get', path: () => '/search/users', read: true, paginated: true, group: 'search' }),
  search_code: Object.freeze({ method: 'get', path: () => '/search/code', read: true, paginated: true, group: 'search' }),
  search_issues: Object.freeze({ method: 'get', path: () => '/search/issues', read: true, paginated: true, group: 'search' }),

  rate_limit: Object.freeze({ method: 'get', path: () => '/rate_limit', read: true, paginated: false, group: 'meta' })
});

function astGitHubGetOperationSpec(operation) {
  const key = astGitHubNormalizePathString(operation, '').toLowerCase();
  return AST_GITHUB_OPERATION_REGISTRY[key] || null;
}

function astGitHubListOperations() {
  return Object.keys(AST_GITHUB_OPERATION_REGISTRY).sort();
}
