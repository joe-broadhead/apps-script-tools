function astStorageRun(request = {}) {
  return runStorageRequest(request);
}

function astStorageList(request = {}) {
  return runStorageRequest(Object.assign({}, request, { operation: 'list' }));
}

function astStorageHead(request = {}) {
  return runStorageRequest(Object.assign({}, request, { operation: 'head' }));
}

function astStorageRead(request = {}) {
  return runStorageRequest(Object.assign({}, request, { operation: 'read' }));
}

function astStorageWrite(request = {}) {
  return runStorageRequest(Object.assign({}, request, { operation: 'write' }));
}

function astStorageDelete(request = {}) {
  return runStorageRequest(Object.assign({}, request, { operation: 'delete' }));
}

function astStorageExists(request = {}) {
  return runStorageRequest(Object.assign({}, request, { operation: 'exists' }));
}

function astStorageCopy(request = {}) {
  return runStorageRequest(Object.assign({}, request, { operation: 'copy' }));
}

function astStorageMove(request = {}) {
  return runStorageRequest(Object.assign({}, request, { operation: 'move' }));
}

function astStorageSignedUrl(request = {}) {
  return runStorageRequest(Object.assign({}, request, { operation: 'signed_url' }));
}

function astStorageMultipartWrite(request = {}) {
  return runStorageRequest(Object.assign({}, request, { operation: 'multipart_write' }));
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
  providers: astStorageListProviders,
  capabilities: astStorageGetCapabilities,
  configure: astStorageConfigure,
  getConfig: astStorageGetConfig,
  clearConfig: astStorageClearConfig
});
