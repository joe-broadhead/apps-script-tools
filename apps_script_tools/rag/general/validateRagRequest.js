function astRagNormalizeMimeTypes(mimeTypes) {
  if (typeof mimeTypes === 'undefined' || mimeTypes === null) {
    return AST_RAG_SUPPORTED_MIME_TYPES.slice();
  }

  if (!Array.isArray(mimeTypes) || mimeTypes.length === 0) {
    throw new AstRagValidationError('source.includeMimeTypes must be a non-empty array when provided');
  }

  const normalized = mimeTypes.map(value => astRagNormalizeString(value, null)).filter(Boolean);
  const invalid = normalized.filter(value => !AST_RAG_SUPPORTED_MIME_TYPES.includes(value));

  if (invalid.length > 0) {
    throw new AstRagValidationError('source.includeMimeTypes contains unsupported mime types', {
      unsupported: invalid
    });
  }

  return Array.from(new Set(normalized));
}

function astRagAssertEmbeddingProviderSupported(provider, fieldPath) {
  if (AST_RAG_EMBEDDING_PROVIDERS.includes(provider)) {
    return;
  }

  if (typeof astRagHasEmbeddingProvider === 'function' && astRagHasEmbeddingProvider(provider)) {
    return;
  }

  throw new AstRagEmbeddingCapabilityError(`${fieldPath} is not a registered embedding provider`, {
    provider
  });
}

function astRagNormalizeStringArray(values, field, allowEmpty = true) {
  if (typeof values === 'undefined' || values === null) {
    return [];
  }

  if (!Array.isArray(values)) {
    throw new AstRagValidationError(`${field} must be an array when provided`);
  }

  const normalized = values.map(value => astRagNormalizeString(value, null)).filter(Boolean);

  if (!allowEmpty && normalized.length === 0) {
    throw new AstRagValidationError(`${field} must contain at least one item`);
  }

  return Array.from(new Set(normalized));
}

function astRagNormalizeAccessControl(accessControl = {}, fieldPath = 'retrieval.access') {
  if (typeof accessControl === 'undefined' || accessControl === null) {
    accessControl = {};
  }

  if (!astRagIsPlainObject(accessControl)) {
    throw new AstRagValidationError(`${fieldPath} must be an object when provided`);
  }

  const normalized = {
    allowedFileIds: astRagNormalizeStringArray(accessControl.allowedFileIds, `${fieldPath}.allowedFileIds`, true),
    deniedFileIds: astRagNormalizeStringArray(accessControl.deniedFileIds, `${fieldPath}.deniedFileIds`, true),
    allowedMimeTypes: astRagNormalizeStringArray(accessControl.allowedMimeTypes, `${fieldPath}.allowedMimeTypes`, true),
    deniedMimeTypes: astRagNormalizeStringArray(accessControl.deniedMimeTypes, `${fieldPath}.deniedMimeTypes`, true)
  };

  const allowedFileSet = new Set(normalized.allowedFileIds);
  const allowedMimeSet = new Set(normalized.allowedMimeTypes);
  const overlappingFiles = normalized.deniedFileIds.filter(fileId => allowedFileSet.has(fileId));
  const overlappingMimes = normalized.deniedMimeTypes.filter(mimeType => allowedMimeSet.has(mimeType));

  if (overlappingFiles.length > 0 || overlappingMimes.length > 0) {
    throw new AstRagAccessError('retrieval.access contains overlapping allow/deny constraints', {
      overlappingFiles,
      overlappingMimeTypes: overlappingMimes
    });
  }

  return normalized;
}

function astRagNormalizeSearchOptions(options = {}) {
  if (!astRagIsPlainObject(options)) {
    throw new AstRagValidationError('search.options must be an object when provided');
  }

  return {
    enforceAccessControl: astRagNormalizeBoolean(options.enforceAccessControl, true)
  };
}

