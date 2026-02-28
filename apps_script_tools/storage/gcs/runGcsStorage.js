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

function astGcsBuildRewriteUrl(fromLocation, toLocation, rewriteToken = null) {
  const base = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(fromLocation.bucket)}/o/${astGcsEncodeObjectKey(fromLocation.key)}/rewriteTo/b/${encodeURIComponent(toLocation.bucket)}/o/${astGcsEncodeObjectKey(toLocation.key)}`;
  if (!rewriteToken) {
    return base;
  }
  return `${base}?rewriteToken=${encodeURIComponent(rewriteToken)}`;
}

function astGcsBuildResumableUploadUrl(bucket, key) {
  return `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=resumable&name=${astGcsEncodeObjectKey(key)}`;
}

function astGcsBuildObjectPath(location) {
  const encodedKey = astStorageNormalizeKey(location && location.key ? location.key : '')
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  return `/${encodeURIComponent(location.bucket)}/${encodedKey}`;
}

function astGcsBytesToHex(bytes = []) {
  let output = '';
  for (let idx = 0; idx < bytes.length; idx += 1) {
    const value = bytes[idx] < 0 ? bytes[idx] + 256 : bytes[idx];
    const hex = value.toString(16);
    output += hex.length === 1 ? `0${hex}` : hex;
  }
  return output;
}

function astGcsSha256Hex(value) {
  if (
    typeof Utilities === 'undefined' ||
    !Utilities ||
    typeof Utilities.computeDigest !== 'function' ||
    !Utilities.DigestAlgorithm ||
    !Utilities.DigestAlgorithm.SHA_256
  ) {
    throw new AstStorageAuthError('Utilities.computeDigest with SHA_256 is required for GCS signed URL generation');
  }

  return astGcsBytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value));
}

function astGcsExtractHeaderValue(headers = {}, headerName, fallback = null) {
  const target = String(headerName || '').toLowerCase();
  const key = Object.keys(headers || {}).find(entry => String(entry || '').toLowerCase() === target);
  if (!key) {
    return fallback;
  }
  return headers[key];
}

function astGcsNormalizeServiceAccountJson(value) {
  if (astStorageIsPlainObject(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new AstStorageAuthError('GCS serviceAccountJson must be valid JSON', {}, error);
  }
}

function astGcsResolveSignedUrlDate(providerOptions = {}) {
  const raw = providerOptions.requestDate || providerOptions.now || null;
  if (!raw) {
    return new Date();
  }

  const resolved = raw instanceof Date ? new Date(raw.getTime()) : new Date(raw);
  if (Number.isNaN(resolved.getTime())) {
    throw new AstStorageValidationError('providerOptions.requestDate must be a valid date');
  }

  return resolved;
}

function astGcsFormatDateParts(inputDate) {
  const iso = new Date(inputDate).toISOString();
  const amzDate = iso.replace(/[:-]|\.\d{3}/g, '');
  return {
    amzDate,
    dateStamp: amzDate.slice(0, 8)
  };
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

function astGcsBuildPreconditionFailedError(request, precondition) {
  return new AstStorageProviderError('Storage precondition failed', {
    provider: 'gcs',
    operation: request.operation,
    uri: request.uri,
    statusCode: 412,
    precondition
  });
}

function astGcsNormalizeGenerationToken(value) {
  const token = astStorageNormalizeString(value, null);
  if (!token) {
    return null;
  }
  if (!/^[0-9]+$/.test(token)) {
    return null;
  }
  return token;
}

function astGcsResolveCurrentObjectForPreconditions({ request, accessToken }) {
  return astGcsHead({
    request: {
      provider: request.provider,
      operation: 'head',
      uri: request.uri,
      location: request.location,
      options: request.options
    },
    accessToken
  }).output.object || {};
}

function astGcsBuildWritePreconditions({ request, accessToken }) {
  const preconditions = request.preconditions || {};
  const ifMatch = astStorageNormalizeString(preconditions.ifMatch, null);
  const ifNoneMatch = astStorageNormalizeString(preconditions.ifNoneMatch, null);
  const query = {};

  if (!ifMatch && !ifNoneMatch) {
    return query;
  }

  if (ifMatch && ifNoneMatch) {
    throw new AstStorageValidationError('ifMatch and ifNoneMatch cannot both be specified for a single request');
  }

  if (ifMatch) {
    const generationToken = astGcsNormalizeGenerationToken(ifMatch);
    if (generationToken) {
      query.ifGenerationMatch = generationToken;
      return query;
    }

    const current = astGcsResolveCurrentObjectForPreconditions({ request, accessToken });
    const currentGeneration = astStorageNormalizeString(current.generation, null);
    const currentEtag = astStorageNormalizeString(current.etag, null);

    if (!currentGeneration) {
      throw new AstStorageCapabilityError('GCS object generation is required for conditional write checks', {
        uri: request.uri
      });
    }

    if (ifMatch !== '*' && ifMatch !== currentEtag && ifMatch !== currentGeneration) {
      throw astGcsBuildPreconditionFailedError(request, 'ifMatch');
    }

    query.ifGenerationMatch = currentGeneration;
    return query;
  }

  if (ifNoneMatch === '*') {
    query.ifGenerationMatch = 0;
    return query;
  }

  const noneMatchGeneration = astGcsNormalizeGenerationToken(ifNoneMatch);
  if (noneMatchGeneration) {
    query.ifGenerationNotMatch = noneMatchGeneration;
    return query;
  }

  let current = null;
  try {
    current = astGcsResolveCurrentObjectForPreconditions({ request, accessToken });
  } catch (error) {
    if (error && error.name === 'AstStorageNotFoundError') {
      return query;
    }
    throw error;
  }

  const currentEtag = astStorageNormalizeString(current && current.etag, null);
  const currentGeneration = astStorageNormalizeString(current && current.generation, null);
  if (ifNoneMatch === currentEtag || ifNoneMatch === currentGeneration) {
    throw astGcsBuildPreconditionFailedError(request, 'ifNoneMatch');
  }

  // For non-generation ifNoneMatch tokens (e.g. etag), enforce the check atomically by
  // pinning the subsequent write to the generation we observed.
  if (!currentGeneration) {
    throw new AstStorageCapabilityError('GCS object generation is required for conditional write checks', {
      uri: request.uri
    });
  }

  query.ifGenerationMatch = currentGeneration;
  return query;
}

function astGcsAppendQueryParams(url, params = {}) {
  const keys = Object.keys(params || {});
  if (keys.length === 0) {
    return url;
  }

  const query = keys
    .filter(key => params[key] != null)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
    .join('&');

  if (!query) {
    return url;
  }
  return `${url}${url.indexOf('?') === -1 ? '?' : '&'}${query}`;
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
  const writeQuery = astGcsBuildWritePreconditions({ request, accessToken });

  const response = astStorageHttpRequest({
    provider: 'gcs',
    operation: 'write',
    url: astGcsAppendQueryParams(
      astGcsBuildUploadUrl(request.location.bucket, request.location.key),
      writeQuery
    ),
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

function astGcsExists({ request, accessToken }) {
  try {
    const head = astGcsHead({ request, accessToken });
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

function astGcsCopy({ request, accessToken }) {
  if (!request.options.overwrite) {
    try {
      astGcsHead({
        request: {
          provider: request.provider,
          operation: 'head',
          uri: request.to.uri,
          location: request.to.location,
          options: request.options
        },
        accessToken
      });
      throw new AstStorageProviderError('Storage object already exists and overwrite=false', {
        provider: 'gcs',
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

  let rewriteToken = null;
  let requestCount = 0;
  let payload = null;

  do {
    const response = astStorageHttpRequest({
      provider: 'gcs',
      operation: 'copy',
      url: astGcsBuildRewriteUrl(request.from.location, request.to.location, rewriteToken),
      method: 'post',
      headers: astGcsBuildHeaders(accessToken),
      retries: request.options.retries,
      timeoutMs: request.options.timeoutMs
    });

    payload = response.json || {};
    rewriteToken = astStorageNormalizeString(payload.rewriteToken, null);
    requestCount += 1;
  } while (rewriteToken);

  const resource = astStorageIsPlainObject(payload && payload.resource) ? payload.resource : {};

  return {
    id: resource.id || null,
    output: {
      copied: {
        uri: request.to.uri,
        fromUri: request.from.uri,
        toUri: request.to.uri,
        bucket: request.to.location.bucket,
        key: request.to.location.key,
        size: Number(resource.size || 0),
        etag: resource.etag || null,
        generation: resource.generation || null,
        mimeType: resource.contentType || null
      }
    },
    usage: {
      requestCount,
      bytesIn: 0,
      bytesOut: 0
    },
    raw: payload
  };
}

function astGcsMove({ request, accessToken }) {
  const copied = astGcsCopy({ request, accessToken });

  const deleteSourceRequest = {
    provider: request.provider,
    operation: 'delete',
    uri: request.from.uri,
    location: request.from.location,
    options: request.options
  };
  const deleted = astGcsDelete({
    request: deleteSourceRequest,
    accessToken
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

function astGcsSignedUrl({ request, config }) {
  const serviceAccount = astGcsNormalizeServiceAccountJson(config.serviceAccountJson);

  if (!serviceAccount || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new AstStorageAuthError('GCS signedUrl requires service account JSON with client_email and private_key');
  }

  if (
    typeof Utilities === 'undefined' ||
    !Utilities ||
    typeof Utilities.computeRsaSha256Signature !== 'function'
  ) {
    throw new AstStorageAuthError('Utilities.computeRsaSha256Signature is required for GCS signed URL generation');
  }

  const requestDate = astGcsResolveSignedUrlDate(request.providerOptions || {});
  const { amzDate, dateStamp } = astGcsFormatDateParts(requestDate);
  const credentialScope = `${dateStamp}/auto/storage/goog4_request`;
  const host = 'storage.googleapis.com';
  const canonicalUri = astGcsBuildObjectPath(request.location);

  const queryParams = {
    'X-Goog-Algorithm': 'GOOG4-RSA-SHA256',
    'X-Goog-Credential': `${serviceAccount.client_email}/${credentialScope}`,
    'X-Goog-Date': amzDate,
    'X-Goog-Expires': String(request.options.expiresInSec),
    'X-Goog-SignedHeaders': 'host'
  };

  const canonicalQuery = Object.keys(queryParams)
    .sort((a, b) => a.localeCompare(b))
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&');

  const canonicalRequest = [
    request.options.method,
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  const stringToSign = [
    'GOOG4-RSA-SHA256',
    amzDate,
    credentialScope,
    astGcsSha256Hex(canonicalRequest)
  ].join('\n');

  const signatureBytes = Utilities.computeRsaSha256Signature(
    stringToSign,
    serviceAccount.private_key
  );
  const signatureHex = astGcsBytesToHex(signatureBytes);

  const url = `https://${host}${canonicalUri}?${canonicalQuery}&X-Goog-Signature=${signatureHex}`;

  return {
    output: {
      signedUrl: {
        uri: request.uri,
        url,
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
          canonicalRequest,
          stringToSign
        }
      : null
  };
}

