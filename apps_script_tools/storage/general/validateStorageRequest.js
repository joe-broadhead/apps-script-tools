const AST_STORAGE_SOFT_LIMIT_BYTES = 50 * 1024 * 1024;

const AST_STORAGE_DEFAULT_OPTIONS = Object.freeze({
  recursive: false,
  pageSize: 1000,
  pageToken: null,
  maxItems: 10000,
  timeoutMs: 45000,
  retries: 2,
  includeRaw: false,
  overwrite: true
});

function astStorageNormalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
}

function astStorageNormalizePositiveInt(value, fallback, min = 1) {
  if (typeof value === 'undefined' || value === null) {
    return fallback;
  }

  if (!Number.isInteger(value) || value < min) {
    throw new AstStorageValidationError('Expected a positive integer option value', {
      value,
      min
    });
  }

  return value;
}

function astStorageBase64EncodeUtf8(text) {
  if (
    typeof Utilities !== 'undefined' &&
    Utilities &&
    typeof Utilities.base64Encode === 'function'
  ) {
    return Utilities.base64Encode(String(text || ''));
  }

  throw new AstStorageValidationError('Utilities.base64Encode is required for storage payload normalization');
}

function astStorageBase64Decode(base64) {
  if (
    typeof Utilities !== 'undefined' &&
    Utilities &&
    typeof Utilities.base64Decode === 'function'
  ) {
    return Utilities.base64Decode(base64);
  }

  throw new AstStorageValidationError('Utilities.base64Decode is required for storage payload normalization');
}

function astStorageNormalizeMimeType(value, fallback = 'application/octet-stream') {
  const normalized = astStorageNormalizeString(value, '');
  return normalized || fallback;
}

function astStorageNormalizePayload(payload, operation) {
  if (operation !== 'write') {
    return null;
  }

  if (!astStorageIsPlainObject(payload)) {
    throw new AstStorageValidationError('write operation requires payload as an object');
  }

  const hasBase64 = typeof payload.base64 === 'string';
  const hasText = typeof payload.text === 'string';
  const hasJson = typeof payload.json !== 'undefined';
  const selectedCount = [hasBase64, hasText, hasJson].filter(Boolean).length;

  if (selectedCount === 0) {
    throw new AstStorageValidationError('payload must include one of: base64, text, json');
  }

  if (selectedCount > 1) {
    throw new AstStorageValidationError('payload must include only one of: base64, text, json');
  }

  let base64 = '';
  let text = null;
  let json = null;
  let kind = '';

  if (hasBase64) {
    base64 = payload.base64;
    kind = 'base64';
  } else if (hasText) {
    text = payload.text;
    base64 = astStorageBase64EncodeUtf8(text);
    kind = 'text';
  } else {
    json = payload.json;

    let jsonText;
    try {
      jsonText = JSON.stringify(json);
    } catch (error) {
      throw new AstStorageParseError('payload.json could not be serialized', {}, error);
    }

    base64 = astStorageBase64EncodeUtf8(jsonText);
    kind = 'json';
  }

  let bytes;
  try {
    bytes = astStorageBase64Decode(base64);
  } catch (error) {
    throw new AstStorageValidationError('payload.base64 must be valid base64 input', {}, error);
  }

  const sizeBytes = Array.isArray(bytes)
    ? bytes.length
    : (typeof bytes?.length === 'number' ? bytes.length : 0);

  const warnings = [];
  if (sizeBytes > AST_STORAGE_SOFT_LIMIT_BYTES) {
    warnings.push(`payload exceeds soft cap of ${AST_STORAGE_SOFT_LIMIT_BYTES} bytes`);
  }

  const mimeTypeFallback = kind === 'json'
    ? 'application/json'
    : (kind === 'text' ? 'text/plain' : 'application/octet-stream');

  return {
    base64,
    mimeType: astStorageNormalizeMimeType(payload.mimeType, mimeTypeFallback),
    encoding: astStorageNormalizeString(payload.encoding, kind === 'base64' ? null : 'utf-8'),
    kind,
    sizeBytes,
    warnings
  };
}

function astStorageNormalizeOptions(options = {}) {
  if (!astStorageIsPlainObject(options)) {
    throw new AstStorageValidationError('options must be an object when provided');
  }

  const normalized = {
    recursive: astStorageNormalizeBoolean(options.recursive, AST_STORAGE_DEFAULT_OPTIONS.recursive),
    pageSize: astStorageNormalizePositiveInt(options.pageSize, AST_STORAGE_DEFAULT_OPTIONS.pageSize, 1),
    pageToken: astStorageNormalizeString(options.pageToken, null),
    maxItems: astStorageNormalizePositiveInt(options.maxItems, AST_STORAGE_DEFAULT_OPTIONS.maxItems, 1),
    timeoutMs: astStorageNormalizePositiveInt(options.timeoutMs, AST_STORAGE_DEFAULT_OPTIONS.timeoutMs, 1),
    retries: astStorageNormalizePositiveInt(options.retries, AST_STORAGE_DEFAULT_OPTIONS.retries, 0),
    includeRaw: astStorageNormalizeBoolean(options.includeRaw, AST_STORAGE_DEFAULT_OPTIONS.includeRaw),
    overwrite: astStorageNormalizeBoolean(options.overwrite, AST_STORAGE_DEFAULT_OPTIONS.overwrite)
  };

  return normalized;
}

function astStorageAssertLocationForOperation(provider, operation, location) {
  if (provider === 'dbfs') {
    if (operation !== 'list' && operation !== 'delete' && !location.path) {
      throw new AstStorageValidationError(`dbfs ${operation} operation requires location.path`);
    }

    return;
  }

  if (!location.bucket) {
    throw new AstStorageValidationError(`${provider} operation requires location.bucket`);
  }

  if (operation !== 'list' && !location.key) {
    throw new AstStorageValidationError(`${provider} ${operation} operation requires location.key`);
  }
}

function validateStorageRequest(request = {}) {
  if (!astStorageIsPlainObject(request)) {
    throw new AstStorageValidationError('Storage request must be an object');
  }

  const parsedUri = typeof request.uri !== 'undefined' && request.uri !== null
    ? astParseStorageUri(request.uri)
    : null;

  const providerFromRequest = astStorageNormalizeProvider(request.provider || '');
  const provider = providerFromRequest || (parsedUri ? parsedUri.provider : '');

  if (!provider) {
    throw new AstStorageValidationError('Storage request requires provider or uri');
  }

  if (parsedUri && providerFromRequest && parsedUri.provider !== providerFromRequest) {
    throw new AstStorageValidationError('provider and uri provider must match', {
      provider: providerFromRequest,
      uriProvider: parsedUri.provider
    });
  }

  const operation = astStorageNormalizeOperation(request.operation);
  const location = astStorageNormalizeLocation(provider, request.location || {}, parsedUri);
  astStorageAssertLocationForOperation(provider, operation, location);

  const options = astStorageNormalizeOptions(request.options || {});
  const payload = astStorageNormalizePayload(request.payload || {}, operation);

  const normalizedUri = astStorageBuildUri(provider, location);

  return {
    provider,
    operation,
    uri: normalizedUri,
    location,
    payload,
    options,
    auth: astStorageIsPlainObject(request.auth) ? astStorageCloneObject(request.auth) : {},
    providerOptions: astStorageIsPlainObject(request.providerOptions)
      ? astStorageCloneObject(request.providerOptions)
      : {}
  };
}
