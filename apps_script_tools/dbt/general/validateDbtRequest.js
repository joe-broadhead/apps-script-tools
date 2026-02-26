const AST_DBT_DEFAULT_LOAD_OPTIONS = Object.freeze({
  validate: 'strict',
  schemaVersion: 'v12',
  maxBytes: 50 * 1024 * 1024,
  allowGzip: true,
  buildIndex: true,
  includeRaw: false,
  persistentCacheEnabled: false,
  persistentCacheUri: '',
  persistentCacheRefresh: false,
  persistentCacheIncludeManifest: true,
  persistentCacheCompression: 'gzip',
  persistentCacheMode: 'compact'
});

const AST_DBT_SEARCH_TARGETS = Object.freeze([
  'entities',
  'columns',
  'all'
]);

const AST_DBT_META_FILTER_OPS = Object.freeze([
  'eq',
  'neq',
  'contains',
  'in',
  'exists'
]);

const AST_DBT_DIFF_CHANGE_TYPES = Object.freeze([
  'added',
  'removed',
  'modified',
  'unchanged'
]);

function astDbtNormalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallback;
}

function astDbtNormalizePositiveInt(value, fallback, min = 0, max = null) {
  if (value == null || value === '') {
    return fallback;
  }

  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < min) {
    throw new AstDbtValidationError('Expected a positive integer value', {
      value,
      min
    });
  }

  if (typeof max === 'number' && numeric > max) {
    throw new AstDbtValidationError('Integer value exceeds maximum', {
      value,
      max
    });
  }

  return numeric;
}

function astDbtNormalizeStringArray(values, options = {}) {
  if (!Array.isArray(values)) {
    return [];
  }

  const toLower = options.toLower === true;
  const output = [];
  const seen = {};

  values.forEach(value => {
    const normalized = astDbtNormalizeString(value, '');
    if (!normalized) {
      return;
    }

    const finalValue = toLower ? normalized.toLowerCase() : normalized;
    if (seen[finalValue]) {
      return;
    }

    seen[finalValue] = true;
    output.push(finalValue);
  });

  return output;
}

function astDbtNormalizeLoadMode(mode) {
  const normalized = astDbtNormalizeString(mode, AST_DBT_DEFAULT_LOAD_OPTIONS.validate).toLowerCase();
  if (['strict', 'basic', 'off'].indexOf(normalized) === -1) {
    throw new AstDbtValidationError('options.validate must be one of: strict, basic, off', {
      validate: normalized
    });
  }
  return normalized;
}

function astDbtNormalizeSchemaVersion(schemaVersion) {
  const normalized = astDbtNormalizeString(schemaVersion, AST_DBT_DEFAULT_LOAD_OPTIONS.schemaVersion).toLowerCase();
  if (normalized !== 'v12') {
    throw new AstDbtValidationError('Only schemaVersion=v12 is supported in this release', {
      schemaVersion: normalized
    });
  }
  return normalized;
}

function astDbtNormalizeArtifactType(artifactType, fallback = '') {
  const normalized = astDbtNormalizeString(artifactType, fallback).toLowerCase().replace(/-/g, '_');
  if (!normalized) {
    return '';
  }

  if (AST_DBT_ARTIFACT_TYPES.indexOf(normalized) === -1) {
    throw new AstDbtValidationError(
      `artifactType must be one of: ${AST_DBT_ARTIFACT_TYPES.join(', ')}`,
      { artifactType: normalized }
    );
  }

  return normalized;
}

function astDbtNormalizePersistentCacheCompression(value) {
  const normalized = astDbtNormalizeString(value, AST_DBT_DEFAULT_LOAD_OPTIONS.persistentCacheCompression).toLowerCase();
  if (['gzip', 'none'].indexOf(normalized) === -1) {
    throw new AstDbtValidationError('options.persistentCacheCompression must be one of: gzip, none', {
      persistentCacheCompression: normalized
    });
  }
  return normalized;
}

function astDbtNormalizePersistentCacheMode(value) {
  const normalized = astDbtNormalizeString(value, AST_DBT_DEFAULT_LOAD_OPTIONS.persistentCacheMode).toLowerCase();
  if (['compact', 'full'].indexOf(normalized) === -1) {
    throw new AstDbtValidationError('options.persistentCacheMode must be one of: compact, full', {
      persistentCacheMode: normalized
    });
  }
  return normalized;
}