function astRagNormalizeCacheRequest(cache = {}) {
  if (typeof cache === 'undefined' || cache === null) {
    return {};
  }

  if (!astRagIsPlainObject(cache)) {
    throw new AstRagValidationError('cache must be an object when provided');
  }

  const normalized = {};

  if (typeof cache.enabled !== 'undefined') {
    normalized.enabled = astRagNormalizeBoolean(cache.enabled, false);
  }

  if (typeof cache.backend !== 'undefined') {
    normalized.backend = astRagNormalizeCacheBackend(cache.backend);
  }

  if (typeof cache.namespace !== 'undefined') {
    normalized.namespace = astRagNormalizeString(cache.namespace, null);
  }

  if (typeof cache.ttlSec !== 'undefined') {
    normalized.ttlSec = astRagNormalizePositiveInt(cache.ttlSec, 300, 1);
  }

  if (typeof cache.searchTtlSec !== 'undefined') {
    normalized.searchTtlSec = astRagNormalizePositiveInt(cache.searchTtlSec, 300, 1);
  }

  if (typeof cache.answerTtlSec !== 'undefined') {
    normalized.answerTtlSec = astRagNormalizePositiveInt(cache.answerTtlSec, 180, 1);
  }

  if (typeof cache.embeddingTtlSec !== 'undefined') {
    normalized.embeddingTtlSec = astRagNormalizePositiveInt(cache.embeddingTtlSec, 900, 1);
  }

  if (typeof cache.storageUri !== 'undefined') {
    normalized.storageUri = astRagNormalizeString(cache.storageUri, null);
  }

  if (typeof cache.lockTimeoutMs !== 'undefined') {
    normalized.lockTimeoutMs = astRagNormalizePositiveInt(cache.lockTimeoutMs, 5000, 1);
  }

  if (typeof cache.updateStatsOnGet !== 'undefined') {
    normalized.updateStatsOnGet = astRagNormalizeBoolean(cache.updateStatsOnGet, false);
  }

  return normalized;
}

function astRagNormalizeAnswerOptions(options = {}) {
  if (!astRagIsPlainObject(options)) {
    throw new AstRagValidationError('answer.options must be an object when provided');
  }

  return {
    requireCitations: typeof options.requireCitations === 'boolean'
      ? options.requireCitations
      : true,
    enforceAccessControl: astRagNormalizeBoolean(options.enforceAccessControl, true),
    insufficientEvidenceMessage: astRagNormalizeString(
      options.insufficientEvidenceMessage,
      'I do not have enough grounded context to answer that.'
    )
  };
}

function astRagNormalizeChunking(chunking = {}) {
  if (!astRagIsPlainObject(chunking)) {
    throw new AstRagValidationError('chunking must be an object when provided');
  }

  const chunkSizeChars = astRagNormalizePositiveInt(
    chunking.chunkSizeChars,
    AST_RAG_DEFAULT_CHUNKING.chunkSizeChars,
    200
  );
  const chunkOverlapChars = astRagNormalizePositiveInt(
    chunking.chunkOverlapChars,
    AST_RAG_DEFAULT_CHUNKING.chunkOverlapChars,
    0
  );
  const minChunkChars = astRagNormalizePositiveInt(
    chunking.minChunkChars,
    AST_RAG_DEFAULT_CHUNKING.minChunkChars,
    1
  );

  if (chunkOverlapChars >= chunkSizeChars) {
    throw new AstRagValidationError('chunking.chunkOverlapChars must be smaller than chunking.chunkSizeChars');
  }

  if (minChunkChars > chunkSizeChars) {
    throw new AstRagValidationError('chunking.minChunkChars must be <= chunking.chunkSizeChars');
  }

  return {
    chunkSizeChars,
    chunkOverlapChars,
    minChunkChars
  };
}

function astRagNormalizeBuildOptions(options = {}) {
  if (!astRagIsPlainObject(options)) {
    throw new AstRagValidationError('options must be an object when provided');
  }

  return {
    maxFiles: astRagNormalizePositiveInt(options.maxFiles, AST_RAG_DEFAULT_OPTIONS.maxFiles, 1),
    maxChunks: astRagNormalizePositiveInt(options.maxChunks, AST_RAG_DEFAULT_OPTIONS.maxChunks, 1),
    skipParseFailures: astRagNormalizeBoolean(options.skipParseFailures, AST_RAG_DEFAULT_OPTIONS.skipParseFailures)
  };
}

