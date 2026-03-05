# GitHub Issue Digest Cookbook

Practical Apps Script cookbook that uses `AST.GitHub` to fetch open issues/PRs and log a compact digest.

## Files

- `src/main.gs`: runnable entrypoint (`runGithubIssueDigestSmoke`)
- `src/appsscript.json`: library binding + scopes
- `.clasp.json.example`: local clasp config template

## Setup

1. Copy clasp config and set your target script id:

```bash
cp .clasp.json.example .clasp.json
```

2. Set script properties in the target Apps Script project:

- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`

3. Set the published AST library version in `src/appsscript.json`.
4. Push and run:

```bash
clasp push
# Run runGithubIssueDigestSmoke from Apps Script editor or clasp run.
```

## Notes

- This example uses only public `AST.GitHub` APIs.
- No library internals are copied into the cookbook.
