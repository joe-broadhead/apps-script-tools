function cookbookAst_() {
  return ASTLib.AST || ASTLib;
}

function cookbookScriptProperties_() {
  return PropertiesService.getScriptProperties();
}

function cookbookTemplateVersion_() {
  return 'v2';
}

function cookbookName_() {
  return 'rag_chat_starter';
}

function cookbookSupportedProviders_() {
  return ['openai', 'gemini', 'vertex_gemini', 'openrouter', 'perplexity'];
}

function cookbookSupportedMimeTypes_() {
  return [
    'text/plain',
    'application/pdf',
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.presentation'
  ];
}

function cookbookConfigFields_() {
  return [
    {
      key: 'RAG_CHAT_APP_NAME',
      required: true,
      defaultValue: 'AST RAG Chat Starter',
      description: 'Display name rendered in the web app and cookbook outputs.'
    },
    {
      key: 'RAG_CHAT_APP_TAGLINE',
      required: false,
      defaultValue: 'Grounded answers from your indexed files',
      description: 'Short supporting line shown in the header.'
    },
    {
      key: 'RAG_CHAT_PLACEHOLDER',
      required: false,
      defaultValue: 'Ask a question about your indexed files...',
      description: 'Composer placeholder text.'
    },
    {
      key: 'RAG_CHAT_SOURCE_FOLDER_ID',
      required: true,
      defaultValue: '',
      description: 'Drive folder containing the source corpus to index.'
    },
    {
      key: 'RAG_CHAT_INDEX_NAME',
      required: true,
      defaultValue: 'rag-chat-starter',
      description: 'Human-readable RAG index name.'
    },
    {
      key: 'RAG_CHAT_INDEX_FILE_ID',
      required: false,
      defaultValue: '',
      description: 'Optional existing index file id. Auto-populated after successful build.'
    },
    {
      key: 'RAG_CHAT_AUTO_BUILD_INDEX',
      required: false,
      defaultValue: 'true',
      type: 'boolean',
      description: 'Allow smoke/init flows to auto-build the index when missing.'
    },
    {
      key: 'RAG_CHAT_ALLOW_INDEX_MUTATIONS',
      required: false,
      defaultValue: 'false',
      type: 'boolean',
      description: 'Expose sync/rebuild controls in the web app.'
    },
    {
      key: 'RAG_CHAT_GENERATION_PROVIDER',
      required: true,
      defaultValue: 'vertex_gemini',
      description: 'Provider used for grounded answer generation.'
    },
    {
      key: 'RAG_CHAT_EMBEDDING_PROVIDER',
      required: true,
      defaultValue: 'vertex_gemini',
      description: 'Provider used when building the retrieval index.'
    },
    {
      key: 'RAG_CHAT_MODEL_FAST',
      required: false,
      defaultValue: '',
      description: 'Optional fast model override for chat answers.'
    },
    {
      key: 'RAG_CHAT_MODEL_DEEP',
      required: false,
      defaultValue: '',
      description: 'Optional deep model override for chat answers.'
    },
    {
      key: 'RAG_CHAT_EMBED_MODEL',
      required: false,
      defaultValue: '',
      description: 'Optional embedding model override.'
    },
    {
      key: 'RAG_CHAT_HISTORY_MAX_PAIRS',
      required: false,
      defaultValue: '10',
      type: 'integer',
      description: 'Conversation pairs sent back to the answer call.'
    },
    {
      key: 'RAG_CHAT_THREAD_MAX',
      required: false,
      defaultValue: '20',
      type: 'integer',
      description: 'Maximum stored threads per user.'
    },
    {
      key: 'RAG_CHAT_TURNS_MAX',
      required: false,
      defaultValue: '80',
      type: 'integer',
      description: 'Maximum stored turns per thread.'
    },
    {
      key: 'RAG_CHAT_THREADS_TTL_SEC',
      required: false,
      defaultValue: '604800',
      type: 'integer',
      description: 'Durable thread TTL in seconds.'
    },
    {
      key: 'RAG_CHAT_THREADS_BACKEND',
      required: false,
      defaultValue: 'drive_json',
      description: 'Durable AST.Chat backend: drive_json, storage_json, or script_properties.'
    },
    {
      key: 'RAG_CHAT_THREADS_NAMESPACE',
      required: false,
      defaultValue: 'rag_chat_starter_threads',
      description: 'Namespace used for durable thread persistence.'
    },
    {
      key: 'RAG_CHAT_THREADS_DRIVE_FOLDER_ID',
      required: false,
      defaultValue: '',
      description: 'Optional Drive folder id for drive_json thread storage.'
    },
    {
      key: 'RAG_CHAT_THREADS_DRIVE_FILE_NAME',
      required: false,
      defaultValue: 'rag-chat-starter-threads.json',
      description: 'Drive JSON file name when using drive_json persistence.'
    },
    {
      key: 'RAG_CHAT_THREADS_STORAGE_URI',
      required: false,
      defaultValue: '',
      description: 'Storage URI when durable backend is storage_json.'
    },
    {
      key: 'RAG_CHAT_RETRIEVAL_TOP_K_FAST',
      required: false,
      defaultValue: '6',
      type: 'integer',
      description: 'Retrieval topK for fast mode.'
    },
    {
      key: 'RAG_CHAT_RETRIEVAL_TOP_K_DEEP',
      required: false,
      defaultValue: '10',
      type: 'integer',
      description: 'Retrieval topK for deep mode.'
    },
    {
      key: 'RAG_CHAT_MIN_SCORE',
      required: false,
      defaultValue: '0.2',
      type: 'number',
      description: 'Minimum retrieval score threshold.'
    },
    {
      key: 'RAG_CHAT_MAX_OUTPUT_TOKENS_FAST',
      required: false,
      defaultValue: '1200',
      type: 'integer',
      description: 'Output token cap for fast mode.'
    },
    {
      key: 'RAG_CHAT_MAX_OUTPUT_TOKENS_DEEP',
      required: false,
      defaultValue: '2200',
      type: 'integer',
      description: 'Output token cap for deep mode.'
    },
    {
      key: 'RAG_CHAT_REQUIRE_CITATIONS',
      required: false,
      defaultValue: 'true',
      type: 'boolean',
      description: 'Require grounded citations in answer responses.'
    },
    {
      key: 'RAG_CHAT_SMOKE_QUESTION',
      required: false,
      defaultValue: 'What is this project about?',
      description: 'Question used by the smoke and demo entrypoints.'
    },
    {
      key: 'RAG_CHAT_INSUFFICIENT_EVIDENCE_MESSAGE',
      required: false,
      defaultValue: 'I do not have enough grounded context to answer that.',
      description: 'Message returned when the model lacks grounded evidence.'
    },
    {
      key: 'RAG_CHAT_LOGO_URL',
      required: false,
      defaultValue: '',
      description: 'Optional logo shown in the web app header.'
    },
    {
      key: 'RAG_CHAT_FONT_FAMILY',
      required: false,
      defaultValue: '"Inter", "SF Pro Display", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
      description: 'Optional CSS font-family override.'
    },
    {
      key: 'RAG_CHAT_COLOR_PRIMARY',
      required: false,
      defaultValue: '#3643ba',
      description: 'Primary accent color.'
    },
    {
      key: 'RAG_CHAT_COLOR_ACCENT',
      required: false,
      defaultValue: '#54cfa1',
      description: 'Secondary accent color.'
    },
    {
      key: 'RAG_CHAT_COLOR_BG_START',
      required: false,
      defaultValue: '#edf1ff',
      description: 'Gradient background start color.'
    },
    {
      key: 'RAG_CHAT_COLOR_BG_END',
      required: false,
      defaultValue: '#f6f8ff',
      description: 'Gradient background end color.'
    },
    {
      key: 'RAG_CHAT_COLOR_SURFACE',
      required: false,
      defaultValue: '#ffffff',
      description: 'Surface color for glass cards.'
    },
    {
      key: 'RAG_CHAT_COLOR_TEXT',
      required: false,
      defaultValue: '#0f172a',
      description: 'Primary text color.'
    },
    {
      key: 'RAG_CHAT_COLOR_MUTED',
      required: false,
      defaultValue: '#475569',
      description: 'Muted text color.'
    }
  ];
}

