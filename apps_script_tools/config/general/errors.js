class AstConfigError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstConfigError';
    this.details = (
      details != null
      && typeof details === 'object'
      && !Array.isArray(details)
    ) ? details : {};
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
      output.cause = astConfigSerializeErrorCause_(this.cause);
    }
    return output;
  }
}

class AstConfigValidationError extends AstConfigError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstConfigValidationError';
  }
}

class AstConfigHttpCoreError extends AstConfigError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstConfigHttpCoreError';
  }
}

function astConfigSerializeErrorCause_(cause) {
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
