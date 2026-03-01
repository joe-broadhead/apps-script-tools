function astDbtResolveGovernanceBundle(normalizedRequest = {}) {
  return astDbtEnsureBundle(normalizedRequest, {
    options: Object.assign({}, normalizedRequest.options || {}, {
      validate: 'off'
    })
  });
}

function astDbtCollectGovernanceEntities(index = {}, filters = {}, includeDisabled = false) {
  const entities = Array.isArray(index.entities) ? index.entities : [];
  const output = [];

  for (let idx = 0; idx < entities.length; idx += 1) {
    const entity = entities[idx];
    if (!entity) {
      continue;
    }

    if (!includeDisabled && entity.disabled) {
      continue;
    }

    if (!astDbtEntityMatchesFilters(entity, filters)) {
      continue;
    }

    output.push(entity);
  }

  return output;
}

function astDbtGetGovernanceEntityColumns(index = {}, entity = {}) {
  if (!entity || !entity.uniqueIdLower) {
    return [];
  }

  const columnIndex = index.columnsByUniqueId && index.columnsByUniqueId[entity.uniqueIdLower];
  if (!columnIndex || !Array.isArray(columnIndex.order) || !astDbtIsPlainObject(columnIndex.byName)) {
    return [];
  }

  const output = [];
  for (let idx = 0; idx < columnIndex.order.length; idx += 1) {
    const columnName = columnIndex.order[idx];
    const columnLower = astDbtNormalizeString(columnName, '').toLowerCase();
    if (!columnLower) {
      continue;
    }

    const column = columnIndex.byName[columnLower];
    if (column) {
      output.push(column);
    }
  }

  return output;
}

function astDbtResolveOwnerLabel(meta = {}, ownerPaths = [], fallbackLabel = 'unassigned') {
  for (let idx = 0; idx < ownerPaths.length; idx += 1) {
    const path = ownerPaths[idx];
    const value = astDbtGetMetaValue(meta, path);
    const normalized = astDbtNormalizeString(
      value == null ? '' : (typeof value === 'string' ? value : JSON.stringify(value)),
      ''
    );
    if (normalized) {
      return normalized;
    }
  }

  return fallbackLabel;
}

function astDbtBuildEntityCoverageMap(index = {}, includeDisabled = false) {
  const entities = Array.isArray(index.entities) ? index.entities : [];
  const testCoverage = {};

  for (let idx = 0; idx < entities.length; idx += 1) {
    const entity = entities[idx];
    if (!entity || entity.resourceType !== 'test') {
      continue;
    }

    if (!includeDisabled && entity.disabled) {
      continue;
    }

    const dependencies = Array.isArray(entity.dependsOnNodes) ? entity.dependsOnNodes : [];
    for (let depIdx = 0; depIdx < dependencies.length; depIdx += 1) {
      const dependency = astDbtNormalizeString(dependencies[depIdx], '').toLowerCase();
      if (!dependency) {
        continue;
      }
      testCoverage[dependency] = (testCoverage[dependency] || 0) + 1;
    }
  }

  return testCoverage;
}

function astDbtPercent(numerator, denominator) {
  if (!denominator || denominator <= 0) {
    return 100;
  }

  return Number(((numerator / denominator) * 100).toFixed(2));
}

function astDbtSortByUniqueId(items = []) {
  return items.sort((left, right) => {
    const leftId = astDbtNormalizeString(left && left.uniqueId, '');
    const rightId = astDbtNormalizeString(right && right.uniqueId, '');
    return leftId.localeCompare(rightId);
  });
}

function astDbtBuildGapEntity(entity = {}) {
  return {
    uniqueId: entity.uniqueId,
    name: entity.name,
    resourceType: entity.resourceType,
    packageName: entity.packageName,
    path: entity.path
  };
}