function astRagNormalizeSyncOptions(options = {}) {
  const normalized = astRagNormalizeBuildOptions(options);
  normalized.dryRun = astRagNormalizeBoolean(options.dryRun, AST_RAG_DEFAULT_OPTIONS.dryRun);
  return normalized;
}

function astRagNormalizeSourceRequest(source = {}) {
  if (!astRagIsPlainObject(source)) {
    throw new AstRagValidationError('source is required and must be an object');
  }

  const folderId = astRagNormalizeString(source.folderId, null);
  if (!folderId) {
    throw new AstRagValidationError('source.folderId is required');
  }

  return {
    folderId,
    includeSubfolders: astRagNormalizeBoolean(source.includeSubfolders, true),
    includeMimeTypes: astRagNormalizeMimeTypes(source.includeMimeTypes),
    excludeFileIds: astRagNormalizeStringArray(source.excludeFileIds, 'source.excludeFileIds', true)
  };
}

function astRagNormalizeIndexRequest(index = {}) {
  if (!astRagIsPlainObject(index)) {
    throw new AstRagValidationError('index must be an object when provided');
  }

  return {
    indexName: astRagNormalizeString(index.indexName, 'rag-index'),
    destinationFolderId: astRagNormalizeString(index.destinationFolderId, null),
    indexFileId: astRagNormalizeString(index.indexFileId, null)
  };
}

function astRagNormalizeEmbeddingRequest(embedding = {}) {
  if (!astRagIsPlainObject(embedding)) {
    throw new AstRagValidationError('embedding is required and must be an object');
  }

  const provider = astRagNormalizeString(embedding.provider, 'vertex_gemini');
  astRagAssertEmbeddingProviderSupported(provider, 'embedding.provider');

  return {
    provider,
    model: astRagNormalizeString(embedding.model, null),
    providerOptions: astRagIsPlainObject(embedding.providerOptions) ? astRagCloneObject(embedding.providerOptions) : {}
  };
}

function astRagNormalizeRetrievalMode(mode, fieldPath) {
  const normalized = astRagNormalizeString(mode, AST_RAG_DEFAULT_RETRIEVAL.mode);
  if (!['vector', 'hybrid'].includes(normalized)) {
    throw new AstRagValidationError(`${fieldPath} must be one of: vector, hybrid`);
  }
  return normalized;
}

function astRagNormalizeRetrievalWeight(value, fallback, fieldPath) {
  if (typeof value === 'undefined' || value === null) {
    return fallback;
  }

  if (typeof value !== 'number' || !isFinite(value) || value < 0) {
    throw new AstRagValidationError(`${fieldPath} must be a non-negative finite number when provided`);
  }

  return value;
}

function astRagNormalizeRetrievalRerank(rerank, defaults, fieldPath) {
  if (typeof rerank === 'undefined' || rerank === null) {
    return {
      enabled: defaults.enabled,
      topN: defaults.topN
    };
  }

  if (!astRagIsPlainObject(rerank)) {
    throw new AstRagValidationError(`${fieldPath} must be an object when provided`);
  }

  return {
    enabled: astRagNormalizeBoolean(rerank.enabled, defaults.enabled),
    topN: astRagNormalizePositiveInt(rerank.topN, defaults.topN, 1)
  };
}

function astRagNormalizeRetrievalConfig(retrieval, defaults, fieldPath) {
  if (!astRagIsPlainObject(retrieval)) {
    throw new AstRagValidationError(`${fieldPath} must be an object when provided`);
  }

  const topK = astRagNormalizePositiveInt(retrieval.topK, defaults.topK, 1);
  let minScore = defaults.minScore;

  if (typeof retrieval.minScore !== 'undefined') {
    if (typeof retrieval.minScore !== 'number' || !isFinite(retrieval.minScore)) {
      throw new AstRagValidationError(`${fieldPath}.minScore must be a finite number when provided`);
    }
    minScore = Math.max(-1, Math.min(1, retrieval.minScore));
  }

  const mode = astRagNormalizeRetrievalMode(retrieval.mode, `${fieldPath}.mode`);
  const vectorWeight = astRagNormalizeRetrievalWeight(
    retrieval.vectorWeight,
    defaults.vectorWeight,
    `${fieldPath}.vectorWeight`
  );
  const lexicalWeight = astRagNormalizeRetrievalWeight(
    retrieval.lexicalWeight,
    defaults.lexicalWeight,
    `${fieldPath}.lexicalWeight`
  );
  const rerank = astRagNormalizeRetrievalRerank(
    retrieval.rerank,
    defaults.rerank,
    `${fieldPath}.rerank`
  );

  if (mode === 'hybrid' && (vectorWeight + lexicalWeight) <= 0) {
    throw new AstRagValidationError(`${fieldPath} requires vectorWeight + lexicalWeight > 0 in hybrid mode`);
  }

  return {
    topK,
    minScore,
    mode,
    vectorWeight,
    lexicalWeight,
    rerank
  };
}

