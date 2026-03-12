function ensureSharedIndex_(ASTX, runtime, cfg, request, options) {
  request = request || {};
  options = options || {};
  cfg = cfg || resolveAppConfig_(request);
  var allowMutate = options.allowMutate !== false;

  var started = Date.now();
  var settings = resolveIndexSettings_(cfg, request);
  var props = PropertiesService.getScriptProperties();

  if (!allowMutate && request.forceRebuild) {
    throw new Error('Index rebuild requires admin privileges.');
  }

  if (settings.indexFileId && !request.forceRebuild) {
    try {
      var reused = inspectIndexWithCache_(ASTX, cfg, settings.indexFileId);
      return {
        indexFileId: settings.indexFileId,
        indexInfo: reused,
        pendingJob: null,
        execution: {
          mode: 'reused',
          serverMs: Date.now() - started
        }
      };
    } catch (inspectError) {
      if (!allowMutate) {
        throw new Error('Configured index is unavailable. Ask an admin to sync/rebuild the index.');
      }

      Logger.log(
        '[rag_chat_app] Existing index inspect failed. Rebuilding index if source is available. Error: ' +
          (inspectError && inspectError.message ? inspectError.message : String(inspectError))
      );
      props.deleteProperty('RAG_INDEX_FILE_ID');
      settings.indexFileId = '';
    }
  }

  var activeJob = getCurrentIndexJobState_(ASTX, cfg);
  if (activeJob && !request.forceRebuild) {
    if (activeJob.indexFileId) {
      try {
        var jobReused = inspectIndexWithCache_(ASTX, cfg, activeJob.indexFileId);
        return {
          indexFileId: activeJob.indexFileId,
          indexInfo: jobReused,
          pendingJob: null,
          execution: {
            mode: 'job_completed',
            serverMs: Date.now() - started
          }
        };
      } catch (_inspectError) {
        props.deleteProperty('RAG_INDEX_FILE_ID');
      }
    }

    if (
      allowMutate &&
      cfg.runtime &&
      cfg.runtime.indexAutoResumeOnInit === true &&
      (activeJob.status === 'queued' || activeJob.status === 'paused')
    ) {
      var resumed = resumeIndexMutationJob_(ASTX, cfg, activeJob.id);
      activeJob = normalizeIndexJobStatus_(resumed);
      activeJob.indexFileId = extractIndexFileIdFromJobRecord_(resumed);

      if (activeJob.status === 'completed' && activeJob.indexFileId) {
        var resumedInfo = inspectIndexWithCache_(ASTX, cfg, activeJob.indexFileId);
        return {
          indexFileId: activeJob.indexFileId,
          indexInfo: resumedInfo,
          pendingJob: null,
          execution: {
            mode: 'job_resumed_completed',
            serverMs: Date.now() - started
          }
        };
      }
    }

    if (activeJob.status === 'running' || activeJob.status === 'queued' || activeJob.status === 'paused') {
      return {
        indexFileId: '',
        indexInfo: null,
        pendingJob: activeJob,
        execution: {
          mode: 'job_pending',
          serverMs: Date.now() - started
        }
      };
    }
  }

  if (!settings.indexFileId && !settings.folderId) {
    throw new Error('Missing index source. Set RAG_INDEX_FILE_ID or RAG_SOURCE_FOLDER_ID.');
  }

  if (!allowMutate && !settings.indexFileId) {
    throw new Error(
      'RAG index is not initialized. Ask an admin to run index sync/rebuild (and configure WEBAPP_ADMIN_EMAILS if needed).'
    );
  }

  if (!settings.indexFileId && !cfg.rag.autoBuildIndex) {
    throw new Error('Index is missing and auto build is disabled. Set RAG_INDEX_FILE_ID or enable RAG_AUTO_BUILD_INDEX.');
  }

  if (request.forceRebuild) {
    var mutationNow = runIndexMutationNow_(ASTX, runtime, cfg, settings, request);
    return {
      indexFileId: mutationNow.indexFileId,
      indexInfo: mutationNow.indexInfo,
      indexOperation: mutationNow.indexOperation,
      pendingJob: null,
      execution: {
        mode: mutationNow.mode,
        serverMs: Date.now() - started
      }
    };
  }

  if (!allowMutate) {
    throw new Error('RAG index is currently being prepared. Please try again shortly.');
  }

  var queuedJob = enqueueIndexMutationJob_(ASTX, runtime, cfg, settings, request);
  var queuedSummary = normalizeIndexJobStatus_(queuedJob);

  if (cfg.runtime && cfg.runtime.indexAutoResumeOnInit === true) {
    var resumedJob = resumeIndexMutationJob_(ASTX, cfg, queuedSummary.id);
    var resumedSummary = normalizeIndexJobStatus_(resumedJob);
    var resumedIndexFileId = extractIndexFileIdFromJobRecord_(resumedJob);

    if (resumedSummary.status === 'completed' && resumedIndexFileId) {
      var resumedIndexInfo = inspectIndexWithCache_(ASTX, cfg, resumedIndexFileId);
      return {
        indexFileId: resumedIndexFileId,
        indexInfo: resumedIndexInfo,
        indexOperation: extractIndexOperationFromJobRecord_(resumedJob),
        pendingJob: null,
        execution: {
          mode: 'job_completed_inline',
          serverMs: Date.now() - started
        }
      };
    }

    return {
      indexFileId: '',
      indexInfo: null,
      pendingJob: resumedSummary,
      execution: {
        mode: 'job_resumed_pending',
        serverMs: Date.now() - started
      }
    };
  }

  return {
    indexFileId: '',
    indexInfo: null,
    pendingJob: queuedSummary,
    execution: {
      mode: 'job_queued',
      serverMs: Date.now() - started
    }
  };
}

