function astCacheIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astCacheNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astCacheNormalizeBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function astCacheNormalizePositiveInt(value, fallback, minValue = 1, maxValue = 2147483647) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const rounded = Math.floor(numeric);
  if (rounded < minValue || rounded > maxValue) {
    return fallback;
  }

  return rounded;
}

function astCacheNowMs() {
  return Date.now();
}

function astCacheNowIsoString() {
  return new Date().toISOString();
}

function astCacheTryOrFallback(task, fallback) {
  try {
    return task();
  } catch (_error) {
    return fallback;
  }
}

function astCacheJsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function astCacheEnsureSerializable(value, field = 'value') {
  try {
    return astCacheJsonClone(value);
  } catch (error) {
    throw new AstCacheValidationError(`Cache ${field} must be JSON serializable`, { field }, error);
  }
}

function astCacheStableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const parts = [];
    for (let idx = 0; idx < value.length; idx += 1) {
      parts.push(astCacheStableStringify(value[idx]));
    }
    return `[${parts.join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  const pairs = [];
  for (let idx = 0; idx < keys.length; idx += 1) {
    const key = keys[idx];
    pairs.push(`${JSON.stringify(key)}:${astCacheStableStringify(value[key])}`);
  }
  return `{${pairs.join(',')}}`;
}

function astCacheNormalizeKey(key) {
  if (typeof key === 'string') {
    const normalized = key.trim();
    if (!normalized) {
      throw new AstCacheValidationError('Cache key must not be empty');
    }
    return normalized;
  }

  if (
    typeof key === 'number' ||
    typeof key === 'boolean' ||
    key === null ||
    Array.isArray(key) ||
    astCacheIsPlainObject(key)
  ) {
    return astCacheStableStringify(key);
  }

  throw new AstCacheValidationError('Cache key must be a string, number, boolean, null, array, or object');
}

function astCacheNormalizeTags(tags) {
  if (typeof tags === 'undefined' || tags === null) {
    return [];
  }

  if (!Array.isArray(tags)) {
    throw new AstCacheValidationError('Cache tags must be an array of strings');
  }

  const seen = {};
  const output = [];
  for (let idx = 0; idx < tags.length; idx += 1) {
    const normalized = astCacheNormalizeString(tags[idx], '');
    if (!normalized || seen[normalized]) {
      continue;
    }
    seen[normalized] = true;
    output.push(normalized);
  }

  return output;
}

function astCacheResolveLockService(lockScope) {
  if (
    typeof LockService === 'undefined' ||
    !LockService
  ) {
    return null;
  }

  if (lockScope === 'none') {
    return null;
  }

  if (lockScope === 'user' && typeof LockService.getUserLock === 'function') {
    return LockService.getUserLock();
  }

  if (typeof LockService.getScriptLock === 'function') {
    return LockService.getScriptLock();
  }

  return null;
}

function astCacheRunWithLock(task, config = {}) {
  if (typeof task !== 'function') {
    throw new AstCacheCapabilityError('Cache lock task must be a function');
  }

  const lockScope = astCacheNormalizeString(config.lockScope, 'script').toLowerCase();
  const traceCollector = typeof config.traceCollector === 'function'
    ? config.traceCollector
    : null;
  const traceContext = astCacheIsPlainObject(config.traceContext)
    ? astCacheJsonClone(config.traceContext)
    : {};

  function emitLockTrace(payload = {}) {
    if (!traceCollector) {
      return;
    }

    astCacheTryOrFallback(() => traceCollector(Object.assign({}, traceContext, payload)), null);
  }

  if (lockScope === 'none') {
    emitLockTrace({
      event: 'lock_acquire',
      lockScope: 'none',
      timeoutMs: 0,
      waitMs: 0,
      acquired: true,
      contention: false
    });
    return task();
  }

  const lock = astCacheResolveLockService(lockScope);
  if (!lock || typeof lock.tryLock !== 'function') {
    emitLockTrace({
      event: 'lock_acquire',
      lockScope,
      timeoutMs: 0,
      waitMs: 0,
      acquired: true,
      contention: false,
      skipped: true
    });
    return task();
  }

  const timeoutMs = astCacheNormalizePositiveInt(config.lockTimeoutMs, 30000, 1, 300000);
  const lockStartMs = astCacheNowMs();
  const acquired = astCacheTryOrFallback(() => lock.tryLock(timeoutMs), false);
  const waitMs = Math.max(0, astCacheNowMs() - lockStartMs);
  const contention = waitMs > 0;

  emitLockTrace({
    event: 'lock_acquire',
    lockScope,
    timeoutMs,
    waitMs,
    acquired,
    contention
  });

  if (!acquired) {
    throw new AstCacheCapabilityError('Unable to acquire cache lock', {
      timeoutMs,
      lockScope
    });
  }

  try {
    return task();
  } finally {
    if (typeof lock.releaseLock === 'function') {
      astCacheTryOrFallback(() => lock.releaseLock(), null);
    }
    emitLockTrace({
      event: 'lock_release',
      lockScope,
      acquired: true
    });
  }
}
