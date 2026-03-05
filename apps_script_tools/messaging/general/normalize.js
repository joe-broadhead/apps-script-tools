function astMessagingIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astMessagingNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astMessagingClonePlainObject(value, fallback = {}) {
  if (!astMessagingIsPlainObject(value)) {
    return Object.assign({}, fallback);
  }
  return Object.assign({}, value);
}

function astMessagingNormalizeArray(value) {
  return Array.isArray(value) ? value.slice() : [];
}
