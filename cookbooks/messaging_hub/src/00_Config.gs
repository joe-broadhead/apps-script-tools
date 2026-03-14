function cookbookAst_() {
  return ASTLib.AST || ASTLib;
}

function cookbookName_() {
  return 'messaging_hub';
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
      key: 'MESSAGING_HUB_APP_NAME',
      required: true,
      defaultValue: 'AST Messaging Hub',
      description: 'Human-readable cookbook name used in outputs.'
    },
    {
      key: 'MESSAGING_HUB_DEFAULT_EMAIL_TO',
      required: true,
      defaultValue: 'user@example.com',
      description: 'Default recipient used in email dry-run examples.'
    },
    {
      key: 'MESSAGING_HUB_CHAT_TRANSPORT',
      required: true,
      defaultValue: 'webhook',
      allowedValues: ['webhook', 'slack_webhook', 'teams_webhook'],
      description: 'Default chat transport used by the smoke plan.'
    },
    {
      key: 'MESSAGING_HUB_CHAT_WEBHOOK_URL',
      required: false,
      defaultValue: 'https://chat.googleapis.com/v1/spaces/SPACE/messages?key=example&token=example',
      description: 'Google Chat webhook URL used in dry-run planning output.'
    },
    {
      key: 'MESSAGING_HUB_SLACK_WEBHOOK_URL',
      required: false,
      defaultValue: 'https://hooks.slack.com/services/T00000000/B00000000/example',
      description: 'Slack webhook URL used in dry-run planning output.'
    },
    {
      key: 'MESSAGING_HUB_TEAMS_WEBHOOK_URL',
      required: false,
      defaultValue: 'https://outlook.office.com/webhook/example',
      description: 'Teams webhook URL used in dry-run planning output.'
    },
    {
      key: 'MESSAGING_HUB_TRACKING_BASE_URL',
      required: true,
      defaultValue: 'https://example.com',
      description: 'Base URL used for click/open tracking examples.'
    },
    {
      key: 'MESSAGING_HUB_TRACKING_SIGNING_SECRET',
      required: true,
      defaultValue: 'messaging-hub-tracking-secret',
      description: 'Signing secret for tracking URL examples.'
    },
    {
      key: 'MESSAGING_HUB_TRACKING_ALLOWED_DOMAINS',
      required: true,
      defaultValue: 'example.com',
      description: 'Comma-separated allowlist for click redirect examples.'
    },
    {
      key: 'MESSAGING_HUB_INBOUND_SLACK_SIGNING_SECRET',
      required: true,
      defaultValue: 'messaging-hub-slack-secret',
      description: 'Signing secret used for deterministic Slack inbound fixtures.'
    },
    {
      key: 'MESSAGING_HUB_INBOUND_GOOGLE_CHAT_TOKEN',
      required: true,
      defaultValue: 'messaging-hub-google-chat-token',
      description: 'Verification token used for deterministic Google Chat inbound fixtures.'
    },
    {
      key: 'MESSAGING_HUB_LOG_BACKEND',
      required: true,
      defaultValue: 'memory',
      allowedValues: ['memory', 'drive_json', 'script_properties', 'storage_json'],
      description: 'Backend used for tracking/delivery log examples.'
    },
    {
      key: 'MESSAGING_HUB_LOG_NAMESPACE',
      required: true,
      defaultValue: 'ast_cookbook_messaging_logs',
      description: 'Namespace used by log backends.'
    },
    {
      key: 'MESSAGING_HUB_LOG_DRIVE_FOLDER_ID',
      required: false,
      defaultValue: '',
      description: 'Drive folder required when log backend is drive_json.'
    },
    {
      key: 'MESSAGING_HUB_LOG_DRIVE_FILE_NAME',
      required: false,
      defaultValue: 'ast_messaging_hub_logs.json',
      description: 'Drive JSON filename for log backend.'
    },
    {
      key: 'MESSAGING_HUB_LOG_STORAGE_URI',
      required: false,
      defaultValue: '',
      description: 'Storage URI required when log backend is storage_json.'
    },
    {
      key: 'MESSAGING_HUB_TEMPLATE_BACKEND',
      required: true,
      defaultValue: 'memory',
      allowedValues: ['memory', 'drive_json', 'script_properties', 'storage_json'],
      description: 'Backend used for reusable template examples.'
    },
    {
      key: 'MESSAGING_HUB_TEMPLATE_NAMESPACE',
      required: true,
      defaultValue: 'ast_cookbook_messaging_templates',
      description: 'Namespace used by template backends.'
    },
    {
      key: 'MESSAGING_HUB_TEMPLATE_DRIVE_FOLDER_ID',
      required: false,
      defaultValue: '',
      description: 'Drive folder required when template backend is drive_json.'
    },
    {
      key: 'MESSAGING_HUB_TEMPLATE_DRIVE_FILE_NAME',
      required: false,
      defaultValue: 'ast_messaging_hub_templates.json',
      description: 'Drive JSON filename for template backend.'
    },
    {
      key: 'MESSAGING_HUB_TEMPLATE_STORAGE_URI',
      required: false,
      defaultValue: '',
      description: 'Storage URI required when template backend is storage_json.'
    },
    {
      key: 'MESSAGING_HUB_VERBOSE',
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

function cookbookNormalizeCsv_(value) {
  if (value == null || value === '') {
    return [];
  }

  const parts = String(value).split(',');
  const out = [];
  for (let idx = 0; idx < parts.length; idx += 1) {
    const normalized = String(parts[idx]).trim();
    if (normalized) {
      out.push(normalized);
    }
  }
  return out;
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
  }

  if (resolved.MESSAGING_HUB_TRACKING_BASE_URL && !/^https:\/\//i.test(resolved.MESSAGING_HUB_TRACKING_BASE_URL)) {
    errors.push('MESSAGING_HUB_TRACKING_BASE_URL must start with https://');
  }

  if (resolved.MESSAGING_HUB_CHAT_WEBHOOK_URL && !/^https:\/\//i.test(resolved.MESSAGING_HUB_CHAT_WEBHOOK_URL)) {
    errors.push('MESSAGING_HUB_CHAT_WEBHOOK_URL must start with https://');
  }

  if (resolved.MESSAGING_HUB_SLACK_WEBHOOK_URL && !/^https:\/\//i.test(resolved.MESSAGING_HUB_SLACK_WEBHOOK_URL)) {
    errors.push('MESSAGING_HUB_SLACK_WEBHOOK_URL must start with https://');
  }

  if (resolved.MESSAGING_HUB_TEAMS_WEBHOOK_URL && !/^https:\/\//i.test(resolved.MESSAGING_HUB_TEAMS_WEBHOOK_URL)) {
    errors.push('MESSAGING_HUB_TEAMS_WEBHOOK_URL must start with https://');
  }

  if (cookbookNormalizeCsv_(resolved.MESSAGING_HUB_TRACKING_ALLOWED_DOMAINS).length === 0) {
    errors.push('MESSAGING_HUB_TRACKING_ALLOWED_DOMAINS must include at least one host.');
  }

  if (resolved.MESSAGING_HUB_LOG_BACKEND === 'drive_json' && !resolved.MESSAGING_HUB_LOG_DRIVE_FOLDER_ID) {
    errors.push('MESSAGING_HUB_LOG_DRIVE_FOLDER_ID is required when MESSAGING_HUB_LOG_BACKEND=drive_json.');
  }

  if (resolved.MESSAGING_HUB_LOG_BACKEND === 'storage_json' && !resolved.MESSAGING_HUB_LOG_STORAGE_URI) {
    errors.push('MESSAGING_HUB_LOG_STORAGE_URI is required when MESSAGING_HUB_LOG_BACKEND=storage_json.');
  }

  if (resolved.MESSAGING_HUB_TEMPLATE_BACKEND === 'drive_json' && !resolved.MESSAGING_HUB_TEMPLATE_DRIVE_FOLDER_ID) {
    errors.push('MESSAGING_HUB_TEMPLATE_DRIVE_FOLDER_ID is required when MESSAGING_HUB_TEMPLATE_BACKEND=drive_json.');
  }

  if (resolved.MESSAGING_HUB_TEMPLATE_BACKEND === 'storage_json' && !resolved.MESSAGING_HUB_TEMPLATE_STORAGE_URI) {
    errors.push('MESSAGING_HUB_TEMPLATE_STORAGE_URI is required when MESSAGING_HUB_TEMPLATE_BACKEND=storage_json.');
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
