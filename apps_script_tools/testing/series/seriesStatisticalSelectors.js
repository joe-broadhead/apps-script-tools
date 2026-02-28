SERIES_STATISTICAL_SELECTORS_TESTS = [
  {
    description: 'Series.quantile() supports scalar and multiple quantiles',
    test: () => {
      const series = new Series([1, 2, 3, 4], 'values');
      if (series.quantile(0.5) !== 2.5) {
        throw new Error(`Expected median quantile 2.5, got ${series.quantile(0.5)}`);
      }

      const multi = series.quantile([0, 1]);
      if (JSON.stringify(multi.array) !== JSON.stringify([1, 4])) {
        throw new Error(`Expected [1,4], got ${JSON.stringify(multi.array)}`);
      }
    }
  },
  {
    description: 'Series.idxMax()/idxMin() return first matching index label',
    test: () => {
      const series = new Series([5, 5, 1], 'values', null, ['a', 'b', 'c']);
      if (series.idxMax() !== 'a') {
        throw new Error(`Expected idxMax to be 'a', got ${series.idxMax()}`);
      }
      if (series.idxMin() !== 'c') {
        throw new Error(`Expected idxMin to be 'c', got ${series.idxMin()}`);
      }
    }
  },
  {
    description: 'Series cumulative selector methods are non-mutating and index-preserving',
    test: () => {
      const series = new Series([2, '4', null, 3], 'values', null, ['r1', 'r2', 'r3', 'r4']);
      const base = JSON.stringify(series.array);

      const maxResult = series.cummax();
      const minResult = series.cummin();
      const productResult = series.cumproduct();

      if (JSON.stringify(maxResult.array) !== JSON.stringify([2, 4, 4, 4])) {
        throw new Error(`Unexpected cummax result: ${JSON.stringify(maxResult.array)}`);
      }
      if (JSON.stringify(minResult.array) !== JSON.stringify([2, 2, 2, 2])) {
        throw new Error(`Unexpected cummin result: ${JSON.stringify(minResult.array)}`);
      }
      if (JSON.stringify(productResult.array) !== JSON.stringify([2, 8, 8, 24])) {
        throw new Error(`Unexpected cumproduct result: ${JSON.stringify(productResult.array)}`);
      }
      if (JSON.stringify(maxResult.index) !== JSON.stringify(['r1', 'r2', 'r3', 'r4'])) {
        throw new Error(`Expected index to be preserved, got ${JSON.stringify(maxResult.index)}`);
      }
      if (JSON.stringify(series.array) !== base) {
        throw new Error('Series was mutated by cumulative selector methods');
      }
    }
  }
];
