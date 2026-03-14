function cookbookName_() {
  return 'telemetry_alerting';
}

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
      key: 'TELEMETRY_COOKBOOK_APP_NAME',
      required: true,
      defaultValue: 'AST Telemetry Alerting',
      description: 'Human-readable cookbook name used in outputs and alert rule labels.'
    },
    {
      key: 'TELEMETRY_COOKBOOK_SINK',
      required: true,
      defaultValue: 'logger',
      allowedValues: ['logger', 'drive_json', 'storage_json'],
      description: 'Telemetry sink used by smoke/demo runs.'
    },
    {
      key: 'TELEMETRY_COOKBOOK_FLUSH_MODE',
      required: true,
      defaultValue: 'threshold',
      allowedValues: ['immediate', 'threshold', 'manual'],
      description: 'Telemetry flush mode used when the sink buffers records.'
    },
    {
      key: 'TELEMETRY_COOKBOOK_SAMPLE_RATE',
      required: true,
      defaultValue: 1,
      type: 'number',
      min: 0,
      max: 1,
      description: 'Runtime sample rate for non-cookbook telemetry usage. Smoke/demo force 1.0 for determinism.'
    },
    {
      key: 'TELEMETRY_COOKBOOK_MAX_TRACES',
      required: true,
      defaultValue: 200,
      type: 'integer',
      min: 10,
      max: 5000,
      description: 'Maximum in-memory traces to keep before eviction.'
    },
    {
      key: 'TELEMETRY_COOKBOOK_BATCH_MAX_EVENTS',
      required: true,
      defaultValue: 25,
      type: 'integer',
      min: 1,
      max: 1000,
      description: 'Buffered event threshold before sink flush when using threshold mode.'
    },
    {
      key: 'TELEMETRY_COOKBOOK_EXPORT_FORMAT',
      required: true,
      defaultValue: 'ndjson',
      allowedValues: ['json', 'ndjson', 'csv'],
      description: 'Inline export format used by the demo entrypoint.'
    },
    {
      key: 'TELEMETRY_COOKBOOK_ALERT_THRESHOLD',
      required: true,
      defaultValue: 1,
      type: 'integer',
      min: 1,
      max: 1000,
      description: 'Threshold for the cookbook error-count alert rule.'
    },
    {
      key: 'TELEMETRY_COOKBOOK_DRIVE_FOLDER_ID',
      required: false,
      defaultValue: '',
      description: 'Required only when TELEMETRY_COOKBOOK_SINK=drive_json.'
    },
    {
      key: 'TELEMETRY_COOKBOOK_DRIVE_FILE_NAME',
      required: false,
      defaultValue: 'telemetry-alerting.ndjson',
      description: 'File basename used by the drive_json sink.'
    },
    {
      key: 'TELEMETRY_COOKBOOK_STORAGE_URI',
      required: false,
      defaultValue: '',
      description: 'Required only when TELEMETRY_COOKBOOK_SINK=storage_json.'
    },
    {
      key: 'TELEMETRY_COOKBOOK_NOTIFY_CHAT_WEBHOOK',
      required: false,
      defaultValue: '',
      description: 'Optional HTTPS Chat webhook used only for dry-run notification previews.'
    },
    {
      key: 'TELEMETRY_COOKBOOK_NOTIFY_EMAIL_TO',
      required: false,
      defaultValue: '',
      description: 'Optional comma-separated email recipients used only for dry-run notification previews.'
    },
    {
      key: 'TELEMETRY_COOKBOOK_VERBOSE',
      required: false,
      defaultValue: false,
      type: 'boolean',
      description: 'Enable extra helper logging when true.'
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

function cookbookNormalizeString_(value, fallback) {
  if (value == null) {
    return fallback;
  }
  const normalized = String(value).trim();
  return normalized === '' ? fallback : normalized;
}

function cookbookNormalizeBoolean_(value) {
  if (value === true || value === false) {
    return value;
  }
  if (value == null || value === '') {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].indexOf(normalized) !== -1) {
    return true;
  }
  if (['false', '0', 'no', 'n', 'off'].indexOf(normalized) !== -1) {
    return false;
  }
  return null;
}

function cookbookNormalizeInteger_(value) {
  if (value == null || value === '') {
    return null;
  }
  const normalized = Number(String(value).trim());
  if (!Number.isFinite(normalized) || !Number.isInteger(normalized)) {
    return null;
  }
  return normalized;
}

function cookbookNormalizeNumber_(value) {
  if (value == null || value === '') {
    return null;
  }
  const normalized = Number(String(value).trim());
  if (!Number.isFinite(normalized)) {
    return null;
  }
  return normalized;
}

function cookbookNormalizeConfigValue_(field, rawValue) {
  if (field.type === 'boolean') {
    return cookbookNormalizeBoolean_(rawValue);
  }
  if (field.type === 'integer') {
    return cookbookNormalizeInteger_(rawValue);
  }
  if (field.type === 'number') {
    return cookbookNormalizeNumber_(rawValue);
  }
  return cookbookNormalizeString_(rawValue, '');
}

function cookbookValidateOverrideKeys_(overrides) {
  if (overrides == null) {
    return;
  }
  if (Object.prototype.toString.call(overrides) !== '[object Object]') {
    throw new Error('seedCookbookConfig overrides must be a plain object when provided.');
  }

  const known = cookbookConfigFieldMap_();
  const unknown = [];
  Object.keys(overrides).forEach(function (key) {
    if (!known[key]) {
      unknown.push(key);
    }
  });

  if (unknown.length > 0) {
    throw new Error('Unknown cookbook config overrides: ' + unknown.join(', '));
  }
}