function astGcsMultipartWrite({ request, accessToken }) {
  if (!request.options.overwrite) {
    try {
      astGcsHead({ request, accessToken });
      throw new AstStorageProviderError('Storage object already exists and overwrite=false', {
        provider: 'gcs',
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
  const startResponse = astStorageHttpRequest({
    provider: 'gcs',
    operation: 'multipart_write',
    url: astGcsBuildResumableUploadUrl(request.location.bucket, request.location.key),
    method: 'post',
    headers: Object.assign({}, astGcsBuildHeaders(accessToken), {
      'X-Upload-Content-Type': request.payload.mimeType
    }),
    contentType: 'application/json',
    payload: '{}',
    retries: request.options.retries,
    timeoutMs: request.options.timeoutMs
  });

  const sessionUrl = astStorageNormalizeString(
    astGcsExtractHeaderValue(startResponse.headers, 'location', ''),
    ''
  );
  if (!sessionUrl) {
    throw new AstStorageProviderError('GCS resumable upload did not return session location', {
      provider: 'gcs',
      operation: 'multipart_write',
      uri: request.uri
    });
  }

  const uploadResponse = astStorageHttpRequest({
    provider: 'gcs',
    operation: 'multipart_write',
    url: sessionUrl,
    method: 'put',
    headers: astGcsBuildHeaders(accessToken, request),
    contentType: request.payload.mimeType,
    payload: bytes,
    retries: request.options.retries,
    timeoutMs: request.options.timeoutMs
  });

  const payload = uploadResponse.json || {};

  return {
    id: payload.id || null,
    output: {
      multipartWritten: {
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
      requestCount: 2,
      bytesIn: request.payload.sizeBytes,
      bytesOut: (typeof startResponse.body === 'string' ? startResponse.body.length : 0)
        + (typeof uploadResponse.body === 'string' ? uploadResponse.body.length : 0)
    },
    raw: payload
  };
}

function astRunGcsStorage({ request, config }) {
  if (request.operation === 'signed_url') {
    try {
      return astGcsSignedUrl({ request, config });
    } catch (error) {
      astGcsMapProviderError(error, request);
    }
  }

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
      case 'exists':
        return astGcsExists({ request, accessToken });
      case 'copy':
        return astGcsCopy({ request, accessToken });
      case 'move':
        return astGcsMove({ request, accessToken });
      case 'multipart_write':
        return astGcsMultipartWrite({ request, accessToken });
      default:
        throw new AstStorageCapabilityError('Unsupported GCS operation', {
          operation: request.operation
        });
    }
  } catch (error) {
    astGcsMapProviderError(error, request);
  }
}
