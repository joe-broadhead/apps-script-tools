function cookbookFixtureManifest_() {
  return {
    metadata: {
      dbt_schema_version: 'https://schemas.getdbt.com/dbt/manifest/v12.json',
      dbt_version: '1.10.8',
      generated_at: '2026-02-25T00:00:00.000Z',
      project_name: 'cookbook_demo',
      project_id: 'cookbook_demo'
    },
    nodes: {
      'model.demo.orders': {
        unique_id: 'model.demo.orders',
        name: 'orders',
        resource_type: 'model',
        package_name: 'demo',
        path: 'models/marts/orders.sql',
        original_file_path: 'models/marts/orders.sql',
        tags: ['finance', 'marts'],
        meta: { owner: { team: 'revops' }, sensitivity: 'low' },
        description: 'Orders mart model',
        depends_on: {
          nodes: ['model.demo.customers', 'source.demo.raw_orders']
        },
        columns: {
          order_id: { name: 'order_id', description: 'Order id', data_type: 'string', meta: { pii: false }, tags: ['id'] },
          customer_id: { name: 'customer_id', description: 'Customer id', data_type: 'string', meta: { pii: false }, tags: ['id'] },
          amount: { name: 'amount', description: 'Order amount', data_type: 'numeric', meta: { pii: false }, tags: ['measure'] }
        }
      },
      'model.demo.customers': {
        unique_id: 'model.demo.customers',
        name: 'customers',
        resource_type: 'model',
        package_name: 'demo',
        path: 'models/marts/customers.sql',
        original_file_path: 'models/marts/customers.sql',
        tags: ['marts'],
        meta: { owner: { team: 'revops' }, sensitivity: 'high' },
        description: 'Customers model',
        depends_on: { nodes: [] },
        columns: {
          customer_id: { name: 'customer_id', description: 'Customer id', data_type: 'string', meta: { pii: true }, tags: ['id'] }
        }
      }
    },
    sources: {
      'source.demo.raw_orders': {
        unique_id: 'source.demo.raw_orders',
        name: 'raw_orders',
        source_name: 'raw',
        identifier: 'raw_orders',
        resource_type: 'source',
        package_name: 'demo',
        path: 'models/src/raw.yml',
        original_file_path: 'models/src/raw.yml',
        tags: ['raw'],
        meta: { owner: { team: 'data-eng' } },
        description: 'Raw orders source',
        columns: {
          order_id: { name: 'order_id', description: 'Raw order id', data_type: 'string', meta: {}, tags: ['id'] },
          customer_id: { name: 'customer_id', description: 'Raw customer id', data_type: 'string', meta: {}, tags: ['id'] }
        }
      }
    },
    macros: {},
    docs: {},
    exposures: {},
    metrics: {},
    groups: {},
    selectors: {},
    disabled: {},
    parent_map: {
      'model.demo.orders': ['model.demo.customers', 'source.demo.raw_orders'],
      'model.demo.customers': [],
      'source.demo.raw_orders': []
    },
    child_map: {
      'model.demo.customers': ['model.demo.orders'],
      'source.demo.raw_orders': ['model.demo.orders'],
      'model.demo.orders': []
    },
    group_map: {},
    saved_queries: {},
    semantic_models: {},
    unit_tests: {}
  };
}

function cookbookFixtureManifestVariant_() {
  const next = JSON.parse(JSON.stringify(cookbookFixtureManifest_()));
  next.nodes['model.demo.orders'].description = 'Orders mart model (v2)';
  next.nodes['model.demo.orders'].columns.amount.description = 'Order amount in local currency';
  next.nodes['model.demo.payments'] = {
    unique_id: 'model.demo.payments',
    name: 'payments',
    resource_type: 'model',
    package_name: 'demo',
    path: 'models/marts/payments.sql',
    original_file_path: 'models/marts/payments.sql',
    tags: ['finance'],
    meta: { owner: { team: 'revops' }, sensitivity: 'medium' },
    description: 'Payments model',
    depends_on: { nodes: ['model.demo.orders'] },
    columns: {
      payment_id: { name: 'payment_id', description: 'Payment identifier', data_type: 'string', meta: {}, tags: ['id'] }
    }
  };
  next.parent_map['model.demo.payments'] = ['model.demo.orders'];
  next.child_map['model.demo.orders'] = ['model.demo.payments'];
  next.child_map['model.demo.payments'] = [];
  return next;
}

