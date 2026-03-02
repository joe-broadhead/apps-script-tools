function astDbtUniqueIdHasEnabledEntity(index, uniqueId) {
  if (!astDbtIsPlainObject(index) || !astDbtIsPlainObject(index.byUniqueId)) {
    return false;
  }

  const key = astDbtNormalizeString(uniqueId, '').toLowerCase();
  const candidates = index.byUniqueId[key] || [];
  return candidates.some(entity => entity && entity.disabled !== true);
}

function astDbtUniqueIdExists(index, uniqueId) {
  if (!astDbtIsPlainObject(index) || !astDbtIsPlainObject(index.byUniqueId)) {
    return false;
  }

  const key = astDbtNormalizeString(uniqueId, '').toLowerCase();
  const candidates = index.byUniqueId[key] || [];
  return candidates.length > 0;
}

function astDbtShouldIncludeLineageNode(index, uniqueId, includeDisabled) {
  if (!astDbtUniqueIdExists(index, uniqueId)) {
    return true;
  }

  if (includeDisabled) {
    return true;
  }

  return astDbtUniqueIdHasEnabledEntity(index, uniqueId);
}

function astDbtTraverseLineage(startUniqueId, adjacencyMap, depth, index, includeDisabled) {
  const visitedDepth = {};
  const nodes = {};
  const edges = [];
  const queue = [{ uniqueId: startUniqueId, depth: 0 }];
  let queueHead = 0;

  while (queueHead < queue.length) {
    const current = queue[queueHead];
    queue[queueHead] = undefined;
    queueHead += 1;
    const currentId = current.uniqueId;
    const currentDepth = current.depth;

    if (visitedDepth[currentId] != null && visitedDepth[currentId] <= currentDepth) {
      continue;
    }

    visitedDepth[currentId] = currentDepth;

    if (!astDbtShouldIncludeLineageNode(index, currentId, includeDisabled)) {
      continue;
    }

    nodes[currentId] = true;

    if (currentDepth >= depth) {
      continue;
    }

    const neighbors = Array.isArray(adjacencyMap[currentId]) ? adjacencyMap[currentId] : [];
    neighbors.forEach(nextId => {
      if (!astDbtShouldIncludeLineageNode(index, nextId, includeDisabled)) {
        return;
      }

      edges.push({
        from: currentId,
        to: nextId
      });

      queue.push({
        uniqueId: nextId,
        depth: currentDepth + 1
      });
    });
  }

  return {
    nodes: Object.keys(nodes),
    edges
  };
}

function astDbtBuildLineageNodes(index, uniqueIds = []) {
  return uniqueIds.map(uniqueId => {
    const entity = astDbtResolveEntityRecord(index, uniqueId);
    if (!entity) {
      return {
        uniqueId,
        exists: false
      };
    }

    return {
      uniqueId: entity.uniqueId,
      exists: true,
      section: entity.section,
      name: entity.name,
      resourceType: entity.resourceType,
      packageName: entity.packageName,
      disabled: entity.disabled === true
    };
  });
}

function astDbtLineageCore(request = {}) {
  const normalized = astDbtValidateLineageRequest(request);
  const bundle = astDbtEnsureBundle(normalized, {
    options: normalized.options
  });

  const index = bundle.index || astDbtBuildManifestIndexes(bundle.manifest);
  const originEntity = astDbtResolveEntityRecord(index, normalized.uniqueId);

  if (!originEntity) {
    throw new AstDbtNotFoundError('Entity was not found in manifest', {
      uniqueId: normalized.uniqueId
    });
  }

  const parentMap = astDbtIsPlainObject(index.lineage && index.lineage.parentMap)
    ? index.lineage.parentMap
    : {};
  const childMap = astDbtIsPlainObject(index.lineage && index.lineage.childMap)
    ? index.lineage.childMap
    : {};

  const includeUpstream = normalized.direction === 'upstream' || normalized.direction === 'both';
  const includeDownstream = normalized.direction === 'downstream' || normalized.direction === 'both';

  const upstream = includeUpstream
    ? astDbtTraverseLineage(originEntity.uniqueId, parentMap, normalized.depth, index, normalized.includeDisabled)
    : { nodes: [], edges: [] };
  const downstream = includeDownstream
    ? astDbtTraverseLineage(originEntity.uniqueId, childMap, normalized.depth, index, normalized.includeDisabled)
    : { nodes: [], edges: [] };

  const allNodeIds = Array.from(new Set([
    originEntity.uniqueId,
    ...upstream.nodes,
    ...downstream.nodes
  ]));

  const uniqueEdgeMap = {};
  const edges = [];

  upstream.edges.forEach(edge => {
    const key = `upstream::${edge.from}::${edge.to}`;
    if (uniqueEdgeMap[key]) {
      return;
    }
    uniqueEdgeMap[key] = true;
    edges.push({ from: edge.from, to: edge.to, direction: 'upstream' });
  });

  downstream.edges.forEach(edge => {
    const key = `downstream::${edge.from}::${edge.to}`;
    if (uniqueEdgeMap[key]) {
      return;
    }
    uniqueEdgeMap[key] = true;
    edges.push({ from: edge.from, to: edge.to, direction: 'downstream' });
  });

  return {
    status: 'ok',
    uniqueId: originEntity.uniqueId,
    direction: normalized.direction,
    depth: normalized.depth,
    nodes: astDbtBuildLineageNodes(index, allNodeIds),
    edges,
    stats: {
      upstreamNodeCount: upstream.nodes.length,
      downstreamNodeCount: downstream.nodes.length,
      edgeCount: edges.length
    }
  };
}

