function buildRuntimeCacheOptions_(cfg, suffix, overrides) {
  cfg = cfg || RAG_CHAT_DEFAULTS;
  suffix = stringOrEmpty_(suffix || 'runtime');
  var namespace = stringOrEmpty_(cfg.cache && cfg.cache.namespace) || RAG_CHAT_DEFAULTS.cache.namespace;
  return buildCacheOptions_(cfg, namespace + '_' + suffix, overrides || {});
}

function runRuntimeCacheGet_(ASTX, cfg, key, suffix) {
  try {
    return ASTX.Cache.get(key, buildRuntimeCacheOptions_(cfg, suffix, {
      updateStatsOnGet: false
    }));
  } catch (_error) {
    return null;
  }
}

function runRuntimeCacheSet_(ASTX, cfg, key, value, suffix, ttlSec) {
  try {
    ASTX.Cache.set(key, value, buildRuntimeCacheOptions_(cfg, suffix, {
      ttlSec: integerOr_(ttlSec, 0) > 0 ? integerOr_(ttlSec, 0) : undefined
    }));
  } catch (_error) {
    // cookbook runtime cache should never hard-fail chat path
  }
}

function runRuntimeCacheDelete_(ASTX, cfg, key, suffix) {
  try {
    ASTX.Cache.delete(key, buildRuntimeCacheOptions_(cfg, suffix));
  } catch (_error) {
    // ignore runtime cache delete failures
  }
}

function buildChatRequestFingerprint_(threadId, message, deep) {
  var normalizedThreadId = stringOrEmpty_(threadId);
  var normalizedMessage = stringOrEmpty_(message).trim().toLowerCase();
  var deepToken = deep === true ? 'deep' : 'fast';
  return hashUserIdentifier_([normalizedThreadId, deepToken, normalizedMessage].join('|'));
}

function chatInflightKey_(userContext) {
  return 'chat_inflight:' + stringOrEmpty_(userContext && userContext.emailHash);
}

function chatResponseCacheKey_(userContext, requestFingerprint) {
  return 'chat_response:' + stringOrEmpty_(userContext && userContext.emailHash) + ':' + stringOrEmpty_(requestFingerprint);
}

function chatRateLimitKey_(userContext, windowSec, nowMs) {
  var effectiveWindowSec = Math.max(1, integerOr_(windowSec, 60));
  var bucket = Math.floor(nowMs / (effectiveWindowSec * 1000));
  return 'chat_rate:' + stringOrEmpty_(userContext && userContext.emailHash) + ':' + String(bucket);
}

function enforceChatRateLimit_(ASTX, cfg, userContext) {
  var runtime = cfg.runtime || RAG_CHAT_DEFAULTS.runtime;
  var maxRequests = Math.max(0, integerOr_(runtime.chatRateLimitMaxRequests, RAG_CHAT_DEFAULTS.runtime.chatRateLimitMaxRequests));
  var windowSec = Math.max(1, integerOr_(runtime.chatRateLimitWindowSec, RAG_CHAT_DEFAULTS.runtime.chatRateLimitWindowSec));

  if (maxRequests <= 0) {
    return {
      limited: false,
      remaining: null,
      maxRequests: maxRequests,
      windowSec: windowSec
    };
  }

  var nowMs = Date.now();
  var key = chatRateLimitKey_(userContext, windowSec, nowMs);
  var existing = runRuntimeCacheGet_(ASTX, cfg, key, 'limits') || { count: 0 };
  var count = integerOr_(existing.count, 0);

  if (count >= maxRequests) {
    var error = new Error('Rate limit exceeded. Please wait a moment and retry.');
    error.code = 'RATE_LIMIT';
    error.details = {
      remaining: 0,
      maxRequests: maxRequests,
      windowSec: windowSec
    };
    throw error;
  }

  count += 1;
  runRuntimeCacheSet_(ASTX, cfg, key, {
    count: count,
    updatedAt: nowMs
  }, 'limits', windowSec + 2);

  return {
    limited: true,
    remaining: Math.max(0, maxRequests - count),
    maxRequests: maxRequests,
    windowSec: windowSec
  };
}

function acquireChatInflightLock_(ASTX, cfg, userContext, requestFingerprint) {
  var key = chatInflightKey_(userContext);
  var existing = runRuntimeCacheGet_(ASTX, cfg, key, 'locks');
  if (existing) {
    var err = new Error('Another request is currently running for your account. Please wait.');
    err.code = 'CHAT_INFLIGHT';
    err.details = {
      key: key
    };
    throw err;
  }

  var ttlSec = Math.max(5, integerOr_(
    cfg.runtime && cfg.runtime.inflightLockTtlSec,
    RAG_CHAT_DEFAULTS.runtime.inflightLockTtlSec
  ));
  runRuntimeCacheSet_(ASTX, cfg, key, {
    requestFingerprint: stringOrEmpty_(requestFingerprint),
    startedAt: Date.now()
  }, 'locks', ttlSec);

  return key;
}

function releaseChatInflightLock_(ASTX, cfg, userContext) {
  runRuntimeCacheDelete_(ASTX, cfg, chatInflightKey_(userContext), 'locks');
}

function getRecentChatResponse_(ASTX, cfg, userContext, requestFingerprint) {
  if (!requestFingerprint) return null;
  return runRuntimeCacheGet_(
    ASTX,
    cfg,
    chatResponseCacheKey_(userContext, requestFingerprint),
    'responses'
  );
}

function putRecentChatResponse_(ASTX, cfg, userContext, requestFingerprint, responsePayload) {
  if (!requestFingerprint || !responsePayload) return;
  var ttlSec = Math.max(1, integerOr_(
    cfg.runtime && cfg.runtime.requestDedupeTtlSec,
    RAG_CHAT_DEFAULTS.runtime.requestDedupeTtlSec
  ));
  runRuntimeCacheSet_(
    ASTX,
    cfg,
    chatResponseCacheKey_(userContext, requestFingerprint),
    responsePayload,
    'responses',
    ttlSec
  );
}
