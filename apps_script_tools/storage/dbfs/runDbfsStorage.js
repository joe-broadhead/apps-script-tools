const AST_DBFS_READ_CHUNK_BYTES = 1024 * 1024;
const AST_DBFS_WRITE_PUT_MAX_BYTES = 1024 * 1024;
const AST_DBFS_WRITE_BLOCK_BYTES = 768 * 1024;

function astDbfsBuildApiUrl(host, endpoint, query = {}) {
  const base = `https://${host}/api/2.0/dbfs/${endpoint}`;
  const keys = Object.keys(query || {}).filter(key => query[key] !== null && typeof query[key] !== 'undefined');
  if (keys.length === 0) {
    return base;
  }

  const queryString = keys
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(query[key]))}`)
    .join('&');

  return `${base}?${queryString}`;
}

function astDbfsBuildHeaders(config) {
  return {
    Authorization: `Bearer ${config.token}`,
    'Content-Type': 'application/json'
  };
}

function astDbfsMapProviderError(error, request) {
  const statusCode = Number(error?.details?.statusCode || 0);
  const json = error?.details?.json || null;
  const errorCode = astStorageNormalizeString(json && json.error_code, '');

  if (
    error &&
    error.name === 'AstStorageProviderError' &&
    (
      statusCode === 404 ||
      errorCode === 'RESOURCE_DOES_NOT_EXIST'
    )
  ) {
    throw astStorageBuildNotFoundError(request.provider, request.operation, request.uri, {
      statusCode,
      body: error.details && error.details.body ? error.details.body : null
    });
  }

  throw error;
}

function astDbfsRequest({ request, config, endpoint, method = 'get', query = {}, payload }) {
  return astStorageHttpRequest({
    provider: 'dbfs',
    operation: request.operation,
    url: astDbfsBuildApiUrl(config.host, endpoint, query),
    method,
    headers: astDbfsBuildHeaders(config),
    payload: typeof payload === 'undefined' ? undefined : JSON.stringify(payload),
    contentType: 'application/json',
    retries: request.options.retries,
    timeoutMs: request.options.timeoutMs
  });
}

function astDbfsList({ request, config }) {
  const response = astDbfsRequest({
    request,
    config,
    endpoint: 'list',
    method: 'get',
    query: {
      path: request.location.path
    }
  });

  const files = Array.isArray(response.json && response.json.files) ? response.json.files : [];

  return {
    output: {
      items: files.slice(0, request.options.maxItems).map(file => {
        const path = astStorageNormalizeString(file.path, '');
        return {
          uri: path,
          path,
          isDir: Boolean(file.is_dir),
          size: Number(file.file_size || 0),
          modifiedAt: file.modification_time || null
        };
      })
    },
    page: {
      nextPageToken: null,
      truncated: false
    },
    usage: {
      requestCount: 1,
      bytesIn: 0,
      bytesOut: typeof response.body === 'string' ? response.body.length : 0
    },
    raw: response.json || response.body
  };
}

function astDbfsHead({ request, config }) {
  const response = astDbfsRequest({
    request,
    config,
    endpoint: 'get-status',
    method: 'get',
    query: {
      path: request.location.path
    }
  });

  const payload = response.json || {};
  return {
    id: astStorageNormalizeString(payload.path, null),
    output: {
      object: {
        uri: request.location.path,
        path: payload.path || request.location.path,
        isDir: Boolean(payload.is_dir),
        size: Number(payload.file_size || 0),
        modifiedAt: payload.modification_time || null
      }
    },
    usage: {
      requestCount: 1,
      bytesIn: 0,
      bytesOut: typeof response.body === 'string' ? response.body.length : 0
    },
    raw: payload
  };
}

function astDbfsRead({ request, config }) {
  const chunkSize = astStorageNormalizePositiveInt(
    request.providerOptions.readChunkBytes,
    AST_DBFS_READ_CHUNK_BYTES,
    1
  );

  let offset = 0;
  let requestCount = 0;
  const mergedBytes = [];

  while (true) {
    const response = astDbfsRequest({
      request,
      config,
      endpoint: 'read',
      method: 'get',
      query: {
        path: request.location.path,
        offset,
        length: chunkSize
      }
    });

    requestCount += 1;

    const bytesRead = Number(response.json && response.json.bytes_read ? response.json.bytes_read : 0);
    const chunkBase64 = astStorageNormalizeString(response.json && response.json.data, '');
    const chunkBytes = chunkBase64 ? astStorageBase64ToBytes(chunkBase64) : [];

    for (let idx = 0; idx < chunkBytes.length; idx += 1) {
      mergedBytes.push(chunkBytes[idx]);
    }

    offset += bytesRead;

    if (bytesRead < chunkSize) {
      break;
    }

    if (bytesRead === 0) {
      break;
    }
  }

  const base64 = astStorageBytesToBase64(mergedBytes);
  const bytesOut = astStorageBytesLength(mergedBytes);
  const warnings = astStorageBuildReadWarnings(bytesOut);

  return {
    output: {
      data: astStorageBuildReadData(base64, 'application/octet-stream')
    },
    usage: {
      requestCount,
      bytesIn: 0,
      bytesOut
    },
    raw: null,
    warnings
  };
}

function astDbfsWritePut({ request, config, base64 }) {
  return astDbfsRequest({
    request,
    config,
    endpoint: 'put',
    method: 'post',
    payload: {
      path: request.location.path,
      overwrite: Boolean(request.options.overwrite),
      contents: base64
    }
  });
}

function astDbfsWriteChunked({ request, config, bytes }) {
  const created = astDbfsRequest({
    request,
    config,
    endpoint: 'create',
    method: 'post',
    payload: {
      path: request.location.path,
      overwrite: Boolean(request.options.overwrite)
    }
  });

  const handle = Number(created.json && created.json.handle);
  if (!Number.isInteger(handle)) {
    throw new AstStorageProviderError('DBFS create did not return a valid handle', {
      provider: 'dbfs',
      operation: 'write',
      uri: request.uri,
      response: created.json || null
    });
  }

  let requestCount = 1;

  for (let start = 0; start < bytes.length; start += AST_DBFS_WRITE_BLOCK_BYTES) {
    const end = Math.min(bytes.length, start + AST_DBFS_WRITE_BLOCK_BYTES);
    const slice = bytes.slice(start, end);
    const chunkBase64 = astStorageBytesToBase64(slice);

    astDbfsRequest({
      request,
      config,
      endpoint: 'add-block',
      method: 'post',
      payload: {
        handle,
        data: chunkBase64
      }
    });

    requestCount += 1;
  }

  astDbfsRequest({
    request,
    config,
    endpoint: 'close',
    method: 'post',
    payload: {
      handle
    }
  });

  requestCount += 1;
  return requestCount;
}

function astDbfsWrite({ request, config }) {
  const base64 = request.payload.base64;
  const bytes = astStorageBase64ToBytes(base64);
  const sizeBytes = astStorageBytesLength(bytes);

  let requestCount = 0;

  if (sizeBytes <= AST_DBFS_WRITE_PUT_MAX_BYTES) {
    astDbfsWritePut({ request, config, base64 });
    requestCount = 1;
  } else {
    requestCount = astDbfsWriteChunked({ request, config, bytes });
  }

  return {
    output: {
      written: {
        uri: request.location.path,
        path: request.location.path,
        size: sizeBytes,
        mimeType: request.payload.mimeType || null
      }
    },
    usage: {
      requestCount,
      bytesIn: sizeBytes,
      bytesOut: 0
    },
    raw: null
  };
}

function astDbfsDelete({ request, config }) {
  const response = astDbfsRequest({
    request,
    config,
    endpoint: 'delete',
    method: 'post',
    payload: {
      path: request.location.path,
      recursive: Boolean(request.options.recursive)
    }
  });

  return {
    output: {
      deleted: {
        uri: request.location.path,
        deleted: true
      }
    },
    usage: {
      requestCount: 1,
      bytesIn: 0,
      bytesOut: typeof response.body === 'string' ? response.body.length : 0
    },
    raw: response.json || response.body
  };
}

function astRunDbfsStorage({ request, config }) {
  try {
    switch (request.operation) {
      case 'list':
        return astDbfsList({ request, config });
      case 'head':
        return astDbfsHead({ request, config });
      case 'read':
        return astDbfsRead({ request, config });
      case 'write':
        return astDbfsWrite({ request, config });
      case 'delete':
        return astDbfsDelete({ request, config });
      default:
        throw new AstStorageCapabilityError('Unsupported DBFS operation', {
          operation: request.operation
        });
    }
  } catch (error) {
    astDbfsMapProviderError(error, request);
  }
}
