import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

import { createGasContext, loadScripts } from './helpers.mjs';

function loadStructureScripts(context, files) {
  loadScripts(context, files.map(file => `apps_script_tools/utilities/structures/${file}`));
}

test('Queue maintains FIFO order with O(1)-style dequeue internals', () => {
  const context = createGasContext();
  loadStructureScripts(context, ['Queue.js']);

  const output = vm.runInContext(`
    const queue = new Queue();
    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);
    const first = queue.dequeue();
    queue.enqueue(4);
    for (let i = 0; i < 200; i += 1) {
      queue.enqueue(i + 10);
      queue.dequeue();
    };
    JSON.stringify({
      first,
      peek: queue.peek(),
      size: queue.size(),
      items: queue.items,
      iter: [...queue]
    });
  `, context);

  const parsed = JSON.parse(output);
  assert.equal(parsed.first, 1);
  assert.equal(parsed.peek, 207);
  assert.equal(parsed.size, 3);
  assert.deepEqual(parsed.items, [207, 208, 209]);
  assert.deepEqual(parsed.iter, [207, 208, 209]);
});

test('Deque supports efficient front/back operations while preserving order', () => {
  const context = createGasContext();
  loadStructureScripts(context, ['Deque.js']);

  const output = vm.runInContext(`
    const deque = new Deque();
    deque.addBack(1);
    deque.addBack(2);
    deque.addFront(0);
    const removedBack = deque.removeBack();
    const removedFront = deque.removeFront();
    deque.addFront(-1);
    deque.addBack(3);
    JSON.stringify({
      removedBack,
      removedFront,
      front: deque.peekFront(),
      back: deque.peekBack(),
      size: deque.size(),
      items: deque.items,
      iter: [...deque]
    });
  `, context);

  const parsed = JSON.parse(output);
  assert.equal(parsed.removedBack, 2);
  assert.equal(parsed.removedFront, 0);
  assert.equal(parsed.front, -1);
  assert.equal(parsed.back, 3);
  assert.equal(parsed.size, 3);
  assert.deepEqual(parsed.items, [-1, 1, 3]);
  assert.deepEqual(parsed.iter, [-1, 1, 3]);
});

test('PriorityQueue dequeues by priority and keeps stable order for equal priorities', () => {
  const context = createGasContext();
  loadStructureScripts(context, ['PriorityQueue.js']);

  const output = vm.runInContext(`
    const pq = new PriorityQueue();
    pq.enqueue('a', 2);
    pq.enqueue('b', 1);
    pq.enqueue('c', 1);
    pq.enqueue('d', 3);
    const firstPeek = pq.peek();
    const values = [];
    while (!pq.isEmpty()) {
      values.push(pq.dequeue().value);
    };
    JSON.stringify({
      firstPeek,
      values
    });
  `, context);

  const parsed = JSON.parse(output);
  assert.deepEqual(parsed.firstPeek, { value: 'b', priority: 1 });
  assert.deepEqual(parsed.values, ['b', 'c', 'a', 'd']);
});

test('PriorityQueue supports non-numeric comparable priorities', () => {
  const context = createGasContext();
  loadStructureScripts(context, ['PriorityQueue.js']);

  const output = vm.runInContext(`
    const pq = new PriorityQueue();
    pq.enqueue('task-mid', 'm');
    pq.enqueue('task-high', 'a');
    pq.enqueue('task-low', 'z');
    JSON.stringify([pq.dequeue().value, pq.dequeue().value, pq.dequeue().value]);
  `, context);

  const parsed = JSON.parse(output);
  assert.deepEqual(parsed, ['task-high', 'task-mid', 'task-low']);
});

test('LinkedList supports append/prepend/remove/find with tail updates', () => {
  const context = createGasContext();
  loadStructureScripts(context, ['LinkedList.js']);

  const output = vm.runInContext(`
    const list = new LinkedList();
    list.append(2);
    list.append(3);
    list.prepend(1);
    list.remove(3);
    list.append(4);
    list.remove(1);
    JSON.stringify({
      size: list.getSize(),
      head: list.head ? list.head.data : null,
      tail: list.tail ? list.tail.data : null,
      found: list.find(2) ? list.find(2).data : null,
      missing: list.find(99),
      values: [...list]
    });
  `, context);

  const parsed = JSON.parse(output);
  assert.equal(parsed.size, 2);
  assert.equal(parsed.head, 2);
  assert.equal(parsed.tail, 4);
  assert.equal(parsed.found, 2);
  assert.equal(parsed.missing, null);
  assert.deepEqual(parsed.values, [2, 4]);
});

test('Graph handles duplicate edges and missing bfs start nodes safely', () => {
  const context = createGasContext();
  loadStructureScripts(context, ['Graph.js']);

  const output = vm.runInContext(`
    const graph = new Graph();
    graph.addEdge('A', 'B');
    graph.addEdge('A', 'B');
    graph.addEdge('B', 'C');
    JSON.stringify({
      neighborsA: graph.getNeighbors('A'),
      connectedAB: graph.areConnected('A', 'B'),
      bfsA: graph.bfs('A'),
      bfsMissing: graph.bfs('Z'),
      iter: [...graph]
    });
  `, context);

  const parsed = JSON.parse(output);
  assert.deepEqual(parsed.neighborsA, ['B']);
  assert.equal(parsed.connectedAB, true);
  assert.deepEqual(parsed.bfsA, ['A', 'B', 'C']);
  assert.deepEqual(parsed.bfsMissing, []);
  assert.equal(parsed.iter.length, 3);
});

