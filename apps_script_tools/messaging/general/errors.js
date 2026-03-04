class AstMessagingError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstMessagingError';
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
      output.cause = astMessagingSerializeErrorCause_(this.cause);
    }
    return output;
  }
}

class AstMessagingValidationError extends AstMessagingError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstMessagingValidationError';
  }
}

class AstMessagingAuthError extends AstMessagingError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstMessagingAuthError';
  }
}

class AstMessagingCapabilityError extends AstMessagingError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstMessagingCapabilityError';
  }
}

class AstMessagingNotFoundError extends AstMessagingError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstMessagingNotFoundError';
  }
}

class AstMessagingRateLimitError extends AstMessagingError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstMessagingRateLimitError';
  }
}

class AstMessagingProviderError extends AstMessagingError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstMessagingProviderError';
  }
}

class AstMessagingParseError extends AstMessagingError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstMessagingParseError';
  }
}

class AstMessagingTrackingError extends AstMessagingError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstMessagingTrackingError';
  }
}

function astMessagingSerializeErrorCause_(cause) {
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
