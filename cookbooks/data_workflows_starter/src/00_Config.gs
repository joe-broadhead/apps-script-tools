function cookbookAst_() {
  return ASTLib.AST || ASTLib;
}

function cookbookScriptProperties_() {
  return PropertiesService.getScriptProperties();
}

function cookbookTemplateVersion_() {
  return 'v2';
}

function cookbookName_() {
  return 'data_workflows_starter';
}

function cookbookConfigFields_() {
  return [
    {
      key: 'DATA_WORKFLOWS_APP_NAME',
      required: true,
      defaultValue: 'AST Data Workflows Starter',
      description: 'Display name included in cookbook outputs.'
    },
    {
      key: 'DATA_WORKFLOWS_OUTPUT_PREFIX',
      required: false,
      defaultValue: 'data_workflows',
      description: 'Prefix used for generated Drive and Sheets artifacts.'
    },
    {
      key: 'DATA_WORKFLOWS_DESTINATION_FOLDER_ID',
      required: false,
      defaultValue: '',
      description: 'Optional Drive folder id where output files should be written.'
    },
    {
      key: 'DATA_WORKFLOWS_WRITE_SHEET',
      required: false,
      defaultValue: 'true',
      type: 'boolean',
      description: 'When true, the demo also writes the transformed output to a spreadsheet.'
    },
    {
      key: 'DATA_WORKFLOWS_SQL_PROVIDER',
      required: false,
      defaultValue: '',
      allowedValues: ['', 'bigquery', 'databricks'],
      description: 'Optional SQL provider used for the prepared-query merge step.'
    },
    {
      key: 'DATA_WORKFLOWS_SQL_THRESHOLD',
      required: false,
      defaultValue: '200',
      type: 'integer',
      description: 'Threshold parameter passed into the optional SQL example.'
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

function cookbookNormalizeInteger_(value, fallback) {
  if (value == null || value === '') {
    return fallback;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || Math.floor(numeric) !== numeric) {
    return fallback;
  }
  return numeric;
}

function cookbookNormalizeConfigValue_(field, rawValue) {
  if (field && field.type === 'boolean') {
    return cookbookNormalizeBoolean_(rawValue, false);
  }
  if (field && field.type === 'integer') {
    return cookbookNormalizeInteger_(rawValue, Number(field.defaultValue || 0));
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

function cookbookLogResult_(label, payload) {
  Logger.log(`${label}\n${JSON.stringify(payload, null, 2)}`);
  return payload;
}

function cookbookDefaultRecords_() {
  return [
    { order_id: 1, region: 'north', channel: 'web', units: 2, net_revenue: 120, order_date: '2026-03-01' },
    { order_id: 2, region: 'north', channel: 'store', units: 1, net_revenue: 80, order_date: '2026-03-01' },
    { order_id: 3, region: 'south', channel: 'web', units: 4, net_revenue: 260, order_date: '2026-03-02' },
    { order_id: 4, region: 'west', channel: 'marketplace', units: 3, net_revenue: 210, order_date: '2026-03-03' },
    { order_id: 5, region: 'south', channel: 'store', units: 2, net_revenue: 140, order_date: '2026-03-03' },
    { order_id: 6, region: 'west', channel: 'web', units: 1, net_revenue: 95, order_date: '2026-03-04' }
  ];
}

function cookbookValidationSummary_(result) {
  return {
    status: result.status,
    templateVersion: result.templateVersion,
    cookbook: result.cookbook,
    requiredKeys: result.requiredKeys,
    optionalKeys: result.optionalKeys,
    warnings: result.warnings,
    errors: result.errors,
    config: result.config
  };
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
      warnings.push(`Using cookbook default for ${field.key}.`);
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

  if (resolved.DATA_WORKFLOWS_SQL_THRESHOLD < 0) {
    errors.push('DATA_WORKFLOWS_SQL_THRESHOLD must be a non-negative integer.');
  }

  return {
    status: errors.length > 0 ? 'error' : 'ok',
    templateVersion: cookbookTemplateVersion_(),
    cookbook: cookbookName_(),
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
