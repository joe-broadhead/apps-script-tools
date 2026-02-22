# RAG Quick Start

This quick start builds a Drive-backed index and asks grounded questions with citations.

## Setup script properties

At minimum, set one embedding provider and one generation provider.

Example:

- `OPENAI_API_KEY`
- `OPENAI_EMBED_MODEL` (for example `text-embedding-3-small`)
- `OPENAI_MODEL` (for answer generation, for example `gpt-4.1-mini`)

## Import alias

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Build an index from Drive

```javascript
function ragBuildIndex() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.RAG.buildIndex({
    source: {
      folderId: 'YOUR_DRIVE_FOLDER_ID',
      includeSubfolders: true,
      includeMimeTypes: [
        'text/plain',
        'application/pdf',
        'application/vnd.google-apps.document',
        'application/vnd.google-apps.presentation'
      ]
    },
    index: {
      indexName: 'project-rag-index'
    },
    embedding: {
      provider: 'openai'
    },
    chunking: {
      chunkSizeChars: 1200,
      chunkOverlapChars: 200,
      minChunkChars: 200
    },
    options: {
      maxFiles: 300,
      maxChunks: 2000,
      skipParseFailures: true
    }
  });

  Logger.log(out);
}
```

## Ask a grounded question

```javascript
function ragAnswer() {
  const ASTX = ASTLib.AST || ASTLib;

  const response = ASTX.RAG.answer({
    indexFileId: 'YOUR_INDEX_FILE_ID',
    question: 'What are the current project risks?',
    retrieval: {
      topK: 8,
      minScore: 0.2,
      mode: 'hybrid',
      vectorWeight: 0.65,
      lexicalWeight: 0.35,
      rerank: {
        enabled: true,
        topN: 12
      }
    },
    generation: {
      provider: 'openai',
      options: {
        temperature: 0.1,
        maxOutputTokens: 1024
      }
    },
    options: {
      requireCitations: true,
      insufficientEvidenceMessage: 'I do not have enough grounded context to answer that.'
    }
  });

  Logger.log(response.status);
  Logger.log(response.answer);
  Logger.log(response.citations);
}
```

## Sync an index after source changes

```javascript
function ragSyncIndex() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.RAG.syncIndex({
    source: {
      folderId: 'YOUR_DRIVE_FOLDER_ID',
      includeSubfolders: true
    },
    index: {
      indexName: 'project-rag-index',
      indexFileId: 'YOUR_INDEX_FILE_ID'
    },
    embedding: {
      provider: 'openai'
    }
  });

  Logger.log(out);
}
```
