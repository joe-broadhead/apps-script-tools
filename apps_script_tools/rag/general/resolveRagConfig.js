const AST_RAG_CONFIG_KEYS = Object.freeze([
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'OPENAI_EMBED_MODEL',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'GEMINI_EMBED_MODEL',
  'OPENROUTER_API_KEY',
  'OPENROUTER_MODEL',
  'OPENROUTER_EMBED_MODEL',
  'OPENROUTER_HTTP_REFERER',
  'OPENROUTER_X_TITLE',
  'PERPLEXITY_API_KEY',
  'PERPLEXITY_MODEL',
  'PERPLEXITY_EMBED_MODEL',
  'VERTEX_PROJECT_ID',
  'VERTEX_LOCATION',
  'VERTEX_GEMINI_MODEL',
  'VERTEX_PDF_EXTRACT_MODEL',
  'VERTEX_EMBED_MODEL',
  'VERTEX_SERVICE_ACCOUNT_JSON',
  'VERTEX_AUTH_MODE',
  'RAG_DEFAULT_INDEX_FOLDER_ID',
  'RAG_DEFAULT_TOP_K',
  'RAG_DEFAULT_MIN_SCORE',
  'RAG_DIAGNOSTICS_ENABLED',
  'RAG_CACHE_ENABLED',
  'RAG_CACHE_BACKEND',
  'RAG_CACHE_NAMESPACE',
  'RAG_CACHE_TTL_SEC',
  'RAG_CACHE_SEARCH_TTL_SEC',
  'RAG_CACHE_ANSWER_TTL_SEC',
  'RAG_CACHE_EMBEDDING_TTL_SEC',
  'RAG_CACHE_STORAGE_URI',
  'RAG_CACHE_LOCK_TIMEOUT_MS',
  'RAG_CACHE_LOCK_SCOPE',
  'RAG_CACHE_UPDATE_STATS_ON_GET'
]);

let AST_RAG_RUNTIME_CONFIG = {};

function astRagInvalidateScriptPropertiesSnapshotCache() {
  if (typeof astConfigInvalidateScriptPropertiesSnapshotMemoized === 'function') {
    astConfigInvalidateScriptPropertiesSnapshotMemoized();
  }
}

function astRagGetRuntimeConfig() {
  return astRagCloneObject(AST_RAG_RUNTIME_CONFIG);
}

function astRagSetRuntimeConfig(config = {}, options = {}) {
  if (!astRagIsPlainObject(config)) {
    throw new AstRagValidationError('RAG runtime config must be an object');
  }

  if (!astRagIsPlainObject(options)) {
    throw new AstRagValidationError('RAG runtime options must be an object');
  }

  const merge = options.merge !== false;
  let next;
  if (typeof astConfigMergeNormalizedConfig === 'function') {
    next = astConfigMergeNormalizedConfig(
      merge ? astRagGetRuntimeConfig() : {},
      config,
      { merge: true }
    );
  } else {
    next = merge ? astRagGetRuntimeConfig() : {};

    Object.keys(config).forEach(key => {
      const normalizedKey = astRagNormalizeString(key, '');
      if (!normalizedKey) {
        return;
      }

      const value = config[key];
      if (value == null || (typeof value === 'string' && value.trim().length === 0)) {
        delete next[normalizedKey];
        return;
      }

      if (typeof value === 'string') {
        next[normalizedKey] = value.trim();
        return;
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        next[normalizedKey] = String(value);
        return;
      }

      delete next[normalizedKey];
    });
  }

  AST_RAG_RUNTIME_CONFIG = next;
  astRagInvalidateScriptPropertiesSnapshotCache();
  return astRagGetRuntimeConfig();
}

function astRagClearRuntimeConfig() {
  AST_RAG_RUNTIME_CONFIG = {};
  astRagInvalidateScriptPropertiesSnapshotCache();
  return {};
}

function astRagResolveProviderAuth(auth = {}, provider) {
  if (!astRagIsPlainObject(auth)) {
    return {};
  }

  const nested = auth[provider];
  if (astRagIsPlainObject(nested)) {
    return nested;
  }

  return auth;
}

