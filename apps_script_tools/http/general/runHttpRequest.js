function astHttpRunIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astHttpDefaultTransientStatus(statusCode) {
  return [429, 500, 502, 503, 504].includes(Number(statusCode));
}

function astHttpNormalizeHeaders(headers = {}) {
  const output = {};
  const source = astHttpRunIsPlainObject(headers) ? headers : {};

  Object.keys(source).forEach(key => {
    output[key] = source[key];
  });

  return output;
}

function astHttpHasHeader(headers = {}, headerName = '') {
  const normalizedName = astHttpNormalizeString(headerName, '').toLowerCase();
  if (!normalizedName) {
    return false;
  }

  return Object.keys(headers || {}).some(key => String(key).toLowerCase() === normalizedName);
}

function astHttpBuildStatusError(statusCode, message, details = {}, cause = null) {
  const normalizedStatus = Number(statusCode || 0);
  const payload = astHttpRunIsPlainObject(details) ? details : {};

  if (normalizedStatus === 401 || normalizedStatus === 403) {
    return new AstHttpAuthError(message, payload, cause);
  }

  if (normalizedStatus === 404) {
    return new AstHttpNotFoundError(message, payload, cause);
  }

  if (normalizedStatus === 429) {
    return new AstHttpRateLimitError(message, payload, cause);
  }

  return new AstHttpProviderError(message, payload, cause);
}

function astHttpMapCoreError(error, request = {}) {
  if (!error || typeof error !== 'object') {
    return new AstHttpProviderError('HTTP request failed', {
      url: request.url,
      method: request.method
    });
  }

  if (error instanceof AstHttpError) {
    return error;
  }

  const details = astHttpRunIsPlainObject(error.details) ? Object.assign({}, error.details) : {};

  if (error.name === 'AstConfigHttpCoreError') {
    if (error.code === 'validation') {
      return new AstHttpValidationError(error.message, details, error);
    }

    if (error.code === 'unavailable') {
      return new AstHttpCapabilityError(error.message, details, error);
    }

    if (error.code === 'http_status') {
      return astHttpBuildStatusError(
        Number(details.statusCode || 0),
        error.message,
        details,
        error
      );
    }

    if (error.code === 'timeout') {
      return new AstHttpProviderError('HTTP request timed out', Object.assign({}, details, {
        classification: 'timeout'
      }), error);
    }

    return new AstHttpProviderError(error.message || 'HTTP request failed', details, error);
  }

  return new AstHttpProviderError(error.message || 'HTTP request failed', details, error);
}

function astHttpRunWithCore(config = {}) {
  if (typeof astConfigHttpRequestWithRetryCore !== 'function') {
    throw new AstHttpCapabilityError('AST.Http requires astConfigHttpRequestWithRetryCore', {
      required: 'astConfigHttpRequestWithRetryCore'
    });
  }

  return astConfigHttpRequestWithRetryCore(config);
}

function astHttpNormalizeRequestEnvelope(normalizedRequest, resolvedConfig) {
  const headers = astHttpNormalizeHeaders(resolvedConfig.HTTP_DEFAULT_HEADERS || {});

  Object.keys(normalizedRequest.headers).forEach(key => {
    headers[key] = normalizedRequest.headers[key];
  });

  if (!astHttpHasHeader(headers, 'user-agent') && resolvedConfig.HTTP_USER_AGENT) {
    headers['User-Agent'] = resolvedConfig.HTTP_USER_AGENT;
  }

  const retries = normalizedRequest.retries == null
    ? resolvedConfig.HTTP_RETRIES
    : normalizedRequest.retries;
  const timeoutMs = normalizedRequest.timeoutMs == null
    ? resolvedConfig.HTTP_TIMEOUT_MS
    : normalizedRequest.timeoutMs;

  return {
    url: normalizedRequest.url,
    method: normalizedRequest.method,
    headers,
    contentType: normalizedRequest.contentType,
    payload: normalizedRequest.payload,
    serializeJsonPayload: normalizedRequest.serializeJsonPayload !== false,
    retries,
    timeoutMs,
    parseJson: normalizedRequest.parseJson,
    followRedirects: normalizedRequest.followRedirects,
    validateHttpsCertificates: normalizedRequest.validateHttpsCertificates,
    isTransientStatus: typeof normalizedRequest.isTransientStatus === 'function'
      ? normalizedRequest.isTransientStatus
      : astHttpDefaultTransientStatus,
    includeRaw: normalizedRequest.includeRaw || resolvedConfig.HTTP_INCLUDE_RAW === true
  };
}

function astHttpBuildResponseEnvelope(coreResponse, requestConfig) {
  const envelope = {
    status: 'ok',
    source: {
      method: String(requestConfig.method || 'GET').toUpperCase(),
      url: requestConfig.url
    },
    output: {
      statusCode: Number(coreResponse.statusCode || 0),
      text: typeof coreResponse.body === 'string' ? coreResponse.body : '',
      json: coreResponse.json,
      headers: astHttpNormalizeHeaders(coreResponse.headers)
    },
    usage: {
      attempts: Number(coreResponse.attempts || 1),
      elapsedMs: Number(coreResponse.elapsedMs || 0)
    }
  };

  if (requestConfig.includeRaw) {
    envelope.raw = {
      response: coreResponse.response || null
    };
  }

  return envelope;
}

function astRunHttpRequest(request = {}) {
  const normalizedRequest = astHttpValidateRequest(request);
  const resolvedConfig = astHttpResolveConfig(request);
  const requestConfig = astHttpNormalizeRequestEnvelope(normalizedRequest, resolvedConfig);

  try {
    const coreResponse = astHttpRunWithCore(requestConfig);
    return astHttpBuildResponseEnvelope(coreResponse, requestConfig);
  } catch (error) {
    throw astHttpMapCoreError(error, requestConfig);
  }
}

function astSerializeHttpBatchError(error) {
  if (!error || typeof error !== 'object') {
    return {
      name: 'Error',
      message: String(error)
    };
  }

  return {
    name: astHttpNormalizeString(error.name, 'Error'),
    message: astHttpNormalizeString(error.message, 'Unknown error'),
    details: astHttpRunIsPlainObject(error.details) ? error.details : {}
  };
}

function astRunHttpBatchRequest(request = {}) {
  const normalizedBatch = astHttpValidateBatchRequest(request);
  const startedAtMs = Date.now();

  const items = [];
  let successCount = 0;
  let failedCount = 0;

  for (let index = 0; index < normalizedBatch.requests.length; index += 1) {
    const itemRequest = normalizedBatch.requests[index];

    try {
      const response = astRunHttpRequest(itemRequest);
      items.push({
        index,
        status: 'ok',
        response
      });
      successCount += 1;
    } catch (error) {
      const serializedError = astSerializeHttpBatchError(error);
      items.push({
        index,
        status: 'error',
        error: serializedError
      });
      failedCount += 1;

      if (!normalizedBatch.continueOnError) {
        throw new AstHttpProviderError('HTTP batch request failed', {
          index,
          failed: failedCount,
          total: normalizedBatch.requests.length,
          error: serializedError
        }, error);
      }
    }
  }

  const response = {
    status: 'ok',
    operation: 'request_batch',
    items,
    usage: {
      total: normalizedBatch.requests.length,
      success: successCount,
      failed: failedCount,
      elapsedMs: Math.max(0, Date.now() - startedAtMs)
    }
  };

  if (!normalizedBatch.includeRaw) {
    return response;
  }

  response.raw = {
    errors: items.filter(item => item.status === 'error').map(item => item.error)
  };

  return response;
}
