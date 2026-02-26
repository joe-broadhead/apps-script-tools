function astDbtBuildArtifactMetadata(artifact = {}) {
  const metadata = astDbtIsPlainObject(artifact.metadata) ? artifact.metadata : {};
  return {
    dbtSchemaVersion: astDbtNormalizeString(metadata.dbt_schema_version, ''),
    dbtVersion: astDbtNormalizeString(metadata.dbt_version, ''),
    generatedAt: astDbtNormalizeString(metadata.generated_at, ''),
    invocationId: astDbtNormalizeString(metadata.invocation_id, ''),
    projectName: astDbtNormalizeString(metadata.project_name, '')
  };
}

function astDbtBuildCatalogArtifactIndex(artifact = {}) {
  const byUniqueId = {};
  const byResourceType = {};

  function appendEntry(raw, section) {
    if (!astDbtIsPlainObject(raw)) {
      return;
    }

    const uniqueId = astDbtNormalizeString(raw.unique_id, '');
    if (!uniqueId) {
      return;
    }

    const resourceType = astDbtNormalizeString(raw.resource_type, section === 'sources' ? 'source' : '').toLowerCase();
    const columns = astDbtIsPlainObject(raw.columns) ? raw.columns : {};
    const columnCount = Object.keys(columns).length;
    const database = astDbtNormalizeString(raw.database, '');
    const schema = astDbtNormalizeString(raw.schema, '');
    const alias = astDbtNormalizeString(raw.alias, '');
    const identifier = astDbtNormalizeString(raw.identifier, alias);

    const entry = {
      uniqueId,
      section,
      resourceType,
      packageName: astDbtNormalizeString(raw.package_name, ''),
      name: astDbtNormalizeString(raw.name, ''),
      path: astDbtNormalizeString(raw.original_file_path || raw.path, ''),
      columnCount,
      database,
      schema,
      alias,
      identifier,
      relationName: astDbtNormalizeString(raw.relation_name, ''),
      raw
    };

    byUniqueId[uniqueId.toLowerCase()] = entry;

    if (!Object.prototype.hasOwnProperty.call(byResourceType, resourceType || 'unknown')) {
      byResourceType[resourceType || 'unknown'] = [];
    }
    byResourceType[resourceType || 'unknown'].push(entry);
  }

  const nodeMap = astDbtIsPlainObject(artifact.nodes) ? artifact.nodes : {};
  Object.keys(nodeMap).forEach(key => {
    appendEntry(nodeMap[key], 'nodes');
  });

  const sourceMap = astDbtIsPlainObject(artifact.sources) ? artifact.sources : {};
  Object.keys(sourceMap).forEach(key => {
    appendEntry(sourceMap[key], 'sources');
  });

  return {
    byUniqueId,
    byResourceType,
    entityCount: Object.keys(byUniqueId).length
  };
}

function astDbtBuildRunResultsArtifactIndex(artifact = {}) {
  const results = Array.isArray(artifact.results) ? artifact.results : [];
  const byUniqueId = {};
  const statusCounts = {};

  results.forEach((raw, idx) => {
    if (!astDbtIsPlainObject(raw)) {
      return;
    }

    const uniqueId = astDbtNormalizeString(raw.unique_id, '');
    if (!uniqueId) {
      return;
    }

    const status = astDbtNormalizeString(raw.status, '').toLowerCase() || 'unknown';
    statusCounts[status] = Number(statusCounts[status] || 0) + 1;

    byUniqueId[uniqueId.toLowerCase()] = {
      uniqueId,
      status,
      executionTime: Number(raw.execution_time || 0),
      threadId: astDbtNormalizeString(raw.thread_id, ''),
      message: astDbtNormalizeString(raw.message, ''),
      failures: Number(raw.failures || 0),
      timing: Array.isArray(raw.timing) ? astDbtJsonClone(raw.timing) : [],
      index: idx,
      raw
    };
  });

  return {
    byUniqueId,
    statusCounts,
    resultCount: results.length
  };
}

