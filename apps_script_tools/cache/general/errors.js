class AstCacheError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstCacheError';
    this.details = details && typeof details === 'object' ? details : {};

    if (cause) {
      this.cause = cause;
    }
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
