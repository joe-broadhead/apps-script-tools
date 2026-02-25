function astDbtSelectPrimaryEntity(entityCandidates = []) {
  if (!Array.isArray(entityCandidates) || entityCandidates.length === 0) {
    return null;
  }

  const preferred = entityCandidates.find(entity => entity && entity.disabled !== true);
  return preferred || entityCandidates[0];
}

function astDbtResolveEntityRecord(index, uniqueId) {
  if (!astDbtIsPlainObject(index) || !astDbtIsPlainObject(index.byUniqueId)) {
    return null;
  }

  const normalized = astDbtNormalizeString(uniqueId, '').toLowerCase();
  if (!normalized) {
    return null;
  }

  const matches = index.byUniqueId[normalized] || [];
  return astDbtSelectPrimaryEntity(matches);
}

function astDbtBuildColumnOutputFromIndex(index, uniqueIdLower, includeMode) {
  const columns = index && index.columnsByUniqueId ? index.columnsByUniqueId[uniqueIdLower] : null;
  if (!columns || !Array.isArray(columns.order)) {
    if (includeMode === 'summary') {
      return {
        count: 0,
        names: []
      };
    }

    if (includeMode === 'full') {
      return {};
    }

    return null;
  }

  if (includeMode === 'summary') {
    return {
      count: columns.order.length,
      names: columns.order.slice()
    };
  }

  if (includeMode === 'full') {
    const output = {};
    columns.order.forEach(columnName => {
      const column = columns.byName[columnName.toLowerCase()];
      if (!column) {
        return;
      }

      output[columnName] = {
        name: column.columnName,
        description: column.description,
        dataType: column.dataType,
        tags: column.tags.slice(),
        meta: astDbtJsonClone(column.meta),
        raw: astDbtJsonClone(column.raw)
      };
    });
    return output;
  }

  return null;
}

function astDbtBuildEntityOutput(entity, index, include = {}) {
  const safeInclude = astDbtIsPlainObject(include) ? include : {};
  const includeMeta = safeInclude.meta !== false;
  const includeColumns = astDbtNormalizeString(safeInclude.columns, 'none').toLowerCase();

  const output = {
    section: entity.section,
    uniqueId: entity.uniqueId,
    name: entity.name,
    resourceType: entity.resourceType,
    packageName: entity.packageName,
    path: entity.path,
    originalFilePath: entity.originalFilePath,
    tags: entity.tags.slice(),
    description: entity.description,
    dependsOnNodes: entity.dependsOnNodes.slice(),
    disabled: entity.disabled === true
  };

  if (includeMeta) {
    output.meta = astDbtJsonClone(entity.meta || {});
  }

  if (includeColumns === 'summary' || includeColumns === 'full') {
    output.columns = astDbtBuildColumnOutputFromIndex(index, entity.uniqueIdLower, includeColumns);
  }

  return output;
}

function astDbtGetEntityCore(request = {}) {
  const normalized = astDbtValidateGetEntityRequest(request);
  const bundle = astDbtEnsureBundle(normalized, {
    options: normalized.options
  });

  const index = bundle.index || astDbtBuildManifestIndexes(bundle.manifest);
  const entity = astDbtResolveEntityRecord(index, normalized.uniqueId);

  if (!entity) {
    throw new AstDbtNotFoundError('Entity was not found in manifest', {
      uniqueId: normalized.uniqueId
    });
  }

  return {
    status: 'ok',
    item: astDbtBuildEntityOutput(entity, index, normalized.include)
  };
}
