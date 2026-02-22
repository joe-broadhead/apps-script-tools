function astGcsEncodeObjectKey(key) {
  return encodeURIComponent(String(key || '')).replace(/%2F/g, '%2F');
}

function astGcsBuildMetadataUrl(bucket, key) {
  return `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${astGcsEncodeObjectKey(key)}`;
}

function astGcsBuildMediaUrl(bucket, key) {
  return `${astGcsBuildMetadataUrl(bucket, key)}?alt=media`;
}

function astGcsBuildUploadUrl(bucket, key) {
  return `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${astGcsEncodeObjectKey(key)}`;
}

function astGcsBuildHeaders(accessToken, request = {}) {
  const headers = {
    Authorization: `Bearer ${accessToken}`
  };

  if (request.payload && request.payload.mimeType) {
    headers['Content-Type'] = request.payload.mimeType;
  }

  return headers;
}

function astGcsMapProviderError(error, request) {
  if (
    error &&
    error.name === 'AstStorageProviderError' &&
    error.details &&
    Number(error.details.statusCode) === 404
  ) {
    throw astStorageBuildNotFoundError(request.provider, request.operation, request.uri, {
      statusCode: 404,
      body: error.details.body || null
    });
  }

  throw error;
}

function astGcsList({ request, accessToken }) {
  const prefix = astStorageNormalizeString(request.location.key, '');
  const query = [];

  if (prefix) {
    query.push(`prefix=${encodeURIComponent(prefix)}`);
  }

  query.push(`maxResults=${request.options.pageSize}`);

  if (request.options.pageToken) {
    query.push(`pageToken=${encodeURIComponent(request.options.pageToken)}`);
  }

  if (!request.options.recursive) {
    query.push('delimiter=%2F');
  }

  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(request.location.bucket)}/o?${query.join('&')}`;

  const response = astStorageHttpRequest({
    provider: 'gcs',
    operation: 'list',
    url,
    method: 'get',
    headers: astGcsBuildHeaders(accessToken),
    retries: request.options.retries,
    timeoutMs: request.options.timeoutMs
  });

  const payload = response.json || {};
  const items = Array.isArray(payload.items)
    ? payload.items.map(item => {
      const key = astStorageNormalizeString(item.name, '');
      return {
        uri: astStorageBuildUri('gcs', {
          bucket: request.location.bucket,
          key
        }),
        bucket: request.location.bucket,
        key,
        size: Number(item.size || 0),
        etag: item.etag || null,
        generation: item.generation || null,
        updated: item.updated || null,
        mimeType: item.contentType || null
      };
    })
    : [];

  const prefixes = Array.isArray(payload.prefixes)
    ? payload.prefixes.map(prefix => ({
      uri: astStorageBuildUri('gcs', {
        bucket: request.location.bucket,
        key: astStorageNormalizeString(prefix, '')
      }),
      bucket: request.location.bucket,
      key: astStorageNormalizeString(prefix, ''),
      isPrefix: true
    }))
    : [];

  const allItems = items.concat(prefixes);
  const mergedItems = allItems.slice(0, request.options.maxItems);
  const truncatedByMaxItems = allItems.length > request.options.maxItems;
  const nextPageToken = astStorageNormalizeString(payload.nextPageToken, null);

  return {
    output: {
      items: mergedItems
    },
    page: {
      nextPageToken,
      truncated: Boolean(nextPageToken) || truncatedByMaxItems
    },
    usage: {
      requestCount: 1,
      bytesOut: typeof response.body === 'string' ? response.body.length : 0,
      bytesIn: 0
    },
    raw: payload
  };
}

function astGcsHead({ request, accessToken }) {
  const response = astStorageHttpRequest({
    provider: 'gcs',
    operation: 'head',
    url: astGcsBuildMetadataUrl(request.location.bucket, request.location.key),
    method: 'get',
    headers: astGcsBuildHeaders(accessToken),
    retries: request.options.retries,
    timeoutMs: request.options.timeoutMs
  });

  const payload = response.json || {};

  return {
    id: payload.id || null,
    output: {
      object: {
        uri: request.uri,
        bucket: request.location.bucket,
        key: request.location.key,
        size: Number(payload.size || 0),
        etag: payload.etag || null,
        generation: payload.generation || null,
        metageneration: payload.metageneration || null,
        updated: payload.updated || null,
        mimeType: payload.contentType || null,
        metadata: astStorageIsPlainObject(payload.metadata) ? payload.metadata : {}
      }
    },
    usage: {
      requestCount: 1,
      bytesOut: typeof response.body === 'string' ? response.body.length : 0,
      bytesIn: 0
    },
    raw: payload
  };
}

function astGcsRead({ request, accessToken }) {
  const response = astStorageHttpRequest({
    provider: 'gcs',
    operation: 'read',
    url: astGcsBuildMediaUrl(request.location.bucket, request.location.key),
    method: 'get',
    headers: astGcsBuildHeaders(accessToken),
    retries: request.options.retries,
    timeoutMs: request.options.timeoutMs
  });

  let base64;
  let bytesOut = 0;

  if (response.response && typeof response.response.getBlob === 'function') {
    const blob = response.response.getBlob();
    const bytes = blob && typeof blob.getBytes === 'function' ? blob.getBytes() : [];
    bytesOut = astStorageBytesLength(bytes);
    base64 = astStorageBytesToBase64(bytes);
  } else {
    const body = typeof response.body === 'string' ? response.body : '';
    bytesOut = body.length;
    base64 = astStorageTextToBase64(body);
  }

  const mimeType = astStorageNormalizeReadMimeType(response.headers, 'application/octet-stream');
  const warnings = astStorageBuildReadWarnings(bytesOut);

  return {
    output: {
      data: astStorageBuildReadData(base64, mimeType)
    },
    usage: {
      requestCount: 1,
      bytesOut,
      bytesIn: 0
    },
    raw: request.options.includeRaw ? response.body : null,
    warnings
  };
}

function astGcsWrite({ request, accessToken }) {
  if (!request.options.overwrite) {
    try {
      astGcsHead({ request, accessToken });
      throw new AstStorageProviderError('Storage object already exists and overwrite=false', {
        provider: 'gcs',
        operation: 'write',
        uri: request.uri,
        statusCode: 409
      });
    } catch (error) {
      if (error && error.name === 'AstStorageNotFoundError') {
        // proceed
      } else if (error && error.name === 'AstStorageProviderError' && error.details?.statusCode === 404) {
        // proceed
      } else {
        throw error;
      }
    }
  }

  const bytes = astStorageBase64ToBytes(request.payload.base64);

  const response = astStorageHttpRequest({
    provider: 'gcs',
    operation: 'write',
    url: astGcsBuildUploadUrl(request.location.bucket, request.location.key),
    method: 'post',
    headers: astGcsBuildHeaders(accessToken, request),
    contentType: request.payload.mimeType,
    payload: bytes,
    retries: request.options.retries,
    timeoutMs: request.options.timeoutMs
  });

  const payload = response.json || {};

  return {
    id: payload.id || null,
    output: {
      written: {
        uri: request.uri,
        bucket: request.location.bucket,
        key: request.location.key,
        size: Number(payload.size || request.payload.sizeBytes || 0),
        etag: payload.etag || null,
        generation: payload.generation || null,
        mimeType: payload.contentType || request.payload.mimeType
      }
    },
    usage: {
      requestCount: 1,
      bytesIn: request.payload.sizeBytes,
      bytesOut: typeof response.body === 'string' ? response.body.length : 0
    },
    raw: payload
  };
}

function astGcsDelete({ request, accessToken }) {
  const response = astStorageHttpRequest({
    provider: 'gcs',
    operation: 'delete',
    url: astGcsBuildMetadataUrl(request.location.bucket, request.location.key),
    method: 'delete',
    headers: astGcsBuildHeaders(accessToken),
    retries: request.options.retries,
    timeoutMs: request.options.timeoutMs
  });

  return {
    output: {
      deleted: {
        uri: request.uri,
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

function astRunGcsStorage({ request, config }) {
  const accessToken = astGcsResolveAccessToken(config, {
    retries: request.options.retries,
    timeoutMs: request.options.timeoutMs
  });

  try {
    switch (request.operation) {
      case 'list':
        return astGcsList({ request, accessToken });
      case 'head':
        return astGcsHead({ request, accessToken });
      case 'read':
        return astGcsRead({ request, accessToken });
      case 'write':
        return astGcsWrite({ request, accessToken });
      case 'delete':
        return astGcsDelete({ request, accessToken });
      default:
        throw new AstStorageCapabilityError('Unsupported GCS operation', {
          operation: request.operation
        });
    }
  } catch (error) {
    astGcsMapProviderError(error, request);
  }
}
