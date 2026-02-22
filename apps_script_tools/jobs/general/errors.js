class AstJobsError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstJobsError';
    this.details = details && typeof details === 'object' ? details : {};

    if (cause) {
      this.cause = cause;
    }
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
