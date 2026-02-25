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

function astDbtBuildManifestIndexes(manifest = {}) {
  if (!astDbtIsPlainObject(manifest)) {
    throw new AstDbtValidationError('astDbtBuildManifestIndexes expected manifest object');
  }

  const entities = [];
  const byUniqueId = {};
  const bySection = {};
  const byResourceType = {};
  const byPackage = {};
  const byTag = {};
  const columnsByUniqueId = {};

  const entityTokenMap = {};
  const columnTokenMap = {};

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
          const record = astDbtBuildEntityRecord(section, `${mapKey}[${entryIdx}]`, entry, {
            disabled: true
          });
          if (!record) {
            return;
          }

          entities.push(record);
        });
      });
      return;
    }

    if (!astDbtIsPlainObject(sectionValue)) {
      return;
    }

    Object.keys(sectionValue).forEach(mapKey => {
      const record = astDbtBuildEntityRecord(section, mapKey, sectionValue[mapKey], {
        disabled: false
      });
      if (!record) {
        return;
      }

      entities.push(record);
    });
  });

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
