/**
 * Internal DataFrame helper layer.
 * These functions are intentionally private and support public `DataFrame` APIs.
 */
const __astDataFramePerfCounters = {
  fromRecords: 0,
  fromColumns: 0,
  toRecords: 0,
  toArrays: 0
};
const __astDataFrameCoercibleTypes = new Set(['integer', 'float', 'number', 'boolean', 'string', 'date']);

function __astIncrementDataFrameCounter(counterName) {
  if (!Object.prototype.hasOwnProperty.call(__astDataFramePerfCounters, counterName)) {
    return;
  }
  __astDataFramePerfCounters[counterName] += 1;
}

function __astResolveCoercibleDataFrameType(type) {
  return __astDataFrameCoercibleTypes.has(type) ? type : null;
}

/**
 * Normalize surrogate-key column input into a validated string array.
 *
 * @param {string|string[]} columns
 * @returns {string[]}
 */
function __astNormalizeSurrogateColumns(columns) {
  const normalizedColumns = Array.isArray(columns) ? [...columns] : [columns];

  if (normalizedColumns.length === 0) {
    throw new Error('generateSurrogateKey requires at least one column');
  }

  for (let idx = 0; idx < normalizedColumns.length; idx++) {
    const column = normalizedColumns[idx];
    if (typeof column !== 'string' || column.trim().length === 0) {
      throw new Error('generateSurrogateKey columns must be non-empty strings');
    }
  }

  return normalizedColumns;
}

/**
 * Validate and normalize a column name used by internal expression/window helpers.
 *
 * @param {*} columnName
 * @param {string} contextName
 * @returns {string}
 */
function __astValidateColumnName(columnName, contextName) {
  if (typeof columnName !== 'string' || columnName.trim().length === 0) {
    throw new Error(`${contextName} must be a non-empty string`);
  }

  return columnName.trim();
}

/**
 * Count top-level parameters in a function parameter source string.
 * Handles nested delimiters and quoted/template string content.
 *
 * @param {string} paramsSource
 * @returns {number}
 */
function __astCountTopLevelParams(paramsSource) {
  if (paramsSource.trim().length === 0) {
    return 0;
  }

  let count = 1;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplate = false;
  let previous = '';

  for (let idx = 0; idx < paramsSource.length; idx++) {
    const char = paramsSource[idx];

    if (inSingleQuote) {
      if (char === '\'' && previous !== '\\') {
        inSingleQuote = false;
      }
      previous = char;
      continue;
    }

    if (inDoubleQuote) {
      if (char === '"' && previous !== '\\') {
        inDoubleQuote = false;
      }
      previous = char;
      continue;
    }

    if (inTemplate) {
      if (char === '`' && previous !== '\\') {
        inTemplate = false;
      }
      previous = char;
      continue;
    }

    if (char === '\'') {
      inSingleQuote = true;
      previous = char;
      continue;
    }

    if (char === '"') {
      inDoubleQuote = true;
      previous = char;
      continue;
    }

    if (char === '`') {
      inTemplate = true;
      previous = char;
      continue;
    }

    if (char === '(') parenDepth += 1;
    else if (char === ')') parenDepth -= 1;
    else if (char === '[') bracketDepth += 1;
    else if (char === ']') bracketDepth -= 1;
    else if (char === '{') braceDepth += 1;
    else if (char === '}') braceDepth -= 1;
    else if (char === ',' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) count += 1;

    previous = char;
  }

  return count;
}

/**
 * Determine declared parameter count for function/arrow source.
 *
 * @param {Function} fn
 * @returns {number|null}
 */
