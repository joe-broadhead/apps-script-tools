# RAG Chat Starter

Production-oriented Apps Script webapp starter for grounded chat over Drive content using public `apps-script-tools` APIs only.

This cookbook is the template-v2 answer for issue `#299`:
- `AST.RAG` for index bootstrap, sync, inspect, citations, and grounded answers
- `AST.Chat` for per-user thread persistence and history assembly
- `HtmlService` webapp shell with configurable branding and palette

## Folder layout

```text
cookbooks/rag_chat_starter/
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
    Index.html
    IndexLayout.html
    IndexStyles.html
    IndexScript.html
```

## What it demonstrates

- shared index bootstrap and reuse via `AST.RAG.IndexManager`
- grounded answer flow with inline citation normalization and linked source chips
- per-user session/thread persistence with `AST.Chat.ThreadStore`
- fast vs deep chat modes
- run-as-user webapp deployment guidance
- branding without code edits via Script Properties

## Setup

1. Create a standalone Apps Script project.
2. Add the published `apps-script-tools` library as `ASTLib`.
3. Copy local clasp config:

```bash
cd cookbooks/rag_chat_starter
cp .clasp.json.example .clasp.json
```

4. Edit `.clasp.json` and set your target `scriptId`.
5. Replace `<PUBLISHED_AST_LIBRARY_VERSION>` in `/Users/joe/Documents/Joe/Github/apps-script-tools/cookbooks/rag_chat_starter/src/appsscript.json`.
6. Push:

```bash
clasp push
```

7. Run `seedCookbookConfig()` once.
8. Update the required Script Properties.
9. Run `runCookbookSmoke()`.
10. Deploy as a Web App.

## Required Script Properties

| Key | Required | Purpose |
| --- | --- | --- |
| `RAG_CHAT_SOURCE_FOLDER_ID` | Yes | Drive folder containing the source corpus |
| `RAG_CHAT_INDEX_NAME` | Yes | Shared index name |
| `RAG_CHAT_GENERATION_PROVIDER` | Yes | Generation provider (`openai`, `gemini`, `vertex_gemini`, `openrouter`, `perplexity`) |
| `RAG_CHAT_EMBEDDING_PROVIDER` | Yes | Embedding provider used for index build |

Model overrides are optional:
- `RAG_CHAT_MODEL_FAST`
- `RAG_CHAT_MODEL_DEEP`
- `RAG_CHAT_EMBED_MODEL`

Provider auth continues to use the normal AST module keys. Examples:
- Vertex: `VERTEX_PROJECT_ID`, `VERTEX_LOCATION`, `VERTEX_EMBED_MODEL`, `VERTEX_GEMINI_MODEL`, optional `VERTEX_SERVICE_ACCOUNT_JSON`
- OpenAI: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_EMBED_MODEL`
- Gemini: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_EMBED_MODEL`

## Optional Script Properties

### Branding

- `RAG_CHAT_APP_NAME`
- `RAG_CHAT_APP_TAGLINE`
- `RAG_CHAT_PLACEHOLDER`
- `RAG_CHAT_LOGO_URL`
- `RAG_CHAT_FONT_FAMILY`

### Palette

- `RAG_CHAT_COLOR_PRIMARY`
- `RAG_CHAT_COLOR_ACCENT`
- `RAG_CHAT_COLOR_BG_START`
- `RAG_CHAT_COLOR_BG_END`
- `RAG_CHAT_COLOR_SURFACE`
- `RAG_CHAT_COLOR_TEXT`
- `RAG_CHAT_COLOR_MUTED`

### Chat/session persistence

- `RAG_CHAT_THREADS_BACKEND` (`drive_json`, `storage_json`, `script_properties`)
- `RAG_CHAT_THREADS_NAMESPACE`
- `RAG_CHAT_THREADS_DRIVE_FOLDER_ID`
- `RAG_CHAT_THREADS_DRIVE_FILE_NAME`
- `RAG_CHAT_THREADS_STORAGE_URI`
- `RAG_CHAT_THREADS_TTL_SEC`
- `RAG_CHAT_THREAD_MAX`
- `RAG_CHAT_TURNS_MAX`
- `RAG_CHAT_HISTORY_MAX_PAIRS`

### Retrieval / answer behavior

- `RAG_CHAT_RETRIEVAL_TOP_K_FAST`
- `RAG_CHAT_RETRIEVAL_TOP_K_DEEP`
- `RAG_CHAT_MIN_SCORE`
- `RAG_CHAT_MAX_OUTPUT_TOKENS_FAST`
- `RAG_CHAT_MAX_OUTPUT_TOKENS_DEEP`
- `RAG_CHAT_REQUIRE_CITATIONS`
- `RAG_CHAT_SMOKE_QUESTION`
- `RAG_CHAT_INSUFFICIENT_EVIDENCE_MESSAGE`

### Index lifecycle

- `RAG_CHAT_INDEX_FILE_ID`
- `RAG_CHAT_AUTO_BUILD_INDEX`
- `RAG_CHAT_ALLOW_INDEX_MUTATIONS`

## Deployment guidance

Recommended webapp deployment mode:
- execute as: `User accessing the web app`
- access: restricted to the audience you actually need

Why this matters:
- `AST.Chat.ThreadStore` with `drive_json` durable storage will persist in the accessing user's Drive context.
- source document access is evaluated in the accessing user's Google context.
- secrets remain server-side in Script Properties and are never returned to the browser.

If you need a fully shared durable store instead of per-user Drive JSON, switch `RAG_CHAT_THREADS_BACKEND=storage_json` and provide `RAG_CHAT_THREADS_STORAGE_URI`.

## Scopes

This cookbook ships with:
- `https://www.googleapis.com/auth/script.external_request`
- `https://www.googleapis.com/auth/drive`

`drive` is required because the cookbook can build/sync the RAG index and, by default, persists thread state with `drive_json`.

## Entry points

- `seedCookbookConfig()`
- `validateCookbookConfig()`
- `runCookbookSmoke()`
- `runCookbookDemo()`
- `runCookbookAll()`
- `doGet()`
- `initAppWeb()`
- `chatTurnWeb(request)`
- `newThreadWeb(request)`
- `switchThreadWeb(request)`
- `syncIndexWeb()`
- `rebuildIndexWeb()`
- `getIndexStateWeb()`

## Expected smoke output

`runCookbookSmoke()` returns a structured object containing:
- index metadata (`indexFileId`, name, source count, chunk count)
- one grounded answer for `RAG_CHAT_SMOKE_QUESTION`
- normalized linked citations ready for UI rendering

First run can take materially longer because it may build the index.

## Troubleshooting

`Cookbook config is invalid`
- Run `seedCookbookConfig()`.
- Check `RAG_CHAT_SOURCE_FOLDER_ID` and provider keys.

`Index is unavailable`
- Enable `RAG_CHAT_AUTO_BUILD_INDEX=true` for first bootstrap.
- Or set a known `RAG_CHAT_INDEX_FILE_ID`.

`Chat works but no citations are linked`
- Confirm the indexed sources are supported Drive docs, Slides, plain text, or PDFs.
- Confirm the model has enough grounded evidence for the question.

`Threads are not shared between users`
- That is expected with `drive_json` under run-as-user deployment.
- Use `storage_json` if you want a shared durable thread store.
