class DataFrame {
  constructor(data, index = null) {
    this.data = data;
    this.columns = this.getColumns();
    this.index = index ? index : arrayFromRange(0, this.len());

    if (!Object.values(data).every(series => series instanceof Series && series.len() === this.len())) {
      throw new Error('All arguments must be Series of the same length');
    };

    for (let column of this.columns) {
      Object.defineProperty(this, column, {
        get: () => this.data[column],
        enumerable: true
      });
    };
  }

  *[Symbol.iterator]() {
    for (let idx = 0; idx < this.len(); idx++) {
      yield [this.at(idx), this.iat(idx)];
    };
  }

  static fromRecords(records) {
    const standardized = standardizeRecords(records);
    const seriesObject = standardized.reduce((seriesMap, record) => {
      Object.entries(record).forEach(([key, value]) => {
        if (!seriesMap[key]) {
          seriesMap[key] = new Series([], key);
        };
        seriesMap[key].append(value);
      });
      return seriesMap;
    }, {});
    return new DataFrame(seriesObject);
  }

  static fromArrays(arrays, options = {}) {
    const { headerRow = 0, standardize = false, defaultValue = null, targetLength = null } = options;

    const standardizedArrays = standardize ? standardizeArrays(arrays, { defaultValue, targetLength }) : arrays

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

  static fromQuery(query, provider, parameters, placeholders = {}) {
    return runSqlQuery(query, provider, parameters, placeholders);
  }

  static concat(dataFrames, distinct = false) {
    if (!Array.isArray(dataFrames) || dataFrames.length === 0) {
      throw new Error('Concat requires a non-empty array of DataFrames');
    };

    if (!dataFrames.every((dataframe, _, array) => (dataframe instanceof DataFrame) && (dataframe.columns.length === array[0].columns.length))) {
      throw new Error('All DataFrames must have the same number of columns');
    };

    return dataFrames.reduce((acc, df) => acc.union(df, distinct));
  }

  static generateSurrogateKey(dataframe, columns, delimiter = '-') {
    const firstCol = columns.shift();
    return columns.reduce((acc, col) => {
      return acc.concat(dataframe[col], delimiter);
    }, dataframe[firstCol]).str.sha256();
  };

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
    const renamed = (
      Object.entries(this.data)
      .reduce((acc, [key, value]) => {
        if (names[key]) {
          const newColName = names[key];
          const renamedSeries = value.rename(newColName);
          acc[newColName] = renamedSeries;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {})
    );

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
    this.index = arrayFromRange(0, this.len() - 1);
    return this;
  }

  asType(types) {
    const transformed = (
      Object.entries(this.data)
      .reduce((acc, [key, value]) => {
        if (types[key]) {
          acc[key] = value.asType(types[key]);
        } else {
          acc[key] = value;
        }
        return acc;
      }, {})
    );
    return new DataFrame(transformed);
  }

  schema() {
    return (
      Object.values(this.data)
      .reduce((acc, series) => {
        acc[series.name] = series.type;
        return acc;
      }, {})
    );
  }

  union(other, distinct = false) {
    return other.empty() ? this : (
      DataFrame.fromRecords(
        arrayUnion(this.toRecords(), other.toRecords(), distinct)
      )
      .resetIndex()
    );
  }

  dropDuplicates(subset = []) {
    return DataFrame.fromRecords(removeDuplicatesFromRecords(this.toRecords(), subset))
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

    result.index = [...this.index]; // Preserve original index

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
  };

  merge(other, how = 'inner', options = {}) {
    if (!(other instanceof DataFrame)) {
      throw new Error('`other` must be a DataFrame');
    };

    const leftRecs  = this.toRecords();
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

  toRecords() {
    if (this.columns.length === 0) return [];
    const series = this.columns.map(col => this.data[col]);
    return series.shift().combine(...series);
  }

  toArrays(headerOrder = []) {
    return unzipRecordsIntoArrays(this.toRecords(), headerOrder);
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
      throw new Error(`Cell count exceeds the 5,000,000 cell limit in Google Sheets`);
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

  toTable(provider, config, headerOrder = []) {
    const arrays = this.toArrays(headerOrder || Object.values(config.tableSchema));
    config.arrays = arrays;

    switch (provider) {
      case 'databricks':
        loadDatabricksTable(config);
        return this;
      case 'bigquery':
        return this;
      default:
        throw new Error('Provider must be one of: databricks, bigquery');
    };
  }

  toJson({ indent = 4, multiline = false } = {}) {
    const records = this.toRecords();
    return multiline
      ? recordsToNewlineJson(records)
      : JSON.stringify(records, null, indent);
  }

  toMarkdown() {
    // Once implimentd use in .show(n = 20)
  }

  sort(by, ascending = true, compareFunction = null) {
    // Handle empty DataFrame
    if (this.empty()) {
      return new DataFrame(this.data, [...this.index]);
    }

    // Normalize 'by' to array
    const byColumns = Array.isArray(by) ? by : [by];

    // Validate column names
    byColumns.forEach(column => {
      if (!this.columns.includes(column)) {
        throw new Error(`Column '${column}' not found in DataFrame`);
      }
    });

    // Normalize 'ascending' to array matching 'by' length
    const ascendingArr = Array.isArray(ascending)
      ? ascending
      : byColumns.map(() => ascending);

    // Validate ascending array length matches byColumns length
    if (ascendingArr.length !== byColumns.length) {
      throw new Error(`'ascending' parameter length (${ascendingArr.length}) must match 'by' parameter length (${byColumns.length})`);
    }

    // Normalize compareFunction to object with column keys
    const compareFunctions = typeof compareFunction === 'function'
      ? byColumns.reduce((acc, col) => {
        acc[col] = compareFunction;
        return acc;
      }, {})
      : (compareFunction || {});

    // Convert to records for sorting
    const records = this.toRecords();

    // Sort records
    const sortedRecords = records.sort((a, b) => {
      for (let i = 0; i < byColumns.length; i++) {
        const column = byColumns[i];
        const isAsc = ascendingArr[i];
        const compareFunc = compareFunctions[column];

        const valueA = a[column];
        const valueB = b[column];

        // Handle null/undefined values
        if (valueA == null && valueB == null) continue;
        if (valueA == null) return isAsc ? 1 : -1; // Nulls last for ascending, first for descending
        if (valueB == null) return isAsc ? -1 : 1;

        // Apply comparison
        let result = 0;
        if (compareFunc) {
          result = compareFunc(valueA, valueB);
        } else {
          result = valueA < valueB ? -1 : (valueA > valueB ? 1 : 0);
        }

        // Apply ascending/descending direction
        result = isAsc ? result : -result;

        if (result !== 0) return result;
      }
      return 0; // All columns are equal
    });

    // Create new DataFrame with sorted records
    const sortedDf = DataFrame.fromRecords(sortedRecords);

    // Preserve original column order
    return sortedDf.select(this.columns);
  }
}

this.DataFrame = DataFrame;