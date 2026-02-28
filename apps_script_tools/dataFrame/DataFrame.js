let __astDataFrameReservedColumnNames = null;

function __astGetDataFrameReservedColumnNames() {
  if (__astDataFrameReservedColumnNames) {
    return __astDataFrameReservedColumnNames;
  }

  const reserved = new Set(['data', 'columns', 'index']);

  if (typeof DataFrame !== 'undefined' && DataFrame && DataFrame.prototype) {
    const prototypeKeys = Object.getOwnPropertyNames(DataFrame.prototype);
    for (let idx = 0; idx < prototypeKeys.length; idx++) {
      const key = prototypeKeys[idx];
      if (typeof key === 'string' && key.length > 0) {
        reserved.add(key);
      }
    }
  }

  __astDataFrameReservedColumnNames = reserved;
  return reserved;
}

function __astAssertNoReservedDataFrameColumns(columns) {
  if (!Array.isArray(columns) || columns.length === 0) {
    return;
  }

  const reserved = __astGetDataFrameReservedColumnNames();
  const conflicts = [];

  for (let idx = 0; idx < columns.length; idx++) {
    const columnName = columns[idx];
    if (reserved.has(columnName)) {
      conflicts.push(columnName);
    }
  }

  if (conflicts.length > 0) {
    const uniqueConflicts = Array.from(new Set(conflicts)).sort();
    throw new Error(
      `DataFrame column names conflict with reserved DataFrame members: ${uniqueConflicts.join(', ')}`
    );
  }
}

