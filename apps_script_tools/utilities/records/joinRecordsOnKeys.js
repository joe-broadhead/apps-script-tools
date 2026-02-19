/**
 * @function joinRecordsOnKeys
 * @description Joins two arrays of records based on specified keys and join type.
 * @param {Array<Object>} leftRecs
 * @param {Array<Object>} rightRecs
 * @param {String} [how='inner'] - one of: inner, left, right, outer, cross
 * @param {Object} [opts={}]
 * @returns {Array<Object>} Joined records
 */
function joinRecordsOnKeys(leftRecs, rightRecs, how = 'inner', opts = {}) {
  const {
    on = null,
    leftOn = null,
    rightOn = null,
    suffixes = ['_x', '_y'],
    validate = null
  } = opts;

  if (!Array.isArray(leftRecs) || !Array.isArray(rightRecs)) {
    throw new Error('Both leftRecs and rightRecs must be arrays');
  }

  if (!Array.isArray(suffixes) || suffixes.length !== 2) {
    throw new Error('suffixes must be an array of length 2');
  }

  const [leftSuffix, rightSuffix] = suffixes;

  const leftKeys = normalizeJoinKeys(on != null ? on : leftOn);
  const rightKeys = normalizeJoinKeys(on != null ? on : rightOn);

  if (how !== 'cross') {
    if (leftKeys.length === 0 || rightKeys.length === 0 || leftKeys.length !== rightKeys.length) {
      throw new Error('Must provide `on` or both `leftOn` and `rightOn` of equal length');
    }
  }

  const leftColumns = collectColumns(leftRecs);
  const rightColumns = collectColumns(rightRecs);

  const joinColumns = how === 'cross' ? [] : leftKeys.slice();
  const overlapColumns = leftColumns.filter(col => !joinColumns.includes(col) && rightColumns.includes(col));
  const leftOnlyColumns = leftColumns.filter(col => !joinColumns.includes(col) && !rightColumns.includes(col));
  const rightOnlyColumns = rightColumns.filter(col => !joinColumns.includes(col) && !leftColumns.includes(col));

  if (how === 'cross') {
    const crossResult = [];
    for (let leftIdx = 0; leftIdx < leftRecs.length; leftIdx++) {
      const leftRecord = leftRecs[leftIdx];
      for (let rightIdx = 0; rightIdx < rightRecs.length; rightIdx++) {
        crossResult.push(buildJoinedRecord(
          leftRecord,
          rightRecs[rightIdx],
          joinColumns,
          rightKeys,
          leftOnlyColumns,
          overlapColumns,
          rightOnlyColumns,
          leftSuffix,
          rightSuffix
        ));
      }
    }

    validateCardinality(validate, leftRecs, rightRecs, leftKeys, rightKeys);
    return crossResult;
  }

  const leftBuckets = buildBuckets(leftRecs, leftKeys);
  const rightBuckets = buildBuckets(rightRecs, rightKeys);

  const joined = [];

  if (how === 'inner' || how === 'left' || how === 'outer') {
    const matchedRightIndexes = new Set();

    for (let leftIdx = 0; leftIdx < leftRecs.length; leftIdx++) {
      const leftRecord = leftRecs[leftIdx];
      const key = keyFromRecord(leftRecord, leftKeys);
      const rightMatches = rightBuckets.byKey.get(key);

      if (rightMatches && rightMatches.length > 0) {
        for (let matchIdx = 0; matchIdx < rightMatches.length; matchIdx++) {
          const rightEntry = rightMatches[matchIdx];
          matchedRightIndexes.add(rightEntry.index);

          joined.push(buildJoinedRecord(
            leftRecord,
            rightEntry.record,
            joinColumns,
            rightKeys,
            leftOnlyColumns,
            overlapColumns,
            rightOnlyColumns,
            leftSuffix,
            rightSuffix
          ));
        }
      } else if (how === 'left' || how === 'outer') {
        joined.push(buildJoinedRecord(
          leftRecord,
          null,
          joinColumns,
          rightKeys,
          leftOnlyColumns,
          overlapColumns,
          rightOnlyColumns,
          leftSuffix,
          rightSuffix
        ));
      }
    }

    if (how === 'outer') {
      for (let rightIdx = 0; rightIdx < rightRecs.length; rightIdx++) {
        if (matchedRightIndexes.has(rightIdx)) {
          continue;
        }

        joined.push(buildJoinedRecord(
          null,
          rightRecs[rightIdx],
          joinColumns,
          rightKeys,
          leftOnlyColumns,
          overlapColumns,
          rightOnlyColumns,
          leftSuffix,
          rightSuffix
        ));
      }
    }
  } else if (how === 'right') {
    for (let rightIdx = 0; rightIdx < rightRecs.length; rightIdx++) {
      const rightRecord = rightRecs[rightIdx];
      const key = keyFromRecord(rightRecord, rightKeys);
      const leftMatches = leftBuckets.byKey.get(key);

      if (leftMatches && leftMatches.length > 0) {
        for (let matchIdx = 0; matchIdx < leftMatches.length; matchIdx++) {
          joined.push(buildJoinedRecord(
            leftMatches[matchIdx].record,
            rightRecord,
            joinColumns,
            rightKeys,
            leftOnlyColumns,
            overlapColumns,
            rightOnlyColumns,
            leftSuffix,
            rightSuffix
          ));
        }
      } else {
        joined.push(buildJoinedRecord(
          null,
          rightRecord,
          joinColumns,
          rightKeys,
          leftOnlyColumns,
          overlapColumns,
          rightOnlyColumns,
          leftSuffix,
          rightSuffix
        ));
      }
    }
  } else {
    throw new Error(`Unknown join type: ${how}`);
  }

  validateCardinality(validate, leftRecs, rightRecs, leftKeys, rightKeys, leftBuckets, rightBuckets);
  return joined;
}

