DATAFRAME_SCHEMA_TESTS = [
  {
    description: 'DataFrame.schema() should return inferred column types',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: 1, name: 'Alice', active: true },
        { id: 2, name: 'Bob', active: false }
      ]);

      const schema = df.schema();
      const expected = { id: 'number', name: 'string', active: 'boolean' };

      if (JSON.stringify(schema) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(schema)}`);
      }
    }
  },
  {
    description: 'DataFrame.schema() should include undefined for empty columns',
    test: () => {
      const df = new DataFrame({
        id: new Series([], 'id'),
        amount: new Series([], 'amount')
      });

      const schema = df.schema();
      const expected = { id: 'undefined', amount: 'undefined' };

      if (JSON.stringify(schema) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(schema)}`);
      }
    }
  },
  {
    description: 'DataFrame.schema() should reflect explicit asType() casts',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: 1, amount: '10.5' },
        { id: 2, amount: '20.25' }
      ]).asType({
        id: 'string',
        amount: 'float'
      });

      const schema = df.schema();
      const expected = { id: 'string', amount: 'number' };

      if (JSON.stringify(schema) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(schema)}`);
      }
    }
  }
];
