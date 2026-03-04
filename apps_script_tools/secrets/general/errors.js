class AstSecretsError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstSecretsError';
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
      output.cause = astSecretsSerializeErrorCause_(this.cause);
    }
    return output;
  }
}

class AstSecretsValidationError extends AstSecretsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstSecretsValidationError';
  }
}

class AstSecretsAuthError extends AstSecretsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstSecretsAuthError';
  }
}

class AstSecretsCapabilityError extends AstSecretsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstSecretsCapabilityError';
  }
}

class AstSecretsProviderError extends AstSecretsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstSecretsProviderError';
  }
}

class AstSecretsNotFoundError extends AstSecretsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstSecretsNotFoundError';
  }
}

class AstSecretsParseError extends AstSecretsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstSecretsParseError';
  }
}

function astSecretsSerializeErrorCause_(cause) {
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
