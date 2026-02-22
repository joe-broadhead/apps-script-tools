const AST_CACHE_BACKENDS = Object.freeze(['memory', 'drive_json', 'script_properties']);

const AST_CACHE_CAPABILITY_MATRIX = Object.freeze({
  memory: Object.freeze({
    get: true,
    set: true,
    delete: true,
    invalidateByTag: true,
    stats: true
  }),
  drive_json: Object.freeze({
    get: true,
    set: true,
    delete: true,
    invalidateByTag: true,
    stats: true
  }),
  script_properties: Object.freeze({
    get: true,
    set: true,
    delete: true,
    invalidateByTag: true,
    stats: true
  })
});

function astCacheListBackends() {
  return AST_CACHE_BACKENDS.slice();
}

function astCacheGetCapabilities(backend) {
  const normalizedBackend = astCacheNormalizeString(String(backend || '').toLowerCase(), '');
  const capabilities = AST_CACHE_CAPABILITY_MATRIX[normalizedBackend];

  if (!capabilities) {
    throw new AstCacheValidationError(
      `Cache backend must be one of: ${AST_CACHE_BACKENDS.join(', ')}`,
      { backend: normalizedBackend }
    );
  }

  return Object.assign({}, capabilities);
}

function astCacheAssertBackendSupported(backend) {
  astCacheGetCapabilities(backend);
  return true;
}
