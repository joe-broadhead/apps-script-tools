function astCacheDriveGetFolder(config) {
  if (typeof DriveApp === 'undefined' || !DriveApp) {
    throw new AstCacheCapabilityError('DriveApp is required for cache drive_json backend');
  }

  const folderId = astCacheNormalizeString(config.driveFolderId, '');
  if (!folderId) {
    if (typeof DriveApp.getRootFolder !== 'function') {
      throw new AstCacheCapabilityError('DriveApp.getRootFolder is not available');
    }
    return DriveApp.getRootFolder();
  }

  if (typeof DriveApp.getFolderById !== 'function') {
    throw new AstCacheCapabilityError('DriveApp.getFolderById is not available');
  }

  return DriveApp.getFolderById(folderId);
}

function astCacheDriveResolveFile(folder, fileName, options = {}) {
  if (!folder || typeof folder.getFilesByName !== 'function') {
    throw new AstCacheCapabilityError('Cache drive_json folder handle does not support getFilesByName');
  }

  const createIfMissing = options.createIfMissing !== false;
  const iterator = folder.getFilesByName(fileName);
  if (iterator && typeof iterator.hasNext === 'function' && iterator.hasNext()) {
    return iterator.next();
  }

  if (!createIfMissing) {
    return null;
  }

  if (typeof folder.createFile !== 'function') {
    throw new AstCacheCapabilityError('Cache drive_json folder handle does not support createFile');
  }

  return folder.createFile(fileName, '', 'application/json');
}

function astCacheDriveNamespaceFileName(config) {
  const baseFileName = astCacheNormalizeString(
    config && config.driveFileName,
    'ast-cache-drive.json'
  );
  const namespace = astCacheNormalizeString(config && config.namespace, 'ast_cache');

  let namespaceHash = 'namespace';
  try {
    namespaceHash = astCacheHashKey(namespace).slice(0, 16);
  } catch (_error) {
    namespaceHash = namespace.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().slice(0, 32) || 'namespace';
  }

  const extensionIndex = baseFileName.lastIndexOf('.');
  if (extensionIndex <= 0 || extensionIndex === baseFileName.length - 1) {
    return `${baseFileName}--${namespaceHash}`;
  }

  return `${baseFileName.slice(0, extensionIndex)}--${namespaceHash}${baseFileName.slice(extensionIndex)}`;
}

function astCacheDriveReadText(file) {
  if (!file) {
    return '';
  }

  if (typeof file.getBlob === 'function') {
    const blob = file.getBlob();
    if (blob && typeof blob.getDataAsString === 'function') {
      return String(blob.getDataAsString() || '');
    }
  }

  if (typeof file.getDataAsString === 'function') {
    return String(file.getDataAsString() || '');
  }

  return '';
}

function astCacheDriveWriteText(file, content) {
  if (!file) {
    throw new AstCacheCapabilityError('Cache drive_json file handle is not available');
  }

  if (typeof file.setContent === 'function') {
    file.setContent(content);
    return;
  }

  if (typeof file.setDataFromString === 'function') {
    file.setDataFromString(content);
    return;
  }

  throw new AstCacheCapabilityError('Cache drive_json file handle does not support content updates');
}

function astCacheDriveUtf8ByteLength(value) {
  const normalized = String(value == null ? '' : value);

  try {
    if (
      typeof Utilities !== 'undefined' &&
      Utilities &&
      typeof Utilities.newBlob === 'function'
    ) {
      return Utilities.newBlob(normalized).getBytes().length;
    }
  } catch (_error) {
    // Fall through to deterministic JavaScript fallback.
  }

  try {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(normalized).length;
    }
  } catch (_error) {
    // Fall through to deterministic JavaScript fallback.
  }

  return unescape(encodeURIComponent(normalized)).length;
}

function astCacheDriveEmitNamespaceSizeWarning(config, details) {
  const message = `Cache drive_json namespace '${config.namespace}' size warning: ${details.bytes} bytes exceeds ${details.warnBytes} bytes`;
  if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
    console.warn(message);
    return;
  }

  if (typeof Logger !== 'undefined' && Logger && typeof Logger.warn === 'function') {
    Logger.warn(message);
    return;
  }

  if (typeof Logger !== 'undefined' && Logger && typeof Logger.log === 'function') {
    Logger.log(message);
  }
}