test('Trie supports prefix, suffix, delete, and empty checks', () => {
  const context = createGasContext();
  loadStructureScripts(context, ['FuzzyMatcher.js', 'Trie.js']);

  const output = vm.runInContext(`
    const trie = new Trie();
    trie.insert('apple');
    trie.insert('app');
    trie.insert('banana');
    const beforeDelete = {
      searchApp: trie.search('app'),
      startsWithAp: trie.startsWith('ap'),
      endsWithNa: trie.endsWith('na'),
      endsWithNope: trie.endsWith('nope'),
      auto: trie.autocomplete('app'),
      autoAll: trie.autocomplete('')
    };
    trie.delete('app');
    trie.delete('apple');
    trie.delete('banana');
    JSON.stringify({
      beforeDelete,
      afterDeleteSearch: trie.search('app'),
      empty: trie.isEmpty()
    });
  `, context);

  const parsed = JSON.parse(output);
  assert.equal(parsed.beforeDelete.searchApp, true);
  assert.equal(parsed.beforeDelete.startsWithAp, true);
  assert.equal(parsed.beforeDelete.endsWithNa, true);
  assert.equal(parsed.beforeDelete.endsWithNope, false);
  assert.deepEqual(parsed.beforeDelete.auto.sort(), ['app', 'apple']);
  assert.deepEqual(parsed.beforeDelete.autoAll.sort(), ['app', 'apple', 'banana']);
  assert.equal(parsed.afterDeleteSearch, false);
  assert.equal(parsed.empty, true);
});

test('TernarySearchTree supports search, startsWith, and autocomplete', () => {
  const context = createGasContext();
  loadStructureScripts(context, ['TernarySearchTree.js']);

  const output = vm.runInContext(`
    const tst = new TernarySearchTree();
    tst.insert('cat');
    tst.insert('car');
    tst.insert('dog');
    tst.insert('');
    tst.insert(null);
    JSON.stringify({
      searchCat: tst.search('cat'),
      searchCap: tst.search('cap'),
      startsWithCa: tst.startsWith('ca'),
      startsWithDo: tst.startsWith('do'),
      startsWithNo: tst.startsWith('no'),
      autocompleteCa: tst.autocomplete('ca').sort()
    });
  `, context);

  const parsed = JSON.parse(output);
  assert.equal(parsed.searchCat, true);
  assert.equal(parsed.searchCap, false);
  assert.equal(parsed.startsWithCa, true);
  assert.equal(parsed.startsWithDo, true);
  assert.equal(parsed.startsWithNo, false);
  assert.deepEqual(parsed.autocompleteCa, ['car', 'cat']);
});

test('DisjointSet supports union/find/connected/groups', () => {
  const context = createGasContext();
  loadStructureScripts(context, ['DisjointSet.js']);

  const output = vm.runInContext(`
    const ds = new DisjointSet(['a', 'b', 'c']);
    ds.union('a', 'b');
    ds.union('d', 'e');
    JSON.stringify({
      connectedAB: ds.connected('a', 'b'),
      connectedAC: ds.connected('a', 'c'),
      sizeA: ds.size('a'),
      sizeD: ds.size('d'),
      count: ds.count(),
      groups: ds.groups().map(g => g.slice().sort()).sort((x, y) => x[0].localeCompare(y[0]))
    });
  `, context);

  const parsed = JSON.parse(output);
  assert.equal(parsed.connectedAB, true);
  assert.equal(parsed.connectedAC, false);
  assert.equal(parsed.sizeA, 2);
  assert.equal(parsed.sizeD, 2);
  assert.equal(parsed.count, 3);
  assert.deepEqual(parsed.groups, [['a', 'b'], ['c'], ['d', 'e']]);
});

test('LruCache evicts least-recently-used items deterministically', () => {
  const context = createGasContext();
  loadStructureScripts(context, ['LruCache.js']);

  const output = vm.runInContext(`
    const cache = new LruCache(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    const firstState = {
      hasA: cache.has('a'),
      hasB: cache.has('b'),
      hasC: cache.has('c'),
      getB: cache.get('b'),
      keys: cache.keys()
    };
    cache.setLimit(1);
    JSON.stringify({
      firstState,
      size: cache.size(),
      onlyKey: cache.keys()[0],
      entries: [...cache]
    });
  `, context);

  const parsed = JSON.parse(output);
  assert.equal(parsed.firstState.hasA, true);
  assert.equal(parsed.firstState.hasB, false);
  assert.equal(parsed.firstState.hasC, true);
  assert.equal(parsed.firstState.getB, null);
  assert.deepEqual(parsed.firstState.keys, ['a', 'c']);
  assert.equal(parsed.size, 1);
  assert.equal(parsed.onlyKey, 'c');
  assert.deepEqual(parsed.entries, [['c', 3]]);
});
