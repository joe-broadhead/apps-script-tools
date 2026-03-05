import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadDbtScripts } from './dbt-helpers.mjs';
import { createManifestFixture } from './dbt-fixture.mjs';

function createGovernanceFixture() {
  const manifest = JSON.parse(JSON.stringify(createManifestFixture()));

  manifest.nodes['model.demo.orders'].description = '';
  manifest.nodes['model.demo.orders'].columns.amount.description = '';
  manifest.nodes['model.demo.customers'].meta = {};
  manifest.nodes['test.demo.orders_order_id_not_null'] = {
    unique_id: 'test.demo.orders_order_id_not_null',
    name: 'orders_order_id_not_null',
    resource_type: 'test',
    package_name: 'demo',
    path: 'tests/orders.yml',
    original_file_path: 'tests/orders.yml',
    tags: ['dq'],
    meta: {
      owner: {
        team: 'qa'
      }
    },
    description: 'test for orders.order_id',
    depends_on: {
      nodes: ['model.demo.orders']
    },
    columns: {}
  };

  return manifest;
}

test('AST.DBT.qualityReport returns deterministic readiness coverage and gaps', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.qualityReport({
    manifest: createGovernanceFixture(),
    filters: {
      resourceTypes: ['model']
    },
    topK: 20
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.summary.entityCount, 2);
  assert.equal(out.summary.counts.documentedEntities, 1);
  assert.equal(out.summary.counts.undocumentedEntities, 1);
  assert.equal(out.summary.counts.ownedEntities, 1);
  assert.equal(out.summary.counts.unownedEntities, 1);
  assert.equal(out.summary.counts.testedEntities, 1);
  assert.equal(out.summary.counts.untestedEntities, 1);
  assert.equal(out.summary.counts.documentedColumns, 2);
  assert.equal(out.summary.counts.undocumentedColumns, 1);
  assert.equal(out.gaps.undocumentedEntities.length, 1);
  assert.equal(out.gaps.unownedEntities.length, 1);
  assert.equal(out.gaps.untestedEntities.length, 1);
  assert.equal(
    JSON.stringify(out.summary.readinessWeights),
    JSON.stringify({
      documentation: 0.4,
      ownership: 0.3,
      testing: 0.3
    })
  );
  assert.equal(typeof out.summary.readinessScore, 'number');
});

test('AST.DBT.qualityReport applies normalized readinessWeights deterministically', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.qualityReport({
    manifest: createGovernanceFixture(),
    filters: {
      resourceTypes: ['model']
    },
    readinessWeights: {
      documentation: 2,
      ownership: 1,
      testing: 1
    }
  });

  assert.equal(out.status, 'ok');
  assert.equal(
    JSON.stringify(out.summary.readinessWeights),
    JSON.stringify({
      documentation: 0.5,
      ownership: 0.25,
      testing: 0.25
    })
  );
  assert.equal(out.summary.readinessScore, 54.17);
});

test('AST.DBT.qualityReport rejects invalid readinessWeights', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  assert.throws(() => {
    context.AST.DBT.qualityReport({
      manifest: createGovernanceFixture(),
      filters: {
        resourceTypes: ['model']
      },
      readinessWeights: {
        documentation: -1,
        ownership: 1,
        testing: 1
      }
    });
  }, /readinessWeights\.documentation/);

  assert.throws(() => {
    context.AST.DBT.qualityReport({
      manifest: createGovernanceFixture(),
      filters: {
        resourceTypes: ['model']
      },
      readinessWeights: {
        documentation: 0,
        ownership: 0,
        testing: 0
      }
    });
  }, /positive total/);

  assert.throws(() => {
    context.AST.DBT.qualityReport({
      manifest: createGovernanceFixture(),
      filters: {
        resourceTypes: ['model']
      },
      readinessWeights: {
        docs: 1
      }
    });
  }, /unsupported keys/);

  assert.throws(() => {
    context.AST.DBT.qualityReport({
      manifest: createGovernanceFixture(),
      filters: {
        resourceTypes: ['model']
      },
      readinessWeights: {
        toString: 1
      }
    });
  }, /unsupported keys/);
});

