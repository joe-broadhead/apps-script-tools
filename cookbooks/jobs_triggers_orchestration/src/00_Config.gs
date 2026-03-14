function cookbookName_() {
  return 'jobs_triggers_orchestration';
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
      key: 'JOBS_TRIGGERS_APP_NAME',
      required: true,
      defaultValue: 'AST Jobs + Triggers Orchestration',
      description: 'Human-readable name included in cookbook outputs.'
    },
    {
      key: 'JOBS_TRIGGERS_JOB_PREFIX',
      required: true,
      defaultValue: 'AST_JOBS_COOKBOOK_',
      description: 'Script properties prefix used for cookbook job state.'
    },
    {
      key: 'JOBS_TRIGGERS_TRIGGER_PROPERTY_PREFIX',
      required: true,
      defaultValue: 'AST_TRIGGERS_COOKBOOK_',
      description: 'Script properties prefix used for cookbook trigger definitions.'
    },
    {
      key: 'JOBS_TRIGGERS_TRIGGER_BASE_ID',
      required: true,
      defaultValue: 'ast_jobs_cookbook',
      description: 'Stable base id used for trigger definitions created by this cookbook.'
    },
    {
      key: 'JOBS_TRIGGERS_TIMEZONE',
      required: true,
      defaultValue: 'Etc/UTC',
      description: 'Time zone used for scheduled trigger examples.'
    },
    {
      key: 'JOBS_TRIGGERS_SCHEDULE_HOURS',
      required: true,
      defaultValue: 6,
      type: 'integer',
      min: 1,
      max: 23,
      description: 'Hourly interval used by the scheduled trigger example.'
    },
    {
      key: 'JOBS_TRIGGERS_MAX_RETRIES',
      required: true,
      defaultValue: 1,
      type: 'integer',
      min: 0,
      max: 20,
      description: 'Default retry budget used by cookbook job flows.'
    },
    {
      key: 'JOBS_TRIGGERS_MAX_RUNTIME_MS',
      required: true,
      defaultValue: 30000,
      type: 'integer',
      min: 1000,
      max: 600000,
      description: 'Default runtime budget forwarded to AST.Jobs examples.'
    },
    {
      key: 'JOBS_TRIGGERS_MAX_CONCURRENCY',
      required: true,
      defaultValue: 2,
      type: 'integer',
      min: 1,
      max: 25,
      description: 'Bounded fan-out width used by enqueueMany/mapReduce examples.'
    },
    {
      key: 'JOBS_TRIGGERS_VERBOSE',
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
  if (!Number.isFinite(normalized)) {
    return null;
  }
  return Math.floor(normalized);
}

function cookbookNormalizeConfigValue_(field, rawValue) {
  if (field.type === 'boolean') {
    return cookbookNormalizeBoolean_(rawValue);
  }
  if (field.type === 'integer') {
    return cookbookNormalizeInteger_(rawValue);
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

function cookbookValidationSummary_(result) {
  return {
    status: result.status,
    cookbook: cookbookName_(),
    templateVersion: result.templateVersion,
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
    }

    if (field.type === 'boolean' && normalizedValue == null) {
      errors.push(field.key + ' must be a boolean-like value.');
    }

    if (field.type === 'integer') {
      if (normalizedValue == null) {
        errors.push(field.key + ' must be an integer.');
      } else {
        if (typeof field.min === 'number' && normalizedValue < field.min) {
          errors.push(field.key + ' must be >= ' + field.min + '.');
        }
        if (typeof field.max === 'number' && normalizedValue > field.max) {
          errors.push(field.key + ' must be <= ' + field.max + '.');
        }
      }
    }
  }

  return {
    status: errors.length > 0 ? 'error' : 'ok',
    cookbook: cookbookName_(),
    templateVersion: cookbookTemplateVersion_(),
    requiredKeys: requiredKeys,
    optionalKeys: optionalKeys,
    warnings: warnings,
    errors: errors,
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

function cookbookPublicConfig_(config) {
  return {
    appName: config.JOBS_TRIGGERS_APP_NAME,
    jobPrefix: config.JOBS_TRIGGERS_JOB_PREFIX,
    triggerPropertyPrefix: config.JOBS_TRIGGERS_TRIGGER_PROPERTY_PREFIX,
    triggerBaseId: config.JOBS_TRIGGERS_TRIGGER_BASE_ID,
    timeZone: config.JOBS_TRIGGERS_TIMEZONE,
    scheduleHours: config.JOBS_TRIGGERS_SCHEDULE_HOURS,
    maxRetries: config.JOBS_TRIGGERS_MAX_RETRIES,
    maxRuntimeMs: config.JOBS_TRIGGERS_MAX_RUNTIME_MS,
    maxConcurrency: config.JOBS_TRIGGERS_MAX_CONCURRENCY,
    verbose: config.JOBS_TRIGGERS_VERBOSE
  };
}

function cookbookJobNames_(config) {
  const namespace = config && config.JOBS_TRIGGERS_TRIGGER_BASE_ID
    ? config.JOBS_TRIGGERS_TRIGGER_BASE_ID
    : 'ast_jobs_cookbook';
  return {
    smokeRetry: namespace + ':smoke_retry_flow',
    chain: namespace + ':demo_chain',
    fanout: namespace + ':demo_fanout',
    mapReduce: namespace + ':demo_map_reduce',
    scheduled: namespace + ':demo_scheduled',
    dlq: namespace + ':demo_dlq'
  };
}

function cookbookDirectTriggerId_(config) {
  return config.JOBS_TRIGGERS_TRIGGER_BASE_ID + '_direct';
}

function cookbookScheduledTriggerId_(config) {
  return config.JOBS_TRIGGERS_TRIGGER_BASE_ID + '_scheduled';
}

function cookbookTriggerIds_(config) {
  return [
    cookbookDirectTriggerId_(config),
    cookbookScheduledTriggerId_(config)
  ];
}

function cookbookRetryMarkerKey_(config) {
  return config.JOBS_TRIGGERS_JOB_PREFIX + 'COOKBOOK_RETRY_ONCE';
}

function cookbookDlqReplayMarkerKey_(config) {
  return config.JOBS_TRIGGERS_JOB_PREFIX + 'COOKBOOK_DLQ_REPLAY';
}

function cookbookJobOptions_(config, overrides) {
  const base = {
    propertyPrefix: config.JOBS_TRIGGERS_JOB_PREFIX,
    maxRetries: config.JOBS_TRIGGERS_MAX_RETRIES,
    maxRuntimeMs: config.JOBS_TRIGGERS_MAX_RUNTIME_MS,
    checkpointStore: 'properties'
  };
  return Object.assign(base, overrides || {});
}

function cookbookTriggerSchedule_(config) {
  return {
    type: 'every_hours',
    every: config.JOBS_TRIGGERS_SCHEDULE_HOURS,
    timeZone: config.JOBS_TRIGGERS_TIMEZONE
  };
}
