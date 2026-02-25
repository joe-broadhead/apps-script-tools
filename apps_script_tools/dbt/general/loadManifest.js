function astDbtEnsureUtilitiesFunction(functionName) {
  if (
    typeof Utilities === 'undefined' ||
    !Utilities ||
    typeof Utilities[functionName] !== 'function'
  ) {
    throw new AstDbtCapabilityError(`Utilities.${functionName} is required for DBT manifest processing`);
  }
}

function astDbtBase64ToBytes(base64) {
  astDbtEnsureUtilitiesFunction('base64Decode');
  return Utilities.base64Decode(base64 || '');
}

function astDbtBytesToBase64(bytes) {
  astDbtEnsureUtilitiesFunction('base64Encode');
  return Utilities.base64Encode(bytes || []);
}

function astDbtBytesToText(bytes) {
  if (typeof Utilities !== 'undefined' && Utilities && typeof Utilities.newBlob === 'function') {
    return Utilities.newBlob(bytes || []).getDataAsString();
  }

  let output = '';
  const safeBytes = Array.isArray(bytes) ? bytes : [];
  for (let idx = 0; idx < safeBytes.length; idx += 1) {
    const value = safeBytes[idx] < 0 ? safeBytes[idx] + 256 : safeBytes[idx];
    output += String.fromCharCode(value);
  }

  return output;
}

function astDbtTextToBytes(text) {
  if (typeof Utilities !== 'undefined' && Utilities && typeof Utilities.newBlob === 'function') {
    return Utilities.newBlob(String(text || '')).getBytes();
  }

  const safeText = String(text || '');
  const output = [];
  for (let idx = 0; idx < safeText.length; idx += 1) {
    output.push(safeText.charCodeAt(idx));
  }
  return output;
}

function astDbtGzipTextToBase64(text) {
  astDbtEnsureUtilitiesFunction('gzip');
  if (typeof Utilities.newBlob !== 'function') {
    throw new AstDbtCapabilityError('Utilities.newBlob is required for gzip encode');
  }

  try {
    const blob = Utilities.newBlob(String(text || ''), 'application/json', 'dbt-cache.json');
    const gzippedBlob = Utilities.gzip(blob);
    const bytes = gzippedBlob && typeof gzippedBlob.getBytes === 'function'
      ? gzippedBlob.getBytes()
      : [];
    return astDbtBytesToBase64(bytes);
  } catch (error) {
    throw new AstDbtParseError('Failed to gzip DBT cache payload', {}, error);
  }
}

function astDbtIsGzipPayload(readEnvelope = {}, source, options = {}) {
  if (astDbtNormalizeString(options.compression, '').toLowerCase() === 'gzip') {
    return true;
  }

  const uri = astDbtNormalizeString(source && source.uri, '').toLowerCase();
  if (uri.endsWith('.gz')) {
    return true;
  }

  const mimeType = astDbtNormalizeString(
    readEnvelope && readEnvelope.mimeType,
    ''
  ).toLowerCase();

  return mimeType.indexOf('gzip') !== -1 || mimeType.indexOf('x-gzip') !== -1;
}

function astDbtMaybeUngzipText(readEnvelope = {}, source, options = {}) {
  if (!options.allowGzip || !astDbtIsGzipPayload(readEnvelope, source, options)) {
    return null;
  }

  const base64 = astDbtNormalizeString(readEnvelope.base64, '');
  if (!base64) {
    throw new AstDbtParseError('Gzip payload detected but base64 data is unavailable');
  }

  astDbtEnsureUtilitiesFunction('ungzip');
  if (typeof Utilities.newBlob !== 'function') {
    throw new AstDbtCapabilityError('Utilities.newBlob is required for gzip decode');
  }

  try {
    const bytes = astDbtBase64ToBytes(base64);
    const blob = Utilities.newBlob(bytes, 'application/gzip', 'manifest.json.gz');
    const unzippedBlob = Utilities.ungzip(blob);
    return unzippedBlob.getDataAsString();
  } catch (error) {
    throw new AstDbtParseError('Failed to ungzip manifest payload', {}, error);
  }
}

function astDbtResolveStorageReadFn() {
  if (typeof astStorageRead === 'function') {
    return astStorageRead;
  }

  if (typeof AST_STORAGE !== 'undefined' && AST_STORAGE && typeof AST_STORAGE.read === 'function') {
    return AST_STORAGE.read;
  }

  if (typeof AST !== 'undefined' && AST && AST.Storage && typeof AST.Storage.read === 'function') {
    return AST.Storage.read;
  }

  throw new AstDbtCapabilityError('AST.Storage runtime is required to read manifests from gcs/s3/dbfs providers');
}

function astDbtResolveStorageWriteFn() {
  if (typeof astStorageWrite === 'function') {
    return astStorageWrite;
  }

  if (typeof AST_STORAGE !== 'undefined' && AST_STORAGE && typeof AST_STORAGE.write === 'function') {
    return AST_STORAGE.write;
  }

  if (typeof AST !== 'undefined' && AST && AST.Storage && typeof AST.Storage.write === 'function') {
    return AST.Storage.write;
  }

  throw new AstDbtCapabilityError('AST.Storage runtime is required to write DBT persistent cache artifacts');
}

function astDbtResolveStorageHeadFn() {
  if (typeof astStorageHead === 'function') {
    return astStorageHead;
  }

  if (typeof AST_STORAGE !== 'undefined' && AST_STORAGE && typeof AST_STORAGE.head === 'function') {
    return AST_STORAGE.head;
  }

  if (typeof AST !== 'undefined' && AST && AST.Storage && typeof AST.Storage.head === 'function') {
    return AST.Storage.head;
  }

  throw new AstDbtCapabilityError('AST.Storage runtime is required to resolve DBT source fingerprints');
}

