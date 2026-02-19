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

  return [multiply];
}
