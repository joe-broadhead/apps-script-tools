/**
 * @typedef {Object} AstDbtRequest
 * @property {string} [operation]
 * @property {Object} [bundle]
 * @property {Object} [manifest]
 * @property {Object} [source]
 * @property {Object} [filters]
 * @property {Object} [options]
 */

/**
 * Runs a DBT operation via the unified AST.DBT router.
 *
 * @param {AstDbtRequest} [request={}] DBT operation request.
 * @returns {Object} Normalized DBT response.
 * @throws {AstDbtValidationError|AstDbtLoadError|AstDbtSchemaError}
 */
function astDbtRun(request = {}) {
  const normalized = astDbtValidateRunRequest(request);

  switch (normalized.operation) {
    case 'load_manifest':
      return astDbtLoadManifestCore(normalized);
    case 'load_artifact':
      return astDbtLoadArtifactCore(normalized);
    case 'inspect_manifest':
      return astDbtInspectManifestCore(normalized);
    case 'inspect_artifact':
      return astDbtInspectArtifactCore(normalized);
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
    case 'column_lineage':
      return astDbtColumnLineageCore(normalized);
    case 'validate_manifest':
      return astDbtValidateManifestCore(normalized);
    case 'diff_entities':
      return astDbtDiffEntitiesCore(normalized);
    case 'compare_artifacts':
      return astDbtCompareArtifactsCore(normalized);
    case 'impact':
      return astDbtImpactCore(normalized);
    case 'quality_report':
      return astDbtQualityReportCore(normalized);
    case 'test_coverage':
      return astDbtTestCoverageCore(normalized);
    case 'owners':
      return astDbtOwnersCore(normalized);
    case 'search_owners':
      return astDbtSearchOwnersCore(normalized);
    case 'owner_coverage':
      return astDbtOwnerCoverageCore(normalized);
    default:
      throw new AstDbtValidationError(`Unsupported DBT operation '${normalized.operation}'`);
  }
}

/**
 * Loads and validates a manifest bundle.
 *
 * @param {AstDbtRequest} [request={}] Load manifest request.
 * @returns {Object} Manifest load response.
 */
function astDbtLoadManifest(request = {}) {
  return astDbtLoadManifestCore(request);
}

/**
 * Inspects a loaded manifest bundle.
 *
 * @param {AstDbtRequest} [request={}] Inspect manifest request.
 * @returns {Object} Manifest inspection response.
 */
function astDbtInspectManifest(request = {}) {
  return astDbtInspectManifestCore(request);
}

/**
 * Loads a generic dbt artifact payload.
 *
 * @param {AstDbtRequest} [request={}] Load artifact request.
 * @returns {Object} Artifact load response.
 */
function astDbtLoadArtifact(request = {}) {
  return astDbtLoadArtifactCore(request);
}

/**
 * Inspects a loaded dbt artifact bundle.
 *
 * @param {AstDbtRequest} [request={}] Inspect artifact request.
 * @returns {Object} Artifact inspection response.
 */
function astDbtInspectArtifact(request = {}) {
  return astDbtInspectArtifactCore(request);
}

/**
 * Lists entities from a manifest bundle.
 *
 * @param {AstDbtRequest} [request={}] List entities request.
 * @returns {Object} Entity list response.
 */
function astDbtListEntities(request = {}) {
  return astDbtListEntitiesCore(request);
}

/**
 * Runs structured search across entities/columns.
 *
 * @param {AstDbtRequest} [request={}] Search request.
 * @returns {Object} Search response.
 */
function astDbtSearch(request = {}) {
  return astDbtSearchCore(request);
}

/**
 * Retrieves a single entity by unique id.
 *
 * @param {AstDbtRequest} [request={}] Get entity request.
 * @returns {Object} Entity response.
 */
function astDbtGetEntity(request = {}) {
  return astDbtGetEntityCore(request);
}

/**
 * Retrieves a single column by entity + column name.
 *
 * @param {AstDbtRequest} [request={}] Get column request.
 * @returns {Object} Column response.
 */
function astDbtGetColumn(request = {}) {
  return astDbtGetColumnCore(request);
}

/**
 * Traverses entity lineage graph.
 *
 * @param {AstDbtRequest} [request={}] Lineage request.
 * @returns {Object} Lineage response.
 */
function astDbtLineage(request = {}) {
  return astDbtLineageCore(request);
}

/**
 * Traverses column-level lineage graph.
 *
 * @param {AstDbtRequest} [request={}] Column lineage request.
 * @returns {Object} Column lineage response.
 */