var DataFrame = class DataFrame {
  /**
   * Build a DataFrame from a map of column name -> Series.
   * Column names are exposed as instance getters (`df.columnName`), so names
   * that collide with DataFrame members are rejected.
   *
   * @param {Object<string, Series>} data
   * @param {Array<*>|null} [index=null]
   */
  constructor(data, index = null) {
    this.data = data;
    this.columns = this.getColumns();
    __astAssertNoReservedDataFrameColumns(this.columns);

    if (!Object.values(data).every(series => series instanceof Series && series.len() === this.len())) {
      throw new Error('All arguments must be Series of the same length');
    }

    if (index != null && index.length !== this.len()) {
      throw new Error('Index length must match DataFrame length');
    }

    this.index = index != null ? index : (this.len() === 0 ? [] : arrayFromRange(0, this.len() - 1));

    for (const column of this.columns) {
      Object.defineProperty(this, column, {
        get: () => this.data[column],
        enumerable: true
      });
    }
  }

  *[Symbol.iterator]() {
    for (let idx = 0; idx < this.len(); idx++) {
      yield [this.at(idx), this.iat(idx)];
    }
  }

  static __resetPerfCounters() {
    Object.keys(__astDataFramePerfCounters).forEach(counterName => {
      __astDataFramePerfCounters[counterName] = 0;
    });
  }

  static __getPerfCounters() {
    return { ...__astDataFramePerfCounters };
  }

  static fromColumns(columns, options = {}) {
    __astIncrementDataFrameCounter('fromColumns');

    if (columns == null || typeof columns !== 'object' || Array.isArray(columns)) {
      throw new Error('fromColumns requires an object mapping of column names to arrays or Series');
    }

    const {
      index = null,
      copy = true,
      typeMap = {}
    } = options;

    const columnEntries = Object.entries(columns);
    if (columnEntries.length === 0) {
      return new DataFrame({}, index || []);
    }

    let expectedLength = null;
    const seriesObject = {};

    for (let idx = 0; idx < columnEntries.length; idx++) {
      const [columnName, columnValue] = columnEntries[idx];
      let columnSeries;

      if (columnValue instanceof Series) {
        columnSeries = columnValue;
      } else if (Array.isArray(columnValue)) {
        const arrayValue = copy ? [...columnValue] : columnValue;
        const columnType = Object.prototype.hasOwnProperty.call(typeMap, columnName) ? typeMap[columnName] : null;
        columnSeries = new Series(arrayValue, columnName, columnType, null, { allowComplexValues: true });
      } else {
        throw new Error(`Column '${columnName}' must be an array or Series`);
      }

      if (expectedLength == null) {
        expectedLength = columnSeries.len();
      } else if (columnSeries.len() !== expectedLength) {
        throw new Error(`All columns must have the same length. Expected ${expectedLength}, got ${columnSeries.len()} for column '${columnName}'`);
      }

      seriesObject[columnName] = columnSeries;
    }

    return new DataFrame(seriesObject, index);
  }

  /**
   * Construct a DataFrame from row-oriented records.
   * Records are standardized first so sparse/missing keys become explicit.
   *
   * @param {Object[]} records
   * @returns {DataFrame}
   */
  static fromRecords(records) {
    __astIncrementDataFrameCounter('fromRecords');

    const standardized = standardizeRecords(records);
    if (standardized.length === 0) {
      return new DataFrame({});
    }

    const columnNames = Object.keys(standardized[0]);
    const rowCount = standardized.length;
    const columnData = {};

    for (let colIdx = 0; colIdx < columnNames.length; colIdx++) {
      columnData[columnNames[colIdx]] = new Array(rowCount);
    }

    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const record = standardized[rowIdx];

      for (let colIdx = 0; colIdx < columnNames.length; colIdx++) {
        const column = columnNames[colIdx];
        columnData[column][rowIdx] = record[column];
      }
    }

    return DataFrame.fromColumns(columnData, { copy: false });
  }

  static fromArrays(arrays, options = {}) {
    const { headerRow = 0, standardize = false, defaultValue = null, targetLength = null } = options;

    const standardizedArrays = standardize ? standardizeArrays(arrays, { defaultValue, targetLength }) : arrays;

    const records = zipArraysIntoRecords(standardizedArrays, headerRow);
    return DataFrame.fromRecords(records);
  }

  static fromSheet(sheet, headerRow = 0) {
    return new EnhancedSheet(sheet).toDataFrame({ headerRow });
  }

  static fromDriveFile(fileId, fileType, options = {}) {
    const records = readFileFromDrive(fileId, fileType, options);
    return DataFrame.fromRecords(records);
  }

  static fromQuery(request = {}) {
    return runSqlQuery(request);
  }

  static concat(dataFrames, distinct = false) {
    if (!Array.isArray(dataFrames) || dataFrames.length === 0) {
      throw new Error('Concat requires a non-empty array of DataFrames');
    }

    if (!dataFrames.every(dataframe => dataframe instanceof DataFrame)) {
      throw new Error('All arguments must be DataFrame instances');
    }

    const baseColumns = dataFrames[0].columns;
    const baseColumnSet = new Set(baseColumns);
    const alignedFrames = [dataFrames[0]];

    for (let idx = 1; idx < dataFrames.length; idx++) {
      const candidate = dataFrames[idx];
      const candidateColumns = candidate.columns;
      if (candidateColumns.length !== baseColumns.length) {
        throw new Error('All DataFrames must have identical column names');
      }

      for (let columnIdx = 0; columnIdx < candidateColumns.length; columnIdx++) {
        if (!baseColumnSet.has(candidateColumns[columnIdx])) {
          throw new Error('All DataFrames must have identical column names');
        }
      }

      const inSameOrder = candidateColumns.every((columnName, columnIdx) => columnName === baseColumns[columnIdx]);
      alignedFrames.push(inSameOrder ? candidate : candidate.select(baseColumns));
    }

    return alignedFrames.reduce((acc, df) => acc.union(df, distinct));
  }

  static generateSurrogateKey(dataframe, columns, delimiter = '-') {
    if (!(dataframe instanceof DataFrame)) {
      throw new Error('generateSurrogateKey requires a DataFrame instance');
    }

    const normalizedColumns = __astNormalizeSurrogateColumns(columns);
    const missingColumns = normalizedColumns.filter(column => !dataframe.columns.includes(column));
    if (missingColumns.length > 0) {
      throw new Error(`generateSurrogateKey received unknown columns: ${missingColumns.join(', ')}`);
    }

    const [firstCol, ...remainingColumns] = normalizedColumns;

    return remainingColumns.reduce((acc, col) => {
      return acc.concat(dataframe[col], delimiter);
    }, dataframe[firstCol]).str.sha256();
  }

  static validateSchema(dataframe, schema, options = {}) {
    return astDataFrameValidateSchema(dataframe, schema, options);
  }

  static enforceSchema(dataframe, schema, options = {}) {
    return astDataFrameEnforceSchema(dataframe, schema, options);
  }

  getColumns() {
    return Object.keys(this.data);
  }

  len() {
    return this.columns.length > 0 ? this.data[this.columns[0]].len() : 0;
  }

  size() {
    return [this.len(), this.columns.length];
  }

  empty() {
    return this.len() === 0;
  }

  /**
   * Return the first `n` rows from the DataFrame.
   *
   * @param {number} [n=5]
   * @returns {DataFrame}
   */
  head(n = 5) {
    const count = __astNormalizeDataFrameHeadTailCount(n, 'head');
    if (count === 0 || this.len() === 0) {
      return this.take([]);
    }

    const takeCount = Math.min(count, this.len());
    const rowIndexes = new Array(takeCount);
    for (let idx = 0; idx < takeCount; idx++) {
      rowIndexes[idx] = idx;
    }

    return this.take(rowIndexes);
  }

  /**
   * Return the last `n` rows from the DataFrame.
   *
   * @param {number} [n=5]
   * @returns {DataFrame}
   */
  tail(n = 5) {
    const count = __astNormalizeDataFrameHeadTailCount(n, 'tail');
    if (count === 0 || this.len() === 0) {
      return this.take([]);
    }

    const takeCount = Math.min(count, this.len());
    const start = this.len() - takeCount;
    const rowIndexes = new Array(takeCount);
    for (let idx = 0; idx < takeCount; idx++) {
      rowIndexes[idx] = start + idx;
    }

    return this.take(rowIndexes);
  }

  /**
   * Return rows by positional indexes.
   *
   * @param {number[]} indexes
   * @param {Object} [options={}]
   * @param {boolean} [options.preserveIndex=true]
   * @returns {DataFrame}
   */
  take(indexes, options = {}) {
    if (options == null || typeof options !== 'object' || Array.isArray(options)) {
      throw new Error('DataFrame.take options must be an object');
    }

    if (
      Object.prototype.hasOwnProperty.call(options, 'preserveIndex')
      && typeof options.preserveIndex !== 'boolean'
    ) {
      throw new Error('DataFrame.take option preserveIndex must be boolean');
    }

    const preserveIndex = options.preserveIndex !== false;
    const normalizedIndexes = __astNormalizeDataFrameTakeIndexes(indexes, this.len(), 'take');
    return this._buildFromRowIndexes(normalizedIndexes, preserveIndex);
  }

  /**
   * Randomly sample rows from the DataFrame.
   *
   * @param {Object} [options={}]
   * @param {number} [options.n]
   * @param {number} [options.frac]
   * @param {boolean} [options.replace=false]
   * @param {number[]|Series|string} [options.weights]
   * @param {number|string} [options.randomState]
   * @returns {DataFrame}
   */
  sample(options = {}) {
    const sampleIndexes = __astResolveDataFrameSampleIndexes(this, options, 'sample');
    return this.take(sampleIndexes, { preserveIndex: true });
  }

  /**
   * Create a deep or shallow copy of the DataFrame.
   *
   * `deep=true` copies Series values and index values.
   * `deep=false` reuses Series references while returning a new DataFrame instance.
   *
   * @param {Object} [options={}]
   * @param {boolean} [options.deep=true]
   * @returns {DataFrame}
   */
  copy(options = {}) {
    if (options == null || typeof options !== 'object' || Array.isArray(options)) {
      throw new Error('DataFrame.copy options must be an object');
    }

    if (
      Object.prototype.hasOwnProperty.call(options, 'deep')
      && typeof options.deep !== 'boolean'
    ) {
      throw new Error('DataFrame.copy option deep must be boolean');
    }
    const deep = options.deep !== false;

    if (deep) {
      return __astCloneDataFrame(this);
    }

    const shallowData = {};
    for (let idx = 0; idx < this.columns.length; idx++) {
      const column = this.columns[idx];
      shallowData[column] = this.data[column];
    }

    return new DataFrame(shallowData, [...this.index]);
  }

  /**
   * Drop rows or columns with missing values (`null`, `undefined`, `NaN`).
   *
   * @param {Object} [options={}]
   * @param {'rows'|'columns'|0|1|'index'} [options.axis='rows']
   * @param {'any'|'all'} [options.how='any']
   * @param {number} [options.thresh]
   * @param {string|string[]} [options.subset]
   * @returns {DataFrame}
   */
  dropNulls(options = {}) {
    const normalized = __astNormalizeDataFrameDropNullOptions(this, options, 'dropNulls');
    if (normalized.axis === 'rows') {
      return __astDataFrameDropNullRows(this, normalized);
    }

    return __astDataFrameDropNullColumns(this, normalized);
  }

  /**
   * Fill missing values (`null`, `undefined`, `NaN`).
   *
   * @param {*} values - Scalar fill value or per-column object map.
   * @param {Object} [options={}]
   * @param {string|string[]} [options.columns]
   * @returns {DataFrame}
   */
  fillNulls(values, options = {}) {
    const normalized = __astNormalizeDataFrameFillNullInputs(this, values, options, 'fillNulls');
    const nextColumns = {};

    for (let colIdx = 0; colIdx < this.columns.length; colIdx++) {
      const column = this.columns[colIdx];
      const source = this.data[column].array;
      const output = new Array(source.length);

      for (let rowIdx = 0; rowIdx < source.length; rowIdx++) {
        const current = source[rowIdx];
        if (!__astDataFrameIsMissingValue(current) || !normalized.targetColumns.has(column)) {
          output[rowIdx] = current;
          continue;
        }

        if (normalized.mode === 'scalar') {
          output[rowIdx] = normalized.scalar;
          continue;
        }

        if (Object.prototype.hasOwnProperty.call(normalized.map, column)) {
          output[rowIdx] = normalized.map[column];
        } else {
          output[rowIdx] = current;
        }
      }

      nextColumns[column] = output;
    }

    return DataFrame.fromColumns(nextColumns, {
      copy: false,
      index: [...this.index]
    });
  }

  /**
   * Replace matching values in the DataFrame.
   *
   * Supported forms:
   * - `replace(oldValue, newValue, options)`
   * - `replace([oldA, oldB], newValue, options)`
   * - `replace(mappingObject, undefined, options)` (global map)
   * - `replace(mappingMap, undefined, options)` (global map with `Object.is`)
   * - `replace({ col: { from: to } }, undefined, options)` (per-column maps)
   *
   * @param {*} toReplace
   * @param {*} value
   * @param {Object} [options={}]
   * @returns {DataFrame}
   */
  replace(toReplace, value, options = {}) {
    const mapMode = value === undefined && (
      __astDataFrameIsMapLike(toReplace) || __astDataFrameIsPlainObject(toReplace)
    );
    const hasReplacementValue = arguments.length >= 2 && !mapMode;
    const normalized = __astNormalizeDataFrameReplaceInputs(
      this,
      toReplace,
      value,
      options,
      hasReplacementValue,
      'replace'
    );

    const nextColumns = {};

    for (let colIdx = 0; colIdx < this.columns.length; colIdx++) {
      const column = this.columns[colIdx];
      const source = this.data[column].array;

      if (!normalized.targetColumns.has(column)) {
        nextColumns[column] = [...source];
        continue;
      }

      const resolver = normalized.columnResolvers[column] || normalized.defaultResolver;
      if (typeof resolver !== 'function') {
        nextColumns[column] = [...source];
        continue;
      }

      const output = new Array(source.length);
      for (let rowIdx = 0; rowIdx < source.length; rowIdx++) {
        output[rowIdx] = resolver(source[rowIdx], rowIdx, column);
      }
      nextColumns[column] = output;
    }

    return DataFrame.fromColumns(nextColumns, {
      copy: false,
      index: [...this.index]
    });
  }

  /**
   * Keep original values where condition is true; replace where false.
   *
   * @param {Function|Series|boolean[]|DataFrame} condition
   * @param {*} [other=null]
   * @returns {DataFrame}
   */
  where(condition, other = null) {
    const predicate = __astResolveDataFrameConditionPredicate(this, condition, 'where');
    const otherResolver = __astResolveDataFrameOtherResolver(this, other, 'where');
    return __astApplyDataFrameConditional(this, predicate, otherResolver, false);
  }

  /**
   * Replace values where condition is true; keep original where false.
   *
   * @param {Function|Series|boolean[]|DataFrame} condition
   * @param {*} [other=null]
   * @returns {DataFrame}
   */
  mask(condition, other = null) {
    const predicate = __astResolveDataFrameConditionPredicate(this, condition, 'mask');
    const otherResolver = __astResolveDataFrameOtherResolver(this, other, 'mask');
    return __astApplyDataFrameConditional(this, predicate, otherResolver, true);
  }

  rename(names) {
    const renamed = Object.entries(this.data).reduce((acc, [key, value]) => {
      if (Object.prototype.hasOwnProperty.call(names, key)) {
        const newColName = names[key];
        const renamedSeries = value.rename(newColName);
        acc[newColName] = renamedSeries;
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});

    return new DataFrame(renamed);
  }

  at(index) {
    if (index < 0 || index >= this.len()) {
      throw new Error('Row index out of bounds');
    }

    return this.columns.reduce((row, col) => {
      row[col] = this[col].at(index);
      return row;
    }, {});
  }

  iat(index) {
    if (index >= 0 && index < this.len()) return this.index[index];
    return undefined;
  }

  /**
   * Return a projected DataFrame with only selected columns.
   *
   * @param {string[]} columns
   * @returns {DataFrame}
   */
  select(columns) {
    const selectedData = selectKeysFromObject(this.data, columns);
    const result = new DataFrame(selectedData);
    result.index = [...this.index];
    return result;
  }

  /**
   * Set the row index from one or more columns.
   *
   * Multi-column indexes are represented as single string labels using a
   * type-stable tuple encoding to avoid lossy JSON coercion.
   *
   * @param {string|string[]} keys
   * @param {Object} [options={}]
   * @param {boolean} [options.drop=true]
   * @param {boolean} [options.verifyIntegrity=false]
   * @returns {DataFrame}
   */
  setIndex(keys, options = {}) {
    const normalizedKeys = __astNormalizeDataFrameColumnList(this, keys, 'keys', 'setIndex');
    if (normalizedKeys.length === 0) {
      throw new Error('DataFrame.setIndex requires at least one key column');
    }

    const normalized = __astNormalizeDataFrameSetIndexOptions(options, 'setIndex');
    const nextIndex = new Array(this.len());

    if (normalizedKeys.length === 1) {
      const source = this.data[normalizedKeys[0]].array;
      for (let rowIdx = 0; rowIdx < this.len(); rowIdx++) {
        nextIndex[rowIdx] = source[rowIdx];
      }
    } else {
      const keyArrays = normalizedKeys.map(key => this.data[key].array);
      for (let rowIdx = 0; rowIdx < this.len(); rowIdx++) {
        const values = new Array(keyArrays.length);
        for (let keyIdx = 0; keyIdx < keyArrays.length; keyIdx++) {
          values[keyIdx] = keyArrays[keyIdx][rowIdx];
        }
        nextIndex[rowIdx] = __astEncodeDataFrameIndexTuple(values);
      }
    }

    if (normalized.verifyIntegrity) {
      __astAssertDataFrameUniqueIndex(nextIndex, 'setIndex');
    }

    const outputColumns = normalized.drop
      ? this.columns.filter(column => !normalizedKeys.includes(column))
      : [...this.columns];
    if (outputColumns.length === 0 && this.len() > 0) {
      throw new Error('DataFrame.setIndex cannot drop all columns for a non-empty DataFrame; use drop=false or keep at least one non-index column');
    }

    const result = this.select(outputColumns);
    result.index = nextIndex;
    return result;
  }

  selectExpr(map, options = {}) {
    if (map == null || typeof map !== 'object' || Array.isArray(map)) {
      throw new Error('selectExpr requires an object mapping of output columns');
    }

    const expressionEntries = Object.entries(map);
    if (expressionEntries.length === 0) {
      throw new Error('selectExpr requires at least one expression');
    }

    if (options == null || typeof options !== 'object' || Array.isArray(options)) {
      throw new Error('selectExpr options must be an object');
    }

    const {
      strict = true,
      onError = 'throw'
    } = options;

    if (typeof strict !== 'boolean') {
      throw new Error('selectExpr option strict must be boolean');
    }

    if (!['throw', 'null'].includes(onError)) {
      throw new Error("selectExpr option onError must be either 'throw' or 'null'");
    }

    const rowCount = this.len();
    const selectedColumns = {};
    const sourceColumns = this.columns;
    const sourceColumnArrays = sourceColumns.map(column => this.data[column].array);
    let rowCache = null;

    const buildRowObjectAt = rowIdx => {
      if (rowCache == null) {
        rowCache = new Array(rowCount);
      }

      if (rowCache[rowIdx] != null) {
        return rowCache[rowIdx];
      }

      const row = {};
      for (let colIdx = 0; colIdx < sourceColumns.length; colIdx++) {
        row[sourceColumns[colIdx]] = sourceColumnArrays[colIdx][rowIdx];
      }

      rowCache[rowIdx] = row;
      return row;
    };

    for (let exprIdx = 0; exprIdx < expressionEntries.length; exprIdx++) {
      const [outputColumnName, expression] = expressionEntries[exprIdx];
      const normalizedOutputColumn = __astValidateColumnName(outputColumnName, `selectExpr output key at index ${exprIdx}`);

      if (typeof expression === 'string') {
        const sourceColumnName = expression.trim();
        if (!this.columns.includes(sourceColumnName)) {
          if (strict) {
            throw new Error(`selectExpr received unknown source column '${sourceColumnName}' for output '${normalizedOutputColumn}'`);
          }
          selectedColumns[normalizedOutputColumn] = Series.fromValue(null, rowCount, normalizedOutputColumn).array;
          continue;
        }

        selectedColumns[normalizedOutputColumn] = [...this.data[sourceColumnName].array];
        continue;
      }

      if (typeof expression !== 'function') {
        throw new Error(`selectExpr expression for '${normalizedOutputColumn}' must be a string or function`);
      }

      const projectorMode = __astResolveSelectExprProjectorMode(expression);
      const values = new Array(rowCount);
      for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
        let value;

        try {
          value = projectorMode === 'columns'
            ? expression(this.data, rowIdx)
            : expression(buildRowObjectAt(rowIdx));
        } catch (error) {
          if (onError === 'null') {
            values[rowIdx] = null;
            continue;
          }

          throw new Error(`selectExpr expression for '${normalizedOutputColumn}' failed at row ${rowIdx}: ${error.message}`);
        }

        if (value && typeof value.then === 'function') {
          throw new Error(`selectExpr expression for '${normalizedOutputColumn}' returned a Promise at row ${rowIdx}; async expressions are not supported`);
        }

        values[rowIdx] = value;
      }

      selectedColumns[normalizedOutputColumn] = values;
    }

    return DataFrame.fromColumns(selectedColumns, {
      copy: false,
      index: [...this.index]
    });
  }

  selectExprDsl(map, options = {}) {
    if (map == null || typeof map !== 'object' || Array.isArray(map)) {
      throw new Error('selectExprDsl requires an object mapping of output columns');
    }

    if (options == null || typeof options !== 'object' || Array.isArray(options)) {
      throw new Error('selectExprDsl options must be an object');
    }

    const {
      strict = true,
      onError = 'throw',
      cachePlan = true
    } = options;

    if (typeof strict !== 'boolean') {
      throw new Error('selectExprDsl option strict must be boolean');
    }

    if (!['throw', 'null'].includes(onError)) {
      throw new Error("selectExprDsl option onError must be either 'throw' or 'null'");
    }

    if (typeof cachePlan !== 'boolean') {
      throw new Error('selectExprDsl option cachePlan must be boolean');
    }

    if (typeof __astExprCompileMap !== 'function') {
      throw new Error('selectExprDsl expression engine is not available');
    }

    const compiledEntries = __astExprCompileMap(map, {
      strict,
      cachePlan,
      availableColumns: this.columns
    });

    const rowCount = this.len();
    const outputColumns = {};
    const sourceColumns = this.columns;
    const sourceColumnArrays = sourceColumns.map(column => this.data[column].array);
    let rowCache = null;

    const buildRowObjectAt = rowIdx => {
      if (rowCache == null) {
        rowCache = new Array(rowCount);
      }

      if (rowCache[rowIdx] != null) {
        return rowCache[rowIdx];
      }

      const row = {};
      for (let colIdx = 0; colIdx < sourceColumns.length; colIdx++) {
        row[sourceColumns[colIdx]] = sourceColumnArrays[colIdx][rowIdx];
      }

      rowCache[rowIdx] = row;
      return row;
    };

    for (let planIdx = 0; planIdx < compiledEntries.length; planIdx++) {
      const entry = compiledEntries[planIdx];
      const values = new Array(rowCount);

      for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
        let evaluated;
        try {
          evaluated = entry.evaluate(buildRowObjectAt(rowIdx), { strict });
        } catch (error) {
          if (onError === 'null') {
            values[rowIdx] = null;
            continue;
          }

          throw new Error(`selectExprDsl expression for '${entry.outputColumn}' failed at row ${rowIdx}: ${error.message}`);
        }

        if (evaluated && typeof evaluated.then === 'function') {
          throw new Error(`selectExprDsl expression for '${entry.outputColumn}' returned a Promise at row ${rowIdx}; async expressions are not supported`);
        }

        values[rowIdx] = evaluated;
      }

      outputColumns[entry.outputColumn] = values;
    }

    return DataFrame.fromColumns(outputColumns, {
      copy: false,
      index: [...this.index]
    });
  }

  resetIndex() {
    this.index = this.len() === 0 ? [] : arrayFromRange(0, this.len() - 1);
    return this;
  }

  /**
   * Sort rows by index labels.
   *
   * @param {Object} [options={}]
   * @param {boolean} [options.ascending=true]
   * @param {boolean} [options.verifyIntegrity=false]
   * @returns {DataFrame}
   */
  sortIndex(options = {}) {
    const normalized = __astNormalizeDataFrameSortIndexOptions(options, 'sortIndex');

    if (normalized.verifyIntegrity) {
      __astAssertDataFrameUniqueIndex(this.index, 'sortIndex');
    }

    if (this.len() <= 1) {
      return __astCloneDataFrame(this);
    }

    const rowIndexes = arrayFromRange(0, this.len() - 1);
    rowIndexes.sort((leftPos, rightPos) => {
      const compared = __astCompareDataFrameIndexLabels(this.index[leftPos], this.index[rightPos]);
      if (compared === 0) {
        return leftPos - rightPos;
      }
      return normalized.ascending ? compared : -compared;
    });

    return this._buildFromRowIndexes(rowIndexes, true);
  }

  /**
   * Reindex rows and/or columns with deterministic fill behavior.
   *
   * @param {Object} [options={}]
   * @param {Array<*>} [options.index]
   * @param {string[]} [options.columns]
   * @param {*} [options.fillValue=null]
   * @param {boolean} [options.allowMissingLabels=false]
   * @param {boolean} [options.verifyIntegrity=false]
   * @returns {DataFrame}
   */
  reindex(options = {}) {
    const normalized = __astNormalizeDataFrameReindexOptions(this, options, 'reindex');

    if (normalized.verifyIntegrity) {
      __astAssertDataFrameUniqueIndex(this.index, 'reindex');
    }

    const sourceLookup = __astBuildDataFrameIndexLookup(this.index, false, 'reindex');
    const reindexState = __astBuildDataFrameReindexState(sourceLookup);
    const rowPositions = new Array(normalized.index.length);
    const missingRowLabels = [];

    for (let rowIdx = 0; rowIdx < normalized.index.length; rowIdx++) {
      const label = normalized.index[rowIdx];
      const sourcePos = __astTakeNextDataFrameIndexPosition(sourceLookup, reindexState, label);
      rowPositions[rowIdx] = sourcePos;
      if (sourcePos < 0) {
        missingRowLabels.push(label);
      }
    }

    if (missingRowLabels.length > 0 && !normalized.allowMissingLabels) {
      throw new Error(
        `DataFrame.reindex received unknown index labels: ${__astFormatDataFrameLabelList(missingRowLabels)}`
      );
    }

    const missingColumns = normalized.columns.filter(column => !this.columns.includes(column));
    if (missingColumns.length > 0 && !normalized.allowMissingLabels) {
      throw new Error(
        `DataFrame.reindex received unknown column labels: ${missingColumns.join(', ')}`
      );
    }

    const outputColumns = {};
    for (let colIdx = 0; colIdx < normalized.columns.length; colIdx++) {
      const column = normalized.columns[colIdx];
      const values = new Array(normalized.index.length);
      const sourceArray = this.columns.includes(column)
        ? this.data[column].array
        : null;

      for (let rowIdx = 0; rowIdx < normalized.index.length; rowIdx++) {
        const sourcePos = rowPositions[rowIdx];
        if (sourceArray == null || sourcePos < 0) {
          values[rowIdx] = normalized.fillValue;
        } else {
          values[rowIdx] = sourceArray[sourcePos];
        }
      }

      outputColumns[column] = values;
    }

    return DataFrame.fromColumns(outputColumns, {
      copy: false,
      index: [...normalized.index]
    });
  }

  asType(types) {
    const transformed = Object.entries(this.data).reduce((acc, [key, value]) => {
      if (types[key]) {
        acc[key] = value.asType(types[key]);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});
    return new DataFrame(transformed);
  }

  schema() {
    return Object.values(this.data).reduce((acc, series) => {
      acc[series.name] = series.type;
      return acc;
    }, {});
  }

  validateSchema(schema, options = {}) {
    return DataFrame.validateSchema(this, schema, options);
  }

  enforceSchema(schema, options = {}) {
    return DataFrame.enforceSchema(this, schema, options);
  }

  union(other, distinct = false) {
    if (other.empty()) {
      return __astCloneDataFrame(this);
    }

    const sameColumns = this.columns.length === other.columns.length
      && this.columns.every((column, idx) => column === other.columns[idx]);

    if (!distinct && sameColumns) {
      const mergedColumns = {};

      for (let colIdx = 0; colIdx < this.columns.length; colIdx++) {
        const column = this.columns[colIdx];
        mergedColumns[column] = [...this.data[column].array, ...other.data[column].array];
      }

      return DataFrame.fromColumns(mergedColumns).resetIndex();
    }

    return DataFrame.fromRecords(
      arrayUnion(this.toRecords(), other.toRecords(), distinct)
    ).resetIndex();
  }

  dropDuplicates(subset = []) {
    const requestedSubset = Array.isArray(subset) ? subset : [subset];
    const dedupeKeys = requestedSubset.length > 0 ? requestedSubset : [...this.columns];

    const invalidKeys = dedupeKeys.filter(key => !this.columns.includes(key));
    if (invalidKeys.length > 0) {
      throw new Error(`dropDuplicates received unknown columns: ${invalidKeys.join(', ')}`);
    }

    if (this.empty()) {
      return __astCloneDataFrame(this);
    }

    const keySeries = dedupeKeys.map(key => this.data[key].array);
    const seen = new Set();
    const keepRows = [];

    for (let rowIdx = 0; rowIdx < this.len(); rowIdx++) {
      const values = new Array(keySeries.length);
      for (let keyIdx = 0; keyIdx < keySeries.length; keyIdx++) {
        values[keyIdx] = keySeries[keyIdx][rowIdx];
      }

      const key = astBuildValuesKey(values);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      keepRows.push(rowIdx);
    }

    return this._buildFromRowIndexes(keepRows, false);
  }

  drop(columns) {
    const droppedData = removeKeysFromObject(this.data, columns);
    const result = new DataFrame(droppedData);
    result.index = [...this.index];
    return result;
  }

  /**
   * Add or replace columns using scalar values, Series values, or callbacks.
   * Callback signatures: `(frame) => valueOrSeries`.
   *
   * @param {Object<string, *>} columns
   * @returns {DataFrame}
   */
  assign(columns) {
    const assigned = { ...this.data };

    for (const [colName, columnValue] of Object.entries(columns)) {
      let newSeries;
      switch (true) {
        case (typeof columnValue === 'function'): {
          const result = columnValue(this);
          newSeries = (result instanceof Series) && (result.len() === this.len())
            ? result.rename(colName)
            : Series.fromValue(result, this.len(), colName);
          break;
        }

        case (columnValue instanceof Series): {
          if (columnValue.len() !== this.len()) {
            throw new Error(`The assigned Series must be the same length as the DataFrame. Expected length of ${this.len()} but got length of ${columnValue.len()}`);
          }
          newSeries = columnValue.rename(colName);
          break;
        }

        default:
          newSeries = Series.fromValue(columnValue, this.len(), colName);
          break;
      }

      assigned[colName] = newSeries;
    }

    const result = new DataFrame(assigned);
    result.index = [...this.index];
    return result;
  }

  pipe(...funcs) {
    return funcs.reduce((df, func) => {
      const result = func(df);
      if (!(result instanceof DataFrame)) {
        throw new Error(`Function ${func.name} in pipe should return a DataFrame instance.`);
      }
      return result;
    }, this);
  }

  /**
   * Join this DataFrame with another DataFrame using columnar merge internals.
   *
   * @param {DataFrame} other
   * @param {'left'|'right'|'inner'|'outer'|'cross'} [how='inner']
   * @param {Object} [options={}]
   * @returns {DataFrame}
   */
  merge(other, how = 'inner', options = {}) {
    if (!(other instanceof DataFrame)) {
      throw new Error('`other` must be a DataFrame');
    }

    return __astMergeDataFramesColumnar(this, other, how, options);
  }

  generateSurrogateKey(columns, delimiter = '-') {
    const normalizedColumns = __astNormalizeSurrogateColumns(columns);
    const missingColumns = normalizedColumns.filter(column => !this.columns.includes(column));
    if (missingColumns.length > 0) {
      throw new Error(`generateSurrogateKey received unknown columns: ${missingColumns.join(', ')}`);
    }

    const [firstCol, ...remainingColumns] = normalizedColumns;

    return remainingColumns.reduce((acc, col) => {
      return acc.concat(this[col], delimiter);
    }, this[firstCol]).str.sha256();
  }

  /**
   * Pivot records into a wide format keyed by `indexCol` and `pivotCol`.
   * When `aggMapping` is omitted, non-key columns default to first-value pick.
   *
   * @param {string} indexCol
   * @param {string} pivotCol
   * @param {Object<string, Function>} [aggMapping={}]
   * @returns {DataFrame}
   */
  pivot(indexCol, pivotCol, aggMapping = {}) {
    const records = this.toRecords();
    const buildGroupKeyPart = value => {
      if (value === undefined) {
        return { kind: 'undefined' };
      }
      try {
        return { kind: 'value', key: astStableKey(value) };
      } catch (_) {
        return { kind: 'value_fallback', key: String(value) };
      }
    };
    const buildGroupKey = (indexValue, pivotValue) => {
      return JSON.stringify([buildGroupKeyPart(indexValue), buildGroupKeyPart(pivotValue)]);
    };

    const groupedData = new Map();
    const indexValues = new Set();
    const pivotValues = new Set();

    if (Object.keys(aggMapping).length === 0) {
      for (const col of this.columns) {
        if (col !== indexCol && col !== pivotCol) {
          aggMapping[col] = values => values[0];
        }
      }
    }

    for (const record of records) {
      const indexValue = record[indexCol];
      const pivotValue = record[pivotCol];

      indexValues.add(indexValue);
      pivotValues.add(pivotValue);

      const groupKey = buildGroupKey(indexValue, pivotValue);

      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, []);
      }

      groupedData.get(groupKey).push(record);
    }

    const aggregatedData = new Map();

    for (const [groupKey, groupRecords] of groupedData.entries()) {
      const aggResult = {};

      for (const [col, aggFunc] of Object.entries(aggMapping)) {
        const values = groupRecords.map(record => record[col]);
        aggResult[col] = aggFunc(values);
      }

      aggregatedData.set(groupKey, aggResult);
    }

    const data = {};
    data[indexCol] = new Series([], indexCol);

    for (const pivotValue of pivotValues) {
      for (const col of Object.keys(aggMapping)) {
        const colName = `${pivotValue}_${col}`;
        data[colName] = new Series([], colName);
      }
    }

    for (const indexValue of indexValues) {
      data[indexCol].append(indexValue);

      for (const pivotValue of pivotValues) {
        const groupKey = buildGroupKey(indexValue, pivotValue);

        for (const col of Object.keys(aggMapping)) {
          const colName = `${pivotValue}_${col}`;
          const aggResult = aggregatedData.get(groupKey);

          if (aggResult && aggResult[col] !== undefined) {
            data[colName].append(aggResult[col]);
          } else {
            data[colName].append(null);
          }
        }
      }
    }

    return new DataFrame(data);
  }

  /**
   * Create a GroupBy wrapper for keyed aggregation and grouped transforms.
   *
   * @param {string|string[]} [keys=[]]
   * @returns {GroupBy}
   */
  groupBy(keys = []) {
    const normalizedKeys = Array.isArray(keys) ? keys : [keys];
    if (normalizedKeys.length === 0) {
      throw new Error('groupBy requires at least one key');
    }
    return new GroupBy(this, normalizedKeys);
  }

  window(spec = {}) {
    return new AstDataFrameWindow(this, spec);
  }

  toColumns(options = {}) {
    const {
      copy = true,
      bySeriesName = false
    } = options;

    const columns = {};

    for (let colIdx = 0; colIdx < this.columns.length; colIdx++) {
      const column = this.columns[colIdx];
      const series = this.data[column];
      const key = bySeriesName ? series.name : column;
      columns[key] = copy ? [...series.array] : series.array;
    }

    return columns;
  }

  toRecords() {
    __astIncrementDataFrameCounter('toRecords');

    if (this.columns.length === 0) {
      return [];
    }

    const rowCount = this.len();
    const columnArrays = this.columns.map(column => this.data[column].array);
    const outputNames = this.columns.map(column => this.data[column].name);

    const records = new Array(rowCount);
    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const record = {};

      for (let colIdx = 0; colIdx < columnArrays.length; colIdx++) {
        record[outputNames[colIdx]] = columnArrays[colIdx][rowIdx];
      }

      records[rowIdx] = record;
    }

    return records;
  }

  toArrays(headerOrder = []) {
    __astIncrementDataFrameCounter('toArrays');

    if (this.columns.length === 0) {
      return [];
    }

    const nameLookup = {};
    for (let colIdx = 0; colIdx < this.columns.length; colIdx++) {
      const column = this.columns[colIdx];
      nameLookup[this.data[column].name] = this.data[column];
    }

    const headers = Array.isArray(headerOrder) && headerOrder.length > 0
      ? headerOrder
      : this.columns.map(column => this.data[column].name);

    for (let idx = 0; idx < headers.length; idx++) {
      const key = headers[idx];
      if (!(key in this.data) && !(key in nameLookup)) {
        throw new Error(`Key "${key}" in headerOrder doesn't exist in the provided object.`);
      }
    }

    const rows = new Array(this.len() + 1);
    rows[0] = [...headers];

    for (let rowIdx = 0; rowIdx < this.len(); rowIdx++) {
      const row = new Array(headers.length);

      for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        const key = headers[colIdx];
        const series = this.data[key] || nameLookup[key];
        row[colIdx] = series.array[rowIdx];
      }

      rows[rowIdx + 1] = row;
    }

    return rows;
  }

  toSheet(sheet, options = {}) {
    const enhancedSheet = new EnhancedSheet(sheet);
    const {
      mode = 'overwrite',
      headerRows = 0,
      startRow,
      startCol,
      headerOrder = [],
      includeHeader
    } = options;

    const [length, width] = this.size();
    if ((length * width) > 5000000) {
      throw new Error('Cell count exceeds the 5,000,000 cell limit in Google Sheets');
    }

    const validModes = ['overwrite', 'append', 'prepend', 'overwriteRange'];
    if (!validModes.includes(mode)) {
      throw new Error(`toSheet: unknown mode '${mode}'`);
    }

    const includeHeaderByDefault = mode === 'overwrite' || mode === 'overwriteRange';
    const shouldIncludeHeader = typeof includeHeader === 'boolean'
      ? includeHeader
      : includeHeaderByDefault;

    const valuesWithHeader = this.toArrays(headerOrder);

    if (mode === 'overwriteRange' && (startRow == null || startCol == null)) {
      throw new Error("toSheet mode 'overwriteRange' requires 'startRow' and 'startCol' options");
    }

    if (valuesWithHeader.length === 0) {
      return this;
    }

    const values = shouldIncludeHeader
      ? valuesWithHeader
      : valuesWithHeader.slice(1);

    if (values.length === 0) {
      return this;
    }

    switch (mode) {
      case 'overwrite':
        enhancedSheet.overwriteSheet(values);
        break;
      case 'append':
        enhancedSheet.appendToSheet(values);
        break;
      case 'prepend':
        enhancedSheet.prependToSheet(values, headerRows);
        break;
      case 'overwriteRange':
        enhancedSheet.overwriteRange(startRow, startCol, values);
        break;
    }
    return this;
  }

  toDriveFile(fileType, fileName, destinationFolder = null) {
    return createFileInDrive(fileType, fileName, { content: this.toRecords(), destinationFolder });
  }

  toTable(request = {}) {
    if (request == null || typeof request !== 'object' || Array.isArray(request)) {
      throw new Error('toTable requires an object request');
    }

    const {
      provider,
      config = {},
      headerOrder = []
    } = request;

    if (!config.tableSchema || typeof config.tableSchema !== 'object') {
      throw new Error('toTable requires config.tableSchema');
    }

    const columnOrder = Array.isArray(headerOrder) && headerOrder.length > 0
      ? headerOrder
      : Object.keys(config.tableSchema);

    const arrays = this.toArrays(columnOrder);
    const tableConfig = { ...config, arrays };

    switch (provider) {
      case 'databricks':
        astLoadDatabricksTable(tableConfig);
        return this;
      case 'bigquery':
        astLoadBigQueryTable(tableConfig);
        return this;
      default:
        throw new Error('Provider must be one of: databricks, bigquery');
    }
  }

  toJson({ indent = 4, multiline = false } = {}) {
    const records = this.toRecords();
    return multiline
      ? recordsToNewlineJson(records)
      : JSON.stringify(records, null, indent);
  }

  toMarkdown() {
    if (this.columns.length === 0) {
      return 'Empty DataFrame';
    }

    const rows = this.toArrays(this.columns);
    if (rows.length === 0) {
      const header = this.columns.join(' | ');
      const separator = this.columns.map(column => '-'.repeat(String(column).length)).join('-|-');
      return `${header}\n${separator}`;
    }

    const colWidths = rows[0].map((_, idx) => {
      return Math.max(...rows.map(row => String(row[idx] ?? '').length));
    });

    const formattedRows = rows.map(row => {
      return row
        .map((cell, idx) => String(cell ?? '').padEnd(colWidths[idx]))
        .join(' | ');
    });

    const separator = colWidths.map(width => '-'.repeat(width)).join('-|-');
    const body = formattedRows.slice(1).join('\n');
    return body ? `${formattedRows[0]}\n${separator}\n${body}` : `${formattedRows[0]}\n${separator}`;
  }

  /**
   * Stable multi-column sort with null ordering and optional per-column comparators.
   *
   * @param {string|string[]} by
   * @param {boolean|boolean[]} [ascending=true]
   * @param {Function|Object<string, Function>|null} [compareFunction=null]
   * @returns {DataFrame}
   */
  sort(by, ascending = true, compareFunction = null) {
    if (this.empty()) {
      return new DataFrame(this.data, [...this.index]);
    }

    const byColumns = Array.isArray(by) ? by : [by];

    byColumns.forEach(column => {
      if (!this.columns.includes(column)) {
        throw new Error(`Column '${column}' not found in DataFrame`);
      }
    });

    const ascendingArr = Array.isArray(ascending)
      ? ascending
      : byColumns.map(() => ascending);

    if (ascendingArr.length !== byColumns.length) {
      throw new Error(`'ascending' parameter length (${ascendingArr.length}) must match 'by' parameter length (${byColumns.length})`);
    }

    const compareFunctions = typeof compareFunction === 'function'
      ? byColumns.reduce((acc, col) => {
        acc[col] = compareFunction;
        return acc;
      }, {})
      : (compareFunction || {});

    const rowIndexes = arrayFromRange(0, this.len() - 1);
    const seriesByColumn = byColumns.map(column => this.data[column].array);

    rowIndexes.sort((leftIdx, rightIdx) => {
      for (let idx = 0; idx < byColumns.length; idx++) {
        const column = byColumns[idx];
        const isAsc = ascendingArr[idx];
        const compareFunc = compareFunctions[column];

        const valueA = seriesByColumn[idx][leftIdx];
        const valueB = seriesByColumn[idx][rightIdx];

        if (valueA == null && valueB == null) continue;
        if (valueA == null) return isAsc ? 1 : -1;
        if (valueB == null) return isAsc ? -1 : 1;

        let result = 0;
        if (compareFunc) {
          result = compareFunc(valueA, valueB);
        } else {
          result = valueA < valueB ? -1 : (valueA > valueB ? 1 : 0);
        }

        result = isAsc ? result : -result;

        if (result !== 0) return result;
      }
      return 0;
    });

    return this._buildFromRowIndexes(rowIndexes, false);
  }

  _buildFromRowIndexes(rowIndexes, preserveIndex = false) {
    const columns = {};
    const typeMap = {};

    for (let colIdx = 0; colIdx < this.columns.length; colIdx++) {
      const column = this.columns[colIdx];
      const source = this.data[column].array;
      const values = new Array(rowIndexes.length);

      for (let rowPos = 0; rowPos < rowIndexes.length; rowPos++) {
        values[rowPos] = source[rowIndexes[rowPos]];
      }

      columns[column] = values;
      const coercibleType = __astResolveCoercibleDataFrameType(this.data[column].type);
      if (coercibleType) {
        typeMap[column] = coercibleType;
      }
    }

    const nextIndex = preserveIndex
      ? rowIndexes.map(index => this.index[index])
      : null;

    return DataFrame.fromColumns(columns, { copy: false, index: nextIndex, typeMap });
  }
};

