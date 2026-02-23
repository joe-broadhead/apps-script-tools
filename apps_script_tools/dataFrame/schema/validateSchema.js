function astDataFrameAssertSchemaTarget(dataframe, contextName = 'validateSchema') {
  if (!(dataframe instanceof DataFrame)) {
    throw new Error(`DataFrame.${contextName} requires a DataFrame instance`);
  }
}

function astDataFrameNormalizeSchemaValidationOptions(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('Schema validation options must be an object');
  }

  const strict = typeof options.strict === 'undefined' ? false : options.strict;
  const allowExtraColumns = typeof options.allowExtraColumns === 'undefined'
    ? false
    : options.allowExtraColumns;
  const maxViolationsPerColumn = typeof options.maxViolationsPerColumn === 'undefined'
    ? 25
    : options.maxViolationsPerColumn;

  if (typeof strict !== 'boolean') {
    throw new Error('Schema validation option strict must be boolean');
  }

  if (typeof allowExtraColumns !== 'boolean') {
    throw new Error('Schema validation option allowExtraColumns must be boolean');
  }

  if (!Number.isInteger(maxViolationsPerColumn) || maxViolationsPerColumn < 1) {
    throw new Error('Schema validation option maxViolationsPerColumn must be a positive integer');
  }

  return {
    strict,
    allowExtraColumns,
    maxViolationsPerColumn
  };
}

function astDataFrameValidateSchema(dataframe, schema, options = {}) {
  astDataFrameAssertSchemaTarget(dataframe, 'validateSchema');

  const normalizedSchema = astDataFrameNormalizeSchemaContract(schema);
  const normalizedOptions = astDataFrameNormalizeSchemaValidationOptions(options);
  const schemaColumnSet = new Set(normalizedSchema.columns);

  const violations = {
    missingColumns: [],
    extraColumns: [],
    typeMismatches: [],
    nullabilityViolations: []
  };

  for (let idx = 0; idx < normalizedSchema.columns.length; idx++) {
    const column = normalizedSchema.columns[idx];
    if (!dataframe.columns.includes(column)) {
      violations.missingColumns.push(column);
      continue;
    }

    const descriptor = normalizedSchema.fields[column];
    const sourceValues = dataframe.data[column].array;
    let typeViolationCount = 0;
    let nullViolationCount = 0;

    for (let rowIdx = 0; rowIdx < sourceValues.length; rowIdx++) {
      const value = sourceValues[rowIdx] === undefined ? null : sourceValues[rowIdx];

      if (value === null) {
        if (!descriptor.nullable && nullViolationCount < normalizedOptions.maxViolationsPerColumn) {
          violations.nullabilityViolations.push({
            column,
            rowIndex: rowIdx,
            expectedNullable: false
          });
        }
        nullViolationCount += descriptor.nullable ? 0 : 1;
        continue;
      }

      const typeCompatible = astDataFrameIsValueCompatibleWithType(value, descriptor.type);
      if (!typeCompatible && typeViolationCount < normalizedOptions.maxViolationsPerColumn) {
        violations.typeMismatches.push({
          column,
          rowIndex: rowIdx,
          expectedType: descriptor.type,
          actualType: astDataFrameInferValueType(value),
          value: astDataFramePreviewValue(value)
        });
      }

      if (!typeCompatible) {
        typeViolationCount += 1;
      }
    }
  }

  if (!normalizedOptions.allowExtraColumns) {
    for (let idx = 0; idx < dataframe.columns.length; idx++) {
      const column = dataframe.columns[idx];
      if (!schemaColumnSet.has(column)) {
        violations.extraColumns.push(column);
      }
    }
  }

  const valid = (
    violations.missingColumns.length === 0
    && violations.extraColumns.length === 0
    && violations.typeMismatches.length === 0
    && violations.nullabilityViolations.length === 0
  );

  const report = {
    valid,
    rowCount: dataframe.len(),
    columnCount: dataframe.columns.length,
    dataframeColumns: [...dataframe.columns],
    schemaColumns: [...normalizedSchema.columns],
    schema: astDataFrameBuildSchemaObject(normalizedSchema),
    options: {
      strict: normalizedOptions.strict,
      allowExtraColumns: normalizedOptions.allowExtraColumns
    },
    violations
  };

  if (normalizedOptions.strict && !report.valid) {
    throw new Error(astDataFrameFormatSchemaValidationError(report, 'validateSchema'));
  }

  return report;
}
