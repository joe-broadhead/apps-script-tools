DATAFRAME_MERGE_TESTS = [
  {
    description: 'DataFrame.merge() should perform an inner join using `on`',
    test: () => {
      const dfL = DataFrame.fromRecords([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      const dfR = DataFrame.fromRecords([
        { id: 2, age: 30 },
        { id: 3, age: 40 },
      ]);
      const result = dfL.merge(dfR, 'inner', { on: 'id' }).toRecords();
      const expected = [{ id: 2, name: 'Bob', age: 30 }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'DataFrame.merge() should perform an inner join on multiple keys',
    test: () => {
      const dfL = DataFrame.fromRecords([
        { id: 1, type: 'x', value: 10 },
        { id: 2, type: 'y', value: 20 },
      ]);
      const dfR = DataFrame.fromRecords([
        { id: 1, type: 'x', weight: 100 },
        { id: 2, type: 'z', weight: 200 },
      ]);
      const result = dfL.merge(dfR, 'inner', { on: ['id', 'type'] }).toRecords();
      const expected = [{ id: 1, type: 'x', value: 10, weight: 100 }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'DataFrame.merge() should return empty array for inner join with no matches',
    test: () => {
      const dfL = DataFrame.fromRecords([{ id: 1, foo: 'a' }]);
      const dfR = DataFrame.fromRecords([{ id: 2, bar: 'b' }]);
      const result = dfL.merge(dfR, 'inner', { on: 'id' }).toRecords();
      const expected = [];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'DataFrame.merge() should perform a left join with unmatched rows',
    test: () => {
      const dfL = DataFrame.fromRecords([
        { id: 1, foo: 'a' },
        { id: 2, foo: 'b' },
      ]);
      const dfR = DataFrame.fromRecords([{ id: 2, bar: 'B' }]);
      const result = dfL.merge(dfR, 'left', { on: 'id' }).toRecords();
      const expected = [
        { id: 1, foo: 'a', bar: null },
        { id: 2, foo: 'b', bar: 'B' },
      ];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'DataFrame.merge() should perform a right join with unmatched rows',
    test: () => {
      const dfL = DataFrame.fromRecords([{ id: 1, foo: 'A' }]);
      const dfR = DataFrame.fromRecords([
        { id: 1, bar: 'a' },
        { id: 2, bar: 'b' },
      ]);
      const result = dfL.merge(dfR, 'right', { on: 'id' }).toRecords();
      const expected = [
        { id: 1, foo: 'A', bar: 'a' },
        { id: 2, foo: null, bar: 'b' },
      ];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'DataFrame.merge() should perform an outer join with mixed rows',
    test: () => {
      const dfL = DataFrame.fromRecords([{ id: 1, x: 10 }]);
      const dfR = DataFrame.fromRecords([{ id: 2, y: 20 }]);
      const result = dfL.merge(dfR, 'outer', { on: 'id' }).toRecords();
      const expected = [
        { id: 1, x: 10, y: null },
        { id: 2, x: null, y: 20 },
      ];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'DataFrame.merge() should perform a cross join (Cartesian product) when no `on` provided',
    test: () => {
      const dfL = DataFrame.fromRecords([{ a: 1 }, { a: 2 }]);
      const dfR = DataFrame.fromRecords([{ b: 'x' }, { b: 'y' }]);
      const result = dfL.merge(dfR, 'cross', {}).toRecords();
      const expected = [
        { a: 1, b: 'x' },
        { a: 1, b: 'y' },
        { a: 2, b: 'x' },
        { a: 2, b: 'y' },
      ];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'DataFrame.merge() should suffix overlapping columns with default suffixes',
    test: () => {
      const dfL = DataFrame.fromRecords([{ id: 1, value: 100 }]);
      const dfR = DataFrame.fromRecords([{ id: 1, value: 200 }]);
      const result = dfL.merge(dfR, 'inner', { on: 'id' }).toRecords();
      const expected = [{ id: 1, value_x: 100, value_y: 200 }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'DataFrame.merge() should suffix overlapping columns with custom suffixes',
    test: () => {
      const dfL = DataFrame.fromRecords([{ id: 1, value: 100 }]);
      const dfR = DataFrame.fromRecords([{ id: 1, value: 200 }]);
      const result = dfL.merge(dfR, 'inner', { on: 'id', suffixes: ['', '_r'] }).toRecords();
      const expected = [{ id: 1, value: 100, value_r: 200 }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'DataFrame.merge() should support snake_case leftOn/rightOn',
    test: () => {
      const dfL = DataFrame.fromRecords([{ user_id: 1, name: 'Alice' }]);
      const dfR = DataFrame.fromRecords([{ uid:     1, score: 50 }]);
      const result = dfL.merge(dfR, 'inner', {
        leftOn:  'user_id',
        rightOn: 'uid'
      }).toRecords();

      const expected = [{ user_id: 1, name: 'Alice', uid: 1, score: 50 }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(
          `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`
        );
      }
    },
  },

  {
    description: 'DataFrame.merge() should preserve nested object values with lowercase suffixes',
    test: () => {
      const dfL = DataFrame.fromRecords([{ id: 1, meta: { a: 1 } }]);
      const dfR = DataFrame.fromRecords([{ id: 1, meta: { b: 2 } }]);
      const result = dfL.merge(dfR, 'inner', {
        on:       'id',
        suffixes: ['_l', '_r']
      }).toRecords();

      const expected = [{ id: 1, meta_l: { a: 1 }, meta_r: { b: 2 } }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(
          `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`
        );
      }
    },
  },
  {
    description: 'DataFrame.merge() should validate one_to_one cardinality',
    test: () => {
      const dfL = DataFrame.fromRecords([{ id: 1 }, { id: 2 }]);
      const dfR = DataFrame.fromRecords([{ id: 1 }, { id: 2 }]);
      const result = dfL.merge(dfR, 'inner', { on: 'id', validate: 'one_to_one' }).toRecords();
      const expected = [{ id: 1 }, { id: 2 }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'DataFrame.merge() should validate one_to_many cardinality',
    test: () => {
      const dfL = DataFrame.fromRecords([{ id: 1 }]);
      const dfR = DataFrame.fromRecords([{ id: 1, x: 1 }, { id: 1, x: 2 }]);
      const result = dfL.merge(dfR, 'inner', { on: 'id', validate: 'one_to_many' }).toRecords();
      const expected = [{ id: 1, x: 1 }, { id: 1, x: 2 }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'DataFrame.merge() should validate many_to_one cardinality',
    test: () => {
      const dfL = DataFrame.fromRecords([{ id: 1, y: 1 }, { id: 1, y: 2 }]);
      const dfR = DataFrame.fromRecords([{ id: 1, z: 9 }]);
      const result = dfL.merge(dfR, 'inner', { on: 'id', validate: 'many_to_one' }).toRecords();
      const expected = [{ id: 1, y: 1, z: 9 }, { id: 1, y: 2, z: 9 }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'DataFrame.merge() should validate many_to_many cardinality',
    test: () => {
      const dfL = DataFrame.fromRecords([{ id: 1, y: 1 }, { id: 1, y: 2 }]);
      const dfR = DataFrame.fromRecords([{ id: 1, z: 9 }, { id: 1, z: 8 }]);
      const result = dfL.merge(dfR, 'inner', { on: 'id', validate: 'many_to_many' }).toRecords();
      const expected = [
        { id: 1, y: 1, z: 9 },
        { id: 1, y: 1, z: 8 },
        { id: 1, y: 2, z: 9 },
        { id: 1, y: 2, z: 8 },
      ];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
      }
    },
  }
];