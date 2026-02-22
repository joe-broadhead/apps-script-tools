function astCacheBuildEntry({
  normalizedKey,
  keyHash,
  value,
  tags,
  ttlSec,
  nowMs
}) {
  const resolvedNowMs = Number(nowMs);
  if (!Number.isFinite(resolvedNowMs)) {
    throw new AstCacheValidationError('Cache entry nowMs must be a finite number');
  }

  const safeKey = astCacheNormalizeString(normalizedKey, '');
  const safeKeyHash = astCacheNormalizeString(keyHash, '');

  if (!safeKey || !safeKeyHash) {
    throw new AstCacheValidationError('Cache entry requires normalizedKey and keyHash');
  }

  const safeTags = astCacheNormalizeTags(tags);
  const safeValue = astCacheEnsureSerializable(value, 'value');
  const expiresAtMs = astCacheResolveExpiresAt(resolvedNowMs, ttlSec);

  return {
    keyHash: safeKeyHash,
    normalizedKey: safeKey,
    value: safeValue,
    tags: safeTags,
    createdAtMs: resolvedNowMs,
    updatedAtMs: resolvedNowMs,
    expiresAtMs
  };
}

function astCacheTouchEntry(entry, nowMs) {
  const safeEntry = astCacheEnsureSerializable(entry, 'entry');
  safeEntry.updatedAtMs = nowMs;
  return safeEntry;
}