const AST_DATAFRAME_SYMBOL_KEY_MAP = new Map();
let AST_DATAFRAME_SYMBOL_KEY_COUNTER = 0;

function __astDataFrameIsPlainObject(value) {
  return value != null
    && typeof value === 'object'
    && !Array.isArray(value)
    && !(value instanceof Date)
    && !__astDataFrameIsMapLike(value)
    && !(value instanceof Series)
    && !(value instanceof DataFrame);
}

function __astDataFrameIsMapLike(value) {
  return value != null
    && Object.prototype.toString.call(value) === '[object Map]'
    && typeof value.entries === 'function';
}

function __astDataFrameIsMissingValue(value) {
  return value == null || (typeof value === 'number' && Number.isNaN(value));
}

function __astNormalizeDataFrameAxis(axis, methodName) {
  if (axis === undefined || axis === null || axis === 'rows' || axis === 'row' || axis === 'index' || axis === 0 || axis === '0') {
    return 'rows';
  }

  if (axis === 'columns' || axis === 'column' || axis === 'cols' || axis === 1 || axis === '1') {
    return 'columns';
  }

  throw new Error(`DataFrame.${methodName} option axis must be one of rows|columns|0|1|index`);
}

function __astNormalizeDataFrameColumnList(dataframe, columns, optionName, methodName) {
  if (columns === undefined || columns === null) {
    return [...dataframe.columns];
  }

  const rawList = Array.isArray(columns) ? columns : [columns];
  if (rawList.length === 0) {
    return [];
  }

  const normalized = rawList.map((value, idx) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`DataFrame.${methodName} option ${optionName} must contain non-empty strings (invalid at index ${idx})`);
    }
    return value;
  });

  const unique = Array.from(new Set(normalized));
  const missing = unique.filter(column => !dataframe.columns.includes(column));
  if (missing.length > 0) {
    throw new Error(`DataFrame.${methodName} option ${optionName} contains unknown columns: ${missing.join(', ')}`);
  }

  return unique;
}

