# GitHub Automation Cookbook

This cookbook upgrades the original `github_issue_digest` example into a template-v2 project that demonstrates practical `AST.GitHub` automation flows.

It uses only public `AST` APIs:

- `ASTX.GitHub.getRepository(...)`
- `ASTX.GitHub.listIssues(...)`
- `ASTX.GitHub.getIssue(...)`
- `ASTX.GitHub.getIssueComments(...)`
- `ASTX.GitHub.createIssue(...)` with `dryRun`
- `ASTX.GitHub.listPullRequests(...)`
- `ASTX.GitHub.getPullRequestStatus(...)`
- `ASTX.GitHub.listCheckRuns(...)`
- `ASTX.GitHub.listWorkflows(...)`
- `ASTX.GitHub.searchPullRequests(...)`
- `ASTX.GitHub.graphql(...)`
- `ASTX.GitHub.listProjectsV2(...)`
- `ASTX.GitHub.listProjectV2Items(...)`
- `ASTX.GitHub.authAsApp(...)`
- `ASTX.GitHub.verifyWebhook(...)`
- `ASTX.GitHub.parseWebhook(...)`

## What it covers

Smoke flow:

1. configure `AST.GitHub` with PAT-first auth and module cache settings
2. read repository metadata, open issues, and open pull requests
3. perform one checks helper call against the default branch via `listCheckRuns(...)`
4. demonstrate mutation planning with `createIssue(..., { dryRun: true })`

Demo flow:

1. inspect one live issue and one live pull request when they exist
2. list Actions workflows and search pull requests
3. execute one GraphQL repository query
4. optionally inspect Projects v2 boards/items when configured
5. run deterministic webhook verify/parse fixture locally
6. optionally show GitHub App auth planning via `authAsApp(..., { dryRun: true })`

## Folder contract

```text
cookbooks/github_issue_digest/
  README.md
  .clasp.json.example
  .claspignore
  src/
    appsscript.json
    00_Config.gs
    10_EntryPoints.gs
    20_Smoke.gs
    30_Examples.gs
    99_DevTools.gs
```

## Setup

1. Copy `.clasp.json.example` to `.clasp.json`.
2. Set your Apps Script `scriptId`.
3. Replace `<PUBLISHED_AST_LIBRARY_VERSION>` in `src/appsscript.json`.
4. Push with `clasp push`.
5. Set required script properties.
6. Run `seedCookbookConfig()`.
7. Run `runCookbookAll()`.

## Required script properties

Core auth/runtime keys:

| Key | Required | Purpose |
| --- | --- | --- |
| `GITHUB_TOKEN` | Yes | PAT used for live cookbook reads and dry-run mutation planning. |
| `GITHUB_OWNER` | Conditionally | Default owner if `GITHUB_AUTOMATION_OWNER` is not set. |
| `GITHUB_REPO` | Conditionally | Default repo if `GITHUB_AUTOMATION_REPO` is not set. |

Cookbook keys:

| Key | Required | Default | Purpose |
| --- | --- | --- | --- |
| `GITHUB_AUTOMATION_APP_NAME` | Yes | `AST GitHub Automation Cookbook` | Display name included in outputs. |
| `GITHUB_AUTOMATION_OWNER` | No | `''` | Repository owner override. |
| `GITHUB_AUTOMATION_REPO` | No | `''` | Repository name override. |
| `GITHUB_AUTOMATION_DEFAULT_BRANCH` | No | `''` | Optional ref override for check-runs lookup. |
| `GITHUB_AUTOMATION_PROJECT_OWNER` | No | `''` | Optional Projects v2 owner login. Defaults to repo owner when set. |
| `GITHUB_AUTOMATION_PROJECT_ID` | No | `''` | Optional Project v2 node id for items example. |
| `GITHUB_AUTOMATION_CACHE_ENABLED` | No | `true` | Enable module cache for read-heavy GitHub calls. |
| `GITHUB_AUTOMATION_CACHE_BACKEND` | No | `memory` | `memory`, `drive_json`, `script_properties`, or `storage_json`. |
| `GITHUB_AUTOMATION_CACHE_NAMESPACE` | No | `ast_github_cookbook` | Cache namespace. |
| `GITHUB_AUTOMATION_CACHE_TTL_SEC` | No | `120` | Fresh cache TTL. |
| `GITHUB_AUTOMATION_CACHE_STALE_TTL_SEC` | No | `600` | Stale cache TTL. |
| `GITHUB_AUTOMATION_CACHE_ETAG_TTL_SEC` | No | `3600` | ETag revalidation TTL. |
| `GITHUB_AUTOMATION_CACHE_STORAGE_URI` | No | `''` | Required when using `storage_json`. |
| `GITHUB_AUTOMATION_APP_ID` | No | `''` | Optional GitHub App id for auth example. |
| `GITHUB_AUTOMATION_APP_INSTALLATION_ID` | No | `''` | Optional installation id for auth example. |
| `GITHUB_AUTOMATION_APP_PRIVATE_KEY` | No | `''` | Optional private key or `secret://` reference for app-auth example. |

