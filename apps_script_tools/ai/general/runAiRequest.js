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

  const base = {
    provider: normalizedRequest ? normalizedRequest.provider : null,
    operation: normalizedRequest ? normalizedRequest.operation : null,
    model: normalizedRequest ? normalizedRequest.model : null
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
      usage
    })
  });
}

function runAiRequest(request = {}) {
  let normalizedRequest = null;
  const spanId = astAiTelemetryStartSpan(request, null);

  try {
    normalizedRequest = validateAiRequest(request);

    astAssertAiCapability(normalizedRequest.provider, normalizedRequest.operation);
    astAssertAiInputCapabilities(normalizedRequest);

    const config = resolveAiConfig(normalizedRequest);
    const providerExecutor = astGetAiProviderExecutor(normalizedRequest.provider);
    const response = normalizedRequest.options.stream
      ? astRunAiStream(normalizedRequest, config, providerExecutor)
      : (
        normalizedRequest.operation === 'tools'
          ? astRunAiTools(normalizedRequest, config, providerExecutor)
          : providerExecutor(normalizedRequest, config)
      );

    astAiTelemetryEndSpan(spanId, normalizedRequest, response, null);
    return response;
  } catch (error) {
    astAiTelemetryEndSpan(spanId, normalizedRequest, null, error);
    throw error;
  }
}
