// RAG Chat Cookbook (generic + customizable)
// Build: 2026-02-23T13:00:00Z

var RAG_CHAT_BUILD = '2026-02-23T13:00:00Z';

var RAG_CHAT_DEFAULTS = {
  app: {
    name: 'AST RAG Chat Starter',
    tagline: 'Grounded answers from your Drive knowledge base',
    placeholder: 'Ask a question about your indexed files...',
    logoUrl: '',
    fontFamily: '"Inter", "SF Pro Display", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
    palette: {
      primary: '#2563eb',
      accent: '#14b8a6',
      bgStart: '#eff6ff',
      bgEnd: '#ecfeff',
      surface: '#ffffff',
      text: '#0f172a',
      muted: '#475569'
    }
  },
  rag: {
    topKFast: 6,
    topKDeep: 10,
    minScore: 0.2,
    maxOutputTokensFast: 1400,
    maxOutputTokensDeep: 2600,
    insufficientEvidenceMessage: 'I do not have enough grounded context to answer that.',
    autoBuildIndex: true,
    indexName: 'ast-rag-chat-index'
  },
  threads: {
    maxThreads: 12,
    maxTurns: 40,
    ttlSec: 60 * 60 * 24 * 30
  },
  cache: {
    backend: 'drive_json',
    namespace: 'rag_chat_app',
    driveFolderId: '',
    driveFileName: 'rag-chat-cache.json',
    storageUri: '',
    lockTimeoutMs: 30000,
    lockScope: 'user',
    updateStatsOnGet: false
  },
  runtime: {
    chatRateLimitWindowSec: 60,
    chatRateLimitMaxRequests: 20,
    requestDedupeTtlSec: 20,
    inflightLockTtlSec: 45,
    indexAutoResumeOnInit: true,
    indexJobMaxRuntimeMs: 90000,
    indexJobMaxRetries: 1,
    indexJobPropertyPrefix: 'RAG_CHAT_INDEX_JOB_',
    metricsTtlSec: 60 * 60 * 24 * 7,
    metricsMaxEvents: 250
  },
  security: {
    requireAuthenticatedUser: true,
    restrictIndexMutationsToAdmins: true,
    restrictWarmupToAdmins: true
  }
};

