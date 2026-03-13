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
  return 'http_ingestion_pipeline';
}

function cookbookConfigFields_() {
  return [
    {
      key: 'HTTP_COOKBOOK_APP_NAME',
      required: true,
      defaultValue: 'AST HTTP Ingestion Pipeline',
      description: 'Display name included in cookbook outputs.'
    },
    {
      key: 'HTTP_COOKBOOK_SUCCESS_URL',
      required: false,
      defaultValue: 'https://httpbin.org/anything/ast-http-cookbook?source=smoke&token=demo-token',
      description: 'Primary success endpoint used by smoke and demo runs.'
    },
    {
      key: 'HTTP_COOKBOOK_NOT_FOUND_URL',
      required: false,
      defaultValue: 'https://httpbin.org/status/404',
      description: 'Deterministic non-transient error endpoint.'
    },
    {
      key: 'HTTP_COOKBOOK_TRANSIENT_URL',
      required: false,
      defaultValue: 'https://httpbin.org/status/429',
      description: 'Deterministic transient error endpoint.'
    },
    {
      key: 'HTTP_COOKBOOK_TIMEOUT_MS',
      required: false,
      defaultValue: '15000',
      type: 'integer',
      description: 'Runtime timeout budget forwarded to AST.Http.'
    },
    {
      key: 'HTTP_COOKBOOK_RETRIES',
      required: false,
      defaultValue: '1',
      type: 'integer',
      description: 'Retry count for AST.Http requests.'
    },
    {
      key: 'HTTP_COOKBOOK_USER_AGENT',
      required: false,
      defaultValue: 'apps-script-tools-http-cookbook/1.0',
      description: 'Custom user agent for outbound HTTP calls.'
    },
    {
      key: 'HTTP_COOKBOOK_CACHE_ENABLED',
      required: false,
      defaultValue: 'true',
      type: 'boolean',
      description: 'Enable AST.Cache composition in the demo flow.'
    },
    {
      key: 'HTTP_COOKBOOK_CACHE_BACKEND',
      required: false,
      defaultValue: 'memory',
      description: 'Cache backend: memory, drive_json, script_properties, or storage_json.'
    },
    {
      key: 'HTTP_COOKBOOK_CACHE_NAMESPACE',
      required: false,
      defaultValue: 'ast_http_cookbook',
      description: 'Cache namespace for cookbook fetch examples.'
    },
    {
      key: 'HTTP_COOKBOOK_CACHE_TTL_SEC',
      required: false,
      defaultValue: '120',
      type: 'integer',
      description: 'Fresh cache TTL used for AST.Cache.fetch.'
    },
    {
      key: 'HTTP_COOKBOOK_CACHE_STALE_TTL_SEC',
      required: false,
      defaultValue: '300',
      type: 'integer',
      description: 'Stale TTL used for AST.Cache.fetch.'
    },
    {
      key: 'HTTP_COOKBOOK_CACHE_STORAGE_URI',
      required: false,
      defaultValue: '',
      description: 'Required when cache backend is storage_json.'
    },
    {
      key: 'HTTP_COOKBOOK_TELEMETRY_ENABLED',
      required: false,
      defaultValue: 'true',
      type: 'boolean',
      description: 'Enable AST.Telemetry composition in the demo flow.'
    }
  ];
}

function cookbookNormalizeString_(value, fallback) {
  if (value == null) {
    return fallback || '';
  }
  const normalized = String(value).trim();
  return normalized || (fallback || '');
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
    return cookbookNormalizeBoolean_(rawValue, cookbookNormalizeBoolean_(field.defaultValue, false));
  }
  if (field && field.type === 'integer') {
    return cookbookNormalizeInteger_(rawValue, Number(field.defaultValue || 0));
  }
  return cookbookNormalizeString_(rawValue, field && typeof field.defaultValue !== 'undefined' ? String(field.defaultValue) : '');
}

function cookbookNormalizeUri_(value) {
  const normalized = cookbookNormalizeString_(value, '');
  if (!normalized) {
    return '';
  }
  if (/^gs:\/\//i.test(normalized)) {
    return 'gcs://' + normalized.slice(5);
  }
  return normalized;
}

function cookbookIsHttpsUrl_(value) {
  return /^https:\/\//i.test(cookbookNormalizeString_(value, ''));
}

function cookbookIsSupportedStorageUri_(value) {
  return /^(gcs:\/\/|s3:\/\/|dbfs:\/)/i.test(value);
}

function cookbookValidateOverrideKeys_(overrides) {
  if (overrides == null) {
    return;
  }
  if (Object.prototype.toString.call(overrides) !== '[object Object]') {
    throw new Error('seedCookbookConfig overrides must be a plain object when provided.');
  }
  const known = {};
  const fields = cookbookConfigFields_();
  for (let idx = 0; idx < fields.length; idx += 1) {
    known[fields[idx].key] = true;
  }
  const unknown = Object.keys(overrides).filter(function (key) {
    return !known[key];
  });
  if (unknown.length > 0) {
    throw new Error('Unknown cookbook config overrides: ' + unknown.join(', '));
  }
}

