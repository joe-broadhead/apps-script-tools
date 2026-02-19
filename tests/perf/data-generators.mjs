export function generateNumericRecords(rows, columnCount = 10) {
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

export function generateDuplicateRecords(rows, duplicateRatio = 0.4) {
  const duplicateWindow = Math.max(1, Math.floor(rows * (1 - duplicateRatio)));
  const records = new Array(rows);

  for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
    const key = rowIdx % duplicateWindow;
    records[rowIdx] = {
      id: rowIdx,
      user_id: key,
      region: key % 2 === 0 ? 'east' : 'west',
      amount: key * 3
    };
  }

  return records;
}

export function generateMergeRecords(rows) {
  const left = new Array(rows);
  const right = new Array(rows);

  for (let idx = 0; idx < rows; idx++) {
    left[idx] = {
      id: idx,
      left_value: idx * 2,
      bucket: idx % 10
    };

    right[idx] = {
      id: idx,
      right_value: idx * 3,
      tag: `t_${idx % 20}`
    };
  }

  return { left, right };
}

export function generateGroupByRecords(rows) {
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