function astCacheDriveAssertNamespaceSize(config, document, serialized) {
  const payload = typeof serialized === 'string'
    ? serialized
    : JSON.stringify(document);
  const bytes = astCacheDriveUtf8ByteLength(payload);
  const warnBytes = astCacheNormalizePositiveInt(
    config && config.driveNamespaceWarnBytes,
    2000000,
    1024,
    50000000
  );
  const limitBytes = astCacheNormalizePositiveInt(
    config && config.driveNamespaceMaxBytes,
    5000000,
    2048,
    50000000
  );

  if (bytes > limitBytes) {
    throw new AstCacheValidationError(
      'Cache drive_json namespace exceeds configured byte limit',
      {
        backend: 'drive_json',
        namespace: config.namespace,
        bytes,
        limitBytes
      }
    );
  }

  if (bytes > warnBytes) {
    astCacheDriveEmitNamespaceSizeWarning(config, {
      backend: 'drive_json',
      namespace: config.namespace,
      bytes,
      warnBytes
    });
  }
}

function astCacheDriveRunWithLock(task, config) {
  return astCacheRunWithLock(task, config);
}

function astCacheDriveDefaultDocument(namespace) {
  return {
    schemaVersion: '1.0',
    namespace,
    updatedAtMs: astCacheNowMs(),
    entries: {},
    stats: {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      invalidations: 0,
      evictions: 0,
      expired: 0
    }
  };
}

function astCacheDriveReadDocument(config, options = {}) {
  const folder = astCacheDriveGetFolder(config);
  const fileName = astCacheDriveNamespaceFileName(config);
  const file = astCacheDriveResolveFile(folder, fileName, options);

  if (!file) {
    return {
      file: null,
      document: astCacheDriveDefaultDocument(config.namespace)
    };
  }
  const raw = astCacheDriveReadText(file);

  if (!raw) {
    return {
      file,
      document: astCacheDriveDefaultDocument(config.namespace)
    };
  }

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (_error) {
    parsed = astCacheDriveDefaultDocument(config.namespace);
  }

  const document = astCacheIsPlainObject(parsed)
    ? parsed
    : astCacheDriveDefaultDocument(config.namespace);

  if (!astCacheIsPlainObject(document.entries)) {
    document.entries = {};
  }

  if (!astCacheIsPlainObject(document.stats)) {
    document.stats = astCacheDriveDefaultDocument(config.namespace).stats;
  }

  document.namespace = astCacheNormalizeString(document.namespace, config.namespace);
  document.schemaVersion = astCacheNormalizeString(document.schemaVersion, '1.0');
  document.updatedAtMs = astCacheNormalizePositiveInt(
    document.updatedAtMs,
    astCacheNowMs(),
    0,
    9007199254740991
  );

  return {
    file,
    document
  };
}

function astCacheDriveWriteDocument(file, document, config) {
  const serialized = JSON.stringify(document);
  astCacheDriveAssertNamespaceSize(config || {}, document, serialized);
  astCacheDriveWriteText(file, serialized);
}

function astCacheDrivePruneExpired(document, nowMs) {
  const keys = Object.keys(document.entries || {});
  let removed = 0;

  for (let idx = 0; idx < keys.length; idx += 1) {
    const keyHash = keys[idx];
    const entry = document.entries[keyHash];
    if (!astCacheIsExpired(entry, nowMs)) {
      continue;
    }
    delete document.entries[keyHash];
    removed += 1;
  }

  if (removed > 0) {
    document.stats.expired = (document.stats.expired || 0) + removed;
  }

  return removed;
}

function astCacheDriveTrimToMaxEntries(document, maxEntries) {
  const keys = Object.keys(document.entries || {});
  if (keys.length <= maxEntries) {
    return 0;
  }

  keys.sort((left, right) => {
    const leftStamp = Number(document.entries[left] && document.entries[left].updatedAtMs || 0);
    const rightStamp = Number(document.entries[right] && document.entries[right].updatedAtMs || 0);
    return leftStamp - rightStamp;
  });

  const overflow = keys.length - maxEntries;
  let removed = 0;
  for (let idx = 0; idx < overflow; idx += 1) {
    delete document.entries[keys[idx]];
    removed += 1;
  }

  if (removed > 0) {
    document.stats.evictions = (document.stats.evictions || 0) + removed;
  }

  return removed;
}

function astCacheDriveWithDocument(config, mutator) {
  return astCacheDriveRunWithLock(() => {
    const loaded = astCacheDriveReadDocument(config);
    const file = loaded.file;
    const document = loaded.document;
    const nowMs = astCacheNowMs();

    astCacheDrivePruneExpired(document, nowMs);
    const result = mutator(document, nowMs);
    document.updatedAtMs = nowMs;
    astCacheDriveWriteDocument(file, document, config);
    return result;
  }, config);
}