function astDbtBuildSourcesArtifactIndex(artifact = {}) {
  const results = Array.isArray(artifact.results) ? artifact.results : [];
  const byUniqueId = {};
  const statusCounts = {};

  results.forEach((raw, idx) => {
    if (!astDbtIsPlainObject(raw)) {
      return;
    }

    const uniqueId = astDbtNormalizeString(raw.unique_id, '');
    if (!uniqueId) {
      return;
    }

    const status = astDbtNormalizeString(raw.status, '').toLowerCase() || 'unknown';
    statusCounts[status] = Number(statusCounts[status] || 0) + 1;

    byUniqueId[uniqueId.toLowerCase()] = {
      uniqueId,
      status,
      maxLoadedAt: astDbtNormalizeString(raw.max_loaded_at, ''),
      snapshottedAt: astDbtNormalizeString(raw.snapshotted_at, ''),
      executionTime: Number(raw.execution_time || 0),
      threadId: astDbtNormalizeString(raw.thread_id, ''),
      message: astDbtNormalizeString(raw.message, ''),
      index: idx,
      raw
    };
  });

  return {
    byUniqueId,
    statusCounts,
    resultCount: results.length
  };
}

function astDbtBuildArtifactIndex(artifactType, artifact = {}) {
  switch (artifactType) {
    case 'catalog':
      return astDbtBuildCatalogArtifactIndex(artifact);
    case 'run_results':
      return astDbtBuildRunResultsArtifactIndex(artifact);
    case 'sources':
      return astDbtBuildSourcesArtifactIndex(artifact);
    default:
      throw new AstDbtValidationError(`Unsupported artifactType '${artifactType}'`);
  }
}

function astDbtBuildArtifactSummary(artifactType, artifact = {}, index = null) {
  const metadata = astDbtBuildArtifactMetadata(artifact);

  if (artifactType === 'catalog') {
    const nodeMap = astDbtIsPlainObject(artifact.nodes) ? artifact.nodes : {};
    const sourceMap = astDbtIsPlainObject(artifact.sources) ? artifact.sources : {};
    const totalColumns = Object.keys(index && index.byUniqueId ? index.byUniqueId : {}).reduce((acc, key) => {
      const entry = index.byUniqueId[key];
      return acc + Number(entry && entry.columnCount || 0);
    }, 0);

    return {
      artifactType,
      metadata,
      counts: {
        nodeCount: Object.keys(nodeMap).length,
        sourceCount: Object.keys(sourceMap).length,
        entityCount: Number(index && index.entityCount || 0),
        columnCount: totalColumns
      }
    };
  }

  if (artifactType === 'run_results') {
    const elapsedTime = Number(artifact.elapsed_time || 0);
    return {
      artifactType,
      metadata,
      counts: {
        resultCount: Number(index && index.resultCount || 0),
        statusCounts: astDbtIsPlainObject(index && index.statusCounts) ? astDbtJsonClone(index.statusCounts) : {}
      },
      elapsedTime
    };
  }

  return {
    artifactType,
    metadata,
    counts: {
      resultCount: Number(index && index.resultCount || 0),
      statusCounts: astDbtIsPlainObject(index && index.statusCounts) ? astDbtJsonClone(index.statusCounts) : {}
    }
  };
}