function resolveAppConfig_(request) {
  request = request || {};
  var props = PropertiesService.getScriptProperties().getProperties();
  var reqApp = request.app || {};
  var reqPalette = reqApp.palette || {};

  var app = {
    name: firstNonEmpty_([
      reqApp.name,
      props.APP_NAME,
      RAG_CHAT_DEFAULTS.app.name
    ]),
    tagline: firstNonEmpty_([
      reqApp.tagline,
      props.APP_TAGLINE,
      RAG_CHAT_DEFAULTS.app.tagline
    ]),
    placeholder: firstNonEmpty_([
      reqApp.placeholder,
      props.APP_PLACEHOLDER,
      RAG_CHAT_DEFAULTS.app.placeholder
    ]),
    logoUrl: firstNonEmpty_([
      reqApp.logoUrl,
      props.APP_LOGO_URL,
      RAG_CHAT_DEFAULTS.app.logoUrl
    ]),
    fontFamily: firstNonEmpty_([
      reqApp.fontFamily,
      props.APP_FONT_FAMILY,
      RAG_CHAT_DEFAULTS.app.fontFamily
    ]),
    palette: {
      primary: firstNonEmpty_([
        reqPalette.primary,
        props.APP_COLOR_PRIMARY,
        RAG_CHAT_DEFAULTS.app.palette.primary
      ]),
      accent: firstNonEmpty_([
        reqPalette.accent,
        props.APP_COLOR_ACCENT,
        RAG_CHAT_DEFAULTS.app.palette.accent
      ]),
      bgStart: firstNonEmpty_([
        reqPalette.bgStart,
        props.APP_COLOR_BG_START,
        RAG_CHAT_DEFAULTS.app.palette.bgStart
      ]),
      bgEnd: firstNonEmpty_([
        reqPalette.bgEnd,
        props.APP_COLOR_BG_END,
        RAG_CHAT_DEFAULTS.app.palette.bgEnd
      ]),
      surface: firstNonEmpty_([
        reqPalette.surface,
        props.APP_COLOR_SURFACE,
        RAG_CHAT_DEFAULTS.app.palette.surface
      ]),
      text: firstNonEmpty_([
        reqPalette.text,
        props.APP_COLOR_TEXT,
        RAG_CHAT_DEFAULTS.app.palette.text
      ]),
      muted: firstNonEmpty_([
        reqPalette.muted,
        props.APP_COLOR_MUTED,
        RAG_CHAT_DEFAULTS.app.palette.muted
      ])
    }
  };

  var rag = {
    topKFast: integerOr_(
      firstNonEmpty_([request.topKFast, props.RAG_TOP_K_FAST]),
      RAG_CHAT_DEFAULTS.rag.topKFast
    ),
    topKDeep: integerOr_(
      firstNonEmpty_([request.topKDeep, props.RAG_TOP_K_DEEP]),
      RAG_CHAT_DEFAULTS.rag.topKDeep
    ),
    minScore: numberOr_(
      firstNonEmpty_([request.minScore, props.RAG_MIN_SCORE]),
      RAG_CHAT_DEFAULTS.rag.minScore
    ),
    maxOutputTokensFast: integerOr_(
      firstNonEmpty_([request.maxOutputTokensFast, props.RAG_MAX_OUTPUT_TOKENS_FAST]),
      RAG_CHAT_DEFAULTS.rag.maxOutputTokensFast
    ),
    maxOutputTokensDeep: integerOr_(
      firstNonEmpty_([request.maxOutputTokensDeep, props.RAG_MAX_OUTPUT_TOKENS_DEEP]),
      RAG_CHAT_DEFAULTS.rag.maxOutputTokensDeep
    ),
    insufficientEvidenceMessage: firstNonEmpty_([
      request.insufficientEvidenceMessage,
      props.RAG_INSUFFICIENT_EVIDENCE_MESSAGE,
      RAG_CHAT_DEFAULTS.rag.insufficientEvidenceMessage
    ]),
    autoBuildIndex: booleanOr_(
      firstNonEmpty_([request.autoBuildIndex, props.RAG_AUTO_BUILD_INDEX]),
      RAG_CHAT_DEFAULTS.rag.autoBuildIndex
    ),
    indexName: firstNonEmpty_([
      request.indexName,
      props.RAG_INDEX_NAME,
      RAG_CHAT_DEFAULTS.rag.indexName
    ])
  };

  var threads = {
    maxThreads: integerOr_(
      firstNonEmpty_([request.maxThreads, props.RAG_THREAD_MAX]),
      RAG_CHAT_DEFAULTS.threads.maxThreads
    ),
    maxTurns: integerOr_(
      firstNonEmpty_([request.maxTurns, props.RAG_THREAD_TURNS_MAX]),
      RAG_CHAT_DEFAULTS.threads.maxTurns
    ),
    ttlSec: integerOr_(
      firstNonEmpty_([request.threadTtlSec, props.RAG_THREAD_TTL_SEC]),
      RAG_CHAT_DEFAULTS.threads.ttlSec
    )
  };

  var security = {
    requireAuthenticatedUser: booleanOr_(
      firstNonEmpty_([
        request.requireAuthenticatedUser,
        props.WEBAPP_REQUIRE_AUTHENTICATED_USER
      ]),
      RAG_CHAT_DEFAULTS.security.requireAuthenticatedUser
    ),
    restrictIndexMutationsToAdmins: booleanOr_(
      firstNonEmpty_([
        request.restrictIndexMutationsToAdmins,
        props.WEBAPP_RESTRICT_INDEX_MUTATIONS_TO_ADMINS
      ]),
      RAG_CHAT_DEFAULTS.security.restrictIndexMutationsToAdmins
    ),
    restrictWarmupToAdmins: booleanOr_(
      firstNonEmpty_([
        request.restrictWarmupToAdmins,
        props.WEBAPP_RESTRICT_WARMUP_TO_ADMINS
      ]),
      RAG_CHAT_DEFAULTS.security.restrictWarmupToAdmins
    ),
    allowedEmails: normalizeStringList_(request.allowedEmails, props.WEBAPP_ALLOWED_EMAILS, true),
    allowedDomains: normalizeStringList_(request.allowedDomains, props.WEBAPP_ALLOWED_DOMAINS, true),
    allowedUserKeys: normalizeStringList_(request.allowedUserKeys, props.WEBAPP_ALLOWED_USER_KEYS, false),
    adminEmails: normalizeStringList_(request.adminEmails, props.WEBAPP_ADMIN_EMAILS, true),
    adminDomains: normalizeStringList_(request.adminDomains, props.WEBAPP_ADMIN_DOMAINS, true),
    adminUserKeys: normalizeStringList_(request.adminUserKeys, props.WEBAPP_ADMIN_USER_KEYS, false)
  };

  var cache = {
    backend: stringOrEmpty_(firstNonEmpty_([
      request.cacheBackend,
      request.cache && request.cache.backend,
      props.RAG_CACHE_BACKEND,
      props.CACHE_BACKEND,
      RAG_CHAT_DEFAULTS.cache.backend
    ])).toLowerCase(),
    namespace: firstNonEmpty_([
      request.cacheNamespace,
      request.cache && request.cache.namespace,
      props.RAG_CACHE_NAMESPACE,
      props.CACHE_NAMESPACE,
      RAG_CHAT_DEFAULTS.cache.namespace
    ]),
    driveFolderId: firstNonEmpty_([
      request.cacheDriveFolderId,
      request.cache && request.cache.driveFolderId,
      props.RAG_CACHE_DRIVE_FOLDER_ID,
      props.CACHE_DRIVE_FOLDER_ID,
      RAG_CHAT_DEFAULTS.cache.driveFolderId
    ]),
    driveFileName: firstNonEmpty_([
      request.cacheDriveFileName,
      request.cache && request.cache.driveFileName,
      props.RAG_CACHE_DRIVE_FILE_NAME,
      props.CACHE_DRIVE_FILE_NAME,
      RAG_CHAT_DEFAULTS.cache.driveFileName
    ]),
    storageUri: firstNonEmpty_([
      request.cacheStorageUri,
      request.cache && request.cache.storageUri,
      props.RAG_CACHE_STORAGE_URI,
      props.CACHE_STORAGE_URI,
      RAG_CHAT_DEFAULTS.cache.storageUri
    ]),
    lockTimeoutMs: integerOr_(
      firstNonEmpty_([
        request.cacheLockTimeoutMs,
        request.cache && request.cache.lockTimeoutMs,
        props.RAG_CACHE_LOCK_TIMEOUT_MS,
        props.CACHE_LOCK_TIMEOUT_MS
      ]),
      RAG_CHAT_DEFAULTS.cache.lockTimeoutMs
    ),
    lockScope: stringOrEmpty_(firstNonEmpty_([
      request.cacheLockScope,
      request.cache && request.cache.lockScope,
      props.RAG_CACHE_LOCK_SCOPE,
      props.CACHE_LOCK_SCOPE,
      RAG_CHAT_DEFAULTS.cache.lockScope
    ])).toLowerCase(),
    updateStatsOnGet: booleanOr_(
      firstNonEmpty_([
        request.cacheUpdateStatsOnGet,
        request.cache && request.cache.updateStatsOnGet,
        props.RAG_CACHE_UPDATE_STATS_ON_GET,
        props.CACHE_UPDATE_STATS_ON_GET
      ]),
      RAG_CHAT_DEFAULTS.cache.updateStatsOnGet
    )
  };

  var runtime = {
    chatRateLimitWindowSec: integerOr_(
      firstNonEmpty_([request.chatRateLimitWindowSec, props.RAG_CHAT_RATE_LIMIT_WINDOW_SEC]),
      RAG_CHAT_DEFAULTS.runtime.chatRateLimitWindowSec
    ),
    chatRateLimitMaxRequests: integerOr_(
      firstNonEmpty_([request.chatRateLimitMaxRequests, props.RAG_CHAT_RATE_LIMIT_MAX_REQUESTS]),
      RAG_CHAT_DEFAULTS.runtime.chatRateLimitMaxRequests
    ),
    requestDedupeTtlSec: integerOr_(
      firstNonEmpty_([request.requestDedupeTtlSec, props.RAG_CHAT_REQUEST_DEDUPE_TTL_SEC]),
      RAG_CHAT_DEFAULTS.runtime.requestDedupeTtlSec
    ),
    inflightLockTtlSec: integerOr_(
      firstNonEmpty_([request.inflightLockTtlSec, props.RAG_CHAT_INFLIGHT_LOCK_TTL_SEC]),
      RAG_CHAT_DEFAULTS.runtime.inflightLockTtlSec
    ),
    indexAutoResumeOnInit: booleanOr_(
      firstNonEmpty_([request.indexAutoResumeOnInit, props.RAG_INDEX_JOB_AUTO_RESUME_ON_INIT]),
      RAG_CHAT_DEFAULTS.runtime.indexAutoResumeOnInit
    ),
    indexJobMaxRuntimeMs: integerOr_(
      firstNonEmpty_([request.indexJobMaxRuntimeMs, props.RAG_INDEX_JOB_MAX_RUNTIME_MS]),
      RAG_CHAT_DEFAULTS.runtime.indexJobMaxRuntimeMs
    ),
    indexJobMaxRetries: integerOr_(
      firstNonEmpty_([request.indexJobMaxRetries, props.RAG_INDEX_JOB_MAX_RETRIES]),
      RAG_CHAT_DEFAULTS.runtime.indexJobMaxRetries
    ),
    indexJobPropertyPrefix: firstNonEmpty_([
      request.indexJobPropertyPrefix,
      props.RAG_INDEX_JOB_PROPERTY_PREFIX,
      RAG_CHAT_DEFAULTS.runtime.indexJobPropertyPrefix
    ]),
    metricsTtlSec: integerOr_(
      firstNonEmpty_([request.metricsTtlSec, props.RAG_METRICS_TTL_SEC]),
      RAG_CHAT_DEFAULTS.runtime.metricsTtlSec
    ),
    metricsMaxEvents: integerOr_(
      firstNonEmpty_([request.metricsMaxEvents, props.RAG_METRICS_MAX_EVENTS]),
      RAG_CHAT_DEFAULTS.runtime.metricsMaxEvents
    )
  };

  return {
    app: app,
    rag: rag,
    threads: threads,
    cache: cache,
    runtime: runtime,
    security: security
  };
}

