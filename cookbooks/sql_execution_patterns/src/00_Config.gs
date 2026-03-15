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
  return 'sql_execution_patterns';
}

function cookbookConfigFields_() {
  return [
    {
      key: 'SQL_COOKBOOK_APP_NAME',
      required: true,
      defaultValue: 'AST SQL Execution Patterns',
      description: 'Human-readable app name included in cookbook output.'
    },
    {
      key: 'SQL_COOKBOOK_DEFAULT_PROVIDER',
      required: true,
      defaultValue: 'databricks',
      allowedValues: ['databricks', 'bigquery'],
      description: 'Default SQL provider used by smoke and demo examples.'
    },
    {
      key: 'SQL_COOKBOOK_ENABLE_LIVE',
      required: false,
      defaultValue: 'false',
      type: 'boolean',
      description: 'When true, live SQL execution examples run against the configured provider.'
    },
    {
      key: 'SQL_COOKBOOK_ENABLE_TABLE_WRITE',
      required: false,
      defaultValue: 'false',
      type: 'boolean',
      description: 'When true, the demo may write sample rows into SQL tables using DataFrame.toTable().' 
    },
    {
      key: 'SQL_COOKBOOK_RUN_STATUS_CHECK',
      required: false,
      defaultValue: 'true',
      type: 'boolean',
      description: 'When true, the demo calls AST.Sql.status() after prepared execution when execution metadata is available.'
    },
    {
      key: 'SQL_COOKBOOK_QUERY_TIMEOUT_MS',
      required: false,
      defaultValue: '30000',
      type: 'integer',
      min: 1000,
      description: 'Maximum SQL wait time in milliseconds for live calls.'
    },
    {
      key: 'SQL_COOKBOOK_POLL_INTERVAL_MS',
      required: false,
      defaultValue: '500',
      type: 'integer',
      min: 100,
      description: 'Polling interval in milliseconds for live SQL calls.'
    },
    {
      key: 'SQL_COOKBOOK_TARGET_TABLE',
      required: false,
      defaultValue: '',
      description: 'Optional destination table for the opt-in DataFrame.toTable() example.'
    },
    {
      key: 'SQL_COOKBOOK_DATABRICKS_HOST',
      required: false,
      defaultValue: '',
      description: 'Databricks workspace host, for example dbc-xxxx.cloud.databricks.com.'
    },
    {
      key: 'SQL_COOKBOOK_DATABRICKS_SQL_WAREHOUSE_ID',
      required: false,
      defaultValue: '',
      description: 'Databricks SQL warehouse id used for AST.Sql databricks runs.'
    },
    {
      key: 'SQL_COOKBOOK_DATABRICKS_SCHEMA',
      required: false,
      defaultValue: 'default',
      description: 'Optional Databricks schema for the demo queries.'
    },
    {
      key: 'SQL_COOKBOOK_DATABRICKS_TOKEN',
      required: false,
      defaultValue: '',
      description: 'Databricks PAT used for live SQL execution.'
    },
    {
      key: 'SQL_COOKBOOK_BIGQUERY_PROJECT_ID',
      required: false,
      defaultValue: '',
      description: 'BigQuery project id used for live SQL execution.'
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

    if (field.type === 'integer') {
      if (normalizedValue == null) {
        errors.push(`${field.key} must be an integer value.`);
      } else if (typeof field.min === 'number' && normalizedValue < field.min) {
        errors.push(`${field.key} must be >= ${field.min}. Received: ${normalizedValue}`);
      }
    }
  }

  if (resolved.SQL_COOKBOOK_POLL_INTERVAL_MS > resolved.SQL_COOKBOOK_QUERY_TIMEOUT_MS) {
    errors.push('SQL_COOKBOOK_POLL_INTERVAL_MS cannot be greater than SQL_COOKBOOK_QUERY_TIMEOUT_MS.');
  }

  if (resolved.SQL_COOKBOOK_ENABLE_TABLE_WRITE && !resolved.SQL_COOKBOOK_ENABLE_LIVE) {
    errors.push('SQL_COOKBOOK_ENABLE_TABLE_WRITE requires SQL_COOKBOOK_ENABLE_LIVE=true.');
  }

  if (resolved.SQL_COOKBOOK_ENABLE_TABLE_WRITE && !resolved.SQL_COOKBOOK_TARGET_TABLE) {
    errors.push('SQL_COOKBOOK_TARGET_TABLE is required when SQL_COOKBOOK_ENABLE_TABLE_WRITE=true.');
  }

  if (resolved.SQL_COOKBOOK_ENABLE_LIVE) {
    if (resolved.SQL_COOKBOOK_DEFAULT_PROVIDER === 'databricks') {
      if (!resolved.SQL_COOKBOOK_DATABRICKS_HOST) {
        errors.push('SQL_COOKBOOK_DATABRICKS_HOST is required for live Databricks execution.');
      }
      if (!resolved.SQL_COOKBOOK_DATABRICKS_SQL_WAREHOUSE_ID) {
        errors.push('SQL_COOKBOOK_DATABRICKS_SQL_WAREHOUSE_ID is required for live Databricks execution.');
      }
      if (!resolved.SQL_COOKBOOK_DATABRICKS_TOKEN) {
        errors.push('SQL_COOKBOOK_DATABRICKS_TOKEN is required for live Databricks execution.');
      }
    }

    if (resolved.SQL_COOKBOOK_DEFAULT_PROVIDER === 'bigquery' && !resolved.SQL_COOKBOOK_BIGQUERY_PROJECT_ID) {
      errors.push('SQL_COOKBOOK_BIGQUERY_PROJECT_ID is required for live BigQuery execution.');
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

function cookbookRedactSecrets_(value) {
  if (value == null || value === '') {
    return '';
  }
  return '***redacted***';
}

function cookbookBuildSqlParameters_(config, provider) {
  if (provider === 'databricks') {
    return {
      host: config.SQL_COOKBOOK_DATABRICKS_HOST,
      sqlWarehouseId: config.SQL_COOKBOOK_DATABRICKS_SQL_WAREHOUSE_ID,
      schema: config.SQL_COOKBOOK_DATABRICKS_SCHEMA,
      token: config.SQL_COOKBOOK_DATABRICKS_TOKEN
    };
  }

  return {
    projectId: config.SQL_COOKBOOK_BIGQUERY_PROJECT_ID
  };
}

function cookbookBuildSqlOptions_(config) {
  return {
    maxWaitMs: config.SQL_COOKBOOK_QUERY_TIMEOUT_MS,
    pollIntervalMs: config.SQL_COOKBOOK_POLL_INTERVAL_MS
  };
}

function cookbookBuildSafeParameterPreview_(config, provider) {
  const parameters = cookbookBuildSqlParameters_(config, provider);
  if (provider === 'databricks') {
    return {
      host: parameters.host,
      sqlWarehouseId: parameters.sqlWarehouseId,
      schema: parameters.schema,
      token: cookbookRedactSecrets_(parameters.token)
    };
  }
  return parameters;
}

function cookbookExecutionId_(execution) {
  if (!execution || typeof execution !== 'object') {
    return '';
  }
  return String(execution.executionId || execution.statementId || execution.jobId || '').trim();
}

function cookbookSummarizeDataFrame_(frame) {
  if (!frame || typeof frame.toRecords !== 'function' || !Array.isArray(frame.columns)) {
    return null;
  }

  const previewRows = frame.head ? frame.head(3).toRecords() : frame.toRecords().slice(0, 3);
  return {
    rowCount: typeof frame.len === 'function' ? frame.len() : previewRows.length,
    columns: frame.columns.slice(),
    preview: previewRows,
    markdownPreview: typeof frame.toMarkdown === 'function' ? frame.head(3).toMarkdown() : null
  };
}

function cookbookDirectQuerySql_(provider) {
  const label = provider === 'databricks' ? 'databricks_direct' : 'bigquery_direct';
  return `select 1 as sample_id, '${label}' as sample_label, current_timestamp() as observed_at`;
}

function cookbookPreparedQueryTemplate_() {
  return 'select {{sample_id}} as sample_id, {{sample_label}} as sample_label, current_timestamp() as observed_at';
}

function cookbookPreparedParamsSchema_() {
  return {
    sample_id: 'integer',
    sample_label: 'string'
  };
}

function cookbookWriteFrame_() {
  const ASTX = cookbookAst_();
  return ASTX.DataFrame.fromRecords([
    { sample_id: 1, sample_label: 'alpha', observed_at: '2026-01-01T00:00:00Z' },
    { sample_id: 2, sample_label: 'beta', observed_at: '2026-01-01T00:05:00Z' }
  ]);
}
