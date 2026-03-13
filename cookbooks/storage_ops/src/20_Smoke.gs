function runCookbookSmokeInternal_(config) {
  const ASTX = cookbookAst_();
  cookbookConfigureStorageRuntime_(ASTX);

  const startedAtMs = Date.now();
  const fixture = cookbookBuildSmokeFixture_(config);
  const shouldMutate = Boolean(config.STORAGE_OPS_EXECUTE_WRITES);
  const output = {
    status: 'ok',
    cookbook: cookbookName_(),
    entrypoint: 'runCookbookSmoke',
    appName: config.STORAGE_OPS_APP_NAME,
    executeWrites: shouldMutate,
    deleteExtra: config.STORAGE_OPS_DELETE_EXTRA,
    continueOnError: config.STORAGE_OPS_CONTINUE_ON_ERROR,
    sourcePrefix: fixture.sourcePrefix,
    copyTargetPrefix: fixture.copyTargetPrefix,
    syncTargetPrefix: fixture.syncTargetPrefix
  };

  try {
    if (shouldMutate) {
      cookbookStorageCleanupPrefixes_(ASTX, fixture.cleanupPrefixes);
      cookbookStorageWriteFixtureFiles_(ASTX, fixture.sourceFiles);
      cookbookStorageWriteFixtureFiles_(ASTX, fixture.staleSyncFiles);
    }

    const walk = ASTX.Storage.walk({
      uri: fixture.sourcePrefix,
      options: {
        recursive: true,
        maxObjects: 100
      }
    });

    const copyPlan = ASTX.Storage.copyPrefix({
      fromUri: fixture.sourcePrefix,
      toUri: fixture.copyTargetPrefix,
      options: {
        dryRun: true,
        overwrite: true,
        continueOnError: config.STORAGE_OPS_CONTINUE_ON_ERROR
      }
    });

    const syncPlan = ASTX.Storage.sync({
      fromUri: fixture.sourcePrefix,
      toUri: fixture.syncTargetPrefix,
      options: {
        dryRun: true,
        overwrite: true,
        deleteExtra: config.STORAGE_OPS_DELETE_EXTRA,
        continueOnError: config.STORAGE_OPS_CONTINUE_ON_ERROR
      }
    });

    output.walk = {
      count: Array.isArray(walk.output && walk.output.items) ? walk.output.items.length : 0,
      relativePaths: (walk.output && Array.isArray(walk.output.items) ? walk.output.items : [])
        .map(item => item.relativePath)
    };
    output.dryRun = {
      copy: cookbookBulkSummary_(copyPlan),
      sync: cookbookBulkSummary_(syncPlan)
    };

    if (!shouldMutate) {
      output.executed = {
        skipped: true,
        reason: 'Set STORAGE_OPS_EXECUTE_WRITES=true to seed fixtures and execute copy/sync/delete steps.'
      };
      output.durationMs = Date.now() - startedAtMs;
      return output;
    }

    const copyExec = ASTX.Storage.copyPrefix({
      fromUri: fixture.sourcePrefix,
      toUri: fixture.copyTargetPrefix,
      options: {
        dryRun: false,
        overwrite: true,
        continueOnError: config.STORAGE_OPS_CONTINUE_ON_ERROR
      }
    });

    const syncExec = ASTX.Storage.sync({
      fromUri: fixture.sourcePrefix,
      toUri: fixture.syncTargetPrefix,
      options: {
        dryRun: false,
        overwrite: true,
        deleteExtra: config.STORAGE_OPS_DELETE_EXTRA,
        continueOnError: config.STORAGE_OPS_CONTINUE_ON_ERROR
      }
    });

    const copyWalk = ASTX.Storage.walk({
      uri: fixture.copyTargetPrefix,
      options: {
        recursive: true,
        maxObjects: 100
      }
    });
    const syncWalk = ASTX.Storage.walk({
      uri: fixture.syncTargetPrefix,
      options: {
        recursive: true,
        maxObjects: 100
      }
    });

    output.executed = {
      copy: cookbookBulkSummary_(copyExec),
      sync: cookbookBulkSummary_(syncExec),
      copyTargetCount: Array.isArray(copyWalk.output && copyWalk.output.items) ? copyWalk.output.items.length : 0,
      syncTargetCount: Array.isArray(syncWalk.output && syncWalk.output.items) ? syncWalk.output.items.length : 0
    };
    output.durationMs = Date.now() - startedAtMs;
    return output;
  } catch (error) {
    output.status = 'error';
    output.durationMs = Date.now() - startedAtMs;
    output.error = {
      name: error && error.name ? String(error.name) : 'Error',
      message: error && error.message ? String(error.message) : String(error)
    };
    throw error;
  } finally {
    if (shouldMutate) {
      output.cleanup = cookbookStorageCleanupPrefixes_(ASTX, fixture.cleanupPrefixes);
    }
  }
}