function __astGetDeclaredFunctionParamCount(fn) {
  const source = String(fn).trim();

  if (source.length === 0) {
    return null;
  }

  if (source.includes('=>')) {
    const arrowIndex = source.indexOf('=>');
    const left = source.slice(0, arrowIndex).trim().replace(/^async\s+/, '');
    if (left.startsWith('(') && left.endsWith(')')) {
      return __astCountTopLevelParams(left.slice(1, -1));
    }

    return left.length === 0 ? 0 : 1;
  }

  const startParen = source.indexOf('(');
  if (startParen === -1) {
    return null;
  }

  let depth = 0;
  for (let idx = startParen; idx < source.length; idx++) {
    const char = source[idx];
    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        const inner = source.slice(startParen + 1, idx);
        return __astCountTopLevelParams(inner);
      }
    }
  }

  return null;
}

/**
 * Select `selectExpr` projector mode (`row` or `columns`) by callback signature.
 *
 * @param {Function} expression
 * @returns {'row'|'columns'}
 */
function __astResolveSelectExprProjectorMode(expression) {
  const declaredParamCount = __astGetDeclaredFunctionParamCount(expression);
  return declaredParamCount != null && declaredParamCount >= 2
    ? 'columns'
    : 'row';
}

function __astNormalizeWindowColumnList(value, optionName) {
  if (value == null) {
    return [];
  }

  const rawList = Array.isArray(value) ? value : [value];
  const normalizedList = new Array(rawList.length);

  for (let idx = 0; idx < rawList.length; idx++) {
    normalizedList[idx] = __astValidateColumnName(rawList[idx], `${optionName}[${idx}]`);
  }

  return normalizedList;
}

/**
 * Normalize and validate window function spec shape and referenced columns.
 *
 * @param {DataFrame} df
 * @param {Object} [spec={}]
 * @returns {Object}
 */
function __astNormalizeWindowSpec(df, spec = {}) {
  if (spec == null || typeof spec !== 'object' || Array.isArray(spec)) {
    throw new Error('window requires a spec object');
  }

  const partitionBy = __astNormalizeWindowColumnList(spec.partitionBy, 'partitionBy');
  const missingPartitionColumns = partitionBy.filter(column => !df.columns.includes(column));
  if (missingPartitionColumns.length > 0) {
    throw new Error(`window received unknown partition columns: ${missingPartitionColumns.join(', ')}`);
  }

  const rawOrderBy = spec.orderBy;
  if (rawOrderBy == null) {
    throw new Error('window requires orderBy');
  }

  const orderByArray = Array.isArray(rawOrderBy) ? rawOrderBy : [rawOrderBy];
  if (orderByArray.length === 0) {
    throw new Error('window requires at least one orderBy column');
  }

  const orderBy = orderByArray.map((entry, idx) => {
    const rawEntry = typeof entry === 'string'
      ? { column: entry }
      : entry;

    if (rawEntry == null || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) {
      throw new Error(`orderBy[${idx}] must be a string or object`);
    }

    const column = __astValidateColumnName(rawEntry.column, `orderBy[${idx}].column`);
    if (!df.columns.includes(column)) {
      throw new Error(`window orderBy column '${column}' not found`);
    }

    const ascending = rawEntry.ascending == null ? true : rawEntry.ascending;
    if (typeof ascending !== 'boolean') {
      throw new Error(`orderBy[${idx}].ascending must be boolean`);
    }

    const nulls = rawEntry.nulls == null ? 'last' : String(rawEntry.nulls).toLowerCase();
    if (nulls !== 'first' && nulls !== 'last') {
      throw new Error(`orderBy[${idx}].nulls must be 'first' or 'last'`);
    }

    return {
      column,
      ascending,
      nulls
    };
  });

  return { partitionBy, orderBy };
}

function __astWindowCompareValues(leftValue, rightValue) {
  if (Object.is(leftValue, rightValue)) {
    return 0;
  }

  if (leftValue instanceof Date && rightValue instanceof Date) {
    const leftTime = leftValue.getTime();
    const rightTime = rightValue.getTime();
    return leftTime < rightTime ? -1 : (leftTime > rightTime ? 1 : 0);
  }

  const leftType = typeof leftValue;
  const rightType = typeof rightValue;

  if (leftType === rightType) {
    if (leftType === 'number' || leftType === 'string' || leftType === 'boolean' || leftType === 'bigint') {
      return leftValue < rightValue ? -1 : (leftValue > rightValue ? 1 : 0);
    }
  }

  const leftKey = astStableKey(leftValue);
  const rightKey = astStableKey(rightValue);
  return leftKey < rightKey ? -1 : (leftKey > rightKey ? 1 : 0);
}

