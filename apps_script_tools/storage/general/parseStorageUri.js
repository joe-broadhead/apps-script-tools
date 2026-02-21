function astStorageNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astStorageIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astStorageCloneObject(value) {
  if (!astStorageIsPlainObject(value)) {
    return {};
  }

  return Object.assign({}, value);
}

function astStorageNormalizeProvider(provider) {
  const normalized = astStorageNormalizeString(provider, '').toLowerCase();

  if (!normalized) {
    return '';
  }

  if (!AST_STORAGE_PROVIDERS.includes(normalized)) {
    throw new AstStorageValidationError(
      'provider must be one of: gcs, s3, dbfs',
      { provider: normalized }
    );
  }

  return normalized;
}

function astStorageNormalizeOperation(operation) {
  const normalized = astStorageNormalizeString(operation, '').toLowerCase();

  if (!normalized) {
    throw new AstStorageValidationError(
      'operation must be one of: list, head, read, write, delete'
    );
  }

  if (!AST_STORAGE_OPERATIONS.includes(normalized)) {
    throw new AstStorageValidationError(
      'operation must be one of: list, head, read, write, delete',
      { operation: normalized }
    );
  }

  return normalized;
}

function astStorageEncodePathSegment(segment) {
  return encodeURIComponent(String(segment || '')).replace(/%2F/g, '/');
}

function astStorageNormalizeDbfsPath(pathValue) {
  const raw = astStorageNormalizeString(pathValue, '');

  if (!raw) {
    throw new AstStorageValidationError('dbfs path must be a non-empty string');
  }

  if (/^dbfs:(?:\/\/)?$/i.test(raw)) {
    throw new AstStorageValidationError('dbfs uri/path must include a non-empty path segment');
  }

  if (raw.startsWith('dbfs:/')) {
    return raw;
  }

  if (raw.startsWith('dbfs://')) {
    const body = raw.slice('dbfs://'.length);
    if (!body || body.trim().length === 0) {
      throw new AstStorageValidationError('dbfs uri/path must include a non-empty path segment');
    }
    const normalizedBody = body.startsWith('/') ? body : `/${body}`;
    return `dbfs:${normalizedBody}`;
  }

  if (raw.startsWith('/')) {
    return `dbfs:${raw}`;
  }

  return `dbfs:/${raw}`;
}

function astStorageNormalizeBucket(bucket) {
  const normalized = astStorageNormalizeString(bucket, '');
  if (!normalized) {
    throw new AstStorageValidationError('bucket must be a non-empty string for gcs/s3 operations');
  }
  return normalized;
}

function astStorageNormalizeKey(key) {
  const normalized = typeof key === 'string' ? key.replace(/^\/+/, '') : '';
  return normalized;
}

function astStorageComposeUri(provider, location = {}) {
  if (provider === 'dbfs') {
    return astStorageNormalizeDbfsPath(location.path || '');
  }

  const bucket = astStorageNormalizeBucket(location.bucket);
  const key = astStorageNormalizeKey(location.key || '');
  if (!key) {
    return `${provider}://${bucket}`;
  }
  return `${provider}://${bucket}/${key}`;
}

function astParseStorageUri(uri) {
  const raw = astStorageNormalizeString(uri, '');

  if (!raw) {
    return null;
  }

  const gcsMatch = raw.match(/^gcs:\/\/([^/]+)(?:\/(.*))?$/i);
  if (gcsMatch) {
    return {
      provider: 'gcs',
      uri: astStorageComposeUri('gcs', {
        bucket: gcsMatch[1],
        key: astStorageNormalizeKey(gcsMatch[2] || '')
      }),
      location: {
        bucket: astStorageNormalizeBucket(gcsMatch[1]),
        key: astStorageNormalizeKey(gcsMatch[2] || '')
      }
    };
  }

  const s3Match = raw.match(/^s3:\/\/([^/]+)(?:\/(.*))?$/i);
  if (s3Match) {
    return {
      provider: 's3',
      uri: astStorageComposeUri('s3', {
        bucket: s3Match[1],
        key: astStorageNormalizeKey(s3Match[2] || '')
      }),
      location: {
        bucket: astStorageNormalizeBucket(s3Match[1]),
        key: astStorageNormalizeKey(s3Match[2] || '')
      }
    };
  }

  if (/^dbfs:(?:\/\/)?/i.test(raw) || raw.startsWith('/')) {
    const normalizedPath = astStorageNormalizeDbfsPath(raw);
    return {
      provider: 'dbfs',
      uri: normalizedPath,
      location: {
        path: normalizedPath
      }
    };
  }

  throw new AstStorageValidationError('uri must use one of: gcs://, s3://, dbfs:/', {
    uri: raw
  });
}

function astStorageNormalizeLocation(provider, location = {}, parsedUri = null) {
  const incoming = astStorageCloneObject(location);

  if (provider === 'dbfs') {
    const path = astStorageNormalizeDbfsPath(
      incoming.path ||
      (parsedUri && parsedUri.location ? parsedUri.location.path : '')
    );

    return { path };
  }

  const bucket = astStorageNormalizeBucket(
    incoming.bucket ||
    (parsedUri && parsedUri.location ? parsedUri.location.bucket : '')
  );

  const key = astStorageNormalizeKey(
    incoming.key ||
    (parsedUri && parsedUri.location ? parsedUri.location.key : '')
  );

  return {
    bucket,
    key
  };
}

function astStorageBuildUri(provider, location = {}) {
  return astStorageComposeUri(provider, location);
}

function astStorageEncodeObjectKey(key) {
  return encodeURIComponent(String(key || '')).replace(/%2F/g, '%2F');
}
