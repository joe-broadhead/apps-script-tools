function runPerformanceBenchmarks() {
  const thresholds = {
    fromRecords: 3500,
    sort: 3000,
    dropDuplicates: 2500,
    mergeInner: 4500,
    groupByAgg: 1200,
    suiteMs: 60000
  };

  const rows = 20000;
  const summary = {
    rows,
    startedAt: new Date().toISOString(),
    operations: {},
    counters: {}
  };

  const suiteStart = new Date().getTime();

  DataFrame.__resetPerfCounters();
  const baseRecords = __astGeneratePerfNumericRecords(rows, 10);

  const fromRecordsMs = __astMeasureMs(() => DataFrame.fromRecords(baseRecords));
  summary.operations.fromRecords = fromRecordsMs.ms;
  const df = fromRecordsMs.output;

  DataFrame.__resetPerfCounters();
  const sortMs = __astMeasureMs(() => df.sort('c0'));
  summary.operations.sort = sortMs.ms;
  summary.counters.sort = DataFrame.__getPerfCounters();

  DataFrame.__resetPerfCounters();
  const duplicateDf = DataFrame.fromRecords(__astGeneratePerfDuplicateRecords(rows));
  const dropDuplicatesMs = __astMeasureMs(() => duplicateDf.dropDuplicates(['user_id', 'region']));
  summary.operations.dropDuplicates = dropDuplicatesMs.ms;
  summary.counters.dropDuplicates = DataFrame.__getPerfCounters();

  DataFrame.__resetPerfCounters();
  const mergeData = __astGeneratePerfMergeRecords(rows);
  const leftDf = DataFrame.fromRecords(mergeData.left);
  const rightDf = DataFrame.fromRecords(mergeData.right);
  const mergeMs = __astMeasureMs(() => leftDf.merge(rightDf, 'inner', { on: 'id' }));
  summary.operations.mergeInner = mergeMs.ms;
  summary.counters.merge = DataFrame.__getPerfCounters();

  DataFrame.__resetPerfCounters();
  const groupDf = DataFrame.fromRecords(__astGeneratePerfGroupByRecords(rows));
  const groupByMs = __astMeasureMs(() => groupDf.groupBy(['bucket']).agg({ amount: ['sum', 'mean', 'count'] }));
  summary.operations.groupByAgg = groupByMs.ms;
  summary.counters.groupBy = DataFrame.__getPerfCounters();

  summary.operations.suiteMs = new Date().getTime() - suiteStart;
  summary.finishedAt = new Date().toISOString();

  const failures = [];
  Object.entries(thresholds).forEach(([name, threshold]) => {
    if (summary.operations[name] > threshold) {
      failures.push(`${name} exceeded threshold: ${summary.operations[name]}ms > ${threshold}ms`);
    }
  });

  if (summary.counters.sort.toRecords !== 0) {
    failures.push(`sort used toRecords unexpectedly: ${summary.counters.sort.toRecords}`);
  }
  if (summary.counters.dropDuplicates.toRecords !== 0) {
    failures.push(`dropDuplicates used toRecords unexpectedly: ${summary.counters.dropDuplicates.toRecords}`);
  }

  Logger.log(JSON.stringify(summary, null, 2));

  if (failures.length > 0) {
    throw new Error(`Performance suite failed:\n${failures.join('\n')}`);
  }

  return summary;
}

function __astMeasureMs(fn) {
  const start = new Date().getTime();
  const output = fn();
  return {
    ms: new Date().getTime() - start,
    output
  };
}

function __astGeneratePerfNumericRecords(rows, columnCount) {
  const records = new Array(rows);

  for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
    const record = {};

    for (let colIdx = 0; colIdx < columnCount; colIdx++) {
      record[`c${colIdx}`] = rowIdx + colIdx;
    }

    records[rowIdx] = record;
  }

  return records;
}

function __astGeneratePerfDuplicateRecords(rows) {
  const records = new Array(rows);
  const duplicateWindow = Math.max(1, Math.floor(rows * 0.6));

  for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
    const key = rowIdx % duplicateWindow;
    records[rowIdx] = {
      id: rowIdx,
      user_id: key,
      region: key % 2 === 0 ? 'east' : 'west',
      amount: key * 2
    };
  }

  return records;
}

function __astGeneratePerfMergeRecords(rows) {
  const left = new Array(rows);
  const right = new Array(rows);

  for (let idx = 0; idx < rows; idx++) {
    left[idx] = { id: idx, left_value: idx * 2 };
    right[idx] = { id: idx, right_value: idx * 3 };
  }

  return { left, right };
}

function __astGeneratePerfGroupByRecords(rows) {
  const records = new Array(rows);

  for (let idx = 0; idx < rows; idx++) {
    records[idx] = {
      bucket: `b_${idx % 50}`,
      amount: idx % 100,
      weight: (idx % 10) + 1
    };
  }

  return records;
}
