SERIES_TO_DEQUEUE_TESTS = [
  {
    description: 'Series.toDeque() should add all elements of the Series to the deque',
    test: () => {
      const series = new Series([10, 20, 30], 'A');
      const deque = series.toDeque();

      const expectedDeque = [10, 20, 30]; // Expected deque contents
      if (JSON.stringify(deque.items) !== JSON.stringify(expectedDeque)) {
        throw new Error(`Expected deque to contain ${JSON.stringify(expectedDeque)}, but got ${JSON.stringify(deque.items)}`);
      }
    },
  },
  {
    description: 'Series.toDeque() should return an empty deque for an empty Series',
    test: () => {
      const series = new Series([], 'A');
      const deque = series.toDeque();

      if (deque.size() !== 0) {
        throw new Error(`Expected an empty deque, but got size ${deque.size}`);
      }
    },
  },
  {
    description: 'Series.toDeque() should handle a Series with mixed data types',
    test: () => {
      const series = new Series([10, "text", true, null, undefined], 'A');
      const deque = series.toDeque();

      const expectedDeque = [10, "text", true, null, undefined]; // Mixed data types
      if (JSON.stringify(deque.items) !== JSON.stringify(expectedDeque)) {
        throw new Error(`Expected deque to contain ${JSON.stringify(expectedDeque)}, but got ${JSON.stringify(deque.items)}`);
      }
    },
  },
  {
    description: 'Series.toDeque() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const series = new Series(largeArray, 'A');
      const deque = series.toDeque();

      if (deque.size() !== 10000) {
        throw new Error(`Expected deque size to be 10000, but got ${deque.size}`);
      }
    },
  },
  {
    description: 'Series.toDeque() should maintain the order of elements in the Series',
    test: () => {
      const series = new Series([1, 2, 3, 4, 5], 'A');
      const deque = series.toDeque();

      const expectedDeque = [1, 2, 3, 4, 5];
      if (JSON.stringify(deque.items) !== JSON.stringify(expectedDeque)) {
        throw new Error(`Expected deque to maintain order ${JSON.stringify(expectedDeque)}, but got ${JSON.stringify(deque.items)}`);
      }
    },
  },
];