function astDbtValidateArtifactPayload(artifactType, artifact = {}, options = {}) {
  const mode = astDbtNormalizeString(options.validate, 'strict').toLowerCase();
  const validation = {
    valid: true,
    mode,
    schemaVersion: astDbtNormalizeString(options.schemaVersion, 'v12'),
    errors: [],
    warnings: []
  };

  if (mode === 'off') {
    return validation;
  }

  if (artifactType === 'catalog') {
    const hasNodes = astDbtIsPlainObject(artifact.nodes);
    const hasSources = astDbtIsPlainObject(artifact.sources);
    if (mode === 'strict' && !hasNodes && !hasSources) {
      validation.errors.push({
        path: '/catalog',
        message: 'catalog artifact must include nodes and/or sources maps'
      });
    }
  }

  if (artifactType === 'run_results' || artifactType === 'sources') {
    if (mode === 'strict' && !Array.isArray(artifact.results)) {
      validation.errors.push({
        path: '/results',
        message: `${artifactType} artifact must include results array`
      });
    }
  }

  if (!astDbtIsPlainObject(artifact.metadata)) {
    validation.warnings.push({
      path: '/metadata',
      message: 'artifact metadata is missing or not an object'
    });
  }

  validation.valid = validation.errors.length === 0;
  return validation;
}