function astDbtNormalizeColumnLineageKey(value) {
  return astDbtNormalizeString(value, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function astDbtTokenizeColumnLineageText(value) {
  const source = astDbtNormalizeString(value, '').toLowerCase();
  if (!source) {
    return [];
  }

  const tokens = source
    .split(/[^a-z0-9_]+/g)
    .map(part => part.trim())
    .filter(Boolean);

  const seen = {};
  const output = [];
  tokens.forEach(token => {
    if (!seen[token]) {
      seen[token] = true;
      output.push(token);
    }
  });

  return output;
}

function astDbtTokenizeColumnLineageName(value) {
  const normalized = astDbtNormalizeColumnLineageKey(value);
  if (!normalized) {
    return [];
  }

  const tokens = normalized.split('_').map(part => part.trim()).filter(Boolean);
  const seen = {};
  const output = [];
  tokens.forEach(token => {
    if (!seen[token]) {
      seen[token] = true;
      output.push(token);
    }
  });
  return output;
}

function astDbtColumnLineageIntersectCount(left = [], right = []) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || right.length === 0) {
    return 0;
  }

  const leftSet = {};
  left.forEach(value => {
    leftSet[value] = true;
  });

  let overlap = 0;
  right.forEach(value => {
    if (leftSet[value]) {
      overlap += 1;
    }
  });
  return overlap;
}

function astDbtColumnLineageNormalizeType(value) {
  return astDbtNormalizeString(value, '').toLowerCase().replace(/\s+/g, '');
}

function astDbtColumnLineageNormalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  const seen = {};
  const output = [];
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

