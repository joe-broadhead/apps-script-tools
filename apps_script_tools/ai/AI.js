/**
 * @typedef {Object} AstAiFacadeRequest
 * @property {string} [provider]
 * @property {string} [operation]
 * @property {string} [model]
 * @property {Array<Object>} [messages]
 * @property {Object} [options]
 * @property {Object} [auth]
 * @property {Object} [providerOptions]
 */

/**
 * Runs an AI request using the normalized AST.AI operation contract.
 *
 * @param {AstAiFacadeRequest} [request={}] AI request payload.
 * @returns {Object} Provider-normalized AI response.
 * @throws {AstAiValidationError|AstAiAuthError|AstAiProviderError}
 */
function astAiRun(request = {}) {
  return astRunAiRequest(request);
}

/**
 * Runs a text completion/chat operation.
 *
 * @param {AstAiFacadeRequest} [request={}] AI request payload.
 * @returns {Object} Provider-normalized text response.
 */
function astAiText(request = {}) {
  return astRunAiRequest(Object.assign({}, request, { operation: 'text' }));
}

/**
 * Runs a structured output operation.
 *
 * @param {AstAiFacadeRequest} [request={}] AI request payload.
 * @returns {Object} Provider-normalized structured response.
 */
function astAiStructured(request = {}) {
  return astRunAiRequest(Object.assign({}, request, { operation: 'structured' }));
}

/**
 * Runs a tool-calling operation.
 *
 * @param {AstAiFacadeRequest} [request={}] AI request payload.
 * @returns {Object} Provider-normalized tools response.
 */
function astAiTools(request = {}) {
  return astRunAiRequest(Object.assign({}, request, { operation: 'tools' }));
}

/**
 * Runs an image operation for providers that support it.
 *
 * @param {AstAiFacadeRequest} [request={}] AI request payload.
 * @returns {Object} Provider-normalized image response.
 */
function astAiImage(request = {}) {
  return astRunAiRequest(Object.assign({}, request, { operation: 'image' }));
}

/**
 * Runs a synthetic stream-mode AI operation.
 *
 * @param {AstAiFacadeRequest} [request={}] AI request payload.
 * @returns {Object} Provider-normalized stream response.
 */
function astAiStream(request = {}) {
  return astRunAiRequest(Object.assign({}, request, {
    options: Object.assign({}, request.options || {}, { stream: true })
  }));
}

/**
 * Estimates token usage for model input.
 *
 * @param {Object} [request={}] Token estimation request.
 * @returns {Object} Token estimation output.
 */
function astAiEstimateTokensApi(request = {}) {
  return astAiEstimateTokens(request);
}

/**
 * Truncates message arrays to fit model limits.
 *
 * @param {Object} [request={}] Truncation request.
 * @returns {Object} Truncation output.
 */
function astAiTruncateMessagesApi(request = {}) {
  return astAiTruncateMessages(request);
}

/**
 * Renders an AI prompt template with variables.
 *
 * @param {Object} [request={}] Prompt template request.
 * @returns {Object} Rendered template output.
 */
function astAiRenderPromptTemplateApi(request = {}) {
  return astAiRenderPromptTemplate(request);
}

/**
 * Lists registered AI providers.
 *
 * @returns {string[]} Provider names.
 */
function astAiProviders() {
  return AST_AI_PROVIDERS.slice();
}

/**
 * Returns operation capabilities for a provider.
 *
 * @param {string} provider Provider key.
 * @returns {Object} Capability matrix.
 */
function astAiCapabilities(provider) {
  return astGetAiCapabilities(provider);
}

/**
 * Sets runtime AI configuration overrides.
 *
 * @param {Object} [config={}] Runtime config patch.
 * @param {Object} [options={}] Configure behavior options.
 * @returns {Object} Updated runtime config snapshot.
 */
function astAiConfigure(config = {}, options = {}) {
  return astSetAiRuntimeConfig(config, options);
}

/**
 * Gets current resolved AI runtime config.
 *
 * @returns {Object} Runtime config snapshot.
 */
function astAiGetConfig() {
  return astGetAiRuntimeConfig();
}

/**
 * Clears runtime AI configuration overrides.
 *
 * @returns {Object} Cleared runtime config snapshot.
 */
function astAiClearConfig() {
  return astClearAiRuntimeConfig();
}

function astAiGetOutputRepairSurface() {
  if (
    typeof AST_AI_OUTPUT_REPAIR !== 'undefined' &&
    AST_AI_OUTPUT_REPAIR &&
    typeof AST_AI_OUTPUT_REPAIR.continueIfTruncated === 'function'
  ) {
    return AST_AI_OUTPUT_REPAIR;
  }

  if (typeof astAiContinueIfTruncated === 'function') {
    return Object.freeze({
      continueIfTruncated: astAiContinueIfTruncated
    });
  }

  return Object.freeze({
    continueIfTruncated: () => {
      throw new AstAiValidationError('AST.AI.OutputRepair runtime is not available');
    }
  });
}

const AST_AI = Object.freeze({
  run: astAiRun,
  text: astAiText,
  structured: astAiStructured,
  tools: astAiTools,
  image: astAiImage,
  stream: astAiStream,
  estimateTokens: astAiEstimateTokensApi,
  truncateMessages: astAiTruncateMessagesApi,
  renderPromptTemplate: astAiRenderPromptTemplateApi,
  providers: astAiProviders,
  capabilities: astAiCapabilities,
  configure: astAiConfigure,
  getConfig: astAiGetConfig,
  clearConfig: astAiClearConfig,
  OutputRepair: astAiGetOutputRepairSurface()
});
