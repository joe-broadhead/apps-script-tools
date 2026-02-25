const AST_STORAGE_DEFAULT_OPTIONS = Object.freeze({
  recursive: false,
  pageSize: 1000,
  pageToken: null,
  maxItems: 10000,
  timeoutMs: 45000,
  retries: 2,
  includeRaw: false,
  overwrite: true,
  ifMatch: null,
  ifNoneMatch: null,
  expiresInSec: 900,
  method: 'GET',
  partSizeBytes: 5 * 1024 * 1024
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
  if (operation !== 'write' && operation !== 'multipart_write') {
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
  if (sizeBytes > astStorageGetSoftLimitBytes()) {
    warnings.push(astStorageBuildSoftLimitWarning('write payload', sizeBytes));
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

function astStorageNormalizeSignedUrlMethod(value) {
  const normalized = astStorageNormalizeString(value, AST_STORAGE_DEFAULT_OPTIONS.method).toUpperCase();
  const supported = ['GET', 'PUT', 'HEAD', 'DELETE'];

  if (!supported.includes(normalized)) {
    throw new AstStorageValidationError('options.method must be one of GET, PUT, HEAD, DELETE', {
      method: normalized
    });
  }

  return normalized;
}

function astStorageNormalizePreconditionToken(value, optionName) {
  if (typeof value === 'undefined' || value === null) {
    return null;
  }

  if (typeof value === 'boolean') {
    if (optionName === 'ifNoneMatch') {
      return value ? '*' : null;
    }
    throw new AstStorageValidationError(`${optionName} must be a non-empty string or number`);
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new AstStorageValidationError(`${optionName} must be a finite number when provided as numeric`);
    }
    return String(Math.floor(value));
  }

  if (typeof value !== 'string') {
    throw new AstStorageValidationError(`${optionName} must be a string, number, boolean, or null`);
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized;
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
    overwrite: astStorageNormalizeBoolean(options.overwrite, AST_STORAGE_DEFAULT_OPTIONS.overwrite),
    ifMatch: astStorageNormalizePreconditionToken(options.ifMatch, 'ifMatch'),
    ifNoneMatch: astStorageNormalizePreconditionToken(options.ifNoneMatch, 'ifNoneMatch'),
    expiresInSec: astStorageNormalizePositiveInt(options.expiresInSec, AST_STORAGE_DEFAULT_OPTIONS.expiresInSec, 1),
    method: astStorageNormalizeSignedUrlMethod(options.method),
    partSizeBytes: astStorageNormalizePositiveInt(options.partSizeBytes, AST_STORAGE_DEFAULT_OPTIONS.partSizeBytes, 1)
  };

  if (normalized.ifMatch && normalized.ifNoneMatch) {
    throw new AstStorageValidationError('options.ifMatch and options.ifNoneMatch cannot both be set');
  }

  return normalized;
}

function astStorageAssertLocationForOperation(provider, operation, location) {
  if (provider === 'dbfs') {
    if (!location.path) {
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

function astStorageAssertTransferLocations(provider, operation, fromLocation, toLocation) {
  if (provider === 'dbfs') {
    if (!fromLocation.path) {
      throw new AstStorageValidationError(`dbfs ${operation} operation requires fromLocation.path`);
    }
    if (!toLocation.path) {
      throw new AstStorageValidationError(`dbfs ${operation} operation requires toLocation.path`);
    }
    return;
  }

  if (!fromLocation.bucket || !fromLocation.key) {
    throw new AstStorageValidationError(`${provider} ${operation} operation requires fromLocation.bucket and fromLocation.key`);
  }

  if (!toLocation.bucket || !toLocation.key) {
    throw new AstStorageValidationError(`${provider} ${operation} operation requires toLocation.bucket and toLocation.key`);
  }
}

function astStorageNormalizeTransferLocationInput(input) {
  if (astStorageIsPlainObject(input)) {
    return input;
  }

  return {};
}

function astStorageResolveRequestProvider({
  request,
  operation,
  parsedUri,
  parsedFromUri,
  parsedToUri
}) {
  const providerFromRequest = astStorageNormalizeProvider(request.provider || '');
  const transferOperation = operation === 'copy' || operation === 'move';

  if (!transferOperation) {
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

    return provider;
  }

  const inferredProviders = [parsedFromUri?.provider, parsedToUri?.provider, parsedUri?.provider]
    .filter(Boolean);
  const uniqueInferred = Array.from(new Set(inferredProviders));

  if (uniqueInferred.length > 1) {
    throw new AstStorageValidationError('copy/move operations require from/to URIs to use the same provider', {
      providers: uniqueInferred
    });
  }

  const provider = providerFromRequest || uniqueInferred[0] || '';
  if (!provider) {
    throw new AstStorageValidationError('copy/move requests require provider or fromUri/toUri');
  }

  if (providerFromRequest && uniqueInferred.length > 0 && uniqueInferred[0] !== providerFromRequest) {
    throw new AstStorageValidationError('provider must match fromUri/toUri provider for copy/move', {
      provider: providerFromRequest,
      uriProvider: uniqueInferred[0]
    });
  }

  return provider;
}

function astValidateStorageRequest(request = {}) {
  if (!astStorageIsPlainObject(request)) {
    throw new AstStorageValidationError('Storage request must be an object');
  }

  const parsedUri = typeof request.uri !== 'undefined' && request.uri !== null
    ? astParseStorageUri(request.uri)
    : null;
  const parsedFromUri = typeof request.fromUri !== 'undefined' && request.fromUri !== null
    ? astParseStorageUri(request.fromUri)
    : null;
  const parsedToUri = typeof request.toUri !== 'undefined' && request.toUri !== null
    ? astParseStorageUri(request.toUri)
    : null;

  const operation = astStorageNormalizeOperation(request.operation);
  const provider = astStorageResolveRequestProvider({
    request,
    operation,
    parsedUri,
    parsedFromUri,
    parsedToUri
  });

  const rawOptions = astStorageIsPlainObject(request.options)
    ? astStorageCloneObject(request.options)
    : {};
  if (typeof request.ifMatch !== 'undefined') {
    rawOptions.ifMatch = request.ifMatch;
  }
  if (typeof request.ifNoneMatch !== 'undefined') {
    rawOptions.ifNoneMatch = request.ifNoneMatch;
  }

  const options = astStorageNormalizeOptions(rawOptions);
  const payload = astStorageNormalizePayload(request.payload || {}, operation);

  let location = null;
  let from = null;
  let to = null;
  let normalizedUri = null;

  if (operation === 'copy' || operation === 'move') {
    const fromLocation = astStorageNormalizeLocation(
      provider,
      astStorageNormalizeTransferLocationInput(request.fromLocation || request.from),
      parsedFromUri
    );
    const toLocation = astStorageNormalizeLocation(
      provider,
      astStorageNormalizeTransferLocationInput(request.toLocation || request.to),
      parsedToUri || parsedUri
    );

    astStorageAssertTransferLocations(provider, operation, fromLocation, toLocation);

    from = {
      uri: astStorageBuildUri(provider, fromLocation),
      location: fromLocation
    };
    to = {
      uri: astStorageBuildUri(provider, toLocation),
      location: toLocation
    };
    location = toLocation;
    normalizedUri = to.uri;
  } else {
    location = astStorageNormalizeLocation(provider, request.location || {}, parsedUri);
    astStorageAssertLocationForOperation(provider, operation, location);
    normalizedUri = astStorageBuildUri(provider, location);
  }

  return {
    provider,
    operation,
    uri: normalizedUri,
    location,
    from,
    to,
    payload,
    options,
    preconditions: {
      ifMatch: options.ifMatch,
      ifNoneMatch: options.ifNoneMatch
    },
    auth: astStorageIsPlainObject(request.auth) ? astStorageCloneObject(request.auth) : {},
    providerOptions: astStorageIsPlainObject(request.providerOptions)
      ? astStorageCloneObject(request.providerOptions)
      : {}
  };
}
