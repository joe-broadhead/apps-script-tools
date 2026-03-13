function runCookbookDemoInternal_(config) {
  const ASTX = cookbookAst_();
  cookbookConfigureStorageRuntime_(ASTX);

  const startedAtMs = Date.now();
  const fixture = cookbookBuildDemoFixture_(config);
  const shouldMutate = Boolean(config.STORAGE_OPS_EXECUTE_WRITES);
  const output = {
    status: 'ok',
    cookbook: cookbookName_(),
    entrypoint: 'runCookbookDemo',
    appName: config.STORAGE_OPS_APP_NAME,
    executeWrites: shouldMutate,
    sourcePrefix: fixture.sourcePrefix,
    transferTargetPrefix: fixture.transferTargetPrefix,
    cleanupPrefix: fixture.cleanupPrefix
  };

  try {
    if (shouldMutate) {
      cookbookStorageCleanupPrefixes_(ASTX, fixture.cleanupPrefixes);
      cookbookStorageWriteFixtureFiles_(ASTX, [
        {
          uri: fixture.statusUri,
          json: {
            cookbook: cookbookName_(),
            status: 'ready',
            generatedAt: '2026-03-13T00:00:00Z'
          }
        },
        {
          uri: fixture.reportUri,
          text: 'latest report payload'
        },
        {
          uri: fixture.markerUri,
          text: 'delete-me'
        },
        {
          uri: fixture.batchUri,
          text: '{"row":1}\n{"row":2}'
        }
      ]);
    }

    const list = ASTX.Storage.list({
      uri: fixture.sourcePrefix,
      options: {
        recursive: false,
        pageSize: 50
      }
    });
    const walk = ASTX.Storage.walk({
      uri: fixture.sourcePrefix,
      options: {
        recursive: true,
        maxObjects: 100
      }
    });

    output.operations = {
      list: {
        count: Array.isArray(list.output && list.output.items) ? list.output.items.length : 0
      },
      walk: {
        count: Array.isArray(walk.output && walk.output.items) ? walk.output.items.length : 0,
        relativePaths: (walk.output && Array.isArray(walk.output.items) ? walk.output.items : [])
          .map(item => item.relativePath)
      }
    };

    if (!shouldMutate) {
      output.executed = {
        skipped: true,
        reason: 'Set STORAGE_OPS_EXECUTE_WRITES=true to seed fixtures and execute transfer/delete flows.'
      };
      output.durationMs = Date.now() - startedAtMs;
      return output;
    }

    const head = ASTX.Storage.head({ uri: fixture.statusUri });
    const read = ASTX.Storage.read({ uri: fixture.statusUri });
    const transferPlan = ASTX.Storage.transfer({
      fromUri: fixture.reportUri,
      toUri: fixture.transferTargetPrefix,
      mode: 'object',
      options: {
        dryRun: true,
        overwrite: true,
        continueOnError: config.STORAGE_OPS_CONTINUE_ON_ERROR
      }
    });
    output.operations.head = {
      uri: head.uri,
      mimeType: head.output && head.output.object ? head.output.object.mimeType : null,
      size: head.output && head.output.object ? head.output.object.size : null
    };
    output.operations.read = {
      hasJson: Boolean(read.output && read.output.data && read.output.data.json),
      json: read.output && read.output.data ? (read.output.data.json || null) : null
    };
    output.operations.transferDryRun = cookbookBulkSummary_(transferPlan);

    const transferExec = ASTX.Storage.transfer({
      fromUri: fixture.reportUri,
      toUri: fixture.transferTargetPrefix,
      mode: 'object',
      options: {
        dryRun: false,
        overwrite: true,
        continueOnError: config.STORAGE_OPS_CONTINUE_ON_ERROR
      }
    });
    const transferTargetUri = cookbookJoinStorageUri_(
      fixture.transferTargetPrefix,
      cookbookStorageBasename_(fixture.reportUri)
    );
    const existsAfterTransfer = ASTX.Storage.exists({ uri: transferTargetUri });
    const deleteSingle = ASTX.Storage.delete({ uri: fixture.markerUri });
    const deletePrefixPlan = ASTX.Storage.deletePrefix({
      uri: fixture.cleanupPrefix,
      options: {
        dryRun: true,
        continueOnError: config.STORAGE_OPS_CONTINUE_ON_ERROR
      }
    });
    const deletePrefixExec = ASTX.Storage.deletePrefix({
      uri: fixture.cleanupPrefix,
      options: {
        dryRun: false,
        continueOnError: config.STORAGE_OPS_CONTINUE_ON_ERROR
      }
    });

    output.executed = {
      transfer: cookbookBulkSummary_(transferExec),
      transferTargetUri: transferTargetUri,
      existsAfterTransfer: existsAfterTransfer.output && existsAfterTransfer.output.exists
        ? Boolean(existsAfterTransfer.output.exists.exists)
        : false,
      deleteSingle: {
        deleted: Boolean(deleteSingle.output && deleteSingle.output.deleted)
      },
      deletePrefixDryRun: cookbookBulkSummary_(deletePrefixPlan),
      deletePrefix: cookbookBulkSummary_(deletePrefixExec)
    };
    output.durationMs = Date.now() - startedAtMs;
    return output;
  } finally {
    if (shouldMutate) {
      output.cleanup = cookbookStorageCleanupPrefixes_(ASTX, fixture.cleanupPrefixes);
    }
  }
}
