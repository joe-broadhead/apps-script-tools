const AST_CONFIG_VALIDATION_ERROR_CLASS_SCHEMA_BINDING = typeof AstConfigValidationError === 'function'
  ? AstConfigValidationError
  : class AstConfigValidationErrorFallback extends Error {
    constructor(message, details = {}, cause = null) {
      super(message);
      this.name = 'AstConfigValidationError';
      this.details = details;
      if (cause) {
        this.cause = cause;
      }
    }
  };

const AST_CONFIG_SCHEMA_SUPPORTED_TYPES = Object.freeze([
  'string',
  'int',
  'float',
  'bool',
  'enum',
  'json',
  'secret-ref'
]);

const AST_CONFIG_BIND_SOURCE_ALIASES = Object.freeze({
  request: 'request',
  runtime: 'runtime',
  script_properties: 'script_properties',
  scriptproperties: 'script_properties',
  script: 'script_properties'
});

const AST_CONFIG_BIND_DEFAULT_PRECEDENCE = Object.freeze([
  'request',
  'runtime',
  'script_properties'
]);

function astConfigIsSchema(value) {
  return (
    astConfigIsPlainObject(value)
    && value.__astConfigSchema === true
    && Array.isArray(value.keys)
    && astConfigIsPlainObject(value.fields)
  );
}

function astConfigBuildSchemaValidationError(message, details = {}, cause = null) {
  return new AST_CONFIG_VALIDATION_ERROR_CLASS_SCHEMA_BINDING(message, details, cause);
}

function astConfigCloneJsonValue(value) {
  if (value == null || typeof value !== 'object') {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    if (Array.isArray(value)) {
      return value.slice();
    }
    if (astConfigIsPlainObject(value)) {
      return Object.assign({}, value);
    }
    return value;
  }
}

function astConfigNormalizeSchemaType(type) {
  const normalized = astConfigNormalizeString(type, '')
    .toLowerCase();
  if (!normalized) {
    return 'string';
  }

  if (normalized === 'boolean') return 'bool';
  if (normalized === 'integer') return 'int';
  if (normalized === 'number') return 'float';

  return normalized;
}

