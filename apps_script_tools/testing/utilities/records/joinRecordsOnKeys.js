const RECORDS_JOIN_RECORDS_ON_KEYS_TESTS = [
  {
    description: 'joinRecordsOnKeys() should perform an inner join using `on`',
    test: () => {
      const left = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const right = [
        { id: 2, age: 30 },
        { id: 3, age: 40 },
      ];
      const result = joinRecordsOnKeys(left, right, 'inner', { on: 'id' });
      const expected = [{ id: 2, name: 'Bob', age: 30 }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'joinRecordsOnKeys() should perform an inner join on multiple keys using `on` array',
    test: () => {
      const left = [
        { id: 1, type: 'x', value: 10 },
        { id: 2, type: 'y', value: 20 },
      ];
      const right = [
        { id: 1, type: 'x', weight: 100 },
        { id: 2, type: 'z', weight: 200 },
      ];
      const result = joinRecordsOnKeys(left, right, 'inner', { on: ['id','type'] });
      const expected = [{ id: 1, type: 'x', value: 10, weight: 100 }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'joinRecordsOnKeys() should return empty array for inner join with no matches',
    test: () => {
      const left = [{ id: 1, foo: 'a' }];
      const right = [{ id: 2, bar: 'b' }];
      const result = joinRecordsOnKeys(left, right, 'inner', { on: 'id' });
      const expected = [];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'joinRecordsOnKeys() should perform a left join with unmatched rows',
    test: () => {
      const left = [
        { id: 1, foo: 'a' },
        { id: 2, foo: 'b' },
      ];
      const right = [{ id: 2, bar: 'B' }];
      const result = joinRecordsOnKeys(left, right, 'left', { on: 'id' });
      const expected = [
        { id: 1, foo: 'a', bar: null },
        { id: 2, foo: 'b', bar: 'B' },
      ];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'joinRecordsOnKeys() should perform a right join with unmatched rows',
    test: () => {
      const left = [{ id: 1, foo: 'A' }];
      const right = [
        { id: 1, bar: 'a' },
        { id: 2, bar: 'b' },
      ];
      const result = joinRecordsOnKeys(left, right, 'right', { on: 'id' });
      const expected = [
        { id: 1, foo: 'A', bar: 'a' },
        { id: 2, foo: null, bar: 'b' },
      ];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'joinRecordsOnKeys() should perform an outer join with mixed rows',
    test: () => {
      const left = [{ id: 1, x: 10 }];
      const right = [{ id: 2, y: 20 }];
      const result = joinRecordsOnKeys(left, right, 'outer', { on: 'id' });
      const expected = [
        { id: 1, x: 10, y: null },
        { id: 2, x: null, y: 20 },
      ];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'joinRecordsOnKeys() should perform a cross join (Cartesian product) when no `on` provided',
    test: () => {
      const left = [{ a: 1 }, { a: 2 }];
      const right = [{ b: 'x' }, { b: 'y' }];
      const result = joinRecordsOnKeys(left, right, 'cross', {});
      const expected = [
        { a: 1, b: 'x' },
        { a: 1, b: 'y' },
        { a: 2, b: 'x' },
        { a: 2, b: 'y' },
      ];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'joinRecordsOnKeys() should suffix overlapping columns with default suffixes',
    test: () => {
      const left = [{ id: 1, value: 100 }];
      const right = [{ id: 1, value: 200 }];
      const result = joinRecordsOnKeys(left, right, 'inner', { on: 'id' });
      const expected = [{ id: 1, value_x: 100, value_y: 200 }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'joinRecordsOnKeys() should suffix overlapping columns with custom suffixes',
    test: () => {
      const left = [{ id: 1, value: 100 }];
      const right = [{ id: 1, value: 200 }];
      const result = joinRecordsOnKeys(left, right, 'inner', { on: 'id', suffixes: ['', '_r'] });
      const expected = [{ id: 1, value: 100, value_r: 200 }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'joinRecordsOnKeys() should support `leftOn` and `rightOn` options',
    test: () => {
      const left = [{ userId: 1, name: 'Alice' }];
      const right = [{ uid: 1, score: 50 }];
      const result = joinRecordsOnKeys(left, right, 'inner', { leftOn: 'userId', rightOn: 'uid' });
      const expected = [{ userId: 1, name: 'Alice', uid: 1, score: 50 }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'joinRecordsOnKeys() should validate one_to_one cardinality',
    test: () => {
      const left = [{ id: 1 }, { id: 2 }];
      const right = [{ id: 1 }, { id: 2 }];
      const result = joinRecordsOnKeys(left, right, 'inner', { on: 'id', validate: 'one_to_one' });
      const expected = [{ id: 1 }, { id: 2 }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'joinRecordsOnKeys() should validate one_to_many cardinality',
    test: () => {
      const left = [{ id: 1 }];
      const right = [{ id: 1, x: 1 }, { id: 1, x: 2 }];
      const result = joinRecordsOnKeys(left, right, 'inner', { on: 'id', validate: 'one_to_many' });
      const expected = [{ id: 1, x: 1 }, { id: 1, x: 2 }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'joinRecordsOnKeys() should validate many_to_one cardinality',
    test: () => {
      const left = [{ id: 1, y: 1 }, { id: 1, y: 2 }];
      const right = [{ id: 1, z: 9 }];
      const result = joinRecordsOnKeys(left, right, 'inner', { on: 'id', validate: 'many_to_one' });
      const expected = [{ id: 1, y: 1, z: 9 }, { id: 1, y: 2, z: 9 }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'joinRecordsOnKeys() should validate many_to_many cardinality',
    test: () => {
      const left = [{ id: 1, y: 1 }, { id: 1, y: 2 }];
      const right = [{ id: 1, z: 9 }, { id: 1, z: 8 }];
      const result = joinRecordsOnKeys(left, right, 'inner', { on: 'id', validate: 'many_to_many' });
      const expected = [
        { id: 1, y: 1, z: 9 },
        { id: 1, y: 1, z: 8 },
        { id: 1, y: 2, z: 9 },
        { id: 1, y: 2, z: 8 },
      ];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'joinRecordsOnKeys() should preserve nested object values with suffixes',
    test: () => {
      const left = [{ id: 1, meta: { a: 1 } }];
      const right = [{ id: 1, meta: { b: 2 } }];
      const result = joinRecordsOnKeys(left, right, 'inner', {
        on: 'id',
        suffixes: ['_L', '_R']
      });
      const expected = [{ id: 1, meta_L: { a: 1 }, meta_R: { b: 2 } }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
];