function __astNormalizeDataFrameSetIndexOptions(options, methodName) {
  if (options == null) {
    return {
      drop: true,
      verifyIntegrity: false
    };
  }

  if (typeof options !== 'object' || Array.isArray(options)) {
    throw new Error(`DataFrame.${methodName} options must be an object`);
  }

  if (
    Object.prototype.hasOwnProperty.call(options, 'drop')
    && typeof options.drop !== 'boolean'
  ) {
    throw new Error(`DataFrame.${methodName} option drop must be boolean`);
  }

  if (
    Object.prototype.hasOwnProperty.call(options, 'verifyIntegrity')
    && typeof options.verifyIntegrity !== 'boolean'
  ) {
    throw new Error(`DataFrame.${methodName} option verifyIntegrity must be boolean`);
  }

  return {
    drop: options.drop !== false,
    verifyIntegrity: options.verifyIntegrity === true
  };
}

function __astNormalizeDataFrameSortIndexOptions(options, methodName) {
  if (options == null) {
    return {
      ascending: true,
      verifyIntegrity: false
    };
  }

  if (typeof options !== 'object' || Array.isArray(options)) {
    throw new Error(`DataFrame.${methodName} options must be an object`);
  }

  if (
    Object.prototype.hasOwnProperty.call(options, 'ascending')
    && typeof options.ascending !== 'boolean'
  ) {
    throw new Error(`DataFrame.${methodName} option ascending must be boolean`);
  }

  if (
    Object.prototype.hasOwnProperty.call(options, 'verifyIntegrity')
    && typeof options.verifyIntegrity !== 'boolean'
  ) {
    throw new Error(`DataFrame.${methodName} option verifyIntegrity must be boolean`);
  }

  return {
    ascending: options.ascending !== false,
    verifyIntegrity: options.verifyIntegrity === true
  };
}

