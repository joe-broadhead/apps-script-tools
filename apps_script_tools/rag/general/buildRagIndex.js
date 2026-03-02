function astRagPrepareSourceChunks(sourceDescriptor, extracted, chunking, sourceId) {
  const chunkSegments = astRagChunkSegments(extracted.segments || [], chunking);

  return chunkSegments.map((chunk, index) => {
    const prepared = {
      chunkId: `${sourceId}_chunk_${index + 1}`,
      sourceId,
      fileId: sourceDescriptor.fileId,
      fileName: sourceDescriptor.fileName,
      sourceKind: astRagNormalizeString(sourceDescriptor.sourceKind, 'drive'),
      sourceUri: astRagNormalizeString(sourceDescriptor.uri, null),
      provider: astRagNormalizeString(sourceDescriptor.provider, null),
      mimeType: sourceDescriptor.mimeType,
      page: chunk.page == null ? null : chunk.page,
      slide: chunk.slide == null ? null : chunk.slide,
      section: chunk.section || 'body',
      text: chunk.text,
      embedding: [],
      embeddingNorm: null
    };
    prepared.chunkHash = astRagBuildChunkFingerprint(prepared);
    return prepared;
  });
}

function astRagBuildIncrementalJournalFromSources(sources = [], now = null) {
  const list = Array.isArray(sources) ? sources : [];
  const stamp = astRagNormalizeString(now, astRagNowIsoString());
  const journal = {};

  for (let idx = 0; idx < list.length; idx += 1) {
    const source = list[idx] || {};
    const fileId = astRagNormalizeString(source.fileId, null);
    if (!fileId) {
      continue;
    }

    journal[fileId] = {
      sourceId: astRagNormalizeString(source.sourceId, null),
      fileId,
      sourceKind: astRagNormalizeString(source.sourceKind, 'drive'),
      sourceUri: astRagNormalizeString(source.sourceUri, null),
      provider: astRagNormalizeString(source.provider, null),
      modifiedTime: astRagNormalizeString(source.modifiedTime, null),
      fingerprint: astRagNormalizeSourceFingerprint(source),
      revisionFingerprint: astRagNormalizeString(source.revisionFingerprint, null),
      chunkCount: astRagNormalizePositiveInt(source.chunkCount, 0, 0),
      updatedAt: stamp
    };
  }

  return journal;
}

function astRagBuildIndexDocument(normalizedRequest, preparedSources, chunks, embeddingResult) {
  const indexId = astRagUniqueId('rag_index');
  const now = astRagNowIsoString();

  return {
    schemaVersion: AST_RAG_SCHEMA_VERSION,
    indexId,
    indexVersion: astRagBuildIndexVersion(),
    indexName: normalizedRequest.index.indexName,
    createdAt: now,
    updatedAt: now,
    embedding: {
      provider: normalizedRequest.embedding.provider,
      model: embeddingResult.model,
      dimensions: chunks.length > 0 && Array.isArray(chunks[0].embedding) ? chunks[0].embedding.length : 0
    },
    chunking: normalizedRequest.chunking,
    retrievalDefaults: normalizedRequest.retrievalDefaults,
    sharding: astRagCloneObject(normalizedRequest.index.sharding || AST_RAG_DEFAULT_SHARDING),
    storage: {
      layout: 'single',
      totalShards: 1,
      maxChunksPerShard: astRagNormalizePositiveInt(
        normalizedRequest.index && normalizedRequest.index.sharding && normalizedRequest.index.sharding.maxChunksPerShard,
        AST_RAG_DEFAULT_SHARDING.maxChunksPerShard,
        1
      )
    },
    sourceConfig: normalizedRequest.source,
    sources: preparedSources,
    chunks,
    sync: {
      lastSyncAt: now,
      incrementalJournal: astRagBuildIncrementalJournalFromSources(preparedSources, now),
      lastSyncSummary: {
        mode: 'build',
        dryRun: false,
        persisted: true,
        addedSources: preparedSources.length,
        updatedSources: 0,
        removedSources: 0,
        addedChunks: chunks.length,
        removedChunks: 0,
        unchangedSources: 0,
        reusedChunks: 0,
        reembeddedChunks: chunks.length,
        journalSkippedSources: 0
      }
    }
  };
}