function astDbtColumnLineageFlattenMeta(meta, prefix = '') {
  if (!astDbtIsPlainObject(meta)) {
    return {};
  }

  const output = {};
  Object.keys(meta).forEach(key => {
    const value = meta[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (astDbtIsPlainObject(value)) {
      const nested = astDbtColumnLineageFlattenMeta(value, path);
      Object.keys(nested).forEach(nestedKey => {
        output[nestedKey] = nested[nestedKey];
      });
      return;
    }
    output[path] = value;
  });
  return output;
}

function astDbtColumnLineageMetaOverlap(sourceMeta, targetMeta) {
  const sourceFlat = astDbtColumnLineageFlattenMeta(sourceMeta);
  const targetFlat = astDbtColumnLineageFlattenMeta(targetMeta);
  const sourceKeys = Object.keys(sourceFlat);

  if (sourceKeys.length === 0 || Object.keys(targetFlat).length === 0) {
    return 0;
  }

  let overlap = 0;
  sourceKeys.forEach(key => {
    if (!Object.prototype.hasOwnProperty.call(targetFlat, key)) {
      return;
    }

    if (JSON.stringify(sourceFlat[key]) === JSON.stringify(targetFlat[key])) {
      overlap += 1;
    }
  });

  return overlap;
}

function astDbtColumnLineageLabel(score) {
  if (score >= 0.85) {
    return 'high';
  }
  if (score >= 0.65) {
    return 'medium';
  }
  return 'low';
}

function astDbtColumnLineageBuildNodeKey(uniqueId, columnNameLower) {
  return `${uniqueId}::${columnNameLower}`;
}

function astDbtColumnLineageListColumns(index, uniqueId) {
  if (!astDbtIsPlainObject(index) || !astDbtIsPlainObject(index.columnsByUniqueId)) {
    return [];
  }

  const uniqueIdLower = astDbtNormalizeString(uniqueId, '').toLowerCase();
  if (!uniqueIdLower) {
    return [];
  }

  const columnIndex = index.columnsByUniqueId[uniqueIdLower];
  if (!columnIndex || !Array.isArray(columnIndex.order) || !astDbtIsPlainObject(columnIndex.byName)) {
    return [];
  }

  return columnIndex.order
    .map(columnName => columnIndex.byName[astDbtNormalizeString(columnName, '').toLowerCase()])
    .filter(Boolean);
}

function astDbtScoreColumnLineageCandidate(sourceColumn, targetColumn) {
  const sourceName = astDbtNormalizeString(sourceColumn && sourceColumn.columnName, '');
  const targetName = astDbtNormalizeString(targetColumn && targetColumn.columnName, '');
  const sourceNameLower = sourceName.toLowerCase();
  const targetNameLower = targetName.toLowerCase();

  if (!sourceName || !targetName) {
    return {
      confidence: 0,
      reasons: [],
      breakdown: {}
    };
  }

  const reasons = [];
  const breakdown = {
    name: 0,
    type: 0,
    tags: 0,
    meta: 0,
    description: 0
  };

  if (sourceNameLower === targetNameLower) {
    reasons.push('exact_name');
    return {
      confidence: 1,
      reasons,
      breakdown: {
        name: 1,
        type: 0,
        tags: 0,
        meta: 0,
        description: 0
      }
    };
  }

  const sourceNameNormalized = astDbtNormalizeColumnLineageKey(sourceNameLower);
  const targetNameNormalized = astDbtNormalizeColumnLineageKey(targetNameLower);

  if (sourceNameNormalized && sourceNameNormalized === targetNameNormalized) {
    reasons.push('normalized_name');
    breakdown.name = 0.94;
  } else {
    const sourceTokens = astDbtTokenizeColumnLineageName(sourceNameNormalized);
    const targetTokens = astDbtTokenizeColumnLineageName(targetNameNormalized);
    const overlap = astDbtColumnLineageIntersectCount(sourceTokens, targetTokens);
    if (overlap > 0) {
      const union = sourceTokens.length + targetTokens.length - overlap;
      const jaccard = union > 0 ? overlap / union : 0;
      const containment = overlap / Math.max(1, Math.min(sourceTokens.length, targetTokens.length));
      const prefixOrSuffixMatch = sourceNameNormalized
        && targetNameNormalized
        && (
          sourceNameNormalized.indexOf(targetNameNormalized) === 0
          || targetNameNormalized.indexOf(sourceNameNormalized) === 0
          || sourceNameNormalized.endsWith(targetNameNormalized)
          || targetNameNormalized.endsWith(sourceNameNormalized)
        );

      breakdown.name = Math.max(
        breakdown.name,
        (jaccard * 0.4) + (containment * 0.38) + (prefixOrSuffixMatch ? 0.12 : 0)
      );
      reasons.push('token_overlap');
      if (prefixOrSuffixMatch) {
        reasons.push('prefix_suffix_overlap');
      }
    } else if (sourceNameNormalized.endsWith('_id') && targetNameNormalized.endsWith('_id')) {
      breakdown.name = Math.max(breakdown.name, 0.34);
      reasons.push('id_suffix');
    }
  }

  const sourceType = astDbtColumnLineageNormalizeType(sourceColumn.dataType);
  const targetType = astDbtColumnLineageNormalizeType(targetColumn.dataType);
  if (sourceType && targetType) {
    if (sourceType === targetType) {
      breakdown.type = 0.08;
      reasons.push('data_type_match');
    } else if (sourceType.indexOf(targetType) !== -1 || targetType.indexOf(sourceType) !== -1) {
      breakdown.type = 0.03;
      reasons.push('data_type_partial_match');
    }
  }

  const sourceTags = astDbtColumnLineageNormalizeTags(sourceColumn.tags);
  const targetTags = astDbtColumnLineageNormalizeTags(targetColumn.tags);
  const tagOverlap = astDbtColumnLineageIntersectCount(sourceTags, targetTags);
  if (tagOverlap > 0) {
    breakdown.tags = Math.min(0.06, (tagOverlap / Math.max(sourceTags.length, targetTags.length)) * 0.06);
    reasons.push('tag_overlap');
  }

  const metaOverlap = astDbtColumnLineageMetaOverlap(sourceColumn.meta, targetColumn.meta);
  if (metaOverlap > 0) {
    breakdown.meta = Math.min(0.05, metaOverlap * 0.02);
    reasons.push('meta_overlap');
  }

  const sourceDescriptionTokens = astDbtTokenizeColumnLineageText(sourceColumn.description);
  const targetDescriptionTokens = astDbtTokenizeColumnLineageText(targetColumn.description);
  const descriptionOverlap = astDbtColumnLineageIntersectCount(sourceDescriptionTokens, targetDescriptionTokens);
  if (descriptionOverlap > 0) {
    breakdown.description = Math.min(0.04, descriptionOverlap * 0.01);
    reasons.push('description_overlap');
  }

  const confidence = Math.min(
    1,
    Math.max(
      0,
      breakdown.name + breakdown.type + breakdown.tags + breakdown.meta + breakdown.description
    )
  );

  return {
    confidence,
    reasons,
    breakdown
  };
}

function astDbtFindColumnLineageMatches(sourceColumn, targetColumns, options, stats) {
  if (!sourceColumn || !Array.isArray(targetColumns) || targetColumns.length === 0) {
    return [];
  }

  const matches = [];
  targetColumns.forEach(targetColumn => {
    if (stats) {
      stats.scannedColumnCandidates += 1;
    }

    const score = astDbtScoreColumnLineageCandidate(sourceColumn, targetColumn);
    if (score.confidence < options.confidenceThreshold) {
      return;
    }

    matches.push({
      column: targetColumn,
      confidence: score.confidence,
      confidenceLabel: astDbtColumnLineageLabel(score.confidence),
      reasons: score.reasons,
      breakdown: score.breakdown
    });
  });

  matches.sort((left, right) => {
    if (right.confidence !== left.confidence) {
      return right.confidence - left.confidence;
    }
    return astDbtNormalizeString(left.column.columnName, '').localeCompare(
      astDbtNormalizeString(right.column.columnName, '')
    );
  });

  return matches.slice(0, options.maxMatchesPerEdge);
}

function astDbtColumnLineageResolveMaps(index) {
  return {
    parentMap: astDbtIsPlainObject(index.lineage && index.lineage.parentMap)
      ? index.lineage.parentMap
      : {},
    childMap: astDbtIsPlainObject(index.lineage && index.lineage.childMap)
      ? index.lineage.childMap
      : {}
  };
}

function astDbtColumnLineageShouldUpdateState(existing, nextDepth, nextPathConfidence) {
  if (!existing) {
    return true;
  }

  if (nextDepth < existing.depth) {
    return true;
  }

  if (nextDepth === existing.depth && nextPathConfidence > existing.pathConfidence) {
    return true;
  }

  return false;
}

function astDbtColumnLineageBuildState(uniqueId, column, depth, pathConfidence) {
  return {
    key: astDbtColumnLineageBuildNodeKey(uniqueId, column.columnNameLower),
    uniqueId,
    columnName: column.columnName,
    columnNameLower: column.columnNameLower,
    column,
    depth,
    pathConfidence
  };
}

function astDbtColumnLineageMergeNode(targetNodes, sourceState) {
  const existing = targetNodes[sourceState.key];
  if (!existing || sourceState.depth < existing.depth || sourceState.pathConfidence > existing.pathConfidence) {
    targetNodes[sourceState.key] = sourceState;
  }
}

function astDbtColumnLineageTraverseDirection(originState, adjacencyMap, direction, index, normalized) {
  const queue = [originState];
  const statesByKey = {};
  const nodesByKey = {};
  const edgesByKey = {};
  const stats = {
    traversedEntityEdges: 0,
    scannedColumnCandidates: 0
  };

  statesByKey[originState.key] = originState;
  nodesByKey[originState.key] = originState;

  let queueHead = 0;
  while (queueHead < queue.length) {
    const state = queue[queueHead];
    queue[queueHead] = undefined;
    queueHead += 1;

    if (state.depth >= normalized.depth) {
      continue;
    }

    const neighbors = Array.isArray(adjacencyMap[state.uniqueId]) ? adjacencyMap[state.uniqueId] : [];
    for (let idx = 0; idx < neighbors.length; idx += 1) {
      const nextUniqueId = astDbtNormalizeString(neighbors[idx], '');
      if (!nextUniqueId) {
        continue;
      }

      if (!astDbtShouldIncludeLineageNode(index, nextUniqueId, normalized.includeDisabled)) {
        continue;
      }

      const targetColumns = astDbtColumnLineageListColumns(index, nextUniqueId);
      if (targetColumns.length === 0) {
        continue;
      }

      stats.traversedEntityEdges += 1;

      const matches = astDbtFindColumnLineageMatches(state.column, targetColumns, normalized, stats);
      matches.forEach(match => {
        const nextDepth = state.depth + 1;
        const nextPathConfidence = Math.min(state.pathConfidence, match.confidence);
        const nextState = astDbtColumnLineageBuildState(nextUniqueId, match.column, nextDepth, nextPathConfidence);

        if (astDbtColumnLineageShouldUpdateState(statesByKey[nextState.key], nextDepth, nextPathConfidence)) {
          statesByKey[nextState.key] = nextState;
          queue.push(nextState);
        }

        astDbtColumnLineageMergeNode(nodesByKey, nextState);

        const edgeKey = `${direction}::${state.key}::${nextState.key}`;
        const existingEdge = edgesByKey[edgeKey];
        if (!existingEdge || match.confidence > existingEdge.confidence || nextDepth < existingEdge.depth) {
          edgesByKey[edgeKey] = {
            direction,
            depth: nextDepth,
            confidence: match.confidence,
            confidenceLabel: match.confidenceLabel,
            pathConfidence: nextPathConfidence,
            reasons: match.reasons.slice(),
            breakdown: astDbtJsonClone(match.breakdown),
            from: {
              uniqueId: state.uniqueId,
              columnName: state.columnName
            },
            to: {
              uniqueId: nextState.uniqueId,
              columnName: nextState.columnName
            }
          };
        }
      });
    }
  }

  return {
    nodesByKey,
    edges: Object.values(edgesByKey),
    stats
  };
}

function astDbtColumnLineageBuildNodes(index, nodesByKey, originKey, includeRaw) {
  const nodes = Object.values(nodesByKey).map(state => {
    const entity = astDbtResolveEntityRecord(index, state.uniqueId);
    const column = astDbtResolveColumnRecord(index, state.uniqueId, state.columnName) || state.column;

    const output = {
      id: state.key,
      uniqueId: state.uniqueId,
      columnName: state.columnName,
      section: entity ? entity.section : '',
      resourceType: entity ? entity.resourceType : '',
      packageName: entity ? entity.packageName : '',
      dataType: column ? column.dataType : '',
      tags: column ? column.tags.slice() : [],
      description: column ? column.description : '',
      depth: state.depth,
      confidence: state.pathConfidence,
      confidenceLabel: astDbtColumnLineageLabel(state.pathConfidence),
      origin: state.key === originKey
    };

    if (entity) {
      output.disabled = entity.disabled === true;
    }

    if (includeRaw) {
      output.meta = column ? astDbtJsonClone(column.meta || {}) : {};
      output.raw = {
        entity: entity ? astDbtJsonClone(entity.raw || {}) : {},
        column: column ? astDbtJsonClone(column.raw || {}) : {}
      };
    }

    return output;
  });

  nodes.sort((left, right) => {
    if (left.depth !== right.depth) {
      return left.depth - right.depth;
    }
    if (right.confidence !== left.confidence) {
      return right.confidence - left.confidence;
    }
    const uniqueCompare = astDbtNormalizeString(left.uniqueId, '').localeCompare(astDbtNormalizeString(right.uniqueId, ''));
    if (uniqueCompare !== 0) {
      return uniqueCompare;
    }
    return astDbtNormalizeString(left.columnName, '').localeCompare(astDbtNormalizeString(right.columnName, ''));
  });

  return nodes;
}

function astDbtColumnLineageBuildEdges(edges, includeRaw) {
  const output = edges.map(edge => {
    const item = {
      direction: edge.direction,
      depth: edge.depth,
      confidence: edge.confidence,
      confidenceLabel: edge.confidenceLabel,
      pathConfidence: edge.pathConfidence,
      matchedBy: edge.reasons && edge.reasons.length > 0 ? edge.reasons[0] : 'heuristic',
      reasons: edge.reasons ? edge.reasons.slice() : [],
      from: {
        uniqueId: edge.from.uniqueId,
        columnName: edge.from.columnName
      },
      to: {
        uniqueId: edge.to.uniqueId,
        columnName: edge.to.columnName
      }
    };

    if (includeRaw) {
      item.raw = {
        breakdown: astDbtJsonClone(edge.breakdown || {})
      };
    }

    return item;
  });

  output.sort((left, right) => {
    if (left.depth !== right.depth) {
      return left.depth - right.depth;
    }
    if (right.confidence !== left.confidence) {
      return right.confidence - left.confidence;
    }

    const leftFrom = `${left.from.uniqueId}::${left.from.columnName}`;
    const rightFrom = `${right.from.uniqueId}::${right.from.columnName}`;
    const fromCompare = leftFrom.localeCompare(rightFrom);
    if (fromCompare !== 0) {
      return fromCompare;
    }

    const leftTo = `${left.to.uniqueId}::${left.to.columnName}`;
    const rightTo = `${right.to.uniqueId}::${right.to.columnName}`;
    return leftTo.localeCompare(rightTo);
  });

  return output;
}

function astDbtColumnLineageCore(request = {}) {
  const normalized = astDbtValidateColumnLineageRequest(request);
  const bundle = astDbtEnsureBundle(normalized, {
    options: normalized.options
  });

  const index = bundle.index || astDbtBuildManifestIndexes(bundle.manifest);
  const originEntity = astDbtResolveEntityRecord(index, normalized.uniqueId);

  if (!originEntity) {
    throw new AstDbtNotFoundError('Entity was not found in manifest', {
      uniqueId: normalized.uniqueId
    });
  }

  const originColumn = astDbtResolveColumnRecord(index, originEntity.uniqueId, normalized.columnName);
  if (!originColumn) {
    throw new AstDbtNotFoundError('Column was not found in manifest entity', {
      uniqueId: originEntity.uniqueId,
      columnName: normalized.columnName
    });
  }

  const originState = astDbtColumnLineageBuildState(originEntity.uniqueId, originColumn, 0, 1);
  const lineageMaps = astDbtColumnLineageResolveMaps(index);

  const includeUpstream = normalized.direction === 'upstream' || normalized.direction === 'both';
  const includeDownstream = normalized.direction === 'downstream' || normalized.direction === 'both';

  const upstream = includeUpstream
    ? astDbtColumnLineageTraverseDirection(originState, lineageMaps.parentMap, 'upstream', index, normalized)
    : { nodesByKey: {}, edges: [], stats: { traversedEntityEdges: 0, scannedColumnCandidates: 0 } };
  const downstream = includeDownstream
    ? astDbtColumnLineageTraverseDirection(originState, lineageMaps.childMap, 'downstream', index, normalized)
    : { nodesByKey: {}, edges: [], stats: { traversedEntityEdges: 0, scannedColumnCandidates: 0 } };

  const mergedNodes = {};
  astDbtColumnLineageMergeNode(mergedNodes, originState);

  Object.values(upstream.nodesByKey).forEach(state => {
    astDbtColumnLineageMergeNode(mergedNodes, state);
  });
  Object.values(downstream.nodesByKey).forEach(state => {
    astDbtColumnLineageMergeNode(mergedNodes, state);
  });

  const mergedEdges = upstream.edges.concat(downstream.edges);
  const nodes = astDbtColumnLineageBuildNodes(index, mergedNodes, originState.key, normalized.include.raw);
  const edges = astDbtColumnLineageBuildEdges(mergedEdges, normalized.include.raw);

  const response = {
    status: 'ok',
    uniqueId: originEntity.uniqueId,
    columnName: originColumn.columnName,
    direction: normalized.direction,
    depth: normalized.depth,
    confidenceThreshold: normalized.confidenceThreshold,
    maxMatchesPerEdge: normalized.maxMatchesPerEdge,
    nodes,
    edges
  };

  if (normalized.include.stats) {
    response.stats = {
      traversedEntityEdges: upstream.stats.traversedEntityEdges + downstream.stats.traversedEntityEdges,
      scannedColumnCandidates: upstream.stats.scannedColumnCandidates + downstream.stats.scannedColumnCandidates,
      nodeCount: nodes.length,
      edgeCount: edges.length
    };
  }

  return response;
}