function __astNormalizeDataFrameReindexOptions(dataframe, options, methodName) {
  if (options == null) {
    options = {};
  }

  if (typeof options !== 'object' || Array.isArray(options)) {
    throw new Error(`DataFrame.${methodName} options must be an object`);
  }

  if (
    Object.prototype.hasOwnProperty.call(options, 'allowMissingLabels')
    && typeof options.allowMissingLabels !== 'boolean'
  ) {
    throw new Error(`DataFrame.${methodName} option allowMissingLabels must be boolean`);
  }

  if (
    Object.prototype.hasOwnProperty.call(options, 'verifyIntegrity')
    && typeof options.verifyIntegrity !== 'boolean'
  ) {
    throw new Error(`DataFrame.${methodName} option verifyIntegrity must be boolean`);
  }

  const normalizedIndex = options.index == null
    ? [...dataframe.index]
    : __astNormalizeDataFrameTargetIndex(options.index, methodName);

  const normalizedColumns = options.columns == null
    ? [...dataframe.columns]
    : __astNormalizeDataFrameTargetColumns(options.columns, methodName);

  return {
    index: normalizedIndex,
    columns: normalizedColumns,
    fillValue: Object.prototype.hasOwnProperty.call(options, 'fillValue') ? options.fillValue : null,
    allowMissingLabels: options.allowMissingLabels === true,
    verifyIntegrity: options.verifyIntegrity === true
  };
}

