class AstRuntimeError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstRuntimeError';
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

class AstRuntimeValidationError extends AstRuntimeError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstRuntimeValidationError';
  }
}
