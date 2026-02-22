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

function runOpenAi(request, config) {
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
      retries: request.options.retries
    });

    const imageJson = imageResponse.json || {};
    const images = astAiParseGenericImages(imageJson);

    if (images.length === 0) {
      throw new AstAiResponseParseError('OpenAI image response did not include image payloads', {
        provider: 'openai',
        operation: 'image'
      });
    }

    return normalizeAiResponse({
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
    retries: request.options.retries
  });

  const responseJson = response.json || {};
  const choice = responseJson.choices && responseJson.choices[0]
    ? responseJson.choices[0]
    : {};
  const message = choice.message || {};

  const text = astAiExtractOpenAiText(message.content);
  const toolCalls = astAiExtractOpenAiToolCalls(message);

  let structuredJson = null;
  if (request.operation === 'structured') {
    structuredJson = astAiSafeJsonParse(text);
  }

  return normalizeAiResponse({
    provider: 'openai',
    operation: request.operation,
    model: responseJson.model || config.model,
    id: responseJson.id || '',
    createdAt: responseJson.created
      ? new Date(responseJson.created * 1000).toISOString()
      : new Date().toISOString(),
    finishReason: choice.finish_reason || null,
    output: {
      text,
      json: structuredJson,
      toolCalls
    },
    usage: responseJson.usage || {},
    raw: responseJson,
    includeRaw
  });
}