function cookbookFixtureCatalog_() {
  return {
    metadata: {
      dbt_schema_version: 'https://schemas.getdbt.com/dbt/catalog/v1.json',
      dbt_version: '1.10.8',
      generated_at: '2026-02-25T00:00:00.000Z'
    },
    nodes: {
      'model.demo.orders': {
        unique_id: 'model.demo.orders',
        resource_type: 'model',
        package_name: 'demo',
        name: 'orders',
        original_file_path: 'models/marts/orders.sql',
        database: 'analytics',
        schema: 'marts',
        alias: 'orders',
        relation_name: 'analytics.marts.orders',
        columns: {
          order_id: { name: 'order_id', type: 'STRING' },
          customer_id: { name: 'customer_id', type: 'STRING' },
          amount: { name: 'amount', type: 'NUMERIC' }
        }
      }
    },
    sources: {
      'source.demo.raw_orders': {
        unique_id: 'source.demo.raw_orders',
        resource_type: 'source',
        package_name: 'demo',
        name: 'raw_orders',
        original_file_path: 'models/src/raw.yml',
        database: 'raw',
        schema: 'ingest',
        identifier: 'raw_orders',
        relation_name: 'raw.ingest.raw_orders',
        columns: {
          order_id: { name: 'order_id', type: 'STRING' },
          customer_id: { name: 'customer_id', type: 'STRING' }
        }
      }
    }
  };
}

function cookbookFixtureCatalogVariant_() {
  const next = JSON.parse(JSON.stringify(cookbookFixtureCatalog_()));
  next.nodes['model.demo.orders'].columns.amount.type = 'DECIMAL(18,2)';
  next.nodes['model.demo.payments'] = {
    unique_id: 'model.demo.payments',
    resource_type: 'model',
    package_name: 'demo',
    name: 'payments',
    original_file_path: 'models/marts/payments.sql',
    database: 'analytics',
    schema: 'marts',
    alias: 'payments',
    relation_name: 'analytics.marts.payments',
    columns: {
      payment_id: { name: 'payment_id', type: 'STRING' }
    }
  };
  return next;
}

function cookbookFixtureRunResults_() {
  return {
    metadata: {
      dbt_schema_version: 'https://schemas.getdbt.com/dbt/run-results/v5.json',
      dbt_version: '1.10.8',
      generated_at: '2026-02-25T00:00:00.000Z'
    },
    elapsed_time: 12.5,
    results: [
      {
        unique_id: 'model.demo.orders',
        status: 'success',
        execution_time: 4.2,
        thread_id: 'Thread-1',
        message: '',
        failures: 0
      },
      {
        unique_id: 'model.demo.customers',
        status: 'error',
        execution_time: 3.3,
        thread_id: 'Thread-1',
        message: 'relation not found',
        failures: 1
      }
    ]
  };
}

function cookbookFixtureRunResultsVariant_() {
  const next = JSON.parse(JSON.stringify(cookbookFixtureRunResults_()));
  next.results[0].status = 'error';
  next.results[0].failures = 2;
  next.results.push({
    unique_id: 'model.demo.payments',
    status: 'success',
    execution_time: 1.7,
    thread_id: 'Thread-2',
    message: '',
    failures: 0
  });
  return next;
}

function cookbookFixtureSources_() {
  return {
    metadata: {
      dbt_schema_version: 'https://schemas.getdbt.com/dbt/sources/v3.json',
      dbt_version: '1.10.8',
      generated_at: '2026-02-25T00:00:00.000Z'
    },
    results: [
      {
        unique_id: 'source.demo.raw_orders',
        status: 'pass',
        max_loaded_at: '2026-02-25T00:00:00.000Z',
        snapshotted_at: '2026-02-25T00:05:00.000Z',
        execution_time: 1.2,
        thread_id: 'Thread-2',
        message: ''
      }
    ]
  };
}