function __astNormalizeDataFrameTargetIndex(index, methodName) {
  if (!Array.isArray(index)) {
    throw new Error(`DataFrame.${methodName} option index must be an array`);
  }

  return [...index];
}

function __astNormalizeDataFrameTargetColumns(columns, methodName) {
  if (!Array.isArray(columns)) {
    throw new Error(`DataFrame.${methodName} option columns must be an array`);
  }
  if (columns.length === 0) {
    throw new Error(`DataFrame.${methodName} option columns must contain at least one column`);
  }

  const normalized = new Array(columns.length);
  const seen = new Set();

  for (let idx = 0; idx < columns.length; idx++) {
    const column = columns[idx];
    if (typeof column !== 'string' || column.trim().length === 0) {
      throw new Error(`DataFrame.${methodName} option columns must contain non-empty strings (invalid at index ${idx})`);
    }

    if (seen.has(column)) {
      throw new Error(`DataFrame.${methodName} option columns contains duplicate label '${column}'`);
    }
    seen.add(column);
    normalized[idx] = column;
  }

  return normalized;
}

function __astCompareDataFrameIndexLabels(left, right) {
  if (Object.is(left, right)) {
    return 0;
  }

  if (left == null && right == null) {
    return 0;
  }

  if (left == null) {
    return 1;
  }

  if (right == null) {
    return -1;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    if (Number.isNaN(left) && Number.isNaN(right)) {
      return 0;
    }
    if (Number.isNaN(left)) {
      return 1;
    }
    if (Number.isNaN(right)) {
      return -1;
    }
    return left < right ? -1 : 1;
  }

  try {
    if (left < right) {
      return -1;
    }

    if (left > right) {
      return 1;
    }
  } catch (_error) {
    // Some label types (for example Symbol) do not support relational comparison.
  }

  const leftText = __astDataFrameLabelToStableText(left);
  const rightText = __astDataFrameLabelToStableText(right);
  if (leftText === rightText) {
    return 0;
  }
  return leftText < rightText ? -1 : 1;
}

function __astAssertDataFrameUniqueIndex(index, methodName) {
  __astBuildDataFrameIndexLookup(index, true, methodName);
}

function __astBuildDataFrameIndexLookup(index, verifyIntegrity, methodName) {
  const lookup = new Map();

  for (let idx = 0; idx < index.length; idx++) {
    const label = index[idx];
    const key = __astBuildDataFrameLabelLookupKey(label);
    const bucket = lookup.get(key);

    if (bucket == null) {
      lookup.set(key, [{ label, positions: [idx] }]);
      continue;
    }

    const existing = bucket.find(entry => __astAreDataFrameIndexLabelsEqual(entry.label, label));
    if (existing) {
      if (verifyIntegrity) {
        throw new Error(
          `DataFrame.${methodName} found duplicate index label '${__astFormatDataFrameLabel(label)}'`
        );
      }
      existing.positions.push(idx);
      continue;
    }

    bucket.push({ label, positions: [idx] });
  }

  return lookup;
}

function __astLookupDataFrameIndexPosition(lookup, label) {
  const key = __astBuildDataFrameLabelLookupKey(label);
  const bucket = lookup.get(key);
  if (!bucket) {
    return -1;
  }

  for (let idx = 0; idx < bucket.length; idx++) {
    if (__astAreDataFrameIndexLabelsEqual(bucket[idx].label, label)) {
      return bucket[idx].positions[0];
    }
  }

  return -1;
}

function __astBuildDataFrameReindexState(lookup) {
  const state = new Map();

  for (const [key, bucket] of lookup.entries()) {
    const bucketState = [];
    for (let idx = 0; idx < bucket.length; idx++) {
      bucketState.push({
        label: bucket[idx].label,
        cursor: 0
      });
    }
    state.set(key, bucketState);
  }

  return state;
}

function __astTakeNextDataFrameIndexPosition(lookup, state, label) {
  const key = __astBuildDataFrameLabelLookupKey(label);
  const bucket = lookup.get(key);
  const bucketState = state.get(key);
  if (!bucket || !bucketState) {
    return -1;
  }

  for (let idx = 0; idx < bucket.length; idx++) {
    const entry = bucket[idx];
    if (!__astAreDataFrameIndexLabelsEqual(entry.label, label)) {
      continue;
    }

    const cursorState = bucketState[idx];
    if (entry.positions.length === 0) {
      return -1;
    }

    const position = entry.positions[cursorState.cursor % entry.positions.length];
    cursorState.cursor += 1;
    return position;
  }

  return -1;
}

function __astBuildDataFrameLabelLookupKey(label) {
  if (label === null) return 'null:null';
  if (label === undefined) return 'undefined:undefined';
  if (typeof label === 'number') {
    return Number.isNaN(label) ? 'number:NaN' : `number:${label}`;
  }
  if (typeof label === 'string') return `string:${label}`;
  if (typeof label === 'boolean') return `boolean:${label}`;
  if (typeof label === 'bigint') return `bigint:${String(label)}`;
  if (typeof label === 'symbol') return `symbol:${__astFormatDataFrameSymbolForKey(label)}`;
  if (label instanceof Date) return `date:${__astFormatDataFrameDateForKey(label)}`;
  return `${typeof label}:${__astDataFrameLabelToStableText(label)}`;
}

function __astEncodeDataFrameIndexTuple(values) {
  const encoded = new Array(values.length);
  for (let idx = 0; idx < values.length; idx++) {
    encoded[idx] = __astBuildDataFrameLabelLookupKey(values[idx]);
  }
  return JSON.stringify(encoded);
}

function __astDataFrameLabelToStableText(label) {
  if (label === null) return 'null';
  if (label === undefined) return 'undefined';
  if (typeof label === 'number' && Number.isNaN(label)) return 'NaN';
  if (typeof label === 'symbol') return String(label);
  if (label instanceof Date) return __astFormatDataFrameDateForKey(label);
  try {
    return JSON.stringify(label);
  } catch (_error) {
    return String(label);
  }
}

function __astFormatDataFrameSymbolForKey(value) {
  const globalKey = Symbol.keyFor(value);
  if (globalKey != null) {
    return `global:${globalKey}`;
  }

  const existing = AST_DATAFRAME_SYMBOL_KEY_MAP.get(value);
  if (existing) {
    return existing;
  }

  AST_DATAFRAME_SYMBOL_KEY_COUNTER += 1;
  const description = value.description == null ? '' : String(value.description);
  const next = `local:${description}:${AST_DATAFRAME_SYMBOL_KEY_COUNTER}`;
  AST_DATAFRAME_SYMBOL_KEY_MAP.set(value, next);
  return next;
}

function __astFormatDataFrameDateForKey(value) {
  const time = value.getTime();
  if (Number.isNaN(time)) {
    return 'Invalid Date';
  }
  return value.toISOString();
}

function __astAreDataFrameIndexLabelsEqual(left, right) {
  if (Object.is(left, right)) {
    return true;
  }

  if (left instanceof Date && right instanceof Date) {
    const leftTime = left.getTime();
    const rightTime = right.getTime();
    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
      return true;
    }
    return leftTime === rightTime;
  }

  return false;
}

function __astFormatDataFrameLabel(label) {
  if (typeof label === 'string') {
    return label;
  }
  return __astDataFrameLabelToStableText(label);
}

function __astFormatDataFrameLabelList(labels) {
  return labels.map(label => `'${__astFormatDataFrameLabel(label)}'`).join(', ');
}

