function astDataFrameNormalizeSchemaEnforcementOptions(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('enforceSchema options must be an object');
  }

  const normalized = {
    coerce: typeof options.coerce === 'undefined' ? true : options.coerce,
    dropExtraColumns: typeof options.dropExtraColumns === 'undefined' ? false : options.dropExtraColumns,
    strict: typeof options.strict === 'undefined' ? true : options.strict,
    maxViolationsPerColumn: typeof options.maxViolationsPerColumn === 'undefined'
      ? 25
      : options.maxViolationsPerColumn,
    returnReport: typeof options.returnReport === 'undefined' ? false : options.returnReport
  };

  if (typeof normalized.coerce !== 'boolean') {
    throw new Error('enforceSchema option coerce must be boolean');
  }
  if (typeof normalized.dropExtraColumns !== 'boolean') {
    throw new Error('enforceSchema option dropExtraColumns must be boolean');
  }
  if (typeof normalized.strict !== 'boolean') {
    throw new Error('enforceSchema option strict must be boolean');
  }
  if (!Number.isInteger(normalized.maxViolationsPerColumn) || normalized.maxViolationsPerColumn < 1) {
    throw new Error('enforceSchema option maxViolationsPerColumn must be a positive integer');
  }
  if (typeof normalized.returnReport !== 'boolean') {
    throw new Error('enforceSchema option returnReport must be boolean');
  }

  return normalized;
}

function astDataFrameEnforceSchema(dataframe, schema, options = {}) {
  astDataFrameAssertSchemaTarget(dataframe, 'enforceSchema');

  const normalizedSchema = astDataFrameNormalizeSchemaContract(schema);
  const normalizedOptions = astDataFrameNormalizeSchemaEnforcementOptions(options);
  const rowCount = dataframe.len();
  const sourceColumns = dataframe.toColumns({ copy: true });

  const outputColumns = {};
  const typeMap = {};
  const coercionFailures = [];

  for (let idx = 0; idx < normalizedSchema.columns.length; idx++) {
    const column = normalizedSchema.columns[idx];
    const descriptor = normalizedSchema.fields[column];
    const inputValues = Object.prototype.hasOwnProperty.call(sourceColumns, column)
      ? sourceColumns[column]
      : new Array(rowCount).fill(null);
    const normalizedValues = new Array(rowCount);

    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const value = inputValues[rowIdx] === undefined ? null : inputValues[rowIdx];

      if (value === null || descriptor.type === 'mixed' || !normalizedOptions.coerce) {
        normalizedValues[rowIdx] = value;
        continue;
      }

      const coercedValue = coerceValues(value, descriptor.type);
      normalizedValues[rowIdx] = coercedValue;

      if (coercedValue === null && value !== null && typeof value !== 'undefined') {
        coercionFailures.push({
          column,
          rowIndex: rowIdx,
          expectedType: descriptor.type,
          value: astDataFramePreviewValue(value)
        });
      }
    }

    outputColumns[column] = normalizedValues;
    // `coerce=false` is validation-only mode: do not set typeMap because
    // DataFrame.fromColumns would coerce values during Series construction.
    if (normalizedOptions.coerce && descriptor.type !== 'mixed') {
      typeMap[column] = descriptor.type;
    }
  }

  if (!normalizedOptions.dropExtraColumns) {
    for (let idx = 0; idx < dataframe.columns.length; idx++) {
      const column = dataframe.columns[idx];
      if (!Object.prototype.hasOwnProperty.call(outputColumns, column)) {
        outputColumns[column] = sourceColumns[column];
      }
    }
  }

  const enforcedDataFrame = DataFrame.fromColumns(outputColumns, {
    copy: false,
    index: [...dataframe.index],
    typeMap
  });

  const validationReport = astDataFrameValidateSchema(enforcedDataFrame, normalizedSchema, {
    strict: false,
    allowExtraColumns: !normalizedOptions.dropExtraColumns,
    maxViolationsPerColumn: normalizedOptions.maxViolationsPerColumn
  });

  validationReport.violations.coercionFailures = coercionFailures;
  if (coercionFailures.length > 0) {
    validationReport.valid = false;
  }

  if (normalizedOptions.strict && !validationReport.valid) {
    throw new Error(astDataFrameFormatSchemaValidationError(validationReport, 'enforceSchema'));
  }

  if (normalizedOptions.returnReport) {
    return {
      dataframe: enforcedDataFrame,
      report: validationReport
    };
  }

  return enforcedDataFrame;
}
