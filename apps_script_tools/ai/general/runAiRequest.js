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

function astAiTelemetryBuildContext(request = {}, normalizedRequest = null) {
  const source = normalizedRequest || request || {};
  return {
    provider: source.provider || null,
    operation: source.operation || null,
    model: source.model || null,
    hasSchema: Boolean(source.schema),
    hasTools: Array.isArray(source.tools) && source.tools.length > 0
  };
}

function astAiTelemetryStartSpan(request = {}, normalizedRequest = null) {
  if (typeof astTelemetryStartSpanSafe !== 'function') {
    return null;
  }

  return astTelemetryStartSpanSafe(
    'ai.run',
    astAiTelemetryBuildContext(request, normalizedRequest)
  );
}

function astAiTelemetryEndSpan(spanId, normalizedRequest, response, error) {
  if (!spanId || typeof astTelemetryEndSpanSafe !== 'function') {
    return;
  }

  const route = response && response.route && typeof response.route === 'object'
    ? response.route
    : null;
  const selectedProvider = route && typeof route.selectedProvider === 'string'
    ? route.selectedProvider
    : null;
  const selectedModel = route && typeof route.selectedModel === 'string'
    ? route.selectedModel
    : null;
  const resolvedProvider = response && typeof response.provider === 'string' && response.provider.trim().length > 0
    ? response.provider
    : (selectedProvider || (normalizedRequest ? normalizedRequest.provider : null));
  const resolvedModel = response && typeof response.model === 'string' && response.model.trim().length > 0
    ? response.model
    : (selectedModel || (normalizedRequest ? normalizedRequest.model : null));

  const base = {
    provider: resolvedProvider,
    operation: normalizedRequest ? normalizedRequest.operation : null,
    model: resolvedModel
  };

  if (error) {
    astTelemetryEndSpanSafe(spanId, {
      status: 'error',
      error,
      result: base
    });
    return;
  }

  const usage = response && response.usage ? response.usage : {};
  astTelemetryEndSpanSafe(spanId, {
    status: 'ok',
    result: Object.assign({}, base, {
      finishReason: response && response.finishReason ? response.finishReason : null,
      selectedProvider,
      selectedModel,
      attemptCount: route && Array.isArray(route.attempts) ? route.attempts.length : 1,
      usage
    })
  });
}

function astExecuteAiRequest(normalizedRequest) {
  astAssertAiCapability(normalizedRequest.provider, normalizedRequest.operation);
  astAssertAiInputCapabilities(normalizedRequest);

  const config = resolveAiConfig(normalizedRequest);
  const providerExecutor = astGetAiProviderExecutor(normalizedRequest.provider);

  if (normalizedRequest.options.stream) {
    return astRunAiStream(normalizedRequest, config, providerExecutor);
  }

  if (normalizedRequest.operation === 'tools') {
    return astRunAiTools(normalizedRequest, config, providerExecutor);
  }

  return providerExecutor(normalizedRequest, config);
}

function astDispatchAiRequest(normalizedRequest) {
  return normalizedRequest.routing
    ? astRunAiWithFallback(normalizedRequest, astExecuteAiRequest)
    : astExecuteAiRequest(normalizedRequest);
}

function runAiRequest(request = {}) {
  let normalizedRequest = null;
  const spanId = astAiTelemetryStartSpan(request, null);

  try {
    normalizedRequest = validateAiRequest(request);

    const response = normalizedRequest.operation === 'structured'
      ? astRunStructuredWithReliability(normalizedRequest, astDispatchAiRequest)
      : astDispatchAiRequest(normalizedRequest);

    astAiTelemetryEndSpan(spanId, normalizedRequest, response, null);
    return response;
  } catch (error) {
    astAiTelemetryEndSpan(spanId, normalizedRequest, null, error);
    throw error;
  }
}
