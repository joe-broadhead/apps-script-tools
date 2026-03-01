const AST_RAG_SUPPORTED_MIME_TYPES = Object.freeze([
  'text/plain',
  'application/pdf',
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.presentation'
]);

const AST_RAG_SOURCE_TYPE_BY_MIME = Object.freeze({
  'text/plain': 'txt',
  'application/pdf': 'pdf',
  'application/vnd.google-apps.document': 'google_doc',
  'application/vnd.google-apps.presentation': 'google_slide'
});

const AST_RAG_EMBEDDING_PROVIDERS = Object.freeze([
  'openai',
  'gemini',
  'vertex_gemini',
  'openrouter',
  'perplexity'
]);

const AST_RAG_DEFAULT_CHUNKING = Object.freeze({
  chunkSizeChars: 1200,
  chunkOverlapChars: 200,
  minChunkChars: 200
});

const AST_RAG_DEFAULT_RETRIEVAL = Object.freeze({
  topK: 8,
  minScore: 0.2,
  mode: 'vector',
  lexicalPrefilterTopN: 0,
  lexicalWeight: 0.35,
  vectorWeight: 0.65,
  partition: Object.freeze({
    enabled: false,
    maxShards: 0
  }),
  recovery: Object.freeze({
    enabled: false,
    topKBoost: 2,
    minScoreFloor: 0.05,
    maxAttempts: 2
  }),
  rerank: Object.freeze({
    enabled: false,
    topN: 20,
    provider: 'heuristic'
  }),
  queryTransform: Object.freeze({
    enabled: false,
    maxQueries: 4,
    rewrite: Object.freeze({
      enabled: false,
      policy: 'normalize',
      preserveCase: true
    }),
    decompose: Object.freeze({
      enabled: false,
      policy: 'clauses',
      maxSubqueries: 3,
      includeOriginal: true
    })
  })
});

const AST_RAG_DEFAULT_FALLBACK = Object.freeze({
  onRetrievalError: false,
  onRetrievalEmpty: false,
  intent: 'summary',
  factCount: 5
});

const AST_RAG_DEFAULT_OPTIONS = Object.freeze({
  maxFiles: 300,
  maxChunks: 2000,
  skipParseFailures: true,
  dryRun: false
});

const AST_RAG_DEFAULT_SHARDING = Object.freeze({
  enabled: false,
  maxChunksPerShard: 500
});

const AST_RAG_SCHEMA_VERSION = '1.0';
