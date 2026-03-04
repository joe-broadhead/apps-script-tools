class AstTelemetryError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstTelemetryError';
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
      output.cause = astTelemetrySerializeErrorCause_(this.cause);
    }
    return output;
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

function astTelemetrySerializeErrorCause_(cause) {
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

const __astTelemetryErrorsRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astTelemetryErrorsRoot.AstTelemetryError = AstTelemetryError;
__astTelemetryErrorsRoot.AstTelemetryValidationError = AstTelemetryValidationError;
__astTelemetryErrorsRoot.AstTelemetryCapabilityError = AstTelemetryCapabilityError;
this.AstTelemetryError = AstTelemetryError;
this.AstTelemetryValidationError = AstTelemetryValidationError;
this.AstTelemetryCapabilityError = AstTelemetryCapabilityError;
