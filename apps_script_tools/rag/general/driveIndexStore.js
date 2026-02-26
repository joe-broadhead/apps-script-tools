function astRagEnsureDriveAvailable() {
  if (typeof DriveApp === 'undefined' || !DriveApp || typeof DriveApp.getFileById !== 'function') {
    throw new AstRagIndexError('DriveApp is not available for index storage');
  }
}

function astRagGetFileUpdatedAtToken(file) {
  try {
    if (file && typeof file.getLastUpdated === 'function') {
      const updatedAt = file.getLastUpdated();
      if (updatedAt && typeof updatedAt.toISOString === 'function') {
        return updatedAt.toISOString();
      }
    }
  } catch (_error) {
    // Ignore and fallback to null.
  }

  return null;
}

function astRagHydrateLoadedChunk(chunk = {}) {
  const hydrated = astRagCloneObject(chunk);
  hydrated.chunkHash = astRagNormalizeString(hydrated.chunkHash, null) || astRagBuildChunkFingerprint(hydrated);
  if (Array.isArray(hydrated.embedding) && hydrated.embedding.length > 0) {
    hydrated.embeddingNorm = (
      typeof hydrated.embeddingNorm === 'number' && isFinite(hydrated.embeddingNorm)
    )
      ? hydrated.embeddingNorm
      : astRagVectorNorm(hydrated.embedding);
  } else {
    hydrated.embeddingNorm = null;
  }
  return hydrated;
}

function astRagHydrateLoadedSource(source = {}) {
  const hydrated = astRagCloneObject(source);
  const fingerprint = astRagNormalizeSourceFingerprint(hydrated);
  if (fingerprint) {
    hydrated.fingerprint = fingerprint;
    hydrated.checksum = fingerprint;
  }
  return hydrated;
}

function astRagBuildIndexFileName(indexName) {
  const normalized = astRagNormalizeString(indexName, 'rag-index');
  if (normalized.toLowerCase().endsWith('.json')) {
    return normalized;
  }
  return `${normalized}.json`;
}

function astRagBuildShardFileName(indexFileName, shardId) {
  const safeShardId = astRagNormalizeString(shardId, 'shard_1').replace(/[^a-zA-Z0-9_-]/g, '_');
  const baseName = astRagNormalizeString(indexFileName, 'rag-index.json').replace(/\.json$/i, '');
  return `${baseName}--${safeShardId}.json`;
}

function astRagGetPlainTextMimeType() {
  return (typeof MimeType !== 'undefined' && MimeType && MimeType.PLAIN_TEXT)
    ? MimeType.PLAIN_TEXT
    : 'text/plain';
}

function astRagParseFileJson(file, errorContext = {}) {
  const text = file.getBlob().getDataAsString();
  const json = astRagSafeJsonParse(text, null);
  if (!json || typeof json !== 'object') {
    throw new AstRagIndexError('Index file does not contain valid JSON', errorContext);
  }
  return json;
}

function astRagCreateNamedFile(fileName, payload, destinationFolderId) {
  astRagEnsureDriveAvailable();

  const jsonText = JSON.stringify(payload, null, 2);
  const file = DriveApp.createFile(fileName, jsonText, astRagGetPlainTextMimeType());

  if (destinationFolderId) {
    const destinationFolder = DriveApp.getFolderById(destinationFolderId);
    file.moveTo(destinationFolder);
  }

  return file;
}

function astRagCreateIndexFile(indexName, payload, destinationFolderId) {
  const fileName = astRagBuildIndexFileName(indexName);
  return astRagCreateNamedFile(fileName, payload, destinationFolderId);
}

function astRagUpdateIndexFile(indexFileId, payload) {
  astRagEnsureDriveAvailable();

  const file = DriveApp.getFileById(indexFileId);
  const jsonText = JSON.stringify(payload, null, 2);
  file.setContent(jsonText);
  return file;
}

function astRagGetFilePrimaryParentFolderId(file, fallbackFolderId = null) {
  try {
    if (file && typeof file.getParents === 'function') {
      const parents = file.getParents();
      if (parents && typeof parents.hasNext === 'function' && parents.hasNext()) {
        const parent = parents.next();
        if (parent && typeof parent.getId === 'function') {
          return parent.getId();
        }
      }
    }
  } catch (_error) {
    // Ignore and fallback to caller-provided folder.
  }

  return fallbackFolderId;
}

