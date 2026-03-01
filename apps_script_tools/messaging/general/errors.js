class AstMessagingError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstMessagingError';
    this.details = details && typeof details === 'object' ? details : {};
    if (cause) {
      this.cause = cause;
    }
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
