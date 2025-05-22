RECORDS_STANDARDIZE_RECORDS_TESTS = [
  {
    description: 'standardizeRecords() should add missing keys with the default value',
    test: () => {
      const records = [
        { id: 1, name: "Alice" },
        { id: 2 },
      ];
      const result = standardizeRecords(records, "N/A");
      const expected = [
        { id: 1, name: "Alice" },
        { id: 2, name: "N/A" },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'standardizeRecords() should not modify the original records when modifyInPlace is false',
    test: () => {
      const records = [
        { id: 1, name: "Alice" },
        { id: 2 },
      ];
      const original = JSON.stringify(records);
      standardizeRecords(records, "N/A", false);
      
      if (JSON.stringify(records) !== original) {
        throw new Error(`Expected records to remain unchanged, but they were modified.`);
      }
    },
  },
  {
    description: 'standardizeRecords() should modify the original records when modifyInPlace is true',
    test: () => {
      const records = [
        { id: 1, name: "Alice" },
        { id: 2 },
      ];
      standardizeRecords(records, "N/A", true);
      const expected = [
        { id: 1, name: "Alice" },
        { id: 2, name: "N/A" },
      ];

      if (JSON.stringify(records) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(records)}`);
      }
    },
  },
  {
    description: 'standardizeRecords() should handle an empty records array',
    test: () => {
      const records = [];
      const result = standardizeRecords(records);
      const expected = [];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'standardizeRecords() should throw an error if input is not an array',
    test: () => {
      try {
        standardizeRecords({ id: 1, name: "Alice" });
        throw new Error('Expected an error, but none was thrown.');
      } catch (error) {
        if (!error.message.includes("Input must be an array of objects")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'standardizeRecords() should throw an error if a record is not an object',
    test: () => {
      const records = [
        { id: 1, name: "Alice" },
        null,
      ];
      try {
        standardizeRecords(records);
        throw new Error('Expected an error, but none was thrown.');
      } catch (error) {
        if (!error.message.includes("All records must be non-null objects")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'standardizeRecords() should handle records with undefined values by assigning default value',
    test: () => {
      const records = [
        { id: 1, name: undefined },
        { id: 2 },
      ];
      const result = standardizeRecords(records, "N/A");
      const expected = [
        { id: 1, name: "N/A" },
        { id: 2, name: "N/A" },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'standardizeRecords() should preserve existing keys and values',
    test: () => {
      const records = [
        { id: 1, name: "Alice", age: 25 },
        { id: 2, age: 30 },
      ];
      const result = standardizeRecords(records, "N/A");
      const expected = [
        { id: 1, name: "Alice", age: 25 },
        { id: 2, name: "N/A", age: 30 },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'standardizeRecords() should handle records with extra keys not present in all records',
    test: () => {
      const records = [
        { id: 1, name: "Alice", extra: "Extra" },
        { id: 2 },
      ];
      const result = standardizeRecords(records, "N/A");
      const expected = [
        { id: 1, name: "Alice", extra: "Extra" },
        { id: 2, name: "N/A", extra: "N/A" },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
];
