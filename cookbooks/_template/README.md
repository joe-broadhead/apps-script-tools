# Cookbook Template

This template is for standalone Apps Script projects that consume `apps-script-tools` as a library.

## Setup

1. Copy this folder:

```bash
cp -R cookbooks/_template cookbooks/<project-name>
cd cookbooks/<project-name>
```

2. Create local clasp config:

```bash
cp .clasp.json.example .clasp.json
```

3. Edit `.clasp.json` and set your `scriptId`.
4. Update `src/appsscript.json`:
   - set the AST library version
   - trim/add OAuth scopes required by your project
5. Push:

```bash
clasp push
```

## Usage Pattern

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

Keep project-specific UI and orchestration here; add reusable helpers back to the core library repo surface when broadly useful.
