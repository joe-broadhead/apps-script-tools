const SERIES_SORT_TESTS = [
  {
    description: "Series.sort() should correctly sort an array of numbers in ascending order by default",
    test: () => {
      const series = new Series([5, 3, 8, 1, 4], 'numbers');
      const result = series.sort().array;
      const expected = [1, 3, 4, 5, 8];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "Series.sort() should sort an array of numbers in descending order when ascending is false",
    test: () => {
      const series = new Series([5, 3, 8, 1, 4], 'numbers');
      const result = series.sort(false).array;
      const expected = [8, 5, 4, 3, 1];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "Series.sort() should handle mixed data types correctly in ascending order",
    test: () => {
      const series = new Series([5, "10", null, undefined, "banana", "apple"], 'mixed');
      const result = series.sort().array;
      const expected = [5, "10", "apple", "banana", null, undefined];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "Series.sort() should handle mixed data types correctly in descending order",
    test: () => {
      const series = new Series([5, "10", null, undefined, "banana", "apple"], 'mixed');
      const result = series.sort(false).array;
      const expected = [null, null, "banana", "apple", "10", 5]; // Nulls grouped first
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "Series.sort() should sort using a custom comparator",
    test: () => {
      const series = new Series([3, 1, 4, 2, 5], 'custom');
      const result = series.sort(true, (a, b) => b - a).array;
      const expected = [5, 4, 3, 2, 1];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "Series.sort() should handle an empty Series gracefully",
    test: () => {
      const series = new Series([], 'empty');
      const result = series.sort().array;
      const expected = [];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "Series.sort() should correctly sort an array with null and undefined values",
    test: () => {
      const series = new Series([3, null, 1, undefined, 2], 'withNulls');
      const result = series.sort().array;
      const expected = [1, 2, 3, null, undefined];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "Series.sort() should correctly sort an array of strings in ascending order",
    test: () => {
      const series = new Series(["banana", "apple", "cherry"], 'strings');
      const result = series.sort().array;
      const expected = ["apple", "banana", "cherry"];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "Series.sort() should correctly sort an array of strings in descending order",
    test: () => {
      const series = new Series(["banana", "apple", "cherry"], 'strings');
      const result = series.sort(false).array;
      const expected = ["cherry", "banana", "apple"];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
];
