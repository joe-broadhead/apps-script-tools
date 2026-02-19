function astPerplexityProviderOptions(providerOptions = {}, omitKeys = []) {
  const output = {};

  Object.keys(providerOptions).forEach(key => {
    if (!omitKeys.includes(key)) {
      output[key] = providerOptions[key];
    }
  });

  return output;
}

function runPerplexity(request, config) {
  const includeRaw = request.options.includeRaw === true;
  const endpoint = request.providerOptions.chatEndpoint || 'https://api.perplexity.ai/chat/completions';

  const payload = Object.assign({
    model: config.model,
    messages: astAiBuildOpenAiMessages(request.messages)
  }, astPerplexityProviderOptions(request.providerOptions, ['chatEndpoint']));

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
    headers: {
      Authorization: `Bearer ${config.apiKey}`
    },
    payload,
    retries: request.options.retries
  });

  const responseJson = response.json || {};

  if (request.operation === 'image') {
    const images = astAiParseGenericImages(responseJson);

    if (images.length === 0) {
      throw new AstAiResponseParseError('Perplexity image response did not include image payloads', {
        provider: 'perplexity',
        operation: 'image'
      });
    }

    return normalizeAiResponse({
      provider: 'perplexity',
      operation: 'image',
      model: responseJson.model || config.model,
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

  const choice = responseJson.choices && responseJson.choices[0]
    ? responseJson.choices[0]
    : {};
  const message = choice.message || {};
  const text = astAiExtractOpenAiText(message.content);
  const toolCalls = astAiExtractOpenAiToolCalls(message);

  let structuredJson = null;
  if (request.operation === 'structured') {
    structuredJson = astAiSafeJsonParse(text);

    if (structuredJson == null) {
      throw new AstAiResponseParseError('Failed to parse Perplexity structured response as JSON', {
        provider: 'perplexity',
        operation: 'structured',
        text
      });
    }
  }

  return normalizeAiResponse({
    provider: 'perplexity',
    operation: request.operation,
    model: responseJson.model || config.model,
    id: responseJson.id || '',
    createdAt: new Date().toISOString(),
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
