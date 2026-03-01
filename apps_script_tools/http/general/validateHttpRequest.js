function astHttpValidateIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astHttpValidateNormalizeMethod(value) {
  const normalized = astHttpNormalizeString(value, 'GET').toUpperCase();
  return normalized || 'GET';
}

function astHttpValidateNormalizeInteger(value, fallback = null, minimum = null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const rounded = Math.floor(parsed);
  if (minimum != null && rounded < minimum) {
    return fallback;
  }

  return rounded;
}

function astHttpValidateRequest(request = {}) {
  if (!astHttpValidateIsPlainObject(request)) {
    throw new AstHttpValidationError('HTTP request must be an object', {
      field: 'request'
    });
  }

  const url = astHttpNormalizeString(request.url, '');
  if (!url) {
    throw new AstHttpValidationError('HTTP request requires a non-empty url', {
      field: 'url'
    });
  }

  const options = astHttpValidateIsPlainObject(request.options) ? request.options : {};

  const method = astHttpValidateNormalizeMethod(request.method || options.method || 'GET');
  const headers = astHttpValidateIsPlainObject(request.headers)
    ? Object.assign({}, request.headers)
    : {};

  if (!astHttpValidateIsPlainObject(headers)) {
    throw new AstHttpValidationError('HTTP request headers must be an object', {
      field: 'headers'
    });
  }

  let payload = typeof request.payload !== 'undefined'
    ? request.payload
    : request.body;

  const hasJson = typeof request.json !== 'undefined';
  if (hasJson && typeof payload !== 'undefined') {
    throw new AstHttpValidationError('HTTP request accepts either payload/body or json, not both', {
      field: 'payload'
    });
  }

  let contentType = astHttpNormalizeString(request.contentType || options.contentType || '', '');
  let serializeJsonPayload = false;

  if (hasJson) {
    payload = request.json;
    serializeJsonPayload = true;
    if (!contentType) {
      contentType = 'application/json';
    }
  }

  const retries = astHttpValidateNormalizeInteger(options.retries, null, 0);
  if (options.retries != null && retries == null) {
    throw new AstHttpValidationError('HTTP request options.retries must be an integer >= 0', {
      field: 'options.retries'
    });
  }

  const timeoutMs = astHttpValidateNormalizeInteger(options.timeoutMs, null, 1);
  if (options.timeoutMs != null && timeoutMs == null) {
    throw new AstHttpValidationError('HTTP request options.timeoutMs must be an integer > 0', {
      field: 'options.timeoutMs'
    });
  }

  const includeRaw = options.includeRaw === true;

  if (options.parseJson != null && typeof options.parseJson !== 'boolean') {
    throw new AstHttpValidationError('HTTP request options.parseJson must be a boolean', {
      field: 'options.parseJson'
    });
  }

  if (options.followRedirects != null && typeof options.followRedirects !== 'boolean') {
    throw new AstHttpValidationError('HTTP request options.followRedirects must be a boolean', {
      field: 'options.followRedirects'
    });
  }

  if (options.validateHttpsCertificates != null && typeof options.validateHttpsCertificates !== 'boolean') {
    throw new AstHttpValidationError('HTTP request options.validateHttpsCertificates must be a boolean', {
      field: 'options.validateHttpsCertificates'
    });
  }

  if (options.isTransientStatus != null && typeof options.isTransientStatus !== 'function') {
    throw new AstHttpValidationError('HTTP request options.isTransientStatus must be a function', {
      field: 'options.isTransientStatus'
    });
  }

  return {
    url,
    method,
    headers,
    payload,
    contentType: contentType || null,
    serializeJsonPayload,
    retries,
    timeoutMs,
    includeRaw,
    parseJson: options.parseJson !== false,
    followRedirects: options.followRedirects,
    validateHttpsCertificates: options.validateHttpsCertificates,
    isTransientStatus: options.isTransientStatus,
    userAgent: astHttpNormalizeString(options.userAgent, ''),
    defaultHeaders: astHttpValidateIsPlainObject(options.defaultHeaders)
      ? Object.assign({}, options.defaultHeaders)
      : null
  };
}

function astHttpValidateBatchRequest(request = {}) {
  if (!astHttpValidateIsPlainObject(request)) {
    throw new AstHttpValidationError('HTTP batch request must be an object', {
      field: 'request'
    });
  }

  const requests = Array.isArray(request.requests) ? request.requests : null;
  if (!requests || requests.length === 0) {
    throw new AstHttpValidationError('HTTP batch request requires non-empty requests array', {
      field: 'requests'
    });
  }

  const options = astHttpValidateIsPlainObject(request.options) ? request.options : {};
  if (options.continueOnError != null && typeof options.continueOnError !== 'boolean') {
    throw new AstHttpValidationError('HTTP batch request options.continueOnError must be boolean', {
      field: 'options.continueOnError'
    });
  }

  return {
    requests,
    continueOnError: options.continueOnError !== false,
    includeRaw: options.includeRaw === true
  };
}
