/*
 * DataFrame construction boundary.
 * Pure table constructors accept the DataFrame constructor explicitly; IO/import
 * helpers stay thin actions so the DataFrame class body owns row/column behavior.
 */
function astDataFrameFromColumns(DataFrameCtor, columns, options = {}) {
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
    return new DataFrameCtor({}, index || []);
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

  return new DataFrameCtor(seriesObject, index);
}

function astDataFrameFromRecords(DataFrameCtor, records) {
  const standardized = standardizeRecords(records);
  if (standardized.length === 0) {
    return new DataFrameCtor({});
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

  return DataFrameCtor.fromColumns(columnData, { copy: false });
}

function astDataFrameFromArrays(DataFrameCtor, arrays, options = {}) {
  const { headerRow = 0, standardize = false, defaultValue = null, targetLength = null } = options;
  const standardizedArrays = standardize ? standardizeArrays(arrays, { defaultValue, targetLength }) : arrays;
  const records = zipArraysIntoRecords(standardizedArrays, headerRow);
  return DataFrameCtor.fromRecords(records);
}

function astDataFrameFromSheet(DataFrameCtor, sheet, headerRow = 0) {
  return new EnhancedSheet(sheet).toDataFrame({ headerRow });
}

function astDataFrameFromDriveFile(DataFrameCtor, fileId, fileType, options = {}) {
  const records = readFileFromDrive(fileId, fileType, options);
  return DataFrameCtor.fromRecords(records);
}

function astDataFrameFromQuery(request = {}) {
  return runSqlQuery(request);
}
