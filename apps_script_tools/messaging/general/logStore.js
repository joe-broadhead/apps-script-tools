const AST_MESSAGING_LOG_MEMORY = {
  index: [],
  events: {}
};

function astMessagingLogNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astMessagingLogNowIso() {
  return new Date().toISOString();
}

function astMessagingGenerateEventId() {
  try {
    if (typeof Utilities !== 'undefined' && Utilities && typeof Utilities.getUuid === 'function') {
      const uuid = astMessagingLogNormalizeString(Utilities.getUuid(), '');
      if (uuid) {
        return `evt_${uuid}`;
      }
    }
  } catch (_error) {
    // Fallback below.
  }

  return `evt_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

function astMessagingCloneSerializable(value) {
  return JSON.parse(JSON.stringify(value));
}

function astMessagingResolveLogCacheOptions(logsConfig = {}) {
  const backend = astMessagingLogNormalizeString(logsConfig.backend, 'drive_json');
  const namespace = astMessagingLogNormalizeString(logsConfig.namespace, 'ast_messaging_logs');
  const ttlSec = Number(logsConfig.ttlSec || 31536000);

  const options = {
    backend,
    namespace,
    ttlSec
  };

  if (backend === 'drive_json') {
    options.driveFolderId = astMessagingLogNormalizeString(logsConfig.driveFolderId, '');
    options.driveFileName = astMessagingLogNormalizeString(logsConfig.driveFileName, 'ast_messaging_logs.json');
  }

  if (backend === 'storage_json') {
    options.storageUri = astMessagingLogNormalizeString(logsConfig.storageUri, '');
  }

  return options;
}

function astMessagingGetCacheApi() {
  if (typeof AST_CACHE !== 'undefined' && AST_CACHE) {
    return AST_CACHE;
  }
  if (typeof AST !== 'undefined' && AST && AST.Cache) {
    return AST.Cache;
  }
  return null;
}

function astMessagingLogReadIndex(cache, options) {
  const indexKey = 'events:index';
  if (!cache || typeof cache.get !== 'function') {
    return AST_MESSAGING_LOG_MEMORY.index.slice();
  }

  try {
    const value = cache.get(indexKey, options);
    return Array.isArray(value) ? value : [];
  } catch (_error) {
    return AST_MESSAGING_LOG_MEMORY.index.slice();
  }
}

function astMessagingLogWriteIndex(cache, options, indexValue) {
  const indexKey = 'events:index';
  if (!cache || typeof cache.set !== 'function') {
    AST_MESSAGING_LOG_MEMORY.index = indexValue.slice();
    return;
  }

  try {
    cache.set(indexKey, indexValue, options);
  } catch (_error) {
    AST_MESSAGING_LOG_MEMORY.index = indexValue.slice();
  }
}

function astMessagingLogReadEvent(cache, options, eventId) {
  const key = `events:${eventId}`;
  if (!cache || typeof cache.get !== 'function') {
    return Object.prototype.hasOwnProperty.call(AST_MESSAGING_LOG_MEMORY.events, key)
      ? astMessagingCloneSerializable(AST_MESSAGING_LOG_MEMORY.events[key])
      : null;
  }

  try {
    return cache.get(key, options);
  } catch (_error) {
    return Object.prototype.hasOwnProperty.call(AST_MESSAGING_LOG_MEMORY.events, key)
      ? astMessagingCloneSerializable(AST_MESSAGING_LOG_MEMORY.events[key])
      : null;
  }
}

function astMessagingLogWriteEvent(cache, options, eventId, value) {
  const key = `events:${eventId}`;
  if (!cache || typeof cache.set !== 'function') {
    AST_MESSAGING_LOG_MEMORY.events[key] = astMessagingCloneSerializable(value);
    return;
  }

  try {
    cache.set(key, value, options);
  } catch (_error) {
    AST_MESSAGING_LOG_MEMORY.events[key] = astMessagingCloneSerializable(value);
  }
}

function astMessagingLogDeleteEvent(cache, options, eventId) {
  const key = `events:${eventId}`;
  if (!cache || typeof cache.delete !== 'function') {
    delete AST_MESSAGING_LOG_MEMORY.events[key];
    return;
  }

  try {
    cache.delete(key, options);
  } catch (_error) {
    delete AST_MESSAGING_LOG_MEMORY.events[key];
  }
}

function astMessagingLogWrite(entry = {}, resolvedConfig = {}) {
  const eventId = astMessagingLogNormalizeString(entry.eventId, '') || astMessagingGenerateEventId();
  const nowIso = astMessagingLogNowIso();

  const normalizedEntry = {
    eventId,
    timestamp: astMessagingLogNormalizeString(entry.timestamp, nowIso),
    operation: astMessagingLogNormalizeString(entry.operation, ''),
    channel: astMessagingLogNormalizeString(entry.channel, ''),
    status: astMessagingLogNormalizeString(entry.status, 'ok'),
    payload: entry.payload && typeof entry.payload === 'object' ? astMessagingCloneSerializable(entry.payload) : {},
    metadata: entry.metadata && typeof entry.metadata === 'object' ? astMessagingCloneSerializable(entry.metadata) : {}
  };

  const cache = astMessagingGetCacheApi();
  const options = astMessagingResolveLogCacheOptions(resolvedConfig.logs || {});
  const index = astMessagingLogReadIndex(cache, options);

  astMessagingLogWriteEvent(cache, options, eventId, normalizedEntry);

  const filtered = index.filter(item => item && item.eventId !== eventId);
  filtered.unshift({
    eventId,
    timestamp: normalizedEntry.timestamp,
    operation: normalizedEntry.operation,
    channel: normalizedEntry.channel,
    status: normalizedEntry.status
  });

  const maxEntries = Number((resolvedConfig.logs && resolvedConfig.logs.maxEntries) || 5000);
  const bounded = filtered.slice(0, Math.max(1, maxEntries));
  astMessagingLogWriteIndex(cache, options, bounded);

  return {
    eventId,
    persisted: true,
    backend: options.backend
  };
}

function astMessagingLogList(request = {}, resolvedConfig = {}) {
  const body = request.body && typeof request.body === 'object' ? request.body : {};
  const limit = Math.max(1, Math.min(1000, Number(body.limit || 50)));
  const offset = Math.max(0, Number(body.offset || 0));
  const includeEntries = body.includeEntries !== false;

  const cache = astMessagingGetCacheApi();
  const options = astMessagingResolveLogCacheOptions(resolvedConfig.logs || {});
  const index = astMessagingLogReadIndex(cache, options);

  const pageSlice = index.slice(offset, offset + limit);
  const items = includeEntries
    ? pageSlice.map(item => astMessagingLogReadEvent(cache, options, item.eventId)).filter(Boolean)
    : pageSlice.map(item => astMessagingCloneSerializable(item));

  return {
    items,
    page: {
      limit,
      offset,
      returned: items.length,
      total: index.length,
      hasMore: offset + items.length < index.length
    }
  };
}

function astMessagingLogGet(request = {}, resolvedConfig = {}) {
  const body = request.body && typeof request.body === 'object' ? request.body : {};
  const eventId = astMessagingLogNormalizeString(body.eventId, null);
  if (!eventId) {
    throw new AstMessagingValidationError("Missing required messaging request field 'body.eventId'", {
      field: 'body.eventId'
    });
  }

  const cache = astMessagingGetCacheApi();
  const options = astMessagingResolveLogCacheOptions(resolvedConfig.logs || {});
  const event = astMessagingLogReadEvent(cache, options, eventId);
  if (!event) {
    throw new AstMessagingNotFoundError('Messaging log event not found', { eventId });
  }

  return {
    item: event
  };
}

function astMessagingLogDelete(request = {}, resolvedConfig = {}) {
  const body = request.body && typeof request.body === 'object' ? request.body : {};
  const eventId = astMessagingLogNormalizeString(body.eventId, null);
  if (!eventId) {
    throw new AstMessagingValidationError("Missing required messaging request field 'body.eventId'", {
      field: 'body.eventId'
    });
  }

  const cache = astMessagingGetCacheApi();
  const options = astMessagingResolveLogCacheOptions(resolvedConfig.logs || {});
  const index = astMessagingLogReadIndex(cache, options);
  const existing = astMessagingLogReadEvent(cache, options, eventId);
  if (!existing) {
    throw new AstMessagingNotFoundError('Messaging log event not found', { eventId });
  }

  astMessagingLogDeleteEvent(cache, options, eventId);
  const nextIndex = index.filter(item => item && item.eventId !== eventId);
  astMessagingLogWriteIndex(cache, options, nextIndex);

  return {
    deleted: true,
    eventId
  };
}
