# GitHub Contracts

## Import alias

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## API surface

```javascript
ASTX.GitHub.run(request)
ASTX.GitHub.graphql(request)
ASTX.GitHub.getMe(request)
ASTX.GitHub.getRepository(request)
ASTX.GitHub.createRepository(request)
ASTX.GitHub.forkRepository(request)
ASTX.GitHub.listBranches(request)
ASTX.GitHub.createBranch(request)
ASTX.GitHub.listCommits(request)
ASTX.GitHub.getCommit(request)
ASTX.GitHub.getFileContents(request)
ASTX.GitHub.createOrUpdateFile(request)
ASTX.GitHub.deleteFile(request)
ASTX.GitHub.pushFiles(request)
ASTX.GitHub.listIssues(request)
ASTX.GitHub.getIssue(request)
ASTX.GitHub.getIssueComments(request)
ASTX.GitHub.createIssue(request)
ASTX.GitHub.updateIssue(request)
ASTX.GitHub.addIssueComment(request)
ASTX.GitHub.listPullRequests(request)
ASTX.GitHub.searchPullRequests(request)
ASTX.GitHub.getPullRequest(request)
ASTX.GitHub.getPullRequestDiff(request)
ASTX.GitHub.getPullRequestFiles(request)
ASTX.GitHub.getPullRequestComments(request)
ASTX.GitHub.getPullRequestReviewComments(request)
ASTX.GitHub.getPullRequestReviews(request)
ASTX.GitHub.getPullRequestStatus(request)
ASTX.GitHub.createPullRequest(request)
ASTX.GitHub.updatePullRequest(request)
ASTX.GitHub.mergePullRequest(request)
ASTX.GitHub.updatePullRequestBranch(request)
ASTX.GitHub.createPullRequestReview(request)
ASTX.GitHub.submitPendingPullRequestReview(request)
ASTX.GitHub.deletePendingPullRequestReview(request)
ASTX.GitHub.addCommentToPendingReview(request)
ASTX.GitHub.replyToPullRequestComment(request)
ASTX.GitHub.listReleases(request)
ASTX.GitHub.getLatestRelease(request)
ASTX.GitHub.getReleaseByTag(request)
ASTX.GitHub.listTags(request)
ASTX.GitHub.getTag(request)
ASTX.GitHub.searchRepositories(request)
ASTX.GitHub.searchUsers(request)
ASTX.GitHub.searchCode(request)
ASTX.GitHub.searchIssues(request)
ASTX.GitHub.rateLimit(request)
ASTX.GitHub.operations()
ASTX.GitHub.providers()
ASTX.GitHub.capabilities(operationOrGroup)
ASTX.GitHub.configure(config, options)
ASTX.GitHub.getConfig()
ASTX.GitHub.clearConfig()
```

## `run(request)` contract

```javascript
{
  operation: 'get_me' | 'get_repository' | 'create_repository' | 'graphql' | ...,
  owner: 'optional',
  repo: 'optional',
  issueNumber: 123,
  pullNumber: 456,
  reviewId: 789,
  commentId: 1011,
  path: 'file/path',
  branch: 'branch-name',
  ref: 'sha-or-ref',
  tag: 'v1.2.3',
  query: 'search query',
  body: { ...operation-specific payload... },
  auth: {
    token: 'ghp_...',
    tokenType: 'pat'
  },
  options: {
    dryRun: false,
    includeRaw: false,
    timeoutMs: 45000,
    retries: 2,
    page: 1,
    perPage: 30,
    cache: {
      enabled: false,
      backend: 'memory' | 'drive_json' | 'script_properties' | 'storage_json',
      namespace: 'ast_github',
      ttlSec: 120,
      staleTtlSec: 600,
      etagTtlSec: 3600,
      storageUri: 'gcs://bucket/cache/ast-cache.json',
      coalesce: true,
      coalesceLeaseMs: 15000,
      coalesceWaitMs: 12000,
      pollMs: 250,
      serveStaleOnError: true
    }
  },
  providerOptions: {
    accept: 'optional Accept header override',
    apiVersion: '2022-11-28',
    baseUrl: 'https://api.github.com',
    graphqlUrl: 'https://api.github.com/graphql',
    userAgent: 'apps-script-tools/0.0.5'
  }
}
```

## `graphql(request)` contract

```javascript
{
  query: 'query($owner:String!, $repo:String!) { ... }',
  variables: { owner: '...', repo: '...' },
  operationName: 'optional',
  auth: { token: 'ghp_...' },
  options: {
    includeRaw: false,
    timeoutMs: 45000,
    retries: 2,
    dryRun: false,
    cache: { ...same shape as run(request)... }
  }
}
```

## Normalized response

```javascript
{
  status: 'ok',
  operation: 'get_repository',
  source: {
    baseUrl: 'https://api.github.com',
    method: 'GET',
    path: '/repos/octocat/hello-world'
  },
  data: { ...operation output... },
  page: {
    page: 1,
    perPage: 30,
    nextPage: null,
    hasMore: false
  },
  rateLimit: {
    limit: 5000,
    remaining: 4999,
    resetAt: '2026-02-26T12:00:00.000Z'
  },
  cache: {
    enabled: true,
    hit: false,
    etagUsed: false,
    revalidated304: false,
    key: 'github:get_repository:...'
  },
  dryRun: {
    enabled: false,
    plannedRequest: null
  },
  warnings: [],
  raw: null
}
```

## Dry-run semantics

- `options.dryRun=true` is honored for mutation operations only.
- Validation still runs fully in dry-run mode.
- Read operations execute normally even when `dryRun=true`.

## Config precedence

1. Per-call `request.auth` and `request.options`.
2. Runtime config via `ASTX.GitHub.configure(...)`.
3. Script properties.

## Typed errors

- `AstGitHubError`
- `AstGitHubValidationError`
- `AstGitHubAuthError`
- `AstGitHubNotFoundError`
- `AstGitHubRateLimitError`
- `AstGitHubConflictError`
- `AstGitHubCapabilityError`
- `AstGitHubProviderError`
- `AstGitHubParseError`