function astRagValidateBuildRequest(request = {}) {
  if (!astRagIsPlainObject(request)) {
    throw new AstRagValidationError('buildIndex request must be an object');
  }

  const retrievalDefaults = astRagResolveRetrievalDefaults();
  const retrieval = astRagIsPlainObject(request.retrievalDefaults) ? request.retrievalDefaults : {};

  let minScore = retrievalDefaults.minScore;
  if (typeof retrieval.minScore !== 'undefined') {
    if (typeof retrieval.minScore !== 'number' || !isFinite(retrieval.minScore)) {
      throw new AstRagValidationError('retrievalDefaults.minScore must be a finite number when provided');
    }
    minScore = Math.max(-1, Math.min(1, retrieval.minScore));
  }

  return {
    source: astRagNormalizeSourceRequest(request.source),
    index: astRagNormalizeIndexRequest(request.index),
    embedding: astRagNormalizeEmbeddingRequest(request.embedding),
    chunking: astRagNormalizeChunking(request.chunking || {}),
    options: astRagNormalizeBuildOptions(request.options || {}),
    retrievalDefaults: {
      topK: astRagNormalizePositiveInt(retrieval.topK, retrievalDefaults.topK, 1),
      minScore
    },
    auth: astRagIsPlainObject(request.auth) ? astRagCloneObject(request.auth) : {}
  };
}

function astRagValidateSyncRequest(request = {}) {
  const normalized = astRagValidateBuildRequest(request);
  if (!normalized.index.indexFileId) {
    throw new AstRagValidationError('syncIndex requires index.indexFileId');
  }
  normalized.options = astRagNormalizeSyncOptions(request.options || {});
  return normalized;
}

function astRagValidateSearchRequest(request = {}) {
  if (!astRagIsPlainObject(request)) {
    throw new AstRagValidationError('search request must be an object');
  }

  const indexFileId = astRagNormalizeString(request.indexFileId, null);
  if (!indexFileId) {
    throw new AstRagValidationError('search request requires indexFileId');
  }

  const query = astRagNormalizeString(request.query, null);
  if (!query) {
    throw new AstRagValidationError('search request requires query');
  }

  const defaults = astRagResolveRetrievalDefaults();
  const retrieval = astRagIsPlainObject(request.retrieval) ? astRagCloneObject(request.retrieval) : {};

  if (typeof retrieval.topK === 'undefined') {
    retrieval.topK = request.topK;
  }
  if (typeof retrieval.minScore === 'undefined') {
    retrieval.minScore = request.minScore;
  }
  if (typeof retrieval.mode === 'undefined') {
    retrieval.mode = request.mode;
  }
  if (typeof retrieval.vectorWeight === 'undefined') {
    retrieval.vectorWeight = request.vectorWeight;
  }
  if (typeof retrieval.lexicalWeight === 'undefined') {
    retrieval.lexicalWeight = request.lexicalWeight;
  }
  if (typeof retrieval.rerank === 'undefined') {
    retrieval.rerank = request.rerank;
  }
  if (typeof retrieval.access === 'undefined') {
    retrieval.access = request.access;
  }

  const normalizedRetrieval = astRagNormalizeRetrievalConfig(retrieval, defaults, 'search.retrieval');
  const normalizedOptions = astRagNormalizeSearchOptions(
    astRagIsPlainObject(request.options) ? request.options : {}
  );
  const filtersInput = astRagIsPlainObject(retrieval.filters)
    ? retrieval.filters
    : (astRagIsPlainObject(request.filters) ? request.filters : {});
  const normalizedFilters = {
    fileIds: astRagNormalizeStringArray(filtersInput.fileIds, 'search.retrieval.filters.fileIds', true),
    mimeTypes: astRagNormalizeStringArray(filtersInput.mimeTypes, 'search.retrieval.filters.mimeTypes', true)
  };
  const normalizedAccess = astRagNormalizeAccessControl(retrieval.access, 'search.retrieval.access');

  return {
    indexFileId,
    query,
    topK: normalizedRetrieval.topK,
    minScore: normalizedRetrieval.minScore,
    retrieval: Object.assign({}, normalizedRetrieval, {
      filters: normalizedFilters,
      access: normalizedAccess,
      enforceAccessControl: normalizedOptions.enforceAccessControl
    }),
    filters: normalizedFilters,
    options: normalizedOptions,
    auth: astRagIsPlainObject(request.auth) ? astRagCloneObject(request.auth) : {},
    embedding: astRagNormalizeEmbeddingRequest(request.embedding || {}),
    cache: astRagNormalizeCacheRequest(request.cache)
  };
}