function astDbtColumnLineage(request = {}) {
  return astDbtColumnLineageCore(request);
}

/**
 * Compares two entities side-by-side.
 *
 * @param {AstDbtRequest} [request={}] Diff request.
 * @returns {Object} Diff response.
 */
function astDbtDiffEntities(request = {}) {
  return astDbtDiffEntitiesCore(request);
}

/**
 * Computes downstream impact for an entity.
 *
 * @param {AstDbtRequest} [request={}] Impact request.
 * @returns {Object} Impact response.
 */
function astDbtImpact(request = {}) {
  return astDbtImpactCore(request);
}

/**
 * Compares two dbt artifacts.
 *
 * @param {AstDbtRequest} [request={}] Compare artifacts request.
 * @returns {Object} Compare artifacts response.
 */
function astDbtCompareArtifacts(request = {}) {
  return astDbtCompareArtifactsCore(request);
}

/**
 * Produces entity metadata quality report.
 *
 * @param {AstDbtRequest} [request={}] Quality report request.
 * @returns {Object} Quality report response.
 */
function astDbtQualityReport(request = {}) {
  return astDbtQualityReportCore(request);
}

/**
 * Reports test coverage for entity/manifest scope.
 *
 * @param {AstDbtRequest} [request={}] Test coverage request.
 * @returns {Object} Test coverage response.
 */
function astDbtTestCoverage(request = {}) {
  return astDbtTestCoverageCore(request);
}

/**
 * Lists owners and owner metadata.
 *
 * @param {AstDbtRequest} [request={}] Owners request.
 * @returns {Object} Owners response.
 */
function astDbtOwners(request = {}) {
  return astDbtOwnersCore(request);
}

/**
 * Searches owners by identifier/metadata.
 *
 * @param {AstDbtRequest} [request={}] Search owners request.
 * @returns {Object} Search owners response.
 */
function astDbtSearchOwners(request = {}) {
  return astDbtSearchOwnersCore(request);
}

/**
 * Computes ownership coverage metrics.
 *
 * @param {AstDbtRequest} [request={}] Owner coverage request.
 * @returns {Object} Owner coverage response.
 */
function astDbtOwnerCoverage(request = {}) {
  return astDbtOwnerCoverageCore(request);
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

/**
 * Validates a manifest against the configured schema mode.
 *
 * @param {AstDbtRequest} [request={}] Validate manifest request.
 * @returns {Object} Validation response.
 */
function astDbtValidateManifest(request = {}) {
  return astDbtValidateManifestCore(request);
}

/**
 * Sets runtime DBT configuration overrides.
 *
 * @param {Object} [config={}] Runtime config patch.
 * @param {Object} [options={}] Configure behavior options.
 * @returns {Object} Updated runtime config snapshot.
 */
function astDbtConfigure(config = {}, options = {}) {
  return astDbtSetRuntimeConfig(config, options);
}

/**
 * Gets current resolved DBT runtime config.
 *
 * @returns {Object} Runtime config snapshot.
 */
function astDbtGetConfig() {
  return astDbtGetRuntimeConfig();
}

/**
 * Clears runtime DBT config overrides.
 *
 * @returns {Object} Cleared runtime config snapshot.
 */
function astDbtClearConfig() {
  return astDbtClearRuntimeConfig();
}

const AST_DBT = Object.freeze({
  run: astDbtRun,
  loadManifest: astDbtLoadManifest,
  loadArtifact: astDbtLoadArtifact,
  inspectManifest: astDbtInspectManifest,
  inspectArtifact: astDbtInspectArtifact,
  listEntities: astDbtListEntities,
  search: astDbtSearch,
  getEntity: astDbtGetEntity,
  getColumn: astDbtGetColumn,
  lineage: astDbtLineage,
  columnLineage: astDbtColumnLineage,
  diffEntities: astDbtDiffEntities,
  compareArtifacts: astDbtCompareArtifacts,
  impact: astDbtImpact,
  qualityReport: astDbtQualityReport,
  testCoverage: astDbtTestCoverage,
  owners: astDbtOwners,
  searchOwners: astDbtSearchOwners,
  ownerCoverage: astDbtOwnerCoverage,
  providers: astDbtListProviders,
  capabilities: astDbtGetProviderCapabilities,
  validateManifest: astDbtValidateManifest,
  configure: astDbtConfigure,
  getConfig: astDbtGetConfig,
  clearConfig: astDbtClearConfig
});
