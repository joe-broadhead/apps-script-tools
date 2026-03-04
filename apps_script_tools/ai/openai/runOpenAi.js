function astBuildOpenAiHeaders(config) {
  return {
    Authorization: `Bearer ${config.apiKey}`
  };
}

function astOpenAiCopyProviderOptions(providerOptions = {}, omitKeys = []) {
  const output = {};

  Object.keys(providerOptions).forEach(key => {
    if (!omitKeys.includes(key)) {
      output[key] = providerOptions[key];
    }
  });

  return output;
}

function astRunOpenAi(request, config) {
  const includeRaw = request.options.includeRaw === true;

  if (request.operation === 'image') {
    const imageEndpoint = request.providerOptions.imageEndpoint || 'https://api.openai.com/v1/images/generations';
    const prompt = astAiPromptFromMessages(request.messages);

    if (!prompt) {
      throw new AstAiValidationError('image operation requires a non-empty prompt');
    }

    const imagePayload = Object.assign({
      model: config.model,
      prompt,
      n: request.providerOptions.n || 1,
      size: request.providerOptions.size || '1024x1024',
      response_format: 'b64_json'
    }, astOpenAiCopyProviderOptions(request.providerOptions, ['imageEndpoint']));

    const imageResponse = astAiHttpRequest({
      url: imageEndpoint,
      method: 'post',
      headers: astBuildOpenAiHeaders(config),
      payload: imagePayload,
      retries: request.options.retries,
      timeoutMs: request.options.timeoutMs
    });

    const imageJson = imageResponse.json || {};
    const images = astAiParseGenericImages(imageJson);

    if (images.length === 0) {
      throw new AstAiResponseParseError('OpenAI image response did not include image payloads', {
        provider: 'openai',
        operation: 'image'
      });
    }

    return astNormalizeAiResponse({
      provider: 'openai',
      operation: 'image',
      model: config.model,
      id: imageJson.created ? `img_${imageJson.created}` : '',
      createdAt: new Date().toISOString(),
      finishReason: 'stop',
      output: {
        images
      },
      usage: imageJson.usage || {},
      raw: imageJson,
      includeRaw
    });
  }

  const endpoint = request.providerOptions.chatEndpoint || 'https://api.openai.com/v1/chat/completions';

  const payload = Object.assign({
    model: config.model,
    messages: astAiBuildOpenAiMessages(request.messages)
  }, astOpenAiCopyProviderOptions(request.providerOptions, ['chatEndpoint']));

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
        function: { name: request.toolChoice.name }
      };
    }
  }

  const response = astAiHttpRequest({
    url: endpoint,
    method: 'post',
    headers: astBuildOpenAiHeaders(config),
    payload,
    retries: request.options.retries,
    timeoutMs: request.options.timeoutMs
  });

  const responseJson = response.json || {};
  const parsed = astAiParseOpenAiCompatibleResponse(responseJson, request, config, {
    useUnixCreatedAt: true
  });

  return astNormalizeAiResponse({
    provider: 'openai',
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
