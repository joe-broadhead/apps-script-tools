import { measureBenchmark } from './measure.mjs';
import { generateDuplicateRecords, generateMergeRecords } from './data-generators.mjs';

export function runUtilitiesPerf(context, options = {}) {
  const {
    rows = 100000,
    samples = 1
  } = options;

  const duplicateRecords = generateDuplicateRecords(rows, 0.4);
  const removeDuplicates = measureBenchmark(
    `utilities.removeDuplicates_records_${rows}`,
    () => context.removeDuplicatesFromRecords(duplicateRecords, ['user_id', 'region']),
    { samples }
  );

  const mergeData = generateMergeRecords(rows);
  const joinInner = measureBenchmark(
    `utilities.joinRecords_inner_${rows}`,
    () => context.joinRecordsOnKeys(mergeData.left, mergeData.right, 'inner', { on: 'id' }),
    { samples }
  );

  return [removeDuplicates, joinInner];
}