function astDbtReadFromStorageSource(source, options = {}) {
  const readFn = astDbtResolveStorageReadFn();

  const response = readFn({
    provider: source.provider,
    uri: source.uri,
    location: source.location,
    auth: source.auth,
    providerOptions: source.providerOptions,
    options: {
      includeRaw: astDbtNormalizeBoolean(options.includeRaw, false),
      retries: astDbtNormalizePositiveInt(options.retries, 2, 0),
      timeoutMs: astDbtNormalizePositiveInt(options.timeoutMs, 45000, 1)
    },
    operation: 'read'
  });

  if (!astDbtIsPlainObject(response) || !astDbtIsPlainObject(response.output) || !astDbtIsPlainObject(response.output.data)) {
    throw new AstDbtLoadError('Storage read response does not include output.data envelope', {
      provider: source.provider,
      uri: source.uri
    });
  }

  return {
    provider: source.provider,
    uri: source.uri,
    mimeType: astDbtNormalizeString(response.output.data.mimeType, ''),
    base64: astDbtNormalizeString(response.output.data.base64, ''),
    text: astDbtNormalizeString(response.output.data.text, ''),
    json: astDbtIsPlainObject(response.output.data.json) ? response.output.data.json : null,
    usage: astDbtIsPlainObject(response.usage) ? response.usage : {},
    warnings: Array.isArray(response.warnings) ? response.warnings.slice() : [],
    raw: Object.prototype.hasOwnProperty.call(response, 'raw') ? response.raw : null
  };
}

function astDbtReadFromDriveByFileId(fileId) {
  if (typeof DriveApp === 'undefined' || !DriveApp || typeof DriveApp.getFileById !== 'function') {
    throw new AstDbtCapabilityError('DriveApp.getFileById is required for drive://file loads');
  }

  try {
    return DriveApp.getFileById(fileId);
  } catch (error) {
    throw new AstDbtNotFoundError('Drive file was not found', {
      provider: 'drive',
      fileId
    }, error);
  }
}

function astDbtReadFromDriveByPath(folderId, fileName) {
  if (
    typeof DriveApp === 'undefined' ||
    !DriveApp ||
    typeof DriveApp.getFolderById !== 'function'
  ) {
    throw new AstDbtCapabilityError('DriveApp.getFolderById is required for drive://path loads');
  }

  let folder;
  try {
    folder = DriveApp.getFolderById(folderId);
  } catch (error) {
    throw new AstDbtNotFoundError('Drive folder was not found', {
      provider: 'drive',
      folderId
    }, error);
  }

  if (!folder || typeof folder.getFilesByName !== 'function') {
    throw new AstDbtCapabilityError('Drive folder does not support getFilesByName');
  }

  const files = folder.getFilesByName(fileName);
  if (!files || typeof files.hasNext !== 'function' || !files.hasNext()) {
    throw new AstDbtNotFoundError('Drive file was not found by folder path', {
      provider: 'drive',
      folderId,
      fileName
    });
  }

  return files.next();
}

function astDbtReadFromDriveSource(source) {
  const location = astDbtIsPlainObject(source.location) ? source.location : {};
  const file = location.fileId
    ? astDbtReadFromDriveByFileId(location.fileId)
    : astDbtReadFromDriveByPath(location.folderId, location.fileName);

  if (!file || typeof file.getBlob !== 'function') {
    throw new AstDbtLoadError('Drive file cannot be read as blob', {
      provider: 'drive',
      uri: source.uri
    });
  }

  const blob = file.getBlob();
  const bytes = blob && typeof blob.getBytes === 'function' ? blob.getBytes() : astDbtTextToBytes(blob.getDataAsString());

  return {
    provider: 'drive',
    uri: source.uri,
    mimeType: astDbtNormalizeString(blob && blob.getContentType ? blob.getContentType() : '', ''),
    base64: astDbtBytesToBase64(bytes),
    text: blob && typeof blob.getDataAsString === 'function' ? blob.getDataAsString() : astDbtBytesToText(bytes),
    json: null,
    usage: {
      bytesOut: Array.isArray(bytes) ? bytes.length : 0,
      requestCount: 1
    },
    warnings: [],
    raw: {
      fileId: file.getId ? file.getId() : null,
      fileName: file.getName ? file.getName() : null
    }
  };
}

function astDbtReadManifestFromSource(source, options = {}) {
  if (!astDbtIsPlainObject(source)) {
    throw new AstDbtValidationError('source must be an object');
  }

  if (source.provider === 'drive') {
    return astDbtReadFromDriveSource(source, options);
  }

  return astDbtReadFromStorageSource(source, options);
}

function astDbtNormalizePersistentCacheConfig(options = {}) {
  return {
    enabled: options.persistentCacheEnabled === true && astDbtNormalizeString(options.persistentCacheUri, '') !== '',
    uri: astDbtNormalizeString(options.persistentCacheUri, ''),
    refresh: options.persistentCacheRefresh === true,
    includeManifest: options.persistentCacheIncludeManifest !== false,
    compression: astDbtNormalizeString(options.persistentCacheCompression, 'gzip').toLowerCase() === 'none'
      ? 'none'
      : 'gzip',
    mode: astDbtNormalizeString(options.persistentCacheMode, 'compact').toLowerCase() === 'full'
      ? 'full'
      : 'compact'
  };
}

function astDbtAppendEntityMapValue(map, key, entity) {
  if (!key) {
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(map, key)) {
    map[key] = [];
  }
  map[key].push(entity);
}

