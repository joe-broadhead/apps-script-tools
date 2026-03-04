/**
 * @typedef {Object} AstGitHubRequest
 * @property {string} [operation]
 * @property {string} [owner]
 * @property {string} [repo]
 * @property {number} [issueNumber]
 * @property {number} [pullNumber]
 * @property {string} [path]
 * @property {string} [branch]
 * @property {string} [ref]
 * @property {Object} [body]
 * @property {Object} [auth]
 * @property {Object} [options]
 * @property {Object} [providerOptions]
 */

/**
 * Runs a GitHub operation using the unified AST.GitHub request contract.
 *
 * @param {AstGitHubRequest} [request={}] GitHub operation request.
 * @returns {Object} Normalized GitHub response.
 * @throws {AstGitHubValidationError|AstGitHubAuthError|AstGitHubProviderError}
 */
function astGitHubRun(request = {}) {
  return astRunGitHubRequest(request);
}

/**
 * Runs a specific GitHub operation by operation id.
 *
 * @param {string} operation Operation id from `AST.GitHub.operations()`.
 * @param {AstGitHubRequest} [request={}] GitHub operation request.
 * @returns {Object} Normalized GitHub response.
 */
function astGitHubRunOperation(operation, request = {}) {
  return astRunGitHubRequest(Object.assign({}, request, { operation }));
}

/**
 * Executes a GraphQL operation against the configured GitHub GraphQL endpoint.
 *
 * @param {AstGitHubRequest} [request={}] GraphQL request payload.
 * @returns {Object} Normalized GraphQL response.
 */
function astGitHubGraphql(request = {}) {
  return astGitHubRunOperation('graphql', request);
}

/**
 * Exchanges GitHub App credentials for an installation token.
 *
 * @param {AstGitHubRequest} [request={}] App-auth request payload.
 * @returns {Object} Normalized auth response.
 */
function astGitHubAuthAsApp(request = {}) {
  return astGitHubRunOperation('auth_as_app', request);
}

/**
 * Verifies webhook signature and envelope integrity.
 *
 * @param {AstGitHubRequest} [request={}] Verify webhook request.
 * @returns {Object} Verification result.
 */
function astGitHubVerifyWebhook(request = {}) {
  return astGitHubRunOperation('verify_webhook', request);
}

/**
 * Parses and normalizes webhook payloads after verification.
 *
 * @param {AstGitHubRequest} [request={}] Parse webhook request.
 * @returns {Object} Parsed webhook payload.
 */
function astGitHubParseWebhook(request = {}) {
  return astGitHubRunOperation('parse_webhook', request);
}

/**
 * Operation-specific convenience wrappers.
 *
 * Each wrapper below is a thin adapter to `astGitHubRunOperation(...)`.
 * Contract:
 * - input: `AstGitHubRequest`
 * - output: normalized operation response object
 * - errors: typed GitHub module errors from `astRunGitHubRequest`
 */
function astGitHubGetMe(request = {}) {
  return astGitHubRunOperation('get_me', request);
}

function astGitHubGetRepository(request = {}) {
  return astGitHubRunOperation('get_repository', request);
}

function astGitHubCreateRepository(request = {}) {
  return astGitHubRunOperation('create_repository', request);
}

function astGitHubForkRepository(request = {}) {
  return astGitHubRunOperation('fork_repository', request);
}

function astGitHubListBranches(request = {}) {
  return astGitHubRunOperation('list_branches', request);
}

function astGitHubCreateBranch(request = {}) {
  return astGitHubRunOperation('create_branch', request);
}

function astGitHubListCommits(request = {}) {
  return astGitHubRunOperation('list_commits', request);
}

function astGitHubGetCommit(request = {}) {
  return astGitHubRunOperation('get_commit', request);
}

function astGitHubGetFileContents(request = {}) {
  return astGitHubRunOperation('get_file_contents', request);
}

function astGitHubCreateOrUpdateFile(request = {}) {
  return astGitHubRunOperation('create_or_update_file', request);
}

