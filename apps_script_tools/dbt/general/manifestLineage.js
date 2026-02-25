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

  while (queue.length > 0) {
    const current = queue.shift();
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
