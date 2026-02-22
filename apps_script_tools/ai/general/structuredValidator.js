function astAiStructuredGetType(value) {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (typeof value === 'number') {
    if (!isFinite(value)) {
      return 'number';
    }
    return Number.isInteger(value) ? 'integer' : 'number';
  }

  return typeof value;
}

function astAiStructuredNormalizeTypes(typeField) {
  if (typeof typeField === 'string' && typeField.trim().length > 0) {
    return [typeField.trim().toLowerCase()];
  }

  if (Array.isArray(typeField)) {
    return typeField
      .filter(entry => typeof entry === 'string' && entry.trim().length > 0)
      .map(entry => entry.trim().toLowerCase());
  }

  return [];
}

function astAiStructuredMatchesType(value, schemaType) {
  const actualType = astAiStructuredGetType(value);

  if (schemaType === 'number') {
    return typeof value === 'number' && isFinite(value);
  }

  if (schemaType === 'integer') {
    return typeof value === 'number' && isFinite(value) && Number.isInteger(value);
  }

  if (schemaType === 'array') {
    return Array.isArray(value);
  }

  if (schemaType === 'object') {
    return value != null && typeof value === 'object' && !Array.isArray(value);
  }

  if (schemaType === 'null') {
    return value === null;
  }

  return actualType === schemaType;
}

function astAiStructuredPathToString(path) {
  if (!Array.isArray(path) || path.length === 0) {
    return '$';
  }

  return `$${path.map(segment => (typeof segment === 'number' ? `[${segment}]` : `.${segment}`)).join('')}`;
}

function astAiStructuredPushError(errors, path, code, message, expected, actual) {
  errors.push({
    path: astAiStructuredPathToString(path),
    code,
    message,
    expected: typeof expected === 'undefined' ? null : expected,
    actual: typeof actual === 'undefined' ? null : actual
  });
}

function astAiStructuredValidateEnum(value, schema, path, errors) {
  if (!Array.isArray(schema.enum) || schema.enum.length === 0) {
    return;
  }

  const serializedValue = JSON.stringify(value);
  const hasMatch = schema.enum.some(candidate => JSON.stringify(candidate) === serializedValue);

  if (!hasMatch) {
    astAiStructuredPushError(
      errors,
      path,
      'enum_mismatch',
      'Value is not one of the allowed enum values',
      schema.enum,
      value
    );
  }
}

function astAiStructuredValidateString(value, schema, path, errors) {
  if (typeof value !== 'string') {
    return;
  }

  if (Number.isInteger(schema.minLength) && value.length < schema.minLength) {
    astAiStructuredPushError(
      errors,
      path,
      'min_length',
      `String length must be >= ${schema.minLength}`,
      schema.minLength,
      value.length
    );
  }

  if (Number.isInteger(schema.maxLength) && value.length > schema.maxLength) {
    astAiStructuredPushError(
      errors,
      path,
      'max_length',
      `String length must be <= ${schema.maxLength}`,
      schema.maxLength,
      value.length
    );
  }
}

function astAiStructuredValidateNumber(value, schema, path, errors) {
  if (typeof value !== 'number' || !isFinite(value)) {
    return;
  }

  if (typeof schema.minimum === 'number' && value < schema.minimum) {
    astAiStructuredPushError(
      errors,
      path,
      'minimum',
      `Number must be >= ${schema.minimum}`,
      schema.minimum,
      value
    );
  }

  if (typeof schema.maximum === 'number' && value > schema.maximum) {
    astAiStructuredPushError(
      errors,
      path,
      'maximum',
      `Number must be <= ${schema.maximum}`,
      schema.maximum,
      value
    );
  }
}

function astAiStructuredValidateSchemaNode(value, schema, path, errors) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return;
  }

  const types = astAiStructuredNormalizeTypes(schema.type);
  if (types.length > 0) {
    const typeValid = types.some(typeName => astAiStructuredMatchesType(value, typeName));

    if (!typeValid) {
      astAiStructuredPushError(
        errors,
        path,
        'type_mismatch',
        'Value does not match schema type',
        types,
        astAiStructuredGetType(value)
      );
      return;
    }
  }

  astAiStructuredValidateEnum(value, schema, path, errors);
  astAiStructuredValidateString(value, schema, path, errors);
  astAiStructuredValidateNumber(value, schema, path, errors);

  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    const anyOfValid = schema.anyOf.some(branch => astAiValidateStructuredOutput(value, branch, { strictValidation: true }).valid);
    if (!anyOfValid) {
      astAiStructuredPushError(errors, path, 'any_of', 'Value does not satisfy anyOf branches', null, value);
    }
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    let validCount = 0;
    schema.oneOf.forEach(branch => {
      const branchResult = astAiValidateStructuredOutput(value, branch, { strictValidation: true });
      if (branchResult.valid) {
        validCount += 1;
      }
    });

    if (validCount !== 1) {
      astAiStructuredPushError(errors, path, 'one_of', 'Value must satisfy exactly one oneOf branch', 1, validCount);
    }
  }

  if (Array.isArray(value)) {
    if (Number.isInteger(schema.minItems) && value.length < schema.minItems) {
      astAiStructuredPushError(errors, path, 'min_items', `Array length must be >= ${schema.minItems}`, schema.minItems, value.length);
    }

    if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) {
      astAiStructuredPushError(errors, path, 'max_items', `Array length must be <= ${schema.maxItems}`, schema.maxItems, value.length);
    }

    if (schema.items && typeof schema.items === 'object') {
      value.forEach((entry, index) => {
        astAiStructuredValidateSchemaNode(entry, schema.items, path.concat(index), errors);
      });
    }

    return;
  }

  const isObject = value != null && typeof value === 'object' && !Array.isArray(value);
  if (!isObject) {
    return;
  }

  const properties = schema.properties && typeof schema.properties === 'object'
    ? schema.properties
    : {};
  const required = Array.isArray(schema.required)
    ? schema.required.filter(field => typeof field === 'string' && field.length > 0)
    : [];

  required.forEach(field => {
    if (!Object.prototype.hasOwnProperty.call(value, field)) {
      astAiStructuredPushError(errors, path.concat(field), 'required', 'Missing required field', true, false);
    }
  });

  Object.keys(properties).forEach(field => {
    if (!Object.prototype.hasOwnProperty.call(value, field)) {
      return;
    }
    astAiStructuredValidateSchemaNode(value[field], properties[field], path.concat(field), errors);
  });

  if (schema.additionalProperties === false) {
    Object.keys(value).forEach(field => {
      if (!Object.prototype.hasOwnProperty.call(properties, field)) {
        astAiStructuredPushError(
          errors,
          path.concat(field),
          'additional_property',
          'Additional properties are not allowed',
          false,
          true
        );
      }
    });
  }
}

function astAiValidateStructuredOutput(value, schema, options = {}) {
  if (typeof value === 'undefined') {
    return {
      valid: false,
      errors: [{
        path: '$',
        code: 'missing_value',
        message: 'Structured output is undefined',
        expected: 'json',
        actual: 'undefined'
      }]
    };
  }

  const strictValidation = options.strictValidation !== false;
  if (!strictValidation) {
    return {
      valid: true,
      errors: []
    };
  }

  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return {
      valid: false,
      errors: [{
        path: '$',
        code: 'invalid_schema',
        message: 'Structured schema must be a plain object',
        expected: 'object',
        actual: schema == null ? 'null' : typeof schema
      }]
    };
  }

  const errors = [];
  astAiStructuredValidateSchemaNode(value, schema, [], errors);

  return {
    valid: errors.length === 0,
    errors
  };
}