function syncSharedIndex_(ASTX, runtime, cfg, request, options) {
  request = request || {};
  cfg = cfg || resolveAppConfig_(request);

  // Sync should prefer incremental mutation when an index exists.
  // Rebuild is a separate explicit action handled via forceRebuild.
  request.forceRebuild = request.forceRebuild === true;

  return ensureSharedIndex_(ASTX, runtime, cfg, request, options);
}

function runIndexMutationNow_(ASTX, runtime, cfg, settings, request) {
  request = request || {};
  var mutation = buildIndexMutationRequest_(runtime, settings, request);
  var out;
  var mode;

  // Rebuild should perform a clean build, even when an indexFileId already exists.
  if (request.forceRebuild) {
    mode = 'rebuild';
    out = ASTX.RAG.buildIndex(mutation.buildRequest);
  } else if (settings.indexFileId) {
    mode = 'sync';
    out = ASTX.RAG.syncIndex(mutation.syncRequest);
  } else {
    mode = 'build';
    out = ASTX.RAG.buildIndex(mutation.buildRequest);
  }

  var indexFileId = stringOrEmpty_(out && out.indexFileId) || settings.indexFileId;
  if (!indexFileId) {
    throw new Error('Index operation did not return an indexFileId.');
  }

  var props = PropertiesService.getScriptProperties();
  props.setProperty('RAG_INDEX_FILE_ID', indexFileId);
  clearCurrentIndexJob_();

  var indexInfo = compactIndexInfo_(ASTX.RAG.inspectIndex({ indexFileId: indexFileId }));
  putIndexInfoCache_(ASTX, cfg, indexFileId, indexInfo);
  if (typeof recordIndexMutationMetric_ === 'function') {
    recordIndexMutationMetric_(ASTX, cfg, {
      mode: mode,
      indexFileId: indexFileId,
      sourceCount: indexInfo.sourceCount,
      chunkCount: indexInfo.chunkCount,
      failed: false
    });
  }

  return {
    mode: mode,
    indexFileId: indexFileId,
    indexInfo: indexInfo,
    indexOperation: out || null
  };
}

function buildIndexMutationRequest_(runtime, settings, request) {
  request = request || {};
  return {
    buildRequest: {
      source: buildRagSourceRequest_(request, settings.folderId),
      index: {
        indexName: settings.indexName,
        destinationFolderId: stringOrEmpty_(request.destinationFolderId) || undefined
      },
      embedding: {
        provider: runtime.embeddingProvider,
        model: runtime.embeddingModel
      },
      chunking: {
        chunkSizeChars: integerOr_(request.chunkSizeChars, 1200),
        chunkOverlapChars: integerOr_(request.chunkOverlapChars, 200),
        minChunkChars: integerOr_(request.minChunkChars, 180)
      },
      options: {
        maxFiles: integerOr_(request.maxFiles, 300),
        maxChunks: integerOr_(request.maxChunks, 2000),
        skipParseFailures: request.skipParseFailures !== false
      },
      auth: runtime.embeddingAuth
    },
    syncRequest: {
      index: {
        indexFileId: settings.indexFileId,
        indexName: settings.indexName
      },
      source: buildRagSourceRequest_(request, settings.folderId),
      embedding: {
        provider: runtime.embeddingProvider,
        model: runtime.embeddingModel
      },
      chunking: {
        chunkSizeChars: integerOr_(request.chunkSizeChars, 1200),
        chunkOverlapChars: integerOr_(request.chunkOverlapChars, 200),
        minChunkChars: integerOr_(request.minChunkChars, 180)
      },
      options: {
        maxFiles: integerOr_(request.maxFiles, 300),
        maxChunks: integerOr_(request.maxChunks, 2000),
        skipParseFailures: request.skipParseFailures !== false
      },
      auth: runtime.embeddingAuth
    }
  };
}

