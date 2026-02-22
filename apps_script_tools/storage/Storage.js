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
  providers: astStorageListProviders,
  capabilities: astStorageGetCapabilities,
  configure: astStorageConfigure,
  getConfig: astStorageGetConfig,
  clearConfig: astStorageClearConfig
});