function __astNormalizeDataFrameDropNullOptions(dataframe, options, methodName) {
  if (options == null) {
    return { axis: 'rows', how: 'any', thresh: null, subset: [...dataframe.columns] };
  }

  if (typeof options !== 'object' || Array.isArray(options)) {
    throw new Error(`DataFrame.${methodName} options must be an object`);
  }

  const axis = __astNormalizeDataFrameAxis(options.axis, methodName);
  const how = options.how == null ? 'any' : options.how;
  if (!['any', 'all'].includes(how)) {
    throw new Error(`DataFrame.${methodName} option how must be 'any' or 'all'`);
  }

  let thresh = null;
  if (options.thresh != null) {
    if (!Number.isInteger(options.thresh) || options.thresh < 0) {
      throw new Error(`DataFrame.${methodName} option thresh must be a non-negative integer`);
    }
    thresh = options.thresh;
  }

  const subset = __astNormalizeDataFrameColumnList(dataframe, options.subset, 'subset', methodName);
  if (axis === 'columns' && options.subset != null) {
    throw new Error(`DataFrame.${methodName} option subset is only supported when axis='rows'`);
  }

  return { axis, how, thresh, subset };
}

function __astDataFrameDropNullRows(dataframe, options) {
  const candidateColumns = options.subset;
  const keepRows = [];

  if (candidateColumns.length === 0) {
    if (options.thresh != null && options.thresh > 0) {
      return dataframe.take([]);
    }
    return __astCloneDataFrame(dataframe);
  }

  for (let rowIdx = 0; rowIdx < dataframe.len(); rowIdx++) {
    let nonMissingCount = 0;

    for (let colIdx = 0; colIdx < candidateColumns.length; colIdx++) {
      const column = candidateColumns[colIdx];
      if (!__astDataFrameIsMissingValue(dataframe.data[column].array[rowIdx])) {
        nonMissingCount += 1;
      }
    }

    if (options.thresh != null) {
      if (nonMissingCount >= options.thresh) {
        keepRows.push(rowIdx);
      }
      continue;
    }

    if (options.how === 'all') {
      if (nonMissingCount > 0) {
        keepRows.push(rowIdx);
      }
    } else if (nonMissingCount === candidateColumns.length) {
      keepRows.push(rowIdx);
    }
  }

  return dataframe.take(keepRows, { preserveIndex: true });
}

function __astDataFrameDropNullColumns(dataframe, options) {
  if (dataframe.len() === 0 && options.thresh == null) {
    return __astCloneDataFrame(dataframe);
  }

  const keepColumns = [];
  for (let colIdx = 0; colIdx < dataframe.columns.length; colIdx++) {
    const column = dataframe.columns[colIdx];
    const values = dataframe.data[column].array;
    let nonMissingCount = 0;

    for (let rowIdx = 0; rowIdx < values.length; rowIdx++) {
      if (!__astDataFrameIsMissingValue(values[rowIdx])) {
        nonMissingCount += 1;
      }
    }

    if (options.thresh != null) {
      if (nonMissingCount >= options.thresh) {
        keepColumns.push(column);
      }
      continue;
    }

    if (options.how === 'all') {
      if (nonMissingCount > 0 || values.length === 0) {
        keepColumns.push(column);
      }
    } else if (nonMissingCount === values.length) {
      keepColumns.push(column);
    }
  }

  return dataframe.select(keepColumns);
}

function __astNormalizeDataFrameFillNullInputs(dataframe, values, options, methodName) {
  if (options == null) {
    options = {};
  }

  if (typeof options !== 'object' || Array.isArray(options)) {
    throw new Error(`DataFrame.${methodName} options must be an object`);
  }

  const targetColumns = new Set(
    __astNormalizeDataFrameColumnList(dataframe, options.columns, 'columns', methodName)
  );

  if (__astDataFrameIsPlainObject(values)) {
    const map = values;
    const invalidColumns = Object.keys(map).filter(column => !dataframe.columns.includes(column));
    if (invalidColumns.length > 0) {
      throw new Error(`DataFrame.${methodName} values map contains unknown columns: ${invalidColumns.join(', ')}`);
    }

    return {
      mode: 'map',
      map,
      targetColumns
    };
  }

  return {
    mode: 'scalar',
    scalar: values,
    targetColumns
  };
}

function __astNormalizeDataFrameReplaceInputs(dataframe, toReplace, value, options, hasReplacementValue, methodName) {
  if (options == null) {
    options = {};
  }

  if (typeof options !== 'object' || Array.isArray(options)) {
    throw new Error(`DataFrame.${methodName} options must be an object`);
  }

  const targetColumns = new Set(
    __astNormalizeDataFrameColumnList(dataframe, options.columns, 'columns', methodName)
  );

  if (!hasReplacementValue && __astDataFrameIsMapLike(toReplace)) {
    return {
      targetColumns,
      columnResolvers: {},
      defaultResolver: current => __astDataFrameReplaceFromMap(current, toReplace)
    };
  }

  if (!hasReplacementValue && __astDataFrameIsPlainObject(toReplace)) {
    const keys = Object.keys(toReplace);
    const isColumnMap = keys.length > 0
      && keys.every(column => dataframe.columns.includes(column))
      && keys.every(column => {
        const spec = toReplace[column];
        return __astDataFrameIsMapLike(spec) || __astDataFrameIsPlainObject(spec);
      });

    if (isColumnMap) {
      const columnResolvers = {};
      const scopedTargets = new Set();

      for (let idx = 0; idx < keys.length; idx++) {
        const column = keys[idx];
        if (!targetColumns.has(column)) {
          continue;
        }

        const mapping = toReplace[column];
        columnResolvers[column] = __astDataFrameIsMapLike(mapping)
          ? (current => __astDataFrameReplaceFromMap(current, mapping))
          : (current => __astDataFrameReplaceFromObjectMap(current, mapping));
        scopedTargets.add(column);
      }

      return {
        targetColumns: scopedTargets,
        columnResolvers,
        defaultResolver: null
      };
    }

    return {
      targetColumns,
      columnResolvers: {},
      defaultResolver: current => __astDataFrameReplaceFromObjectMap(current, toReplace)
    };
  }

  if (!hasReplacementValue) {
    throw new Error(`DataFrame.${methodName} requires a replacement value unless map mode is used`);
  }

  const targets = __astNormalizeDataFrameReplaceTargets(toReplace, methodName);
  return {
    targetColumns,
    columnResolvers: {},
    defaultResolver: current => (__astDataFrameValueMatchesAny(current, targets) ? value : current)
  };
}

function __astNormalizeDataFrameReplaceTargets(toReplace, methodName) {
  const source = toReplace instanceof Series
    ? toReplace.array
    : (Array.isArray(toReplace) ? toReplace : [toReplace]);

  if (!Array.isArray(source) || source.length === 0) {
    throw new Error(`DataFrame.${methodName} requires at least one target value`);
  }

  return source;
}

function __astDataFrameValueMatchesAny(value, targets) {
  for (let idx = 0; idx < targets.length; idx++) {
    if (Object.is(value, targets[idx])) {
      return true;
    }
  }
  return false;
}

function __astStringifyDataFrameReplaceKey(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'number' && Number.isNaN(value)) return 'NaN';
  return String(value);
}

function __astDataFrameReplaceFromMap(current, mapping) {
  for (const [fromValue, toValue] of mapping.entries()) {
    if (Object.is(current, fromValue)) {
      return toValue;
    }
  }
  return current;
}

function __astDataFrameReplaceFromObjectMap(current, mapping) {
  const key = __astStringifyDataFrameReplaceKey(current);
  return Object.prototype.hasOwnProperty.call(mapping, key)
    ? mapping[key]
    : current;
}

function __astResolveDataFrameConditionPredicate(dataframe, condition, methodName) {
  if (typeof condition === 'function') {
    const rowDecisions = new Array(dataframe.len());
    const rowResolved = new Array(dataframe.len()).fill(false);

    return function astDataFrameConditionFromFunction(rowIdx) {
      if (!rowResolved[rowIdx]) {
        const rowDecision = condition(dataframe.at(rowIdx), rowIdx, dataframe);
        if (typeof rowDecision !== 'boolean') {
          throw new Error(`DataFrame.${methodName} condition function must return boolean values`);
        }
        rowDecisions[rowIdx] = rowDecision;
        rowResolved[rowIdx] = true;
      }
      return rowDecisions[rowIdx];
    };
  }

  if (condition instanceof DataFrame) {
    if (condition.len() !== dataframe.len()) {
      throw new Error(`DataFrame.${methodName} condition DataFrame length must match base DataFrame length`);
    }

    const missingColumns = dataframe.columns.filter(column => !condition.columns.includes(column));
    if (missingColumns.length > 0) {
      throw new Error(`DataFrame.${methodName} condition DataFrame is missing columns: ${missingColumns.join(', ')}`);
    }

    return function astDataFrameConditionFromFrame(rowIdx, column) {
      const current = condition.data[column].array[rowIdx];
      if (typeof current !== 'boolean') {
        throw new Error(`DataFrame.${methodName} condition DataFrame must contain only boolean values`);
      }
      return current;
    };
  }

  const rowMask = __astNormalizeDataFrameRowMask(dataframe, condition, methodName);
  return function astDataFrameConditionFromRowMask(rowIdx) {
    return rowMask[rowIdx];
  };
}

function __astNormalizeDataFrameRowMask(dataframe, condition, methodName) {
  const source = condition instanceof Series ? condition.array : condition;
  if (!Array.isArray(source)) {
    throw new Error(`DataFrame.${methodName} condition must be a function, DataFrame, Series, or boolean array`);
  }

  if (source.length !== dataframe.len()) {
    throw new Error(`DataFrame.${methodName} condition length must match DataFrame length`);
  }

  const output = new Array(source.length);
  for (let idx = 0; idx < source.length; idx++) {
    if (typeof source[idx] !== 'boolean') {
      throw new Error(`DataFrame.${methodName} condition mask values must be boolean`);
    }
    output[idx] = source[idx];
  }
  return output;
}