function cookbookConfigFieldMap_() {
  const fields = cookbookConfigFields_();
  const map = {};
  for (let idx = 0; idx < fields.length; idx += 1) {
    map[fields[idx].key] = fields[idx];
  }
  return map;
}

function cookbookNormalizeString_(value, fallback) {
  if (value == null) {
    return fallback || '';
  }
  const normalized = String(value).trim();
  return normalized || (fallback || '');
}

function cookbookNormalizeBoolean_(value, fallback) {
  if (value === true || value === false) {
    return value;
  }
  if (value == null || value === '') {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].indexOf(normalized) !== -1) {
    return true;
  }
  if (['false', '0', 'no', 'n', 'off'].indexOf(normalized) !== -1) {
    return false;
  }
  return fallback;
}

function cookbookNormalizeInteger_(value, fallback) {
  if (value == null || value === '') {
    return fallback;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || Math.floor(numeric) !== numeric) {
    return fallback;
  }
  return numeric;
}

function cookbookNormalizeNumber_(value, fallback) {
  if (value == null || value === '') {
    return fallback;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return numeric;
}

function cookbookNormalizeConfigValue_(field, rawValue) {
  if (field && field.type === 'boolean') {
    return cookbookNormalizeBoolean_(rawValue, cookbookNormalizeBoolean_(field.defaultValue, false));
  }
  if (field && field.type === 'integer') {
    return cookbookNormalizeInteger_(rawValue, Number(field.defaultValue || 0));
  }
  if (field && field.type === 'number') {
    return cookbookNormalizeNumber_(rawValue, Number(field.defaultValue || 0));
  }
  return cookbookNormalizeString_(
    rawValue,
    field && typeof field.defaultValue !== 'undefined' ? String(field.defaultValue) : ''
  );
}

function cookbookValidateOverrideKeys_(overrides) {
  if (overrides == null) {
    return;
  }
  if (Object.prototype.toString.call(overrides) !== '[object Object]') {
    throw new Error('seedCookbookConfig overrides must be a plain object when provided.');
  }
  const known = cookbookConfigFieldMap_();
  const unknown = Object.keys(overrides).filter(function (key) {
    return !known[key];
  });
  if (unknown.length > 0) {
    throw new Error('Unknown cookbook config overrides: ' + unknown.join(', '));
  }
}

function cookbookValidationSummary_(result) {
  return {
    status: result.status,
    templateVersion: result.templateVersion,
    cookbook: result.cookbook,
    requiredKeys: result.requiredKeys,
    optionalKeys: result.optionalKeys,
    warnings: result.warnings,
    errors: result.errors,
    config: result.config
  };
}

function cookbookLogResult_(label, payload) {
  Logger.log(label + '\n' + JSON.stringify(payload, null, 2));
  return payload;
}

function cookbookValidateProviderName_(provider, keyName, errors) {
  const normalized = cookbookNormalizeString_(provider, '');
  if (!normalized) {
    errors.push('Missing required cookbook config key ' + keyName + '.');
    return '';
  }
  if (cookbookSupportedProviders_().indexOf(normalized) === -1) {
    errors.push(
      keyName + ' must be one of: ' + cookbookSupportedProviders_().join(', ') + '. Received: ' + normalized
    );
  }
  return normalized;
}

function cookbookValidateColor_(value) {
  const text = cookbookNormalizeString_(value, '');
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(text) || /^rgb\(/i.test(text);
}

function cookbookPersistConfigValues_(values) {
  const next = values && Object.prototype.toString.call(values) === '[object Object]' ? values : {};
  const scriptProps = cookbookScriptProperties_();
  const serialized = {};
  const keys = Object.keys(next);
  for (let idx = 0; idx < keys.length; idx += 1) {
    serialized[keys[idx]] = String(next[keys[idx]] == null ? '' : next[keys[idx]]);
  }
  scriptProps.setProperties(serialized, false);
  return serialized;
}

function seedCookbookConfig(overrides) {
  cookbookValidateOverrideKeys_(overrides);

  const props = cookbookScriptProperties_();
  const fields = cookbookConfigFields_();
  const next = {};

  for (let idx = 0; idx < fields.length; idx += 1) {
    const field = fields[idx];
    const overrideValue = overrides && Object.prototype.hasOwnProperty.call(overrides, field.key)
      ? overrides[field.key]
      : field.defaultValue;
    next[field.key] = String(overrideValue == null ? '' : overrideValue);
  }

  props.setProperties(next, false);

  return cookbookLogResult_(
    'seedCookbookConfig',
    cookbookValidationSummary_(validateCookbookConfig({ scriptProperties: props }))
  );
}

function validateCookbookConfig(options) {
  const runtimeOptions = options || {};
  const props = runtimeOptions.scriptProperties || cookbookScriptProperties_();
  const fields = cookbookConfigFields_();
  const resolved = {};
  const warnings = [];
  const errors = [];
  const requiredKeys = [];
  const optionalKeys = [];

  for (let idx = 0; idx < fields.length; idx += 1) {
    const field = fields[idx];
    const storedValue = props.getProperty(field.key);
    const hasStoredValue = storedValue != null && storedValue !== '';
    const rawValue = hasStoredValue ? storedValue : field.defaultValue;
    const normalizedValue = cookbookNormalizeConfigValue_(field, rawValue);

    resolved[field.key] = normalizedValue;

    if (field.required) {
      requiredKeys.push(field.key);
    } else {
      optionalKeys.push(field.key);
    }

    if (!hasStoredValue) {
      warnings.push('Using cookbook default for ' + field.key + '.');
    }

    if (field.required && (normalizedValue === '' || normalizedValue == null)) {
      errors.push('Missing required cookbook config key ' + field.key + '.');
    }
  }

  cookbookValidateProviderName_(resolved.RAG_CHAT_GENERATION_PROVIDER, 'RAG_CHAT_GENERATION_PROVIDER', errors);
  cookbookValidateProviderName_(resolved.RAG_CHAT_EMBEDDING_PROVIDER, 'RAG_CHAT_EMBEDDING_PROVIDER', errors);

  if (['drive_json', 'storage_json', 'script_properties'].indexOf(resolved.RAG_CHAT_THREADS_BACKEND) === -1) {
    errors.push('RAG_CHAT_THREADS_BACKEND must be one of: drive_json, storage_json, script_properties.');
  }

  if (resolved.RAG_CHAT_THREADS_BACKEND === 'storage_json' && !resolved.RAG_CHAT_THREADS_STORAGE_URI) {
    errors.push('RAG_CHAT_THREADS_STORAGE_URI is required when RAG_CHAT_THREADS_BACKEND=storage_json.');
  }

  if (resolved.RAG_CHAT_HISTORY_MAX_PAIRS < 1) {
    errors.push('RAG_CHAT_HISTORY_MAX_PAIRS must be >= 1.');
  }
  if (resolved.RAG_CHAT_THREAD_MAX < 1) {
    errors.push('RAG_CHAT_THREAD_MAX must be >= 1.');
  }
  if (resolved.RAG_CHAT_TURNS_MAX < 2) {
    errors.push('RAG_CHAT_TURNS_MAX must be >= 2.');
  }
  if (resolved.RAG_CHAT_RETRIEVAL_TOP_K_FAST < 1 || resolved.RAG_CHAT_RETRIEVAL_TOP_K_DEEP < 1) {
    errors.push('RAG_CHAT retrieval topK values must be >= 1.');
  }
  if (resolved.RAG_CHAT_MIN_SCORE < 0) {
    errors.push('RAG_CHAT_MIN_SCORE must be >= 0.');
  }

  const colorKeys = [
    'RAG_CHAT_COLOR_PRIMARY',
    'RAG_CHAT_COLOR_ACCENT',
    'RAG_CHAT_COLOR_BG_START',
    'RAG_CHAT_COLOR_BG_END',
    'RAG_CHAT_COLOR_SURFACE',
    'RAG_CHAT_COLOR_TEXT',
    'RAG_CHAT_COLOR_MUTED'
  ];
  for (let idx = 0; idx < colorKeys.length; idx += 1) {
    const key = colorKeys[idx];
    if (!cookbookValidateColor_(resolved[key])) {
      errors.push(key + ' must be a #hex or rgb(...) CSS color.');
    }
  }

  return {
    status: errors.length > 0 ? 'error' : 'ok',
    templateVersion: cookbookTemplateVersion_(),
    cookbook: cookbookName_(),
    requiredKeys: requiredKeys,
    optionalKeys: optionalKeys,
    warnings: warnings,
    errors: errors,
    config: resolved
  };
}

function cookbookRequireValidConfig_() {
  const validation = validateCookbookConfig();
  if (validation.status !== 'ok') {
    throw new Error('Cookbook config is invalid: ' + validation.errors.join(' | '));
  }
  return validation.config;
}

function cookbookBuildUiBootstrap_(config) {
  return {
    name: config.RAG_CHAT_APP_NAME,
    tagline: config.RAG_CHAT_APP_TAGLINE,
    placeholder: config.RAG_CHAT_PLACEHOLDER,
    logoUrl: config.RAG_CHAT_LOGO_URL,
    fontFamily: config.RAG_CHAT_FONT_FAMILY,
    palette: {
      primary: config.RAG_CHAT_COLOR_PRIMARY,
      accent: config.RAG_CHAT_COLOR_ACCENT,
      bgStart: config.RAG_CHAT_COLOR_BG_START,
      bgEnd: config.RAG_CHAT_COLOR_BG_END,
      surface: config.RAG_CHAT_COLOR_SURFACE,
      text: config.RAG_CHAT_COLOR_TEXT,
      muted: config.RAG_CHAT_COLOR_MUTED
    }
  };
}

function cookbookBuildThreadStoreConfig_(config) {
  return {
    keyPrefix: cookbookName_(),
    hot: {
      backend: 'memory',
      namespace: cookbookName_() + '_hot',
      ttlSec: 600
    },
    durable: {
      backend: config.RAG_CHAT_THREADS_BACKEND,
      namespace: config.RAG_CHAT_THREADS_NAMESPACE,
      driveFolderId: config.RAG_CHAT_THREADS_DRIVE_FOLDER_ID,
      driveFileName: config.RAG_CHAT_THREADS_DRIVE_FILE_NAME,
      storageUri: config.RAG_CHAT_THREADS_STORAGE_URI,
      ttlSec: config.RAG_CHAT_THREADS_TTL_SEC
    },
    limits: {
      threadMax: config.RAG_CHAT_THREAD_MAX,
      turnsMax: config.RAG_CHAT_TURNS_MAX
    },
    lock: {
      lockScope: 'user',
      lockTimeoutMs: 3000,
      allowLockFallback: true
    }
  };
}

function cookbookBuildRagDefaults_(config) {
  const defaults = {
    indexName: config.RAG_CHAT_INDEX_NAME,
    indexFileId: config.RAG_CHAT_INDEX_FILE_ID,
    source: {
      folderId: config.RAG_CHAT_SOURCE_FOLDER_ID,
      includeSubfolders: true,
      includeMimeTypes: cookbookSupportedMimeTypes_()
    },
    embedding: {
      provider: config.RAG_CHAT_EMBEDDING_PROVIDER
    },
    fallbackToSupportedMimeTypes: true,
    fastStateInspect: true
  };

  if (config.RAG_CHAT_EMBED_MODEL) {
    defaults.embedding.model = config.RAG_CHAT_EMBED_MODEL;
  }

  return defaults;
}
