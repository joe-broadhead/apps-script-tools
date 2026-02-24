function astChatIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astChatNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astChatNormalizeBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function astChatNormalizePositiveInt(value, fallback, minValue = 1, maxValue = 2147483647) {
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

function astChatNowMs() {
  return Date.now();
}

function astChatNowIsoString() {
  return new Date(astChatNowMs()).toISOString();
}

function astChatTryOrFallback(task, fallback) {
  try {
    return task();
  } catch (_error) {
    return fallback;
  }
}

function astChatJsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function astChatEnsureSerializable(value, field = 'value') {
  try {
    return astChatJsonClone(value);
  } catch (error) {
    throw new AstChatValidationError(`Chat ${field} must be JSON serializable`, { field }, error);
  }
}

function astChatHashString(value) {
  const input = String(value);

  if (
    typeof Utilities !== 'undefined' &&
    Utilities &&
    Utilities.DigestAlgorithm &&
    typeof Utilities.computeDigest === 'function'
  ) {
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input);
    return digest.map(byte => {
      const normalized = byte < 0 ? byte + 256 : byte;
      const hex = normalized.toString(16);
      return hex.length === 1 ? `0${hex}` : hex;
    }).join('');
  }

  let hash = 2166136261;
  for (let idx = 0; idx < input.length; idx += 1) {
    hash ^= input.charCodeAt(idx);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function astChatBuildStateKey(userKey, keyPrefix = 'ast_chat') {
  return `${keyPrefix}:thread_state:${astChatHashString(userKey)}`;
}

function astChatResolveUserKey(userContext = {}) {
  if (typeof userContext === 'string') {
    const fromString = astChatNormalizeString(userContext, '');
    if (fromString) {
      return fromString;
    }
  }

  if (astChatIsPlainObject(userContext)) {
    const candidates = [
      userContext.userKey,
      userContext.userId,
      userContext.email,
      userContext.sessionId
    ];
    for (let idx = 0; idx < candidates.length; idx += 1) {
      const candidate = astChatNormalizeString(candidates[idx], '');
      if (candidate) {
        return candidate;
      }
    }
  }

  if (
    typeof Session !== 'undefined' &&
    Session &&
    typeof Session.getTemporaryActiveUserKey === 'function'
  ) {
    const temporary = astChatTryOrFallback(
      () => astChatNormalizeString(Session.getTemporaryActiveUserKey(), ''),
      ''
    );
    if (temporary) {
      return temporary;
    }
  }

  throw new AstChatValidationError('Chat user context must include one of: userKey, userId, email, or sessionId');
}

function astChatGenerateId(prefix = 'chat') {
  const timestamp = astChatNowMs();
  const randomPart = Math.floor(Math.random() * 1e9).toString(36);
  return `${prefix}_${timestamp}_${randomPart}`;
}

function astChatResolveLock(scope = 'script') {
  if (
    typeof LockService === 'undefined' ||
    !LockService
  ) {
    return null;
  }

  if (scope === 'none') {
    return null;
  }

  if (scope === 'user' && typeof LockService.getUserLock === 'function') {
    return LockService.getUserLock();
  }

  if (typeof LockService.getScriptLock === 'function') {
    return LockService.getScriptLock();
  }

  return null;
}

function astChatRunWithLock(task, config = {}, options = {}) {
  if (typeof task !== 'function') {
    throw new AstChatCapabilityError('Chat lock task must be a function');
  }

  const lockScope = astChatNormalizeString(
    options.lockScope,
    astChatNormalizeString(config.lockScope, 'script')
  ).toLowerCase();
  const lockTimeoutMs = astChatNormalizePositiveInt(
    options.lockTimeoutMs,
    astChatNormalizePositiveInt(config.lockTimeoutMs, 3000, 1, 300000),
    1,
    300000
  );
  const allowLockFallback = astChatNormalizeBoolean(
    options.allowLockFallback,
    astChatNormalizeBoolean(config.allowLockFallback, true)
  );

  if (lockScope === 'none') {
    return {
      lockMode: 'none',
      value: task()
    };
  }

  const lock = astChatResolveLock(lockScope);
  if (!lock || typeof lock.tryLock !== 'function') {
    return {
      lockMode: 'none',
      value: task()
    };
  }

  const acquired = astChatTryOrFallback(() => lock.tryLock(lockTimeoutMs), false);
  if (!acquired) {
    if (!allowLockFallback) {
      throw new AstChatLockError('Unable to acquire chat lock', {
        lockScope,
        lockTimeoutMs
      });
    }

    return {
      lockMode: 'degraded',
      value: task()
    };
  }

  try {
    return {
      lockMode: 'acquired',
      value: task()
    };
  } finally {
    if (typeof lock.releaseLock === 'function') {
      astChatTryOrFallback(() => lock.releaseLock(), null);
    }
  }
}

function astChatResolveCacheApi() {
  if (
    typeof astCacheGetValue === 'function' &&
    typeof astCacheSetValue === 'function' &&
    typeof astCacheDeleteValue === 'function'
  ) {
    return {
      get: (key, options) => astCacheGetValue(key, options),
      set: (key, value, options) => astCacheSetValue(key, value, options),
      delete: (key, options) => astCacheDeleteValue(key, options)
    };
  }

  const astCacheSurface = (
    (typeof AST_CACHE !== 'undefined' && AST_CACHE) ||
    (typeof AST !== 'undefined' && AST && AST.Cache ? AST.Cache : null)
  );

  if (
    astCacheSurface &&
    typeof astCacheSurface.get === 'function' &&
    typeof astCacheSurface.set === 'function' &&
    typeof astCacheSurface.delete === 'function'
  ) {
    return {
      get: (key, options) => astCacheSurface.get(key, options),
      set: (key, value, options) => astCacheSurface.set(key, value, options),
      delete: (key, options) => astCacheSurface.delete(key, options)
    };
  }

  throw new AstChatCapabilityError('AST.Cache runtime is required for AST.Chat.ThreadStore');
}

function astChatBuildCacheOptions(cacheConfig = {}, overrideOptions = {}) {
  if (!astChatIsPlainObject(cacheConfig)) {
    cacheConfig = {};
  }
  if (!astChatIsPlainObject(overrideOptions)) {
    overrideOptions = {};
  }

  const options = Object.assign({}, cacheConfig.options || {});
  const keys = [
    'backend',
    'namespace',
    'defaultTtlSec',
    'driveFolderId',
    'driveFileName',
    'storageUri',
    'lockScope',
    'lockTimeoutMs',
    'updateStatsOnGet'
  ];

  for (let idx = 0; idx < keys.length; idx += 1) {
    const key = keys[idx];
    if (typeof cacheConfig[key] !== 'undefined') {
      options[key] = cacheConfig[key];
    }
  }

  return Object.assign(options, overrideOptions);
}