function astDbtHydrateIndexMaps(index = {}) {
  if (!astDbtIsPlainObject(index)) {
    return index;
  }

  const entities = Array.isArray(index.entities) ? index.entities : [];
  const requiresHydration = !(
    astDbtIsPlainObject(index.byUniqueId) &&
    astDbtIsPlainObject(index.bySection) &&
    astDbtIsPlainObject(index.byResourceType) &&
    astDbtIsPlainObject(index.byPackage) &&
    astDbtIsPlainObject(index.byTag)
  );

  if (!requiresHydration) {
    return index;
  }

  const byUniqueId = {};
  const bySection = {};
  const byResourceType = {};
  const byPackage = {};
  const byTag = {};

  entities.forEach(entity => {
    if (!astDbtIsPlainObject(entity)) {
      return;
    }

    const uniqueId = astDbtNormalizeString(entity.uniqueId, '');
    const uniqueIdLower = astDbtNormalizeString(entity.uniqueIdLower, uniqueId.toLowerCase()).toLowerCase();
    const section = astDbtNormalizeString(entity.section, '');
    const resourceType = astDbtNormalizeString(entity.resourceType, '').toLowerCase();
    const packageName = astDbtNormalizeString(entity.packageName, '');
    const tags = Array.isArray(entity.tags) ? entity.tags : [];

    entity.uniqueId = uniqueId || uniqueIdLower;
    entity.uniqueIdLower = uniqueIdLower || entity.uniqueId.toLowerCase();
    entity.section = section;
    entity.resourceType = resourceType;
    entity.packageName = packageName;
    entity.path = astDbtNormalizeString(entity.path, '');
    entity.originalFilePath = astDbtNormalizeString(entity.originalFilePath, '');
    entity.description = astDbtNormalizeString(entity.description, '');
    entity.dependsOnNodes = Array.isArray(entity.dependsOnNodes) ? entity.dependsOnNodes : [];
    entity.meta = astDbtIsPlainObject(entity.meta) ? entity.meta : {};
    entity.searchText = astDbtNormalizeString(entity.searchText, '');
    entity.disabled = entity.disabled === true;
    entity.tags = tags
      .map(tag => astDbtNormalizeString(tag, '').toLowerCase())
      .filter(Boolean);

    astDbtAppendEntityMapValue(byUniqueId, entity.uniqueIdLower, entity);
    astDbtAppendEntityMapValue(bySection, section, entity);
    astDbtAppendEntityMapValue(byResourceType, resourceType || 'unknown', entity);
    astDbtAppendEntityMapValue(byPackage, packageName || 'unknown', entity);

    entity.tags.forEach(tag => {
      astDbtAppendEntityMapValue(byTag, tag, entity);
    });
  });

  index.byUniqueId = byUniqueId;
  index.bySection = bySection;
  index.byResourceType = byResourceType;
  index.byPackage = byPackage;
  index.byTag = byTag;

  return index;
}

function astDbtCompactColumnRecord(column = {}) {
  return {
    uniqueId: astDbtNormalizeString(column.uniqueId, ''),
    uniqueIdLower: astDbtNormalizeString(column.uniqueIdLower, '').toLowerCase(),
    columnName: astDbtNormalizeString(column.columnName, ''),
    columnNameLower: astDbtNormalizeString(column.columnNameLower, '').toLowerCase(),
    section: astDbtNormalizeString(column.section, ''),
    resourceType: astDbtNormalizeString(column.resourceType, '').toLowerCase(),
    packageName: astDbtNormalizeString(column.packageName, ''),
    dataType: astDbtNormalizeString(column.dataType, ''),
    tags: Array.isArray(column.tags)
      ? column.tags
        .map(tag => astDbtNormalizeString(tag, '').toLowerCase())
        .filter(Boolean)
      : [],
    meta: astDbtIsPlainObject(column.meta) ? astDbtJsonClone(column.meta) : {},
    description: astDbtNormalizeString(column.description, '')
  };
}

function astDbtBuildCompactColumnsByUniqueId(columnsByUniqueId = {}) {
  const output = {};
  if (!astDbtIsPlainObject(columnsByUniqueId)) {
    return output;
  }

  Object.keys(columnsByUniqueId).forEach(uniqueIdLower => {
    const entry = columnsByUniqueId[uniqueIdLower];
    if (!astDbtIsPlainObject(entry)) {
      return;
    }

    const order = Array.isArray(entry.order) ? entry.order.slice() : [];
    const byName = {};
    const sourceByName = astDbtIsPlainObject(entry.byName) ? entry.byName : {};

    Object.keys(sourceByName).forEach(key => {
      const column = sourceByName[key];
      if (!astDbtIsPlainObject(column)) {
        return;
      }

      const compact = astDbtCompactColumnRecord(column);
      if (!compact.columnName) {
        compact.columnName = astDbtNormalizeString(key, '');
      }
      compact.columnNameLower = astDbtNormalizeString(
        compact.columnNameLower,
        compact.columnName.toLowerCase()
      ).toLowerCase();

      byName[compact.columnNameLower] = compact;
      if (order.indexOf(compact.columnName) === -1) {
        order.push(compact.columnName);
      }
    });

    output[uniqueIdLower] = {
      order,
      byName
    };
  });

  return output;
}

