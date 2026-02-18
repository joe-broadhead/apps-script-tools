import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadCoreDataContext } from './helpers.mjs';

test('DataFrame.toMarkdown renders headers and data', () => {
  const context = createGasContext({
    loadDatabricksTable: () => {},
    loadBigQueryTable: () => {}
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