function astDbtNormalizeLoadOptions(options = {}, defaults = {}) {
  if (!astDbtIsPlainObject(options)) {
    throw new AstDbtValidationError('options must be an object when provided');
  }

  const persistentCacheUri = astDbtNormalizeString(
    options.persistentCacheUri != null ? options.persistentCacheUri : defaults.persistentCacheUri,
    ''
  );

  let persistentCacheEnabled = astDbtNormalizeBoolean(
    options.persistentCacheEnabled != null ? options.persistentCacheEnabled : defaults.persistentCacheEnabled,
    AST_DBT_DEFAULT_LOAD_OPTIONS.persistentCacheEnabled
  );

  if (persistentCacheUri) {
    persistentCacheEnabled = true;
  }

  return {
    validate: astDbtNormalizeLoadMode(
      options.validate != null ? options.validate : defaults.validate
    ),
    schemaVersion: astDbtNormalizeSchemaVersion(
      options.schemaVersion != null ? options.schemaVersion : defaults.schemaVersion
    ),
    maxBytes: astDbtNormalizePositiveInt(
      options.maxBytes != null ? options.maxBytes : defaults.maxBytes,
      AST_DBT_DEFAULT_LOAD_OPTIONS.maxBytes,
      1
    ),
    allowGzip: astDbtNormalizeBoolean(
      options.allowGzip != null ? options.allowGzip : defaults.allowGzip,
      AST_DBT_DEFAULT_LOAD_OPTIONS.allowGzip
    ),
    buildIndex: astDbtNormalizeBoolean(
      options.buildIndex != null ? options.buildIndex : defaults.buildIndex,
      AST_DBT_DEFAULT_LOAD_OPTIONS.buildIndex
    ),
    includeRaw: astDbtNormalizeBoolean(
      options.includeRaw,
      AST_DBT_DEFAULT_LOAD_OPTIONS.includeRaw
    ),
    persistentCacheEnabled,
    persistentCacheUri,
    persistentCacheRefresh: astDbtNormalizeBoolean(
      options.persistentCacheRefresh != null ? options.persistentCacheRefresh : defaults.persistentCacheRefresh,
      AST_DBT_DEFAULT_LOAD_OPTIONS.persistentCacheRefresh
    ),
    persistentCacheIncludeManifest: astDbtNormalizeBoolean(
      options.persistentCacheIncludeManifest != null
        ? options.persistentCacheIncludeManifest
        : defaults.persistentCacheIncludeManifest,
      AST_DBT_DEFAULT_LOAD_OPTIONS.persistentCacheIncludeManifest
    ),
    persistentCacheCompression: astDbtNormalizePersistentCacheCompression(
      options.persistentCacheCompression != null
        ? options.persistentCacheCompression
        : defaults.persistentCacheCompression
    ),
    persistentCacheMode: astDbtNormalizePersistentCacheMode(
      options.persistentCacheMode != null
        ? options.persistentCacheMode
        : defaults.persistentCacheMode
    )
  };
}

