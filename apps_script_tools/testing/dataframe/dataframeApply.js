DATAFRAME_APPLY_TESTS = [
  {
    description: 'DataFrame.apply() over rows should return Series for scalar output',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: 1, amount: 10 },
        { id: 2, amount: 20 }
      ]);
      df.index = ['r1', 'r2'];

      const result = df.apply(row => row.at(0) + row.at(1), { axis: 'rows', resultName: 'total' });

      if (!(result instanceof Series)) {
        throw new Error('Expected Series result');
      }

      if (result.name !== 'total') {
        throw new Error(`Expected result name 'total', got '${result.name}'`);
      }

      if (JSON.stringify(result.array) !== JSON.stringify([11, 22])) {
        throw new Error(`Unexpected result values: ${JSON.stringify(result.array)}`);
      }

      if (JSON.stringify(result.index) !== JSON.stringify(['r1', 'r2'])) {
        throw new Error(`Expected preserved row index, got ${JSON.stringify(result.index)}`);
      }
    }
  },
  {
    description: 'DataFrame.apply() over columns should return Series for scalar output',
    test: () => {
      const df = DataFrame.fromRecords([
        { amount: 10, score: 2 },
        { amount: 20, score: 3 }
      ]);

      const result = df.apply(column => column.sum(), { axis: 'columns' });

      if (!(result instanceof Series)) {
        throw new Error('Expected Series result');
      }

      if (JSON.stringify(result.index) !== JSON.stringify(['amount', 'score'])) {
        throw new Error(`Expected column index labels, got ${JSON.stringify(result.index)}`);
      }

      if (JSON.stringify(result.array) !== JSON.stringify([30, 5])) {
        throw new Error(`Unexpected column apply sums: ${JSON.stringify(result.array)}`);
      }
    }
  },
  {
    description: 'DataFrame.apply() should return DataFrame for object mapper output',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: 1, amount: 10 },
        { id: 2, amount: 5 }
      ]);
      df.index = ['a', 'b'];

      const result = df.apply(row => ({ id: row.at(0), doubled: row.at(1) * 2 }));

      if (!(result instanceof DataFrame)) {
        throw new Error('Expected DataFrame result');
      }

      if (JSON.stringify(result.columns) !== JSON.stringify(['id', 'doubled'])) {
        throw new Error(`Unexpected columns: ${JSON.stringify(result.columns)}`);
      }

      if (JSON.stringify(result.index) !== JSON.stringify(['a', 'b'])) {
        throw new Error(`Expected transformed index labels, got ${JSON.stringify(result.index)}`);
      }
    }
  },
  {
    description: 'DataFrame.apply() should reject mixed mapper output types',
    test: () => {
      const df = DataFrame.fromRecords([{ value: 1 }, { value: 2 }]);

      let threw = false;
      try {
        df.apply((row, _, pos) => (pos === 0 ? row.at(0) : { value: row.at(0) }));
      } catch (error) {
        threw = /consistent callback return type/.test(error.message);
      }

      if (!threw) {
        throw new Error('Expected mixed output type validation error');
      }
    }
  },
  {
    description: 'DataFrame.apply() axis=columns should treat Date index labels with equal timestamps as aligned',
    test: () => {
      const t0 = new Date('2026-01-01T00:00:00.000Z');
      const t1 = new Date('2026-01-02T00:00:00.000Z');

      const df = DataFrame.fromRecords([
        { value: 1 },
        { value: 2 }
      ]);
      df.index = [t0, t1];

      const result = df.apply(
        column => DataFrame.fromColumns({
          shifted: column.array.map(value => value + 10)
        }, {
          index: [new Date(t0.getTime()), new Date(t1.getTime())]
        }),
        { axis: 'columns' }
      );

      if (!(result instanceof DataFrame)) {
        throw new Error('Expected DataFrame output');
      }

      if (JSON.stringify(result.columns) !== JSON.stringify(['value_shifted'])) {
        throw new Error(`Unexpected output columns: ${JSON.stringify(result.columns)}`);
      }

      if (result.at(0).value_shifted !== 11 || result.at(1).value_shifted !== 12) {
        throw new Error(`Unexpected output values: ${JSON.stringify(result.toRecords())}`);
      }
    }
  },
  {
    description: 'DataFrame.applyMap() should map each cell without mutating input',
    test: () => {
      const df = DataFrame.fromRecords([
        { a: 1, b: 2 },
        { a: 3, b: 4 }
      ]);

      const result = df.applyMap((value, rowLabel, columnName, rowPos, columnPos) => {
        return `${rowLabel}:${columnName}:${value + rowPos + columnPos}`;
      });

      if (JSON.stringify(df.toRecords()) !== JSON.stringify([{ a: 1, b: 2 }, { a: 3, b: 4 }])) {
        throw new Error('applyMap mutated input DataFrame');
      }

      if (JSON.stringify(result.toRecords()) !== JSON.stringify([
        { a: '0:a:1', b: '0:b:3' },
        { a: '1:a:4', b: '1:b:6' }
      ])) {
        throw new Error(`Unexpected applyMap output: ${JSON.stringify(result.toRecords())}`);
      }
    }
  }
];
