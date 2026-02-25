function astDbtResolveColumnRecord(index, uniqueId, columnName) {
  if (!astDbtIsPlainObject(index) || !astDbtIsPlainObject(index.columnsByUniqueId)) {
    return null;
  }

  const uniqueIdLower = astDbtNormalizeString(uniqueId, '').toLowerCase();
  const columnLower = astDbtNormalizeString(columnName, '').toLowerCase();

  if (!uniqueIdLower || !columnLower) {
    return null;
  }

  const columns = index.columnsByUniqueId[uniqueIdLower];
  if (!columns || !astDbtIsPlainObject(columns.byName)) {
    return null;
  }

  return columns.byName[columnLower] || null;
}

function astDbtGetColumnCore(request = {}) {
  const normalized = astDbtValidateGetColumnRequest(request);
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

  const column = astDbtResolveColumnRecord(index, entity.uniqueId, normalized.columnName);

  if (!column) {
    throw new AstDbtNotFoundError('Column was not found in manifest entity', {
      uniqueId: entity.uniqueId,
      columnName: normalized.columnName
    });
  }

  return {
    status: 'ok',
    item: {
      uniqueId: entity.uniqueId,
      section: entity.section,
      resourceType: entity.resourceType,
      packageName: entity.packageName,
      name: column.columnName,
      dataType: column.dataType,
      tags: column.tags.slice(),
      description: column.description,
      meta: astDbtJsonClone(column.meta),
      raw: astDbtJsonClone(column.raw)
    }
  };
}