function astDbtBuildCompactPersistentIndex(index = {}, mode = 'compact') {
  if (mode !== 'compact' || !astDbtIsPlainObject(index)) {
    return index;
  }

  const entities = Array.isArray(index.entities) ? index.entities : [];
  const compactEntities = entities.map(entity => {
    if (!astDbtIsPlainObject(entity)) {
      return null;
    }

    return {
      section: astDbtNormalizeString(entity.section, ''),
      mapKey: astDbtNormalizeString(entity.mapKey, ''),
      uniqueId: astDbtNormalizeString(entity.uniqueId, ''),
      uniqueIdLower: astDbtNormalizeString(entity.uniqueIdLower, '').toLowerCase(),
      name: astDbtNormalizeString(entity.name, ''),
      resourceType: astDbtNormalizeString(entity.resourceType, '').toLowerCase(),
      packageName: astDbtNormalizeString(entity.packageName, ''),
      path: astDbtNormalizeString(entity.path, ''),
      originalFilePath: astDbtNormalizeString(entity.originalFilePath, ''),
      tags: Array.isArray(entity.tags)
        ? entity.tags
          .map(tag => astDbtNormalizeString(tag, '').toLowerCase())
          .filter(Boolean)
        : [],
      meta: astDbtIsPlainObject(entity.meta) ? astDbtJsonClone(entity.meta) : {},
      description: astDbtNormalizeString(entity.description, ''),
      dependsOnNodes: Array.isArray(entity.dependsOnNodes) ? entity.dependsOnNodes.slice() : [],
      disabled: entity.disabled === true,
      searchText: astDbtNormalizeString(entity.searchText, '')
    };
  }).filter(Boolean);

  return {
    format: 'compact_v1',
    generatedAt: astDbtNormalizeString(index.generatedAt, new Date().toISOString()),
    entityCount: Number(index.entityCount || compactEntities.length || 0),
    columnCount: Number(index.columnCount || 0),
    sectionCounts: astDbtIsPlainObject(index.sectionCounts) ? astDbtJsonClone(index.sectionCounts) : {},
    entities: compactEntities,
    columnsByUniqueId: astDbtBuildCompactColumnsByUniqueId(index.columnsByUniqueId),
    tokens: astDbtIsPlainObject(index.tokens) ? astDbtJsonClone(index.tokens) : {
      entities: {},
      columns: {}
    },
    lineage: astDbtIsPlainObject(index.lineage) ? astDbtJsonClone(index.lineage) : {
      parentMap: {},
      childMap: {}
    }
  };
}

function astDbtDigestHex(value) {
  const text = String(value || '');
  try {
    if (
      typeof Utilities !== 'undefined' &&
      Utilities &&
      typeof Utilities.computeDigest === 'function' &&
      Utilities.DigestAlgorithm &&
      Utilities.DigestAlgorithm.SHA_256
    ) {
      const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text);
      let output = '';
      for (let idx = 0; idx < digest.length; idx += 1) {
        const next = digest[idx] < 0 ? digest[idx] + 256 : digest[idx];
        output += (`0${next.toString(16)}`).slice(-2);
      }
      return output;
    }
  } catch (_error) {
    // fallback below
  }

  let hash = 0;
  for (let idx = 0; idx < text.length; idx += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(idx)) | 0;
  }
  const normalized = (hash >>> 0).toString(16);
  return `${normalized}${normalized}${normalized}${normalized}`.slice(0, 32);
}

function astDbtResolveDriveFile(source) {
  const location = astDbtIsPlainObject(source && source.location) ? source.location : {};
  return location.fileId
    ? astDbtReadFromDriveByFileId(location.fileId)
    : astDbtReadFromDriveByPath(location.folderId, location.fileName);
}

function astDbtResolveSourceFingerprint(source, options = {}) {
  if (!astDbtIsPlainObject(source) || !source.provider) {
    throw new AstDbtValidationError('Cannot resolve source fingerprint without normalized source');
  }

  if (source.provider === 'drive') {
    const file = astDbtResolveDriveFile(source);
    const fingerprintPayload = {
      provider: 'drive',
      fileId: file && typeof file.getId === 'function' ? file.getId() : null,
      fileName: file && typeof file.getName === 'function' ? file.getName() : null,
      updatedAt: file && typeof file.getLastUpdated === 'function'
        ? new Date(file.getLastUpdated()).toISOString()
        : null,
      size: file && typeof file.getSize === 'function' ? Number(file.getSize()) : null
    };

    return {
      source: fingerprintPayload,
      value: astDbtDigestHex(JSON.stringify(fingerprintPayload))
    };
  }

  const headFn = astDbtResolveStorageHeadFn();
  const headResponse = headFn({
    operation: 'head',
    provider: source.provider,
    uri: source.uri,
    location: source.location,
    auth: source.auth,
    providerOptions: source.providerOptions,
    options: {
      retries: astDbtNormalizePositiveInt(options.retries, 2, 0),
      timeoutMs: astDbtNormalizePositiveInt(options.timeoutMs, 45000, 1)
    }
  });

  const object = astDbtIsPlainObject(headResponse && headResponse.output && headResponse.output.object)
    ? headResponse.output.object
    : {};

  const fingerprintPayload = {
    provider: source.provider,
    uri: source.uri,
    id: astDbtNormalizeString(headResponse && headResponse.id, ''),
    etag: astDbtNormalizeString(object.etag, ''),
    generation: astDbtNormalizeString(object.generation, ''),
    metageneration: astDbtNormalizeString(object.metageneration, ''),
    updated: astDbtNormalizeString(object.updated, ''),
    size: Number(object.size || 0)
  };

  return {
    source: fingerprintPayload,
    value: astDbtDigestHex(JSON.stringify(fingerprintPayload))
  };
}

