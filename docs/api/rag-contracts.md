# RAG Contracts

## Import alias

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Surface

```javascript
ASTX.RAG.configure(config, options)
ASTX.RAG.getConfig()
ASTX.RAG.clearConfig()
ASTX.RAG.buildIndex(request)
ASTX.RAG.syncIndex(request)
ASTX.RAG.search(request)
ASTX.RAG.answer(request)
ASTX.RAG.inspectIndex(request)
ASTX.RAG.embeddingProviders()
ASTX.RAG.embeddingCapabilities(provider)
ASTX.RAG.registerEmbeddingProvider(name, adapter, options)
ASTX.RAG.unregisterEmbeddingProvider(name)
```

## `buildIndex(request)`

```javascript
{
  source: {
    folderId: 'required',
    includeSubfolders: true,
    includeMimeTypes: [
      'text/plain',
      'application/pdf',
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.presentation'
    ],
    excludeFileIds: []
  },
  index: {
    indexName: 'project-index',
    destinationFolderId: 'optional',
    indexFileId: 'optional'
  },
  embedding: {
    provider: 'openai|gemini|vertex_gemini|openrouter|perplexity|custom',
    model: 'optional override',
    providerOptions: {}
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
  },
  auth: {}
}
```

## `search(request)`

```javascript
{
  indexFileId: 'required',
  query: 'required',
  retrieval: {
    topK: 8,
    minScore: 0.2,
    mode: 'vector' | 'hybrid',
    vectorWeight: 0.65, // hybrid only
    lexicalWeight: 0.35, // hybrid only
    rerank: {
      enabled: false,
      topN: 20
    },
    filters: {
      fileIds: [],
      mimeTypes: []
    }
  },
  // Back-compat aliases are still accepted:
  // topK, minScore, filters, mode, vectorWeight, lexicalWeight, rerank
  auth: {},
  embedding: {
    providerOptions: {}
  }
}
```

## `answer(request)`

```javascript
{
  indexFileId: 'required',
  question: 'required',
  history: [{ role, content }],
  retrieval: {
    topK: 8,
    minScore: 0.2,
    mode: 'vector' | 'hybrid',
    vectorWeight: 0.65, // hybrid only
    lexicalWeight: 0.35, // hybrid only
    rerank: {
      enabled: false,
      topN: 20
    },
    filters: { fileIds: [], mimeTypes: [] }
  },
  generation: {
    provider: 'openai|gemini|vertex_gemini|openrouter|perplexity',
    model: 'optional override',
    auth: {},
    providerOptions: {},
    options: {
      temperature: 0.1,
      maxOutputTokens: 1024
    }
  },
  options: {
    requireCitations: true,
    insufficientEvidenceMessage: 'I do not have enough grounded context to answer that.'
  },
  auth: {}
}
```

## `answer` response

```javascript
{
  status: 'ok' | 'insufficient_context',
  answer: 'string',
  citations: [
    {
      citationId: 'S1',
      chunkId,
      fileId,
      fileName,
      mimeType,
      page: null | number,
      slide: null | number,
      score,
      vectorScore,
      lexicalScore, // null in vector mode
      finalScore,
      snippet
    }
  ],
  retrieval: { topK, minScore, mode, returned },
  usage
}
```

## `search` response

```javascript
{
  query: 'string',
  topK: 8,
  minScore: 0.2,
  mode: 'vector' | 'hybrid',
  results: [
    {
      chunkId,
      fileId,
      fileName,
      mimeType,
      page,
      slide,
      section,
      text,
      score, // alias of finalScore
      vectorScore,
      lexicalScore, // null in vector mode
      finalScore,
      rerankScore // present when rerank.enabled=true
    }
  ],
  usage
}
```

## Grounding policy

- Retrieval context is injected as stable citation IDs (`S1..Sn`).
- Answers are validated against retrieved context.
- If no valid citation grounding exists and `requireCitations=true`, status is `insufficient_context`.
- Hybrid retrieval combines vector + lexical evidence and can optionally rerank top-N hits.

## Typed errors

- `AstRagError`
- `AstRagValidationError`
- `AstRagAuthError`
- `AstRagSourceError`
- `AstRagIndexError`
- `AstRagRetrievalError`
- `AstRagEmbeddingCapabilityError`
- `AstRagGroundingError`
