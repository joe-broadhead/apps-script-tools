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
  return 'dbt_manifest_summary';
}

function cookbookConfigFields_() {
  return [
    {
      key: 'DBT_ARTIFACT_EXPLORER_APP_NAME',
      required: true,
      defaultValue: 'AST DBT Artifact Explorer',
      description: 'Display name included in outputs.'
    },
    {
      key: 'DBT_ARTIFACT_EXPLORER_MANIFEST_FILE_ID',
      required: false,
      defaultValue: '',
      description: 'Drive file id for manifest.json.'
    },
    {
      key: 'DBT_ARTIFACT_EXPLORER_MANIFEST_URI',
      required: false,
      defaultValue: '',
      description: 'Optional manifest source URI.'
    },
    {
      key: 'DBT_ARTIFACT_EXPLORER_VALIDATE_MODE',
      required: false,
      defaultValue: 'strict',
      description: 'Validation mode for manifest and artifact loads.'
    },
    {
      key: 'DBT_ARTIFACT_EXPLORER_SCHEMA_VERSION',
      required: false,
      defaultValue: 'v12',
      description: 'Schema version used by this cookbook.'
    },
    {
      key: 'DBT_ARTIFACT_EXPLORER_MAX_BYTES',
      required: false,
      defaultValue: '52428800',
      type: 'integer',
      description: 'Maximum bytes loaded from source artifacts.'
    },
    {
      key: 'DBT_ARTIFACT_EXPLORER_CACHE_URI',
      required: false,
      defaultValue: '',
      description: 'Optional persistent manifest cache URI.'
    },
    {
      key: 'DBT_ARTIFACT_EXPLORER_CACHE_MODE',
      required: false,
      defaultValue: 'compact',
      description: 'Persistent cache mode (compact or full).'
    },
    {
      key: 'DBT_ARTIFACT_EXPLORER_CACHE_INCLUDE_MANIFEST',
      required: false,
      defaultValue: 'false',
      type: 'boolean',
      description: 'Whether persistent cache should include the raw manifest.'
    },
    {
      key: 'DBT_ARTIFACT_EXPLORER_OWNER_PATHS',
      required: false,
      defaultValue: 'owner.team,owner',
      description: 'Comma-separated owner meta paths used by governance helpers.'
    },
    {
      key: 'DBT_ARTIFACT_EXPLORER_CATALOG_URI',
      required: false,
      defaultValue: '',
      description: 'Optional catalog.json source URI.'
    },
    {
      key: 'DBT_ARTIFACT_EXPLORER_RUN_RESULTS_URI',
      required: false,
      defaultValue: '',
      description: 'Optional run_results.json source URI.'
    },
    {
      key: 'DBT_ARTIFACT_EXPLORER_SOURCES_URI',
      required: false,
      defaultValue: '',
      description: 'Optional sources.json source URI.'
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

function cookbookNormalizeUri_(value) {
  const normalized = String(value == null ? '' : value).trim();
  if (!normalized) {
    return '';
  }
  if (/^gs:\/\//i.test(normalized)) {
    return 'gcs://' + normalized.slice(5);
  }
  return normalized;
}

function cookbookSplitCsv_(value) {
  const normalized = String(value == null ? '' : value).trim();
  if (!normalized) {
    return [];
  }
  return normalized.split(',').map(function (part) {
    return String(part).trim();
  }).filter(Boolean);
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

function cookbookIsSupportedUri_(value) {
  return /^(drive:\/\/|gcs:\/\/|s3:\/\/|dbfs:\/)/i.test(value);
}

function cookbookBuildManifestRequest_(config) {
  const request = {
    options: cookbookBuildLoadOptions_(config)
  };

  if (config.DBT_ARTIFACT_EXPLORER_MANIFEST_URI) {
    request.uri = config.DBT_ARTIFACT_EXPLORER_MANIFEST_URI;
  } else if (config.DBT_ARTIFACT_EXPLORER_MANIFEST_FILE_ID) {
    request.fileId = config.DBT_ARTIFACT_EXPLORER_MANIFEST_FILE_ID;
  }

  return request;
}

function cookbookBuildLoadOptions_(config) {
  const cacheUri = cookbookNormalizeUri_(config.DBT_ARTIFACT_EXPLORER_CACHE_URI);
  return {
    validate: config.DBT_ARTIFACT_EXPLORER_VALIDATE_MODE,
    schemaVersion: config.DBT_ARTIFACT_EXPLORER_SCHEMA_VERSION,
    maxBytes: config.DBT_ARTIFACT_EXPLORER_MAX_BYTES,
    allowGzip: true,
    buildIndex: true,
    includeRaw: false,
    persistentCacheEnabled: Boolean(cacheUri),
    persistentCacheUri: cacheUri,
    persistentCacheRefresh: false,
    persistentCacheIncludeManifest: config.DBT_ARTIFACT_EXPLORER_CACHE_INCLUDE_MANIFEST,
    persistentCacheCompression: 'gzip',
    persistentCacheMode: config.DBT_ARTIFACT_EXPLORER_CACHE_MODE
  };
}

function cookbookPickSampleEntity_(ASTX, bundle) {
  let listed = ASTX.DBT.listEntities({
    bundle: bundle,
    filters: {
      resourceTypes: ['model']
    },
    page: { limit: 1, offset: 0 },
    include: { columns: 'summary', meta: false, stats: true }
  });

  if (!listed.items || listed.items.length === 0) {
    listed = ASTX.DBT.listEntities({
      bundle: bundle,
      page: { limit: 1, offset: 0 },
      include: { columns: 'summary', meta: false, stats: true }
    });
  }

  if (!listed.items || listed.items.length === 0) {
    throw new Error('No searchable DBT entities were found in the loaded manifest.');
  }

  return listed.items[0];
}

function cookbookBuildLiveContext_(ASTX, config) {
  const loadedManifest = ASTX.DBT.loadManifest(cookbookBuildManifestRequest_(config));
  const inspectedManifest = ASTX.DBT.inspectManifest({ bundle: loadedManifest.bundle });
  const sampleEntity = cookbookPickSampleEntity_(ASTX, loadedManifest.bundle);
  const entity = ASTX.DBT.getEntity({
    bundle: loadedManifest.bundle,
    uniqueId: sampleEntity.uniqueId,
    include: { meta: true, columns: 'full', stats: false }
  });
  const columnNames = entity && entity.item && entity.item.columns
    ? Object.keys(entity.item.columns)
    : [];
  const sampleColumnName = columnNames.length > 0 ? columnNames[0] : '';
  const column = sampleColumnName
    ? ASTX.DBT.getColumn({
        bundle: loadedManifest.bundle,
        uniqueId: sampleEntity.uniqueId,
        columnName: sampleColumnName
      })
    : null;

  return {
    loadedManifest: loadedManifest,
    inspectedManifest: inspectedManifest,
    sampleEntity: sampleEntity,
    entity: entity,
    sampleColumnName: sampleColumnName,
    column: column,
    ownerPaths: cookbookSplitCsv_(config.DBT_ARTIFACT_EXPLORER_OWNER_PATHS)
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
  }

  resolved.DBT_ARTIFACT_EXPLORER_MANIFEST_URI = cookbookNormalizeUri_(resolved.DBT_ARTIFACT_EXPLORER_MANIFEST_URI);
  resolved.DBT_ARTIFACT_EXPLORER_CACHE_URI = cookbookNormalizeUri_(resolved.DBT_ARTIFACT_EXPLORER_CACHE_URI);
  resolved.DBT_ARTIFACT_EXPLORER_CATALOG_URI = cookbookNormalizeUri_(resolved.DBT_ARTIFACT_EXPLORER_CATALOG_URI);
  resolved.DBT_ARTIFACT_EXPLORER_RUN_RESULTS_URI = cookbookNormalizeUri_(resolved.DBT_ARTIFACT_EXPLORER_RUN_RESULTS_URI);
  resolved.DBT_ARTIFACT_EXPLORER_SOURCES_URI = cookbookNormalizeUri_(resolved.DBT_ARTIFACT_EXPLORER_SOURCES_URI);

  if (
    !resolved.DBT_ARTIFACT_EXPLORER_MANIFEST_FILE_ID &&
    !resolved.DBT_ARTIFACT_EXPLORER_MANIFEST_URI
  ) {
    errors.push('Set either DBT_ARTIFACT_EXPLORER_MANIFEST_FILE_ID or DBT_ARTIFACT_EXPLORER_MANIFEST_URI.');
  }

  if (
    resolved.DBT_ARTIFACT_EXPLORER_MANIFEST_URI &&
    !cookbookIsSupportedUri_(resolved.DBT_ARTIFACT_EXPLORER_MANIFEST_URI)
  ) {
    errors.push('DBT_ARTIFACT_EXPLORER_MANIFEST_URI must use drive://, gcs://, s3://, or dbfs:/');
  }

  if (
    resolved.DBT_ARTIFACT_EXPLORER_CACHE_URI &&
    !/^(gcs:\/\/|s3:\/\/|dbfs:\/)/i.test(resolved.DBT_ARTIFACT_EXPLORER_CACHE_URI)
  ) {
    errors.push('DBT_ARTIFACT_EXPLORER_CACHE_URI must use gcs://, gs://, s3://, or dbfs:/');
  }

  if (['strict', 'basic', 'off'].indexOf(resolved.DBT_ARTIFACT_EXPLORER_VALIDATE_MODE) === -1) {
    errors.push('DBT_ARTIFACT_EXPLORER_VALIDATE_MODE must be one of: strict, basic, off.');
  }
  if (resolved.DBT_ARTIFACT_EXPLORER_SCHEMA_VERSION !== 'v12') {
    errors.push('DBT_ARTIFACT_EXPLORER_SCHEMA_VERSION must be v12.');
  }
  if (['compact', 'full'].indexOf(resolved.DBT_ARTIFACT_EXPLORER_CACHE_MODE) === -1) {
    errors.push('DBT_ARTIFACT_EXPLORER_CACHE_MODE must be compact or full.');
  }
  if (resolved.DBT_ARTIFACT_EXPLORER_MAX_BYTES < 1024) {
    errors.push('DBT_ARTIFACT_EXPLORER_MAX_BYTES must be >= 1024.');
  }
  if (cookbookSplitCsv_(resolved.DBT_ARTIFACT_EXPLORER_OWNER_PATHS).length === 0) {
    errors.push('DBT_ARTIFACT_EXPLORER_OWNER_PATHS must contain at least one owner path.');
  }

  const optionalArtifactUris = [
    'DBT_ARTIFACT_EXPLORER_CATALOG_URI',
    'DBT_ARTIFACT_EXPLORER_RUN_RESULTS_URI',
    'DBT_ARTIFACT_EXPLORER_SOURCES_URI'
  ];
  for (let idx = 0; idx < optionalArtifactUris.length; idx += 1) {
    const key = optionalArtifactUris[idx];
    if (resolved[key] && !cookbookIsSupportedUri_(resolved[key])) {
      errors.push(`${key} must use drive://, gcs://, s3://, or dbfs:/`);
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
    throw new Error(`Cookbook config is invalid: ${validation.errors.join(' | ')}`);
  }
  return validation;
}
