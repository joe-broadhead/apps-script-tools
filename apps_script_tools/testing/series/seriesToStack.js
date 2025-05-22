SERIES_TO_STACK_TESTS = [
  {
    description: 'Series.toStack() should push all elements of the Series onto the stack',
    test: () => {
      const series = new Series([10, 20, 30], 'A');
      const stack = series.toStack();

      const expectedStack = [10, 20, 30]; // Expected stack contents
      if (JSON.stringify(stack.items) !== JSON.stringify(expectedStack)) {
        throw new Error(`Expected stack to contain ${JSON.stringify(expectedStack)}, but got ${JSON.stringify(stack.items)}`);
      }
    },
  },
  {
    description: 'Series.toStack() should return an empty stack for an empty Series',
    test: () => {
      const series = new Series([], 'A');
      const stack = series.toStack();

      if (!stack.isEmpty()) {
        throw new Error(`Expected an empty stack, but got size ${stack.size()}`);
      }
    },
  },
  {
    description: 'Series.toStack() should handle a Series with mixed data types',
    test: () => {
      const series = new Series([10, "text", true, null, undefined], 'A');
      const stack = series.toStack();

      const expectedStack = [10, "text", true, null, undefined]; // Mixed data types
      if (JSON.stringify(stack.items) !== JSON.stringify(expectedStack)) {
        throw new Error(`Expected stack to contain ${JSON.stringify(expectedStack)}, but got ${JSON.stringify(stack.items)}`);
      }
    },
  },
  {
    description: 'Series.toStack() should maintain the order of elements in the Series',
    test: () => {
      const series = new Series([1, 2, 3, 4, 5], 'A');
      const stack = series.toStack();

      const expectedStack = [1, 2, 3, 4, 5]; // Expected stack contents
      if (JSON.stringify(stack.items) !== JSON.stringify(expectedStack)) {
        throw new Error(`Expected stack to maintain order ${JSON.stringify(expectedStack)}, but got ${JSON.stringify(stack.items)}`);
      }
    },
  },
  {
    description: 'Series.toStack() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const series = new Series(largeArray, 'A');
      const stack = series.toStack();

      if (stack.size() !== 10000) {
        throw new Error(`Expected stack size to be 10000, but got ${stack.size()}`);
      }
    },
  },
];
