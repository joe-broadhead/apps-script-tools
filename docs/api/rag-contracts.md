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
ASTX.RAG.previewSources(request)
ASTX.RAG.answer(request)
ASTX.RAG.inspectIndex(request)
ASTX.RAG.buildRetrievalCacheKey(args)
ASTX.RAG.putRetrievalPayload(key, payload, options)
ASTX.RAG.getRetrievalPayload(key, options)
ASTX.RAG.deleteRetrievalPayload(key, options)
ASTX.RAG.Citations.normalizeInline(text)
ASTX.RAG.Citations.extractInlineIds(text)
ASTX.RAG.Citations.filterForAnswer(citations, options)
ASTX.RAG.Citations.toUrl(citation)
ASTX.RAG.Fallback.fromCitations(args)
ASTX.RAG.IndexManager.create(config)
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
  auth: {
    // for vertex_gemini embedding provider
    // authMode: 'oauth' | 'service_account' | 'auto' (default auto)
    // serviceAccountJson: object | JSON string (optional)
  }
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
    recovery: {
      enabled: false,
      topKBoost: 2,
      minScoreFloor: 0.05,
      maxAttempts: 2
    },
    rerank: {
      enabled: false,
      topN: 20
    },
    access: {
      allowedFileIds: [],
      deniedFileIds: [],
      allowedMimeTypes: [],
      deniedMimeTypes: []
    },
    filters: {
      fileIds: [],
      mimeTypes: []
    }
  },
  options: {
    enforceAccessControl: true
  },
  cache: {
    enabled: false,
    backend: 'memory' | 'drive_json' | 'script_properties' | 'storage_json',
    namespace: 'ast_rag',
    ttlSec: 300,
    searchTtlSec: 300,
    embeddingTtlSec: 900,
    storageUri: 's3://bucket/cache',
    lockTimeoutMs: 5000,
    updateStatsOnGet: false
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
    access: {
      allowedFileIds: [],
      deniedFileIds: [],
      allowedMimeTypes: [],
      deniedMimeTypes: []
    },
    filters: { fileIds: [], mimeTypes: [] }
  },
  fallback: {
    onRetrievalError: false,
    onRetrievalEmpty: false,
    intent: 'summary' | 'facts',
    factCount: 5
  },
  generation: {
    provider: 'openai|gemini|vertex_gemini|openrouter|perplexity',
    model: 'optional override',
    auth: {
      // for vertex_gemini generation provider
      // authMode: 'oauth' | 'service_account' | 'auto' (default auto)
      // serviceAccountJson: object | JSON string (optional)
    },
    providerOptions: {},
    options: {
      temperature: 0.1,
      maxOutputTokens: 1024
    }
  },
  options: {
    requireCitations: true,
    enforceAccessControl: true,
    insufficientEvidenceMessage: 'I do not have enough grounded context to answer that.'
  },
  cache: {
    enabled: false,
    backend: 'memory' | 'drive_json' | 'script_properties' | 'storage_json',
    namespace: 'ast_rag',
    ttlSec: 300,
    answerTtlSec: 180,
    embeddingTtlSec: 900,
    storageUri: 's3://bucket/cache'
  },
  retrievalPayload: {
    indexFileId: 'required when provided',
    versionToken: 'optional',
    query: 'must match question',
    retrieval: { ... },
    results: [ ...search-like results... ]
  },
  retrievalPayloadKey: 'optional key from buildRetrievalCacheKey(...)',
  retrievalPayloadCache: {
    backend: 'memory' | 'drive_json' | 'script_properties' | 'storage_json',
    namespace: 'ast_rag_retrieval',
    storageUri: 'optional'
  },
  auth: {}
}
```

## `previewSources(request)`

`previewSources` is a `search(...)` wrapper that returns UI-ready cards plus an optional reusable retrieval payload.

```javascript
{
  indexFileId: 'required',
  query: 'required',
  retrieval: {
    topK: 8,
    minScore: 0.2,
    mode: 'vector' | 'hybrid'
  },
  cache: {
    enabled: false,
    backend: 'memory' | 'drive_json' | 'script_properties' | 'storage_json'
  },
  preview: {
    snippetMaxChars: 280,
    includeText: false,
    includePayload: true,
    cachePayload: false,
    payloadTtlSec: 600,
    payloadCache: {
      backend: 'memory' | 'drive_json' | 'script_properties' | 'storage_json',
      namespace: 'ast_rag_retrieval',
      storageUri: 'optional'
    }
  }
}
```

Response fields:

- `cards[]`: citation-ready source cards (`citationId`, `snippet`, `url`, score metadata, source metadata)
- `payload`: deterministic retrieval payload for `answer(...)` reuse
- `cacheKey`: deterministic key from `buildRetrievalCacheKey(...)`

## Retrieval payload cache interop

```javascript
const key = ASTX.RAG.buildRetrievalCacheKey({
  indexFileId,
  query,
  retrieval,
  filters,    // optional
  access,     // optional
  options: { enforceAccessControl: true }, // optional
  versionToken // optional
});

