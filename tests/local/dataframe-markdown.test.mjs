import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadCoreDataContext } from './helpers.mjs';

test('DataFrame.toMarkdown renders headers and data', () => {
  const context = createGasContext({
    astLoadDatabricksTable: () => {},
    astLoadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);

  const df = context.DataFrame.fromRecords([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ]);

  const markdown = df.toMarkdown();

  assert.match(markdown, /id/);
  assert.match(markdown, /name/);
  assert.match(markdown, /Alice/);
  assert.match(markdown, /Bob/);
});

test('DataFrame.toMarkdown handles empty DataFrame with defined columns', () => {
  const context = createGasContext({
    astLoadDatabricksTable: () => {},
    astLoadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);

  const df = new context.DataFrame({
    id: new context.Series([], 'id'),
    name: new context.Series([], 'name')
  });

  const markdown = df.toMarkdown();
  assert.equal(markdown, 'id | name\n---|-----');
});
