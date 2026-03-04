function astBuildOpenRouterHeaders(config) {
  const headers = {
    Authorization: `Bearer ${config.apiKey}`
  };

  if (config.httpReferer) {
    headers['HTTP-Referer'] = config.httpReferer;
  }

  if (config.xTitle) {
    headers['X-Title'] = config.xTitle;
  }

  return headers;
}

function astOpenRouterProviderOptions(providerOptions = {}, omitKeys = []) {
  const output = {};

  Object.keys(providerOptions).forEach(key => {
    if (!omitKeys.includes(key)) {
      output[key] = providerOptions[key];
    }
  });

  return output;
}

function astRunOpenRouter(request, config) {
  const includeRaw = request.options.includeRaw === true;

  if (request.operation === 'image') {
    const endpoint = request.providerOptions.chatEndpoint || 'https://openrouter.ai/api/v1/chat/completions';
    const payload = Object.assign({
      model: config.model,
      messages: astAiBuildOpenAiMessages(request.messages)
    }, astOpenRouterProviderOptions(request.providerOptions, ['chatEndpoint']));

    const response = astAiHttpRequest({
      url: endpoint,
      method: 'post',
      headers: astBuildOpenRouterHeaders(config),
      payload,
      retries: request.options.retries,
      timeoutMs: request.options.timeoutMs
    });

    const responseJson = response.json || {};
    const images = astAiParseGenericImages(responseJson);

    if (images.length === 0) {
      throw new AstAiResponseParseError('OpenRouter image response did not include image payloads', {
        provider: 'openrouter',
        operation: 'image'
      });
    }

    return astNormalizeAiResponse({
      provider: 'openrouter',
      operation: 'image',
      model: config.model,
      id: responseJson.id || '',
      createdAt: new Date().toISOString(),
      finishReason: 'stop',
      output: {
        images
      },
      usage: responseJson.usage || {},
      raw: responseJson,
      includeRaw
    });
  }

  const endpoint = request.providerOptions.chatEndpoint || 'https://openrouter.ai/api/v1/chat/completions';
  const payload = Object.assign({
    model: config.model,
    messages: astAiBuildOpenAiMessages(request.messages)
  }, astOpenRouterProviderOptions(request.providerOptions, ['chatEndpoint']));

  if (request.options.temperature !== null) {
    payload.temperature = request.options.temperature;
  }

  if (request.options.maxOutputTokens !== null) {
    payload.max_tokens = request.options.maxOutputTokens;
  }

  if (request.operation === 'structured') {
    payload.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'output',
        schema: request.schema,
        strict: true
      }
    };
  }

  if (request.operation === 'tools') {
    payload.tools = astAiBuildOpenAiTools(request.tools);

    if (typeof request.toolChoice === 'string') {
      payload.tool_choice = request.toolChoice;
    } else if (request.toolChoice && typeof request.toolChoice === 'object') {
      payload.tool_choice = {
        type: 'function',
        function: {
          name: request.toolChoice.name
        }
      };
    }
  }

  const response = astAiHttpRequest({
    url: endpoint,
    method: 'post',
    headers: astBuildOpenRouterHeaders(config),
    payload,
    retries: request.options.retries,
    timeoutMs: request.options.timeoutMs
  });

  const responseJson = response.json || {};
  const parsed = astAiParseOpenAiCompatibleResponse(responseJson, request, config, {
    useUnixCreatedAt: false
  });

  return astNormalizeAiResponse({
    provider: 'openrouter',
    operation: request.operation,
    model: parsed.model,
    id: parsed.id,
    createdAt: parsed.createdAt,
    finishReason: parsed.finishReason,
    output: parsed.output,
    usage: parsed.usage,
    raw: responseJson,
    includeRaw
  });
}
