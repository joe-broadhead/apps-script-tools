class AstStorageError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstStorageError';
    this.details = details;
    if (cause) {
      this.cause = cause;
    }
  }

  toJSON() {
    const output = {
      name: this.name,
      message: this.message,
      details: this.details
    };
    if (Object.prototype.hasOwnProperty.call(this, 'cause')) {
      output.cause = astStorageSerializeErrorCause_(this.cause);
    }
    return output;
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

function astStorageSerializeErrorCause_(cause) {
  if (cause == null) {
    return cause;
  }
  if (cause && typeof cause.toJSON === 'function') {
    try {
      return cause.toJSON();
    } catch (_error) {
      // ignore cause serialization failures and fall back below
    }
  }
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message
    };
  }
  if (typeof cause === 'object') {
    return cause;
  }
  return { message: String(cause) };
}

function astStorageBuildNotFoundError(provider, operation, uri, extra = {}) {
  return new AstStorageNotFoundError(
    `Storage object not found for ${provider}.${operation}`,
    Object.assign({ provider, operation, uri }, extra)
  );
}
