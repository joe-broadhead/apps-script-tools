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
  clearConfig: astAiClearConfig
});
