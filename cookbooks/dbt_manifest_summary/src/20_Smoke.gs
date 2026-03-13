function runCookbookSmokeInternal_(ASTX, config, context) {
  const startedAtMs = Date.now();
  const live = context || cookbookBuildLiveContext_(ASTX, config);
  const sampleEntity = live.sampleEntity;
  const search = ASTX.DBT.search({
    bundle: live.loadedManifest.bundle,
    target: 'entities',
    query: sampleEntity.name || sampleEntity.uniqueId,
    page: { limit: 5, offset: 0 },
    include: { meta: true, columns: 'summary', stats: true }
  });
  const lineage = ASTX.DBT.lineage({
    bundle: live.loadedManifest.bundle,
    uniqueId: sampleEntity.uniqueId,
    direction: 'both',
    depth: 1,
    includeDisabled: false
  });
  const inlineRunResults = ASTX.DBT.loadArtifact({
    artifactType: 'run_results',
    artifact: cookbookFixtureRunResults_(),
    options: {
      validate: config.DBT_ARTIFACT_EXPLORER_VALIDATE_MODE
    }
  });
  const inspectedArtifact = ASTX.DBT.inspectArtifact({
    bundle: inlineRunResults.bundle
  });

  return {
    status: 'ok',
    cookbook: cookbookName_(),
    entrypoint: 'runCookbookSmoke',
    appName: config.DBT_ARTIFACT_EXPLORER_APP_NAME,
    durationMs: Date.now() - startedAtMs,
    manifest: {
      source: live.loadedManifest.source,
      projectName: live.inspectedManifest.metadata ? live.inspectedManifest.metadata.projectName : null,
      dbtVersion: live.inspectedManifest.metadata ? live.inspectedManifest.metadata.dbtVersion : null,
      entityCount: live.inspectedManifest.counts ? live.inspectedManifest.counts.entityCount : null,
      columnCount: live.inspectedManifest.counts ? live.inspectedManifest.counts.columnCount : null,
      cacheHit: live.loadedManifest.cache ? live.loadedManifest.cache.hit : false,
      cache: live.loadedManifest.cache || null
    },
    artifact: {
      artifactType: inspectedArtifact.artifactType,
      summary: inspectedArtifact.summary || inlineRunResults.summary || null
    },
    search: {
      returned: search.page.returned,
      total: search.page.total,
      firstUniqueId: search.items.length > 0 ? search.items[0].uniqueId : ''
    },
    sampleEntity: {
      uniqueId: sampleEntity.uniqueId,
      name: sampleEntity.name,
      columnName: live.sampleColumnName,
      column: live.column ? live.column.item : null,
      lineageNodes: Array.isArray(lineage.nodes) ? lineage.nodes.length : 0,
      lineageEdges: Array.isArray(lineage.edges) ? lineage.edges.length : 0
    }
  };
}
