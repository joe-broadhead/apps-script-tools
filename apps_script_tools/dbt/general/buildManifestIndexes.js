function astDbtNormalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  const output = [];
  const seen = {};
  tags.forEach(tag => {
    const normalized = astDbtNormalizeString(tag, '').toLowerCase();
    if (!normalized || seen[normalized]) {
      return;
    }
    seen[normalized] = true;
    output.push(normalized);
  });
  return output;
}

function astDbtTokenizeText(text) {
  const source = astDbtNormalizeString(text, '').toLowerCase();
  if (!source) {
    return [];
  }

  const parts = source
    .split(/[^a-z0-9_]+/g)
    .map(value => value.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return [];
  }

  const output = [];
  const seen = {};
  parts.forEach(part => {
    if (!seen[part]) {
      seen[part] = true;
      output.push(part);
    }
  });

  return output;
}

function astDbtFlattenMeta(meta, prefix = '') {
  if (!astDbtIsPlainObject(meta)) {
    return {};
  }

  const output = {};
  const keys = Object.keys(meta);
  for (let idx = 0; idx < keys.length; idx += 1) {
    const key = keys[idx];
    const value = meta[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (astDbtIsPlainObject(value)) {
      const nested = astDbtFlattenMeta(value, path);
      Object.keys(nested).forEach(nestedKey => {
        output[nestedKey] = nested[nestedKey];
      });
      continue;
    }

    output[path] = value;
  }

  return output;
}

function astDbtNormalizeDependsOnNodes(entity) {
  if (!astDbtIsPlainObject(entity) || !astDbtIsPlainObject(entity.depends_on)) {
    return [];
  }

  const nodes = entity.depends_on.nodes;
  if (!Array.isArray(nodes)) {
    return [];
  }

  const output = [];
  const seen = {};
  nodes.forEach(node => {
    const normalized = astDbtNormalizeString(node, '');
    if (!normalized || seen[normalized]) {
      return;
    }
    seen[normalized] = true;
    output.push(normalized);
  });

  return output;
}

function astDbtExtractEntitySearchText(entity, normalized) {
  const fragments = [
    normalized.uniqueId,
    normalized.name,
    normalized.resourceType,
    normalized.packageName,
    normalized.path,
    normalized.originalFilePath,
    astDbtNormalizeString(entity.description, '')
  ];

  if (normalized.tags.length > 0) {
    fragments.push(normalized.tags.join(' '));
  }

  const meta = astDbtFlattenMeta(normalized.meta);
  Object.keys(meta).forEach(key => {
    fragments.push(`${key} ${astDbtNormalizeString(String(meta[key]), '')}`);
  });

  return fragments.filter(Boolean).join(' ');
}

function astDbtExtractColumnSearchText(columnName, columnValue = {}) {
  const parts = [columnName];
  if (astDbtIsPlainObject(columnValue)) {
    parts.push(astDbtNormalizeString(columnValue.description, ''));
    parts.push(astDbtNormalizeString(columnValue.data_type, ''));
    const tags = astDbtNormalizeTags(columnValue.tags);
    if (tags.length > 0) {
      parts.push(tags.join(' '));
    }

    const meta = astDbtFlattenMeta(columnValue.meta || {});
    Object.keys(meta).forEach(key => {
      parts.push(`${key} ${astDbtNormalizeString(String(meta[key]), '')}`);
    });
  }

  return parts.filter(Boolean).join(' ');
}

function astDbtBuildEntityRecord(section, mapKey, entity, options = {}) {
  if (!astDbtIsPlainObject(entity)) {
    return null;
  }

  const uniqueId = astDbtNormalizeString(entity.unique_id, mapKey);
  const disabled = options.disabled === true;

  const normalized = {
    section,
    mapKey,
    uniqueId,
    uniqueIdLower: uniqueId.toLowerCase(),
    name: astDbtNormalizeString(entity.name, ''),
    resourceType: astDbtNormalizeString(entity.resource_type, '').toLowerCase(),
    packageName: astDbtNormalizeString(entity.package_name, ''),
    path: astDbtNormalizeString(entity.path, ''),
    originalFilePath: astDbtNormalizeString(entity.original_file_path, ''),
    tags: astDbtNormalizeTags(entity.tags),
    meta: astDbtIsPlainObject(entity.meta) ? entity.meta : {},
    description: astDbtNormalizeString(entity.description, ''),
    dependsOnNodes: astDbtNormalizeDependsOnNodes(entity),
    columns: astDbtIsPlainObject(entity.columns) ? entity.columns : {},
    disabled,
    raw: entity
  };

  normalized.searchText = astDbtExtractEntitySearchText(entity, normalized);
  return normalized;
}

function astDbtAppendIndexValue(map, key, value) {
  if (!key) {
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(map, key)) {
    map[key] = [];
  }
  map[key].push(value);
}

function astDbtAppendToken(map, token, value) {
  if (!token) {
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(map, token)) {
    map[token] = {};
  }

  map[token][value] = true;
}

function astDbtFinalizeTokenMap(tokenMap) {
  const output = {};
  Object.keys(tokenMap).forEach(token => {
    output[token] = Object.keys(tokenMap[token]);
  });
  return output;
}

function astDbtBuildLineageFromDependsOn(entities) {
  const parentMap = {};
  entities.forEach(entity => {
    if (!entity.uniqueId) {
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(parentMap, entity.uniqueId)) {
      parentMap[entity.uniqueId] = [];
    }

    entity.dependsOnNodes.forEach(parentId => {
      if (parentMap[entity.uniqueId].indexOf(parentId) === -1) {
        parentMap[entity.uniqueId].push(parentId);
      }
    });
  });

  return parentMap;
}

function astDbtNormalizeLineageMap(lineageMap) {
  if (!astDbtIsPlainObject(lineageMap)) {
    return {};
  }

  const output = {};
  Object.keys(lineageMap).forEach(key => {
    const value = lineageMap[key];
    if (!Array.isArray(value)) {
      return;
    }

    output[key] = value
      .map(item => astDbtNormalizeString(item, ''))
      .filter(Boolean);
  });

  return output;
}

function astDbtBuildChildMapFromParentMap(parentMap) {
  const childMap = {};

  Object.keys(parentMap).forEach(childId => {
    const parents = Array.isArray(parentMap[childId]) ? parentMap[childId] : [];
    parents.forEach(parentId => {
      if (!Object.prototype.hasOwnProperty.call(childMap, parentId)) {
        childMap[parentId] = [];
      }

      if (childMap[parentId].indexOf(childId) === -1) {
        childMap[parentId].push(childId);
      }
    });
  });

  return childMap;
}

function astDbtBuildEntitySignature(entity, section, mapKey, disabled) {
  const payload = {
    section: astDbtNormalizeString(section, ''),
    mapKey: astDbtNormalizeString(mapKey, ''),
    disabled: disabled === true,
    entity: astDbtIsPlainObject(entity) ? entity : {}
  };
  return astDbtDigestHex(JSON.stringify(payload));
}

function astDbtCollectManifestEntityDescriptors(manifest = {}) {
  const descriptors = [];
  const idCounts = {};
  const signatures = {};

  AST_DBT_MANIFEST_V12_SCHEMA.searchableSections.forEach(section => {
    const sectionValue = manifest[section];
    if (section === 'disabled') {
      if (!astDbtIsPlainObject(sectionValue)) {
        return;
      }

      Object.keys(sectionValue).forEach(mapKey => {
        const entries = sectionValue[mapKey];
        if (!Array.isArray(entries)) {
          return;
        }

        entries.forEach((entry, entryIdx) => {
          const finalMapKey = `${mapKey}[${entryIdx}]`;
          const uniqueId = astDbtNormalizeString(
            astDbtIsPlainObject(entry) ? entry.unique_id : '',
            finalMapKey
          );
          const uniqueIdLower = uniqueId.toLowerCase();

          if (uniqueIdLower) {
            idCounts[uniqueIdLower] = Number(idCounts[uniqueIdLower] || 0) + 1;
            signatures[uniqueIdLower] = astDbtBuildEntitySignature(entry, section, finalMapKey, true);
          }

          descriptors.push({
            section,
            mapKey: finalMapKey,
            entity: entry,
            disabled: true,
            uniqueIdLower
          });
        });
      });
      return;
    }

    if (!astDbtIsPlainObject(sectionValue)) {
      return;
    }

    Object.keys(sectionValue).forEach(mapKey => {
      const entry = sectionValue[mapKey];
      const uniqueId = astDbtNormalizeString(
        astDbtIsPlainObject(entry) ? entry.unique_id : '',
        mapKey
      );
      const uniqueIdLower = uniqueId.toLowerCase();

      if (uniqueIdLower) {
        idCounts[uniqueIdLower] = Number(idCounts[uniqueIdLower] || 0) + 1;
        signatures[uniqueIdLower] = astDbtBuildEntitySignature(entry, section, mapKey, false);
      }

      descriptors.push({
        section,
        mapKey,
        entity: entry,
        disabled: false,
        uniqueIdLower
      });
    });
  });

  const duplicateUniqueIds = [];
  Object.keys(idCounts).forEach(key => {
    if (idCounts[key] > 1) {
      duplicateUniqueIds.push(key);
      delete signatures[key];
    }
  });

  return {
    descriptors,
    signatures,
    duplicateUniqueIds
  };
}

function astDbtBuildEntityRecordsFromDescriptors(descriptors = []) {
  const entities = [];
  descriptors.forEach(descriptor => {
    const record = astDbtBuildEntityRecord(
      descriptor.section,
      descriptor.mapKey,
      descriptor.entity,
      { disabled: descriptor.disabled === true }
    );
    if (record) {
      entities.push(record);
    }
  });
  return entities;
}

function astDbtBuildManifestIndexFromEntityRecords(manifest, entities, entitySignatures = {}) {
  const byUniqueId = {};
  const bySection = {};
  const byResourceType = {};
  const byPackage = {};
  const byTag = {};
  const columnsByUniqueId = {};

  const entityTokenMap = {};
  const columnTokenMap = {};

  entities.forEach(entity => {
    astDbtAppendIndexValue(byUniqueId, entity.uniqueIdLower, entity);
    astDbtAppendIndexValue(bySection, entity.section, entity);
    astDbtAppendIndexValue(byResourceType, entity.resourceType || 'unknown', entity);
    astDbtAppendIndexValue(byPackage, entity.packageName || 'unknown', entity);

    entity.tags.forEach(tag => {
      astDbtAppendIndexValue(byTag, tag, entity);
    });

    const entityTokens = astDbtTokenizeText(entity.searchText);
    entityTokens.forEach(token => {
      astDbtAppendToken(entityTokenMap, token, entity.uniqueIdLower);
    });

    const columnEntries = astDbtIsPlainObject(entity.columns)
      ? Object.keys(entity.columns)
      : [];

    const columnIndex = {
      order: [],
      byName: {}
    };

    columnEntries.forEach(columnName => {
      const columnValue = entity.columns[columnName];
      const normalizedColumnName = astDbtNormalizeString(columnName, '');
      if (!normalizedColumnName) {
        return;
      }

      const columnLower = normalizedColumnName.toLowerCase();
      const columnRecord = {
        uniqueId: entity.uniqueId,
        uniqueIdLower: entity.uniqueIdLower,
        columnName: normalizedColumnName,
        columnNameLower: columnLower,
        section: entity.section,
        resourceType: entity.resourceType,
        packageName: entity.packageName,
        dataType: astDbtNormalizeString(
          astDbtIsPlainObject(columnValue) ? columnValue.data_type : '',
          ''
        ),
        tags: astDbtNormalizeTags(astDbtIsPlainObject(columnValue) ? columnValue.tags : []),
        meta: astDbtIsPlainObject(columnValue) && astDbtIsPlainObject(columnValue.meta)
          ? columnValue.meta
          : {},
        description: astDbtNormalizeString(
          astDbtIsPlainObject(columnValue) ? columnValue.description : '',
          ''
        ),
        raw: astDbtIsPlainObject(columnValue) ? columnValue : {}
      };

      columnIndex.order.push(normalizedColumnName);
      columnIndex.byName[columnLower] = columnRecord;

      const columnTokenId = `${entity.uniqueIdLower}::${columnLower}`;
      const columnTokens = astDbtTokenizeText(astDbtExtractColumnSearchText(normalizedColumnName, columnValue));
      columnTokens.forEach(token => {
        astDbtAppendToken(columnTokenMap, token, columnTokenId);
      });
    });

    columnsByUniqueId[entity.uniqueIdLower] = columnIndex;
  });

  let parentMap = astDbtNormalizeLineageMap(manifest.parent_map);
  let childMap = astDbtNormalizeLineageMap(manifest.child_map);

  if (Object.keys(parentMap).length === 0) {
    parentMap = astDbtBuildLineageFromDependsOn(entities);
  }

  if (Object.keys(childMap).length === 0) {
    childMap = astDbtBuildChildMapFromParentMap(parentMap);
  }

  const sectionCounts = {};
  Object.keys(bySection).forEach(section => {
    sectionCounts[section] = bySection[section].length;
  });

  return {
    generatedAt: new Date().toISOString(),
    entityCount: entities.length,
    columnCount: Object.keys(columnsByUniqueId).reduce((acc, key) => {
      const entry = columnsByUniqueId[key];
      return acc + (entry && Array.isArray(entry.order) ? entry.order.length : 0);
    }, 0),
    sectionCounts,
    entities,
    byUniqueId,
    bySection,
    byResourceType,
    byPackage,
    byTag,
    columnsByUniqueId,
    entitySignatures: astDbtIsPlainObject(entitySignatures) ? Object.assign({}, entitySignatures) : {},
    tokens: {
      entities: astDbtFinalizeTokenMap(entityTokenMap),
      columns: astDbtFinalizeTokenMap(columnTokenMap)
    },
    lineage: {
      parentMap,
      childMap
    }
  };
}

function astDbtBuildManifestIndexes(manifest = {}) {
  if (!astDbtIsPlainObject(manifest)) {
    throw new AstDbtValidationError('astDbtBuildManifestIndexes expected manifest object');
  }

  const collected = astDbtCollectManifestEntityDescriptors(manifest);
  const entities = astDbtBuildEntityRecordsFromDescriptors(collected.descriptors);
  return astDbtBuildManifestIndexFromEntityRecords(manifest, entities, collected.signatures);
}

function astDbtBuildManifestIndexesIncremental(manifest = {}, previousIndex = {}, options = {}) {
  if (!astDbtIsPlainObject(previousIndex) || !Array.isArray(previousIndex.entities)) {
    return {
      index: astDbtBuildManifestIndexes(manifest),
      incremental: {
        applied: false,
        reason: 'missing_previous_index'
      }
    };
  }

  if (!astDbtIsPlainObject(previousIndex.entitySignatures)) {
    return {
      index: astDbtBuildManifestIndexes(manifest),
      incremental: {
        applied: false,
        reason: 'missing_previous_signatures'
      }
    };
  }

  const collected = astDbtCollectManifestEntityDescriptors(manifest);
  if (collected.duplicateUniqueIds.length > 0) {
    return {
      index: astDbtBuildManifestIndexes(manifest),
      incremental: {
        applied: false,
        reason: 'duplicate_unique_ids'
      }
    };
  }

  const previousSignatures = previousIndex.entitySignatures;
  const nextSignatures = collected.signatures;
  const previousKeys = Object.keys(previousSignatures);
  const nextKeys = Object.keys(nextSignatures);

  const nextKeySet = {};
  nextKeys.forEach(key => {
    nextKeySet[key] = true;
  });

  const previousKeySet = {};
  previousKeys.forEach(key => {
    previousKeySet[key] = true;
  });

  const added = [];
  const removed = [];
  const changed = [];

  nextKeys.forEach(key => {
    if (!previousKeySet[key]) {
      added.push(key);
      return;
    }
    if (previousSignatures[key] !== nextSignatures[key]) {
      changed.push(key);
    }
  });

  previousKeys.forEach(key => {
    if (!nextKeySet[key]) {
      removed.push(key);
    }
  });

  const totalKeys = Math.max(nextKeys.length, 1);
  const changedCount = added.length + removed.length + changed.length;
  const parsedThreshold = Number(options.maxChangeRatio);
  const maxChangeRatio = Number.isFinite(parsedThreshold)
    ? Math.max(0, Math.min(1, parsedThreshold))
    : 0.8;

  if (changedCount / totalKeys > maxChangeRatio) {
    return {
      index: astDbtBuildManifestIndexes(manifest),
      incremental: {
        applied: false,
        reason: 'change_ratio_exceeded',
        changedCount,
        totalKeys
      }
    };
  }

  if (changedCount === 0) {
    const reused = Object.assign({}, previousIndex, {
      generatedAt: new Date().toISOString(),
      entitySignatures: Object.assign({}, nextSignatures)
    });

    return {
      index: reused,
      incremental: {
        applied: true,
        reused: true,
        addedCount: 0,
        removedCount: 0,
        changedCount: 0,
        unchangedCount: nextKeys.length
      }
    };
  }

  const previousEntityByUniqueId = {};
  let duplicatePreviousIndex = false;
  previousIndex.entities.forEach(entity => {
    const uniqueIdLower = astDbtNormalizeString(entity && entity.uniqueIdLower, '');
    if (!uniqueIdLower) {
      return;
    }

    if (previousEntityByUniqueId[uniqueIdLower]) {
      duplicatePreviousIndex = true;
      return;
    }

    previousEntityByUniqueId[uniqueIdLower] = entity;
  });

  if (duplicatePreviousIndex) {
    return {
      index: astDbtBuildManifestIndexes(manifest),
      incremental: {
        applied: false,
        reason: 'duplicate_previous_index'
      }
    };
  }

  const descriptorByUniqueId = {};
  collected.descriptors.forEach(descriptor => {
    if (!descriptor.uniqueIdLower || descriptorByUniqueId[descriptor.uniqueIdLower]) {
      return;
    }
    descriptorByUniqueId[descriptor.uniqueIdLower] = descriptor;
  });

  const changedSet = {};
  const removedSet = {};
  const addedSet = {};
  changed.forEach(key => {
    changedSet[key] = true;
  });
  removed.forEach(key => {
    removedSet[key] = true;
  });
  added.forEach(key => {
    addedSet[key] = true;
  });

  const mergedByUniqueId = {};

  Object.keys(previousEntityByUniqueId).forEach(key => {
    if (removedSet[key] || changedSet[key] || addedSet[key]) {
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(nextSignatures, key)) {
      return;
    }

    const previousRecord = previousEntityByUniqueId[key];
    if (previousRecord && astDbtIsPlainObject(previousRecord.columns)) {
      mergedByUniqueId[key] = previousRecord;
      return;
    }

    const descriptor = descriptorByUniqueId[key];
    if (!descriptor) {
      return;
    }
    const rebuiltRecord = astDbtBuildEntityRecord(
      descriptor.section,
      descriptor.mapKey,
      descriptor.entity,
      { disabled: descriptor.disabled === true }
    );
    if (rebuiltRecord) {
      mergedByUniqueId[key] = rebuiltRecord;
    }
  });

  added.concat(changed).forEach(key => {
    const descriptor = descriptorByUniqueId[key];
    if (!descriptor) {
      return;
    }
    const record = astDbtBuildEntityRecord(
      descriptor.section,
      descriptor.mapKey,
      descriptor.entity,
      { disabled: descriptor.disabled === true }
    );
    if (record) {
      mergedByUniqueId[key] = record;
    }
  });

  const orderedEntities = [];
  const seen = {};
  collected.descriptors.forEach(descriptor => {
    const uniqueIdLower = descriptor.uniqueIdLower;
    if (!uniqueIdLower || seen[uniqueIdLower]) {
      return;
    }
    seen[uniqueIdLower] = true;

    const record = mergedByUniqueId[uniqueIdLower];
    if (record) {
      orderedEntities.push(record);
    }
  });

  const nextIndex = astDbtBuildManifestIndexFromEntityRecords(
    manifest,
    orderedEntities,
    nextSignatures
  );

  return {
    index: nextIndex,
    incremental: {
      applied: true,
      reused: false,
      addedCount: added.length,
      removedCount: removed.length,
      changedCount: changed.length,
      unchangedCount: Math.max(0, nextKeys.length - added.length - changed.length)
    }
  };
}