function astDbtBuildArtifactBundle(artifact, request, source, readEnvelope = null, validation = null) {
  const options = request.options || AST_DBT_DEFAULT_LOAD_OPTIONS;
  const index = astDbtBuildArtifactIndex(request.artifactType, artifact);
  const summary = astDbtBuildArtifactSummary(request.artifactType, artifact, index);

  const bundle = {
    artifactType: request.artifactType,
    schemaVersion: options.schemaVersion,
    loadedAt: new Date().toISOString(),
    source,
    metadata: summary.metadata,
    summary,
    validation,
    artifact,
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

function astDbtNormalizeArtifactBundle(bundle = {}, options = {}, fallbackArtifactType = '') {
  if (!astDbtIsPlainObject(bundle)) {
    throw new AstDbtValidationError('artifact bundle must be an object');
  }

  const optionsNormalized = astDbtNormalizeLoadOptions(options, AST_DBT_DEFAULT_LOAD_OPTIONS);
  const artifactType = astDbtNormalizeArtifactType(bundle.artifactType || fallbackArtifactType, '');
  if (!artifactType) {
    throw new AstDbtValidationError('artifact bundle requires artifactType');
  }

  const artifact = astDbtIsPlainObject(bundle.artifact) ? bundle.artifact : null;
  const index = astDbtIsPlainObject(bundle.index)
    ? bundle.index
    : (artifact ? astDbtBuildArtifactIndex(artifactType, artifact) : null);

  if (!artifact && !index) {
    throw new AstDbtValidationError('artifact bundle must include artifact or index');
  }

  const summary = astDbtIsPlainObject(bundle.summary)
    ? astDbtJsonClone(bundle.summary)
    : astDbtBuildArtifactSummary(artifactType, artifact || {}, index || {});

  const metadata = astDbtIsPlainObject(bundle.metadata)
    ? astDbtJsonClone(bundle.metadata)
    : (astDbtIsPlainObject(summary.metadata) ? astDbtJsonClone(summary.metadata) : astDbtBuildArtifactMetadata(artifact || {}));

  let validation = null;
  if (astDbtIsPlainObject(bundle.validation)) {
    validation = astDbtJsonClone(bundle.validation);
  } else if (artifact) {
    validation = astDbtValidateArtifactPayload(artifactType, artifact, optionsNormalized);
  }

  return {
    artifactType,
    schemaVersion: astDbtNormalizeString(bundle.schemaVersion, optionsNormalized.schemaVersion),
    loadedAt: astDbtNormalizeString(bundle.loadedAt, new Date().toISOString()),
    source: astDbtIsPlainObject(bundle.source) ? bundle.source : null,
    metadata,
    summary,
    validation,
    artifact,
    index
  };
}

function astDbtLoadArtifactCore(request = {}) {
  const normalizedRequest = astDbtValidateLoadArtifactRequest(request);

  let artifact = normalizedRequest.artifact;
  let source = normalizedRequest.source;
  let readEnvelope = null;

  if (!artifact) {
    readEnvelope = astDbtReadManifestFromSource(source, normalizedRequest.options);

    const payloadBytes = astDbtEstimatePayloadBytes(readEnvelope);
    if (payloadBytes > normalizedRequest.options.maxBytes) {
      throw new AstDbtLoadError('Artifact payload exceeds maxBytes', {
        maxBytes: normalizedRequest.options.maxBytes,
        payloadBytes,
        provider: source.provider,
        uri: source.uri,
        artifactType: normalizedRequest.artifactType
      });
    }

    const extracted = astDbtExtractJsonObjectFromReadEnvelope(
      readEnvelope,
      source,
      normalizedRequest.options,
      `${normalizedRequest.artifactType} JSON text`
    );
    artifact = extracted.payload;

    if (normalizedRequest.options.includeRaw && extracted.rawText && !readEnvelope.raw) {
      readEnvelope.raw = extracted.rawText;
    }
  }

  const validation = astDbtValidateArtifactPayload(
    normalizedRequest.artifactType,
    artifact,
    normalizedRequest.options
  );

  if (!validation.valid && validation.mode === 'strict') {
    throw new AstDbtSchemaError(`${normalizedRequest.artifactType} artifact failed validation`, {
      artifactType: normalizedRequest.artifactType,
      errors: validation.errors,
      warnings: validation.warnings
    });
  }

  const bundle = astDbtBuildArtifactBundle(
    artifact,
    normalizedRequest,
    source,
    readEnvelope,
    validation
  );

  const response = {
    status: validation.valid ? 'ok' : 'invalid',
    artifactType: normalizedRequest.artifactType,
    source: bundle.source,
    metadata: bundle.metadata,
    summary: bundle.summary,
    validation,
    bundle,
    warnings: readEnvelope && Array.isArray(readEnvelope.warnings) ? readEnvelope.warnings.slice() : []
  };

  return response;
}

function astDbtEnsureArtifactBundle(request = {}, fallbackArtifactType = '', options = {}) {
  if (astDbtIsPlainObject(request.bundle)) {
    return astDbtNormalizeArtifactBundle(
      request.bundle,
      Object.assign({}, request.options || {}, options.options || {}),
      fallbackArtifactType || request.artifactType || request.type || ''
    );
  }

  const artifactType = astDbtNormalizeArtifactType(
    fallbackArtifactType || request.artifactType || request.type,
    ''
  );
  if (!artifactType) {
    throw new AstDbtValidationError('artifactType is required when artifact bundle is not provided');
  }

  if (astDbtIsPlainObject(request.artifact)) {
    const loaded = astDbtLoadArtifactCore({
      artifactType,
      artifact: request.artifact,
      options: Object.assign({}, request.options || {}, options.options || {})
    });
    return loaded.bundle;
  }

  const hasSourceInput = Boolean(
    request.source || request.uri || request.fileId || request.provider || request.location
  );
  if (hasSourceInput) {
    const loaded = astDbtLoadArtifactCore({
      artifactType,
      source: request.source,
      uri: request.uri,
      fileId: request.fileId,
      provider: request.provider,
      location: request.location,
      auth: request.auth,
      providerOptions: request.providerOptions,
      options: Object.assign({}, request.options || {}, options.options || {})
    });
    return loaded.bundle;
  }

  throw new AstDbtValidationError('Request must provide bundle, artifact, or source for DBT artifact operation');
}

function astDbtInspectArtifactCore(request = {}) {
  const normalized = astDbtValidateInspectArtifactRequest(request);
  const bundle = astDbtEnsureArtifactBundle(normalized, normalized.artifactType, {
    options: normalized.options
  });

  return {
    status: bundle.validation && bundle.validation.valid === false ? 'invalid' : 'ok',
    artifactType: bundle.artifactType,
    source: bundle.source,
    metadata: bundle.metadata,
    summary: bundle.summary,
    validation: bundle.validation,
    loadedAt: bundle.loadedAt
  };
}
