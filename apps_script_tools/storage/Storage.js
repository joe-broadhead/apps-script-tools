function astStorageRun(request = {}) {
  const operation = astStorageBulkNormalizeOperation(request && request.operation);
  if (operation === 'walk') {
    return astStorageWalkPrefix(request);
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

function astStorageList(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'list' }));
}

function astStorageHead(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'head' }));
}

function astStorageRead(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'read' }));
}

function astStorageWrite(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'write' }));
}

function astStorageDelete(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'delete' }));
}

function astStorageExists(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'exists' }));
}

function astStorageCopy(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'copy' }));
}

function astStorageMove(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'move' }));
}

function astStorageSignedUrl(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'signed_url' }));
}

function astStorageMultipartWrite(request = {}) {
  return astRunStorageRequest(Object.assign({}, request, { operation: 'multipart_write' }));
}

function astStorageWalk(request = {}) {
  return astStorageWalkPrefix(request);
}

function astStorageCopyPrefixApi(request = {}) {
  return astStorageCopyPrefix(request);
}

function astStorageDeletePrefixApi(request = {}) {
  return astStorageDeletePrefix(request);
}

function astStorageSync(request = {}) {
  return astStorageSyncPrefixes(request);
}

function astStorageCapabilities(provider) {
  const base = astStorageGetCapabilities(provider);
  return Object.assign({}, base, {
    walk: true,
    copy_prefix: true,
    delete_prefix: true,
    sync: true
  });
}

function astStorageConfigure(config = {}, options = {}) {
  return astStorageSetRuntimeConfig(config, options);
}

function astStorageGetConfig() {
  return astStorageGetRuntimeConfig();
}

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
  copyPrefix: astStorageCopyPrefixApi,
  deletePrefix: astStorageDeletePrefixApi,
  sync: astStorageSync,
  providers: astStorageListProviders,
  capabilities: astStorageCapabilities,
  configure: astStorageConfigure,
  getConfig: astStorageGetConfig,
  clearConfig: astStorageClearConfig
});