function cookbookLoadOptionalArtifact_(ASTX, config, artifactType, uri) {
  if (!uri) {
    return {
      status: 'skip',
      artifactType: artifactType,
      reason: `${artifactType} URI is not configured`
    };
  }

  const loaded = ASTX.DBT.loadArtifact({
    artifactType: artifactType,
    uri: uri,
    options: {
      validate: config.DBT_ARTIFACT_EXPLORER_VALIDATE_MODE,
      maxBytes: config.DBT_ARTIFACT_EXPLORER_MAX_BYTES,
      allowGzip: true,
      includeRaw: false
    }
  });

  return {
    status: loaded.status,
    artifactType: artifactType,
    source: loaded.source,
    summary: loaded.summary,
    warnings: loaded.warnings || []
  };
}

function cookbookRunFixtureLab_(ASTX, config) {
  const manifestBundle = ASTX.DBT.loadManifest({
    manifest: cookbookFixtureManifest_(),
    options: {
      validate: 'strict',
      schemaVersion: config.DBT_ARTIFACT_EXPLORER_SCHEMA_VERSION,
      buildIndex: true
    }
  }).bundle;
  const manifestVariantBundle = ASTX.DBT.loadManifest({
    manifest: cookbookFixtureManifestVariant_(),
    options: {
      validate: 'strict',
      schemaVersion: config.DBT_ARTIFACT_EXPLORER_SCHEMA_VERSION,
      buildIndex: true
    }
  }).bundle;
  const catalogBundle = ASTX.DBT.loadArtifact({
    artifactType: 'catalog',
    artifact: cookbookFixtureCatalog_(),
    options: { validate: 'strict' }
  }).bundle;
  const catalogVariantBundle = ASTX.DBT.loadArtifact({
    artifactType: 'catalog',
    artifact: cookbookFixtureCatalogVariant_(),
    options: { validate: 'strict' }
  }).bundle;
  const runResultsBundle = ASTX.DBT.loadArtifact({
    artifactType: 'run_results',
    artifact: cookbookFixtureRunResults_(),
    options: { validate: 'strict' }
  }).bundle;
  const runResultsVariantBundle = ASTX.DBT.loadArtifact({
    artifactType: 'run_results',
    artifact: cookbookFixtureRunResultsVariant_(),
    options: { validate: 'strict' }
  }).bundle;
  const sourcesBundle = ASTX.DBT.loadArtifact({
    artifactType: 'sources',
    artifact: cookbookFixtureSources_(),
    options: { validate: 'strict' }
  }).bundle;

  const columnLineage = ASTX.DBT.columnLineage({
    bundle: manifestBundle,
    uniqueId: 'model.demo.orders',
    columnName: 'customer_id',
    direction: 'both',
    depth: 2,
    includeDisabled: false,
    confidenceThreshold: 0.55,
    maxMatchesPerEdge: 3,
    include: { stats: true, raw: false }
  });

  const diff = ASTX.DBT.diffEntities({
    leftBundle: manifestBundle,
    rightBundle: manifestVariantBundle,
    includeUnchanged: false,
    page: { limit: 20, offset: 0 }
  });

  const compared = ASTX.DBT.compareArtifacts({
    left: { type: 'run_results', bundle: runResultsBundle },
    right: { type: 'run_results', bundle: runResultsVariantBundle },
    includeUnchanged: false,
    changeTypes: ['added', 'removed', 'changed'],
    page: { limit: 20, offset: 0 }
  });

  const impact = ASTX.DBT.impact({
    bundle: manifestBundle,
    uniqueId: 'model.demo.orders',
    direction: 'both',
    depth: 2,
    artifacts: {
      run_results: { bundle: runResultsBundle },
      catalog: { bundle: catalogBundle },
      sources: { bundle: sourcesBundle }
    }
  });

  return {
    status: 'ok',
    columnLineage: {
      nodeCount: Array.isArray(columnLineage.nodes) ? columnLineage.nodes.length : 0,
      edgeCount: Array.isArray(columnLineage.edges) ? columnLineage.edges.length : 0,
      stats: columnLineage.stats || null
    },
    diff: diff.summary,
    compareArtifacts: compared.summary,
    impact: {
      nodeCount: Array.isArray(impact.nodes) ? impact.nodes.length : 0,
      edgeCount: Array.isArray(impact.edges) ? impact.edges.length : 0,
      artifactSummary: impact.artifactSummary || null
    },
    catalogCompareType: catalogVariantBundle.artifactType
  };
}

