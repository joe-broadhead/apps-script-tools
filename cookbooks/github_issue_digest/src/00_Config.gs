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
  return 'github_issue_digest';
}

function cookbookConfigFields_() {
  return [
    {
      key: 'GITHUB_AUTOMATION_APP_NAME',
      required: true,
      defaultValue: 'AST GitHub Automation Cookbook',
      description: 'Display name included in cookbook outputs.'
    },
    {
      key: 'GITHUB_AUTOMATION_OWNER',
      required: false,
      defaultValue: '',
      description: 'Repository owner override. Falls back to GITHUB_OWNER.'
    },
    {
      key: 'GITHUB_AUTOMATION_REPO',
      required: false,
      defaultValue: '',
      description: 'Repository name override. Falls back to GITHUB_REPO.'
    },
    {
      key: 'GITHUB_AUTOMATION_DEFAULT_BRANCH',
      required: false,
      defaultValue: '',
      description: 'Optional branch/ref override used for checks lookups.'
    },
    {
      key: 'GITHUB_AUTOMATION_PROJECT_OWNER',
      required: false,
      defaultValue: '',
      description: 'Optional GitHub organization/user login for Projects v2 examples.'
    },
    {
      key: 'GITHUB_AUTOMATION_PROJECT_ID',
      required: false,
      defaultValue: '',
      description: 'Optional Projects v2 project node id for items example.'
    },
    {
      key: 'GITHUB_AUTOMATION_CACHE_ENABLED',
      required: false,
      defaultValue: 'true',
      type: 'boolean',
      description: 'Enable GitHub module caching for read-heavy flows.'
    },
    {
      key: 'GITHUB_AUTOMATION_CACHE_BACKEND',
      required: false,
      defaultValue: 'memory',
      description: 'Cache backend: memory, drive_json, script_properties, or storage_json.'
    },
    {
      key: 'GITHUB_AUTOMATION_CACHE_NAMESPACE',
      required: false,
      defaultValue: 'ast_github_cookbook',
      description: 'Cache namespace for cookbook reads.'
    },
    {
      key: 'GITHUB_AUTOMATION_CACHE_TTL_SEC',
      required: false,
      defaultValue: '120',
      type: 'integer',
      description: 'Fresh cache TTL seconds.'
    },
    {
      key: 'GITHUB_AUTOMATION_CACHE_STALE_TTL_SEC',
      required: false,
      defaultValue: '600',
      type: 'integer',
      description: 'Stale cache TTL seconds.'
    },
    {
      key: 'GITHUB_AUTOMATION_CACHE_ETAG_TTL_SEC',
      required: false,
      defaultValue: '3600',
      type: 'integer',
      description: 'ETag TTL seconds.'
    },
    {
      key: 'GITHUB_AUTOMATION_CACHE_STORAGE_URI',
      required: false,
      defaultValue: '',
      description: 'Required when using storage_json cache backend.'
    },
    {
      key: 'GITHUB_AUTOMATION_APP_ID',
      required: false,
      defaultValue: '',
      description: 'Optional GitHub App id for authAsApp example.'
    },
    {
      key: 'GITHUB_AUTOMATION_APP_INSTALLATION_ID',
      required: false,
      defaultValue: '',
      description: 'Optional GitHub App installation id for authAsApp example.'
    },
    {
      key: 'GITHUB_AUTOMATION_APP_PRIVATE_KEY',
      required: false,
      defaultValue: '',
      description: 'Optional GitHub App private key or secret:// reference.'
    }
  ];
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

function cookbookNormalizeString_(value, fallback) {
  if (value == null) {
    return fallback || '';
  }
  const normalized = String(value).trim();
  return normalized || (fallback || '');
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

function cookbookNormalizeConfigValue_(field, rawValue) {
  if (field && field.type === 'boolean') {
    return cookbookNormalizeBoolean_(rawValue, cookbookNormalizeBoolean_(field.defaultValue, false));
  }
  if (field && field.type === 'integer') {
    return cookbookNormalizeInteger_(rawValue, Number(field.defaultValue || 0));
  }
  return cookbookNormalizeString_(rawValue, field && typeof field.defaultValue !== 'undefined' ? String(field.defaultValue) : '');
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

function cookbookIsSupportedStorageUri_(value) {
  return /^(gcs:\/\/|s3:\/\/|dbfs:\/)/i.test(value);
}

function cookbookBuildCacheConfig_(config) {
  return {
    enabled: config.GITHUB_AUTOMATION_CACHE_ENABLED,
    backend: config.GITHUB_AUTOMATION_CACHE_BACKEND,
    namespace: config.GITHUB_AUTOMATION_CACHE_NAMESPACE,
    ttlSec: config.GITHUB_AUTOMATION_CACHE_TTL_SEC,
    staleTtlSec: config.GITHUB_AUTOMATION_CACHE_STALE_TTL_SEC,
    etagTtlSec: config.GITHUB_AUTOMATION_CACHE_ETAG_TTL_SEC,
    storageUri: config.GITHUB_AUTOMATION_CACHE_STORAGE_URI,
    coalesce: true,
    coalesceLeaseMs: 15000,
    coalesceWaitMs: 12000,
    pollMs: 250,
    serveStaleOnError: true
  };
}

function cookbookResolveRuntimeConfig_(resolved, props) {
  const token = cookbookNormalizeString_(props.getProperty('GITHUB_TOKEN'), '');
  const owner = cookbookNormalizeString_(resolved.GITHUB_AUTOMATION_OWNER, '')
    || cookbookNormalizeString_(props.getProperty('GITHUB_OWNER'), '');
  const repo = cookbookNormalizeString_(resolved.GITHUB_AUTOMATION_REPO, '')
    || cookbookNormalizeString_(props.getProperty('GITHUB_REPO'), '');
  const projectOwner = cookbookNormalizeString_(resolved.GITHUB_AUTOMATION_PROJECT_OWNER, '') || owner;

  return {
    token: token,
    owner: owner,
    repo: repo,
    projectOwner: projectOwner,
    hasAppAuth: Boolean(
      resolved.GITHUB_AUTOMATION_APP_ID &&
      resolved.GITHUB_AUTOMATION_APP_INSTALLATION_ID &&
      resolved.GITHUB_AUTOMATION_APP_PRIVATE_KEY
    )
  };
}

function cookbookConfigureGitHub_(ASTX, config) {
  ASTX.GitHub.clearConfig();
  ASTX.GitHub.configure({
    GITHUB_TOKEN: config.runtime.token,
    GITHUB_OWNER: config.runtime.owner,
    GITHUB_REPO: config.runtime.repo,
    GITHUB_CACHE_ENABLED: config.GITHUB_AUTOMATION_CACHE_ENABLED,
    GITHUB_CACHE_BACKEND: config.GITHUB_AUTOMATION_CACHE_BACKEND,
    GITHUB_CACHE_NAMESPACE: config.GITHUB_AUTOMATION_CACHE_NAMESPACE,
    GITHUB_CACHE_TTL_SEC: String(config.GITHUB_AUTOMATION_CACHE_TTL_SEC),
    GITHUB_CACHE_STALE_TTL_SEC: String(config.GITHUB_AUTOMATION_CACHE_STALE_TTL_SEC),
    GITHUB_CACHE_ETAG_TTL_SEC: String(config.GITHUB_AUTOMATION_CACHE_ETAG_TTL_SEC),
    GITHUB_CACHE_STORAGE_URI: config.GITHUB_AUTOMATION_CACHE_STORAGE_URI,
    GITHUB_APP_ID: config.GITHUB_AUTOMATION_APP_ID,
    GITHUB_APP_INSTALLATION_ID: config.GITHUB_AUTOMATION_APP_INSTALLATION_ID,
    GITHUB_APP_PRIVATE_KEY: config.GITHUB_AUTOMATION_APP_PRIVATE_KEY
  });
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

function seedCookbookConfig(overrides) {
  cookbookValidateOverrideKeys_(overrides);
  const props = cookbookScriptProperties_();
  const fields = cookbookConfigFields_();
  const values = {};
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

  resolved.GITHUB_AUTOMATION_CACHE_STORAGE_URI = cookbookNormalizeUri_(resolved.GITHUB_AUTOMATION_CACHE_STORAGE_URI);
  resolved.runtime = cookbookResolveRuntimeConfig_(resolved, props);

  if (!resolved.runtime.token) {
    errors.push('Missing required script property GITHUB_TOKEN for PAT-first cookbook flows.');
  }
  if (!resolved.runtime.owner) {
    errors.push('Set GITHUB_AUTOMATION_OWNER or GITHUB_OWNER.');
  }
  if (!resolved.runtime.repo) {
    errors.push('Set GITHUB_AUTOMATION_REPO or GITHUB_REPO.');
  }
  if (['memory', 'drive_json', 'script_properties', 'storage_json'].indexOf(resolved.GITHUB_AUTOMATION_CACHE_BACKEND) === -1) {
    errors.push('GITHUB_AUTOMATION_CACHE_BACKEND must be one of: memory, drive_json, script_properties, storage_json.');
  }
  if (resolved.GITHUB_AUTOMATION_CACHE_ENABLED && resolved.GITHUB_AUTOMATION_CACHE_TTL_SEC < 1) {
    errors.push('GITHUB_AUTOMATION_CACHE_TTL_SEC must be >= 1.');
  }
  if (resolved.GITHUB_AUTOMATION_CACHE_ENABLED && resolved.GITHUB_AUTOMATION_CACHE_STALE_TTL_SEC < resolved.GITHUB_AUTOMATION_CACHE_TTL_SEC) {
    errors.push('GITHUB_AUTOMATION_CACHE_STALE_TTL_SEC must be >= GITHUB_AUTOMATION_CACHE_TTL_SEC.');
  }
  if (resolved.GITHUB_AUTOMATION_CACHE_ENABLED && resolved.GITHUB_AUTOMATION_CACHE_ETAG_TTL_SEC < 1) {
    errors.push('GITHUB_AUTOMATION_CACHE_ETAG_TTL_SEC must be >= 1.');
  }
  if (resolved.GITHUB_AUTOMATION_CACHE_BACKEND === 'storage_json') {
    if (!resolved.GITHUB_AUTOMATION_CACHE_STORAGE_URI) {
      errors.push('GITHUB_AUTOMATION_CACHE_STORAGE_URI is required when cache backend is storage_json.');
    } else if (!cookbookIsSupportedStorageUri_(resolved.GITHUB_AUTOMATION_CACHE_STORAGE_URI)) {
      errors.push('GITHUB_AUTOMATION_CACHE_STORAGE_URI must use gcs://, gs://, s3://, or dbfs:/');
    }
  }

  const appFields = [
    resolved.GITHUB_AUTOMATION_APP_ID,
    resolved.GITHUB_AUTOMATION_APP_INSTALLATION_ID,
    resolved.GITHUB_AUTOMATION_APP_PRIVATE_KEY
  ];
  const appFieldCount = appFields.filter(Boolean).length;
  if (appFieldCount > 0 && appFieldCount < 3) {
    errors.push('Set all of GITHUB_AUTOMATION_APP_ID, GITHUB_AUTOMATION_APP_INSTALLATION_ID, and GITHUB_AUTOMATION_APP_PRIVATE_KEY together for app-auth examples.');
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
