function astDbtNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astDbtIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astDbtJsonClone(value) {
  if (value == null) {
    return null;
  }

  return JSON.parse(JSON.stringify(value));
}

function astDbtCloneObject(value) {
  if (!astDbtIsPlainObject(value)) {
    return {};
  }

  return Object.assign({}, value);
}

function astDbtNormalizeProvider(provider) {
  const normalized = astDbtNormalizeString(provider, '').toLowerCase();
  if (!normalized) {
    return '';
  }

  if (AST_DBT_PROVIDERS.indexOf(normalized) === -1) {
    throw new AstDbtValidationError(
      `provider must be one of: ${AST_DBT_PROVIDERS.join(', ')}`,
      { provider: normalized }
    );
  }

  return normalized;
}

function astDbtNormalizeStorageKey(key) {
  if (typeof key !== 'string') {
    return '';
  }
  return key.replace(/^\/+/, '');
}

function astDbtNormalizeBucket(bucket) {
  const normalized = astDbtNormalizeString(bucket, '');
  if (!normalized) {
    throw new AstDbtValidationError('bucket must be a non-empty string');
  }
  return normalized;
}

function astDbtNormalizeDbfsPath(pathValue) {
  const raw = astDbtNormalizeString(pathValue, '');
  if (!raw) {
    throw new AstDbtValidationError('dbfs path must be a non-empty string');
  }

  if (/^dbfs:$/i.test(raw) || /^dbfs:\/\/$/i.test(raw)) {
    throw new AstDbtValidationError('dbfs path must include a path segment');
  }

  if (raw.startsWith('dbfs:/')) {
    return raw;
  }

  if (raw.startsWith('dbfs://')) {
    const body = raw.slice('dbfs://'.length);
    return body.startsWith('/') ? `dbfs:${body}` : `dbfs:/${body}`;
  }

  if (raw.startsWith('/')) {
    return `dbfs:${raw}`;
  }

  return `dbfs:/${raw}`;
}

function astDbtNormalizeDriveFileId(fileId) {
  const normalized = astDbtNormalizeString(fileId, '');
  if (!normalized) {
    throw new AstDbtValidationError('drive fileId must be a non-empty string');
  }
  return normalized;
}

function astDbtNormalizeDriveFolderId(folderId) {
  const normalized = astDbtNormalizeString(folderId, '');
  if (!normalized) {
    throw new AstDbtValidationError('drive folderId must be a non-empty string');
  }
  return normalized;
}

function astDbtNormalizeDriveFileName(fileName) {
  const normalized = astDbtNormalizeString(fileName, '');
  if (!normalized) {
    throw new AstDbtValidationError('drive fileName must be a non-empty string');
  }
  return normalized;
}

function astDbtBuildUri(provider, location = {}) {
  const normalizedProvider = astDbtNormalizeProvider(provider);

  if (normalizedProvider === 'drive') {
    if (location.fileId) {
      return `drive://file/${encodeURIComponent(location.fileId)}`;
    }

    if (location.folderId && location.fileName) {
      return `drive://path/${encodeURIComponent(location.folderId)}/${encodeURIComponent(location.fileName)}`;
    }

    throw new AstDbtValidationError('drive URI requires fileId or folderId+fileName', { location });
  }

  if (normalizedProvider === 'dbfs') {
    return astDbtNormalizeDbfsPath(location.path || '');
  }

  const bucket = astDbtNormalizeBucket(location.bucket || '');
  const key = astDbtNormalizeStorageKey(location.key || '');
  return key ? `${normalizedProvider}://${bucket}/${key}` : `${normalizedProvider}://${bucket}`;
}

