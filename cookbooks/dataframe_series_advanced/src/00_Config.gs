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
  return 'dataframe_series_advanced';
}

function cookbookConfigFields_() {
  return [
    {
      key: 'DF_ADV_APP_NAME',
      required: true,
      defaultValue: 'AST DataFrame Series Advanced',
      description: 'Human-readable app label included in cookbook outputs.'
    },
    {
      key: 'DF_ADV_SAMPLE_RANDOM_STATE',
      required: false,
      defaultValue: '42',
      type: 'integer',
      min: 0,
      description: 'Deterministic random seed for sample() examples.'
    },
    {
      key: 'DF_ADV_RESAMPLE_RULE',
      required: false,
      defaultValue: '1d',
      allowedValues: ['1h', '1d'],
      description: 'Resample rule used by the advanced demo.'
    },
    {
      key: 'DF_ADV_VERBOSE',
      required: false,
      defaultValue: 'false',
      type: 'boolean',
      description: 'Enables extra logging metadata in outputs when true.'
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
  const numeric = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
    return null;
  }
  return numeric;
}

function cookbookNormalizeConfigValue_(field, rawValue) {
  if (field && field.type === 'boolean') {
    return cookbookNormalizeBoolean_(rawValue, false);
  }
  if (field && field.type === 'integer') {
    return cookbookNormalizeInteger_(rawValue, null);
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

  return cookbookLogResult_('seedCookbookConfig', cookbookValidationSummary_(validateCookbookConfig({ scriptProperties: props })));
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

    if (field.type === 'integer') {
      if (normalizedValue == null) {
        errors.push(`${field.key} must be an integer value.`);
      } else if (typeof field.min === 'number' && normalizedValue < field.min) {
        errors.push(`${field.key} must be >= ${field.min}. Received: ${normalizedValue}`);
      }
    }

    if (field.allowedValues && field.allowedValues.indexOf(normalizedValue) === -1) {
      errors.push(`${field.key} must be one of: ${field.allowedValues.join(', ')}. Received: ${normalizedValue}`);
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

function cookbookBaseRecords_() {
  return [
    { ts: '2026-03-10T09:00:00Z', region: 'EU', channel: 'web', product: 'shoe', revenue: 120, units: 2, margin: 30, status: 'won' },
    { ts: '2026-03-10T10:00:00Z', region: 'EU', channel: 'web', product: 'bag', revenue: 80, units: 1, margin: null, status: 'won' },
    { ts: '2026-03-10T11:00:00Z', region: 'EU', channel: 'store', product: 'shoe', revenue: 60, units: 1, margin: 18, status: 'pending' },
    { ts: '2026-03-11T09:00:00Z', region: 'US', channel: 'web', product: 'shoe', revenue: 90, units: 1, margin: 25, status: 'won' },
    { ts: '2026-03-11T13:00:00Z', region: 'US', channel: 'store', product: 'bag', revenue: 40, units: 1, margin: 8, status: 'lost' },
    { ts: '2026-03-12T10:00:00Z', region: 'US', channel: 'web', product: 'sock', revenue: 20, units: 4, margin: 5, status: 'won' }
  ];
}

function cookbookWideMetricsFrame_() {
  const ASTX = cookbookAst_();
  return ASTX.DataFrame.fromRecords([
    { sku: 'shoe', jan: 120, feb: 150, mar: 170 },
    { sku: 'bag', jan: 80, feb: 90, mar: 95 },
    { sku: 'sock', jan: 20, feb: 35, mar: 30 }
  ]);
}
