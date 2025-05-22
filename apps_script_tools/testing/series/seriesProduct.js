SERIES_PRODUCT_TESTS = [
  {
    description: 'Series.product() should calculate the product of numeric values',
    test: () => {
      const series = new Series([2, 3, 4], 'values');
      const result = series.product();

      const expectedProduct = 2 * 3 * 4; // 24
      if (result !== expectedProduct) {
        throw new Error(`Expected ${expectedProduct}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.product() should skip non-numeric values in the calculation',
    test: () => {
      const series = new Series([2, "3", null, undefined, "text"], 'values');
      const result = series.product();

      const validValues = [2, 3]; // Skipping non-numeric values
      const expectedProduct = validValues.reduce((a, b) => a * b, 1); // 6

      if (result !== expectedProduct) {
        throw new Error(`Expected ${expectedProduct}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.product() should return 1 for an empty Series',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.product();

      const expectedProduct = 1; // Neutral element for multiplication
      if (result !== expectedProduct) {
        throw new Error(`Expected ${expectedProduct}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.product() should return the single element for a Series with one value',
    test: () => {
      const series = new Series([10], 'values');
      const result = series.product();

      const expectedProduct = 10; // Single value is the product
      if (result !== expectedProduct) {
        throw new Error(`Expected ${expectedProduct}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.product() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => i + 1); // Values 1 to 100
      const series = new Series(largeArray, 'large');
      const result = series.product();

      const expectedProduct = largeArray.reduce((a, b) => a * b, 1); // Factorial of 100
      if (result !== expectedProduct) {
        throw new Error(`Expected ${expectedProduct}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.product() should return 0 if the Series contains a 0',
    test: () => {
      const series = new Series([2, 3, 0, 4], 'values');
      const result = series.product();

      const expectedProduct = 0; // Any multiplication with 0 results in 0
      if (result !== expectedProduct) {
        throw new Error(`Expected ${expectedProduct}, but got ${result}`);
      }
    },
  },
];
