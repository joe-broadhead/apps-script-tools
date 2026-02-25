const AST_TELEMETRY_DRIVE_SINK_BUFFERS = {};

function astTelemetryResetDriveSinkBuffers() {
  Object.keys(AST_TELEMETRY_DRIVE_SINK_BUFFERS).forEach(key => {
    delete AST_TELEMETRY_DRIVE_SINK_BUFFERS[key];
  });
}

function astTelemetryGetDriveFolder(config = {}) {
  if (typeof DriveApp === 'undefined' || !DriveApp) {
    throw new AstTelemetryCapabilityError('DriveApp is required for telemetry drive_json sink');
  }

  const folderId = astTelemetryNormalizeString(config.driveFolderId, null);
  if (!folderId) {
    if (typeof DriveApp.getRootFolder !== 'function') {
      throw new AstTelemetryCapabilityError('DriveApp.getRootFolder is not available');
    }
    return DriveApp.getRootFolder();
  }

  if (typeof DriveApp.getFolderById !== 'function') {
    throw new AstTelemetryCapabilityError('DriveApp.getFolderById is not available');
  }

  return DriveApp.getFolderById(folderId);
}

function astTelemetryDriveNormalizeBaseFileName(fileName) {
  const normalized = astTelemetryNormalizeString(fileName, 'ast-telemetry.ndjson');
  if (!normalized) {
    return 'ast-telemetry.ndjson';
  }
  return normalized;
}

function astTelemetryDriveResolveBuffer(config = {}) {
  const folderId = astTelemetryNormalizeString(config.driveFolderId, '__root__');
  const baseFileName = astTelemetryDriveNormalizeBaseFileName(config.driveFileName);
  const key = `${folderId}::${baseFileName}`;

  if (!AST_TELEMETRY_DRIVE_SINK_BUFFERS[key]) {
    AST_TELEMETRY_DRIVE_SINK_BUFFERS[key] = {
      key,
      folderId,
      baseFileName,
      records: [],
      bytes: 0
    };
  }

  return AST_TELEMETRY_DRIVE_SINK_BUFFERS[key];
}

function astTelemetryDriveBuildPartitionSegments(config = {}, now = new Date()) {
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

function astTelemetryDriveResolveChildFolder(parent, name) {
  if (
    !parent
    || typeof parent.getFoldersByName !== 'function'
    || typeof parent.createFolder !== 'function'
  ) {
    throw new AstTelemetryCapabilityError(
      'Drive folder handle does not support getFoldersByName/createFolder'
    );
  }

  const normalizedName = astTelemetryNormalizeString(name, null);
  if (!normalizedName) {
    throw new AstTelemetryCapabilityError('Drive child folder name is required');
  }

  const existing = parent.getFoldersByName(normalizedName);
  if (existing && typeof existing.hasNext === 'function' && existing.hasNext()) {
    return existing.next();
  }

  try {
    return parent.createFolder(normalizedName);
  } catch (error) {
    const fallback = parent.getFoldersByName(normalizedName);
    if (fallback && typeof fallback.hasNext === 'function' && fallback.hasNext()) {
      return fallback.next();
    }
    throw error;
  }
}

function astTelemetryDriveResolvePartitionFolder(baseFolder, config = {}, now = new Date()) {
  const segments = astTelemetryDriveBuildPartitionSegments(config, now);
  let current = baseFolder;

  for (let idx = 0; idx < segments.length; idx += 1) {
    current = astTelemetryDriveResolveChildFolder(current, segments[idx]);
  }

  return current;
}

function astTelemetryDriveBuildBatchFileName(baseFileName, now = new Date()) {
  const normalized = astTelemetryDriveNormalizeBaseFileName(baseFileName);
  const extensionMatch = normalized.match(/(\.[a-z0-9]+)$/i);
  const extension = extensionMatch ? extensionMatch[1] : '.ndjson';
  const stem = extensionMatch ? normalized.slice(0, -extension.length) : normalized;
  const timestamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
    String(now.getUTCHours()).padStart(2, '0'),
    String(now.getUTCMinutes()).padStart(2, '0'),
    String(now.getUTCSeconds()).padStart(2, '0')
  ].join('');
  const batchId = astTelemetryGenerateId('telemetry_batch');
  return `${stem}_${timestamp}_${batchId}${extension}`;
}

