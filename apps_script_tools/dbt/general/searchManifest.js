function astDbtLower(value) {
  return astDbtNormalizeString(value, '').toLowerCase();
}

function astDbtGetMetaValue(meta, path) {
  if (!astDbtIsPlainObject(meta)) {
    return null;
  }

  const parts = astDbtNormalizeString(path, '').split('.').filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  let current = meta;
  for (let idx = 0; idx < parts.length; idx += 1) {
    const key = parts[idx];
    if (!current || !Object.prototype.hasOwnProperty.call(current, key)) {
      return null;
    }
    current = current[key];
  }

  return current;
}

function astDbtEvaluateMetaFilter(meta, filter) {
  const value = astDbtGetMetaValue(meta, filter.path);

  if (filter.op === 'exists') {
    return value != null;
  }

  if (value == null) {
    return false;
  }

  if (filter.op === 'eq') {
    return JSON.stringify(value) === JSON.stringify(filter.value);
  }

  if (filter.op === 'neq') {
    return JSON.stringify(value) !== JSON.stringify(filter.value);
  }

  if (filter.op === 'contains') {
    return astDbtLower(String(value)).indexOf(astDbtLower(String(filter.value))) !== -1;
  }

  if (filter.op === 'in') {
    if (!Array.isArray(filter.value)) {
      return false;
    }

    return filter.value.some(item => JSON.stringify(item) === JSON.stringify(value));
  }

  return false;
}

function astDbtEvaluateMetaFilters(meta, filters = []) {
  for (let idx = 0; idx < filters.length; idx += 1) {
    if (!astDbtEvaluateMetaFilter(meta, filters[idx])) {
      return false;
    }
  }

  return true;
}

function astDbtTagsContainAll(entityTags, requiredTags = []) {
  if (requiredTags.length === 0) {
    return true;
  }

  const set = {};
  entityTags.forEach(tag => {
    set[tag] = true;
  });

  return requiredTags.every(tag => Boolean(set[tag]));
}

function astDbtTagsContainAny(entityTags, anyTags = []) {
  if (anyTags.length === 0) {
    return true;
  }

  const set = {};
  entityTags.forEach(tag => {
    set[tag] = true;
  });

  return anyTags.some(tag => Boolean(set[tag]));
}

function astDbtEntityMatchesFilters(entity, filters = {}) {
  if (filters.resourceTypes.length > 0 && filters.resourceTypes.indexOf(entity.resourceType) === -1) {
    return false;
  }

  if (filters.sections.length > 0 && filters.sections.indexOf(entity.section) === -1) {
    return false;
  }

  if (filters.packageNames.length > 0 && filters.packageNames.indexOf(entity.packageName) === -1) {
    return false;
  }

  if (filters.pathPrefix && astDbtNormalizeString(entity.path, '').indexOf(filters.pathPrefix) !== 0) {
    return false;
  }

  if (filters.uniqueIds.length > 0 && filters.uniqueIds.indexOf(entity.uniqueId) === -1) {
    return false;
  }

  if (filters.dependsOnUniqueIds.length > 0) {
    const dependsSet = {};
    entity.dependsOnNodes.forEach(uniqueId => {
      dependsSet[uniqueId] = true;
    });

    const hasAny = filters.dependsOnUniqueIds.some(uniqueId => Boolean(dependsSet[uniqueId]));
    if (!hasAny) {
      return false;
    }
  }

  if (!astDbtTagsContainAny(entity.tags, filters.tagsAny)) {
    return false;
  }

  if (!astDbtTagsContainAll(entity.tags, filters.tagsAll)) {
    return false;
  }

  if (!astDbtEvaluateMetaFilters(entity.meta, filters.meta)) {
    return false;
  }

  return true;
}

function astDbtColumnMatchesFilters(column, filters = {}) {
  if (filters.namesAny.length > 0 && filters.namesAny.indexOf(column.columnNameLower) === -1) {
    return false;
  }

  if (filters.dataTypesAny.length > 0 && filters.dataTypesAny.indexOf(astDbtLower(column.dataType)) === -1) {
    return false;
  }

  if (!astDbtEvaluateMetaFilters(column.meta, filters.meta)) {
    return false;
  }

  return true;
}

function astDbtScoreEntity(entity, query, queryTokens) {
  if (!query && queryTokens.length === 0) {
    return 0;
  }

  const normalizedQuery = astDbtLower(query);
  let score = 0;

  if (normalizedQuery && entity.uniqueIdLower === normalizedQuery) {
    score += 100;
  }

  queryTokens.forEach(token => {
    if (entity.uniqueIdLower === token) {
      score += 80;
    } else if (entity.uniqueIdLower.indexOf(token) !== -1) {
      score += 40;
    }

    if (astDbtLower(entity.name).indexOf(token) !== -1) {
      score += 30;
    }

    if (astDbtLower(entity.path).indexOf(token) !== -1) {
      score += 20;
    }

    if (astDbtLower(entity.resourceType).indexOf(token) !== -1) {
      score += 15;
    }

    if (entity.tags.some(tag => tag.indexOf(token) !== -1)) {
      score += 15;
    }

    if (astDbtLower(entity.description).indexOf(token) !== -1) {
      score += 10;
    }

    if (astDbtLower(entity.searchText).indexOf(token) !== -1) {
      score += 8;
    }
  });

  return score;
}

