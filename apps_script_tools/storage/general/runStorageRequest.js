function astStorageGetProviderAdapter(provider) {
  const adapters = {
    gcs: typeof astRunGcsStorage === 'function' ? astRunGcsStorage : null,
    s3: typeof astRunS3Storage === 'function' ? astRunS3Storage : null,
    dbfs: typeof astRunDbfsStorage === 'function' ? astRunDbfsStorage : null
  };

  const adapter = adapters[provider];

  if (!adapter) {
    throw new AstStorageValidationError('Storage provider adapter is not available', {
      provider
    });
  }

  return adapter;
}

function astStorageNormalizeUsage(usage = {}) {
  const input = astStorageIsPlainObject(usage) ? usage : {};

  return {
    requestCount: Number.isInteger(input.requestCount) && input.requestCount > 0 ? input.requestCount : 1,
    bytesIn: typeof input.bytesIn === 'number' && isFinite(input.bytesIn) && input.bytesIn >= 0 ? input.bytesIn : 0,
    bytesOut: typeof input.bytesOut === 'number' && isFinite(input.bytesOut) && input.bytesOut >= 0 ? input.bytesOut : 0
  };
}

function astStorageNormalizePage(page = {}) {
  const input = astStorageIsPlainObject(page) ? page : {};
  return {
    nextPageToken: astStorageNormalizeString(input.nextPageToken, null),
    truncated: Boolean(input.truncated)
  };
}

function astStorageNormalizeOutput(operation, output = {}) {
  const normalized = {
    items: [],
    object: null,
    data: null,
    written: null,
    deleted: null
  };

  if (!astStorageIsPlainObject(output)) {
    return normalized;
  }

  if (operation === 'list') {
    normalized.items = Array.isArray(output.items) ? output.items : [];
  }

  if (operation === 'head') {
    normalized.object = astStorageIsPlainObject(output.object) ? output.object : null;
  }

  if (operation === 'read') {
    normalized.data = astStorageIsPlainObject(output.data) ? output.data : null;
  }

  if (operation === 'write') {
    normalized.written = astStorageIsPlainObject(output.written) ? output.written : null;
  }

  if (operation === 'delete') {
    normalized.deleted = astStorageIsPlainObject(output.deleted) ? output.deleted : null;
  }

  return normalized;
}

function astStorageNormalizeResponse(request, adapterResult = {}) {
  const rawResult = astStorageIsPlainObject(adapterResult) ? adapterResult : {};

  const response = {
    provider: request.provider,
    operation: request.operation,
    uri: request.uri,
    id: astStorageNormalizeString(rawResult.id, null),
    output: astStorageNormalizeOutput(request.operation, rawResult.output),
    page: astStorageNormalizePage(rawResult.page),
    usage: astStorageNormalizeUsage(rawResult.usage)
  };

  const requestWarnings = request.payload && Array.isArray(request.payload.warnings)
    ? request.payload.warnings.slice()
    : [];
  const resultWarnings = Array.isArray(rawResult.warnings) ? rawResult.warnings.slice() : [];
  const warnings = requestWarnings.concat(resultWarnings);

  if (warnings.length > 0) {
    response.warnings = warnings;
  }

  if (request.options.includeRaw) {
    response.raw = rawResult.raw || null;
  }

  return response;
}

function runStorageRequest(request = {}) {
  const normalizedRequest = validateStorageRequest(request);
  astStorageAssertOperationSupported(normalizedRequest.provider, normalizedRequest.operation);

  const resolvedConfig = resolveStorageConfig(normalizedRequest);
  const adapter = astStorageGetProviderAdapter(normalizedRequest.provider);

  let adapterResult;
  try {
    adapterResult = adapter({
      request: normalizedRequest,
      config: resolvedConfig
    });
  } catch (error) {
    if (
      error &&
      (
        error.name === 'AstStorageError' ||
        error.name === 'AstStorageValidationError' ||
        error.name === 'AstStorageAuthError' ||
        error.name === 'AstStorageCapabilityError' ||
        error.name === 'AstStorageNotFoundError' ||
        error.name === 'AstStorageProviderError' ||
        error.name === 'AstStorageParseError'
      )
    ) {
      throw error;
    }

    throw new AstStorageProviderError(
      'Storage operation failed',
      {
        provider: normalizedRequest.provider,
        operation: normalizedRequest.operation,
        uri: normalizedRequest.uri
      },
      error
    );
  }

  return astStorageNormalizeResponse(normalizedRequest, adapterResult);
}
