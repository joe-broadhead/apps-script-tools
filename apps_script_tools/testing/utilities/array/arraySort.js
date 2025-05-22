ARRAY_SORT_TESTS = [
  {
    description: 'arraySort() should sort an array of numbers in ascending order by default',
    test: () => {
      const array = [3, 1, 4, 2, 5];
      const result = arraySort(array);

      const expectedSorted = [1, 2, 3, 4, 5]; // Default ascending order
      if (JSON.stringify(result) !== JSON.stringify(expectedSorted)) {
        throw new Error(`Expected ${JSON.stringify(expectedSorted)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arraySort() should sort an array of numbers in descending order when specified',
    test: () => {
      const array = [3, 1, 4, 2, 5];
      const result = arraySort(array, false);

      const expectedSorted = [5, 4, 3, 2, 1]; // Descending order
      if (JSON.stringify(result) !== JSON.stringify(expectedSorted)) {
        throw new Error(`Expected ${JSON.stringify(expectedSorted)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arraySort() should handle an array with null and undefined values',
    test: () => {
      const array = [3, null, 1, undefined, 4, 2];
      const result = arraySort(array);

      const expectedSorted = [1, 2, 3, 4, null, undefined]; // Null and undefined at the end
      if (JSON.stringify(result) !== JSON.stringify(expectedSorted)) {
        throw new Error(`Expected ${JSON.stringify(expectedSorted)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arraySort() should handle an array of strings in ascending order by default',
    test: () => {
      const array = ['banana', 'apple', 'cherry', 'date'];
      const result = arraySort(array);

      const expectedSorted = ['apple', 'banana', 'cherry', 'date']; // Alphabetical order
      if (JSON.stringify(result) !== JSON.stringify(expectedSorted)) {
        throw new Error(`Expected ${JSON.stringify(expectedSorted)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arraySort() should sort an array of mixed data types',
    test: () => {
      const array = [3, 'banana', null, 1, 'apple', undefined, 2];
      const result = arraySort(array);

      const expectedSorted = [1, 2, 3, 'apple', 'banana', null, undefined]; // Numbers, then strings, then nulls
      if (JSON.stringify(result) !== JSON.stringify(expectedSorted)) {
        throw new Error(`Expected ${JSON.stringify(expectedSorted)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arraySort() should sort an array using a custom comparator',
    test: () => {
      const array = [3, 1, 4, 2, 5];
      const result = arraySort(array, true, (a, b) => {
        const diff = Math.abs(a - 3) - Math.abs(b - 3);
        return diff !== 0 ? diff : a - b; // Tie-breaker: Sort by natural order
      });
      
      const expectedSorted = [3, 2, 4, 1, 5]; // Distance from 3, stable order
      if (JSON.stringify(result) !== JSON.stringify(expectedSorted)) {
        throw new Error(`Expected ${JSON.stringify(expectedSorted)}, but got ${JSON.stringify(result)}`);
      }           
    }
  },
  {
    description: 'arraySort() should handle an empty array',
    test: () => {
      const array = [];
      const result = arraySort(array);

      const expectedSorted = []; // No elements to sort
      if (JSON.stringify(result) !== JSON.stringify(expectedSorted)) {
        throw new Error(`Expected ${JSON.stringify(expectedSorted)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arraySort() should handle a large array efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, () => Math.random());
      const result = arraySort(largeArray);

      const expectedSorted = [...largeArray].sort((a, b) => a - b); // Compare against native sort
      if (JSON.stringify(result) !== JSON.stringify(expectedSorted)) {
        throw new Error('The sorted array does not match the expected sorted array');
      }
    }
  }
];