function astRagBuildIndexCore(request = {}) {
  const spanId = astRagTelemetryStartSpan('rag.buildIndex', {
    indexName: request && request.index && request.index.indexName ? request.index.indexName : null
  });

  try {
    const normalizedRequest = astRagValidateBuildRequest(request);

    const listSourcesFn = typeof astRagListSources === 'function'
      ? astRagListSources
      : (source, options) => astRagListDriveSources(source, options);
    const readSourceFn = typeof astRagReadSourceText === 'function'
      ? astRagReadSourceText
      : astRagReadDriveSourceText;

    const sources = listSourcesFn(normalizedRequest.source, {
      maxFiles: normalizedRequest.options.maxFiles
    }, normalizedRequest.auth);

    const preparedSources = [];
    const chunks = [];
    const warnings = [];

    for (let idx = 0; idx < sources.length; idx += 1) {
      const sourceDescriptor = sources[idx];
      const sourceId = `src_${sourceDescriptor.fileId}`;

      try {
        const extracted = readSourceFn(sourceDescriptor, normalizedRequest.auth, {
          retries: 2
        });

        const sourceChunks = astRagPrepareSourceChunks(
          sourceDescriptor,
          extracted,
          normalizedRequest.chunking,
          sourceId
        );

        if (sourceChunks.length === 0) {
          warnings.push({
            fileId: sourceDescriptor.fileId,
            fileName: sourceDescriptor.fileName,
            reason: 'No chunks produced from source text'
          });
          continue;
        }

        if (chunks.length + sourceChunks.length > normalizedRequest.options.maxChunks) {
          throw new AstRagValidationError('Indexing would exceed maxChunks limit', {
            maxChunks: normalizedRequest.options.maxChunks,
            attempted: chunks.length + sourceChunks.length
          });
        }

        const fingerprint = astRagBuildSourceFingerprint(sourceDescriptor, extracted);
        const revisionFingerprint = astRagBuildSourceRevisionFingerprint(sourceDescriptor);

        preparedSources.push({
          sourceId,
          fileId: sourceDescriptor.fileId,
          fileName: sourceDescriptor.fileName,
          sourceKind: astRagNormalizeString(sourceDescriptor.sourceKind, 'drive'),
          sourceUri: astRagNormalizeString(sourceDescriptor.uri, null),
          provider: astRagNormalizeString(sourceDescriptor.provider, null),
          mimeType: sourceDescriptor.mimeType,
          modifiedTime: sourceDescriptor.modifiedTime,
          fingerprint,
          checksum: fingerprint,
          revisionFingerprint,
          chunkCount: sourceChunks.length
        });

        for (let chunkIndex = 0; chunkIndex < sourceChunks.length; chunkIndex += 1) {
          chunks.push(sourceChunks[chunkIndex]);
        }
      } catch (error) {
        if (!normalizedRequest.options.skipParseFailures) {
          throw error;
        }

        warnings.push({
          fileId: sourceDescriptor.fileId,
          fileName: sourceDescriptor.fileName,
          reason: error && error.message ? error.message : 'Unknown extraction error'
        });
      }
    }

    if (chunks.length === 0) {
      throw new AstRagIndexError('No chunks available for index build', {
        sourceCount: preparedSources.length,
        warnings
      });
    }

    const embeddingResult = astRagEmbedTexts({
      provider: normalizedRequest.embedding.provider,
      model: normalizedRequest.embedding.model,
      texts: chunks.map(chunk => chunk.text),
      auth: normalizedRequest.auth,
      providerOptions: normalizedRequest.embedding.providerOptions,
      options: { retries: 2 }
    });

    for (let idx = 0; idx < chunks.length; idx += 1) {
      chunks[idx].embedding = embeddingResult.vectors[idx];
      chunks[idx].embeddingNorm = astRagVectorNorm(chunks[idx].embedding);
    }

    const document = astRagBuildIndexDocument(normalizedRequest, preparedSources, chunks, embeddingResult);
    const persisted = astRagPersistIndexDocument(normalizedRequest, document);
    const result = {
      indexFileId: persisted.indexFileId,
      indexName: document.indexName,
      chunkCount: chunks.length,
      sourceCount: preparedSources.length,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      warnings
    };

    astRagTelemetryEndSpan(spanId, {
      indexName: result.indexName,
      sourceCount: result.sourceCount,
      chunkCount: result.chunkCount,
      warningCount: warnings.length
    });
    return result;
  } catch (error) {
    astRagTelemetryEndSpan(spanId, {
      indexName: request && request.index && request.index.indexName ? request.index.indexName : null
    }, error);
    throw error;
  }
}
