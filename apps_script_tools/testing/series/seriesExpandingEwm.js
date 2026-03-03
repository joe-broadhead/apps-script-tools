SERIES_EXPANDING_EWM_TESTS = [
  {
    description: 'Series.expanding should compute cumulative mean/sum/count with minPeriods',
    test: () => {
      const series = new Series([1, 2, null, 4], 'values');
      const sumOut = series.expanding('sum');
      const countOut = series.expanding('count');
      const meanOut = series.expanding({ operation: 'mean', minPeriods: 2 });

      if (JSON.stringify(sumOut.array) !== JSON.stringify([1, 3, 3, 7])) {
        throw new Error(`Unexpected expanding sum output: ${JSON.stringify(sumOut.array)}`);
      }

      if (JSON.stringify(countOut.array) !== JSON.stringify([1, 2, 2, 3])) {
        throw new Error(`Unexpected expanding count output: ${JSON.stringify(countOut.array)}`);
      }

      if (JSON.stringify(meanOut.array) !== JSON.stringify([null, 1.5, 1.5, 7 / 3])) {
        throw new Error(`Unexpected expanding mean output: ${JSON.stringify(meanOut.array)}`);
      }
    }
  },
  {
    description: 'Series.ewm should compute deterministic EWMA with adjust and minPeriods controls',
    test: () => {
      const base = new Series([1, 2, 3], 'values');
      const out = base.ewm({ alpha: 0.5, adjust: false });

      if (JSON.stringify(out.array) !== JSON.stringify([1, 1.5, 2.25])) {
        throw new Error(`Unexpected ewm output: ${JSON.stringify(out.array)}`);
      }

      const withNull = new Series([1, null, 3], 'with_null');
      const minPeriods = withNull.ewm({ alpha: 0.5, adjust: false, minPeriods: 2, ignoreNulls: true });
      if (JSON.stringify(minPeriods.array) !== JSON.stringify([null, null, 2])) {
        throw new Error(`Unexpected ewm minPeriods output: ${JSON.stringify(minPeriods.array)}`);
      }

      const gapAware = withNull.ewm({ alpha: 0.5, adjust: false, ignoreNulls: false });
      if (JSON.stringify(gapAware.array) !== JSON.stringify([1, null, 1.75])) {
        throw new Error(`Unexpected ewm gap-aware output: ${JSON.stringify(gapAware.array)}`);
      }
    }
  }
];