function astDbtScoreColumn(entity, column, query, queryTokens) {
  if (!query && queryTokens.length === 0) {
    return 0;
  }

  const normalizedQuery = astDbtLower(query);
  let score = 0;

  if (normalizedQuery && column.columnNameLower === normalizedQuery) {
    score += 90;
  }

  queryTokens.forEach(token => {
    if (column.columnNameLower === token) {
      score += 75;
    } else if (column.columnNameLower.indexOf(token) !== -1) {
      score += 45;
    }

    if (astDbtLower(column.dataType).indexOf(token) !== -1) {
      score += 20;
    }

    if (astDbtLower(column.description).indexOf(token) !== -1) {
      score += 15;
    }

    if (column.tags.some(tag => tag.indexOf(token) !== -1)) {
      score += 12;
    }

    if (astDbtLower(entity.uniqueId).indexOf(token) !== -1) {
      score += 10;
    }
  });

  return score;
}

function astDbtBuildEntitySearchItem(entity, index, include, score) {
  return {
    itemType: 'entity',
    score,
    uniqueId: entity.uniqueId,
    name: entity.name,
    section: entity.section,
    resourceType: entity.resourceType,
    packageName: entity.packageName,
    path: entity.path,
    entity: astDbtBuildEntityOutput(entity, index, include)
  };
}

function astDbtBuildColumnSearchItem(entity, column, include, score) {
  const item = {
    itemType: 'column',
    score,
    uniqueId: entity.uniqueId,
    section: entity.section,
    resourceType: entity.resourceType,
    packageName: entity.packageName,
    path: entity.path,
    column: {
      name: column.columnName,
      dataType: column.dataType,
      tags: column.tags.slice(),
      description: column.description
    }
  };

  if (include.meta) {
    item.column.meta = astDbtJsonClone(column.meta);
  }

  return item;
}

function astDbtSortSearchItems(items, sort) {
  const directionFactor = sort.direction === 'asc' ? 1 : -1;

  items.sort((left, right) => {
    let compare = 0;

    if (sort.by === 'score') {
      compare = (left.score - right.score) * directionFactor;
    } else if (sort.by === 'name') {
      const leftName = astDbtLower(left.name || (left.column && left.column.name) || left.uniqueId);
      const rightName = astDbtLower(right.name || (right.column && right.column.name) || right.uniqueId);
      compare = leftName.localeCompare(rightName) * directionFactor;
    } else if (sort.by === 'unique_id') {
      compare = astDbtLower(left.uniqueId).localeCompare(astDbtLower(right.uniqueId)) * directionFactor;
    }

    if (compare !== 0) {
      return compare;
    }

    const fallbackUniqueId = astDbtLower(left.uniqueId).localeCompare(astDbtLower(right.uniqueId));
    if (fallbackUniqueId !== 0) {
      return fallbackUniqueId;
    }

    if (left.itemType !== right.itemType) {
      return left.itemType.localeCompare(right.itemType);
    }

    const leftColumn = astDbtLower(left.column && left.column.name ? left.column.name : '');
    const rightColumn = astDbtLower(right.column && right.column.name ? right.column.name : '');
    return leftColumn.localeCompare(rightColumn);
  });
}

function astDbtBuildEntityCandidates(index, queryTokens) {
  const allEntities = Array.isArray(index.entities) ? index.entities : [];

  if (queryTokens.length === 0 || !astDbtIsPlainObject(index.tokens) || !astDbtIsPlainObject(index.tokens.entities)) {
    return allEntities;
  }

  const tokenMap = index.tokens.entities;
  const candidateUniqueIds = {};

  queryTokens.forEach(token => {
    const ids = Array.isArray(tokenMap[token]) ? tokenMap[token] : [];
    ids.forEach(id => {
      candidateUniqueIds[id] = true;
    });
  });

  const uniqueIds = Object.keys(candidateUniqueIds);
  if (uniqueIds.length === 0) {
    return allEntities;
  }

  const candidates = [];
  uniqueIds.forEach(uniqueIdLower => {
    const matches = Array.isArray(index.byUniqueId[uniqueIdLower]) ? index.byUniqueId[uniqueIdLower] : [];
    matches.forEach(match => candidates.push(match));
  });

  return candidates;
}

