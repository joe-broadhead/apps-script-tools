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

function astS3BuildConditionalHeaders(request) {
  const preconditions = request && request.preconditions ? request.preconditions : {};
  const ifMatch = astStorageNormalizeString(preconditions.ifMatch, null);
  const ifNoneMatch = astStorageNormalizeString(preconditions.ifNoneMatch, null);

  const headers = {};
  if (ifMatch) {
    headers['if-match'] = ifMatch;
  }
  if (ifNoneMatch) {
    headers['if-none-match'] = ifNoneMatch;
  }
  return headers;
}

function astS3MapProviderError(error, request) {
  if (
    error &&
    error.name === 'AstStorageProviderError' &&
    Number(error.details && error.details.statusCode) === 412
  ) {
    throw new AstStorageProviderError('Storage precondition failed', {
      provider: request.provider,
      operation: request.operation,
      uri: request.uri,
      statusCode: 412
    }, error);
  }

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

function astS3ParseUploadId(xmlText) {
  const xml = String(xmlText || '');
  const uploadId = (xml.match(/<UploadId>([\s\S]*?)<\/UploadId>/) || [null, null])[1];
  return astStorageNormalizeString(uploadId, null);
}

function astS3ParseCompleteEtag(xmlText) {
  const xml = String(xmlText || '');
  const etag = (xml.match(/<ETag>([\s\S]*?)<\/ETag>/) || [null, null])[1];
  return etag ? etag.replace(/^"|"$/g, '') : null;
}

function astS3EncodeCopySource(location) {
  const bucket = encodeURIComponent(location.bucket);
  const key = String(location.key || '')
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  return `/${bucket}/${key}`;
}

function astS3ResolveRequestDate(providerOptions = {}) {
  const raw = providerOptions.requestDate || providerOptions.now || null;
  if (!raw) {
    return new Date();
  }

  const date = raw instanceof Date ? new Date(raw.getTime()) : new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new AstStorageValidationError('providerOptions.requestDate must be a valid date');
  }
  return date;
}

