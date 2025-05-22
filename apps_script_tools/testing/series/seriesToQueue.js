SERIES_TO_QUEUE_TESTS = [
  {
    description: 'Series.toQueue() should enqueue all elements of the Series',
    test: () => {
      const series = new Series([10, 20, 30], 'A');
      const queue = series.toQueue();

      const expectedQueue = [10, 20, 30]; // Expected queue contents
      if (JSON.stringify(queue.items) !== JSON.stringify(expectedQueue)) {
        throw new Error(`Expected queue to contain ${JSON.stringify(expectedQueue)}, but got ${JSON.stringify(queue.toArray())}`);
      }
    },
  },
  {
    description: 'Series.toQueue() should return an empty queue for an empty Series',
    test: () => {
      const series = new Series([], 'A');
      const queue = series.toQueue();

      if (queue.size() !== 0) {
        throw new Error(`Expected an empty queue, but got size ${queue.size()}`);
      }
    },
  },
  {
    description: 'Series.toQueue() should handle a Series with mixed data types',
    test: () => {
      const series = new Series([10, "text", true, null, undefined], 'A');
      const queue = series.toQueue();

      const expectedQueue = [10, "text", true, null, undefined]; // Mixed data types
      if (JSON.stringify(queue.items) !== JSON.stringify(expectedQueue)) {
        throw new Error(`Expected queue to contain ${JSON.stringify(expectedQueue)}, but got ${JSON.stringify(queue.toArray())}`);
      }
    },
  },
  {
    description: 'Series.toQueue() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const series = new Series(largeArray, 'A');
      const queue = series.toQueue();

      if (queue.size() !== 10000) {
        throw new Error(`Expected queue size to be 10000, but got ${queue.size()}`);
      }
    },
  },
  {
    description: 'Series.toQueue() should maintain the order of elements in the Series',
    test: () => {
      const series = new Series([1, 2, 3, 4, 5], 'A');
      const queue = series.toQueue();

      const expectedQueue = [1, 2, 3, 4, 5];
      if (JSON.stringify(queue.items) !== JSON.stringify(expectedQueue)) {
        throw new Error(`Expected queue to maintain order ${JSON.stringify(expectedQueue)}, but got ${JSON.stringify(queue.toArray())}`);
      }
    },
  },
];
