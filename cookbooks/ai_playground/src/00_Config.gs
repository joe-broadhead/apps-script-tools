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
  return 'ai_playground';
}

function cookbookSupportedProviders_() {
  return ['databricks', 'openai', 'gemini', 'vertex_gemini', 'openrouter', 'perplexity'];
}

function cookbookConfigFields_() {
  return [
    {
      key: 'AI_PLAYGROUND_APP_NAME',
      required: true,
      defaultValue: 'AST AI Playground',
      description: 'Display name included in cookbook outputs.'
    },
    {
      key: 'AI_PLAYGROUND_PRIMARY_PROVIDER',
      required: true,
      defaultValue: 'openai',
      description: 'Provider used for smoke and demo calls.'
    },
    {
      key: 'AI_PLAYGROUND_ROUTING_ENABLED',
      required: false,
      defaultValue: 'false',
      type: 'boolean',
      description: 'Enables the routing/fallback demo.'
    },
    {
      key: 'AI_PLAYGROUND_FALLBACK_PROVIDER',
      required: false,
      defaultValue: '',
      description: 'Optional fallback provider used by routing examples.'
    },
    {
      key: 'AI_PLAYGROUND_ROUTING_RETRY_PROVIDER_ERRORS',
      required: false,
      defaultValue: 'false',
      type: 'boolean',
      description: 'Whether routing should fail over deterministic provider 4xx errors.'
    },
    {
      key: 'AI_PLAYGROUND_TEXT_PROMPT',
      required: false,
      defaultValue: 'Reply with exactly READY on a single line.',
      description: 'Prompt used by the text smoke example.'
    },
    {
      key: 'AI_PLAYGROUND_MAX_OUTPUT_TOKENS',
      required: false,
      defaultValue: '192',
      type: 'integer',
      description: 'Output token cap used for example requests.'
    },
    {
      key: 'AI_PLAYGROUND_STREAM_CHUNK_SIZE',
      required: false,
      defaultValue: '12',
      type: 'integer',
      description: 'Synthetic stream chunk size.'
    },
    {
      key: 'AI_PLAYGROUND_TOOL_TIMEOUT_MS',
      required: false,
      defaultValue: '5000',
      type: 'integer',
      description: 'Per-tool timeout guardrail.'
    },
    {
      key: 'AI_PLAYGROUND_TOOL_MAX_ARGS_BYTES',
      required: false,
      defaultValue: '4096',
      type: 'integer',
      description: 'Serialized tool args size cap.'
    },
    {
      key: 'AI_PLAYGROUND_TOOL_MAX_RESULT_BYTES',
      required: false,
      defaultValue: '4096',
      type: 'integer',
      description: 'Serialized tool result size cap.'
    },
    {
      key: 'AI_PLAYGROUND_RUN_GUARDRAIL_DEMO',
      required: false,
      defaultValue: 'false',
      type: 'boolean',
      description: 'Runs the explicit guardrail failure example inside runCookbookAll().'
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
    return cookbookNormalizeBoolean_(rawValue, cookbookNormalizeBoolean_(field.defaultValue, false));
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

function cookbookValidateProviderName_(provider, keyName, errors, allowBlank) {
  const normalized = String(provider == null ? '' : provider).trim();
  if (!normalized) {
    if (!allowBlank) {
      errors.push(`Missing required cookbook config key ${keyName}.`);
    }
    return '';
  }

  if (cookbookSupportedProviders_().indexOf(normalized) === -1) {
    errors.push(`${keyName} must be one of: ${cookbookSupportedProviders_().join(', ')}. Received: ${normalized}`);
  }
  return normalized;
}

function cookbookBaseAiOptions_(config, overrides) {
  return Object.assign({
    temperature: 0,
    maxOutputTokens: config.AI_PLAYGROUND_MAX_OUTPUT_TOKENS,
    retries: 1,
    timeoutMs: 45000
  }, overrides || {});
}

function cookbookBuildRoutingCandidates_(config) {
  const candidates = [{ provider: config.AI_PLAYGROUND_PRIMARY_PROVIDER, priority: 0 }];
  if (config.AI_PLAYGROUND_FALLBACK_PROVIDER) {
    candidates.push({ provider: config.AI_PLAYGROUND_FALLBACK_PROVIDER, priority: 1 });
  }
  return candidates;
}

function cookbookBuildToolDefinitions_(config) {
  return [
    {
      name: 'add_numbers',
      description: 'Adds two integers and returns their sum.',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number' },
          b: { type: 'number' }
        },
        required: ['a', 'b'],
        additionalProperties: false
      },
      guardrails: {
        timeoutMs: config.AI_PLAYGROUND_TOOL_TIMEOUT_MS,
        maxArgsBytes: config.AI_PLAYGROUND_TOOL_MAX_ARGS_BYTES,
        maxResultBytes: config.AI_PLAYGROUND_TOOL_MAX_RESULT_BYTES,
        retries: 0,
        idempotencyKeyFromArgs: true
      },
      handler: function (args) {
        return Number(args.a || 0) + Number(args.b || 0);
      }
    }
  ];
}

function cookbookBuildGuardrailTool_(config) {
  return {
    name: 'oversized_payload',
    description: 'Returns a payload large enough to trigger the maxResultBytes guardrail.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    guardrails: {
      timeoutMs: config.AI_PLAYGROUND_TOOL_TIMEOUT_MS,
      maxArgsBytes: Math.min(config.AI_PLAYGROUND_TOOL_MAX_ARGS_BYTES, 256),
      maxResultBytes: 64,
      retries: 0
    },
    handler: function () {
      return { payload: new Array(40).join('overflow-payload-') };
    }
  };
}