function astDbtNormalizeSourceObject(request = {}, defaults = {}) {
  const source = astDbtIsPlainObject(request.source) ? request.source : {};

  const uri = astDbtResolveConfigString([
    request.uri,
    source.uri,
    defaults.uri
  ], null);

  const fileId = astDbtResolveConfigString([
    request.fileId,
    source.fileId,
    defaults.fileId
  ], null);

  const parsedUri = uri ? astDbtParseUri(uri) : null;
  const providerFromRequest = astDbtResolveConfigString([
    request.provider,
    source.provider
  ], null);

  const provider = astDbtNormalizeProvider(
    providerFromRequest || (parsedUri ? parsedUri.provider : (fileId ? 'drive' : ''))
  );

  if (!provider && !request.manifest) {
    throw new AstDbtValidationError('load request requires one of: manifest, uri, fileId, provider+location');
  }

  if (parsedUri && provider && parsedUri.provider !== provider) {
    throw new AstDbtValidationError('provider must match uri provider', {
      provider,
      uriProvider: parsedUri.provider
    });
  }

  const mergedLocation = astDbtCloneObject(source.location);
  if (astDbtIsPlainObject(request.location)) {
    Object.assign(mergedLocation, request.location);
  }

  if (fileId) {
    mergedLocation.fileId = fileId;
  }

  const hasProviderLocation = provider && Object.keys(mergedLocation).length > 0;

  if (!request.manifest && !parsedUri && !fileId && !hasProviderLocation) {
    throw new AstDbtValidationError('load request requires source location when manifest is not provided inline');
  }

  if (!provider) {
    return null;
  }

  const location = astDbtNormalizeLocation(provider, mergedLocation, parsedUri);
  const normalizedUri = parsedUri ? parsedUri.uri : astDbtBuildUri(provider, location);

  return {
    provider,
    uri: normalizedUri,
    location,
    auth: astDbtIsPlainObject(request.auth) ? astDbtCloneObject(request.auth) : {},
    providerOptions: astDbtIsPlainObject(request.providerOptions)
      ? astDbtCloneObject(request.providerOptions)
      : {}
  };
}

function astDbtNormalizeMetaFilters(filters, label) {
  if (typeof filters === 'undefined' || filters == null) {
    return [];
  }

  if (!Array.isArray(filters)) {
    throw new AstDbtValidationError(`${label} meta filter set must be an array`);
  }

  return filters.map((filter, idx) => {
    if (!astDbtIsPlainObject(filter)) {
      throw new AstDbtValidationError(`${label} meta filter at index ${idx} must be an object`);
    }

    const path = astDbtNormalizeString(filter.path, '');
    if (!path) {
      throw new AstDbtValidationError(`${label} meta filter at index ${idx} requires path`);
    }

    const op = astDbtNormalizeString(filter.op, 'eq').toLowerCase();
    if (AST_DBT_META_FILTER_OPS.indexOf(op) === -1) {
      throw new AstDbtValidationError(
        `${label} meta filter op must be one of: ${AST_DBT_META_FILTER_OPS.join(', ')}`,
        { op }
      );
    }

    const normalized = {
      path,
      op
    };

    if (op !== 'exists') {
      if (typeof filter.value === 'undefined') {
        throw new AstDbtValidationError(`${label} meta filter at index ${idx} requires value for op='${op}'`);
      }
      normalized.value = filter.value;
    }

    return normalized;
  });
}

function astDbtNormalizeSearchFilters(filters = {}) {
  if (!astDbtIsPlainObject(filters)) {
    throw new AstDbtValidationError('search filters must be an object');
  }

  const sectionFilters = astDbtNormalizeStringArray(filters.sections, { toLower: true });
  sectionFilters.forEach(section => {
    if (AST_DBT_MANIFEST_V12_SCHEMA.searchableSections.indexOf(section) === -1) {
      throw new AstDbtValidationError('filters.sections contains unsupported section values', {
        section
      });
    }
  });

  const column = astDbtIsPlainObject(filters.column) ? filters.column : {};

  return {
    resourceTypes: astDbtNormalizeStringArray(filters.resourceTypes, { toLower: true }),
    sections: sectionFilters,
    packageNames: astDbtNormalizeStringArray(filters.packageNames),
    pathPrefix: astDbtNormalizeString(filters.pathPrefix, ''),
    tagsAny: astDbtNormalizeStringArray(filters.tagsAny, { toLower: true }),
    tagsAll: astDbtNormalizeStringArray(filters.tagsAll, { toLower: true }),
    uniqueIds: astDbtNormalizeStringArray(filters.uniqueIds),
    dependsOnUniqueIds: astDbtNormalizeStringArray(filters.dependsOnUniqueIds),
    meta: astDbtNormalizeMetaFilters(filters.meta, 'filters'),
    column: {
      namesAny: astDbtNormalizeStringArray(column.namesAny, { toLower: true }),
      dataTypesAny: astDbtNormalizeStringArray(column.dataTypesAny, { toLower: true }),
      meta: astDbtNormalizeMetaFilters(column.meta, 'filters.column')
    }
  };
}