function astRagTrashFileById(fileId) {
  try {
    if (!fileId) {
      return;
    }
    const file = DriveApp.getFileById(fileId);
    if (file && typeof file.setTrashed === 'function') {
      file.setTrashed(true);
    }
  } catch (_error) {
    // Best-effort cleanup only.
  }
}

function astRagIsShardedIndexDocument(document = {}) {
  if (!astRagIsPlainObject(document)) {
    return false;
  }
  const layout = astRagNormalizeString(document.storage && document.storage.layout, '').toLowerCase();
  return layout === 'sharded' || (Array.isArray(document.shards) && document.shards.length > 0);
}

function astRagNormalizeShardRefs(shards = []) {
  if (!Array.isArray(shards)) {
    return [];
  }

  return shards
    .map((raw, idx) => {
      if (!astRagIsPlainObject(raw)) {
        return null;
      }

      const shardId = astRagNormalizeString(raw.shardId, `shard_${idx + 1}`);
      const fileId = astRagNormalizeString(raw.fileId, null);
      if (!fileId) {
        return null;
      }

      return {
        shardId,
        fileId,
        fileName: astRagNormalizeString(raw.fileName, null),
        chunkCount: astRagNormalizePositiveInt(raw.chunkCount, 0, 0),
        updatedAt: astRagNormalizeString(raw.updatedAt, null),
        centroid: Array.isArray(raw.centroid) ? raw.centroid.slice() : [],
        centroidNorm: typeof raw.centroidNorm === 'number' && isFinite(raw.centroidNorm)
          ? raw.centroidNorm
          : null
      };
    })
    .filter(Boolean);
}

function astRagComputeShardCentroid(chunks = []) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return {
      centroid: [],
      centroidNorm: null
    };
  }

  let dimension = 0;
  for (let idx = 0; idx < chunks.length; idx += 1) {
    if (Array.isArray(chunks[idx].embedding) && chunks[idx].embedding.length > 0) {
      dimension = chunks[idx].embedding.length;
      break;
    }
  }

  if (!dimension) {
    return {
      centroid: [],
      centroidNorm: null
    };
  }

  const accum = new Array(dimension).fill(0);
  let count = 0;
  for (let idx = 0; idx < chunks.length; idx += 1) {
    const vector = chunks[idx].embedding;
    if (!Array.isArray(vector) || vector.length !== dimension) {
      continue;
    }
    count += 1;
    for (let dim = 0; dim < dimension; dim += 1) {
      accum[dim] += Number(vector[dim] || 0);
    }
  }

  if (!count) {
    return {
      centroid: [],
      centroidNorm: null
    };
  }

  for (let dim = 0; dim < accum.length; dim += 1) {
    accum[dim] = accum[dim] / count;
  }

  return {
    centroid: accum,
    centroidNorm: astRagVectorNorm(accum)
  };
}

function astRagBuildShardPayloads(document, maxChunksPerShard) {
  const list = Array.isArray(document.chunks) ? document.chunks : [];
  const size = astRagNormalizePositiveInt(maxChunksPerShard, AST_RAG_DEFAULT_SHARDING.maxChunksPerShard, 1);
  if (!list.length || size <= 0) {
    return [];
  }

  const payloads = [];
  let shardIndex = 0;
  for (let cursor = 0; cursor < list.length; cursor += size) {
    const shardChunks = list.slice(cursor, cursor + size);
    shardIndex += 1;
    const shardId = `shard_${String(shardIndex).padStart(4, '0')}`;
    const centroid = astRagComputeShardCentroid(shardChunks);

    payloads.push({
      schemaVersion: document.schemaVersion || AST_RAG_SCHEMA_VERSION,
      indexId: document.indexId || null,
      indexVersion: document.indexVersion || null,
      shardId,
      chunkCount: shardChunks.length,
      sourceIds: Array.from(new Set(shardChunks.map(chunk => astRagNormalizeString(chunk.sourceId, null)).filter(Boolean))),
      centroid: centroid.centroid,
      centroidNorm: centroid.centroidNorm,
      chunks: shardChunks
    });
  }

  return payloads;
}

