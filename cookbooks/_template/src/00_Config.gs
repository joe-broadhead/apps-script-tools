function cookbookAst_() {
  return ASTLib.AST || ASTLib;
}

function cookbookScriptProperties_() {
  return PropertiesService.getScriptProperties();
}

function cookbookTemplateVersion_() {
  return 'v2';
}

function cookbookConfigFields_() {
  return [
    {
      key: 'COOKBOOK_APP_NAME',
      required: true,
      defaultValue: 'AST Cookbook Template',
      description: 'Human-readable name for the cookbook app.'
    },
    {
      key: 'COOKBOOK_RUN_MODE',
      required: true,
      defaultValue: 'demo',
      allowedValues: ['smoke', 'demo', 'all'],
      description: 'Default run mode used by cookbook entrypoints.'
    },
    {
      key: 'COOKBOOK_SAMPLE_MESSAGE',
      required: false,
      defaultValue: 'Hello from the apps-script-tools cookbook template.',
      description: 'Sample text included in cookbook outputs.'
    },
    {
      key: 'COOKBOOK_VERBOSE',
      required: false,
      defaultValue: 'false',
      type: 'boolean',
      description: 'Enables extra helper logging when true.'
    }
  ];
}

function cookbookConfigFieldMap_() {
  const fields = cookbookConfigFields_();
  const map = {};
  for (let idx = 0; idx < fields.length; idx += 1) {
    map[fields[idx].key] = fields[idx];
  }
  return map;
}

function cookbookNormalizeBoolean_(value, fallback) {
  if (value === true || value === false) {
    return value;
  }

  if (value == null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].indexOf(normalized) !== -1) {
    return true;
  }
  if (['false', '0', 'no', 'n', 'off'].indexOf(normalized) !== -1) {
    return false;
  }

  return fallback;
}

function cookbookNormalizeConfigValue_(field, rawValue) {
  if (field && field.type === 'boolean') {
    return cookbookNormalizeBoolean_(rawValue, false);
  }
  return String(rawValue == null ? '' : rawValue).trim();
}

function cookbookValidateOverrideKeys_(overrides) {
  if (overrides == null) {
    return;
  }

  if (Object.prototype.toString.call(overrides) !== '[object Object]') {
    throw new Error('seedCookbookConfig overrides must be a plain object when provided.');
  }

  const known = cookbookConfigFieldMap_();
  const keys = Object.keys(overrides);
  const unknown = [];
  for (let idx = 0; idx < keys.length; idx += 1) {
    if (!known[keys[idx]]) {
      unknown.push(keys[idx]);
    }
  }

  if (unknown.length > 0) {
    throw new Error(`Unknown cookbook config overrides: ${unknown.join(', ')}`);
  }
}

function cookbookValidationSummary_(result) {
  return {
    status: result.status,
    templateVersion: result.templateVersion,
    requiredKeys: result.requiredKeys,
    optionalKeys: result.optionalKeys,
    warnings: result.warnings,
    errors: result.errors,
    config: result.config
  };
}

function cookbookLogResult_(label, payload) {
  Logger.log(`${label}\n${JSON.stringify(payload, null, 2)}`);
  return payload;
}

function seedCookbookConfig(overrides) {
  cookbookValidateOverrideKeys_(overrides);

  const props = cookbookScriptProperties_();
  const fields = cookbookConfigFields_();
  const next = {};

  for (let idx = 0; idx < fields.length; idx += 1) {
    const field = fields[idx];
    const overrideValue = overrides && Object.prototype.hasOwnProperty.call(overrides, field.key)
      ? overrides[field.key]
      : field.defaultValue;
    next[field.key] = String(overrideValue);
  }

  props.setProperties(next, false);

  return cookbookLogResult_(
    'seedCookbookConfig',
    cookbookValidationSummary_(validateCookbookConfig({ scriptProperties: props }))
  );
}

function validateCookbookConfig(options) {
  const runtimeOptions = options || {};
  const props = runtimeOptions.scriptProperties || cookbookScriptProperties_();
  const fields = cookbookConfigFields_();
  const resolved = {};
  const warnings = [];
  const errors = [];
  const requiredKeys = [];
  const optionalKeys = [];

  for (let idx = 0; idx < fields.length; idx += 1) {
    const field = fields[idx];
    const storedValue = props.getProperty(field.key);
    const hasStoredValue = storedValue != null && storedValue !== '';
    const rawValue = hasStoredValue ? storedValue : field.defaultValue;
    const normalizedValue = cookbookNormalizeConfigValue_(field, rawValue);

    resolved[field.key] = normalizedValue;

    if (field.required) {
      requiredKeys.push(field.key);
    } else {
      optionalKeys.push(field.key);
    }

    if (!hasStoredValue) {
      warnings.push(`Using template default for ${field.key}.`);
    }

    if (field.required && (normalizedValue === '' || normalizedValue == null)) {
      errors.push(`Missing required cookbook config key ${field.key}.`);
    }

    if (field.allowedValues && field.allowedValues.indexOf(normalizedValue) === -1) {
      errors.push(
        `${field.key} must be one of: ${field.allowedValues.join(', ')}. Received: ${normalizedValue}`
      );
    }
  }

  return {
    status: errors.length > 0 ? 'error' : 'ok',
    templateVersion: cookbookTemplateVersion_(),
    requiredKeys,
    optionalKeys,
    warnings,
    errors,
    config: resolved
  };
}

function cookbookRequireValidConfig_() {
  const validation = validateCookbookConfig();
  if (validation.status !== 'ok') {
    throw new Error(`Cookbook config is invalid: ${validation.errors.join(' | ')}`);
  }
  return validation;
}
