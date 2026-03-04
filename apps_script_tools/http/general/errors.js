class AstHttpError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstHttpError';
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
      output.cause = astHttpSerializeErrorCause_(this.cause);
    }
    return output;
  }
}

class AstHttpValidationError extends AstHttpError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstHttpValidationError';
  }
}

class AstHttpAuthError extends AstHttpError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstHttpAuthError';
  }
}

class AstHttpNotFoundError extends AstHttpError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstHttpNotFoundError';
  }
}

class AstHttpRateLimitError extends AstHttpError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstHttpRateLimitError';
  }
}

class AstHttpCapabilityError extends AstHttpError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstHttpCapabilityError';
  }
}

class AstHttpProviderError extends AstHttpError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstHttpProviderError';
  }
}

function astHttpSerializeErrorCause_(cause) {
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
