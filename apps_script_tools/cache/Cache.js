/**
 * @typedef {Object} AstCacheOptions
 * @property {string} [backend]
 * @property {string} [namespace]
 * @property {number} [ttlSec]
 * @property {boolean} [includeExpired]
 */

/**
 * Gets a cached value by key.
 *
 * @param {string} key Cache key.
 * @param {AstCacheOptions} [options={}] Cache options.
 * @returns {Object} Normalized cache read response.
 */
function astCacheApiGet(key, options = {}) {
  return astCacheGetValue(key, options);
}

/**
 * Sets a cached value.
 *
 * @param {string} key Cache key.
 * @param {*} value Value to cache.
 * @param {AstCacheOptions} [options={}] Cache options.
 * @returns {Object} Normalized cache write response.
 */
function astCacheApiSet(key, value, options = {}) {
  return astCacheSetValue(key, value, options);
}

/**
 * Gets multiple cached values by key list.
 *
 * @param {string[]} keys Cache keys.
 * @param {AstCacheOptions} [options={}] Cache options.
 * @returns {Object} Normalized cache read-many response.
 */
function astCacheApiGetMany(keys, options = {}) {
  return astCacheGetManyValues(keys, options);
}

/**
 * Sets multiple cache entries in a single operation.
 *
 * @param {Array<Object>} entries Cache entry records.
 * @param {AstCacheOptions} [options={}] Cache options.
 * @returns {Object} Normalized cache write-many response.
 */
function astCacheApiSetMany(entries, options = {}) {
  return astCacheSetManyValues(entries, options);
}

/**
 * Returns cached value or resolves and stores on miss.
 *
 * @param {string} key Cache key.
 * @param {Function} resolver Miss resolver callback.
 * @param {AstCacheOptions} [options={}] Cache options.
 * @returns {Object} Normalized fetch response.
 */
function astCacheApiFetch(key, resolver, options = {}) {
  return astCacheFetchValue(key, resolver, options);
}

/**
 * Returns cached values or resolves missing keys and stores them.
 *
 * @param {string[]} keys Cache keys.
 * @param {Function} resolver Miss resolver callback.
 * @param {AstCacheOptions} [options={}] Cache options.
 * @returns {Object} Normalized fetch-many response.
 */
function astCacheApiFetchMany(keys, resolver, options = {}) {
  return astCacheFetchManyValues(keys, resolver, options);
}

/**
 * Deletes a cached key.
 *
 * @param {string} key Cache key.
 * @param {AstCacheOptions} [options={}] Cache options.
 * @returns {Object} Normalized delete response.
 */
function astCacheApiDelete(key, options = {}) {
  return astCacheDeleteValue(key, options);
}

/**
 * Deletes multiple cached keys.
 *
 * @param {string[]} keys Cache keys.
 * @param {AstCacheOptions} [options={}] Cache options.
 * @returns {Object} Normalized delete-many response.
 */
function astCacheApiDeleteMany(keys, options = {}) {
  return astCacheDeleteManyValues(keys, options);
}

/**
 * Invalidates cache entries matching a tag.
 *
 * @param {string} tag Invalidation tag.
 * @param {AstCacheOptions} [options={}] Cache options.
 * @returns {Object} Invalidation response.
 */
function astCacheApiInvalidateByTag(tag, options = {}) {
  return astCacheInvalidateTag(tag, options);
}

/**
 * Invalidates cache entries matching a key prefix.
 *
 * @param {string} prefix Key prefix.
 * @param {AstCacheOptions} [options={}] Cache options.
 * @returns {Object} Invalidation response.
 */
function astCacheApiInvalidateByPrefix(prefix, options = {}) {
  return astCacheInvalidatePrefix(prefix, options);
}

/**
 * Invalidates entries using a predicate callback.
 *
 * @param {Function} predicate Predicate callback.
 * @param {AstCacheOptions} [options={}] Cache options.
 * @returns {Object} Invalidation response.
 */
function astCacheApiInvalidateByPredicate(predicate, options = {}) {
  return astCacheInvalidatePredicate(predicate, options);
}

/**
 * Acquires a cache lock and optionally runs task work.
 *
 * @param {string} key Lock key.
 * @param {Function|Object} [taskOrOptions={}] Task function or lock options.
 * @param {Object} [options={}] Lock options when second arg is a task.
 * @returns {*} Task return value or lock acquisition result.
 */
function astCacheApiLock(key, taskOrOptions = {}, options = {}) {
  if (typeof taskOrOptions === 'function') {
    return astCacheLock(key, taskOrOptions, options);
  }

  const lockOptions = astCacheIsPlainObject(taskOrOptions)
    ? Object.assign({}, taskOrOptions)
    : {};
  const task = lockOptions.task;
  delete lockOptions.task;
  return astCacheLock(key, task, lockOptions);
}

/**
 * Returns backend/cache statistics for the selected namespace.
 *
 * @param {AstCacheOptions} [options={}] Cache options.
 * @returns {Object} Stats response.
 */
function astCacheApiStats(options = {}) {
  return astCacheStats(options);
}

/**
 * Sets runtime cache configuration overrides.
 *
 * @param {Object} [config={}] Runtime config patch.
 * @param {Object} [options={}] Configure behavior options.
 * @returns {Object} Updated runtime config snapshot.
 */
function astCacheApiConfigure(config = {}, options = {}) {
  return astCacheSetRuntimeConfig(config, options);
}

/**
 * Gets current resolved cache runtime config.
 *
 * @returns {Object} Runtime config snapshot.
 */
function astCacheApiGetConfig() {
  return astCacheGetRuntimeConfig();
}

/**
 * Clears runtime cache config overrides.
 *
 * @returns {Object} Cleared runtime config snapshot.
 */
function astCacheApiClearConfig() {
  return astCacheClearRuntimeConfig();
}

/**
 * Clears cache entries for the target backend/namespace.
 *
 * @param {AstCacheOptions} [options={}] Cache options.
 * @returns {Object} Clear response.
 */
function astCacheApiClear(options = {}) {
  return astCacheClear(options);
}

const AST_CACHE = Object.freeze({
  get: astCacheApiGet,
  set: astCacheApiSet,
  getMany: astCacheApiGetMany,
  setMany: astCacheApiSetMany,
  fetch: astCacheApiFetch,
  fetchMany: astCacheApiFetchMany,
  delete: astCacheApiDelete,
  deleteMany: astCacheApiDeleteMany,
  invalidateByTag: astCacheApiInvalidateByTag,
  invalidateByPrefix: astCacheApiInvalidateByPrefix,
  invalidateByPredicate: astCacheApiInvalidateByPredicate,
  lock: astCacheApiLock,
  stats: astCacheApiStats,
  backends: astCacheListBackends,
  capabilities: astCacheGetCapabilities,
  configure: astCacheApiConfigure,
  getConfig: astCacheApiGetConfig,
  clearConfig: astCacheApiClearConfig,
  clear: astCacheApiClear
});