function astGitHubDeleteFile(request = {}) {
  return astGitHubRunOperation('delete_file', request);
}

function astGitHubPushFiles(request = {}) {
  return astGitHubRunOperation('push_files', request);
}

function astGitHubListIssues(request = {}) {
  return astGitHubRunOperation('list_issues', request);
}

function astGitHubGetIssue(request = {}) {
  return astGitHubRunOperation('get_issue', request);
}

function astGitHubGetIssueComments(request = {}) {
  return astGitHubRunOperation('get_issue_comments', request);
}

function astGitHubCreateIssue(request = {}) {
  return astGitHubRunOperation('create_issue', request);
}

function astGitHubUpdateIssue(request = {}) {
  return astGitHubRunOperation('update_issue', request);
}

function astGitHubAddIssueComment(request = {}) {
  return astGitHubRunOperation('add_issue_comment', request);
}

function astGitHubListPullRequests(request = {}) {
  return astGitHubRunOperation('list_pull_requests', request);
}

function astGitHubSearchPullRequests(request = {}) {
  return astGitHubRunOperation('search_pull_requests', request);
}

function astGitHubGetPullRequest(request = {}) {
  return astGitHubRunOperation('get_pull_request', request);
}

function astGitHubGetPullRequestDiff(request = {}) {
  return astGitHubRunOperation('get_pull_request_diff', request);
}

function astGitHubGetPullRequestFiles(request = {}) {
  return astGitHubRunOperation('get_pull_request_files', request);
}

function astGitHubGetPullRequestComments(request = {}) {
  return astGitHubRunOperation('get_pull_request_comments', request);
}

function astGitHubGetPullRequestReviewComments(request = {}) {
  return astGitHubRunOperation('get_pull_request_review_comments', request);
}

function astGitHubGetPullRequestReviews(request = {}) {
  return astGitHubRunOperation('get_pull_request_reviews', request);
}

function astGitHubGetPullRequestStatus(request = {}) {
  return astGitHubRunOperation('get_pull_request_status', request);
}

function astGitHubCreatePullRequest(request = {}) {
  return astGitHubRunOperation('create_pull_request', request);
}

function astGitHubUpdatePullRequest(request = {}) {
  return astGitHubRunOperation('update_pull_request', request);
}

function astGitHubMergePullRequest(request = {}) {
  return astGitHubRunOperation('merge_pull_request', request);
}

function astGitHubUpdatePullRequestBranch(request = {}) {
  return astGitHubRunOperation('update_pull_request_branch', request);
}

function astGitHubCreatePullRequestReview(request = {}) {
  return astGitHubRunOperation('create_pull_request_review', request);
}

function astGitHubSubmitPendingPullRequestReview(request = {}) {
  return astGitHubRunOperation('submit_pending_pull_request_review', request);
}

function astGitHubDeletePendingPullRequestReview(request = {}) {
  return astGitHubRunOperation('delete_pending_pull_request_review', request);
}

function astGitHubAddCommentToPendingReview(request = {}) {
  return astGitHubRunOperation('add_comment_to_pending_review', request);
}

function astGitHubReplyToPullRequestComment(request = {}) {
  return astGitHubRunOperation('reply_to_pull_request_comment', request);
}

function astGitHubListReleases(request = {}) {
  return astGitHubRunOperation('list_releases', request);
}

function astGitHubGetLatestRelease(request = {}) {
  return astGitHubRunOperation('get_latest_release', request);
}

function astGitHubGetReleaseByTag(request = {}) {
  return astGitHubRunOperation('get_release_by_tag', request);
}

function astGitHubListTags(request = {}) {
  return astGitHubRunOperation('list_tags', request);
}

function astGitHubGetTag(request = {}) {
  return astGitHubRunOperation('get_tag', request);
}

function astGitHubListWorkflows(request = {}) {
  return astGitHubRunOperation('list_workflows', request);
}

function astGitHubGetWorkflow(request = {}) {
  return astGitHubRunOperation('get_workflow', request);
}

