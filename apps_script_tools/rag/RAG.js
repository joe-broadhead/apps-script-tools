let AST_RAG_IS_INITIALIZED = false;

function astRagEnsureInitialized() {
  if (AST_RAG_IS_INITIALIZED) {
    return;
  }

  astRagRegisterBuiltInEmbeddingProviders();
  astRagRegisterBuiltInRerankers();
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

function astRagApiPreviewSources(request = {}) {
  astRagEnsureInitialized();
  return astRagPreviewSourcesCore(request);
}

function astRagApiAnswer(request = {}) {
  astRagEnsureInitialized();
  return astRagAnswerCore(request);
}

function astRagApiAnswerStream(request = {}) {
  astRagEnsureInitialized();
  return astRagAnswerStreamCore(request);
}

function astRagApiRerank(request = {}) {
  astRagEnsureInitialized();
  return astRagRerankCore(request);
}

function astRagApiRewriteQuery(request = {}) {
  astRagEnsureInitialized();
  return astRagRewriteQueryCore(request);
}

function astRagApiDecomposeQuestion(request = {}) {
  astRagEnsureInitialized();
  return astRagDecomposeQuestionCore(request);
}

function astRagApiEvaluate(request = {}) {
  astRagEnsureInitialized();
  return astRagEvaluateCore(request);
}

function astRagApiCompareRuns(request = {}) {
  astRagEnsureInitialized();
  return astRagCompareRunsCore(request);
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

function astRagApiRegisterReranker(name, adapter, options = {}) {
  astRagEnsureInitialized();
  return astRagRegisterReranker(name, adapter, options);
}

function astRagApiUnregisterReranker(name) {
  astRagEnsureInitialized();
  return astRagUnregisterReranker(name);
}

function astRagApiRerankers() {
  astRagEnsureInitialized();
  return astRagListRerankers();
}

function astRagApiBuildRetrievalCacheKey(args = {}) {
  astRagEnsureInitialized();
  return astRagBuildRetrievalCacheKey(args);
}

function astRagApiPutRetrievalPayload(key, payload, options = {}) {
  astRagEnsureInitialized();
  return astRagPutRetrievalPayload(key, payload, options);
}

function astRagApiGetRetrievalPayload(key, options = {}) {
  astRagEnsureInitialized();
  return astRagGetRetrievalPayload(key, options);
}

function astRagApiDeleteRetrievalPayload(key, options = {}) {
  astRagEnsureInitialized();
  return astRagDeleteRetrievalPayload(key, options);
}

function astRagApiCreateIndexManager(config = {}) {
  astRagEnsureInitialized();
  return astRagCreateIndexManager(config);
}

function astRagApiCitationsNormalizeInline(text) {
  astRagEnsureInitialized();
  return astRagCitationNormalizeInline(text);
}

function astRagApiCitationsExtractInlineIds(text) {
  astRagEnsureInitialized();
  return astRagCitationExtractIds(text);
}

function astRagApiCitationsFilterForAnswer(citations, options = {}) {
  astRagEnsureInitialized();
  return astRagCitationFilterForAnswer(citations, options);
}

function astRagApiCitationsToUrl(citation = {}) {
  astRagEnsureInitialized();
  return astRagCitationToUrl(citation);
}

function astRagApiFallbackFromCitations(args = {}) {
  astRagEnsureInitialized();
  return astRagFallbackFromCitations(args);
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
  previewSources: astRagApiPreviewSources,
  answer: astRagApiAnswer,
  answerStream: astRagApiAnswerStream,
  rerank: astRagApiRerank,
  rewriteQuery: astRagApiRewriteQuery,
  decomposeQuestion: astRagApiDecomposeQuestion,
  evaluate: astRagApiEvaluate,
  compareRuns: astRagApiCompareRuns,
  inspectIndex: astRagApiInspectIndex,
  buildRetrievalCacheKey: astRagApiBuildRetrievalCacheKey,
  putRetrievalPayload: astRagApiPutRetrievalPayload,
  getRetrievalPayload: astRagApiGetRetrievalPayload,
  deleteRetrievalPayload: astRagApiDeleteRetrievalPayload,
  Citations: Object.freeze({
    normalizeInline: astRagApiCitationsNormalizeInline,
    extractInlineIds: astRagApiCitationsExtractInlineIds,
    filterForAnswer: astRagApiCitationsFilterForAnswer,
    toUrl: astRagApiCitationsToUrl
  }),
  Fallback: Object.freeze({
    fromCitations: astRagApiFallbackFromCitations
  }),
  IndexManager: Object.freeze({
    create: astRagApiCreateIndexManager
  }),
  embeddingProviders: astRagApiEmbeddingProviders,
  embeddingCapabilities: astRagApiEmbeddingCapabilities,
  registerEmbeddingProvider: astRagApiRegisterEmbeddingProvider,
  unregisterEmbeddingProvider: astRagApiUnregisterEmbeddingProvider,
  registerReranker: astRagApiRegisterReranker,
  unregisterReranker: astRagApiUnregisterReranker,
  rerankers: astRagApiRerankers
});
