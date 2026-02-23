function astRagEnsureDriveAvailable() {
  if (typeof DriveApp === 'undefined' || !DriveApp || typeof DriveApp.getFileById !== 'function') {
    throw new AstRagIndexError('DriveApp is not available for index storage');
  }
}

function astRagHydrateLoadedChunk(chunk = {}) {
  const hydrated = astRagCloneObject(chunk);
  hydrated.chunkHash = astRagNormalizeString(hydrated.chunkHash, null) || astRagBuildChunkFingerprint(hydrated);
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

function astRagCreateIndexFile(indexName, payload, destinationFolderId) {
  astRagEnsureDriveAvailable();

  const fileName = astRagBuildIndexFileName(indexName);
  const jsonText = JSON.stringify(payload, null, 2);
  const plainTextMime = (typeof MimeType !== 'undefined' && MimeType && MimeType.PLAIN_TEXT)
    ? MimeType.PLAIN_TEXT
    : 'text/plain';
  const file = DriveApp.createFile(fileName, jsonText, plainTextMime);

  if (destinationFolderId) {
    const destinationFolder = DriveApp.getFolderById(destinationFolderId);
    file.moveTo(destinationFolder);
  }

  return file;
}

function astRagUpdateIndexFile(indexFileId, payload) {
  astRagEnsureDriveAvailable();

  const file = DriveApp.getFileById(indexFileId);
  const jsonText = JSON.stringify(payload, null, 2);
  file.setContent(jsonText);
  return file;
}

function astRagLoadIndexDocument(indexFileId) {
  astRagEnsureDriveAvailable();

  const file = DriveApp.getFileById(indexFileId);
  const text = file.getBlob().getDataAsString();
  const json = astRagSafeJsonParse(text, null);

  if (!json || typeof json !== 'object') {
    throw new AstRagIndexError('Index file does not contain valid JSON', {
      indexFileId
    });
  }

  if (!Array.isArray(json.chunks)) {
    throw new AstRagIndexError('Index document is missing chunks array', {
      indexFileId
    });
  }

  if (!Array.isArray(json.sources)) {
    throw new AstRagIndexError('Index document is missing sources array', {
      indexFileId
    });
  }

  json.sources = json.sources.map(astRagHydrateLoadedSource);
  json.chunks = json.chunks.map(astRagHydrateLoadedChunk);

  return {
    indexFileId,
    fileName: file.getName(),
    document: json
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

  if (indexInfo.indexFileId) {
    const file = astRagUpdateIndexFile(indexInfo.indexFileId, document);
    return {
      indexFileId: file.getId(),
      indexFileName: file.getName()
    };
  }

  const file = astRagCreateIndexFile(indexInfo.indexName, document, destinationFolderId);
  return {
    indexFileId: file.getId(),
    indexFileName: file.getName()
  };
}

function astRagInspectIndex(indexFileId) {
  const loaded = astRagLoadIndexDocument(indexFileId);
  const document = loaded.document;

  return {
    indexFileId,
    indexName: document.indexName || loaded.fileName,
    schemaVersion: document.schemaVersion || null,
    indexVersion: document.indexVersion || null,
    embedding: document.embedding || null,
    chunking: document.chunking || null,
    sourceCount: Array.isArray(document.sources) ? document.sources.length : 0,
    chunkCount: Array.isArray(document.chunks) ? document.chunks.length : 0,
    createdAt: document.createdAt || null,
    updatedAt: document.updatedAt || null,
    lastSyncAt: document.sync && document.sync.lastSyncAt ? document.sync.lastSyncAt : null
  };
}
