import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

import { createGasContext, loadScripts } from './helpers.mjs';

test('BinarySearchTree is self-contained and supports insert/search/traversal', () => {
  const context = createGasContext();

  loadScripts(context, [
    'apps_script_tools/utilities/structures/BinarySearchTree.js'
  ]);

  const output = vm.runInContext(`
    const bst = new BinarySearchTree();
    [5, 3, 7, 1, 4].forEach(v => bst.insert(v));
    JSON.stringify({
      search4: bst.search(4),
      search9: bst.search(9),
      bfs: bst.bfs(),
      inOrder: [...bst]
    });
  `, context);

  const parsed = JSON.parse(output);
  assert.equal(parsed.search4, true);
  assert.equal(parsed.search9, false);
  assert.deepEqual(parsed.bfs, [5, 3, 7, 1, 4]);
  assert.deepEqual(parsed.inOrder, [1, 3, 4, 5, 7]);
});
