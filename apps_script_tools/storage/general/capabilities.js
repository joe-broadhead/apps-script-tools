const AST_STORAGE_PROVIDERS = Object.freeze(['gcs', 's3', 'dbfs']);
const AST_STORAGE_OPERATIONS = Object.freeze([
  'list',
  'head',
  'read',
  'write',
  'delete',
  'exists',
  'copy',
  'move',
  'signed_url',
  'multipart_write'
]);

const AST_STORAGE_CAPABILITY_MATRIX = Object.freeze({
  gcs: Object.freeze({
    list: true,
    head: true,
    read: true,
    write: true,
    delete: true,
    exists: true,
    copy: true,
    move: true,
    signed_url: true,
    multipart_write: true
  }),
  s3: Object.freeze({
    list: true,
    head: true,
    read: true,
    write: true,
    delete: true,
    exists: true,
    copy: true,
    move: true,
    signed_url: true,
    multipart_write: true
  }),
  dbfs: Object.freeze({
    list: true,
    head: true,
    read: true,
    write: true,
    delete: true,
    exists: true,
    copy: true,
    move: true,
    signed_url: false,
    multipart_write: true
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
