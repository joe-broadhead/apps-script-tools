class AstAiError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstAiError';
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
      output.cause = astAiSerializeErrorCause_(this.cause);
    }
    return output;
  }
}

class AstAiValidationError extends AstAiError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstAiValidationError';
  }
}

class AstAiAuthError extends AstAiError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstAiAuthError';
  }
}

class AstAiCapabilityError extends AstAiError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstAiCapabilityError';
  }
}

class AstAiProviderError extends AstAiError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstAiProviderError';
  }
}

class AstAiToolExecutionError extends AstAiError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstAiToolExecutionError';
  }
}

class AstAiToolTimeoutError extends AstAiToolExecutionError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstAiToolTimeoutError';
  }
}

class AstAiToolPayloadLimitError extends AstAiToolExecutionError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstAiToolPayloadLimitError';
  }
}

class AstAiToolIdempotencyError extends AstAiToolExecutionError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstAiToolIdempotencyError';
  }
}

class AstAiToolLoopError extends AstAiError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstAiToolLoopError';
  }
}

class AstAiResponseParseError extends AstAiError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstAiResponseParseError';
  }
}

function astAiSerializeErrorCause_(cause) {
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