function astRagValidateAnswerRequest(request = {}) {
  if (!astRagIsPlainObject(request)) {
    throw new AstRagValidationError('answer request must be an object');
  }

  const indexFileId = astRagNormalizeString(request.indexFileId, null);
  if (!indexFileId) {
    throw new AstRagValidationError('answer request requires indexFileId');
  }

  const question = astRagNormalizeString(request.question, null);
  if (!question) {
    throw new AstRagValidationError('answer request requires question');
  }

  const history = Array.isArray(request.history) ? request.history.slice() : [];
  const retrieval = astRagIsPlainObject(request.retrieval) ? astRagCloneObject(request.retrieval) : {};
  if (typeof retrieval.access === 'undefined') {
    retrieval.access = request.access;
  }
  const defaults = astRagResolveRetrievalDefaults();
  const normalizedRetrieval = astRagNormalizeRetrievalConfig(retrieval, defaults, 'answer.retrieval');
  const normalizedAccess = astRagNormalizeAccessControl(retrieval.access, 'answer.retrieval.access');
  const normalizedOptions = astRagNormalizeAnswerOptions(
    astRagIsPlainObject(request.options) ? request.options : {}
  );

  const generation = astRagIsPlainObject(request.generation) ? request.generation : {};
  const generationProvider = astRagNormalizeString(generation.provider, 'vertex_gemini');

  if (!AST_RAG_EMBEDDING_PROVIDERS.includes(generationProvider)) {
    throw new AstRagValidationError('answer.generation.provider must be one of: openai, gemini, vertex_gemini, openrouter, perplexity');
  }

  return {
    indexFileId,
    question,
    history,
    retrieval: Object.assign({}, normalizedRetrieval, {
      filters: {
        fileIds: astRagNormalizeStringArray((retrieval.filters || {}).fileIds, 'answer.retrieval.filters.fileIds', true),
        mimeTypes: astRagNormalizeStringArray((retrieval.filters || {}).mimeTypes, 'answer.retrieval.filters.mimeTypes', true)
      },
      access: normalizedAccess,
      enforceAccessControl: normalizedOptions.enforceAccessControl
    }),
    generation: {
      provider: generationProvider,
      model: astRagNormalizeString(generation.model, null),
      auth: astRagIsPlainObject(generation.auth) ? astRagCloneObject(generation.auth) : {},
      providerOptions: astRagIsPlainObject(generation.providerOptions) ? astRagCloneObject(generation.providerOptions) : {},
      options: astRagIsPlainObject(generation.options) ? astRagCloneObject(generation.options) : {}
    },
    options: normalizedOptions,
    auth: astRagIsPlainObject(request.auth) ? astRagCloneObject(request.auth) : {},
    cache: astRagNormalizeCacheRequest(request.cache)
  };
}

function astRagValidateInspectRequest(request = {}) {
  if (!astRagIsPlainObject(request)) {
    throw new AstRagValidationError('inspectIndex request must be an object');
  }

  const indexFileId = astRagNormalizeString(request.indexFileId, null);
  if (!indexFileId) {
    throw new AstRagValidationError('inspectIndex request requires indexFileId');
  }

  return { indexFileId };
}
