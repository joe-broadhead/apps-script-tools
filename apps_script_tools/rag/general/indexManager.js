function astRagNormalizeIndexManagerDefaults(config = {}) {
  if (!astRagIsPlainObject(config)) {
    throw new AstRagValidationError('IndexManager.create config must be an object');
  }

  const defaults = astRagIsPlainObject(config.defaults) ? astRagCloneObject(config.defaults) : {};
  const sourceDefaults = astRagIsPlainObject(defaults.source) ? astRagCloneObject(defaults.source) : {};
  const embeddingDefaults = astRagIsPlainObject(defaults.embedding) ? astRagCloneObject(defaults.embedding) : {};
  const indexDefaults = astRagIsPlainObject(defaults.index) ? astRagCloneObject(defaults.index) : {};

  return {
    indexName: astRagNormalizeString(indexDefaults.indexName || defaults.indexName, 'rag-index'),
    indexFileId: astRagNormalizeString(indexDefaults.indexFileId || defaults.indexFileId, null),
    destinationFolderId: astRagNormalizeString(
      indexDefaults.destinationFolderId || defaults.destinationFolderId,
      null
    ),
    source: sourceDefaults,
    embedding: embeddingDefaults,
    chunking: astRagIsPlainObject(defaults.chunking) ? astRagCloneObject(defaults.chunking) : {},
    retrievalDefaults: astRagIsPlainObject(defaults.retrievalDefaults)
      ? astRagCloneObject(defaults.retrievalDefaults)
      : {},
    options: astRagIsPlainObject(defaults.options) ? astRagCloneObject(defaults.options) : {},
    auth: astRagIsPlainObject(defaults.auth) ? astRagCloneObject(defaults.auth) : {},
    supportedMimeTypes: astRagNormalizeMimeTypes(defaults.supportedMimeTypes),
    allowAutoBuild: astRagNormalizeBoolean(defaults.allowAutoBuild, true),
    syncOnEnsure: astRagNormalizeBoolean(defaults.syncOnEnsure, false),
    fallbackToSupportedMimeTypes: astRagNormalizeBoolean(defaults.fallbackToSupportedMimeTypes, false),
    inspectOnEnsure: astRagNormalizeBoolean(defaults.inspectOnEnsure, true),
    fastStateInspect: astRagNormalizeBoolean(defaults.fastStateInspect, false)
  };
}

function astRagMergeIndexManagerEmbedding(defaults, request = {}) {
  const runtime = astRagIsPlainObject(request.runtime) ? request.runtime : {};
  const embedding = Object.assign(
    {},
    astRagIsPlainObject(defaults.embedding) ? defaults.embedding : {},
    astRagIsPlainObject(request.embedding) ? request.embedding : {}
  );

  if (typeof embedding.provider === 'undefined') {
    embedding.provider = runtime.embeddingProvider;
  }
  if (typeof embedding.model === 'undefined') {
    embedding.model = runtime.embeddingModel;
  }

  const providerOptions = Object.assign(
    {},
    astRagIsPlainObject(embedding.providerOptions) ? embedding.providerOptions : {},
    astRagIsPlainObject(runtime.embeddingProviderOptions) ? runtime.embeddingProviderOptions : {}
  );

  if (Object.keys(providerOptions).length > 0) {
    embedding.providerOptions = providerOptions;
  }

  return embedding;
}

function astRagMergeIndexManagerAuth(defaults, request = {}) {
  const runtime = astRagIsPlainObject(request.runtime) ? request.runtime : {};
  return Object.assign(
    {},
    astRagIsPlainObject(defaults.auth) ? defaults.auth : {},
    astRagIsPlainObject(request.auth) ? request.auth : {},
    astRagIsPlainObject(runtime.auth) ? runtime.auth : {}
  );
}

