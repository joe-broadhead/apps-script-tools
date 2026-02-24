const AST_CACHE_BACKENDS = Object.freeze(['memory', 'drive_json', 'script_properties', 'storage_json']);

const AST_CACHE_CAPABILITY_MATRIX = Object.freeze({
  memory: Object.freeze({
    get: true,
    set: true,
    delete: true,
    invalidateByTag: true,
    stats: true,
    scalableRead: false,
    scalableWrite: false,
    recommendedUse: 'single_execution',
    notes: [
      'Execution-local process cache',
      'Not shared across concurrent users or executions'
    ]
  }),
  drive_json: Object.freeze({
    get: true,
    set: true,
    delete: true,
    invalidateByTag: true,
    stats: true,
    scalableRead: false,
    scalableWrite: false,
    recommendedUse: 'small_team_prototype',
    notes: [
      'Monolithic Drive document with lock-serialized writes',
      'Defaults: lockScope=user, updateStatsOnGet=false',
      'Use storage_json for shared production traffic'
    ]
  }),
  script_properties: Object.freeze({
    get: true,
    set: true,
    delete: true,
    invalidateByTag: true,
    stats: true,
    scalableRead: false,
    scalableWrite: false,
    recommendedUse: 'tiny_config_cache',
    notes: [
      'Bound by Apps Script property size/throughput limits',
      'Defaults: lockScope=user, updateStatsOnGet=false',
      'Not recommended for high-volume runtime cache traffic'
    ]
  }),
  storage_json: Object.freeze({
    get: true,
    set: true,
    delete: true,
    invalidateByTag: true,
    stats: true,
    scalableRead: true,
    scalableWrite: true,
    recommendedUse: 'shared_production',
    notes: [
      'Object-per-entry storage layout via AST.Storage',
      'Defaults: lockScope=none, updateStatsOnGet=false',
      'Recommended backend for concurrent app workloads'
    ]
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
