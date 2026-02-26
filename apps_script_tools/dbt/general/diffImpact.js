function astDbtStableCopy(value) {
  if (Array.isArray(value)) {
    return value.map(item => astDbtStableCopy(item));
  }

  if (!astDbtIsPlainObject(value)) {
    return value;
  }

  const output = {};
  Object.keys(value).sort().forEach(key => {
    output[key] = astDbtStableCopy(value[key]);
  });
  return output;
}

function astDbtStableStringify(value) {
  return JSON.stringify(astDbtStableCopy(value));
}

function astDbtBuildComparableColumns(index, uniqueIdLower, includeMeta) {
  const columnsEntry = astDbtIsPlainObject(index && index.columnsByUniqueId)
    ? index.columnsByUniqueId[uniqueIdLower]
    : null;

  if (!columnsEntry || !Array.isArray(columnsEntry.order) || !astDbtIsPlainObject(columnsEntry.byName)) {
    return {};
  }

  const columns = {};
  columnsEntry.order.forEach(name => {
    const key = astDbtNormalizeString(name, '').toLowerCase();
    if (!key) {
      return;
    }

    const column = columnsEntry.byName[key];
    if (!column) {
      return;
    }

    const normalized = {
      name: astDbtNormalizeString(column.columnName, name),
      dataType: astDbtNormalizeString(column.dataType, ''),
      description: astDbtNormalizeString(column.description, ''),
      tags: Array.isArray(column.tags) ? column.tags.slice().sort() : []
    };

    if (includeMeta) {
      normalized.meta = astDbtIsPlainObject(column.meta) ? astDbtStableCopy(column.meta) : {};
    }

    columns[key] = normalized;
  });

  return columns;
}

function astDbtBuildComparableEntity(entity, index, include = {}) {
  const includeMeta = include.meta !== false;
  const includeColumns = include.columns !== false;

  const normalized = {
    uniqueId: entity.uniqueId,
    section: entity.section,
    name: astDbtNormalizeString(entity.name, ''),
    resourceType: astDbtNormalizeString(entity.resourceType, ''),
    packageName: astDbtNormalizeString(entity.packageName, ''),
    path: astDbtNormalizeString(entity.path, ''),
    originalFilePath: astDbtNormalizeString(entity.originalFilePath, ''),
    tags: Array.isArray(entity.tags) ? entity.tags.slice().sort() : [],
    description: astDbtNormalizeString(entity.description, ''),
    dependsOnNodes: Array.isArray(entity.dependsOnNodes) ? entity.dependsOnNodes.slice().sort() : [],
    disabled: entity.disabled === true
  };

  if (includeMeta) {
    normalized.meta = astDbtIsPlainObject(entity.meta) ? astDbtStableCopy(entity.meta) : {};
  }

  if (includeColumns) {
    normalized.columns = astDbtBuildComparableColumns(index, entity.uniqueIdLower, includeMeta);
  }

  return {
    value: normalized,
    hash: astDbtDigestHex(astDbtStableStringify(normalized))
  };
}

function astDbtBuildEntitySnapshot(index, include = {}) {
  const snapshot = {};
  const uniqueIdLowerValues = Object.keys(astDbtIsPlainObject(index.byUniqueId) ? index.byUniqueId : {}).sort();

  uniqueIdLowerValues.forEach(uniqueIdLower => {
    const entity = astDbtResolveEntityRecord(index, uniqueIdLower);
    if (!entity || !entity.uniqueId) {
      return;
    }

    snapshot[entity.uniqueId] = astDbtBuildComparableEntity(entity, index, include);
  });

  return snapshot;
}

function astDbtBuildColumnDiff(leftColumns = {}, rightColumns = {}) {
  const leftKeys = Object.keys(leftColumns).sort();
  const rightKeys = Object.keys(rightColumns).sort();
  const allKeys = Array.from(new Set(leftKeys.concat(rightKeys))).sort();

  const added = [];
  const removed = [];
  const modified = [];

  allKeys.forEach(key => {
    const left = leftColumns[key] || null;
    const right = rightColumns[key] || null;

    if (!left && right) {
      added.push(right.name);
      return;
    }

    if (left && !right) {
      removed.push(left.name);
      return;
    }

    if (astDbtStableStringify(left) !== astDbtStableStringify(right)) {
      modified.push(right.name);
    }
  });

  return {
    added,
    removed,
    modified
  };
}

function astDbtBuildEntityDiffDetails(leftComparable, rightComparable, include = {}) {
  if (!leftComparable || !rightComparable) {
    return null;
  }

  const leftValue = leftComparable.value;
  const rightValue = rightComparable.value;
  const fieldChanges = [];

  const fields = [
    'section',
    'name',
    'resourceType',
    'packageName',
    'path',
    'originalFilePath',
    'tags',
    'description',
    'dependsOnNodes',
    'disabled'
  ];

  if (include.meta !== false) {
    fields.push('meta');
  }

  fields.forEach(field => {
    const leftSerialized = astDbtStableStringify(leftValue[field]);
    const rightSerialized = astDbtStableStringify(rightValue[field]);
    if (leftSerialized !== rightSerialized) {
      fieldChanges.push(field);
    }
  });

  const details = {
    fieldChanges
  };

  if (include.columns !== false) {
    details.columnChanges = astDbtBuildColumnDiff(
      leftValue.columns || {},
      rightValue.columns || {}
    );
  }

  return details;
}