function astRagResolveConfigString({
  field,
  scriptKey,
  required = false,
  requestValue,
  authValue,
  runtimeConfig = {},
  scriptConfig = {}
}) {
  const candidates = [requestValue, authValue, runtimeConfig[scriptKey], scriptConfig[scriptKey]];

  if (typeof astConfigResolveFirstString === 'function') {
    const resolved = astConfigResolveFirstString(candidates, null);
    if (resolved != null) {
      return astRagMaybeResolveSecretReference(resolved, field, scriptKey);
    }
  } else {
    for (let idx = 0; idx < candidates.length; idx += 1) {
      const normalized = astRagNormalizeString(candidates[idx], null);
      if (normalized) {
        return astRagMaybeResolveSecretReference(normalized, field, scriptKey);
      }
    }
  }

  if (required) {
    throw new AstRagAuthError(`Missing required RAG configuration field '${field}'`, {
      field,
      scriptKey
    });
  }

  return null;
}

function astRagMaybeResolveSecretReference(value, field, scriptKey) {
  if (typeof value !== 'string') {
    return value;
  }

  if (!value.startsWith('secret://')) {
    return value;
  }

  if (typeof astSecretsResolveValue !== 'function') {
    throw new AstRagAuthError(
      `RAG configuration field '${field}' references AST.Secrets, but AST.Secrets is unavailable`,
      {
        field,
        scriptKey
      }
    );
  }

  try {
    const resolved = astSecretsResolveValue(value, { required: true });
    if (typeof resolved !== 'string' || resolved.trim().length === 0) {
      throw new AstRagAuthError(
        `RAG configuration field '${field}' resolved to an empty secret`,
        {
          field,
          scriptKey
        }
      );
    }
    return resolved.trim();
  } catch (error) {
    if (error instanceof AstRagAuthError) {
      throw error;
    }

    throw new AstRagAuthError(
      `Failed to resolve RAG configuration field '${field}' via AST.Secrets`,
      {
        field,
        scriptKey
      },
      error
    );
  }
}

function astRagResolveConfigSnapshot(options = {}) {
  return Object.assign(
    {},
    astRagToScriptPropertiesSnapshot(AST_RAG_CONFIG_KEYS, options),
    astRagGetRuntimeConfig()
  );
}

