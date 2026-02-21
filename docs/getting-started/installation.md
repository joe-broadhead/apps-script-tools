# Installation

## Prerequisites

- A Google Apps Script project.
- Permission to add libraries in that project.
- Access to required Google services (Sheets/Drive/BigQuery) based on your usage.

## Add as library

1. Open your Apps Script project.
2. Open **Libraries**.
3. Add script ID:

```text
1gZ_6DiLeDhh-a4qcezluTFDshw4OEhTXbeD3wthl_UdHEAFkXf6i6Ho_
```

4. Choose a published version.
5. Set an identifier.

Recommended identifier: `ASTLib`

`ASTLib` is the Apps Script library identifier.
`ASTX` is a local alias used in code examples.

## Normalize namespace once

Use this pattern at the top of scripts to support both direct and nested export shapes:

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

If you set identifier `AST`, the same pattern works:

```javascript
const ASTX = AST.AST || AST;
```

## Verify install

```javascript
function verifyAstInstall() {
  const ASTX = ASTLib.AST || ASTLib;

  Logger.log({
    version: ASTX.VERSION,
    hasDataFrame: typeof ASTX.DataFrame === 'function',
    hasSeries: typeof ASTX.Series === 'function',
    hasUtils: !!ASTX.Utils,
    hasAi: !!ASTX.AI,
    hasRag: !!ASTX.RAG
  });
}
```

## OAuth scope notes

Library manifest scopes are declared in the library project. Your consumer script still needs to authorize at runtime when calling methods that touch external services.

Common scope-dependent surfaces:

- `ASTX.DataFrame.toSheet(...)` and sheet open helpers.
- `ASTX.Drive.read(...)` and `ASTX.Drive.create(...)`.
- `ASTX.Sql.run(...)` with provider `bigquery`.
- `ASTX.AI.*(...)` for provider API requests (external request scope required).
- `ASTX.AI.*(...)` with `provider='vertex_gemini'` (cloud-platform scope required).
- `ASTX.RAG.*(...)` for Drive ingestion/retrieval and embedding/generation provider calls.
