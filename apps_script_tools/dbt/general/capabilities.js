const AST_DBT_PROVIDERS = Object.freeze([
  'drive',
  'gcs',
  's3',
  'dbfs'
]);

const AST_DBT_ARTIFACT_TYPES = Object.freeze([
  'catalog',
  'run_results',
  'sources'
]);

const AST_DBT_RUN_OPERATIONS = Object.freeze([
  'load_manifest',
  'load_artifact',
  'inspect_manifest',
  'inspect_artifact',
  'list_entities',
  'search',
  'get_entity',
  'get_column',
  'lineage',
  'validate_manifest',
  'diff_entities',
  'impact'
]);

const AST_DBT_PROVIDER_CAPABILITIES = Object.freeze({
  drive: Object.freeze({
    provider: 'drive',
    uriSchemes: ['drive://file/<id>', 'drive://path/<folderId>/<fileName>'],
    operations: ['read_manifest', 'read_artifact']
  }),
  gcs: Object.freeze({
    provider: 'gcs',
    uriSchemes: ['gcs://bucket/path/to/manifest.json'],
    operations: ['read_manifest', 'read_artifact'],
    auth: ['oauth', 'service_account']
  }),
  s3: Object.freeze({
    provider: 's3',
    uriSchemes: ['s3://bucket/path/to/manifest.json'],
    operations: ['read_manifest', 'read_artifact'],
    auth: ['sigv4']
  }),
  dbfs: Object.freeze({
    provider: 'dbfs',
    uriSchemes: ['dbfs:/path/to/manifest.json'],
    operations: ['read_manifest', 'read_artifact'],
    auth: ['databricks_pat']
  })
});

function astDbtListProviders() {
  return AST_DBT_PROVIDERS.slice();
}

function astDbtGetProviderCapabilities(provider) {
  const normalized = astDbtNormalizeProvider(provider);
  return astDbtJsonClone(AST_DBT_PROVIDER_CAPABILITIES[normalized]);
}

function astDbtNormalizeRunOperation(operation) {
  const normalized = astDbtNormalizeString(operation, '').toLowerCase();
  if (!normalized || AST_DBT_RUN_OPERATIONS.indexOf(normalized) === -1) {
    throw new AstDbtValidationError(
      `operation must be one of: ${AST_DBT_RUN_OPERATIONS.join(', ')}`,
      { operation: normalized }
    );
  }
  return normalized;
}