function astCacheDriveGet(keyHash, config) {
  if (config.updateStatsOnGet === false) {
    const loaded = astCacheDriveReadDocument(config, { createIfMissing: false });
    const nowMs = astCacheNowMs();
    const entry = loaded.document.entries[keyHash];
    if (!entry || astCacheIsExpired(entry, nowMs)) {
      return null;
    }
    return astCacheJsonClone(entry);
  }

  return astCacheDriveWithDocument(config, (document, nowMs) => {
    const entry = document.entries[keyHash];
    if (!entry) {
      document.stats.misses = (document.stats.misses || 0) + 1;
      return null;
    }

    if (astCacheIsExpired(entry, nowMs)) {
      delete document.entries[keyHash];
      document.stats.expired = (document.stats.expired || 0) + 1;
      document.stats.misses = (document.stats.misses || 0) + 1;
      return null;
    }

    document.stats.hits = (document.stats.hits || 0) + 1;
    return astCacheJsonClone(entry);
  });
}

function astCacheDriveSet(entry, config) {
  return astCacheDriveWithDocument(config, (document, nowMs) => {
    const nextEntry = astCacheTouchEntry(entry, nowMs);
    document.entries[nextEntry.keyHash] = nextEntry;
    document.stats.sets = (document.stats.sets || 0) + 1;
    astCacheDriveTrimToMaxEntries(document, config.maxMemoryEntries);
    return astCacheJsonClone(nextEntry);
  });
}

function astCacheDriveDelete(keyHash, config) {
  return astCacheDriveWithDocument(config, (document) => {
    if (!document.entries[keyHash]) {
      return false;
    }

    delete document.entries[keyHash];
    document.stats.deletes = (document.stats.deletes || 0) + 1;
    return true;
  });
}

function astCacheDriveDeleteMany(keyHashes, config) {
  const safeKeyHashes = Array.isArray(keyHashes)
    ? keyHashes
      .map(value => astCacheNormalizeString(value, ''))
      .filter(Boolean)
    : [];
  if (safeKeyHashes.length === 0) {
    return 0;
  }

  return astCacheDriveWithDocument(config, (document) => {
    let removed = 0;
    for (let idx = 0; idx < safeKeyHashes.length; idx += 1) {
      const keyHash = safeKeyHashes[idx];
      if (!document.entries[keyHash]) {
        continue;
      }
      delete document.entries[keyHash];
      removed += 1;
    }
    if (removed > 0) {
      document.stats.deletes = (document.stats.deletes || 0) + removed;
    }
    return removed;
  });
}

function astCacheDriveRecordInvalidations(count, config) {
  const safeCount = astCacheNormalizePositiveInt(count, 0, 0, 1000000);
  if (safeCount <= 0) {
    return 0;
  }

  return astCacheDriveWithDocument(config, (document) => {
    document.stats.invalidations = (document.stats.invalidations || 0) + safeCount;
    return safeCount;
  });
}

function astCacheDriveInvalidateByTag(tag, config) {
  const normalizedTag = astCacheNormalizeString(tag, '');
  if (!normalizedTag) {
    throw new AstCacheValidationError('Cache invalidateByTag tag must be a non-empty string');
  }

  return astCacheDriveWithDocument(config, (document) => {
    const keys = Object.keys(document.entries || {});
    let removed = 0;

    for (let idx = 0; idx < keys.length; idx += 1) {
      const keyHash = keys[idx];
      const entry = document.entries[keyHash];
      if (!entry || !Array.isArray(entry.tags) || entry.tags.indexOf(normalizedTag) === -1) {
        continue;
      }

      delete document.entries[keyHash];
      removed += 1;
    }

    document.stats.invalidations = (document.stats.invalidations || 0) + removed;
    return removed;
  });
}

function astCacheDriveListEntries(config, options = {}) {
  const includeInternal = options.includeInternal === true;
  const maxItems = astCacheNormalizePositiveInt(options.maxItems, 10000, 1, 1000000);

  return astCacheDriveWithDocument(config, (document) => {
    const keyHashes = Object.keys(document.entries || {}).sort();
    const output = [];

    for (let idx = 0; idx < keyHashes.length; idx += 1) {
      const keyHash = keyHashes[idx];
      const entry = document.entries[keyHash];
      if (!entry) {
        continue;
      }

      if (!includeInternal && astCacheIsInternalNormalizedKey(entry.normalizedKey)) {
        continue;
      }

      output.push(astCacheJsonClone(entry));
      if (output.length >= maxItems) {
        break;
      }
    }

    return output;
  });
}

function astCacheDriveStats(config) {
  return astCacheDriveWithDocument(config, document => {
    return {
      backend: 'drive_json',
      namespace: document.namespace,
      entries: Object.keys(document.entries || {}).length,
      stats: astCacheJsonClone(document.stats || {})
    };
  });
}

function astCacheDriveClearNamespace(config) {
  return astCacheDriveWithDocument(config, document => {
    const removed = Object.keys(document.entries || {}).length;
    document.entries = {};
    document.stats = astCacheDriveDefaultDocument(config.namespace).stats;
    return removed;
  });
}