function cookbookPublicConfig_(config) {
  const source = config && typeof config === 'object' ? config : {};
  return {
    TELEMETRY_COOKBOOK_APP_NAME: source.TELEMETRY_COOKBOOK_APP_NAME || '',
    TELEMETRY_COOKBOOK_SINK: source.TELEMETRY_COOKBOOK_SINK || '',
    TELEMETRY_COOKBOOK_FLUSH_MODE: source.TELEMETRY_COOKBOOK_FLUSH_MODE || '',
    TELEMETRY_COOKBOOK_SAMPLE_RATE: source.TELEMETRY_COOKBOOK_SAMPLE_RATE,
    TELEMETRY_COOKBOOK_MAX_TRACES: source.TELEMETRY_COOKBOOK_MAX_TRACES,
    TELEMETRY_COOKBOOK_BATCH_MAX_EVENTS: source.TELEMETRY_COOKBOOK_BATCH_MAX_EVENTS,
    TELEMETRY_COOKBOOK_EXPORT_FORMAT: source.TELEMETRY_COOKBOOK_EXPORT_FORMAT || '',
    TELEMETRY_COOKBOOK_ALERT_THRESHOLD: source.TELEMETRY_COOKBOOK_ALERT_THRESHOLD,
    TELEMETRY_COOKBOOK_DRIVE_FOLDER_ID: source.TELEMETRY_COOKBOOK_DRIVE_FOLDER_ID || '',
    TELEMETRY_COOKBOOK_DRIVE_FILE_NAME: source.TELEMETRY_COOKBOOK_DRIVE_FILE_NAME || '',
    TELEMETRY_COOKBOOK_STORAGE_URI: source.TELEMETRY_COOKBOOK_STORAGE_URI || '',
    TELEMETRY_COOKBOOK_NOTIFY_CHAT_WEBHOOK: source.TELEMETRY_COOKBOOK_NOTIFY_CHAT_WEBHOOK ? '[configured]' : '',
    TELEMETRY_COOKBOOK_NOTIFY_EMAIL_TO: source.TELEMETRY_COOKBOOK_NOTIFY_EMAIL_TO || '',
    TELEMETRY_COOKBOOK_VERBOSE: source.TELEMETRY_COOKBOOK_VERBOSE === true
  };
}

function cookbookValidationSummary_(result) {
  return {
    status: result.status,
    cookbook: cookbookName_(),
    templateVersion: result.templateVersion,
    requiredKeys: result.requiredKeys,
    optionalKeys: result.optionalKeys,
    warnings: result.warnings,
    errors: result.errors,
    config: cookbookPublicConfig_(result.config)
  };
}

function cookbookLogResult_(label, payload) {
  Logger.log(label + '\n' + JSON.stringify(payload, null, 2));
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
  const config = {};
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
    config[field.key] = normalizedValue;

    if (field.required) {
      requiredKeys.push(field.key);
    } else {
      optionalKeys.push(field.key);
    }

    if (!hasStoredValue) {
      warnings.push('Using cookbook default for ' + field.key + '.');
    }

    if (field.required && (normalizedValue == null || normalizedValue === '')) {
      errors.push('Missing required cookbook config key ' + field.key + '.');
      continue;
    }

    if (field.allowedValues && field.allowedValues.indexOf(normalizedValue) === -1) {
      errors.push(
        field.key + ' must be one of: ' + field.allowedValues.join(', ') + '. Received: ' + normalizedValue
      );
    }

    if ((field.type === 'integer' || field.type === 'number') && normalizedValue != null) {
      if (field.min != null && normalizedValue < field.min) {
        errors.push(field.key + ' must be >= ' + field.min + '. Received: ' + normalizedValue);
      }
      if (field.max != null && normalizedValue > field.max) {
        errors.push(field.key + ' must be <= ' + field.max + '. Received: ' + normalizedValue);
      }
    }

    if (field.type === 'boolean' && normalizedValue == null && hasStoredValue) {
      errors.push(field.key + ' must be a boolean value.');
    }
  }

  if (config.TELEMETRY_COOKBOOK_SINK === 'drive_json' && !config.TELEMETRY_COOKBOOK_DRIVE_FOLDER_ID) {
    errors.push('TELEMETRY_COOKBOOK_DRIVE_FOLDER_ID is required when TELEMETRY_COOKBOOK_SINK=drive_json.');
  }

  if (config.TELEMETRY_COOKBOOK_SINK === 'storage_json' && !config.TELEMETRY_COOKBOOK_STORAGE_URI) {
    errors.push('TELEMETRY_COOKBOOK_STORAGE_URI is required when TELEMETRY_COOKBOOK_SINK=storage_json.');
  }

  if (config.TELEMETRY_COOKBOOK_SAMPLE_RATE === 0) {
    errors.push('TELEMETRY_COOKBOOK_SAMPLE_RATE must be greater than 0 for cookbook instrumentation.');
  }

  if (
    config.TELEMETRY_COOKBOOK_NOTIFY_CHAT_WEBHOOK
    && String(config.TELEMETRY_COOKBOOK_NOTIFY_CHAT_WEBHOOK).indexOf('https://') !== 0
  ) {
    errors.push('TELEMETRY_COOKBOOK_NOTIFY_CHAT_WEBHOOK must use https when configured.');
  }

  return {
    status: errors.length > 0 ? 'error' : 'ok',
    cookbook: cookbookName_(),
    templateVersion: cookbookTemplateVersion_(),
    requiredKeys,
    optionalKeys,
    warnings,
    errors,
    config: config
  };
}

function cookbookRequireValidConfig_() {
  const validation = validateCookbookConfig();
  if (validation.status !== 'ok') {
    throw new Error('Cookbook config is invalid: ' + validation.errors.join(' | '));
  }
  return validation;
}
