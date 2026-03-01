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

function astRagNormalizeIncrementalJournal(journal, updatedAt = null) {
  const output = {};
  const source = astRagIsPlainObject(journal) ? journal : {};
  const stamp = astRagNormalizeString(updatedAt, null);
  const keys = Object.keys(source);

  for (let idx = 0; idx < keys.length; idx += 1) {
    const key = keys[idx];
    const entry = source[key];
    if (!astRagIsPlainObject(entry)) {
      continue;
    }

    const fileId = astRagNormalizeString(entry.fileId, null) || astRagNormalizeString(key, null);
    if (!fileId) {
      continue;
    }

    output[fileId] = {
      sourceId: astRagNormalizeString(entry.sourceId, null),
      fileId,
      sourceKind: astRagNormalizeString(entry.sourceKind, 'drive'),
      sourceUri: astRagNormalizeString(entry.sourceUri, null),
      provider: astRagNormalizeString(entry.provider, null),
      modifiedTime: astRagNormalizeString(entry.modifiedTime, null),
      fingerprint: astRagNormalizeString(entry.fingerprint, null),
      revisionFingerprint: astRagNormalizeString(entry.revisionFingerprint, null),
      chunkCount: astRagNormalizePositiveInt(entry.chunkCount, 0, 0),
      updatedAt: stamp || astRagNormalizeString(entry.updatedAt, null)
    };
  }

  return output;
}

function astRagBuildIncrementalJournalEntryFromSource(source = {}, updatedAt = null) {
  const fileId = astRagNormalizeString(source.fileId, null);
  if (!fileId) {
    return null;
  }

  return {
    sourceId: astRagNormalizeString(source.sourceId, null),
    fileId,
    sourceKind: astRagNormalizeString(source.sourceKind, 'drive'),
    sourceUri: astRagNormalizeString(source.sourceUri, null),
    provider: astRagNormalizeString(source.provider, null),
    modifiedTime: astRagNormalizeString(source.modifiedTime, null),
    fingerprint: astRagNormalizeSourceFingerprint(source),
    revisionFingerprint: astRagNormalizeString(source.revisionFingerprint, null),
    chunkCount: astRagNormalizePositiveInt(source.chunkCount, 0, 0),
    updatedAt: astRagNormalizeString(updatedAt, null)
  };
}

function astRagEnsureChunkEmbeddingNorm(chunk = {}) {
  if (!chunk || !Array.isArray(chunk.embedding) || chunk.embedding.length === 0) {
    return chunk;
  }

  if (typeof chunk.embeddingNorm === 'number' && isFinite(chunk.embeddingNorm)) {
    return chunk;
  }

  chunk.embeddingNorm = astRagVectorNorm(chunk.embedding);
  return chunk;
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
      queues[chunkHash] = {
        items: [],
        head: 0
      };
    }
    queues[chunkHash].items.push(chunk);
  }

  return queues;
}

function astRagTakeReusableChunk(queues, chunkHash) {
  const hash = astRagNormalizeString(chunkHash, null);
  if (!hash || !queues || !queues[hash]) {
    return null;
  }

  const queue = queues[hash];
  if (!Array.isArray(queue.items) || queue.head >= queue.items.length) {
    delete queues[hash];
    return null;
  }

  const item = queue.items[queue.head];
  queue.items[queue.head] = undefined;
  queue.head += 1;

  if (queue.head >= queue.items.length) {
    delete queues[hash];
    return item;
  }

  if (queue.head > 64 && queue.head * 2 >= queue.items.length) {
    queue.items = queue.items.slice(queue.head);
    queue.head = 0;
  }

  return item;
}

function astRagCreateSyncedSource(sourceDescriptor, sourceId, fingerprint, chunkCount, revisionFingerprint) {
  return {
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
    revisionFingerprint: astRagNormalizeString(revisionFingerprint, null),
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
  reembeddedChunks,
  journalSkippedSources
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
    reembeddedChunks,
    journalSkippedSources
  };
}

