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
  return 'config_cache_patterns';
}

function cookbookConfigFields_() {
  return [
    {
      key: 'CONFIG_CACHE_PATTERNS_APP_NAME',
      required: true,
      defaultValue: 'AST Config Cache Patterns',
      description: 'Display name included in cookbook outputs.'
    },
    {
      key: 'CONFIG_CACHE_PATTERNS_ENV',
      required: true,
      defaultValue: 'prod',
      allowedValues: ['dev', 'stage', 'prod'],
      description: 'Baseline script-properties environment for precedence demos.'
    },
    {
      key: 'CONFIG_CACHE_PATTERNS_TIMEOUT_MS',
      required: false,
      defaultValue: '30000',
      type: 'integer',
      description: 'Typed integer config example.'
    },
    {
      key: 'CONFIG_CACHE_PATTERNS_ENABLE_BATCH',
      required: false,
      defaultValue: 'false',
      type: 'boolean',
      description: 'Typed boolean config example.'
    },
    {
      key: 'CONFIG_CACHE_PATTERNS_SECRET_REF',
      required: true,
      defaultValue: 'secret://script_properties/CONFIG_CACHE_PATTERNS_API_TOKEN',
      description: 'Secret reference resolved through AST.Secrets.resolveValue(...).'
    },
    {
      key: 'CONFIG_CACHE_PATTERNS_CACHE_BACKEND',
      required: false,
      defaultValue: 'memory',
      allowedValues: ['memory', 'storage_json'],
      description: 'Demo cache backend. Smoke always uses memory for determinism.'
    },
    {
      key: 'CONFIG_CACHE_PATTERNS_CACHE_NAMESPACE',
      required: false,
      defaultValue: 'cookbook_config_cache_patterns',
      description: 'Base cache namespace used for smoke and demo entries.'
    },
    {
      key: 'CONFIG_CACHE_PATTERNS_CACHE_TTL_SEC',
      required: false,
      defaultValue: '120',
      type: 'integer',
      description: 'TTL applied to cache examples.'
    },
    {
      key: 'CONFIG_CACHE_PATTERNS_CACHE_STORAGE_URI',
      required: false,
      defaultValue: '',
      description: 'Required only when CONFIG_CACHE_PATTERNS_CACHE_BACKEND=storage_json.'
    },
    {
      key: 'CONFIG_CACHE_PATTERNS_API_TOKEN',
      required: true,
      defaultValue: 'replace-me-demo-token',
      description: 'Script-properties secret resolved by the cookbook.'
    },
    {
      key: 'CONFIG_CACHE_PATTERNS_ROTATABLE_SECRET',
      required: true,
      defaultValue: 'rotate-me-demo-token-v1',
      description: 'Secret rotated and restored by the demo flow.'
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

function cookbookNormalizeStorageUri_(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) {
    return '';
  }
  if (/^gs:\/\//i.test(raw)) {
    return `gcs://${raw.slice(5)}`;
  }
  return raw;
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
    cookbook: result.cookbook,
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

function cookbookMaskSecret_(value) {
  const normalized = String(value == null ? '' : value);
  if (!normalized) {
    return '';
  }
  if (normalized.length <= 4) {
    return '*'.repeat(normalized.length);
  }
  return `${'*'.repeat(normalized.length - 4)}${normalized.slice(-4)}`;
}

function cookbookIsValidStorageUri_(value) {
  return /^(gcs|s3):\/\/.+/i.test(value) || /^dbfs:\//i.test(value);
}

function cookbookBuildRuntimeProperties_(config, backendOverride) {
  const backend = String(backendOverride || config.CONFIG_CACHE_PATTERNS_CACHE_BACKEND || 'memory').trim();
  return {
    AST_SECRETS_PROVIDER: 'script_properties',
    CACHE_BACKEND: backend,
    CACHE_NAMESPACE: config.CONFIG_CACHE_PATTERNS_CACHE_NAMESPACE,
    CACHE_TTL_SEC: String(config.CONFIG_CACHE_PATTERNS_CACHE_TTL_SEC),
    CACHE_STORAGE_URI: backend === 'storage_json'
      ? cookbookNormalizeStorageUri_(config.CONFIG_CACHE_PATTERNS_CACHE_STORAGE_URI)
      : ''
  };
}

function cookbookBuildSchema_(ASTX) {
  return ASTX.Config.schema({
    CONFIG_CACHE_PATTERNS_APP_NAME: { type: 'string', required: true, minLength: 3 },
    CONFIG_CACHE_PATTERNS_ENV: { type: 'enum', values: ['dev', 'stage', 'prod'], required: true },
    CONFIG_CACHE_PATTERNS_TIMEOUT_MS: { type: 'int', min: 1000, default: 30000 },
    CONFIG_CACHE_PATTERNS_ENABLE_BATCH: { type: 'bool', default: false },
    CONFIG_CACHE_PATTERNS_SECRET_REF: { type: 'secret-ref', required: true },
    CONFIG_CACHE_PATTERNS_CACHE_BACKEND: { type: 'enum', values: ['memory', 'storage_json'], default: 'memory' },
    CONFIG_CACHE_PATTERNS_CACHE_NAMESPACE: { type: 'string', required: true, minLength: 3 },
    CONFIG_CACHE_PATTERNS_CACHE_TTL_SEC: { type: 'int', min: 1, default: 120 },
    CONFIG_CACHE_PATTERNS_CACHE_STORAGE_URI: { type: 'string', default: '' }
  });
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

    if (field.allowedValues && field.allowedValues.indexOf(normalizedValue) === -1) {
      errors.push(
        `${field.key} must be one of: ${field.allowedValues.join(', ')}. Received: ${normalizedValue}`
      );
    }
  }

  if (resolved.CONFIG_CACHE_PATTERNS_TIMEOUT_MS < 1000) {
    errors.push('CONFIG_CACHE_PATTERNS_TIMEOUT_MS must be >= 1000.');
  }
  if (resolved.CONFIG_CACHE_PATTERNS_CACHE_TTL_SEC < 1) {
    errors.push('CONFIG_CACHE_PATTERNS_CACHE_TTL_SEC must be >= 1.');
  }
  if (!/^secret:\/\/script_properties\/[A-Z0-9_]+$/i.test(resolved.CONFIG_CACHE_PATTERNS_SECRET_REF)) {
    errors.push('CONFIG_CACHE_PATTERNS_SECRET_REF must target a script_properties secret reference for this cookbook.');
  }

  resolved.CONFIG_CACHE_PATTERNS_CACHE_STORAGE_URI = cookbookNormalizeStorageUri_(
    resolved.CONFIG_CACHE_PATTERNS_CACHE_STORAGE_URI
  );
  if (
    resolved.CONFIG_CACHE_PATTERNS_CACHE_BACKEND === 'storage_json'
    && !resolved.CONFIG_CACHE_PATTERNS_CACHE_STORAGE_URI
  ) {
    errors.push('CONFIG_CACHE_PATTERNS_CACHE_STORAGE_URI is required when backend=storage_json.');
  }
  if (
    resolved.CONFIG_CACHE_PATTERNS_CACHE_STORAGE_URI
    && !cookbookIsValidStorageUri_(resolved.CONFIG_CACHE_PATTERNS_CACHE_STORAGE_URI)
  ) {
    errors.push('CONFIG_CACHE_PATTERNS_CACHE_STORAGE_URI must use gcs://, gs://, s3://, or dbfs:/.');
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

function cookbookConfigureRuntime_(ASTX, config, backendOverride) {
  ASTX.Cache.clearConfig();
  ASTX.Secrets.clearConfig();
  return ASTX.Runtime.configureFromProps({
    modules: ['Cache', 'Secrets'],
    properties: cookbookBuildRuntimeProperties_(config, backendOverride),
    clearBeforeConfigure: true,
    merge: true
  });
}

function cookbookCacheOptions_(config, suffix, backendOverride) {
  const backend = String(backendOverride || config.CONFIG_CACHE_PATTERNS_CACHE_BACKEND || 'memory').trim();
  const options = {
    backend: backend,
    namespace: `${config.CONFIG_CACHE_PATTERNS_CACHE_NAMESPACE}_${suffix}`,
    ttlSec: config.CONFIG_CACHE_PATTERNS_CACHE_TTL_SEC
  };

  if (backend === 'storage_json') {
    options.storageUri = config.CONFIG_CACHE_PATTERNS_CACHE_STORAGE_URI;
  }

  return options;
}
