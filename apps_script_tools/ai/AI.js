function astAiRun(request = {}) {
  return runAiRequest(request);
}

function astAiText(request = {}) {
  return runAiRequest(Object.assign({}, request, { operation: 'text' }));
}

function astAiStructured(request = {}) {
  return runAiRequest(Object.assign({}, request, { operation: 'structured' }));
}

function astAiTools(request = {}) {
  return runAiRequest(Object.assign({}, request, { operation: 'tools' }));
}

function astAiImage(request = {}) {
  return runAiRequest(Object.assign({}, request, { operation: 'image' }));
}

function astAiStream(request = {}) {
  return runAiRequest(Object.assign({}, request, {
    options: Object.assign({}, request.options || {}, { stream: true })
  }));
}

function astAiProviders() {
  return AST_AI_PROVIDERS.slice();
}

function astAiCapabilities(provider) {
  return astGetAiCapabilities(provider);
}

function astAiConfigure(config = {}, options = {}) {
  return astSetAiRuntimeConfig(config, options);
}

function astAiGetConfig() {
  return astGetAiRuntimeConfig();
}

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
  providers: astAiProviders,
  capabilities: astAiCapabilities,
  configure: astAiConfigure,
  getConfig: astAiGetConfig,
  clearConfig: astAiClearConfig,
  OutputRepair: astAiGetOutputRepairSurface()
});
