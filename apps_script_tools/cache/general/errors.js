class AstCacheError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstCacheError';
    this.details = details && typeof details === 'object' ? details : {};

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
      output.cause = astCacheSerializeErrorCause_(this.cause);
    }
    return output;
  }
}

class AstCacheValidationError extends AstCacheError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstCacheValidationError';
  }
}

class AstCacheCapabilityError extends AstCacheError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstCacheCapabilityError';
  }
}

function astCacheSerializeErrorCause_(cause) {
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
