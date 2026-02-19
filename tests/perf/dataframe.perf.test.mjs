import { measureBenchmark } from './measure.mjs';
import {
  generateNumericRecords,
  generateDuplicateRecords,
  generateMergeRecords,
  generateGroupByRecords
} from './data-generators.mjs';

export function runDataFramePerf(context, options = {}) {
  const {
    rows = 100000,
    samples = 1
  } = options;

  const DataFrame = context.DataFrame;

  const records10 = generateNumericRecords(rows, 10);
  const fromRecords = measureBenchmark(
    `dataframe.fromRecords_${rows}_10`,
    () => DataFrame.fromRecords(records10),
    {
      samples,
      resetCounters: () => DataFrame.__resetPerfCounters(),
      readCounters: () => DataFrame.__getPerfCounters()
    }
  );

  const df10 = DataFrame.fromRecords(records10);

  const toRecords = measureBenchmark(
    `dataframe.toRecords_${rows}_10`,
    () => df10.toRecords(),
    {
      samples,
      resetCounters: () => DataFrame.__resetPerfCounters(),
      readCounters: () => DataFrame.__getPerfCounters()
    }
  );

  const sorted = measureBenchmark(
    `dataframe.sort_numeric_${rows}`,
    () => df10.sort('c0', true),
    {
      samples,
      resetCounters: () => DataFrame.__resetPerfCounters(),
      readCounters: () => DataFrame.__getPerfCounters()
    }
  );

  const duplicateRecords = generateDuplicateRecords(rows, 0.4);
  const duplicateDf = DataFrame.fromRecords(duplicateRecords);
  const dropDuplicates = measureBenchmark(
    `dataframe.dropDuplicates_subset_${rows}`,
    () => duplicateDf.dropDuplicates(['user_id', 'region']),
    {
      samples,
      resetCounters: () => DataFrame.__resetPerfCounters(),
      readCounters: () => DataFrame.__getPerfCounters()
    }
  );

  const mergeInputs = generateMergeRecords(rows);
  const left = DataFrame.fromRecords(mergeInputs.left);
  const right = DataFrame.fromRecords(mergeInputs.right);
  const mergeInner = measureBenchmark(
    `dataframe.merge_inner_${rows}`,
    () => left.merge(right, 'inner', { on: 'id' }),
    {
      samples,
      resetCounters: () => DataFrame.__resetPerfCounters(),
      readCounters: () => DataFrame.__getPerfCounters()
    }
  );

  const groupByDf = DataFrame.fromRecords(generateGroupByRecords(rows));
  const groupByAgg = measureBenchmark(
    `dataframe.groupBy_agg_${rows}`,
    () => groupByDf.groupBy(['bucket']).agg({ amount: ['sum', 'mean', 'count'] }),
    {
      samples,
      resetCounters: () => DataFrame.__resetPerfCounters(),
      readCounters: () => DataFrame.__getPerfCounters()
    }
  );

  return [
    fromRecords,
    toRecords,
    sorted,
    dropDuplicates,
    mergeInner,
    groupByAgg
  ];
}