function astConfigNormalizeSchemaFieldDefinition(key, definition) {
  const rawDefinition = typeof definition === 'string'
    ? { type: definition }
    : definition;
  if (!astConfigIsPlainObject(rawDefinition)) {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.schema field '${key}' must be an object or type string`,
      { key, value: definition }
    );
  }

  const type = astConfigNormalizeSchemaType(rawDefinition.type);
  if (!AST_CONFIG_SCHEMA_SUPPORTED_TYPES.includes(type)) {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.schema field '${key}' has unsupported type '${rawDefinition.type}'`,
      {
        key,
        type: rawDefinition.type,
        supportedTypes: AST_CONFIG_SCHEMA_SUPPORTED_TYPES.slice()
      }
    );
  }

  const field = {
    key,
    type,
    required: astConfigNormalizeBoolean(rawDefinition.required, false),
    allowEmpty: astConfigNormalizeBoolean(rawDefinition.allowEmpty, false),
    caseInsensitive: astConfigNormalizeBoolean(rawDefinition.caseInsensitive, false),
    minLength: Number.isInteger(rawDefinition.minLength) ? rawDefinition.minLength : null,
    maxLength: Number.isInteger(rawDefinition.maxLength) ? rawDefinition.maxLength : null,
    min: Number.isFinite(rawDefinition.min) ? Number(rawDefinition.min) : null,
    max: Number.isFinite(rawDefinition.max) ? Number(rawDefinition.max) : null,
    jsonShape: astConfigNormalizeString(rawDefinition.jsonShape, '').toLowerCase() || 'any',
    hasDefault: Object.prototype.hasOwnProperty.call(rawDefinition, 'default'),
    defaultValue: Object.prototype.hasOwnProperty.call(rawDefinition, 'default')
      ? rawDefinition.default
      : null,
    enumValues: [],
    enumValuesNormalized: [],
    pattern: null,
    patternText: ''
  };

  if (field.minLength != null && field.minLength < 0) {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.schema field '${key}' has invalid minLength`,
      { key, minLength: field.minLength }
    );
  }

  if (field.maxLength != null && field.maxLength < 0) {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.schema field '${key}' has invalid maxLength`,
      { key, maxLength: field.maxLength }
    );
  }

  if (field.minLength != null && field.maxLength != null && field.maxLength < field.minLength) {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.schema field '${key}' has maxLength less than minLength`,
      { key, minLength: field.minLength, maxLength: field.maxLength }
    );
  }

  if (field.min != null && field.max != null && field.max < field.min) {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.schema field '${key}' has max less than min`,
      { key, min: field.min, max: field.max }
    );
  }

  if (field.type === 'enum') {
    if (!Array.isArray(rawDefinition.values) || rawDefinition.values.length === 0) {
      throw astConfigBuildSchemaValidationError(
        `AST.Config.schema enum field '${key}' requires a non-empty values array`,
        { key }
      );
    }

    const seen = {};
    const values = [];
    const normalizedValues = [];

    for (let idx = 0; idx < rawDefinition.values.length; idx += 1) {
      const value = astConfigNormalizeString(rawDefinition.values[idx], '');
      if (!value) {
        throw astConfigBuildSchemaValidationError(
          `AST.Config.schema enum field '${key}' contains an empty value`,
          { key, index: idx }
        );
      }

      const identity = field.caseInsensitive ? value.toLowerCase() : value;
      if (seen[identity]) {
        throw astConfigBuildSchemaValidationError(
          `AST.Config.schema enum field '${key}' contains duplicate value '${value}'`,
          { key, value }
        );
      }

      seen[identity] = true;
      values.push(value);
      normalizedValues.push(identity);
    }

    field.enumValues = values;
    field.enumValuesNormalized = normalizedValues;
  }

  if (field.type === 'json' && !['any', 'object', 'array'].includes(field.jsonShape)) {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.schema field '${key}' has unsupported jsonShape '${rawDefinition.jsonShape}'`,
      { key, jsonShape: rawDefinition.jsonShape }
    );
  }

  const patternSource = astConfigNormalizeString(rawDefinition.pattern, '');
  if (patternSource) {
    try {
      field.pattern = new RegExp(patternSource);
      field.patternText = patternSource;
    } catch (error) {
      throw astConfigBuildSchemaValidationError(
        `AST.Config.schema field '${key}' has invalid regex pattern`,
        { key, pattern: patternSource },
        error
      );
    }
  }

  if (field.type === 'secret-ref') {
    field.minLength = field.minLength == null ? 1 : field.minLength;
  }

  return field;
}

function astConfigCoerceSchemaBoolean(rawValue, field, source) {
  const normalized = astConfigResolveFirstBoolean([rawValue], null);
  if (typeof normalized === 'boolean') {
    return normalized;
  }

  throw astConfigBuildSchemaValidationError(
    `AST.Config.bind expected boolean for '${field.key}'`,
    { key: field.key, type: field.type, source, value: rawValue }
  );
}

function astConfigCoerceSchemaNumber(rawValue, field, source, expectInteger) {
  if (typeof rawValue === 'boolean') {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.bind expected ${expectInteger ? 'integer' : 'number'} for '${field.key}'`,
      { key: field.key, type: field.type, source, value: rawValue }
    );
  }

  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric) || (expectInteger && !Number.isInteger(numeric))) {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.bind expected ${expectInteger ? 'integer' : 'number'} for '${field.key}'`,
      { key: field.key, type: field.type, source, value: rawValue }
    );
  }

  if (field.min != null && numeric < field.min) {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.bind value for '${field.key}' is below minimum`,
      { key: field.key, type: field.type, source, value: numeric, min: field.min }
    );
  }

  if (field.max != null && numeric > field.max) {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.bind value for '${field.key}' is above maximum`,
      { key: field.key, type: field.type, source, value: numeric, max: field.max }
    );
  }

  return expectInteger ? Math.trunc(numeric) : numeric;
}

function astConfigCoerceSchemaString(rawValue, field, source) {
  let normalized = '';
  if (typeof rawValue === 'string') {
    normalized = rawValue.trim();
  } else if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
    normalized = String(rawValue).trim();
  } else if (rawValue == null) {
    normalized = '';
  } else {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.bind expected string-compatible value for '${field.key}'`,
      { key: field.key, type: field.type, source, value: rawValue }
    );
  }

  if (!normalized && !field.allowEmpty) {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.bind value for '${field.key}' cannot be empty`,
      { key: field.key, type: field.type, source, value: rawValue }
    );
  }

  if (field.minLength != null && normalized.length < field.minLength) {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.bind value for '${field.key}' is shorter than minLength`,
      { key: field.key, type: field.type, source, value: normalized, minLength: field.minLength }
    );
  }

  if (field.maxLength != null && normalized.length > field.maxLength) {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.bind value for '${field.key}' is longer than maxLength`,
      { key: field.key, type: field.type, source, value: normalized, maxLength: field.maxLength }
    );
  }

  if (field.pattern && !field.pattern.test(normalized)) {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.bind value for '${field.key}' does not match required pattern`,
      { key: field.key, type: field.type, source, value: normalized, pattern: field.patternText }
    );
  }

  return normalized;
}