function astDbtNormalizeSearchSort(sort = {}) {
  if (!astDbtIsPlainObject(sort)) {
    throw new AstDbtValidationError('search sort must be an object');
  }

  const by = astDbtNormalizeString(sort.by, 'score').toLowerCase();
  if (['score', 'name', 'unique_id'].indexOf(by) === -1) {
    throw new AstDbtValidationError('sort.by must be one of: score, name, unique_id', { by });
  }

  const direction = astDbtNormalizeString(sort.direction, 'desc').toLowerCase();
  if (['asc', 'desc'].indexOf(direction) === -1) {
    throw new AstDbtValidationError('sort.direction must be one of: asc, desc', { direction });
  }

  return {
    by,
    direction
  };
}

function astDbtNormalizeSearchPage(page = {}) {
  if (!astDbtIsPlainObject(page)) {
    throw new AstDbtValidationError('search page must be an object');
  }

  return {
    limit: astDbtNormalizePositiveInt(page.limit, 50, 1, 500),
    offset: astDbtNormalizePositiveInt(page.offset, 0, 0)
  };
}

function astDbtNormalizeSearchInclude(include = {}) {
  if (!astDbtIsPlainObject(include)) {
    throw new AstDbtValidationError('search include must be an object');
  }

  const columns = astDbtNormalizeString(include.columns, 'none').toLowerCase();
  if (['none', 'summary', 'full'].indexOf(columns) === -1) {
    throw new AstDbtValidationError('include.columns must be one of: none, summary, full', {
      columns
    });
  }

  return {
    meta: astDbtNormalizeBoolean(include.meta, true),
    columns,
    stats: astDbtNormalizeBoolean(include.stats, true)
  };
}

function astDbtNormalizeDiffChangeTypes(changeTypes) {
  if (typeof changeTypes === 'undefined' || changeTypes == null) {
    return ['added', 'removed', 'modified'];
  }

  if (!Array.isArray(changeTypes)) {
    throw new AstDbtValidationError('diff changeTypes must be an array when provided');
  }

  const output = [];
  const seen = {};
  changeTypes.forEach(value => {
    const normalized = astDbtNormalizeString(value, '').toLowerCase();
    if (!normalized) {
      return;
    }
    if (AST_DBT_DIFF_CHANGE_TYPES.indexOf(normalized) === -1) {
      throw new AstDbtValidationError(
        `diff changeTypes must be one of: ${AST_DBT_DIFF_CHANGE_TYPES.join(', ')}`,
        { changeType: normalized }
      );
    }
    if (seen[normalized]) {
      return;
    }
    seen[normalized] = true;
    output.push(normalized);
  });

  return output;
}

function astDbtNormalizeImpactArtifactRef(descriptor = {}, artifactType, defaults = {}) {
  if (!astDbtIsPlainObject(descriptor)) {
    throw new AstDbtValidationError(`impact artifacts.${artifactType} must be an object when provided`);
  }

  const bundle = astDbtIsPlainObject(descriptor.bundle) ? descriptor.bundle : null;
  const artifact = astDbtIsPlainObject(descriptor.artifact) ? descriptor.artifact : null;

  const source = (bundle || artifact)
    ? null
    : astDbtNormalizeSourceObject({
      uri: descriptor.uri,
      fileId: descriptor.fileId,
      provider: descriptor.provider,
      location: descriptor.location,
      auth: descriptor.auth,
      providerOptions: descriptor.providerOptions
    }, defaults);

  if (!bundle && !artifact && !source) {
    throw new AstDbtValidationError(
      `impact artifacts.${artifactType} requires one of: bundle, artifact, or source locator`
    );
  }

  return {
    artifactType,
    bundle,
    artifact,
    source,
    options: astDbtNormalizeLoadOptions(descriptor.options || {}, defaults)
  };
}

