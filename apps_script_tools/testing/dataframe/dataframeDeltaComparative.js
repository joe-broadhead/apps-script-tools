DATAFRAME_DELTA_COMPARATIVE_TESTS = [
  {
    description: 'DataFrame.shift supports row-axis and column-axis behavior',
    test: () => {
      const dataframe = DataFrame.fromRecords([
        { a: 1, b: 10, c: 100 },
        { a: 2, b: 20, c: 200 }
      ]);

      const rowShift = dataframe.shift(1, { axis: 'rows', fillValue: 0 });
      if (JSON.stringify(rowShift.data.a.array) !== JSON.stringify([0, 1])) {
        throw new Error(`Expected row-shift column a [0,1], got ${JSON.stringify(rowShift.data.a.array)}`);
      }

      const columnShift = dataframe.shift(1, { axis: 'columns', fillValue: null });
      if (JSON.stringify(columnShift.data.a.array) !== JSON.stringify([null, null])) {
        throw new Error(`Expected column-shift column a [null,null], got ${JSON.stringify(columnShift.data.a.array)}`);
      }
      if (JSON.stringify(columnShift.data.b.array) !== JSON.stringify([1, 2])) {
        throw new Error(`Expected column-shift column b [1,2], got ${JSON.stringify(columnShift.data.b.array)}`);
      }
    }
  },
  {
    description: 'DataFrame.diff handles axis and boundary rows',
    test: () => {
      const dataframe = DataFrame.fromRecords([
        { a: 10, b: 20, c: 0 },
        { a: 20, b: 10, c: 10 }
      ]);

      const rowDiff = dataframe.diff(1, { axis: 'rows' });
      if (JSON.stringify(rowDiff.data.a.array) !== JSON.stringify([null, 10])) {
        throw new Error(`Expected row diff [null,10], got ${JSON.stringify(rowDiff.data.a.array)}`);
      }

      const columnDiff = dataframe.diff(1, { axis: 'columns' });
      if (JSON.stringify(columnDiff.data.b.array) !== JSON.stringify([10, -10])) {
        throw new Error(`Expected column diff for b [10,-10], got ${JSON.stringify(columnDiff.data.b.array)}`);
      }
    }
  },
  {
    description: 'DataFrame.pctChange supports zeroDivision behavior',
    test: () => {
      const dataframe = DataFrame.fromRecords([
        { a: 0, b: 10 },
        { a: 5, b: 20 }
      ]);

      const nullMode = dataframe.pctChange(1, { axis: 'rows', zeroDivision: 'null' });
      if (JSON.stringify(nullMode.data.a.array) !== JSON.stringify([null, null])) {
        throw new Error(`Expected null-mode [null,null], got ${JSON.stringify(nullMode.data.a.array)}`);
      }

      const infinityMode = dataframe.pctChange(1, { axis: 'rows', zeroDivision: 'infinity' });
      if (infinityMode.data.a.array[1] !== Infinity) {
        throw new Error(`Expected Infinity at row 1, got ${JSON.stringify(infinityMode.data.a.array)}`);
      }
    }
  }
];