function astConfigCoerceSchemaEnum(rawValue, field, source) {
  const raw = astConfigCoerceSchemaString(rawValue, field, source);
  const normalized = field.caseInsensitive ? raw.toLowerCase() : raw;
  const index = field.enumValuesNormalized.indexOf(normalized);
  if (index < 0) {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.bind value for '${field.key}' is not in enum values`,
      {
        key: field.key,
        type: field.type,
        source,
        value: raw,
        values: field.enumValues.slice()
      }
    );
  }

  return field.enumValues[index];
}

function astConfigCoerceSchemaJson(rawValue, field, source) {
  let parsed = rawValue;

  if (typeof rawValue === 'string') {
    const text = rawValue.trim();
    if (!text) {
      throw astConfigBuildSchemaValidationError(
        `AST.Config.bind expected JSON value for '${field.key}'`,
        { key: field.key, type: field.type, source, value: rawValue }
      );
    }
    parsed = astConfigParseJsonSafe(text, null);
    if (parsed == null) {
      throw astConfigBuildSchemaValidationError(
        `AST.Config.bind failed to parse JSON for '${field.key}'`,
        { key: field.key, type: field.type, source, value: rawValue }
      );
    }
  }

  if (field.jsonShape === 'object' && !astConfigIsPlainObject(parsed)) {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.bind expected JSON object for '${field.key}'`,
      { key: field.key, type: field.type, source, value: rawValue }
    );
  }

  if (field.jsonShape === 'array' && !Array.isArray(parsed)) {
    throw astConfigBuildSchemaValidationError(
      `AST.Config.bind expected JSON array for '${field.key}'`,
      { key: field.key, type: field.type, source, value: rawValue }
    );
  }

  if (
    field.jsonShape === 'any'
    && parsed != null
    && typeof parsed === 'object'
  ) {
    return astConfigCloneJsonValue(parsed);
  }

  return parsed;
}

function astConfigCoerceSchemaValue(rawValue, field, source) {
  switch (field.type) {
    case 'bool':
      return astConfigCoerceSchemaBoolean(rawValue, field, source);
    case 'int':
      return astConfigCoerceSchemaNumber(rawValue, field, source, true);
    case 'float':
      return astConfigCoerceSchemaNumber(rawValue, field, source, false);
    case 'enum':
      return astConfigCoerceSchemaEnum(rawValue, field, source);
    case 'json':
      return astConfigCoerceSchemaJson(rawValue, field, source);
    case 'secret-ref':
    case 'string':
      return astConfigCoerceSchemaString(rawValue, field, source);
    default:
      throw astConfigBuildSchemaValidationError(
        `AST.Config.bind cannot coerce unsupported type '${field.type}'`,
        { key: field.key, type: field.type, source, value: rawValue }
      );
  }
}