function __astBuildWindowExecutionContext(df, normalizedSpec) {
  const rowCount = df.len();
  const partitionColumns = normalizedSpec.partitionBy.map(column => df.data[column].array);
  const orderColumns = normalizedSpec.orderBy.map(spec => df.data[spec.column].array);
  const groupedRowIndexes = new Map();

  for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
    const partitionKeyValues = new Array(partitionColumns.length);

    for (let keyIdx = 0; keyIdx < partitionColumns.length; keyIdx++) {
      partitionKeyValues[keyIdx] = partitionColumns[keyIdx][rowIdx];
    }

    const partitionKey = partitionColumns.length > 0
      ? astBuildValuesKey(partitionKeyValues)
      : '__ast_global_partition__';

    if (!groupedRowIndexes.has(partitionKey)) {
      groupedRowIndexes.set(partitionKey, []);
    }

    groupedRowIndexes.get(partitionKey).push(rowIdx);
  }

  const partitionRowsByRowIndex = new Array(rowCount);
  const partitionPositionByRowIndex = new Array(rowCount);
  const partitionGroups = [];

  for (const rowIndexes of groupedRowIndexes.values()) {
    rowIndexes.sort((leftIdx, rightIdx) => {
      for (let specIdx = 0; specIdx < normalizedSpec.orderBy.length; specIdx++) {
        const sortSpec = normalizedSpec.orderBy[specIdx];
        const sourceArray = orderColumns[specIdx];
        const leftValue = sourceArray[leftIdx];
        const rightValue = sourceArray[rightIdx];

        if (leftValue == null && rightValue == null) {
          continue;
        }
        if (leftValue == null) {
          return sortSpec.nulls === 'first' ? -1 : 1;
        }
        if (rightValue == null) {
          return sortSpec.nulls === 'first' ? 1 : -1;
        }

        const compared = __astWindowCompareValues(leftValue, rightValue);
        if (compared !== 0) {
          return sortSpec.ascending ? compared : -compared;
        }
      }

      // Stable final tie-breaker.
      return leftIdx - rightIdx;
    });

    partitionGroups.push(rowIndexes);

    for (let pos = 0; pos < rowIndexes.length; pos++) {
      const rowIdx = rowIndexes[pos];
      partitionRowsByRowIndex[rowIdx] = rowIndexes;
      partitionPositionByRowIndex[rowIdx] = pos;
    }
  }

  return {
    partitionGroups,
    partitionRowsByRowIndex,
    partitionPositionByRowIndex
  };
}

function __astValidateWindowOffset(offset, methodName) {
  if (!Number.isInteger(offset) || offset < 1) {
    throw new Error(`window.${methodName} offset must be a positive integer`);
  }
}

function __astResolveWindowAssignedValues(value, rowCount, outputColumnName, windowContext) {
  if (value && typeof value.then === 'function') {
    throw new Error(`window.assign() does not support async results for '${outputColumnName}'`);
  }

  if (value instanceof Series) {
    if (value.len() !== rowCount) {
      throw new Error(`window.assign() Series for '${outputColumnName}' must match DataFrame length`);
    }
    return [...value.array];
  }

  if (Array.isArray(value)) {
    if (value.length !== rowCount) {
      throw new Error(`window.assign() array for '${outputColumnName}' must have length ${rowCount}`);
    }
    return [...value];
  }

  if (typeof value === 'function') {
    const resolved = value(windowContext);
    return __astResolveWindowAssignedValues(resolved, rowCount, outputColumnName, windowContext);
  }

  return Series.fromValue(value, rowCount, outputColumnName).array;
}

function __astNormalizeJoinKeys(input) {
  if (input == null) {
    return [];
  }
  return Array.isArray(input) ? input : [input];
}

