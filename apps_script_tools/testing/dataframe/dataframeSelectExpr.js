DATAFRAME_SELECT_EXPR_TESTS = [
  {
    description: 'DataFrame.selectExpr() should support passthrough and computed projections',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: 1, amount: 10, score: 81 },
        { id: 2, amount: 20, score: 63 }
      ]);

      const result = df.selectExpr({
        id: 'id',
        amount_doubled: row => row.amount * 2,
        score_bucket: (columns, idx) => columns.score.array[idx] >= 80 ? 'high' : 'standard'
      });

      if (JSON.stringify(result.columns) !== JSON.stringify(['id', 'amount_doubled', 'score_bucket'])) {
        throw new Error(`Unexpected columns: ${JSON.stringify(result.columns)}`);
      }

      if (JSON.stringify(result.amount_doubled.array) !== JSON.stringify([20, 40])) {
        throw new Error(`Expected doubled amounts [20, 40], got ${JSON.stringify(result.amount_doubled.array)}`);
      }

      if (JSON.stringify(result.score_bucket.array) !== JSON.stringify(['high', 'standard'])) {
        throw new Error(`Unexpected score buckets: ${JSON.stringify(result.score_bucket.array)}`);
      }
    }
  },
  {
    description: 'DataFrame.selectExpr() should null-fill unknown passthrough columns when strict=false',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: 1 },
        { id: 2 }
      ]);

      const result = df.selectExpr({
        id: 'id',
        missing: 'not_present'
      }, { strict: false });

      if (JSON.stringify(result.missing.array) !== JSON.stringify([null, null])) {
        throw new Error(`Expected null-filled missing column, got ${JSON.stringify(result.missing.array)}`);
      }
    }
  },
  {
    description: 'DataFrame.selectExpr() should support onError=null for expression failures',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: 1, amount: 10 },
        { id: 2, amount: null }
      ]);

      const result = df.selectExpr({
        safe_div: row => {
          if (row.amount == null) {
            throw new Error('missing amount');
          }
          return 100 / row.amount;
        }
      }, { onError: 'null' });

      if (JSON.stringify(result.safe_div.array) !== JSON.stringify([10, null])) {
        throw new Error(`Expected [10, null], got ${JSON.stringify(result.safe_div.array)}`);
      }
    }
  }
];