function buildCacheOptions_(cfg, namespace, overrides) {
  cfg = cfg || {};
  overrides = overrides || {};

  var cache = cfg.cache || {};
  var out = {
    backend: firstNonEmpty_([
      overrides.backend,
      cache.backend,
      RAG_CHAT_DEFAULTS.cache.backend
    ]),
    namespace: firstNonEmpty_([
      namespace,
      overrides.namespace,
      cache.namespace,
      RAG_CHAT_DEFAULTS.cache.namespace
    ])
  };

  var driveFolderId = firstNonEmpty_([
    overrides.driveFolderId,
    cache.driveFolderId
  ]);
  if (driveFolderId) out.driveFolderId = driveFolderId;

  var driveFileName = firstNonEmpty_([
    overrides.driveFileName,
    cache.driveFileName
  ]);
  if (driveFileName) out.driveFileName = driveFileName;

  var storageUri = firstNonEmpty_([
    overrides.storageUri,
    cache.storageUri
  ]);
  if (storageUri) out.storageUri = storageUri;

  var lockTimeoutMs = integerOr_(
    firstNonEmpty_([
      overrides.lockTimeoutMs,
      cache.lockTimeoutMs
    ]),
    null
  );
  if (lockTimeoutMs != null) out.lockTimeoutMs = lockTimeoutMs;

  var lockScope = firstNonEmpty_([
    overrides.lockScope,
    cache.lockScope
  ]);
  if (lockScope) out.lockScope = stringOrEmpty_(lockScope).toLowerCase();

  if (typeof overrides.updateStatsOnGet !== 'undefined') {
    out.updateStatsOnGet = booleanOr_(overrides.updateStatsOnGet, cache.updateStatsOnGet);
  } else if (typeof cache.updateStatsOnGet !== 'undefined') {
    out.updateStatsOnGet = booleanOr_(cache.updateStatsOnGet, RAG_CHAT_DEFAULTS.cache.updateStatsOnGet);
  }

  if (typeof overrides.ttlSec !== 'undefined') {
    var ttl = integerOr_(overrides.ttlSec, null);
    if (ttl != null) out.ttlSec = ttl;
  }

  return out;
}

function buildUiBootstrap_(cfg) {
  cfg = cfg || {};
  var app = cfg.app || {};
  return {
    name: stringOrEmpty_(app.name),
    tagline: stringOrEmpty_(app.tagline),
    placeholder: stringOrEmpty_(app.placeholder),
    logoUrl: stringOrEmpty_(app.logoUrl),
    fontFamily: stringOrEmpty_(app.fontFamily),
    palette: app.palette || {}
  };
}

function normalizeStringList_(requestValue, propertyValue, lowercase) {
  var raw = requestValue;
  if (typeof raw === 'undefined' || raw === null || raw === '') {
    raw = propertyValue;
  }

  var items;
  if (Array.isArray(raw)) {
    items = raw.slice();
  } else if (typeof raw === 'string') {
    items = raw.split(',');
  } else {
    return [];
  }

  var seen = {};
  var out = [];

  for (var i = 0; i < items.length; i += 1) {
    var value = stringOrEmpty_(items[i]).trim();
    if (!value) continue;

    if (lowercase === true) {
      value = value.toLowerCase();
    }

    if (seen[value]) continue;
    seen[value] = true;
    out.push(value);
  }

  return out;
}