function astRagReadIndexRootDocument(indexFileId) {
  astRagEnsureDriveAvailable();
  const file = DriveApp.getFileById(indexFileId);
  const fileName = file.getName();
  const versionToken = astRagGetFileUpdatedAtToken(file) || 'unknown';
  const root = astRagParseFileJson(file, { indexFileId });
  return {
    file,
    fileName,
    versionToken,
    root
  };
}

function astRagSelectShardRefs(indexDocument = {}, options = {}) {
  const allRefs = astRagNormalizeShardRefs(indexDocument.shards || []);
  if (!allRefs.length) {
    return [];
  }

  const requestedShardIds = Array.isArray(options.shardIds)
    ? options.shardIds.map(id => astRagNormalizeString(id, null)).filter(Boolean)
    : [];
  if (!requestedShardIds.length) {
    return allRefs;
  }

  const wanted = new Set(requestedShardIds);
  return allRefs.filter(ref => wanted.has(ref.shardId));
}

function astRagLoadShardChunks(indexFileId, shardRefs = [], options = {}) {
  const cacheConfig = astRagResolveCacheConfig(
    astRagIsPlainObject(options.cache) ? options.cache : {}
  );
  const cacheDiagnostics = typeof options.cacheDiagnostics === 'function'
    ? options.cacheDiagnostics
    : null;

  const merged = [];
  for (let idx = 0; idx < shardRefs.length; idx += 1) {
    const ref = shardRefs[idx];
    const shardVersionToken = astRagNormalizeString(ref.updatedAt, 'unknown');
    const cacheKey = astRagBuildIndexDocumentCacheKey(
      ref.fileId,
      shardVersionToken,
      `shard:${ref.shardId}`
    );
    const cached = astRagCacheGet(
      cacheConfig,
      cacheKey,
      cacheDiagnostics,
      { path: 'index_shard' }
    );
    if (cached && Array.isArray(cached.chunks)) {
      for (let chunkIdx = 0; chunkIdx < cached.chunks.length; chunkIdx += 1) {
        merged.push(astRagHydrateLoadedChunk(cached.chunks[chunkIdx]));
      }
      continue;
    }

    const shardFile = DriveApp.getFileById(ref.fileId);
    const shardJson = astRagParseFileJson(shardFile, {
      indexFileId,
      shardId: ref.shardId,
      shardFileId: ref.fileId
    });
    if (!Array.isArray(shardJson.chunks)) {
      throw new AstRagIndexError('Shard file is missing chunks array', {
        indexFileId,
        shardId: ref.shardId,
        shardFileId: ref.fileId
      });
    }

    astRagCacheSet(
      cacheConfig,
      cacheKey,
      { chunks: shardJson.chunks },
      cacheConfig.searchTtlSec,
      cacheDiagnostics,
      { path: 'index_shard' }
    );

    for (let chunkIdx = 0; chunkIdx < shardJson.chunks.length; chunkIdx += 1) {
      merged.push(astRagHydrateLoadedChunk(shardJson.chunks[chunkIdx]));
    }
  }

  return merged;
}

function astRagLoadIndexChunks(indexFileId, indexDocument = {}, options = {}) {
  if (!astRagIsShardedIndexDocument(indexDocument)) {
    const inlineChunks = Array.isArray(indexDocument.chunks) ? indexDocument.chunks : [];
    return inlineChunks.map(astRagHydrateLoadedChunk);
  }

  const selectedRefs = astRagSelectShardRefs(indexDocument, options);
  return astRagLoadShardChunks(indexFileId, selectedRefs, options);
}

