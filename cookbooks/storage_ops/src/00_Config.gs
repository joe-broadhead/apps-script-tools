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
  return 'storage_ops';
}

function cookbookConfigFields_() {
  return [
    {
      key: 'STORAGE_OPS_APP_NAME',
      required: true,
      defaultValue: 'AST Storage Ops Cookbook',
      description: 'Display name included in cookbook outputs.'
    },
    {
      key: 'STORAGE_OPS_SOURCE_URI',
      required: true,
      defaultValue: 'gcs://example-bucket/cookbooks/storage_ops/source/',
      description: 'Dedicated scratch source prefix used for smoke and demo fixtures.'
    },
    {
      key: 'STORAGE_OPS_TARGET_URI',
      required: true,
      defaultValue: 'gcs://example-bucket/cookbooks/storage_ops/target/',
      description: 'Dedicated scratch target prefix used for smoke and demo fixtures.'
    },
    {
      key: 'STORAGE_OPS_EXECUTE_WRITES',
      required: false,
      defaultValue: 'true',
      type: 'boolean',
      description: 'When true, smoke/demo execute real writes and cleanup.'
    },
    {
      key: 'STORAGE_OPS_DELETE_EXTRA',
      required: false,
      defaultValue: 'true',
      type: 'boolean',
      description: 'When true, sync deletes target objects missing from source.'
    },
    {
      key: 'STORAGE_OPS_CONTINUE_ON_ERROR',
      required: false,
      defaultValue: 'false',
      type: 'boolean',
      description: 'When true, bulk operations continue and report per-item failures.'
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

function cookbookParseStorageUri_(uri) {
  const normalized = cookbookNormalizeStorageUri_(uri);
  if (!normalized) {
    return null;
  }

  const gcsOrS3 = normalized.match(/^(gcs|s3):\/\/([^/]+)(?:\/(.*))?$/i);
  if (gcsOrS3) {
    const provider = gcsOrS3[1].toLowerCase();
    const bucket = gcsOrS3[2];
    const key = String(gcsOrS3[3] || '').replace(/^\/+/, '');
    return {
      provider: provider,
      bucket: bucket,
      key: key,
      segments: key.split('/').filter(Boolean)
    };
  }

  if (/^dbfs:\//i.test(normalized)) {
    const path = normalized.slice('dbfs:/'.length);
    return {
      provider: 'dbfs',
      path: `/${path}`,
      segments: path.split('/').filter(Boolean)
    };
  }

  return null;
}

function cookbookValidateStoragePrefix_(fieldKey, fieldValue, errors) {
  const normalized = cookbookNormalizeStorageUri_(fieldValue);
  if (!normalized) {
    errors.push(`Missing required cookbook config key ${fieldKey}.`);
    return '';
  }

  const parsed = cookbookParseStorageUri_(normalized);
  if (!parsed) {
    errors.push(`${fieldKey} must use one of: gcs://, gs://, s3://, dbfs:/.`);
    return normalized;
  }

  if (!/\/$/.test(normalized)) {
    errors.push(`${fieldKey} must end with '/' so the cookbook only targets a prefix.`);
  }

  if (/example-bucket|example-workspace/i.test(normalized)) {
    errors.push(`${fieldKey} still uses the seeded placeholder value. Replace it with a real scratch prefix.`);
  }

  if (parsed.provider === 'gcs' || parsed.provider === 's3') {
    if (!parsed.bucket || parsed.segments.length < 2) {
      errors.push(`${fieldKey} must point to a nested scratch prefix, not a bucket root.`);
    }
  } else if (parsed.segments.length < 2) {
    errors.push(`${fieldKey} must point to a nested scratch prefix, not a DBFS root path.`);
  }

  return normalized;
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
  }

  resolved.STORAGE_OPS_SOURCE_URI = cookbookValidateStoragePrefix_(
    'STORAGE_OPS_SOURCE_URI',
    resolved.STORAGE_OPS_SOURCE_URI,
    errors
  );
  resolved.STORAGE_OPS_TARGET_URI = cookbookValidateStoragePrefix_(
    'STORAGE_OPS_TARGET_URI',
    resolved.STORAGE_OPS_TARGET_URI,
    errors
  );

  if (
    resolved.STORAGE_OPS_SOURCE_URI &&
    resolved.STORAGE_OPS_TARGET_URI &&
    resolved.STORAGE_OPS_SOURCE_URI === resolved.STORAGE_OPS_TARGET_URI
  ) {
    errors.push('STORAGE_OPS_SOURCE_URI and STORAGE_OPS_TARGET_URI must be different scratch prefixes.');
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

function cookbookConfigureStorageRuntime_(ASTX) {
  ASTX.Storage.configure(cookbookScriptProperties_().getProperties());
}

function cookbookJoinStorageUri_(baseUri, relativePath) {
  const base = cookbookNormalizeStorageUri_(baseUri).replace(/\/+$/, '/');
  const relative = String(relativePath == null ? '' : relativePath).replace(/^\/+/, '');
  return `${base}${relative}`;
}

function cookbookStorageBasename_(uri) {
  const normalized = cookbookNormalizeStorageUri_(uri).replace(/\/+$/, '');
  const parts = normalized.split('/');
  return parts[parts.length - 1];
}

function cookbookBuildSmokeFixture_(config) {
  const sourcePrefix = cookbookJoinStorageUri_(config.STORAGE_OPS_SOURCE_URI, 'smoke/source/');
  const copyTargetPrefix = cookbookJoinStorageUri_(config.STORAGE_OPS_TARGET_URI, 'smoke/copy/');
  const syncTargetPrefix = cookbookJoinStorageUri_(config.STORAGE_OPS_TARGET_URI, 'smoke/sync/');
  return {
    sourcePrefix: sourcePrefix,
    copyTargetPrefix: copyTargetPrefix,
    syncTargetPrefix: syncTargetPrefix,
    cleanupPrefixes: [sourcePrefix, copyTargetPrefix, syncTargetPrefix],
    sourceFiles: [
      { uri: cookbookJoinStorageUri_(sourcePrefix, 'alpha.txt'), text: 'alpha' },
      { uri: cookbookJoinStorageUri_(sourcePrefix, 'nested/beta.json'), json: { name: 'beta', ordinal: 2 } }
    ],
    staleSyncFiles: [
      { uri: cookbookJoinStorageUri_(syncTargetPrefix, 'alpha.txt'), text: 'old-alpha' },
      { uri: cookbookJoinStorageUri_(syncTargetPrefix, 'stale/legacy.txt'), text: 'legacy' }
    ]
  };
}

function cookbookBuildDemoFixture_(config) {
  const sourcePrefix = cookbookJoinStorageUri_(config.STORAGE_OPS_SOURCE_URI, 'demo/source/');
  const transferTargetPrefix = cookbookJoinStorageUri_(config.STORAGE_OPS_TARGET_URI, 'demo/transfer/');
  const cleanupPrefix = cookbookJoinStorageUri_(config.STORAGE_OPS_TARGET_URI, 'demo/cleanup/');
  return {
    sourcePrefix: sourcePrefix,
    transferTargetPrefix: transferTargetPrefix,
    cleanupPrefix: cleanupPrefix,
    cleanupPrefixes: [sourcePrefix, transferTargetPrefix, cleanupPrefix],
    statusUri: cookbookJoinStorageUri_(sourcePrefix, 'status.json'),
    reportUri: cookbookJoinStorageUri_(sourcePrefix, 'reports/latest.txt'),
    markerUri: cookbookJoinStorageUri_(cleanupPrefix, 'marker.txt'),
    batchUri: cookbookJoinStorageUri_(cleanupPrefix, 'batch/data.ndjson')
  };
}

function cookbookStorageWriteFixtureFiles_(ASTX, files) {
  for (let idx = 0; idx < files.length; idx += 1) {
    const file = files[idx];
    const payload = {};
    if (Object.prototype.hasOwnProperty.call(file, 'json')) {
      payload.json = file.json;
      payload.mimeType = 'application/json';
    } else {
      payload.text = String(file.text == null ? '' : file.text);
      payload.mimeType = 'text/plain';
    }

    ASTX.Storage.write({
      uri: file.uri,
      payload: payload,
      options: {
        overwrite: true
      }
    });
  }
}

function cookbookStorageDeletePrefixQuiet_(ASTX, uri) {
  return ASTX.Storage.deletePrefix({
    uri: uri,
    options: {
      dryRun: false,
      continueOnError: true
    }
  });
}

function cookbookStorageCleanupPrefixes_(ASTX, uris) {
  const summaries = [];
  for (let idx = 0; idx < uris.length; idx += 1) {
    summaries.push({
      uri: uris[idx],
      summary: cookbookBulkSummary_(
        cookbookStorageDeletePrefixQuiet_(ASTX, uris[idx])
      )
    });
  }
  return summaries;
}

function cookbookBulkSummary_(response) {
  const summary = response && response.output ? response.output.summary : null;
  return {
    processed: summary && typeof summary.processed === 'number' ? summary.processed : 0,
    copied: summary && typeof summary.copied === 'number' ? summary.copied : 0,
    deleted: summary && typeof summary.deleted === 'number' ? summary.deleted : 0,
    skipped: summary && typeof summary.skipped === 'number' ? summary.skipped : 0,
    failed: summary && typeof summary.failed === 'number' ? summary.failed : 0,
    mode: summary && summary.mode ? summary.mode : '',
    dryRun: Boolean(summary && summary.dryRun),
    truncated: Boolean(summary && summary.truncated)
  };
}