function astS3Request({
  request,
  config,
  method,
  query = {},
  payload = '',
  headers = {},
  operation,
  location
}) {
  const conditionalHeaders = astS3BuildConditionalHeaders(request);
  const signed = astS3SignRequest({
    method,
    location: location || request.location,
    query,
    payload,
    headers: Object.assign({}, conditionalHeaders, headers || {}),
    config
  });

  return astStorageHttpRequest({
    provider: 's3',
    operation: operation || request.operation,
    url: signed.url,
    method,
    headers: signed.headers,
    payload,
    retries: request.options.retries,
    timeoutMs: request.options.timeoutMs
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

  const cappedItems = parsed.items.slice(0, request.options.maxItems);
  const truncatedByMaxItems = parsed.items.length > request.options.maxItems;

  return {
    output: {
      items: cappedItems
    },
    page: {
      nextPageToken: astStorageNormalizeString(parsed.nextPageToken, null),
      truncated: parsed.truncated || truncatedByMaxItems
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
    raw: response.body,
    warnings
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

function astS3Exists({ request, config }) {
  try {
    const head = astS3Head({ request, config });
    return {
      output: {
        exists: {
          exists: true,
          uri: request.uri,
          object: head.output.object
        }
      },
      usage: head.usage,
      raw: head.raw
    };
  } catch (error) {
    if (
      (error && error.name === 'AstStorageNotFoundError')
      || (error && error.name === 'AstStorageProviderError' && Number(error.details?.statusCode) === 404)
    ) {
      return {
        output: {
          exists: {
            exists: false,
            uri: request.uri
          }
        },
        usage: {
          requestCount: 1,
          bytesIn: 0,
          bytesOut: 0
        },
        raw: null
      };
    }

    throw error;
  }
}

function astS3Copy({ request, config }) {
  if (!request.options.overwrite) {
    try {
      astS3Head({
        request: {
          provider: request.provider,
          operation: 'head',
          uri: request.to.uri,
          location: request.to.location,
          options: request.options
        },
        config
      });
      throw new AstStorageProviderError('Storage object already exists and overwrite=false', {
        provider: 's3',
        operation: 'copy',
        uri: request.to.uri,
        statusCode: 409
      });
    } catch (error) {
      if (error && error.name === 'AstStorageNotFoundError') {
        // continue
      } else if (error && error.name === 'AstStorageProviderError' && error.details?.statusCode === 404) {
        // continue
      } else {
        throw error;
      }
    }
  }

  const response = astS3Request({
    request,
    config,
    method: 'put',
    operation: 'copy',
    location: request.to.location,
    headers: {
      'x-amz-copy-source': astS3EncodeCopySource(request.from.location)
    }
  });

  const etag = astStorageNormalizeString(astS3GetHeaderValue(response.headers, 'etag', ''), null);

  return {
    id: etag,
    output: {
      copied: {
        uri: request.to.uri,
        fromUri: request.from.uri,
        toUri: request.to.uri,
        bucket: request.to.location.bucket,
        key: request.to.location.key,
        etag
      }
    },
    usage: {
      requestCount: 1,
      bytesIn: 0,
      bytesOut: typeof response.body === 'string' ? response.body.length : 0
    },
    raw: response.body || response.headers
  };
}

function astS3Move({ request, config }) {
  const copied = astS3Copy({ request, config });
  const deleted = astS3Delete({
    request: {
      provider: request.provider,
      operation: 'delete',
      uri: request.from.uri,
      location: request.from.location,
      options: request.options
    },
    config
  });

  return {
    id: copied.id || null,
    output: {
      moved: {
        uri: request.to.uri,
        fromUri: request.from.uri,
        toUri: request.to.uri,
        deletedSource: Boolean(deleted.output && deleted.output.deleted && deleted.output.deleted.deleted)
      }
    },
    usage: {
      requestCount: (copied.usage?.requestCount || 0) + (deleted.usage?.requestCount || 0),
      bytesIn: copied.usage?.bytesIn || 0,
      bytesOut: (copied.usage?.bytesOut || 0) + (deleted.usage?.bytesOut || 0)
    },
    raw: copied.raw
  };
}

function astS3SignedUrl({ request, config }) {
  const requestDate = astS3ResolveRequestDate(request.providerOptions || {});
  const presigned = astS3PresignUrl({
    method: request.options.method,
    location: request.location,
    config,
    expiresInSec: request.options.expiresInSec,
    requestDate
  });

  return {
    output: {
      signedUrl: {
        uri: request.uri,
        url: presigned.url,
        method: request.options.method,
        expiresInSec: request.options.expiresInSec,
        expiresAt: new Date(requestDate.getTime() + (request.options.expiresInSec * 1000)).toISOString()
      }
    },
    usage: {
      requestCount: 0,
      bytesIn: 0,
      bytesOut: 0
    },
    raw: request.options.includeRaw
      ? {
          canonicalRequest: presigned.canonicalRequest,
          stringToSign: presigned.stringToSign
        }
      : null
  };
}

function astS3MultipartWrite({ request, config }) {
  if (!request.options.overwrite) {
    try {
      astS3Head({ request, config });
      throw new AstStorageProviderError('Storage object already exists and overwrite=false', {
        provider: 's3',
        operation: 'multipart_write',
        uri: request.uri,
        statusCode: 409
      });
    } catch (error) {
      if (error && error.name === 'AstStorageNotFoundError') {
        // continue
      } else if (error && error.name === 'AstStorageProviderError' && error.details?.statusCode === 404) {
        // continue
      } else {
        throw error;
      }
    }
  }

  const bytes = astStorageBase64ToBytes(request.payload.base64);
  const partSizeBytes = request.options.partSizeBytes;

  // S3 multipart completion requires at least one uploaded part.
  // For zero-byte payloads, create an empty object with a single PUT instead.
  if (bytes.length === 0) {
    const wroteEmpty = astS3Request({
      request,
      config,
      method: 'put',
      operation: 'multipart_write',
      payload: [],
      headers: {
        'content-type': request.payload.mimeType || 'application/octet-stream'
      }
    });

    const etag = astStorageNormalizeString(astS3GetHeaderValue(wroteEmpty.headers, 'etag', ''), null);

    return {
      id: etag,
      output: {
        multipartWritten: {
          uri: request.uri,
          bucket: request.location.bucket,
          key: request.location.key,
          uploadId: null,
          partCount: 0,
          size: 0,
          etag,
          mimeType: request.payload.mimeType || null
        }
      },
      usage: {
        requestCount: 1,
        bytesIn: 0,
        bytesOut: typeof wroteEmpty.body === 'string' ? wroteEmpty.body.length : 0
      },
      raw: wroteEmpty.headers
    };
  }

  const initiated = astS3Request({
    request,
    config,
    method: 'post',
    operation: 'multipart_write',
    query: {
      uploads: ''
    }
  });

  const uploadId = astS3ParseUploadId(initiated.body);
  if (!uploadId) {
    throw new AstStorageProviderError('S3 multipart upload initiation did not return UploadId', {
      provider: 's3',
      operation: 'multipart_write',
      uri: request.uri
    });
  }

  const parts = [];
  let requestCount = 1;

  for (let start = 0, partNumber = 1; start < bytes.length; start += partSizeBytes, partNumber += 1) {
    const end = Math.min(bytes.length, start + partSizeBytes);
    const partBytes = bytes.slice(start, end);

    const uploaded = astS3Request({
      request,
      config,
      method: 'put',
      operation: 'multipart_write',
      query: {
        partNumber,
        uploadId
      },
      payload: partBytes,
      headers: {
        'content-type': request.payload.mimeType || 'application/octet-stream'
      }
    });

    requestCount += 1;

    const etag = astStorageNormalizeString(astS3GetHeaderValue(uploaded.headers, 'etag', ''), null);
    if (!etag) {
      throw new AstStorageProviderError('S3 multipart upload part missing ETag', {
        provider: 's3',
        operation: 'multipart_write',
        uri: request.uri,
        uploadId,
        partNumber
      });
    }

    parts.push({
      partNumber,
      etag
    });
  }

  const completeXml = [
    '<CompleteMultipartUpload>',
    ...parts.map(part => `<Part><PartNumber>${part.partNumber}</PartNumber><ETag>${part.etag}</ETag></Part>`),
    '</CompleteMultipartUpload>'
  ].join('');

  const completed = astS3Request({
    request,
    config,
    method: 'post',
    operation: 'multipart_write',
    query: {
      uploadId
    },
    payload: completeXml,
    headers: {
      'content-type': 'application/xml'
    }
  });

  requestCount += 1;

  return {
    id: astS3ParseCompleteEtag(completed.body) || astStorageNormalizeString(astS3GetHeaderValue(completed.headers, 'etag', ''), null),
    output: {
      multipartWritten: {
        uri: request.uri,
        bucket: request.location.bucket,
        key: request.location.key,
        uploadId,
        partCount: parts.length,
        size: request.payload.sizeBytes,
        etag: astS3ParseCompleteEtag(completed.body),
        mimeType: request.payload.mimeType || null
      }
    },
    usage: {
      requestCount,
      bytesIn: request.payload.sizeBytes,
      bytesOut: (typeof initiated.body === 'string' ? initiated.body.length : 0)
        + (typeof completed.body === 'string' ? completed.body.length : 0)
    },
    raw: completed.body
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
      case 'exists':
        return astS3Exists({ request, config });
      case 'copy':
        return astS3Copy({ request, config });
      case 'move':
        return astS3Move({ request, config });
      case 'signed_url':
        return astS3SignedUrl({ request, config });
      case 'multipart_write':
        return astS3MultipartWrite({ request, config });
      default:
        throw new AstStorageCapabilityError('Unsupported S3 operation', {
          operation: request.operation
        });
    }
  } catch (error) {
    astS3MapProviderError(error, request);
  }
}
