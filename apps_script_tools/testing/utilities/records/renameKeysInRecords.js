RECORDS_RENAME_KEYS_IN_RECORDS_TESTS = [
  {
    description: 'renameKeysInRecords() should rename keys in multiple records based on keyMapping',
    test: () => {
      const records = [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
        { a: 5, b: 6 },
      ];
      const keyMapping = { a: 'x', b: 'y' };
      const result = renameKeysInRecords(records, keyMapping);
      const expected = [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 5, y: 6 },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'renameKeysInRecords() should not modify keys not in keyMapping',
    test: () => {
      const records = [
        { a: 1, b: 2, c: 3 },
        { a: 4, b: 5, c: 6 },
      ];
      const keyMapping = { a: 'x' };
      const result = renameKeysInRecords(records, keyMapping);
      const expected = [
        { x: 1, b: 2, c: 3 },
        { x: 4, b: 5, c: 6 },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'renameKeysInRecords() should handle an empty records array',
    test: () => {
      const records = [];
      const keyMapping = { a: 'x', b: 'y' };
      const result = renameKeysInRecords(records, keyMapping);
      const expected = [];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'renameKeysInRecords() should handle an empty keyMapping',
    test: () => {
      const records = [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ];
      const keyMapping = {};
      const result = renameKeysInRecords(records, keyMapping);
      const expected = [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'renameKeysInRecords() should handle key collisions in keyMapping',
    test: () => {
      const records = [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ];
      const keyMapping = { a: 'x', b: 'x' }; // Both 'a' and 'b' map to 'x'
      const result = renameKeysInRecords(records, keyMapping);
      const expected = [
        { x: 2 },
        { x: 4 },
      ]; // Last mapping wins

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'renameKeysInRecords() should handle records with nested keys',
    test: () => {
      const records = [
        { a: { b: 2 }, c: 3 },
        { a: { b: 4 }, c: 5 },
      ];
      const keyMapping = { a: 'x', c: 'y' };
      const result = renameKeysInRecords(records, keyMapping);
      const expected = [
        { x: { b: 2 }, y: 3 },
        { x: { b: 4 }, y: 5 },
      ]; // Only top-level keys are renamed

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
];
