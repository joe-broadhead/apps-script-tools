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