function astDbtQualityReportCore(request = {}) {
  const startedAt = Date.now();
  const normalized = astDbtValidateQualityReportRequest(request);
  const bundle = astDbtResolveGovernanceBundle(normalized);
  const index = bundle.index || {};

  const entities = astDbtCollectGovernanceEntities(index, normalized.filters, normalized.includeDisabled);
  const testCoverageMap = astDbtBuildEntityCoverageMap(index, normalized.includeDisabled);

  let documentedEntities = 0;
  let ownedEntities = 0;
  let testedEntities = 0;
  let totalColumns = 0;
  let documentedColumns = 0;

  const undocumentedEntities = [];
  const unownedEntities = [];
  const untestedEntities = [];
  const undocumentedColumns = [];

  for (let idx = 0; idx < entities.length; idx += 1) {
    const entity = entities[idx];
    const hasDescription = Boolean(astDbtNormalizeString(entity.description, ''));
    if (hasDescription) {
      documentedEntities += 1;
    } else {
      undocumentedEntities.push(astDbtBuildGapEntity(entity));
    }

    const ownerLabel = astDbtResolveOwnerLabel(entity.meta, normalized.ownerPaths, normalized.unassignedOwnerLabel);
    if (ownerLabel !== normalized.unassignedOwnerLabel) {
      ownedEntities += 1;
    } else {
      unownedEntities.push(astDbtBuildGapEntity(entity));
    }

    const testsCount = testCoverageMap[entity.uniqueIdLower] || 0;
    if (testsCount > 0) {
      testedEntities += 1;
    } else {
      untestedEntities.push(astDbtBuildGapEntity(entity));
    }

    const columns = astDbtGetGovernanceEntityColumns(index, entity);
    totalColumns += columns.length;
    for (let colIdx = 0; colIdx < columns.length; colIdx += 1) {
      const column = columns[colIdx];
      const columnHasDescription = Boolean(astDbtNormalizeString(column.description, ''));
      if (columnHasDescription) {
        documentedColumns += 1;
      } else {
        undocumentedColumns.push({
          uniqueId: entity.uniqueId,
          columnName: column.columnName,
          dataType: column.dataType
        });
      }
    }
  }

  const entityDocumentationCoveragePct = astDbtPercent(documentedEntities, entities.length);
  const columnDocumentationCoveragePct = astDbtPercent(documentedColumns, totalColumns);
  const ownershipCoveragePct = astDbtPercent(ownedEntities, entities.length);
  const testCoveragePct = astDbtPercent(testedEntities, entities.length);
  const readinessScore = Number((
    ((entityDocumentationCoveragePct + columnDocumentationCoveragePct) / 2) * 0.4 +
    ownershipCoveragePct * 0.3 +
    testCoveragePct * 0.3
  ).toFixed(2));

  return {
    status: 'ok',
    scope: {
      includeDisabled: normalized.includeDisabled,
      ownerPaths: normalized.ownerPaths.slice(),
      filters: astDbtJsonClone(normalized.filters || {})
    },
    summary: {
      entityCount: entities.length,
      columnCount: totalColumns,
      readinessScore,
      coverage: {
        entityDocumentationPct: entityDocumentationCoveragePct,
        columnDocumentationPct: columnDocumentationCoveragePct,
        ownershipPct: ownershipCoveragePct,
        testedEntitiesPct: testCoveragePct
      },
      counts: {
        documentedEntities,
        undocumentedEntities: Math.max(entities.length - documentedEntities, 0),
        documentedColumns,
        undocumentedColumns: Math.max(totalColumns - documentedColumns, 0),
        ownedEntities,
        unownedEntities: Math.max(entities.length - ownedEntities, 0),
        testedEntities,
        untestedEntities: Math.max(entities.length - testedEntities, 0)
      }
    },
    gaps: {
      undocumentedEntities: astDbtSortByUniqueId(undocumentedEntities).slice(0, normalized.topK),
      undocumentedColumns: undocumentedColumns.slice(0, normalized.topK),
      unownedEntities: astDbtSortByUniqueId(unownedEntities).slice(0, normalized.topK),
      untestedEntities: astDbtSortByUniqueId(untestedEntities).slice(0, normalized.topK)
    },
    stats: {
      scannedEntities: entities.length,
      elapsedMs: Date.now() - startedAt
    }
  };
}