function astConfigSchema(definition = {}) {
  if (!astConfigIsPlainObject(definition)) {
    throw astConfigBuildSchemaValidationError(
      'AST.Config.schema definition must be an object',
      { value: definition }
    );
  }

  const schemaKeys = Object.keys(definition)
    .map(key => astConfigNormalizeString(key, ''))
    .filter(Boolean)
    .sort();
  const fields = {};

  for (let idx = 0; idx < schemaKeys.length; idx += 1) {
    const key = schemaKeys[idx];
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      throw astConfigBuildSchemaValidationError(
        `AST.Config.schema contains duplicate key '${key}'`,
        { key }
      );
    }

    const field = astConfigNormalizeSchemaFieldDefinition(key, definition[key]);
    if (field.hasDefault) {
      field.defaultValue = astConfigCoerceSchemaValue(field.defaultValue, field, 'default');
      if (field.defaultValue != null && typeof field.defaultValue === 'object') {
        field.defaultValue = astConfigCloneJsonValue(field.defaultValue);
      }
    }
    fields[key] = Object.freeze(field);
  }

  return Object.freeze({
    __astConfigSchema: true,
    keys: Object.freeze(schemaKeys.slice()),
    fields: Object.freeze(fields)
  });
}

function astConfigResolveBindPrecedence(options = {}) {
  const explicitSource = astConfigNormalizeString(options.source, '')
    .toLowerCase();
  if (explicitSource) {
    const resolvedSource = AST_CONFIG_BIND_SOURCE_ALIASES[explicitSource];
    if (!resolvedSource) {
      throw astConfigBuildSchemaValidationError(
        `AST.Config.bind received unsupported source '${options.source}'`,
        { source: options.source }
      );
    }
    return [resolvedSource];
  }

  const rawPrecedence = Array.isArray(options.precedence)
    ? options.precedence
    : AST_CONFIG_BIND_DEFAULT_PRECEDENCE;
  const output = [];
  const seen = {};

  for (let idx = 0; idx < rawPrecedence.length; idx += 1) {
    const normalized = astConfigNormalizeString(rawPrecedence[idx], '')
      .toLowerCase()
      .replace(/[\s-]/g, '_');
    if (!normalized) {
      continue;
    }

    const resolved = AST_CONFIG_BIND_SOURCE_ALIASES[normalized];
    if (!resolved) {
      throw astConfigBuildSchemaValidationError(
        `AST.Config.bind received unsupported precedence source '${rawPrecedence[idx]}'`,
        { source: rawPrecedence[idx] }
      );
    }

    if (seen[resolved]) {
      continue;
    }
    seen[resolved] = true;
    output.push(resolved);
  }

  if (output.length === 0) {
    return AST_CONFIG_BIND_DEFAULT_PRECEDENCE.slice();
  }

  return output;
}

