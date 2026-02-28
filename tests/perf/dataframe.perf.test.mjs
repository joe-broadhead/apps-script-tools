import { measureBenchmark } from './measure.mjs';
import {
  generateNumericRecords,
  generateDuplicateRecords,
  generateMergeRecords,
  generateGroupByRecords,
  generatePivotRecords
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

  const sample = measureBenchmark(
    `dataframe.sample_n1000_${rows}`,
    () => df10.sample({ n: 1000, randomState: 42 }),
    {
      samples,
      resetCounters: () => DataFrame.__resetPerfCounters(),
      readCounters: () => DataFrame.__getPerfCounters()
    }
  );

  const joinInner = measureBenchmark(
    `dataframe.join_inner_on_${rows}`,
    () => left.join(right, { how: 'inner', on: 'id' }),
    {
      samples,
      resetCounters: () => DataFrame.__resetPerfCounters(),
      readCounters: () => DataFrame.__getPerfCounters()
    }
  );

  const applyRows = Math.min(rows, 20000);
  const applyDf = DataFrame.fromRecords(generateNumericRecords(applyRows, 4));
  const applyRowsScalar = measureBenchmark(
    `dataframe.apply_rows_${applyRows}`,
    () => applyDf.apply(row => row.at(0) + row.at(1) + row.at(2), {
      axis: 'rows',
      resultName: 'row_total'
    }),
    {
      samples,
      resetCounters: () => DataFrame.__resetPerfCounters(),
      readCounters: () => DataFrame.__getPerfCounters()
    }
  );

  const pivotRows = Math.min(rows, 50000);
  const pivotDf = DataFrame.fromRecords(generatePivotRecords(pivotRows));
  const pivotTable = measureBenchmark(
    `dataframe.pivotTable_sum_${pivotRows}`,
    () => pivotDf.pivotTable({
      index: ['bucket'],
      columns: 'segment',
      values: ['amount'],
      aggFunc: 'sum',
      fillValue: 0
    }),
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
    groupByAgg,
    sample,
    joinInner,
    applyRowsScalar,
    pivotTable
  ];
}