function cookbookBuildHttpOptions_(config, overrides) {
  const options = Object.assign({
    retries: config.HTTP_COOKBOOK_RETRIES,
    timeoutMs: config.HTTP_COOKBOOK_TIMEOUT_MS,
    includeRaw: false,
    parseJson: true,
    userAgent: config.HTTP_COOKBOOK_USER_AGENT,
    defaultHeaders: {
      'X-Cookbook-Name': cookbookName_()
    }
  }, overrides || {});
  return options;
}

function cookbookConfigureHttp_(ASTX, config) {
  ASTX.Http.clearConfig();
  ASTX.Http.configure({
    HTTP_TIMEOUT_MS: String(config.HTTP_COOKBOOK_TIMEOUT_MS),
    HTTP_RETRIES: String(config.HTTP_COOKBOOK_RETRIES),
    HTTP_USER_AGENT: config.HTTP_COOKBOOK_USER_AGENT,
    HTTP_INCLUDE_RAW: 'false',
    HTTP_DEFAULT_HEADERS: JSON.stringify({
      'X-Cookbook-Name': cookbookName_()
    })
  });
}

function cookbookConfigureCache_(ASTX, config) {
  ASTX.Cache.clearConfig();
  if (!config.HTTP_COOKBOOK_CACHE_ENABLED) {
    return;
  }
  ASTX.Cache.configure({
    backend: config.HTTP_COOKBOOK_CACHE_BACKEND,
    namespace: config.HTTP_COOKBOOK_CACHE_NAMESPACE,
    defaultTtlSec: config.HTTP_COOKBOOK_CACHE_TTL_SEC,
    storageUri: config.HTTP_COOKBOOK_CACHE_STORAGE_URI
  });
}

function cookbookConfigureTelemetry_(ASTX, config) {
  ASTX.Telemetry.clearConfig();
  if (!config.HTTP_COOKBOOK_TELEMETRY_ENABLED) {
    return;
  }
  ASTX.Telemetry.configure({
    sink: 'logger',
    redactSecrets: true
  });
}

function cookbookBuildCacheOptions_(config) {
  return {
    backend: config.HTTP_COOKBOOK_CACHE_BACKEND,
    namespace: config.HTTP_COOKBOOK_CACHE_NAMESPACE,
    ttlSec: config.HTTP_COOKBOOK_CACHE_TTL_SEC,
    staleTtlSec: config.HTTP_COOKBOOK_CACHE_STALE_TTL_SEC,
    storageUri: config.HTTP_COOKBOOK_CACHE_STORAGE_URI,
    tags: ['http', 'cookbook'],
    serveStaleOnError: true
  };
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
  Logger.log(label + '\n' + JSON.stringify(payload, null, 2));
  return payload;
}

function cookbookPublicConfig_(config) {
  return {
    HTTP_COOKBOOK_APP_NAME: config.HTTP_COOKBOOK_APP_NAME,
    HTTP_COOKBOOK_SUCCESS_URL: config.HTTP_COOKBOOK_SUCCESS_URL,
    HTTP_COOKBOOK_NOT_FOUND_URL: config.HTTP_COOKBOOK_NOT_FOUND_URL,
    HTTP_COOKBOOK_TRANSIENT_URL: config.HTTP_COOKBOOK_TRANSIENT_URL,
    HTTP_COOKBOOK_TIMEOUT_MS: config.HTTP_COOKBOOK_TIMEOUT_MS,
    HTTP_COOKBOOK_RETRIES: config.HTTP_COOKBOOK_RETRIES,
    HTTP_COOKBOOK_USER_AGENT: config.HTTP_COOKBOOK_USER_AGENT,
    HTTP_COOKBOOK_CACHE_ENABLED: config.HTTP_COOKBOOK_CACHE_ENABLED,
    HTTP_COOKBOOK_CACHE_BACKEND: config.HTTP_COOKBOOK_CACHE_BACKEND,
    HTTP_COOKBOOK_CACHE_NAMESPACE: config.HTTP_COOKBOOK_CACHE_NAMESPACE,
    HTTP_COOKBOOK_CACHE_TTL_SEC: config.HTTP_COOKBOOK_CACHE_TTL_SEC,
    HTTP_COOKBOOK_CACHE_STALE_TTL_SEC: config.HTTP_COOKBOOK_CACHE_STALE_TTL_SEC,
    HTTP_COOKBOOK_CACHE_STORAGE_URI: config.HTTP_COOKBOOK_CACHE_STORAGE_URI,
    HTTP_COOKBOOK_TELEMETRY_ENABLED: config.HTTP_COOKBOOK_TELEMETRY_ENABLED
  };
}