function astDbtTestCoverageCore(request = {}) {
  const startedAt = Date.now();
  const normalized = astDbtValidateTestCoverageRequest(request);
  const bundle = astDbtResolveGovernanceBundle(normalized);
  const index = bundle.index || {};

  const entities = astDbtCollectGovernanceEntities(index, normalized.filters, normalized.includeDisabled);
  const testCoverageMap = astDbtBuildEntityCoverageMap(index, normalized.includeDisabled);
  const items = [];
  let coveredCount = 0;
  let uncoveredCount = 0;

  for (let idx = 0; idx < entities.length; idx += 1) {
    const entity = entities[idx];
    const testsCount = testCoverageMap[entity.uniqueIdLower] || 0;
    const covered = testsCount > 0;

    if (covered) {
      coveredCount += 1;
    } else {
      uncoveredCount += 1;
    }

    if (normalized.uncoveredOnly && covered) {
      continue;
    }

    items.push({
      uniqueId: entity.uniqueId,
      name: entity.name,
      resourceType: entity.resourceType,
      packageName: entity.packageName,
      covered,
      testsCount
    });
  }

  items.sort((left, right) => {
    if (left.covered !== right.covered) {
      return left.covered ? 1 : -1;
    }
    return left.uniqueId.localeCompare(right.uniqueId);
  });

  return {
    status: 'ok',
    summary: {
      entityCount: entities.length,
      coveredCount,
      uncoveredCount,
      coveragePct: astDbtPercent(coveredCount, entities.length)
    },
    items: items.slice(0, normalized.topK),
    stats: {
      scannedEntities: entities.length,
      returned: Math.min(items.length, normalized.topK),
      elapsedMs: Date.now() - startedAt
    }
  };
}

function astDbtOwnersCore(request = {}) {
  const startedAt = Date.now();
  const normalized = astDbtValidateOwnersRequest(request);
  const bundle = astDbtResolveGovernanceBundle(normalized);
  const index = bundle.index || {};

  const entities = astDbtCollectGovernanceEntities(index, normalized.filters, normalized.includeDisabled);
  const grouped = {};

  for (let idx = 0; idx < entities.length; idx += 1) {
    const entity = entities[idx];
    const owner = astDbtResolveOwnerLabel(entity.meta, normalized.ownerPaths, normalized.unassignedOwnerLabel);

    if (!grouped[owner]) {
      grouped[owner] = {
        owner,
        entityCount: 0,
        resourceTypes: {},
        packages: {}
      };
    }

    grouped[owner].entityCount += 1;
    const typeKey = entity.resourceType || 'unknown';
    grouped[owner].resourceTypes[typeKey] = (grouped[owner].resourceTypes[typeKey] || 0) + 1;
    const packageKey = entity.packageName || 'unknown';
    grouped[owner].packages[packageKey] = (grouped[owner].packages[packageKey] || 0) + 1;
  }

  const items = Object.keys(grouped).map(owner => grouped[owner]);
  items.sort((left, right) => {
    if (right.entityCount !== left.entityCount) {
      return right.entityCount - left.entityCount;
    }
    return left.owner.localeCompare(right.owner);
  });

  const unassigned = grouped[normalized.unassignedOwnerLabel];

  return {
    status: 'ok',
    summary: {
      entityCount: entities.length,
      ownerCount: items.length,
      unassignedEntities: unassigned ? unassigned.entityCount : 0
    },
    items: items.slice(0, normalized.topK),
    stats: {
      scannedEntities: entities.length,
      returned: Math.min(items.length, normalized.topK),
      elapsedMs: Date.now() - startedAt
    }
  };
}