function cookbookWithAiRuntime_(callback) {
  const ASTX = cookbookAst_();
  const previousConfig = ASTX.AI.getConfig();
  ASTX.AI.configure(cookbookScriptProperties_().getProperties(), { merge: false });

  try {
    return callback(ASTX);
  } finally {
    ASTX.AI.configure(previousConfig, { merge: false });
  }
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
  }

  resolved.AI_PLAYGROUND_PRIMARY_PROVIDER = cookbookValidateProviderName_(
    resolved.AI_PLAYGROUND_PRIMARY_PROVIDER,
    'AI_PLAYGROUND_PRIMARY_PROVIDER',
    errors,
    false
  );
  resolved.AI_PLAYGROUND_FALLBACK_PROVIDER = cookbookValidateProviderName_(
    resolved.AI_PLAYGROUND_FALLBACK_PROVIDER,
    'AI_PLAYGROUND_FALLBACK_PROVIDER',
    errors,
    true
  );

  if (!resolved.AI_PLAYGROUND_TEXT_PROMPT) {
    errors.push('AI_PLAYGROUND_TEXT_PROMPT must be non-empty.');
  }

  if (resolved.AI_PLAYGROUND_STREAM_CHUNK_SIZE < 1) {
    errors.push('AI_PLAYGROUND_STREAM_CHUNK_SIZE must be >= 1.');
  }
  if (resolved.AI_PLAYGROUND_MAX_OUTPUT_TOKENS < 1) {
    errors.push('AI_PLAYGROUND_MAX_OUTPUT_TOKENS must be >= 1.');
  }
  if (resolved.AI_PLAYGROUND_TOOL_TIMEOUT_MS < 1) {
    errors.push('AI_PLAYGROUND_TOOL_TIMEOUT_MS must be >= 1.');
  }
  if (resolved.AI_PLAYGROUND_TOOL_MAX_ARGS_BYTES < 64) {
    errors.push('AI_PLAYGROUND_TOOL_MAX_ARGS_BYTES must be >= 64.');
  }
  if (resolved.AI_PLAYGROUND_TOOL_MAX_RESULT_BYTES < 64) {
    errors.push('AI_PLAYGROUND_TOOL_MAX_RESULT_BYTES must be >= 64.');
  }

  if (resolved.AI_PLAYGROUND_ROUTING_ENABLED && !resolved.AI_PLAYGROUND_FALLBACK_PROVIDER) {
    errors.push('AI_PLAYGROUND_FALLBACK_PROVIDER is required when AI_PLAYGROUND_ROUTING_ENABLED=true.');
  }

  if (
    resolved.AI_PLAYGROUND_FALLBACK_PROVIDER &&
    resolved.AI_PLAYGROUND_PRIMARY_PROVIDER === resolved.AI_PLAYGROUND_FALLBACK_PROVIDER
  ) {
    errors.push('AI_PLAYGROUND_FALLBACK_PROVIDER must differ from AI_PLAYGROUND_PRIMARY_PROVIDER.');
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
    throw new Error(`Cookbook config is invalid: ${validation.errors.join(' | ')}`);
  }
  return validation;
}