function astRagLoadIndexDocument(indexFileId, options = {}) {
  astRagEnsureDriveAvailable();

  const rootLoaded = astRagReadIndexRootDocument(indexFileId);
  const fileName = rootLoaded.fileName;
  const versionToken = rootLoaded.versionToken;
  const loadChunks = options.loadChunks !== false;
  const selectedShardIds = Array.isArray(options.shardIds) ? options.shardIds : [];
  const chunkSelector = loadChunks
    ? (selectedShardIds.length > 0 ? `shards:${selectedShardIds.slice().sort().join(',')}` : 'all')
    : 'manifest';

  const cacheConfig = astRagResolveCacheConfig(
    astRagIsPlainObject(options) && astRagIsPlainObject(options.cache) ? options.cache : {}
  );
  const cacheDiagnostics = astRagIsPlainObject(options) && typeof options.cacheDiagnostics === 'function'
    ? options.cacheDiagnostics
    : null;
  const cacheKey = astRagBuildIndexDocumentCacheKey(indexFileId, versionToken, chunkSelector);
  const cached = astRagCacheGet(
    cacheConfig,
    cacheKey,
    cacheDiagnostics,
    { path: 'index_doc' }
  );

  if (cached && astRagIsPlainObject(cached.document)) {
    const cachedDocument = astRagCloneObject(cached.document);
    cachedDocument.sources = (cachedDocument.sources || []).map(astRagHydrateLoadedSource);
    cachedDocument.chunks = (cachedDocument.chunks || []).map(astRagHydrateLoadedChunk);
    cachedDocument.shards = astRagNormalizeShardRefs(cachedDocument.shards || []);
    return {
      indexFileId,
      fileName,
      versionToken,
      cacheHit: true,
      document: cachedDocument
    };
  }

  const json = rootLoaded.root;
  if (!Array.isArray(json.sources)) {
    throw new AstRagIndexError('Index document is missing sources array', {
      indexFileId
    });
  }

  json.sources = json.sources.map(astRagHydrateLoadedSource);
  json.shards = astRagNormalizeShardRefs(json.shards || []);
  json.chunkCount = astRagNormalizePositiveInt(
    json.chunkCount,
    Array.isArray(json.chunks) ? json.chunks.length : 0,
    0
  );

  if (loadChunks) {
    json.chunks = astRagLoadIndexChunks(indexFileId, json, {
      cache: cacheConfig,
      cacheDiagnostics,
      shardIds: selectedShardIds
    });
  } else {
    if (astRagIsShardedIndexDocument(json)) {
      json.chunks = [];
    } else {
      json.chunks = (Array.isArray(json.chunks) ? json.chunks : []).map(astRagHydrateLoadedChunk);
    }
  }

  astRagCacheSet(
    cacheConfig,
    cacheKey,
    {
      document: json
    },
    cacheConfig.searchTtlSec,
    cacheDiagnostics,
    { path: 'index_doc' }
  );

  return {
    indexFileId,
    fileName,
    versionToken,
    cacheHit: false,
    document: json
  };
}

function astRagPersistShardedIndexDocument(indexInfo, destinationFolderId, rootFile, rootDocument, shardPayloads, existingRefs = []) {
  const refs = [];
  const previousRefs = Array.isArray(existingRefs) ? existingRefs : [];

  for (let idx = 0; idx < shardPayloads.length; idx += 1) {
    const payload = shardPayloads[idx];
    const existing = previousRefs[idx];
    const shardFileName = astRagBuildShardFileName(rootFile.getName(), payload.shardId);
    let shardFile;
    if (existing && existing.fileId) {
      shardFile = astRagUpdateIndexFile(existing.fileId, payload);
    } else {
      shardFile = astRagCreateNamedFile(shardFileName, payload, destinationFolderId);
    }

    refs.push({
      shardId: payload.shardId,
      fileId: shardFile.getId(),
      fileName: shardFile.getName(),
      chunkCount: payload.chunkCount,
      updatedAt: astRagGetFileUpdatedAtToken(shardFile),
      centroid: Array.isArray(payload.centroid) ? payload.centroid.slice() : [],
      centroidNorm: typeof payload.centroidNorm === 'number' && isFinite(payload.centroidNorm)
        ? payload.centroidNorm
        : null
    });
  }

  for (let idx = shardPayloads.length; idx < previousRefs.length; idx += 1) {
    astRagTrashFileById(previousRefs[idx] && previousRefs[idx].fileId);
  }

  rootDocument.shards = refs;
  rootDocument.chunks = [];
  rootDocument.chunkCount = shardPayloads.reduce((total, shard) => total + Number(shard.chunkCount || 0), 0);
  rootDocument.storage = {
    layout: 'sharded',
    totalShards: refs.length,
    maxChunksPerShard: astRagNormalizePositiveInt(
      indexInfo.sharding && indexInfo.sharding.maxChunksPerShard,
      AST_RAG_DEFAULT_SHARDING.maxChunksPerShard,
      1
    )
  };

  const updatedRoot = astRagUpdateIndexFile(rootFile.getId(), rootDocument);
  return {
    indexFileId: updatedRoot.getId(),
    indexFileName: updatedRoot.getName()
  };
}

