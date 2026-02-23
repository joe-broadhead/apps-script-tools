# Cookbooks

Use cookbook projects when you want to build app-specific Apps Script solutions (for example, a webapp chat UI) without adding project code into the core library package.

## Why this pattern

- Keeps `apps_script_tools/` focused on reusable library features.
- Lets each app have its own Apps Script deployment lifecycle and Script ID.
- Prevents accidental coupling between library internals and one-off app logic.

## Recommended structure

```text
cookbooks/
  _template/
  my-project/
    .clasp.json          # local-only
    .claspignore
    src/
      appsscript.json
      main.gs
```

## Create a cookbook project

```bash
cp -R cookbooks/_template cookbooks/my-project
cd cookbooks/my-project
cp .clasp.json.example .clasp.json
```

Update `.clasp.json`:

- `scriptId`: target script for this app
- `rootDir`: keep as `src`

Then push:

```bash
clasp push
```

## Use the library in cookbook code

```javascript
function runCookbook() {
  const ASTX = ASTLib.AST || ASTLib;
  Logger.log(ASTX.VERSION);
}
```

## Scope guidance

Put reusable logic back into the library (`apps_script_tools/`) only when it is generic enough for other consumers.
