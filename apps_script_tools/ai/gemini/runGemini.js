function astBuildGeminiEndpoint(config, providerOptions = {}) {
  if (typeof providerOptions.endpoint === 'string' && providerOptions.endpoint.trim().length > 0) {
    return providerOptions.endpoint.trim();
  }

  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
}

function astBuildGeminiFunctionDeclarations(tools) {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description || '',
    parameters: tool.inputSchema || { type: 'object', properties: {} }
  }));
}

function astGeminiProviderOptions(providerOptions, omitKeys = []) {
  const output = {};

  Object.keys(providerOptions || {}).forEach(key => {
    if (!omitKeys.includes(key)) {
      output[key] = providerOptions[key];
    }
  });

  return output;
}

function runGemini(request, config) {
  const includeRaw = request.options.includeRaw === true;
  const endpoint = astBuildGeminiEndpoint(config, request.providerOptions);

  const payload = Object.assign({
    contents: astAiBuildGeminiContents(request.messages),
    generationConfig: {}
  }, astGeminiProviderOptions(request.providerOptions, ['endpoint']));

  const systemInstruction = astAiExtractGeminiSystemInstruction(request.messages, request.system);

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (request.options.temperature !== null) {
    payload.generationConfig.temperature = request.options.temperature;
  }

  if (request.options.maxOutputTokens !== null) {
    payload.generationConfig.maxOutputTokens = request.options.maxOutputTokens;
  }

  if (request.operation === 'structured') {
    payload.generationConfig.responseMimeType = 'application/json';
    payload.generationConfig.responseSchema = request.schema;
  }

  if (request.operation === 'tools') {
    payload.tools = [{
      functionDeclarations: astBuildGeminiFunctionDeclarations(request.tools)
    }];

    if (request.toolChoice === 'auto') {
      payload.toolConfig = {
        functionCallingConfig: {
          mode: 'AUTO'
        }
      };
    } else if (request.toolChoice === 'none') {
      payload.toolConfig = {
        functionCallingConfig: {
          mode: 'NONE'
        }
      };
    } else if (request.toolChoice && typeof request.toolChoice === 'object') {
      payload.toolConfig = {
        functionCallingConfig: {
          mode: 'ANY',
          allowedFunctionNames: [request.toolChoice.name]
        }
      };
    }
  }

  if (request.operation === 'image') {
    if (!payload.generationConfig.responseModalities) {
      payload.generationConfig.responseModalities = ['TEXT', 'IMAGE'];
    }
  }

  const response = astAiHttpRequest({
    url: endpoint,
    method: 'post',
    headers: {},
    payload,
    retries: request.options.retries,
    timeoutMs: request.options.timeoutMs
  });

  const responseJson = response.json || {};
  const parsed = astAiExtractGeminiOutput(responseJson);

  let structuredJson = null;
  if (request.operation === 'structured') {
    structuredJson = astAiSafeJsonParse(parsed.text);
  }

  if (request.operation === 'image' && parsed.images.length === 0) {
    throw new AstAiResponseParseError('Gemini image response did not include images', {
      provider: 'gemini',
      operation: 'image'
    });
  }

  return normalizeAiResponse({
    provider: 'gemini',
    operation: request.operation,
    model: config.model,
    id: responseJson.responseId || '',
    createdAt: new Date().toISOString(),
    finishReason: parsed.finishReason,
    output: {
      text: parsed.text,
      json: structuredJson,
      images: parsed.images,
      toolCalls: parsed.toolCalls
    },
    usage: parsed.usage,
    raw: responseJson,
    includeRaw
  });
}
