const AST_TELEMETRY_STORAGE_SINK_BUFFERS = {};

function astTelemetryStorageNormalizeBaseUri(storageUri) {
  const normalized = astTelemetryNormalizeString(storageUri, null);
  if (!normalized) {
    throw new AstTelemetryCapabilityError(
      'storage_json telemetry sink requires non-empty storageUri'
    );
  }

  if (!/^gcs:\/\/|^s3:\/\/|^dbfs:\//i.test(normalized)) {
    throw new AstTelemetryCapabilityError(
      'Telemetry storageUri must use gcs://, s3://, or dbfs:/',
      { storageUri: normalized }
    );
  }

  return normalized.replace(/\/+$/, '');
}

function astTelemetryStorageJoinUri(baseUri, segments = []) {
  const cleaned = [baseUri]
    .concat(Array.isArray(segments) ? segments : [])
    .map(value => String(value || '').replace(/^\/+|\/+$/g, ''))
    .filter(Boolean);

  if (cleaned.length === 0) {
    return baseUri;
  }

  const head = String(cleaned[0] || '');
  const tail = cleaned.slice(1);
  if (tail.length === 0) {
    return head;
  }

  return `${head}/${tail.join('/')}`;
}

function astTelemetryStorageResolveBuffer(config = {}) {
  const baseUri = astTelemetryStorageNormalizeBaseUri(config.storageUri);
  const key = baseUri;
  if (!AST_TELEMETRY_STORAGE_SINK_BUFFERS[key]) {
    AST_TELEMETRY_STORAGE_SINK_BUFFERS[key] = {
      baseUri,
      records: [],
      bytes: 0
    };
  }
  return AST_TELEMETRY_STORAGE_SINK_BUFFERS[key];
}

function astTelemetryStorageBuildPartitionSegments(config = {}, now = new Date()) {
  const partitionByHour = astTelemetryNormalizeBoolean(config.partitionByHour, true);
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');

  if (!partitionByHour) {
    return ['events', year, month, day];
  }

  return ['events', year, month, day, hour];
}

function astTelemetryStorageBuildBatchUri(baseUri, config = {}, now = new Date()) {
  const segments = astTelemetryStorageBuildPartitionSegments(config, now);
  const batchId = astTelemetryGenerateId('telemetry_batch');
  return astTelemetryStorageJoinUri(baseUri, segments.concat([`${batchId}.ndjson`]));
}

function astTelemetryStorageBuildWriteRequest(uri, payloadText, config = {}) {
  const request = {
    operation: 'write',
    uri,
    payload: {
      text: payloadText,
      mimeType: 'application/x-ndjson',
      encoding: 'utf-8'
    },
    options: {
      overwrite: true,
      timeoutMs: astTelemetryNormalizeNumber(config.storageTimeoutMs, 45000, 1, 300000),
      retries: astTelemetryNormalizeNumber(config.storageRetries, 2, 0, 10),
      includeRaw: false
    }
  };

  if (astTelemetryIsPlainObject(config.storageAuth)) {
    request.auth = astTelemetryDeepClone(config.storageAuth);
  }

  if (astTelemetryIsPlainObject(config.storageProviderOptions)) {
    request.providerOptions = astTelemetryDeepClone(config.storageProviderOptions);
  }

  return request;
}

function astTelemetryStorageExecuteWrite(uri, payloadText, config = {}) {
  if (typeof runStorageRequest !== 'function') {
    throw new AstTelemetryCapabilityError(
      'runStorageRequest is required for telemetry storage_json sink'
    );
  }

  return runStorageRequest(astTelemetryStorageBuildWriteRequest(uri, payloadText, config));
}

function astTelemetryStorageFlushBuffer(config = {}, options = {}) {
  const force = astTelemetryNormalizeBoolean(options.force, false);
  const state = astTelemetryStorageResolveBuffer(config);
  const pending = state.records.length;

  if (pending === 0) {
    return {
      flushed: 0,
      pending: 0,
      bytes: 0,
      uri: null
    };
  }

  const flushMode = astTelemetryNormalizeString(config.flushMode, 'threshold');
  const canFlush = force || flushMode !== 'manual';
  if (!canFlush) {
    return {
      flushed: 0,
      pending,
      bytes: state.bytes,
      uri: null
    };
  }

  const payloadText = state.records.join('\n');
  const uri = astTelemetryStorageBuildBatchUri(state.baseUri, config, new Date());
  astTelemetryStorageExecuteWrite(uri, payloadText, config);

  const flushedCount = state.records.length;
  const flushedBytes = state.bytes;
  state.records = [];
  state.bytes = 0;

  return {
    flushed: flushedCount,
    pending: 0,
    bytes: flushedBytes,
    uri
  };
}

function astTelemetryStorageShouldFlush(config = {}, state) {
  const flushMode = astTelemetryNormalizeString(config.flushMode, 'threshold');
  if (flushMode === 'immediate') {
    return true;
  }
  if (flushMode === 'manual') {
    return false;
  }

  const batchMaxEvents = astTelemetryNormalizeNumber(config.batchMaxEvents, 25, 1, 10000);
  const batchMaxBytes = astTelemetryNormalizeNumber(config.batchMaxBytes, 65536, 512, 5 * 1024 * 1024);

  return state.records.length >= batchMaxEvents || state.bytes >= batchMaxBytes;
}

function astTelemetrySinkStorageJson(record, config = {}) {
  const state = astTelemetryStorageResolveBuffer(config);
  const line = astTelemetryTryOrFallback(
    () => JSON.stringify(record),
    '{"error":"telemetry-serialize-failed"}'
  );

  state.records.push(line);
  state.bytes += line.length + 1;

  if (astTelemetryStorageShouldFlush(config, state)) {
    astTelemetryStorageFlushBuffer(config, { force: true });
  }
}

function astTelemetryFlushStorageJson(config = {}, options = {}) {
  return astTelemetryStorageFlushBuffer(config, Object.assign({}, options, { force: true }));
}

const __astTelemetrySinkStorageRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astTelemetrySinkStorageRoot.astTelemetrySinkStorageJson = astTelemetrySinkStorageJson;
__astTelemetrySinkStorageRoot.astTelemetryFlushStorageJson = astTelemetryFlushStorageJson;
this.astTelemetrySinkStorageJson = astTelemetrySinkStorageJson;
this.astTelemetryFlushStorageJson = astTelemetryFlushStorageJson;
