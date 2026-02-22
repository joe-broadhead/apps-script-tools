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

function astRagBuildReusableChunkQueues(chunks) {
  const queues = {};
  const list = Array.isArray(chunks) ? chunks : [];

  for (let idx = 0; idx < list.length; idx += 1) {
    const chunk = list[idx];
    const chunkHash = astRagNormalizeString(chunk.chunkHash, null) || astRagBuildChunkFingerprint(chunk);
    if (!chunkHash) {
      continue;
    }
    if (!queues[chunkHash]) {
      queues[chunkHash] = [];
    }
    queues[chunkHash].push(chunk);
  }

  return queues;
}

function astRagTakeReusableChunk(queues, chunkHash) {
  const hash = astRagNormalizeString(chunkHash, null);
  if (!hash || !queues || !queues[hash] || queues[hash].length === 0) {
    return null;
  }
  return queues[hash].shift();
}

function astRagCreateSyncedSource(sourceDescriptor, sourceId, fingerprint, chunkCount) {
  return {
    sourceId,
    fileId: sourceDescriptor.fileId,
    fileName: sourceDescriptor.fileName,
    mimeType: sourceDescriptor.mimeType,
    modifiedTime: sourceDescriptor.modifiedTime,
    fingerprint,
    checksum: fingerprint,
    chunkCount
  };
}

function astRagCreateSyncSummary({
  dryRun,
  persisted,
  addedSources,
  updatedSources,
  removedSources,
  unchangedSources,
  addedChunks,
  removedChunks,
  reusedChunks,
  reembeddedChunks
}) {
  return {
    mode: 'sync',
    dryRun,
    persisted,
    addedSources,
    updatedSources,
    removedSources,
    unchangedSources,
    addedChunks,
    removedChunks,
    reusedChunks,
    reembeddedChunks
  };
}

function astRagBuildSyncedIndexDocument(current, normalizedRequest, nextSources, nextChunks, embedding, now, summary) {
  const dimensions = nextChunks.length > 0 && Array.isArray(nextChunks[0].embedding)
    ? nextChunks[0].embedding.length
    : 0;

  return {
    schemaVersion: current.schemaVersion || AST_RAG_SCHEMA_VERSION,
    indexId: current.indexId || astRagUniqueId('rag_index'),
    indexName: current.indexName || normalizedRequest.index.indexName,
    createdAt: current.createdAt || now,
    updatedAt: now,
    embedding: {
      provider: embedding.provider,
      model: embedding.model,
      dimensions
    },
    chunking: normalizedRequest.chunking,
    retrievalDefaults: normalizedRequest.retrievalDefaults,
    sourceConfig: normalizedRequest.source,
    sources: nextSources,
    chunks: nextChunks,
    sync: {
      lastSyncAt: now,
      lastSyncSummary: summary
    }
  };
}