function astRagPersistIndexDocument(indexRequest, document) {
  if (!document || typeof document !== 'object') {
    throw new AstRagIndexError('Index document must be an object');
  }

  const indexInfo = indexRequest.index || {};
  const defaults = astRagResolveRetrievalDefaults();

  let destinationFolderId = indexInfo.destinationFolderId;
  if (!destinationFolderId && defaults.defaultFolderId) {
    destinationFolderId = defaults.defaultFolderId;
  }

  let rootFile = null;
  let existingRootDoc = null;

  if (indexInfo.indexFileId) {
    const loadedRoot = astRagReadIndexRootDocument(indexInfo.indexFileId);
    rootFile = loadedRoot.file;
    existingRootDoc = loadedRoot.root;
    destinationFolderId = astRagGetFilePrimaryParentFolderId(rootFile, destinationFolderId);
  } else {
    rootFile = astRagCreateIndexFile(indexInfo.indexName, {}, destinationFolderId);
  }

  const sharding = astRagIsPlainObject(indexInfo.sharding)
    ? indexInfo.sharding
    : (astRagIsPlainObject(document.sharding) ? document.sharding : AST_RAG_DEFAULT_SHARDING);
  const maxChunksPerShard = astRagNormalizePositiveInt(
    sharding.maxChunksPerShard,
    AST_RAG_DEFAULT_SHARDING.maxChunksPerShard,
    1
  );
  const chunkList = Array.isArray(document.chunks) ? document.chunks : [];
  const shouldShard = Boolean(sharding.enabled) && chunkList.length > maxChunksPerShard;

  const nextRootDocument = astRagCloneObject(document);
  nextRootDocument.sharding = {
    enabled: Boolean(sharding.enabled),
    maxChunksPerShard
  };
  nextRootDocument.chunkCount = chunkList.length;

  if (!shouldShard) {
    nextRootDocument.storage = {
      layout: 'single',
      totalShards: 1,
      maxChunksPerShard
    };
    nextRootDocument.shards = [];
    const file = astRagUpdateIndexFile(rootFile.getId(), nextRootDocument);
    const existingRefs = astRagNormalizeShardRefs(existingRootDoc && existingRootDoc.shards);
    for (let idx = 0; idx < existingRefs.length; idx += 1) {
      astRagTrashFileById(existingRefs[idx].fileId);
    }
    return {
      indexFileId: file.getId(),
      indexFileName: file.getName()
    };
  }

  const shardPayloads = astRagBuildShardPayloads(document, maxChunksPerShard);
  return astRagPersistShardedIndexDocument(
    indexInfo,
    destinationFolderId,
    rootFile,
    nextRootDocument,
    shardPayloads,
    astRagNormalizeShardRefs(existingRootDoc && existingRootDoc.shards)
  );
}

function astRagInspectIndex(indexFileId) {
  const loaded = astRagLoadIndexDocument(indexFileId, { loadChunks: false });
  const document = loaded.document;
  const chunkCount = astRagNormalizePositiveInt(
    document.chunkCount,
    Array.isArray(document.chunks) ? document.chunks.length : 0,
    0
  );

  return {
    indexFileId,
    indexName: document.indexName || loaded.fileName,
    schemaVersion: document.schemaVersion || null,
    indexVersion: document.indexVersion || null,
    embedding: document.embedding || null,
    chunking: document.chunking || null,
    sourceCount: Array.isArray(document.sources) ? document.sources.length : 0,
    chunkCount,
    storage: astRagIsPlainObject(document.storage) ? astRagCloneObject(document.storage) : {
      layout: 'single',
      totalShards: 1
    },
    createdAt: document.createdAt || null,
    updatedAt: document.updatedAt || null,
    lastSyncAt: document.sync && document.sync.lastSyncAt ? document.sync.lastSyncAt : null
  };
}