function astTelemetryDriveCreateBatchFile(folder, fileName, payloadText) {
  if (!folder || typeof folder.createFile !== 'function') {
    throw new AstTelemetryCapabilityError('Drive folder handle does not support createFile');
  }

  return folder.createFile(fileName, payloadText, 'application/x-ndjson');
}

function astTelemetryDriveShouldFlush(config = {}, state) {
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

function astTelemetryDriveFlushBuffer(config = {}, options = {}) {
  const force = astTelemetryNormalizeBoolean(options.force, false);
  const state = astTelemetryDriveResolveBuffer(config);
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
  if (!force && flushMode === 'manual') {
    return {
      flushed: 0,
      pending,
      bytes: state.bytes,
      uri: null
    };
  }

  const canFlush = force || astTelemetryDriveShouldFlush(config, state);
  if (!canFlush) {
    return {
      flushed: 0,
      pending,
      bytes: state.bytes,
      uri: null
    };
  }

  return astTelemetryRunDriveWriteWithLock(() => {
    const now = new Date();
    const baseFolder = astTelemetryGetDriveFolder(config);
    const partitionFolder = astTelemetryDriveResolvePartitionFolder(baseFolder, config, now);
    const fileName = astTelemetryDriveBuildBatchFileName(state.baseFileName, now);
    const payloadText = state.records.join('\n');
    const file = astTelemetryDriveCreateBatchFile(partitionFolder, fileName, payloadText);
    const flushed = state.records.length;
    const bytes = state.bytes;

    state.records = [];
    state.bytes = 0;

    const fileId = astTelemetryTryOrFallback(
      () => (file && typeof file.getId === 'function' ? String(file.getId() || '') : ''),
      ''
    );

    return {
      flushed,
      pending: 0,
      bytes,
      uri: fileId ? `drive://file/${fileId}` : null
    };
  }, config);
}

function astTelemetryRunDriveWriteWithLock(task, config = {}) {
  if (typeof task !== 'function') {
    throw new AstTelemetryCapabilityError('Telemetry drive sink task must be a function');
  }

  if (
    typeof LockService === 'undefined' ||
    !LockService ||
    typeof LockService.getScriptLock !== 'function'
  ) {
    return task();
  }

  const lock = LockService.getScriptLock();
  if (!lock || typeof lock.tryLock !== 'function') {
    return task();
  }

  const timeoutMs = astTelemetryNormalizeNumber(config.lockTimeoutMs, 30000, 1, 300000);
  const acquired = astTelemetryTryOrFallback(() => lock.tryLock(timeoutMs), false);
  if (!acquired) {
    throw new AstTelemetryCapabilityError('Unable to acquire telemetry drive sink lock', {
      timeoutMs
    });
  }

  try {
    return task();
  } finally {
    if (typeof lock.releaseLock === 'function') {
      astTelemetryTryOrFallback(() => lock.releaseLock(), null);
    }
  }
}

function astTelemetrySinkDriveJson(record, config = {}) {
  const line = astTelemetryTryOrFallback(
    () => JSON.stringify(record),
    '{"error":"telemetry-serialize-failed"}'
  );

  const state = astTelemetryDriveResolveBuffer(config);
  state.records.push(line);
  state.bytes += line.length + 1;

  if (astTelemetryDriveShouldFlush(config, state)) {
    astTelemetryDriveFlushBuffer(config, { force: true });
  }
}

function astTelemetryFlushDriveJson(config = {}, options = {}) {
  return astTelemetryDriveFlushBuffer(config, Object.assign({}, options, { force: true }));
}

const __astTelemetrySinkDriveRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astTelemetrySinkDriveRoot.astTelemetrySinkDriveJson = astTelemetrySinkDriveJson;
__astTelemetrySinkDriveRoot.astTelemetryFlushDriveJson = astTelemetryFlushDriveJson;
__astTelemetrySinkDriveRoot.astTelemetryResetDriveSinkBuffers = astTelemetryResetDriveSinkBuffers;
this.astTelemetrySinkDriveJson = astTelemetrySinkDriveJson;
this.astTelemetryFlushDriveJson = astTelemetryFlushDriveJson;
this.astTelemetryResetDriveSinkBuffers = astTelemetryResetDriveSinkBuffers;
