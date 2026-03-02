const AST_DATABRICKS_PROVIDER_OPTION_ALLOWLIST = Object.freeze([
  'top_p',
  'frequency_penalty',
  'presence_penalty',
  'stop',
  'seed',
  'n',
  'logit_bias',
  'parallel_tool_calls',
  'max_completion_tokens',
  'metadata',
  'user'
]);

function astDatabricksProviderOptions(providerOptions = {}, omitKeys = []) {
  const output = {};

  Object.keys(providerOptions).forEach(key => {
    if (omitKeys.includes(key)) {
      return;
    }

    if (!AST_DATABRICKS_PROVIDER_OPTION_ALLOWLIST.includes(key)) {
      return;
    }

    output[key] = providerOptions[key];
  });

  return output;
}

function astDatabricksNormalizeHost(rawHost) {
  const host = typeof rawHost === 'string' ? rawHost.trim() : '';
  if (!host) {
    return '';
  }

  return host
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}

function astDatabricksValidateHost(rawHost) {
  const host = astDatabricksNormalizeHost(rawHost);
  if (!host) {
    return '';
  }

  if (/[\s]/.test(host) || /[/?#\\]/.test(host)) {
    throw new AstAiValidationError(
      "Databricks host must be a bare hostname (with optional port), without scheme or path",
      {
        provider: 'databricks',
        host
      }
    );
  }

  return host;
}

function astDatabricksNormalizeServingEndpoint(rawServingEndpoint) {
  const servingEndpoint = typeof rawServingEndpoint === 'string' ? rawServingEndpoint.trim() : '';
  return servingEndpoint;
}

function astDatabricksValidateEndpointUrl(rawEndpointUrl) {
  const endpointUrl = typeof rawEndpointUrl === 'string' ? rawEndpointUrl.trim() : '';
  if (!endpointUrl) {
    return '';
  }

  if (!/^https:\/\//i.test(endpointUrl)) {
    throw new AstAiValidationError(
      "Databricks endpointUrl must use 'https://'",
      {
        provider: 'databricks'
      }
    );
  }

  const endpointPattern = /\/serving-endpoints\/[^/?#]+\/invocations\/?(?:[?#].*)?$/i;
  if (!endpointPattern.test(endpointUrl)) {
    throw new AstAiValidationError(
      'Databricks endpointUrl must end with /serving-endpoints/<name>/invocations',
      {
        provider: 'databricks',
        endpointUrl
      }
    );
  }

  return endpointUrl;
}

function astDatabricksExtractServingEndpointFromUrl(endpointUrl) {
  if (typeof endpointUrl !== 'string' || !endpointUrl) {
    return '';
  }

  const match = endpointUrl.match(/\/serving-endpoints\/([^/?#]+)\/invocations\/?(?:[?#].*)?$/i);
  if (!match || typeof match[1] !== 'string') {
    return '';
  }

  try {
    return decodeURIComponent(match[1]);
  } catch (_error) {
    return match[1];
  }
}

function astDatabricksResolveEndpoint(request, config) {
  const providerOptions = request.providerOptions || {};
  const auth = request.auth || {};

  const endpointUrl = astDatabricksValidateEndpointUrl(
    providerOptions.endpointUrl || auth.endpointUrl || config.endpointUrl
  );
  if (endpointUrl) {
    return endpointUrl;
  }

  const host = astDatabricksValidateHost(auth.host || config.host);
  const servingEndpoint = astDatabricksNormalizeServingEndpoint(
    providerOptions.servingEndpoint || auth.servingEndpoint || config.servingEndpoint
  );

  if (!host || !servingEndpoint) {
    throw new AstAiAuthError(
      "Databricks requires 'endpointUrl' or both 'host' and 'servingEndpoint'",
      {
        provider: 'databricks',
        hostConfigured: Boolean(host),
        servingEndpointConfigured: Boolean(servingEndpoint)
      }
    );
  }

  return `https://${host}/serving-endpoints/${encodeURIComponent(servingEndpoint)}/invocations`;
}

function astDatabricksResolveModel(request, config, endpointUrl) {
  if (typeof config.model === 'string' && config.model.trim().length > 0) {
    return config.model.trim();
  }

  if (typeof request.model === 'string' && request.model.trim().length > 0) {
    return request.model.trim();
  }

  if (typeof config.servingEndpoint === 'string' && config.servingEndpoint.trim().length > 0) {
    return config.servingEndpoint.trim();
  }

  return astDatabricksExtractServingEndpointFromUrl(endpointUrl);
}

function astDatabricksBuildHeaders(request, config) {
  const headers = {
    Authorization: `Bearer ${config.token}`
  };

  const apiVersion = typeof request.providerOptions.apiVersion === 'string'
    ? request.providerOptions.apiVersion.trim()
    : '';

  if (apiVersion) {
    headers['X-Databricks-Api-Version'] = apiVersion;
  }

  return headers;
}

function astDatabricksMapProviderError(error, endpointUrl) {
  if (!error || error.name !== 'AstAiProviderError') {
    return error;
  }

  const details = error.details && typeof error.details === 'object'
    ? Object.assign({}, error.details)
    : {};
  details.endpointUrl = endpointUrl;

  const statusCode = Number(details.statusCode);

  if (statusCode === 401 || statusCode === 403) {
    return new AstAiAuthError(
      'Databricks AI request was unauthorized',
      details,
      error
    );
  }

  if (statusCode === 404) {
    return new AstAiProviderError(
      'Databricks serving endpoint was not found',
      details,
      error
    );
  }

  return new AstAiProviderError(
    'Databricks AI request failed',
    details,
    error
  );
}

function astRunDatabricks(request, config) {
  const includeRaw = request.options.includeRaw === true;
  const endpoint = astDatabricksResolveEndpoint(request, config);
  const model = astDatabricksResolveModel(request, config, endpoint);

  const payload = Object.assign(
    {
      messages: astAiBuildOpenAiMessages(request.messages)
    },
    astDatabricksProviderOptions(request.providerOptions, ['endpointUrl', 'servingEndpoint', 'apiVersion'])
  );

  if (model) {
    payload.model = model;
  }

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

  let response;
  try {
    response = astAiHttpRequest({
      url: endpoint,
      method: 'post',
      headers: astDatabricksBuildHeaders(request, config),
      payload,
      retries: request.options.retries,
      timeoutMs: request.options.timeoutMs
    });
  } catch (error) {
    throw astDatabricksMapProviderError(error, endpoint);
  }

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

  return astNormalizeAiResponse({
    provider: 'databricks',
    operation: request.operation,
    model: responseJson.model || model || null,
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