function astRagResolveProviderConfig({ provider, mode, model, auth = {} }) {
  const config = astRagResolveConfigSnapshot({
    forceRefresh: provider === 'vertex_gemini'
  });
  const providerAuth = astRagResolveProviderAuth(auth, provider);
  const modeKey = mode === 'embedding' ? 'embed' : 'generation';
  const isBuiltInProvider = AST_RAG_EMBEDDING_PROVIDERS.includes(provider);

  if (!isBuiltInProvider) {
    if (typeof astRagHasEmbeddingProvider !== 'function' || !astRagHasEmbeddingProvider(provider)) {
      throw new AstRagEmbeddingCapabilityError('Embedding provider is not registered', { provider });
    }

    const providerPrefix = provider.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    const modelScriptKey = modeKey === 'embed'
      ? `${providerPrefix}_EMBED_MODEL`
      : `${providerPrefix}_MODEL`;

    const resolvedModel = astRagResolveConfigString({
      field: 'model',
      scriptKey: modelScriptKey,
      required: false,
      requestValue: model,
      authValue: providerAuth.model,
      runtimeConfig: config,
      scriptConfig: config
    });

    const apiKey = astRagResolveConfigString({
      field: 'apiKey',
      scriptKey: `${providerPrefix}_API_KEY`,
      required: false,
      requestValue: providerAuth.apiKey,
      authValue: providerAuth[`${providerPrefix}_API_KEY`],
      runtimeConfig: config,
      scriptConfig: config
    });

    const customConfig = Object.assign({}, providerAuth, {
      provider,
      mode
    });

    if (resolvedModel) {
      customConfig.model = resolvedModel;
    }

    if (apiKey && !customConfig.apiKey) {
      customConfig.apiKey = apiKey;
    }

    return customConfig;
  }

  if (provider === 'vertex_gemini') {
    const projectId = astRagResolveConfigString({
      field: 'projectId',
      scriptKey: 'VERTEX_PROJECT_ID',
      required: true,
      requestValue: providerAuth.projectId,
      authValue: providerAuth.VERTEX_PROJECT_ID,
      runtimeConfig: config,
      scriptConfig: config
    });

    const location = astRagResolveConfigString({
      field: 'location',
      scriptKey: 'VERTEX_LOCATION',
      required: true,
      requestValue: providerAuth.location,
      authValue: providerAuth.VERTEX_LOCATION,
      runtimeConfig: config,
      scriptConfig: config
    });

    const modelKey = modeKey === 'embed' ? 'VERTEX_EMBED_MODEL' : 'VERTEX_GEMINI_MODEL';
    const resolvedModel = astRagResolveConfigString({
      field: 'model',
      scriptKey: modelKey,
      required: true,
      requestValue: model,
      authValue: providerAuth.model,
      runtimeConfig: config,
      scriptConfig: config
    });

    const token = astRagResolveVertexAccessToken(providerAuth, config, config);

    return {
      provider,
      mode,
      projectId,
      location,
      model: resolvedModel,
      oauthToken: token.oauthToken,
      authMode: token.authMode
    };
  }

  const keyMap = {
    openai: {
      apiKey: 'OPENAI_API_KEY',
      generationModel: 'OPENAI_MODEL',
      embeddingModel: 'OPENAI_EMBED_MODEL'
    },
    gemini: {
      apiKey: 'GEMINI_API_KEY',
      generationModel: 'GEMINI_MODEL',
      embeddingModel: 'GEMINI_EMBED_MODEL'
    },
    openrouter: {
      apiKey: 'OPENROUTER_API_KEY',
      generationModel: 'OPENROUTER_MODEL',
      embeddingModel: 'OPENROUTER_EMBED_MODEL'
    },
    perplexity: {
      apiKey: 'PERPLEXITY_API_KEY',
      generationModel: 'PERPLEXITY_MODEL',
      embeddingModel: 'PERPLEXITY_EMBED_MODEL'
    }
  };

  const map = keyMap[provider];
  const resolvedModel = astRagResolveConfigString({
    field: 'model',
    scriptKey: modeKey === 'embed' ? map.embeddingModel : map.generationModel,
    required: true,
    requestValue: model,
    authValue: providerAuth.model,
    runtimeConfig: config,
    scriptConfig: config
  });

  const output = {
    provider,
    mode,
    apiKey: astRagResolveConfigString({
      field: 'apiKey',
      scriptKey: map.apiKey,
      required: true,
      requestValue: providerAuth.apiKey,
      authValue: providerAuth[map.apiKey],
      runtimeConfig: config,
      scriptConfig: config
    }),
    model: resolvedModel
  };

  if (provider === 'openrouter') {
    output.httpReferer = astRagResolveConfigString({
      field: 'httpReferer',
      scriptKey: 'OPENROUTER_HTTP_REFERER',
      required: false,
      requestValue: providerAuth.httpReferer,
      authValue: providerAuth.OPENROUTER_HTTP_REFERER,
      runtimeConfig: config,
      scriptConfig: config
    });

    output.xTitle = astRagResolveConfigString({
      field: 'xTitle',
      scriptKey: 'OPENROUTER_X_TITLE',
      required: false,
      requestValue: providerAuth.xTitle,
      authValue: providerAuth.OPENROUTER_X_TITLE,
      runtimeConfig: config,
      scriptConfig: config
    });
  }

  return output;
}

function astRagResolveRetrievalDefaults() {
  const config = astRagResolveConfigSnapshot();
  const topK = astRagNormalizePositiveInt(config.RAG_DEFAULT_TOP_K, AST_RAG_DEFAULT_RETRIEVAL.topK, 1);
  const minScoreRaw = config.RAG_DEFAULT_MIN_SCORE;
  let minScore = AST_RAG_DEFAULT_RETRIEVAL.minScore;

  if (typeof minScoreRaw === 'string' && minScoreRaw.trim().length > 0 && !isNaN(Number(minScoreRaw))) {
    minScore = Math.max(-1, Math.min(1, Number(minScoreRaw)));
  }

  const defaultFolderId = astRagNormalizeString(config.RAG_DEFAULT_INDEX_FOLDER_ID, null);

  return {
    topK,
    minScore,
    mode: AST_RAG_DEFAULT_RETRIEVAL.mode,
    lexicalPrefilterTopN: AST_RAG_DEFAULT_RETRIEVAL.lexicalPrefilterTopN,
    lexicalWeight: AST_RAG_DEFAULT_RETRIEVAL.lexicalWeight,
    vectorWeight: AST_RAG_DEFAULT_RETRIEVAL.vectorWeight,
    rerank: {
      enabled: AST_RAG_DEFAULT_RETRIEVAL.rerank.enabled,
      topN: AST_RAG_DEFAULT_RETRIEVAL.rerank.topN,
      provider: AST_RAG_DEFAULT_RETRIEVAL.rerank.provider
    },
    defaultFolderId
  };
}