function astRagNormalizeIndexManagerSource(
  sourceRequest,
  managerDefaults,
  fallbackToSupportedMimeTypes
) {
  const source = astRagIsPlainObject(sourceRequest) ? astRagCloneObject(sourceRequest) : {};
  const supported = Array.isArray(managerDefaults.supportedMimeTypes)
    && managerDefaults.supportedMimeTypes.length > 0
    ? managerDefaults.supportedMimeTypes.slice()
    : AST_RAG_SUPPORTED_MIME_TYPES.slice();

  const requestedMimeTypes = Array.isArray(source.includeMimeTypes)
    ? source.includeMimeTypes
      .map(value => astRagNormalizeString(value, null))
      .filter(Boolean)
    : supported.slice();

  const unsupportedMimeTypes = requestedMimeTypes.filter(
    mimeType => AST_RAG_SUPPORTED_MIME_TYPES.indexOf(mimeType) === -1
  );
  const supportedRequested = requestedMimeTypes.filter(
    mimeType => AST_RAG_SUPPORTED_MIME_TYPES.indexOf(mimeType) !== -1
  );

  if (unsupportedMimeTypes.length > 0 && !fallbackToSupportedMimeTypes) {
    throw new AstRagValidationError('source.includeMimeTypes contains unsupported mime types', {
      unsupported: unsupportedMimeTypes
    });
  }

  let includeMimeTypes = supportedRequested.length > 0 ? supportedRequested.slice() : supported.slice();
  if (includeMimeTypes.length === 0) {
    includeMimeTypes = AST_RAG_SUPPORTED_MIME_TYPES.slice();
  }

  source.includeMimeTypes = Array.from(new Set(includeMimeTypes));

  return {
    source,
    diagnostics: {
      fallbackToSupportedMimeTypes: fallbackToSupportedMimeTypes && unsupportedMimeTypes.length > 0,
      unsupportedMimeTypes,
      includeMimeTypes: source.includeMimeTypes.slice()
    }
  };
}

function astRagBuildIndexManagerRequest(manager, request = {}, options = {}) {
  if (!astRagIsPlainObject(request)) {
    throw new AstRagValidationError('IndexManager request must be an object');
  }
  if (!astRagIsPlainObject(options)) {
    throw new AstRagValidationError('IndexManager request options must be an object');
  }

  const defaults = manager.defaults;
  const requestOptions = astRagIsPlainObject(request.options) ? request.options : {};
  const fallbackToSupportedMimeTypes = astRagNormalizeBoolean(
    requestOptions.fallbackToSupportedMimeTypes,
    defaults.fallbackToSupportedMimeTypes
  );

  const sourceInput = Object.assign(
    {},
    astRagIsPlainObject(defaults.source) ? defaults.source : {},
    astRagIsPlainObject(request.source) ? request.source : {}
  );
  const source = astRagNormalizeIndexManagerSource(
    sourceInput,
    defaults,
    fallbackToSupportedMimeTypes
  );

  const indexRequest = Object.assign(
    {},
    astRagIsPlainObject(defaults.index) ? defaults.index : {},
    {
      indexName: defaults.indexName,
      indexFileId: defaults.indexFileId,
      destinationFolderId: defaults.destinationFolderId
    },
    astRagIsPlainObject(request.index) ? request.index : {}
  );

  if (typeof request.indexFileId !== 'undefined') {
    indexRequest.indexFileId = request.indexFileId;
  }

  if (typeof request.destinationFolderId !== 'undefined') {
    indexRequest.destinationFolderId = request.destinationFolderId;
  }

  if (typeof request.indexName !== 'undefined') {
    indexRequest.indexName = request.indexName;
  }

  const allowAutoBuild = astRagNormalizeBoolean(requestOptions.allowAutoBuild, defaults.allowAutoBuild);
  const syncOnEnsure = astRagNormalizeBoolean(requestOptions.syncOnEnsure, defaults.syncOnEnsure);
  const inspectOnEnsure = astRagNormalizeBoolean(requestOptions.inspectOnEnsure, defaults.inspectOnEnsure);

  return {
    source: source.source,
    index: indexRequest,
    embedding: astRagMergeIndexManagerEmbedding(defaults, request),
    chunking: Object.assign(
      {},
      astRagIsPlainObject(defaults.chunking) ? defaults.chunking : {},
      astRagIsPlainObject(request.chunking) ? request.chunking : {}
    ),
    retrievalDefaults: Object.assign(
      {},
      astRagIsPlainObject(defaults.retrievalDefaults) ? defaults.retrievalDefaults : {},
      astRagIsPlainObject(request.retrievalDefaults) ? request.retrievalDefaults : {}
    ),
    options: Object.assign(
      {},
      astRagIsPlainObject(defaults.options) ? defaults.options : {},
      requestOptions
    ),
    auth: astRagMergeIndexManagerAuth(defaults, request),
    diagnostics: source.diagnostics,
    control: {
      allowAutoBuild,
      syncOnEnsure,
      inspectOnEnsure
    }
  };
}