function astDbtValidateLoadManifestRequest(request = {}) {
  if (!astDbtIsPlainObject(request)) {
    throw new AstDbtValidationError('loadManifest request must be an object');
  }

  const defaults = astDbtResolveLoadDefaults(request);
  const options = astDbtNormalizeLoadOptions(request.options || {}, defaults);

  const manifest = typeof request.manifest !== 'undefined' ? request.manifest : null;
  if (manifest != null && !astDbtIsPlainObject(manifest)) {
    throw new AstDbtValidationError('manifest must be an object when provided');
  }

  const source = manifest ? null : astDbtNormalizeSourceObject(request, defaults);
  if (!manifest && !source) {
    throw new AstDbtValidationError('loadManifest requires source input when manifest is not provided inline');
  }

  return {
    operation: 'load_manifest',
    source,
    manifest,
    options
  };
}

function astDbtValidateInspectManifestRequest(request = {}) {
  if (!astDbtIsPlainObject(request)) {
    throw new AstDbtValidationError('inspectManifest request must be an object');
  }

  return {
    operation: 'inspect_manifest',
    bundle: request.bundle || null,
    manifest: request.manifest || null,
    source: request.source || null,
    options: astDbtNormalizeLoadOptions(request.options || {}, astDbtResolveLoadDefaults(request))
  };
}

function astDbtValidateSearchRequest(request = {}) {
  if (!astDbtIsPlainObject(request)) {
    throw new AstDbtValidationError('search request must be an object');
  }

  const target = astDbtNormalizeString(request.target, 'entities').toLowerCase();
  if (AST_DBT_SEARCH_TARGETS.indexOf(target) === -1) {
    throw new AstDbtValidationError(`target must be one of: ${AST_DBT_SEARCH_TARGETS.join(', ')}`, {
      target
    });
  }

  return {
    operation: 'search',
    bundle: request.bundle || null,
    manifest: request.manifest || null,
    source: request.source || null,
    query: astDbtNormalizeString(request.query, ''),
    target,
    filters: astDbtNormalizeSearchFilters(request.filters || {}),
    sort: astDbtNormalizeSearchSort(request.sort || {}),
    page: astDbtNormalizeSearchPage(request.page || {}),
    include: astDbtNormalizeSearchInclude(request.include || {}),
    options: astDbtNormalizeLoadOptions(request.options || {}, astDbtResolveLoadDefaults(request))
  };
}

function astDbtValidateListEntitiesRequest(request = {}) {
  const normalized = astDbtValidateSearchRequest(Object.assign({}, request, {
    target: 'entities',
    query: typeof request.query === 'string' ? request.query : ''
  }));
  normalized.operation = 'list_entities';
  return normalized;
}

function astDbtValidateGetEntityRequest(request = {}) {
  if (!astDbtIsPlainObject(request)) {
    throw new AstDbtValidationError('getEntity request must be an object');
  }

  const uniqueId = astDbtNormalizeString(request.uniqueId, '');
  if (!uniqueId) {
    throw new AstDbtValidationError('getEntity requires uniqueId');
  }

  return {
    operation: 'get_entity',
    bundle: request.bundle || null,
    manifest: request.manifest || null,
    source: request.source || null,
    uniqueId,
    include: astDbtNormalizeSearchInclude(request.include || {}),
    options: astDbtNormalizeLoadOptions(request.options || {}, astDbtResolveLoadDefaults(request))
  };
}

function astDbtValidateGetColumnRequest(request = {}) {
  if (!astDbtIsPlainObject(request)) {
    throw new AstDbtValidationError('getColumn request must be an object');
  }

  const uniqueId = astDbtNormalizeString(request.uniqueId, '');
  if (!uniqueId) {
    throw new AstDbtValidationError('getColumn requires uniqueId');
  }

  const columnName = astDbtNormalizeString(request.columnName, '');
  if (!columnName) {
    throw new AstDbtValidationError('getColumn requires columnName');
  }

  return {
    operation: 'get_column',
    bundle: request.bundle || null,
    manifest: request.manifest || null,
    source: request.source || null,
    uniqueId,
    columnName,
    options: astDbtNormalizeLoadOptions(request.options || {}, astDbtResolveLoadDefaults(request))
  };
}

