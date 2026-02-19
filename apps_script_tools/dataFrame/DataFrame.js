const __astDataFramePerfCounters = {
  fromRecords: 0,
  fromColumns: 0,
  toRecords: 0,
  toArrays: 0
};

function __astIncrementDataFrameCounter(counterName) {
  if (!Object.prototype.hasOwnProperty.call(__astDataFramePerfCounters, counterName)) {
    return;
  }
  __astDataFramePerfCounters[counterName] += 1;
}

var DataFrame = class DataFrame {
  constructor(data, index = null) {
    this.data = data;
    this.columns = this.getColumns();

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

    if (!dataFrames.every((dataframe, _, array) => (dataframe instanceof DataFrame) && (dataframe.columns.length === array[0].columns.length))) {
      throw new Error('All DataFrames must have the same number of columns');
    }

    return dataFrames.reduce((acc, df) => acc.union(df, distinct));
  }

  static generateSurrogateKey(dataframe, columns, delimiter = '-') {
    const firstCol = columns.shift();
    return columns.reduce((acc, col) => {
      return acc.concat(dataframe[col], delimiter);
    }, dataframe[firstCol]).str.sha256();
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

  rename(names) {
    const renamed = Object.entries(this.data).reduce((acc, [key, value]) => {
      if (names[key]) {
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

  select(columns) {
    const selectedData = selectKeysFromObject(this.data, columns);
    const result = new DataFrame(selectedData);
    result.index = [...this.index];
    return result;
  }

  resetIndex() {
    this.index = this.len() === 0 ? [] : arrayFromRange(0, this.len() - 1);
    return this;
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

  union(other, distinct = false) {
    if (other.empty()) {
      return this;
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
      return new DataFrame({});
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

  merge(other, how = 'inner', options = {}) {
    if (!(other instanceof DataFrame)) {
      throw new Error('`other` must be a DataFrame');
    }

    const leftRecs = this.toRecords();
    const rightRecs = other.toRecords();
    const joined = joinRecordsOnKeys(leftRecs, rightRecs, how, options);

    return DataFrame.fromRecords(joined);
  }

  generateSurrogateKey(columns, delimiter = '-') {
    const firstCol = columns.shift();
    return columns.reduce((acc, col) => {
      return acc.concat(this[col], delimiter);
    }, this[firstCol]).str.sha256();
  }

  pivot(indexCol, pivotCol, aggMapping = {}) {
    const records = this.toRecords();

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

      const groupKey = `${indexValue}||${pivotValue}`;

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
        const groupKey = `${indexValue}||${pivotValue}`;

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

  groupBy(keys = []) {
    const normalizedKeys = Array.isArray(keys) ? keys : [keys];
    if (normalizedKeys.length === 0) {
      throw new Error('groupBy requires at least one key');
    }
    return new GroupBy(this, normalizedKeys);
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
      headerOrder = []
    } = options;

    const [length, width] = this.size();
    if ((length * width) > 5000000) {
      throw new Error('Cell count exceeds the 5,000,000 cell limit in Google Sheets');
    }

    const values = this.toArrays(headerOrder);

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
        if (startRow == null || startCol == null) {
          throw new Error("toSheet mode 'overwriteRange' requires 'startRow' and 'startCol' options");
        }
        enhancedSheet.overwriteRange(startRow, startCol, values);
        break;
      default:
        throw new Error(`toSheet: unknown mode '${mode}'`);
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
        loadDatabricksTable(tableConfig);
        return this;
      case 'bigquery':
        loadBigQueryTable(tableConfig);
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

    for (let colIdx = 0; colIdx < this.columns.length; colIdx++) {
      const column = this.columns[colIdx];
      const source = this.data[column].array;
      const values = new Array(rowIndexes.length);

      for (let rowPos = 0; rowPos < rowIndexes.length; rowPos++) {
        values[rowPos] = source[rowIndexes[rowPos]];
      }

      columns[column] = values;
    }

    const nextIndex = preserveIndex
      ? rowIndexes.map(index => this.index[index])
      : null;

    return DataFrame.fromColumns(columns, { copy: false, index: nextIndex });
  }
};

const __astDataFrameRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astDataFrameRoot.DataFrame = DataFrame;
this.DataFrame = DataFrame;
