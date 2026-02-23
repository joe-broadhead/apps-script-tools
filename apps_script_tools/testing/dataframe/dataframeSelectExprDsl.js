DATAFRAME_SELECT_EXPR_DSL_TESTS = [
  {
    description: 'DataFrame.selectExprDsl() should evaluate arithmetic and CASE expressions',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: 1, amount: 10, score: 82 },
        { id: 2, amount: 20, score: 61 }
      ]);

      const result = df.selectExprDsl({
        id: 'id',
        amount_x2: 'amount * 2',
        amount_abs_delta: 'abs(amount - 15)',
        score_bucket: "case when score >= 80 then 'high' else 'standard' end"
      });

      if (JSON.stringify(result.amount_x2.array) !== JSON.stringify([20, 40])) {
        throw new Error(`Expected [20, 40], got ${JSON.stringify(result.amount_x2.array)}`);
      }

      if (JSON.stringify(result.amount_abs_delta.array) !== JSON.stringify([5, 5])) {
        throw new Error(`Expected [5, 5], got ${JSON.stringify(result.amount_abs_delta.array)}`);
      }

      if (JSON.stringify(result.score_bucket.array) !== JSON.stringify(['high', 'standard'])) {
        throw new Error(`Unexpected score buckets: ${JSON.stringify(result.score_bucket.array)}`);
      }
    }
  },
  {
    description: 'DataFrame.selectExprDsl() should null-fill unknown identifiers when strict=false',
    test: () => {
      const df = DataFrame.fromRecords([{ id: 1 }, { id: 2 }]);
      const result = df.selectExprDsl({
        derived: 'missing_col + 1'
      }, {
        strict: false
      });

      if (JSON.stringify(result.derived.array) !== JSON.stringify([null, null])) {
        throw new Error(`Expected [null, null], got ${JSON.stringify(result.derived.array)}`);
      }
    }
  },
  {
    description: 'DataFrame.selectExprDsl() should expose parse errors for malformed expressions',
    test: () => {
      const df = DataFrame.fromRecords([{ id: 1 }]);

      try {
        df.selectExprDsl({
          broken: 'id +'
        });
        throw new Error('Expected parse failure, but no error was thrown');
      } catch (error) {
        if (error.name !== 'DataFrameExprParseError') {
          throw new Error(`Expected DataFrameExprParseError, got ${error.name}`);
        }
      }
    }
  }
];
