function astCacheBytesToHex(bytes) {
  const source = Array.isArray(bytes) ? bytes : [];
  let output = '';

  for (let idx = 0; idx < source.length; idx += 1) {
    const raw = Number(source[idx]);
    const normalized = raw < 0 ? raw + 256 : raw;
    output += normalized.toString(16).padStart(2, '0');
  }

  return output;
}

function astCacheHashKey(normalizedKey) {
  const keyString = astCacheNormalizeString(normalizedKey, '');
  if (!keyString) {
    throw new AstCacheValidationError('Cache key hash input must be a non-empty string');
  }

  try {
    if (
      typeof Utilities !== 'undefined' &&
      Utilities &&
      Utilities.DigestAlgorithm &&
      typeof Utilities.computeDigest === 'function'
    ) {
      const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, keyString);
      const hex = astCacheBytesToHex(digest);
      if (hex) {
        return hex;
      }
    }
  } catch (_error) {
    // Fallback below if digest is unavailable.
  }

  let fallbackHash = 0;
  for (let idx = 0; idx < keyString.length; idx += 1) {
    fallbackHash = ((fallbackHash << 5) - fallbackHash) + keyString.charCodeAt(idx);
    fallbackHash |= 0;
  }

  return `fallback_${Math.abs(fallbackHash)}`;
}