function resolveCurrentIndexJobId_() {
  try {
    return stringOrEmpty_(PropertiesService.getScriptProperties().getProperty('RAG_INDEX_JOB_ID'));
  } catch (_error) {
    return '';
  }
}

function updateCurrentIndexJob_(jobId) {
  if (!jobId) return;
  try {
    PropertiesService.getScriptProperties().setProperty('RAG_INDEX_JOB_ID', String(jobId));
  } catch (_error) {
    // ignore property write failures for cookbook resiliency
  }
}

function clearCurrentIndexJob_() {
  try {
    PropertiesService.getScriptProperties().deleteProperty('RAG_INDEX_JOB_ID');
  } catch (_error) {
    // ignore property cleanup failures
  }
}

function resolveIndexJobOptions_(cfg) {
  cfg = cfg || RAG_CHAT_DEFAULTS;
  var runtime = cfg.runtime || RAG_CHAT_DEFAULTS.runtime;
  return {
    propertyPrefix: firstNonEmpty_([
      runtime.indexJobPropertyPrefix,
      RAG_CHAT_DEFAULTS.runtime.indexJobPropertyPrefix
    ]),
    maxRuntimeMs: Math.max(1000, integerOr_(runtime.indexJobMaxRuntimeMs, RAG_CHAT_DEFAULTS.runtime.indexJobMaxRuntimeMs)),
    maxRetries: Math.max(0, integerOr_(runtime.indexJobMaxRetries, RAG_CHAT_DEFAULTS.runtime.indexJobMaxRetries))
  };
}

function normalizeIndexJobStatus_(jobRecord) {
  jobRecord = jobRecord || {};
  return {
    id: stringOrEmpty_(jobRecord.id),
    status: stringOrEmpty_(jobRecord.status) || 'unknown',
    createdAt: stringOrEmpty_(jobRecord.createdAt),
    updatedAt: stringOrEmpty_(jobRecord.updatedAt),
    startedAt: stringOrEmpty_(jobRecord.startedAt),
    completedAt: stringOrEmpty_(jobRecord.completedAt),
    pausedAt: stringOrEmpty_(jobRecord.pausedAt),
    canceledAt: stringOrEmpty_(jobRecord.canceledAt),
    lastError: jobRecord.lastError || null
  };
}

function extractIndexFileIdFromJobRecord_(jobRecord) {
  jobRecord = jobRecord || {};
  var results = jobRecord.results || {};

  var finalize = results.finalize || {};
  var mutate = results.mutate || {};

  return firstNonEmpty_([
    finalize.indexFileId,
    mutate.indexFileId,
    mutate.indexOperation && mutate.indexOperation.indexFileId
  ]);
}

function extractIndexOperationFromJobRecord_(jobRecord) {
  jobRecord = jobRecord || {};
  var results = jobRecord.results || {};
  var mutate = results.mutate || {};
  return mutate.indexOperation || null;
}

function getCurrentIndexJobState_(ASTX, cfg) {
  var currentJobId = resolveCurrentIndexJobId_();
  if (!currentJobId) return null;

  var jobOptions = resolveIndexJobOptions_(cfg);
  var current;
  try {
    current = ASTX.Jobs.status(currentJobId, {
      propertyPrefix: jobOptions.propertyPrefix
    });
  } catch (_error) {
    clearCurrentIndexJob_();
    return null;
  }

  var summary = normalizeIndexJobStatus_(current);
  summary.indexFileId = extractIndexFileIdFromJobRecord_(current);

  if (summary.status === 'completed') {
    if (summary.indexFileId) {
      try {
        PropertiesService.getScriptProperties().setProperty('RAG_INDEX_FILE_ID', summary.indexFileId);
      } catch (_e) {
        // ignore script properties write failures
      }
    }
    clearCurrentIndexJob_();
  }

  if (summary.status === 'failed' || summary.status === 'canceled') {
    clearCurrentIndexJob_();
  }

  return summary;
}

