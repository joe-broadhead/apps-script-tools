function astBuildVertexGeminiEndpoint(config, providerOptions = {}) {
  if (typeof providerOptions.endpoint === 'string' && providerOptions.endpoint.trim().length > 0) {
    return providerOptions.endpoint.trim();
  }

  return `https://${encodeURIComponent(config.location)}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/locations/${encodeURIComponent(config.location)}/publishers/google/models/${encodeURIComponent(config.model)}:generateContent`;
}

function astVertexProviderOptions(providerOptions = {}, omitKeys = []) {
  const output = {};

  Object.keys(providerOptions).forEach(key => {
    if (!omitKeys.includes(key)) {
      output[key] = providerOptions[key];
    }
  });

  return output;
}

function runVertexGemini(request, config) {
  const includeRaw = request.options.includeRaw === true;
  const endpoint = astBuildVertexGeminiEndpoint(config, request.providerOptions);

  const payload = Object.assign({
    contents: astAiBuildGeminiContents(request.messages),
    generationConfig: {}
  }, astVertexProviderOptions(request.providerOptions, ['endpoint']));

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
      functionDeclarations: request.tools.map(tool => ({
        name: tool.name,
        description: tool.description || '',
        parameters: tool.inputSchema || { type: 'object', properties: {} }
      }))
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

  const response = astAiHttpRequest({
    url: endpoint,
    method: 'post',
    headers: {
      Authorization: `Bearer ${config.oauthToken}`
    },
    payload,
    retries: request.options.retries
  });

  const responseJson = response.json || {};
  const parsed = astAiExtractGeminiOutput(responseJson);

  let structuredJson = null;
  if (request.operation === 'structured') {
    structuredJson = astAiSafeJsonParse(parsed.text);

    if (structuredJson == null) {
      throw new AstAiResponseParseError('Failed to parse vertex_gemini structured response as JSON', {
        provider: 'vertex_gemini',
        operation: 'structured',
        text: parsed.text
      });
    }
  }

  return normalizeAiResponse({
    provider: 'vertex_gemini',
    operation: request.operation,
    model: config.model,
    id: responseJson.responseId || '',
    createdAt: new Date().toISOString(),
    finishReason: parsed.finishReason,
    output: {
      text: parsed.text,
      json: structuredJson,
      toolCalls: parsed.toolCalls,
      images: parsed.images
    },
    usage: parsed.usage,
    raw: responseJson,
    includeRaw
  });
}
