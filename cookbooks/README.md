# Cookbooks

`cookbooks/` holds project-specific Apps Script implementations that consume this library.

Goal:

- Keep reusable platform code in `apps_script_tools/`.
- Keep app-specific code (webapps, demos, integrations) in isolated cookbook projects.

## Folder Model

```text
cookbooks/
  _template/
    .clasp.json.example
    .claspignore
    README.md
    src/
      appsscript.json
      main.gs
  my-project/
    .clasp.json          # local only (ignored)
    .claspignore
    src/
      appsscript.json
      main.gs
```

## Create a New Cookbook Project

```bash
cp -R cookbooks/_template cookbooks/<project-name>
cd cookbooks/<project-name>
cp .clasp.json.example .clasp.json
```

Edit `.clasp.json`:

- set `scriptId` to the target Apps Script project
- keep `rootDir` as `src`

Then push:

```bash
clasp push
```

## Available examples

- `_template`: minimal starter project scaffold.
- `github_issue_digest`: fetch open issues/PRs via `AST.GitHub` and emit a digest.
- `dbt_manifest_summary`: load Drive manifest and summarize models via `AST.DBT`.
- `storage_cache_warmer`: warm persisted cache keys using `AST.Cache` + `storage_json`.

## Smoke instructions

Each example README includes required script properties and the entrypoint function to run.
Recommended smoke order:

1. `clasp push`
2. Run the example's `*Smoke` function from Apps Script.
3. Verify logged output and expected external side effects (where applicable).

## Rules

- Do not place cookbook code under `apps_script_tools/`.
- Do not commit `.clasp.json`, `.clasprc.json`, or credentials.
- Use `const ASTX = ASTLib.AST || ASTLib;` inside cookbook scripts.
