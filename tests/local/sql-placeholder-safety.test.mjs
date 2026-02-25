import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadScripts } from './helpers.mjs';

test('astReplacePlaceHoldersInQuery escapes placeholder names for regex-safe replacement', () => {
  const context = createGasContext();

  loadScripts(context, [
    'apps_script_tools/database/general/replacePlaceHoldersInQuery.js'
  ]);

  const output = context.astReplacePlaceHoldersInQuery(
    'select {{a+b}} as plus_key, {{region.name}} as region_key, {{a+b}} as repeated_plus',
    { 'a+b': 5, 'region.name': 'north' }
  );

  assert.equal(
    output,
    "select 5 as plus_key, 'north' as region_key, 5 as repeated_plus"
  );
});

test('astReplacePlaceHoldersInQuery validates query type', () => {
  const context = createGasContext();

  loadScripts(context, [
    'apps_script_tools/database/general/replacePlaceHoldersInQuery.js'
  ]);

  assert.throws(() => context.astReplacePlaceHoldersInQuery(null, {}), /Query must be a string/);
});
