import { measureBenchmark } from './measure.mjs';

export function runSeriesPerf(context, options = {}) {
  const {
    rows = 100000,
    samples = 1
  } = options;

  const series = context.Series.fromRange(1, rows, 1, 'numbers');

  const multiply = measureBenchmark(
    `series.multiply_${rows}`,
    () => series.multiply(2),
    { samples }
  );

  const expanding = measureBenchmark(
    `series.expanding_mean_${rows}`,
    () => series.expanding('mean'),
    { samples }
  );

  const ewm = measureBenchmark(
    `series.ewm_${rows}`,
    () => series.ewm({ alpha: 0.4, adjust: false }),
    { samples }
  );

  return [multiply, expanding, ewm];
}