function enqueueIndexMutationJob_(ASTX, runtime, cfg, settings, request) {
  request = request || {};

  var current = getCurrentIndexJobState_(ASTX, cfg);
  if (current && (current.status === 'queued' || current.status === 'running' || current.status === 'paused')) {
    return ASTX.Jobs.status(current.id, {
      propertyPrefix: resolveIndexJobOptions_(cfg).propertyPrefix
    });
  }

  var jobOptions = resolveIndexJobOptions_(cfg);
  var mutation = buildIndexMutationRequest_(runtime, settings, request);

  // forceRebuild should do a clean build even when an indexFileId already exists.
  var shouldBuild = Boolean(request.forceRebuild) || !settings.indexFileId;
  var method = shouldBuild ? 'buildIndex' : 'syncIndex';
  var methodRequest = shouldBuild ? mutation.buildRequest : mutation.syncRequest;

  // Avoid persisting short-lived auth tokens inside job payload. Resolve auth at execution time.
  if (methodRequest && typeof methodRequest === 'object' && Object.prototype.hasOwnProperty.call(methodRequest, 'auth')) {
    delete methodRequest.auth;
  }

  var queued = ASTX.Jobs.enqueue({
    name: 'rag_chat_index_' + (shouldBuild ? 'build' : 'sync'),
    options: {
      maxRuntimeMs: jobOptions.maxRuntimeMs,
      maxRetries: jobOptions.maxRetries,
      propertyPrefix: jobOptions.propertyPrefix
    },
    steps: [
      {
        id: 'mutate',
        handler: 'ragChatIndexJobRunMutationStep_',
        payload: {
          method: method,
          request: methodRequest
        }
      },
      {
        id: 'finalize',
        handler: 'ragChatIndexJobFinalizeStep_',
        dependsOn: ['mutate']
      }
    ]
  });

  updateCurrentIndexJob_(queued.id);
  return queued;
}

function resumeIndexMutationJob_(ASTX, cfg, jobId) {
  var normalizedJobId = stringOrEmpty_(jobId);
  if (!normalizedJobId) {
    throw new Error('Missing index job id.');
  }

  var options = resolveIndexJobOptions_(cfg);

  try {
    return ASTX.Jobs.resume(normalizedJobId, {
      propertyPrefix: options.propertyPrefix
    });
  } catch (error) {
    var message = stringOrEmpty_(error && error.message).toLowerCase();
    if (message.indexOf('already running') > -1) {
      return ASTX.Jobs.status(normalizedJobId, {
        propertyPrefix: options.propertyPrefix
      });
    }
    throw error;
  }
}

function ragChatIndexJobRunMutationStep_(stepContext) {
  var payload = (stepContext && stepContext.payload) || {};
  var method = stringOrEmpty_(payload.method);
  var request = payload.request || {};

  var ASTX = getAst_();
  if (!ASTX || !ASTX.RAG || typeof ASTX.RAG[method] !== 'function') {
    throw new Error('Invalid RAG job method: ' + method);
  }

  // Resolve auth at step execution time (queued jobs should not serialize short-lived tokens).
  if (!request.auth) {
    var runtime = resolveRuntime_({});
    request.auth = runtime && runtime.embeddingAuth ? runtime.embeddingAuth : {};
  }

  var result = ASTX.RAG[method](request);
  var indexFileId = firstNonEmpty_([
    result && result.indexFileId,
    request && request.indexFileId,
    request && request.index && request.index.indexFileId
  ]);

  return {
    method: method,
    indexFileId: indexFileId,
    indexOperation: result || null
  };
}

function ragChatIndexJobFinalizeStep_(stepContext) {
  var results = (stepContext && stepContext.results) || {};
  var mutate = results.mutate || {};
  var indexFileId = firstNonEmpty_([
    mutate.indexFileId,
    mutate.indexOperation && mutate.indexOperation.indexFileId
  ]);

  if (!indexFileId) {
    throw new Error('Index job did not produce indexFileId.');
  }

  var props = PropertiesService.getScriptProperties();
  props.setProperty('RAG_INDEX_FILE_ID', indexFileId);
  props.deleteProperty('RAG_INDEX_JOB_ID');

  var ASTX = getAst_();
  var cfg = resolveAppConfig_({});
  var indexInfo = compactIndexInfo_(ASTX.RAG.inspectIndex({ indexFileId: indexFileId }));
  putIndexInfoCache_(ASTX, cfg, indexFileId, indexInfo);

  if (typeof recordIndexMutationMetric_ === 'function') {
    recordIndexMutationMetric_(ASTX, cfg, {
      mode: stringOrEmpty_(mutate.method),
      indexFileId: indexFileId,
      sourceCount: indexInfo.sourceCount,
      chunkCount: indexInfo.chunkCount,
      failed: false
    });
  }

  return {
    indexFileId: indexFileId,
    indexInfo: indexInfo
  };
}