ASTX.RAG.putRetrievalPayload(key, payload, {
  backend: 'storage_json',
  namespace: 'ast_rag_retrieval',
  ttlSec: 600
});

const payload = ASTX.RAG.getRetrievalPayload(key, {
  backend: 'storage_json',
  namespace: 'ast_rag_retrieval'
});

ASTX.RAG.deleteRetrievalPayload(key, {
  backend: 'storage_json',
  namespace: 'ast_rag_retrieval'
});
```

## `IndexManager`

`IndexManager` is a convenience wrapper over `buildIndex`, `syncIndex`, and `inspectIndex`.

```javascript
const manager = ASTX.RAG.IndexManager.create({
  defaults: {
    indexName: 'project-index',
    indexFileId: '', // optional
    source: { folderId: '...' },
    embedding: { provider: 'vertex_gemini', model: 'text-embedding-005' },
    auth: { ... },
    fallbackToSupportedMimeTypes: true
  }
});

const ensured = manager.ensure({
  source: { includeMimeTypes: ['text/plain', 'application/zip'] },
  options: {
    allowAutoBuild: true,
    syncOnEnsure: false,
    fallbackToSupportedMimeTypes: true
  }
});

const synced = manager.sync({ source: { folderId: '...' } });
const fast = manager.fastState(); // lightweight metadata
```

`ensure(...)` diagnostics include:

- `fallbackToSupportedMimeTypes`
- `unsupportedMimeTypes`
- final `includeMimeTypes`

## Vertex service-account auth

`ASTX.RAG` uses the same Vertex auth-mode contract as `ASTX.AI`:

- `oauth`: OAuth token path only.
- `service_account`: require `serviceAccountJson`.
- `auto` (default): prefer service-account JSON when present, otherwise fallback to OAuth.

Service-account `token_uri` is validated against:
- `https://oauth2.googleapis.com/token`
- `https://www.googleapis.com/oauth2/v4/token`

Resolution precedence for Vertex service-account JSON:

1. per-call `auth.serviceAccountJson` (or `generation.auth.serviceAccountJson`)
2. runtime config `ASTX.RAG.configure({ VERTEX_SERVICE_ACCOUNT_JSON: ... })`
3. script property `VERTEX_SERVICE_ACCOUNT_JSON`

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
      rerankScore, // null unless rerank produced a score
      snippet
    }
  ],
  retrieval: { topK, minScore, mode, returned },
  usage,
  diagnostics: {
    totalMs,
    pipelinePath: 'standard' | 'recovery_applied' | 'fallback',
    retrieval: {
      source: 'index' | 'payload',
      ms,
      rawSources,
      usableSources,
      emptyReason, // null | no_index_chunks | payload_empty | filters_excluded_all | access_filtered_all | below_min_score | no_matches | retrieval_error
      recoveryAttempted,
      recoveryApplied,
      attempts: [{ attempt, topK, minScore, returned, ms }]
    },
    generation: {
      status: 'not_started' | 'started' | 'ok' | 'error' | 'skipped',
      ms,
      grounded,
      finishReason,
      errorClass
    }
  }
}
```

## Citation + fallback utilities

```javascript
const cleaned = ASTX.RAG.Citations.normalizeInline(answerText);
const inlineIds = ASTX.RAG.Citations.extractInlineIds(cleaned);
const filtered = ASTX.RAG.Citations.filterForAnswer(citations, { maxItems: 6 });
const sourceUrl = ASTX.RAG.Citations.toUrl(filtered[0]);

const fallback = ASTX.RAG.Fallback.fromCitations({
  citations: filtered,
  intent: 'facts',
  factCount: 5
});
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
- Access control can be enforced with `retrieval.access` + `options.enforceAccessControl=true`.
- When access policy excludes all relevant chunks or cited chunks are inaccessible, `answer` deterministically returns `status=insufficient_context`.
- Optional cache controls can reduce repeated embedding/generation cost on hot queries.

## Typed errors

- `AstRagError`
- `AstRagValidationError`
- `AstRagAuthError`
- `AstRagAccessError`
- `AstRagSourceError`
- `AstRagIndexError`
- `AstRagRetrievalError`
- `AstRagEmbeddingCapabilityError`
- `AstRagGroundingError`