function astRagSyncIndexCore(request = {}) {
  const spanId = astRagTelemetryStartSpan('rag.syncIndex', {
    indexFileId: request && request.index && request.index.indexFileId ? request.index.indexFileId : null
  });

  try {
    const normalizedRequest = astRagValidateSyncRequest(request);
    const loaded = astRagLoadIndexDocument(normalizedRequest.index.indexFileId);
    const current = loaded.document;
    const dryRun = !!normalizedRequest.options.dryRun;

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
    let removedSources = 0;
    let unchangedSources = 0;
    let addedChunks = 0;
    let removedChunks = 0;
    let reusedChunks = 0;
    let reembeddedChunks = 0;

    driveSources.forEach(sourceDescriptor => {
      const existingSource = existingSourceByFileId[sourceDescriptor.fileId] || null;
      const sourceId = (existingSource && existingSource.sourceId) || `src_${sourceDescriptor.fileId}`;
      const existingChunks = existingChunksByFileId[sourceDescriptor.fileId] || [];

      try {
        const extracted = astRagReadDriveSourceText(sourceDescriptor, normalizedRequest.auth, {
          retries: 2
        });
        const fingerprint = astRagBuildSourceFingerprint(sourceDescriptor, extracted);
        const existingFingerprint = astRagNormalizeSourceFingerprint(existingSource);

        if (existingSource && existingFingerprint === fingerprint) {
          nextSources.push(existingSource);
          existingChunks.forEach(chunk => nextChunks.push(chunk));
          unchangedSources += 1;
          return;
        }

        const rebuiltChunks = astRagPrepareSourceChunks(
          sourceDescriptor,
          extracted,
          normalizedRequest.chunking,
          sourceId
        );

        if (rebuiltChunks.length === 0) {
          if (existingSource) {
            nextSources.push(existingSource);
            existingChunks.forEach(chunk => nextChunks.push(chunk));
            unchangedSources += 1;
          }

          warnings.push({
            fileId: sourceDescriptor.fileId,
            fileName: sourceDescriptor.fileName,
            preservedExistingData: !!existingSource,
            reason: 'No chunks produced from source text'
          });
          return;
        }

        if (nextChunks.length + pendingEmbedChunks.length + rebuiltChunks.length > normalizedRequest.options.maxChunks) {
          throw new AstRagValidationError('Index sync would exceed maxChunks limit', {
            maxChunks: normalizedRequest.options.maxChunks
          });
        }

        const reusableQueues = astRagBuildReusableChunkQueues(existingChunks);
        let sourceReusedChunks = 0;

        rebuiltChunks.forEach(chunk => {
          const reusableChunk = astRagTakeReusableChunk(reusableQueues, chunk.chunkHash);
          if (reusableChunk && Array.isArray(reusableChunk.embedding) && reusableChunk.embedding.length > 0) {
            chunk.embedding = reusableChunk.embedding;
            nextChunks.push(chunk);
            sourceReusedChunks += 1;
            return;
          }

          pendingEmbedChunks.push(chunk);
          nextChunks.push(chunk);
        });

        nextSources.push(astRagCreateSyncedSource(sourceDescriptor, sourceId, fingerprint, rebuiltChunks.length));

        const sourceAddedChunks = Math.max(0, rebuiltChunks.length - sourceReusedChunks);
        const sourceRemovedChunks = Math.max(0, existingChunks.length - sourceReusedChunks);

        addedChunks += sourceAddedChunks;
        removedChunks += sourceRemovedChunks;
        reusedChunks += sourceReusedChunks;

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
          existingChunks.forEach(chunk => nextChunks.push(chunk));
          unchangedSources += 1;
        }

        warnings.push({
          fileId: sourceDescriptor.fileId,
          fileName: sourceDescriptor.fileName,
          preservedExistingData: !!existingSource,
          reason: error && error.message ? error.message : 'Unknown extraction error'
        });
      }
    });

    existingSources.forEach(source => {
      if (!liveFileIds.has(source.fileId)) {
        removedSources += 1;
        const removedSourceChunks = existingChunksByFileId[source.fileId] || [];
        removedChunks += removedSourceChunks.length;
      }
    });

    const embedding = {
      provider: (current.embedding && current.embedding.provider) || normalizedRequest.embedding.provider,
      model: (current.embedding && current.embedding.model) || normalizedRequest.embedding.model
    };

    if (pendingEmbedChunks.length > 0) {
      reembeddedChunks = pendingEmbedChunks.length;

      if (!dryRun) {
        const embeddingResult = astRagEmbedTexts({
          provider: embedding.provider,
          model: embedding.model,
          texts: pendingEmbedChunks.map(chunk => chunk.text),
          auth: normalizedRequest.auth,
          providerOptions: normalizedRequest.embedding.providerOptions,
          options: { retries: 2 }
        });

        embedding.model = embeddingResult.model;

        for (let idx = 0; idx < pendingEmbedChunks.length; idx += 1) {
          pendingEmbedChunks[idx].embedding = embeddingResult.vectors[idx];
        }
      }
    }

    if (nextChunks.length === 0) {
      throw new AstRagIndexError('No chunks available after sync', {
        warnings
      });
    }

    const now = astRagNowIsoString();
    const summary = astRagCreateSyncSummary({
      dryRun,
      persisted: !dryRun,
      addedSources,
      updatedSources,
      removedSources,
      unchangedSources,
      addedChunks,
      removedChunks,
      reusedChunks,
      reembeddedChunks
    });

    if (dryRun) {
      const result = {
        indexFileId: normalizedRequest.index.indexFileId,
        dryRun: true,
        persisted: false,
        addedSources,
        updatedSources,
        removedSources,
        unchangedSources,
        addedChunks,
        removedChunks,
        reusedChunks,
        reembeddedChunks,
        currentChunkCount: Array.isArray(current.chunks) ? current.chunks.length : 0,
        nextChunkCount: nextChunks.length,
        updatedAt: now,
        warnings
      };

      astRagTelemetryEndSpan(spanId, {
        indexFileId: result.indexFileId,
        dryRun: true,
        addedSources: result.addedSources,
        updatedSources: result.updatedSources,
        removedSources: result.removedSources,
        addedChunks: result.addedChunks,
        removedChunks: result.removedChunks,
        nextChunkCount: result.nextChunkCount,
        warningCount: warnings.length
      });
      return result;
    }

    const nextDocument = astRagBuildSyncedIndexDocument(
      current,
      normalizedRequest,
      nextSources,
      nextChunks,
      embedding,
      now,
      summary
    );

    const persisted = astRagPersistIndexDocument(normalizedRequest, nextDocument);
    const result = {
      indexFileId: persisted.indexFileId,
      dryRun: false,
      persisted: true,
      addedSources,
      updatedSources,
      removedSources,
      unchangedSources,
      addedChunks,
      removedChunks,
      reusedChunks,
      reembeddedChunks,
      updatedAt: now,
      warnings
    };

    astRagTelemetryEndSpan(spanId, {
      indexFileId: result.indexFileId,
      dryRun: false,
      addedSources: result.addedSources,
      updatedSources: result.updatedSources,
      removedSources: result.removedSources,
      addedChunks: result.addedChunks,
      removedChunks: result.removedChunks,
      reusedChunks: result.reusedChunks,
      reembeddedChunks: result.reembeddedChunks,
      warningCount: warnings.length
    });
    return result;
  } catch (error) {
    astRagTelemetryEndSpan(spanId, {
      indexFileId: request && request.index && request.index.indexFileId ? request.index.indexFileId : null
    }, error);
    throw error;
  }
}
