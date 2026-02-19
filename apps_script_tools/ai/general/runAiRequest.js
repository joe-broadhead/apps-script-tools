function astGetAiProviderExecutor(provider) {
  switch (provider) {
    case 'openai':
      return runOpenAi;
    case 'gemini':
      return runGemini;
    case 'vertex_gemini':
      return runVertexGemini;
    case 'openrouter':
      return runOpenRouter;
    case 'perplexity':
      return runPerplexity;
    default:
      throw new AstAiValidationError('Unsupported AI provider', { provider });
  }
}

function runAiRequest(request = {}) {
  const normalizedRequest = validateAiRequest(request);

  astAssertAiCapability(normalizedRequest.provider, normalizedRequest.operation);
  astAssertAiInputCapabilities(normalizedRequest);

  const config = resolveAiConfig(normalizedRequest);
  const providerExecutor = astGetAiProviderExecutor(normalizedRequest.provider);

  if (normalizedRequest.operation === 'tools') {
    return astRunAiTools(normalizedRequest, config, providerExecutor);
  }

  return providerExecutor(normalizedRequest, config);
}
