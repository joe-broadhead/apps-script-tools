import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadDbtScripts } from './dbt-helpers.mjs';
import { createManifestFixture } from './dbt-fixture.mjs';

test('astDbtValidateManifestV12 passes strict mode for valid v12 manifest', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false });

  const result = context.astDbtValidateManifestV12(createManifestFixture(), {
    validate: 'strict',
    throwOnInvalid: true
  });

  assert.equal(result.valid, true);
  assert.equal(result.mode, 'strict');
  assert.equal(result.schemaVersion, 'v12');
});

test('astDbtValidateManifestV12 rejects missing top-level sections in strict/basic', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false });

  const invalid = createManifestFixture();
  delete invalid.nodes;

  assert.throws(
    () => context.astDbtValidateManifestV12(invalid, {
      validate: 'strict',
      throwOnInvalid: true
    }),
    error => {
      assert.equal(error.name, 'AstDbtSchemaError');
      assert.match(JSON.stringify(error.details.errors), /missing_top_level_section/);
      return true;
    }
  );

  assert.throws(
    () => context.astDbtValidateManifestV12(invalid, {
      validate: 'basic',
      throwOnInvalid: true
    }),
    error => {
      assert.equal(error.name, 'AstDbtSchemaError');
      return true;
    }
  );
});

test('astDbtValidateManifestV12 allows invalid content when validate=off', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false });

  const out = context.astDbtValidateManifestV12({ hello: 'world' }, {
    validate: 'off'
  });

  assert.equal(out.valid, true);
  assert.equal(out.mode, 'off');
});
