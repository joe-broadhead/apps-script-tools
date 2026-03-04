/**
 * @typedef {Object} AstStorageRequest
 * @property {string} [provider]
 * @property {string} [operation]
 * @property {string} [uri]
 * @property {Object} [location]
 * @property {Object} [payload]
 * @property {Object} [options]
 * @property {Object} [auth]
 */

/**
 * Runs a storage operation using the unified AST.Storage contract.
 *
 * @param {AstStorageRequest} [request={}] Storage request payload.
 * @returns {Object} Normalized storage response.
 */
function astStorageRun(request = {}) {
  const operation = astStorageBulkNormalizeOperation(request && request.operation);
  if (operation === 'walk') {
    return astStorageWalkPrefix(request);
  }
  if (operation === 'transfer') {
    return astStorageTransfer(request);
  }
  if (operation === 'copy_prefix') {
    return astStorageCopyPrefix(request);
  }
  if (operation === 'delete_prefix') {
    return astStorageDeletePrefix(request);
  }
  if (operation === 'sync') {
    return astStorageSyncPrefixes(request);
  }

  return astRunStorageRequest(request);
}

/**
 * Lists objects for a provider/location.
 *
 * @param {AstStorageRequest} [request={}] Storage request payload.
 * @returns {Object} Normalized list response.
 */
function astStorageList(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'list' }));
}

/**
 * Fetches object metadata without reading payload bytes.
 *
 * @param {AstStorageRequest} [request={}] Storage request payload.
 * @returns {Object} Normalized head response.
 */
function astStorageHead(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'head' }));
}

/**
 * Reads an object payload.
 *
 * @param {AstStorageRequest} [request={}] Storage request payload.
 * @returns {Object} Normalized read response.
 */
function astStorageRead(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'read' }));
}

/**
 * Writes an object payload.
 *
 * @param {AstStorageRequest} [request={}] Storage request payload.
 * @returns {Object} Normalized write response.
 */
function astStorageWrite(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'write' }));
}

/**
 * Deletes an object.
 *
 * @param {AstStorageRequest} [request={}] Storage request payload.
 * @returns {Object} Normalized delete response.
 */
function astStorageDelete(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'delete' }));
}

/**
 * Checks whether an object exists.
 *
 * @param {AstStorageRequest} [request={}] Storage request payload.
 * @returns {Object} Normalized exists response.
 */
function astStorageExists(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'exists' }));
}

/**
 * Copies an object.
 *
 * @param {AstStorageRequest} [request={}] Storage request payload.
 * @returns {Object} Normalized copy response.
 */
function astStorageCopy(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'copy' }));
}

/**
 * Moves/renames an object.
 *
 * @param {AstStorageRequest} [request={}] Storage request payload.
 * @returns {Object} Normalized move response.
 */
function astStorageMove(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'move' }));
}

/**
 * Generates a signed URL for supported providers.
 *
 * @param {AstStorageRequest} [request={}] Storage request payload.
 * @returns {Object} Normalized signed URL response.
 */
function astStorageSignedUrl(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'signed_url' }));
}

/**
 * Writes large objects through multipart/chunked flows where supported.
 *
 * @param {AstStorageRequest} [request={}] Storage request payload.
 * @returns {Object} Normalized multipart write response.
 */
function astStorageMultipartWrite(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'multipart_write' }));
}

/**
 * Walks a prefix recursively with optional filtering.
 *
 * @param {AstStorageRequest} [request={}] Storage request payload.
 * @returns {Object} Walk response.
 */
function astStorageWalk(request = {}) {
  return astStorageWalkPrefix(request);
}

/**
 * Copies all objects under one prefix to another.
 *
 * @param {AstStorageRequest} [request={}] Storage request payload.
 * @returns {Object} Copy-prefix response.
 */
function astStorageCopyPrefixApi(request = {}) {
  return astStorageCopyPrefix(request);
}

/**
 * Deletes all objects under a prefix.
 *
 * @param {AstStorageRequest} [request={}] Storage request payload.
 * @returns {Object} Delete-prefix response.
 */
function astStorageDeletePrefixApi(request = {}) {
  return astStorageDeletePrefix(request);
}

/**
 * Synchronizes source and destination prefixes.
 *
 * @param {AstStorageRequest} [request={}] Storage request payload.
 * @returns {Object} Sync response.
 */
function astStorageSync(request = {}) {
  return astStorageSyncPrefixes(request);
}

/**
 * Transfers objects across providers/locations.
 *
 * @param {AstStorageRequest} [request={}] Storage request payload.
 * @returns {Object} Transfer response.
 */
function astStorageTransferApi(request = {}) {
  return astStorageTransfer(request);
}

/**
 * Returns provider operation capabilities.
 *
 * @param {string} provider Provider key.
 * @returns {Object} Capability matrix.
 */
function astStorageCapabilities(provider) {
  const base = astStorageGetCapabilities(provider);
  return Object.assign({}, base, {
    walk: true,
    transfer: true,
    copy_prefix: true,
    delete_prefix: true,
    sync: true
  });
}

/**
 * Sets runtime storage configuration overrides.
 *
 * @param {Object} [config={}] Runtime config patch.
 * @param {Object} [options={}] Configure behavior options.
 * @returns {Object} Updated runtime config snapshot.
 */
function astStorageConfigure(config = {}, options = {}) {
  return astStorageSetRuntimeConfig(config, options);
}

/**
 * Gets current resolved storage runtime config.
 *
 * @returns {Object} Runtime config snapshot.
 */
function astStorageGetConfig() {
  return astStorageGetRuntimeConfig();
}

/**
 * Clears runtime storage config overrides.
 *
 * @returns {Object} Cleared runtime config snapshot.
 */
function astStorageClearConfig() {
  return astStorageClearRuntimeConfig();
}

const AST_STORAGE = Object.freeze({
  run: astStorageRun,
  list: astStorageList,
  head: astStorageHead,
  read: astStorageRead,
  write: astStorageWrite,
  delete: astStorageDelete,
  exists: astStorageExists,
  copy: astStorageCopy,
  move: astStorageMove,
  signedUrl: astStorageSignedUrl,
  multipartWrite: astStorageMultipartWrite,
  walk: astStorageWalk,
  transfer: astStorageTransferApi,
  copyPrefix: astStorageCopyPrefixApi,
  deletePrefix: astStorageDeletePrefixApi,
  sync: astStorageSync,
  providers: astStorageListProviders,
  capabilities: astStorageCapabilities,
  configure: astStorageConfigure,
  getConfig: astStorageGetConfig,
  clearConfig: astStorageClearConfig
});