function runCookbookDemoInternal_(ASTX, config, context) {
  const startedAtMs = Date.now();
  const live = context || cookbookBuildLiveContext_(ASTX, config);
  const ownerPaths = live.ownerPaths;
  const owners = ASTX.DBT.owners({
    bundle: live.loadedManifest.bundle,
    filters: { resourceTypes: ['model'] },
    ownerPaths: ownerPaths,
    includeDisabled: false,
    topK: 20
  });
  const ownerQuery = owners.items && owners.items.length > 0 && owners.items[0].owner
    ? String(owners.items[0].owner).slice(0, 3)
    : '';
  const ownerSearch = ASTX.DBT.searchOwners({
    bundle: live.loadedManifest.bundle,
    filters: { resourceTypes: ['model'] },
    ownerPaths: ownerPaths,
    includeDisabled: false,
    query: ownerQuery,
    topK: 20
  });
  const ownerCoverage = ASTX.DBT.ownerCoverage({
    bundle: live.loadedManifest.bundle,
    filters: { resourceTypes: ['model'] },
    ownerPaths: ownerPaths,
    includeDisabled: false,
    topK: 50
  });
  const columnLineage = live.sampleColumnName
    ? ASTX.DBT.columnLineage({
        bundle: live.loadedManifest.bundle,
        uniqueId: live.sampleEntity.uniqueId,
        columnName: live.sampleColumnName,
        direction: 'both',
        depth: 1,
        includeDisabled: false,
        confidenceThreshold: 0.55,
        maxMatchesPerEdge: 3,
        include: { stats: true, raw: false }
      })
    : null;

  const fixtureLab = cookbookRunFixtureLab_(ASTX, config);
  const externalArtifacts = {
    catalog: cookbookLoadOptionalArtifact_(ASTX, config, 'catalog', config.DBT_ARTIFACT_EXPLORER_CATALOG_URI),
    run_results: cookbookLoadOptionalArtifact_(ASTX, config, 'run_results', config.DBT_ARTIFACT_EXPLORER_RUN_RESULTS_URI),
    sources: cookbookLoadOptionalArtifact_(ASTX, config, 'sources', config.DBT_ARTIFACT_EXPLORER_SOURCES_URI)
  };

  return {
    status: 'ok',
    cookbook: cookbookName_(),
    entrypoint: 'runCookbookDemo',
    appName: config.DBT_ARTIFACT_EXPLORER_APP_NAME,
    durationMs: Date.now() - startedAtMs,
    liveManifest: {
      projectName: live.inspectedManifest.metadata ? live.inspectedManifest.metadata.projectName : null,
      sampleUniqueId: live.sampleEntity.uniqueId,
      sampleColumnName: live.sampleColumnName,
      columnLineage: columnLineage
        ? {
            nodeCount: Array.isArray(columnLineage.nodes) ? columnLineage.nodes.length : 0,
            edgeCount: Array.isArray(columnLineage.edges) ? columnLineage.edges.length : 0
          }
        : { status: 'skip', reason: 'sample entity has no columns' }
    },
    governance: {
      ownerCount: owners.summary ? owners.summary.ownerCount : 0,
      unassignedEntities: owners.summary ? owners.summary.unassignedEntities : 0,
      matchedOwnerCount: ownerSearch.summary ? ownerSearch.summary.matchedOwnerCount : 0,
      ownershipPct: ownerCoverage.summary ? ownerCoverage.summary.ownershipPct : 0,
      topOwners: owners.items ? owners.items.slice(0, 3) : []
    },
    fixtureLab: fixtureLab,
    externalArtifacts: externalArtifacts
  };
}
