function astHttpRequest(request = {}) {
  return astRunHttpRequest(request);
}

function astHttpRequestBatch(request = {}) {
  return astRunHttpBatchRequest(request);
}

function astHttpConfigure(config = {}, options = {}) {
  return astHttpSetRuntimeConfig(config, options);
}

function astHttpGetConfig() {
  return astHttpGetRuntimeConfig();
}

function astHttpClearConfig() {
  return astHttpClearRuntimeConfig();
}

const AST_HTTP = Object.freeze({
  request: astHttpRequest,
  requestBatch: astHttpRequestBatch,
  capabilities: astHttpGetCapabilities,
  configure: astHttpConfigure,
  getConfig: astHttpGetConfig,
  clearConfig: astHttpClearConfig
});