function __astBuildJoinKey(columnArrays, rowIdx) {
  const values = new Array(columnArrays.length);

  for (let idx = 0; idx < columnArrays.length; idx++) {
    const source = columnArrays[idx];
    values[idx] = source ? source[rowIdx] : null;
  }

  return astBuildValuesKey(values);
}

function __astBuildJoinBuckets(rowCount, keyColumns) {
  const byKey = new Map();

  for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
    const key = __astBuildJoinKey(keyColumns, rowIdx);
    if (!byKey.has(key)) {
      byKey.set(key, [rowIdx]);
    } else {
      byKey.get(key).push(rowIdx);
    }
  }

  return { byKey };
}

function __astValidateJoinCardinality(validate, leftBuckets, rightBuckets) {
  if (!validate) {
    return;
  }

  const multiL = [...leftBuckets.byKey.values()].some(bucket => bucket.length > 1);
  const multiR = [...rightBuckets.byKey.values()].some(bucket => bucket.length > 1);

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

function __astReadColumnValue(columnMap, columnName, rowIdx) {
  if (rowIdx == null) {
    return null;
  }

  const source = columnMap[columnName];
  if (!source) {
    return null;
  }

  return source[rowIdx];
}

function __astCloneSeries(series) {
  return new Series(
    [...series.array],
    series.name,
    series.type,
    [...series.index],
    {
      useUTC: series.useUTC,
      allowComplexValues: true,
      skipTypeCoercion: true
    }
  );
}

function __astCloneDataFrame(dataframe) {
  const clonedData = {};

  for (let idx = 0; idx < dataframe.columns.length; idx++) {
    const column = dataframe.columns[idx];
    clonedData[column] = __astCloneSeries(dataframe.data[column]);
  }

  return new DataFrame(clonedData, [...dataframe.index]);
}

function __astMergeDataFramesColumnar(leftDf, rightDf, how = 'inner', options = {}) {
  const {
    on = null,
    leftOn = null,
    rightOn = null,
    suffixes = ['_x', '_y'],
    validate = null,
    methodName = 'merge',
    joinKeyMode = 'left_preferred'
  } = options;

  if (!Array.isArray(suffixes) || suffixes.length !== 2) {
    throw new Error('suffixes must be an array of length 2');
  }

  const [leftSuffix, rightSuffix] = suffixes;

  const leftKeys = __astNormalizeJoinKeys(on != null ? on : leftOn);
  const rightKeys = __astNormalizeJoinKeys(on != null ? on : rightOn);

  if (how !== 'cross') {
    if (leftKeys.length === 0 || rightKeys.length === 0 || leftKeys.length !== rightKeys.length) {
      throw new Error('Must provide `on` or both `leftOn` and `rightOn` of equal length');
    }
  }

  const leftColumns = leftDf.columns;
  const rightColumns = rightDf.columns;
  const leftColumnMap = {};
  const rightColumnMap = {};

  for (let idx = 0; idx < leftColumns.length; idx++) {
    leftColumnMap[leftColumns[idx]] = leftDf.data[leftColumns[idx]].array;
  }

  for (let idx = 0; idx < rightColumns.length; idx++) {
    rightColumnMap[rightColumns[idx]] = rightDf.data[rightColumns[idx]].array;
  }

  const joinColumnPairs = __astResolveJoinColumnPairs(how, leftKeys, rightKeys, joinKeyMode);
  const consumedLeftJoinColumns = new Set(joinColumnPairs.map(pair => pair.left));
  const consumedRightJoinColumns = new Set(
    joinColumnPairs
      .filter(pair => pair.consumeRightColumn === true)
      .map(pair => pair.right)
  );

  const overlapColumns = leftColumns.filter(col => {
    if (!rightColumns.includes(col)) {
      return false;
    }
    return !(consumedLeftJoinColumns.has(col) && consumedRightJoinColumns.has(col));
  });
  const leftOnlyColumns = leftColumns.filter(
    col => !rightColumns.includes(col) && !consumedLeftJoinColumns.has(col)
  );
  const rightOnlyColumns = rightColumns.filter(
    col => !leftColumns.includes(col) && !consumedRightJoinColumns.has(col)
  );

  const leftJoinColumns = leftKeys.map(key => leftColumnMap[key] || null);
  const rightJoinColumns = rightKeys.map(key => rightColumnMap[key] || null);
  const leftRowCount = leftDf.len();
  const rightRowCount = rightDf.len();

  const leftBuckets = __astBuildJoinBuckets(leftRowCount, leftJoinColumns);
  const rightBuckets = __astBuildJoinBuckets(rightRowCount, rightJoinColumns);
  __astValidateJoinCardinality(validate, leftBuckets, rightBuckets);

  const rowPairs = [];

  if (how === 'cross') {
    for (let leftIdx = 0; leftIdx < leftRowCount; leftIdx++) {
      for (let rightIdx = 0; rightIdx < rightRowCount; rightIdx++) {
        rowPairs.push([leftIdx, rightIdx]);
      }
    }
  } else if (how === 'inner' || how === 'left' || how === 'outer') {
    const matchedRight = new Set();

    for (let leftIdx = 0; leftIdx < leftRowCount; leftIdx++) {
      const leftKey = __astBuildJoinKey(leftJoinColumns, leftIdx);
      const rightMatches = rightBuckets.byKey.get(leftKey);

      if (rightMatches && rightMatches.length > 0) {
        for (let matchIdx = 0; matchIdx < rightMatches.length; matchIdx++) {
          const rightIdx = rightMatches[matchIdx];
          rowPairs.push([leftIdx, rightIdx]);
          matchedRight.add(rightIdx);
        }
      } else if (how === 'left' || how === 'outer') {
        rowPairs.push([leftIdx, null]);
      }
    }

    if (how === 'outer') {
      for (let rightIdx = 0; rightIdx < rightRowCount; rightIdx++) {
        if (!matchedRight.has(rightIdx)) {
          rowPairs.push([null, rightIdx]);
        }
      }
    }
  } else if (how === 'right') {
    for (let rightIdx = 0; rightIdx < rightRowCount; rightIdx++) {
      const rightKey = __astBuildJoinKey(rightJoinColumns, rightIdx);
      const leftMatches = leftBuckets.byKey.get(rightKey);

      if (leftMatches && leftMatches.length > 0) {
        for (let matchIdx = 0; matchIdx < leftMatches.length; matchIdx++) {
          rowPairs.push([leftMatches[matchIdx], rightIdx]);
        }
      } else {
        rowPairs.push([null, rightIdx]);
      }
    }
  } else {
    throw new Error(`Unknown join type: ${how}`);
  }

  const out = {};
  const rowCount = rowPairs.length;

  for (let idx = 0; idx < joinColumnPairs.length; idx++) {
    __astInitializeMergeOutputColumn(out, joinColumnPairs[idx].name, rowCount, methodName);
  }

  for (let idx = 0; idx < leftOnlyColumns.length; idx++) {
    __astInitializeMergeOutputColumn(out, leftOnlyColumns[idx], rowCount, methodName);
  }

  for (let idx = 0; idx < overlapColumns.length; idx++) {
    __astInitializeMergeOutputColumn(out, `${overlapColumns[idx]}${leftSuffix}`, rowCount, methodName);
    __astInitializeMergeOutputColumn(out, `${overlapColumns[idx]}${rightSuffix}`, rowCount, methodName);
  }

  for (let idx = 0; idx < rightOnlyColumns.length; idx++) {
    __astInitializeMergeOutputColumn(out, rightOnlyColumns[idx], rowCount, methodName);
  }

  for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
    const [leftSourceIdx, rightSourceIdx] = rowPairs[rowIdx];

    for (let keyIdx = 0; keyIdx < joinColumnPairs.length; keyIdx++) {
      const joinPair = joinColumnPairs[keyIdx];
      const leftValue = __astReadColumnValue(leftColumnMap, joinPair.left, leftSourceIdx);
      const rightValue = __astReadColumnValue(rightColumnMap, joinPair.right, rightSourceIdx);

      out[joinPair.name][rowIdx] = leftValue != null
        ? leftValue
        : (rightValue != null ? rightValue : null);
    }

    for (let colIdx = 0; colIdx < leftOnlyColumns.length; colIdx++) {
      const col = leftOnlyColumns[colIdx];
      out[col][rowIdx] = __astReadColumnValue(leftColumnMap, col, leftSourceIdx);
    }

    for (let colIdx = 0; colIdx < overlapColumns.length; colIdx++) {
      const col = overlapColumns[colIdx];
      out[`${col}${leftSuffix}`][rowIdx] = __astReadColumnValue(leftColumnMap, col, leftSourceIdx);
      out[`${col}${rightSuffix}`][rowIdx] = __astReadColumnValue(rightColumnMap, col, rightSourceIdx);
    }

    for (let colIdx = 0; colIdx < rightOnlyColumns.length; colIdx++) {
      const col = rightOnlyColumns[colIdx];
      out[col][rowIdx] = __astReadColumnValue(rightColumnMap, col, rightSourceIdx);
    }
  }

  return DataFrame.fromColumns(out, { copy: false });
}

