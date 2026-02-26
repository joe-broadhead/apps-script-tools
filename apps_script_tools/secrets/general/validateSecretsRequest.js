const AST_SECRETS_OPERATIONS = Object.freeze(['get', 'set', 'delete']);

function astSecretsIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astSecretsCloneObject(value) {
  return Object.assign({}, value || {});
}

function astSecretsNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astSecretsNormalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false;
    }
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }

  return fallback;
}

function astSecretsNormalizeInteger(value, fallback, min = 1, max = null) {
  if (typeof value === 'undefined' || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return fallback;
  }

  const numeric = Number(value);
  if (!Number.isInteger(numeric)) {
    return fallback;
  }

  if (numeric < min) {
    return fallback;
  }

  if (max != null && numeric > max) {
    return fallback;
  }

  return numeric;
}

function astSecretsNormalizeOperation(value, fallback = 'get') {
  if (typeof value === 'undefined' || value === null) {
    return fallback;
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return fallback;
  }

  return String(value).trim().toLowerCase();
}

function astSecretsNormalizeKey(value) {
  const key = astSecretsNormalizeString(value, '');
  if (!key) {
    throw new AstSecretsValidationError('Secrets request is missing required field \'key\'');
  }

  return key;
}

function astSecretsNormalizeSetValue(value) {
  if (typeof value === 'undefined') {
    throw new AstSecretsValidationError('Secrets set request is missing required field \'value\'');
  }

  if (value === null) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch (_error) {
    throw new AstSecretsValidationError('Secrets set request value must be JSON-serializable');
  }
}

function astSecretsValidateRequest(request = {}, overrides = {}) {
  const rawRequest = astSecretsIsPlainObject(request) ? request : {};
  const rawOverrides = astSecretsIsPlainObject(overrides) ? overrides : {};

  const operation = astSecretsNormalizeOperation(
    rawOverrides.operation || rawRequest.operation || 'get'
  );

  if (AST_SECRETS_OPERATIONS.indexOf(operation) === -1) {
    throw new AstSecretsValidationError(
      `Unsupported secrets operation '${operation}'`,
      {
        operation,
        supportedOperations: AST_SECRETS_OPERATIONS.slice()
      }
    );
  }

  const options = astSecretsIsPlainObject(rawRequest.options)
    ? astSecretsCloneObject(rawRequest.options)
    : {};
  const hasRequiredOption = Object.prototype.hasOwnProperty.call(options, 'required');

  const normalized = {
    operation,
    provider: astSecretsNormalizeProvider(
      rawOverrides.provider || rawRequest.provider,
      null
    ),
    key: astSecretsNormalizeKey(rawOverrides.key || rawRequest.key),
    value: null,
    secretId: astSecretsNormalizeString(rawRequest.secretId, null),
    version: astSecretsNormalizeString(rawRequest.version || options.version, null),
    projectId: astSecretsNormalizeString(rawRequest.projectId || options.projectId, null),
    auth: astSecretsIsPlainObject(rawRequest.auth)
      ? astSecretsCloneObject(rawRequest.auth)
      : {},
    options: {
      required: hasRequiredOption
        ? astSecretsNormalizeBoolean(options.required, true)
        : undefined,
      parseJson: astSecretsNormalizeBoolean(options.parseJson, false),
      includeRaw: astSecretsNormalizeBoolean(options.includeRaw, false),
      maxReferenceDepth: astSecretsNormalizeInteger(options.maxReferenceDepth, 3, 1, 20),
      defaultValue: Object.prototype.hasOwnProperty.call(options, 'defaultValue')
        ? options.defaultValue
        : undefined
    }
  };

  if (operation === 'set') {
    normalized.value = astSecretsNormalizeSetValue(
      Object.prototype.hasOwnProperty.call(rawRequest, 'value')
        ? rawRequest.value
        : rawRequest.payload
    );
  }

  return normalized;
}
