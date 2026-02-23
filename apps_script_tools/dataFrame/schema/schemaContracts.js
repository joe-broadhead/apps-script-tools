const AST_DATAFRAME_SCHEMA_SUPPORTED_TYPES = Object.freeze([
  'integer',
  'float',
  'number',
  'boolean',
  'string',
  'date',
  'mixed'
]);

function astDataFrameIsNormalizedSchemaContract(schema) {
  return Boolean(
    schema
    && typeof schema === 'object'
    && schema.__astDataFrameNormalized === true
    && Array.isArray(schema.columns)
    && schema.fields
    && typeof schema.fields === 'object'
  );
}

function astDataFrameNormalizeSchemaType(type, columnName) {
  const normalizedType = String(type || '').trim().toLowerCase();
  if (!AST_DATAFRAME_SCHEMA_SUPPORTED_TYPES.includes(normalizedType)) {
    throw new Error(
      `schema '${columnName}' has unsupported type '${type}'. Supported types: ${AST_DATAFRAME_SCHEMA_SUPPORTED_TYPES.join(', ')}`
    );
  }

  return normalizedType;
}

function astDataFrameNormalizeSchemaColumn(columnName, descriptor) {
  if (typeof columnName !== 'string' || columnName.trim().length === 0) {
    throw new Error('Schema column names must be non-empty strings');
  }

  const normalizedColumnName = columnName.trim();
  let normalizedDescriptor;

  if (typeof descriptor === 'string') {
    normalizedDescriptor = {
      type: astDataFrameNormalizeSchemaType(descriptor, normalizedColumnName),
      nullable: true
    };
  } else if (descriptor && typeof descriptor === 'object' && !Array.isArray(descriptor)) {
    if (typeof descriptor.type !== 'string' || descriptor.type.trim().length === 0) {
      throw new Error(`schema '${normalizedColumnName}' requires a non-empty 'type'`);
    }

    const nullable = typeof descriptor.nullable === 'undefined'
      ? true
      : descriptor.nullable;
    if (typeof nullable !== 'boolean') {
      throw new Error(`schema '${normalizedColumnName}' has invalid 'nullable'; expected boolean`);
    }

    normalizedDescriptor = {
      type: astDataFrameNormalizeSchemaType(descriptor.type, normalizedColumnName),
      nullable
    };
  } else {
    throw new Error(
      `schema '${normalizedColumnName}' must be a type string or { type, nullable } descriptor`
    );
  }

  return [normalizedColumnName, normalizedDescriptor];
}

function astDataFrameNormalizeSchemaContract(schema) {
  if (astDataFrameIsNormalizedSchemaContract(schema)) {
    return schema;
  }

  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new Error('Schema contract must be an object mapping columns to descriptors');
  }

  const columns = Object.keys(schema);
  if (columns.length === 0) {
    throw new Error('Schema contract must define at least one column');
  }

  const fields = {};
  for (let idx = 0; idx < columns.length; idx++) {
    const [columnName, descriptor] = astDataFrameNormalizeSchemaColumn(
      columns[idx],
      schema[columns[idx]]
    );
    fields[columnName] = descriptor;
  }

  const normalized = {
    columns: Object.keys(fields),
    fields
  };
  Object.defineProperty(normalized, '__astDataFrameNormalized', {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false
  });

  return normalized;
}

function astDataFrameBuildSchemaObject(normalizedSchema) {
  const schemaObject = {};
  for (let idx = 0; idx < normalizedSchema.columns.length; idx++) {
    const column = normalizedSchema.columns[idx];
    schemaObject[column] = {
      type: normalizedSchema.fields[column].type,
      nullable: normalizedSchema.fields[column].nullable
    };
  }
  return schemaObject;
}

function astDataFrameInferValueType(value) {
  if (value === null || typeof value === 'undefined') {
    return 'null';
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? 'invalid_date' : 'date';
  }

  if (typeof value === 'number' && Number.isNaN(value)) {
    return 'nan';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  return typeof value;
}

function astDataFrameIsValueCompatibleWithType(value, expectedType) {
  if (value === null || typeof value === 'undefined') {
    return true;
  }

  switch (expectedType) {
    case 'mixed':
      return true;
    case 'integer':
      return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
    case 'float':
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'string':
      return typeof value === 'string';
    case 'date':
      return value instanceof Date && !Number.isNaN(value.getTime());
    default:
      return false;
  }
}

function astDataFramePreviewValue(value) {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

function astDataFrameFormatSchemaValidationError(report, contextName = 'validateSchema') {
  const violations = report && report.violations ? report.violations : {};
  const missingColumns = Array.isArray(violations.missingColumns) ? violations.missingColumns.length : 0;
  const extraColumns = Array.isArray(violations.extraColumns) ? violations.extraColumns.length : 0;
  const typeMismatches = Array.isArray(violations.typeMismatches) ? violations.typeMismatches.length : 0;
  const nullabilityViolations = Array.isArray(violations.nullabilityViolations)
    ? violations.nullabilityViolations.length
    : 0;
  const coercionFailures = Array.isArray(violations.coercionFailures) ? violations.coercionFailures.length : 0;

  const details = [];
  if (missingColumns > 0) details.push(`missing=${missingColumns}`);
  if (extraColumns > 0) details.push(`extra=${extraColumns}`);
  if (typeMismatches > 0) details.push(`type=${typeMismatches}`);
  if (nullabilityViolations > 0) details.push(`nullability=${nullabilityViolations}`);
  if (coercionFailures > 0) details.push(`coercion=${coercionFailures}`);

  const detailString = details.length > 0 ? details.join(', ') : 'unknown violations';
  return `DataFrame.${contextName} schema validation failed (${detailString})`;
}