function seedCookbookConfig(overrides) {
  cookbookValidateOverrideKeys_(overrides);
  const props = cookbookScriptProperties_();
  const values = {};
  const fields = cookbookConfigFields_();
  for (let idx = 0; idx < fields.length; idx += 1) {
    const field = fields[idx];
    const overrideValue = overrides && Object.prototype.hasOwnProperty.call(overrides, field.key)
      ? overrides[field.key]
      : field.defaultValue;
    values[field.key] = String(overrideValue);
  }
  props.setProperties(values, false);
  return cookbookLogResult_('seedCookbookConfig', cookbookValidationSummary_(validateCookbookConfig({ scriptProperties: props })));
}

function validateCookbookConfig(options) {
  const runtimeOptions = options || {};
  const props = runtimeOptions.scriptProperties || cookbookScriptProperties_();
  const fields = cookbookConfigFields_();
  const resolved = {};
  const requiredKeys = [];
  const optionalKeys = [];
  const warnings = [];
  const errors = [];

  for (let idx = 0; idx < fields.length; idx += 1) {
    const field = fields[idx];
    const storedValue = props.getProperty(field.key);
    const hasStoredValue = storedValue != null && storedValue !== '';
    const rawValue = hasStoredValue ? storedValue : field.defaultValue;
    resolved[field.key] = cookbookNormalizeConfigValue_(field, rawValue);
    if (field.required) {
      requiredKeys.push(field.key);
    } else {
      optionalKeys.push(field.key);
    }
    if (!hasStoredValue) {
      warnings.push('Using cookbook default for ' + field.key + '.');
    }
  }

  resolved.HTTP_COOKBOOK_CACHE_STORAGE_URI = cookbookNormalizeUri_(resolved.HTTP_COOKBOOK_CACHE_STORAGE_URI);

  ['HTTP_COOKBOOK_SUCCESS_URL', 'HTTP_COOKBOOK_NOT_FOUND_URL', 'HTTP_COOKBOOK_TRANSIENT_URL'].forEach(function (key) {
    if (!cookbookIsHttpsUrl_(resolved[key])) {
      errors.push(key + ' must be an https:// URL.');
    }
  });

  if (resolved.HTTP_COOKBOOK_TIMEOUT_MS < 1000) {
    errors.push('HTTP_COOKBOOK_TIMEOUT_MS must be >= 1000.');
  }
  if (resolved.HTTP_COOKBOOK_RETRIES < 0) {
    errors.push('HTTP_COOKBOOK_RETRIES must be >= 0.');
  }
  if (['memory', 'drive_json', 'script_properties', 'storage_json'].indexOf(resolved.HTTP_COOKBOOK_CACHE_BACKEND) === -1) {
    errors.push('HTTP_COOKBOOK_CACHE_BACKEND must be one of: memory, drive_json, script_properties, storage_json.');
  }
  if (resolved.HTTP_COOKBOOK_CACHE_ENABLED && resolved.HTTP_COOKBOOK_CACHE_TTL_SEC < 1) {
    errors.push('HTTP_COOKBOOK_CACHE_TTL_SEC must be >= 1.');
  }
  if (resolved.HTTP_COOKBOOK_CACHE_ENABLED && resolved.HTTP_COOKBOOK_CACHE_STALE_TTL_SEC < resolved.HTTP_COOKBOOK_CACHE_TTL_SEC) {
    errors.push('HTTP_COOKBOOK_CACHE_STALE_TTL_SEC must be >= HTTP_COOKBOOK_CACHE_TTL_SEC.');
  }
  if (resolved.HTTP_COOKBOOK_CACHE_BACKEND === 'storage_json') {
    if (!resolved.HTTP_COOKBOOK_CACHE_STORAGE_URI) {
      errors.push('HTTP_COOKBOOK_CACHE_STORAGE_URI is required when using storage_json.');
    } else if (!cookbookIsSupportedStorageUri_(resolved.HTTP_COOKBOOK_CACHE_STORAGE_URI)) {
      errors.push('HTTP_COOKBOOK_CACHE_STORAGE_URI must use gcs://, gs://, s3://, or dbfs:/');
    }
  }

  return {
    status: errors.length > 0 ? 'error' : 'ok',
    templateVersion: cookbookTemplateVersion_(),
    cookbook: cookbookName_(),
    requiredKeys: requiredKeys,
    optionalKeys: optionalKeys,
    warnings: warnings,
    errors: errors,
    config: resolved
  };
}

function cookbookRequireValidConfig_() {
  const validation = validateCookbookConfig();
  if (validation.status !== 'ok') {
    throw new Error('Cookbook config is invalid: ' + validation.errors.join(' | '));
  }
  return validation;
}
