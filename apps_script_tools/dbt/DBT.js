function astDbtRun(request = {}) {
  const normalized = astDbtValidateRunRequest(request);

  switch (normalized.operation) {
    case 'load_manifest':
      return astDbtLoadManifestCore(normalized);
    case 'inspect_manifest':
      return astDbtInspectManifestCore(normalized);
    case 'list_entities':
      return astDbtListEntitiesCore(normalized);
    case 'search':
      return astDbtSearchCore(normalized);
    case 'get_entity':
      return astDbtGetEntityCore(normalized);
    case 'get_column':
      return astDbtGetColumnCore(normalized);
    case 'lineage':
      return astDbtLineageCore(normalized);
    case 'validate_manifest':
      return astDbtValidateManifestCore(normalized);
    default:
      throw new AstDbtValidationError(`Unsupported DBT operation '${normalized.operation}'`);
  }
}

function astDbtLoadManifest(request = {}) {
  return astDbtLoadManifestCore(request);
}

function astDbtInspectManifest(request = {}) {
  return astDbtInspectManifestCore(request);
}

function astDbtListEntities(request = {}) {
  return astDbtListEntitiesCore(request);
}

function astDbtSearch(request = {}) {
  return astDbtSearchCore(request);
}

function astDbtGetEntity(request = {}) {
  return astDbtGetEntityCore(request);
}

function astDbtGetColumn(request = {}) {
  return astDbtGetColumnCore(request);
}

function astDbtLineage(request = {}) {
  return astDbtLineageCore(request);
}

function astDbtValidateManifestCore(request = {}) {
  const normalized = astDbtValidateValidateManifestRequest(request);
  const bundle = astDbtEnsureBundle(normalized, {
    options: Object.assign({}, normalized.options, {
      validate: 'off'
    })
  });

  let validation;
  if (bundle.manifest && astDbtIsPlainObject(bundle.manifest)) {
    validation = astDbtValidateManifestV12(bundle.manifest, {
      validate: normalized.options.validate,
      throwOnInvalid: false
    });
  } else if (astDbtIsPlainObject(bundle.validation)) {
    validation = Object.assign(
      {
        valid: true,
        mode: normalized.options.validate,
        schemaVersion: normalized.options.schemaVersion,
        errors: [],
        warnings: [],
        stats: {}
      },
      astDbtJsonClone(bundle.validation)
    );
    validation.mode = normalized.options.validate;
  } else {
    throw new AstDbtValidationError('validateManifest requires manifest payload or cached validation metadata');
  }

  if (!validation.valid && normalized.throwOnInvalid) {
    throw new AstDbtSchemaError('Manifest failed validation', {
      schemaVersion: validation.schemaVersion,
      mode: validation.mode,
      errors: validation.errors,
      warnings: validation.warnings
    });
  }

  return {
    status: validation.valid ? 'ok' : 'invalid',
    valid: validation.valid,
    mode: validation.mode,
    schemaVersion: validation.schemaVersion,
    errors: validation.errors,
    warnings: validation.warnings,
    stats: validation.stats
  };
}

function astDbtValidateManifest(request = {}) {
  return astDbtValidateManifestCore(request);
}

function astDbtConfigure(config = {}, options = {}) {
  return astDbtSetRuntimeConfig(config, options);
}

function astDbtGetConfig() {
  return astDbtGetRuntimeConfig();
}

function astDbtClearConfig() {
  return astDbtClearRuntimeConfig();
}

const AST_DBT = Object.freeze({
  run: astDbtRun,
  loadManifest: astDbtLoadManifest,
  inspectManifest: astDbtInspectManifest,
  listEntities: astDbtListEntities,
  search: astDbtSearch,
  getEntity: astDbtGetEntity,
  getColumn: astDbtGetColumn,
  lineage: astDbtLineage,
  providers: astDbtListProviders,
  capabilities: astDbtGetProviderCapabilities,
  validateManifest: astDbtValidateManifest,
  configure: astDbtConfigure,
  getConfig: astDbtGetConfig,
  clearConfig: astDbtClearConfig
});
