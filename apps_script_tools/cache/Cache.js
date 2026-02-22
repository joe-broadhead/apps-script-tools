function astCacheApiGet(key, options = {}) {
  return astCacheGetValue(key, options);
}

function astCacheApiSet(key, value, options = {}) {
  return astCacheSetValue(key, value, options);
}

function astCacheApiDelete(key, options = {}) {
  return astCacheDeleteValue(key, options);
}

function astCacheApiInvalidateByTag(tag, options = {}) {
  return astCacheInvalidateTag(tag, options);
}

function astCacheApiStats(options = {}) {
  return astCacheStats(options);
}

function astCacheApiConfigure(config = {}, options = {}) {
  return astCacheSetRuntimeConfig(config, options);
}

function astCacheApiGetConfig() {
  return astCacheGetRuntimeConfig();
}

function astCacheApiClearConfig() {
  return astCacheClearRuntimeConfig();
}

function astCacheApiClear(options = {}) {
  return astCacheClear(options);
}

const AST_CACHE = Object.freeze({
  get: astCacheApiGet,
  set: astCacheApiSet,
  delete: astCacheApiDelete,
  invalidateByTag: astCacheApiInvalidateByTag,
  stats: astCacheApiStats,
  backends: astCacheListBackends,
  capabilities: astCacheGetCapabilities,
  configure: astCacheApiConfigure,
  getConfig: astCacheApiGetConfig,
  clearConfig: astCacheApiClearConfig,
  clear: astCacheApiClear
});