function __astInitializeMergeOutputColumn(outputColumns, outputName, rowCount, methodName) {
  if (Object.prototype.hasOwnProperty.call(outputColumns, outputName)) {
    throw new Error(
      `DataFrame.${methodName} produced duplicate output column name '${outputName}'. ` +
      'Adjust lsuffix/rsuffix to avoid collisions with existing columns.'
    );
  }

  outputColumns[outputName] = new Array(rowCount);
}

function __astResolveJoinColumnPairs(how, leftKeys, rightKeys, joinKeyMode = 'left_preferred') {
  if (how === 'cross') {
    return [];
  }

  if (joinKeyMode !== 'left_preferred' && joinKeyMode !== 'shared_only') {
    throw new Error(`Unsupported joinKeyMode: ${joinKeyMode}`);
  }

  const pairs = [];
  for (let idx = 0; idx < leftKeys.length; idx++) {
    if (leftKeys[idx] === rightKeys[idx]) {
      pairs.push({
        name: leftKeys[idx],
        left: leftKeys[idx],
        right: rightKeys[idx],
        consumeRightColumn: true
      });
    } else if (joinKeyMode === 'left_preferred') {
      pairs.push({
        name: leftKeys[idx],
        left: leftKeys[idx],
        right: rightKeys[idx],
        consumeRightColumn: false
      });
    }
  }

  return pairs;
}