function astDbtBuildDiffItem(uniqueId, leftComparable, rightComparable, include = {}) {
  let changeType = 'unchanged';

  if (!leftComparable && rightComparable) {
    changeType = 'added';
  } else if (leftComparable && !rightComparable) {
    changeType = 'removed';
  } else if (leftComparable && rightComparable && leftComparable.hash !== rightComparable.hash) {
    changeType = 'modified';
  }

  const item = {
    uniqueId,
    changeType
  };

  if (leftComparable) {
    item.left = leftComparable.value;
  }

  if (rightComparable) {
    item.right = rightComparable.value;
  }

  if (changeType === 'modified') {
    item.diff = astDbtBuildEntityDiffDetails(leftComparable, rightComparable, include);
  }

  return item;
}

function astDbtResolveDiffSideBundle(sideName, normalized = {}, sideOptions = {}) {
  const bundleKey = `${sideName}Bundle`;
  const manifestKey = `${sideName}Manifest`;
  const sourceKey = `${sideName}Source`;

  if (astDbtIsPlainObject(normalized[bundleKey])) {
    return astDbtNormalizeBundle(normalized[bundleKey], normalized.options);
  }

  if (astDbtIsPlainObject(normalized[manifestKey])) {
    const loaded = astDbtLoadManifestCore({
      manifest: normalized[manifestKey],
      options: normalized.options
    });
    return loaded.bundle;
  }

  if (astDbtIsPlainObject(normalized[sourceKey])) {
    const sourceInput = normalized[sourceKey];
    return astDbtEnsureBundle({
      bundle: sourceInput.bundle,
      manifest: sourceInput.manifest,
      source: sourceInput.source,
      uri: sourceInput.uri,
      fileId: sourceInput.fileId,
      provider: sourceInput.provider,
      location: sourceInput.location,
      auth: sourceInput.auth,
      providerOptions: sourceInput.providerOptions,
      options: Object.assign({}, normalized.options, sideOptions)
    }, {
      options: Object.assign({}, normalized.options, sideOptions)
    });
  }

  throw new AstDbtValidationError(`diffEntities requires ${sideName}Bundle, ${sideName}Manifest, or ${sideName}Source`);
}

function astDbtDiffEntitiesCore(request = {}) {
  const normalized = astDbtValidateDiffEntitiesRequest(request);
  const startedAt = Date.now();

  const leftBundle = astDbtResolveDiffSideBundle('left', normalized);
  const rightBundle = astDbtResolveDiffSideBundle('right', normalized);

  const leftIndex = leftBundle.index || astDbtBuildManifestIndexes(leftBundle.manifest);
  const rightIndex = rightBundle.index || astDbtBuildManifestIndexes(rightBundle.manifest);

  const snapshotOptions = {
    meta: normalized.include.meta,
    columns: normalized.include.columns
  };

  const leftSnapshot = astDbtBuildEntitySnapshot(leftIndex, snapshotOptions);
  const rightSnapshot = astDbtBuildEntitySnapshot(rightIndex, snapshotOptions);

  const allUniqueIds = Array.from(new Set(Object.keys(leftSnapshot).concat(Object.keys(rightSnapshot)))).sort();
  const items = [];
  const summary = {
    leftEntityCount: Object.keys(leftSnapshot).length,
    rightEntityCount: Object.keys(rightSnapshot).length,
    added: 0,
    removed: 0,
    modified: 0,
    unchanged: 0
  };

  allUniqueIds.forEach(uniqueId => {
    const leftComparable = leftSnapshot[uniqueId] || null;
    const rightComparable = rightSnapshot[uniqueId] || null;
    const item = astDbtBuildDiffItem(uniqueId, leftComparable, rightComparable, normalized.include);
    summary[item.changeType] += 1;

    if (!normalized.includeUnchanged && item.changeType === 'unchanged') {
      return;
    }

    if (normalized.changeTypes.indexOf(item.changeType) === -1) {
      return;
    }

    items.push(item);
  });

  const total = items.length;
  const offset = normalized.page.offset;
  const limit = normalized.page.limit;
  const pagedItems = items.slice(offset, offset + limit);

  const out = {
    status: 'ok',
    summary,
    page: {
      limit,
      offset,
      returned: pagedItems.length,
      total,
      hasMore: offset + pagedItems.length < total
    },
    items: pagedItems
  };

  if (normalized.include.stats !== false) {
    out.stats = {
      comparedEntities: allUniqueIds.length,
      elapsedMs: Date.now() - startedAt
    };
  }

  return out;
}