function astRagBuildSyncedIndexDocument(
  current,
  normalizedRequest,
  nextSources,
  nextChunks,
  embedding,
  now,
  summary,
  incrementalJournal
) {
  const dimensions = nextChunks.length > 0 && Array.isArray(nextChunks[0].embedding)
    ? nextChunks[0].embedding.length
    : 0;

  return {
    schemaVersion: current.schemaVersion || AST_RAG_SCHEMA_VERSION,
    indexId: current.indexId || astRagUniqueId('rag_index'),
    indexVersion: astRagBuildIndexVersion(),
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
    sharding: astRagCloneObject(normalizedRequest.index.sharding || current.sharding || AST_RAG_DEFAULT_SHARDING),
    storage: astRagIsPlainObject(current.storage) ? astRagCloneObject(current.storage) : {
      layout: 'single',
      totalShards: 1,
      maxChunksPerShard: astRagNormalizePositiveInt(
        normalizedRequest.index && normalizedRequest.index.sharding && normalizedRequest.index.sharding.maxChunksPerShard,
        AST_RAG_DEFAULT_SHARDING.maxChunksPerShard,
        1
      )
    },
    sourceConfig: normalizedRequest.source,
    sources: nextSources,
    chunks: nextChunks,
    sync: {
      lastSyncAt: now,
      incrementalJournal: astRagNormalizeIncrementalJournal(incrementalJournal, now),
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
    const hasShardingOverride = normalizedRequest
      && normalizedRequest.index
      && normalizedRequest.index.shardingProvided === true;
    if (!hasShardingOverride && astRagIsPlainObject(current.sharding)) {
      normalizedRequest.index.sharding = astRagCloneObject(current.sharding);
    }
    const dryRun = !!normalizedRequest.options.dryRun;
    const useFingerprintJournal = normalizedRequest.options.useFingerprintJournal !== false;

    const existingSources = Array.isArray(current.sources) ? current.sources : [];
    const existingSourceByFileId = {};
    existingSources.forEach(source => {
      existingSourceByFileId[source.fileId] = source;
    });
    const existingJournal = astRagNormalizeIncrementalJournal(
      current && current.sync && current.sync.incrementalJournal
    );

    const existingChunksByFileId = astRagGroupChunksByFileId(current.chunks || []);

    const listSourcesFn = typeof astRagListSources === 'function'
      ? astRagListSources
      : (source, options) => astRagListDriveSources(source, options);
    const readSourceFn = typeof astRagReadSourceText === 'function'
      ? astRagReadSourceText
      : astRagReadDriveSourceText;

    const sources = listSourcesFn(normalizedRequest.source, {
      maxFiles: normalizedRequest.options.maxFiles
    }, normalizedRequest.auth);

    const liveFileIds = new Set(sources.map(source => source.fileId));
    const nextSources = [];
    const nextChunks = [];
    const nextJournal = {};
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
    let journalSkippedSources = 0;

    sources.forEach(sourceDescriptor => {
      const existingSource = existingSourceByFileId[sourceDescriptor.fileId] || null;
      const existingJournalEntry = existingJournal[sourceDescriptor.fileId] || null;
      const sourceId = (existingSource && existingSource.sourceId) || `src_${sourceDescriptor.fileId}`;
      const existingChunks = existingChunksByFileId[sourceDescriptor.fileId] || [];
      const revisionFingerprint = astRagBuildSourceRevisionFingerprint(sourceDescriptor);
      const hasRevisionSignals = astRagSourceHasRevisionSignals(sourceDescriptor);

      try {
        const existingRevisionFingerprint = astRagNormalizeString(
          existingSource && existingSource.revisionFingerprint,
          null
        ) || astRagNormalizeString(
          existingJournalEntry && existingJournalEntry.revisionFingerprint,
          null
        );

        if (
          useFingerprintJournal
          && existingSource
          && hasRevisionSignals
          && existingRevisionFingerprint
          && existingRevisionFingerprint === revisionFingerprint
        ) {
          const reusedSource = astRagCloneObject(existingSource);
          reusedSource.revisionFingerprint = revisionFingerprint;
          nextSources.push(reusedSource);
          existingChunks.forEach(chunk => nextChunks.push(chunk));
          const journalEntry = astRagBuildIncrementalJournalEntryFromSource(reusedSource);
          if (journalEntry) {
            nextJournal[journalEntry.fileId] = journalEntry;
          }
          unchangedSources += 1;
          journalSkippedSources += 1;
          return;
        }

        const extracted = readSourceFn(sourceDescriptor, normalizedRequest.auth, {
          retries: 2
        });
        const fingerprint = astRagBuildSourceFingerprint(sourceDescriptor, extracted);
        const existingFingerprint = astRagNormalizeSourceFingerprint(existingSource)
          || astRagNormalizeString(existingJournalEntry && existingJournalEntry.fingerprint, null);

        if (existingSource && existingFingerprint === fingerprint) {
          const reusedSource = astRagCloneObject(existingSource);
          reusedSource.fingerprint = fingerprint;
          reusedSource.checksum = fingerprint;
          reusedSource.revisionFingerprint = revisionFingerprint;
          nextSources.push(reusedSource);
          existingChunks.forEach(chunk => nextChunks.push(chunk));
          const journalEntry = astRagBuildIncrementalJournalEntryFromSource(reusedSource);
          if (journalEntry) {
            nextJournal[journalEntry.fileId] = journalEntry;
          }
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

        if (nextChunks.length + rebuiltChunks.length > normalizedRequest.options.maxChunks) {
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

        const syncedSource = astRagCreateSyncedSource(
          sourceDescriptor,
          sourceId,
          fingerprint,
          rebuiltChunks.length,
          revisionFingerprint
        );
        nextSources.push(syncedSource);
        const journalEntry = astRagBuildIncrementalJournalEntryFromSource(syncedSource);
        if (journalEntry) {
          nextJournal[journalEntry.fileId] = journalEntry;
        }

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
          const journalEntry = astRagBuildIncrementalJournalEntryFromSource(existingSource);
          if (journalEntry) {
            nextJournal[journalEntry.fileId] = journalEntry;
          }
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
          pendingEmbedChunks[idx].embeddingNorm = astRagVectorNorm(pendingEmbedChunks[idx].embedding);
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
      reembeddedChunks,
      journalSkippedSources
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
        journalSkippedSources,
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
        journalSkippedSources: result.journalSkippedSources,
        nextChunkCount: result.nextChunkCount,
        warningCount: warnings.length
      });
      return result;
    }

    const nextDocument = astRagBuildSyncedIndexDocument(
      current,
      normalizedRequest,
      nextSources,
      nextChunks.map(astRagEnsureChunkEmbeddingNorm),
      embedding,
      now,
      summary,
      nextJournal
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
      journalSkippedSources,
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
      journalSkippedSources: result.journalSkippedSources,
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
