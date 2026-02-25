class AstStorageError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstStorageError';
    this.details = details;
    if (cause) {
      this.cause = cause;
    }
  }
}

class AstStorageValidationError extends AstStorageError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstStorageValidationError';
  }
}

class AstStorageAuthError extends AstStorageError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstStorageAuthError';
  }
}

class AstStorageCapabilityError extends AstStorageError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstStorageCapabilityError';
  }
}

class AstStorageNotFoundError extends AstStorageError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstStorageNotFoundError';
  }
}

class AstStorageProviderError extends AstStorageError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstStorageProviderError';
  }
}

class AstStorageParseError extends AstStorageError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstStorageParseError';
  }
}

function astStorageBuildNotFoundError(provider, operation, uri, extra = {}) {
  return new AstStorageNotFoundError(
    `Storage object not found for ${provider}.${operation}`,
    Object.assign({ provider, operation, uri }, extra)
  );
}