function astDbtValidateLineageRequest(request = {}) {
  if (!astDbtIsPlainObject(request)) {
    throw new AstDbtValidationError('lineage request must be an object');
  }

  const uniqueId = astDbtNormalizeString(request.uniqueId, '');
  if (!uniqueId) {
    throw new AstDbtValidationError('lineage requires uniqueId');
  }

  const direction = astDbtNormalizeString(request.direction, 'both').toLowerCase();
  if (['upstream', 'downstream', 'both'].indexOf(direction) === -1) {
    throw new AstDbtValidationError('lineage.direction must be one of: upstream, downstream, both', {
      direction
    });
  }

  return {
    operation: 'lineage',
    bundle: request.bundle || null,
    manifest: request.manifest || null,
    source: request.source || null,
    uniqueId,
    direction,
    depth: astDbtNormalizePositiveInt(request.depth, 1, 1, 20),
    includeDisabled: astDbtNormalizeBoolean(request.includeDisabled, false),
    options: astDbtNormalizeLoadOptions(request.options || {}, astDbtResolveLoadDefaults(request))
  };
}

function astDbtValidateValidateManifestRequest(request = {}) {
  if (!astDbtIsPlainObject(request)) {
    throw new AstDbtValidationError('validateManifest request must be an object');
  }

  return {
    operation: 'validate_manifest',
    bundle: request.bundle || null,
    manifest: request.manifest || null,
    source: request.source || null,
    options: astDbtNormalizeLoadOptions(request.options || {}, astDbtResolveLoadDefaults(request)),
    throwOnInvalid: astDbtNormalizeBoolean(request.throwOnInvalid, false)
  };
}

function astDbtValidateLoadArtifactRequest(request = {}) {
  if (!astDbtIsPlainObject(request)) {
    throw new AstDbtValidationError('loadArtifact request must be an object');
  }

  const defaults = astDbtResolveArtifactDefaults(request);
  const options = astDbtNormalizeLoadOptions(request.options || {}, defaults);
  const artifactType = astDbtNormalizeArtifactType(request.artifactType || request.type, '');
  if (!artifactType) {
    throw new AstDbtValidationError('loadArtifact requires artifactType');
  }

  const artifact = typeof request.artifact !== 'undefined' ? request.artifact : null;
  if (artifact != null && !astDbtIsPlainObject(artifact)) {
    throw new AstDbtValidationError('artifact must be an object when provided');
  }

  const source = artifact
    ? null
    : astDbtNormalizeSourceObject(request, defaults);

  if (!artifact && !source) {
    throw new AstDbtValidationError('loadArtifact requires source input when artifact is not provided inline');
  }

  return {
    operation: 'load_artifact',
    artifactType,
    source,
    artifact,
    options
  };
}

function astDbtValidateInspectArtifactRequest(request = {}) {
  if (!astDbtIsPlainObject(request)) {
    throw new AstDbtValidationError('inspectArtifact request must be an object');
  }

  const artifactType = astDbtNormalizeArtifactType(request.artifactType || request.type, '');
  const defaults = astDbtResolveArtifactDefaults(request);

  return {
    operation: 'inspect_artifact',
    artifactType,
    bundle: astDbtIsPlainObject(request.bundle) ? request.bundle : null,
    artifact: astDbtIsPlainObject(request.artifact) ? request.artifact : null,
    source: request.source || null,
    uri: request.uri || null,
    fileId: request.fileId || null,
    provider: request.provider || null,
    location: request.location || null,
    auth: request.auth || null,
    providerOptions: request.providerOptions || null,
    options: astDbtNormalizeLoadOptions(request.options || {}, defaults)
  };
}

function astDbtResolveArtifactDefaults(request = {}) {
  const defaults = astDbtResolveLoadDefaults(request);
  // Artifact operations should not inherit manifest source defaults.
  defaults.uri = null;
  defaults.fileId = null;
  return defaults;
}

