const AST_CHAT_DEFAULTS = Object.freeze({
  keyPrefix: 'ast_chat',
  hot: Object.freeze({
    backend: 'memory',
    namespace: 'ast_chat_hot',
    ttlSec: 300,
    options: Object.freeze({})
  }),
  durable: Object.freeze({
    backend: 'drive_json',
    namespace: 'ast_chat_store',
    ttlSec: 86400,
    driveFolderId: '',
    driveFileName: 'ast_chat_threads.json',
    storageUri: '',
    options: Object.freeze({})
  }),
  limits: Object.freeze({
    threadMax: 25,
    turnsMax: 200
  }),
  lock: Object.freeze({
    lockScope: 'script',
    lockTimeoutMs: 3000,
    allowLockFallback: true
  })
});

const AST_CHAT_CONFIG_KEYS = Object.freeze([
  'AST_CHAT_KEY_PREFIX',
  'AST_CHAT_DURABLE_BACKEND',
  'AST_CHAT_DRIVE_FOLDER_ID',
  'AST_CHAT_DRIVE_FILE_NAME',
  'AST_CHAT_STORAGE_URI',
  'AST_CHAT_THREAD_MAX',
  'AST_CHAT_TURNS_MAX',
  'AST_CHAT_LOCK_SCOPE',
  'AST_CHAT_LOCK_TIMEOUT_MS',
  'AST_CHAT_ALLOW_LOCK_FALLBACK'
]);

let AST_CHAT_RUNTIME_CONFIG = {};

function astChatInvalidateScriptPropertiesSnapshotCache() {
  if (typeof astConfigInvalidateScriptPropertiesSnapshotMemoized === 'function') {
    astConfigInvalidateScriptPropertiesSnapshotMemoized();
  }
}

function astChatGetScriptPropertiesSnapshot() {
  if (typeof astConfigGetScriptPropertiesSnapshotMemoized === 'function') {
    return astConfigGetScriptPropertiesSnapshotMemoized({
      keys: AST_CHAT_CONFIG_KEYS
    });
  }

  if (
    typeof PropertiesService === 'undefined' ||
    !PropertiesService ||
    typeof PropertiesService.getScriptProperties !== 'function'
  ) {
    return {};
  }

  const props = PropertiesService.getScriptProperties();
  if (!props) {
    return {};
  }

  if (typeof props.getProperties === 'function') {
    const entries = props.getProperties();
    if (entries && typeof entries === 'object') {
      return entries;
    }
  }

  return {};
}

function astChatResolveConfigString(candidates, fallback = '') {
  if (typeof astConfigResolveFirstString === 'function') {
    return astConfigResolveFirstString(candidates, fallback);
  }

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const normalized = astChatNormalizeString(candidates[idx], '');
    if (normalized) {
      return normalized;
    }
  }
  return fallback;
}

function astChatResolveConfigNumber(candidates, fallback, min, max) {
  if (typeof astConfigResolveFirstInteger === 'function') {
    return astConfigResolveFirstInteger(candidates, {
      fallback,
      min,
      max,
      strict: false
    });
  }

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const candidate = candidates[idx];
    if (candidate == null || candidate === '') {
      continue;
    }
    const normalized = astChatNormalizePositiveInt(candidate, null, min, max);
    if (normalized != null) {
      return normalized;
    }
  }
  return fallback;
}

function astChatResolveConfigBoolean(candidates, fallback) {
  if (typeof astConfigResolveFirstBoolean === 'function') {
    return astConfigResolveFirstBoolean(candidates, fallback);
  }

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const candidate = candidates[idx];
    if (typeof candidate === 'boolean') {
      return candidate;
    }
    if (typeof candidate === 'string') {
      const normalized = candidate.trim().toLowerCase();
      if (['true', '1', 'yes'].includes(normalized)) {
        return true;
      }
      if (['false', '0', 'no'].includes(normalized)) {
        return false;
      }
    }
    if (typeof candidate === 'number') {
      if (candidate === 1) {
        return true;
      }
      if (candidate === 0) {
        return false;
      }
    }
  }
  return fallback;
}

function astChatValidateBackend(name, fieldPath) {
  const backend = astChatNormalizeString(name, '');
  if (!backend) {
    throw new AstChatValidationError(`${fieldPath} is required`);
  }

  const allowed = ['memory', 'drive_json', 'storage_json', 'script_properties'];
  if (!allowed.includes(backend)) {
    throw new AstChatValidationError(`${fieldPath} must be one of: ${allowed.join(', ')}`, {
      backend
    });
  }

  return backend;
}

function astChatNormalizeCacheConfig(config = {}, defaults = {}) {
  if (!astChatIsPlainObject(config)) {
    config = {};
  }
  if (!astChatIsPlainObject(defaults)) {
    defaults = {};
  }

  return {
    backend: astChatValidateBackend(
      astChatResolveConfigString(
        [config.backend, defaults.backend],
        AST_CHAT_DEFAULTS.hot.backend
      ),
      'cache.backend'
    ),
    namespace: astChatResolveConfigString(
      [config.namespace, defaults.namespace],
      AST_CHAT_DEFAULTS.hot.namespace
    ),
    ttlSec: astChatResolveConfigNumber(
      [config.ttlSec, defaults.ttlSec],
      AST_CHAT_DEFAULTS.hot.ttlSec,
      1,
      31536000
    ),
    driveFolderId: astChatResolveConfigString(
      [config.driveFolderId, defaults.driveFolderId],
      ''
    ),
    driveFileName: astChatResolveConfigString(
      [config.driveFileName, defaults.driveFileName],
      ''
    ),
    storageUri: astChatResolveConfigString(
      [config.storageUri, defaults.storageUri],
      ''
    ),
    options: astChatIsPlainObject(config.options)
      ? astChatEnsureSerializable(config.options, 'cache.options')
      : (astChatIsPlainObject(defaults.options)
        ? astChatEnsureSerializable(defaults.options, 'cache.options')
        : {})
  };
}