var AstDataFrameWindowColumn = class AstDataFrameWindowColumn {
  constructor(windowContext, columnName) {
    this.windowContext = windowContext;
    this.columnName = columnName;
  }

  lag(offset = 1, defaultValue = null) {
    __astValidateWindowOffset(offset, 'lag');
    return this._shift(-offset, defaultValue);
  }

  lead(offset = 1, defaultValue = null) {
    __astValidateWindowOffset(offset, 'lead');
    return this._shift(offset, defaultValue);
  }

  _shift(step, defaultValue) {
    const rowCount = this.windowContext.df.len();
    const values = new Array(rowCount);
    const sourceColumn = this.windowContext.df.data[this.columnName].array;

    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const partitionRows = this.windowContext.partitionRowsByRowIndex[rowIdx];
      const partitionPosition = this.windowContext.partitionPositionByRowIndex[rowIdx];
      const sourcePosition = partitionPosition + step;

      if (sourcePosition < 0 || sourcePosition >= partitionRows.length) {
        values[rowIdx] = defaultValue;
        continue;
      }

      values[rowIdx] = sourceColumn[partitionRows[sourcePosition]];
    }

    return values;
  }

  running(metric) {
    const normalizedMetric = String(metric || '').toLowerCase();
    const supportedMetrics = ['sum', 'mean', 'min', 'max', 'count'];
    if (!supportedMetrics.includes(normalizedMetric)) {
      throw new Error(`window.col('${this.columnName}').running() metric must be one of: ${supportedMetrics.join(', ')}`);
    }

    const rowCount = this.windowContext.df.len();
    const sourceColumn = this.windowContext.df.data[this.columnName].array;
    const output = new Array(rowCount);

    for (let partitionIdx = 0; partitionIdx < this.windowContext.partitionGroups.length; partitionIdx++) {
      const partitionRows = this.windowContext.partitionGroups[partitionIdx];
      let runningCount = 0;
      let runningSum = 0;
      let runningMin = null;
      let runningMax = null;

      for (let pos = 0; pos < partitionRows.length; pos++) {
        const rowIdx = partitionRows[pos];
        const rawValue = sourceColumn[rowIdx];
        const hasValue = rawValue != null;

        if (normalizedMetric === 'count') {
          if (hasValue) {
            runningCount += 1;
          }
          output[rowIdx] = runningCount;
          continue;
        }

        if (hasValue) {
          if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) {
            throw new Error(`window.running('${normalizedMetric}') requires numeric values for column '${this.columnName}'`);
          }

          runningCount += 1;
          runningSum += rawValue;
          runningMin = runningMin == null ? rawValue : Math.min(runningMin, rawValue);
          runningMax = runningMax == null ? rawValue : Math.max(runningMax, rawValue);
        }

        switch (normalizedMetric) {
          case 'sum':
            output[rowIdx] = runningCount > 0 ? runningSum : null;
            break;
          case 'mean':
            output[rowIdx] = runningCount > 0 ? runningSum / runningCount : null;
            break;
          case 'min':
            output[rowIdx] = runningMin;
            break;
          case 'max':
            output[rowIdx] = runningMax;
            break;
        }
      }
    }

    return output;
  }
};