function astDbtResolveImpactArtifactBundle(descriptor = null, requestOptions = {}) {
  if (!astDbtIsPlainObject(descriptor)) {
    return null;
  }

  if (astDbtIsPlainObject(descriptor.bundle)) {
    return astDbtNormalizeArtifactBundle(
      descriptor.bundle,
      descriptor.options || requestOptions,
      descriptor.artifactType
    );
  }

  if (astDbtIsPlainObject(descriptor.artifact)) {
    return astDbtLoadArtifactCore({
      artifactType: descriptor.artifactType,
      artifact: descriptor.artifact,
      options: descriptor.options || requestOptions
    }).bundle;
  }

  if (astDbtIsPlainObject(descriptor.source)) {
    return astDbtLoadArtifactCore({
      artifactType: descriptor.artifactType,
      source: descriptor.source,
      uri: descriptor.source.uri,
      fileId: descriptor.source.fileId,
      provider: descriptor.source.provider,
      location: descriptor.source.location,
      auth: descriptor.source.auth,
      providerOptions: descriptor.source.providerOptions,
      options: descriptor.options || requestOptions
    }).bundle;
  }

  return null;
}

function astDbtBuildRunResultsImpactStatus(bundle, uniqueId) {
  if (!bundle || !astDbtIsPlainObject(bundle.index) || !astDbtIsPlainObject(bundle.index.byUniqueId)) {
    return null;
  }

  const key = astDbtNormalizeString(uniqueId, '').toLowerCase();
  const entry = bundle.index.byUniqueId[key];
  if (!entry) {
    return null;
  }

  return {
    status: entry.status,
    executionTime: entry.executionTime,
    failures: entry.failures,
    threadId: entry.threadId,
    message: entry.message
  };
}

function astDbtBuildSourcesImpactStatus(bundle, uniqueId) {
  if (!bundle || !astDbtIsPlainObject(bundle.index) || !astDbtIsPlainObject(bundle.index.byUniqueId)) {
    return null;
  }

  const key = astDbtNormalizeString(uniqueId, '').toLowerCase();
  const entry = bundle.index.byUniqueId[key];
  if (!entry) {
    return null;
  }

  return {
    status: entry.status,
    maxLoadedAt: entry.maxLoadedAt,
    snapshottedAt: entry.snapshottedAt,
    executionTime: entry.executionTime,
    message: entry.message
  };
}

function astDbtBuildCatalogImpactStatus(bundle, uniqueId) {
  if (!bundle || !astDbtIsPlainObject(bundle.index) || !astDbtIsPlainObject(bundle.index.byUniqueId)) {
    return null;
  }

  const key = astDbtNormalizeString(uniqueId, '').toLowerCase();
  const entry = bundle.index.byUniqueId[key];
  if (!entry) {
    return null;
  }

  return {
    exists: true,
    section: entry.section,
    relationName: entry.relationName,
    database: entry.database,
    schema: entry.schema,
    identifier: entry.identifier,
    columnCount: entry.columnCount
  };
}

function astDbtImpactCore(request = {}) {
  const normalized = astDbtValidateImpactRequest(request);
  const startedAt = Date.now();

  const bundle = astDbtEnsureBundle(normalized, {
    options: normalized.options
  });

  const lineage = astDbtLineageCore({
    bundle,
    uniqueId: normalized.uniqueId,
    direction: normalized.direction,
    depth: normalized.depth,
    includeDisabled: normalized.includeDisabled,
    options: normalized.options
  });

  const artifactBundles = {
    run_results: astDbtResolveImpactArtifactBundle(normalized.artifacts.run_results, normalized.options),
    sources: astDbtResolveImpactArtifactBundle(normalized.artifacts.sources, normalized.options),
    catalog: astDbtResolveImpactArtifactBundle(normalized.artifacts.catalog, normalized.options)
  };

  const nodes = lineage.nodes.map(node => {
    const output = astDbtJsonClone(node);

    if (normalized.include.artifactStatus !== false) {
      output.artifactStatus = {
        runResults: astDbtBuildRunResultsImpactStatus(artifactBundles.run_results, node.uniqueId),
        sources: astDbtBuildSourcesImpactStatus(artifactBundles.sources, node.uniqueId),
        catalog: astDbtBuildCatalogImpactStatus(artifactBundles.catalog, node.uniqueId)
      };
    }

    return output;
  });

  const response = {
    status: 'ok',
    uniqueId: lineage.uniqueId,
    direction: lineage.direction,
    depth: lineage.depth,
    nodes,
    edges: lineage.edges,
    artifactSummary: {
      runResults: artifactBundles.run_results ? artifactBundles.run_results.summary : null,
      sources: artifactBundles.sources ? artifactBundles.sources.summary : null,
      catalog: artifactBundles.catalog ? artifactBundles.catalog.summary : null
    }
  };

  if (normalized.include.stats !== false) {
    response.stats = {
      nodeCount: nodes.length,
      edgeCount: Array.isArray(lineage.edges) ? lineage.edges.length : 0,
      elapsedMs: Date.now() - startedAt
    };
  }

  return response;
}