function astRagResolveCacheConfig(overrides = {}) {
  const snapshot = astRagResolveConfigSnapshot();
  const input = astRagIsPlainObject(overrides) ? overrides : {};

  const normalizeBoolean = (value, fallback) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const token = value.trim().toLowerCase();
      if (token === 'true') {
        return true;
      }
      if (token === 'false') {
        return false;
      }
    }
    return fallback;
  };

  const normalizeInt = (value, fallback, min) => {
    return astRagNormalizePositiveInt(value, fallback, min);
  };

  const enabled = normalizeBoolean(
    input.enabled,
    normalizeBoolean(snapshot.RAG_CACHE_ENABLED, AST_RAG_CACHE_DEFAULTS.enabled)
  );

  const backend = astRagNormalizeCacheBackend(
    astRagNormalizeString(input.backend, astRagNormalizeString(snapshot.RAG_CACHE_BACKEND, AST_RAG_CACHE_DEFAULTS.backend)),
    AST_RAG_CACHE_DEFAULTS.backend
  );

  const namespace = astRagNormalizeString(
    input.namespace,
    astRagNormalizeString(snapshot.RAG_CACHE_NAMESPACE, AST_RAG_CACHE_DEFAULTS.namespace)
  );

  const ttlSec = normalizeInt(
    input.ttlSec,
    normalizeInt(snapshot.RAG_CACHE_TTL_SEC, AST_RAG_CACHE_DEFAULTS.ttlSec, 1),
    1
  );

  const searchTtlSec = normalizeInt(
    input.searchTtlSec,
    normalizeInt(snapshot.RAG_CACHE_SEARCH_TTL_SEC, AST_RAG_CACHE_DEFAULTS.searchTtlSec, 1),
    1
  );

  const answerTtlSec = normalizeInt(
    input.answerTtlSec,
    normalizeInt(snapshot.RAG_CACHE_ANSWER_TTL_SEC, AST_RAG_CACHE_DEFAULTS.answerTtlSec, 1),
    1
  );

  const embeddingTtlSec = normalizeInt(
    input.embeddingTtlSec,
    normalizeInt(snapshot.RAG_CACHE_EMBEDDING_TTL_SEC, AST_RAG_CACHE_DEFAULTS.embeddingTtlSec, 1),
    1
  );

  const storageUri = astRagNormalizeString(
    input.storageUri,
    astRagNormalizeString(snapshot.RAG_CACHE_STORAGE_URI, AST_RAG_CACHE_DEFAULTS.storageUri)
  );

  const lockTimeoutMs = normalizeInt(
    input.lockTimeoutMs,
    normalizeInt(snapshot.RAG_CACHE_LOCK_TIMEOUT_MS, AST_RAG_CACHE_DEFAULTS.lockTimeoutMs, 1),
    1
  );

  const lockScope = astRagNormalizeString(
    input.lockScope,
    astRagNormalizeString(snapshot.RAG_CACHE_LOCK_SCOPE, AST_RAG_CACHE_DEFAULTS.lockScope)
  );
  if (['script', 'user', 'none'].indexOf(lockScope) === -1) {
    throw new AstRagValidationError('cache.lockScope must be one of: script, user, none', {
      lockScope
    });
  }

  const updateStatsOnGet = normalizeBoolean(
    input.updateStatsOnGet,
    normalizeBoolean(snapshot.RAG_CACHE_UPDATE_STATS_ON_GET, AST_RAG_CACHE_DEFAULTS.updateStatsOnGet)
  );

  return {
    enabled,
    backend,
    namespace,
    ttlSec,
    searchTtlSec,
    answerTtlSec,
    embeddingTtlSec,
    storageUri,
    lockTimeoutMs,
    lockScope,
    updateStatsOnGet
  };
}

function astRagResolveDiagnosticsEnabledDefault() {
  const snapshot = astRagResolveConfigSnapshot();
  const value = snapshot.RAG_DIAGNOSTICS_ENABLED;

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const token = value.trim().toLowerCase();
    if (token === 'true' || token === '1' || token === 'yes') {
      return true;
    }
    if (token === 'false' || token === '0' || token === 'no') {
      return false;
    }
  }

  return false;
}
