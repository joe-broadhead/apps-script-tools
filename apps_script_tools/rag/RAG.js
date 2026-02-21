let AST_RAG_IS_INITIALIZED = false;

function astRagEnsureInitialized() {
  if (AST_RAG_IS_INITIALIZED) {
    return;
  }

  astRagRegisterBuiltInEmbeddingProviders();
  AST_RAG_IS_INITIALIZED = true;
}

function astRagApiConfigure(config = {}, options = {}) {
  astRagEnsureInitialized();
  return astRagSetRuntimeConfig(config, options);
}

function astRagApiBuildIndex(request = {}) {
  astRagEnsureInitialized();
  return astRagBuildIndexCore(request);
}

function astRagApiSyncIndex(request = {}) {
  astRagEnsureInitialized();
  return astRagSyncIndexCore(request);
}

function astRagApiSearch(request = {}) {
  astRagEnsureInitialized();
  return astRagSearchCore(request);
}

function astRagApiAnswer(request = {}) {
  astRagEnsureInitialized();
  return astRagAnswerCore(request);
}

function astRagApiInspectIndex(request = {}) {
  astRagEnsureInitialized();
  const normalized = astRagValidateInspectRequest(request);
  return astRagInspectIndex(normalized.indexFileId);
}

function astRagApiEmbeddingProviders() {
  astRagEnsureInitialized();
  return astRagListEmbeddingProviders();
}

function astRagApiEmbeddingCapabilities(provider) {
  astRagEnsureInitialized();
  return astRagGetEmbeddingCapabilities(provider);
}

function astRagApiRegisterEmbeddingProvider(name, adapter, options = {}) {
  astRagEnsureInitialized();
  return astRagRegisterEmbeddingProvider(name, adapter, options);
}

function astRagApiUnregisterEmbeddingProvider(name) {
  astRagEnsureInitialized();
  return astRagUnregisterEmbeddingProvider(name);
}

function astRagApiGetConfig() {
  astRagEnsureInitialized();
  return astRagGetRuntimeConfig();
}

function astRagApiClearConfig() {
  astRagEnsureInitialized();
  return astRagClearRuntimeConfig();
}

const AST_RAG = Object.freeze({
  configure: astRagApiConfigure,
  getConfig: astRagApiGetConfig,
  clearConfig: astRagApiClearConfig,
  buildIndex: astRagApiBuildIndex,
  syncIndex: astRagApiSyncIndex,
  search: astRagApiSearch,
  answer: astRagApiAnswer,
  inspectIndex: astRagApiInspectIndex,
  embeddingProviders: astRagApiEmbeddingProviders,
  embeddingCapabilities: astRagApiEmbeddingCapabilities,
  registerEmbeddingProvider: astRagApiRegisterEmbeddingProvider,
  unregisterEmbeddingProvider: astRagApiUnregisterEmbeddingProvider
});