function astGitHubListWorkflowRuns(request = {}) {
  return astGitHubRunOperation('list_workflow_runs', request);
}

function astGitHubGetWorkflowRun(request = {}) {
  return astGitHubRunOperation('get_workflow_run', request);
}

function astGitHubRerunWorkflowRun(request = {}) {
  return astGitHubRunOperation('rerun_workflow_run', request);
}

function astGitHubCancelWorkflowRun(request = {}) {
  return astGitHubRunOperation('cancel_workflow_run', request);
}

function astGitHubListWorkflowRunArtifacts(request = {}) {
  return astGitHubRunOperation('list_workflow_run_artifacts', request);
}

function astGitHubGetWorkflowRunArtifact(request = {}) {
  return astGitHubRunOperation('get_workflow_run_artifact', request);
}

function astGitHubListCheckRuns(request = {}) {
  return astGitHubRunOperation('list_check_runs', request);
}

function astGitHubGetCheckRun(request = {}) {
  return astGitHubRunOperation('get_check_run', request);
}

function astGitHubCreateCheckRun(request = {}) {
  return astGitHubRunOperation('create_check_run', request);
}

function astGitHubUpdateCheckRun(request = {}) {
  return astGitHubRunOperation('update_check_run', request);
}

function astGitHubListCommitStatuses(request = {}) {
  return astGitHubRunOperation('list_commit_statuses', request);
}

function astGitHubListProjectsV2(request = {}) {
  return astGitHubListProjectsV2Helper(request);
}

function astGitHubListProjectV2Items(request = {}) {
  return astGitHubListProjectV2ItemsHelper(request);
}

function astGitHubUpdateProjectV2FieldValue(request = {}) {
  return astGitHubUpdateProjectV2FieldValueHelper(request);
}

function astGitHubSearchRepositories(request = {}) {
  return astGitHubRunOperation('search_repositories', request);
}

function astGitHubSearchUsers(request = {}) {
  return astGitHubRunOperation('search_users', request);
}

function astGitHubSearchCode(request = {}) {
  return astGitHubRunOperation('search_code', request);
}

function astGitHubSearchIssues(request = {}) {
  return astGitHubRunOperation('search_issues', request);
}

function astGitHubRateLimit(request = {}) {
  return astGitHubRunOperation('rate_limit', request);
}

/**
 * Lists supported GitHub operation ids.
 *
 * @returns {string[]} Sorted list of operation ids.
 */
function astGitHubOperations() {
  return Array.from(new Set(astGitHubListOperations().concat(['graphql']))).sort();
}

/**
 * Lists providers exposed by this namespace.
 *
 * @returns {string[]} Provider keys.
 */
function astGitHubProviders() {
  return ['github'];
}

/**
 * Returns capabilities for a specific operation or operation group.
 *
 * @param {string} operationOrGroup Operation id or capability group.
 * @returns {Object} Capability matrix.
 */
function astGitHubCapabilities(operationOrGroup) {
  return astGitHubGetCapabilities(operationOrGroup);
}

/**
 * Sets runtime GitHub configuration overrides.
 *
 * @param {Object} [config={}] Runtime config patch.
 * @param {Object} [options={}] Configure behavior options.
 * @returns {Object} Updated runtime config snapshot.
 */
function astGitHubConfigure(config = {}, options = {}) {
  return astGitHubSetRuntimeConfig(config, options);
}

/**
 * Gets current resolved GitHub runtime config.
 *
 * @returns {Object} Runtime config snapshot.
 */
function astGitHubGetConfig() {
  return astGitHubGetRuntimeConfig();
}

/**
 * Clears runtime GitHub config overrides.
 *
 * @returns {Object} Cleared runtime config snapshot.
 */
function astGitHubClearConfig() {
  return astGitHubClearRuntimeConfig();
}