function astRagResolveIndexManagerTargetIndexFileId(manager, requestState = {}) {
  const requestIndex = astRagIsPlainObject(requestState.index) ? requestState.index : {};
  return astRagNormalizeString(
    requestIndex.indexFileId,
    astRagNormalizeString(manager.state.lastIndexFileId, manager.defaults.indexFileId)
  );
}

function astRagCaptureIndexManagerState(manager, payload = {}) {
  if (!astRagIsPlainObject(payload)) {
    return;
  }

  const nextIndexFileId = astRagNormalizeString(payload.indexFileId, manager.state.lastIndexFileId);
  manager.state.lastIndexFileId = nextIndexFileId;
  manager.state.lastAction = astRagNormalizeString(payload.action, manager.state.lastAction);
  manager.state.lastResult = astRagCloneObject(payload);
}

function astRagBuildIndexManagerReuseResult(inspected, diagnostics = {}) {
  return {
    action: 'reuse',
    indexFileId: inspected.indexFileId,
    indexName: inspected.indexName,
    sourceCount: inspected.sourceCount,
    chunkCount: inspected.chunkCount,
    createdAt: inspected.createdAt,
    updatedAt: inspected.updatedAt,
    lastSyncAt: inspected.lastSyncAt || null,
    diagnostics
  };
}

function astRagBuildIndexManagerFastStateFromMetadata(indexFileId, manager) {
  const fallback = {
    indexFileId,
    indexName: manager.defaults.indexName,
    status: 'missing',
    ready: false,
    sourceCount: null,
    chunkCount: null,
    createdAt: null,
    updatedAt: null
  };

  if (typeof DriveApp === 'undefined' || !DriveApp || typeof DriveApp.getFileById !== 'function') {
    return Object.assign({}, fallback, {
      status: 'unavailable',
      reason: 'DriveApp.getFileById is not available'
    });
  }

  try {
    const file = DriveApp.getFileById(indexFileId);
    const updatedAt = file && typeof file.getLastUpdated === 'function' && file.getLastUpdated()
      ? file.getLastUpdated().toISOString()
      : null;

    return {
      indexFileId,
      indexName: file && typeof file.getName === 'function'
        ? file.getName()
        : manager.defaults.indexName,
      status: 'ready',
      ready: true,
      sourceCount: null,
      chunkCount: null,
      createdAt: null,
      updatedAt,
      lastSyncAt: null
    };
  } catch (error) {
    return Object.assign({}, fallback, {
      reason: error && error.message ? error.message : 'Index metadata lookup failed'
    });
  }
}

