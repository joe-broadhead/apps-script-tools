function runDbtManifestSummarySmoke() {
  const ASTX = ASTLib.AST || ASTLib;
  const manifestFileId = PropertiesService.getScriptProperties().getProperty('DBT_MANIFEST_DRIVE_FILE_ID');

  if (!manifestFileId) {
    throw new Error('Missing script property DBT_MANIFEST_DRIVE_FILE_ID');
  }

  const loaded = ASTX.DBT.loadManifest({
    fileId: manifestFileId,
    options: {
      validate: 'basic',
      schemaVersion: 'v12',
      buildIndex: true
    }
  });

  const inspect = ASTX.DBT.inspectManifest({ bundle: loaded.bundle });
  const sampleModels = ASTX.DBT.listEntities({
    bundle: loaded.bundle,
    filters: { resourceTypes: ['model'] },
    page: { limit: 5, offset: 0 },
    include: { columns: 'none', meta: false, stats: true }
  });

  const summary = {
    projectName: inspect && inspect.metadata ? inspect.metadata.projectName : null,
    dbtVersion: inspect && inspect.metadata ? inspect.metadata.dbtVersion : null,
    entityCount: inspect && inspect.counts ? inspect.counts.entityCount : null,
    columnCount: inspect && inspect.counts ? inspect.counts.columnCount : null,
    sampleModelIds: Array.isArray(sampleModels && sampleModels.items)
      ? sampleModels.items.map(item => item.uniqueId).filter(Boolean)
      : []
  };

  Logger.log(JSON.stringify(summary, null, 2));
  return summary;
}