You must resolve repository coordinates through either:

- `GITHUB_AUTOMATION_OWNER` + `GITHUB_AUTOMATION_REPO`
- or `GITHUB_OWNER` + `GITHUB_REPO`

## PAT-first setup guidance

Recommended PAT scopes:

- classic PAT: `repo`
- fine-grained PAT: repository metadata, issues, pull requests, actions read, checks read
- add `read:org` or Projects access if you plan to use Projects v2 examples

The cookbook only performs live reads. Mutations are demonstrated with `dryRun` by default.

## Optional GitHub App setup

If you want to test `authAsApp(...)` planning:

```text
GITHUB_AUTOMATION_APP_ID=12345
GITHUB_AUTOMATION_APP_INSTALLATION_ID=67890
GITHUB_AUTOMATION_APP_PRIVATE_KEY=secret://script/github-app-private-key
```

The demo uses `dryRun: true` for app-auth planning so no token exchange is required unless you adapt it.

## Cache and ETag recommendations

Recommended default for read-heavy cookbook usage:

```text
GITHUB_AUTOMATION_CACHE_ENABLED=true
GITHUB_AUTOMATION_CACHE_BACKEND=memory
GITHUB_AUTOMATION_CACHE_TTL_SEC=120
GITHUB_AUTOMATION_CACHE_STALE_TTL_SEC=600
GITHUB_AUTOMATION_CACHE_ETAG_TTL_SEC=3600
```

Use `storage_json` when you want cache reuse across executions:

```text
GITHUB_AUTOMATION_CACHE_BACKEND=storage_json
GITHUB_AUTOMATION_CACHE_STORAGE_URI=gcs://my-bucket/github/cache.json
```

Recommended patterns:

- `memory` for single execution flows and light smoke runs
- `storage_json` for scheduled/reporting apps that read the same repo repeatedly
- keep `ETag` revalidation enabled so repeated reads become cheap `304` checks when supported

## Entrypoints

Required template entrypoints:

- `seedCookbookConfig()`
- `validateCookbookConfig()`
- `runCookbookSmoke()`
- `runCookbookDemo()`
- `runCookbookAll()`

Additional helper entrypoints:

- `runCookbookWebhookFixture()`
- `showCookbookSources()`

## Expected output shape

`runCookbookSmoke()` returns a payload like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookSmoke",
  "repository": {
    "fullName": "owner/repo",
    "defaultBranch": "main"
  },
  "issues": {
    "openIssues": 3
  },
  "checks": {
    "ref": "main",
    "total": 5
  },
  "dryRun": {
    "enabled": true
  }
}
```

`runCookbookDemo()` returns a payload like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookDemo",
  "issueFlow": {
    "issueNumber": 123,
    "commentCount": 4
  },
  "pullRequestFlow": {
    "pullNumber": 456,
    "statuses": 3
  },
  "actions": {
    "workflowCount": 6
  },
  "webhookFixture": {
    "status": "ok"
  }
}
```

## OAuth scopes

Required Apps Script scope:

- `https://www.googleapis.com/auth/script.external_request`

## Troubleshooting

`Cookbook config is invalid`

- Set `GITHUB_TOKEN`.
- Set repo coordinates via cookbook or base GitHub config properties.
- If using `storage_json`, provide `GITHUB_AUTOMATION_CACHE_STORAGE_URI`.

`Projects v2 examples skip`

- Set `GITHUB_AUTOMATION_PROJECT_OWNER` to list boards.
- Set `GITHUB_AUTOMATION_PROJECT_ID` to inspect items.
- Ensure your token has Projects access.

`Checks lookup fails on ref`

- Set `GITHUB_AUTOMATION_DEFAULT_BRANCH` explicitly if the repo default branch is unusual or protected via custom refs.
