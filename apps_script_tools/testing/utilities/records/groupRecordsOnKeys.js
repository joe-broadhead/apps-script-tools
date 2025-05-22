RECORDS_GROUP_RECORDS_ON_KEYS_TESTS = [
  {
    description: 'groupRecordsOnKeys() should group records by a single key',
    test: () => {
      const records = [
        { id: 1, category: 'A', value: 10 },
        { id: 2, category: 'B', value: 20 },
        { id: 3, category: 'A', value: 30 },
      ];
      const result = groupRecordsOnKeys(records, ['category']);
      const expected = {
        'A': [
          { id: 1, category: 'A', value: 10 },
          { id: 3, category: 'A', value: 30 },
        ],
        'B': [
          { id: 2, category: 'B', value: 20 },
        ],
      };
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'groupRecordsOnKeys() should group records by multiple keys',
    test: () => {
      const records = [
        { id: 1, category: 'A', subcategory: 'X', value: 10 },
        { id: 2, category: 'B', subcategory: 'Y', value: 20 },
        { id: 3, category: 'A', subcategory: 'X', value: 30 },
        { id: 4, category: 'A', subcategory: 'Z', value: 40 },
      ];
      const result = groupRecordsOnKeys(records, ['category', 'subcategory']);
      const expected = {
        'A|X': [
          { id: 1, category: 'A', subcategory: 'X', value: 10 },
          { id: 3, category: 'A', subcategory: 'X', value: 30 },
        ],
        'B|Y': [
          { id: 2, category: 'B', subcategory: 'Y', value: 20 },
        ],
        'A|Z': [
          { id: 4, category: 'A', subcategory: 'Z', value: 40 },
        ],
      };
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'groupRecordsOnKeys() should handle records with missing keys',
    test: () => {
      const records = [
        { id: 1, category: 'A', value: 10 },
        { id: 2, value: 20 }, // Missing "category"
        { id: 3, category: 'A', value: 30 },
      ];
      const result = groupRecordsOnKeys(records, ['category']);
      const expected = {
        'A': [
          { id: 1, category: 'A', value: 10 },
          { id: 3, category: 'A', value: 30 },
        ],
        'null': [ // Represent missing keys as "null"
          { id: 2, value: 20 },
        ],
      };
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'groupRecordsOnKeys() should handle no keys specified',
    test: () => {
      const records = [
        { id: 1, category: 'A', value: 10 },
        { id: 2, category: 'B', value: 20 },
      ];
      const result = groupRecordsOnKeys(records, []);
      const expected = {
        '|': [
          { id: 1, category: 'A', value: 10 },
          { id: 2, category: 'B', value: 20 },
        ],
      };
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'groupRecordsOnKeys() should apply a custom function to each group',
    test: () => {
      const records = [
        { id: 1, category: 'A', value: 10 },
        { id: 2, category: 'B', value: 20 },
        { id: 3, category: 'A', value: 30 },
      ];
      const func = group => group.reduce((sum, item) => sum + item.value, 0);
      const result = groupRecordsOnKeys(records, ['category'], func);
      const expected = {
        'A': 40, // Sum of values in category A
        'B': 20, // Sum of values in category B
      };
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'groupRecordsOnKeys() should handle empty records array',
    test: () => {
      const records = [];
      const result = groupRecordsOnKeys(records, ['category']);
      const expected = {};
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
];