function astDbtBuildPersistentCacheArtifactUris(cacheUri, cacheKey, compression) {
  const parsed = astDbtParseUri(cacheUri);
  if (!parsed || ['gcs', 's3', 'dbfs'].indexOf(parsed.provider) === -1) {
    throw new AstDbtValidationError('persistentCacheUri must use gcs://, s3://, or dbfs:/', {
      persistentCacheUri: cacheUri
    });
  }

  const extension = compression === 'gzip' ? '.json.gz' : '.json';
  const keySuffix = astDbtNormalizeString(cacheKey, '').slice(0, 40);
  const provider = parsed.provider;

  if (provider === 'dbfs') {
    const path = astDbtNormalizeString(parsed.location && parsed.location.path, '').replace(/^dbfs:\//i, '');
    const slashIndex = path.lastIndexOf('/');
    const dir = slashIndex >= 0 ? path.slice(0, slashIndex + 1) : '';
    const fileName = slashIndex >= 0 ? path.slice(slashIndex + 1) : path;
    const baseName = fileName.replace(/\.(json|json\.gz)$/i, '') || 'dbt-manifest-cache';
    const stem = `dbfs:/${dir}${baseName}--${keySuffix}`;

    return {
      provider,
      metaUri: `${stem}.meta.json`,
      indexUri: `${stem}.index${extension}`,
      manifestUri: `${stem}.manifest${extension}`
    };
  }

  const bucket = parsed.location.bucket;
  const key = astDbtNormalizeString(parsed.location && parsed.location.key, '');
  const slashIndex = key.lastIndexOf('/');
  const dir = slashIndex >= 0 ? key.slice(0, slashIndex + 1) : '';
  const fileName = slashIndex >= 0 ? key.slice(slashIndex + 1) : key;
  const baseName = (fileName || 'dbt-manifest-cache').replace(/\.(json|json\.gz)$/i, '');
  const stem = `${provider}://${bucket}/${dir}${baseName}--${keySuffix}`;

  return {
    provider,
    metaUri: `${stem}.meta.json`,
    indexUri: `${stem}.index${extension}`,
    manifestUri: `${stem}.manifest${extension}`
  };
}

function astDbtReadPersistentCacheObject(uri, compression, options = {}) {
  const readFn = astDbtResolveStorageReadFn();
  try {
    const response = readFn({
      operation: 'read',
      uri,
      options: {
        retries: astDbtNormalizePositiveInt(options.retries, 2, 0),
        timeoutMs: astDbtNormalizePositiveInt(options.timeoutMs, 45000, 1),
        includeRaw: false
      }
    });

    const data = astDbtIsPlainObject(response && response.output && response.output.data)
      ? response.output.data
      : {};

    if (astDbtIsPlainObject(data.json)) {
      return data.json;
    }

    const readEnvelope = {
      base64: astDbtNormalizeString(data.base64, ''),
      text: astDbtNormalizeString(data.text, ''),
      mimeType: astDbtNormalizeString(data.mimeType, '')
    };

    let text = '';
    if (compression === 'gzip') {
      text = astDbtMaybeUngzipText(readEnvelope, { uri }, {
        allowGzip: true,
        compression: 'gzip'
      }) || '';
    }

    if (!text) {
      text = astDbtNormalizeString(readEnvelope.text, '');
    }

    if (!text && readEnvelope.base64) {
      text = astDbtBytesToText(astDbtBase64ToBytes(readEnvelope.base64));
    }

    if (!text) {
      return null;
    }

    const parsed = JSON.parse(text);
    return astDbtIsPlainObject(parsed) ? parsed : null;
  } catch (error) {
    if (error && error.name === 'AstStorageNotFoundError') {
      return null;
    }
    throw error;
  }
}

function astDbtWritePersistentCacheObject(uri, object, compression, options = {}) {
  const writeFn = astDbtResolveStorageWriteFn();
  const serialized = JSON.stringify(object);

  const payload = compression === 'gzip'
    ? {
      base64: astDbtGzipTextToBase64(serialized),
      mimeType: 'application/gzip'
    }
    : {
      text: serialized,
      mimeType: 'application/json',
      encoding: 'utf-8'
    };

  writeFn({
    operation: 'write',
    uri,
    payload,
    options: {
      overwrite: true,
      retries: astDbtNormalizePositiveInt(options.retries, 2, 0),
      timeoutMs: astDbtNormalizePositiveInt(options.timeoutMs, 45000, 1)
    }
  });
}

function astDbtBuildPersistentCacheContext(source, requestOptions = {}) {
  const persistent = astDbtNormalizePersistentCacheConfig(requestOptions);
  if (!persistent.enabled || !persistent.uri) {
    return null;
  }

  const fingerprint = astDbtResolveSourceFingerprint(source, requestOptions);
  const cacheKey = astDbtDigestHex(JSON.stringify({
    schemaVersion: requestOptions.schemaVersion,
    validate: requestOptions.validate,
    buildIndex: requestOptions.buildIndex,
    includeManifest: persistent.includeManifest,
    mode: persistent.mode,
    sourceFingerprint: fingerprint.value
  }));

  const uris = astDbtBuildPersistentCacheArtifactUris(
    persistent.uri,
    cacheKey,
    persistent.compression
  );

  return {
    cacheKey,
    fingerprint,
    persistent,
    uris
  };
}

function astDbtReadPersistentBundleCache(cacheContext, requestOptions = {}) {
  const meta = astDbtReadPersistentCacheObject(cacheContext.uris.metaUri, 'none', requestOptions);
  if (!astDbtIsPlainObject(meta) || meta.cacheKey !== cacheContext.cacheKey) {
    return null;
  }

  const indexArtifact = astDbtReadPersistentCacheObject(
    cacheContext.uris.indexUri,
    cacheContext.persistent.compression,
    requestOptions
  );

  if (!astDbtIsPlainObject(indexArtifact) || !astDbtIsPlainObject(indexArtifact.index)) {
    return null;
  }

  let manifest = null;
  if (cacheContext.persistent.includeManifest) {
    manifest = astDbtReadPersistentCacheObject(
      cacheContext.uris.manifestUri,
      cacheContext.persistent.compression,
      requestOptions
    );
    if (!astDbtIsPlainObject(manifest)) {
      return null;
    }
  }

  return {
    schemaVersion: astDbtNormalizeString(indexArtifact.schemaVersion, requestOptions.schemaVersion || 'v12'),
    loadedAt: astDbtNormalizeString(indexArtifact.loadedAt, new Date().toISOString()),
    source: astDbtIsPlainObject(indexArtifact.source) ? indexArtifact.source : null,
    metadata: astDbtIsPlainObject(indexArtifact.metadata) ? astDbtJsonClone(indexArtifact.metadata) : {},
    counts: astDbtIsPlainObject(indexArtifact.counts) ? astDbtJsonClone(indexArtifact.counts) : {},
    validation: astDbtIsPlainObject(indexArtifact.validation) ? astDbtJsonClone(indexArtifact.validation) : null,
    manifest,
    index: indexArtifact.index
  };
}

function astDbtWritePersistentBundleCache(cacheContext, bundle, requestOptions = {}) {
  const indexArtifact = {
    schemaVersion: bundle.schemaVersion,
    loadedAt: bundle.loadedAt,
    source: bundle.source,
    metadata: bundle.metadata,
    counts: bundle.counts,
    validation: bundle.validation,
    index: astDbtBuildCompactPersistentIndex(bundle.index, cacheContext.persistent.mode)
  };

  const metaArtifact = {
    schemaVersion: '1.0',
    cacheKey: cacheContext.cacheKey,
    sourceFingerprint: cacheContext.fingerprint,
    updatedAt: new Date().toISOString(),
    includeManifest: cacheContext.persistent.includeManifest,
    compression: cacheContext.persistent.compression,
    mode: cacheContext.persistent.mode
  };

  astDbtWritePersistentCacheObject(
    cacheContext.uris.indexUri,
    indexArtifact,
    cacheContext.persistent.compression,
    requestOptions
  );

  if (cacheContext.persistent.includeManifest && astDbtIsPlainObject(bundle.manifest)) {
    astDbtWritePersistentCacheObject(
      cacheContext.uris.manifestUri,
      bundle.manifest,
      cacheContext.persistent.compression,
      requestOptions
    );
  }

  astDbtWritePersistentCacheObject(
    cacheContext.uris.metaUri,
    metaArtifact,
    'none',
    requestOptions
  );
}

function astDbtEstimatePayloadBytes(readEnvelope = {}) {
  if (astDbtIsPlainObject(readEnvelope.usage) && Number.isFinite(readEnvelope.usage.bytesOut)) {
    return Number(readEnvelope.usage.bytesOut);
  }

  const base64 = astDbtNormalizeString(readEnvelope.base64, '');
  if (base64) {
    try {
      return astDbtBase64ToBytes(base64).length;
    } catch (_error) {
      // ignore and fall back
    }
  }

  const text = astDbtNormalizeString(readEnvelope.text, '');
  return astDbtTextToBytes(text).length;
}

function astDbtParseManifestJsonText(text, context = {}) {
  try {
    const parsed = JSON.parse(text);
    if (!astDbtIsPlainObject(parsed)) {
      throw new AstDbtParseError('Manifest JSON must parse to an object', context);
    }
    return parsed;
  } catch (error) {
    if (error && error.name === 'AstDbtParseError') {
      throw error;
    }

    throw new AstDbtParseError('Failed to parse manifest JSON text', context, error);
  }
}

function astDbtExtractManifestFromReadEnvelope(readEnvelope = {}, source, options = {}) {
  if (astDbtIsPlainObject(readEnvelope.json)) {
    return {
      manifest: readEnvelope.json,
      rawText: null
    };
  }

  const ungzippedText = astDbtMaybeUngzipText(readEnvelope, source, options);
  if (typeof ungzippedText === 'string' && ungzippedText.length > 0) {
    return {
      manifest: astDbtParseManifestJsonText(ungzippedText, {
        provider: source.provider,
        uri: source.uri,
        compression: 'gzip'
      }),
      rawText: ungzippedText
    };
  }

  const text = astDbtNormalizeString(readEnvelope.text, '');
  if (text) {
    return {
      manifest: astDbtParseManifestJsonText(text, {
        provider: source.provider,
        uri: source.uri
      }),
      rawText: text
    };
  }

  const base64 = astDbtNormalizeString(readEnvelope.base64, '');
  if (!base64) {
    throw new AstDbtParseError('Manifest payload does not include json, text, or base64 data', {
      provider: source.provider,
      uri: source.uri
    });
  }

  let decodedText;
  try {
    decodedText = astDbtBytesToText(astDbtBase64ToBytes(base64));
  } catch (error) {
    throw new AstDbtParseError('Failed to decode base64 manifest payload', {
      provider: source.provider,
      uri: source.uri
    }, error);
  }

  return {
    manifest: astDbtParseManifestJsonText(decodedText, {
      provider: source.provider,
      uri: source.uri
    }),
    rawText: decodedText
  };
}

function astDbtBuildManifestMetadata(manifest = {}) {
  const metadata = astDbtIsPlainObject(manifest.metadata) ? manifest.metadata : {};
  return {
    dbtSchemaVersion: astDbtNormalizeString(metadata.dbt_schema_version, ''),
    dbtVersion: astDbtNormalizeString(metadata.dbt_version, ''),
    generatedAt: astDbtNormalizeString(metadata.generated_at, ''),
    projectName: astDbtNormalizeString(metadata.project_name, ''),
    projectId: astDbtNormalizeString(metadata.project_id, '')
  };
}

function astDbtBuildManifestCounts(manifest, index = null) {
  if (index && astDbtIsPlainObject(index)) {
    return {
      entityCount: Number(index.entityCount || 0),
      columnCount: Number(index.columnCount || 0),
      sectionCounts: astDbtIsPlainObject(index.sectionCounts) ? index.sectionCounts : {}
    };
  }

  const sectionCounts = {};
  let entityCount = 0;
  let columnCount = 0;

  AST_DBT_MANIFEST_V12_SCHEMA.searchableSections.forEach(section => {
    const sectionValue = manifest[section];
    let sectionEntityCount = 0;

    if (section === 'disabled' && astDbtIsPlainObject(sectionValue)) {
      Object.keys(sectionValue).forEach(key => {
        if (!Array.isArray(sectionValue[key])) {
          return;
        }
        sectionEntityCount += sectionValue[key].length;
        sectionValue[key].forEach(entry => {
          if (astDbtIsPlainObject(entry) && astDbtIsPlainObject(entry.columns)) {
            columnCount += Object.keys(entry.columns).length;
          }
        });
      });
    } else if (astDbtIsPlainObject(sectionValue)) {
      const keys = Object.keys(sectionValue);
      sectionEntityCount = keys.length;
      keys.forEach(key => {
        const entity = sectionValue[key];
        if (astDbtIsPlainObject(entity) && astDbtIsPlainObject(entity.columns)) {
          columnCount += Object.keys(entity.columns).length;
        }
      });
    }

    sectionCounts[section] = sectionEntityCount;
    entityCount += sectionEntityCount;
  });

  return {
    entityCount,
    columnCount,
    sectionCounts
  };
}

function astDbtBuildBundle(manifest, request, source, readEnvelope = null, validation = null) {
  const options = request.options || AST_DBT_DEFAULT_LOAD_OPTIONS;
  const index = options.buildIndex ? astDbtBuildManifestIndexes(manifest) : null;

  const metadata = astDbtBuildManifestMetadata(manifest);
  const counts = astDbtBuildManifestCounts(manifest, index);

  const bundle = {
    schemaVersion: options.schemaVersion,
    loadedAt: new Date().toISOString(),
    source,
    metadata,
    counts,
    validation: validation || null,
    manifest,
    index
  };

  if (options.includeRaw && readEnvelope) {
    bundle.raw = {
      mimeType: readEnvelope.mimeType || null,
      usage: readEnvelope.usage || null,
      warnings: Array.isArray(readEnvelope.warnings) ? readEnvelope.warnings.slice() : [],
      payload: readEnvelope.raw || null
    };
  }

  return bundle;
}

function astDbtNormalizeBundle(bundle, options = {}) {
  if (!astDbtIsPlainObject(bundle)) {
    throw new AstDbtValidationError('bundle must be an object');
  }

  const normalizedOptions = astDbtNormalizeLoadOptions(options, AST_DBT_DEFAULT_LOAD_OPTIONS);
  const hasManifest = astDbtIsPlainObject(bundle.manifest);
  const hasIndex = astDbtIsPlainObject(bundle.index);

  if (!hasManifest && !hasIndex) {
    throw new AstDbtValidationError('bundle must include either manifest or index');
  }

  const manifest = hasManifest ? bundle.manifest : null;
  const index = hasIndex
    ? bundle.index
    : (normalizedOptions.buildIndex && manifest ? astDbtBuildManifestIndexes(manifest) : null);
  const hydratedIndex = astDbtHydrateIndexMaps(index);

  let validation = null;
  if (manifest) {
    validation = astDbtValidateManifestV12(manifest, {
      validate: normalizedOptions.validate,
      throwOnInvalid: normalizedOptions.validate !== 'off'
    });
  } else if (astDbtIsPlainObject(bundle.validation)) {
    validation = astDbtJsonClone(bundle.validation);
  }

  const metadata = manifest
    ? astDbtBuildManifestMetadata(manifest)
    : {
      dbtSchemaVersion: astDbtNormalizeString(bundle.metadata && bundle.metadata.dbtSchemaVersion, ''),
      dbtVersion: astDbtNormalizeString(bundle.metadata && bundle.metadata.dbtVersion, ''),
      generatedAt: astDbtNormalizeString(bundle.metadata && bundle.metadata.generatedAt, ''),
      projectName: astDbtNormalizeString(bundle.metadata && bundle.metadata.projectName, ''),
      projectId: astDbtNormalizeString(bundle.metadata && bundle.metadata.projectId, '')
    };

  const counts = manifest
    ? astDbtBuildManifestCounts(manifest, hydratedIndex)
    : {
      entityCount: Number(bundle.counts && bundle.counts.entityCount || hydratedIndex && hydratedIndex.entityCount || 0),
      columnCount: Number(bundle.counts && bundle.counts.columnCount || hydratedIndex && hydratedIndex.columnCount || 0),
      sectionCounts: astDbtIsPlainObject(bundle.counts && bundle.counts.sectionCounts)
        ? astDbtJsonClone(bundle.counts.sectionCounts)
        : (astDbtIsPlainObject(hydratedIndex && hydratedIndex.sectionCounts) ? astDbtJsonClone(hydratedIndex.sectionCounts) : {})
    };

  return {
    schemaVersion: normalizedOptions.schemaVersion,
    loadedAt: astDbtNormalizeString(bundle.loadedAt, new Date().toISOString()),
    source: astDbtIsPlainObject(bundle.source) ? bundle.source : null,
    metadata,
    counts,
    validation,
    manifest,
    index: hydratedIndex
  };
}

function astDbtLoadManifestCore(request = {}) {
  const normalizedRequest = astDbtValidateLoadManifestRequest(request);

  let manifest = normalizedRequest.manifest;
  let source = normalizedRequest.source;
  let readEnvelope = null;
  const warnings = [];
  let cacheInfo = null;

  let cacheContext = null;
  if (!manifest && source) {
    try {
      cacheContext = astDbtBuildPersistentCacheContext(source, normalizedRequest.options);
    } catch (error) {
      warnings.push({
        type: 'persistent_cache',
        status: 'disabled',
        reason: error && error.message ? error.message : String(error)
      });
      cacheContext = null;
    }
  }

  if (cacheContext && !cacheContext.persistent.refresh) {
    try {
      const cachedBundle = astDbtReadPersistentBundleCache(cacheContext, normalizedRequest.options);
      if (cachedBundle) {
        const normalizedBundle = astDbtNormalizeBundle(cachedBundle, normalizedRequest.options);
        cacheInfo = {
          enabled: true,
          hit: true,
          cacheKey: cacheContext.cacheKey,
          uri: cacheContext.persistent.uri,
          mode: cacheContext.persistent.mode
        };

        return {
          status: 'ok',
          source: normalizedBundle.source,
          metadata: normalizedBundle.metadata,
          counts: normalizedBundle.counts,
          validation: normalizedBundle.validation,
          bundle: normalizedBundle,
          warnings,
          cache: cacheInfo
        };
      }
    } catch (error) {
      warnings.push({
        type: 'persistent_cache',
        status: 'read_error',
        reason: error && error.message ? error.message : String(error)
      });
    }
  }

  if (!manifest) {
    readEnvelope = astDbtReadManifestFromSource(source, normalizedRequest.options);

    const payloadBytes = astDbtEstimatePayloadBytes(readEnvelope);
    if (payloadBytes > normalizedRequest.options.maxBytes) {
      throw new AstDbtLoadError('Manifest payload exceeds maxBytes', {
        maxBytes: normalizedRequest.options.maxBytes,
        payloadBytes,
        provider: source.provider,
        uri: source.uri
      });
    }

    const extracted = astDbtExtractManifestFromReadEnvelope(readEnvelope, source, normalizedRequest.options);
    manifest = extracted.manifest;

    if (normalizedRequest.options.includeRaw && extracted.rawText && !readEnvelope.raw) {
      readEnvelope.raw = extracted.rawText;
    }
  } else {
    source = source || null;
  }

  const validation = astDbtValidateManifestV12(manifest, {
    validate: normalizedRequest.options.validate,
    throwOnInvalid: normalizedRequest.options.validate !== 'off'
  });

  const bundle = astDbtBuildBundle(
    manifest,
    normalizedRequest,
    source,
    readEnvelope,
    validation
  );

  if (cacheContext) {
    try {
      astDbtWritePersistentBundleCache(cacheContext, bundle, normalizedRequest.options);
      cacheInfo = {
        enabled: true,
        hit: false,
        cacheKey: cacheContext.cacheKey,
        uri: cacheContext.persistent.uri,
        mode: cacheContext.persistent.mode
      };
    } catch (error) {
      warnings.push({
        type: 'persistent_cache',
        status: 'write_error',
        reason: error && error.message ? error.message : String(error)
      });
      cacheInfo = {
        enabled: true,
        hit: false,
        cacheKey: cacheContext.cacheKey,
        uri: cacheContext.persistent.uri,
        mode: cacheContext.persistent.mode,
        writeError: true
      };
    }
  }

  const response = {
    status: 'ok',
    source: bundle.source,
    metadata: bundle.metadata,
    counts: bundle.counts,
    validation: bundle.validation,
    bundle
  };

  const readWarnings = readEnvelope && Array.isArray(readEnvelope.warnings)
    ? readEnvelope.warnings.slice()
    : [];
  response.warnings = readWarnings.concat(warnings);

  if (cacheInfo) {
    response.cache = cacheInfo;
  }

  return response;
}

function astDbtBuildLoadRequestFromGenericRequest(request = {}) {
  const source = astDbtIsPlainObject(request.source) ? request.source : {};

  return {
    uri: request.uri || source.uri,
    fileId: request.fileId || source.fileId,
    provider: request.provider || source.provider,
    location: request.location || source.location,
    auth: request.auth || source.auth,
    providerOptions: request.providerOptions || source.providerOptions,
    options: request.options || {}
  };
}

function astDbtEnsureBundle(request = {}, options = {}) {
  if (astDbtIsPlainObject(request.bundle)) {
    return astDbtNormalizeBundle(
      request.bundle,
      Object.assign({}, request.options || {}, options.options || {})
    );
  }

  if (astDbtIsPlainObject(request.manifest)) {
    const loadResponse = astDbtLoadManifestCore({
      manifest: request.manifest,
      options: Object.assign({}, request.options || {}, options.options || {})
    });
    return loadResponse.bundle;
  }

  const hasSourceInput = Boolean(
    request.source || request.uri || request.fileId || request.provider || request.location
  );

  if (hasSourceInput) {
    const loadRequest = astDbtBuildLoadRequestFromGenericRequest(request);
    const loadResponse = astDbtLoadManifestCore(loadRequest);
    return loadResponse.bundle;
  }

  throw new AstDbtValidationError('Request must provide bundle, manifest, or source for DBT operation');
}

function astDbtInspectManifestCore(request = {}) {
  const normalized = astDbtValidateInspectManifestRequest(request);
  const bundle = astDbtEnsureBundle(normalized, {
    options: normalized.options
  });

  return {
    status: 'ok',
    schemaVersion: bundle.schemaVersion,
    source: bundle.source,
    metadata: bundle.metadata,
    counts: bundle.counts,
    validation: bundle.validation,
    loadedAt: bundle.loadedAt
  };
}
