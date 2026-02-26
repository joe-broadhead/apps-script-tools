import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadDbtScripts } from './dbt-helpers.mjs';
import {
  createCatalogFixture,
  createManifestFixture,
  createManifestFixtureVariant,
  createRunResultsFixture,
  createSourcesArtifactFixture
} from './dbt-fixture.mjs';

test('AST.DBT.loadArtifact + inspectArtifact supports run_results artifact', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const loaded = context.AST.DBT.loadArtifact({
    artifactType: 'run_results',
    artifact: createRunResultsFixture(),
    options: {
      validate: 'strict'
    }
  });

  assert.equal(loaded.status, 'ok');
  assert.equal(loaded.artifactType, 'run_results');
  assert.equal(loaded.summary.counts.resultCount, 2);
  assert.equal(loaded.summary.counts.statusCounts.success, 1);

  const inspected = context.AST.DBT.inspectArtifact({
    bundle: loaded.bundle
  });

  assert.equal(inspected.status, 'ok');
  assert.equal(inspected.artifactType, 'run_results');
});

test('AST.DBT.loadArtifact reads catalog from storage URI', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  context.astStorageRead = request => {
    assert.equal(request.provider, 'gcs');
    return {
      output: {
        data: {
          json: createCatalogFixture(),
          mimeType: 'application/json'
        }
      },
      usage: {
        bytesOut: 1024
      }
    };
  };

  const loaded = context.AST.DBT.loadArtifact({
    artifactType: 'catalog',
    uri: 'gcs://bucket/dbt/catalog.json',
    options: {
      validate: 'strict'
    }
  });

  assert.equal(loaded.status, 'ok');
  assert.equal(loaded.summary.counts.entityCount, 2);
  assert.equal(loaded.summary.counts.columnCount, 3);
});

test('AST.DBT.loadArtifact ignores manifest source defaults when provider+location is supplied', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  context.AST.DBT.configure({
    DBT_MANIFEST_URI: 'gcs://bucket/dbt/manifest.json',
    DBT_MANIFEST_DRIVE_FILE_ID: 'drive-manifest-file-id'
  });

  let requestedUri = '';
  context.astStorageRead = request => {
    requestedUri = request.uri;
    return {
      output: {
        data: {
          json: createCatalogFixture(),
          mimeType: 'application/json'
        }
      }
    };
  };

  const loaded = context.AST.DBT.loadArtifact({
    artifactType: 'catalog',
    provider: 'gcs',
    location: {
      bucket: 'bucket',
      key: 'dbt/catalog.json'
    },
    options: {
      validate: 'strict'
    }
  });

  assert.equal(requestedUri, 'gcs://bucket/dbt/catalog.json');
  assert.equal(loaded.source.uri, 'gcs://bucket/dbt/catalog.json');
});

test('AST.DBT.diffEntities returns deterministic added/removed/modified changes', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const leftBundle = context.AST.DBT.loadManifest({
    manifest: createManifestFixture(),
    options: {
      validate: 'strict',
      buildIndex: true
    }
  }).bundle;

  const rightBundle = context.AST.DBT.loadManifest({
    manifest: createManifestFixtureVariant(),
    options: {
      validate: 'strict',
      buildIndex: true
    }
  }).bundle;

  const diff = context.AST.DBT.diffEntities({
    leftBundle,
    rightBundle,
    includeUnchanged: false,
    page: {
      limit: 50,
      offset: 0
    }
  });

  assert.equal(diff.status, 'ok');
  assert.equal(diff.summary.added >= 1, true);
  assert.equal(diff.summary.removed >= 1, true);
  assert.equal(diff.summary.modified >= 1, true);

  const ordered = diff.items.map(item => item.uniqueId);
  const sorted = ordered.slice().sort();
  assert.deepEqual(ordered, sorted);

  const modifiedOrders = diff.items.find(item => item.uniqueId === 'model.demo.orders');
  assert.equal(modifiedOrders.changeType, 'modified');
  assert.equal(Array.isArray(modifiedOrders.diff.fieldChanges), true);
  assert.equal(Array.isArray(modifiedOrders.diff.columnChanges.modified), true);
});

test('AST.DBT.impact overlays run_results/catalog/sources status onto lineage nodes', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const manifestBundle = context.AST.DBT.loadManifest({
    manifest: createManifestFixture(),
    options: {
      validate: 'strict',
      buildIndex: true
    }
  }).bundle;

  const runResultsBundle = context.AST.DBT.loadArtifact({
    artifactType: 'run_results',
    artifact: createRunResultsFixture(),
    options: {
      validate: 'strict'
    }
  }).bundle;

  const catalogBundle = context.AST.DBT.loadArtifact({
    artifactType: 'catalog',
    artifact: createCatalogFixture(),
    options: {
      validate: 'strict'
    }
  }).bundle;

  const sourcesBundle = context.AST.DBT.loadArtifact({
    artifactType: 'sources',
    artifact: createSourcesArtifactFixture(),
    options: {
      validate: 'strict'
    }
  }).bundle;

  const impact = context.AST.DBT.impact({
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

  assert.equal(impact.status, 'ok');
  assert.equal(Array.isArray(impact.nodes), true);

  const ordersNode = impact.nodes.find(node => node.uniqueId === 'model.demo.orders');
  assert.equal(ordersNode.artifactStatus.runResults.status, 'success');
  assert.equal(ordersNode.artifactStatus.catalog.exists, true);

  const sourceStatus = impact.artifactSummary.sources;
  assert.equal(sourceStatus.counts.resultCount, 1);
});

test('AST.DBT.run routes new dbt artifact and diff/impact operations', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const manifest = createManifestFixture();
  const runResults = createRunResultsFixture();

  const loadedArtifact = context.AST.DBT.run({
    operation: 'load_artifact',
    artifactType: 'run_results',
    artifact: runResults
  });

  assert.equal(loadedArtifact.status, 'ok');

  const diff = context.AST.DBT.run({
    operation: 'diff_entities',
    leftManifest: manifest,
    rightManifest: createManifestFixtureVariant()
  });

  assert.equal(diff.status, 'ok');

  const impact = context.AST.DBT.run({
    operation: 'impact',
    manifest,
    uniqueId: 'model.demo.orders',
    artifacts: {
      run_results: {
        artifact: runResults
      }
    }
  });

  assert.equal(impact.status, 'ok');
  assert.equal(Array.isArray(impact.nodes), true);
});
