function astS3GetHeaderValue(headers = {}, name, fallback = null) {
  const target = String(name || '').toLowerCase();
  const key = Object.keys(headers || {}).find(header => String(header || '').toLowerCase() === target);
  if (!key) {
    return fallback;
  }
  return headers[key];
}

function astS3ParseListXml(xmlText, bucket) {
  const xml = String(xmlText || '');
  const items = [];

  const contentBlocks = xml.match(/<Contents>[\s\S]*?<\/Contents>/g) || [];
  contentBlocks.forEach(block => {
    const key = (block.match(/<Key>([\s\S]*?)<\/Key>/) || [null, ''])[1];
    if (!key) {
      return;
    }

    const sizeRaw = (block.match(/<Size>([\s\S]*?)<\/Size>/) || [null, '0'])[1];
    const etagRaw = (block.match(/<ETag>([\s\S]*?)<\/ETag>/) || [null, ''])[1];
    const lastModified = (block.match(/<LastModified>([\s\S]*?)<\/LastModified>/) || [null, null])[1];
    const storageClass = (block.match(/<StorageClass>([\s\S]*?)<\/StorageClass>/) || [null, null])[1];

    items.push({
      uri: astStorageBuildUri('s3', { bucket, key }),
      bucket,
      key,
      size: Number(sizeRaw || 0),
      etag: etagRaw ? etagRaw.replace(/^"|"$/g, '') : null,
      updated: lastModified,
      storageClass
    });
  });

  const prefixBlocks = xml.match(/<CommonPrefixes>[\s\S]*?<\/CommonPrefixes>/g) || [];
  prefixBlocks.forEach(block => {
    const prefix = (block.match(/<Prefix>([\s\S]*?)<\/Prefix>/) || [null, ''])[1];
    if (!prefix) {
      return;
    }

    items.push({
      uri: astStorageBuildUri('s3', { bucket, key: prefix }),
      bucket,
      key: prefix,
      isPrefix: true
    });
  });

  const nextToken = (xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/) || [null, null])[1];
  const truncatedRaw = (xml.match(/<IsTruncated>([\s\S]*?)<\/IsTruncated>/) || [null, 'false'])[1];

  return {
    items,
    nextPageToken: nextToken,
    truncated: String(truncatedRaw).toLowerCase() === 'true'
  };
}

function astS3MapProviderError(error, request) {
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

function astS3Request({ request, config, method, query = {}, payload = '', headers = {}, operation }) {
  const signed = astS3SignRequest({
    method,
    location: request.location,
    query,
    payload,
    headers,
    config
  });

  return astStorageHttpRequest({
    provider: 's3',
    operation,
    url: signed.url,
    method,
    headers: signed.headers,
    payload,
    retries: request.options.retries
  });
}

function astS3List({ request, config }) {
  const query = {
    'list-type': 2,
    'max-keys': request.options.pageSize
  };

  if (request.location.key) {
    query.prefix = request.location.key;
  }

  if (request.options.pageToken) {
    query['continuation-token'] = request.options.pageToken;
  }

  if (!request.options.recursive) {
    query.delimiter = '/';
  }

  const response = astS3Request({
    request,
    config,
    method: 'get',
    query,
    operation: 'list'
  });

  const parsed = astS3ParseListXml(response.body, request.location.bucket);

  return {
    output: {
      items: parsed.items.slice(0, request.options.maxItems)
    },
    page: {
      nextPageToken: astStorageNormalizeString(parsed.nextPageToken, null),
      truncated: parsed.truncated
    },
    usage: {
      requestCount: 1,
      bytesOut: typeof response.body === 'string' ? response.body.length : 0,
      bytesIn: 0
    },
    raw: response.body
  };
}

function astS3Head({ request, config }) {
  const response = astS3Request({
    request,
    config,
    method: 'head',
    operation: 'head'
  });

  const headers = response.headers || {};

  return {
    id: astStorageNormalizeString(astS3GetHeaderValue(headers, 'etag', ''), null),
    output: {
      object: {
        uri: request.uri,
        bucket: request.location.bucket,
        key: request.location.key,
        size: Number(astS3GetHeaderValue(headers, 'content-length', 0) || 0),
        etag: astStorageNormalizeString(astS3GetHeaderValue(headers, 'etag', ''), null),
        mimeType: astStorageNormalizeString(astS3GetHeaderValue(headers, 'content-type', ''), null),
        updated: astStorageNormalizeString(astS3GetHeaderValue(headers, 'last-modified', ''), null)
      }
    },
    usage: {
      requestCount: 1,
      bytesOut: 0,
      bytesIn: 0
    },
    raw: headers
  };
}

function astS3Read({ request, config }) {
  const response = astS3Request({
    request,
    config,
    method: 'get',
    operation: 'read'
  });

  let base64;
  let bytesOut;

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

  return {
    output: {
      data: astStorageBuildReadData(base64, mimeType)
    },
    usage: {
      requestCount: 1,
      bytesOut,
      bytesIn: 0
    },
    raw: response.body
  };
}

function astS3Write({ request, config }) {
  if (!request.options.overwrite) {
    try {
      astS3Head({ request, config });
      throw new AstStorageProviderError('Storage object already exists and overwrite=false', {
        provider: 's3',
        operation: 'write',
        uri: request.uri,
        statusCode: 409
      });
    } catch (error) {
      if (error && error.name === 'AstStorageNotFoundError') {
        // Continue
      } else if (error && error.name === 'AstStorageProviderError' && error.details?.statusCode === 404) {
        // Continue
      } else {
        throw error;
      }
    }
  }

  const bytes = astStorageBase64ToBytes(request.payload.base64);

  const response = astS3Request({
    request,
    config,
    method: 'put',
    payload: bytes,
    headers: {
      'content-type': request.payload.mimeType || 'application/octet-stream'
    },
    operation: 'write'
  });

  const etag = astStorageNormalizeString(astS3GetHeaderValue(response.headers, 'etag', ''), null);

  return {
    id: etag,
    output: {
      written: {
        uri: request.uri,
        bucket: request.location.bucket,
        key: request.location.key,
        size: request.payload.sizeBytes,
        etag,
        mimeType: request.payload.mimeType || null
      }
    },
    usage: {
      requestCount: 1,
      bytesIn: request.payload.sizeBytes,
      bytesOut: typeof response.body === 'string' ? response.body.length : 0
    },
    raw: response.headers
  };
}

function astS3Delete({ request, config }) {
  const response = astS3Request({
    request,
    config,
    method: 'delete',
    operation: 'delete'
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
    raw: response.body
  };
}

function astRunS3Storage({ request, config }) {
  try {
    switch (request.operation) {
      case 'list':
        return astS3List({ request, config });
      case 'head':
        return astS3Head({ request, config });
      case 'read':
        return astS3Read({ request, config });
      case 'write':
        return astS3Write({ request, config });
      case 'delete':
        return astS3Delete({ request, config });
      default:
        throw new AstStorageCapabilityError('Unsupported S3 operation', {
          operation: request.operation
        });
    }
  } catch (error) {
    astS3MapProviderError(error, request);
  }
}
