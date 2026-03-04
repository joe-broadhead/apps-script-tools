class AstJobsError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstJobsError';
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
      output.cause = astJobsSerializeErrorCause_(this.cause);
    }
    return output;
  }
}

class AstJobsValidationError extends AstJobsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstJobsValidationError';
  }
}

class AstJobsNotFoundError extends AstJobsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstJobsNotFoundError';
  }
}

class AstJobsConflictError extends AstJobsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstJobsConflictError';
  }
}

class AstJobsStepExecutionError extends AstJobsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstJobsStepExecutionError';
  }
}

class AstJobsCapabilityError extends AstJobsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstJobsCapabilityError';
  }
}

function astJobsSerializeErrorCause_(cause) {
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

const __astJobsErrorsRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astJobsErrorsRoot.AstJobsError = AstJobsError;
__astJobsErrorsRoot.AstJobsValidationError = AstJobsValidationError;
__astJobsErrorsRoot.AstJobsNotFoundError = AstJobsNotFoundError;
__astJobsErrorsRoot.AstJobsConflictError = AstJobsConflictError;
__astJobsErrorsRoot.AstJobsStepExecutionError = AstJobsStepExecutionError;
__astJobsErrorsRoot.AstJobsCapabilityError = AstJobsCapabilityError;
this.AstJobsError = AstJobsError;
this.AstJobsValidationError = AstJobsValidationError;
this.AstJobsNotFoundError = AstJobsNotFoundError;
this.AstJobsConflictError = AstJobsConflictError;
this.AstJobsStepExecutionError = AstJobsStepExecutionError;
this.AstJobsCapabilityError = AstJobsCapabilityError;
