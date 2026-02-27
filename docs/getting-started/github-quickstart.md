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