function astDbtBuildColumnCandidates(index, queryTokens) {
  const candidates = [];

  if (queryTokens.length > 0 && astDbtIsPlainObject(index.tokens) && astDbtIsPlainObject(index.tokens.columns)) {
    const tokenMap = index.tokens.columns;
    const uniqueRefs = {};

    queryTokens.forEach(token => {
      const refs = Array.isArray(tokenMap[token]) ? tokenMap[token] : [];
      refs.forEach(ref => {
        uniqueRefs[ref] = true;
      });
    });

    const refs = Object.keys(uniqueRefs);
    if (refs.length > 0) {
      refs.forEach(ref => {
        const parts = ref.split('::');
        if (parts.length !== 2) {
          return;
        }

        const uniqueIdLower = parts[0];
        const columnNameLower = parts[1];
        const entity = astDbtResolveEntityRecord(index, uniqueIdLower);
        if (!entity) {
          return;
        }

        const column = astDbtResolveColumnRecord(index, uniqueIdLower, columnNameLower);
        if (!column) {
          return;
        }

        candidates.push({ entity, column });
      });

      return candidates;
    }
  }

  const uniqueIds = Object.keys(index.columnsByUniqueId || {});
  uniqueIds.forEach(uniqueIdLower => {
    const columns = index.columnsByUniqueId[uniqueIdLower];
    if (!columns || !Array.isArray(columns.order)) {
      return;
    }

    const entity = astDbtResolveEntityRecord(index, uniqueIdLower);
    if (!entity) {
      return;
    }

    columns.order.forEach(columnName => {
      const column = columns.byName[columnName.toLowerCase()];
      if (!column) {
        return;
      }

      candidates.push({ entity, column });
    });
  });

  return candidates;
}

function astDbtBuildSearchQueryEcho(normalized) {
  return {
    target: normalized.target,
    query: normalized.query,
    filters: astDbtJsonClone(normalized.filters),
    sort: astDbtJsonClone(normalized.sort),
    page: astDbtJsonClone(normalized.page),
    include: astDbtJsonClone(normalized.include)
  };
}

function astDbtSearchCore(request = {}) {
  const normalized = astDbtValidateSearchRequest(request);
  const startedAt = Date.now();

  const bundle = astDbtEnsureBundle(normalized, {
    options: normalized.options
  });

  const index = bundle.index || astDbtBuildManifestIndexes(bundle.manifest);
  const queryTokens = astDbtTokenizeText(normalized.query);

  const includeEntities = normalized.target === 'entities' || normalized.target === 'all';
  const includeColumns = normalized.target === 'columns' || normalized.target === 'all';

  const items = [];
  let scannedEntities = 0;
  let scannedColumns = 0;
  let matchedEntities = 0;
  let matchedColumns = 0;

  if (includeEntities) {
    const entityCandidates = astDbtBuildEntityCandidates(index, queryTokens);

    entityCandidates.forEach(entity => {
      scannedEntities += 1;

      if (!astDbtEntityMatchesFilters(entity, normalized.filters)) {
        return;
      }

      const score = astDbtScoreEntity(entity, normalized.query, queryTokens);
      if (normalized.query && score === 0) {
        return;
      }

      items.push(astDbtBuildEntitySearchItem(entity, index, normalized.include, score));
      matchedEntities += 1;
    });
  }

  if (includeColumns) {
    const columnCandidates = astDbtBuildColumnCandidates(index, queryTokens);

    columnCandidates.forEach(candidate => {
      scannedColumns += 1;
      if (!astDbtEntityMatchesFilters(candidate.entity, normalized.filters)) {
        return;
      }

      if (!astDbtColumnMatchesFilters(candidate.column, normalized.filters.column)) {
        return;
      }

      const score = astDbtScoreColumn(candidate.entity, candidate.column, normalized.query, queryTokens);
      if (normalized.query && score === 0) {
        return;
      }

      items.push(astDbtBuildColumnSearchItem(candidate.entity, candidate.column, normalized.include, score));
      matchedColumns += 1;
    });
  }

  astDbtSortSearchItems(items, normalized.sort);

  const total = items.length;
  const offset = normalized.page.offset;
  const limit = normalized.page.limit;
  const pagedItems = items.slice(offset, offset + limit);

  const response = {
    status: 'ok',
    query: astDbtBuildSearchQueryEcho(normalized),
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
    response.stats = {
      scannedEntities,
      scannedColumns,
      matchedEntities,
      matchedColumns,
      elapsedMs: Date.now() - startedAt
    };
  }

  return response;
}

function astDbtListEntitiesCore(request = {}) {
  const normalizedRequest = astDbtIsPlainObject(request) ? request : {};
  const searchRequest = Object.assign({}, normalizedRequest, {
    target: 'entities',
    query: astDbtNormalizeString(normalizedRequest.query, '')
  });

  return astDbtSearchCore(searchRequest);
}
