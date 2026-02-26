import { measureBenchmark } from './measure.mjs';

function astPerfCreateManifestFixture(entityCount = 600, columnsPerEntity = 5) {
  const nodes = {};
  const parentMap = {};
  const childMap = {};

  for (let idx = 0; idx < entityCount; idx += 1) {
    const uniqueId = `model.perf.model_${idx}`;
    const parentUniqueId = idx > 0 ? `model.perf.model_${idx - 1}` : null;

    const columns = {};
    for (let colIdx = 0; colIdx < columnsPerEntity; colIdx += 1) {
      columns[`col_${colIdx}`] = {
        name: `col_${colIdx}`,
        description: `Column ${colIdx} for model ${idx}`,
        data_type: colIdx % 2 === 0 ? 'string' : 'numeric',
        tags: colIdx === 0 ? ['id'] : ['metric'],
        meta: {
          sensitivity: colIdx === 0 ? 'high' : 'low'
        }
      };
    }

    nodes[uniqueId] = {
      unique_id: uniqueId,
      name: `model_${idx}`,
      resource_type: 'model',
      package_name: 'perf',
      path: `models/perf/model_${idx}.sql`,
      original_file_path: `models/perf/model_${idx}.sql`,
      tags: idx % 2 === 0 ? ['finance'] : ['growth'],
      meta: {
        owner: {
          team: idx % 2 === 0 ? 'revops' : 'marketing'
        }
      },
      description: `Performance model ${idx}`,
      depends_on: {
        nodes: parentUniqueId ? [parentUniqueId] : []
      },
      columns
    };

    parentMap[uniqueId] = parentUniqueId ? [parentUniqueId] : [];
    if (parentUniqueId) {
      if (!childMap[parentUniqueId]) {
        childMap[parentUniqueId] = [];
      }
      childMap[parentUniqueId].push(uniqueId);
    }
    if (!childMap[uniqueId]) {
      childMap[uniqueId] = [];
    }
  }

  return {
    metadata: {
      dbt_schema_version: 'https://schemas.getdbt.com/dbt/manifest/v12.json',
      dbt_version: '1.10.8',
      generated_at: new Date().toISOString(),
      project_name: 'perf_project',
      project_id: 'perf_project_id'
    },
    nodes,
    sources: {},
    macros: {},
    docs: {},
    exposures: {},
    metrics: {},
    groups: {},
    selectors: {},
    disabled: {},
    parent_map: parentMap,
    child_map: childMap,
    group_map: {},
    saved_queries: {},
    semantic_models: {},
    unit_tests: {}
  };
}

function astPerfCreateManifestVariantFixture(entityCount = 600, columnsPerEntity = 5) {
  const fixture = astPerfCreateManifestFixture(entityCount, columnsPerEntity);
  const clone = JSON.parse(JSON.stringify(fixture));

  const removedUniqueId = 'model.perf.model_10';
  const addedUniqueId = `model.perf.model_${entityCount + 1}`;

  delete clone.nodes[removedUniqueId];

  clone.nodes[addedUniqueId] = {
    unique_id: addedUniqueId,
    name: `model_${entityCount + 1}`,
    resource_type: 'model',
    package_name: 'perf',
    path: `models/perf/model_${entityCount + 1}.sql`,
    original_file_path: `models/perf/model_${entityCount + 1}.sql`,
    tags: ['finance'],
    meta: {
      owner: {
        team: 'revops'
      }
    },
    description: `Performance model ${entityCount + 1}`,
    depends_on: {
      nodes: ['model.perf.model_0']
    },
    columns: {
      col_0: {
        name: 'col_0',
        description: 'Primary identifier',
        data_type: 'string',
        tags: ['id'],
        meta: { sensitivity: 'high' }
      }
    }
  };

  clone.nodes['model.perf.model_250'].description = 'Updated performance model 250';
  clone.nodes['model.perf.model_250'].columns.col_1.description = 'Updated column description';

  return clone;
}

export function runDbtManifestPerf(context, options = {}) {
  const {
    samples = 1,
    entities = 600,
    columnsPerEntity = 5
  } = options;

  const manifest = astPerfCreateManifestFixture(entities, columnsPerEntity);
  const astDbt = context.AST_DBT || (context.AST && context.AST.DBT);

  if (!astDbt || typeof astDbt.loadManifest !== 'function') {
    throw new Error('DBT perf harness requires AST.DBT namespace to be loaded');
  }

  const loadIndex = measureBenchmark(
    'dbt.load_index_medium',
    () => astDbt.loadManifest({
      manifest,
      options: {
        validate: 'strict',
        buildIndex: true
      }
    }),
    { samples }
  );

  const bundle = astDbt.loadManifest({
    manifest,
    options: {
      validate: 'strict',
      buildIndex: true
    }
  }).bundle;

  const searchTop20 = measureBenchmark(
    'dbt.search_top20',
    () => astDbt.search({
      bundle,
      target: 'entities',
      query: 'model',
      page: {
        limit: 20,
        offset: 0
      },
      include: {
        meta: false,
        columns: 'none',
        stats: true
      }
    }),
    { samples }
  );

  const getEntityAvg = measureBenchmark(
    'dbt.getEntity_avg',
    () => astDbt.getEntity({
      bundle,
      uniqueId: 'model.perf.model_250',
      include: {
        meta: true,
        columns: 'summary'
      }
    }),
    { samples }
  );

  const getColumnAvg = measureBenchmark(
    'dbt.getColumn_avg',
    () => astDbt.getColumn({
      bundle,
      uniqueId: 'model.perf.model_250',
      columnName: 'col_0'
    }),
    { samples }
  );

  const diffEntities = measureBenchmark(
    'dbt.diff_entities_medium',
    () => astDbt.diffEntities({
      leftManifest: manifest,
      rightManifest: astPerfCreateManifestVariantFixture(entities, columnsPerEntity),
      page: {
        limit: 100,
        offset: 0
      }
    }),
    { samples }
  );

  return [
    loadIndex,
    searchTop20,
    getEntityAvg,
    getColumnAvg,
    diffEntities
  ];
}