function normalizeJoinKeys(input) {
  if (input == null) {
    return [];
  }

  return Array.isArray(input) ? input : [input];
}

function collectColumns(records) {
  const seen = new Set();
  const columns = [];

  for (let rowIdx = 0; rowIdx < records.length; rowIdx++) {
    const record = records[rowIdx];

    for (const column of Object.keys(record)) {
      if (seen.has(column)) {
        continue;
      }
      seen.add(column);
      columns.push(column);
    }
  }

  return columns;
}

function keyFromRecord(record, keys) {
  if (!record) {
    return astBuildValuesKey(keys.map(() => null));
  }

  const values = new Array(keys.length);
  for (let idx = 0; idx < keys.length; idx++) {
    const key = keys[idx];
    values[idx] = Object.prototype.hasOwnProperty.call(record, key) ? record[key] : null;
  }

  return astBuildValuesKey(values);
}

function buildBuckets(records, keys) {
  const byKey = new Map();

  for (let idx = 0; idx < records.length; idx++) {
    const record = records[idx];
    const key = keyFromRecord(record, keys);
    const entry = { record, index: idx };

    if (!byKey.has(key)) {
      byKey.set(key, [entry]);
    } else {
      byKey.get(key).push(entry);
    }
  }

  return { byKey };
}

function buildJoinedRecord(
  leftRecord,
  rightRecord,
  joinColumns,
  rightJoinColumns,
  leftOnlyColumns,
  overlapColumns,
  rightOnlyColumns,
  leftSuffix,
  rightSuffix
) {
  const record = {};

  for (let idx = 0; idx < joinColumns.length; idx++) {
    const leftJoinCol = joinColumns[idx];
    const rightJoinCol = rightJoinColumns[idx];
    const leftValue = leftRecord ? leftRecord[leftJoinCol] : null;
    const rightValue = rightRecord ? rightRecord[rightJoinCol] : null;

    record[leftJoinCol] = leftValue != null ? leftValue : (rightValue != null ? rightValue : null);
  }

  for (let idx = 0; idx < leftOnlyColumns.length; idx++) {
    const column = leftOnlyColumns[idx];
    record[column] = leftRecord ? leftRecord[column] : null;
  }

  for (let idx = 0; idx < overlapColumns.length; idx++) {
    const column = overlapColumns[idx];
    record[column + leftSuffix] = leftRecord ? leftRecord[column] : null;
    record[column + rightSuffix] = rightRecord ? rightRecord[column] : null;
  }

  for (let idx = 0; idx < rightOnlyColumns.length; idx++) {
    const column = rightOnlyColumns[idx];
    record[column] = rightRecord ? rightRecord[column] : null;
  }

  return record;
}

function validateCardinality(validate, leftRecs, rightRecs, leftKeys, rightKeys, leftBuckets = null, rightBuckets = null) {
  if (!validate) {
    return;
  }

  const leftMap = leftBuckets || buildBuckets(leftRecs, leftKeys);
  const rightMap = rightBuckets || buildBuckets(rightRecs, rightKeys);

  const multiL = [...leftMap.byKey.values()].some(bucket => bucket.length > 1);
  const multiR = [...rightMap.byKey.values()].some(bucket => bucket.length > 1);

  let actual;
  if (!multiL && !multiR) {
    actual = 'one_to_one';
  } else if (!multiL && multiR) {
    actual = 'one_to_many';
  } else if (multiL && !multiR) {
    actual = 'many_to_one';
  } else {
    actual = 'many_to_many';
  }

  if (validate !== actual) {
    throw new Error(`Validate failed: expected ${validate} but got ${actual}`);
  }
}