function resolveIndexSettings_(cfg, request) {
  request = request || {};
  cfg = cfg || {};
  var props = PropertiesService.getScriptProperties().getProperties();
  var rag = cfg.rag || {};

  return {
    indexFileId: firstNonEmpty_([
      request.indexFileId,
      props.RAG_INDEX_FILE_ID
    ]),
    folderId: firstNonEmpty_([
      request.folderId,
      props.RAG_SOURCE_FOLDER_ID,
      props.RAG_TEST_SOURCE_FOLDER_ID,
      props.RAG_TEST_FOLDER_ID
    ]),
    indexName: firstNonEmpty_([
      request.indexName,
      props.RAG_INDEX_NAME,
      rag.indexName,
      RAG_CHAT_DEFAULTS.rag.indexName
    ])
  };
}

function buildRagSourceRequest_(request, folderId) {
  request = request || {};
  var supportedMimeTypes = [
    'text/plain',
    'application/pdf',
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.presentation'
  ];
  var includeMimeTypes = normalizeCookbookMimeTypes_(
    request && request.includeMimeTypes,
    supportedMimeTypes
  );

  return {
    folderId: folderId,
    includeSubfolders: request.includeSubfolders !== false,
    includeMimeTypes: includeMimeTypes,
    excludeFileIds: request.excludeFileIds || []
  };
}

function normalizeCookbookMimeTypes_(value, defaults) {
  defaults = Array.isArray(defaults) ? defaults : [];
  if (typeof value === 'undefined' || value === null) {
    return defaults.slice();
  }

  var raw = value;
  if (typeof raw === 'string') {
    raw = raw.split(',');
  }

  if (!Array.isArray(raw)) {
    return defaults.slice();
  }

  var supportedSet = {};
  var i;
  for (i = 0; i < defaults.length; i += 1) {
    supportedSet[defaults[i]] = true;
  }

  var out = [];
  var outSet = {};
  var unsupported = [];

  for (i = 0; i < raw.length; i += 1) {
    var mime = stringOrEmpty_(raw[i]).trim();
    if (!mime) continue;
    if (supportedSet[mime]) {
      if (!outSet[mime]) {
        out.push(mime);
        outSet[mime] = true;
      }
    } else {
      unsupported.push(mime);
    }
  }

  if (unsupported.length > 0) {
    Logger.log(
      '[rag_chat_app] Ignoring unsupported mime types: ' + unsupported.join(', ')
    );
  }

  if (!out.length) {
    return defaults.slice();
  }

  return out;
}

function inspectIndexWithCache_(ASTX, cfg, indexFileId) {
  var cached = getIndexInfoCache_(ASTX, cfg, indexFileId);
  if (cached) return cached;

  var info = compactIndexInfo_(ASTX.RAG.inspectIndex({ indexFileId: indexFileId }));
  putIndexInfoCache_(ASTX, cfg, indexFileId, info);
  return info;
}

function compactIndexInfo_(info) {
  info = info || {};
  return {
    indexFileId: stringOrEmpty_(info.indexFileId),
    indexName: stringOrEmpty_(info.indexName),
    schemaVersion: stringOrEmpty_(info.schemaVersion),
    embedding: info.embedding || null,
    chunking: info.chunking || null,
    sourceCount: integerOr_(info.sourceCount, 0),
    chunkCount: integerOr_(info.chunkCount, 0),
    createdAt: stringOrEmpty_(info.createdAt),
    updatedAt: stringOrEmpty_(info.updatedAt)
  };
}

function indexInfoCacheKey_(indexFileId) {
  return 'index_info:' + stringOrEmpty_(indexFileId);
}

function getIndexInfoCache_(ASTX, cfg, indexFileId) {
  var key = indexInfoCacheKey_(indexFileId);
  if (!key) return null;
  try {
    return ASTX.Cache.get(key, buildCacheOptions_(cfg, cfg.cache.namespace + '_index', {
      updateStatsOnGet: false
    }));
  } catch (_e) {
    return null;
  }
}

function putIndexInfoCache_(ASTX, cfg, indexFileId, value) {
  var key = indexInfoCacheKey_(indexFileId);
  if (!key || !value) return;
  try {
    ASTX.Cache.set(key, value, buildCacheOptions_(cfg, cfg.cache.namespace + '_index', {
      ttlSec: 60 * 15
    }));
  } catch (_e) {
    // ignore cache issues for cookbook resiliency
  }
}