var AstDataFrameWindow = class AstDataFrameWindow {
  constructor(df, spec = {}) {
    this.df = df;
    this.spec = __astNormalizeWindowSpec(df, spec);

    const executionContext = __astBuildWindowExecutionContext(df, this.spec);
    this.partitionGroups = executionContext.partitionGroups;
    this.partitionRowsByRowIndex = executionContext.partitionRowsByRowIndex;
    this.partitionPositionByRowIndex = executionContext.partitionPositionByRowIndex;
  }

  rowNumber() {
    const output = new Array(this.df.len());
    for (let rowIdx = 0; rowIdx < output.length; rowIdx++) {
      output[rowIdx] = this.partitionPositionByRowIndex[rowIdx] + 1;
    }
    return output;
  }

  col(columnName) {
    const normalizedColumn = __astValidateColumnName(columnName, 'window column');
    if (!this.df.columns.includes(normalizedColumn)) {
      throw new Error(`window column '${normalizedColumn}' not found`);
    }
    return new AstDataFrameWindowColumn(this, normalizedColumn);
  }

  assign(columns = {}) {
    if (columns == null || typeof columns !== 'object' || Array.isArray(columns)) {
      throw new Error('window.assign() requires an object mapping');
    }

    const entries = Object.entries(columns);
    if (entries.length === 0) {
      throw new Error('window.assign() requires at least one output column');
    }

    const rowCount = this.df.len();
    const nextColumns = this.df.toColumns({ copy: true });

    for (let idx = 0; idx < entries.length; idx++) {
      const [columnName, expression] = entries[idx];
      const normalizedColumnName = __astValidateColumnName(columnName, `window.assign column at index ${idx}`);
      const evaluated = typeof expression === 'function'
        ? expression(this)
        : expression;

      nextColumns[normalizedColumnName] = __astResolveWindowAssignedValues(
        evaluated,
        rowCount,
        normalizedColumnName,
        this
      );
    }

    return DataFrame.fromColumns(nextColumns, {
      copy: false,
      index: [...this.df.index]
    });
  }
};
