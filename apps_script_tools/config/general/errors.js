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

