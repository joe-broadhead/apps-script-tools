function astSecretsRun(request = {}) {
  return astRunSecretsRequest(request);
}

function astSecretsGet(request = {}) {
  return astRunSecretsRequest(Object.assign({}, request, { operation: 'get' }));
}

function astSecretsSet(request = {}) {
  return astRunSecretsRequest(Object.assign({}, request, { operation: 'set' }));
}

function astSecretsDelete(request = {}) {
  return astRunSecretsRequest(Object.assign({}, request, { operation: 'delete' }));
}

function astSecretsProviders() {
  return astSecretsListProviders();
}

function astSecretsCapabilities(provider) {
  return astSecretsGetCapabilities(provider);
}

function astSecretsConfigure(config = {}, options = {}) {
  return astSecretsSetRuntimeConfig(config, options);
}

function astSecretsGetConfig() {
  return astSecretsGetRuntimeConfig();
}

function astSecretsClearConfig() {
  return astSecretsClearRuntimeConfig();
}

const AST_SECRETS = Object.freeze({
  run: astSecretsRun,
  get: astSecretsGet,
  set: astSecretsSet,
  delete: astSecretsDelete,
  providers: astSecretsProviders,
  capabilities: astSecretsCapabilities,
  configure: astSecretsConfigure,
  getConfig: astSecretsGetConfig,
  clearConfig: astSecretsClearConfig,
  resolveValue: astSecretsResolveValue
});
