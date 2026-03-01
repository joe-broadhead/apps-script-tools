# GitHub Quick Start

## Import alias

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Configure runtime defaults

```javascript
function configureGitHubRuntime() {
  const ASTX = ASTLib.AST || ASTLib;
  ASTX.GitHub.configure(PropertiesService.getScriptProperties().getProperties());
}
```

Supported script property keys:

- `GITHUB_TOKEN`
- `GITHUB_TOKEN_TYPE` (`pat` | `github_app`)
- `GITHUB_APP_ID`
- `GITHUB_APP_INSTALLATION_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`
- `GITHUB_API_BASE_URL` (optional, defaults to `https://api.github.com`)
- `GITHUB_GRAPHQL_URL` (optional)
- `GITHUB_OWNER` / `GITHUB_REPO` (optional defaults)
- `GITHUB_TIMEOUT_MS`
- `GITHUB_RETRIES`
- `GITHUB_CACHE_ENABLED`
- `GITHUB_CACHE_BACKEND`
- `GITHUB_CACHE_NAMESPACE`
- `GITHUB_CACHE_TTL_SEC`
- `GITHUB_CACHE_STALE_TTL_SEC`
- `GITHUB_CACHE_ETAG_TTL_SEC`
- `GITHUB_CACHE_STORAGE_URI`
- `GITHUB_CACHE_COALESCE`
- `GITHUB_CACHE_COALESCE_LEASE_MS`
- `GITHUB_CACHE_COALESCE_WAIT_MS`
- `GITHUB_CACHE_POLL_MS`
- `GITHUB_CACHE_SERVE_STALE_ON_ERROR`
- `GITHUB_USER_AGENT`

## Basic read call

```javascript
function githubRepoExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.GitHub.getRepository({
    owner: 'octocat',
    repo: 'hello-world'
  });

  Logger.log(out.data.full_name);
  Logger.log(out.rateLimit.remaining);
}
```

## Mutation dry-run planning

```javascript
function githubDryRunExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.GitHub.createIssue({
    owner: 'octocat',
    repo: 'hello-world',
    body: {
      title: 'Planned issue',
      body: 'No network mutation is executed.'
    },
    options: {
      dryRun: true
    }
  });

  Logger.log(JSON.stringify(out.dryRun.plannedRequest, null, 2));
}
```

## GraphQL query

```javascript
function githubGraphqlExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.GitHub.graphql({
    query: 'query($owner:String!, $repo:String!) { repository(owner:$owner, name:$repo) { id name } }',
    variables: {
      owner: 'octocat',
      repo: 'hello-world'
    }
  });

  Logger.log(JSON.stringify(out.data.data.repository, null, 2));
}
```

## GitHub App installation token

```javascript
function githubAppTokenExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.GitHub.authAsApp({
    auth: {
      appId: PropertiesService.getScriptProperties().getProperty('GITHUB_APP_ID'),
      installationId: PropertiesService.getScriptProperties().getProperty('GITHUB_APP_INSTALLATION_ID'),
      privateKey: PropertiesService.getScriptProperties().getProperty('GITHUB_APP_PRIVATE_KEY')
    }
  });

  Logger.log(out.data.expiresAt);
}
```

## Webhook verification + parsing

```javascript
function doPost(e) {
  const ASTX = ASTLib.AST || ASTLib;

  const parsed = ASTX.GitHub.parseWebhook({
    payload: e.postData.contents,
    headers: e.headers,
    options: {
      verifySignature: true
    },
    auth: {
      webhookSecret: PropertiesService.getScriptProperties().getProperty('GITHUB_WEBHOOK_SECRET')
    }
  });

  Logger.log(`${parsed.data.event} ${parsed.data.action}`);
  return ContentService.createTextOutput('ok');
}
```

## Read caching with ETag revalidation

```javascript
function githubCachedReadExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.GitHub.listPullRequests({
    owner: 'octocat',
    repo: 'hello-world',
    options: {
      cache: {
        enabled: true,
        backend: 'storage_json',
        namespace: 'github_reads',
        storageUri: 'gcs://my-bucket/cache/ast-cache.json',
        ttlSec: 120,
        staleTtlSec: 600,
        etagTtlSec: 3600
      }
    }
  });

  Logger.log(JSON.stringify(out.cache));
}
```

## Actions workflows and runs

```javascript
function githubActionsExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const workflows = ASTX.GitHub.listWorkflows({
    owner: 'octocat',
    repo: 'hello-world'
  });

  const runs = ASTX.GitHub.listWorkflowRuns({
    owner: 'octocat',
    repo: 'hello-world',
    workflowId: '.github/workflows/ci.yml',
    body: {
      branch: 'main',
      status: 'completed'
    }
  });

  const rerunPlan = ASTX.GitHub.rerunWorkflowRun({
    owner: 'octocat',
    repo: 'hello-world',
    runId: 123456789,
    options: {
      dryRun: true
    }
  });

  Logger.log(workflows.data.total_count);
  Logger.log(runs.data.total_count);
  Logger.log(JSON.stringify(rerunPlan.dryRun.plannedRequest, null, 2));
}
```

## Checks API examples

```javascript
function githubChecksExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const checkRuns = ASTX.GitHub.listCheckRuns({
    owner: 'octocat',
    repo: 'hello-world',
    ref: 'main',
    body: {
      status: 'completed'
    }
  });

  const statuses = ASTX.GitHub.listCommitStatuses({
    owner: 'octocat',
    repo: 'hello-world',
    ref: 'main'
  });

  const createPlan = ASTX.GitHub.createCheckRun({
    owner: 'octocat',
    repo: 'hello-world',
    body: {
      name: 'ast-ci-check',
      head_sha: 'abc123',
      status: 'in_progress'
    },
    options: {
      dryRun: true
    }
  });

  Logger.log(checkRuns.data.total_count);
  Logger.log(statuses.data.length);
  Logger.log(JSON.stringify(createPlan.dryRun.plannedRequest, null, 2));
}
```