test('AST.DBT.testCoverage supports uncoveredOnly filtering', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.testCoverage({
    manifest: createGovernanceFixture(),
    filters: {
      resourceTypes: ['model']
    },
    uncoveredOnly: true
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.summary.entityCount, 2);
  assert.equal(out.summary.coveredCount, 1);
  assert.equal(out.summary.uncoveredCount, 1);
  assert.equal(out.items.length, 1);
  assert.equal(out.items[0].uniqueId, 'model.demo.customers');
  assert.equal(out.items[0].covered, false);
});

test('AST.DBT.owners groups entities by owner paths with unassigned fallback', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.owners({
    manifest: createGovernanceFixture(),
    filters: {
      resourceTypes: ['model']
    },
    unassignedOwnerLabel: 'missing-owner'
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.summary.entityCount, 2);
  assert.equal(out.summary.ownerCount, 2);
  assert.equal(out.summary.unassignedEntities, 1);
  assert.equal(out.items.some(item => item.owner === 'revops' && item.entityCount === 1), true);
  assert.equal(out.items.some(item => item.owner === 'missing-owner' && item.entityCount === 1), true);
});

test('AST.DBT.searchOwners filters owner groups deterministically', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.searchOwners({
    manifest: createGovernanceFixture(),
    filters: {
      resourceTypes: ['model']
    },
    query: 'rev'
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.summary.ownerCount, 2);
  assert.equal(out.summary.matchedOwnerCount, 1);
  assert.equal(out.items.length, 1);
  assert.equal(out.items[0].owner, 'revops');
  assert.equal(out.items[0].entityCount, 1);
});

test('AST.DBT.ownerCoverage returns deterministic ownership breakdown and gaps', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.ownerCoverage({
    manifest: createGovernanceFixture(),
    filters: {
      resourceTypes: ['model']
    }
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.summary.entityCount, 2);
  assert.equal(out.summary.ownedEntities, 1);
  assert.equal(out.summary.unassignedEntities, 1);
  assert.equal(out.summary.ownershipPct, 50);
  assert.equal(out.breakdown.byResourceType.length, 1);
  assert.equal(out.breakdown.byResourceType[0].key, 'model');
  assert.equal(out.breakdown.byResourceType[0].ownershipPct, 50);
  assert.equal(out.gaps.unassignedEntities.length, 1);
  assert.equal(out.gaps.unassignedEntities[0].uniqueId, 'model.demo.customers');
});

test('AST.DBT.owners handles prototype-like package/resource keys deterministically', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const manifest = createGovernanceFixture();
  manifest.nodes['model.demo.orders'].resource_type = '__proto__';
  manifest.nodes['model.demo.orders'].package_name = '__proto__';

  const out = context.AST.DBT.owners({
    manifest,
    filters: {
      resourceTypes: ['__proto__', 'model']
    }
  });

  const revops = out.items.find(item => item.owner === 'revops');
  assert.equal(out.status, 'ok');
  assert.equal(Boolean(revops), true);
  assert.equal(revops.resourceTypes.__proto__, 1);
  assert.equal(revops.packages.__proto__, 1);
});

test('AST.DBT.run routes governance operations', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const manifest = createGovernanceFixture();

  const quality = context.AST.DBT.run({
    operation: 'quality_report',
    manifest,
    filters: {
      resourceTypes: ['model']
    }
  });
  const coverage = context.AST.DBT.run({
    operation: 'test_coverage',
    manifest,
    filters: {
      resourceTypes: ['model']
    }
  });
  const owners = context.AST.DBT.run({
    operation: 'owners',
    manifest,
    filters: {
      resourceTypes: ['model']
    }
  });
  const searchOwners = context.AST.DBT.run({
    operation: 'search_owners',
    manifest,
    filters: {
      resourceTypes: ['model']
    },
    query: 'rev'
  });
  const ownerCoverage = context.AST.DBT.run({
    operation: 'owner_coverage',
    manifest,
    filters: {
      resourceTypes: ['model']
    }
  });

  assert.equal(quality.status, 'ok');
  assert.equal(coverage.status, 'ok');
  assert.equal(owners.status, 'ok');
  assert.equal(searchOwners.status, 'ok');
  assert.equal(ownerCoverage.status, 'ok');
});
