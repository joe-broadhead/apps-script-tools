function astRagResolveStorageRunFn() {
  if (typeof astRunStorageRequest === 'function') {
    return astRunStorageRequest;
  }

  if (typeof astStorageRun === 'function') {
    return astStorageRun;
  }

  if (typeof AST_STORAGE !== 'undefined' && AST_STORAGE && typeof AST_STORAGE.run === 'function') {
    return AST_STORAGE.run;
  }

  if (typeof AST !== 'undefined' && AST && AST.Storage && typeof AST.Storage.run === 'function') {
    return AST.Storage.run;
  }

  throw new AstRagSourceError('AST.Storage runtime is required for gcs/s3/dbfs source ingestion');
}

function astRagParseStorageUri(uri) {
  const normalized = astRagNormalizeString(uri, null);
  if (!normalized) {
    throw new AstRagValidationError('storage uri is required');
  }

  if (typeof astParseStorageUri === 'function') {
    const parsed = astParseStorageUri(normalized);
    if (parsed && parsed.provider && parsed.location) {
      return parsed;
    }
  }

  const gcs = normalized.match(/^gcs:\/\/([^/]+)(?:\/(.*))?$/i);
  if (gcs) {
    return {
      provider: 'gcs',
      uri: normalized,
      location: {
        bucket: gcs[1],
        key: astRagNormalizeString(gcs[2], '')
      }
    };
  }

  const s3 = normalized.match(/^s3:\/\/([^/]+)(?:\/(.*))?$/i);
  if (s3) {
    return {
      provider: 's3',
      uri: normalized,
      location: {
        bucket: s3[1],
        key: astRagNormalizeString(s3[2], '')
      }
    };
  }

  if (/^dbfs:\//i.test(normalized)) {
    return {
      provider: 'dbfs',
      uri: normalized,
      location: {
        path: normalized
      }
    };
  }

  throw new AstRagValidationError('storage uri must start with gcs://, s3://, or dbfs:/', {
    uri: normalized
  });
}

function astRagIsStoragePrefix(parsed) {
  if (!parsed || !parsed.provider) {
    return false;
  }

  if (parsed.provider === 'dbfs') {
    const path = astRagNormalizeString(parsed.location && parsed.location.path, '');
    return path.endsWith('/');
  }

  const key = astRagNormalizeString(parsed.location && parsed.location.key, '');
  return !key || key.endsWith('/');
}

function astRagBuildStorageUri(provider, location = {}) {
  if (provider === 'dbfs') {
    return astRagNormalizeString(location.path, '');
  }

  const bucket = astRagNormalizeString(location.bucket, '');
  const key = astRagNormalizeString(location.key, '').replace(/^\/+/, '');
  if (!bucket) {
    return '';
  }
  return key ? `${provider}://${bucket}/${key}` : `${provider}://${bucket}`;
}

function astRagInferStorageMimeType(pathOrUri) {
  const normalized = astRagNormalizeString(pathOrUri, '').toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.endsWith('.pdf')) {
    return 'application/pdf';
  }

  if (
    normalized.endsWith('.txt')
    || normalized.endsWith('.md')
    || normalized.endsWith('.csv')
    || normalized.endsWith('.tsv')
    || normalized.endsWith('.json')
    || normalized.endsWith('.yaml')
    || normalized.endsWith('.yml')
    || normalized.endsWith('.xml')
    || normalized.endsWith('.log')
    || normalized.endsWith('.sql')
  ) {
    return 'text/plain';
  }

  return null;
}

function astRagStorageBasename(pathOrUri) {
  const normalized = astRagNormalizeString(pathOrUri, '');
  if (!normalized) {
    return 'source';
  }

  const trimmed = normalized.replace(/\/+$/, '');
  const idx = trimmed.lastIndexOf('/');
  if (idx === -1 || idx === trimmed.length - 1) {
    return trimmed;
  }
  return trimmed.slice(idx + 1);
}

function astRagCreateStorageSourceDescriptor(uri, metadata = {}, providerOptions = {}) {
  const parsed = astRagParseStorageUri(uri);
  const normalizedUri = astRagBuildStorageUri(parsed.provider, parsed.location) || parsed.uri;
  const fileName = astRagStorageBasename(normalizedUri);
  const mimeType = astRagNormalizeString(
    metadata.mimeType || metadata.contentType || metadata.type,
    astRagInferStorageMimeType(normalizedUri)
  );
  const modifiedTime = astRagNormalizeString(
    metadata.modifiedTime || metadata.modifiedAt || metadata.updated || metadata.lastModified,
    null
  );
  const sizeBytesRaw = metadata.sizeBytes || metadata.size || metadata.contentLength || metadata.bytes;
  const sizeBytes = typeof sizeBytesRaw === 'number' && isFinite(sizeBytesRaw)
    ? sizeBytesRaw
    : (astRagNormalizeString(sizeBytesRaw, null) ? Number(sizeBytesRaw) : null);

  return {
    sourceKind: 'storage',
    provider: parsed.provider,
    uri: normalizedUri,
    fileId: `storage_${astRagComputeChecksum(normalizedUri).slice(0, 24)}`,
    fileName,
    mimeType,
    modifiedTime,
    sizeBytes: typeof sizeBytes === 'number' && isFinite(sizeBytes) ? sizeBytes : null,
    etag: astRagNormalizeString(metadata.etag || metadata.eTag || metadata.md5Hash, null),
    versionId: astRagNormalizeString(metadata.versionId || metadata.version, null),
    generation: astRagNormalizeString(metadata.generation, null),
    providerOptions: astRagIsPlainObject(providerOptions) ? astRagCloneObject(providerOptions) : {}
  };
}