function __astResolveDataFrameOtherResolver(dataframe, other, methodName) {
  if (other instanceof DataFrame) {
    if (other.len() !== dataframe.len()) {
      throw new Error(`DataFrame.${methodName} other DataFrame length must match base DataFrame length`);
    }

    const missingColumns = dataframe.columns.filter(column => !other.columns.includes(column));
    if (missingColumns.length > 0) {
      throw new Error(`DataFrame.${methodName} other DataFrame is missing columns: ${missingColumns.join(', ')}`);
    }

    return function astDataFrameOtherFromFrame(rowIdx, column) {
      return other.data[column].array[rowIdx];
    };
  }

  if (other instanceof Series || Array.isArray(other)) {
    const source = other instanceof Series ? other.array : other;
    if (source.length !== dataframe.len()) {
      throw new Error(`DataFrame.${methodName} other row array length must match DataFrame length`);
    }

    return function astDataFrameOtherFromRowArray(rowIdx) {
      return source[rowIdx];
    };
  }

  if (__astDataFrameIsPlainObject(other)) {
    return function astDataFrameOtherFromMap(_rowIdx, column, current) {
      if (Object.prototype.hasOwnProperty.call(other, column)) {
        return other[column];
      }
      return current;
    };
  }

  if (typeof other === 'function') {
    return function astDataFrameOtherFromFunction(rowIdx, column, current) {
      return other(current, rowIdx, column, dataframe.at(rowIdx), dataframe);
    };
  }

  return function astDataFrameOtherScalar() {
    return other;
  };
}

function __astApplyDataFrameConditional(dataframe, predicate, otherResolver, invert) {
  const nextColumns = {};

  for (let colIdx = 0; colIdx < dataframe.columns.length; colIdx++) {
    const column = dataframe.columns[colIdx];
    const source = dataframe.data[column].array;
    const output = new Array(source.length);

    for (let rowIdx = 0; rowIdx < source.length; rowIdx++) {
      const conditionResult = predicate(rowIdx, column, source[rowIdx]);
      if (typeof conditionResult !== 'boolean') {
        throw new Error('DataFrame conditional predicate produced a non-boolean value');
      }

      const shouldReplace = invert ? conditionResult : !conditionResult;
      output[rowIdx] = shouldReplace
        ? otherResolver(rowIdx, column, source[rowIdx])
        : source[rowIdx];
    }

    nextColumns[column] = output;
  }

  return DataFrame.fromColumns(nextColumns, {
    copy: false,
    index: [...dataframe.index]
  });
}

function __astNormalizeDataFrameHeadTailCount(value, methodName) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`DataFrame.${methodName} requires a non-negative integer n`);
  }
  return value;
}

function __astNormalizeDataFrameTakeIndexes(indexes, length, methodName) {
  if (!Array.isArray(indexes)) {
    throw new Error(`DataFrame.${methodName} requires an array of positional indexes`);
  }

  const normalized = new Array(indexes.length);
  for (let idx = 0; idx < indexes.length; idx++) {
    const value = indexes[idx];
    if (!Number.isInteger(value)) {
      throw new Error(`DataFrame.${methodName} received a non-integer index at position ${idx}`);
    }

    if (value < 0 || value >= length) {
      throw new Error(`DataFrame.${methodName} index ${value} is out of bounds for length ${length}`);
    }

    normalized[idx] = value;
  }

  return normalized;
}

function __astResolveDataFrameSampleIndexes(dataframe, options = {}, methodName = 'sample') {
  if (options == null || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error(`DataFrame.${methodName} options must be an object`);
  }

  const hasN = options.n !== undefined && options.n !== null;
  const hasFrac = options.frac !== undefined && options.frac !== null;

  if (hasN && hasFrac) {
    throw new Error(`DataFrame.${methodName} cannot include both n and frac`);
  }

  if (
    Object.prototype.hasOwnProperty.call(options, 'replace')
    && typeof options.replace !== 'boolean'
  ) {
    throw new Error(`DataFrame.${methodName} option replace must be boolean`);
  }

  const replace = options.replace === true;
  const n = hasN ? __astNormalizeDataFrameSampleN(options.n, methodName) : null;
  const frac = hasFrac ? __astNormalizeDataFrameSampleFrac(options.frac, methodName) : null;

  if (!replace && frac != null && frac > 1) {
    throw new Error(`DataFrame.${methodName} frac cannot be greater than 1 when replace is false`);
  }

  let sampleSize = 1;
  if (n != null) {
    sampleSize = n;
  } else if (frac != null) {
    sampleSize = Math.round(frac * dataframe.len());
  }

  if (!replace && sampleSize > dataframe.len()) {
    throw new Error(`DataFrame.${methodName} n cannot be greater than DataFrame length when replace is false`);
  }

  if (sampleSize === 0) {
    return [];
  }

  if (dataframe.len() === 0) {
    throw new Error(`DataFrame.${methodName} cannot sample from an empty DataFrame`);
  }

  const weights = __astNormalizeDataFrameSampleWeights(dataframe, options.weights, methodName);
  const random = __astCreateDataFrameSeededRandom(options.randomState, methodName);

  if (replace) {
    return __astSampleDataFrameIndexesWithReplacement(dataframe.len(), sampleSize, random, weights);
  }

  return __astSampleDataFrameIndexesWithoutReplacement(dataframe.len(), sampleSize, random, weights);
}

function __astNormalizeDataFrameSampleN(value, methodName) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`DataFrame.${methodName} option n must be a non-negative integer`);
  }
  return value;
}

function __astNormalizeDataFrameSampleFrac(value, methodName) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`DataFrame.${methodName} option frac must be a non-negative number`);
  }
  return value;
}

function __astNormalizeDataFrameSampleWeights(dataframe, weights, methodName) {
  if (weights == null) {
    return null;
  }

  let source = weights;
  if (typeof weights === 'string') {
    if (!dataframe.columns.includes(weights)) {
      throw new Error(`DataFrame.${methodName} weights column '${weights}' was not found`);
    }
    source = dataframe.data[weights].array;
  } else if (weights instanceof Series) {
    source = weights.array;
  }

  if (!Array.isArray(source)) {
    throw new Error(`DataFrame.${methodName} option weights must be an array, Series, or column name`);
  }

  if (source.length !== dataframe.len()) {
    throw new Error(`DataFrame.${methodName} option weights length must match DataFrame length`);
  }

  const normalized = new Array(source.length);
  let total = 0;
  for (let idx = 0; idx < source.length; idx++) {
    const numeric = Number(source[idx]);
    if (!Number.isFinite(numeric) || numeric < 0) {
      throw new Error(`DataFrame.${methodName} option weights must contain finite non-negative numbers`);
    }

    normalized[idx] = numeric;
    total += numeric;
  }

  if (total <= 0) {
    throw new Error(`DataFrame.${methodName} option weights must contain at least one positive value`);
  }

  return normalized;
}

function __astSampleDataFrameIndexesWithReplacement(length, sampleSize, random, weights) {
  const output = new Array(sampleSize);

  if (!weights) {
    for (let idx = 0; idx < sampleSize; idx++) {
      output[idx] = Math.floor(random() * length);
    }
    return output;
  }

  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  for (let idx = 0; idx < sampleSize; idx++) {
    output[idx] = __astPickDataFrameWeightedPosition(weights, totalWeight, random);
  }

  return output;
}

function __astSampleDataFrameIndexesWithoutReplacement(length, sampleSize, random, weights) {
  if (!weights) {
    const pool = new Array(length);
    for (let idx = 0; idx < length; idx++) {
      pool[idx] = idx;
    }

    for (let idx = pool.length - 1; idx > 0; idx--) {
      const swapIdx = Math.floor(random() * (idx + 1));
      const temp = pool[idx];
      pool[idx] = pool[swapIdx];
      pool[swapIdx] = temp;
    }

    return pool.slice(0, sampleSize);
  }

  const availableIndexes = new Array(length);
  for (let idx = 0; idx < length; idx++) {
    availableIndexes[idx] = idx;
  }

  const availableWeights = [...weights];
  const output = new Array(sampleSize);

  for (let drawIdx = 0; drawIdx < sampleSize; drawIdx++) {
    const totalWeight = availableWeights.reduce((sum, value) => sum + value, 0);
    if (totalWeight <= 0) {
      throw new Error('DataFrame.sample weights are exhausted before completing a no-replacement sample');
    }

    const pickedPosition = __astPickDataFrameWeightedPosition(availableWeights, totalWeight, random);
    output[drawIdx] = availableIndexes[pickedPosition];
    availableIndexes.splice(pickedPosition, 1);
    availableWeights.splice(pickedPosition, 1);
  }

  return output;
}

function __astPickDataFrameWeightedPosition(weights, totalWeight, random) {
  const target = random() * totalWeight;
  let cumulative = 0;

  for (let idx = 0; idx < weights.length; idx++) {
    cumulative += weights[idx];
    if (target < cumulative) {
      return idx;
    }
  }

  return weights.length - 1;
}

function __astCreateDataFrameSeededRandom(randomState, methodName = 'sample') {
  if (randomState === undefined || randomState === null) {
    return Math.random;
  }

  const seed = __astResolveDataFrameRandomSeed(randomState, methodName);
  let state = seed >>> 0;
  if (state === 0) {
    state = 0x6D2B79F5;
  }

  return function __astDataFrameSeededRandom() {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function __astResolveDataFrameRandomSeed(randomState, methodName) {
  if (typeof randomState === 'number' && Number.isFinite(randomState)) {
    return Math.trunc(randomState) >>> 0;
  }

  if (typeof randomState === 'string' && randomState.length > 0) {
    let hash = 2166136261;
    for (let idx = 0; idx < randomState.length; idx++) {
      hash ^= randomState.charCodeAt(idx);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  throw new Error(`DataFrame.${methodName} option randomState must be a finite number or non-empty string`);
}

const __astDataFrameRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astDataFrameRoot.DataFrame = DataFrame;
this.DataFrame = DataFrame;