function astConfigResolveBindScriptSource(schema, options = {}) {
  const scriptOptions = astConfigIsPlainObject(options.script) ? options.script : {};
  const mergedOptions = Object.assign({}, scriptOptions);

  if (astConfigIsPlainObject(options.properties) && !Object.prototype.hasOwnProperty.call(mergedOptions, 'properties')) {
    mergedOptions.properties = options.properties;
  }

  if (options.scriptProperties && !Object.prototype.hasOwnProperty.call(mergedOptions, 'scriptProperties')) {
    mergedOptions.scriptProperties = options.scriptProperties;
  }

  if (!Object.prototype.hasOwnProperty.call(mergedOptions, 'cacheScopeId')) {
    mergedOptions.cacheScopeId = options.cacheScopeId;
  }
  if (!Object.prototype.hasOwnProperty.call(mergedOptions, 'disableCache')) {
    mergedOptions.disableCache = options.disableCache;
  }
  if (!Object.prototype.hasOwnProperty.call(mergedOptions, 'forceRefresh')) {
    mergedOptions.forceRefresh = options.forceRefresh;
  }
  if (!Object.prototype.hasOwnProperty.call(mergedOptions, 'cacheDefaultHandle')) {
    mergedOptions.cacheDefaultHandle = options.cacheDefaultHandle;
  }

  const scriptReaderOptions = {
    properties: mergedOptions.properties,
    scriptProperties: mergedOptions.scriptProperties,
    keys: schema.keys,
    prefix: mergedOptions.prefix,
    stripPrefix: mergedOptions.stripPrefix,
    includeEmpty: astConfigResolveFirstBoolean([mergedOptions.includeEmpty], false),
    cacheScopeId: mergedOptions.cacheScopeId,
    disableCache: mergedOptions.disableCache,
    forceRefresh: mergedOptions.forceRefresh,
    cacheDefaultHandle: mergedOptions.cacheDefaultHandle
  };

  if (typeof astConfigGetScriptPropertiesSnapshotMemoized === 'function') {
    return astConfigGetScriptPropertiesSnapshotMemoized(scriptReaderOptions);
  }

  if (typeof astConfigFromScriptProperties === 'function') {
    return astConfigFromScriptProperties(scriptReaderOptions);
  }

  return {};
}

function astConfigResolveBindSourceMaps(schema, options, precedence) {
  const maps = {
    request: astConfigIsPlainObject(options.request)
      ? options.request
      : (astConfigIsPlainObject(options.requestConfig) ? options.requestConfig : {}),
    runtime: astConfigIsPlainObject(options.runtime)
      ? options.runtime
      : (astConfigIsPlainObject(options.runtimeConfig) ? options.runtimeConfig : {}),
    script_properties: {}
  };

  if (precedence.includes('script_properties')) {
    maps.script_properties = astConfigResolveBindScriptSource(schema, options);
  }

  return maps;
}

function astConfigBind(definitionOrSchema, options = {}) {
  if (!astConfigIsPlainObject(options)) {
    throw astConfigBuildSchemaValidationError(
      'AST.Config.bind options must be an object',
      { value: options }
    );
  }

  const schema = astConfigIsSchema(definitionOrSchema)
    ? definitionOrSchema
    : astConfigSchema(definitionOrSchema);
  const precedence = astConfigResolveBindPrecedence(options);
  const sourceMaps = astConfigResolveBindSourceMaps(schema, options, precedence);
  const output = {};
  const sourceByKey = {};

  for (let idx = 0; idx < schema.keys.length; idx += 1) {
    const key = schema.keys[idx];
    const field = schema.fields[key];

    let selectedSource = '';
    let selectedValue;
    for (let sourceIdx = 0; sourceIdx < precedence.length; sourceIdx += 1) {
      const sourceName = precedence[sourceIdx];
      const sourceMap = sourceMaps[sourceName];
      if (!astConfigIsPlainObject(sourceMap)) {
        continue;
      }
      if (!Object.prototype.hasOwnProperty.call(sourceMap, key)) {
        continue;
      }
      if (typeof sourceMap[key] === 'undefined') {
        continue;
      }
      selectedSource = sourceName;
      selectedValue = sourceMap[key];
      break;
    }

    if (!selectedSource) {
      if (field.hasDefault) {
        output[key] = astConfigCloneJsonValue(field.defaultValue);
        sourceByKey[key] = 'default';
        continue;
      }

      if (field.required) {
        throw astConfigBuildSchemaValidationError(
          `AST.Config.bind missing required key '${key}'`,
          {
            key,
            type: field.type,
            precedence: precedence.slice()
          }
        );
      }

      continue;
    }

    output[key] = astConfigCoerceSchemaValue(selectedValue, field, selectedSource);
    sourceByKey[key] = selectedSource;
  }

  if (astConfigNormalizeBoolean(options.includeMeta, false)) {
    return {
      values: output,
      sourceByKey,
      precedence: precedence.slice(),
      schema
    };
  }

  return output;
}