function astChatResolveConfig(overrides = {}) {
  if (!astChatIsPlainObject(overrides)) {
    overrides = {};
  }

  const scriptProps = astChatGetScriptPropertiesSnapshot();
  const runtime = astChatIsPlainObject(AST_CHAT_RUNTIME_CONFIG) ? AST_CHAT_RUNTIME_CONFIG : {};

  const keyPrefix = astChatResolveConfigString(
    [
      overrides.keyPrefix,
      runtime.keyPrefix,
      scriptProps.AST_CHAT_KEY_PREFIX
    ],
    AST_CHAT_DEFAULTS.keyPrefix
  );

  const hot = astChatNormalizeCacheConfig(
    overrides.hot,
    runtime.hot || AST_CHAT_DEFAULTS.hot
  );
  if (!astChatNormalizeString(hot.namespace, '')) {
    hot.namespace = `${keyPrefix}:hot`;
  }

  const durable = astChatNormalizeCacheConfig(
    overrides.durable,
    runtime.durable || AST_CHAT_DEFAULTS.durable
  );
  durable.backend = astChatValidateBackend(
    astChatResolveConfigString(
      [overrides?.durable?.backend, runtime?.durable?.backend, scriptProps.AST_CHAT_DURABLE_BACKEND],
      durable.backend || AST_CHAT_DEFAULTS.durable.backend
    ),
    'durable.backend'
  );
  if (!astChatNormalizeString(durable.namespace, '')) {
    durable.namespace = `${keyPrefix}:store`;
  }
  durable.driveFolderId = astChatResolveConfigString(
    [overrides?.durable?.driveFolderId, runtime?.durable?.driveFolderId, scriptProps.AST_CHAT_DRIVE_FOLDER_ID],
    durable.driveFolderId
  );
  durable.driveFileName = astChatResolveConfigString(
    [overrides?.durable?.driveFileName, runtime?.durable?.driveFileName, scriptProps.AST_CHAT_DRIVE_FILE_NAME],
    durable.driveFileName || AST_CHAT_DEFAULTS.durable.driveFileName
  );
  durable.storageUri = astChatResolveConfigString(
    [overrides?.durable?.storageUri, runtime?.durable?.storageUri, scriptProps.AST_CHAT_STORAGE_URI],
    durable.storageUri
  );

  const limits = {
    threadMax: astChatResolveConfigNumber(
      [overrides?.limits?.threadMax, runtime?.limits?.threadMax, scriptProps.AST_CHAT_THREAD_MAX],
      AST_CHAT_DEFAULTS.limits.threadMax,
      1,
      1000
    ),
    turnsMax: astChatResolveConfigNumber(
      [overrides?.limits?.turnsMax, runtime?.limits?.turnsMax, scriptProps.AST_CHAT_TURNS_MAX],
      AST_CHAT_DEFAULTS.limits.turnsMax,
      1,
      5000
    )
  };

  const lock = {
    lockScope: astChatResolveConfigString(
      [overrides?.lock?.lockScope, runtime?.lock?.lockScope, scriptProps.AST_CHAT_LOCK_SCOPE],
      AST_CHAT_DEFAULTS.lock.lockScope
    ).toLowerCase(),
    lockTimeoutMs: astChatResolveConfigNumber(
      [overrides?.lock?.lockTimeoutMs, runtime?.lock?.lockTimeoutMs, scriptProps.AST_CHAT_LOCK_TIMEOUT_MS],
      AST_CHAT_DEFAULTS.lock.lockTimeoutMs,
      1,
      300000
    ),
    allowLockFallback: astChatResolveConfigBoolean(
      [overrides?.lock?.allowLockFallback, runtime?.lock?.allowLockFallback, scriptProps.AST_CHAT_ALLOW_LOCK_FALLBACK],
      AST_CHAT_DEFAULTS.lock.allowLockFallback
    )
  };

  if (!['script', 'user', 'none'].includes(lock.lockScope)) {
    throw new AstChatValidationError('lock.lockScope must be one of: script, user, none');
  }

  return {
    keyPrefix,
    hot,
    durable,
    limits,
    lock
  };
}

function astChatGetRuntimeConfig() {
  return astChatJsonClone(astChatResolveConfig({}));
}

function astChatSetRuntimeConfig(config = {}, options = {}) {
  if (!astChatIsPlainObject(config)) {
    throw new AstChatValidationError('AST.Chat.configure config must be an object');
  }
  if (!astChatIsPlainObject(options)) {
    options = {};
  }

  const merge = astChatNormalizeBoolean(options.merge, true);
  const previousRuntime = astChatIsPlainObject(AST_CHAT_RUNTIME_CONFIG)
    ? astChatJsonClone(AST_CHAT_RUNTIME_CONFIG)
    : {};

  astChatInvalidateScriptPropertiesSnapshotCache();
  AST_CHAT_RUNTIME_CONFIG = merge ? previousRuntime : {};
  AST_CHAT_RUNTIME_CONFIG = astChatResolveConfig(config);
  return astChatGetRuntimeConfig();
}

function astChatClearRuntimeConfig() {
  AST_CHAT_RUNTIME_CONFIG = {};
  astChatInvalidateScriptPropertiesSnapshotCache();
  return astChatGetRuntimeConfig();
}
