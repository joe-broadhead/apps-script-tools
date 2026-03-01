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

function astRagNormalizeStorageUri(value, fieldPath) {
  const normalized = astRagNormalizeString(value, null);
  if (!normalized) {
    return null;
  }

  const lower = normalized.toLowerCase();
  if (
    lower.indexOf('gcs://') !== 0
    && lower.indexOf('s3://') !== 0
    && lower.indexOf('dbfs:/') !== 0
  ) {
    throw new AstRagValidationError(`${fieldPath} must start with one of: gcs://, s3://, dbfs:/`, {
      value: normalized
    });
  }

  return normalized;
}

function astRagNormalizeStorageUris(source = {}) {
  const single = astRagNormalizeStorageUri(source.uri, 'source.uri');
  const list = astRagNormalizeStringArray(source.uris, 'source.uris', true)
    .map((uri, idx) => astRagNormalizeStorageUri(uri, `source.uris[${idx}]`))
    .filter(Boolean);

  const combined = [];
  if (single) {
    combined.push(single);
  }
  for (let idx = 0; idx < list.length; idx += 1) {
    combined.push(list[idx]);
  }

  return Array.from(new Set(combined));
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

  const diagnosticsDefault = typeof astRagResolveDiagnosticsEnabledDefault === 'function'
    ? astRagResolveDiagnosticsEnabledDefault()
    : false;

  return {
    enforceAccessControl: astRagNormalizeBoolean(options.enforceAccessControl, true),
    diagnostics: astRagNormalizeBoolean(options.diagnostics, diagnosticsDefault),
    maxRetrievalMs: astRagNormalizePositiveInt(options.maxRetrievalMs, null, 1)
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

  if (typeof cache.lockScope !== 'undefined') {
    const lockScope = astRagNormalizeString(cache.lockScope, null);
    if (['script', 'user', 'none'].indexOf(lockScope) === -1) {
      throw new AstRagValidationError('cache.lockScope must be one of: script, user, none');
    }
    normalized.lockScope = lockScope;
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

  const diagnosticsDefault = typeof astRagResolveDiagnosticsEnabledDefault === 'function'
    ? astRagResolveDiagnosticsEnabledDefault()
    : false;

  const onRetrievalTimeout = astRagNormalizeString(options.onRetrievalTimeout, 'error');
  if (!['error', 'insufficient_context', 'fallback'].includes(onRetrievalTimeout)) {
    throw new AstRagValidationError('answer.options.onRetrievalTimeout must be one of: error, insufficient_context, fallback');
  }

  return {
    requireCitations: typeof options.requireCitations === 'boolean'
      ? options.requireCitations
      : true,
    enforceAccessControl: astRagNormalizeBoolean(options.enforceAccessControl, true),
    diagnostics: astRagNormalizeBoolean(options.diagnostics, diagnosticsDefault),
    maxRetrievalMs: astRagNormalizePositiveInt(options.maxRetrievalMs, null, 1),
    onRetrievalTimeout,
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
  const storageUris = astRagNormalizeStorageUris(source);
  if (!folderId && storageUris.length === 0) {
    throw new AstRagValidationError('source requires source.folderId and/or source.uri/source.uris');
  }

  return {
    folderId,
    includeSubfolders: astRagNormalizeBoolean(source.includeSubfolders, true),
    includeMimeTypes: astRagNormalizeMimeTypes(source.includeMimeTypes),
    excludeFileIds: astRagNormalizeStringArray(source.excludeFileIds, 'source.excludeFileIds', true),
    uris: storageUris,
    providerOptions: astRagIsPlainObject(source.providerOptions) ? astRagCloneObject(source.providerOptions) : {}
  };
}

function astRagNormalizeIndexRequest(index = {}) {
  if (!astRagIsPlainObject(index)) {
    throw new AstRagValidationError('index must be an object when provided');
  }

  const shardingProvided = Object.prototype.hasOwnProperty.call(index, 'sharding')
    && typeof index.sharding !== 'undefined';

  return {
    indexName: astRagNormalizeString(index.indexName, 'rag-index'),
    destinationFolderId: astRagNormalizeString(index.destinationFolderId, null),
    indexFileId: astRagNormalizeString(index.indexFileId, null),
    sharding: astRagNormalizeShardingConfig(index.sharding),
    shardingProvided
  };
}

function astRagNormalizeShardingConfig(sharding = {}) {
  if (typeof sharding === 'undefined' || sharding === null) {
    sharding = {};
  }

  if (!astRagIsPlainObject(sharding)) {
    throw new AstRagValidationError('index.sharding must be an object when provided');
  }

  return {
    enabled: astRagNormalizeBoolean(sharding.enabled, AST_RAG_DEFAULT_SHARDING.enabled),
    maxChunksPerShard: astRagNormalizePositiveInt(
      sharding.maxChunksPerShard,
      AST_RAG_DEFAULT_SHARDING.maxChunksPerShard,
      1
    )
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
  if (!['vector', 'hybrid', 'lexical'].includes(normalized)) {
    throw new AstRagValidationError(`${fieldPath} must be one of: vector, hybrid, lexical`);
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

function astRagNormalizeFiniteNumber(value, fallback, fieldPath, bounds = {}) {
  if (typeof value === 'undefined' || value === null) {
    return fallback;
  }

  if (typeof value !== 'number' || !isFinite(value)) {
    throw new AstRagValidationError(`${fieldPath} must be a finite number when provided`);
  }

  const min = typeof bounds.min === 'number' && isFinite(bounds.min) ? bounds.min : null;
  const max = typeof bounds.max === 'number' && isFinite(bounds.max) ? bounds.max : null;
  let normalized = value;

  if (min != null) {
    normalized = Math.max(min, normalized);
  }
  if (max != null) {
    normalized = Math.min(max, normalized);
  }

  return normalized;
}

function astRagNormalizeOptionalNonNegativeInt(value, fallback, fieldPath, minValue = 0) {
  if (typeof value === 'undefined' || value === null) {
    return fallback;
  }

  const asNumber = typeof value === 'number'
    ? value
    : (typeof value === 'string' && value.trim().length > 0 ? Number(value) : NaN);
  if (!isFinite(asNumber)) {
    throw new AstRagValidationError(`${fieldPath} must be a non-negative integer when provided`);
  }

  const rounded = Math.floor(asNumber);
  if (rounded < minValue) {
    throw new AstRagValidationError(`${fieldPath} must be >= ${minValue} when provided`);
  }

  return rounded;
}

function astRagNormalizeRecoveryConfig(recovery = {}, defaults, retrievalDefaults, fieldPath) {
  if (typeof recovery === 'undefined' || recovery === null) {
    recovery = {};
  }

  if (!astRagIsPlainObject(recovery)) {
    throw new AstRagValidationError(`${fieldPath} must be an object when provided`);
  }

  const minScoreFloor = astRagNormalizeFiniteNumber(
    recovery.minScoreFloor,
    defaults.minScoreFloor,
    `${fieldPath}.minScoreFloor`,
    { min: -1, max: retrievalDefaults.minScore }
  );

  return {
    enabled: astRagNormalizeBoolean(recovery.enabled, defaults.enabled),
    topKBoost: astRagNormalizeFiniteNumber(
      recovery.topKBoost,
      defaults.topKBoost,
      `${fieldPath}.topKBoost`,
      { min: 1, max: 10 }
    ),
    minScoreFloor,
    maxAttempts: astRagNormalizePositiveInt(
      recovery.maxAttempts,
      defaults.maxAttempts,
      1
    )
  };
}

function astRagNormalizeFallbackPolicy(fallback = {}, fieldPath = 'answer.fallback') {
  if (typeof fallback === 'undefined' || fallback === null) {
    fallback = {};
  }

  if (!astRagIsPlainObject(fallback)) {
    throw new AstRagValidationError(`${fieldPath} must be an object when provided`);
  }

  const intent = astRagNormalizeString(fallback.intent, AST_RAG_DEFAULT_FALLBACK.intent);
  if (!['summary', 'facts'].includes(intent)) {
    throw new AstRagValidationError(`${fieldPath}.intent must be one of: summary, facts`);
  }

  return {
    onRetrievalError: astRagNormalizeBoolean(
      fallback.onRetrievalError,
      AST_RAG_DEFAULT_FALLBACK.onRetrievalError
    ),
    onRetrievalEmpty: astRagNormalizeBoolean(
      fallback.onRetrievalEmpty,
      AST_RAG_DEFAULT_FALLBACK.onRetrievalEmpty
    ),
    intent,
    factCount: astRagNormalizePositiveInt(
      fallback.factCount,
      AST_RAG_DEFAULT_FALLBACK.factCount,
      1
    )
  };
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

function astRagNormalizeRetrievalPartition(partition, defaults, fieldPath) {
  if (typeof partition === 'undefined' || partition === null) {
    return {
      enabled: astRagNormalizeBoolean(defaults.enabled, AST_RAG_DEFAULT_RETRIEVAL.partition.enabled),
      maxShards: astRagNormalizeOptionalNonNegativeInt(
        defaults.maxShards,
        AST_RAG_DEFAULT_RETRIEVAL.partition.maxShards,
        `${fieldPath}.maxShards`,
        0
      )
    };
  }

  if (!astRagIsPlainObject(partition)) {
    throw new AstRagValidationError(`${fieldPath} must be an object when provided`);
  }

  return {
    enabled: astRagNormalizeBoolean(partition.enabled, astRagNormalizeBoolean(defaults.enabled, false)),
    maxShards: astRagNormalizeOptionalNonNegativeInt(
      partition.maxShards,
      astRagNormalizeOptionalNonNegativeInt(
        defaults.maxShards,
        AST_RAG_DEFAULT_RETRIEVAL.partition.maxShards,
        `${fieldPath}.maxShards`,
        0
      ),
      `${fieldPath}.maxShards`,
      0
    )
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
  const recovery = astRagNormalizeRecoveryConfig(
    retrieval.recovery,
    defaults.recovery || AST_RAG_DEFAULT_RETRIEVAL.recovery,
    { minScore },
    `${fieldPath}.recovery`
  );
  const partition = astRagNormalizeRetrievalPartition(
    retrieval.partition,
    defaults.partition || AST_RAG_DEFAULT_RETRIEVAL.partition,
    `${fieldPath}.partition`
  );

  if (mode === 'hybrid' && (vectorWeight + lexicalWeight) <= 0) {
    throw new AstRagValidationError(`${fieldPath} requires vectorWeight + lexicalWeight > 0 in hybrid mode`);
  }

  return {
    topK,
    minScore,
    mode,
    lexicalPrefilterTopN: astRagNormalizeOptionalNonNegativeInt(
      retrieval.lexicalPrefilterTopN,
      defaults.lexicalPrefilterTopN,
      `${fieldPath}.lexicalPrefilterTopN`,
      0
    ),
    vectorWeight,
    lexicalWeight,
    rerank,
    partition,
    recovery
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

function astRagValidatePreviewRequest(request = {}) {
  const searchRequest = astRagValidateSearchRequest(request);
  const previewInput = astRagIsPlainObject(request.preview) ? astRagCloneObject(request.preview) : {};

  if (typeof previewInput.snippetMaxChars === 'undefined') {
    previewInput.snippetMaxChars = request.snippetMaxChars;
  }
  if (typeof previewInput.includeText === 'undefined') {
    previewInput.includeText = request.includeText;
  }
  if (typeof previewInput.includePayload === 'undefined') {
    previewInput.includePayload = request.includePayload;
  }
  if (typeof previewInput.cachePayload === 'undefined') {
    previewInput.cachePayload = request.cachePayload;
  }
  if (typeof previewInput.payloadTtlSec === 'undefined') {
    previewInput.payloadTtlSec = request.payloadTtlSec;
  }
  if (typeof previewInput.payloadCache === 'undefined') {
    previewInput.payloadCache = request.payloadCache;
  }

  return {
    searchRequest,
    preview: {
      snippetMaxChars: astRagNormalizePositiveInt(previewInput.snippetMaxChars, 280, 40),
      includeText: astRagNormalizeBoolean(previewInput.includeText, false),
      includePayload: astRagNormalizeBoolean(previewInput.includePayload, true),
      cachePayload: astRagNormalizeBoolean(previewInput.cachePayload, false),
      payloadTtlSec: astRagNormalizePositiveInt(previewInput.payloadTtlSec, 600, 1),
      payloadCache: astRagNormalizeCacheRequest(
        astRagIsPlainObject(previewInput.payloadCache) ? previewInput.payloadCache : {}
      )
    }
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
  if (typeof retrieval.recovery === 'undefined' && astRagIsPlainObject(request.recovery)) {
    retrieval.recovery = astRagCloneObject(request.recovery);
  }
  if (typeof retrieval.access === 'undefined') {
    retrieval.access = request.access;
  }
  const defaults = astRagResolveRetrievalDefaults();
  const normalizedRetrieval = astRagNormalizeRetrievalConfig(retrieval, defaults, 'answer.retrieval');
  const normalizedAccess = astRagNormalizeAccessControl(retrieval.access, 'answer.retrieval.access');
  const normalizedOptions = astRagNormalizeAnswerOptions(
    astRagIsPlainObject(request.options) ? request.options : {}
  );
  const retrievalPayload = astRagIsPlainObject(request.retrievalPayload)
    ? astRagCloneObject(request.retrievalPayload)
    : null;
  const retrievalPayloadKey = astRagNormalizeString(request.retrievalPayloadKey, null);
  const retrievalPayloadCache = astRagNormalizeCacheRequest(
    astRagIsPlainObject(request.retrievalPayloadCache)
      ? request.retrievalPayloadCache
      : (astRagIsPlainObject(request.payloadCache) ? request.payloadCache : {})
  );

  const generation = astRagIsPlainObject(request.generation) ? request.generation : {};
  const generationProvider = astRagNormalizeString(generation.provider, 'vertex_gemini');
  const generationStyle = astRagNormalizeString(generation.style, 'chat');
  const fallback = astRagNormalizeFallbackPolicy(
    astRagIsPlainObject(request.fallback) ? request.fallback : {}
  );

  if (!AST_RAG_EMBEDDING_PROVIDERS.includes(generationProvider)) {
    throw new AstRagValidationError('answer.generation.provider must be one of: openai, gemini, vertex_gemini, openrouter, perplexity');
  }

  if (!['chat', 'concise', 'detailed', 'bullets'].includes(generationStyle)) {
    throw new AstRagValidationError('answer.generation.style must be one of: chat, concise, detailed, bullets');
  }

  const generationForbiddenPhrases = astRagNormalizeStringArray(
    generation.forbiddenPhrases,
    'answer.generation.forbiddenPhrases',
    true
  );

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
      options: astRagIsPlainObject(generation.options) ? astRagCloneObject(generation.options) : {},
      instructions: astRagNormalizeString(generation.instructions, null),
      style: generationStyle,
      forbiddenPhrases: generationForbiddenPhrases,
      maxContextChars: astRagNormalizeOptionalNonNegativeInt(
        generation.maxContextChars,
        null,
        'answer.generation.maxContextChars',
        200
      ),
      maxContextTokensApprox: astRagNormalizeOptionalNonNegativeInt(
        generation.maxContextTokensApprox,
        null,
        'answer.generation.maxContextTokensApprox',
        50
      )
    },
    options: normalizedOptions,
    auth: astRagIsPlainObject(request.auth) ? astRagCloneObject(request.auth) : {},
    cache: astRagNormalizeCacheRequest(request.cache),
    fallback,
    retrievalPayload,
    retrievalPayloadKey,
    retrievalPayloadCache
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