const AST_GITHUB = Object.freeze({
  run: astGitHubRun,
  graphql: astGitHubGraphql,
  authAsApp: astGitHubAuthAsApp,
  verifyWebhook: astGitHubVerifyWebhook,
  parseWebhook: astGitHubParseWebhook,
  getMe: astGitHubGetMe,
  getRepository: astGitHubGetRepository,
  createRepository: astGitHubCreateRepository,
  forkRepository: astGitHubForkRepository,
  listBranches: astGitHubListBranches,
  createBranch: astGitHubCreateBranch,
  listCommits: astGitHubListCommits,
  getCommit: astGitHubGetCommit,
  getFileContents: astGitHubGetFileContents,
  createOrUpdateFile: astGitHubCreateOrUpdateFile,
  deleteFile: astGitHubDeleteFile,
  pushFiles: astGitHubPushFiles,
  listIssues: astGitHubListIssues,
  getIssue: astGitHubGetIssue,
  getIssueComments: astGitHubGetIssueComments,
  createIssue: astGitHubCreateIssue,
  updateIssue: astGitHubUpdateIssue,
  addIssueComment: astGitHubAddIssueComment,
  listPullRequests: astGitHubListPullRequests,
  searchPullRequests: astGitHubSearchPullRequests,
  getPullRequest: astGitHubGetPullRequest,
  getPullRequestDiff: astGitHubGetPullRequestDiff,
  getPullRequestFiles: astGitHubGetPullRequestFiles,
  getPullRequestComments: astGitHubGetPullRequestComments,
  getPullRequestReviewComments: astGitHubGetPullRequestReviewComments,
  getPullRequestReviews: astGitHubGetPullRequestReviews,
  getPullRequestStatus: astGitHubGetPullRequestStatus,
  createPullRequest: astGitHubCreatePullRequest,
  updatePullRequest: astGitHubUpdatePullRequest,
  mergePullRequest: astGitHubMergePullRequest,
  updatePullRequestBranch: astGitHubUpdatePullRequestBranch,
  createPullRequestReview: astGitHubCreatePullRequestReview,
  submitPendingPullRequestReview: astGitHubSubmitPendingPullRequestReview,
  deletePendingPullRequestReview: astGitHubDeletePendingPullRequestReview,
  addCommentToPendingReview: astGitHubAddCommentToPendingReview,
  replyToPullRequestComment: astGitHubReplyToPullRequestComment,
  listReleases: astGitHubListReleases,
  getLatestRelease: astGitHubGetLatestRelease,
  getReleaseByTag: astGitHubGetReleaseByTag,
  listTags: astGitHubListTags,
  getTag: astGitHubGetTag,
  listWorkflows: astGitHubListWorkflows,
  getWorkflow: astGitHubGetWorkflow,
  listWorkflowRuns: astGitHubListWorkflowRuns,
  getWorkflowRun: astGitHubGetWorkflowRun,
  rerunWorkflowRun: astGitHubRerunWorkflowRun,
  cancelWorkflowRun: astGitHubCancelWorkflowRun,
  listWorkflowRunArtifacts: astGitHubListWorkflowRunArtifacts,
  getWorkflowRunArtifact: astGitHubGetWorkflowRunArtifact,
  listCheckRuns: astGitHubListCheckRuns,
  getCheckRun: astGitHubGetCheckRun,
  createCheckRun: astGitHubCreateCheckRun,
  updateCheckRun: astGitHubUpdateCheckRun,
  listCommitStatuses: astGitHubListCommitStatuses,
  listProjectsV2: astGitHubListProjectsV2,
  listProjectV2Items: astGitHubListProjectV2Items,
  updateProjectV2FieldValue: astGitHubUpdateProjectV2FieldValue,
  searchRepositories: astGitHubSearchRepositories,
  searchUsers: astGitHubSearchUsers,
  searchCode: astGitHubSearchCode,
  searchIssues: astGitHubSearchIssues,
  rateLimit: astGitHubRateLimit,
  operations: astGitHubOperations,
  providers: astGitHubProviders,
  capabilities: astGitHubCapabilities,
  configure: astGitHubConfigure,
  getConfig: astGitHubGetConfig,
  clearConfig: astGitHubClearConfig
});