function astRagListStorageSources(sourceRequest, options = {}, auth = {}) {
  const runStorage = astRagResolveStorageRunFn();
  const includeSet = new Set(sourceRequest.includeMimeTypes || AST_RAG_SUPPORTED_MIME_TYPES);
  const maxFiles = astRagNormalizePositiveInt(options.maxFiles, AST_RAG_DEFAULT_OPTIONS.maxFiles, 1);
  const pageSize = Math.min(500, maxFiles);
  const output = [];
  const seenUris = {};

  const uris = Array.isArray(sourceRequest.uris) ? sourceRequest.uris.slice() : [];
  for (let uriIndex = 0; uriIndex < uris.length; uriIndex += 1) {
    if (output.length >= maxFiles) {
      break;
    }

    const parsed = astRagParseStorageUri(uris[uriIndex]);
    if (!astRagIsStoragePrefix(parsed)) {
      const singleDescriptor = astRagCreateStorageSourceDescriptor(parsed.uri, {}, sourceRequest.providerOptions);
      if (singleDescriptor.mimeType && !includeSet.has(singleDescriptor.mimeType)) {
        continue;
      }
      if (!seenUris[singleDescriptor.uri]) {
        seenUris[singleDescriptor.uri] = true;
        output.push(singleDescriptor);
      }
      continue;
    }

    let pageToken = null;
    do {
      const remaining = Math.max(0, maxFiles - output.length);
      if (remaining === 0) {
        break;
      }

      const listResponse = runStorage({
        operation: 'list',
        provider: parsed.provider,
        uri: parsed.uri,
        location: parsed.location,
        auth,
        providerOptions: sourceRequest.providerOptions,
        options: {
          recursive: sourceRequest.includeSubfolders,
          pageSize: Math.min(pageSize, remaining),
          pageToken,
          maxItems: Math.min(pageSize, remaining),
          retries: astRagNormalizePositiveInt(options.retries, 2, 0),
          timeoutMs: 45000,
          includeRaw: false
        }
      });

      const items = Array.isArray(listResponse && listResponse.output && listResponse.output.items)
        ? listResponse.output.items.slice()
        : [];

      items.sort((left, right) => {
        const leftUri = astRagNormalizeString(left && (left.uri || left.path || left.key), '');
        const rightUri = astRagNormalizeString(right && (right.uri || right.path || right.key), '');
        return leftUri.localeCompare(rightUri);
      });

      for (let idx = 0; idx < items.length; idx += 1) {
        if (output.length >= maxFiles) {
          break;
        }

        const item = items[idx] || {};
        if (item.isPrefix || item.isDir) {
          continue;
        }

        let itemUri = astRagNormalizeString(item.uri, '');
        if (!itemUri) {
          if (parsed.provider === 'dbfs') {
            itemUri = astRagNormalizeString(item.path, '');
          } else {
            itemUri = astRagBuildStorageUri(parsed.provider, {
              bucket: parsed.location.bucket,
              key: astRagNormalizeString(item.key, '')
            });
          }
        }

        if (!itemUri || itemUri.endsWith('/')) {
          continue;
        }

        const descriptor = astRagCreateStorageSourceDescriptor(itemUri, item, sourceRequest.providerOptions);
        if (descriptor.mimeType && !includeSet.has(descriptor.mimeType)) {
          continue;
        }

        if (seenUris[descriptor.uri]) {
          continue;
        }
        seenUris[descriptor.uri] = true;
        output.push(descriptor);
      }

      pageToken = astRagNormalizeString(listResponse && listResponse.page && listResponse.page.nextPageToken, null);
    } while (pageToken);
  }

  output.sort((left, right) => {
    const leftUri = astRagNormalizeString(left.uri, '');
    const rightUri = astRagNormalizeString(right.uri, '');
    return leftUri.localeCompare(rightUri);
  });

  return output.slice(0, maxFiles);
}

