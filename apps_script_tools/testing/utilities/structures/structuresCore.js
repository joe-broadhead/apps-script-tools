STRUCTURES_CORE_TESTS = [
  {
    description: 'Queue should preserve FIFO ordering',
    test: () => {
      const queue = new Queue();
      queue.enqueue(1);
      queue.enqueue(2);
      queue.enqueue(3);

      const first = queue.dequeue();
      if (first !== 1) {
        throw new Error(`Expected first dequeued value to be 1, but got ${first}`);
      };

      const snapshot = queue.items;
      if (JSON.stringify(snapshot) !== JSON.stringify([2, 3])) {
        throw new Error(`Expected queue snapshot [2,3], but got ${JSON.stringify(snapshot)}`);
      };
    }
  },
  {
    description: 'Deque should support front/back operations',
    test: () => {
      const deque = new Deque();
      deque.addBack('b');
      deque.addFront('a');
      deque.addBack('c');
      const front = deque.removeFront();
      const back = deque.removeBack();

      if (front !== 'a' || back !== 'c') {
        throw new Error(`Expected removeFront/removeBack to return a/c, but got ${front}/${back}`);
      };
      if (deque.peekFront() !== 'b') {
        throw new Error(`Expected deque front to be b, but got ${deque.peekFront()}`);
      };
    }
  },
  {
    description: 'PriorityQueue should be stable for equal priorities',
    test: () => {
      const pq = new PriorityQueue();
      pq.enqueue('a', 1);
      pq.enqueue('b', 1);
      pq.enqueue('c', 2);

      const first = pq.dequeue();
      const second = pq.dequeue();
      if (first.value !== 'a' || second.value !== 'b') {
        throw new Error(`Expected stable ordering for equal priorities, got ${first.value}/${second.value}`);
      };
    }
  },
  {
    description: 'Graph bfs should return empty list for missing start vertex',
    test: () => {
      const graph = new Graph();
      graph.addEdge('A', 'B');
      graph.addEdge('A', 'B');
      const missing = graph.bfs('Z');
      if (!Array.isArray(missing) || missing.length !== 0) {
        throw new Error(`Expected empty array for bfs on missing vertex, got ${JSON.stringify(missing)}`);
      };

      const neighbors = graph.getNeighbors('A');
      if (neighbors.length !== 1) {
        throw new Error(`Expected duplicate edges to be collapsed, got ${JSON.stringify(neighbors)}`);
      };
    }
  },
  {
    description: 'Trie should support suffix checks via endsWith',
    test: () => {
      const trie = new Trie();
      trie.insert('alpha');
      trie.insert('beta');
      if (!trie.endsWith('ta')) {
        throw new Error('Expected trie.endsWith("ta") to be true');
      };
      if (trie.endsWith('zzz')) {
        throw new Error('Expected trie.endsWith("zzz") to be false');
      };
    }
  },
  {
    description: 'DisjointSet and LruCache should expose core behavior',
    test: () => {
      const ds = new DisjointSet(['x', 'y']);
      ds.union('x', 'y');
      if (!ds.connected('x', 'y')) {
        throw new Error('Expected disjoint set union/connectivity to succeed');
      };

      const cache = new LruCache(1);
      cache.set('first', 1);
      cache.set('second', 2);
      if (cache.get('first') !== null) {
        throw new Error('Expected LruCache to evict least recently used item');
      };
      if (cache.get('second') !== 2) {
        throw new Error('Expected LruCache to retain most recent item');
      };
    }
  }
];
