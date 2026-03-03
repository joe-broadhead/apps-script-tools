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

function astSecretsRotate(request = {}) {
  return astRunSecretsRequest(Object.assign({}, request, { operation: 'rotate' }));
}

function astSecretsListVersions(request = {}) {
  return astRunSecretsRequest(Object.assign({}, request, { operation: 'list_versions' }));
}

function astSecretsGetVersionMetadata(request = {}) {
  return astRunSecretsRequest(Object.assign({}, request, { operation: 'get_version_metadata' }));
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
  rotate: astSecretsRotate,
  listVersions: astSecretsListVersions,
  getVersionMetadata: astSecretsGetVersionMetadata,
  providers: astSecretsProviders,
  capabilities: astSecretsCapabilities,
  configure: astSecretsConfigure,
  getConfig: astSecretsGetConfig,
  clearConfig: astSecretsClearConfig,
  resolveValue: astSecretsResolveValue
});
