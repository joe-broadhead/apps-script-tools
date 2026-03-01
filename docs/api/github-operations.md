# GitHub Operations

## Operation groups

Use `ASTX.GitHub.operations()` and `ASTX.GitHub.capabilities(groupOrOperation)` to inspect support at runtime.

### Identity

- `get_me`

### Auth

- `auth_as_app`

### Webhooks

- `verify_webhook`
- `parse_webhook`

### Repositories

- `get_repository`
- `create_repository`
- `fork_repository`

### Branches / commits

- `list_branches`
- `create_branch`
- `list_commits`
- `get_commit`

### Files

- `get_file_contents`
- `create_or_update_file`
- `delete_file`
- `push_files`

### Issues

- `list_issues`
- `get_issue`
- `get_issue_comments`
- `create_issue`
- `update_issue`
- `add_issue_comment`

### Pull requests

- `list_pull_requests`
- `search_pull_requests`
- `get_pull_request`
- `get_pull_request_diff`
- `get_pull_request_files`
- `get_pull_request_comments`
- `get_pull_request_review_comments`
- `get_pull_request_reviews`
- `get_pull_request_status`
- `create_pull_request`
- `update_pull_request`
- `merge_pull_request`
- `update_pull_request_branch`
- `create_pull_request_review`
- `submit_pending_pull_request_review`
- `delete_pending_pull_request_review`
- `add_comment_to_pending_review`
- `reply_to_pull_request_comment`

### Releases / tags

- `list_releases`
- `get_latest_release`
- `get_release_by_tag`
- `list_tags`
- `get_tag`

### Actions

- `list_workflows`
- `get_workflow`
- `list_workflow_runs`
- `get_workflow_run`
- `rerun_workflow_run`
- `cancel_workflow_run`
- `list_workflow_run_artifacts`
- `get_workflow_run_artifact`

### Checks

- `list_check_runs`
- `get_check_run`
- `create_check_run`
- `update_check_run`
- `list_commit_statuses`

### Search

- `search_repositories`
- `search_users`
- `search_code`
- `search_issues`

### Meta

- `rate_limit`

### GraphQL

- `graphql`

## Router examples

```javascript
const ASTX = ASTLib.AST || ASTLib;

// REST operation through run()
const issue = ASTX.GitHub.run({
  operation: 'get_issue',
  owner: 'octocat',
  repo: 'hello-world',
  issueNumber: 123
});
```

```javascript
const ASTX = ASTLib.AST || ASTLib;

// Explicit GraphQL helper
const out = ASTX.GitHub.graphql({
  query: 'query { viewer { login } }'
});
```

```javascript
const ASTX = ASTLib.AST || ASTLib;

// Verify GitHub webhook signature
const verified = ASTX.GitHub.verifyWebhook({
  payload: e.postData.contents,
  headers: e.headers,
  auth: {
    webhookSecret: 'secret://script/github-webhook-secret'
  }
});
```

## Search behavior notes

- `search_pull_requests` appends `is:pr` if not present.
- `search_issues` appends `is:issue` if not present.
- Other search operations require explicit query qualifiers.

## Pagination notes

- Use `options.page` and `options.perPage`.
- Responses expose `page.nextPage` and `page.hasMore`.
- Link-header parsing is deterministic and case-insensitive.

## Mutation notes

- Mutation operations are non-cacheable.
- Cache invalidation runs on mutation tags (`github:all`, repo, group, operation).
- `push_files` performs sequential file updates and supports dry-run planning.
- Actions rerun/cancel operations (`rerun_workflow_run`, `cancel_workflow_run`) support dry-run planning.
- Checks mutations (`create_check_run`, `update_check_run`) support dry-run planning.