function astRagListSources(sourceRequest, options = {}, auth = {}) {
  const maxFiles = astRagNormalizePositiveInt(options.maxFiles, AST_RAG_DEFAULT_OPTIONS.maxFiles, 1);
  const output = [];

  if (astRagNormalizeString(sourceRequest && sourceRequest.folderId, null)) {
    const driveSources = astRagListDriveSources(sourceRequest, { maxFiles });
    for (let idx = 0; idx < driveSources.length; idx += 1) {
      if (output.length >= maxFiles) {
        break;
      }
      output.push(driveSources[idx]);
    }
  }

  if (Array.isArray(sourceRequest && sourceRequest.uris) && sourceRequest.uris.length > 0 && output.length < maxFiles) {
    const remaining = Math.max(0, maxFiles - output.length);
    const storageSources = astRagListStorageSources(sourceRequest, {
      maxFiles: remaining,
      retries: astRagNormalizePositiveInt(options.retries, 2, 0)
    }, auth);

    for (let idx = 0; idx < storageSources.length; idx += 1) {
      output.push(storageSources[idx]);
    }
  }

  output.sort((left, right) => {
    const leftId = astRagNormalizeString(left.fileId, '');
    const rightId = astRagNormalizeString(right.fileId, '');
    if (leftId < rightId) return -1;
    if (leftId > rightId) return 1;
    return astRagNormalizeString(left.fileName, '').localeCompare(astRagNormalizeString(right.fileName, ''));
  });

  return output.slice(0, maxFiles);
}

function astRagDecodeBase64Text(base64) {
  const value = astRagNormalizeString(base64, '');
  if (!value) {
    return '';
  }

  if (
    typeof Utilities !== 'undefined'
    && Utilities
    && typeof Utilities.base64Decode === 'function'
    && typeof Utilities.newBlob === 'function'
  ) {
    const bytes = Utilities.base64Decode(value);
    return Utilities.newBlob(bytes).getDataAsString();
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('utf8');
  }

  throw new AstRagSourceError('Unable to decode base64 text without Utilities or Buffer support');
}

function astRagIsTextMimeType(mimeType) {
  const normalized = astRagNormalizeString(mimeType, '').toLowerCase();
  if (!normalized) {
    return false;
  }

  if (normalized.indexOf('text/') === 0) {
    return true;
  }

  return (
    normalized.indexOf('json') !== -1
    || normalized.indexOf('xml') !== -1
    || normalized.indexOf('yaml') !== -1
    || normalized.indexOf('yml') !== -1
    || normalized.indexOf('csv') !== -1
    || normalized.indexOf('javascript') !== -1
  );
}

function astRagReadStorageSourceText(sourceDescriptor, auth = {}, options = {}) {
  const runStorage = astRagResolveStorageRunFn();
  const readResponse = runStorage({
    operation: 'read',
    uri: sourceDescriptor.uri,
    auth,
    providerOptions: sourceDescriptor.providerOptions || {},
    options: {
      retries: astRagNormalizePositiveInt(options.retries, 2, 0),
      timeoutMs: 45000,
      includeRaw: false
    }
  });

  const data = readResponse && readResponse.output && readResponse.output.data
    ? readResponse.output.data
    : null;
  if (!data) {
    throw new AstRagSourceError('Storage read response is missing output.data envelope', {
      fileId: sourceDescriptor.fileId,
      uri: sourceDescriptor.uri
    });
  }

  const mimeType = astRagNormalizeString(
    sourceDescriptor.mimeType || data.mimeType,
    astRagInferStorageMimeType(sourceDescriptor.uri)
  );
  const sourceType = AST_RAG_SOURCE_TYPE_BY_MIME[mimeType];
  if (sourceType === 'pdf') {
    return astRagExtractPdfTextWithGemini(
      Object.assign({}, sourceDescriptor, {
        mimeType: mimeType || 'application/pdf',
        pdfBase64: astRagNormalizeString(data.base64, null)
      }),
      auth,
      options
    );
  }

  if (sourceType === 'google_doc' || sourceType === 'google_slide') {
    throw new AstRagSourceError('Google native document types are only supported from Drive sources', {
      fileId: sourceDescriptor.fileId,
      uri: sourceDescriptor.uri,
      mimeType
    });
  }

  if (!sourceType && !astRagIsTextMimeType(mimeType)) {
    throw new AstRagSourceError('Unsupported storage source mime type', {
      fileId: sourceDescriptor.fileId,
      uri: sourceDescriptor.uri,
      mimeType: mimeType || null
    });
  }

  const text = typeof data.text === 'string' && data.text.length > 0
    ? data.text
    : astRagDecodeBase64Text(data.base64);

  return {
    segments: [{ section: 'body', page: null, slide: null, text: text || '' }],
    combinedText: text || ''
  };
}

function astRagReadSourceText(sourceDescriptor, auth = {}, options = {}) {
  const kind = astRagNormalizeString(sourceDescriptor && sourceDescriptor.sourceKind, 'drive');
  if (kind === 'storage' || astRagNormalizeString(sourceDescriptor && sourceDescriptor.uri, null)) {
    return astRagReadStorageSourceText(sourceDescriptor, auth, options);
  }
  return astRagReadDriveSourceText(sourceDescriptor, auth, options);
}