function astDbtParseDriveUri(uri) {
  const raw = astDbtNormalizeString(uri, '');
  const driveFileMatch = raw.match(/^drive:\/\/file\/([^/?#]+)$/i);
  if (driveFileMatch) {
    const fileId = decodeURIComponent(driveFileMatch[1]);
    return {
      provider: 'drive',
      uri: astDbtBuildUri('drive', { fileId }),
      location: { fileId }
    };
  }

  const drivePathMatch = raw.match(/^drive:\/\/path\/([^/?#]+)\/(.+)$/i);
  if (drivePathMatch) {
    const folderId = decodeURIComponent(drivePathMatch[1]);
    const fileName = decodeURIComponent(drivePathMatch[2]);
    return {
      provider: 'drive',
      uri: astDbtBuildUri('drive', { folderId, fileName }),
      location: { folderId, fileName }
    };
  }

  return null;
}

function astDbtParseStorageLikeUri(uri) {
  const raw = astDbtNormalizeString(uri, '');

  const gcsMatch = raw.match(/^gcs:\/\/([^/]+)(?:\/(.*))?$/i);
  if (gcsMatch) {
    const bucket = astDbtNormalizeBucket(gcsMatch[1]);
    const key = astDbtNormalizeStorageKey(gcsMatch[2] || '');
    return {
      provider: 'gcs',
      uri: astDbtBuildUri('gcs', { bucket, key }),
      location: { bucket, key }
    };
  }

  const s3Match = raw.match(/^s3:\/\/([^/]+)(?:\/(.*))?$/i);
  if (s3Match) {
    const bucket = astDbtNormalizeBucket(s3Match[1]);
    const key = astDbtNormalizeStorageKey(s3Match[2] || '');
    return {
      provider: 's3',
      uri: astDbtBuildUri('s3', { bucket, key }),
      location: { bucket, key }
    };
  }

  if (/^dbfs:(?:\/\/)?/i.test(raw) || raw.startsWith('/')) {
    const path = astDbtNormalizeDbfsPath(raw);
    return {
      provider: 'dbfs',
      uri: path,
      location: { path }
    };
  }

  return null;
}

function astDbtParseUri(uri) {
  const raw = astDbtNormalizeString(uri, '');
  if (!raw) {
    return null;
  }

  const drive = astDbtParseDriveUri(raw);
  if (drive) {
    return drive;
  }

  const storageLike = astDbtParseStorageLikeUri(raw);
  if (storageLike) {
    return storageLike;
  }

  throw new AstDbtValidationError(
    'uri must use one of: drive://file/<id>, drive://path/<folderId>/<fileName>, gcs://, s3://, dbfs:/',
    { uri: raw }
  );
}

function astDbtNormalizeLocation(provider, location = {}, parsedUri = null) {
  const normalizedProvider = astDbtNormalizeProvider(provider);
  const incoming = astDbtCloneObject(location);

  if (normalizedProvider === 'drive') {
    const mergedFileId = astDbtNormalizeString(
      incoming.fileId || (parsedUri && parsedUri.location && parsedUri.location.fileId) || '',
      ''
    );

    if (mergedFileId) {
      return {
        fileId: astDbtNormalizeDriveFileId(mergedFileId)
      };
    }

    const mergedFolderId = astDbtNormalizeString(
      incoming.folderId || (parsedUri && parsedUri.location && parsedUri.location.folderId) || '',
      ''
    );
    const mergedFileName = astDbtNormalizeString(
      incoming.fileName || (parsedUri && parsedUri.location && parsedUri.location.fileName) || '',
      ''
    );

    if (!mergedFolderId || !mergedFileName) {
      throw new AstDbtValidationError('drive location requires fileId or folderId+fileName', {
        provider: normalizedProvider
      });
    }

    return {
      folderId: astDbtNormalizeDriveFolderId(mergedFolderId),
      fileName: astDbtNormalizeDriveFileName(mergedFileName)
    };
  }

  if (normalizedProvider === 'dbfs') {
    const path = astDbtNormalizeDbfsPath(
      incoming.path || (parsedUri && parsedUri.location && parsedUri.location.path) || ''
    );
    return { path };
  }

  const bucket = astDbtNormalizeBucket(
    incoming.bucket || (parsedUri && parsedUri.location && parsedUri.location.bucket) || ''
  );
  const key = astDbtNormalizeStorageKey(
    incoming.key || (parsedUri && parsedUri.location && parsedUri.location.key) || ''
  );

  if (!key) {
    throw new AstDbtValidationError(`${normalizedProvider} location requires key for manifest loading`, {
      provider: normalizedProvider
    });
  }

  return { bucket, key };
}