function astDbtValidateDiffEntitiesRequest(request = {}) {
  if (!astDbtIsPlainObject(request)) {
    throw new AstDbtValidationError('diffEntities request must be an object');
  }

  const defaults = astDbtResolveLoadDefaults(request);
  const options = astDbtNormalizeLoadOptions(request.options || {}, defaults);

  return {
    operation: 'diff_entities',
    leftBundle: astDbtIsPlainObject(request.leftBundle || request.bundleA) ? (request.leftBundle || request.bundleA) : null,
    rightBundle: astDbtIsPlainObject(request.rightBundle || request.bundleB) ? (request.rightBundle || request.bundleB) : null,
    leftManifest: astDbtIsPlainObject(request.leftManifest || request.manifestA) ? (request.leftManifest || request.manifestA) : null,
    rightManifest: astDbtIsPlainObject(request.rightManifest || request.manifestB) ? (request.rightManifest || request.manifestB) : null,
    leftSource: astDbtIsPlainObject(request.leftSource) ? request.leftSource : null,
    rightSource: astDbtIsPlainObject(request.rightSource) ? request.rightSource : null,
    includeUnchanged: astDbtNormalizeBoolean(request.includeUnchanged, false),
    changeTypes: astDbtNormalizeDiffChangeTypes(request.changeTypes),
    include: {
      columns: astDbtNormalizeBoolean(request.include && request.include.columns, true),
      meta: astDbtNormalizeBoolean(request.include && request.include.meta, true),
      stats: astDbtNormalizeBoolean(request.include && request.include.stats, true)
    },
    page: astDbtNormalizeSearchPage(request.page || {}),
    options
  };
}

function astDbtValidateImpactRequest(request = {}) {
  if (!astDbtIsPlainObject(request)) {
    throw new AstDbtValidationError('impact request must be an object');
  }

  const uniqueId = astDbtNormalizeString(request.uniqueId, '');
  if (!uniqueId) {
    throw new AstDbtValidationError('impact requires uniqueId');
  }

  const direction = astDbtNormalizeString(request.direction, 'both').toLowerCase();
  if (['upstream', 'downstream', 'both'].indexOf(direction) === -1) {
    throw new AstDbtValidationError('impact.direction must be one of: upstream, downstream, both', {
      direction
    });
  }

  const defaults = astDbtResolveLoadDefaults(request);
  const artifactInput = astDbtIsPlainObject(request.artifacts) ? request.artifacts : {};
  const artifacts = {};

  ['catalog', 'run_results', 'sources'].forEach(artifactType => {
    if (!astDbtIsPlainObject(artifactInput[artifactType])) {
      return;
    }
    artifacts[artifactType] = astDbtNormalizeImpactArtifactRef(
      artifactInput[artifactType],
      artifactType,
      defaults
    );
  });

  return {
    operation: 'impact',
    bundle: request.bundle || null,
    manifest: request.manifest || null,
    source: request.source || null,
    uniqueId,
    direction,
    depth: astDbtNormalizePositiveInt(request.depth, 1, 1, 20),
    includeDisabled: astDbtNormalizeBoolean(request.includeDisabled, false),
    include: {
      artifactStatus: astDbtNormalizeBoolean(request.include && request.include.artifactStatus, true),
      stats: astDbtNormalizeBoolean(request.include && request.include.stats, true)
    },
    artifacts,
    options: astDbtNormalizeLoadOptions(request.options || {}, defaults)
  };
}

function astDbtValidateRunRequest(request = {}) {
  if (!astDbtIsPlainObject(request)) {
    throw new AstDbtValidationError('DBT run request must be an object');
  }

  const operation = astDbtNormalizeRunOperation(request.operation || '');

  switch (operation) {
    case 'load_manifest':
      return astDbtValidateLoadManifestRequest(request);
    case 'load_artifact':
      return astDbtValidateLoadArtifactRequest(request);
    case 'inspect_manifest':
      return astDbtValidateInspectManifestRequest(request);
    case 'inspect_artifact':
      return astDbtValidateInspectArtifactRequest(request);
    case 'list_entities':
      return astDbtValidateListEntitiesRequest(request);
    case 'search':
      return astDbtValidateSearchRequest(request);
    case 'get_entity':
      return astDbtValidateGetEntityRequest(request);
    case 'get_column':
      return astDbtValidateGetColumnRequest(request);
    case 'lineage':
      return astDbtValidateLineageRequest(request);
    case 'validate_manifest':
      return astDbtValidateValidateManifestRequest(request);
    case 'diff_entities':
      return astDbtValidateDiffEntitiesRequest(request);
    case 'impact':
      return astDbtValidateImpactRequest(request);
    default:
      throw new AstDbtValidationError(`Unsupported operation '${operation}'`);
  }
}
