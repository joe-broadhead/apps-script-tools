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

function astCacheDriveResolveFile(folder, fileName) {
  if (!folder || typeof folder.getFilesByName !== 'function') {
    throw new AstCacheCapabilityError('Cache drive_json folder handle does not support getFilesByName');
  }

  const iterator = folder.getFilesByName(fileName);
  if (iterator && typeof iterator.hasNext === 'function' && iterator.hasNext()) {
    return iterator.next();
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

function astCacheDriveReadDocument(config) {
  const folder = astCacheDriveGetFolder(config);
  const fileName = astCacheDriveNamespaceFileName(config);
  const file = astCacheDriveResolveFile(folder, fileName);
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

function astCacheDriveWriteDocument(file, document) {
  const serialized = JSON.stringify(document);
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
    astCacheDriveWriteDocument(file, document);
    return result;
  }, config);
}

function astCacheDriveGet(keyHash, config) {
  if (config.updateStatsOnGet === false) {
    const loaded = astCacheDriveReadDocument(config);
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
