function astRagGroupChunksByFileId(chunks) {
  const grouped = {};
  const list = Array.isArray(chunks) ? chunks : [];

  list.forEach(chunk => {
    const fileId = chunk.fileId;
    if (!grouped[fileId]) {
      grouped[fileId] = [];
    }
    grouped[fileId].push(chunk);
  });

  return grouped;
}

function astRagSyncIndexCore(request = {}) {
  const normalizedRequest = astRagValidateSyncRequest(request);
  const loaded = astRagLoadIndexDocument(normalizedRequest.index.indexFileId);
  const current = loaded.document;

  const existingSources = Array.isArray(current.sources) ? current.sources : [];
  const existingSourceByFileId = {};
  existingSources.forEach(source => {
    existingSourceByFileId[source.fileId] = source;
  });

  const existingChunksByFileId = astRagGroupChunksByFileId(current.chunks || []);

  const driveSources = astRagListDriveSources(normalizedRequest.source, {
    maxFiles: normalizedRequest.options.maxFiles
  });

  const liveFileIds = new Set(driveSources.map(source => source.fileId));
  const nextSources = [];
  const nextChunks = [];
  const pendingEmbedChunks = [];
  const warnings = [];

  let addedSources = 0;
  let updatedSources = 0;

  driveSources.forEach(sourceDescriptor => {
    const sourceId = `src_${sourceDescriptor.fileId}`;
    const existingSource = existingSourceByFileId[sourceDescriptor.fileId];

    try {
      const extracted = astRagReadDriveSourceText(sourceDescriptor, normalizedRequest.auth, {
        retries: 2
      });
      const fingerprint = astRagBuildSourceFingerprint(sourceDescriptor, extracted);

      if (existingSource && existingSource.checksum === fingerprint) {
        nextSources.push(existingSource);
        const unchangedChunks = existingChunksByFileId[sourceDescriptor.fileId] || [];
        unchangedChunks.forEach(chunk => nextChunks.push(chunk));
        return;
      }

      const rebuiltChunks = astRagPrepareSourceChunks(
        sourceDescriptor,
        extracted,
        normalizedRequest.chunking,
        sourceId
      );

      if (rebuiltChunks.length === 0) {
        warnings.push({
          fileId: sourceDescriptor.fileId,
          fileName: sourceDescriptor.fileName,
          reason: 'No chunks produced from source text'
        });
        return;
      }

      if (nextChunks.length + pendingEmbedChunks.length + rebuiltChunks.length > normalizedRequest.options.maxChunks) {
        throw new AstRagValidationError('Index sync would exceed maxChunks limit', {
          maxChunks: normalizedRequest.options.maxChunks
        });
      }

      nextSources.push({
        sourceId,
        fileId: sourceDescriptor.fileId,
        fileName: sourceDescriptor.fileName,
        mimeType: sourceDescriptor.mimeType,
        modifiedTime: sourceDescriptor.modifiedTime,
        checksum: fingerprint,
        chunkCount: rebuiltChunks.length
      });

      rebuiltChunks.forEach(chunk => pendingEmbedChunks.push(chunk));

      if (existingSource) {
        updatedSources += 1;
      } else {
        addedSources += 1;
      }
    } catch (error) {
      if (!normalizedRequest.options.skipParseFailures) {
        throw error;
      }

      if (existingSource) {
        nextSources.push(existingSource);
        const preservedChunks = existingChunksByFileId[sourceDescriptor.fileId] || [];
        preservedChunks.forEach(chunk => nextChunks.push(chunk));
      }

      warnings.push({
        fileId: sourceDescriptor.fileId,
        fileName: sourceDescriptor.fileName,
        preservedExistingData: !!existingSource,
        reason: error && error.message ? error.message : 'Unknown extraction error'
      });
    }
  });

  let removedSources = 0;
  existingSources.forEach(source => {
    if (!liveFileIds.has(source.fileId)) {
      removedSources += 1;
    }
  });

  const embeddingProvider = (current.embedding && current.embedding.provider) || normalizedRequest.embedding.provider;
  const embeddingModel = (current.embedding && current.embedding.model) || normalizedRequest.embedding.model;

  if (pendingEmbedChunks.length > 0) {
    const embeddingResult = astRagEmbedTexts({
      provider: embeddingProvider,
      model: embeddingModel,
      texts: pendingEmbedChunks.map(chunk => chunk.text),
      auth: normalizedRequest.auth,
      providerOptions: normalizedRequest.embedding.providerOptions,
      options: { retries: 2 }
    });

    for (let idx = 0; idx < pendingEmbedChunks.length; idx += 1) {
      pendingEmbedChunks[idx].embedding = embeddingResult.vectors[idx];
      nextChunks.push(pendingEmbedChunks[idx]);
    }

    if (!current.embedding || !current.embedding.model) {
      current.embedding = {
        provider: embeddingProvider,
        model: embeddingResult.model,
        dimensions: embeddingResult.vectors.length > 0 ? embeddingResult.vectors[0].length : 0
      };
    }
  }

  if (nextChunks.length === 0) {
    throw new AstRagIndexError('No chunks available after sync', {
      warnings
    });
  }

  const now = astRagNowIsoString();
  const nextDocument = {
    schemaVersion: current.schemaVersion || AST_RAG_SCHEMA_VERSION,
    indexId: current.indexId || astRagUniqueId('rag_index'),
    indexName: current.indexName || normalizedRequest.index.indexName,
    createdAt: current.createdAt || now,
    updatedAt: now,
    embedding: {
      provider: embeddingProvider,
      model: embeddingModel,
      dimensions: nextChunks[0].embedding.length
    },
    chunking: normalizedRequest.chunking,
    retrievalDefaults: normalizedRequest.retrievalDefaults,
    sourceConfig: normalizedRequest.source,
    sources: nextSources,
    chunks: nextChunks
  };

  const persisted = astRagPersistIndexDocument(normalizedRequest, nextDocument);

  return {
    indexFileId: persisted.indexFileId,
    addedSources,
    updatedSources,
    removedSources,
    addedChunks: pendingEmbedChunks.length,
    removedChunks: (Array.isArray(current.chunks) ? current.chunks.length : 0) - (nextChunks.length - pendingEmbedChunks.length),
    updatedAt: now,
    warnings
  };
}
