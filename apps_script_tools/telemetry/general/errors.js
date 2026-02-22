class AstTelemetryError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstTelemetryError';
    this.details = details && typeof details === 'object' ? details : {};

    if (cause) {
      this.cause = cause;
    }
  }
}

class AstTelemetryValidationError extends AstTelemetryError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstTelemetryValidationError';
  }
}

class AstTelemetryCapabilityError extends AstTelemetryError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstTelemetryCapabilityError';
  }
}

const __astTelemetryErrorsRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astTelemetryErrorsRoot.AstTelemetryError = AstTelemetryError;
__astTelemetryErrorsRoot.AstTelemetryValidationError = AstTelemetryValidationError;
__astTelemetryErrorsRoot.AstTelemetryCapabilityError = AstTelemetryCapabilityError;
this.AstTelemetryError = AstTelemetryError;
this.AstTelemetryValidationError = AstTelemetryValidationError;
this.AstTelemetryCapabilityError = AstTelemetryCapabilityError;
