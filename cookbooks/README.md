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

## Rules

- Do not place cookbook code under `apps_script_tools/`.
- Do not commit `.clasp.json`, `.clasprc.json`, or credentials.
- Use `const ASTX = ASTLib.AST || ASTLib;` inside cookbook scripts.