function astRagIndexManagerEnsure(manager, request = {}) {
  const prepared = astRagBuildIndexManagerRequest(manager, request, { mode: 'ensure' });
  let indexFileId = astRagResolveIndexManagerTargetIndexFileId(manager, prepared);
  let inspected = null;
  const diagnostics = astRagCloneObject(prepared.diagnostics);

  if (indexFileId && prepared.control.inspectOnEnsure) {
    try {
      inspected = astRagInspectIndex(indexFileId);
    } catch (error) {
      diagnostics.indexLookupError = error && error.message ? error.message : 'Index inspection failed';
      inspected = null;
      indexFileId = null;
    }
  }

  if (indexFileId && prepared.control.syncOnEnsure) {
    prepared.index.indexFileId = indexFileId;
    const syncResult = astRagSyncIndexCore(prepared);
    const result = Object.assign({ action: 'sync', diagnostics }, syncResult);
    astRagCaptureIndexManagerState(manager, result);
    return result;
  }

  if (indexFileId) {
    const result = inspected
      ? astRagBuildIndexManagerReuseResult(inspected, diagnostics)
      : {
        action: 'reuse',
        indexFileId,
        indexName: prepared.index.indexName,
        sourceCount: null,
        chunkCount: null,
        createdAt: null,
        updatedAt: null,
        lastSyncAt: null,
        diagnostics
      };
    astRagCaptureIndexManagerState(manager, result);
    return result;
  }

  if (!prepared.control.allowAutoBuild) {
    throw new AstRagIndexError('Index is not available and allowAutoBuild=false', {
      indexName: prepared.index.indexName || manager.defaults.indexName,
      diagnostics
    });
  }

  delete prepared.index.indexFileId;
  const buildResult = astRagBuildIndexCore(prepared);
  const result = Object.assign({ action: 'build', diagnostics }, buildResult);
  astRagCaptureIndexManagerState(manager, result);
  return result;
}

function astRagIndexManagerSync(manager, request = {}) {
  const prepared = astRagBuildIndexManagerRequest(manager, request, { mode: 'sync' });
  const indexFileId = astRagResolveIndexManagerTargetIndexFileId(manager, prepared);

  if (!indexFileId) {
    throw new AstRagValidationError('IndexManager.sync requires indexFileId');
  }

  prepared.index.indexFileId = indexFileId;
  const syncResult = astRagSyncIndexCore(prepared);
  const result = Object.assign({
    action: 'sync',
    diagnostics: prepared.diagnostics
  }, syncResult);
  astRagCaptureIndexManagerState(manager, result);
  return result;
}

function astRagIndexManagerFastState(manager, request = {}) {
  if (!astRagIsPlainObject(request)) {
    throw new AstRagValidationError('IndexManager.fastState request must be an object');
  }

  const inspect = astRagNormalizeBoolean(request.inspect, manager.defaults.fastStateInspect);
  const indexFileId = astRagNormalizeString(
    request.indexFileId,
    astRagNormalizeString(manager.state.lastIndexFileId, manager.defaults.indexFileId)
  );

  if (!indexFileId) {
    return {
      indexFileId: null,
      indexName: manager.defaults.indexName,
      status: 'missing',
      ready: false,
      sourceCount: null,
      chunkCount: null,
      createdAt: null,
      updatedAt: null,
      lastSyncAt: null
    };
  }

  if (inspect) {
    const inspected = astRagInspectIndex(indexFileId);
    const result = {
      indexFileId: inspected.indexFileId,
      indexName: inspected.indexName,
      status: 'ready',
      ready: true,
      sourceCount: inspected.sourceCount,
      chunkCount: inspected.chunkCount,
      createdAt: inspected.createdAt,
      updatedAt: inspected.updatedAt,
      lastSyncAt: inspected.lastSyncAt || null
    };
    astRagCaptureIndexManagerState(manager, Object.assign({ action: 'inspect' }, result));
    return result;
  }

  return astRagBuildIndexManagerFastStateFromMetadata(indexFileId, manager);
}

function astRagCreateIndexManager(config = {}) {
  const manager = {
    defaults: astRagNormalizeIndexManagerDefaults(config),
    state: {
      lastIndexFileId: null,
      lastAction: null,
      lastResult: null
    }
  };

  manager.state.lastIndexFileId = astRagNormalizeString(manager.defaults.indexFileId, null);

  return Object.freeze({
    ensure: request => astRagIndexManagerEnsure(manager, request || {}),
    sync: request => astRagIndexManagerSync(manager, request || {}),
    fastState: request => astRagIndexManagerFastState(manager, request || {}),
    getDefaults: () => astRagCloneObject(manager.defaults)
  });
}

