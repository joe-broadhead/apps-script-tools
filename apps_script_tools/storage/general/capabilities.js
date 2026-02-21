const AST_STORAGE_PROVIDERS = Object.freeze(['gcs', 's3', 'dbfs']);
const AST_STORAGE_OPERATIONS = Object.freeze(['list', 'head', 'read', 'write', 'delete']);

const AST_STORAGE_CAPABILITY_MATRIX = Object.freeze({
  gcs: Object.freeze({
    list: true,
    head: true,
    read: true,
    write: true,
    delete: true
  }),
  s3: Object.freeze({
    list: true,
    head: true,
    read: true,
    write: true,
    delete: true
  }),
  dbfs: Object.freeze({
    list: true,
    head: true,
    read: true,
    write: true,
    delete: true
  })
});

function astStorageListProviders() {
  return AST_STORAGE_PROVIDERS.slice();
}

function astStorageListOperations() {
  return AST_STORAGE_OPERATIONS.slice();
}

function astStorageGetCapabilities(provider) {
  const normalizedProvider = String(provider || '').trim().toLowerCase();
  const capabilities = AST_STORAGE_CAPABILITY_MATRIX[normalizedProvider];

  if (!capabilities) {
    throw new AstStorageValidationError('Unknown storage provider', {
      provider: normalizedProvider,
      supportedProviders: AST_STORAGE_PROVIDERS.slice()
    });
  }

  return Object.assign({}, capabilities);
}

function astStorageAssertOperationSupported(provider, operation) {
  const normalizedProvider = String(provider || '').trim().toLowerCase();
  const normalizedOperation = String(operation || '').trim().toLowerCase();
  const capabilities = astStorageGetCapabilities(normalizedProvider);

  if (!capabilities[normalizedOperation]) {
    throw new AstStorageCapabilityError(
      `Storage operation '${normalizedOperation}' is not supported for provider '${normalizedProvider}'`,
      {
        provider: normalizedProvider,
        operation: normalizedOperation
      }
    );
  }

  return true;
}
