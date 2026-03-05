import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadDbtScripts } from './dbt-helpers.mjs';
import { createManifestFixture, createManifestFixtureVariant } from './dbt-fixture.mjs';

function createJsonBlobPayload(payload) {
  const text = JSON.stringify(payload);
  const bytes = Array.from(Buffer.from(text, 'utf8').values()).map(value => (value > 127 ? value - 256 : value));
  return {
    getDataAsString: () => text,
    getBytes: () => bytes,
    getContentType: () => 'application/json'
  };
}

test('astDbtBuildManifestIndexes builds fast lookup maps and token indexes', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false });

  const index = context.astDbtBuildManifestIndexes(createManifestFixture());

  assert.equal(index.entityCount >= 3, true);
  assert.equal(index.columnCount >= 3, true);

  assert.equal(Array.isArray(index.byUniqueId['model.demo.orders']), true);
  assert.equal(Array.isArray(index.bySection.nodes), true);
  assert.equal(Array.isArray(index.byResourceType.model), true);
  assert.equal(Array.isArray(index.byTag.finance), true);

  assert.equal(Array.isArray(index.columnsByUniqueId['model.demo.orders'].order), true);
  assert.equal(typeof index.columnsByUniqueId['model.demo.orders'].byName.order_id, 'object');

  assert.equal(Array.isArray(index.tokens.entities.orders), true);
  assert.equal(Array.isArray(index.tokens.columns.order_id), true);
});

test('loadManifest builds index when options.buildIndex=true', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.loadManifest({
    manifest: createManifestFixture(),
    options: {
      buildIndex: true,
      validate: 'strict'
    }
  });

  assert.equal(out.status, 'ok');
  assert.equal(typeof out.bundle.index, 'object');
  assert.equal(out.bundle.index.entityCount >= 3, true);
});

test('astDbtBuildManifestIndexesIncremental reuses previous index when signatures are unchanged', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false });

  const manifest = createManifestFixture();
  const previous = context.astDbtBuildManifestIndexes(manifest);
  const incremental = context.astDbtBuildManifestIndexesIncremental(manifest, previous);

  assert.equal(incremental.incremental.applied, true);
  assert.equal(incremental.incremental.reused, true);
  assert.equal(incremental.incremental.changedCount, 0);
  assert.equal(incremental.index.entityCount, previous.entityCount);
  assert.equal(incremental.index.columnCount, previous.columnCount);
});

test('astDbtBuildManifestIndexesIncremental applies entity add/remove/change deltas', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false });

  const previousManifest = createManifestFixture();
  const nextManifest = createManifestFixtureVariant();
  const previous = context.astDbtBuildManifestIndexes(previousManifest);
  const incremental = context.astDbtBuildManifestIndexesIncremental(nextManifest, previous);

  assert.equal(incremental.incremental.applied, true);
  assert.equal(incremental.incremental.reused, false);
  assert.equal(incremental.incremental.addedCount, 1);
  assert.equal(incremental.incremental.removedCount, 1);
  assert.equal(incremental.incremental.changedCount, 1);
  assert.equal(Array.isArray(incremental.index.byUniqueId['model.demo.payments']), true);
  assert.equal(incremental.index.byUniqueId['model.demo.customers'], undefined);
  assert.equal(
    incremental.index.byUniqueId['model.demo.orders'][0].description,
    'Orders mart model (v2)'
  );
});

test('loadManifest uses runtime incremental path for source loads and honors forceFullRebuild', () => {
  let currentManifest = createManifestFixture();
  const context = createGasContext({
    DriveApp: {
      getFileById: fileId => ({
        getId: () => fileId,
        getName: () => 'manifest.json',
        getLastUpdated: () => new Date('2026-02-25T00:00:00.000Z'),
        getSize: () => 2048,
        getBlob: () => createJsonBlobPayload(currentManifest)
      })
    }
  });

  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const baseRequest = {
    fileId: 'drive-manifest-incremental',
    options: {
      validate: 'strict',
      schemaVersion: 'v12',
      buildIndex: true,
      incrementalIndex: true
    }
  };

  const first = context.AST.DBT.loadManifest(baseRequest);
  assert.equal(first.status, 'ok');
  assert.equal(first.indexBuild, null);

  currentManifest = createManifestFixtureVariant();
  const second = context.AST.DBT.loadManifest(baseRequest);
  assert.equal(second.status, 'ok');
  assert.equal(second.indexBuild.applied, true);
  assert.equal(second.indexBuild.reused, false);
  assert.equal(second.indexBuild.addedCount, 1);
  assert.equal(second.indexBuild.removedCount, 1);
  assert.equal(second.indexBuild.changedCount, 1);

  const forced = context.AST.DBT.loadManifest({
    fileId: 'drive-manifest-incremental',
    options: {
      validate: 'strict',
      schemaVersion: 'v12',
      buildIndex: true,
      incrementalIndex: true,
      forceFullRebuild: true
    }
  });

  assert.equal(forced.status, 'ok');
  assert.equal(forced.indexBuild.applied, false);
  assert.equal(forced.indexBuild.reason, 'force_full_rebuild');
});

test('astDbtBuildManifestIndexesIncremental refreshes lineage when only parent_map/child_map changed', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false });

  const manifestA = createManifestFixture();
  const manifestB = createManifestFixture({
    parent_map: {
      'model.demo.orders': [],
      'model.demo.customers': []
    },
    child_map: {
      'model.demo.orders': [],
      'model.demo.customers': []
    }
  });

  const previous = context.astDbtBuildManifestIndexes(manifestA);
  const incremental = context.astDbtBuildManifestIndexesIncremental(manifestB, previous);

  assert.equal(incremental.incremental.applied, true);
  assert.equal(incremental.incremental.reused, true);
  assert.equal(incremental.incremental.changedCount, 0);
  assert.deepEqual(
    JSON.parse(JSON.stringify(incremental.index.lineage.parentMap)),
    JSON.parse(JSON.stringify(manifestB.parent_map))
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(incremental.index.lineage.childMap)),
    JSON.parse(JSON.stringify(manifestB.child_map))
  );
});
