function astRagPrepareSourceChunks(sourceDescriptor, extracted, chunking, sourceId) {
  const chunkSegments = astRagChunkSegments(extracted.segments || [], chunking);

  return chunkSegments.map((chunk, index) => ({
    chunkId: `${sourceId}_chunk_${index + 1}`,
    sourceId,
    fileId: sourceDescriptor.fileId,
    fileName: sourceDescriptor.fileName,
    mimeType: sourceDescriptor.mimeType,
    page: chunk.page == null ? null : chunk.page,
    slide: chunk.slide == null ? null : chunk.slide,
    section: chunk.section || 'body',
    text: chunk.text,
    embedding: []
  }));
}

function astRagBuildIndexDocument(normalizedRequest, preparedSources, chunks, embeddingResult) {
  const indexId = astRagUniqueId('rag_index');
  const now = astRagNowIsoString();

  return {
    schemaVersion: AST_RAG_SCHEMA_VERSION,
    indexId,
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
    sourceConfig: normalizedRequest.source,
    sources: preparedSources,
    chunks
  };
}

function astRagBuildIndexCore(request = {}) {
  const normalizedRequest = astRagValidateBuildRequest(request);

  const driveSources = astRagListDriveSources(normalizedRequest.source, {
    maxFiles: normalizedRequest.options.maxFiles
  });

  const preparedSources = [];
  const chunks = [];
  const warnings = [];

  for (let idx = 0; idx < driveSources.length; idx += 1) {
    const sourceDescriptor = driveSources[idx];
    const sourceId = `src_${sourceDescriptor.fileId}`;

    try {
      const extracted = astRagReadDriveSourceText(sourceDescriptor, normalizedRequest.auth, {
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

      preparedSources.push({
        sourceId,
        fileId: sourceDescriptor.fileId,
        fileName: sourceDescriptor.fileName,
        mimeType: sourceDescriptor.mimeType,
        modifiedTime: sourceDescriptor.modifiedTime,
        checksum: fingerprint,
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
  }

  const document = astRagBuildIndexDocument(normalizedRequest, preparedSources, chunks, embeddingResult);
  const persisted = astRagPersistIndexDocument(normalizedRequest, document);

  return {
    indexFileId: persisted.indexFileId,
    indexName: document.indexName,
    chunkCount: chunks.length,
    sourceCount: preparedSources.length,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    warnings
  };
}
