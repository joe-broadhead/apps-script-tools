RECORDS_ZIP_ARRAYS_INTO_RECORDS_TESTS = [
  {
    description: 'zipArraysIntoRecords() should convert arrays into records using the header row',
    test: () => {
      const arrays = [
        ['name', 'age', 'city'],
        ['John', 25, 'New York'],
        ['Jane', 30, 'London'],
      ];
      const result = zipArraysIntoRecords(arrays);
      const expected = [
        { name: 'John', age: 25, city: 'New York' },
        { name: 'Jane', age: 30, city: 'London' },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'zipArraysIntoRecords() should handle an empty arrays input',
    test: () => {
      const arrays = [];
      const result = zipArraysIntoRecords(arrays);
      const expected = [];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'zipArraysIntoRecords() should handle arrays with only a header row',
    test: () => {
      const arrays = [['name', 'age', 'city']];
      const result = zipArraysIntoRecords(arrays);
      const expected = [];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'zipArraysIntoRecords() should handle a custom headerRow',
    test: () => {
      const arrays = [
        ['ignore', 'ignore', 'ignore'],
        ['name', 'age', 'city'],
        ['John', 25, 'New York'],
        ['Jane', 30, 'London'],
      ];
      const result = zipArraysIntoRecords(arrays, 1);
      const expected = [
        { name: 'John', age: 25, city: 'New York' },
        { name: 'Jane', age: 30, city: 'London' },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'zipArraysIntoRecords() should apply the provided transformation function to each record',
    test: () => {
      const arrays = [
        ['name', 'age'],
        ['John', 25],
        ['Jane', 30],
      ];
      const capitalizeNames = record => {
        record.name = record.name.toUpperCase();
        return record;
      };
      const result = zipArraysIntoRecords(arrays, 0, capitalizeNames);
      const expected = [
        { name: 'JOHN', age: 25 },
        { name: 'JANE', age: 30 },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'zipArraysIntoRecords() should pass additional arguments to the transformation function',
    test: () => {
      const arrays = [
        ['name', 'age'],
        ['John', 25],
        ['Jane', 30],
      ];
      const appendAgeCategory = (record, category) => {
        record.ageCategory = category;
        return record;
      };
      const result = zipArraysIntoRecords(arrays, 0, appendAgeCategory, 'adult');
      const expected = [
        { name: 'John', age: 25, ageCategory: 'adult' },
        { name: 'Jane', age: 30, ageCategory: 'adult' },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'zipArraysIntoRecords() should throw an error for mismatched header and row lengths',
    test: () => {
      const arrays = [
        ['name', 'age'],
        ['John', 25, 'extra'],
      ];

      try {
        zipArraysIntoRecords(arrays);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('The two arrays must have the same length')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'zipArraysIntoRecords() should handle arrays with mixed data types',
    test: () => {
      const arrays = [
        ['name', 'age', 'isActive'],
        ['John', '25', true],
        ['Jane', '30', false],
      ];
      const result = zipArraysIntoRecords(arrays);
      const expected = [
        { name: 'John', age: '25', isActive: true },
        { name: 'Jane', age: '30', isActive: false },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
];
