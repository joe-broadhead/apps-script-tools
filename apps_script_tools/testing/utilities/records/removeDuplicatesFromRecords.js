RECORDS_REMOVE_DUPLICATES_FROM_RECORDS_TESTS = [
  {
    description: 'removeDuplicatesFromRecords() should remove duplicate records based on all keys by default',
    test: () => {
      const records = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 1, name: "Alice" }, // Duplicate
      ];
      const result = removeDuplicatesFromRecords(records);
      const expected = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'removeDuplicatesFromRecords() should remove duplicate records based on specific keys',
    test: () => {
      const records = [
        { id: 1, name: "Alice", age: 25 },
        { id: 2, name: "Bob", age: 30 },
        { id: 3, name: "Alice", age: 35 }, // Same name, different age
      ];
      const result = removeDuplicatesFromRecords(records, ["name"]);
      const expected = [
        { id: 1, name: "Alice", age: 25 },
        { id: 2, name: "Bob", age: 30 },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'removeDuplicatesFromRecords() should handle an empty records array',
    test: () => {
      const records = [];
      const result = removeDuplicatesFromRecords(records);
      const expected = [];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'removeDuplicatesFromRecords() should handle records with no duplicate entries',
    test: () => {
      const records = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Charlie" },
      ];
      const result = removeDuplicatesFromRecords(records);
      const expected = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Charlie" },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'removeDuplicatesFromRecords() should remove duplicate records based on multiple keys',
    test: () => {
      const records = [
        { id: 1, name: "Alice", age: 25 },
        { id: 2, name: "Alice", age: 30 },
        { id: 3, name: "Alice", age: 25 }, // Duplicate of the first record
      ];
      const result = removeDuplicatesFromRecords(records, ["name", "age"]);
      const expected = [
        { id: 1, name: "Alice", age: 25 },
        { id: 2, name: "Alice", age: 30 },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'removeDuplicatesFromRecords() should handle records with null or undefined values',
    test: () => {
      const records = [
        { id: 1, name: null },
        { id: 2, name: "Alice" },
        { id: 3, name: null }, // Duplicate based on "name"
      ];
      const result = removeDuplicatesFromRecords(records, ["name"]);
      const expected = [
        { id: 1, name: null },
        { id: 2, name: "Alice" },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'removeDuplicatesFromRecords() should handle records with mixed data types',
    test: () => {
      const records = [
        { id: 1, value: "1" },
        { id: 2, value: 1 }, // Different type, treated as unique
        { id: 3, value: true }, // Different type, treated as unique
        { id: 4, value: "1" }, // Duplicate of the first record
      ];
      const result = removeDuplicatesFromRecords(records, ["value"]);
      const expected = [
        { id: 1, value: "1" },
        { id: 2, value: 1 },
        { id: 3, value: true },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'removeDuplicatesFromRecords() should sort keys for consistent comparison',
    test: () => {
      const records = [
        { id: 1, name: "Alice" },
        { name: "Alice", id: 1 }, // Same keys in different order
        { id: 2, name: "Bob" },
      ];
      const result = removeDuplicatesFromRecords(records);
      const expected = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
];
