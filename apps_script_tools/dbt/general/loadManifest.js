/* Core manifest load/normalize orchestration. Internal helpers live in _loadManifestInternals.js. */

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
