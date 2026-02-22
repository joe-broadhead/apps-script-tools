function astCacheResolveTtlSec(ttlSec, defaultTtlSec) {
  if (typeof ttlSec === 'undefined' || ttlSec === null) {
    return defaultTtlSec;
  }

  const numeric = Number(ttlSec);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new AstCacheValidationError('Cache ttlSec must be a number >= 0', { ttlSec });
  }

  return Math.floor(numeric);
}

function astCacheResolveExpiresAt(nowMs, ttlSec) {
  if (ttlSec === null) {
    return null;
  }

  if (ttlSec === 0) {
    return nowMs;
  }

  return nowMs + (ttlSec * 1000);
}

function astCacheIsExpired(entry, nowMs) {
  if (!entry || typeof entry.expiresAtMs !== 'number') {
    return false;
  }

  return nowMs >= entry.expiresAtMs;
}
